# V100.2.95 — iPad Safe Area + Keyboard Viewport Integrity

Apply from the root of `blue-current-reservations`:

```powershell
node APPLY-V100.2.95.js
node scripts/maintenance/test-v100.2.95-ipad-safe-area-keyboard-integrity.js
node scripts/maintenance/test-v100.2.94-runtime-observer-loop-guard.js
node scripts/maintenance/test-v100.2.93-ipad-touch-target-foundation.js
```

Restart Blue Current and press `Ctrl+F5`. On iPad, verify the Host form remains scrollable with the keyboard open and bottom navigation stays above the Home indicator.
