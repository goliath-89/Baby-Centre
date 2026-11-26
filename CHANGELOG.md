# Changelog

All notable changes to Baby Centre. Format follows Keep a Changelog; versions follow SemVer.

## [1.15.0] - 2026-11-26

### Added
- Search across the app (header button on every page): accent- and case-insensitive, all words must match, word-start matching with a fallback to matching anywhere, grouped results (newest first, up to 100) with highlighted snippets; opens the matching entry's sheet.

### Changed
- Header gap reduced so the age and search button fit beside the name on a normal phone width.

## [1.14.0] - 2026-11-26

### Added
- WHO weight-for-length standard (45–110 cm, boys and girls, L/M/S every 1 cm, interpolated; `Core.wflPct`).
- `Core.growthReport`: headline (size from weight and length percentiles, proportion from weight-for-length), plain-language line per indicator, trend over at least 4 weeks (steady under 0.67 z; one line 0.67–1.33; flag at 1.33 or more), flags below the 3rd or above the 97th percentile.
- Growth → Summary: "What this means", "Worth raising with your doctor or clinic" and a guidance note.

## [1.13.1] - 2026-11-26

### Changed
- Tasks: Today tab outlined with an open count; History cells show the date (month on the 1st) and mark today; per-task colour `c` (0–9, 10-colour palette with light and dark values; new tasks take the least-used colour; existing tasks get a stable colour from their id).
- Vaccinations: separate Take photo (`capture="environment"`) and Choose from gallery; KKM chart tab renamed KKM info.

### Added
- Full-screen picture viewer (pinch, double-tap, drag, mouse wheel) for the KKM chart and card photos.

## [1.13.0] - 2026-11-26

### Added
- Tasks: `type: 'task'` records (name, icon, kind once|daily|days|weekly|monthly, n, times, from schedule|done, start, ends, note, paused) and `type: 'tlog'` records per due time (`a` done|skip|later|missed, `by`, `at`, `until`) with deterministic ids `tl_<task>_<due>` (`Core.tlogId`).
- Core: `taskOcc`, `taskDue` (latest open occurrence within 30 minutes, missed count, postponed hidden until near), `taskNext`, `taskRule`, `taskIcs` (RRULE + VALARM per time of day).
- Home Tasks card (Done / Later / Skip), Tasks page (Today, Upcoming, All tasks, History), add/edit sheet with quick picks, pause, delete (with history), calendar export.
- "Your name" per person (`settings.me`, also in hosted per-viewer prefs), asked on the first tick.
- Excel sheets Tasks and Task log (export only; import keeps tasks unchanged).

## [1.12.0] - 2026-11-25

### Added
- Vaccinations (`type: 'vax'` events with `key` (KKM dose, `o:` optional or `x:` custom), `name`, `dose`, `where`, `batch`, `note`) under More → Vaccinations: KKM Peninsular schedule (`Core.VAX`, `addMonths`, `vaxStatus`), Given list, optional vaccines (`VAX_OPT`), KKM chart tab with the official image (`kkm-immunisation-schedule.webp`, cached offline) and link.
- Vaccination card photos (`type: 'vcard'`, ids `vcard_…`, JPEG under 200,000 characters via `readCard`/`okCard`); on the hosted store each goes to its own document `p_vcard_…`.
- Record vaccines from a past appointment; visit summary lists vaccines given or due.
- Excel sheet Vaccinations; `vaxKey` maps names to KKM doses on import. Card photos are kept on import.

### Tests
- The fake hosted store refuses documents over 256 KiB, like the real one.

## [1.11.0] - 2026-11-25

### Added
- Appointments (`type: 'appt'` events with `place`, `doctor`, `reason`, `qs`, `note`) under More → Development tracker → Appointments: month calendar (Mon-first) and list views, next-appointment card, Questions shortcut, Home reminder for today/tomorrow, confirmed edits and deletes.
- Copyable visit summary (`visitSummary`) with growth percentiles and 7-day averages from `dailyStats`; fallback sheet when the clipboard is blocked.
- Excel sheet Appointments (Date and time, Place, Doctor, Reason, Questions, Notes, ID); future dates allowed up to two years (`APPT_AHEAD`).
- Two sample appointments (one past, one upcoming).

### Changed
- Restore counts only care entries; appointments are left out of the care timeline and bar.

## [1.10.0] - 2026-11-24

### Added
- Growth tracker (`type: 'growth'` events with `wt`, `len`, `hc`, `note`) under More → Development tracker → Growth, with WHO Child Growth Standards percentiles (monthly LMS 0–24 months; `Core.growthPct`, `whoLms`, `lmsValue`) and SVG percentile-band charts.
- `baby.sex` ('m'/'f'), synced and in the Excel Baby sheet; a Sex choice in the baby sheet.
- Excel sheet Growth (Date, Weight, Length, Head, Notes, ID).

