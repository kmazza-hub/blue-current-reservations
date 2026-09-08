# APPLY BLUE CURRENT V44.22.0

## Baseline

Apply this patch over the authoritative repository that already contains V44.17.0.

## Important

The patch does **not** contain `database/data/blue-current.json` or runtime database temporary/backup files.

## Apply

Extract `BLUE-CURRENT-V44.22.0-PATCH.zip` over the root of `blue-current-reservations`, preserving directories and replacing matching files.

## Validate

```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-aip-workflow-supervision.js
npm run start
```

In another terminal:

```powershell
curl.exe -s http://localhost:8787/api/health
```

Expected runtime version:

```json
"version": "44.22.0"
```

## Recommended Git staging

Stage only the release files intentionally. Do not use `git add .` if runtime database artifacts may be present.

```powershell
git add package.json
git add server/server.js
git add server/api/router.js
git add server/services/liveIntegrationService.js
git add client/index.html
git add client/js/app-v15.1.3.js
git add client/js/startup-loader.js
git add client/js/modules/aipWorkflowSupervisorEngine.js
git add client/js/modules/aipWorkflowSupervisorCenter.js
git add scripts/maintenance/test-aip-workflow-supervision.js
git add README-APPLY-V44.22.0.md
git add V44.22.0-RELEASE.md
git add V44.22.0-IMPLEMENTATION.patch
```

Then inspect:

```powershell
git status
git diff --cached
```

Commit example:

```powershell
git commit -m "V44.22.0 AIP supervision and V44 closure"
git push origin live-service-timeline
```

## Safety

V44.22 remains a governed dry-run architecture. It adds supervision and escalation state, not autonomous live execution.
