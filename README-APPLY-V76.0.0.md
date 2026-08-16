# APPLY V76.0.0

```powershell
taskkill /F /IM node.exe

node scripts/maintenance/test-v75.50-hospitality-os-application-shell.js
node scripts/maintenance/test-v75.50.1-host-service-contrast-hotfix.js
node scripts/maintenance/test-v76.0-command-operating-picture.js
node scripts/maintenance/test-v75.0-universal-hospitality-integration-contract.js
npm run check

npm run start
curl.exe -s http://localhost:8787/api/health
```

Expected:

`"version":"76.0.0"`

Open `http://localhost:8787`.

The Command screen should now populate from the Blue Current database. On the included historical seed dataset, Blue Current should explicitly label the screen as a historical/demo snapshot rather than pretending those values are current live telemetry.

Then:

```powershell
git add -A
git commit -m "V76.0.0 connect Command to verified operating picture"
git push origin live-service-timeline
```
