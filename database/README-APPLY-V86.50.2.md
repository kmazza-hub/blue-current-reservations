# APPLY V86.50.2

```powershell
taskkill /F /IM node.exe
node scripts/maintenance/test-v86.50.2-explicit-light-section-typography.js
node scripts/maintenance/test-v86.50.1-global-light-surface-contrast.js
node scripts/maintenance/test-v86.50-data-reconciliation-source-authority.js
npm run check
npm run start
```

Expected: `"version":"86.50.2"`

After startup, hard refresh once:

`Ctrl + Shift + R`

```powershell
git add -A
git commit -m "V86.50.2 fix remaining light section display headings"
git push origin live-service-timeline
```
