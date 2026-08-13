$ErrorActionPreference = 'Stop'
$taskName = 'TapLedger'
$startScript = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot 'start.ps1'))
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$startScript`"" -WorkingDirectory ([System.IO.Path]::GetDirectoryName($startScript))
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$trigger.Delay = 'PT30S'
$settings = New-ScheduledTaskSettingsSet -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 2) -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Days 3650)
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited
$task = New-ScheduledTask -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description 'Start the private loopback-only TapLedger service after logon.'
Register-ScheduledTask -TaskName $taskName -InputObject $task -Force | Out-Null
Write-Host "Scheduled task '$taskName' installed or updated."
