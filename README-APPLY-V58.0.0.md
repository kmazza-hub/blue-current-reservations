# APPLY V58.0.0

```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-v58.0-final-product-release-candidate.js
node scripts/maintenance/test-v57.50-pilot-live-service-acceptance.js
npm run start
curl.exe -s http://localhost:8787/api/health
```

Expected version: `58.0.0`

```powershell
git add -A
git commit -m "V58.0.0 certify final product release candidate"
git push origin live-service-timeline
```
