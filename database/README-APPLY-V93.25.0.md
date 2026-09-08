# APPLY V93.25.0
```powershell
taskkill /F /IM node.exe
node scripts/maintenance/test-v93.25-pilot-backup-restore-rollback-readiness.js
node scripts/maintenance/test-v93.0-pilot-environment-deployment-readiness.js
node scripts/maintenance/test-v92.75-pilot-field-rehearsal.js
node scripts/maintenance/test-v92.50-pilot-operator-usability.js
node scripts/maintenance/test-v68.50-database-recovery-restart-integrity.js
node scripts/maintenance/test-v86.50.2-explicit-light-section-typography.js
npm run check
npm run start
git add -A
git commit -m "V93.25.0 certify pilot backup restore and rollback readiness"
git push origin live-service-timeline
```
