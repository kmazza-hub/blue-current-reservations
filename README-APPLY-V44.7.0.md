# Apply Blue Current V44.7.0

Apply this patch over the uploaded V44.3.0 authoritative repository baseline.

## 1. Stop Blue Current
In PowerShell:

```powershell
taskkill /F /IM node.exe
```

Ignore the message if no Node process is running.

## 2. Copy the patch files
Extract `BLUE-CURRENT-V44.7.0-PATCH.zip` into:

`C:\Users\kmazz\OneDrive\Desktop\blue-current-reservations`

Allow Windows to replace the included files.

This patch does **not** include or replace `database/data/blue-current.json`.

## 3. Validate
From the repository root:

```powershell
npm run check
```

Expected final line:

`Validated V44.7.0: ...`

Then run the focused persistent-runtime test:

```powershell
node scripts/maintenance/test-aip-persistent-runtime.js
```

Expected JSON contains `"ok": true` and `"gatedStatus": "approval-pending"`.

## 4. Start Blue Current

```powershell
npm run start
```

Expected startup banner:

`Blue Current Cloud V44.7.0 running at http://localhost:8787`

## 5. Verify health
In another PowerShell window:

```powershell
curl.exe -s http://localhost:8787/api/health
```

Confirm the response includes:

`"ok":true` and `"version":"44.7.0"`

## 6. Exercise the new AIP runtime
Open:

`http://localhost:8787/?pack=aip`

Sign in, then use this order:

1. Natural-Language Automation Compiler — compile a read-only prompt such as `Summarize the current operating picture.`
2. Governed Execution Sandbox — run the latest simulation.
3. Persistent Agent Runtime — create a run.
4. Inspect the run to view shared execution context.
5. Runtime Lifecycle — Start dry-run → Checkpoint → Pause → Resume → Pause → Recover.
6. AIP Runtime Readiness II — run readiness.

An action-oriented/approval-gated draft should remain `approval-pending`; attempting to start it is expected to be blocked.

## 7. Git hygiene
Before staging, confirm the runtime database has not changed unintentionally:

```powershell
git status
```

Do not use `git add .` while runtime database artifacts are present. Stage the V44.7.0 release files intentionally.

Suggested commit message:

```powershell
git commit -m "V44.7.0 persistent AIP agent runtime and recovery"
```
