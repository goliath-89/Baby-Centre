// Unit tests for the merge engine, schema migration and the Excel reader/writer.
// Run: node --test tests/sync-xlsx.test.js   (the interop tests need python3+openpyxl and LibreOffice; they skip if missing)
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path'), vm = require('vm'), os = require('os'), cp = require('child_process');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const sandbox = { module: { exports: {} }, TextEncoder, TextDecoder, DecompressionStream, Response, Blob, Uint8Array, DataView, ArrayBuffer };
vm.runInNewContext(html.match(/<script id="core">([\s\S]*?)<\/script>/)[1], sandbox);
const C = sandbox.module.exports, NOW = new Date(2026, 10, 12, 14, 0).getTime(), H = 3600000, M = 60000;
const clone = o => JSON.parse(JSON.stringify(o)), iso = t => new Date(t).toISOString();
const has = cmd => { try { cp.execSync(cmd, { stdio: 'ignore' }); return true; } catch { return false; } };
const plain = s => clone(s.events).map(e => { delete e.u; return e; }).sort((a, b) => a.id < b.id ? -1 : 1);

function phone() { const s = C.blank(); s.baby = { name: 'Mia', dob: '2026-09-03', u: 1 }; return s; }
function edit(s, now, fn) { const prev = clone(s); fn(s); return C.stamp(prev, s, now); }
function sync(a, b) { // exchange every record both ways, as the transports do
  const ra = {}, rb = {}; C.syncKeys(a).forEach(k => ra[k] = clone(C.record(a, k))); C.syncKeys(b).forEach(k => rb[k] = clone(C.record(b, k)));
  C.mergeAll(a, rb); C.mergeAll(b, ra);
}

