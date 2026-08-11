# APPLY V65.0.0

```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-v65.0-empty-recovery-first-use.js
node scripts/maintenance/test-v59.0-production-launch-certification.js
npm run start
curl.exe -s http://localhost:8787/api/health
```

Expected health version: `65.0.0`

Browser checks: confirm healthy zero states read as healthy; first-use hint appears once; offline mode shows the recovery banner; Retry now uses the existing connection check; reconnecting clears the banner.

```powershell
git add -A
git commit -m "V65.0.0 empty states recovery and first use clarity"
git push origin live-service-timeline
```
