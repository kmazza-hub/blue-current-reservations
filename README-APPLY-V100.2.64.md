# V100.2.64 — Staffing Truth Foundation

Apply from the repository root:

```powershell
node APPLY-V100.2.64.js
npm run check
node scripts/maintenance/test-v100.2.64-staffing-truth-foundation.js
npm start
```

The primary Staff view now uses the live Time Clock snapshot: working now, breaks, overtime risk, and missed punches. Synthetic workforce-demand and callout recommendations are not shown as live truth.
