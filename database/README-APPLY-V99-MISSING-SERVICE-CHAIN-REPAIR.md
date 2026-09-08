# V99 Missing Service Chain Repair

This package restores the V96.25–V99.0 service dependency chain expected by the current V99 server.js.

Apply by extracting the ZIP directly into the root of:
C:\Users\kmazz\OneDrive\Desktop\blue-current-reservations

Allow Windows to merge folders and replace matching files.

Then run:

```powershell
Test-Path .\server\services\pilotLearningProductDecisionControlService.js
Test-Path .\server\services\commercialProductFreezeFinalHardeningService.js
Test-Path .\server\services\finalRegressionSecurityDataIntegrityCertificationService.js
Test-Path .\server\services\finalOperatorUxAccessibilityServiceReadinessService.js
Test-Path .\server\services\commercialReleaseCandidateLockService.js

node --check .\server\server.js
npm run start
```

All five Test-Path commands should return True.
