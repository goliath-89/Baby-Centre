// Unit tests for the pure logic inside index.html. Run: node --test tests/core.test.js
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const src = html.match(/<script id="core">([\s\S]*?)<\/script>/)[1];
const sandbox = { module: { exports: {} } }; vm.runInNewContext(src, sandbox);
const C = sandbox.module.exports;
const { makeCry, makeSpeechLike } = require('./synth');
const H = 3600000, M = 60000, D = 86400000;
const NOW = new Date(2026, 10, 12, 14, 0).getTime();
const iso = t => new Date(t).toISOString();
const feed = (t, extra) => Object.assign({ id: 'f' + t, type: 'feed', kind: 'bottle', ml: 120, start: iso(t), end: iso(t) }, extra);
const sleep = (a, b) => ({ id: 's' + a, type: 'sleep', start: iso(a), end: b ? iso(b) : null });
const DOB = '2026-09-03'; // 70 days before NOW

test('age label and guidance by age', () => {
  assert.equal(C.ageDays(DOB, NOW), 70);
  assert.equal(C.ageLabel(DOB, NOW), '10 weeks old');
  assert.equal(C.ageLabel('2026-11-07', NOW), '5 days old');
  assert.equal(C.ageLabel('2026-04-10', NOW), '7 months old');
  assert.deepEqual([...C.wakeWindow(70)], [60, 90]);
  assert.equal(C.bandForAge(DOB, NOW), 0);
  assert.equal(C.bandForAge('2026-04-10', NOW), 2);
  assert.equal(C.bandForAge('2025-01-01', NOW), 3);
});

test('next feed uses the baby\'s own median gap once there is enough data', () => {
  const ev = [0, 1, 2, 3, 4].map(i => feed(NOW - 13 * H + i * 3 * H)); // every 3h, last at NOW-1h
  const p = C.predictFeed(ev, DOB, NOW);
  assert.equal(p.basis, 'yours'); assert.equal(p.gapMs, 3 * H); assert.equal(p.at, NOW - H + 3 * H);
});
test('next feed falls back to the age default with little data, and ignores solids', () => {
  const ev = [feed(NOW - 2 * H), feed(NOW - 30 * M, { kind: 'solids' })];
  const p = C.predictFeed(ev, DOB, NOW);
  assert.equal(p.basis, 'age'); assert.equal(p.gapMs, 180 * M); assert.equal(p.at, NOW + H);
  assert.equal(C.predictFeed([], DOB, NOW).at, null);
});
test('next sleep window follows the last wake time', () => {
  const p = C.predictSleep([sleep(NOW - 3 * H, NOW - 30 * M)], DOB, NOW);
  assert.equal(p.asleep, false); assert.equal(p.from, NOW + 30 * M); assert.equal(p.to, NOW + 60 * M);
  assert.equal(C.predictSleep([sleep(NOW - 20 * M)], DOB, NOW).asleep, true);
});
test('with no sleep logged yet, the nap countdown runs from the end of the last burp', () => {
  const p = C.predictSleep([{ id: 'b', type: 'burp', start: iso(NOW - 40 * M), end: iso(NOW - 30 * M) }], DOB, NOW);
  assert.equal(p.basis, 'burp'); assert.equal(p.from, NOW + 30 * M); assert.equal(p.to, NOW + 60 * M);
  const q = C.predictSleep([{ id: 'b', type: 'burp', start: iso(NOW - 40 * M), end: iso(NOW - 30 * M) }, sleep(NOW - 3 * H, NOW - 50 * M)], DOB, NOW);
  assert.equal(q.basis, undefined); assert.equal(q.from, NOW + 10 * M, 'a logged wake time takes priority');
});
test('daily stats split sleep across midnight and count an ongoing sleep', () => {
  const mid = C.dayStart(NOW);
  const ev = [sleep(mid - 2 * H, mid + 5 * H), sleep(NOW - H), feed(NOW - 2 * H), feed(mid - 3 * H),
    { id: 'b', type: 'feed', kind: 'breast', side: 'R', start: iso(NOW - 4 * H), end: iso(NOW - 4 * H + 20 * M), lsec: 600, rsec: 600 },
    { id: 'd', type: 'diaper', kind: 'wet', start: iso(NOW - H) }];
  const [y, t] = C.dailyStats(ev, NOW, 2);
  assert.equal(y.sleepMs, 2 * H); assert.equal(t.sleepMs, 6 * H); assert.equal(t.longestMs, 5 * H);
  assert.equal(t.feeds, 2); assert.equal(y.feeds, 1); assert.equal(t.bottleMl, 120); assert.equal(t.lMs, 600000); assert.equal(t.diapers, 1);
  const prev = C.dailyStats(ev, NOW, 7, 7); assert.equal(prev.length, 7); assert.equal(prev[6].day, mid - 7 * D);
});

