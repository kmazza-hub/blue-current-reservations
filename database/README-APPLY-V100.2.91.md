# V100.2.91 — iPad Resume Render Commit Integrity

After resume rehydration succeeds, Blue Current waits for the pending shared-state render frame before releasing the interaction guard.

```powershell
node APPLY-V100.2.91.js
node scripts/maintenance/test-v100.2.91-ipad-resume-render-commit-integrity.js
```
