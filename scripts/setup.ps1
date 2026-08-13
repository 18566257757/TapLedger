param(
    [switch]$InstallPrerequisites,
    [switch]$ConfigureTailscale,
    [switch]$RegisterStartupTask,
    [switch]$NoStart
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'common.ps1')

if ($PSVersionTable.PSVersion.Major -lt 5) { throw 'PowerShell 5.1 or newer is required.' }

function Find-PythonLauncher {
    $py = Get-Command py.exe -ErrorAction SilentlyContinue
    if ($py) { return @{ File = $py.Source; Args = @('-3.13') } }
    $python = Get-Command python.exe -ErrorAction SilentlyContinue
    if ($python) { return @{ File = $python.Source; Args = @() } }
    return $null
}

function New-RandomSecret([int]$ByteCount) {
    $bytes = New-Object byte[] $ByteCount
    $generator = [Security.Cryptography.RandomNumberGenerator]::Create()
    try { $generator.GetBytes($bytes) } finally { $generator.Dispose() }
    return [Convert]::ToBase64String($bytes)
}

$missing = [System.Collections.Generic.List[string]]::new()
$pythonLauncher = Find-PythonLauncher
if (-not $pythonLauncher) { $missing.Add('Python 3.13') }
if (-not (Get-Command node.exe -ErrorAction SilentlyContinue)) { $missing.Add('Node.js') }
if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) { $missing.Add('npm') }

if ($missing.Count -gt 0 -and $InstallPrerequisites) {
    if (-not (Get-Command winget.exe -ErrorAction SilentlyContinue)) { throw "Missing: $($missing -join ', '). winget is unavailable; install them manually." }
    if ($missing -contains 'Python 3.13') { & winget.exe install --id Python.Python.3.13 --exact --accept-source-agreements --accept-package-agreements }
    if ($missing -contains 'Node.js' -or $missing -contains 'npm') { & winget.exe install --id OpenJS.NodeJS.LTS --exact --accept-source-agreements --accept-package-agreements }
    $pythonLauncher = Find-PythonLauncher
}

if (-not $pythonLauncher -or -not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
    throw "Missing prerequisites: $($missing -join ', '). Install Python 3.13 and Node.js LTS, or rerun with -InstallPrerequisites."
}

if (-not (Test-Path -LiteralPath $script:VenvPython -PathType Leaf)) {
    $createVenvArgs = @($pythonLauncher.Args) + @('-m', 'venv', (Join-Path $script:BackendDir '.venv'))
    & $pythonLauncher.File $createVenvArgs
    if ($LASTEXITCODE -ne 0) { throw 'Could not create the Python virtual environment.' }
}

Assert-VenvPython
$paths = Initialize-TapLedgerDirectories
$envFile = Join-Path $script:ProjectRoot '.env'
if (-not (Test-Path -LiteralPath $envFile -PathType Leaf)) {
    $sessionSecret = New-RandomSecret 48
    $shortcutToken = New-RandomSecret 32
    $envText = @"
TAPLEDGER_ENVIRONMENT=production
TAPLEDGER_HOST=127.0.0.1
TAPLEDGER_PORT=8787
TAPLEDGER_SESSION_SECRET=$sessionSecret
TAPLEDGER_SHORTCUT_TOKEN=$shortcutToken
TAPLEDGER_LOG_LEVEL=INFO
"@
    [System.IO.File]::WriteAllText($envFile, $envText, [System.Text.UTF8Encoding]::new($false))
    Write-Host 'Created a private .env without replacing any existing configuration.'
}

& $script:VenvPython -m pip install --disable-pip-version-check -r (Join-Path $script:BackendDir 'requirements.txt')
if ($LASTEXITCODE -ne 0) { throw 'Backend dependency installation failed.' }
Push-Location $script:BackendDir
try {
    & $script:VenvPython -m alembic upgrade head
    if ($LASTEXITCODE -ne 0) { throw 'Database migration failed.' }
} finally { Pop-Location }

Push-Location $script:FrontendDir
try {
    if (Test-Path -LiteralPath (Join-Path $script:FrontendDir 'package-lock.json')) { & npm.cmd ci } else { & npm.cmd install }
    if ($LASTEXITCODE -ne 0) { throw 'Frontend dependency installation failed.' }
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) { throw 'Frontend production build failed.' }
} finally { Pop-Location }

if (-not $NoStart) {
    & (Join-Path $PSScriptRoot 'start.ps1')
}
if ($RegisterStartupTask) { & (Join-Path $PSScriptRoot 'install-startup-task.ps1') }
if ($ConfigureTailscale) { & (Join-Path $PSScriptRoot 'configure-tailscale.ps1') }

Write-Host "TapLedger setup completed. Local URL: http://127.0.0.1:8787"
Write-Host "Data: $($paths.Database)"
if (-not $NoStart) { Start-Process 'http://127.0.0.1:8787' }
