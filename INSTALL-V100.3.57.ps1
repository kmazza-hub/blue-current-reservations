$ErrorActionPreference = "Stop"

$Repository = "C:\Users\kmazz\OneDrive\Desktop\blue-current-reservations"
$PackageRoot = $PSScriptRoot
$CurrentPackage = Get-Content -LiteralPath (Join-Path $Repository "package.json") -Raw | ConvertFrom-Json

if ($CurrentPackage.version -notin @("100.3.56", "100.3.57")) {
    throw "Expected V100.3.56 or V100.3.57, found V$($CurrentPackage.version)."
}

$RuntimeConfiguration = Join-Path $Repository "config\runtime-database.local.json"
if (-not (Test-Path -LiteralPath $RuntimeConfiguration -PathType Leaf)) {
    throw "V100.3.56 runtime database configuration is missing. Installation stopped."
}

$RuntimePath = (Get-Content -LiteralPath $RuntimeConfiguration -Raw | ConvertFrom-Json).databasePath
if (-not $RuntimePath -or -not (Test-Path -LiteralPath $RuntimePath -PathType Leaf)) {
    throw "The configured runtime database is unavailable. Installation stopped without changing source files."
}

$null = Get-Content -LiteralPath $RuntimePath -Raw | ConvertFrom-Json
$RuntimeHashBefore = (Get-FileHash -LiteralPath $RuntimePath -Algorithm SHA256).Hash

$ApplicationFiles = @(
    "client\index.html",
    "client\styles.css",
    "client\js\focused-operator-workspaces-v100.3.9.js",
    "client\js\fullscreen-floor-clarity-v100.3.10.js",
    "package-lock.json",
    "package.json",
    "scripts\maintenance\certify-v100.3.57-fullscreen-floor-operational-parity.js",
    "scripts\maintenance\test-v100.3.57-fullscreen-floor-operational-parity.js"
)

foreach ($RelativePath in $ApplicationFiles) {
    $Source = Join-Path $PackageRoot $RelativePath
    $Destination = Join-Path $Repository $RelativePath
    if (-not (Test-Path -LiteralPath $Source -PathType Leaf)) {
        throw "Package file is missing: $RelativePath"
    }
    Copy-Item -LiteralPath $Source -Destination $Destination -Force
}

Set-Location $Repository
npm ci
npm run check
if ($LASTEXITCODE -ne 0) { throw "V100.3.57 validation failed." }

npm run certify:pilot
if ($LASTEXITCODE -ne 0) { throw "V100.3.57 certification failed." }

$RuntimeHashAfter = (Get-FileHash -LiteralPath $RuntimePath -Algorithm SHA256).Hash
if ($RuntimeHashBefore -ne $RuntimeHashAfter) {
    throw "The runtime database changed during installation. Stop and preserve both hashes."
}

Write-Host ""
Write-Host "V100.3.57 installed and certified." -ForegroundColor Green
Write-Host "Runtime database preserved: $RuntimePath"
Write-Host "Restart the Node server, then test full-screen Floor on localhost and Cloudflare."
