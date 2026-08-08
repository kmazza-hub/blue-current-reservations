# APPLY BLUE CURRENT V46.60.0

## Baseline

Apply over the exact Blue Current V46.55.2 repository.

This is a normal overlay patch. It does not delete files.

## Apply

Extract `BLUE-CURRENT-V46.60.0-PATCH.zip` into the root of `blue-current-reservations`, preserving directories and replacing matching files.

## Validate

```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-v46.60-candidate-selection.js
npm run start
```

Wait for:

```text
Blue Current Cloud V46.60.0 running at http://localhost:8787
```

Then:

```powershell
curl.exe -s http://localhost:8787/api/health
```

Expected:

```json
"version": "46.60.0"
```

Open Blue Current and use the new **Next Retirement Candidate Selection** center to review the top three.

Do not select a candidate unless you want that surface to enter the reversible preview pipeline.

## Git

```powershell
git add -A
git commit -m "V46.60.0 add next retirement candidate selection gate"
git push origin live-service-timeline
```
