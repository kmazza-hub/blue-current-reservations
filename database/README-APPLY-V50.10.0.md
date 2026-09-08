# APPLY BLUE CURRENT V50.10.0

Baseline: exact V50.5.0 repository.

Extract `BLUE-CURRENT-V50.10.0-PATCH.zip` into the root of `blue-current-reservations`, preserving directories and replacing matching files.

Validate:

```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-v50.10-production-health-support.js
node scripts/maintenance/test-v50.05-production-operations-handoff.js
npm run start
```

Then verify:

```powershell
curl.exe -s http://localhost:8787/api/health
```

Expected:

```json
"version": "50.10.0"
```

Open `http://localhost:8787/` and press `Ctrl+F5`.

The new **Production Health & Support Command** appears after Production Operations Handoff.

Important:

- only accepted production locations appear here
- support events and escalations are human initiated
- observability incident linkage is read-only
- no autonomous remediation or production change is permitted

Git:

```powershell
git add -A
git commit -m "V50.10.0 add production health and support command"
git push origin live-service-timeline
```
