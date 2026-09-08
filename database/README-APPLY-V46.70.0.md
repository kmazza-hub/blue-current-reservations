# APPLY BLUE CURRENT V46.70.0

## Baseline
Apply over the exact Blue Current V46.65.0 repository.

This is a normal overlay patch. No files are deleted.

## Apply
Extract `BLUE-CURRENT-V46.70.0-FINAL-PATCH.zip` into the root of `blue-current-reservations`, preserving directories and replacing matching files.

## Validate

```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-v46.70-release-certification.js
npm run start
```

Wait for:

```text
Blue Current Cloud V46.70.0 running at http://localhost:8787
```

Then:

```powershell
curl.exe -s http://localhost:8787/api/health
```

Expected:

```json
"version": "46.70.0"
```

Open Blue Current and use the **V46 Release Certification & Closeout** center.

Expected final state:

```text
100%
CERTIFIED
```

## Git

```powershell
git add -A
git commit -m "V46.70.0 certify and close V46"
git push origin live-service-timeline
```

After push:

```powershell
git status
```

Expected:

```text
nothing to commit, working tree clean
```
