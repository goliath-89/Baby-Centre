# Baby Centre: Product Requirements

Version 1.8 · 23 November 2026 · Status: shipped as v1.8.0

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
- Timeline (v1.7.1): one day at a time, today by default, headed with the day, date and a daily summary; ‹ / › step through days; filters apply within the day; tap an entry to edit or delete; add past entry.
- Burp tile (v1.7.1): half width beside Last feed with Start when idle (highlighted when due); full width under Last feed while running, with Stop and Asleep.
- Previously: entries by day. A filter (All, Feeds, Sleep, Nappies) shows one activity for the last 7 days, grouped by day with a daily total (v1.2).
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
- Outside those cases a quieter "Burp timer" row with the same play button sits in the same place, so the timer can always be started by hand (v1.5.2).
- Start has a play icon; while running, the strip shows a clock and a stop icon.
- Stop saves the burp and shows the time to the next nap; it does not start sleep (v1.5.1).
- Asleep (moon icon, beside Stop) starts the sleep timer and leaves the burp timer running (v1.6.1).
- The Sleep tile counts down to the nap window while the baby is awake. The window is the age-based awake time counted from the last wake, or from the end of the last burp when no sleep has been logged.
- Resuming or switching a feed, starting another feed, or starting sleep by hand ends a running burp timer.
- Stored as its own entry type with start and end; included in timeline, daily summary, Day timeline, Excel (Burps sheet), backup and sync.

### 5.2b Tummy time (v1.6)
- Card on Home below the status tiles: Start (play icon) / Stop (stop icon), live timer while running.
- Shows today's total (seconds for short sessions, e.g. "3m 05s"), sessions today, last session, personal record (longest completed session ever, with date) and a bar towards 30 minutes a day.
- A session that beats the previous record is announced in the confirmation ("new record!").
- Guidance shown: short, frequent sessions while awake and supervised, building to 15–30 minutes a day by about 7 weeks (AAP).
- Timeline filter "Tummy" with per-day total, count and longest; Trends chart with the 15–30 minute band; Day timeline lane; Excel sheet "Tummy time"; sync and backup.

### 5.2c Overlapping timers (v1.6.1)
- Sleep may run at the same time as a feed or the burp timer; none of them stops the others. The only automatic stop: starting, switching or resuming a breast feed ends a running burp timer, and the confirmation says so.
- Consistency checks append "Check: …" to the confirmation, never change data: sleep running over 6 hours or an unpaused feed over 2 hours when logging something else; tummy time while asleep or while feeding; sleep or a feed started during tummy time; burp started while a feed is running unpaused.

### 5.3 Sleep
- One tap starts, one tap ends. A running sleep survives closing the app.
- Prediction: last wake time plus the typical awake window for the age (for example 60–90 minutes at 1–3 months).

### 5.4 Insights (was Trends)
- Plan ahead card: next feed, next sleep, reference ranges for the age.
- Day timeline (v1.4): the last 24 hours at full size, time running downward at 46 px per hour, lanes for sleep, feeds, nappies and cry checks, with labels, a Now line and a date marker at midnight. Arrows step to Today, Yesterday and earlier calendar days. Every block and marker opens its entry.
- Week view with previous/next: average sleep per day, longest stretch, feeds per day, nappies per day.
- Charts: sleep pattern grid (days across, 24 hours down, with feed marks), sleep hours per day against the guide range, breast minutes left/right, bottle amount, feeds per day.

### 5.5 Cry check
- Record 5 seconds with the microphone, or upload a clip.
- The clip is analysed on the phone. Audio is never stored or sent anywhere.
- Output: most likely cause, top three causes with percentages, pitch, burst count, distress level, steps to try, what the result is based on, and safety guidance.
- Causes: hungry, tired, pain or distress, uncomfortable, wind or tummy, wants comfort.
- The parent can confirm what it really was: one of the six causes, eight more specific reasons (overtired, too hot or cold, wet or dirty nappy, needs burping, teething, overstimulated, bored, unwell) or their own words (v1.8).
- Personal model (v1.8): each check stores its sound features and the log context at that moment (feed gap ratio, awake ratio, minutes since nappy, minutes since feed end, time of day). New results blend the general estimate with a similarity-weighted vote of the baby's confirmed past checks; weight grows with the number of close matches (one match nudges, about five can decide). Custom reasons become predictable once confirmed on similar cries.
- Result card has "Record again" and "All checks" at the top (v1.8).
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

