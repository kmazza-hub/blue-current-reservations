# APPLY BLUE CURRENT V46.25.0

## Baseline

Apply over the authoritative repository containing V46.20.0.

## Important

This patch does NOT contain:
- `database/data/blue-current.json`
- database `.tmp` files
- database `.bak` files

## Apply

Extract `BLUE-CURRENT-V46.25.0-PATCH.zip` into the root of `blue-current-reservations`, preserving directories and replacing matching files.

## Validate

```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-operator-deprecation-manifest.js
npm run start
```

In another PowerShell window:

```powershell
curl.exe -s http://localhost:8787/api/health
```

Expected:

```json
"version": "46.25.0"
```

## Recommended Git staging

```powershell
git add package.json
git add server/server.js
git add server/api/router.js
git add client/index.html
git add client/js/app-v15.1.3.js
git add client/js/startup-loader.js
git add client/js/modules/operatorConsolidationEngine.js
git add client/js/modules/operatorConsolidationScorecardEngine.js
git add client/js/modules/deprecationManifestEngine.js
git add client/js/modules/deprecationManifestCenter.js
git add scripts/maintenance/test-operator-deprecation-manifest.js
git add README-APPLY-V46.25.0.md
git add V46.25.0-RELEASE.md
git add V46.25.0-IMPLEMENTATION.patch
```

Inspect:

```powershell
git status
git diff --cached
```

Commit example:

```powershell
git commit -m "V46.25.0 reversible deprecation manifest"
git push origin live-service-timeline
```
