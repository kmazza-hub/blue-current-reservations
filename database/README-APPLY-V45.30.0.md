# APPLY BLUE CURRENT V45.30.0

## Baseline
Apply over the authoritative repository containing V45.25.0.

## Important
This patch does NOT contain:
- `database/data/blue-current.json`
- database `.tmp` files
- database `.bak` files

## Apply
Extract `BLUE-CURRENT-V45.30.0-PATCH.zip` into the root of `blue-current-reservations`, preserving directories and replacing matching files.

## Validate
```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-v45-failure-recovery-closure.js
npm run start
```

In another PowerShell window:

```powershell
curl.exe -s http://localhost:8787/api/health
```

Expected:

```json
"version": "45.30.0"
```

## Recommended Git staging
Do not use `git add .` while runtime database artifacts may exist.

```powershell
git add package.json
git add server/server.js
git add server/api/router.js
git add server/services/autonomousOperationsService.js
git add client/index.html
git add client/js/app-v15.1.3.js
git add client/js/startup-loader.js
git add client/js/modules/v45ClosureEngine.js
git add client/js/modules/v45ClosureCenter.js
git add scripts/maintenance/test-v45-failure-recovery-closure.js
git add README-APPLY-V45.30.0.md
git add V45.30.0-RELEASE.md
git add V45.30.0-IMPLEMENTATION.patch
```

Inspect:

```powershell
git status
git diff --cached
```

Commit example:

```powershell
git commit -m "V45.30.0 failure recovery and V45 closure"
git push origin live-service-timeline
```

## Safety
V45.30.0 closes the autonomous-operations architecture while keeping production mutation disabled.
