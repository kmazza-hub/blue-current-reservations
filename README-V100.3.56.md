# Blue Current V100.3.56 — Runtime Database Separation

This update moves the local runtime database outside the application repository while preserving the exact V100.3.55 operating data. It does not change reservations, arrivals, seating, floor, service, check completion, cleaning/reset, permissions, integrations, or manager-approval policy.

The Windows runtime database is selected through the ignored `config/runtime-database.local.json` file and defaults to `%LOCALAPPDATA%\BlueCurrent\data\blue-current.json`. `BLUE_CURRENT_DB` remains the highest-priority authority for hosted or explicitly configured environments. An explicitly configured missing database fails closed.

The committed `database/seed/seed.json` is initialization and validation data only. Any restaurant records in that seed are fictional demonstration data.

## Installation

Stop the Node server first. Extract this ZIP, then run:

```powershell
Set-Location "C:\Path\To\BLUE-CURRENT-V100.3.56-UPDATE"
Set-ExecutionPolicy -Scope Process Bypass
.\INSTALL-V100.3.56.ps1
```

The installer validates the existing JSON, copies it without alteration to `%LOCALAPPDATA%\BlueCurrent\data\blue-current.json`, refuses to overwrite different external data, writes the ignored local selector, installs only the changed application files, and runs validation plus certification. The original repository database remains as a safety copy until the Git checkpoint is committed.

## Certification

```powershell
Set-Location "C:\Users\kmazz\OneDrive\Desktop\blue-current-reservations"
npm ci
npm run check
node scripts\maintenance\test-v100.3.54-authentication-handshake.js
node scripts\maintenance\test-v100.3.55-first-class-operating-lifecycle.js
node scripts\maintenance\test-v100.3.56-runtime-database-separation.js
npm run certify:pilot
```

## Server restart and localhost authentication

In the server terminal:

```powershell
Set-Location "C:\Users\kmazz\OneDrive\Desktop\blue-current-reservations"
Get-NetTCPConnection -LocalPort 8787 -State Listen -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique |
    ForEach-Object { Stop-Process -Id $_ -Force }
npm start
```

Keep that terminal open. In a second PowerShell terminal, open `http://localhost:8787`, sign in with the existing authorized account, and confirm the server terminal reports the external database path. Restart `cloudflared` only if needed; its Quick Tunnel URL is temporary. Sign in through that new URL separately and do not treat successful localhost authentication as remote authentication evidence.

## Git checkpoint

Run only after the installer and both authentication paths are verified:

```powershell
Set-Location "C:\Users\kmazz\OneDrive\Desktop\blue-current-reservations"
git fetch origin
git status --short --branch
git pull --rebase --autostash origin live-service-timeline

git add -- .env.example .gitignore client/index.html package.json package-lock.json server/persistence/runtimeDatabase.js server/server.js server/server/server.js scripts/validate.js scripts/maintenance/test-v100.3.56-runtime-database-separation.js scripts/maintenance/certify-v100.3.56-runtime-database-separation.js
git rm --cached --ignore-unmatch -- database/data/blue-current.json database/data/blue-current.json.bak.meta.json

git diff --cached --check
git diff --cached --name-status
git status --short --branch
git commit -m "Separate V100.3.56 runtime data from source"
git pull --rebase origin live-service-timeline
git push origin HEAD:live-service-timeline
git status --short --branch
```

`git rm --cached` removes only Git tracking. It does not delete the repository safety copy, and `.gitignore` prevents future runtime churn.
