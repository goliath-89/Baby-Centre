// End-to-end test on a phone-sized screen. Run: node tests/e2e.js
// Starts its own static server, feeds a synthetic cry into a fake microphone, and walks every feature.
// Run as if it were early afternoon local time, so entries a few hours old still fall on "today" in the Timeline.
const TZ = (() => { const off = ((13 - new Date().getUTCHours()) % 24 + 24 + 11) % 24 - 11; return off === 0 ? 'UTC' : 'Etc/GMT' + (off > 0 ? '-' + off : '+' + (-off)); })();
process.env.TZ = TZ;
const { chromium } = require('playwright'); const http = require('http'); const fs = require('fs'); const path = require('path'); const os = require('os');
const { makeCry, writeWav } = require('./synth');
const ROOT = path.join(__dirname, '..'), SHOTS = process.env.SHOTS || '';
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'bc-')), CRY = path.join(TMP, 'cry.wav'), QUIET = path.join(TMP, 'quiet.wav');
writeWav(CRY, makeCry({ f0: 600, burst: 2.6, pause: 0.2, harsh: 0.35, dur: 5.6 }), 48000);
writeWav(QUIET, new Float32Array(48000 * 6), 48000);
// A short video with the cry as its sound track, as an iPhone 'Take Video' would give (WebM here: the test browser has no AAC/H.264).
const VIDEO = (() => { try { const v = path.join(TMP, 'cry.webm'); require('child_process').execFileSync('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'color=c=gray:s=160x120:d=5.6', '-i', CRY, '-c:v', 'libvpx', '-c:a', 'libopus', '-shortest', '-y', v]); return v; } catch (e) { return ''; } })();
const TYPES = { '.webp': 'image/webp', '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((q, r) => { const f = path.join(ROOT, q.url.split(/[?#]/)[0] === '/' ? 'index.html' : q.url.split(/[?#]/)[0]); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); r.end(d); } }); });
let passed = 0; const fails = [];
async function step(name, fn) { try { await fn(); passed++; console.log('  ok  ' + name); } catch (e) { fails.push(name); if (global.__page && process.env.FAILSHOT) await global.__page.screenshot({ path: process.env.FAILSHOT + '/fail-' + fails.length + '.png' }).catch(() => {}); console.log('  FAIL ' + name + '\n       ' + String(e.message).split('\n').slice(0, 4).join(' / ')); } }
function eq(a, b, m) { if (a !== b) throw new Error((m || 'expected') + ': ' + JSON.stringify(b) + ', got ' + JSON.stringify(a)); }
function ok(v, m) { if (!v) throw new Error(m || 'assertion failed'); }

(async () => {
  await new Promise(r => server.listen(0, r)); const URL = 'http://localhost:' + server.address().port + '/';
  const browser = await chromium.launch({ args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--use-file-for-fake-audio-capture=' + CRY] });
  const ctx = await browser.newContext({ timezoneId: TZ, viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, permissions: ['microphone', 'clipboard-read', 'clipboard-write'], acceptDownloads: true });
  const page = await ctx.newPage(); const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); }); page.on('pageerror', e => errors.push(String(e)));
  // Existing steps go straight to Settings and accept confirmations; the menu and the confirm panels have their own steps.
  const CONFIRMS = /^(delete|save-edit|moment-save|moment-delete|save-profile|import-paste|share-stop)$/;
  const act = async a => { await page.click(`[data-action="${a}"]`); if (a === 'nav:more') await page.click('[data-action="sub:settings"]'); else if (CONFIRMS.test(a) && await page.locator('#confirm-yes').count()) await page.click('#confirm-yes'); };
  const text = s => page.locator(s).first().innerText();
  const rows = () => page.locator('#view .row').count();
  const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem('babycentre.v1')).data);
  const noOverflow = async n => { const o = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); ok(o <= 0, n + ' scrolls sideways by ' + o + 'px'); };
  global.__page = page;
  const shot = async n => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, n + '.png'), fullPage: false }); };
  const dob = new Date(Date.now() - 60 * 864e5).toISOString().slice(0, 10);

  await page.goto(URL);
  await step('first open shows a sample week, clearly marked', async () => {
    ok((await text('.banner')).includes('sample data')); ok(await rows() > 5); eq(await text('#top h1'), 'Sample baby');
    eq(await page.evaluate(() => localStorage.getItem('babycentre.v1')), null, 'sample data is not saved'); await noOverflow('home'); await shot('01-home-sample');
  });
  await step('timeline shows today only; the back arrow walks through earlier days with the day, date and that day’s entries', async () => {
    ok(/^Today · \w{3}/.test(await text('#tl-when')), await text('#tl-when')); ok(await page.locator('[data-action="tl-day:-1"]').isDisabled(), 'cannot go past today');
    const today = await page.$$eval('#view .row .tm', r => r.length); ok(today > 0);
    await act('tl-day:1'); ok(/^Yesterday · /.test(await text('#tl-when')), await text('#tl-when')); ok(/\d+ feeds · sleep \d+h/.test(await text('#tl-sum')), await text('#tl-sum')); ok(await rows() > 5, 'a full day of sample entries');
    await act('tl-day:1'); ok(!/Today|Yesterday/.test(await text('#tl-when')), 'earlier days show just the date'); eq(await page.locator('[data-action="tl-today"]').count(), 1);
    await act('filter:sleep'); ok(/sleeps?$/.test(await text('#tl-sum')), 'filter applies within the day'); await shot('03g-tl-back');
    await act('tl-today'); ok(/^Today/.test(await text('#tl-when'))); await act('filter:all'); await page.evaluate(() => scrollTo(0, 0)); await noOverflow('timeline nav');
  });
  await step('every tab renders without sideways scroll', async () => {
    for (const v of ['trends', 'cry', 'milestones', 'more', 'home']) { await act('nav:' + v); await noOverflow(v); if (v !== 'home') await shot('02-' + v + '-sample'); }
    await act('nav:trends'); eq(await page.locator('#view svg.chart').count(), 7); await act('week:1'); eq(await page.locator('#view svg.chart').count(), 7); await act('week:-1'); await act('nav:home');
  });
  await step('About shows the version, build date and time, and opens the release notes', async () => {
    await act('nav:more'); const v = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;
    ok((await text('#view')).includes('Baby Centre ' + v), 'version'); ok(/^Built \d{1,2} \w{3} \d{4}, \d{1,2}:\d{2}/.test(await text('#build')) || /^Built \w{3} \d{1,2}, \d{4}, \d{1,2}:\d{2}/.test(await text('#build')), await text('#build'));
    await act('notes-open'); ok((await text('#notes h3')).startsWith(v), 'newest notes first: ' + await text('#notes h3')); ok(await page.locator('#notes table').count() > 0, 'tables rendered'); await shot('22-notes'); await noOverflow('release notes');
    await act('sheet-close'); await act('nav:home');
  });
  await step('More is a menu; Settings holds sharing, baby, preferences, Excel, backup and About, with a back arrow', async () => {
    await page.click('[data-action="nav:more"]'); eq(await text('#top h1'), 'More'); eq(await page.locator('#view .hub').count(), 4); ok((await text('#view')).includes('Tasks')); ok((await text('#view')).includes('Development tracker') && (await text('#view')).includes('Vaccinations'));
    await shot('25-more-menu'); await page.click('[data-action="sub:settings"]'); eq(await text('#top h1'), 'Settings'); ok(await page.evaluate(() => document.querySelector('#view section').id === 'share'));
    for (const s of ['Baby', 'Bottle units', 'Appearance', 'Excel', 'Backup', 'About']) ok(/* headings are upper-cased on screen */ (await text('#view')).toUpperCase().includes(s.toUpperCase()), s);
    await page.click('[data-action="sub:"]'); eq(await text('#top h1'), 'More'); await act('nav:home');
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
    eq(await page.locator('[data-action="breast:L"] .tag').count(), 1, 'left is tagged next'); eq((await text('#last-side')).toUpperCase(), 'RIGHT', 'last side shown'); eq((await text('#next-side .pill')).toUpperCase(), 'LEFT', 'next side is the other one'); ok(/^\s*LAST FEED\s*RIGHT/i.test(await text('.stat.feed .k')), await text('.stat.feed .k'));
  });
  await step('undo brings back the running feed, then finish it again', async () => {
    await act('undo'); eq(await page.locator('.live.feed').count(), 1); await act('feed-stop'); eq(await rows(), 1);
  });
  await step('pause stops the feed clock, resume continues on the same side, paused time is not counted', async () => {
    await act('breast:L'); await page.waitForTimeout(1200); await act('feed-pause');
    ok((await text('#feed-state')).startsWith('Paused on the left')); const frozen = await text('.live.feed .t'); eq(await page.locator('[data-action="feed-resume"]').count(), 2, 'banner and dock both offer Resume');
    await page.waitForTimeout(2300); eq(await text('.live.feed .t'), frozen, 'clock stands still'); await page.reload(); eq(await text('.live.feed .t'), frozen, 'still paused after reopening'); await shot('02b-paused');
    await act('feed-resume'); ok((await text('#feed-state')).startsWith('Feeding on the left')); await page.waitForTimeout(1200); await act('feed-pause');
    await act('breast:R'); ok((await text('#feed-state')).startsWith('Feeding on the right'), 'switching while paused resumes on the other side'); await page.waitForTimeout(1100);
    await act('feed-pause'); await page.waitForTimeout(1200); await act('feed-stop');
    const e = (await stored()).events.filter(x => x.kind === 'breast').sort((a, b) => a.start < b.start ? 1 : -1)[0];
    ok(e.end && !e.paused && !e.segStart && e.lsec >= 2 && e.lsec <= 3 && e.rsec >= 1 && e.rsec <= 2, 'only feeding time counted: ' + JSON.stringify(e));
    await page.locator('#view .row').first().click(); await act('delete'); eq(await rows(), 1);
  });
  await step('bottle: stepper and save in two taps', async () => {
    await act('bottle-open'); eq(await page.inputValue('#f-amount'), '120'); await act('amt:1'); await act('save-bottle'); eq((await text('#last-side')).toUpperCase(), 'BOTTLE', 'last feed was a bottle'); eq((await text('#next-side .pill')).toUpperCase(), 'LEFT', 'next breast side still shown after a bottle');
    eq(await rows(), 2); ok((await text('#view .row')).includes('130 ml')); ok((await text('#snack')).includes('130 ml'));
  });
  await step('sleep timer survives a reload, then saves', async () => {
    await act('sleep-toggle'); eq(await page.locator('.live.sleep').count(), 1);
    const outline = sel => page.evaluate(s => getComputedStyle(document.querySelector(s)).boxShadow, sel);
    ok(/inset/.test(await outline('.live.sleep')), 'running sleep card has an outline');
    await act('breast:L'); ok(/inset/.test(await outline('.live.feed')), 'running feed card has an outline'); await act('undo'); eq(await page.locator('.live.feed').count(), 0);
    await page.reload();
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
  await step('edits and deletes ask first: the changes are listed, Back keeps what was typed, Keep cancels; no-change saves just close', async () => {
    await page.locator('#view .row', { hasText: 'Bottle' }).first().click(); await page.click('[data-action="save-edit"]'); ok((await text('#snack')).includes('No changes'), 'nothing changed: no question');
    await page.locator('#view .row', { hasText: 'Bottle' }).first().click(); await page.fill('#f-amount', '170'); await page.click('[data-action="save-edit"]');
    ok(/Amount: 150 ml → 170 ml/.test(await text('#confirm-lines')), await text('#confirm-lines')); await shot('26-confirm-edit');
    await page.click('#confirm-no'); eq(await page.inputValue('#f-amount'), '170', 'Back keeps the typed value'); await page.click('[data-action="save-edit"]'); await page.click('#confirm-yes');
    ok((await text('#view')).includes('170 ml')); await act('undo'); ok((await text('#view')).includes('150 ml'), 'undo after a confirmed edit');
    await page.locator('#view .row', { hasText: 'Bottle' }).first().click(); await page.click('[data-action="delete"]'); ok((await text('#confirm-lines')).includes('Bottle'));
    await page.click('#confirm-no'); await act('sheet-close'); ok((await text('#view')).includes('150 ml'), 'Back: not deleted');
    await act('nav:more'); await act('units:oz'); ok((await text('#snack')).includes('Bottle units: ounces')); await act('undo'); eq(await page.getAttribute('[data-action="units:ml"]', 'aria-pressed'), 'true', 'units undo'); await act('nav:home');
  });
  await step('growth: More → Development tracker → Growth; ask boy/girl, check entries, percentile, same-day update, edit and delete ask first; not in the care timeline', async () => {
    const go = async a => page.click(`[data-action="${a}"]`);
    await go('nav:more'); await go('sub:dev'); eq(await text('#top h1'), 'Development tracker'); await go('sub:growth'); eq(await text('#top h1'), 'Growth');
    ok((await text('#g-sex')).includes('Boy or girl'), 'asks for sex'); await go('gsex:f'); eq(await page.locator('#g-sex').count(), 0);
    await go('growth-new'); await page.fill('#f-gwt', '50'); await go('growth-save'); ok((await text('.sheet')).includes('Weight looks wrong'), 'out of range');
    await page.fill('#f-gwt', ''); await go('growth-save'); ok((await text('.sheet')).includes('at least one'), 'empty');
    await page.fill('#f-gwt', '4100'); await page.fill('#f-ghc', '37'); await go('growth-save'); ok((await text('#snack')).includes('Measurement saved'));
    ok(/weight percentile: \w+/.test(await text('#g-pct')), await text('#g-pct')); ok((await text('#view')).includes('4.1 kg')); eq(await page.locator('#g-chart circle').count(), 1); await shot('27-growth');
    await go('growth-new'); await page.fill('#f-glen', '55'); await go('growth-save'); ok(/Length: none → 55 cm/.test(await text('#confirm-lines')), await text('#confirm-lines')); await page.click('#confirm-yes');
    eq(await page.locator('[data-action^="growth-edit:"]').count(), 1, 'same day merged'); await go('gtab:len'); ok((await text('#view')).includes('55 cm'));
    await go('gtab:sum'); ok(/Weight[\s\S]*4\.1 kg[\s\S]*Head[\s\S]*37 cm/.test(await text('#view')), await text('#view')); ok((await text('#view')).includes('girls')); ok(/^Overall: /.test(await text('#g-head')), await text('#g-head')); ok(/Weight for length \w+ percentile/.test(await text('#g-meaning')), 'weight-for-length line'); ok((await text('#g-disclaimer')).includes('not a diagnosis'));
    await go('gtab:wt'); await page.locator('[data-action^="growth-edit:"]').first().click(); await page.fill('#f-gwt', '4.2'); await go('growth-save');
    ok(/Weight: 4\.1 kg → 4\.2 kg/.test(await text('#confirm-lines'))); await page.click('#confirm-no'); eq(await page.inputValue('#f-gwt'), '4.2'); await go('growth-save'); await page.click('#confirm-yes'); ok((await text('#view')).includes('4.2 kg'));
    await page.locator('[data-action^="growth-edit:"]').first().click(); await go('growth-delete'); await page.click('#confirm-yes'); ok((await text('#snack')).includes('deleted')); await act('undo'); ok((await text('#view')).includes('4.2 kg'), 'undo delete');
    await go('sub:dev'); ok(/Latest 4\.2 kg/.test(await text('#dev-growth')), await text('#dev-growth')); await go('sub:'); eq(await text('#top h1'), 'More');
    await go('nav:home'); ok(!(await text('#view')).includes('Growth'), 'not in the care timeline'); await noOverflow('growth');
  });
  await step('appointments: calendar and list, questions, validation, Home reminder, confirmed edits, copyable visit summary, measurements from a visit, delete', async () => {
    const go = async a => page.click(`[data-action="${a}"]`), ymd = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const tom = new Date(Date.now() + 864e5), yst = new Date(Date.now() - 864e5);
    await go('nav:more'); await go('sub:dev'); await go('sub:appts'); eq(await text('#top h1'), 'Appointments'); ok((await text('#appt-day')).includes('No appointments'));
    const m0 = await text('#cal-month'); await go('amonth:1'); ok(await text('#cal-month') !== m0, 'next month'); await go('amonth:-1'); eq(await text('#cal-month'), m0);
    await go('appt-qs'); ok((await text('#snack')).includes('Add it first')); eq(await page.inputValue('#f-aday'), ymd(tom)); eq(await page.evaluate(() => document.activeElement.id), 'f-aqs');
    await page.fill('#f-aqs', 'Fever after vaccines?\nHow much milk?'); await go('appt-save'); ok((await text('.sheet')).includes('reason, place or doctor'), 'needs a reason, place or doctor');
    await page.fill('#f-areason', '2-month vaccines'); await page.fill('#f-aplace', 'KK Bangsar'); await page.fill('#f-atime', '10:30'); await go('appt-save'); ok((await text('#snack')).includes('Appointment saved'));
    ok((await text('#appt-next')).includes('tomorrow') && (await text('#appt-next')).includes('2-month vaccines'), await text('#appt-next')); ok((await text('#appt-day')).includes('2 questions to ask'), await text('#appt-day'));
    eq(await page.locator('.cd i').count() >= 1, true, 'dot on the day'); await shot('28-appointments');
    await go('nav:home'); ok(/Tomorrow, 10:30/.test(await text('#appt-banner')), await text('#appt-banner')); await page.click('#appt-banner');
    await page.fill('#f-anote', 'Bring the pink book'); await go('appt-save'); ok((await text('#confirm-lines')).includes('Notes changed')); await page.click('#confirm-yes'); ok((await text('#snack')).includes('updated'));
    await page.click('#appt-banner'); await go('appt-save'); ok((await text('#snack')).includes('No changes'));
    await page.click('#appt-banner'); await go('appt-copy'); const sum = await page.evaluate(() => navigator.clipboard.readText());
    ok(/^Visit summary: Mia/.test(sum) && sum.includes('KK Bangsar') && sum.includes('- Fever after vaccines?') && sum.includes('Notes\nBring the pink book') && !/Daily average/.test(sum), sum); await act('sheet-close'); // no complete day was logged before today, so no daily average
    await go('nav:more'); await go('sub:dev'); ok(/^Next: Tomorrow/.test(await text('#dev-appt')), await text('#dev-appt')); await go('sub:appts');
    await go('aday:' + ymd(yst)); await go('appt-new'); eq(await page.inputValue('#f-aday'), ymd(yst)); await page.fill('#f-adoc', 'Dr Lim'); await go('appt-save');
    await go('aview:list'); ok((await text('#appt-past')).includes('Dr Lim') && (await text('#appt-up')).includes('2-month vaccines'));
    await page.locator('#appt-past .row').first().click(); await go('appt-growth'); eq(await page.inputValue('#f-gday'), ymd(yst), 'measurement dated on the visit'); await act('sheet-close');
    await page.locator('#appt-past .row').first().click(); await go('appt-delete'); await page.click('#confirm-yes'); ok((await text('#appt-past')).includes('No past')); await act('undo'); ok((await text('#appt-past')).includes('Dr Lim'), 'undo');
    for (const id of ['#appt-past', '#appt-up']) { await page.locator(id + ' .row').first().click(); await go('appt-delete'); await page.click('#confirm-yes'); }
    await noOverflow('appointments'); await go('aview:cal'); await go('nav:home'); eq(await page.locator('#appt-banner').count(), 0);
  });
  await step('vaccinations: KKM schedule with status, record and edit a dose, optional and custom vaccines, card photo, KKM chart and link, record from a visit', async () => {
    const go = async a => page.click(`[data-action="${a}"]`), ymd = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const yst = ymd(new Date(Date.now() - 864e5));
    await go('nav:more'); ok(/0 of 14 KKM doses given/.test(await text('#view')), 'girl: 14 doses incl. HPV'); await go('sub:vax'); eq(await text('#top h1'), 'Vaccinations');
    ok((await text('#view')).includes('HPV'), 'HPV listed for a girl'); ok(!(await page.locator('#view .row .ti').allInnerTexts()).some(t => /^(Measles|JE)\b/.test(t)), 'no Sabah/Sarawak-only vaccines');
    await go('vax-open:bcg'); ok((await text('#vax-info')).includes('tuberculosis')); await page.fill('#f-vday', '2020-01-01'); await go('vax-save'); ok((await text('.sheet')).includes('before your baby was born'));
    await page.fill('#f-vday', '2099-01-01'); await go('vax-save'); ok((await text('.sheet')).includes('in the future'));
    await page.fill('#f-vday', yst); await page.fill('#f-vwhere', 'Hospital Ampang'); await go('vax-save'); ok((await text('#snack')).includes('Recorded: BCG single dose'));
    ok((await text('#vax-sum')).includes('1 of 14')); ok(/BCG · Single dose\s*\n?.*Given/.test(await text('#view')) || (await page.locator('.vst.given').count()) === 1, 'shown as given');
    await go('vax-open:bcg'); eq(await page.locator('[data-action="vax-delete"]').count(), 1, 'opens the record'); await page.fill('#f-vbatch', 'X1'); await go('vax-save'); ok((await text('#confirm-lines')).includes('Batch: none → X1')); await page.click('#confirm-yes');
    await go('vax-opt'); await go('vax-save'); ok((await text('.sheet')).includes('Choose the vaccine')); await go('vopt:x'); await go('vax-save'); ok((await text('.sheet')).includes('name of the vaccine'));
    await page.fill('#f-vname', 'Dengue'); await page.fill('#f-vdose', 'Dose 1'); await go('vax-save'); await go('vtab:given'); ok(/Dengue · Dose 1[\s\S]*Optional/.test(await text('#vax-given')), await text('#vax-given'));
    eq(await page.getAttribute('#card-cam', 'capture'), 'environment'); await go('vtab:card'); eq(await page.locator('[data-action="card-cam"]').count() + await page.locator('[data-action="card-add"]').count(), 2, 'camera and gallery'); await page.setInputFiles('#card-file', path.join(ROOT, 'icon-512.png')); await page.waitForSelector('#vax-cards img'); ok((await page.getAttribute('#vax-cards img', 'src')).startsWith('data:image/jpeg'));
    await page.click('#vax-cards .vcard'); await page.fill('#f-cnote', 'Page 2'); await go('card-save'); ok((await text('#vax-cards')).includes('Page 2'));
    await page.click('#vax-cards .vcard'); await go('card-delete'); await page.click('#confirm-yes'); eq(await page.locator('#vax-cards img').count(), 0); await act('undo'); eq(await page.locator('#vax-cards img').count(), 1, 'undo brings the photo back');
    await go('vtab:kkm'); ok((await text('#view .seg')).includes('KKM info')); await page.waitForFunction(() => document.getElementById('kkm-img').naturalWidth > 1000);
    await go('view-kkm'); ok(await page.isVisible('#viewer')); await page.dblclick('#viewer', { position: { x: 195, y: 420 } }); ok((await page.getAttribute('#viewer-img', 'style')).includes('scale(2.5)'), 'double-tap zooms'); await page.keyboard.press('Escape'); ok(await page.isHidden('#viewer'), 'closes'); ok((await page.getAttribute('#kkm-link', 'href')).startsWith('https://www.malaysia.gov.my/')); await shot('29-kkm');
    await go('sub:'); await go('sub:dev'); await go('sub:appts'); await go('aday:' + yst); await go('appt-new'); await page.fill('#f-aplace', 'KK Ampang'); await go('appt-save');
    await page.locator('#appt-day .row').first().click(); await go('appt-vax'); ok((await text('#vax-visit')).includes('KK Ampang')); await go('vax-open:hepb0'); eq(await page.inputValue('#f-vday'), yst); eq(await page.inputValue('#f-vwhere'), 'KK Ampang'); await go('vax-save'); await go('vax-visit-done');
    await go('sub:'); await go('sub:dev'); await go('sub:appts'); await go('aday:' + yst); await page.locator('#appt-day .row').first().click(); await go('appt-copy');
    ok(/Vaccines given\n- BCG \(single dose\), batch X1\n- Hepatitis B \(birth dose\)/.test(await page.evaluate(() => navigator.clipboard.readText())), await page.evaluate(() => navigator.clipboard.readText()));
    await go('appt-delete'); await page.click('#confirm-yes');
    // tidy up so later steps see the same log as before
    await go('sub:dev'); await go('sub:'); await go('sub:vax'); await go('vtab:card'); await page.click('#vax-cards .vcard'); await go('card-delete'); await page.click('#confirm-yes'); await go('vtab:given');
    while (await page.locator('#vax-given .row').count()) { await page.locator('#vax-given .row').first().click(); await go('vax-delete'); await page.click('#confirm-yes'); }
    await noOverflow('vaccinations'); await go('vtab:sched'); await go('nav:home');
  });
  await step('tasks: add from a quick pick, Home card with Done/Later/Skip, name asked once, missed ones closed, Today/Upcoming/History, edit, pause, calendar file, delete', async () => {
    const go = async a => page.click(`[data-action="${a}"]`), hhmm = t => { const d = new Date(t); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }, ymd = t => { const d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
    eq(await page.locator('#task-card').count(), 0, 'no tasks: no card');
    await go('nav:more'); await go('sub:tasks'); eq(await text('#top h1'), 'Tasks'); ok((await text('#tasks-empty')).includes('No tasks yet'));
    await go('task-new'); await go('task-save'); ok((await text('.sheet')).includes('Give the task a name'));
    await go('tpick:1'); eq(await page.inputValue('#f-tname'), 'Vitamin drops'); eq(await page.getAttribute('[data-action="tfrom:schedule"]', 'aria-pressed'), 'true', 'drops count from the schedule');
    await page.fill('#f-tday', ymd(Date.now())); await page.fill('#f-tt0', hhmm(Date.now() - 20 * 6e4)); await page.fill('#f-tnote', '1 ml'); await go('task-save'); ok((await text('#snack')).includes('Added: Vitamin drops'));
    await go('task-new'); await go('tpick:0'); eq(await page.getAttribute('[data-action="tfrom:done"]', 'aria-pressed'), 'true', 'bath counts from when done'); ok((await text('#t-prev')).includes('Every 2 days'));
    await page.fill('#f-tday', ymd(Date.now() - 2 * 864e5)); await go('task-save');
    await go('ttab:all'); ok(/Bath time[\s\S]*Every 2 days[\s\S]*Vitamin drops[\s\S]*Daily at/.test(await text('#tasks-all')), await text('#tasks-all'));
    const cols = await page.$$eval('#tasks-all .dot.task', d => d.map(x => (x.className.match(/tc\d/) || [''])[0])); ok(cols.length === 2 && cols[0] && cols[0] !== cols[1], 'each task gets its own colour: ' + cols);
    ok(/^Today · \d/.test(await text('#ttab-today')), 'Today tab shows how many are open: ' + await text('#ttab-today'));
    await go('nav:home'); const card = () => text('#task-card'), item = n => page.locator('#task-card .titem', { hasText: n });
    ok(/Tasks · 2 due/i.test(await card()), await card()); ok(/\d+m late · 1 ml/.test(await item('Vitamin drops').innerText()), await card()); ok((await item('Bath time').innerText()).includes('Missed 1 earlier'), 'the first bath was missed'); await shot('30-tasks-card');
    await item('Vitamin drops').locator('[data-action^="task-done:"]').click(); await go('me-save'); ok((await text('.sheet')).includes('Enter a name'));
    await page.fill('#f-me', 'Mum'); await go('me-save'); ok((await text('#snack')).includes('done · Mum'), await text('#snack'));
    eq(await item('Vitamin drops').count(), 0, 'vitamin drops ticked'); await act('undo'); eq(await item('Vitamin drops').count(), 1, 'undo puts it back');
    await item('Vitamin drops').locator('[data-action^="task-later:"]').click(); await go('tlater:60'); ok((await text('#snack')).includes('moved to Today'));
    await item('Bath time').locator('[data-action^="task-done:"]').click(); ok((await text('#snack')).includes('Bath time done · Mum'), 'name asked only once');
    ok((await text('#task-quiet')).includes('All done for now') && /Next: Vitamin drops · Today/.test(await card()), await card());
    await go('tasks-open'); ok(/Vitamin drops[\s\S]*Later ·/.test(await text('#tasks-today')), await text('#tasks-today')); ok(/Bath time[\s\S]*Done · Mum/.test(await text('#tasks-today')));
    await page.locator('#tasks-today [data-action^="task-done:"]').first().click(); ok(/Vitamin drops[\s\S]*Done · Mum/.test(await text('#tasks-today')), 'ticked from the Today list');
    await go('ttab:up'); ok((await text('#view')).includes('Bath time'), 'next bath is upcoming');
    await go('ttab:hist'); eq(await page.locator('.week span b').count(), 14, 'a date under each day'); eq(await page.locator('.week span.now').count(), 2, 'today is marked'); ok(/Bath time[\s\S]*Done on 1 day this week/.test(await text('#view')), await text('#view')); eq(await page.locator('.week i.x').count() >= 1, true, 'the missed bath shows red');
    await go('ttab:all'); await page.locator('#tasks-all .row', { hasText: 'Vitamin drops' }).click(); await go('tkind:days'); await page.fill('#f-tn', '3'); await go('tcol:4'); await go('task-save'); ok((await text('#confirm-lines')).includes('→ Red'), 'colour change listed');
    ok((await text('#confirm-lines')).includes('Schedule: Daily') && (await text('#confirm-lines')).includes('Every 3 days')); await page.click('#confirm-yes');
    await page.locator('#tasks-all .row', { hasText: 'Vitamin drops' }).click(); await go('tpause:1'); await go('task-save'); ok((await text('#confirm-lines')).includes('Paused')); await page.click('#confirm-yes'); ok((await text('#tasks-all')).includes('Paused'));
    await page.locator('#tasks-all .row', { hasText: 'Bath time' }).click(); const [dl] = await Promise.all([page.waitForEvent('download'), go('task-cal')]); eq(dl.suggestedFilename(), 'Bath time.ics');
    const ics = fs.readFileSync(await dl.path(), 'utf8'); ok(/BEGIN:VEVENT[\s\S]*RRULE:FREQ=DAILY;INTERVAL=2[\s\S]*BEGIN:VALARM/.test(ics), ics);
    await go('task-delete'); ok((await text('#confirm-lines')).includes('history')); await page.click('#confirm-yes'); ok(!(await text('#tasks-all')).includes('Bath time'));
    await go('sub:'); await go('sub:settings'); eq(await text('#me-name'), 'Mum');
    await page.click('#top .back'); await go('sub:tasks'); await go('ttab:all'); await page.locator('#tasks-all .row').first().click(); await go('task-delete'); await page.click('#confirm-yes');
    eq(await page.evaluate(() => JSON.parse(localStorage.getItem('babycentre.v1')).data.events.filter(e => e.type === 'task' || e.type === 'tlog').length), 0, 'tasks and their history removed');
    await noOverflow('tasks'); await go('nav:home'); eq(await page.locator('#task-card').count(), 0);
  });
  await step('timeline filter groups one activity by day with daily totals; tiles jump to their records', async () => {
    eq(await rows(), 7); await act('filter:diaper'); eq(await rows(), 1); ok(/^Today · /.test(await text('#tl-when')) && /^1 change/.test(await text('#tl-sum')), await text('#tl-sum'));
    await act('filter:feed'); eq(await rows(), 4); ok(/\d feeds? · /.test(await text('#tl-sum')) && /150 ml/.test(await text('#tl')) && /1 solids/.test(await text('#tl')), await text('#tl-sum'));
    await act('filter:sleep'); eq(await rows(), 2); ok(/\d sleeps?/.test(await text('#tl-sum')), await text('#tl-sum'));
    await act('filter:all'); eq(await rows(), 7); await page.evaluate(() => scrollTo(0, 0));
    await act('show:diaper'); eq(await rows(), 1); eq(await page.getAttribute('[data-action="filter:diaper"]', 'aria-pressed'), 'true'); ok(await page.evaluate(() => scrollY > 50), 'scrolled to the timeline');
    await shot('03b-nappies'); await page.locator('#view .row').first().click(); await act('delete'); ok((await text('#tl .empty')).includes('No nappies logged on this day')); await act('undo');
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
  await step('last 24 hours bar: hover or slide to read what happened; a tap opens the full day timeline', async () => {
    await page.evaluate(() => document.querySelector('#rib-svg').scrollIntoView({ block: 'center' })); const box = await page.locator('#rib-svg').boundingBox(), xAt = h => box.x + box.width * (4 + 332 * (24 - h) / 24) / 340, yMid = box.y + box.height * 0.3;
    ok((await text('#rib-read')).includes('Slide a finger'));
    await page.mouse.move(xAt(2.5), yMid); let r = await text('#rib-read'); ok(/Asleep .*\(1h 00m\)/.test(r), 'hover over the logged sleep: ' + r); eq(await page.getAttribute('#rib-cur', 'visibility'), 'visible');
    await page.mouse.move(xAt(20), yMid); r = await text('#rib-read'); ok(/Awake$/.test(r.trim()), 'quiet stretch: ' + r);
    await page.mouse.move(xAt(0.02), yMid); r = await text('#rib-read'); ok(/Awake/.test(r) && /Bottle · 150 ml/.test(r) && /Nappy · Wet/.test(r), 'recent entries listed: ' + r);
    // finger: press, slide sideways, lift. The slide reads out; it must not navigate.
    const touch = (type, x) => page.evaluate(([type, x, y]) => document.querySelector('#rib-svg').dispatchEvent(new PointerEvent(type, { pointerType: 'touch', pointerId: 7, clientX: x, clientY: y, bubbles: true })), [type, x, yMid]);
    await touch('pointerdown', xAt(12)); await touch('pointermove', xAt(8)); await touch('pointermove', xAt(2.5)); ok(/Asleep/.test(await text('#rib-read')), 'slide reads the sleep');
    await touch('pointerup', xAt(2.5)); await page.evaluate(() => document.querySelector('#rib-svg').dispatchEvent(new MouseEvent('click', { bubbles: true }))); eq(await text('#top h1'), 'Mia <b>', 'still on Home after a slide');
    // press and hold without moving also reads out
    await touch('pointerdown', xAt(20)); await page.waitForTimeout(400); ok(/Awake/.test(await text('#rib-read'))); await touch('pointerup', xAt(20)); await page.evaluate(() => document.querySelector('#rib-svg').dispatchEvent(new MouseEvent('click', { bubbles: true }))); eq(await text('#top h1'), 'Mia <b>');
    await shot('03e-ribbon'); await page.mouse.move(5, 5);
    await page.click('#rib-svg'); eq(await text('#top h1'), 'Insights'); eq(await text('#day-label'), 'Last 24 hours');
    ok(await page.evaluate(() => { const r = document.querySelector('#day').getBoundingClientRect(); return r.top >= 0 && r.top < 120; }), 'scrolled to the day timeline');
    ok(/Sleep 1h 00m · 3 feeds · 1 nappy/.test(await text('#day-sum')), await text('#day-sum')); await shot('03f-dayline'); await noOverflow('day timeline');
    const svg = await page.locator('#day-svg').innerHTML(); ok(svg.includes('Bottle 150 ml') && svg.includes('>1h 00m<') && svg.includes('>Now<') && svg.includes('>Wet<'), 'labels drawn');
    await page.locator('#day-svg g[data-action^="edit:"]', { hasText: 'Bottle' }).click(); ok((await text('.sheet h3')).toLowerCase().includes('bottle')); await act('sheet-close');
    await act('day:-1'); eq(await text('#day-label'), 'Today'); await act('day:-1'); eq(await text('#day-label'), 'Yesterday'); ok(/0 feeds/.test(await text('#day-sum')));
    await act('day:1'); await act('day:1'); eq(await text('#day-label'), 'Last 24 hours'); ok(await page.locator('[data-action="day:1"]').isDisabled());
    await act('nav:home'); await act('day-open'); eq(await text('#top h1'), 'Insights'); await act('nav:home');
    await page.focus('#rib'); await page.keyboard.press('Enter'); eq(await text('#top h1'), 'Insights'); await act('nav:home');
  });
  await step('trends reflect the log', async () => {
    await act('nav:trends'); const t = await text('#view'); ok(t.includes('Next feed') && t.includes('Next sleep')); eq(await page.locator('#view svg.chart').count(), 7);
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
    ok((await text('#view')).includes('No confirmed checks yet'), 'explains that answers will personalise'); eq(await page.locator('#cry-why .chip').count(), 15, '6 causes + 8 more reasons + Other');
    await act(`cry-actual:${e.id}:overtired`); eq((await stored()).events.find(x => x.id === e.id).actual, 'overtired');
    await act(`cry-other:${e.id}`); await act(`cry-other-save:${e.id}`); ok((await text('#reason-err')).includes('Type a reason'));
    await page.fill('#f-reason', 'Wanted Mum'); await act(`cry-other-save:${e.id}`); let saved = (await stored()).events.find(x => x.id === e.id); eq(saved.actual, 'x:wanted-mum'); eq(saved.actualText, 'Wanted Mum');
    ok(await page.locator('#cry-why .chip[aria-pressed="true"]', { hasText: 'Wanted Mum' }).count() === 1, 'own reason becomes a chip'); ok(saved.fv && saved.fv.f0 > 0 && 'fed' in saved.fv, 'sound and situation saved with the check');
    await shot('07b-cry-reasons'); await act('cry-history'); ok(await page.evaluate(() => { const r = document.querySelector('#cry-hist').getBoundingClientRect(); return r.top >= 0 && r.top < innerHeight - 100; }), 'All checks brings the history into view');
    ok((await text('#cry-hist')).includes('was wanted mum')); await page.locator('#cry-hist .row').first().click(); await act(`cry-actual:${e.id}:gas`);
    await act('cry-again'); eq(await page.locator('#view .row').count(), 1);
  });
  await step('cry check: cancel mid-recording saves nothing', async () => {
    await act('cry-record'); await page.waitForSelector('#rec-count'); await page.waitForTimeout(600); await act('cry-cancel');
    await page.waitForSelector('[data-action="cry-record"]'); eq((await stored()).events.filter(x => x.type === 'cry').length, 1);
  });
  await step('cry check: uploaded clip works; silent or non-audio files explain what to do', async () => {
    await page.setInputFiles('#cry-file', QUIET); await page.waitForSelector('#cry-error'); ok((await text('#cry-error')).includes('quiet'));
    await page.setInputFiles('#cry-file', path.join(ROOT, 'icon-192.png')); await page.waitForFunction(() => /has no sound this browser can open/.test(document.querySelector('#cry-error')?.textContent || ''));
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
    await act('export'); backup = await page.inputValue('#f-backup'); ok(JSON.parse(backup).data.events.length === 10, 'events in backup (includes one growth entry)');
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
    eq(await text('#top h1'), 'Mia <b>'); eq((await stored()).events.length, 10); eq(Object.keys((await stored()).milestones).length, 1);
    const f = path.join(TMP, 'b.json'); fs.writeFileSync(f, backup); await act('nav:more'); await act('import-open'); await page.setInputFiles('#import-file', f); await page.waitForSelector('#confirm-yes'); ok((await text('#confirm-lines')).includes('replaced by the backup')); await page.click('#confirm-yes'); await page.waitForFunction(() => !document.querySelector('.sheet')); eq((await stored()).events.length, 10);
  });
  await step('burp timer: offered after a feed, play to start, stop saves it and starts sleep; undo reverses both', async () => {
    await act('nav:home'); await page.evaluate(() => { const d = JSON.parse(localStorage.getItem('babycentre.v1')); d.data.events.forEach(e => { if (e.type === 'feed') { e.start = e.end = new Date(Date.parse(e.start) - 2 * 36e5).toISOString(); } }); localStorage.setItem('babycentre.v1', JSON.stringify(d)); }); await page.reload();
    eq(await page.locator('#burp-offer').count(), 0, 'not highlighted when the last feed was hours ago'); eq(await page.locator('#burp-quiet [data-action="burp-start"] svg').count(), 1, 'but always startable from the quiet row');
    const n0 = (await stored()).events.length;
    await act('bottle-open'); await act('save-bottle'); await page.waitForSelector('#burp-offer'); eq(await page.locator('#burp-quiet').count(), 0, 'one burp entry at a time');
    ok(await page.evaluate(() => { const b = document.querySelector('#burp-offer').getBoundingClientRect(), f = document.querySelector('.stat.feed').getBoundingClientRect(), n = document.querySelector('.stat.diaper').getBoundingClientRect(); return Math.abs(b.top - f.top) < 2 && Math.abs(b.width - n.width) < 2 && Math.abs(b.height - f.height) < 2; }), 'idle: half width, same row and height as Last feed'); ok((await text('#burp-offer')).includes('Feed finished')); ok(await page.locator('[data-action="burp-start"] svg').count() === 1, 'play icon');
    await shot('12-burp-offer'); await act('burp-start'); eq(await page.locator('#burp-offer').count(), 0); ok((await text('#burp-run')).includes('BURPING') || (await text('#burp-run')).includes('Burping'));
    ok(await page.evaluate(() => { const r = document.querySelector('#burp-run').getBoundingClientRect(), s = document.querySelector('.stat.feed').getBoundingClientRect(); return Math.abs(r.width - s.width) < 2 && r.bottom <= s.top && !document.querySelector('.status #burp-run'); }), 'running: full width, at the top above the tiles'); ok(await page.locator('[data-action="burp-stop"] svg rect').count() === 1, 'stop icon');
    await page.waitForTimeout(2200); ok(/0:0[1-9]/.test(await text('#burp-run .t')), 'timer runs'); await shot('13-burping'); await noOverflow('burp banner');
    eq(await page.locator('#burp-run [data-action="burp-stop"] svg rect').count(), 1); eq(await page.locator('#burp-run [data-action="burp-sleep"] svg').count(), 1, 'sleep icon button beside Stop');
    await act('burp-stop'); ok(/Burp saved · .*(next nap in about|nap window is open|nap is due)/.test(await text('#snack')), await text('#snack')); eq(await page.locator('#burp-run').count(), 0); eq(await page.locator('.live.sleep').count(), 0, 'Stop does not start sleep');
    let ev = (await stored()).events; eq(ev.length, n0 + 2); const bp = ev.find(e => e.type === 'burp'); ok(bp.end && new Date(bp.end) - new Date(bp.start) >= 2000);
    ok((await text('#view')).includes('Upright'), 'burp shows in the timeline'); ok(/upright/.test(await page.locator('#view .sec', { hasText: 'Today so far' }).innerText()), 'today summary'); ok(/Next nap in|Nap window open|Past the usual/.test(await text('.stat.sleep')), await text('.stat.sleep'));
    eq(await page.locator('#burp-offer').count(), 0, 'not highlighted twice for the same feed');
    // manual start any time: after the feed was already burped, and while the sleep timer is running
    await page.click('#burp-quiet [data-action="burp-start"]'); eq(await page.locator('#burp-run').count(), 1); eq(await page.locator('#burp-quiet').count(), 0); await act('burp-stop'); await page.locator('#view .row', { hasText: 'Burp' }).first().click(); await act('delete');
    await act('sleep-toggle'); await act('breast:L'); await page.waitForTimeout(1100); await act('feed-stop'); eq(await page.locator('#burp-offer').count(), 1, 'offered after a feed even while asleep'); await page.click('#burp-offer [data-action="burp-start"]');
    eq(await page.locator('#burp-run').count(), 1); eq(await page.locator('#burp-run [data-action="burp-sleep"]').count(), 0, 'no Asleep button when sleep is already running'); await shot('15-burp-quiet');
    await act('burp-stop'); eq(await page.locator('.live.sleep').count(), 1, 'running sleep untouched');
    for (const name of ['Burp', 'Breast']) { await page.locator('#view .row', { hasText: name }).first().click(); await act('delete'); } await act('sleep-toggle'); await page.locator('#view .row', { hasText: 'Sleep' }).first().click(); await act('delete');
    // Asleep button: starts the sleep timer and leaves the burp timer running; one undo reverses it
    await act('bottle-open'); await act('save-bottle'); await act('burp-start'); await page.waitForTimeout(1100); await act('burp-sleep'); ok((await text('#snack')).includes('Sleep started · burp timer still running'), await text('#snack'));
    eq(await page.locator('#burp-run').count(), 1, 'burp keeps running'); eq(await page.locator('.live.sleep').count(), 1); eq(await page.locator('#burp-run [data-action="burp-sleep"]').count(), 0, 'Asleep hidden once asleep');
    await act('undo'); eq(await page.locator('#burp-run').count(), 1); eq(await page.locator('.live.sleep').count(), 0); await act('burp-sleep'); await shot('14-asleep');
    await act('burp-stop'); eq(await page.locator('.live.sleep').count(), 1, 'stopping the burp leaves sleep running'); await act('sleep-toggle');
  });
  await step('burp timer during a paused feed: resuming the feed ends the burp and does not start sleep', async () => {
    await act('breast:L'); eq(await page.locator('#burp-offer').count(), 0); await act('feed-pause'); ok((await text('#burp-offer')).includes('Feed is paused'));
    await act('burp-start'); await page.waitForTimeout(1100); await act('feed-resume'); eq(await page.locator('#burp-run').count(), 0); eq(await page.locator('.live.sleep').count(), 0);
    await act('feed-pause'); await act('burp-start'); await act('burp-stop'); eq(await page.locator('.live.sleep').count(), 0, 'feed still paused, so no sleep'); eq(await page.locator('.live.feed').count(), 1);
    await act('feed-stop'); eq((await stored()).events.filter(e => e.type === 'burp').length, 4);
    await act('nav:trends'); ok((await page.locator('#day-svg').innerHTML()).includes('var(--mile)'), 'burps drawn on the day timeline'); await act('nav:home');
    await page.locator('#view .row', { hasText: 'Burp' }).first().click(); ok((await text('.sheet h3')).toLowerCase().includes('burp')); await act('save-edit');
    await act('add-open'); await act('add-kind:burp'); await act('save-edit'); eq((await stored()).events.filter(e => e.type === 'burp').length, 5);
  });
  await step('timers overlap: feeding or burping while asleep; nothing is cancelled; warnings point out odd combinations', async () => {
    await act('nav:home'); await act('sleep-toggle'); await act('breast:R'); ok(!(await text('#snack')).includes('Check'), 'feeding while asleep is normal');
    eq(await page.locator('.live.sleep').count(), 1); eq(await page.locator('.live.feed').count(), 1);
    await act('burp-start'); ok((await text('#snack')).includes('Check: the feed is still running'), await text('#snack')); eq(await page.locator('.live.feed').count(), 1, 'feed not cancelled');
    await act('feed-resume').catch(() => {}); await act('feed-pause'); eq(await page.locator('#burp-run').count(), 1);
    await act('feed-resume'); ok((await text('#snack')).includes('burp timer stopped'), 'resuming a feed says it stopped the burp'); eq(await page.locator('#burp-run').count(), 0); eq(await page.locator('.live.sleep').count(), 1, 'sleep untouched by feed changes');
    await act('feed-stop'); await act('burp-start'); await act('sleep-toggle'); eq(await page.locator('#burp-run').count(), 1, 'waking keeps the burp running'); await act('sleep-toggle');
    ok((await text('#snack')).includes('burp timer still running'), 'falling asleep while burping'); eq(await page.locator('#burp-run').count(), 1);
    await act('tummy-start'); ok((await text('#snack')).includes('Check: the sleep timer is running'), await text('#snack')); eq(await page.locator('#tummy.on').count(), 1, 'tummy not blocked'); eq(await page.locator('.live.sleep').count(), 1);
    await act('tummy-stop'); await act('burp-stop'); await shot('21-overlap');
    // a sleep timer left running for hours is pointed out when logging something else
    await page.evaluate(() => { const d = JSON.parse(localStorage.getItem('babycentre.v1')); d.data.events.forEach(e => { if (e.type === 'sleep' && !e.end) e.start = new Date(Date.now() - 7 * 36e5).toISOString(); }); localStorage.setItem('babycentre.v1', JSON.stringify(d)); }); await page.reload();
    await act('diaper-open'); await act('diaper:wet'); await act('bottle-open'); await act('save-bottle'); ok(/Check: the sleep timer has been running 7h 0\dm/.test(await text('#snack')), await text('#snack'));
    for (const n of ['Bottle', 'Nappy']) { await page.locator('#view .row', { hasText: n }).first().click(); await act('delete'); }
    await act('sleep-toggle'); await page.locator('#view .row', { hasText: 'Sleep' }).first().click(); await act('delete');
    for (const n of ['Upright', 'Upright', 'Tummy time']) { if (await page.locator('#view .row', { hasText: n }).count()) { await page.locator('#view .row', { hasText: n }).first().click(); await act('delete'); } }
    eq((await stored()).events.filter(e => e.type === 'tummy').length, 0);
  });
  await step('tummy time: start and stop, sessions and total for today, personal record, history', async () => {
    await act('nav:home'); await page.locator('#tummy').scrollIntoViewIfNeeded(); eq(await text('#tummy-n'), '0'); eq(await text('#tummy-rec'), '–'); ok(await page.locator('#tummy [data-action="tummy-start"] svg').count() === 1, 'play icon');
    await act('tummy-start'); ok(await page.locator('#tummy.on').count() === 1); await page.waitForTimeout(2200); ok(/0:0[1-9]/.test(await text('#tummy .v')), 'live timer'); await shot('16-tummy-running');
    await act('tummy-stop'); ok(/Tummy time saved · \ds · first session/.test(await text('#snack')), await text('#snack'), 'check 1'); eq(await text('#tummy-n'), '1'); const rec1 = await text('#tummy-rec'); ok(/^\ds$/.test(rec1), rec1);
    await act('tummy-start'); await page.waitForTimeout(300); await act('tummy-stop'); ok(!(await text('#snack')).includes('record'), 'shorter session is not a record'); eq(await text('#tummy-rec'), rec1);
    await act('tummy-start'); await page.waitForTimeout(3300); await act('tummy-stop'); ok((await text('#snack')).includes('new record!'), 'check 2'); ok(await text('#tummy-rec') !== rec1, 'record updated');
    eq(await text('#tummy-n'), '3'); ok(/^\ds$/.test(await text('#tummy-today')) || /^\d+s$/.test(await text('#tummy-today')), await text('#tummy-today'), 'check 3'); await shot('17-tummy'); await noOverflow('tummy card');
    await page.click('#tummy [data-action="show:tummy"]'); eq(await page.getAttribute('[data-action="filter:tummy"]', 'aria-pressed'), 'true'); eq(await rows(), 3); ok(/\ds · 3 sessions · longest \ds/.test(await text('#tl-sum')), await text('#tl-sum'), 'check 4');
    await page.locator('#view .row').first().click(); ok((await text('.sheet h3')).toLowerCase().includes('tummy'), 'check 5'); await act('save-edit');
    await act('add-open'); await act('add-kind:tummy'); await act('save-edit'); eq(await rows(), 4); await page.reload(); eq(await text('#tummy-n'), '4'); await act('filter:all');
    await act('nav:trends'); ok(/tummy time per day/i.test(await text('#view')), 'check 6'); ok((await page.locator('#day-svg').innerHTML()).includes('var(--tummy)'), 'on the day timeline'); await act('nav:home');
  });
  await step('milestone journal: suggestions or free text, date and notes, list newest first, edit, delete with undo', async () => {
    await act('nav:milestones'); ok((await text('#journal')).includes('Record your baby'), 'check 7'); await shot('18-journal-empty');
    await act('moment-new'); eq(await page.locator('#m-sugs .sug').count(), 30, '30 suggestions'); await act('moment-save'); ok((await text('#sheet-err')).includes('Enter the milestone'), 'check 8');
    await page.locator('#m-sugs .sug', { hasText: 'First laugh' }).click(); eq(await page.inputValue('#f-mtitle'), 'First laugh'); await page.fill('#f-mnote', 'Giggled at the cat\nTwice!'); await shot('19-journal-add');
    const today = await page.inputValue('#f-mday'); await act('moment-save'); ok((await text('#snack')).includes('Milestone added · First laugh'), 'check 9');
    let r = await text('#journal .row'); ok(r.includes('First laugh') && r.includes('Giggled at the cat') && /at \d+ weeks/.test(r), r);
    await act('moment-new'); await page.fill('#f-mtitle', 'Grabbed my hair'); await page.fill('#f-mday', '2020-01-01'); await act('moment-save'); ok((await text('#sheet-err')).includes('before your baby was born'), 'check 10');
    await page.fill('#f-mday', '2099-01-01'); await act('moment-save'); ok((await text('#sheet-err')).includes('in the future'), 'check 11');
    const dob = (await stored()).baby.dob, d2 = new Date(dob + 'T12:00'); d2.setDate(d2.getDate() + 10); const day2 = d2.getFullYear() + '-' + String(d2.getMonth() + 1).padStart(2, '0') + '-' + String(d2.getDate()).padStart(2, '0');
    await page.fill('#f-mday', day2); await act('moment-save');
    const titles = await page.locator('#journal .row .ti').allInnerTexts(); eq(titles.join('|'), 'First laugh|Grabbed my hair', 'newest first'); ok((await page.locator('#journal .row').nth(1).innerText()).includes('at 10 days'), 'check 12');
    await act('moment-new'); ok(await page.locator('#m-sugs .sug.done', { hasText: 'First laugh' }).count() === 1, 'recorded suggestion is ticked'); await act('sheet-close');
    await page.locator('#journal .row', { hasText: 'First laugh' }).click(); eq(await page.inputValue('#f-mday'), today); await page.fill('#f-mnote', 'Giggled at the cat'); await page.fill('#f-mtitle', 'First real laugh'); await act('moment-save');
    ok((await text('#journal')).includes('First real laugh'), 'check 13'); await page.locator('#journal .row', { hasText: 'Grabbed my hair' }).click(); await act('moment-delete'); eq(await page.locator('#journal .row').count(), 1);
    await act('undo'); eq(await page.locator('#journal .row').count(), 2); await page.reload(); eq(await page.locator('#journal .row').count(), 2); await shot('20-journal'); await noOverflow('journal');
    eq((await stored()).events.filter(e => e.type === 'moment').length, 2); await act('nav:home'); eq(await page.locator('#view .row', { hasText: 'First real laugh' }).count(), 0, 'journal entries stay out of the care timeline');
    await act('nav:trends'); ok(!(await page.locator('#day-svg').innerHTML()).includes('First real laugh'), 'check 14'); await act('nav:home');
  });
  await step('moving the start of a running timer moves its clock: breast feed (running and paused) and sleep', async () => {
    await act('nav:home'); const inp = t => { const d = new Date(t), p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };
    const mins = s => { const m = /^(\d+):(\d\d)$/.exec(s.trim()); return m ? +m[1] + (+m[2]) / 60 : NaN; };
    await act('breast:L'); await page.waitForTimeout(1100); await page.locator('#view .row', { hasText: 'feeding now' }).first().click();
    await page.fill('#f-start', inp(Date.now() - 10 * 60000)); await act('save-edit'); let m = mins(await text('.live.feed .t')); ok(m >= 9.9 && m < 11, 'feed clock follows the earlier start: ' + await text('.live.feed .t'));
    await act('feed-pause'); await page.locator('#view .row', { hasText: '(paused)' }).first().click(); await page.fill('#f-start', inp(Date.now() - 15 * 60000)); await act('save-edit');
    m = mins(await text('.live.feed .t')); ok(m >= 14.9 && m < 16, 'paused feed clock follows too: ' + await text('.live.feed .t'));
    await act('feed-resume'); await page.locator('#view .row', { hasText: 'feeding now' }).first().click(); await page.fill('#f-start', inp(Date.now() - 5 * 60000)); await act('save-edit');
    m = mins(await text('.live.feed .t')); ok(m >= 4.9 && m < 6, 'a later start shortens the clock: ' + await text('.live.feed .t'));
    const runId = (await stored()).events.find(x => x.kind === 'breast' && !x.end).id; await act('feed-stop'); const f = (await stored()).events.find(x => x.id === runId); ok(Math.abs(f.lsec + f.rsec - 300) < 70, 'saved feed length matches: ' + (f.lsec + f.rsec));
    await act('sleep-toggle'); await page.locator('#view .row', { hasText: 'Asleep now' }).first().click(); await page.fill('#f-start', inp(Date.now() - 10 * 60000)); await act('save-edit');
    m = mins(await text('.live.sleep .t')); ok(m >= 9.9 && m < 11, 'sleep clock follows: ' + await text('.live.sleep .t')); await act('sleep-toggle');
    await page.locator('#view .row', { hasText: 'Sleep' }).first().click(); await act('delete'); await page.locator(`[data-action="edit:${runId}"]`).click(); await act('delete');
  });
  await step('unreadable saved data is kept aside, not destroyed', async () => {
    await page.evaluate(() => localStorage.setItem('babycentre.v1', '{broken')); await page.goto(URL + '#home'); await page.reload();
    eq(await text('#top h1'), 'Sample baby'); eq(await page.evaluate(() => localStorage.getItem('babycentre.v1.unreadable')), '{broken');
  });
  await step('works installed and offline (service worker)', async () => {
    await page.evaluate(() => navigator.serviceWorker.ready); await page.reload(); await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    await ctx.setOffline(true); await page.reload(); eq(await text('#top h1'), 'Sample baby'); await act('nav:trends'); eq(await page.locator('#view svg.chart').count(), 7); await ctx.setOffline(false);
  });
  await step('small phone (320px) and large text do not break the layout', async () => {
    await page.setViewportSize({ width: 320, height: 568 }); for (const v of ['home', 'trends', 'cry', 'milestones', 'more']) { await act('nav:' + v); await noOverflow(v + ' @320'); }
    await act('nav:home'); await act('bottle-open'); await noOverflow('sheet @320'); await act('sheet-close'); await act('breast:L'); await noOverflow('feed banner @320'); await shot('11-home-320'); await act('feed-stop');
  });
  await step('no console errors during the whole run', async () => { eq(errors.filter(e => !/Failed to load resource/.test(e)).join(' | '), ''); });
  // Microphone refused
  const ctx2 = await browser.newContext({ timezoneId: TZ, viewport: { width: 390, height: 844 } }); const p2 = await ctx2.newPage(); await p2.goto(URL + '#cry');
  await step('deep link opens the cry tab; a blocked microphone gives a clear way forward', async () => {
    eq(await p2.locator('#top h1').innerText(), 'Cry check');
    await p2.evaluate(() => { navigator.mediaDevices.getUserMedia = () => Promise.reject(Object.assign(new Error('x'), { name: 'NotAllowedError' })); });
    await p2.click('[data-action="cry-record"]'); await p2.waitForSelector('#cry-error'); ok((await p2.locator('#cry-error').innerText()).includes('opens your phone’s recorder'));
    eq(await p2.locator('[data-action="cry-record"]').count(), 0, 'live recording no longer offered'); ok(await p2.locator('#cry-cap').getAttribute('capture') !== null, 'recorder input asks for capture');
    const [fc] = await Promise.all([p2.waitForEvent('filechooser'), p2.click('[data-action="cry-native"]')]); await fc.setFiles(CRY); await p2.waitForSelector('#cry-top', { timeout: 15000 });
    await p2.reload(); eq(await p2.locator('[data-action="cry-native"]').count(), 1, 'remembered after reopening');
  });
  const ctx3 = await browser.newContext({ timezoneId: TZ, viewport: { width: 390, height: 844 } }); await ctx3.addInitScript(() => { window.claude = { use: () => Promise.resolve(null) }; });
  const p3 = await ctx3.newPage(); await p3.goto(URL + '#cry');
  const ctx4 = await browser.newContext({ timezoneId: TZ, viewport: { width: 390, height: 844 }, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1' });
  await ctx4.addInitScript(() => { window.claude = { use: () => Promise.resolve(null) }; });
  const p4 = await ctx4.newPage(); await p4.goto(URL + '#cry');
  await step('on iPhone, Record offers Take Video or Choose File and analyses the sound from a video', async () => {
    eq(await p4.locator('#cry-cap').getAttribute('capture'), null, 'no capture: iOS would open the video camera with no choice'); ok((await p4.locator('#cry-cap').getAttribute('accept')).includes('video/*'));
    ok((await p4.locator('#cry-how').innerText()).includes('Take Video')); if (SHOTS) await p4.screenshot({ path: path.join(SHOTS, '24-cry-ios.png') });
    if (VIDEO) { const [fc] = await Promise.all([p4.waitForEvent('filechooser'), p4.click('[data-action="cry-native"]')]); await fc.setFiles(VIDEO); await p4.waitForSelector('#cry-top', { timeout: 20000 }); eq(await p4.locator('#cry-top').innerText(), 'Pain or distress', 'sound taken from the video'); }
  });
  await step('inside the shared Claude page, Record opens the phone recorder straight away and the clip is analysed', async () => {
    ok((await p3.locator('#cry-how').innerText()).includes('phone’s recorder')); eq(await p3.locator('[data-action="cry-record"]').count(), 0);
    if (SHOTS) await p3.screenshot({ path: path.join(SHOTS, '23-cry-native.png') });
    const [fc] = await Promise.all([p3.waitForEvent('filechooser'), p3.click('[data-action="cry-native"]')]); ok(!fc.isMultiple());
    await fc.setFiles(CRY); await p3.waitForSelector('#cry-top', { timeout: 15000 }); eq(await p3.locator('#cry-top').innerText(), 'Pain or distress');
  });
  await browser.close(); server.close(); fs.rmSync(TMP, { recursive: true, force: true });
  console.log(`\n${passed} passed, ${fails.length} failed`); process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
