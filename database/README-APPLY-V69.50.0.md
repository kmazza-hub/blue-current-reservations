# APPLY V69.50.0

```powershell
taskkill /F /IM node.exe

node scripts/maintenance/test-v68.0-production-write-integrity.js
node scripts/maintenance/test-v68.50-database-recovery-restart-integrity.js
node scripts/maintenance/test-v69.0-production-api-boundary.js
node scripts/maintenance/test-v69.50-auth-session-isolation.js
node scripts/maintenance/test-v59.0-production-launch-certification.js
npm run check

npm run start
curl.exe -s http://localhost:8787/api/health
```

Expected:
`"version":"69.50.0"`

Startup also reports how many stale sessions were removed.

```powershell
git add -A
git commit -m "V69.50.0 harden authentication sessions and organization isolation"
git push origin live-service-timeline
```
