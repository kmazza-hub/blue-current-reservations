# Apply Blue Current V39.6.1

Replace these files in the project root:

- `client/index.html`
- `client/js/modules/guidedShiftCenter.js`

Then restart the local server:

```powershell
taskkill /F /IM node.exe
npm run start
```

Open a fresh InPrivate window:

`http://localhost:8787/?pack=operations`

Expected result: the console no longer reports `Cannot set properties of null (setting 'textContent')` from `guidedShiftCenter.js`.
