# Apply V100.2.5 Reservation Detail Operations

Merge this package into the current V100.2.4 repository, preserving relative paths and replacing matching files only.

Then run:

```powershell
npm run check
node scripts/maintenance/test-v100.2.5-reservation-detail-operations.js
npm start
```

Acceptance path: Guests → Reservations → Details. Confirm time, party, seating, status, and notes are visible; Mark arrived updates the row; Edit reservation updates the existing row; Cancel reservation removes the row only after confirmation.
