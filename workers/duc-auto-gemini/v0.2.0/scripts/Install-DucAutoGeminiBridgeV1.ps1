[CmdletBinding()]
param(
  [ValidateRange(1024, 65535)][int]$Port = 32148,
  [switch]$RotateToken,
  [switch]$NoStart
)

# Gemini variant of the proven Bridge V1 installer. Separate install root,
# pairing filename, startup shortcut and default port (32148) so it can never
# collide with a Duc Auto ChatGPT bridge host on the same machine (32147).
# Owner decision 2026-08-25: the install root is a VISIBLE folder next to the
# project (not AppData) — this is a single-user local machine and the owner
# prefers discoverability. Kept OUTSIDE the git worktree so the pairing token
# can never be committed.
# 2026-08-27 the owner gathered every bridge under one parent folder and the
# host was moved to 'Chrome Extension Bridge\duc-auto-gemini'. This default was
# left behind pointing at the vacated folder, so a rerun would have installed a
# second host beside the live one instead of upgrading it.

$ErrorActionPreference = 'Stop'
$sourceRoot = Split-Path -Parent $PSScriptRoot
$hostSource = Join-Path $sourceRoot 'duc-auto-chatgpt-loopback-bridge-host-v1'
# One canonical root, declared the same way the uninstaller declares it. Deliberately not a
# parameter: an overridable install root produced hosts the uninstaller could not reach.
$installRoot = [IO.Path]::GetFullPath('C:\WORKING ZONE\Chrome Extension Bridge\duc-auto-gemini')
$pairingPath = Join-Path $installRoot 'duc-auto-gemini-bridge-pairing-v1.json'
$hostPath = Join-Path $installRoot 'bridge-host.mjs'
$startupPath = Join-Path ([Environment]::GetFolderPath('Startup')) 'Duc Auto Gemini Bridge V1.lnk'
$nodeCommand = Get-Command node -ErrorAction Stop

function Set-BridgeCurrentUserAcl([string]$Path) {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent().Name
  $output = icacls $Path /inheritance:r /grant:r "${identity}:(OI)(CI)F" 2>&1
  if ($LASTEXITCODE -ne 0) {
    throw "icacls failed to lock down '$Path' to '$identity': $output"
  }
}

New-Item -ItemType Directory -Path $installRoot -Force | Out-Null
Set-BridgeCurrentUserAcl $installRoot
$escapedHostPath = [Regex]::Escape($hostPath)
Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" |
  Where-Object { [string]$_.CommandLine -match $escapedHostPath } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Copy-Item -LiteralPath (Join-Path $hostSource 'bridge-host.mjs') -Destination $hostPath -Force
Copy-Item -LiteralPath (Join-Path $hostSource 'websocket-core.mjs') -Destination (Join-Path $installRoot 'websocket-core.mjs') -Force
Copy-Item -LiteralPath (Join-Path $hostSource 'bridge-cli.mjs') -Destination (Join-Path $installRoot 'bridge-cli.mjs') -Force

$existing = $null
if (Test-Path -LiteralPath $pairingPath) {
  try { $existing = Get-Content -LiteralPath $pairingPath -Raw | ConvertFrom-Json }
  catch { $existing = $null }
}

if ($existing -and -not $RotateToken) {
  $token = [string]$existing.token
  if ($token -notmatch '^[A-Za-z0-9_-]{43}$') { throw 'Existing pairing token is invalid; rerun with -RotateToken.' }
  try { $decodedToken = [Convert]::FromBase64String($token.Replace('-', '+').Replace('_', '/') + '=') }
  catch { throw 'Existing pairing token is invalid; rerun with -RotateToken.' }
  if ($decodedToken.Length -ne 32) { throw 'Existing pairing token is invalid; rerun with -RotateToken.' }
} else {
  $bytes = New-Object byte[] 32
  $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
  try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
  $token = [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')
}

$pairing = [ordered]@{
  schema_version = 1
  host = '127.0.0.1'
  port = $Port
  http_url = "http://127.0.0.1:$Port/v1/rpc"
  websocket_url = "ws://127.0.0.1:$Port/v1/extension"
  token = $token
  created_at = [DateTime]::UtcNow.ToString('o')
}
$pairingJson = $pairing | ConvertTo-Json
[IO.File]::WriteAllText($pairingPath, $pairingJson, (New-Object Text.UTF8Encoding($false)))

Set-BridgeCurrentUserAcl $installRoot

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($startupPath)
$shortcut.TargetPath = $nodeCommand.Source
$shortcut.Arguments = "`"$hostPath`" --pairing `"$pairingPath`""
$shortcut.WorkingDirectory = $installRoot
$shortcut.WindowStyle = 7
$shortcut.Description = 'Duc Auto Gemini Loopback Bridge V1'
$shortcut.Save()

# One-click restart for the owner: double-clicking this file in the visible
# install folder brings a dead host back without hunting for commands.
$startCmd = @"
@echo off
title Duc Auto Gemini Bridge V1
echo ============================================
echo   DUC AUTO GEMINI - BRIDGE V1
echo   Cua so nay phai MO trong luc lam viec.
echo   Dong cua so = tat cau noi AI - extension.
echo ============================================
cd /d "%~dp0"
node bridge-host.mjs --pairing "%~dp0duc-auto-gemini-bridge-pairing-v1.json"
echo.
echo Bridge da dung. Nhan phim bat ky de dong.
pause >nul
"@
[IO.File]::WriteAllText((Join-Path $installRoot 'START-BRIDGE.cmd'), $startCmd, (New-Object Text.UTF8Encoding($false)))

if (-not $NoStart) {
  $hostArguments = "`"$hostPath`" --pairing `"$pairingPath`""
  Start-Process -FilePath $nodeCommand.Source -ArgumentList $hostArguments -WorkingDirectory $installRoot -WindowStyle Hidden
}

Write-Output "Installed Duc Auto Gemini Bridge V1 at $installRoot"
Write-Output "Pair the extension with: $pairingPath"
Write-Output 'No registry key or administrator permission was used.'
