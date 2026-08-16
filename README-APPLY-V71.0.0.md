# APPLY V71.0.0

```powershell
taskkill /F /IM node.exe

node scripts/maintenance/test-v68.0-production-write-integrity.js
node scripts/maintenance/test-v68.50-database-recovery-restart-integrity.js
node scripts/maintenance/test-v69.0-production-api-boundary.js
node scripts/maintenance/test-v69.50-auth-session-isolation.js
node scripts/maintenance/test-v70.0-production-configuration-readiness.js
node scripts/maintenance/test-v71.0-persistence-abstraction-migration-readiness.js
node scripts/maintenance/test-v59.0-production-launch-certification.js
npm run check

npm run start
curl.exe -s http://localhost:8787/api/health
```

Expected:

`"version":"71.0.0"`

Startup should also report:

`Persistence: json (single-node-durable-json)`

Then:

```powershell
git add -A
git commit -m "V71.0.0 abstract persistence and define transaction boundaries"
git push origin live-service-timeline
```
