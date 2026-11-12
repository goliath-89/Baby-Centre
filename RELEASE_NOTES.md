# Release notes

## 1.0.0 · 12 November 2026

First release. Everything runs on your phone; nothing is uploaded.

### What you can do
- **Log in one or two taps** from the bottom of the home screen: breast (L/R, with switch), bottle, sleep, nappy.
- **See at a glance** how long since the last feed, how long awake or asleep, and the last nappy.
- **Plan ahead** with a predicted next feed time and nap window.
- **Check a cry**: record 5 seconds (or upload a clip) to get the likely cause, what to try, and when to seek help.
- **Review the week**: sleep pattern grid, sleep hours, breast minutes per side, bottle amounts, feeds per day.
- **Track milestones** from 0 to 12 months.
- **Back up and restore** your data by file or text.

### Tested
| Suite | Result |
|-------|--------|
| Unit tests (`tests/core.test.js`): predictions, daily stats, pitch tracking, cry scoring, backup | 16 of 16 pass |
| End-to-end (`tests/e2e.js`): Chromium, 390×844 and 320×568, fake microphone, offline | 24 of 24 pass |

The end-to-end run plays a synthetic cry into a fake microphone and checks the measured pitch is within 10% of the true value.

### Bugs found and fixed before release
| # | Found by | Problem | Fix |
|---|----------|---------|-----|
| 1 | e2e, 320 px | Header (name + age) pushed the page wider than the screen | Header wraps; long names break |
| 2 | e2e, upload | A non-audio file left an unhandled error in the console | Decode failure is caught and explained to the user |
| 3 | Visual review | Record button ring was clipped and text touched the card edge | Card padding corrected |
| 4 | Visual review | Bottle quick amounts wrapped onto a second row | Five equal columns |
| 5 | Visual review | "0m ago" straight after logging | Shows "Just now" |
| 6 | Visual review | Plan-ahead times dropped onto their own line | Label and value share a row when they fit |

### Known limits
- **Cry check is an estimate.** It scores measured acoustics against research-informed reference ranges and weighs in your log. It is not a trained model like Nanni AI or ChatterBaby, has not been validated on real recordings, and is not a medical device. Accuracy on real cries is unknown until you test it; use the "What was it really?" buttons so it learns your baby.
- **Tested in Chromium only.** Safari on iPhone and Firefox use the same standard APIs but were not run here.
- **The microphone needs a secure page** (HTTPS or an installed app). On a plain `http://` address or inside a preview frame, use "Upload a clip".
- **Data lives in one browser on one phone.** Clearing site data deletes it. Use Backup.
- No reminders, growth charts, multiple babies or sharing yet (see the roadmap in `docs/PRD.md`).
