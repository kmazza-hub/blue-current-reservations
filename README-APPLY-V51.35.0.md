# APPLY BLUE CURRENT V51.35.0

Baseline: exact V51.30.0 repository.

Extract `BLUE-CURRENT-V51.35.0-RESERVATION-GUEST-JOURNEY.zip` into the root of `blue-current-reservations`, preserving directories and replacing matching files.

Validate:

```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-v51.35-reservation-guest-journey.js
node scripts/maintenance/test-v51.30-operator-ux-hardening.js
npm run start
```

Verify:

```powershell
curl.exe -s http://localhost:8787/api/health
```

Expected:

```json
"version": "51.35.0"
```

Open `http://localhost:8787/` and press `Ctrl+F5`.

The new **Reservation & Guest Journey Certification** surface appears after Operator UX Hardening.

Important:

- the certification layer reuses existing reservation/floor/guest workflows
- journey stages must be recorded in order
- missing system evidence requires a documented rehearsal reason
- journey checkpoints do not mutate reservations or contact guests
- certification is admin/human controlled

Git:

```powershell
git add -A
git commit -m "V51.35.0 certify reservation and guest journey"
git push origin live-service-timeline
```
