$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'common.ps1')
Assert-VenvPython
$wasRunning = $null -ne (Get-ManagedProcess)

Push-Location $script:BackendDir
try {
    $paths = Get-TapLedgerPaths
    if (Test-Path -LiteralPath $paths.Database -PathType Leaf) {
        & $script:VenvPython -m app.cli backup
        if ($LASTEXITCODE -ne 0) { throw 'Pre-update backup failed. Update stopped.' }
    }
    & $script:VenvPython -m pip install --disable-pip-version-check -r requirements.txt
    if ($LASTEXITCODE -ne 0) { throw 'Backend dependency update failed.' }
    & $script:VenvPython -m alembic upgrade head
    if ($LASTEXITCODE -ne 0) { throw 'Database migration failed.' }
} finally { Pop-Location }

Push-Location $script:FrontendDir
try {
    & npm.cmd ci
    if ($LASTEXITCODE -ne 0) { throw 'Frontend dependency update failed.' }
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) { throw 'Frontend build failed.' }
} finally { Pop-Location }

if ($wasRunning) { & (Join-Path $PSScriptRoot 'restart.ps1') }
Write-Host 'TapLedger update steps completed and the pre-update backup was retained.'
