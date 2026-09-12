# Blue Current V100.3.58 — Runtime Backup and Safe Recovery

V100.3.58 adds deliberate, verified recovery points for the external runtime database introduced in V100.3.56. Backups are timestamped, checksum-verified, stored under the runtime data directory, and limited to 14 managed files by default. Retention only touches files owned by this backup system.

Recovery is intentionally offline and operator-approved. It requires the server to be stopped, an exact managed backup name, and the exact confirmation phrase. Before restoring, Blue Current creates a verified safety backup and retains the displaced primary database. Nothing restores automatically through the UI or an API.

No reservation, arrival, seating, floor, service, authentication, permission, integration, or automation-policy behavior is changed. Certification fixtures use only fictional restaurant data.

## Installation

Stop the server, extract the update, and run:

```powershell
Set-Location "C:\Path\To\BLUE-CURRENT-V100.3.58-UPDATE"
Set-ExecutionPolicy -Scope Process Bypass
.\INSTALL-V100.3.58.ps1
```

## Create and verify a recovery point

Keep the Node server stopped while running the backup command:

```powershell
Set-Location "C:\Users\kmazz\OneDrive\Desktop\blue-current-reservations"
npm run database:backup
npm run database:restore
```

The second command is read-only when no backup name is supplied; it lists verified candidates. Backups are stored at `C:\Users\kmazz\AppData\Local\BlueCurrent\data\backups` when the standard V100.3.56 runtime location is active.

## Restore only when recovery is actually required

Stop the server. First list candidates with `npm run database:restore`. Then replace the example name below with one exact VERIFIED filename:

```powershell
$BackupName = "blue-current-runtime-YYYYMMDDTHHMMSSZ.json"
npm run database:restore -- "--name=$BackupName" "--confirm=RESTORE $BackupName"
```

Restart the server and test localhost authentication and the complete hospitality lifecycle before restarting Cloudflare.

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

## Git checkpoint

Run after localhost and Cloudflare authentication plus lifecycle verification:

```powershell
Set-Location "C:\Users\kmazz\OneDrive\Desktop\blue-current-reservations"
git fetch origin
git status --short --branch
git pull --rebase --autostash origin live-service-timeline

git add -- client/index.html package.json package-lock.json server/persistence/runtimeBackupManager.js scripts/runtime-database-backup.js scripts/runtime-database-restore.js scripts/maintenance/test-v100.3.58-runtime-backup-safe-recovery.js scripts/maintenance/certify-v100.3.58-runtime-backup-safe-recovery.js INSTALL-V100.3.58.ps1 README-V100.3.58.md
git diff --cached --check
git diff --cached --name-status
git status --short --branch
git commit -m "Add V100.3.58 verified runtime recovery points"
git pull --rebase origin live-service-timeline
git tag -a "v100.3.58-certified" -m "Blue Current V100.3.58 certified runtime backup and safe recovery"
git push origin HEAD:live-service-timeline
git push origin "v100.3.58-certified"
git status --short --branch
```
