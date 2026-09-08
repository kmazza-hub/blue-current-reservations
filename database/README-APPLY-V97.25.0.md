# APPLY V97.25.0
```powershell
taskkill /F /IM node.exe
node scripts/maintenance/test-v97.25-live-pilot-field-evidence.js
node scripts/maintenance/test-v97.0-commercial-deployment-release-discipline.js
node scripts/maintenance/test-v96.75-commercial-production-reliability-supportability.js
node scripts/maintenance/test-v96.50-commercial-defect-friction-regression-control.js
node scripts/maintenance/test-v86.50.2-explicit-light-section-typography.js
npm run check
npm run start
git add -A
git commit -m "V97.25.0 add live pilot field evidence foundation"
git push origin live-service-timeline
```
