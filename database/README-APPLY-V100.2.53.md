# V100.2.53 — Floor Regression Repair

Apply only after V100.2.52.

```powershell
node APPLY-V100.2.53.js
npm run check
node scripts/maintenance/test-v100.2.53-floor-regression-repair.js
npm start
```

Then hard refresh the browser and verify Main floor, Waterfront, and Private dining each show only their own tables.
