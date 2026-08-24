# Blue Current V100.2.34 — Zoned Host Floor Plans

Apply from the Blue Current repository root after V100.2.33:

```powershell
node APPLY-V100.2.34.js
npm run check
node scripts/maintenance/test-v100.2.34-host-zoned-floor-plans.js
npm start
```

Acceptance check: Main floor, Waterfront, and Private dining must each show a different set of tables. Switching rooms must not alter table state, seating queues, or restaurant-wide counts.
