# Apply V100.2.4 Reservation Readability

Merge this package into the current Blue Current repository root, preserving relative paths and replacing matching files only.

This package is forward-only and presentation-scoped. It does not modify authentication, routing, workspace lifecycle, server, database, RBAC, or persistence.

After merge run:

```powershell
npm run check
node scripts/maintenance/test-v100.2.4-reservation-readability.js
npm start
```

Acceptance path: Guests → Reservations. Existing and newly-created reservation rows must use the same dark, high-contrast presentation; guest name, time, party/preferences, status, and Details action must all be readable.
