# APPLY V92.0.0
```powershell
taskkill /F /IM node.exe
node scripts/maintenance/test-v92.0-service-exception-recovery.js
node scripts/maintenance/test-v91.75-shift-start-handoff-flow.js
node scripts/maintenance/test-v91.50-command-progressive-disclosure.js
node scripts/maintenance/test-v86.50.2-explicit-light-section-typography.js
npm run check
npm run start
git add -A
git commit -m "V92.0.0 add service exception and recovery workflow"
git push origin live-service-timeline
```
