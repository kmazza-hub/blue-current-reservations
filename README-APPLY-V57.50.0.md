# APPLY V57.50.0

```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-v57.50-pilot-live-service-acceptance.js
node scripts/maintenance/test-v57.0-pilot-release-candidate-certification.js
npm run start
curl.exe -s http://localhost:8787/api/health
```

Expected version: `57.50.0`

```powershell
git add -A
git commit -m "V57.50.0 add pilot live service acceptance"
git push origin live-service-timeline
```
