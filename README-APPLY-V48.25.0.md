# APPLY BLUE CURRENT V48.25.0

Baseline: exact V48.20.0 repository.

Extract `BLUE-CURRENT-V48.25.0-PATCH.zip` into the repository root.

```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-v48.25-expansion-readiness.js
npm run start
curl.exe -s http://localhost:8787/api/health
```

Expected version: `48.25.0`.

Then `Ctrl+F5`.

The new **Expansion Readiness & Rollout Scope** surface appears after the V48 decision stack.

Important: rollout drafting requires both a signed human EXPAND decision and admin permission. Drafting a rollout never activates a location.

```powershell
git add -A
git commit -m "V48.25.0 add expansion readiness and rollout scope"
git push origin live-service-timeline
```
