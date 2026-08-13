$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'common.ps1')
$paths = Get-TapLedgerPaths
$managed = Get-ManagedProcess
if (-not $managed) {
    Write-Host 'TapLedger is not running under the managed PID file.'
    return
}
Stop-Process -Id $managed.ProcessId -ErrorAction Stop
Wait-Process -Id $managed.ProcessId -Timeout 15 -ErrorAction SilentlyContinue
if (Get-Process -Id $managed.ProcessId -ErrorAction SilentlyContinue) { throw 'TapLedger did not stop within 15 seconds.' }
Remove-Item -LiteralPath $paths.Pid -Force -ErrorAction Stop
Write-Host "TapLedger stopped (PID $($managed.ProcessId))."
