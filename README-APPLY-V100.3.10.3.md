# Apply V100.3.10.3

From PowerShell in the repository root:

```powershell
cd C:\Users\kmazz\OneDrive\Desktop\blue-current-reservations
taskkill /F /IM node.exe

$upgrade = "$env:USERPROFILE\Downloads\BLUE-CURRENT-V100.3.10.3-FULLSCREEN-FLOOR-ZONE-CONTROLS.zip"
$stage = Join-Path $env:TEMP "blue-current-v100.3.10.3"
Remove-Item $stage -Recurse -Force -ErrorAction SilentlyContinue
Expand-Archive -Path $upgrade -DestinationPath $stage -Force
Copy-Item -Path "$stage\*" -Destination . -Recurse -Force

npm install
npm run check
node .\scripts\maintenance\test-v100.3.10.3-fullscreen-floor-zone-controls.js
node .\scripts\maintenance\test-v100.3.10.2-seating-floor-render-repair.js
node .\scripts\maintenance\test-v100.3.10.1-guest-freeze-repair.js

git add .\client\index.html .\client\styles.css .\client\js\fullscreen-floor-zone-controls-v100.3.10.3.js .\scripts\maintenance\test-v100.3.10.3-fullscreen-floor-zone-controls.js .\V100.3.10.3-RELEASE.md .\README-APPLY-V100.3.10.3.md
git commit -m "V100.3.10.3 repair full-screen floor zone controls"
git pull --rebase origin live-service-timeline
git push origin live-service-timeline

npm run start
```

Then hard-refresh Safari on the iPad and test Main Floor → Waterfront → Private Dining → Main Floor twice, first in ordinary full-screen Floor and again after tapping Seat for a guest.
