# APPLY V86.25.0

```powershell
taskkill /F /IM node.exe
node scripts/maintenance/test-v86.25-connector-sync-reliability-checkpoint-recovery.js
node scripts/maintenance/test-v86.0-integration-readiness-connector-data-trust.js
node scripts/maintenance/test-v85.0-architecture-freeze-pilot-baseline.js
npm run check
npm run start
```

Expected: `"version":"86.25.0"`

```powershell
git add -A
git commit -m "V86.25.0 add connector sync reliability and checkpoint recovery"
git push origin live-service-timeline
```
