# APPLY BLUE CURRENT V50.30.0 — FINAL V50 WAVE

Baseline: exact V50.25.0 repository.

Extract `BLUE-CURRENT-V50.30.0-FINAL.zip` into the root of `blue-current-reservations`, preserving directories and replacing matching files.

This closure wave also includes a deterministic V50.25 corrective-action evidence ordering fix found during clean-baseline certification.

Run:

```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-v50.05-production-operations-handoff.js
node scripts/maintenance/test-v50.10-production-health-support.js
node scripts/maintenance/test-v50.15-production-incident-command.js
node scripts/maintenance/test-v50.20-production-recovery-review.js
node scripts/maintenance/test-v50.25-production-corrective-action-governance.js
node scripts/maintenance/test-v50.30-release-certification.js
npm run start
```

Verify:

```powershell
curl.exe -s http://localhost:8787/api/health
```

Expected:

```json
"version": "50.30.0"
```

Open `http://localhost:8787/` and press `Ctrl+F5`.

On untouched runtime data, expect:

`V50-ARCHITECTURE-CERTIFIED`

Do not expect `V50-CERTIFIED-LIVE` until the actual production lifecycle has been executed.

Commit:

```powershell
git add -A
git commit -m "V50.30.0 close and certify V50"
git push origin live-service-timeline
```

After this commit, V50 is closed. Begin new feature work in V51.
