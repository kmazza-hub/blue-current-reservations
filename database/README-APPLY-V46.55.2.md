# APPLY BLUE CURRENT V46.55.2

## Baseline
Apply over the exact V46.55.1 repository.

This is a normal overlay hotfix. No files are deleted.

## Apply
Extract `BLUE-CURRENT-V46.55.2-STABILITY-HOTFIX.zip` into the root of `blue-current-reservations`, preserving directories and replacing matching files.

## Validate

```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-v46.55.2-stability.js
npm run start
```

Then wait until the server says:

```text
Blue Current Cloud V46.55.2 running at http://localhost:8787
```

Open:

```text
http://localhost:8787/
```

and press `Ctrl+F5`.

## Expected behavior

The previous:

```text
Uncaught (in promise) TypeError: Failed to fetch
```

from Executive Workflow Composer should no longer appear during a transient disconnect.

On the OneDrive database path, a transient rename lock may still be logged once, but Blue Current should move to the safe fallback immediately rather than repeatedly retrying rename.

## Health

```powershell
curl.exe -s http://localhost:8787/api/health
```

Expected:

```json
"version": "46.55.2"
```

## Git

```powershell
git add -A
git commit -m "V46.55.2 stabilize localhost network and OneDrive database writes"
git push origin live-service-timeline
```
