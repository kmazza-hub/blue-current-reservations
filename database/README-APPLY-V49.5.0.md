# APPLY BLUE CURRENT V49.5.0

Baseline: exact certified V48.30.0 repository.

Extract `BLUE-CURRENT-V49.5.0-PATCH.zip` into the root of `blue-current-reservations`, preserving directories and replacing matching files.

Validate:

```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-v49.05-rollout-activation-control.js
node scripts/maintenance/test-v48.30-release-certification.js
npm run start
```

Then:

```powershell
curl.exe -s http://localhost:8787/api/health
```

Expected:

```json
"version": "49.5.0"
```

Open:

```text
http://localhost:8787/
```

Press `Ctrl+F5`.

The new **Rollout Activation Control** appears at the top of the V48/V49 commercial and scale-operations stack.

Important:
- activation approval is admin-only
- an open preflight gate requires an explicit executive override reason
- approval does not technically deploy or activate a restaurant

Git:

```powershell
git add -A
git commit -m "V49.5.0 add rollout activation control"
git push origin live-service-timeline
```
