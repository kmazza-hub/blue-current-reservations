# APPLY BLUE CURRENT V50.25.0

Baseline: exact V50.20.0 repository.

Extract `BLUE-CURRENT-V50.25.0-PATCH.zip` into the root of `blue-current-reservations`, preserving directories and replacing matching files.

Validate:

```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-v50.25-production-corrective-action-governance.js
node scripts/maintenance/test-v50.20-production-recovery-review.js
npm run start
```

Verify:

```powershell
curl.exe -s http://localhost:8787/api/health
```

Expected:

```json
"version": "50.25.0"
```

Open `http://localhost:8787/` and press `Ctrl+F5`.

The new **Production Learning & Corrective Action Governance** surface appears after Production Recovery & Post-Incident Review.

Important:

- action execution remains human-owned
- repeat-incident linkage is advisory, not causal attribution
- risk-reduction evidence is human-recorded
- completion requires executive/admin acceptance
- Blue Current does not execute corrective actions or alter production automatically

Git:

```powershell
git add -A
git commit -m "V50.25.0 add production learning and corrective action governance"
git push origin live-service-timeline
```
