import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const context = vm.createContext({ console });
for (const file of ["runner-core.js", "halt-instructions-core.js"]) {
  vm.runInContext(fs.readFileSync(new URL(file, root), "utf8"), context);
}

const guide = context.DacHaltInstructions;
const runner = context.DacRunnerCore;
// 11 tu 2026-09-07: them PROVIDER_OVERLOADED (F-35). Con so nay co y ghim cung —
// mat mot nhom la mat mot trang huong dan ma Duc doc luc dang ket, va khong gi
// khac trong suite phat hien ra.
assert.equal(guide.HALT_GROUPS.length, 11, "the operator guide exposes eleven distinct Halt groups");
assert.equal(new Set(guide.HALT_GROUPS.map((group) => group.title)).size, 11, "Halt group titles are unique");

// F-35: nha cung cap qua tai la mot loai RIENG. Gop no vao SECURITY_HARD_STOP la
// chi Duc di hoan tat CAPTCHA cho mot su co khong lien quan gi toi CAPTCHA.
const quaTai = guide.HALT_GROUPS.find((group) => group.codes.includes("PROVIDER_OVERLOADED"));
assert.ok(quaTai, "thieu nhom huong dan cho PROVIDER_OVERLOADED");
assert.deepEqual([...quaTai.codes], ["PROVIDER_OVERLOADED"], "nhom nay chi duoc mang dung ma cua no");
assert.match(quaTai.retry, /hard stop/i, "Duc chot 2026-09-07: dung han ca me, khong tu thu lai");
assert.match(quaTai.action, /KHÔNG bị trừ credit/, "phai noi ro job dung o day khong ton credit — do la cau Duc can nhat");
assert.match(quaTai.action, /KHÔNG tự thử lại|KHÔNG tự thử/, "phai noi ro may khong tu thu lai, va vi sao");
assert.doesNotMatch(quaTai.meaning, /CAPTCHA.*yêu cầu|hết credit(?!.*KHÔNG)/, "khong duoc mo ta nham sang hai loai kia");

const covered = [...guide.coveredFailureCodes()].sort();
const declared = [...runner.FAILURE_TYPES].sort();
assert.equal(covered.join("|"), declared.join("|"), "every canonical Failure Type is classified as a Halt cause or an explicit non-Halt code");
assert.equal(guide.NON_HALT_CODES.map((entry) => entry.code).join("|"), "USER_STOP|INTERRUPTED", "Stop and Interrupted are explained without mislabelling them as root Halt causes");
assert.equal(guide.SPECIAL_STATUS.code, "OUTPUT PERSISTENCE FAILED", "the Run-level artifact error is explained separately from job Failure Types");
assert.equal(guide.findInstruction("POST_SUBMIT_UNCERTAIN").title, "Post-submit uncertain", "the inline banner can resolve a canonical Halt code to its Vietnamese guidance");
assert.equal(guide.findInstruction(" post_submit_uncertain ").title, "Post-submit uncertain", "Halt lookup normalizes operator-facing codes");
assert.equal(guide.findInstruction("NOT_YET_CLASSIFIED"), guide.UNKNOWN_INSTRUCTION, "unknown Halt codes fail closed with generic Vietnamese guidance");

for (const group of guide.HALT_GROUPS) {
  assert.ok(group.codes.length, `${group.title} names at least one canonical App code`);
  assert.ok(group.meaning && group.action && group.retry, `${group.title} includes meaning, operator action and retry policy`);
}

const html = fs.readFileSync(new URL("sidepanel.html", root), "utf8");
const sidepanel = fs.readFileSync(new URL("sidepanel.js", root), "utf8");
assert.match(html, /id="haltInstructionsBtn"[^>]*>ⓘ Halt</, "the Run screen keeps Halt instructions one click away");
assert.match(html, /id="haltInstructionsDialog"/, "Halt instructions use a bounded dialog rather than expanding the dashboard");
for (const id of ["haltedCause", "haltedDetail", "haltedAction", "haltedRetry"]) {
  assert.match(html, new RegExp(`id="${id}"`), `the halted banner exposes ${id} guidance`);
}
assert.match(html, /<script src="halt-instructions-core\.js"><\/script>/, "the taxonomy loads before sidepanel rendering");
assert.match(sidepanel, /guide\.HALT_GROUPS\.length/, "the visible count is derived from the taxonomy instead of hard-coded in JS");
assert.match(sidepanel, /element\("code", "halt-code", code\)/, "canonical codes are rendered safely with textContent helpers");
assert.match(sidepanel, /els\.haltInstructionsDialog\?\.addEventListener\("cancel"/, "Escape closes the Halt guide through the reviewed dialog path");
assert.match(sidepanel, /DacHaltInstructions\?\.findInstruction\(code\)/, "the halted banner resolves the exact runtime failure code through the shared taxonomy");
assert.match(sidepanel, /`Dừng tại: \$\{item\.job\.id\}`/, "the halted banner identifies the stopped job in Vietnamese");

console.log("halt instructions core smoke tests: PASS");
