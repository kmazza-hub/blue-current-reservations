# APPLY V52.75.0

Extract into the repository root.

```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-v52.75-operational-expansion-orchestration.js
node scripts/maintenance/test-v52.50-expansion-repeatability.js
npm run start
curl.exe -s http://localhost:8787/api/health
```

Expected version: `52.75.0`

```powershell
git add -A
git commit -m "V52.75.0 add operational expansion orchestration"
git push origin live-service-timeline
```
