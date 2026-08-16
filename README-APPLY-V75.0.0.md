# APPLY V75.0.0

```powershell
taskkill /F /IM node.exe

node scripts/maintenance/test-v74.0-pilot-readiness-command-center.js
node scripts/maintenance/test-v74.50-operator-workflow-ux-certification.js
node scripts/maintenance/test-v75.0-universal-hospitality-integration-contract.js
node scripts/maintenance/test-v73.50-live-shift-failure-paths.js
npm run check

npm run start
curl.exe -s http://localhost:8787/api/health
```

Expected:

`"version":"75.0.0"`

Then:

```powershell
git add -A
git commit -m "V75.0.0 add universal hospitality integration contract"
git push origin live-service-timeline
```
