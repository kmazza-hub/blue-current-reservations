# APPLY V52.50.0

Extract into the repository root.

```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-v52.50-expansion-repeatability.js
node scripts/maintenance/test-v52.30-expansion-portfolio-proof.js
npm run start
curl.exe -s http://localhost:8787/api/health
```

Expected version: `52.50.0`

```powershell
git add -A
git commit -m "V52.50.0 certify expansion repeatability"
git push origin live-service-timeline
```
