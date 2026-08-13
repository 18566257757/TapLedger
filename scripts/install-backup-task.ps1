$ErrorActionPreference = 'Stop'
$taskName = 'TapLedger Daily Backup'
$backupScript = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot 'backup.ps1'))
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$backupScript`"" -WorkingDirectory ([System.IO.Path]::GetDirectoryName($backupScript))
$trigger = New-ScheduledTaskTrigger -Daily -At '02:00'
$settings = New-ScheduledTaskSettingsSet -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 5) -StartWhenAvailable
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited
$task = New-ScheduledTask -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description 'Create and verify a daily TapLedger SQLite backup.'
Register-ScheduledTask -TaskName $taskName -InputObject $task -Force | Out-Null
Write-Host "Scheduled task '$taskName' installed or updated."
