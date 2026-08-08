# Apply Blue Current V44.12.0

1. Stop Blue Current before applying the patch.

```powershell
taskkill /F /IM node.exe
```

2. Extract `BLUE-CURRENT-V44.12.0-PATCH.zip` over the authoritative `blue-current-reservations` repository, preserving folders and replacing changed files when prompted.

3. Do **not** replace `database/data/blue-current.json`. It is intentionally absent from this patch.

4. Validate syntax and duplicate checks:

```powershell
npm run check
```

Expected version: `V44.12.0`.

5. Run the focused orchestration test:

```powershell
node scripts/maintenance/test-aip-multi-agent-orchestration.js
```

Expected result includes `"ok": true` and approval scope `governed-dry-run-only`.

6. Start Blue Current:

```powershell
npm run start
```

7. In another PowerShell window, verify health:

```powershell
curl.exe -s http://localhost:8787/api/health
```

Expected health version: `44.12.0`.

## Important
V44.12.0 introduces governed orchestration only. Approval does not authorize live restaurant mutation; multi-agent execution remains dry-run isolated.
