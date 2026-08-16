# APPLY V77.50.0

Run one command at a time:

```powershell
taskkill /F /IM node.exe
node scripts/maintenance/test-v77.0-manager-action-accountability-loop.js
node scripts/maintenance/test-v77.50-outcome-verification-closed-loop-learning.js
node scripts/maintenance/test-v76.50-command-prioritization-manager-decision.js
npm run check
npm run start
```

Expected health version:

`"version":"77.50.0"`

Then:

```powershell
git add -A
git commit -m "V77.50.0 verify manager action outcomes and learn"
git push origin live-service-timeline
```
