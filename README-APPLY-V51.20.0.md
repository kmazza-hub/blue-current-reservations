# APPLY BLUE CURRENT V51.20.0

Baseline: exact V51.15.0 repository.

Extract `BLUE-CURRENT-V51.20.0-DATA-INTEGRITY-RECOVERY.zip` into the root of `blue-current-reservations`, preserving directories and replacing matching files.

Validate:

```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-v51.20-data-integrity-recovery.js
node scripts/maintenance/test-v51.15-peak-service-stress.js
npm run start
```

Verify:

```powershell
curl.exe -s http://localhost:8787/api/health
```

Expected:

```json
"version": "51.20.0"
```

Open `http://localhost:8787/` and press `Ctrl+F5`.

The new **Data Integrity & Recovery** surface appears after Peak-Service Stress & Failure Testing.

Important:

- static integrity readiness is not final certification
- verification requires human evidence
- certification is admin controlled
- Blue Current does not automatically repair or reconcile data
- restaurant operating state is not mutated by certification

Git:

```powershell
git add -A
git commit -m "V51.20.0 add data integrity and recovery certification"
git push origin live-service-timeline
```
