# APPLY V74.0.0

```powershell
taskkill /F /IM node.exe
node scripts/maintenance/test-v73.0-end-to-end-restaurant-workflow.js
node scripts/maintenance/test-v73.50-live-shift-failure-paths.js
node scripts/maintenance/test-v74.0-pilot-readiness-command-center.js
node scripts/maintenance/test-v72.50-backend-data-integrity-certification.js
npm run check
npm run start
curl.exe -s http://localhost:8787/api/health
```

Expected: `"version":"74.0.0"`

```powershell
git add -A
git commit -m "V74.0.0 add authoritative pilot readiness command center"
git push origin live-service-timeline
```
