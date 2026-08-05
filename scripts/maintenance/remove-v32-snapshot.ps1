$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$legacyPath = Join-Path $repoRoot 'Blue-Current-v32.2.3-auth-startup-order-hotfix'

Write-Host "Blue Current V40.33 repository consolidation"
Write-Host "Repository: $repoRoot"

$required = @(
  'client\index.html',
  'client\js\app-v15.1.3.js',
  'client\js\appState.js',
  'server\server.js',
  'package.json'
)

foreach ($relative in $required) {
  $full = Join-Path $repoRoot $relative
  if (-not (Test-Path $full -PathType Leaf)) {
    throw "Safety check failed: required active file is missing: $relative"
  }
}

if (-not (Test-Path $legacyPath -PathType Container)) {
  Write-Host 'Legacy V32 snapshot is already absent. Nothing to remove.'
  exit 0
}

$trackedCount = 0
try {
  $trackedCount = @(git -C $repoRoot ls-files -- 'Blue-Current-v32.2.3-auth-startup-order-hotfix/**').Count
} catch {
  Write-Warning 'Git tracking check was unavailable; continuing with filesystem safeguards.'
}

Write-Host "Verified inactive legacy snapshot: $legacyPath"
Write-Host "Tracked legacy files: $trackedCount"

Remove-Item -LiteralPath $legacyPath -Recurse -Force

if (Test-Path $legacyPath) {
  throw 'Cleanup failed: the legacy V32 snapshot still exists.'
}

Write-Host 'Legacy V32 snapshot removed successfully.'
Write-Host 'Next: git add -A; git commit -m "V40.33 repository consolidation"'
