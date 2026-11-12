// End-to-end test on a phone-sized screen. Run: node tests/e2e.js
// Starts its own static server, feeds a synthetic cry into a fake microphone, and walks every feature.
const { chromium } = require('playwright'); const http = require('http'); const fs = require('fs'); const path = require('path'); const os = require('os');
const { makeCry, writeWav } = require('./synth');
const ROOT = path.join(__dirname, '..'), SHOTS = process.env.SHOTS || '';
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'bc-')), CRY = path.join(TMP, 'cry.wav'), QUIET = path.join(TMP, 'quiet.wav');
writeWav(CRY, makeCry({ f0: 600, burst: 2.6, pause: 0.2, harsh: 0.35, dur: 5.6 }), 48000);
writeWav(QUIET, new Float32Array(48000 * 6), 48000);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((q, r) => { const f = path.join(ROOT, q.url.split(/[?#]/)[0] === '/' ? 'index.html' : q.url.split(/[?#]/)[0]); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); r.end(d); } }); });
let passed = 0; const fails = [];
async function step(name, fn) { try { await fn(); passed++; console.log('  ok  ' + name); } catch (e) { fails.push(name); console.log('  FAIL ' + name + '\n       ' + String(e.message).split('\n')[0]); } }
function eq(a, b, m) { if (a !== b) throw new Error((m || 'expected') + ': ' + JSON.stringify(b) + ', got ' + JSON.stringify(a)); }
function ok(v, m) { if (!v) throw new Error(m || 'assertion failed'); }

(async () => {
  await new Promise(r => server.listen(0, r)); const URL = 'http://localhost:' + server.address().port + '/';
  const browser = await chromium.launch({ args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--use-file-for-fake-audio-capture=' + CRY] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, permissions: ['microphone', 'clipboard-read', 'clipboard-write'], acceptDownloads: true });
  const page = await ctx.newPage(); const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); }); page.on('pageerror', e => errors.push(String(e)));
  const act = a => page.click(`[data-action="${a}"]`);
  const text = s => page.locator(s).first().innerText();
  const rows = () => page.locator('#view .row').count();
  const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem('babycentre.v1')).data);
  const noOverflow = async n => { const o = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); ok(o <= 0, n + ' scrolls sideways by ' + o + 'px'); };
  const shot = async n => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, n + '.png'), fullPage: false }); };
  const dob = new Date(Date.now() - 60 * 864e5).toISOString().slice(0, 10);

  await page.goto(URL);
  await step('first open shows a sample week, clearly marked', async () => {
    ok((await text('.banner')).includes('sample data')); ok(await rows() > 5); eq(await text('#top h1'), 'Sample baby');
    eq(await page.evaluate(() => localStorage.getItem('babycentre.v1')), null, 'sample data is not saved'); await noOverflow('home'); await shot('01-home-sample');
  });
  await step('every tab renders without sideways scroll', async () => {
    for (const v of ['trends', 'cry', 'milestones', 'more', 'home']) { await act('nav:' + v); await noOverflow(v); if (v !== 'home') await shot('02-' + v + '-sample'); }
    await act('nav:trends'); eq(await page.locator('#view svg.chart').count(), 5); await act('week:1'); eq(await page.locator('#view svg.chart').count(), 5); await act('week:-1'); await act('nav:home');
  });
  await step('profile form validates, then replaces sample data', async () => {
    await act('profile-open'); await act('save-profile'); ok((await text('#sheet-err')).includes('name'));
    await page.fill('#f-name', 'Mia <b>'); await act('save-profile'); ok((await text('#sheet-err')).includes('date of birth'));
    await page.fill('#f-dob', dob); await act('save-profile');
    eq(await text('#top h1'), 'Mia <b>'); eq(await rows(), 0); eq(await page.locator('.banner').count(), 0);
    ok(/^8 weeks/.test(await text('header .age')), 'age label');
  });
  await step('breast feed: one tap starts, switch side, stop saves both sides', async () => {
    await act('breast:L'); ok((await text('.live.feed')).includes('left')); eq(await page.locator('.qa.on').count(), 1);
    await page.waitForTimeout(2200); ok(/0:0[1-9]/.test(await text('.live.feed .t')), 'timer runs');
    await act('breast:R'); ok((await text('.live.feed')).includes('right')); await page.waitForTimeout(1200);
    await act('feed-stop'); eq(await page.locator('.live.feed').count(), 0); eq(await rows(), 1);
    const e = (await stored()).events[0]; ok(e.end && e.lsec >= 1 && e.rsec >= 1 && e.side === 'R' && !e.segStart, JSON.stringify(e));
    eq(await page.locator('[data-action="breast:L"] .tag').count(), 1, 'left is tagged next'); ok(/last side right/i.test(await text('.stat.feed')), 'last side shown');
  });
  await step('undo brings back the running feed, then finish it again', async () => {
    await act('undo'); eq(await page.locator('.live.feed').count(), 1); await act('feed-stop'); eq(await rows(), 1);
  });
  await step('bottle: stepper and save in two taps', async () => {
    await act('bottle-open'); eq(await page.inputValue('#f-amount'), '120'); await act('amt:1'); await act('save-bottle');
    eq(await rows(), 2); ok((await text('#view .row')).includes('130 ml')); ok((await text('#snack')).includes('130 ml'));
  });
  await step('sleep timer survives a reload, then saves', async () => {
    await act('sleep-toggle'); eq(await page.locator('.live.sleep').count(), 1); await page.reload();
    eq(await page.locator('.live.sleep').count(), 1); eq(await text('#top h1'), 'Mia <b>'); ok((await text('#stat-sleep')).startsWith('Asleep'));
    await act('sleep-toggle'); eq(await page.locator('.live.sleep').count(), 0); eq(await rows(), 3); ok((await text('#stat-sleep')).startsWith('Awake'));
  });
  await step('nappy: two taps, undo removes it', async () => {
    await act('diaper-open'); await act('diaper:both'); eq(await rows(), 4); ok((await text('.stat.diaper')).includes('1 today'));
    await act('undo'); eq(await rows(), 3); await act('diaper-open'); await act('diaper:wet'); eq(await rows(), 4);
  });
  await step('edit an entry, with validation; delete and undo', async () => {
    await page.locator('#view .row', { hasText: 'Bottle' }).click(); await page.fill('#f-amount', '0'); await act('save-edit'); ok((await text('#sheet-err')).includes('amount'));
    await page.fill('#f-amount', '150'); await act('save-edit'); ok((await text('#view')).includes('150 ml'));
    await page.locator('#view .row', { hasText: 'Bottle' }).click(); await act('delete'); eq(await rows(), 3); await act('undo'); eq(await rows(), 4);
  });
  await step('add a past sleep; rejects wake before start and future times', async () => {
    const inp = t => { const d = new Date(t), p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };
    await act('add-open'); await act('add-kind:sleep');
    await page.fill('#f-start', inp(Date.now() - 3 * 36e5)); await page.fill('#f-end', inp(Date.now() - 4 * 36e5)); await act('save-edit'); ok((await text('#sheet-err')).includes('after the start'));
    await page.fill('#f-end', inp(Date.now() + 2 * 36e5)); await act('save-edit'); ok((await text('#sheet-err')).includes('future'));
    await page.fill('#f-end', inp(Date.now() - 2 * 36e5)); await act('save-edit'); eq(await rows(), 5);
    await act('add-open'); await act('add-kind:breast'); await page.fill('#f-l', '12'); await page.fill('#f-r', '0'); await act('save-edit'); eq(await rows(), 6);
    await act('add-open'); await act('add-kind:solids'); await page.fill('#f-note', 'Banana'); await act('save-edit'); ok((await text('#view')).includes('Banana'));
    await noOverflow('home with data'); await shot('03-home-own');
  });
  await step('timeline filter groups one activity by day with daily totals; tiles jump to their records', async () => {
    eq(await rows(), 7); await act('filter:diaper'); eq(await rows(), 1); ok(/Today\s+1 change/.test(await text('#tl .day')), await text('#tl .day'));
    await act('filter:feed'); eq(await rows(), 4); ok(/3 feeds · .*breast · 150 ml · 1 solids/.test(await text('#tl .day')), await text('#tl .day'));
    await act('filter:sleep'); eq(await rows(), 2); ok(/2 sleeps/.test(await text('#tl .day')));
    await act('filter:all'); eq(await rows(), 7); await page.evaluate(() => scrollTo(0, 0));
    await act('show:diaper'); eq(await rows(), 1); eq(await page.getAttribute('[data-action="filter:diaper"]', 'aria-pressed'), 'true'); ok(await page.evaluate(() => scrollY > 50), 'scrolled to the timeline');
    await shot('03b-nappies'); await page.locator('#view .row').first().click(); await act('delete'); ok((await text('#tl .empty')).includes('No nappies logged in the last 7 days')); await act('undo');
    await act('show:feed'); eq(await rows(), 4); await act('show:sleep'); eq(await rows(), 2); await act('filter:all'); await noOverflow('filtered timeline');
  });
  await step('profile photo: pick, crop to a small square, show on home, keep after reload, remove', async () => {
    eq(await page.locator('#top img.av').count(), 0); eq(await text('#top .av'), 'M');
    await act('nav:more'); await act('profile-open'); await page.fill('#f-name', 'Mia <b> R'); await page.setInputFiles('#photo-file', path.join(ROOT, 'icon-512.png'));
    await page.waitForSelector('.sheet img.av'); eq(await page.inputValue('#f-name'), 'Mia <b> R', 'typed name kept while choosing a photo');
    await page.setInputFiles('#photo-file', path.join(ROOT, 'manifest.webmanifest')); await page.waitForFunction(() => /could not be opened/.test(document.querySelector('#sheet-err')?.textContent || '')); eq(await page.locator('.sheet img.av').count(), 1);
    await page.fill('#f-name', 'Mia <b>'); await act('save-profile'); await act('nav:home'); await page.waitForSelector('#top img.av');
    const ph = (await stored()).baby.photo; ok(ph.startsWith('data:image/jpeg;base64,') && ph.length < 60000, 'photo size ' + ph.length);
    const dim = await page.evaluate(() => { const i = document.querySelector('#top img.av'); return [i.naturalWidth, i.naturalHeight, i.getBoundingClientRect().width]; }); eq(dim.join(), '256,256,48');
    await page.reload(); await page.waitForSelector('#top img.av'); await shot('03c-photo'); await noOverflow('home with photo');
    await act('nav:more'); await act('profile-open'); await shot('03d-profile'); await act('photo-remove'); await act('save-profile'); await act('nav:home'); eq(await page.locator('#top img.av').count(), 0);
    await act('undo'); await page.waitForSelector('#top img.av');
  });
  await step('trends reflect the log', async () => {
    await act('nav:trends'); const t = await text('#view'); ok(t.includes('Next feed') && t.includes('Next sleep')); eq(await page.locator('#view svg.chart').count(), 5);
    ok(await page.locator('#view svg.chart rect[fill="var(--sleep)"]').count() >= 2, 'sleep blocks drawn'); await shot('04-trends-own');
  });
  await step('milestones tick, count and persist', async () => {
    await act('nav:milestones'); eq(await text('#ms-count'), '0 of 12'); await act('ms:m0a'); await act('ms:c0c'); eq(await text('#ms-count'), '2 of 12');
    await page.reload(); eq(await text('#ms-count'), '2 of 12'); await act('ms:c0c'); eq(await text('#ms-count'), '1 of 12');
    await act('band:2'); eq(await text('#ms-count'), '0 of 12'); await act('band:0'); await shot('05-milestones');
  });
  await step('cry check: records 5 seconds from the microphone and explains the result', async () => {
    await act('nav:cry'); await act('cry-record'); await page.waitForSelector('#rec-count', { timeout: 5000 }); await shot('06-cry-recording');
    await page.waitForSelector('#cry-top', { timeout: 15000 });
    const top = await text('#cry-top'), view = await text('#view'); ok(top.length > 3, 'has a cause'); ok(/\d+ Hz/.test(view) && /try this/i.test(view) && view.includes('Trust your instinct'), 'result sections: ' + view.slice(0, 200));
    const e = (await stored()).events.find(x => x.type === 'cry'); ok(e && Math.abs(e.res.f0 - 600) < 60, 'pitch from mic ' + (e && e.res.f0)); eq(e.res.top, 'pain'); ok(e.res.distress >= 60, 'distress ' + e.res.distress);
    await shot('07-cry-result'); await noOverflow('cry result');
    await act(`cry-actual:${e.id}:gas`); eq((await stored()).events.find(x => x.id === e.id).actual, 'gas');
    await act('cry-again'); eq(await page.locator('#view .row').count(), 1);
  });
  await step('cry check: cancel mid-recording saves nothing', async () => {
    await act('cry-record'); await page.waitForSelector('#rec-count'); await page.waitForTimeout(600); await act('cry-cancel');
    await page.waitForSelector('[data-action="cry-record"]'); eq((await stored()).events.filter(x => x.type === 'cry').length, 1);
  });
  await step('cry check: uploaded clip works; silent or non-audio files explain what to do', async () => {
    await page.setInputFiles('#cry-file', QUIET); await page.waitForSelector('#cry-error'); ok((await text('#cry-error')).includes('quiet'));
    await page.setInputFiles('#cry-file', path.join(ROOT, 'icon-192.png')); await page.waitForFunction(() => /not audio/.test(document.querySelector('#cry-error')?.textContent || ''));
    await page.setInputFiles('#cry-file', CRY); await page.waitForSelector('#cry-top'); eq((await stored()).events.filter(x => x.type === 'cry').length, 2);
  });
  let backup = '';
  await step('units and theme settings apply and persist', async () => {
    await act('nav:more'); await act('units:oz'); await act('nav:home'); ok((await text('#view')).includes('5 oz'), '150 ml shown as 5 oz');
    await act('bottle-open'); eq(await page.inputValue('#f-amount'), '5'); await act('sheet-close');
    await act('nav:more'); await act('theme:dark'); eq(await page.evaluate(() => document.documentElement.dataset.theme), 'dark');
    await page.reload(); eq(await page.evaluate(() => document.documentElement.dataset.theme), 'dark'); await act('nav:home'); await shot('08-home-dark');
    await act('nav:cry'); await act('cry-show:' + (await stored()).events.find(x => x.type === 'cry').id); await shot('09-cry-dark'); await act('nav:trends'); await shot('10-trends-dark');
    await act('nav:more'); await act('theme:system'); eq(await page.evaluate(() => document.documentElement.dataset.theme), undefined); await act('units:ml');
  });
  await step('backup: download and copy', async () => {
    await act('export'); backup = await page.inputValue('#f-backup'); ok(JSON.parse(backup).data.events.length === 9, 'events in backup');
    const [dl] = await Promise.all([page.waitForEvent('download'), act('export-file')]); ok(/baby-centre-backup-.*\.json/.test(dl.suggestedFilename()));
    await act('export-copy'); eq(await page.evaluate(() => navigator.clipboard.readText()), backup); await act('sheet-close');
  });
  await step('erase needs two taps and returns to sample data', async () => {
    await act('erase-open'); await act('erase-yes'); eq(await page.locator('.sheet').count(), 1); await act('erase-yes');
    eq(await text('#top h1'), 'Sample baby'); eq(await page.evaluate(() => localStorage.getItem('babycentre.v1')), null);
  });
  await step('restore: bad text is refused, good backup brings everything back', async () => {
    await act('nav:more'); await act('import-open'); await page.fill('#f-paste', '{"oops":'); await act('import-paste'); ok((await text('#sheet-err')).includes('not a complete backup'));
    await page.fill('#f-paste', '{"schemaVersion":1,"data":{}}'); await act('import-paste'); ok((await text('#sheet-err')).length > 5);
    await page.fill('#f-paste', backup); await act('import-paste'); await act('nav:home');
    eq(await text('#top h1'), 'Mia <b>'); eq((await stored()).events.length, 9); eq(Object.keys((await stored()).milestones).length, 1);
    const f = path.join(TMP, 'b.json'); fs.writeFileSync(f, backup); await act('nav:more'); await act('import-open'); await page.setInputFiles('#import-file', f); await page.waitForFunction(() => !document.querySelector('.sheet')); eq((await stored()).events.length, 9);
  });
  await step('unreadable saved data is kept aside, not destroyed', async () => {
    await page.evaluate(() => localStorage.setItem('babycentre.v1', '{broken')); await page.goto(URL + '#home'); await page.reload();
    eq(await text('#top h1'), 'Sample baby'); eq(await page.evaluate(() => localStorage.getItem('babycentre.v1.unreadable')), '{broken');
  });
  await step('works installed and offline (service worker)', async () => {
    await page.evaluate(() => navigator.serviceWorker.ready); await page.reload(); await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    await ctx.setOffline(true); await page.reload(); eq(await text('#top h1'), 'Sample baby'); await act('nav:trends'); eq(await page.locator('#view svg.chart').count(), 5); await ctx.setOffline(false);
  });
  await step('small phone (320px) and large text do not break the layout', async () => {
    await page.setViewportSize({ width: 320, height: 568 }); for (const v of ['home', 'trends', 'cry', 'milestones', 'more']) { await act('nav:' + v); await noOverflow(v + ' @320'); }
    await act('nav:home'); await act('bottle-open'); await noOverflow('sheet @320'); await act('sheet-close'); await shot('11-home-320');
  });
  await step('no console errors during the whole run', async () => { eq(errors.filter(e => !/Failed to load resource/.test(e)).join(' | '), ''); });
  // Microphone refused
  const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 } }); const p2 = await ctx2.newPage(); await p2.goto(URL + '#cry');
  await step('deep link opens the cry tab; a blocked microphone gives a clear way forward', async () => {
    eq(await p2.locator('#top h1').innerText(), 'Cry check');
    await p2.evaluate(() => { navigator.mediaDevices.getUserMedia = () => Promise.reject(Object.assign(new Error('x'), { name: 'NotAllowedError' })); });
    await p2.click('[data-action="cry-record"]'); await p2.waitForSelector('#cry-error'); ok((await p2.locator('#cry-error').innerText()).includes('blocked'));
  });
  await browser.close(); server.close(); fs.rmSync(TMP, { recursive: true, force: true });
  console.log(`\n${passed} passed, ${fails.length} failed`); process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