test('v1 data migrates to v2 with change stamps and nothing lost', () => {
  const v1 = { schemaVersion: 1, data: { baby: { name: 'Mia', dob: '2026-09-03' }, settings: { units: 'oz' }, milestones: { m0a: '2026-10-01' }, events: [{ id: 'a', type: 'sleep', start: iso(NOW - H), end: iso(NOW) }] } };
  const d = C.migrate(v1);
  assert.equal(d.events[0].u, 1); assert.equal(d.baby.u, 1); assert.equal(d.msU.m0a, 1); assert.equal(d.settings.units, 'oz'); assert.deepEqual({ ...d.tombs }, {});
  assert.equal(C.SCHEMA, 2);
});
test('stamp marks only what changed, and deletions leave a tombstone', () => {
  const s = phone();
  let dirty = edit(s, 100, s => s.events.push({ id: 'a', type: 'diaper', kind: 'wet', start: iso(NOW) }, { id: 'b', type: 'diaper', kind: 'wet', start: iso(NOW) }));
  assert.deepEqual([...dirty].sort(), ['e_a', 'e_b']);
  dirty = edit(s, 200, s => { s.events[0].kind = 'both'; });
  assert.deepEqual([...dirty], ['e_a']); assert.equal(s.events[0].u, 200); assert.equal(s.events[1].u, 100);
  dirty = edit(s, 300, s => { s.events = s.events.filter(e => e.id !== 'b'); s.milestones.m0a = '2026-11-01'; s.baby.name = 'Mia R'; });
  assert.deepEqual([...dirty].sort(), ['baby', 'e_b', 'm_m0a']); assert.equal(s.tombs.b, 300); assert.deepEqual({ ...C.record(s, 'e_b') }, { del: 1, u: 300 });
  dirty = edit(s, 400, () => { }); assert.equal(dirty.length, 0);
});
test('two phones converge: adds, edits, deletes and milestones', () => {
  const a = phone(), b = phone();
  edit(a, 100, s => s.events.push({ id: 'f1', type: 'feed', kind: 'bottle', ml: 120, start: iso(NOW), end: iso(NOW) }));
  edit(b, 110, s => s.events.push({ id: 's1', type: 'sleep', start: iso(NOW), end: null }));
  sync(a, b); assert.deepEqual(plain(a), plain(b)); assert.equal(a.events.length, 2);
  edit(a, 200, s => { s.events.find(e => e.id === 's1').end = iso(NOW + H); });   // partner ends the sleep
  edit(b, 210, s => { s.events = s.events.filter(e => e.id !== 'f1'); s.milestones.c0a = '2026-11-10'; });
  sync(a, b); assert.deepEqual(plain(a), plain(b)); assert.equal(a.events.length, 1); assert.ok(a.events[0].end); assert.equal(a.milestones.c0a, '2026-11-10');
  edit(b, 300, s => { delete s.milestones.c0a; }); sync(a, b); assert.equal(a.milestones.c0a, undefined);
});
test('conflicts: the newest change wins, a late stale copy cannot resurrect a deleted entry', () => {
  const a = phone(), b = phone();
  edit(a, 100, s => s.events.push({ id: 'f1', type: 'feed', kind: 'bottle', ml: 100, start: iso(NOW), end: iso(NOW) })); sync(a, b);
  edit(a, 200, s => { s.events[0].ml = 150; }); edit(b, 250, s => { s.events[0].ml = 90; });
  sync(a, b); assert.equal(a.events[0].ml, 90); assert.equal(b.events[0].ml, 90);
  const stale = clone(C.record(a, 'e_f1'));
  edit(a, 300, s => { s.events = []; }); sync(a, b); assert.equal(b.events.length, 0);
  assert.equal(C.mergeAll(b, { e_f1: stale }), 0); assert.equal(b.events.length, 0);
  // undo of a delete brings it back everywhere
  edit(a, 400, s => { s.events.push(stale); }); sync(a, b); assert.equal(b.events.length, 1); assert.equal(b.tombs.f1, undefined);
});
test('profile photo is shared, survives Excel import, and a bad photo from outside is dropped', async () => {
  const a = phone(), b = phone(), pic = 'data:image/jpeg;base64,AAAA';
  const dirty = edit(a, 500, s => { s.baby.photo = pic; }); assert.deepEqual([...dirty], ['baby']);
  sync(a, b); assert.equal(b.baby.photo, pic);
  const r = C.fromSheets(await C.xlsxRead(C.xlsxWrite(C.toSheets(a))), a, NOW); assert.equal(r.next.baby.photo, pic);
  assert.equal(C.mergeAll(b, { baby: { name: 'Mia', dob: '2026-09-03', photo: 'javascript:alert(1)', u: 900 } }), 1); assert.equal(b.baby.photo, undefined);
  assert.equal(C.migrate({ schemaVersion: 2, data: { baby: { name: 'x', dob: '2026-01-01', photo: '"><script>' }, events: [] } }).baby.photo, undefined);
  edit(a, 950, s => { delete s.baby.photo; }); sync(a, b); assert.equal(C.record(a, 'baby').photo, '');
});
test('needPush lists local records the shared copy is missing or has older; bad remote data is ignored', () => {
  const a = phone(); edit(a, 100, s => s.events.push({ id: 'x', type: 'diaper', kind: 'wet', start: iso(NOW) }));
  assert.deepEqual([...C.needPush(a, {})].sort(), ['baby', 'e_x']);
  assert.deepEqual([...C.needPush(a, { e_x: { u: 100 }, baby: { u: 5 } })], []);
  assert.equal(C.mergeAll(a, { e_y: null, e_z: 'junk', e_q: { u: 999, id: 'other', type: 'sleep', start: iso(NOW) }, zzz: { u: 9 }, baby: { u: 999 } }), 0);
  assert.equal(a.events.length, 1); assert.equal(a.baby.name, 'Mia');
});