test('silence and quiet room noise are not reported as a cry', () => {
  assert.equal(C.analyzeCry(new Float32Array(48000 * 5), 48000).isCry, false);
  const noise = new Float32Array(48000 * 5).map(() => (Math.random() - 0.5) * 0.004);
  const a = C.analyzeCry(noise, 48000); assert.equal(a.isCry, false); assert.equal(a.reason, 'quiet');
});
test('loud broadband noise and low-pitched speech-like sound are rejected', () => {
  const noise = new Float32Array(48000 * 5).map(() => (Math.random() - 0.5) * 0.6);
  assert.equal(C.analyzeCry(noise, 48000).isCry, false);
  assert.equal(C.analyzeCry(makeSpeechLike(), 48000).isCry, false);
});
test('pitch and rhythm are measured accurately at 48k, 44.1k and 16k', () => {
  for (const sr of [48000, 44100, 16000]) {
    const a = C.analyzeCry(makeCry({ f0: 440, burst: 0.9, pause: 0.35, sr }), sr);
    assert.equal(a.isCry, true, 'sr ' + sr);
    assert.ok(Math.abs(a.features.f0 - 440) < 25, `f0 ${a.features.f0} at ${sr}`);
    assert.ok(Math.abs(a.features.burstDur - 0.9) < 0.15, `burst ${a.features.burstDur}`);
    assert.ok(Math.abs(a.features.pause - 0.35) < 0.12, `pause ${a.features.pause}`);
    assert.equal(a.features.bursts, 4);
  }
});
test('high pitch is tracked without octave errors', () => {
  for (const f0 of [320, 520, 650]) {
    const a = C.analyzeCry(makeCry({ f0, burst: 1.5, pause: 0.3 }), 48000);
    assert.ok(Math.abs(a.features.f0 - f0) < f0 * 0.07, `wanted ${f0}, got ${a.features.f0}`);
  }
});

