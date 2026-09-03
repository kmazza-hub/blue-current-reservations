# V100.3.1 — Service → Manager Cross-Domain Certification

Requires V100.3.0. Apply from the root of `blue-current-reservations`:

```powershell
node APPLY-V100.3.1.js
node scripts/maintenance/test-v100.3.1-service-manager-cross-domain-certification.js
node scripts/maintenance/test-v100.3.0-service-manager-exception-visibility.js
node scripts/maintenance/test-v100.2.72-manager-operations-rush-certification.js
```

Restart Blue Current and press `Ctrl+F5`.
