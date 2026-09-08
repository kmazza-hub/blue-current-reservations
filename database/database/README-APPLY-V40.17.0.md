# Apply Blue Current V40.17.0

Replace:
- client/index.html
- client/styles.css
- client/js/app-v15.1.3.js
- client/js/startup-loader.js

Add the six AIP module files in client/js/modules plus V40.17.0-RELEASE.md.

Restart with `taskkill /F /IM node.exe` and `npm run start`, then open `http://localhost:8787/?pack=aip`.
