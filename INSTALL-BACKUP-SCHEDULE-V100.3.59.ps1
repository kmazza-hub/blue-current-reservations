$ErrorActionPreference = "Stop"

$Repository = "C:\Users\kmazz\OneDrive\Desktop\blue-current-reservations"
$Runner = Join-Path $Repository "scripts\windows\scheduled-runtime-backup.ps1"
$TaskName = "Blue Current Verified Runtime Backup"

if (-not (Test-Path -LiteralPath $Runner -PathType Leaf)) {
    throw "Scheduled backup runner is missing: $Runner"
}
if ((Get-Content -LiteralPath (Join-Path $Repository "package.json") -Raw | ConvertFrom-Json).version -ne "100.3.59") {
    throw "Install V100.3.59 before approving its backup schedule."
}

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
    -Description "Creates a verified Blue Current runtime recovery point when the application is not active." `
    -Force | Out-Null

Write-Host "Scheduled backup installed: $TaskName" -ForegroundColor Green
Write-Host "Daily trigger: 3:00 AM; starts when available; safely skips while Blue Current is active."
Get-ScheduledTask -TaskName $TaskName | Select-Object TaskName, State
