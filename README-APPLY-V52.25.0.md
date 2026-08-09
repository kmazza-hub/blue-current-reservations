# APPLY V52.25.0

Extract into the repository root.

```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-v52.25-expansion-cohort-observation.js
node scripts/maintenance/test-v52.20-multi-location-expansion.js
npm run start
curl.exe -s http://localhost:8787/api/health
```

Expected version: `52.25.0`

```powershell
git add -A
git commit -m "V52.25.0 add expansion cohort observation"
git push origin live-service-timeline
```
