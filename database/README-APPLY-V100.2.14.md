# V100.2.14 — Host Stand Workspace Simplification

Forward-only refinement on top of V100.2.13.

## Apply
Copy this package's contents into the Blue Current repository root, preserving folders, then run:

```powershell
node APPLY-V100.2.14.js
npm run check
node scripts/maintenance/test-v100.2.14-host-stand-workspace-simplification.js
npm start
```

## Acceptance test
1. Refresh Host Stand: Floor is visible and no stale selected-table detail is open.
2. Click **Reservations**: the floor map disappears; Arrivals becomes the primary workspace.
3. Click **Waitlist**: the floor map stays hidden; waiting parties become the primary workspace.
4. Click **Guests**: the floor map stays hidden; guest search becomes the primary workspace.
5. Click **Floor**: the live floor returns with current table state, but no old detail card is reopened.
6. Confirm seating / arrival state from V100.2.13 still works.
