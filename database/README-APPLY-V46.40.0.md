# APPLY BLUE CURRENT V46.40.0

## Baseline

Apply over the authoritative repository containing V46.35.0.

## Important

This patch does NOT:
- delete any existing module
- modify `database/data/blue-current.json`
- add an authoritative deletion endpoint

The retirement-rehearsal workflow modifies only temporary disposable repository copies.

## Apply

Extract `BLUE-CURRENT-V46.40.0-PATCH.zip` into the root of `blue-current-reservations`, preserving directories and replacing matching files.

## Validate

```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-retirement-rehearsal.js
npm run start
```

In another PowerShell window:

```powershell
curl.exe -s http://localhost:8787/api/health
```

Expected:

```json
"version": "46.40.0"
```

## Recommended Git staging

```powershell
git add package.json
git add server/server.js
git add server/api/router.js
git add server/services/repositoryImpactService.js
git add server/services/repositoryRetirementRehearsalService.js
git add client/index.html
git add client/js/app-v15.1.3.js
git add client/js/startup-loader.js
git add client/js/modules/retirementRehearsalEngine.js
git add client/js/modules/retirementRehearsalCenter.js
git add scripts/maintenance/test-retirement-rehearsal.js
git add README-APPLY-V46.40.0.md
git add V46.40.0-RELEASE.md
git add V46.40.0-IMPLEMENTATION.patch
```

Inspect:

```powershell
git status
git diff --cached
```

Commit example:

```powershell
git commit -m "V46.40.0 disposable retirement rehearsal"
git push origin live-service-timeline
```
