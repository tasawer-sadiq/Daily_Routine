# Daily Routine (Web PWA)

Daily Routine is a dark, blue-themed routine tracker with daily and monthly progress rings, date-based checklist history, and a 12-month report archive. It works offline and can be installed as an app (PWA).


  <img width="1887" height="866" alt="image" src="https://github.com/user-attachments/assets/1a4cf5a0-baae-4fd8-94ce-599af6e49b5d" />
## Features
- Add, edit, and delete routines
- Daily progress ring (per selected date)
- Monthly progress ring (full month)
- Date picker to review any day
- Monthly reports (stores last 12 months)
- Offline-first PWA



## Project files
- `index.html` - layout
- `styles.css` - styling
- `app.js` - logic + storage
- `manifest.json` - PWA metadata
- `sw.js` - service worker cache
- `assets/icons/` - app icons

## Run locally
Use any static server. Example with Python:
python -m http.server 5173
Then open `http://localhost:5173`.

## Open without a server (limited)
You can double-click `index.html` to open it, but PWA install and offline cache require `https` or `http://localhost`.

## GitHub Pages hosting
1. Create a new GitHub repository (public).
2. Upload all project files to the repo root.
3. Go to Settings -> Pages.
4. Source: Deploy from a branch.
5. Branch: main, folder: /(root).
6. Save and wait for the Pages URL.

Your site will be at:
`https://tasawer-sadiq.github.io/Daily_Routine/`

## Install on Android (PWA)
1. Open the GitHub Pages URL in Chrome.
2. Menu (three dots) -> Add to Home screen / Install app.

## Reports
At the start of each new month, the previous month is saved in Reports.
Only the last 12 months are kept (older reports are cleared to save storage).

## Notes
- Icons in `assets/icons/` are placeholders and can be replaced with your branding.
