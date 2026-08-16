# APPLY V73.0.0

```powershell
taskkill /F /IM node.exe

node scripts/maintenance/test-v72.50-backend-data-integrity-certification.js
node scripts/maintenance/test-v73.0-end-to-end-restaurant-workflow.js
node scripts/maintenance/test-v72.0-managed-shadow-execution.js
node scripts/maintenance/test-v70.0-production-configuration-readiness.js
npm run check

npm run start
curl.exe -s http://localhost:8787/api/health
```

Expected:
`"version":"73.0.0"`

Then:

```powershell
git add -A
git commit -m "V73.0.0 certify end to end restaurant workflows"
git push origin live-service-timeline
```
