# APPLY BLUE CURRENT V51.05.0

Baseline: exact V50.30.0 repository.

Extract `BLUE-CURRENT-V51.05.0-PILOT-READINESS.zip` into the root of `blue-current-reservations`, preserving directories and replacing matching files.

Validate:

```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-v51.05-pilot-operational-readiness.js
node scripts/maintenance/test-v50.30-release-certification.js
npm run start
```

Verify:

```powershell
curl.exe -s http://localhost:8787/api/health
```

Expected:

```json
"version": "51.05.0"
```

Open `http://localhost:8787/` and press `Ctrl+F5`.

The new **Restaurant Pilot Readiness Baseline** surface appears after V50 Release Certification.

Do not expect a GO result yet. The current authoritative Chefs data correctly exposes real operational prerequisites that have not been executed/configured.

Git:

```powershell
git add -A
git commit -m "V51.05.0 add restaurant pilot readiness baseline"
git push origin live-service-timeline
```
