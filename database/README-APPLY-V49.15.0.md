# APPLY BLUE CURRENT V49.15.0

Baseline: exact V49.10.0 repository.

Extract `BLUE-CURRENT-V49.15.0-PATCH.zip` into the root of `blue-current-reservations`, preserving directories and replacing matching files.

Validate:

```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-v49.15-location-deployment-package.js
node scripts/maintenance/test-v49.10-technical-activation-readiness.js
npm run start
```

Then:

```powershell
curl.exe -s http://localhost:8787/api/health
```

Expected:

```json
"version": "49.15.0"
```

Open `http://localhost:8787/` and press `Ctrl+F5`.

The new **Location Deployment Package** surface appears after Technical Activation Readiness.

Important:

- package preparation requires human go-live authorization
- package preparation is admin-only
- package preparation does not provision infrastructure
- package preparation does not start deployment
- production cutover remains NOT_PERFORMED

Git:

```powershell
git add -A
git commit -m "V49.15.0 add location deployment package"
git push origin live-service-timeline
```
