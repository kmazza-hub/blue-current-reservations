# Apply V100.2.55

From the Blue Current repository root:

```powershell
node APPLY-V100.2.55.js
npm run check
node scripts/maintenance/test-v100.2.55-service-first-priority.js
npm start
```

Then hard refresh and open **Service · Run floor**. The workspace should show one clear **First priority** strip above the active table list while the Host Stand floor remains unchanged.
