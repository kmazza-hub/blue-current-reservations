# APPLY BLUE CURRENT V51.50.0

Baseline: exact V51.45.0 repository.

Extract `BLUE-CURRENT-V51.50.0-PILOT-DEPLOYMENT-PACKAGE.zip` into the root of `blue-current-reservations`, preserving directories and replacing matching files.

Validate:

```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-v51.50-pilot-deployment-package.js
node scripts/maintenance/test-v51.45-management-executive-accuracy.js
npm run start
```

Verify:

```powershell
curl.exe -s http://localhost:8787/api/health
```

Expected:

```json
"version": "51.50.0"
```

Open `http://localhost:8787/` and press `Ctrl+F5`.

The new **Pilot Deployment Package** surface appears after Management & Executive Accuracy.

Important:

- package generation does not deploy Blue Current
- package certification does not perform go-live
- support and escalation owners are required
- human deployment evidence is required
- backup/restore and rollback procedures remain explicit human-controlled operations

Git:

```powershell
git add -A
git commit -m "V51.50.0 add pilot deployment package"
git push origin live-service-timeline
```