### 5.6a Milestone journal (v1.6)
- Section at the top of the Milestones tab, above the development checklist.
- Add: title (one of 30 suggestions, or free text up to 80 characters), date (between birth and today) and optional notes (up to 1,000 characters).
- Suggestions, grouped by typical age: newborn to 1 month (first bath, first trip outside, lifts head briefly on tummy, follows a face, first real smile); 2–3 months (first coo, first laugh, holds head steady, grasps a rattle, pushes up on forearms); 4–6 months (rolls tummy to back, rolls back to tummy, reaches for a toy, first babble, sits with support, first taste of solid food, turns to their name); 7–9 months (sits without support, first tooth, passes a toy hand to hand, starts crawling, plays peekaboo, pulls up to stand, waves bye-bye); 10–12 months (claps hands, picks up food with finger and thumb, cruises along furniture, first word, stands alone, first steps). Already-recorded suggestions are ticked; the group for the baby's current age is marked.
- List: newest first, with date, the baby's age on that date, and notes. Tap to edit or delete (with Undo).
- Stored as its own entry type; included in Excel ("Milestone journal" sheet: Date, Milestone, Notes, ID), backup and sync; excluded from the care timeline, daily counts and charts.

### 5.7 More
- Baby profile, bottle units, appearance (match phone, light, dark).
- About: version, build date and time, and the release notes shown in the app (v1.7).
- Share with partner (5.8), Excel (5.9).
- Backup: download a file or copy text; restore from file or pasted text.
- Erase all data (two taps).
- v1.9: More is a menu (Development tracker, Vaccinations, Settings). Settings holds the items above. Edits, deletes, restore and Stop sharing are confirmed with a list of what will change; simple toggles use Undo.

### 5.7b Doctor's appointments (v1.11)
- More → Development tracker → Appointments. Each appointment has a date and time, reason, place, doctor, questions to ask (one per line) and notes on what was discussed. At least one of reason, place or doctor is needed. Dates run from birth to two years ahead.
- **Calendar** (month grid, Monday first, dots on days with appointments, today ringed, tap a day to see its appointments and add one on that day) and **List** (upcoming soonest first, past newest first). A card shows the next appointment.
- **Questions** opens the next appointment's questions; if there is none, a new appointment for tomorrow.
- **Home reminder** for an appointment today or tomorrow; tapping it opens the appointment.
- **Copy visit summary**: plain text with the baby's age, when and where, reason, questions, latest growth with percentiles (up to the visit), daily averages for feeds, sleep and nappies over the complete days before the visit (or before today for an upcoming one), and notes. If the clipboard is blocked, the text is shown to select.
- **Add measurements** from a past appointment opens the growth form dated on the visit.
- Edits list what changed and ask first; deletes ask first with Undo. Partners can add, edit and delete. Synced, in backups and in the Excel sheet Appointments.

