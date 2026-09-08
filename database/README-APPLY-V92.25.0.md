# APPLY V92.25.0
```powershell
taskkill /F /IM node.exe
node scripts/maintenance/test-v92.25-service-recovery-post-shift-review.js
node scripts/maintenance/test-v92.0-service-exception-recovery.js
node scripts/maintenance/test-v91.75-shift-start-handoff-flow.js
node scripts/maintenance/test-v91.50-command-progressive-disclosure.js
node scripts/maintenance/test-v86.50.2-explicit-light-section-typography.js
npm run check
npm run start
git add -A
git commit -m "V92.25.0 add recovery evidence and post-shift review"
git push origin live-service-timeline
```
