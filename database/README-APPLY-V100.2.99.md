# V100.2.99 — Manager Actions Runtime Wiring Integrity

Apply from the root of `blue-current-reservations`:

```powershell
node APPLY-V100.2.99.js
node scripts/maintenance/test-v100.2.99-manager-actions-runtime-wiring.js
node scripts/maintenance/test-v100.2.68-manager-operations-truth.js
node scripts/maintenance/test-v100.2.69-manager-action-ownership.js
```

Restart Blue Current and press `Ctrl+F5`.
