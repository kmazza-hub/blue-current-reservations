$ErrorActionPreference = "Stop"
$Repository = "C:\Users\kmazz\OneDrive\Desktop\blue-current-reservations"
$PackageRoot = $PSScriptRoot
$CurrentVersion = (Get-Content -LiteralPath (Join-Path $Repository "package.json") -Raw | ConvertFrom-Json).version
if ($CurrentVersion -ne "100.3.83") { throw "Expected certified V100.3.83; found V$CurrentVersion." }
$RuntimeConfiguration = Join-Path $Repository "config\runtime-database.local.json"
if (-not (Test-Path -LiteralPath $RuntimeConfiguration -PathType Leaf)) { throw "Runtime database configuration is missing." }
$RuntimePath = (Get-Content -LiteralPath $RuntimeConfiguration -Raw | ConvertFrom-Json).databasePath
if (-not $RuntimePath -or -not (Test-Path -LiteralPath $RuntimePath -PathType Leaf)) { throw "Configured runtime database is unavailable." }
$null = Get-Content -LiteralPath $RuntimePath -Raw | ConvertFrom-Json
$RuntimeHashBefore = (Get-FileHash -LiteralPath $RuntimePath -Algorithm SHA256).Hash
$Files = @(
  "client\index.html",
  "package.json",
  "package-lock.json",
  "scripts\maintenance\test-v100.3.84-direct-call-cta.js",
  "scripts\maintenance\certify-v100.3.84-direct-call-cta.js",
  "INSTALL-V100.3.84.ps1",
  "README-V100.3.84.md"
)
foreach ($RelativePath in $Files) {
  $Source = Join-Path $PackageRoot $RelativePath
  $Destination = Join-Path $Repository $RelativePath
  if (-not (Test-Path -LiteralPath $Source -PathType Leaf)) { throw "Package file is missing: $RelativePath" }
  $Directory = Split-Path -Parent $Destination
  if (-not (Test-Path -LiteralPath $Directory)) { New-Item -ItemType Directory -Path $Directory | Out-Null }
  Copy-Item -LiteralPath $Source -Destination $Destination -Force
}
Set-Location $Repository
npm ci
npm run check
if ($LASTEXITCODE -ne 0) { throw "V100.3.84 validation failed." }
npm run certify:pilot
if ($LASTEXITCODE -ne 0) { throw "V100.3.84 certification failed." }
$RuntimeHashAfter = (Get-FileHash -LiteralPath $RuntimePath -Algorithm SHA256).Hash
if ($RuntimeHashBefore -ne $RuntimeHashAfter) { throw "Runtime database changed during installation." }
Write-Host ""
Write-Host "V100.3.84 installed and certified." -ForegroundColor Green
Write-Host "Runtime database preserved: $RuntimePath"
Write-Host "Commit and push the certified source, then manually deploy the latest commit on Render."
