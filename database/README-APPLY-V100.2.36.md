# Blue Current V100.2.36 — Production-Scale Restaurant Floor Plans

Apply from the repository root after V100.2.35:

```powershell
node APPLY-V100.2.36.js
npm run check
node scripts/maintenance/test-v100.2.36-production-scale-floor.js
npm start
```

Acceptance check: Main floor shows 16 tables, Waterfront 12, and Private dining 8. Switching rooms keeps them separate, and normal Seat → choose table behavior continues to use only tables that fit the party.
