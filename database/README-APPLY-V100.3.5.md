# Apply V100.3.5

Copy the included `client/` and `scripts/` paths over the current V100.3.4 repository, preserving relative paths.

Then run:

```powershell
npm run check
node scripts/maintenance/test-v100.3.5-ipad-viewport-floor-focus.js
npm run start
```

For the current physical-iPad LAN test, keep the already-established allowed origin in the same PowerShell session before `npm run start`:

```powershell
$env:BLUE_CURRENT_ALLOWED_ORIGINS="http://192.168.1.179:8787"
npm run start
```

Retest on the iPad in this order: Find guest → Service / Run floor → Kitchen / Pressure → Staff / Coverage → Floor full screen → Seat flow.
