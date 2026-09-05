# Apply V100.3.15

From PowerShell in the repository root:

```powershell
cd C:\Users\kmazz\OneDrive\Desktop\blue-current-reservations
taskkill /F /IM node.exe

$upgrade = "$env:USERPROFILE\Downloads\BLUE-CURRENT-V100.3.15-ACTIVE-STAFFING-TRUTH-ISOLATION.zip"
$stage = Join-Path $env:TEMP "blue-current-v100.3.15"
Remove-Item $stage -Recurse -Force -ErrorAction SilentlyContinue
Expand-Archive -Path $upgrade -DestinationPath $stage -Force
Copy-Item -Path "$stage\*" -Destination . -Recurse -Force

npm install
npm run check
node .\scripts\maintenance\test-v100.3.15-active-staffing-truth-isolation.js
node .\scripts\maintenance\test-v100.3.14-staff-data-credibility.js
node .\scripts\maintenance\test-v100.2.79-timeclock-rush-certification.js
node .\scripts\maintenance\test-v100.2.77-timeclock-record-integrity.js
node .\scripts\maintenance\test-v100.2.76-timeclock-truth-foundation.js
node .\scripts\maintenance\test-v100.2.70-startup-runtime-performance.js
node .\scripts\maintenance\test-v100.3.13-focused-workspace-repeatability.js
node .\scripts\maintenance\test-v100.3.12-host-lifecycle-certification.js
node .\scripts\maintenance\test-v100.3.11-floor-lifecycle-certification.js
node .\scripts\maintenance\test-v100.3.10.3-fullscreen-floor-zone-controls.js
node .\scripts\maintenance\test-v100.3.10.2-seating-floor-render-repair.js
node .\scripts\maintenance\test-v100.3.10.1-guest-freeze-repair.js

git add .\server\services\timeClockService.js .\client\index.html .\client\js\timeclock-truth-v100.2.76.js .\client\js\runtime-performance-v100.2.70.js .\scripts\maintenance\test-v100.3.15-active-staffing-truth-isolation.js .\scripts\maintenance\test-v100.3.14-staff-data-credibility.js .\scripts\maintenance\test-v100.2.76-timeclock-truth-foundation.js .\scripts\maintenance\test-v100.2.70-startup-runtime-performance.js .\V100.3.15-RELEASE.md .\README-APPLY-V100.3.15.md
git commit -m "V100.3.15 isolate active staffing truth"
git pull --rebase origin live-service-timeline
git push origin live-service-timeline

npm run start
```

Hard-refresh Safari on the physical iPad before acceptance testing.
