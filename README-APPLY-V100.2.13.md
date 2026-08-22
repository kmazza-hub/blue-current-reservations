# V100.2.13 — Reservation Arrival & One-Tap Seating Flow

Copy this package into the Blue Current repository root, then run:

```powershell
node APPLY-V100.2.13.js
npm run check
node scripts/maintenance/test-v100.2.13-reservation-arrival-one-tap-seating.js
npm start
```

Requires V100.2.12 first. The applier backs up each modified JS file as `.v100.2.13.bak`.

Acceptance test:
1. Refresh Host Stand — no table-detail card is open.
2. Anthony remains under Arrivals as Expected, not Waitlist.
3. Select an open table while Expected — CTA says `Reserve Table X for Anthony`.
4. In Arrivals, click `Mark arrived` for Anthony.
5. Select an open table — CTA says `Seat Anthony at Table X` and seats in one tap.
6. Arrivals changes Expected → Arrived → `Seated · Table X`; detail auto-collapses after seating.
