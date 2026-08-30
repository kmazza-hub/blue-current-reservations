# V100.2.80 — Inventory Truth Foundation

Requires V100.2.79.

From the Blue Current repository root:

```powershell
node APPLY-V100.2.80.js
node scripts/maintenance/test-v100.2.80-inventory-truth-foundation.js
```

This wave establishes a truth-first Inventory surface using recorded Inventory API state, on-hand quantity, configured par, below-par attention, and explicit unknown/unavailable behavior. Predictive reorder, modeled food-cost, and vendor recommendations are not part of the primary truth surface.
