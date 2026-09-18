$ErrorActionPreference = "Stop"
$Repository = "C:\Users\kmazz\OneDrive\Desktop\blue-current-reservations"
$PackageRoot = $PSScriptRoot
$CurrentVersion = (Get-Content -LiteralPath (Join-Path $Repository "package.json") -Raw | ConvertFrom-Json).version
if ($CurrentVersion -notin @("100.3.83", "100.3.84")) { throw "Expected certified V100.3.83 or V100.3.84; found V$CurrentVersion." }

$RuntimeConfiguration = Join-Path $Repository "config\runtime-database.local.json"
$RuntimePath = $null
$RuntimeHashBefore = $null
if (Test-Path -LiteralPath $RuntimeConfiguration -PathType Leaf) {
  $RuntimePath = (Get-Content -LiteralPath $RuntimeConfiguration -Raw | ConvertFrom-Json).databasePath
  if (-not $RuntimePath -or -not (Test-Path -LiteralPath $RuntimePath -PathType Leaf)) { throw "Configured runtime database is unavailable." }
  $null = Get-Content -LiteralPath $RuntimePath -Raw | ConvertFrom-Json
  $RuntimeHashBefore = (Get-FileHash -LiteralPath $RuntimePath -Algorithm SHA256).Hash
}

$CallLink = '<a class="button button-light button-small" href="tel:+18483090042" aria-label="Call Keith at 848-309-0042">Call Keith · 848-309-0042</a>'
$GoldCallLink = '<a class="button button-gold" href="tel:+18483090042" aria-label="Call Keith at 848-309-0042">Call Keith · 848-309-0042</a>'
$ChangedFiles = 0
$WebsiteFiles = @("index.html", "client\index.html")

foreach ($RelativePath in $WebsiteFiles) {
  $WebsitePath = Join-Path $Repository $RelativePath
  if (-not (Test-Path -LiteralPath $WebsitePath -PathType Leaf)) { continue }
  $Html = [System.IO.File]::ReadAllText($WebsitePath)
  $Original = $Html
  $Html = $Html.Replace('<a class="button button-light button-small" href="#pilot">Book a private demo</a>', $CallLink)
  $Html = [regex]::Replace($Html, '<a class="button button-gold" href="[^"]*"[^>]*>Schedule a private walkthrough</a>', $GoldCallLink)
  $Html = $Html.Replace("100.3.84", "100.3.85").Replace("100.3.83", "100.3.85")
  if ($Html -ne $Original) {
    [System.IO.File]::WriteAllText($WebsitePath, $Html, (New-Object System.Text.UTF8Encoding($false)))
    $ChangedFiles++
  }
}

if ($ChangedFiles -eq 0) { throw "No public website CTA targets were updated." }

$Files = @(
  "package.json",
  "package-lock.json",
  "scripts\maintenance\test-v100.3.85-public-website-direct-call.js",
  "scripts\maintenance\certify-v100.3.85-public-website-direct-call.js",
  "INSTALL-V100.3.85.ps1",
  "README-V100.3.85.md"
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
if ($LASTEXITCODE -ne 0) { throw "V100.3.85 validation failed." }
npm run certify:pilot
if ($LASTEXITCODE -ne 0) { throw "V100.3.85 certification failed." }

if ($RuntimePath) {
  $RuntimeHashAfter = (Get-FileHash -LiteralPath $RuntimePath -Algorithm SHA256).Hash
  if ($RuntimeHashBefore -ne $RuntimeHashAfter) { throw "Runtime database changed during installation." }
}

Write-Host ""
Write-Host "V100.3.85 installed and certified." -ForegroundColor Green
Write-Host "Public website CTA updated in $ChangedFiles website entry file(s)."
if ($RuntimePath) { Write-Host "Runtime database preserved: $RuntimePath" }
Write-Host "Commit and push the certified source so the bluecurrentco.com host can publish it."
