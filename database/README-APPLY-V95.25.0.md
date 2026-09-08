# APPLY V95.25.0
```powershell
taskkill /F /IM node.exe
node scripts/maintenance/test-v95.25-pilot-first-service-stabilization-hypercare.js
node scripts/maintenance/test-v95.0-pilot-launch-day-command-control.js
node scripts/maintenance/test-v94.75-pilot-final-go-live-launch-authorization.js
node scripts/maintenance/test-v94.50-pilot-training-runbook-operator-enablement-readiness.js
node scripts/maintenance/test-v86.50.2-explicit-light-section-typography.js
npm run check
npm run start
git add -A
git commit -m "V95.25.0 add pilot first-service stabilization and hypercare"
git push origin live-service-timeline
```
