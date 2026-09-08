# Blue Current V100.2.28
## Host Action Card Readability + Seat Button Contrast

Run from the Blue Current repository root:

```powershell
node APPLY-V100.2.28.js
npm run check
node scripts/maintenance/test-v100.2.28-host-action-card-readability.js
npm start
```

This is a visual-only Host Stand patch. It does not change seating, queue, wait-time, reservation, table-lifecycle, auth, or persistence logic.
