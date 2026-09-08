# APPLY BLUE CURRENT V48.20.0

Baseline: exact V48.15.0 repository.

Extract `BLUE-CURRENT-V48.20.0-PATCH.zip` into the repository root.

```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-v48.20-pilot-decision-ledger.js
npm run start
curl.exe -s http://localhost:8787/api/health
```

Expected version: `48.20.0`.

Then `Ctrl+F5`.

The new **Pilot Decision Ledger & Executive Sign-Off** appears in the V48 commercial proof stack.

Important: signing is admin-only. A non-admin account can review the ledger but cannot sign a commercial decision.

```powershell
git add -A
git commit -m "V48.20.0 add pilot decision ledger and executive sign-off"
git push origin live-service-timeline
```
