# APPLY BLUE CURRENT V46.65.0

## Baseline
Apply over the exact Blue Current V46.60.0 repository.

This is a normal overlay patch. No files are deleted.

## Apply
Extract `BLUE-CURRENT-V46.65.0-PATCH.zip` into the root of `blue-current-reservations`, preserving directories and replacing matching files.

## Validate

```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-v46.65-selected-candidate-preview.js
npm run start
```

Wait for:

```text
Blue Current Cloud V46.65.0 running at http://localhost:8787
```

Then:

```powershell
curl.exe -s http://localhost:8787/api/health
```

Expected:

```json
"version": "46.65.0"
```

## UI workflow

1. In **Next Retirement Candidate Selection**, explicitly select one of the current top-three candidates.
2. In **Selected Candidate Preview & Evidence**, click **Start reversible preview**.
3. Use **Record observation** during the evidence window.
4. Refresh repository impact.
5. Add the surface owner and owner sign-off.
6. Use **Restore candidate** at any time to immediately reverse the preview.

A READY certification gate only means the candidate can proceed to certification. It does not delete anything.

## Git

```powershell
git add -A
git commit -m "V46.65.0 add selected candidate preview evidence gate"
git push origin live-service-timeline
```
