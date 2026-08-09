# APPLY BLUE CURRENT V52.10.0

Baseline: V52.5.0.

Extract `BLUE-CURRENT-V52.10.0-PILOT-CLOSEOUT-OUTCOME.zip` into the root of `blue-current-reservations`, preserving directories and replacing matching files.

Validate:

```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-v52.10-pilot-closeout-outcome.js
node scripts/maintenance/test-v52.5-pilot-stabilization-exit.js
npm run start
```

Verify:

```powershell
curl.exe -s http://localhost:8787/api/health
```

Expected:

`"version":"52.10.0"`

Then Ctrl+F5.

Commit:

```powershell
git add -A
git commit -m "V52.10.0 add pilot closeout and outcome review"
git push origin live-service-timeline
```

Important:
- EXPAND is a human decision record only.
- It does not deploy another location.
- HOLD and RETIRE do not make autonomous production changes.
