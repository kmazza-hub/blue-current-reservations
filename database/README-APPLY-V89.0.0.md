# APPLY V89.0.0

```powershell
taskkill /F /IM node.exe
node scripts/maintenance/test-v89.0-pilot-operator-acceptance.js
node scripts/maintenance/test-v88.75-pilot-scenario-service-simulation.js
node scripts/maintenance/test-v88.50-pilot-data-workflow-binding.js
node scripts/maintenance/test-v88.25-pilot-location-configuration-certification.js
node scripts/maintenance/test-v86.50.2-explicit-light-section-typography.js
npm run check
npm run start
```

Expected: `"version":"89.0.0"`

```powershell
git add -A
git commit -m "V89.0.0 add pilot observation and operator acceptance"
git push origin live-service-timeline
```
