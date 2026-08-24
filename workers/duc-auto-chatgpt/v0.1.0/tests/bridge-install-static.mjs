import assert from "node:assert/strict";
import fs from "node:fs";

const root = new URL("../", import.meta.url);
const install = fs.readFileSync(new URL("scripts/Install-DucAutoChatGPTLoopbackBridgeV1.ps1", root), "utf8");
const uninstall = fs.readFileSync(new URL("scripts/Uninstall-DucAutoChatGPTLoopbackBridgeV1.ps1", root), "utf8");

assert.match(install, /New-Object byte\[\] 32/);
assert.match(install, /RandomNumberGenerator/);
assert.match(install, /SetAccessRuleProtection\(\$true, \$false\)/, "ACL inheritance is removed");
assert.match(install, /FileSystemAccessRule\(\$identity, 'FullControl'/, "only the current identity is granted access");
assert.match(install, /CreateShortcut\(\$startupPath\)/);
assert.match(install, /Start-Process[\s\S]*?-WindowStyle Hidden/);
assert.match(install, /Get-CimInstance Win32_Process[\s\S]*?escapedHostPath[\s\S]*?Stop-Process/, "install and token rotation stop only the exact installed host command line");
assert.match(install, /Existing pairing token is invalid; rerun with -RotateToken/);
assert.doesNotMatch(install, /New-ItemProperty|Set-ItemProperty|HKCU|HKLM|RunAs|Verb\s+RunAs/i, "installer uses neither registry nor elevation");
assert.doesNotMatch(install, /Write-Output[^\r\n]*token/i, "installer never prints token material");

assert.match(uninstall, /StartsWith\(\$allowedRoot/);
assert.match(uninstall, /escapedHostPath/);
assert.match(uninstall, /if \(\$KeepPairing[\s\S]*?Set-BridgeCurrentUserAcl \$installRoot/, "retained pairing stays inside a freshly enforced current-user-only ACL");
const keepPairingBranch = uninstall.slice(uninstall.indexOf("if ($KeepPairing"), uninstall.indexOf("} elseif"));
for (const installedArtifact of ["$hostPath", "$codecPath", "$cliPath"]) {
  assert.ok(keepPairingBranch.includes(`Remove-Item -LiteralPath ${installedArtifact} -Force`), `-KeepPairing removes ${installedArtifact}`);
}
assert.doesNotMatch(keepPairingBranch, /Remove-Item -LiteralPath \$pairingPath/, "-KeepPairing retains only the pairing JSON");
assert.doesNotMatch(uninstall, /HKCU|HKLM|registry|RunAs/i);

console.log("bridge install static tests: PASS");
