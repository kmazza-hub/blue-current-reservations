# APPLY V88.0.0

```powershell
taskkill /F /IM node.exe
node scripts/maintenance/test-v88.0-restaurant-configuration-foundation.js
node scripts/maintenance/test-v87.0-integration-certification-phase-b-exit.js
node scripts/maintenance/test-v86.75-connector-observability-integration-health-command.js
node scripts/maintenance/test-v86.50.2-explicit-light-section-typography.js
npm run check
npm run start
```

Expected: `"version":"88.0.0"`

```powershell
git add -A
git commit -m "V88.0.0 add restaurant configuration foundation"
git push origin live-service-timeline
```
