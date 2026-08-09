# APPLY V57.0.0

```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-v57.0-pilot-release-candidate-certification.js
node scripts/maintenance/test-v56.50-production-pilot-environment-readiness.js
npm run start
curl.exe -s http://localhost:8787/api/health
```

Expected version: `57.0.0`

```powershell
git add -A
git commit -m "V57.0.0 certify pilot release candidate"
git push origin live-service-timeline
```
