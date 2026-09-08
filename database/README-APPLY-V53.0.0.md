# APPLY V53.0.0

```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-v53.0-v52-operational-readiness.js
node scripts/maintenance/test-v52.75-operational-expansion-orchestration.js
npm run start
curl.exe -s http://localhost:8787/api/health
```

Expected version: `53.0.0`

```powershell
git add -A
git commit -m "V53.0.0 close V52 and certify operational readiness"
git push origin live-service-timeline
```
