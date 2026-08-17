# APPLY V91.50.0

```powershell
taskkill /F /IM node.exe
node scripts/maintenance/test-v91.50-command-progressive-disclosure.js
node scripts/maintenance/test-v91.25-command-role-focus.js
node scripts/maintenance/test-v91.0-field-operator-workflow-polish.js
node scripts/maintenance/test-v90.75-operator-pilot-control-actions.js
node scripts/maintenance/test-v86.50.2-explicit-light-section-typography.js
npm run check
npm run start
```

Expected: `"version":"91.50.0"`

```powershell
git add -A
git commit -m "V91.50.0 simplify command navigation with progressive disclosure"
git push origin live-service-timeline
```
