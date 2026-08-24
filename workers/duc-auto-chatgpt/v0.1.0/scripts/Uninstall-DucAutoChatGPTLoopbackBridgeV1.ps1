[CmdletBinding()]
param([switch]$KeepPairing)

$ErrorActionPreference = 'Stop'
$installRoot = [IO.Path]::GetFullPath((Join-Path $env:LOCALAPPDATA 'DucAutoChatGPT\BridgeV1'))
$allowedRoot = [IO.Path]::GetFullPath((Join-Path $env:LOCALAPPDATA 'DucAutoChatGPT'))
$startupPath = Join-Path ([Environment]::GetFolderPath('Startup')) 'Duc Auto ChatGPT Bridge V1.lnk'
$hostPath = Join-Path $installRoot 'bridge-host.mjs'
$codecPath = Join-Path $installRoot 'websocket-core.mjs'
$cliPath = Join-Path $installRoot 'bridge-cli.mjs'
$pairingPath = Join-Path $installRoot 'duc-auto-chatgpt-bridge-pairing-v1.json'

function Set-BridgeCurrentUserAcl([string]$Path) {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent().Name
  $security = New-Object Security.AccessControl.DirectorySecurity
  $security.SetAccessRuleProtection($true, $false)
  $rule = New-Object Security.AccessControl.FileSystemAccessRule($identity, 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow')
  $security.AddAccessRule($rule)
  Set-Acl -LiteralPath $Path -AclObject $security
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

Write-Output 'Uninstalled Duc Auto ChatGPT Bridge V1 current-user files and Startup shortcut.'
if ($KeepPairing) { Write-Output 'Pairing JSON was retained.' }
else { Write-Output 'Pairing JSON was removed; pair again after reinstall.' }
