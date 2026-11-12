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
- **More → Excel**: export the log as a workbook, edit it, and import it back.
- **More → Share with partner**: keep one live log on two phones (setup below).

The first time you open it you see a sample week. Tap **Start with my baby** to begin your own log.

## Share with your partner

Both phones need the app from the same address (Option A or B above).

**One-time setup (about 5 minutes, free):**
1. Go to [console.firebase.google.com](https://console.firebase.google.com), sign in with a Google account and create a project (Analytics is not needed).
2. In the left menu choose **Build → Realtime Database → Create database**. Pick a location and start in **locked mode**.
3. Open the **Rules** tab, replace the contents with this, and press **Publish**:
   ```json
   {
     "rules": {
       "rooms": {
         "$room": { ".read": true, ".write": true }
       }
     }
   }
   ```
4. Open the **Data** tab and copy the address at the top. It looks like `https://your-project-default-rtdb.firebaseio.com`.

**On your phone:** More → Share with partner → **Start sharing**, paste the address, then **Copy invite** and send it to your partner.

**On your partner's phone:** open the invite link, or go to More → Share with partner → **Join with a code** and paste it.

How it behaves:
- Changes show on the other phone within a second or two. A running feed or sleep timer can be stopped from either phone.
- If you both change the same entry, the newer change wins. Keep both phones on automatic time.
- Offline changes are kept on the phone and sent when you are back online.
- Anyone with the invite can read and change the log, so send it privately. The rules above stop anyone from listing logs; the long random id inside the invite is the key. The data is not encrypted in the database.

## Excel

**Export to Excel** saves `baby-centre-<date>.xlsx` with sheets for Feeds, Sleep, Nappies, Cry checks, Milestones and Baby. The last sheet, *How to edit*, explains each column.

**Import from Excel** makes the app match the file: edit a value, add a row (leave ID empty) or delete a row. If anything is wrong the app lists the sheet and row and imports nothing. You can undo an import straight after.

## Development
```
npm run serve        # http://localhost:8080
npm test             # everything below
npm run test:unit    # logic, merge and Excel tests (Node 20+; Excel interop tests use python3+openpyxl and LibreOffice if present)
npm run test:e2e     # single phone, fake microphone (needs Playwright + Chromium)
npm run test:sync    # two phones against mock sync backends
```
- `index.html`: the whole app. `<script id="core">` is pure logic; `<script id="app-js">` is the UI.
- `sw.js`, `manifest.webmanifest`, `icon-*.png`: install and offline support. Bump `CACHE` in `sw.js` on each release.
- `docs/PRD.md`, `CHANGELOG.md`, `RELEASE_NOTES.md`: requirements, change log, release notes.

## Safety
The cry check and all guidance in this app are estimates for information only. They do not replace advice from a doctor, midwife or health visitor. If you are worried about your baby, get medical help.
