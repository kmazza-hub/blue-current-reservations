# APPLY V59.0.0

Extract into the repository root.

```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-v59.0-production-launch-certification.js
node scripts/maintenance/test-v58.50-final-hardening-real-environment.js
npm run start
curl.exe -s http://localhost:8787/api/health
```

Expected version: `59.0.0`

```powershell
git add -A
git commit -m "V59.0.0 certify finished product release"
git push origin live-service-timeline
```
