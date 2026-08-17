# APPLY V86.50.0
```powershell
taskkill /F /IM node.exe
node scripts/maintenance/test-v86.50-data-reconciliation-source-authority.js
node scripts/maintenance/test-v86.25-connector-sync-reliability-checkpoint-recovery.js
node scripts/maintenance/test-v86.0-integration-readiness-connector-data-trust.js
npm run check
npm run start
```
Expected: `"version":"86.50.0"`
```powershell
git add -A
git commit -m "V86.50.0 add data reconciliation and source authority"
git push origin live-service-timeline
```