### 5.7d Tasks (v1.13)
- More → Tasks: repeatable or one-off jobs for the baby (bath, vitamin drops, sterilising, medicine, nail trim) with reminders on Home.
- **A task**: name, first due date and time, repeat (once, daily with up to 4 times a day, every 2–60 days, weekly on the first due's weekday, monthly on its date), "next one counts from" (the schedule, or when it is done: the gap restarts from the day it is ticked, keeping the time of day), an end (never, a date, or a number of times), a note shown on the card, and Active or Paused. Quick picks fill sensible settings: Bath and Nail trim count from when done; drops and medicine from the schedule.
- **Home card**, below the Last feed tiles and above Tummy time, while a task is due within 30 minutes or late. Each due task shows its time, how late it is, its note, and **Done**, **Later** (15 min, 1 h, 3 h, tomorrow at the same time, or a chosen time within two weeks; only that occurrence moves) and **Skip** (not doing it this time; kept in History). Unticked earlier occurrences are not stacked: the card shows the latest with "Missed N earlier", and ticking or skipping it records those as missed. With nothing due, the card shows "All done for now" and the next task; with no tasks it is hidden.
- **Who ticked it**: each person enters a short name once (asked on the first tick; changeable in Settings → Your name). It is kept per person (per phone, and per viewer on the hosted page) and saved on every tick and skip.
- **Tasks page**: Today (outlined, with the number still open; each due time with its status and who did it, with a Done button for open ones), Upcoming (7 days), All tasks (rule in words; tap to edit) and History (7 days per task with the date under each day: done, skipped, missed, still to do today; with a rate). Each task has one of 10 colours, chosen automatically and changeable (v1.13.1).
- **Phone calendar**: Save to phone calendar writes an .ics file with one repeating event per time of day and an alert at the due time, so the phone reminds you when the app is closed. A task that counts from when done is saved on a fixed schedule; the file says so. A calendar copy does not follow later edits.
- **Data**: a task is a record; each due time that was ticked, skipped, postponed or missed is a log record whose id is the task plus the due time, so two phones ticking the same one write one record. Edits and deletes are confirmed; deleting a task deletes its history (pausing keeps it). Synced with the partner, in backups, and exported to Excel (Tasks and Task log, read-only).
- **Limits**: the hosted page and a web app cannot notify while closed; the calendar file covers that.

### 5.7c Vaccinations (v1.12)
- More → Vaccinations. Four tabs: Schedule, Given, Card and KKM chart.
- **Schedule** follows the KKM National Immunisation Programme for Peninsular Malaysia: BCG and Hepatitis B at birth; DTaP-IPV-Hep B-Hib at 2, 3 and 5 months with a booster at 18 months; Pneumococcal (PCV) at 4 and 6 months with a booster at 15 months; MMR at 9 and 12 months; DT at 7 years; TT at 15 years; HPV at 13 years for girls. Measles at 6 months (Sabah only) and JE (Sarawak only) are left out. Due dates are counted in calendar months from birth.
- Each dose shows Given (with date and place), Due now (from 2 weeks before to 4 weeks after the due date), Due soon (2–4 weeks ahead), Overdue (more than 4 weeks late) or its due date. A summary shows doses given, a progress bar, the next dose and any overdue doses.
- Recording a dose: date given (birth to today), where, batch number and notes. Each KKM dose can be recorded once; tapping it again opens the record. Edits list what changed and ask first; deletes ask first and can be undone.
- **Optional vaccines** (Rotavirus, Influenza, Chickenpox, Hepatitis A, Meningococcal, or any other by name) are marked "Optional · not in the national programme", with a short note on when each is usually given.
- **Card**: up to 6 photos of the vaccination card, taken with the camera or chosen from the gallery, opening in the zoom viewer, shrunk to JPEG under 200,000 characters, with an optional label. On the hosted page each photo is stored in its own document to stay under the store's 256 KiB document limit. Kept in backups, shared with the partner, not in Excel.
- **KKM info** (was KKM chart): the official schedule image, which opens in a full-screen zoom viewer (v1.13.1) (source: Ministry of Health Malaysia), a link to the official page, what each vaccine protects against and the optional vaccines.
- **From an appointment**: Record vaccines on a past visit opens the schedule with the visit's date and place filled in. The visit summary lists the vaccines given that day, or for an upcoming visit the KKM doses due around it.
- Partners can add, edit and delete. Excel sheet Vaccinations: Date given, Vaccine, Dose, Programme, Where, Batch, Notes, ID. A KKM vaccine and dose that match the schedule import as that dose; any other name imports as optional.

### 5.7a Growth (v1.10)
- More → Development tracker → Growth. Weight (kg), length (cm) and head circumference (cm), any combination, one entry per day; a second entry on the same day updates the first after a confirmation.
- Tabs Weight, Length, Head and Summary. Each shows first, current and change, the latest percentile, a chart with the WHO 3rd–97th and 15th–85th bands and the median, and the list of measurements with their percentiles.
- Percentiles use the WHO Child Growth Standards (LMS method, monthly values 0–24 months, boys and girls). Outside 0–24 months no percentile is shown.
- The baby's sex is asked once (owner) and can be changed in Settings → Baby.
- Validation: dates from birth to today; weight 0.8–25 kg (a number above 100 is read as grams), length 30–110 cm, head 20–56 cm.
- A note appears when the latest point has crossed two percentile lines since the previous one.
- Partners can add, edit and delete measurements. Measurements sync and appear in Excel (sheet Growth) and backups; they are not shown in the care timeline.

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

**Owner and partner (v1.7).** On a shared log, Edit baby, Excel Import, Restore and Erase all data are available to the owner only (hosted page: the page owner, from the platform; installed app: the phone that started sharing). Partners log everything else and can download Excel and backups. This is a UI rule, not a database permission.

**Remembering each person (v1.7).** On the hosted page, units, appearance and whether the person has joined are stored in that person's private area of the page's store (`data/users/<id>/prefs`) as well as in the browser. On load they are restored, and a phone without its own log rejoins an existing shared log automatically unless the person chose Stop sharing.

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
- **Fewest taps**: logging never asks for confirmation; every change shows a 6 second Undo. Edits, deletes and restores of saved records are confirmed (v1.9).
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
3. Temperature and medication logs; task notifications through a push service when the app has its own address.
4. Multiple babies; sign-in and encryption for the shared log; sharing without the user creating a database.
5. Pumping and medication logs.
