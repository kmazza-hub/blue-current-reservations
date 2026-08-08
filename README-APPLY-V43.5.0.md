# Apply V43.5.0

Replace the included changed files and add the six new V43 modules. Do not replace `database/data/blue-current.json` with test/runtime state.

Restart:

```powershell
taskkill /F /IM node.exe
npm run start
```

Open `http://localhost:8787/?pack=executive`.

Recommended order: Executive Live Brief → Executive Risk Queue → Executive Insights → Executive Recommendations → Executive Decision Gate → Executive Decision Workspace.
