$ErrorActionPreference = "Stop"

$Repository = "C:\Users\kmazz\OneDrive\Desktop\blue-current-reservations"
$PackageRoot = $PSScriptRoot
$CurrentVersion = (Get-Content -LiteralPath (Join-Path $Repository "package.json") -Raw | ConvertFrom-Json).version
if ($CurrentVersion -notin @("100.3.58", "100.3.59")) {
    throw "Expected V100.3.58 or V100.3.59, found V$CurrentVersion."
}

$RuntimeConfiguration = Join-Path $Repository "config\runtime-database.local.json"
if (-not (Test-Path -LiteralPath $RuntimeConfiguration -PathType Leaf)) { throw "Runtime database configuration is missing." }
$RuntimePath = (Get-Content -LiteralPath $RuntimeConfiguration -Raw | ConvertFrom-Json).databasePath
if (-not $RuntimePath -or -not (Test-Path -LiteralPath $RuntimePath -PathType Leaf)) { throw "Configured runtime database is unavailable." }
$null = Get-Content -LiteralPath $RuntimePath -Raw | ConvertFrom-Json
$RuntimeHashBefore = (Get-FileHash -LiteralPath $RuntimePath -Algorithm SHA256).Hash

$ApplicationFiles = @(
    "client\index.html",
    "package-lock.json",
    "package.json",
    "server\api\router.js",
    "server\persistence\runtimeBackupManager.js",
    "server\server.js",
    "scripts\runtime-database-backup.js",
    "scripts\runtime-database-backup-health.js",
    "scripts\windows\scheduled-runtime-backup.ps1",
    "scripts\maintenance\certify-v100.3.59-scheduled-backup-health.js",
    "scripts\maintenance\test-v100.3.59-scheduled-backup-health.js",
    "INSTALL-V100.3.59.ps1",
    "INSTALL-BACKUP-SCHEDULE-V100.3.59.ps1",
    "REMOVE-BACKUP-SCHEDULE-V100.3.59.ps1",
    "README-V100.3.59.md"
)

foreach ($RelativePath in $ApplicationFiles) {
    $Source = Join-Path $PackageRoot $RelativePath
    $Destination = Join-Path $Repository $RelativePath
    if (-not (Test-Path -LiteralPath $Source -PathType Leaf)) { throw "Package file is missing: $RelativePath" }
    $DestinationDirectory = Split-Path -Parent $Destination
    if (-not (Test-Path -LiteralPath $DestinationDirectory)) { New-Item -ItemType Directory -Path $DestinationDirectory | Out-Null }
    Copy-Item -LiteralPath $Source -Destination $Destination -Force
}

Set-Location $Repository
npm ci
npm run check
if ($LASTEXITCODE -ne 0) { throw "V100.3.59 validation failed." }
npm run certify:pilot
if ($LASTEXITCODE -ne 0) { throw "V100.3.59 certification failed." }

$RuntimeHashAfter = (Get-FileHash -LiteralPath $RuntimePath -Algorithm SHA256).Hash
if ($RuntimeHashBefore -ne $RuntimeHashAfter) { throw "Runtime database changed during installation." }

Write-Host ""
Write-Host "V100.3.59 installed and certified." -ForegroundColor Green
Write-Host "Runtime database preserved: $RuntimePath"
Write-Host "No Windows scheduled task was created. Run INSTALL-BACKUP-SCHEDULE-V100.3.59.ps1 separately to approve scheduling."
