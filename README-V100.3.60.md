# Blue Current V100.3.60 — Server-Coordinated Online Backup

V100.3.60 closes the observed V100.3.59 gap where a healthy scheduled task safely skipped whenever Blue Current was running. The scheduled runner still creates offline backups when the server is stopped. When Node is active, it now requests a consistent snapshot from inside the serialized persistence queue.

Online backup authority is restricted to an exact localhost request with a machine-local 256-bit token. Requests forwarded by Cloudflare are rejected, invalid tokens receive a generic not-found response, and the secret is excluded from Git. The token and Windows task are created only by a separate operator-approved installer.

No automatic restoration exists. No reservation, arrival, seating, floor, service, authentication, integration, role, or automation-policy behavior changes. Certification uses fictional restaurant data only.

## Installation

Stop Node, extract the update, and run:

```powershell
Set-Location "C:\Path\To\BLUE-CURRENT-V100.3.60-UPDATE"
Set-ExecutionPolicy -Scope Process Bypass
.\INSTALL-V100.3.60.ps1
```

Approve the upgraded backup authority while Node remains stopped:

```powershell
Set-Location "C:\Users\kmazz\OneDrive\Desktop\blue-current-reservations"
.\INSTALL-BACKUP-SCHEDULE-V100.3.60.ps1
```

Restart Blue Current so it loads the newly generated local token. Then manually start the scheduled task while the server is running and inspect the log:

```powershell
Start-ScheduledTask -TaskName "Blue Current Verified Runtime Backup"
Start-Sleep -Seconds 5
Get-ScheduledTaskInfo -TaskName "Blue Current Verified Runtime Backup"
Get-Content "$env:LOCALAPPDATA\BlueCurrent\logs\scheduled-backup.log" -Tail 30
npm run database:backup-health
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
node scripts\maintenance\test-v100.3.60-server-coordinated-backup.js
npm run certify:pilot
```

## Restart

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
git add -- .gitignore client/index.html package.json package-lock.json server/services/databaseService.js server/persistence/jsonPersistenceAdapter.js server/persistence/persistenceGateway.js server/persistence/runtimeBackupManager.js server/persistence/runtimeBackupCoordinator.js server/server.js scripts/runtime-database-backup.js scripts/windows/scheduled-runtime-backup.ps1 scripts/maintenance/test-v100.3.60-server-coordinated-backup.js scripts/maintenance/certify-v100.3.60-server-coordinated-backup.js INSTALL-V100.3.60.ps1 INSTALL-BACKUP-SCHEDULE-V100.3.60.ps1 README-V100.3.60.md
git diff --cached --check
git diff --cached --name-status
git commit -m "Add V100.3.60 server-coordinated online backup"
git pull --rebase origin live-service-timeline
git tag -a "v100.3.60-certified" -m "Blue Current V100.3.60 certified server-coordinated online backup"
git push origin HEAD:live-service-timeline
git push origin "v100.3.60-certified"
git status --short --branch
```
