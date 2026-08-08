# APPLY BLUE CURRENT V48.10.0

Baseline: exact V48.5.0 repository.

Extract `BLUE-CURRENT-V48.10.0-PATCH.zip` into the repository root, preserving directories and replacing matching files.

```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-v48.10-pilot-proof-program.js
npm run start
curl.exe -s http://localhost:8787/api/health
```

Expected version: `48.10.0`.

Then `Ctrl+F5`.

The new **Pilot Proof Program** appears directly below the Pilot Value Scorecard.

If the pilot baseline has not been captured yet, capture it in Pilot Value Scorecard first. Then use **Commit success criteria** in Pilot Proof Program.

```powershell
git add -A
git commit -m "V48.10.0 add pilot proof program"
git push origin live-service-timeline
```
