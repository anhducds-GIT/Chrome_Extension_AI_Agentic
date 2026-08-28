import assert from "node:assert/strict";
import fs from "node:fs";

const root = new URL("../", import.meta.url);
const install = fs.readFileSync(new URL("scripts/Install-DucAutoChatGPTLoopbackBridgeV1.ps1", root), "utf8");
const uninstall = fs.readFileSync(new URL("scripts/Uninstall-DucAutoChatGPTLoopbackBridgeV1.ps1", root), "utf8");

assert.match(install, /New-Object byte\[\] 32/);
assert.match(install, /RandomNumberGenerator/);
assert.match(install, /icacls \$Path \/inheritance:r/, "ACL inheritance is removed");
assert.match(install, /\/grant:r "\$\{identity\}:\(OI\)\(CI\)F"/, "only the current identity is granted access");
assert.match(install, /if \(\$LASTEXITCODE -ne 0\)[\s\S]*?throw/, "icacls failure is not silently ignored");
assert.match(install, /CreateShortcut\(\$startupPath\)/);
assert.match(install, /Start-Process[\s\S]*?-WindowStyle Hidden/);
assert.match(install, /Get-CimInstance Win32_Process[\s\S]*?escapedHostPath[\s\S]*?Stop-Process/, "install and token rotation stop only the exact installed host command line");
assert.match(install, /Existing pairing token is invalid; rerun with -RotateToken/);
assert.doesNotMatch(install, /New-ItemProperty|Set-ItemProperty|HKCU|HKLM|RunAs|Verb\s+RunAs/i, "installer uses neither registry nor elevation");
assert.doesNotMatch(install, /Write-Output[^\r\n]*token/i, "installer never prints token material");

assert.match(uninstall, /icacls \$Path \/inheritance:r/, "uninstall's -KeepPairing re-lock uses the same icacls-based ACL helper, not the buggy Set-Acl pattern");
assert.match(uninstall, /StartsWith\(\$allowedRoot/);
assert.match(uninstall, /escapedHostPath/);
assert.match(uninstall, /if \(\$KeepPairing[\s\S]*?Set-BridgeCurrentUserAcl \$installRoot/, "retained pairing stays inside a freshly enforced current-user-only ACL");
const keepPairingBranch = uninstall.slice(uninstall.indexOf("if ($KeepPairing"), uninstall.indexOf("} elseif"));
for (const installedArtifact of ["$hostPath", "$codecPath", "$cliPath"]) {
  assert.ok(keepPairingBranch.includes(`Remove-Item -LiteralPath ${installedArtifact} -Force`), `-KeepPairing removes ${installedArtifact}`);
}
assert.doesNotMatch(keepPairingBranch, /Remove-Item -LiteralPath \$pairingPath/, "-KeepPairing retains only the pairing JSON");
assert.doesNotMatch(uninstall, /HKCU|HKLM|registry|RunAs/i);

// --- the Gemini variant must install where the live host actually lives ---
// The host was gathered under one parent folder on 2026-08-27 while these defaults kept
// pointing at the vacated folder: a rerun would have installed a second host beside the
// live one, and the uninstaller would have reported success while deleting nothing.
const CANONICAL_GEMINI_ROOT = "C:\\WORKING ZONE\\Chrome Extension Bridge\\duc-auto-gemini";
const geminiInstall = fs.readFileSync(new URL("scripts/Install-DucAutoGeminiBridgeV1.ps1", root), "utf8");
const geminiUninstall = fs.readFileSync(new URL("scripts/Uninstall-DucAutoGeminiBridgeV1.ps1", root), "utf8");

// The install root is not overridable: an -InstallRoot switch put hosts where the uninstaller
// could not reach them, while the uninstaller still reported success.
assert.doesNotMatch(geminiInstall, /\$InstallRoot/, "the installer takes no install-root override");
const declaredRoots = [
  ...geminiInstall.matchAll(/\$installRoot = \[IO\.Path\]::GetFullPath\('([^']+)'\)/g),
  ...geminiUninstall.matchAll(/\$(?:installRoot|allowedRoot) = \[IO\.Path\]::GetFullPath\('([^']+)'\)/g)
].map((match) => match[1]);
assert.equal(declaredRoots.length, 3, "install root, uninstall target and uninstall delete-guard are each declared once");
for (const declaredRoot of declaredRoots) {
  assert.equal(declaredRoot, CANONICAL_GEMINI_ROOT, "every declared root is the one canonical root");
}
const geminiInstallRoot = declaredRoots[0];
assert.equal(geminiInstall.includes("Duc-Auto-Gemini-Bridge"), false, "no vacated install root survives in the installer");
assert.equal(geminiUninstall.includes("Duc-Auto-Gemini-Bridge"), false, "no vacated install root survives in the uninstaller");

// The two bridges share a machine, so their roots, ports and pairing files must stay apart.
const chatgptInstallRoot = install.match(/\[string\]\$InstallRoot = '([^']+)'/)?.[1];
assert.notEqual(geminiInstallRoot, chatgptInstallRoot, "the Gemini host never installs over the ChatGPT host");
assert.match(geminiInstall, /\$Port = 32148/, "the Gemini default port stays off the ChatGPT port");
assert.match(geminiInstall, /duc-auto-gemini-bridge-pairing-v1\.json/, "the Gemini pairing file keeps its own name");
assert.doesNotMatch(geminiInstall, /Write-Output[^\r\n]*token/i, "the Gemini installer never prints token material");

console.log("bridge install static tests: PASS");
