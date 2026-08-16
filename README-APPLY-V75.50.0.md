# APPLY V75.50.0

```powershell
taskkill /F /IM node.exe

node scripts/maintenance/test-v75.0-universal-hospitality-integration-contract.js
node scripts/maintenance/test-v75.50-hospitality-os-application-shell.js
node scripts/maintenance/test-v74.50-operator-workflow-ux-certification.js
npm run check

npm run start
curl.exe -s http://localhost:8787/api/health
```

Expected:

`"version":"75.50.0"`

Open:

`http://localhost:8787`

The default application surface should now be **Blue Current Command**, not the Host Stand.

Then:

```powershell
git add -A
git commit -m "V75.50.0 add Hospitality OS application shell"
git push origin live-service-timeline
```
