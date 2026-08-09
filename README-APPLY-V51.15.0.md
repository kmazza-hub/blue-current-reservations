# APPLY BLUE CURRENT V51.15.0

Baseline: exact V51.10.0 repository.

Extract `BLUE-CURRENT-V51.15.0-PEAK-SERVICE-STRESS.zip` into the root of `blue-current-reservations`, preserving directories and replacing matching files.

Validate:

```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-v51.15-peak-service-stress.js
node scripts/maintenance/test-v51.10-restaurant-day-lifecycle.js
npm run start
```

Verify:

```powershell
curl.exe -s http://localhost:8787/api/health
```

Expected:

```json
"version": "51.15.0"
```

Open `http://localhost:8787/` and press `Ctrl+F5`.

The new **Peak-Service Stress & Failure Testing** surface appears after Restaurant Day Lifecycle.

Important:

- these are controlled rehearsals
- PASS requires human evidence
- failure/reconnect PASS also requires recovery evidence
- missing prerequisites require a documented rehearsal override
- stress-test recording does not mutate restaurant operating state

Git:

```powershell
git add -A
git commit -m "V51.15.0 add peak-service stress and failure testing"
git push origin live-service-timeline
```
