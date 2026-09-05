# Apply V100.3.14

From PowerShell in the repository root:

```powershell
cd C:\Users\kmazz\OneDrive\Desktop\blue-current-reservations
taskkill /F /IM node.exe

$upgrade = "$env:USERPROFILE\Downloads\BLUE-CURRENT-V100.3.14-STAFF-DATA-CREDIBILITY.zip"
$stage = Join-Path $env:TEMP "blue-current-v100.3.14"
Remove-Item $stage -Recurse -Force -ErrorAction SilentlyContinue
Expand-Archive -Path $upgrade -DestinationPath $stage -Force
Copy-Item -Path "$stage\*" -Destination . -Recurse -Force

npm install
npm run check
node .\scripts\maintenance\test-v100.3.14-staff-data-credibility.js
node .\scripts\maintenance\test-v100.3.13-focused-workspace-repeatability.js
node .\scripts\maintenance\test-v100.3.12-host-lifecycle-certification.js
node .\scripts\maintenance\test-v100.3.11-floor-lifecycle-certification.js
node .\scripts\maintenance\test-v100.3.10.3-fullscreen-floor-zone-controls.js
node .\scripts\maintenance\test-v100.3.10.2-seating-floor-render-repair.js
node .\scripts\maintenance\test-v100.3.10.1-guest-freeze-repair.js

git add .\server\services\timeClockService.js .\client\index.html .\client\js\staff-truth-v100.2.64.js .\client\js\runtime-performance-v100.2.70.js .\scripts\maintenance\test-v100.3.14-staff-data-credibility.js .\scripts\maintenance\test-v100.2.76-timeclock-truth-foundation.js .\V100.3.14-RELEASE.md .\README-APPLY-V100.3.14.md
git commit -m "V100.3.14 harden staff data credibility"
git pull --rebase origin live-service-timeline
git push origin live-service-timeline

npm run start
```

Hard-refresh Safari on the physical iPad before acceptance testing.
