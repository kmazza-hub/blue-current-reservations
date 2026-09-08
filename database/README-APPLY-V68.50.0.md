# APPLY V68.50.0

```powershell
taskkill /F /IM node.exe

node scripts/maintenance/test-v68.0-production-write-integrity.js
node scripts/maintenance/test-v68.50-database-recovery-restart-integrity.js
node scripts/maintenance/test-v59.0-production-launch-certification.js
npm run check

npm run start
curl.exe -s http://localhost:8787/api/health
```

Expected:

```json
"version":"68.50.0"
```

At startup you should also see:

```text
Verified recovery backup: available
```

Then:

```powershell
git add -A
git commit -m "V68.50.0 verify backup recovery and restart integrity"
git push origin live-service-timeline
```
