# APPLY BLUE CURRENT V46.45.0

## Baseline

Apply over the authoritative repository containing V46.40.0.

## Important

This patch does NOT:
- delete any existing module
- modify the authoritative runtime database
- add an authoritative code-deletion endpoint
- permit retirement automatically

## Apply

Extract `BLUE-CURRENT-V46.45.0-PATCH.zip` into the root of `blue-current-reservations`, preserving directories and replacing matching files.

## Validate

```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-final-retirement-authorization.js
npm run start
```

In another PowerShell window:

```powershell
curl.exe -s http://localhost:8787/api/health
```

Expected:

```json
"version": "46.45.0"
```

## Recommended Git staging

```powershell
git add package.json
git add server/server.js
git add server/api/router.js
git add server/services/repositoryRetirementRehearsalService.js
git add client/index.html
git add client/js/app-v15.1.3.js
git add client/js/startup-loader.js
git add client/js/modules/finalRetirementAuthorizationEngine.js
git add client/js/modules/finalRetirementAuthorizationCenter.js
git add scripts/maintenance/test-final-retirement-authorization.js
git add README-APPLY-V46.45.0.md
git add V46.45.0-RELEASE.md
git add V46.45.0-IMPLEMENTATION.patch
```

Inspect:

```powershell
git status
git diff --cached
```

Commit example:

```powershell
git commit -m "V46.45.0 final retirement authorization gate"
git push origin live-service-timeline
```

## Safety

Even a fully verified V46.45 packet does not authorize Blue Current to delete code automatically. It prepares the exact evidence and checkpoint required for a later explicit authoritative-retirement decision.
