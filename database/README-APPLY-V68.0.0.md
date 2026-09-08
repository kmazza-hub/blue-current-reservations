# APPLY V68.0.0

```powershell
taskkill /F /IM node.exe
node scripts/maintenance/test-v68.0-production-write-integrity.js
node scripts/maintenance/test-v59.0-production-launch-certification.js
npm run check
npm run start
curl.exe -s http://localhost:8787/api/health
```

Expected health version:

```json
"version":"68.0.0"
```

Then:

```powershell
git add -A
git commit -m "V68.0.0 production write integrity and durable finalization"
git push origin live-service-timeline
```