### Changed
- Growth and journal records are left out of the care timeline and the 24-hour bar.

## [1.9.0] - 2026-11-24

### Added
- More menu (`ui.sub`) with Settings as a sub-page; Development tracker and Vaccinations listed as coming next.
- In-sheet confirmation panel (`askConfirm`) for edits (with a list of changes), deletes, journal edits, profile edits, backup restore and Stop sharing. Units and appearance changes show Undo.

### Fixed
- Saving an unchanged finished breast feed recomputed its end from the minutes; it now keeps the original end and exact seconds.

## [1.8.5] - 2026-11-23

### Changed (from an artifact comment)
- Active timer cards (feed, sleep, tummy time, burp) all show a 2px outline in their own colour.

## [1.8.4] - 2026-11-23

### Fixed (from an artifact comment)
- Changing the start time of a running or paused breast feed now adjusts its per-side clock (current side), so the live timer reflects the new start.

## [1.8.3] - 2026-11-23

### Added (from an artifact comment)
- Last feed tile always shows the next breast side (opposite of the side the last breast feed ended on).

### Fixed
- Plain dates (date of birth) were parsed as UTC midnight, putting ages a day out west of UTC. Found by the browser tests running in a different time zone; covered by a new four-time-zone unit test.

## [1.8.2] - 2026-11-23

### Changed (from an artifact comment)
- Last feed tile badge follows the last milk feed: BOTTLE after a bottle, LEFT/RIGHT after a breast feed.

## [1.8.1] - 2026-11-23

### Fixed (from an artifact comment)
- iOS: the recorder input no longer requests capture (iOS maps audio capture to the video camera); it offers the system menu (Take Video, Choose File). Video files are accepted and their sound track decoded. The clip picker accepts audio, video and common audio file extensions.

## [1.8.0] - 2026-11-23

### Added (from artifact comments)
- Cry result: "‹ Record again" and "All checks" at the top.
- Eight more confirmable reasons (each mapped to a sound-based cause for the overall tally) and free-text reasons (`x:<slug>` keys with the original text), shown as chips once used. Excel import and export handle both.
- Personal model: each check stores a normalised vector of acoustic features plus log context (feed gap ratio, awake ratio, minutes since nappy, minutes since feed end, time of day). New results blend the sound-and-context score with a similarity-weighted vote of confirmed past checks (`Core.cryVector`, `Core.personalize`).

### Changed
- "Tired" relabelled "Tired / sleepy".

## [1.7.3] - 2026-11-23

### Changed (from an artifact comment)
- Cry check: on the hosted page (no microphone access for embedded pages), Record opens the phone's recorder through a capture file input and analyses the clip on return. Live recording remains on the installed app; a refused microphone switches to the recorder and is remembered.

## [1.7.2] - 2026-11-21

### Changed (from an artifact comment)
- The running burp widget is shown at the top of Home, above any running feed or sleep banner and the tiles; idle, it stays beside Last feed.

## [1.7.1] - 2026-11-21

### Changed (from artifact comments)
- Burp timer moved into the status tiles: half tile beside Last feed when idle (Start; highlighted when due), full-width tile under Last feed while running (timer, Stop, Asleep). The burp banners above the tiles are gone.
- Timeline shows one day at a time, today by default, with ‹ / › day navigation, the day and date, and a daily summary; filters apply within the day. "Show earlier days" removed.
- Trends tab and page renamed Insights (`#insights` also works as a link).
- Day timeline: Cry lane removed, Tummy time has its own lane. Last 24 hours bar shows tummy time instead of cry checks.
- Nappy type "Wet + dirty" / "Both" renamed Mixed everywhere (Excel import still accepts the old wording).
- Colours: nappies sky blue, tummy time magenta, in light and dark themes.

### Tests
- The browser tests now run at early-afternoon local time (fixed time zone per run), so entries made a few hours earlier always fall on "today".

## [1.7.0] - 2026-11-20

### Added
- More → About shows the build date and time and opens the release notes in the app (stamped by `scripts/stamp-build.js`).
- Owner-only controls on a shared log: Edit baby, Excel Import, Restore and Erase all data are hidden for the partner, who keeps logging and can download Excel and backups. Hosted page: page owner. Installed app: the phone that started sharing.
- Hosted page: each person's units, appearance and joined state are saved in their private area of the page's store and restored on load.
- Hosted page: a phone with no log of its own joins an existing shared log automatically; after Stop sharing it does not.

