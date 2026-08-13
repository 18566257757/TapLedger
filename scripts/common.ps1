$ErrorActionPreference = 'Stop'

$script:ProjectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$script:BackendDir = Join-Path $script:ProjectRoot 'backend'
$script:FrontendDir = Join-Path $script:ProjectRoot 'frontend'
$script:VenvPython = Join-Path $script:BackendDir '.venv\Scripts\python.exe'

function Get-TapLedgerRoot {
    if ($env:TAPLEDGER_DATA_DIR) { return [System.IO.Path]::GetFullPath($env:TAPLEDGER_DATA_DIR) }
    if (-not $env:LOCALAPPDATA) { throw 'LOCALAPPDATA is unavailable.' }
    return [System.IO.Path]::GetFullPath((Join-Path $env:LOCALAPPDATA 'TapLedger'))
}

function Get-TapLedgerPaths {
    $runtimeRoot = Get-TapLedgerRoot
    return [pscustomobject]@{
        Root = $runtimeRoot
        Data = Join-Path $runtimeRoot 'data'
        Logs = Join-Path $runtimeRoot 'logs'
        Runtime = Join-Path $runtimeRoot 'runtime'
        Config = Join-Path $runtimeRoot 'config'
        Database = Join-Path $runtimeRoot 'data\tapledger.sqlite3'
        Pid = Join-Path $runtimeRoot 'runtime\tapledger.pid'
    }
}

function Initialize-TapLedgerDirectories {
    $paths = Get-TapLedgerPaths
    foreach ($path in @($paths.Root, $paths.Data, $paths.Logs, $paths.Runtime, $paths.Config)) {
        [System.IO.Directory]::CreateDirectory($path) | Out-Null
    }
    $backupRoot = if ($env:TAPLEDGER_BACKUP_DIR) { $env:TAPLEDGER_BACKUP_DIR } else { Join-Path $env:USERPROFILE 'Documents\TapLedger Backups' }
    [System.IO.Directory]::CreateDirectory([System.IO.Path]::GetFullPath($backupRoot)) | Out-Null
    return $paths
}

function Assert-VenvPython {
    if (-not (Test-Path -LiteralPath $script:VenvPython -PathType Leaf)) {
        throw "Python environment is missing. Run scripts\setup.ps1 first."
    }
}

function Get-ManagedProcess {
    $paths = Get-TapLedgerPaths
    if (-not (Test-Path -LiteralPath $paths.Pid -PathType Leaf)) { return $null }
    $rawPid = (Get-Content -LiteralPath $paths.Pid -Raw).Trim()
    $processId = 0
    if (-not [int]::TryParse($rawPid, [ref]$processId) -or $processId -le 0) { return $null }
    $process = Get-CimInstance Win32_Process -Filter "ProcessId = $processId" -ErrorAction SilentlyContinue
    if (-not $process) { return $null }
    $expectedPython = [System.IO.Path]::GetFullPath($script:VenvPython)
    $actualExecutable = if ($process.ExecutablePath) { [System.IO.Path]::GetFullPath($process.ExecutablePath) } else { '' }
    if ($actualExecutable -ne $expectedPython -or $process.CommandLine -notmatch 'uvicorn' -or $process.CommandLine -notmatch 'app\.main:app') {
        throw "PID file points to a process that is not the managed TapLedger server. Refusing to control PID $processId."
    }
    return $process
}

function Test-LocalHealth {
    param([int]$Port = 8787)
    try {
        $result = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/api/v1/health" -Method Get -TimeoutSec 4
        return $result.status -eq 'ok'
    } catch {
        return $false
    }
}
