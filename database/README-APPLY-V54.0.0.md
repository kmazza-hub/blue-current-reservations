# APPLY V54.0.0

```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-v54.0-v53-restaurant-operational-certification.js
node scripts/maintenance/test-v53.75-failure-recovery-shift-continuity.js
npm run start
curl.exe -s http://localhost:8787/api/health
```

Expected version: `54.0.0`

```powershell
git add -A
git commit -m "V54.0.0 close V53 and certify restaurant operations"
git push origin live-service-timeline
```
