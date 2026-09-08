# Apply V42.14.0

Replace the files contained in this patch while preserving paths, then restart the Node server.

```powershell
taskkill /F /IM node.exe
npm run start
```

Open `http://localhost:8787/?pack=live`. Run Stream Reconciliation, review Connector Backpressure, then synchronize the Live Twin.
