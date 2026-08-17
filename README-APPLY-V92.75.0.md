# APPLY V92.75.0
```powershell
taskkill /F /IM node.exe
node scripts/maintenance/test-v92.75-pilot-field-rehearsal.js
node scripts/maintenance/test-v92.50-pilot-operator-usability.js
node scripts/maintenance/test-v92.25-service-recovery-post-shift-review.js
node scripts/maintenance/test-v92.0-service-exception-recovery.js
node scripts/maintenance/test-v91.75-shift-start-handoff-flow.js
node scripts/maintenance/test-v86.50.2-explicit-light-section-typography.js
npm run check
npm run start
git add -A
git commit -m "V92.75.0 certify pilot field rehearsal path"
git push origin live-service-timeline
```
