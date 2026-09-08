# Apply V100.2.17

Copy this package into the Blue Current repository root. V100.2.16 must already be applied.

Run:

```powershell
node APPLY-V100.2.17.js
npm run check
node scripts/maintenance/test-v100.2.17-arrival-checkin-priority-seating-queue.js
npm start
```

## Acceptance test

1. Refresh Host Stand.
2. Confirm the blank duplicate banner is gone.
3. Open Arrivals. Every **Expected** reservation should show **Mark arrived**.
4. Mark an expected guest arrived.
5. Confirm the guest disappears from Arrivals and appears in the ready-to-seat/waitlist queue.
6. Confirm a birthday/anniversary/special-context guest is visually prominent and ordered ahead of standard ready guests.
7. Tap **Seat** → choose a highlighted available table → confirm.
8. Confirm the guest leaves the ready-to-seat queue and the selected table becomes Seated.
