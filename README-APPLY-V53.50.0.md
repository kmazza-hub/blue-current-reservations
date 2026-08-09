# APPLY V53.50.0

```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-v53.50-peak-service-workflow-resilience.js
node scripts/maintenance/test-v53.25-restaurant-workflow-integration.js
npm run start
curl.exe -s http://localhost:8787/api/health
```

Expected version: `53.50.0`

```powershell
git add -A
git commit -m "V53.50.0 harden peak-service workflow resilience"
git push origin live-service-timeline
```
