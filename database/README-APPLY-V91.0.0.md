# APPLY V91.0.0

```powershell
taskkill /F /IM node.exe
node scripts/maintenance/test-v91.0-field-operator-workflow-polish.js
node scripts/maintenance/test-v90.75-operator-pilot-control-actions.js
node scripts/maintenance/test-v90.50-operator-pilot-command-center.js
node scripts/maintenance/test-v90.25-pilot-learning-next-session-decision.js
node scripts/maintenance/test-v86.50.2-explicit-light-section-typography.js
npm run check
npm run start
```

Expected: `"version":"91.0.0"`

```powershell
git add -A
git commit -m "V91.0.0 polish field operator workflow for service night"
git push origin live-service-timeline
```
