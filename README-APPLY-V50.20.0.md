# APPLY BLUE CURRENT V50.20.0

Baseline: exact V50.15.0 repository.

Extract `BLUE-CURRENT-V50.20.0-PATCH.zip` into the root of `blue-current-reservations`, preserving directories and replacing matching files.

Validate:

```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-v50.20-production-recovery-review.js
node scripts/maintenance/test-v50.15-production-incident-command.js
npm run start
```

Verify:

```powershell
curl.exe -s http://localhost:8787/api/health
```

Expected:

```json
"version": "50.20.0"
```

Open `http://localhost:8787/` and press `Ctrl+F5`.

The new **Production Recovery & Post-Incident Review** surface appears after Production Incident Command.

Important:

- recovery verification is read-only
- root cause is human authored
- corrective actions require human owners
- corrective actions are never executed by Blue Current
- lessons acceptance is admin/human controlled
- post-incident closure does not mutate production runtime

Git:

```powershell
git add -A
git commit -m "V50.20.0 add production recovery and post-incident review"
git push origin live-service-timeline
```
