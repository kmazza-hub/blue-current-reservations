# APPLY BLUE CURRENT V47.15.0

## Baseline

Apply over the exact Blue Current V47.10.0 repository.

This is a normal overlay patch. No files are deleted.

## Apply

Extract `BLUE-CURRENT-V47.15.0-PATCH.zip` into the root of `blue-current-reservations`, preserving directories and replacing matching files.

## Validate

```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-v47.15-outcome-measurement.js
npm run start
```

Wait for:

```text
Blue Current Cloud V47.15.0 running at http://localhost:8787
```

Then:

```powershell
curl.exe -s http://localhost:8787/api/health
```

Expected:

```json
"version": "47.15.0"
```

Open:

```text
http://localhost:8787/
```

Press `Ctrl+F5`.

The top operating flow is now:

1. Hospitality Performance Command
2. Action Workspace
3. Outcome Measurement
4. Restaurant Command Center

When you complete an action, Blue Current immediately compares the original opportunity exposure with the current live opportunity.

If the problem still exists, the system will say so.

## Git

```powershell
git add -A
git commit -m "V47.15.0 add action outcome measurement"
git push origin live-service-timeline
```
