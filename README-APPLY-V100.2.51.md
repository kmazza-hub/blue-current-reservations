# Apply V100.2.51

Apply this only after V100.2.50.

```powershell
node APPLY-V100.2.51.js
npm run check
node scripts/maintenance/test-v100.2.51-service-active-tables.js
npm start
```

Then hard refresh the browser.

## Gauntlet

1. Seat a party from the Host Stand.
2. Click **Service · Run floor** in the bottom quick actions.
3. Confirm the party appears once under **Active tables**.
4. Seat another party and confirm Service updates without duplicates.
5. Use **Complete service** and confirm the party leaves the Service queue.
6. Close Service and verify the Host Stand floor, Reservations, Waitlist, and Guests remain unchanged.
