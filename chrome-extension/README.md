# Zoundlist Suno Importer — Chrome Extension

Private Chrome Extension (Manifest V3) for importing songs from Suno directly into Zoundlist.

## What it does

- Adds an **"⬇ Zoundlist"** button to every Suno song card.
- Adds a **bulk selection panel** with format preference (WAV / MP3).
- Shows an **import queue popup** with per-track status and retry.
- Prefers **WAV** when Suno exposes it on the CDN; falls back to MP3 automatically.
- Imports are saved as **drafts** in Zoundlist — review title, genre, and metadata before publishing.

---

## Installation (Load Unpacked)

1. **Generate icons first:**
   ```bash
   cd chrome-extension/
   node create-icons.js
   ```

2. Open Chrome → **chrome://extensions/**

3. Enable **Developer mode** (top-right toggle).

4. Click **"Load unpacked"**.

5. Select the `chrome-extension/` folder (the one containing `manifest.json`).

6. The extension icon appears in your toolbar.

---

## Connect to Zoundlist

1. Log in to **zoundlist.com** in the same browser.
2. The auth content script reads your session automatically.
3. Click the extension icon — badge should show **"Connected"**.
4. If not connected: click **"Open Zoundlist & Connect"** in the popup, log in, then re-open the popup.

---

## Import a single track

1. Navigate to **suno.com** (your library, profile, or any public page).
2. Each song card shows a green **"⬇ Zoundlist"** button in its action area.
3. Click the button — it queues immediately.
4. Open the popup to watch progress.
5. When done: click **"Open"** to go to the track's edit page in Zoundlist.

---

## Bulk import

1. Check the **checkbox** (top-left of each card) to select songs.
2. A bulk bar appears at the bottom with:
   - **"Select all visible"** — selects everything on the current page.
   - **Format toggle:** WAV / MP3.
   - **"Import to Zoundlist"** — queues all selected.
3. Open the popup to monitor progress.

---

## Import from a song detail page

Navigate to `suno.com/song/{uuid}` — a large **"Import to Zoundlist"** button appears in the action area.

---

## API endpoints (Zoundlist)

The extension calls these authenticated routes:

| Endpoint | Purpose |
|----------|---------|
| `GET /api/extension/auth/token` | Returns access_token for the logged-in user (cookie auth) |
| `POST /api/extension/suno/analyze` | Analyze URL → metadata + WAV availability |
| `POST /api/extension/suno/import` | Import single track (WAV or MP3) |
| `POST /api/extension/suno/bulk-import` | Import up to 10 tracks in one request |

`/auth/token` uses cookie auth (same-origin, called from `zoundlist.com`).
All `/suno/*` routes require `Authorization: Bearer <supabase_jwt>`.

---

## WAV behavior

| Scenario | Result |
|----------|--------|
| WAV accessible on Suno CDN | Imported as WAV · shown as "WAV ✓" in popup |
| WAV not accessible, MP3 OK | Falls back to MP3 silently |
| No audio accessible | Error: "El audio no está accesible automáticamente." |

---

## Error messages

| Message | Meaning |
|---------|---------|
| "Inicia sesión en Zoundlist primero." | Token missing or expired — visit zoundlist.com |
| "El audio no está accesible automáticamente." | Suno blocked server-side download — use Upload File instead |
| "WAV was not exposed by Suno for this track." | WAV not on CDN for this song |
| Track shows "⚠ Failed" | See sub-label for reason; click **Retry** to re-queue |

---

## Testing checklist

### Single track
1. Go to `suno.com` (must be logged in to Suno — not required for public songs)
2. Find any song card → click "⬇ Zoundlist"
3. Open popup → should show "Analyzing" → "Downloading" → "Uploading" → "Imported"
4. Click "Open" → verify draft track in Zoundlist dashboard

### Bulk import
1. Select 3–5 songs using checkboxes
2. Set format to WAV
3. Click "Import to Zoundlist"
4. Open popup → verify all tracks complete or show clear error

### WAV test
1. Import any song with preferredFormat = WAV
2. In popup: completed item shows "WAV ✓" if WAV was accessible
3. If MP3 only: shows "MP3" without WAV indicator

---

## File structure

```
chrome-extension/
  manifest.json                — MV3 manifest
  create-icons.js              — Node.js icon generator (no npm needed)
  icons/
    icon16.png                 — 16×16 extension icon
    icon48.png                 — 48×48 extension icon
    icon128.png                — 128×128 extension icon
  background/
    service-worker.js          — auth, queue, API calls
  content/
    suno-content.js            — injected into suno.com/* (buttons, selection)
    suno-content.css           — injected styles for buttons and bulk bar
    zoundlist-auth.js          — injected into zoundlist.com/* (reads session)
  popup/
    popup.html                 — extension popup UI
    popup.js                   — popup logic
    popup.css                  — popup styles
```

## Notes

- **Private only:** do not submit to Chrome Web Store.
- Tracks are always created as **drafts** — they require manual review before publishing.
- The extension never stores or transmits your Suno credentials.
- To update the extension after code changes: go to `chrome://extensions/` → click the refresh icon on the Zoundlist card.
