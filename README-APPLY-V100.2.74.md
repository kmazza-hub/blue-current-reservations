# APPLY V100.2.74 — Scheduling Publication Integrity

From the Blue Current repository root:

```powershell
node APPLY-V100.2.74.js
node scripts/maintenance/test-v100.2.74-scheduling-publication-integrity.js
npm run check
node scripts/maintenance/test-v100.2.70-startup-runtime-performance.js
node scripts/maintenance/test-v100.2.73-scheduling-truth-foundation.js
```

Expected new gate: `V100.2.74 validation 17/17`.

This installer is guarded against overwriting an unexpected Scheduling service. It is idempotent on the V100.2.74 target state.
