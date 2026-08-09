# APPLY V55.75.0

Extract into the repository root.

```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-v55.75-profitability-intervention-accountability.js
node scripts/maintenance/test-v55.25-restaurant-intelligence-decision-support.js
npm run start
curl.exe -s http://localhost:8787/api/health
```

Expected version: `55.75.0`

```powershell
git add -A
git commit -m "V55.75.0 add profitability intervention accountability"
git push origin live-service-timeline
```
