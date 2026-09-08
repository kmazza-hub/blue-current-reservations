# APPLY V54.25.0

```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-v54.25-operator-speed-workflow.js
node scripts/maintenance/test-v54.0-v53-restaurant-operational-certification.js
npm run start
curl.exe -s http://localhost:8787/api/health
```

Expected version: `54.25.0`

```powershell
git add -A
git commit -m "V54.25.0 harden operator speed and service UX"
git push origin live-service-timeline
```
