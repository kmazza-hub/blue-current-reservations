# Blue Current V100.2.31 — Arrival Mark Arrived Fit

Apply from the Blue Current repository root after V100.2.30:

```powershell
node APPLY-V100.2.31.js
npm run check
node scripts/maintenance/test-v100.2.31-arrival-mark-arrived-fit.js
npm start
```

Acceptance check: open **Reservations / Arrivals** and verify every **Mark arrived** button is fully visible, centered, and inside the row at normal desktop and iPad widths. The redundant **Expected** pill is intentionally removed while Mark arrived is the active action.
