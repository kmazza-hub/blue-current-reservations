# Apply V100.2.50

From the Blue Current repository root:

```powershell
node APPLY-V100.2.50.js
npm run check
node scripts/maintenance/test-v100.2.50-service-intake-handoff.js
npm start
```

Apply after V100.2.49. Hard refresh after restart.
