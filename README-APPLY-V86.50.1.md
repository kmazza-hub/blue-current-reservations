# APPLY V86.50.1

```powershell
taskkill /F /IM node.exe
node scripts/maintenance/test-v86.50.1-global-light-surface-contrast.js
node scripts/maintenance/test-v86.50-data-reconciliation-source-authority.js
npm run check
npm run start
```

Expected: `"version":"86.50.1"`

Hard-refresh the browser once after startup:

`Ctrl + Shift + R`

```powershell
git add -A
git commit -m "V86.50.1 harden global light surface typography contrast"
git push origin live-service-timeline
```
