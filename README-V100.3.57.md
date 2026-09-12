# Blue Current V100.3.57 — Full-Screen Floor Operational Parity

V100.3.57 makes the full-screen Floor use the same authoritative table controls as the smaller Host Stand floor. It removes the read-only interception that replaced live table actions, keeps lifecycle overlays above the enlarged floor, and keeps full screen open after seating so the operator can continue running the room.

No reservation, service, permission, integration, automation-policy, or runtime-database contract is replaced. Demonstration restaurant records remain fictional. External writes remain manager-approved.

## Installation

Stop the Node server first, extract the update ZIP, and run:

```powershell
Set-Location "C:\Path\To\BLUE-CURRENT-V100.3.57-UPDATE"
Set-ExecutionPolicy -Scope Process Bypass
.\INSTALL-V100.3.57.ps1
```

The installer checks the V100.3.56 external runtime database before changing source, installs only the changed application files, runs validation and certification, and confirms the database hash did not change.

## Certification

```powershell
Set-Location "C:\Users\kmazz\OneDrive\Desktop\blue-current-reservations"
npm ci
npm run check
node scripts\maintenance\test-v100.3.54-authentication-handshake.js
node scripts\maintenance\test-v100.3.55-first-class-operating-lifecycle.js
node scripts\maintenance\test-v100.3.56-runtime-database-separation.js
node scripts\maintenance\test-v100.3.57-fullscreen-floor-operational-parity.js
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

Test `http://localhost:8787` first. Sign in, enter Floor, open full screen, and verify seating, seated-table action, cleaning, reset, reservation tools, room switching, and continued full-screen operation after seating. Then restart the temporary Cloudflare Quick Tunnel and repeat authentication plus the floor checks using its new URL.

## Git checkpoint

Run only after localhost and Cloudflare verification:

```powershell
Set-Location "C:\Users\kmazz\OneDrive\Desktop\blue-current-reservations"
git fetch origin
git status --short --branch
git pull --rebase --autostash origin live-service-timeline

git add -- client/index.html client/styles.css client/js/focused-operator-workspaces-v100.3.9.js client/js/fullscreen-floor-clarity-v100.3.10.js package.json package-lock.json scripts/maintenance/test-v100.3.57-fullscreen-floor-operational-parity.js scripts/maintenance/certify-v100.3.57-fullscreen-floor-operational-parity.js INSTALL-V100.3.57.ps1 README-V100.3.57.md

git diff --cached --check
git diff --cached --name-status
git status --short --branch
git commit -m "Complete V100.3.57 full-screen floor parity"
git pull --rebase origin live-service-timeline
git tag -a "v100.3.57-certified" -m "Blue Current V100.3.57 certified full-screen floor parity"
git push origin HEAD:live-service-timeline
git push origin "v100.3.57-certified"
git status --short --branch
```
