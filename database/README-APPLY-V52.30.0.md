# APPLY V52.30.0

Extract into the repository root.

```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-v52.30-expansion-portfolio-proof.js
node scripts/maintenance/test-v52.25-expansion-cohort-observation.js
npm run start
curl.exe -s http://localhost:8787/api/health
```

Expected version: `52.30.0`

```powershell
git add -A
git commit -m "V52.30.0 add expansion portfolio proof"
git push origin live-service-timeline
```
