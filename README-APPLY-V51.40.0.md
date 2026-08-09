# APPLY BLUE CURRENT V51.40.0

Baseline: exact V51.35.0 repository.

Extract `BLUE-CURRENT-V51.40.0-LIVE-FLOOR-SERVICE.zip` into the root of `blue-current-reservations`, preserving directories and replacing matching files.

Validate:

```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-v51.40-live-floor-service-certification.js
node scripts/maintenance/test-v51.35-reservation-guest-journey.js
npm run start
```

Verify:

```powershell
curl.exe -s http://localhost:8787/api/health
```

Expected:

```json
"version": "51.40.0"
```

Open `http://localhost:8787/` and press `Ctrl+F5`.

The new **Live Floor & Service Certification** surface appears after Reservation & Guest Journey Certification.

Important:

- the certification layer reads existing floor/service state
- occupancy is derived from authoritative table/party-size data
- checkpoints must be recorded in order
- missing system evidence requires a documented rehearsal reason
- certification does not change table state or move guests

Git:

```powershell
git add -A
git commit -m "V51.40.0 certify live floor and service"
git push origin live-service-timeline
```
