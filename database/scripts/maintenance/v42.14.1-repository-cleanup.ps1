$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path

$required = @(
  'client\index.html',
  'client\js\app-v15.1.3.js',
  'client\js\appState.js',
  'client\js\startup-loader.js',
  'server\server.js',
  'server\api\router.js',
  'server\services\liveIntegrationService.js',
  'package.json'
)

foreach ($relative in $required) {
  $path = Join-Path $root $relative
  if (-not (Test-Path $path)) {
    throw "Cleanup aborted: required active file missing: $relative"
  }
}

$targets = @(
  'Blue-Current-v32.2.3-auth-startup-order-hotfix',
  'modules',
  'app-v15.1.3.js',
  'startup-loader.js',
  'client\appState.js',
  'server\client',
  'server\server'
)

foreach ($relative in $targets) {
  $path = Join-Path $root $relative
  if (Test-Path $path) {
    Remove-Item -LiteralPath $path -Recurse -Force
    Write-Host "Removed $relative"
  } else {
    Write-Host "Already clean: $relative"
  }
}

Write-Host 'V42.14.1 repository cleanup complete.'
Write-Host 'Run: npm run check'
Write-Host 'Then: npm run start'
