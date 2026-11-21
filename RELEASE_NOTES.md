# Release notes

## 1.7.2 · 21 November 2026

- **Running burp timer goes to the top.** While the burp timer runs, its widget moves to the top of Home, above the feed and sleep tiles, so it is the first thing you see. When stopped, it goes back to its half-size place beside Last feed.


## 1.7.1 · 21 November 2026

Changes from your comments on the app.

- **Burp widget beside Last feed.** The burp timer is now a half-size tile next to Last feed, the same size as Nappy, with a **Start** button. It turns green when a burp is due after a feed. While it runs, it widens to a full-width tile under Last feed with the timer, **Stop** and **Asleep**.
- **Timeline shows today.** The Timeline now lists today's entries only, headed with the day and date and a summary. **‹** steps back a day at a time and **›** forward; the Feeds, Sleep, Nappies and Tummy filters work within the day shown. A sleep that ran over midnight shows on both days.
- **Trends is now Insights**, in the tab bar and the page title.
- **Day timeline:** the Cry lane is gone and Tummy time has its own lane. Mixed nappies now read **Mixed** instead of "Both" (also in the timeline, the nappy buttons and Excel).
- **Clearer colours.** Nappies are now sky blue (easier to tell from the green burp) and tummy time is magenta (easier to tell from the indigo sleep). The Last 24 hours bar shows tummy time instead of cry checks.


## 1.7.0 · 20 November 2026

### New
- **Build date and release notes.** More → About now shows the version with the date and time it was built, and a **Release notes** button that opens these notes inside the app.
- **Only the owner changes the shared log in bulk.** When a log is shared, only its owner sees Edit (baby's details), Excel Import, Restore and Erase all data. Your partner can still log feeds, sleep and everything else, and can still download an Excel file or a backup.
  - On the shared Claude link, the owner is the owner of the page.
  - On the installed app, the owner is the phone that started sharing.

### Fixed
- **Partner kept having to tap Join, and Ounces did not stick.** On the shared Claude link, both were saved only in the phone's browser storage, which some browsers clear for pages shown inside another site. Each person's bottle units, appearance and "joined" choice are now also saved in their own private area of the shared page. If the browser forgets, the app puts them back and rejoins the shared log on its own.
  - A phone with no log of its own joins the shared log automatically when it opens the page.
  - A phone that has its own log is still asked first, so two logs are never combined without you choosing to.
  - After a deliberate **Stop sharing**, the app does not rejoin by itself.

### Good to know
- The owner-only rule is enforced by the app's screens, not by the database. Someone determined could still change data with other tools; this stops accidental or casual changes.
- Fixed while testing: a phone that already had its own log could overwrite the shared baby's name and details when it joined. Joining now always keeps the shared profile.
- I could not test your partner's actual phone. The fix is tested by clearing a phone's storage between visits, which reproduces what she described.

### Tested
| Suite | Result |
|-------|--------|
| Unit | 32 of 32 pass |
| End-to-end, one phone | 34 of 34 pass |
| End-to-end, two phones | 27 of 27 pass |

The two-phone suite now covers: partner controls hidden on both kinds of sharing, a phone whose storage is wiped between visits (rejoins, keeps Ounces and Dark), Stop sharing followed by a wipe (does not rejoin), and a phone with its own log being asked before joining.


## 1.6.1 · 20 November 2026

- **Asleep while feeding or burping.** The sleep timer now runs alongside a feed or the burp timer; starting one never stops the other. **☾ Asleep** on the burp timer starts sleep and keeps the burp timer running.
- **Warnings instead of guesses.** If something looks off, for example a sleep timer left running for 7 hours or tummy time started while asleep, the confirmation message ends with "Check: …" and says what to look at. Nothing is changed for you.
- Resuming or switching a breast feed still stops the burp timer, and now says so.

Tests: 32 unit, 33 one-phone and 23 two-phone checks pass.


## 1.6.0 · 20 November 2026

### New
- **Tummy time** card on Home. Tap **▶ Start** when you lay your baby down and **■ Stop** when you finish. The card shows today's total, how many sessions today, the last session, and your baby's **record** (longest session). Beat it and the app tells you. "History ›" lists every session by day.
- **Milestone journal** on the Milestones tab. Tap **+ Add milestone**, pick a suggestion (30 of them, from first bath to first steps) or type your own, set the date and add notes. Your entries are listed newest first with your baby's age at the time.

### Tested
| Suite | Result |
|-------|--------|
| Unit | 32 of 32 pass |
| End-to-end, one phone | 32 of 32 pass |
| End-to-end, two phones | 23 of 23 pass |

The two-phone suite does not exercise these two features directly; both sync through the same path as every other entry.


## 1.5.2 · 14 November 2026

- **Burp timer you can always reach.** A "Burp timer ▶ Start" row now sits at the top of Home whenever the green Burp time strip is not showing, so you can start it by hand at any time, including after a feed has been saved.
- The green strip still appears on its own while a feed is paused and for 30 minutes after a feed ends. It does not appear while a sleep timer is running, which is the most likely reason it was missing for you; check whether an old sleep is still running at the top of Home.

Tests: 30 unit, 30 one-phone and 23 two-phone checks pass.


## 1.5.1 · 13 November 2026

### Changed
- **■ Stop** on the burp timer now only saves the burp and tells you how long until the next nap. It no longer starts sleep.
- **☾ Asleep**, a new button beside Stop, is for when your baby has actually fallen asleep: it saves the burp and starts the sleep timer together.
- The Sleep tile on Home counts down to the nap window while your baby is awake.

How the countdown is worked out: the nap window is the typical awake time for your baby's age, counted from when they last woke. If no sleep has been logged yet, it is counted from the end of the last burp.

Tests: 30 unit, 30 one-phone and 23 two-phone checks pass.


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
