# APPLY V93.0.0
```powershell
taskkill /F /IM node.exe
node scripts/maintenance/test-v93.0-pilot-environment-deployment-readiness.js
node scripts/maintenance/test-v92.75-pilot-field-rehearsal.js
node scripts/maintenance/test-v92.50-pilot-operator-usability.js
node scripts/maintenance/test-v92.25-service-recovery-post-shift-review.js
node scripts/maintenance/test-v86.50.2-explicit-light-section-typography.js
npm run check
npm run start
git add -A
git commit -m "V93.0.0 add pilot environment and deployment readiness gate"
git push origin live-service-timeline
```
