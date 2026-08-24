# Blue Current V100.2.40 — Reserved Modal Portal + Reservation-to-Floor Handoff

Apply from the repository root after V100.2.39:

```powershell
node APPLY-V100.2.40.js
npm run check
node scripts/maintenance/test-v100.2.40-reservation-floor-handoff.js
npm start
```

This is a surgical interaction/state repair. It moves the reserved-table tool above the floor stacking context and makes both **Mark arrived** and **Add to waitlist** in the full Reservations detail dialog feed the same authoritative Floor waitlist/seating queue.

It does not change table capacities, floor positions, table-fit rules, lifecycle states, room zoning, or the visual floor-map design system.
