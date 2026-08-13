param([int]$Port = 8787)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'common.ps1')
Assert-VenvPython
$paths = Initialize-TapLedgerDirectories

$managed = Get-ManagedProcess
if ($managed) {
    if (Test-LocalHealth -Port $Port) { Write-Host "TapLedger is already running (PID $($managed.ProcessId))."; return }
    throw 'A managed TapLedger process exists but its health check failed.'
}

$listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($listener) { throw "Port $Port is already in use. TapLedger was not started." }

Push-Location $script:BackendDir
try {
    & $script:VenvPython -m alembic upgrade head
    if ($LASTEXITCODE -ne 0) { throw 'Database migration failed.' }
} finally { Pop-Location }

$stdout = Join-Path $paths.Logs 'tapledger.stdout.log'
$stderr = Join-Path $paths.Logs 'tapledger.stderr.log'
$server = Start-Process -FilePath $script:VenvPython -ArgumentList @('-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', $Port, '--no-access-log') -WorkingDirectory $script:BackendDir -WindowStyle Hidden -RedirectStandardOutput $stdout -RedirectStandardError $stderr -PassThru
[System.IO.File]::WriteAllText($paths.Pid, $server.Id.ToString(), [System.Text.Encoding]::ASCII)

for ($attempt = 0; $attempt -lt 20; $attempt++) {
    Start-Sleep -Milliseconds 500
    if (Test-LocalHealth -Port $Port) { Write-Host "TapLedger started on http://127.0.0.1:$Port (PID $($server.Id))."; return }
    if ($server.HasExited) { throw "TapLedger exited during startup. Check $stderr" }
}
throw "TapLedger did not become healthy. Check $stderr"
