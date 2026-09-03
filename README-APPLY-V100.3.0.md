# V100.3.0 — Service → Manager Exception Visibility Integrity

Requires V100.2.99. Apply from the root of `blue-current-reservations`:

```powershell
node APPLY-V100.3.0.js
node scripts/maintenance/test-v100.3.0-service-manager-exception-visibility.js
node scripts/maintenance/test-v100.2.72-manager-operations-rush-certification.js
node scripts/maintenance/test-v100.2.56-service-exception-recovery.js
node scripts/maintenance/test-v100.2.62-kitchen-priority-exceptions.js
```

Restart Blue Current and press `Ctrl+F5`.
