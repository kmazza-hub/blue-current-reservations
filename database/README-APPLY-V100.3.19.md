# Apply V100.3.19

```powershell
cd C:\Users\kmazz\OneDrive\Desktop\blue-current-reservations
taskkill /F /IM node.exe

$upgrade = "$env:USERPROFILE\Downloads\BLUE-CURRENT-V100.3.19.zip"
$stage = Join-Path $env:TEMP "blue-current-v100.3.19"
Remove-Item $stage -Recurse -Force -ErrorAction SilentlyContinue
Expand-Archive -Path $upgrade -DestinationPath $stage -Force
Copy-Item -Path "$stage\*" -Destination . -Recurse -Force

npm install
npm run check
node .\scripts\maintenance\test-v100.3.19-location-scoped-live-state.js
node .\scripts\maintenance\test-v100.3.18-cross-workspace-location-continuity.js
node .\scripts\maintenance\test-v100.3.17-frontline-location-authority.js
node .\scripts\maintenance\test-v100.3.16-live-service-window.js
node .\scripts\maintenance\test-v100.3.15-active-staffing-truth-isolation.js
node .\scripts\maintenance\test-v100.3.14-staff-data-credibility.js
node .\scripts\maintenance\test-v100.3.13-focused-workspace-repeatability.js
node .\scripts\maintenance\test-v100.3.12-host-lifecycle-certification.js
node .\scripts\maintenance\test-v100.3.11-floor-lifecycle-certification.js
node .\scripts\maintenance\test-v100.3.10.3-fullscreen-floor-zone-controls.js
node .\scripts\maintenance\test-v100.2.79-timeclock-rush-certification.js
node .\scripts\maintenance\test-v100.2.70-startup-runtime-performance.js
node .\scripts\maintenance\test-v100.2.59-cross-workspace-lifecycle-certification.js

git add .\client\index.html .\client\js\floor-reservations-v62.0.js .\client\js\kitchen-truth-v100.2.60.js .\client\js\runtime-performance-v100.2.70.js .\scripts\maintenance\test-v100.3.19-location-scoped-live-state.js .\scripts\maintenance\test-v100.3.16-live-service-window.js .\scripts\maintenance\test-v100.2.70-startup-runtime-performance.js .\V100.3.19-RELEASE.md .\README-APPLY-V100.3.19.md
git commit -m "V100.3.19 isolate live service state by location"
git pull --rebase origin live-service-timeline
git push origin live-service-timeline

npm run start
```

Continue at `http://localhost:8787/`.
