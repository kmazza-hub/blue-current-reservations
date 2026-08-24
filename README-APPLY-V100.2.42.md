# Blue Current V100.2.42 — Zero-Overlap Restaurant Floor Spacing

This is a CSS-only floor-map spacing repair. It does not alter host workflow or state logic.

From the repository root:

```powershell
node APPLY-V100.2.42.js
npm run check
node scripts/maintenance/test-v100.2.42-floor-zero-overlap.js
npm start
```

Then hard refresh the Host Stand and inspect Main floor, Waterfront, and Private dining.
