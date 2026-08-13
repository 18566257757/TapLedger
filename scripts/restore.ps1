param(
    [Parameter(Mandatory = $true)][string]$BackupName,
    [switch]$ConfirmRestore
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'common.ps1')
if (-not $ConfirmRestore) { throw 'Restore changes the active database. Rerun with -ConfirmRestore after checking the backup name.' }
if ([System.IO.Path]::GetFileName($BackupName) -ne $BackupName) { throw 'BackupName must be a file name, not a path.' }
if ($BackupName -notmatch '^tapledger-[0-9-]+\.sqlite3$') { throw 'BackupName is not a TapLedger backup file name.' }
Assert-VenvPython

$wasRunning = $null -ne (Get-ManagedProcess)
Push-Location $script:BackendDir
try {
    & $script:VenvPython -m app.cli validate-backup --name $BackupName | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Selected backup failed validation.' }
} finally { Pop-Location }

if ($wasRunning) { & (Join-Path $PSScriptRoot 'stop.ps1') }
$rollbackName = $null
try {
    Push-Location $script:BackendDir
    try {
        $restoreJson = & $script:VenvPython -m app.cli restore --name $BackupName
        if ($LASTEXITCODE -ne 0) { throw 'Restore failed.' }
        $restoreResult = $restoreJson | ConvertFrom-Json
        $rollbackName = $restoreResult.rollback_backup
        & $script:VenvPython -m alembic upgrade head
        if ($LASTEXITCODE -ne 0) { throw 'Migration after restore failed.' }
    } finally { Pop-Location }
    if ($wasRunning) { & (Join-Path $PSScriptRoot 'start.ps1') }
    Write-Host "Restored and verified $BackupName."
} catch {
    if ($rollbackName) {
        Write-Warning "Restore failed; rolling back with $rollbackName."
        Push-Location $script:BackendDir
        try {
            & $script:VenvPython -m app.cli restore --name $rollbackName | Out-Null
            & $script:VenvPython -m alembic upgrade head
        } finally { Pop-Location }
        if ($wasRunning) { & (Join-Path $PSScriptRoot 'start.ps1') }
    }
    throw
}
