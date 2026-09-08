# Blue Current V100.2.35 — Premium Restaurant Floor Map

Apply from the Blue Current repository root after V100.2.34:

```powershell
node APPLY-V100.2.35.js
npm run check
node scripts/maintenance/test-v100.2.35-premium-floor-map.js
npm start
```

Acceptance check: Main floor, Waterfront, and Private dining should each look like a distinct physical restaurant room while preserving every existing table state and seating action.
