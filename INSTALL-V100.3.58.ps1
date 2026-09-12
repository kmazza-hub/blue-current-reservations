$ErrorActionPreference = "Stop"

$Repository = "C:\Users\kmazz\OneDrive\Desktop\blue-current-reservations"
$PackageRoot = $PSScriptRoot
$CurrentPackage = Get-Content -LiteralPath (Join-Path $Repository "package.json") -Raw | ConvertFrom-Json

if ($CurrentPackage.version -notin @("100.3.57", "100.3.58")) {
    throw "Expected V100.3.57 or V100.3.58, found V$($CurrentPackage.version)."
}

$RuntimeConfiguration = Join-Path $Repository "config\runtime-database.local.json"
if (-not (Test-Path -LiteralPath $RuntimeConfiguration -PathType Leaf)) {
    throw "Runtime database configuration is missing. Installation stopped."
}
$RuntimePath = (Get-Content -LiteralPath $RuntimeConfiguration -Raw | ConvertFrom-Json).databasePath
if (-not $RuntimePath -or -not (Test-Path -LiteralPath $RuntimePath -PathType Leaf)) {
    throw "The configured runtime database is unavailable. Installation stopped without changing source files."
}
$null = Get-Content -LiteralPath $RuntimePath -Raw | ConvertFrom-Json
$RuntimeHashBefore = (Get-FileHash -LiteralPath $RuntimePath -Algorithm SHA256).Hash

$ApplicationFiles = @(
    "client\index.html",
    "package-lock.json",
    "package.json",
    "scripts\runtime-database-backup.js",
    "scripts\runtime-database-restore.js",
    "scripts\maintenance\certify-v100.3.58-runtime-backup-safe-recovery.js",
    "scripts\maintenance\test-v100.3.58-runtime-backup-safe-recovery.js",
    "server\persistence\runtimeBackupManager.js"
)

foreach ($RelativePath in $ApplicationFiles) {
    $Source = Join-Path $PackageRoot $RelativePath
    $Destination = Join-Path $Repository $RelativePath
    if (-not (Test-Path -LiteralPath $Source -PathType Leaf)) { throw "Package file is missing: $RelativePath" }
    $DestinationDirectory = Split-Path -Parent $Destination
    if (-not (Test-Path -LiteralPath $DestinationDirectory)) {
        New-Item -ItemType Directory -Path $DestinationDirectory | Out-Null
    }
    Copy-Item -LiteralPath $Source -Destination $Destination -Force
}

Set-Location $Repository
npm ci
npm run check
if ($LASTEXITCODE -ne 0) { throw "V100.3.58 validation failed." }
npm run certify:pilot
if ($LASTEXITCODE -ne 0) { throw "V100.3.58 certification failed." }

$RuntimeHashAfter = (Get-FileHash -LiteralPath $RuntimePath -Algorithm SHA256).Hash
if ($RuntimeHashBefore -ne $RuntimeHashAfter) {
    throw "The runtime database changed during installation. Stop and preserve both hashes."
}

Write-Host ""
Write-Host "V100.3.58 installed and certified." -ForegroundColor Green
Write-Host "Runtime database preserved: $RuntimePath"
Write-Host "Run npm run database:backup after stopping the server to create the first timestamped recovery point."
