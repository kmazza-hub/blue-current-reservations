# APPLY V72.50.0

```powershell
taskkill /F /IM node.exe

node scripts/maintenance/test-v71.0.1-google-fonts-csp-hotfix.js
node scripts/maintenance/test-v71.50-schema-migration-cutover-framework.js
node scripts/maintenance/test-v72.0-managed-shadow-execution.js
node scripts/maintenance/test-v72.50-backend-data-integrity-certification.js
node scripts/maintenance/test-v70.0-production-configuration-readiness.js
npm run check

npm run start
curl.exe -s http://localhost:8787/api/health
```

Expected:

`"version":"72.50.0"`

Then:

```powershell
git add -A
git commit -m "V72.50.0 certify backend service contracts and data integrity"
git push origin live-service-timeline
```
