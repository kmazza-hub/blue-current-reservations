# APPLY V76.50.0

```powershell
taskkill /F /IM node.exe

node scripts/maintenance/test-v76.0-command-operating-picture.js
node scripts/maintenance/test-v76.50-command-prioritization-manager-decision.js
node scripts/maintenance/test-v75.50-hospitality-os-application-shell.js
npm run check

npm run start
curl.exe -s http://localhost:8787/api/health
```

Expected:
`"version":"76.50.0"`

Then:
```powershell
git add -A
git commit -m "V76.50.0 rank manager priorities in Command"
git push origin live-service-timeline
```
