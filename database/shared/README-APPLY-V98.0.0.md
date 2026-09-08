# APPLY V98.0.0
```powershell
taskkill /F /IM node.exe
node scripts/maintenance/test-v98.0-pilot-learning-product-decision-control.js
node scripts/maintenance/test-v97.75-pilot-value-proof-operator-acceptance.js
node scripts/maintenance/test-v97.50-pilot-evidence-quality-outcome-measurement.js
node scripts/maintenance/test-v97.25-live-pilot-field-evidence.js
node scripts/maintenance/test-v86.50.2-explicit-light-section-typography.js
npm run check
npm run start
git add -A
git commit -m "V98.0.0 add pilot learning product decision control"
git push origin live-service-timeline
```
