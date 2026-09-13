$ErrorActionPreference = "Stop"

$Repository = "C:\Users\kmazz\OneDrive\Desktop\blue-current-reservations"
$Runner = Join-Path $Repository "scripts\windows\scheduled-runtime-backup.ps1"
$TaskName = "Blue Current Verified Runtime Backup"
if (-not (Test-Path -LiteralPath $Runner -PathType Leaf)) { throw "Scheduled backup runner is missing: $Runner" }
if ((Get-Content -LiteralPath (Join-Path $Repository "package.json") -Raw | ConvertFrom-Json).version -ne "100.3.60") {
    throw "Install V100.3.60 before approving server-coordinated backups."
}

$ConfigurationPath = Join-Path $Repository "config\runtime-backup.local.json"
$TokenBytes = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($TokenBytes)
$Configuration = @{ token = [Convert]::ToBase64String($TokenBytes); retention = 14 } | ConvertTo-Json
[IO.File]::WriteAllText($ConfigurationPath, $Configuration, (New-Object Text.UTF8Encoding($false)))

$Action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$Runner`"" `
    -WorkingDirectory $Repository
$Trigger = New-ScheduledTaskTrigger -Daily -At "3:00 AM"
$Principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive
$Settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 15)
Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $Action `
    -Trigger $Trigger `
    -Principal $Principal `
    -Settings $Settings `
    -Description "Creates a verified Blue Current recovery point offline or through its local serialized persistence queue." `
    -Force | Out-Null

Write-Host "Server-coordinated backup schedule approved: $TaskName" -ForegroundColor Green
Write-Host "Restart Blue Current once so it loads the new machine-local backup authority."
Get-ScheduledTask -TaskName $TaskName | Select-Object TaskName, State
