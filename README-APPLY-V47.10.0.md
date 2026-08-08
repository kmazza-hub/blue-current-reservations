# APPLY BLUE CURRENT V47.10.0

## Baseline

Apply over the exact Blue Current V47.5.0 repository.

This is a normal overlay patch. No files are deleted.

## Apply

Extract `BLUE-CURRENT-V47.10.0-PATCH.zip` into the root of `blue-current-reservations`, preserving directories and replacing matching files.

## Validate

```powershell
taskkill /F /IM node.exe
npm run check
node scripts/maintenance/test-v47.10-action-workspace.js
npm run start
```

Wait for:

```text
Blue Current Cloud V47.10.0 running at http://localhost:8787
```

Then:

```powershell
curl.exe -s http://localhost:8787/api/health
```

Expected:

```json
"version": "47.10.0"
```

Open:

```text
http://localhost:8787/
```

Press `Ctrl+F5`.

At the top of the application you should now see:

1. **Hospitality Performance Command**
2. **Action Workspace**
3. the existing Restaurant Command Center

To exercise the workflow:

1. Choose an opportunity in Hospitality Performance Command.
2. Enter an owner/note if desired.
3. Click **Own Action**.
4. The action appears in Action Workspace.
5. Use **Start**, **Block**, **Complete**, or **Cancel** as service progresses.

## Git

```powershell
git add -A
git commit -m "V47.10.0 add hospitality action workspace"
git push origin live-service-timeline
```
