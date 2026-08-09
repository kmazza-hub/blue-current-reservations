# APPLY BLUE CURRENT V51.10.0

Baseline: exact V51.05.0 repository.

Extract `BLUE-CURRENT-V51.10.0-RESTAURANT-DAY-LIFECYCLE.zip` into the root of `blue-current-reservations`, preserving directories and replacing matching files.

Validate:

```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-v51.10-restaurant-day-lifecycle.js
node scripts/maintenance/test-v51.05-pilot-operational-readiness.js
npm run start
```

Verify:

```powershell
curl.exe -s http://localhost:8787/api/health
```

Expected:

```json
"version": "51.10.0"
```

Open `http://localhost:8787/` and press `Ctrl+F5`.

The new **Restaurant Day Lifecycle** surface appears immediately after Restaurant Pilot Readiness Baseline.

Important:

- this is a rehearsal/certification workflow, not a production go-live action
- stages must be completed in order
- every completed stage requires human evidence
- missing prerequisites require a documented rehearsal override
- Blue Current does not mutate the reservation/floor/staff/kitchen modules simply because a checkpoint is completed

Git:

```powershell
git add -A
git commit -m "V51.10.0 add restaurant day lifecycle"
git push origin live-service-timeline
```
