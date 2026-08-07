# Apply V38.5.3 Cloud Foundation Hotfix

Replace:

- `client/js/modules/cloudFoundation.js`

Then restart Node:

```powershell
taskkill /F /IM node.exe
npm run start
```

Open:

`http://localhost:8787/?pack=operations`
