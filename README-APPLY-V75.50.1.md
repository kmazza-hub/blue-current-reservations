# APPLY V75.50.1

```powershell
taskkill /F /IM node.exe

node scripts/maintenance/test-v75.50-hospitality-os-application-shell.js
node scripts/maintenance/test-v75.50.1-host-service-contrast-hotfix.js
npm run check

npm run start
```

Then hard refresh Edge:

`Ctrl + Shift + R`

Expected health version:

`"version":"75.50.1"`

Commit:

```powershell
git add -A
git commit -m "V75.50.1 brighten Host Stand and live service typography"
git push origin live-service-timeline
```
