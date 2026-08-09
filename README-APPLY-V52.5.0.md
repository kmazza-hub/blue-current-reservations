# APPLY BLUE CURRENT V52.5.0

This package was built from a reconstructed full V51.60.0 repository.

The uploaded V51.65 full repository still had Git HEAD at the real V51.60 commit. Blue Current restored only the V51.65 runtime files from HEAD, removed the V51.65-only files, verified zero V51.65 runtime residue, and passed the V51.60 validation suite before V52.5 was implemented.

Extract this ZIP into the root of `blue-current-reservations`, preserving directories and replacing matching files.

Then run:

```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-v52.5-pilot-stabilization-exit.js
node scripts/maintenance/test-v51.60-pilot-execution-observation.js
npm run start
```

Verify:

```powershell
curl.exe -s http://localhost:8787/api/health
```

Expected version: `52.5.0`

Then Ctrl+F5.

Commit:

```powershell
git add -A
git commit -m "V52.5.0 add pilot stabilization and exit criteria"
git push origin live-service-timeline
```
