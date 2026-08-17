# APPLY V95.75.0
```powershell
taskkill /F /IM node.exe
node scripts/maintenance/test-v95.75-pilot-exit-readiness-v96-certification-preparation.js
node scripts/maintenance/test-v95.50-pilot-repeat-service-reliability-confidence.js
node scripts/maintenance/test-v95.25-pilot-first-service-stabilization-hypercare.js
node scripts/maintenance/test-v95.0-pilot-launch-day-command-control.js
node scripts/maintenance/test-v94.75-pilot-final-go-live-launch-authorization.js
node scripts/maintenance/test-v86.50.2-explicit-light-section-typography.js
npm run check
npm run start
git add -A
git commit -m "V95.75.0 prepare pilot exit readiness and V96 certification"
git push origin live-service-timeline
```
