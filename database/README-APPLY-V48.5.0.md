# APPLY BLUE CURRENT V48.5.0

## Baseline

Apply over the exact certified Blue Current V47.40.0 repository.

This is a normal overlay patch. No files are deleted.

## Apply

Extract `BLUE-CURRENT-V48.5.0-PATCH.zip` into the root of `blue-current-reservations`, preserving directories and replacing matching files.

## Validate

```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-v48.05-pilot-value-scorecard.js
npm run start
```

Wait for:

```text
Blue Current Cloud V48.5.0 running at http://localhost:8787
```

Then:

```powershell
curl.exe -s http://localhost:8787/api/health
```

Expected:

```json
"version": "48.5.0"
```

Open:

```text
http://localhost:8787/
```

Press `Ctrl+F5`.

At the top of the application, use **Pilot Value Scorecard**.

The first time you use it:

1. Enter a pilot name and sponsor.
2. Set the pilot duration if desired.
3. Click **Capture pilot baseline**.
4. Do not interpret the initial zero deltas as failure; they are the honest baseline.
5. Capture later checkpoints as operating actions and measured outcomes accumulate.

## Git

```powershell
git add -A
git commit -m "V48.5.0 add pilot value scorecard"
git push origin live-service-timeline
```
