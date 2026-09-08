# Apply V100.2.25

Copy this package into the Blue Current repository root, then run:

```powershell
node APPLY-V100.2.25.js
npm run check
node scripts/maintenance/test-v100.2.25-host-adaptive-labels.js
npm start
```

Acceptance check:

1. Floor markers for OPEN, CHECK, OPEN SOON, CLEANING, and reservation times are fully contained.
2. Table number and state are centered in every marker.
3. Long labels expand the marker instead of clipping.
4. Anniversary / High chair / other priority pills fully contain and center their text.
5. Reservation / Walk-in provenance pills remain hidden.
