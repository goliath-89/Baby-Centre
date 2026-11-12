# Baby Centre: Product Requirements

Version 1.5 · 12 November 2026 · Status: shipped as v1.5.0

## 1. Problem

A parent in the first year is logging feeds, sleep and nappies many times a day, usually with one hand and often at 3 am. Existing apps bury the log button under several screens, and none of them connect the log to the question a parent asks most: why is my baby crying, and what should I try?

## 2. Who it is for

Two parents or carers, each on their own phone, tracking one baby from birth to 12 months.

## 3. Goals

| # | Goal | How we know |
|---|------|-------------|
| G1 | Log a feed, sleep or nappy in one or two taps, one handed | Breast and sleep: 1 tap. Bottle and nappy: 2 taps. All from the bottom of the home screen |
| G2 | Answer "how long since…" at a glance | Home shows time since last feed, awake/asleep time, time since last nappy |
| G3 | Help plan the next feed and sleep | Home and Trends show a predicted next feed time and nap window |
| G4 | Suggest why the baby is crying from a 5 second clip, with a next action | Cry check returns ranked causes, steps to try, and when to seek help |
| G5 | Track developmental milestones for months 0–12 | 48 milestones in 4 age bands and 4 areas, with dates |
| G6 | Work on any phone, offline, with no account | Single HTML file, installable PWA, data stays on the device |
| G7 | Both parents see and update one log, live | A change on one phone shows on the other within about two seconds; offline changes merge later |
| G8 | Get the data out and back in with Excel | Export a workbook, edit it, import it; the app matches the file |

## 4. Not in scope for v1

Multiple babies, more than one shared log per install, accounts and sign-in, end-to-end encryption of the shared log, reminders/notifications, growth charts, pumping log, medication log, a trained machine-learning cry model.

## 5. Features

### 5.1 Home
- Header: baby name and age.
- Live timers for a running feed or sleep, with Switch / Done / Woke up.
- Status tiles: last feed (with last side and predicted next feed), sleep (awake or asleep time, next nap window), nappy (time since, count today).
- Today so far: breast count and time, bottle count and total, sleep total, longest stretch.
- Last 24 hours ribbon: sleep blocks, feed marks, nappy and cry dots. Interactive (v1.4): hovering, or pressing and sliding a finger, shows a marker and a readout of the time, asleep/awake state and entries within 30 minutes. A slide never navigates; a plain tap opens the Day timeline on Trends. Vertical page scrolling still works when the finger starts on the bar.
- Status tiles are buttons: each opens the Timeline filtered to its activity (v1.2).
- Timeline: entries by day, tap to edit or delete; add past entry. A filter (All, Feeds, Sleep, Nappies) shows one activity for the last 7 days, grouped by day with a daily total (v1.2).
- Baby photo next to the name; an initial is shown when there is no photo (v1.2).
- Action tray floating above the tab bar: **L**, **R**, **Bottle**, **Sleep**, **Nappy**. The side to offer next is tagged. The tray is a raised panel and each button has its own depth, so actions read as buttons and the flat bar beneath reads as navigation (v1.3).

### 5.2 Feeds
- Breast: tap L or R to start. Tap the other side to switch. Time per side is recorded.
- Pause and resume (v1.3): Pause banks the time fed so far and stops the clock; Resume continues on the same side; Switch while paused resumes on the other side. The clock and the saved feed count feeding time only. A paused feed stays paused across app restarts and on the partner's phone.
- Bottle: amount stepper pre-filled with the last amount, quick amounts, ml or oz.
- Solids: free text, added from "Add past entry".
- Prediction: median of the baby's recent feed-to-feed gaps (last 4 days, at least 3 gaps), otherwise a typical gap for the age.

### 5.2a Burp timer (v1.5)
- Purpose: record burping or upright time after a feed, and hand over to sleep without another tap.
- Offered on Home while a feed is paused, and for 30 minutes after the last milk feed ends, once per feed. Not offered while the baby is asleep.
- Start has a play icon; while running, the strip shows a clock and a stop icon.
- Stop saves the burp. If no feed is in progress and no sleep is running, the sleep timer starts at the same moment (one Undo reverses both).
- Resuming or switching a feed, starting another feed, or starting sleep by hand ends a running burp timer.
- Stored as its own entry type with start and end; included in timeline, daily summary, Day timeline, Excel (Burps sheet), backup and sync.

