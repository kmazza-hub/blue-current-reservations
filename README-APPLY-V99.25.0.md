# APPLY V99.25.0

This package is intentionally self-contained for the V96.25–V99.25 dependency chain so the missing-service issue does not recur.

```powershell
taskkill /F /IM node.exe

node scripts/maintenance/test-v99.25-release-candidate-end-to-end-validation.js
node scripts/maintenance/test-v99.0-commercial-release-candidate-lock.js
node scripts/maintenance/test-v98.75-final-operator-ux-accessibility-service-readiness.js
node scripts/maintenance/test-v98.50-final-regression-security-data-integrity-certification.js
node scripts/maintenance/test-v86.50.2-explicit-light-section-typography.js

node --check server/server.js
npm run check
npm run start

git add -A
git commit -m "V99.25.0 validate commercial release candidate end to end"
git push origin live-service-timeline
```
