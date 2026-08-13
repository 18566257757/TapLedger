param([int]$Port = 8787)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'common.ps1')
if (-not (Test-LocalHealth -Port $Port)) { throw "TapLedger health check failed on 127.0.0.1:$Port." }
$response = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/api/v1/health" -TimeoutSec 4
$response | ConvertTo-Json
