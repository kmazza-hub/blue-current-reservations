# APPLY V96.0.0
```powershell
taskkill /F /IM node.exe
node scripts/maintenance/test-v96.0-pilot-ready-certification.js
node scripts/maintenance/test-v95.75-pilot-exit-readiness-v96-certification-preparation.js
node scripts/maintenance/test-v95.50-pilot-repeat-service-reliability-confidence.js
node scripts/maintenance/test-v95.25-pilot-first-service-stabilization-hypercare.js
node scripts/maintenance/test-v95.0-pilot-launch-day-command-control.js
node scripts/maintenance/test-v86.50.2-explicit-light-section-typography.js
npm run check
npm run start
git add -A
git commit -m "V96.0.0 establish pilot-ready certification baseline"
git push origin live-service-timeline
```
