# Changelog

All notable changes to Baby Centre. Format follows Keep a Changelog; versions follow SemVer.

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
