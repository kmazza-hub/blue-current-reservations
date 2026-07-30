BLUE CURRENT FRONTEND RECOVERY — V34.0.13.3

CAUSE
V34.0.13.4 replaced the real frontend with placeholder files:
- client/index.html
- client/styles.css

RECOVERY SOURCE
Your own Git commit:
630d11d — 34.0.13.3

REPLACE
- client/index.html
- client/styles.css

DO NOT ADD
- client/js/modules/predictiveIntegration.js

That file was part of the incomplete placeholder package and is not needed for this recovery.

INSTALL
1. Stop the Node server.
2. Replace the two files listed above.
3. Run:
   npm run check
   npm start
4. Hard refresh with Ctrl+Shift+R.
5. Restart the Cloudflare tunnel only if the public URL stopped responding.

EXPECTED RESULT
The complete V34.0.13.3 interface should render again, including:
- Predictive Command Center
- Domain Forecasting
- What-If Simulator
