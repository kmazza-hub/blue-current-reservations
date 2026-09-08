# APPLY BLUE CURRENT V46.55.0

## Baseline
Apply over the authoritative repository containing V46.50.0.

This is a normal overlay patch. V46.55 does not delete files.

## Apply
Extract `BLUE-CURRENT-V46.55.0-PATCH.zip` into the root of `blue-current-reservations`, preserving directories and replacing matching files.

## Validate
```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-post-retirement-assurance.js
npm run start
```

In another PowerShell window:

```powershell
curl.exe -s http://localhost:8787/api/health
```

Expected:

```json
"version": "46.55.0"
```

## Recommended Git staging
```powershell
git add package.json
git add server/server.js
git add server/api/router.js
git add server/services/retirementAssuranceService.js
git add client/index.html
git add client/js/app-v15.1.3.js
git add client/js/startup-loader.js
git add client/js/modules/retirementAssuranceEngine.js
git add client/js/modules/retirementAssuranceCenter.js
git add scripts/maintenance/test-post-retirement-assurance.js
git add README-APPLY-V46.55.0.md
git add V46.55.0-RELEASE.md
git add V46.55.0-IMPLEMENTATION.patch
```

Then:
```powershell
git status
git diff --cached
git commit -m "V46.55.0 post-retirement assurance"
git push origin live-service-timeline
```
