# V100.2.61 — Kitchen Ready → Service / Expo Handoff

Apply from the repository root:

```powershell
node APPLY-V100.2.61.js
npm run check
node scripts/maintenance/test-v100.2.61-kitchen-service-handoff.js
npm start
```

Kitchen Ready is promoted into the existing Service workspace. Blue Current does not advance Service automatically; the operator still confirms `Food delivered`.
