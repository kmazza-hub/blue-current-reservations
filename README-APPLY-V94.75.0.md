# APPLY V94.75.0
```powershell
taskkill /F /IM node.exe
node scripts/maintenance/test-v94.75-pilot-final-go-live-launch-authorization.js
node scripts/maintenance/test-v94.50-pilot-training-runbook-operator-enablement-readiness.js
node scripts/maintenance/test-v94.25-pilot-device-network-onsite-continuity-readiness.js
node scripts/maintenance/test-v94.0-pilot-performance-capacity-resilience-readiness.js
node scripts/maintenance/test-v93.75-pilot-security-access-audit-readiness.js
node scripts/maintenance/test-v86.50.2-explicit-light-section-typography.js
npm run check
npm run start
git add -A
git commit -m "V94.75.0 certify final pilot go-live checklist and launch authorization"
git push origin live-service-timeline
```
