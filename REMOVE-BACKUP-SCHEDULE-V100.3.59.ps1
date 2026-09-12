$ErrorActionPreference = "Stop"
$TaskName = "Blue Current Verified Runtime Backup"
$Existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($Existing) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "Scheduled backup removed: $TaskName" -ForegroundColor Green
} else {
    Write-Host "Scheduled backup was not installed. No change required."
}
