# Apply V100.2.75

From the Blue Current repository root:

```powershell
node APPLY-V100.2.75.js
node scripts/maintenance/test-v100.2.75-scheduling-rush-certification.js
npm run check
```

This wave is certification-only. It installs one maintenance test and does not modify runtime application files.
