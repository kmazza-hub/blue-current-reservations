# APPLY V94.0.0
```powershell
taskkill /F /IM node.exe
node scripts/maintenance/test-v94.0-pilot-performance-capacity-resilience-readiness.js
node scripts/maintenance/test-v93.75-pilot-security-access-audit-readiness.js
node scripts/maintenance/test-v93.50-pilot-observability-alerting-support-readiness.js
node scripts/maintenance/test-v93.25-pilot-backup-restore-rollback-readiness.js
node scripts/maintenance/test-v93.0-pilot-environment-deployment-readiness.js
node scripts/maintenance/test-v86.50.2-explicit-light-section-typography.js
npm run check
npm run start
git add -A
git commit -m "V94.0.0 certify pilot performance capacity and resilience readiness"
git push origin live-service-timeline
```
