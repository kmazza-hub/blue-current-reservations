# Apply V100.2.54 — Service Priority & Pacing

From the Blue Current repository root, after V100.2.53:

```powershell
node APPLY-V100.2.54.js
npm run check
node scripts/maintenance/test-v100.2.54-service-priority-pacing.js
npm start
```

Then hard refresh the browser.

This wave deliberately does **not** replace the Host Stand controller. The apply script uses guarded, exact in-place edits limited to the Service workspace and refuses to run unless the repaired V100.2.53 floor-isolation marker is present.
