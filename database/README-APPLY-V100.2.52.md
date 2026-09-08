# Apply V100.2.52

From the Blue Current repository root:

```powershell
node APPLY-V100.2.52.js
npm run check
node scripts/maintenance/test-v100.2.52-service-milestones.js
npm start
```

Then hard refresh the browser and open **Service · Run floor**.

This wave requires V100.2.51 and only replaces `client/js/floor-reservations-v62.0.js`.