const ctxNeutral = { ageDays: 70, sinceFeedMs: null, awakeMs: null, sinceDiaperMin: null, sinceFeedEndMin: null, gapMs: 3 * H, wake: [60, 90], counts: {} };
const classify = (opts, ctx) => C.classifyCry(C.analyzeCry(makeCry(opts), 48000).features, ctx || ctxNeutral);
test('acoustic profiles: rhythmic mid-pitch reads as hungry; long harsh high-pitch as pain; sparse low as tired or comfort', () => {
  assert.equal(classify({ f0: 430, burst: 0.9, pause: 0.35 }).top, 'hungry');
  const pain = classify({ f0: 600, burst: 2.6, pause: 0.2, harsh: 0.35 });
  assert.equal(pain.top, 'pain'); assert.ok(pain.distress >= 60, 'distress ' + pain.distress);
  const low = classify({ f0: 360, burst: 0.5, pause: 1.0 });
  assert.ok(['tired', 'comfort'].includes(low.top), low.top); assert.ok(low.distress < 30);
});
test('probabilities sum to 1 and are sorted', () => {
  const r = classify({});
  assert.ok(Math.abs(r.probs.reduce((a, p) => a + p[1], 0) - 1) < 1e-9);
  for (let i = 1; i < r.probs.length; i++) assert.ok(r.probs[i - 1][1] >= r.probs[i][1]);
});
test('logged context shifts the answer: overdue feed, long awake, recent feed', () => {
  const amb = { f0: 420, burst: 0.75, pause: 0.5 };
  const p = (r, id) => r.probs.find(x => x[0] === id)[1];
  const base = classify(amb);
  const hungry = classify(amb, { ...ctxNeutral, sinceFeedMs: 4 * H, sinceFeedEndMin: 230, awakeMs: 20 * M, sinceDiaperMin: 20 });
  assert.equal(hungry.top, 'hungry'); assert.ok(p(hungry, 'hungry') > p(base, 'hungry'));
  const justFed = classify(amb, { ...ctxNeutral, sinceFeedMs: 20 * M, sinceFeedEndMin: 10, awakeMs: 20 * M, sinceDiaperMin: 20 });
  assert.ok(p(justFed, 'hungry') < p(base, 'hungry')); assert.ok(p(justFed, 'gas') > p(base, 'gas'));
  const tired = classify({ f0: 380, burst: 0.6, pause: 0.8 }, { ...ctxNeutral, sinceFeedMs: 30 * M, sinceFeedEndMin: 90, awakeMs: 2.2 * H, sinceDiaperMin: 20 });
  assert.equal(tired.top, 'tired');
});
test('cryContext reads the log', () => {
  const ev = [feed(NOW - 2 * H), sleep(NOW - 4 * H, NOW - 80 * M), { id: 'd', type: 'diaper', kind: 'wet', start: iso(NOW - 50 * M) },
    { id: 'c', type: 'cry', start: iso(NOW - D), actual: 'tired' }];
  const c = C.cryContext(ev, DOB, NOW);
  assert.equal(c.sinceFeedMs, 2 * H); assert.equal(c.awakeMs, 80 * M); assert.equal(Math.round(c.sinceDiaperMin), 50); assert.equal(c.counts.tired, 1);
});
test('confirmed past answers nudge future results', () => {
  const amb = { f0: 400, burst: 0.6, pause: 0.7 };
  const a = classify(amb), b = classify(amb, { ...ctxNeutral, counts: { tired: 8 } });
  const p = (r, id) => r.probs.find(x => x[0] === id)[1];
  assert.ok(p(b, 'tired') > p(a, 'tired'));
});

test('backup round trip keeps everything; bad or newer backups are refused', () => {
  const d = C.demoData(NOW), back = C.migrate(JSON.parse(JSON.stringify({ schemaVersion: C.SCHEMA, data: d })));
  assert.equal(back.events.length, d.events.length); assert.equal(back.baby.name, 'Sample baby'); assert.equal(Object.keys(back.milestones).length, 6);
  assert.throws(() => C.migrate({ hello: 1 }), /not a Baby Centre backup/);
  assert.throws(() => C.migrate({ schemaVersion: 99, data: { events: [] } }), /newer version/);
  assert.throws(() => C.migrate({ schemaVersion: 1, data: {} }), /no entries/);
});
test('sample data is a realistic, finished week', () => {
  const d = C.demoData(NOW), st = C.dailyStats(d.events, NOW, 7);
  assert.ok(d.events.every(e => new Date(e.start).getTime() <= NOW && (e.end === undefined || e.end)));
  for (const s of st.slice(1, 6)) { assert.ok(s.feeds >= 5 && s.feeds <= 12, 'feeds ' + s.feeds); assert.ok(s.sleepMs > 11 * H && s.sleepMs < 18 * H, 'sleep ' + s.sleepMs / H); }
  assert.equal(new Set(d.events.map(e => e.id)).size, d.events.length);
});
