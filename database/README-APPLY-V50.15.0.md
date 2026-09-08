# APPLY BLUE CURRENT V50.15.0

Baseline: exact V50.10.0 repository.

Extract `BLUE-CURRENT-V50.15.0-PATCH.zip` into the root of `blue-current-reservations`, preserving directories and replacing matching files.

Validate:

```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-v50.15-production-incident-command.js
node scripts/maintenance/test-v50.10-production-health-support.js
npm run start
```

Verify:

```powershell
curl.exe -s http://localhost:8787/api/health
```

Expected:

```json
"version": "50.15.0"
```

Open `http://localhost:8787/` and press `Ctrl+F5`.

The new **Production Incident Command** surface appears after Production Health & Support Command.

Important:

- incident command creation is human initiated
- containment is human directed
- observability/SLO state is linked rather than duplicated
- recovery evidence is human recorded
- resolution is human declared
- Blue Current does not contain, remediate, resolve, or alter production automatically

Git:

```powershell
git add -A
git commit -m "V50.15.0 add production incident command"
git push origin live-service-timeline
```
