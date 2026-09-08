# Apply V100.3.31

```powershell
cd C:\Users\kmazz\OneDrive\Desktop\blue-current-reservations
taskkill /F /IM node.exe

$upgrade = "$env:USERPROFILE\Downloads\BLUE-CURRENT-V100.3.31.zip"
$stage = Join-Path $env:TEMP "blue-current-v100.3.31"
Remove-Item $stage -Recurse -Force -ErrorAction SilentlyContinue
Expand-Archive -Path $upgrade -DestinationPath $stage -Force
Copy-Item -Path "$stage\*" -Destination . -Recurse -Force

npm install
npm run check
node .\scripts\maintenance\test-v100.3.31-frontline-seating-location-integrity.js
node .\scripts\maintenance\test-v100.3.30-frontline-labor-record-authorization.js
node .\scripts\maintenance\test-v100.3.29-labor-inventory-api-location-safety.js
node .\scripts\maintenance\test-v100.3.28-core-operations-api-location-safety.js
node .\scripts\maintenance\test-v100.3.27-development-data-location-safety.js
node .\scripts\maintenance\test-v100.3.26-authorized-district-truth.js
node .\scripts\maintenance\test-v100.3.25-executive-navigation-location-integrity.js
node .\scripts\maintenance\test-v100.3.24-executive-action-location-integrity.js
node .\scripts\maintenance\test-v100.3.23-decision-intelligence-location-continuity.js
node .\scripts\maintenance\test-v100.3.22-workforce-public-pilot-continuity.js
node .\scripts\maintenance\test-v100.3.21-management-location-continuity.js
node .\scripts\maintenance\test-v100.3.20-command-location-continuity.js

git add .\server\api\router.js .\scripts\maintenance\test-v100.3.31-frontline-seating-location-integrity.js .\V100.3.31-RELEASE.md .\README-APPLY-V100.3.31.md
git commit -m "V100.3.31 enforce frontline seating location integrity"
git pull --rebase origin live-service-timeline
git push origin live-service-timeline

npm run start
```

Continue at `http://localhost:8787/`.
