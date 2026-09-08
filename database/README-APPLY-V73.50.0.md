# APPLY V73.50.0

```powershell
taskkill /F /IM node.exe
node scripts/maintenance/test-v73.0-end-to-end-restaurant-workflow.js
node scripts/maintenance/test-v73.50-live-shift-failure-paths.js
node scripts/maintenance/test-v72.50-backend-data-integrity-certification.js
npm run check
npm run start
curl.exe -s http://localhost:8787/api/health
```

Expected: `"version":"73.50.0"`

```powershell
git add -A
git commit -m "V73.50.0 certify live shift failure paths and recovery"
git push origin live-service-timeline
```
