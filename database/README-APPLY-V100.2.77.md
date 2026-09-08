# V100.2.77 — Time Clock Record Integrity

From the Blue Current repository root:

```powershell
node APPLY-V100.2.77.js
node scripts/maintenance/test-v100.2.77-timeclock-record-integrity.js
node scripts/maintenance/test-v100.2.76-timeclock-truth-foundation.js
```

The installer is hash-guarded and idempotent. It requires the applied V100.2.76 baseline and refuses to overwrite an unexpected Time Clock service.
