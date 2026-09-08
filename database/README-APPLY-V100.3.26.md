# Apply V100.3.26

```powershell
cd C:\Users\kmazz\OneDrive\Desktop\blue-current-reservations
taskkill /F /IM node.exe

$upgrade = "$env:USERPROFILE\Downloads\BLUE-CURRENT-V100.3.26.zip"
$stage = Join-Path $env:TEMP "blue-current-v100.3.26"
Remove-Item $stage -Recurse -Force -ErrorAction SilentlyContinue
Expand-Archive -Path $upgrade -DestinationPath $stage -Force
Copy-Item -Path "$stage\*" -Destination . -Recurse -Force

npm install
npm run check
node .\scripts\maintenance\test-v100.3.26-authorized-district-truth.js
node .\scripts\maintenance\test-v100.3.25-executive-navigation-location-integrity.js
node .\scripts\maintenance\test-v100.3.24-executive-action-location-integrity.js
node .\scripts\maintenance\test-v100.3.23-decision-intelligence-location-continuity.js
node .\scripts\maintenance\test-v100.3.22-workforce-public-pilot-continuity.js
node .\scripts\maintenance\test-v100.3.21-management-location-continuity.js
node .\scripts\maintenance\test-v100.3.20-command-location-continuity.js
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

git add .\client\index.html .\client\js\modules\districtCommandCenter.js .\client\js\modules\executiveMorningBrief.js .\scripts\maintenance\test-v100.3.26-authorized-district-truth.js .\V100.3.26-RELEASE.md .\README-APPLY-V100.3.26.md
git commit -m "V100.3.26 enforce authorized district truth"
git pull --rebase origin live-service-timeline
git push origin live-service-timeline

npm run start
```

Continue at `http://localhost:8787/`.
