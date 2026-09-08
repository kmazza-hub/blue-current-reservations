# Apply V37.1.1 Startup Stabilization

Replace these files in the repository root:

- `client/index.html`
- `client/styles.css`
- `client/js/app-v15.1.3.js`

Add:

- `V37.1.1-RELEASE.md`
- `README-APPLY-V37.1.1.md`

Then stop all existing Node processes and start the server once:

```powershell
taskkill /F /IM node.exe
npm run start
```

Open:

`http://localhost:8787/`

The browser should use safe startup automatically. Do not add `?full=1` during normal operation.
