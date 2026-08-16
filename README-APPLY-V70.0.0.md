# APPLY V70.0.0

```powershell
taskkill /F /IM node.exe

node scripts/maintenance/test-v68.0-production-write-integrity.js
node scripts/maintenance/test-v68.50-database-recovery-restart-integrity.js
node scripts/maintenance/test-v69.0-production-api-boundary.js
node scripts/maintenance/test-v69.50-auth-session-isolation.js
node scripts/maintenance/test-v70.0-production-configuration-readiness.js
node scripts/maintenance/test-v59.0-production-launch-certification.js
npm run check

npm run start
curl.exe -s http://localhost:8787/api/health
```

Expected:
`"version":"70.0.0"`

Development mode remains the default unless `BLUE_CURRENT_ENV` is explicitly set.

Before an actual production deployment, configure at minimum:

```text
BLUE_CURRENT_ENV=production
BLUE_CURRENT_DB=<absolute non-cloud-synced production path>
BLUE_CURRENT_ALLOWED_ORIGINS=https://bluecurrentco.com,<app origin>
```

and provide every environment variable referenced by a live connector's `secretEnv`.

Then:

```powershell
git add -A
git commit -m "V70.0.0 production configuration and deployment readiness"
git push origin live-service-timeline
```
