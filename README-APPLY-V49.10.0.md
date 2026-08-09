# APPLY BLUE CURRENT V49.10.0

Baseline: exact V49.5.0 repository.

Extract `BLUE-CURRENT-V49.10.0-PATCH.zip` into the root of `blue-current-reservations`, preserving directories and replacing matching files.

Validate:

```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-v49.10-technical-activation-readiness.js
node scripts/maintenance/test-v49.05-rollout-activation-control.js
npm run start
```

Then:

```powershell
curl.exe -s http://localhost:8787/api/health
```

Expected:

```json
"version": "49.10.0"
```

Open `http://localhost:8787/` and press `Ctrl+F5`.

The new **Technical Activation Readiness** surface appears in the V49 rollout stack.

Important:

- go-live authorization is admin-only
- open technical blockers require a documented executive override
- authorization does not provision infrastructure
- authorization does not deploy code
- authorization does not perform production cutover

Git:

```powershell
git add -A
git commit -m "V49.10.0 add technical activation readiness"
git push origin live-service-timeline
```
