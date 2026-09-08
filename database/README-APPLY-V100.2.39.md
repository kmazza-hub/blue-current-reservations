# Blue Current V100.2.39 — Collision-Safe Premium Floor Layout

Apply from the repository root after V100.2.38:

```powershell
node APPLY-V100.2.39.js
npm run check
node scripts/maintenance/test-v100.2.39-floor-collision-safe.js
npm start
```

This update is intentionally surgical. It changes floor placement only. It does not alter seating, waitlist, arrivals, reservations, table lifecycle, persistence, or the centered table-detail behavior from V100.2.38.
