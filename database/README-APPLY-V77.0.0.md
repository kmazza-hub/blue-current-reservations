# APPLY V77.0.0

```powershell
taskkill /F /IM node.exe

node scripts/maintenance/test-v76.0-command-operating-picture.js
node scripts/maintenance/test-v76.50-command-prioritization-manager-decision.js
node scripts/maintenance/test-v77.0-manager-action-accountability-loop.js
npm run check

npm run start
curl.exe -s http://localhost:8787/api/health
```

Expected: `"version":"77.0.0"`

Then:

```powershell
git add -A
git commit -m "V77.0.0 add manager action accountability loop"
git push origin live-service-timeline
```
