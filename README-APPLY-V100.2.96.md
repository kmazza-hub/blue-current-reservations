# V100.2.96 — iPad Host Repeat-Tap Integrity

Apply from the root of `blue-current-reservations`:

```powershell
node APPLY-V100.2.96.js
node scripts/maintenance/test-v100.2.96-ipad-host-repeat-tap-integrity.js
node scripts/maintenance/test-v100.2.20-consolidated-host-runtime-recovery.js
node scripts/maintenance/test-v100.2.46-guest-recognition-memory.js
node scripts/maintenance/test-v100.2.47-floor-layout-restoration.js
node scripts/maintenance/test-v100.2.95-ipad-safe-area-keyboard-integrity.js
```

Restart Blue Current and press `Ctrl+F5`.
