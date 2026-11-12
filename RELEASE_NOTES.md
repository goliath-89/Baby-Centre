# Release notes

## 1.5.0 · 12 November 2026

### New
- **Burp timer.** When you pause a feed, or for half an hour after a feed ends, a green **Burp time** strip appears at the top of Home. Tap **▶ Start** to time burping or upright time, and **■ Stop** when you are done.
- **Stop means bedtime.** Stopping the burp timer saves it and starts the sleep timer at the same moment. If the feed is only paused, sleep is not started, so you can resume feeding. Tap Undo, or "Woke up", if your baby is not going down.
- Burp time shows in the timeline, in Today so far ("upright 12m"), on the Day timeline, and in the Excel export.

### Tested
| Suite | Result |
|-------|--------|
| Unit | 29 of 29 pass |
| End-to-end, one phone | 30 of 30 pass |
| End-to-end, two phones | 23 of 23 pass |

### Assumption to confirm
"Once burping has stopped, assume the sleep schedule starts" was built as: stopping the burp timer starts the sleep timer. If you meant something else (for example, only starting the countdown to the next nap), say so and it is a small change.


## 1.4.0 · 12 November 2026

### New
- **Read the Last 24 hours bar.** On a phone, press and slide your finger along the bar (or press and hold); on a computer, hover. The line under the bar shows the time, whether your baby was asleep or awake, and any feed, nappy or cry check near that moment.
- **Day timeline on Trends.** Tap the bar (or "Full timeline") to open a larger view: time runs down the page, with sleep blocks, feeds, nappies and cry checks each in their own lane and labelled. Use the arrows to look at Today, Yesterday and earlier days. Tap anything to open and edit it.

### Tested
| Suite | Result |
|-------|--------|
| Unit | 29 of 29 pass |
| End-to-end, one phone | 28 of 28 pass |
| End-to-end, two phones | 23 of 23 pass |

The finger gestures were tested with simulated touch events in Chromium, not on a physical phone.


## 1.3.0 · 12 November 2026

### New
- **Pause a feed.** Tap **Pause** on the feed banner while you burp or change your baby, then **Resume** to carry on with the same side. The clock stops while paused, and the pause is left out of the feed's length. The lit L or R button in the tray also shows **Resume**.
- **New icon.** A blue outline bottle with "Baby Centre" inside. If the app is already on your home screen, remove it and add it again to pick up the new icon.
- **Last feed tile** now says LAST FEED with a solid **LEFT** or **RIGHT** badge.
- **Clearer bottom of the screen.** The five log buttons are in a raised tray with depth on each button; the navigation bar is a separate bar underneath with the current tab highlighted.

### Tested
| Suite | Result |
|-------|--------|
| Unit | 29 of 29 pass |
| End-to-end, one phone | 27 of 27 pass |
| End-to-end, two phones | 23 of 23 pass |

### Notes
- The icon is an original drawing in the style of the reference you sent. The reference itself is a licensed Font Awesome Pro icon, so it was not copied.
- The words inside the icon are readable on a large icon and on the splash screen; at the smallest home-screen sizes they become fine print.


## 1.2.0 · 12 November 2026

### New
- **Filter the timeline.** Under Timeline on Home, tap Feeds, Sleep or Nappies to see only that activity, grouped by day with a total for each day.
- **Tap the tiles.** Last feed, Sleep and Nappy at the top of Home open their records.
- **Baby photo.** More → Baby → Edit → Add photo. It shows next to the name on Home and on your partner's phone.
- **Clearer sharing.** Share with partner is now the first thing under More.
  - Installed app: "Invite my partner" ends on an invite you can Send, Email or Copy. Your partner opens the link and taps Join.
  - Hosted page: "Share with my partner" turns sharing on and shows three steps, including a link to copy. Your partner sees a "Join" banner when they open the page.

### Tested
| Suite | Result |
|-------|--------|
| Unit (`tests/core.test.js`, `tests/sync-xlsx.test.js`) | 29 of 29 pass |
| End-to-end, one phone (`tests/e2e.js`) | 26 of 26 pass |
| End-to-end, two phones (`tests/e2e-sync.js`) | 23 of 23 pass |

### What was wrong with sharing in 1.1.0
1. The invite was only shown once, behind a small "Show invite" button, with Copy as the only option.
2. On the hosted page there was no invite step at all, only a sentence pointing at the page's Share menu, and the partner got no sign that a log was waiting.
3. If the hosted page could not reach its shared store, it offered the installed app's database setup, which cannot work there.

### Still true
- On the hosted page, giving your partner access happens in that page's own Share menu, outside the app. The app cannot do that step for you; it now tells you exactly what to do.
- The installed app still needs the one-time free database (README).
- Sync is tested against stand-ins for both services, not the live services.


## 1.1.0 · 12 November 2026

### New
- **Share with partner.** One log on two phones, updated live. Start a feed on your phone and your partner sees the timer running and can stop it. Works offline and catches up later. Set up under More → Share with partner (steps in the README).
- **Excel.** More → Excel → Export saves the whole log as a workbook. Edit it and use Import to make the app match the file. Problems are listed by sheet and row before anything changes.

### Your existing data
Nothing to do. Data and backups from 1.0.0 are upgraded automatically the first time 1.1.0 opens.

### Tested
| Suite | Result |
|-------|--------|
| Unit: predictions, stats, cry analysis, backup (`tests/core.test.js`) | 16 of 16 pass |
| Unit: merge rules, migration, Excel writer and reader (`tests/sync-xlsx.test.js`) | 12 of 12 pass |
| End-to-end, one phone, fake microphone (`tests/e2e.js`) | 24 of 24 pass |
| End-to-end, two phones, sync and Excel (`tests/e2e-sync.js`) | 21 of 21 pass |

The Excel tests open the exported file with openpyxl, edit and re-save it, and also pass it through LibreOffice and back. The sync tests run two separate browser sessions through joining, live timers, delete and undo, an offline period on both phones, a refused write, and stopping and rejoining.

### Bugs found and fixed before release
| # | Found by | Problem | Fix |
|---|----------|---------|-----|
| 1 | Sync test | Sample milestones were sent to the shared log when starting your own log | Sample data leaves no change records behind |
| 2 | Sync test | A feed lasting a few seconds exported as 0 minutes and then blocked re-import | Untouched rows are accepted as they are |
| 3 | Review | Reading remote changes rescanned the whole log per record | Single pass |

### Known limits
- **Sync was tested against stand-ins, not the live services.** The Firebase connection was tested against a local server that follows Firebase's documented REST and streaming behaviour, and the hosted-page connection against a stand-in for that store. Neither has been run against the real service yet. The first real two-phone test is yours; if anything fails, the status line under More → Share with partner says what state it is in.
- **Installed-app sharing needs a free Firebase database** that you create once (about 5 minutes).
- **The invite is the key.** Anyone holding it can read and change the log. The data is not end-to-end encrypted.
- **Newest change wins per entry**, using each phone's clock. Keep both phones on automatic time.
- **Excel was checked with openpyxl and LibreOffice**, not Microsoft Excel itself. Import needs a browser from 2023 or later.
- Limits from 1.0.0 still apply (below).

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
