# APPLY BLUE CURRENT V47.5.0

## Baseline

Apply over the exact Blue Current V46.70.0 repository.

This is a normal overlay patch. No files are deleted.

## Apply

Extract `BLUE-CURRENT-V47.5.0-PATCH.zip` into the root of `blue-current-reservations`, preserving directories and replacing matching files.

## Validate

```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-v47.05-hospitality-performance.js
npm run start
```

Wait for:

```text
Blue Current Cloud V47.5.0 running at http://localhost:8787
```

Then:

```powershell
curl.exe -s http://localhost:8787/api/health
```

Expected:

```json
"version": "47.5.0"
```

Open:

```text
http://localhost:8787/
```

Press `Ctrl+F5`.

The new **Hospitality Performance Command** section appears immediately before the existing Restaurant Command Center.

## Git

```powershell
git add -A
git commit -m "V47.5.0 add hospitality performance command"
git push origin live-service-timeline
```
