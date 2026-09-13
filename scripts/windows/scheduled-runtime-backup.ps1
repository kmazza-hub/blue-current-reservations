$ErrorActionPreference = "Stop"

$Repository = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$Node = (Get-Command node -ErrorAction Stop).Source
$LogDirectory = Join-Path $env:LOCALAPPDATA "BlueCurrent\logs"
$LogFile = Join-Path $LogDirectory "scheduled-backup.log"
New-Item -ItemType Directory -Path $LogDirectory -Force | Out-Null

$StartedAt = Get-Date -Format "o"
$Output = & $Node (Join-Path $Repository "scripts\runtime-database-backup.js") --scheduled 2>&1
$ExitCode = $LASTEXITCODE
if ($ExitCode -eq 3) {
    $ConfigurationPath = Join-Path $Repository "config\runtime-backup.local.json"
    if (-not (Test-Path -LiteralPath $ConfigurationPath -PathType Leaf)) {
        throw "Server-coordinated backup configuration is missing."
    }
    $Configuration = Get-Content -LiteralPath $ConfigurationPath -Raw | ConvertFrom-Json
    $Headers = @{ "X-Blue-Current-Backup-Token" = $Configuration.token }
    $Result = Invoke-RestMethod `
        -Method Post `
        -Uri "http://localhost:8787/api/local/runtime-backup" `
        -Headers $Headers `
        -TimeoutSec 60
    $Output = @($Output, "Server-coordinated verified backup: $($Result.name)", "SHA-256: $($Result.sha256)")
    $ExitCode = 0
}
@("[$StartedAt]", $Output, "Exit code: $ExitCode", "") | Out-File -LiteralPath $LogFile -Append -Encoding utf8
exit $ExitCode
