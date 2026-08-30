# APPLY V100.2.73 — Scheduling Truth Foundation

From the Blue Current repository root:

```powershell
node APPLY-V100.2.73.js
node scripts/maintenance/test-v100.2.73-scheduling-truth-foundation.js
npm run check
node scripts/maintenance/test-v100.2.70-startup-runtime-performance.js
node scripts/maintenance/test-v100.2.72-manager-operations-rush-certification.js
```

Expected new gate: `V100.2.73 validation 18/18`.
