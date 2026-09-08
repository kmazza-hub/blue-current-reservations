# Apply V41.32.0

Replace:
- client/index.html
- client/styles.css
- client/js/app-v15.1.3.js
- client/js/startup-loader.js

Add the six V41.30–V41.32 modules and this release documentation.

Restart:
```powershell
taskkill /F /IM node.exe
npm run start
```

Open: `http://localhost:8787/?pack=aip`
