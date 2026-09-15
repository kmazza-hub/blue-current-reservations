$ErrorActionPreference = "Stop"
$Repository = "C:\Users\kmazz\OneDrive\Desktop\blue-current-reservations"
$PackageRoot = $PSScriptRoot
$CurrentVersion = (Get-Content -LiteralPath (Join-Path $Repository "package.json") -Raw | ConvertFrom-Json).version
if ($CurrentVersion -notin @("100.3.67", "100.3.68")) { throw "Expected V100.3.67 or a resumable V100.3.68 installation; found V$CurrentVersion." }
$RuntimeConfiguration = Join-Path $Repository "config\runtime-database.local.json"
if (-not (Test-Path -LiteralPath $RuntimeConfiguration -PathType Leaf)) { throw "Runtime database configuration is missing." }
$RuntimePath = (Get-Content -LiteralPath $RuntimeConfiguration -Raw | ConvertFrom-Json).databasePath
if (-not $RuntimePath -or -not (Test-Path -LiteralPath $RuntimePath -PathType Leaf)) { throw "Configured runtime database is unavailable." }
$null = Get-Content -LiteralPath $RuntimePath -Raw | ConvertFrom-Json
$RuntimeHashBefore = (Get-FileHash -LiteralPath $RuntimePath -Algorithm SHA256).Hash
$ApplicationFiles = @(
  "client\index.html", "client\js\runtime-performance-v100.2.70.js",
  "client\js\live-defect-closure-v100.3.68.js", "package-lock.json", "package.json",
  "scripts\maintenance\test-v100.3.62-focused-staff-action-runtime.js",
  "scripts\maintenance\test-v100.3.63-staff-record-management.js",
  "scripts\maintenance\test-v100.3.64-team-scheduling-usability.js",
  "scripts\maintenance\test-v100.3.65-staff-observer-stability.js",
  "scripts\maintenance\test-v100.3.66-staff-reliability.js",
  "scripts\maintenance\test-v100.3.67-workspace-reliability.js",
  "scripts\maintenance\test-v100.3.68-live-defect-closure.js",
  "scripts\maintenance\certify-v100.3.68-workspace-reliability.js",
  "INSTALL-V100.3.68.ps1", "README-V100.3.68.md"
)
foreach ($RelativePath in $ApplicationFiles) {
  $Source = Join-Path $PackageRoot $RelativePath; $Destination = Join-Path $Repository $RelativePath
  if (-not (Test-Path -LiteralPath $Source -PathType Leaf)) { throw "Package file is missing: $RelativePath" }
  $DestinationDirectory = Split-Path -Parent $Destination
  if (-not (Test-Path -LiteralPath $DestinationDirectory)) { New-Item -ItemType Directory -Path $DestinationDirectory | Out-Null }
  Copy-Item -LiteralPath $Source -Destination $Destination -Force
}
Set-Location $Repository
npm ci
npm run check
if ($LASTEXITCODE -ne 0) { throw "V100.3.68 validation failed." }
npm run certify:pilot
if ($LASTEXITCODE -ne 0) { throw "V100.3.68 certification failed." }
$RuntimeHashAfter = (Get-FileHash -LiteralPath $RuntimePath -Algorithm SHA256).Hash
if ($RuntimeHashBefore -ne $RuntimeHashAfter) { throw "Runtime database changed during installation." }
Write-Host ""; Write-Host "V100.3.68 installed and certified." -ForegroundColor Green
Write-Host "Runtime database preserved: $RuntimePath"
Write-Host "Restart Blue Current and hard-refresh app.bluecurrentco.com."
