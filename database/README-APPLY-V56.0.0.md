# APPLY V56.0.0

Extract into the repository root.

```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-v56.0-v55-decision-value-certification.js
node scripts/maintenance/test-v55.75-profitability-intervention-accountability.js
npm run start
curl.exe -s http://localhost:8787/api/health
```

Expected version: `56.0.0`

```powershell
git add -A
git commit -m "V56.0.0 close V55 decision value"
git push origin live-service-timeline
```
