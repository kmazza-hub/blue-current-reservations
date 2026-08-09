# APPLY BLUE CURRENT V51.55.0

Baseline: exact V51.50.0 repository.

Extract `BLUE-CURRENT-V51.55.0-PILOT-LAUNCH-CONTROL.zip` into the root of `blue-current-reservations`, preserving directories and replacing matching files.

Validate:

```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-v51.55-pilot-launch-control.js
node scripts/maintenance/test-v51.50-pilot-deployment-package.js
npm run start
```

Verify:

```powershell
curl.exe -s http://localhost:8787/api/health
```

Expected:

```json
"version": "51.55.0"
```

Open `http://localhost:8787/` and press `Ctrl+F5`.

The new **Pilot Launch Control** surface appears after Pilot Deployment Package.

Important:

- configuration is fingerprinted at freeze time
- any configuration drift reopens the launch gate
- unresolved blockers prevent authorization
- operator roster/support ownership are required
- launch authorization does not start Blue Current or perform go-live
- actual pilot execution remains a separate human-controlled step

Git:

```powershell
git add -A
git commit -m "V51.55.0 add pilot launch control"
git push origin live-service-timeline
```
