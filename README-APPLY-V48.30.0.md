# APPLY BLUE CURRENT V48.30.0 — FINAL V48 WAVE

Baseline: exact V48.25.0 repository.

Extract `BLUE-CURRENT-V48.30.0-FINAL.zip` into the repository root, preserving directories and replacing matching files.

```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-v48.20-pilot-decision-ledger.js
node scripts/maintenance/test-v48.25-expansion-readiness.js
node scripts/maintenance/test-v48.30-release-certification.js
npm run start
curl.exe -s http://localhost:8787/api/health
```

Expected version: `48.30.0`.

Then `Ctrl+F5`.

The **V48 Release Closure & Certification** surface is read-only. It reports both architecture contracts and current real pilot state.

```powershell
git add -A
git commit -m "V48.30.0 close and certify V48"
git push origin live-service-timeline
```

After this commit, V48 is closed. Begin new feature work in V49.