const writeBook = s => Buffer.from(C.xlsxWrite(C.toSheets(s)));
test('Excel: export then import gives back exactly the same log', async () => {
  const s = C.demoData(NOW); s.events.push({ id: 'cry1', type: 'cry', start: iso(NOW - H), actual: 'tired', why: ['x'], res: { top: 'hungry', probs: [['hungry', 0.6]], distress: 20, f0: 430, bursts: 4 } }, { id: 'bp1', type: 'burp', start: iso(NOW - 3 * H), end: iso(NOW - 3 * H + 7.5 * M) }, { id: 'sol', type: 'feed', kind: 'solids', start: iso(NOW - 2 * H), end: iso(NOW - 2 * H), note: 'Banana & "oats" <1>' });
  const book = await C.xlsxRead(new Uint8Array(writeBook(s)));
  assert.deepEqual(Object.keys(book), ['Feeds', 'Sleep', 'Nappies', 'Burps', 'Cry checks', 'Milestones', 'Baby', 'How to edit']); assert.equal(book.Burps[1][2], 7.5);
  assert.equal(book.Feeds[0][0], 'Start'); assert.equal(typeof book.Feeds[1][0], 'number');
  const r = C.fromSheets(book, s, NOW);
  assert.deepEqual([...r.errors], []); assert.deepEqual(plain(r.next), plain(s)); assert.deepEqual({ ...r.next.milestones }, { ...s.milestones });
  assert.equal(r.next.baby.name, 'Sample baby'); assert.equal(r.next.baby.dob, s.baby.dob);
  assert.equal(C.stamp(clone(s), r.next, 5).filter(k => k !== 'baby').length, 0, 'an untouched file changes nothing');
});
test('Excel: a feed of a few seconds and a running feed survive the round trip untouched', async () => {
  const s = phone();
  s.events.push({ id: 'tiny', type: 'feed', kind: 'breast', side: 'R', start: iso(NOW - H), end: iso(NOW - H + 2000), lsec: 1, rsec: 1, u: 5 }, { id: 'run', type: 'feed', kind: 'breast', side: 'L', start: iso(NOW - M), segStart: iso(NOW - M), end: null, lsec: 0, rsec: 0, u: 6 });
  const r = C.fromSheets(await C.xlsxRead(C.xlsxWrite(C.toSheets(s))), s, NOW);
  assert.deepEqual([...r.errors], []); assert.deepEqual(plain(r.next), plain(s)); assert.equal(C.stamp(clone(s), r.next, 9).length, 0);
});
test('Excel: date serials convert to local time and back', () => {
  const t = new Date(2026, 2, 29, 2, 30, 15).getTime();
  assert.equal(C.fromSerial(C.toSerial(t)), t);
  assert.equal(Math.floor(C.toSerial(new Date(2026, 10, 12).getTime())), 46338); // 12 Nov 2026 in Excel
});
test('Excel: row problems are reported with sheet and row, and nothing is imported', async () => {
  const s = phone(), d = n => ({ dt: C.toSerial(n) });
  const sheets = [{ name: 'Feeds', rows: [['Start', 'Type', 'Left (min)', 'Right (min)', 'Amount (ml)', 'Notes', 'ID'], [d(NOW - H), 'Bottle', null, null, null, null, null], ['yesterday', 'Breast', 5, 5, null, null, null], [d(NOW + 5 * H), 'Solids', null, null, null, 'x', null], [d(NOW - H), 'Juice', null, null, null, null, null]] },
    { name: 'Sleep', rows: [['Start', 'End', 'ID'], [d(NOW - H), d(NOW - 2 * H), null], [d(NOW - H), null, null], [d(NOW - 30 * M), null, null]] }];
  const r = C.fromSheets(await C.xlsxRead(C.xlsxWrite(sheets)), s, NOW);
  assert.equal(r.errors.length, 6);
  assert.match(r.errors[0], /Feeds, row 2: enter the bottle amount/); assert.match(r.errors[1], /row 3: the start time is missing or not a date/); assert.match(r.errors[2], /row 4: the start time is in the future/);
  assert.match(r.errors[3], /Type must be Breast, Bottle or Solids/); assert.match(r.errors[4], /Sleep, row 2: the end time must be after/); assert.match(r.errors[5], /only one sleep/);
  assert.rejects(C.xlsxRead(new Uint8Array([1, 2, 3, 4])), /not an Excel/);
  assert.match(C.fromSheets({ Sheet1: [['a']] }, s, NOW).errors[0], /No Baby Centre sheets/);
});

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bcx-'));
test('Excel: file opens in a real spreadsheet reader (openpyxl) with typed dates', { skip: !has('python3 -c "import openpyxl"') }, () => {
  const s = C.demoData(NOW), f = path.join(tmp, 'a.xlsx'); fs.writeFileSync(f, writeBook(s));
  const out = cp.execFileSync('python3', ['-c', `
import openpyxl, sys, json, datetime
wb = openpyxl.load_workbook(sys.argv[1]); ws = wb['Feeds']
print(json.dumps({'sheets': wb.sheetnames, 'rows': ws.max_row, 'isdate': isinstance(ws['A2'].value, datetime.datetime), 'a2': ws['A2'].value.strftime('%Y-%m-%d %H:%M'), 'dob': wb['Baby']['B2'].value.strftime('%Y-%m-%d'), 'bold': ws['A1'].font.b}))`, f]).toString();
  const r = JSON.parse(out), feeds = C.sorted(s.events.filter(e => e.type === 'feed')), d = new Date(feeds[0].start), p = n => String(n).padStart(2, '0');
  assert.equal(r.sheets.length, 8); assert.equal(r.rows, feeds.length + 1); assert.equal(r.isdate, true); assert.equal(r.bold, true); assert.equal(r.dob, s.baby.dob);
  assert.equal(r.a2, `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`);
});
test('Excel: edits made in a spreadsheet tool (compressed file, typed cells, text dates) import correctly', { skip: !has('python3 -c "import openpyxl"') }, async () => {
  const s = phone();
  edit(s, 50, s => s.events.push({ id: 'b1', type: 'feed', kind: 'bottle', ml: 120, start: iso(NOW - 5 * H), end: iso(NOW - 5 * H) }, { id: 'b2', type: 'feed', kind: 'bottle', ml: 90, start: iso(NOW - 3 * H), end: iso(NOW - 3 * H) },
    { id: 'n1', type: 'diaper', kind: 'wet', start: iso(NOW - 2 * H) }, { id: 'z1', type: 'sleep', start: iso(NOW - 4 * H), end: iso(NOW - 3.5 * H) }));
  const f = path.join(tmp, 'b.xlsx'), g = path.join(tmp, 'b2.xlsx'); fs.writeFileSync(f, writeBook(s));
  cp.execFileSync('python3', ['-c', `
import openpyxl, sys, datetime
wb = openpyxl.load_workbook(sys.argv[1]); ws = wb['Feeds']
ws['E2'] = 150                                   # change an amount
ws.delete_rows(3)                                # delete the second bottle
ws.append([datetime.datetime(2026, 11, 12, 9, 15), 'breast', 7, 9.5, None, None, None])   # new row, real date cell
ws.append(['2026-11-12 10:05', 'Solids', None, None, None, 'Pear', None])                 # new row, date typed as text
wb['Milestones']['D2'] = datetime.date(2026, 11, 1)
wb['Nappies']['B2'] = 'Dirty'
del wb['Sleep']                                  # a removed sheet leaves sleep untouched
wb.save(sys.argv[2])`, f, g]);
  const r = C.fromSheets(await C.xlsxRead(new Uint8Array(fs.readFileSync(g))), s, NOW);
  assert.deepEqual([...r.errors], []);
  const ev = r.next.events, by = id => ev.find(e => e.id === id);
  assert.equal(by('b1').ml, 150); assert.equal(by('b2'), undefined); assert.equal(by('n1').kind, 'dirty'); assert.ok(by('z1'), 'sleep kept');
  const br = ev.find(e => e.kind === 'breast'); assert.equal(new Date(br.start).getTime(), new Date(2026, 10, 12, 9, 15).getTime()); assert.equal(br.lsec, 420); assert.equal(br.rsec, 570); assert.equal(br.side, 'R');
  const so = ev.find(e => e.kind === 'solids'); assert.equal(so.note, 'Pear'); assert.equal(new Date(so.start).getTime(), new Date(2026, 10, 12, 10, 5).getTime());
  assert.equal(r.next.milestones.m0a, '2026-11-01'); assert.deepEqual({ ...r.counts }, { feeds: 3, sleeps: 1, nappies: 1, cries: 0, burps: 0, milestones: 1 });
  const dirty = C.stamp(clone(s), r.next, 99); assert.ok(dirty.includes('e_b2') && r.next.tombs.b2 === 99, 'deleted row becomes a tombstone for sync');
});
test('Excel: survives being opened and re-saved by LibreOffice', { skip: !has('soffice --version') }, async () => {
  const s = C.demoData(NOW), dir = path.join(tmp, 'lo'); fs.mkdirSync(dir); const f = path.join(tmp, 'c.xlsx'); fs.writeFileSync(f, writeBook(s));
  cp.execFileSync('soffice', ['--headless', '--convert-to', 'xlsx', '--outdir', dir, f], { stdio: 'ignore', timeout: 90000 });
  const r = C.fromSheets(await C.xlsxRead(new Uint8Array(fs.readFileSync(path.join(dir, 'c.xlsx')))), s, NOW);
  assert.deepEqual([...r.errors], []); assert.deepEqual(plain(r.next), plain(s)); assert.deepEqual({ ...r.next.milestones }, { ...s.milestones });
});
