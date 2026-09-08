# APPLY V74.50.0

```powershell
taskkill /F /IM node.exe
node scripts/maintenance/test-v73.50-live-shift-failure-paths.js
node scripts/maintenance/test-v74.0-pilot-readiness-command-center.js
node scripts/maintenance/test-v74.50-operator-workflow-ux-certification.js
npm run check
npm run start
curl.exe -s http://localhost:8787/api/health
```

Expected: `"version":"74.50.0"`

```powershell
git add -A
git commit -m "V74.50.0 add role first operator workflow certification"
git push origin live-service-timeline
```
