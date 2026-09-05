# Apply V100.3.12

From PowerShell in the repository root:

```powershell
cd C:\Users\kmazz\OneDrive\Desktop\blue-current-reservations
taskkill /F /IM node.exe

$upgrade = "$env:USERPROFILE\Downloads\BLUE-CURRENT-V100.3.12-HOST-LIFECYCLE-CERTIFICATION.zip"
$stage = Join-Path $env:TEMP "blue-current-v100.3.12"
Remove-Item $stage -Recurse -Force -ErrorAction SilentlyContinue
Expand-Archive -Path $upgrade -DestinationPath $stage -Force
Copy-Item -Path "$stage\*" -Destination . -Recurse -Force

npm install
npm run check
node .\scripts\maintenance\test-v100.3.12-host-lifecycle-certification.js
node .\scripts\maintenance\test-v100.3.11-floor-lifecycle-certification.js
node .\scripts\maintenance\test-v100.3.10.3-fullscreen-floor-zone-controls.js
node .\scripts\maintenance\test-v100.3.10.2-seating-floor-render-repair.js
node .\scripts\maintenance\test-v100.3.10.1-guest-freeze-repair.js
node .\scripts\maintenance\test-v100.2.59-cross-workspace-lifecycle-certification.js
node .\scripts\maintenance\test-v100.2.41-host-focus-simplification.js
node .\scripts\maintenance\test-v100.2.32-arrival-queue-handoff.js

git add .\client\index.html .\client\js\app-v15.1.3.js .\client\js\host-lifecycle-certification-v100.3.12.js .\scripts\maintenance\test-v100.3.12-host-lifecycle-certification.js .\V100.3.12-RELEASE.md .\README-APPLY-V100.3.12.md
git commit -m "V100.3.12 certify host lifecycle"
git pull --rebase origin live-service-timeline
git push origin live-service-timeline

npm run start
```

Hard-refresh Safari on the physical iPad before acceptance testing.
