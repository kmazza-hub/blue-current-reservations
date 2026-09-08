# APPLY BLUE CURRENT V51.60.0

Baseline: exact V51.55.0 repository.

Extract `BLUE-CURRENT-V51.60.0-PILOT-EXECUTION-OBSERVATION.zip` into the root of `blue-current-reservations`, preserving directories and replacing matching files.

Validate:

```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-v51.60-pilot-execution-observation.js
node scripts/maintenance/test-v51.55-pilot-launch-control.js
npm run start
```

Verify:

```powershell
curl.exe -s http://localhost:8787/api/health
```

Expected:

```json
"version": "51.60.0"
```

Open `http://localhost:8787/` and press `Ctrl+F5`.

The new **Pilot Execution & Observation Control** surface appears after Pilot Launch Control.

Important:

- pilot execution cannot start without V51.55 human launch authorization
- first-live milestones must be confirmed in order
- high/critical health observations require an incident description
- CONTINUE/HOLD/ROLLBACK are human records
- ROLLBACK does not execute a rollback
- the certification/control layer does not autonomously perform restaurant actions

Git:

```powershell
git add -A
git commit -m "V51.60.0 add pilot execution and observation control"
git push origin live-service-timeline
```
