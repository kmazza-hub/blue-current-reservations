# Apply V100.2.76 — Time & Attendance Truth Foundation

From the Blue Current repository root, run:

```powershell
node APPLY-V100.2.76.js
node scripts/maintenance/test-v100.2.76-timeclock-truth-foundation.js
```

Then run the protected regression gates and `npm run check`.

This wave requires V100.2.75 and uses hash guards on the shared runtime loader and `client/index.html`.
