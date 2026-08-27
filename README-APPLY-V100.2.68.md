# V100.2.68 — Manager Operations Truth Foundation

Apply from repository root:

```powershell
node APPLY-V100.2.68.js
npm run check
node scripts/maintenance/test-v100.2.68-manager-operations-truth.js
npm start
```

The primary Manager command now uses only Manager Actions and Operations Feed records. Legacy synthetic readiness/financial forecast content is not used in this primary view.
