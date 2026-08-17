# APPLY V87.0.0

```powershell
taskkill /F /IM node.exe
node scripts/maintenance/test-v87.0-integration-certification-phase-b-exit.js
node scripts/maintenance/test-v86.75-connector-observability-integration-health-command.js
node scripts/maintenance/test-v86.50.2-explicit-light-section-typography.js
node scripts/maintenance/test-v86.50-data-reconciliation-source-authority.js
node scripts/maintenance/test-v86.25-connector-sync-reliability-checkpoint-recovery.js
node scripts/maintenance/test-v86.0-integration-readiness-connector-data-trust.js
npm run check
npm run start
```

Expected: `"version":"87.0.0"`

```powershell
git add -A
git commit -m "V87.0.0 certify integration platform and close Phase B"
git push origin live-service-timeline
```
