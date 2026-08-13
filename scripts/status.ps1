param([int]$Port = 8787)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'common.ps1')
$managed = Get-ManagedProcess
if ($managed) { Write-Host "Managed process: running (PID $($managed.ProcessId))" } else { Write-Host 'Managed process: stopped' }
if (Test-LocalHealth -Port $Port) { Write-Host "Health: ok at http://127.0.0.1:$Port/api/v1/health"; exit 0 }
Write-Host 'Health: unavailable'
exit 1
