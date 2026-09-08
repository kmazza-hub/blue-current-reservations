# Apply Blue Current V37.30.0

Replace:

- `client/index.html`
- `client/styles.css`
- `client/js/app-v15.1.3.js`
- `client/js/startup-loader.js`

Add the eight module files under `client/js/modules/` and the two release documents at the repository root.

After copying:

```powershell
taskkill /F /IM node.exe
npm run start
```

Test focused mode at `http://localhost:8787/`. Use `?full=1` only for deliberate full-platform diagnostics.
