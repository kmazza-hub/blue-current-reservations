# APPLY BLUE CURRENT V51.65.0

Baseline: exact V51.60.0 repository.

Extract `BLUE-CURRENT-V51.65.0-PILOT-STABILIZATION-EXIT.zip` into the root of `blue-current-reservations`, preserving directories and replacing matching files.

Validate:

```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-v51.65-pilot-stabilization-exit.js
node scripts/maintenance/test-v51.60-pilot-execution-observation.js
npm run start
```

Verify:

```powershell
curl.exe -s http://localhost:8787/api/health
```

Expected:

```json
"version": "51.65.0"
```

Open `http://localhost:8787/` and press `Ctrl+F5`.

The new **Pilot Stabilization & Exit Criteria** surface appears after Pilot Execution & Observation Control.

Important:

- one clean observation is not enough for STABLE
- three recent healthy observations are required by the normal stabilization path
- operator confidence/workflow stability/guest impact/support load require human assessment
- data-integrity and executive-KPI trust are rechecked
- STABLE does not expand rollout
- ROLLBACK does not execute rollback

Git:

```powershell
git add -A
git commit -m "V51.65.0 add pilot stabilization and exit criteria"
git push origin live-service-timeline
```
