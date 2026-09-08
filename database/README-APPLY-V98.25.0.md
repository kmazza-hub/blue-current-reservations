# APPLY V98.25.0
```powershell
taskkill /F /IM node.exe
node scripts/maintenance/test-v98.25-commercial-product-freeze-final-hardening.js
node scripts/maintenance/test-v98.0-pilot-learning-product-decision-control.js
node scripts/maintenance/test-v97.75-pilot-value-proof-operator-acceptance.js
node scripts/maintenance/test-v97.50-pilot-evidence-quality-outcome-measurement.js
node scripts/maintenance/test-v86.50.2-explicit-light-section-typography.js
npm run check
npm run start
git add -A
git commit -m "V98.25.0 establish commercial product freeze and final hardening baseline"
git push origin live-service-timeline
```
