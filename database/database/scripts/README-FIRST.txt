BLUE CURRENT V34.0.1 — CC-002 LIVE MANAGER BRIEF

Replace the matching files in your master project with every file in this package.
The server/services/commandCenterService.js file is NEW.

FILES
- client/index.html
- client/styles.css
- client/js/modules/commandCenter.js
- client/js/cloud/cloudApi.js
- server/services/commandCenterService.js (new)
- server/api/router.js
- server/server.js
- package.json

INSTALL / TEST
1. Stop the Blue Current server.
2. Copy these files into the matching folders.
3. Run: npm run check
4. Run: npm start
5. Open http://localhost:8787 and hard-refresh with Ctrl+F5.
6. Sign in, then press Refresh brief.

WHAT IS LIVE
- Local weather from Open-Meteo (no API key required)
- Active team count
- Pending PTO count
- Today's reservation and cover count
- Low-inventory alerts
- Open maintenance alerts when present
- Readiness score calculated from current operating signals
- AI-style recommendation assembled from current operating data

WHAT REMAINS A PILOT BASELINE
- Same-day-last-year sales
- Last-week sales
- Revenue forecast
- Historical guest/labor/average-check figures

The screen labels the combined data mode accurately. Historical financial figures will become fully live after POS/import integration.
