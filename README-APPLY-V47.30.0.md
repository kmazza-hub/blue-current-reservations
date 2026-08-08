# APPLY BLUE CURRENT V47.30.0

## Baseline

Apply over the exact Blue Current V47.25.0 repository.

This is a normal overlay patch. No files are deleted.

## Apply

Extract `BLUE-CURRENT-V47.30.0-PATCH.zip` into the root of `blue-current-reservations`, preserving directories and replacing matching files.

## Validate

```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-v47.30-manager-operating-rhythm.js
npm run start
```

Wait for:

```text
Blue Current Cloud V47.30.0 running at http://localhost:8787
```

Then:

```powershell
curl.exe -s http://localhost:8787/api/health
```

Expected:

```json
"version": "47.30.0"
```

Open:

```text
http://localhost:8787/
```

Press:

```text
Ctrl+F5
```

The top operating flow is now:

1. Hospitality Performance Command
2. Action Workspace
3. Outcome Measurement
4. Service Profitability Intelligence
5. Predictive Shift Control
6. Manager Operating Rhythm
7. Restaurant Command Center

## Git

```powershell
git add -A
git commit -m "V47.30.0 add manager operating rhythm"
git push origin live-service-timeline
```
