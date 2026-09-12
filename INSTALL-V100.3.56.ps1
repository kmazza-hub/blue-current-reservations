$ErrorActionPreference = "Stop"

$Repository = "C:\Users\kmazz\OneDrive\Desktop\blue-current-reservations"
$PackageRoot = $PSScriptRoot
$CurrentPackage = Get-Content -LiteralPath (Join-Path $Repository "package.json") -Raw | ConvertFrom-Json

if ($CurrentPackage.version -notin @("100.3.55", "100.3.56")) {
    throw "Expected V100.3.55 or V100.3.56, found V$($CurrentPackage.version)."
}

if (-not $env:LOCALAPPDATA) {
    throw "LOCALAPPDATA is required for the local runtime database."
}

$LegacyDatabase = Join-Path $Repository "database\data\blue-current.json"
$RuntimeDatabase = Join-Path $env:LOCALAPPDATA "BlueCurrent\data\blue-current.json"
$RuntimeDirectory = Split-Path -Parent $RuntimeDatabase
$LocalConfiguration = Join-Path $Repository "config\runtime-database.local.json"

if (-not (Test-Path -LiteralPath $LegacyDatabase -PathType Leaf)) {
    throw "The existing V100.3.55 live database was not found: $LegacyDatabase"
}

$null = Get-Content -LiteralPath $LegacyDatabase -Raw | ConvertFrom-Json
New-Item -ItemType Directory -Path $RuntimeDirectory -Force | Out-Null

if (Test-Path -LiteralPath $RuntimeDatabase -PathType Leaf) {
    $null = Get-Content -LiteralPath $RuntimeDatabase -Raw | ConvertFrom-Json
    $LegacyHash = (Get-FileHash -LiteralPath $LegacyDatabase -Algorithm SHA256).Hash
    $RuntimeHash = (Get-FileHash -LiteralPath $RuntimeDatabase -Algorithm SHA256).Hash
    if ($LegacyHash -ne $RuntimeHash) {
        throw "External runtime data already exists and differs from the repository data. Nothing was overwritten. Reconcile the two files before retrying."
    }
} else {
    $TemporaryDatabase = "$RuntimeDatabase.migration.$PID.tmp"
    Copy-Item -LiteralPath $LegacyDatabase -Destination $TemporaryDatabase
    $null = Get-Content -LiteralPath $TemporaryDatabase -Raw | ConvertFrom-Json
    Move-Item -LiteralPath $TemporaryDatabase -Destination $RuntimeDatabase
}

New-Item -ItemType Directory -Path (Split-Path -Parent $LocalConfiguration) -Force | Out-Null
@{ databasePath = $RuntimeDatabase } |
    ConvertTo-Json |
    Set-Content -LiteralPath $LocalConfiguration -Encoding utf8

$ApplicationFiles = @(
    ".env.example",
    ".gitignore",
    "client\index.html",
    "package-lock.json",
    "package.json",
    "server\persistence\runtimeDatabase.js",
    "server\server\server.js",
    "server\server.js",
    "scripts\maintenance\certify-v100.3.56-runtime-database-separation.js",
    "scripts\maintenance\test-v100.3.56-runtime-database-separation.js",
    "scripts\validate.js"
)

foreach ($RelativePath in $ApplicationFiles) {
    $Source = Join-Path $PackageRoot $RelativePath
    $Destination = Join-Path $Repository $RelativePath
    if (-not (Test-Path -LiteralPath $Source -PathType Leaf)) {
        throw "Package file is missing: $RelativePath"
    }
    New-Item -ItemType Directory -Path (Split-Path -Parent $Destination) -Force | Out-Null
    Copy-Item -LiteralPath $Source -Destination $Destination -Force
}

Set-Location $Repository
npm ci
npm run check
npm run certify:pilot

Write-Host ""
Write-Host "V100.3.56 installed and certified." -ForegroundColor Green
Write-Host "Runtime database: $RuntimeDatabase"
Write-Host "The original database remains in the repository as a migration safety copy."