### Fixed
- Partner had to tap Join again and re-select Ounces after the browser cleared storage for the embedded page.
- Joining a shared log from a phone with its own log could replace the shared baby profile with that phone's; the shared profile now always wins on join.

## [1.6.1] - 2026-11-20

### Changed
- **Sleep can overlap feeding and burping.** Starting the sleep timer no longer stops a running burp timer, and feeds never stopped sleep. A baby can now be feeding and asleep, or burping and asleep, at the same time.
- **Asleep** on the burp timer now starts the sleep timer and leaves the burp timer running; tap Stop when you finish burping.
- The Burp time strip is offered after a feed even while the sleep timer is running.
- Starting, switching or resuming a breast feed still stops a running burp timer (you stop burping to feed), and the confirmation now says so ("burp timer stopped").
- Burp times show seconds when short ("45s", "3m 05s").

### Added
- **Consistency checks.** Nothing is ever cancelled for you, but the confirmation adds "Check: …" when a combination looks like a mistake:
  - the sleep timer has been running more than 6 hours when you log something else;
  - a feed has been running (not paused) more than 2 hours when you log something else;
  - tummy time started while the sleep timer runs, or while a feed is running;
  - sleep or a feed started while tummy time runs;
  - the burp timer started while a feed is still running (not paused).

## [1.6.0] - 2026-11-20

### Added
- **Tummy time widget** on Home: ▶ Start / ■ Stop timer, today's total, sessions today, last session, personal record (longest session ever, with its date), and a progress bar towards 30 minutes a day. Stopping a session that beats the record says "new record!".
  - New "Tummy" filter in the Timeline (daily total, session count and longest session per day), a "Tummy time per day" chart on Trends with the 15–30 minute guide band, and a lane on the Day timeline.
  - Sessions can be edited, deleted or added afterwards, and are included in Excel (Tummy time sheet), backup and partner sync.
- **Milestone journal** at the top of the Milestones tab: record a milestone with its date and notes, by picking one of 30 suggestions grouped by age (newborn to 12 months) or typing your own. Entries are listed newest first with your baby's age on that date. Tap one to edit or delete it (with Undo).
  - Included in Excel (Milestone journal sheet), backup and partner sync. Journal entries stay out of the care timeline and daily counts.
- Sample data includes a few tummy sessions and three journal entries.

### Changed
- The existing tick-list is now headed "Development checklist".
- Excel import reads a date typed as text (for example 2026-11-01) as that day in your own time zone.

## [1.5.2] - 2026-11-14

### Added
- **Burp timer is always available.** When the green "Burp time" strip is not being suggested, a quieter "Burp timer ▶ Start" row takes its place at the top of Home, so the timer can be started at any time.

### Why the strip was sometimes missing
The highlighted strip is only suggested while a feed is paused or within 30 minutes of a feed ending, once per feed, and not while a sleep timer is running. Outside those cases there was previously no way to start the burp timer.

## [1.5.1] - 2026-11-13

### Changed
- **Stopping the burp timer no longer starts sleep.** It saves the burp and shows the countdown to the next nap in the toast ("next nap in about 35m").
- The Sleep tile now counts down while the baby is awake: "Next nap in 35m · 2:42–3:12 AM", then "Nap window open until 3:12 AM".
- When no sleep has been logged yet, the nap countdown runs from the end of the last burp.

### Added
- **Asleep button** (moon icon) beside Stop on the burp timer: saves the burp and starts the sleep timer in one tap, for when the baby has actually gone to sleep. One Undo reverses both.

### Fixed
- A burp started before a feed ended could stop the Burp time strip from being offered after the next feed.

## [1.5.0] - 2026-11-12

### Added
- **Burp timer (upright time).** A "Burp time" strip with a play button appears on Home while a feed is paused and for 30 minutes after a feed ends. While it runs it shows a clock and a stop button.
  - Stopping it saves the burp and starts the sleep timer, unless a feed is still paused or a sleep is already running. Undo reverses both.
  - Resuming or switching the feed, starting a new feed, or starting sleep ends a running burp timer.
  - Burps appear in the timeline ("Burp · Upright 6m"), in "Today so far", on the Day timeline, in the bar readout, in Excel (new Burps sheet), in backups and on the partner's phone. They can be edited, deleted or added afterwards.

### Fixed
- Editing an entry shorter than a minute could be refused ("end must be after the start") because the form works in whole minutes. Times you do not change now keep their exact seconds.
- A toast could sit on top of a control and block taps for a few seconds. Taps now pass through the toast, except on its Undo button.

## [1.4.0] - 2026-11-12

