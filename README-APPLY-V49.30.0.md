# APPLY BLUE CURRENT V49.30.0 — FINAL V49 WAVE

Baseline: exact V49.25.0 repository.

Extract `BLUE-CURRENT-V49.30.0-FINAL.zip` into the root of `blue-current-reservations`, preserving directories and replacing matching files.

## Full V49 validation

```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-v49.05-rollout-activation-control.js
node scripts/maintenance/test-v49.10-technical-activation-readiness.js
node scripts/maintenance/test-v49.15-location-deployment-package.js
node scripts/maintenance/test-v49.20-go-live-command.js
node scripts/maintenance/test-v49.25-launch-stabilization.js
node scripts/maintenance/test-v49.30-release-certification.js
npm run start
```

Then:

```powershell
curl.exe -s http://localhost:8787/api/health
```

Expected:

```json
"version": "49.30.0"
```

Open:

```text
http://localhost:8787/
```

Press `Ctrl+F5`.

The new **V49 Release Closure & Certification** surface is read-only.

Do not expect `V49-CERTIFIED-LIVE` on untouched demo/runtime data. Until the real rollout chain is executed, the correct runtime state is `V49-ARCHITECTURE-CERTIFIED`.

## Git

```powershell
git add -A
git commit -m "V49.30.0 close and certify V49"
git push origin live-service-timeline
```

After this commit, V49 is closed. Begin new feature development in V50.
