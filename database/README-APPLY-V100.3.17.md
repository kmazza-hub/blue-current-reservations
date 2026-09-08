# Apply V100.3.17

```powershell
cd C:\Users\kmazz\OneDrive\Desktop\blue-current-reservations
taskkill /F /IM node.exe

$upgrade = "$env:USERPROFILE\Downloads\BLUE-CURRENT-V100.3.17-FRONTLINE-LOCATION-AUTHORITY.zip"
$stage = Join-Path $env:TEMP "blue-current-v100.3.17"
Remove-Item $stage -Recurse -Force -ErrorAction SilentlyContinue
Expand-Archive -Path $upgrade -DestinationPath $stage -Force
Copy-Item -Path "$stage\*" -Destination . -Recurse -Force

npm install
npm run check
node .\scripts\maintenance\test-v100.3.17-frontline-location-authority.js
node .\scripts\maintenance\test-v100.3.16-live-service-window.js
node .\scripts\maintenance\test-v100.3.15-active-staffing-truth-isolation.js
node .\scripts\maintenance\test-v100.3.14-staff-data-credibility.js
node .\scripts\maintenance\test-v100.3.13-focused-workspace-repeatability.js
node .\scripts\maintenance\test-v100.3.12-host-lifecycle-certification.js
node .\scripts\maintenance\test-v100.3.11-floor-lifecycle-certification.js
node .\scripts\maintenance\test-v100.3.10.3-fullscreen-floor-zone-controls.js
node .\scripts\maintenance\test-v100.3.10.2-seating-floor-render-repair.js
node .\scripts\maintenance\test-v100.3.10.1-guest-freeze-repair.js
node .\scripts\maintenance\test-v100.2.76-timeclock-truth-foundation.js
node .\scripts\maintenance\test-v100.2.73-scheduling-truth-foundation.js
node .\scripts\maintenance\test-v100.2.70-startup-runtime-performance.js
node .\scripts\maintenance\test-v100.2.59-cross-workspace-lifecycle-certification.js
node .\scripts\maintenance\test-v100.2.79-timeclock-rush-certification.js

git add .\client\index.html .\client\js\frontline-location-authority-v100.3.17.js .\client\js\floor-reservations-v62.0.js .\client\js\staff-truth-v100.2.64.js .\client\js\staff-role-coverage-v100.2.65.js .\client\js\staff-attendance-v100.2.66.js .\client\js\scheduling-truth-v100.2.73.js .\client\js\timeclock-truth-v100.2.76.js .\client\js\runtime-performance-v100.2.70.js .\scripts\maintenance\test-v100.3.17-frontline-location-authority.js .\scripts\maintenance\test-v100.3.16-live-service-window.js .\scripts\maintenance\test-v100.3.15-active-staffing-truth-isolation.js .\scripts\maintenance\test-v100.3.14-staff-data-credibility.js .\scripts\maintenance\test-v100.2.76-timeclock-truth-foundation.js .\scripts\maintenance\test-v100.2.73-scheduling-truth-foundation.js .\scripts\maintenance\test-v100.2.70-startup-runtime-performance.js .\V100.3.17-RELEASE.md .\README-APPLY-V100.3.17.md
git commit -m "V100.3.17 add frontline location authority"
git pull --rebase origin live-service-timeline
git push origin live-service-timeline

npm run start
```

For development, continue opening `http://localhost:8787/`. A specific authorized pilot location can later use `http://localhost:8787/?location=LOCATION_ID`.
