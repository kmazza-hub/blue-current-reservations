# APPLY V97.75.0
```powershell
taskkill /F /IM node.exe
node scripts/maintenance/test-v97.75-pilot-value-proof-operator-acceptance.js
node scripts/maintenance/test-v97.50-pilot-evidence-quality-outcome-measurement.js
node scripts/maintenance/test-v97.25-live-pilot-field-evidence.js
node scripts/maintenance/test-v97.0-commercial-deployment-release-discipline.js
node scripts/maintenance/test-v86.50.2-explicit-light-section-typography.js
npm run check
npm run start
git add -A
git commit -m "V97.75.0 add pilot value proof and operator acceptance"
git push origin live-service-timeline
```