### 5.3 Sleep
- One tap starts, one tap ends. A running sleep survives closing the app.
- Prediction: last wake time plus the typical awake window for the age (for example 60–90 minutes at 1–3 months).

### 5.4 Trends
- Plan ahead card: next feed, next sleep, reference ranges for the age.
- Day timeline (v1.4): the last 24 hours at full size, time running downward at 46 px per hour, lanes for sleep, feeds, nappies and cry checks, with labels, a Now line and a date marker at midnight. Arrows step to Today, Yesterday and earlier calendar days. Every block and marker opens its entry.
- Week view with previous/next: average sleep per day, longest stretch, feeds per day, nappies per day.
- Charts: sleep pattern grid (days across, 24 hours down, with feed marks), sleep hours per day against the guide range, breast minutes left/right, bottle amount, feeds per day.

### 5.5 Cry check
- Record 5 seconds with the microphone, or upload a clip.
- The clip is analysed on the phone. Audio is never stored or sent anywhere.
- Output: most likely cause, top three causes with percentages, pitch, burst count, distress level, steps to try, what the result is based on, and safety guidance.
- Causes: hungry, tired, pain or distress, uncomfortable, wind or tummy, wants comfort.
- The parent can confirm what it really was. Confirmed answers adjust future results.
- A clip with no cry (silence, speech, noise) is rejected with advice, not guessed at.

#### How the estimate is made
1. **Acoustic features**: fundamental frequency (autocorrelation pitch tracking, 150–1200 Hz), cry burst length, pause length, share of time crying, rhythm regularity, pitch variability, and the share of harsh (unvoiced) sound.
2. **Reference profiles**: each cause has an expected range for every feature. These come from findings in infant cry research: pain cries tend to be higher pitched, longer, harsher and more continuous; hunger cries are rhythmic and repetitive at mid pitch; tired and fussy cries are lower, shorter and broken by longer pauses.
3. **Context from the log**: time since the last feed against the usual gap, time awake against the awake window, time since the last nappy, and whether a feed just ended.
4. **Personal history**: causes the parent has confirmed before.

The scores are combined and shown as percentages.

#### Limits (stated in the app)
Research supports that cry acoustics mainly signal how distressed a baby is; the specific cause is often not identifiable from sound alone. That is why the app weighs in the log. The reference profiles are research-informed heuristics, not a model trained on labelled recordings, and the app is not a medical device. Nanni AI and ChatterBaby use trained models on large private datasets; matching that needs a labelled cry corpus (see roadmap).

Sources: Wasz-Höckert et al. 1968; Porter, Miller & Marshall 1986; Zeskind & Lester; LaGasse, Neal & Lester 2005; ChatterBaby (UCLA).

### 5.6 Milestones
- Bands 0–3, 4–6, 7–9, 10–12 months; areas Motor, Sensory, Communication, Feeding.
- Opens on the band for the baby's age. Tap to mark reached (dated today), tap again to clear.
- Wording is original; content follows CDC and Pathways.org checklists.

### 5.7 More
- Baby profile, bottle units, appearance (match phone, light, dark).
- Share with partner (5.8), Excel (5.9).
- Backup: download a file or copy text; restore from file or pasted text.
- Erase all data (two taps).

### 5.8 Share with partner (v1.1)
**What the user gets.** Both phones hold the same log: entries, running timers, milestones and the baby profile. A feed started on one phone shows as a live timer on the other and can be switched or stopped from either. Units and appearance stay per phone.

**Rules.**
- Every record (one entry, one milestone, the profile) carries the time it last changed. When two phones disagree, the newer change wins for that record only; nothing else is touched.
- A deleted entry leaves a marker so an old copy on the other phone cannot bring it back. Undo removes the marker.
- Works offline: changes queue on the phone (the count is shown) and are sent when the connection returns.
- Sample data is never shared.
- Joining from a phone that already has its own log combines the two logs.
- Stopping sharing keeps the phone's copy and stops updates.

