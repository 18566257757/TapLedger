param([int]$Port = 8787)
$ErrorActionPreference = 'Stop'
& (Join-Path $PSScriptRoot 'stop.ps1')
& (Join-Path $PSScriptRoot 'start.ps1') -Port $Port
