# APPLY BLUE CURRENT V50.5.0

Baseline: exact certified V49.30.0 repository.

Extract `BLUE-CURRENT-V50.5.0-PATCH.zip` into the root of `blue-current-reservations`, preserving directories and replacing matching files.

Validate:

```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-v50.05-production-operations-handoff.js
node scripts/maintenance/test-v49.30-release-certification.js
npm run start
```

Then:

```powershell
curl.exe -s http://localhost:8787/api/health
```

Expected:

```json
"version": "50.5.0"
```

Open `http://localhost:8787/` and press `Ctrl+F5`.

The new **Production Operations Handoff** surface appears after the V49 rollout stack.

Important:

- only a human-declared STABLE location can enter production handoff
- production acceptance is admin-only
- support owner and escalation owner are required
- open gates require a documented executive override
- acceptance does not modify production runtime
- Blue Current does not remediate automatically

Git:

```powershell
git add -A
git commit -m "V50.5.0 add production operations handoff"
git push origin live-service-timeline
```
