$ErrorActionPreference = "Stop"
$Repository = "C:\Users\kmazz\OneDrive\Desktop\blue-current-reservations"
$PackageRoot = $PSScriptRoot
$CurrentVersion = (Get-Content -LiteralPath (Join-Path $Repository "package.json") -Raw | ConvertFrom-Json).version
if ($CurrentVersion -ne "100.3.68") { throw "Expected Blue Current V100.3.68; found V$CurrentVersion." }
$Files = @(
  "index.html", "platform.html", "operations.html", "concierge.html", "executive.html", "enterprise.html",
  "product-demo.html", "pilot-workspace.html", "docs.html", "roi-calculator.html", "privacy.html", "terms.html",
  "walkthrough.html", "styles.css", "js\walkthrough.js",
  "scripts\maintenance\test-website-walkthrough-v100.3.68.js",
  "INSTALL-WEBSITE-WALKTHROUGH-V100.3.68.ps1", "README-WEBSITE-WALKTHROUGH-V100.3.68.md"
)
foreach ($RelativePath in $Files) {
  $Source = Join-Path $PackageRoot $RelativePath; $Destination = Join-Path $Repository $RelativePath
  if (-not (Test-Path -LiteralPath $Source -PathType Leaf)) { throw "Package file is missing: $RelativePath" }
  $Directory = Split-Path -Parent $Destination
  if (-not (Test-Path -LiteralPath $Directory)) { New-Item -ItemType Directory -Path $Directory | Out-Null }
  Copy-Item -LiteralPath $Source -Destination $Destination -Force
}
Set-Location $Repository
node scripts/maintenance/test-website-walkthrough-v100.3.68.js
if ($LASTEXITCODE -ne 0) { throw "Website walkthrough certification failed." }
npm run check
if ($LASTEXITCODE -ne 0) { throw "Blue Current validation failed." }
Write-Host ""; Write-Host "First-class website walkthrough installed and certified." -ForegroundColor Green
Write-Host "Commit and push these website files to publish them to bluecurrentco.com."
