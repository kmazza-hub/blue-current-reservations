# Apply V37.17.0

Replace:
- `client/index.html`
- `client/styles.css`
- `client/js/appState.js`
- `client/js/app-v15.1.3.js`
- `client/js/startup-loader.js`

Add the six modules in `client/js/modules/` and the release documentation.

Restart once:
```powershell
taskkill /F /IM node.exe
npm run start
```

Test focused mode at `http://localhost:8787/`.
