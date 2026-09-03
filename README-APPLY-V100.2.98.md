# V100.2.98 — Host → Service Party Identity Integrity

Apply from the root of `blue-current-reservations`:

```powershell
node APPLY-V100.2.98.js
node scripts/maintenance/test-v100.2.98-host-service-party-identity-integrity.js
node scripts/maintenance/test-v100.2.50-service-intake-handoff.js
node scripts/maintenance/test-v100.2.57-service-table-turn-handoff.js
node scripts/maintenance/test-v100.2.96-ipad-host-repeat-tap-integrity.js
```

Restart Blue Current and press `Ctrl+F5`.
