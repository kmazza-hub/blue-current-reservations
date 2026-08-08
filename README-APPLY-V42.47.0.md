# Apply Blue Current V42.47.0

Replace:
- client/index.html
- client/styles.css
- client/js/app-v15.1.3.js
- client/js/startup-loader.js
- server/server.js
- server/api/router.js
- server/services/liveIntegrationService.js

Add the six V42.45–V42.47 modules in client/js/modules.

Restart with `npm run start`, then open `http://localhost:8787/?pack=live`.
