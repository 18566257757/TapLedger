param(
    [switch]$Apply,
    [switch]$Restore
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'common.ps1')
if ($Apply -eq $Restore) { throw 'Choose exactly one action: -Apply or -Restore.' }
$paths = Initialize-TapLedgerDirectories
$stateFile = Join-Path $paths.Config 'power-before.json'
$subSleep = '238C9FA8-0AAD-41ED-83F4-97BE242C8F20'
$standbyIdle = '29F6C1DB-86DA-48C5-9FDB-F2B67B1F44DA'

if ($Apply) {
    $query = (& powercfg.exe /query SCHEME_CURRENT $subSleep $standbyIdle | Out-String)
    if ($LASTEXITCODE -ne 0) { throw 'Could not read the active power plan.' }
    $matches = [regex]::Matches($query, '0x([0-9a-fA-F]{8})')
    if ($matches.Count -lt 2) { throw 'Could not safely parse AC/DC standby values; no setting was changed.' }
    if (-not (Test-Path -LiteralPath $stateFile)) {
        $state = @{ ac_seconds = [Convert]::ToInt32($matches[0].Groups[1].Value, 16); captured_at = (Get-Date).ToString('o') } | ConvertTo-Json
        [System.IO.File]::WriteAllText($stateFile, $state, [System.Text.UTF8Encoding]::new($false))
    }
    & powercfg.exe /setacvalueindex SCHEME_CURRENT $subSleep $standbyIdle 0
    if ($LASTEXITCODE -ne 0) { throw 'Could not disable AC standby.' }
    & powercfg.exe /setactive SCHEME_CURRENT
    Write-Host 'Automatic sleep while plugged in is disabled. Display timeout and battery settings were not changed.'
} else {
    if (-not (Test-Path -LiteralPath $stateFile -PathType Leaf)) { throw 'No saved TapLedger power setting is available to restore.' }
    $state = Get-Content -LiteralPath $stateFile -Raw -Encoding UTF8 | ConvertFrom-Json
    $seconds = [int]$state.ac_seconds
    if ($seconds -lt 0) { throw 'Saved power value is invalid.' }
    & powercfg.exe /setacvalueindex SCHEME_CURRENT $subSleep $standbyIdle $seconds
    if ($LASTEXITCODE -ne 0) { throw 'Could not restore AC standby.' }
    & powercfg.exe /setactive SCHEME_CURRENT
    Write-Host "Restored plugged-in standby to $seconds seconds."
}
