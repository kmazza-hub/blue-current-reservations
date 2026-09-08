# APPLY V54.75.0

```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-v54.75-role-based-service-ergonomics.js
node scripts/maintenance/test-v54.50-manager-intervention-decision-speed.js
npm run start
curl.exe -s http://localhost:8787/api/health
```

Expected version: `54.75.0`

```powershell
git add -A
git commit -m "V54.75.0 add role-based service ergonomics"
git push origin live-service-timeline
```
