BLUE CURRENT FRONTEND RECOVERY — V34.0.4-compatible recovery

CAUSE
The current client/index.html and client/styles.css were overwritten by placeholder files.
The current missionControl.js was also replaced by a placeholder module.

REPLACE
- client/index.html
- client/styles.css
- client/js/modules/missionControl.js
- client/js/modules/shiftRiskHeatmap.js

SOURCE
Recovered from Git commit 57538c2, the latest complete frontend snapshot before the placeholder releases began.

INSTALL
1. Stop the Node server.
2. Copy these three files into the matching project folders.
3. Run:
   npm run check
   npm start
4. Hard refresh the browser with Ctrl+Shift+R.
5. Restart the Cloudflare quick tunnel if necessary.

EXPECTED RESULT
The full Blue Current interface should render again instead of a blank white page.

VALIDATION
- npm run check: passed
- Homepage HTTP response: 200
- Full recovered interface detected in rendered HTML
