# APPLY V53.25.0

```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-v53.25-restaurant-workflow-integration.js
node scripts/maintenance/test-v53.0-v52-operational-readiness.js
npm run start
curl.exe -s http://localhost:8787/api/health
```

Expected version: `53.25.0`

```powershell
git add -A
git commit -m "V53.25.0 integrate restaurant workflows"
git push origin live-service-timeline
```
