# Baby Centre: Product Requirements

Version 1.0 · 12 November 2026 · Status: shipped as v1.0.0

## 1. Problem

A parent in the first year is logging feeds, sleep and nappies many times a day, usually with one hand and often at 3 am. Existing apps bury the log button under several screens, and none of them connect the log to the question a parent asks most: why is my baby crying, and what should I try?

## 2. Who it is for

One parent or carer, on their own phone, tracking one baby from birth to 12 months.

## 3. Goals

| # | Goal | How we know |
|---|------|-------------|
| G1 | Log a feed, sleep or nappy in one or two taps, one handed | Breast and sleep: 1 tap. Bottle and nappy: 2 taps. All from the bottom of the home screen |
| G2 | Answer "how long since…" at a glance | Home shows time since last feed, awake/asleep time, time since last nappy |
| G3 | Help plan the next feed and sleep | Home and Trends show a predicted next feed time and nap window |
| G4 | Suggest why the baby is crying from a 5 second clip, with a next action | Cry check returns ranked causes, steps to try, and when to seek help |
| G5 | Track developmental milestones for months 0–12 | 48 milestones in 4 age bands and 4 areas, with dates |
| G6 | Work on any phone, offline, with no account | Single HTML file, installable PWA, data stays on the device |

## 4. Not in scope for v1

Multiple babies, sharing between carers, cloud sync, reminders/notifications, growth charts, pumping log, medication log, a trained machine-learning cry model.

## 5. Features

### 5.1 Home
- Header: baby name and age.
- Live timers for a running feed or sleep, with Switch / Done / Woke up.
- Status tiles: last feed (with last side and predicted next feed), sleep (awake or asleep time, next nap window), nappy (time since, count today).
- Today so far: breast count and time, bottle count and total, sleep total, longest stretch.
- Last 24 hours ribbon: sleep blocks, feed marks, nappy and cry dots.
- Timeline: entries by day, tap to edit or delete; add past entry.
- Dock pinned above the tab bar: **L**, **R**, **Bottle**, **Sleep**, **Nappy**. The side to offer next is tagged.

### 5.2 Feeds
- Breast: tap L or R to start. Tap the other side to switch. Time per side is recorded.
- Bottle: amount stepper pre-filled with the last amount, quick amounts, ml or oz.
- Solids: free text, added from "Add past entry".
- Prediction: median of the baby's recent feed-to-feed gaps (last 4 days, at least 3 gaps), otherwise a typical gap for the age.

### 5.3 Sleep
- One tap starts, one tap ends. A running sleep survives closing the app.
- Prediction: last wake time plus the typical awake window for the age (for example 60–90 minutes at 1–3 months).

### 5.4 Trends
- Plan ahead card: next feed, next sleep, reference ranges for the age.
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
- Backup: download a file or copy text; restore from file or pasted text.
- Erase all data (two taps).

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
- Tests: `node --test tests/core.test.js` (logic) and `node tests/e2e.js` (Playwright, phone viewport, fake microphone).

## 8. Roadmap
1. Train and ship an on-device cry classifier (for example on the Donate-a-Cry corpus), validated against held-out recordings.
2. Feed and sleep reminders.
3. Growth log with WHO percentile curves.
4. Share with a partner; multiple babies.
5. Pumping and medication logs.
