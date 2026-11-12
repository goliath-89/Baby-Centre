# Baby Centre

A baby tracker that runs entirely on your phone: feeds, sleep, nappies, milestones for the first 12 months, and a 5 second cry check that suggests a likely cause and what to try.

No account, no server, no tracking. One file: `index.html`.

## Put it on your phone

**Option A: GitHub Pages (recommended, full features)**
1. On GitHub open this repository, then **Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**, pick the branch that holds `index.html` and the `/ (root)` folder, then **Save**.
3. After a minute, open `https://<your-username>.github.io/Baby-Centre/` on your phone.
4. Install it: **Android Chrome** → menu → *Add to Home screen*. **iPhone Safari** → Share → *Add to Home Screen*.

Pages on a private repository needs a paid GitHub plan; on a free plan the repository must be public. The app holds no data itself, so nothing personal is published.

**Option B: any static host** (Netlify Drop, Cloudflare Pages, Vercel): upload the folder as it is.

**Option C: open the file directly.** Copy `index.html` to the phone and open it in the browser. Tracking works; the microphone may be blocked, in which case use *Upload a clip*.

The microphone only works on HTTPS pages (or `localhost`), which is why A or B is best.

## Using it
- **Home**: tap **L** or **R** to start a breast feed, the other side to switch, the lit side to stop. **Bottle** and **Nappy** take two taps. **Sleep** toggles.
- Every change shows **Undo** for a few seconds. Tap any timeline row to edit or delete it.
- **Cry** (centre button): hold the phone 20–30 cm from your baby and tap *Record 5 seconds*.
- **More → Backup**: save a backup file now and then.

The first time you open it you see a sample week. Tap **Start with my baby** to begin your own log.

## Development
```
npm run serve        # http://localhost:8080
npm run test:unit    # logic tests (Node 18+)
npm run test:e2e     # phone-sized browser test (needs Playwright + Chromium)
```
- `index.html`: the whole app. `<script id="core">` is pure logic; `<script id="app-js">` is the UI.
- `sw.js`, `manifest.webmanifest`, `icon-*.png`: install and offline support. Bump `CACHE` in `sw.js` on each release.
- `docs/PRD.md`, `CHANGELOG.md`, `RELEASE_NOTES.md`: requirements, change log, release notes.

## Safety
The cry check and all guidance in this app are estimates for information only. They do not replace advice from a doctor, midwife or health visitor. If you are worried about your baby, get medical help.
