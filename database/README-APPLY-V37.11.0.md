# Apply Blue Current V37.11.0

Replace:
- client/index.html
- client/styles.css
- client/js/app-v15.1.3.js
- client/js/startup-loader.js

Add the six module files under `client/js/modules/`, plus the release documentation.

Restart:
```powershell
taskkill /F /IM node.exe
npm run start
```

Test focused mode first at `http://localhost:8787/`. The new monitoring centers are part of focused startup and do not activate deferred feature packs.
