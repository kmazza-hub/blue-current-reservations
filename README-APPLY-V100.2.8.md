# Apply V100.2.8 Host Stand Contrast Hardening

Merge the contents of this package into the root of the current authoritative Blue Current repository, preserving relative paths and replacing matching files only.

This is a presentation-only forward patch. It does not alter seating logic, waitlist state transitions, reservation behavior, authentication, Command shell ownership, server APIs, database, RBAC, or persistence.

After merge, run:

```powershell
npm run check
node scripts/maintenance/test-v100.2.8-host-stand-contrast-hardening.js
npm start
```

Acceptance path:

1. Open Guests / Host Stand.
2. Toggle Waitlist and Arrivals.
3. Confirm active and inactive tabs are readable.
4. Confirm names, times, party details, and status chips are readable.
5. Confirm enabled Seat and completed Seated actions are readable.
6. No state or seating behavior should change from V100.2.7.
