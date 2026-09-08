# Blue Current V100.2.12 — Apply Instructions

This is a forward-only repair for Host Stand table-selection ownership.

## Apply
Copy this package into the Blue Current repository root, then run:

```powershell
node APPLY-V100.2.12.js
npm run check
node scripts/maintenance/test-v100.2.12-dynamic-table-selection-assignment-ownership.js
npm start
```

The apply script requires V100.2.11 to already be present and creates a `.v100.2.12.bak` backup of every JavaScript file it changes.

## Acceptance test
1. Refresh Host Stand. The selected-table detail must be hidden.
2. Tap an available or cleaning table, e.g. Table 6, 14, or 18 depending on current state.
3. Confirm the CTA names that exact table.
4. Assign Anthony. The CTA must become `Seat Anthony at Table X` for the same table.
5. Before seating, tap another available/cleaning table. The CTA must offer `Move Anthony to Table Y`.
6. Move if desired, then seat Anthony.
7. Detail collapses; the final table becomes Seated; Arrivals shows `Seated · Table Y`.
8. Reserved/seated conflicting tables must be disabled as assignment targets.