**Connections.** The merge logic is the same for both.

| Where the app runs | Shared store | Setup |
|---|---|---|
| Installed web app (GitHub Pages or any host) | A Firebase Realtime Database the user owns, reached over plain HTTPS (REST + EventSource, no SDK) | Create a free database, paste its address, send the invite code or link to the partner |
| Hosted Claude page | The page's own shared store | Tap "Share this log" on both phones; the owner invites the partner as an Editor |

**Inviting (v1.2).** Sharing is the first section under More and always shows one primary action.
- Installed app: *Invite my partner* → database address (first time only) → invite sheet with **Send** (phone share sheet), **Email** and **Copy**. The partner opens the link, which opens the Join screen with the code filled in. *I have an invite* accepts a pasted code. *Invite partner* reopens the invite later.
- Hosted page: *Share with my partner* turns sharing on and shows three steps: give access in the page's Share menu as Editor, send the link (shown with a Copy button), partner taps Join. On the partner's phone a banner on Home offers *Join <name>'s log* as soon as the page opens.
- If the hosted page cannot reach its shared store, the section says so and offers nothing that cannot work.

**Profile photo (v1.2).** Cropped to a 256 px square JPEG on the phone (about 10–25 KB), stored with the profile and shared like any other record. Images arriving from a partner or a backup are accepted only if they are small inline JPEG, PNG or WebP data.

**Privacy.** The invite code holds the database address and a random 20-character log id. Anyone with the code can read and change the log. The database rules stop anyone listing logs, so the id works as the key. Data is not end-to-end encrypted.

**Known trade-offs.** "Newest wins" uses each phone's clock, so a phone with a badly wrong clock can win or lose unfairly. Two edits to the same entry in the same moment keep only one. Deletion markers are kept indefinitely.

### 5.9 Excel export and import (v1.1)
- **Export** writes one `.xlsx` workbook with sheets Feeds, Sleep, Nappies, Cry checks, Milestones, Baby and How to edit. Times are real Excel date cells, so they sort and filter.
- **Import** makes the app match the file: changed rows update, new rows are added, deleted rows are removed. A sheet that is missing from the file leaves that part of the log alone.
- The file is checked first. Any problem is listed by sheet and row, and nothing is imported until the file is clean. A summary is shown before import, and Undo is offered after.
- The ID column links a row to its entry; rows without an ID are new.
- Cry checks can only have their confirmed cause changed, because the analysis cannot be recreated from a spreadsheet.
- When sharing is on, an import reaches the partner's phone too.
- Built without a spreadsheet library, so it works offline: the app writes and reads the workbook format directly. Reading needs a browser from 2023 or later.

## 6. Design principles
- **Thumb first**: every logging action sits in the bottom third; targets are at least 44 px.
- **Fewest taps**: no confirmation dialogs. Every change shows a 6 second Undo instead.
- **Glanceable**: durations are large; predictions are written as clock times.
- **Night friendly**: dark theme follows the phone; colour is used for meaning (amber feed, indigo sleep, teal nappy, rose cry).
- **Honest**: sample data is labelled; predictions say whether they come from the baby's own pattern or from age norms.

## 7. Technical
- One file, `index.html`, with inline CSS and JS. No build step, no network requests.
- `localStorage` with a versioned schema (`schemaVersion: 1`) and explicit migrations. Saved on every change. Unreadable data is set aside, never overwritten.
- PWA: `manifest.webmanifest` and `sw.js` make it installable and available offline when served over HTTPS.
- Microphone capture uses Web Audio (raw PCM), which works in Chrome, Safari and Firefox on phones.
- Schema v2 adds a change stamp to every record; v1 data is migrated on load.
- Tests: `npm test` runs unit tests (logic, merge, Excel, including round trips through openpyxl and LibreOffice) and two Playwright suites (single phone with a fake microphone; two phones against mock sync backends).

## 8. Roadmap
1. Train and ship an on-device cry classifier (for example on the Donate-a-Cry corpus), validated against held-out recordings.
2. Feed and sleep reminders.
3. Growth log with WHO percentile curves.
4. Multiple babies; sign-in and encryption for the shared log; sharing without the user creating a database.
5. Pumping and medication logs.
