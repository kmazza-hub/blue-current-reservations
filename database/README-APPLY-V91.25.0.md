# APPLY V91.25.0

```powershell
taskkill /F /IM node.exe
node scripts/maintenance/test-v91.25-command-role-focus.js
node scripts/maintenance/test-v91.0-field-operator-workflow-polish.js
node scripts/maintenance/test-v90.75-operator-pilot-control-actions.js
node scripts/maintenance/test-v90.50-operator-pilot-command-center.js
node scripts/maintenance/test-v86.50.2-explicit-light-section-typography.js
npm run check
npm run start
```

Expected: `"version":"91.25.0"`

```powershell
git add -A
git commit -m "V91.25.0 add command information hierarchy and role focus"
git push origin live-service-timeline
```
