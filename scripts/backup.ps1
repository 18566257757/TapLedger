$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'common.ps1')
Assert-VenvPython
Initialize-TapLedgerDirectories | Out-Null
Push-Location $script:BackendDir
try {
    $result = & $script:VenvPython -m app.cli backup
    if ($LASTEXITCODE -ne 0) { throw 'Backup command failed.' }
    $result
} finally { Pop-Location }
