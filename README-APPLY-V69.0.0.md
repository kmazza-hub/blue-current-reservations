# APPLY V69.0.0

```powershell
taskkill /F /IM node.exe

node scripts/maintenance/test-v68.0-production-write-integrity.js
node scripts/maintenance/test-v68.50-database-recovery-restart-integrity.js
node scripts/maintenance/test-v69.0-production-api-boundary.js
node scripts/maintenance/test-v59.0-production-launch-certification.js
npm run check

npm run start
curl.exe -i http://localhost:8787/api/health
```

Confirm:
- version is `69.0.0`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Content-Security-Policy` is present
- `X-RateLimit-*` headers are present

Then:

```powershell
git add -A
git commit -m "V69.0.0 harden production API boundary and abuse controls"
git push origin live-service-timeline
```
