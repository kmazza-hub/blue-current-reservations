# APPLY V52.20.0

Extract into the repository root.

```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-v52.20-multi-location-expansion.js
node scripts/maintenance/test-v52.15-expansion-replication.js
npm run start
curl.exe -s http://localhost:8787/api/health
```

Expected version: `52.20.0`

Commit:

```powershell
git add -A
git commit -m "V52.20.0 add multi-location expansion control"
git push origin live-service-timeline
```
