# APPLY V91.75.0

```powershell
taskkill /F /IM node.exe
node scripts/maintenance/test-v91.75-shift-start-handoff-flow.js
node scripts/maintenance/test-v91.50-command-progressive-disclosure.js
node scripts/maintenance/test-v91.25-command-role-focus.js
node scripts/maintenance/test-v91.0-field-operator-workflow-polish.js
node scripts/maintenance/test-v86.50.2-explicit-light-section-typography.js
npm run check
npm run start
```

Expected: `"version":"91.75.0"`

```powershell
git add -A
git commit -m "V91.75.0 add shift start and handoff operator flow"
git push origin live-service-timeline
```
