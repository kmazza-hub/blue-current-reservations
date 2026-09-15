$ErrorActionPreference = "Stop"
$Repository = "C:\Users\kmazz\OneDrive\Desktop\blue-current-reservations"
$PackageRoot = $PSScriptRoot
$CurrentVersion = (Get-Content -LiteralPath (Join-Path $Repository "package.json") -Raw | ConvertFrom-Json).version
if ($CurrentVersion -ne "100.3.70") { throw "Expected certified V100.3.70; found V$CurrentVersion." }
$RuntimeConfiguration = Join-Path $Repository "config\runtime-database.local.json"
if (-not (Test-Path -LiteralPath $RuntimeConfiguration -PathType Leaf)) { throw "Runtime database configuration is missing." }
$RuntimePath = (Get-Content -LiteralPath $RuntimeConfiguration -Raw | ConvertFrom-Json).databasePath
if (-not $RuntimePath -or -not (Test-Path -LiteralPath $RuntimePath -PathType Leaf)) { throw "Configured runtime database is unavailable." }
$null = Get-Content -LiteralPath $RuntimePath -Raw | ConvertFrom-Json
$RuntimeHashBefore = (Get-FileHash -LiteralPath $RuntimePath -Algorithm SHA256).Hash
$Files = @(
  "client\index.html", "client\js\runtime-performance-v100.2.70.js",
  "deploy\hosted-pilot\Dockerfile", "render.yaml", "scripts\hosted-start.js",
  "package.json", "package-lock.json", "RENDER-PILOT-DEPLOYMENT-V100.3.71.md",
  "scripts\maintenance\test-v100.3.62-focused-staff-action-runtime.js",
  "scripts\maintenance\test-v100.3.63-staff-record-management.js",
  "scripts\maintenance\test-v100.3.64-team-scheduling-usability.js",
  "scripts\maintenance\test-v100.3.65-staff-observer-stability.js",
  "scripts\maintenance\test-v100.3.66-staff-reliability.js",
  "scripts\maintenance\test-v100.3.67-workspace-reliability.js",
  "scripts\maintenance\test-v100.3.68-live-defect-closure.js",
  "scripts\maintenance\test-v100.3.69-smart-fill-single-action.js",
  "scripts\maintenance\test-v100.3.70-post-login-connectivity.js",
  "scripts\maintenance\test-v100.3.71-render-provisioning-gate.js",
  "scripts\maintenance\certify-v100.3.71-render-provisioning-gate.js",
  "INSTALL-V100.3.71.ps1", "README-V100.3.71.md"
)
foreach ($RelativePath in $Files) {$Source=Join-Path $PackageRoot $RelativePath;$Destination=Join-Path $Repository $RelativePath;if(-not(Test-Path -LiteralPath $Source -PathType Leaf)){throw "Package file is missing: $RelativePath"};$Directory=Split-Path -Parent $Destination;if(-not(Test-Path -LiteralPath $Directory)){New-Item -ItemType Directory -Path $Directory|Out-Null};Copy-Item -LiteralPath $Source -Destination $Destination -Force}
Set-Location $Repository
npm ci
npm run check
if ($LASTEXITCODE -ne 0) { throw "V100.3.71 validation failed." }
npm run certify:pilot
if ($LASTEXITCODE -ne 0) { throw "V100.3.71 certification failed." }
$RuntimeHashAfter = (Get-FileHash -LiteralPath $RuntimePath -Algorithm SHA256).Hash
if ($RuntimeHashBefore -ne $RuntimeHashAfter) { throw "Runtime database changed during installation." }
Write-Host "";Write-Host "V100.3.71 installed and certified." -ForegroundColor Green
Write-Host "Runtime database preserved: $RuntimePath"
Write-Host "Repository prepared for controlled Render pilot provisioning. No external deployment or DNS change was performed."
