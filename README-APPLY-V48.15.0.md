# APPLY BLUE CURRENT V48.15.0

Baseline: exact V48.10.0 repository.

Extract `BLUE-CURRENT-V48.15.0-PATCH.zip` into the repository root.

```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-v48.15-executive-pilot-review.js
npm run start
curl.exe -s http://localhost:8787/api/health
```

Expected version: `48.15.0`.

Then `Ctrl+F5`.

Use **Executive Pilot Review Packet** after the pilot baseline and proof-program success criteria exist.

```powershell
git add -A
git commit -m "V48.15.0 add executive pilot review packet"
git push origin live-service-timeline
```
