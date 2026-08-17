# APPLY V97.0.0
```powershell
taskkill /F /IM node.exe
node scripts/maintenance/test-v97.0-commercial-deployment-release-discipline.js
node scripts/maintenance/test-v96.75-commercial-production-reliability-supportability.js
node scripts/maintenance/test-v96.50-commercial-defect-friction-regression-control.js
node scripts/maintenance/test-v96.25-pilot-baseline-lock-commercial-hardening-entry.js
node scripts/maintenance/test-v96.0-pilot-ready-certification.js
node scripts/maintenance/test-v86.50.2-explicit-light-section-typography.js
npm run check
npm run start
git add -A
git commit -m "V97.0.0 add controlled commercial deployment and release discipline"
git push origin live-service-timeline
```
