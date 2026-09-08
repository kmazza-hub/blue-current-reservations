# APPLY V98.75.0
```powershell
taskkill /F /IM node.exe
node scripts/maintenance/test-v98.75-final-operator-ux-accessibility-service-readiness.js
node scripts/maintenance/test-v98.50-final-regression-security-data-integrity-certification.js
node scripts/maintenance/test-v98.25-commercial-product-freeze-final-hardening.js
node scripts/maintenance/test-v86.50.2-explicit-light-section-typography.js
npm run check
npm run start
git add -A
git commit -m "V98.75.0 certify final operator UX accessibility and service readiness"
git push origin live-service-timeline
```
