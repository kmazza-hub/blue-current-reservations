# Blue Current V100.3.59 — Scheduled Backup and Operator-Visible Health

V100.3.59 adds an optional Windows daily schedule for the verified recovery points introduced in V100.3.58. Scheduling is never installed silently: the operator must run a separate approval script. A scheduled attempt safely skips without changing data when Blue Current is running.

Backup health reports protected, stale, or unprotected status, the latest verified recovery point, age, verified and invalid counts, and whether the runtime is active. It is available from a local read-only command and from the existing authenticated, permission-protected database recovery diagnostic route. Public health reveals no backup details.

No automatic restore exists. No reservation, arrival, seating, floor, service, authentication, integration, permission, or automation-policy behavior changes. Test restaurant data is explicitly fictional.

## Install V100.3.59

Stop the Node server, extract the update, and run:

```powershell
Set-Location "C:\Path\To\BLUE-CURRENT-V100.3.59-UPDATE"
Set-ExecutionPolicy -Scope Process Bypass
.\INSTALL-V100.3.59.ps1
```

## Review backup health

```powershell
Set-Location "C:\Users\kmazz\OneDrive\Desktop\blue-current-reservations"
npm run database:backup-health
```

## Explicitly approve the Windows schedule

This creates a daily 3:00 AM task that starts when next available. It runs only for the current signed-in Windows user and skips safely while the Blue Current Node runtime is active.

```powershell
Set-Location "C:\Users\kmazz\OneDrive\Desktop\blue-current-reservations"
Set-ExecutionPolicy -Scope Process Bypass
.\INSTALL-BACKUP-SCHEDULE-V100.3.59.ps1
Get-ScheduledTask -TaskName "Blue Current Verified Runtime Backup"
```

To remove only this task:

```powershell
.\REMOVE-BACKUP-SCHEDULE-V100.3.59.ps1
```

## Certification

```powershell
Set-Location "C:\Users\kmazz\OneDrive\Desktop\blue-current-reservations"
npm ci
npm run check
node scripts\maintenance\test-v100.3.54-authentication-handshake.js
node scripts\maintenance\test-v100.3.55-first-class-operating-lifecycle.js
node scripts\maintenance\test-v100.3.56-runtime-database-separation.js
node scripts\maintenance\test-v100.3.57-fullscreen-floor-operational-parity.js
node scripts\maintenance\test-v100.3.58-runtime-backup-safe-recovery.js
node scripts\maintenance\test-v100.3.59-scheduled-backup-health.js
npm run certify:pilot
```

## Server restart

```powershell
Set-Location "C:\Users\kmazz\OneDrive\Desktop\blue-current-reservations"
Get-NetTCPConnection -LocalPort 8787 -State Listen -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique |
    ForEach-Object { Stop-Process -Id $_ -Force }
npm start
```

Verify localhost and Cloudflare authentication plus the full hospitality lifecycle before committing.

## Git checkpoint

```powershell
Set-Location "C:\Users\kmazz\OneDrive\Desktop\blue-current-reservations"
git fetch origin
git status --short --branch
git pull --rebase --autostash origin live-service-timeline
git add -- client/index.html package.json package-lock.json server/api/router.js server/persistence/runtimeBackupManager.js server/server.js scripts/runtime-database-backup.js scripts/runtime-database-backup-health.js scripts/windows/scheduled-runtime-backup.ps1 scripts/maintenance/test-v100.3.59-scheduled-backup-health.js scripts/maintenance/certify-v100.3.59-scheduled-backup-health.js INSTALL-V100.3.59.ps1 INSTALL-BACKUP-SCHEDULE-V100.3.59.ps1 REMOVE-BACKUP-SCHEDULE-V100.3.59.ps1 README-V100.3.59.md
git diff --cached --check
git diff --cached --name-status
git commit -m "Add V100.3.59 scheduled backup health"
git pull --rebase origin live-service-timeline
git tag -a "v100.3.59-certified" -m "Blue Current V100.3.59 certified scheduled backup health"
git push origin HEAD:live-service-timeline
git push origin "v100.3.59-certified"
git status --short --branch
```
