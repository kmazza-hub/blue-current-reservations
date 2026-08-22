# V100.2.20 — Consolidated Host Runtime Recovery

Built directly against the uploaded 2026-08-22 12:54 repo snapshot.

The snapshot was internally inconsistent: V100.2.17 was active, V100.2.18 was not installed/present in the repo, and V100.2.19 files existed but its runtime guard was not applied. The active V100.2.17 observer could therefore trigger itself continuously while re-sorting the ready queue, eventually freezing Edge.

Copy this package into the repo root, then run:

```powershell
node APPLY-V100.2.20.js
npm run check
node scripts/maintenance/test-v100.2.20-consolidated-host-runtime-recovery.js
npm start
```

Acceptance: Host Stand remains responsive for at least 30 seconds, navigation remains clickable, and Seat -> choose table -> confirm works once per action.
