# APPLY V52.15.0

Extract the wave ZIP into the repository root, preserving directories.

Run:

```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-v52.15-expansion-replication.js
node scripts/maintenance/test-v52.10-pilot-closeout-outcome.js
npm run start
curl.exe -s http://localhost:8787/api/health
```

Expected version: `52.15.0`

Then commit:

```powershell
git add -A
git commit -m "V52.15.0 add expansion replication package"
git push origin live-service-timeline
```
