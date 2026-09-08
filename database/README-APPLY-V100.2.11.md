# Blue Current V100.2.11 — Seated Table Detail Auto-Collapse

Forward-only hotfix on top of V100.2.10.

## Apply
Copy this package into the repository root, then run:

```powershell
node APPLY-V100.2.11.js
npm run check
node scripts/maintenance/test-v100.2.11-seated-table-detail-auto-collapse.js
npm start
```

## Acceptance test
1. Open Host Stand.
2. Assign Anthony Russo to Table 14 if needed.
3. Seat Anthony at Table 14.
4. Confirm Table 14 remains visibly **Seated** on the floor.
5. Confirm the selected-table detail card automatically disappears after seating.
6. Click Table 14 again.
7. Confirm the table detail card reopens and retains Anthony/Table 14 seated context.

No auth, shell, reservation creation, queue logic, API, database, RBAC, or persistence code is changed.
