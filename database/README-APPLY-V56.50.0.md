# APPLY V56.50.0

```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-v56.50-production-pilot-environment-readiness.js
node scripts/maintenance/test-v56.0-v55-decision-value-certification.js
npm run start
curl.exe -s http://localhost:8787/api/health
```

Expected version: `56.50.0`

```powershell
git add -A
git commit -m "V56.50.0 add production pilot environment readiness"
git push origin live-service-timeline
```
