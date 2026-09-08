# Blue Current V100.2.23 — Host Stand Glance Mode

Requires V100.2.22.

From the repository root:

```powershell
node APPLY-V100.2.23.js
npm run check
node scripts/maintenance/test-v100.2.23-host-glance-mode.js
npm start
```

Acceptance test:
1. Ready-to-seat queue shows name, party size, wait, important need/occasion, and Seat — no Reservation/Walk-in pill.
2. Floor can be understood without reading timers: OPEN / SEATED / OPEN SOON / CHECK / CLEANING, with reservation time retained where useful.
3. Tap a seated or cleaning table to see detailed elapsed/predicted timing and manual lifecycle actions.
4. Seating workflow remains Seat → choose table → confirm.
