# APPLY V96.50.0
```powershell
taskkill /F /IM node.exe
node scripts/maintenance/test-v96.50-commercial-defect-friction-regression-control.js
node scripts/maintenance/test-v96.25-pilot-baseline-lock-commercial-hardening-entry.js
node scripts/maintenance/test-v96.0-pilot-ready-certification.js
node scripts/maintenance/test-v95.75-pilot-exit-readiness-v96-certification-preparation.js
node scripts/maintenance/test-v86.50.2-explicit-light-section-typography.js
npm run check
npm run start
git add -A
git commit -m "V96.50.0 add commercial defect friction and regression control"
git push origin live-service-timeline
```
