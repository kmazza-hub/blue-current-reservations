$ErrorActionPreference = "Stop"

$Repository = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$Node = (Get-Command node -ErrorAction Stop).Source
$LogDirectory = Join-Path $env:LOCALAPPDATA "BlueCurrent\logs"
$LogFile = Join-Path $LogDirectory "scheduled-backup.log"
New-Item -ItemType Directory -Path $LogDirectory -Force | Out-Null

$StartedAt = Get-Date -Format "o"
$Output = & $Node (Join-Path $Repository "scripts\runtime-database-backup.js") --scheduled 2>&1
$ExitCode = $LASTEXITCODE
@("[$StartedAt]", $Output, "Exit code: $ExitCode", "") | Out-File -LiteralPath $LogFile -Append -Encoding utf8
exit $ExitCode
