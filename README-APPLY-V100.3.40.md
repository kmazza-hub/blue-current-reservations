# Apply Blue Current V100.3.40

Copy the ZIP contents into the repository root. This overlay updates install metadata, adds three icon assets, and adds the automated and physical iPad acceptance gates. It contains no database files.

## Validate

```powershell
npm install
npm run check
node .\scripts\maintenance\test-v100.3.40-ipad-pilot-readiness.js
```

After automated validation passes, follow `PILOT-IPAD-ACCEPTANCE-V100.3.40.md` on the intended pilot iPad and restaurant network.
