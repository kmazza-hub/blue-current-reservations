# Apply V100.3.18

```powershell
cd C:\Users\kmazz\OneDrive\Desktop\blue-current-reservations
taskkill /F /IM node.exe

$upgrade = "$env:USERPROFILE\Downloads\BLUE-CURRENT-V100.3.18.zip"
$stage = Join-Path $env:TEMP "blue-current-v100.3.18"
Remove-Item $stage -Recurse -Force -ErrorAction SilentlyContinue
Expand-Archive -Path $upgrade -DestinationPath $stage -Force
Copy-Item -Path "$stage\*" -Destination . -Recurse -Force

npm install
npm run check
node .\scripts\maintenance\test-v100.3.18-cross-workspace-location-continuity.js
node .\scripts\maintenance\test-v100.3.17-frontline-location-authority.js
node .\scripts\maintenance\test-v100.3.16-live-service-window.js
node .\scripts\maintenance\test-v100.3.15-active-staffing-truth-isolation.js
node .\scripts\maintenance\test-v100.3.14-staff-data-credibility.js
node .\scripts\maintenance\test-v100.3.13-focused-workspace-repeatability.js
node .\scripts\maintenance\test-v100.3.12-host-lifecycle-certification.js
node .\scripts\maintenance\test-v100.3.11-floor-lifecycle-certification.js
node .\scripts\maintenance\test-v100.3.10.3-fullscreen-floor-zone-controls.js
node .\scripts\maintenance\test-v100.2.80-inventory-truth-foundation.js
node .\scripts\maintenance\test-v100.2.79-timeclock-rush-certification.js
node .\scripts\maintenance\test-v100.2.76-timeclock-truth-foundation.js
node .\scripts\maintenance\test-v100.2.73-scheduling-truth-foundation.js
node .\scripts\maintenance\test-v100.2.70-startup-runtime-performance.js
node .\scripts\maintenance\test-v100.2.59-cross-workspace-lifecycle-certification.js

git add .\client\index.html .\client\js\runtime-performance-v100.2.70.js .\client\js\manager-operations-truth-v100.2.68.js .\client\js\manager-action-ownership-v100.2.69.js .\client\js\inventory-truth-v100.2.80.js .\client\js\modules\reservationOperations.js .\client\js\modules\liveFloorOperations.js .\client\js\modules\staffSections.js .\client\js\modules\kitchenCommandCenter.js .\client\js\modules\serviceCoordination.js .\client\js\modules\scheduling.js .\client\js\modules\timeClock.js .\scripts\maintenance\test-v100.3.18-cross-workspace-location-continuity.js .\scripts\maintenance\test-v100.2.80-inventory-truth-foundation.js .\scripts\maintenance\test-v100.2.76-timeclock-truth-foundation.js .\scripts\maintenance\test-v100.2.70-startup-runtime-performance.js .\V100.3.18-RELEASE.md .\README-APPLY-V100.3.18.md
git commit -m "V100.3.18 preserve location across operational workspaces"
git pull --rebase origin live-service-timeline
git push origin live-service-timeline

npm run start
```

Continue development at `http://localhost:8787/`. An authorized pilot location may use `http://localhost:8787/?location=LOCATION_ID`.
