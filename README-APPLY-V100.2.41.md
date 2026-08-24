# V100.2.41 — Host Focus Simplification

Requires V100.2.40.

From the Blue Current repository root:

```powershell
node APPLY-V100.2.41.js
npm run check
node scripts/maintenance/test-v100.2.41-host-focus-simplification.js
npm start
```

Changes are intentionally narrow:
- removes the Floor sidebar's `Tonight’s moments` card;
- removes `Mark arrived` from reservation detail;
- keeps `Add to waitlist` as the single reservation-to-floor handoff;
- keeps Edit reservation and Cancel reservation;
- does not alter floor zoning, table fit, table lifecycle, waitlist seating, or persistence behavior.
