# APPLY V93.75.0
```powershell
taskkill /F /IM node.exe
node scripts/maintenance/test-v93.75-pilot-security-access-audit-readiness.js
node scripts/maintenance/test-v93.50-pilot-observability-alerting-support-readiness.js
node scripts/maintenance/test-v93.25-pilot-backup-restore-rollback-readiness.js
node scripts/maintenance/test-v93.0-pilot-environment-deployment-readiness.js
node scripts/maintenance/test-v92.75-pilot-field-rehearsal.js
node scripts/maintenance/test-v86.50.2-explicit-light-section-typography.js
npm run check
npm run start
git add -A
git commit -m "V93.75.0 certify pilot security access and audit readiness"
git push origin live-service-timeline
```