### Added
- **Interactive Last 24 hours bar** on Home. Hover with a mouse, or press and slide a finger along the bar, to read what was happening at that time: asleep or awake (with the sleep's start, end and length) and any feed, nappy or cry check within half an hour. A marker line follows the pointer.
- **Day timeline** on Trends: a full-size view with time running down the page and a lane each for sleep, feeds, nappies and cry checks, labelled with durations and amounts. Step back day by day with the arrows. Tap any block or marker to open that entry.
- Tapping the Last 24 hours bar, or "Full timeline", opens the Day timeline.

## [1.3.0] - 2026-11-12

### Added
- **Pause and resume a feed.** Pause stops the feed clock (for burping, a nappy, a break); Resume continues on the same side. Switch while paused resumes on the other side. Paused time is not counted in the feed. Works from the feed banner and from the action tray, and the paused state is shared with the partner's phone.
- New app icon: a blue outline bottle with "Baby Centre" inside, on navy. A separate maskable icon keeps the whole bottle visible on launchers that crop icons to a circle.

### Changed
- The feed clock now shows feeding time (left + right), not time since the feed started, so it stands still while paused.
- Last feed tile reads "Last feed" followed by a solid LEFT or RIGHT badge for the side last used.
- The five log buttons sit in a raised tray that floats above the page, each button with a border, a thicker bottom edge and a tinted icon disc. The navigation bar is a separate flat bar with its own shadow, and the current tab is marked with a pill.
- Toasts sit higher so they clear the tray, and no longer wrap on narrow phones.

## [1.2.0] - 2026-11-12

### Added
- **Timeline filter**: All, Feeds, Sleep, Nappies. A filtered view covers the last 7 days grouped by day, each day with its total (feeds, breast time, bottle amount; sleep time; nappy changes).
- **Tappable status tiles**: Last feed, Sleep and Nappy on Home open the matching records.
- **Baby photo**: add, change or remove a profile picture; it is cropped to a small square, shown next to the name on Home, and shared with the partner.
- **Invite options**: the invite sheet now offers Send (phone share sheet), Email and Copy, and can be reopened any time with "Invite partner".
- Hosted page: a "Join <name>'s log" banner on Home for the partner, and step-by-step invite instructions with a link to copy for the owner.

### Changed
- "Share with partner" is now the first section under More, with one clear primary action for each situation.
- The Timeline's "Show earlier days" adds a week at a time.

### Fixed
- On the hosted page, sharing could fall back to the database setup meant for the installed app, which cannot work there. The page now says when sharing is unavailable in that view.
- The hosted page gave the partner no cue that a shared log existed; they now see a Join banner.

## [1.1.0] - 2026-11-12

### Added
- **Share with partner**: one log on two phones, updated live. Per-record merge where the newest change wins, deletion markers, an offline queue, and a status line showing changes waiting.
  - Installed app: connects to a Firebase Realtime Database you own; invite by code or link.
  - Hosted Claude page: uses the page's shared store with one tap.
- **Excel**: export the whole log to `.xlsx`; import an edited workbook with row-level validation, a summary before import, and Undo.
- Sync status dot in the header and a banner on Home when offline or not allowed to save.
- Unit tests for merge and Excel (11) and a two-phone end-to-end suite (21).

### Changed
- Data schema v2: every record carries a change stamp. Existing v1 data and backups are migrated automatically.
- Milestone list moved into the core module so Excel can use it.
- File saves go through the host page's download prompt when the app runs as a hosted page.
- Service worker no longer handles requests to other sites, so it cannot interfere with the sync connection.

### Fixed
- Sample milestones could be sent to the shared log when starting your own log (found by the sync test).

## [1.0.0] - 2026-11-12

### Added
- Home screen with live feed and sleep timers, status tiles, today summary, 24 hour ribbon and timeline.
- One-tap dock: breast left/right with side switching, bottle, sleep, nappy.
- Add, edit and delete entries, with validation and Undo on every change.
- Next feed prediction from the baby's own feed gaps, with an age-based fallback.
- Next sleep window from age-based awake windows.
- Trends: weekly averages, sleep pattern grid, sleep hours, breast minutes left/right, bottle amount, feeds per day, week navigation.
- Cry check: 5 second recording or clip upload, on-device acoustic analysis, ranked causes, steps to try, safety guidance, history, and feedback that personalises later results.
- Milestones: 48 items across four age bands and four areas.
- Settings: profile, ml/oz, light/dark/system theme.
- Backup and restore by file or text; erase all data.
- Sample week shown on first open.
- Installable, offline-capable PWA (manifest, service worker, icons).
- Unit tests (16) and end-to-end tests (23).

### Fixed during pre-release testing
- See "Bugs found and fixed" in RELEASE_NOTES.md.
