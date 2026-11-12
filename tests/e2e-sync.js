// End-to-end test of partner sync and Excel import/export, with two "phones" (separate browser contexts).
// Run: node tests/e2e-sync.js
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path'); const os = require('os'); const cp = require('child_process');
const { start, fakeClaude } = require('./mock-backends');
const ROOT = path.join(__dirname, '..'), TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'bcs-')), SHOTS = process.env.SHOTS || '';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const mock = start((q, r) => { const u = q.url.split(/[?#]/)[0], f = path.join(ROOT, u === '/' ? 'index.html' : u); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); r.end(d); } }); });
let passed = 0; const fails = [];
async function step(name, fn) { try { await fn(); passed++; console.log('  ok  ' + name); } catch (e) { fails.push(name); console.log('  FAIL ' + name + '\n       ' + String(e.message).split('\n')[0]); } }
function eq(a, b, m) { if (a !== b) throw new Error((m || 'expected') + ': ' + JSON.stringify(b) + ', got ' + JSON.stringify(a)); }
function ok(v, m) { if (!v) throw new Error(m || 'assertion failed'); }
const hasPy = (() => { try { cp.execSync('python3 -c "import openpyxl"', { stdio: 'ignore' }); return true; } catch { return false; } })();

(async () => {
  await new Promise(r => mock.server.listen(0, r)); const URL = 'http://localhost:' + mock.server.address().port + '/';
  const browser = await chromium.launch(); const errors = [];
  async function phone(init, arg) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, permissions: ['clipboard-read', 'clipboard-write'], acceptDownloads: true, serviceWorkers: 'block' });
    if (init) await ctx.addInitScript(init, arg);
    const page = await ctx.newPage();
    page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_/.test(m.text())) errors.push(m.text()); }); page.on('pageerror', e => errors.push(String(e)));
    const p = {
      page, ctx, act: a => page.click(`[data-action="${a}"]`), text: s => page.locator(s).first().innerText(),
      rows: () => page.locator('#view .row').count(), go: v => page.click(`[data-action="nav:${v}"]`),
      stored: () => page.evaluate(() => JSON.parse(localStorage.getItem('babycentre.v1')).data),
      until: (fn, arg, ms) => page.waitForFunction(fn, arg, { timeout: ms || 6000 }),
      untilRows: (n, ms) => page.waitForFunction(n => document.querySelectorAll('#view .row').length === n, n, { timeout: ms || 6000 }),
      setup: async name => { await p.act('profile-open'); await page.fill('#f-name', name); await page.fill('#f-dob', new Date(Date.now() - 60 * 864e5).toISOString().slice(0, 10)); await p.act('save-profile'); }
    };
    await page.goto(URL); return p;
  }
  const A = await phone(), B = await phone(); let link = '';

  await step('sharing needs your own baby first; bad database address is refused', async () => {
    await A.go('more'); ok((await A.text('#share')).includes('Set up your baby first')); eq(await A.page.locator('[data-action="share-start"]').count(), 0); eq(await A.page.locator('#share [data-action="share-join"]').count(), 1);
    ok(await A.page.evaluate(() => document.querySelector('#view section').id === 'share'), 'sharing is the first section under More');
    await A.go('home'); await A.setup('Mia'); await A.act('bottle-open'); await A.act('save-bottle'); eq(await A.rows(), 1);
    await A.go('more'); eq(await A.text('#sync-status'), 'Not shared'); await A.act('share-start');
    await A.page.fill('#f-url', 'https://evil.example.com'); await A.act('share-create'); ok((await A.text('#sheet-err')).includes('database address'));
  });
  await step('start sharing uploads the log and shows an invite', async () => {
    await A.page.fill('#f-url', URL); await A.act('share-create'); await A.page.waitForSelector('#f-code');
    link = await A.text('#f-code'); ok(link.startsWith(URL + '#join=BC1.'), link); await A.act('share-copy'); eq(await A.page.evaluate(() => navigator.clipboard.readText()), link);
    const mail = decodeURIComponent(await A.page.getAttribute('#share-mail', 'href')); ok(mail.startsWith('mailto:?subject=Join Mia’s Baby Centre log&body=') && mail.includes(link), mail);
    if (SHOTS) await A.page.screenshot({ path: path.join(SHOTS, 's0-invite.png') });
    await A.act('sheet-close'); await A.until(() => document.querySelector('#sync-status').textContent === 'Shared · up to date');
    await A.act('share-code'); eq(await A.text('#f-code'), link, 'invite can be reopened'); await A.act('sheet-close');
    const room = Object.values(mock.rooms)[0]; ok(room.baby.name === 'Mia' && Object.keys(room).filter(k => k[0] === 'e').length === 1, JSON.stringify(Object.keys(room)));
    if (SHOTS) await A.page.screenshot({ path: path.join(SHOTS, 's1-more-shared.png') });
  });
  await step('partner joins from the invite link; sample data is replaced by the shared log', async () => {
    await B.page.goto(link); await B.page.waitForSelector('#f-invite'); eq(await B.page.inputValue('#f-invite'), link.split('#join=')[1]);
    if (SHOTS) await B.page.screenshot({ path: path.join(SHOTS, 's2-join.png') });
    await B.act('share-join-go'); await B.until(() => document.querySelector('#top h1').textContent === 'Mia'); await B.untilRows(1);
    eq(await B.page.locator('.banner').count(), 0); const s = await B.stored(); eq(s.demo, false); eq(s.events.length, 1); eq(s.baby.name, 'Mia');
  });
  await step('a nappy logged on one phone appears on the other within seconds', async () => {
    await A.go('home'); await A.act('diaper-open'); await A.act('diaper:wet'); await B.untilRows(2, 3000); ok((await B.text('.stat.diaper')).includes('1 today'));
  });
  await step('live timers are shared: sleep started on B shows on A, and A can end it', async () => {
    await B.act('sleep-toggle'); await A.page.waitForSelector('.live.sleep', { timeout: 3000 }); await A.act('sleep-toggle');
    await B.until(() => !document.querySelector('.live.sleep'), null, 3000); await B.untilRows(3); ok((await B.stored()).events.find(e => e.type === 'sleep').end);
  });
  await step('breast feed started on A, switched on B, finished on A', async () => {
    await A.act('breast:L'); await B.page.waitForSelector('.live.feed', { timeout: 3000 }); await B.page.waitForTimeout(1100); await B.act('breast:R');
    await A.until(() => /right/.test(document.querySelector('.live.feed')?.textContent || ''), null, 3000); await A.page.waitForTimeout(1100);
    await A.act('feed-pause'); await B.until(() => /Paused on the right/.test(document.querySelector('#feed-state')?.textContent || ''), null, 3000); await B.act('feed-resume'); await A.until(() => /Feeding on the right/.test(document.querySelector('#feed-state')?.textContent || ''), null, 3000); await A.act('feed-stop');
    await B.until(() => !document.querySelector('.live.feed'), null, 3000); const e = (await B.stored()).events.find(e => e.kind === 'breast'); ok(e.end && e.lsec >= 1 && e.rsec >= 1, JSON.stringify(e));
  });
  await step('delete and undo travel to the other phone', async () => {
    await A.page.locator('#view .row', { hasText: 'Nappy' }).click(); await A.act('delete'); await B.untilRows(3, 3000);
    await A.act('undo'); await B.untilRows(4, 3000);
  });
  await step('milestones and the baby profile are shared too', async () => {
    await B.go('milestones'); await B.act('ms:m0a'); await A.go('milestones'); await A.until(() => document.querySelector('#ms-count')?.textContent === '1 of 12', null, 3000);
    await A.go('more'); await A.act('profile-open'); await A.page.fill('#f-name', 'Mia Rose'); await A.act('save-profile'); await B.go('home'); await B.until(() => document.querySelector('#top h1').textContent === 'Mia Rose', null, 3000);
  });
  await step('units and appearance stay per phone', async () => {
    await A.act('units:oz'); await B.page.waitForTimeout(700); eq((await B.stored()).settings.units, 'ml'); await A.act('units:ml');
  });
  await step('offline: both phones keep logging, then merge when the connection returns', async () => {
    mock.goDown(); await A.go('home');
    await A.act('diaper-open'); await A.act('diaper:dirty'); await A.act('diaper-open'); await A.act('diaper:both'); await B.act('bottle-open'); await B.act('save-bottle');
    await A.page.waitForSelector('#sync-banner', { timeout: 8000 }); ok(/Offline · 2 changes waiting/.test(await A.text('#sync-banner')), await A.text('#sync-banner'));
    if (SHOTS) await A.page.screenshot({ path: path.join(SHOTS, 's3-offline.png') });
    eq(await A.rows(), 6); eq(await B.rows(), 5);
    mock.goUp(); await A.untilRows(7, 40000); await B.untilRows(7, 40000);
    await A.until(() => !document.querySelector('#sync-banner'), null, 30000);
    const ids = s => s.events.map(e => e.id).sort().join(); eq(ids(await A.stored()), ids(await B.stored()));
  });
  await step('sharing resumes after closing and reopening the app', async () => {
    await B.page.reload(); await B.go('more'); await B.until(() => document.querySelector('#sync-status').textContent === 'Shared · up to date');
    await A.act('diaper-open'); await A.act('diaper:wet'); await B.go('home'); await B.untilRows(8, 3000);
  });
  let xlsx = path.join(TMP, 'export.xlsx');
  await step('Excel export downloads a workbook with every sheet', async () => {
    await A.go('more'); const [dl] = await Promise.all([A.page.waitForEvent('download'), A.act('xl-export')]); ok(/^baby-centre-\d{4}-\d\d-\d\d\.xlsx$/.test(dl.suggestedFilename()), dl.suggestedFilename());
    await dl.saveAs(xlsx); ok(fs.statSync(xlsx).size > 2000); ok((await A.text('#snack')).includes('Excel file saved'));
    if (hasPy) { const names = cp.execFileSync('python3', ['-c', 'import openpyxl,sys;wb=openpyxl.load_workbook(sys.argv[1]);print(",".join(wb.sheetnames), wb["Feeds"].max_row, wb["Nappies"].max_row)', xlsx]).toString().trim(); eq(names, 'Feeds,Sleep,Nappies,Burps,Cry checks,Milestones,Baby,How to edit 4 5'); }
  });
  await step('Excel import: edited file updates this phone and the partner; undo restores both', async () => {
    if (!hasPy) return;
    const edited = path.join(TMP, 'edited.xlsx');
    cp.execFileSync('python3', ['-c', `
import openpyxl, sys, datetime
wb = openpyxl.load_workbook(sys.argv[1]); n = wb['Nappies']; n.delete_rows(2, 2)
f = wb['Feeds']; f.append([datetime.datetime.now() - datetime.timedelta(hours=2), 'Solids', None, None, None, 'Mango', None])
wb['Milestones']['D3'] = datetime.date.today()
wb.save(sys.argv[2])`, xlsx, edited]);
    await A.page.setInputFiles('#xlsx-file', edited); await A.page.waitForSelector('[data-action="xl-apply"]');
    const t = await A.text('.sheet'); ok(/4 feeds, 1 sleeps, 2 nappies/.test(t.replace(/\n/g, ' ')), t); ok(t.includes('partner'));
    if (SHOTS) await A.page.screenshot({ path: path.join(SHOTS, 's4-xl-confirm.png') });
    await A.act('xl-apply'); await A.go('home'); eq(await A.rows(), 7); ok((await A.text('#view')).includes('Mango'));
    await B.untilRows(7, 4000); ok((await B.text('#view')).includes('Mango')); eq(Object.keys((await B.stored()).milestones).length, 2);
    await A.act('undo'); eq(await A.rows(), 8); await B.untilRows(8, 4000); eq(Object.keys((await B.stored()).milestones).length, 1);
  });
  await step('Excel import: problems are listed and nothing changes', async () => {
    await A.go('more'); await A.page.setInputFiles('#xlsx-file', path.join(ROOT, 'icon-192.png')); await A.page.waitForSelector('#xl-errors'); ok((await A.text('#xl-errors')).includes('not an Excel'));
    await A.act('sheet-close');
    if (hasPy) {
      const bad = path.join(TMP, 'bad.xlsx'); cp.execFileSync('python3', ['-c', 'import openpyxl,sys;wb=openpyxl.load_workbook(sys.argv[1]);wb["Feeds"]["B2"]="Juice";wb["Sleep"]["B2"]="soon";wb.save(sys.argv[2])', xlsx, bad]);
      await A.page.setInputFiles('#xlsx-file', bad); await A.page.waitForSelector('#xl-errors'); const t = await A.text('#xl-errors'); ok(t.includes('Feeds, row 2') && t.includes('Sleep, row 2'), t); await A.act('sheet-close');
    }
    await A.go('home'); eq(await A.rows(), 8);
  });
  await step('a database that refuses writes is reported clearly', async () => {
    mock.state.denyWrites = true; await A.act('diaper-open'); await A.act('diaper:wet'); await A.page.waitForSelector('#sync-banner'); ok((await A.text('#sync-banner')).includes('cannot save to the shared log'));
    mock.state.denyWrites = false; await A.page.reload(); await B.untilRows(9, 8000);
  });
  await step('stop sharing on one phone keeps its copy and stops updates', async () => {
    await B.go('more'); await B.act('share-stop'); eq(await B.text('#sync-status'), 'Not shared'); await A.act('diaper-open'); await A.act('diaper:wet');
    await B.go('home'); await B.page.waitForTimeout(1500); eq(await B.rows(), 9); eq(await A.rows(), 10);
  });
  await step('rejoining with the code catches up; bad codes and empty logs are explained', async () => {
    await B.go('more'); await B.act('share-join'); await B.page.fill('#f-invite', 'hello'); await B.act('share-join-go'); ok((await B.text('#sheet-err')).includes('not a Baby Centre invite'));
    await B.page.fill('#f-invite', link); await B.act('share-join-go'); await B.untilRows(10, 6000);
    const D = await phone(); await D.go('more'); await D.act('share-join'); const empty = 'BC1.' + Buffer.from(JSON.stringify({ u: URL.slice(0, -1), r: 'emptyroomemptyroom22' })).toString('base64url');
    await D.page.fill('#f-invite', empty); await D.act('share-join-go'); await D.until(() => /Nothing has been shared/.test(document.querySelector('#sheet-err')?.textContent || ''));
    eq(await D.text('#top h1'), 'More'); await D.act('sheet-close'); eq(await D.text('#sync-status'), 'Not shared'); await D.go('home'); eq(await D.text('#top h1'), 'Sample baby'); await D.ctx.close();
  });

  // Hosted (Claude page) mode with the fake shared store
  const CA = await phone(fakeClaude, 'interact'), CB = await phone(fakeClaude, 'interact'), CV = await phone(fakeClaude, 'view');
  const CN = await phone(() => { window.claude = { use: () => new Promise(ok => setTimeout(() => ok(null), 300)) }; });
  await step('hosted page without a shared store says so instead of offering a setup that cannot work', async () => {
    await CN.go('more'); ok((await CN.text('#share')).includes('Checking')); await CN.until(() => /not available in this view/.test(document.querySelector('#share').textContent));
    eq(await CN.page.locator('[data-action="share-start"],[data-action="share-join"],[data-action="share-claude"]').count(), 0); await CN.ctx.close();
  });
  await step('hosted page: owner turns sharing on and gets invite steps with a link to copy', async () => {
    await CA.go('more'); await CA.until(() => /Set up your baby first/.test(document.querySelector('#share').textContent)); eq(await CA.page.locator('[data-action="share-claude"]').count(), 0);
    await CA.go('home'); await CA.setup('Noah'); await CA.act('bottle-open'); await CA.act('save-bottle'); await CA.go('more'); await CA.act('share-claude');
    await CA.page.waitForSelector('#share-steps'); const steps = await CA.text('#share-steps'); ok(steps.includes('Editor') && steps.includes('Join Noah’s log'), steps);
    eq(await CA.text('#f-code'), 'https://claude.ai/artifact/test123'); await CA.act('share-copy'); eq(await CA.page.evaluate(() => navigator.clipboard.readText()), 'https://claude.ai/artifact/test123');
    if (SHOTS) await CA.page.screenshot({ path: path.join(SHOTS, 's5-hosted-invite.png') });
    await CA.act('sheet-close'); await CA.until(() => document.querySelector('#sync-status').textContent === 'Shared · up to date');
    ok(mock.docs.meta && Object.keys(mock.docs).some(k => /^b\d+$/.test(k)), 'records stored in bucket documents: ' + Object.keys(mock.docs));
  });
  await step('hosted page: partner sees a Join banner on opening and joins in one tap', async () => {
    await CB.page.reload(); await CB.page.waitForSelector('#join-banner'); ok((await CB.text('#join-banner')).includes('Noah’s log is shared'));
    if (SHOTS) await CB.page.screenshot({ path: path.join(SHOTS, 's6-hosted-join.png') });
    await CB.go('more'); ok((await CB.text('#share')).includes('Join Noah’s log')); await CB.go('home'); await CB.page.click('#join-banner [data-action="share-claude"]');
    await CB.until(() => document.querySelector('#top h1').textContent === 'Noah'); await CB.untilRows(1); eq(await CB.page.locator('#join-banner').count(), 0);
  });
  await step('hosted page: changes flow both ways and survive a reload', async () => {
    await CB.act('sleep-toggle'); await CA.go('home'); await CA.page.waitForSelector('.live.sleep', { timeout: 3000 }); await CA.act('diaper-open'); await CA.act('diaper:wet'); await CB.untilRows(3, 3000);
    await CA.page.locator('#view .row', { hasText: 'Nappy' }).click(); await CA.act('delete'); await CB.untilRows(2, 3000);
    await CB.page.reload(); await CB.untilRows(2); await CA.act('sleep-toggle'); await CB.until(() => !document.querySelector('.live.sleep'), null, 4000);
  });
  await step('hosted page: a view-only visitor sees the log but is told they cannot save', async () => {
    await CV.page.reload(); await CV.page.waitForSelector('#join-banner'); await CV.page.click('#join-banner [data-action="share-claude"]'); await CV.until(() => document.querySelector('#top h1').textContent === 'Noah'); await CV.untilRows(2);
    const before = JSON.stringify(mock.docs); await CV.act('diaper-open'); await CV.act('diaper:wet'); await CV.page.waitForSelector('#sync-banner'); ok((await CV.text('#sync-banner')).includes('cannot save'));
    eq(JSON.stringify(mock.docs), before, 'store untouched'); await CA.page.waitForTimeout(500); eq(await CA.rows(), 2);
  });
  await step('no console errors on any phone', async () => { eq(errors.join(' | '), ''); });
  await browser.close(); mock.server.closeAllConnections(); mock.server.close(); fs.rmSync(TMP, { recursive: true, force: true });
  console.log(`\n${passed} passed, ${fails.length} failed`); process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
