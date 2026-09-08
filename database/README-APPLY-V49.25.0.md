# APPLY BLUE CURRENT V49.25.0

Baseline: exact V49.20.0 repository.

Extract `BLUE-CURRENT-V49.25.0-PATCH.zip` into the root of `blue-current-reservations`, preserving directories and replacing matching files.

Validate:

```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-v49.25-launch-stabilization.js
node scripts/maintenance/test-v49.20-go-live-command.js
npm run start
```

Then:

```powershell
curl.exe -s http://localhost:8787/api/health
```

Expected:

```json
"version": "49.25.0"
```

Open `http://localhost:8787/` and press `Ctrl+F5`.

The new **Launch Stabilization** surface appears after Go-Live Command.

Important:

- stabilization observations are human-recorded
- rollback recommendations are advisory
- STABLE / EXTEND / ROLLBACK are human decisions
- rollback is never executed automatically

Git:

```powershell
git add -A
git commit -m "V49.25.0 add launch stabilization"
git push origin live-service-timeline
```
