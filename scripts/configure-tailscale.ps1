param([int]$Port = 8787)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'common.ps1')

$tailscale = Get-Command tailscale.exe -ErrorAction SilentlyContinue
if (-not $tailscale) {
    $knownPath = Join-Path $env:ProgramFiles 'Tailscale\tailscale.exe'
    if (Test-Path -LiteralPath $knownPath -PathType Leaf) { $tailscalePath = $knownPath } else { throw 'Tailscale is not installed or is not in PATH. Install it from https://tailscale.com/download/windows and sign in first.' }
} else { $tailscalePath = $tailscale.Source }

& $tailscalePath version
if ($LASTEXITCODE -ne 0) { throw 'Could not run tailscale version.' }
$helpText = (& $tailscalePath serve --help 2>&1 | Out-String)
if ($LASTEXITCODE -ne 0 -or $helpText -notmatch '--bg') { throw 'This Tailscale version does not expose the required background Serve syntax. Update Tailscale and retry.' }
if (-not (Test-LocalHealth -Port $Port)) { throw "TapLedger must be healthy on http://127.0.0.1:$Port before configuring Serve." }

$status = (& $tailscalePath status --json | ConvertFrom-Json)
if ($LASTEXITCODE -ne 0 -or $status.BackendState -ne 'Running') { throw 'Tailscale is not connected. Open Tailscale, sign in to the intended tailnet, and retry.' }

& $tailscalePath serve --bg $Port
if ($LASTEXITCODE -ne 0) { throw 'Tailscale Serve configuration failed.' }
& $tailscalePath serve status
if ($LASTEXITCODE -ne 0) { throw 'Tailscale Serve was configured but status could not be read.' }

$dnsName = [string]$status.Self.DNSName
if (-not $dnsName) { throw 'Tailscale did not report a MagicDNS name.' }
$baseUrl = "https://$($dnsName.TrimEnd('.'))"
$envFile = Join-Path $script:ProjectRoot '.env'
if (-not (Test-Path -LiteralPath $envFile -PathType Leaf)) { throw '.env is missing. Run setup.ps1 first.' }
$lines = [System.Collections.Generic.List[string]](Get-Content -LiteralPath $envFile -Encoding UTF8)
$key = 'TAPLEDGER_TAILSCALE_BASE_URL='
$index = -1
for ($i = 0; $i -lt $lines.Count; $i++) { if ($lines[$i].StartsWith($key, [StringComparison]::OrdinalIgnoreCase)) { $index = $i; break } }
if ($index -ge 0) { $lines[$index] = "$key$baseUrl" } else { $lines.Add("$key$baseUrl") }
[System.IO.File]::WriteAllLines($envFile, $lines, [System.Text.UTF8Encoding]::new($false))
Write-Host "Private Tailnet URL: $baseUrl"
Write-Host 'Funnel was not enabled. TapLedger still listens only on loopback.'
