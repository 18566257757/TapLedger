$ErrorActionPreference = 'Stop'
$taskName = 'TapLedger Daily Backup'
if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    Write-Host "Scheduled task '$taskName' removed."
} else { Write-Host "Scheduled task '$taskName' is not installed." }
