# Apply V100.2.47 — Floor Layout Restoration

From the Blue Current repo root:

```powershell
node APPLY-V100.2.47.js
npm run check
node scripts/maintenance/test-v100.2.47-floor-layout-restoration.js
npm start
```

Then hard-refresh the Host Stand and switch Main floor → Waterfront → Private dining. Each room should show only its own tables, with the premium organic layout restored.
