[CmdletBinding()]
param([switch]$KeepPairing)

$ErrorActionPreference = 'Stop'
$installRoot = [IO.Path]::GetFullPath('C:\WORKING ZONE\Duc-Auto-Gemini-Bridge')
$allowedRoot = [IO.Path]::GetFullPath('C:\WORKING ZONE\Duc-Auto-Gemini-Bridge')
$startupPath = Join-Path ([Environment]::GetFolderPath('Startup')) 'Duc Auto Gemini Bridge V1.lnk'
$hostPath = Join-Path $installRoot 'bridge-host.mjs'
$codecPath = Join-Path $installRoot 'websocket-core.mjs'
$cliPath = Join-Path $installRoot 'bridge-cli.mjs'
$pairingPath = Join-Path $installRoot 'duc-auto-gemini-bridge-pairing-v1.json'

function Set-BridgeCurrentUserAcl([string]$Path) {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent().Name
  $output = icacls $Path /inheritance:r /grant:r "${identity}:(OI)(CI)F" 2>&1
  if ($LASTEXITCODE -ne 0) {
    throw "icacls failed to lock down '$Path' to '$identity': $output"
  }
}

if (-not $installRoot.StartsWith($allowedRoot, [StringComparison]::OrdinalIgnoreCase)) {
  throw "Refusing to uninstall outside $allowedRoot"
}

$escapedHostPath = [Regex]::Escape($hostPath)
Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" |
  Where-Object { [string]$_.CommandLine -match $escapedHostPath } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }

if (Test-Path -LiteralPath $startupPath) { Remove-Item -LiteralPath $startupPath -Force }
if ($KeepPairing -and (Test-Path -LiteralPath $pairingPath)) {
  if (Test-Path -LiteralPath $hostPath) { Remove-Item -LiteralPath $hostPath -Force }
  if (Test-Path -LiteralPath $codecPath) { Remove-Item -LiteralPath $codecPath -Force }
  if (Test-Path -LiteralPath $cliPath) { Remove-Item -LiteralPath $cliPath -Force }
  Set-BridgeCurrentUserAcl $installRoot
} elseif (Test-Path -LiteralPath $installRoot) {
  Remove-Item -LiteralPath $installRoot -Recurse -Force
}

Write-Output 'Uninstalled Duc Auto Gemini Bridge V1 current-user files and Startup shortcut.'
if ($KeepPairing) { Write-Output 'Pairing JSON was retained.' }
else { Write-Output 'Pairing JSON was removed; pair again after reinstall.' }
