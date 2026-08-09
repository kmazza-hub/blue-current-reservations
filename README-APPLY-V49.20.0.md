# APPLY BLUE CURRENT V49.20.0

Baseline: exact V49.15.0 repository.

Extract `BLUE-CURRENT-V49.20.0-PATCH.zip` into the root of `blue-current-reservations`, preserving directories and replacing matching files.

Validate:

```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-v49.20-go-live-command.js
node scripts/maintenance/test-v49.15-location-deployment-package.js
npm run start
```

Then:

```powershell
curl.exe -s http://localhost:8787/api/health
```

Expected:

```json
"version": "49.20.0"
```

Open `http://localhost:8787/` and press `Ctrl+F5`.

The new **Go-Live Command** surface appears after Location Deployment Package.

Important:

- production cutover authorization is admin-only
- authorization does not execute deployment
- cutover results are human-recorded
- successful cutover requires all six post-cutover health confirmations
- failed cutover requires an incident description
- Blue Current never claims it executed the production cutover

Git:

```powershell
git add -A
git commit -m "V49.20.0 add go-live command"
git push origin live-service-timeline
```
