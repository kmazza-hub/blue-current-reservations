# APPLY V88.75.0

```powershell
taskkill /F /IM node.exe
node scripts/maintenance/test-v88.75-pilot-scenario-service-simulation.js
node scripts/maintenance/test-v88.50-pilot-data-workflow-binding.js
node scripts/maintenance/test-v88.25-pilot-location-configuration-certification.js
node scripts/maintenance/test-v88.0-restaurant-configuration-foundation.js
node scripts/maintenance/test-v86.50.2-explicit-light-section-typography.js
npm run check
npm run start
```

Expected: `"version":"88.75.0"`

```powershell
git add -A
git commit -m "V88.75.0 add pilot scenario and service simulation"
git push origin live-service-timeline
```
