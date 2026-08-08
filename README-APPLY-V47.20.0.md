# APPLY BLUE CURRENT V47.20.0

## Baseline

Apply over the exact Blue Current V47.15.0 repository.

This is a normal overlay patch. No files are deleted.

## Apply

Extract `BLUE-CURRENT-V47.20.0-PATCH.zip` into the root of `blue-current-reservations`, preserving directories and replacing matching files.

## Validate

```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-v47.20-service-profitability.js
npm run start
```

Wait for:

```text
Blue Current Cloud V47.20.0 running at http://localhost:8787
```

Then:

```powershell
curl.exe -s http://localhost:8787/api/health
```

Expected:

```json
"version": "47.20.0"
```

Open:

```text
http://localhost:8787/
```

Press `Ctrl+F5`.

The top operating workflow is now:

1. Hospitality Performance Command
2. Action Workspace
3. Outcome Measurement
4. Service Profitability Intelligence
5. Restaurant Command Center

## Git

```powershell
git add -A
git commit -m "V47.20.0 add service profitability intelligence"
git push origin live-service-timeline
```
