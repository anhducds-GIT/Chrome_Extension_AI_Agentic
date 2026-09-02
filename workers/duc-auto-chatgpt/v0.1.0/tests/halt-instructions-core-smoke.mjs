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
assert.equal(guide.HALT_GROUPS.length, 12, "the operator guide exposes twelve distinct Halt groups");
// DETECTION_BLIND must stay a HARD STOP and must never be described as
// retryable: retrying it resends the prompt and spends real image quota while
// proving nothing (2026-08-26 -- six generations burned exactly this way).
const blind = guide.HALT_GROUPS.find((group) => group.codes.includes("DETECTION_BLIND"));
assert.ok(blind, "the guide covers DETECTION_BLIND");
assert.match(blind.retry, /^No -- hard stop/, "DETECTION_BLIND is never presented as retryable");
assert.match(blind.action, /chatgpt\.com\/c\//, "the operator is told exactly what a correct tab looks like");
assert.equal(new Set(guide.HALT_GROUPS.map((group) => group.title)).size, 12, "Halt group titles are unique");

// WRONG_SURFACE (thêm 2026-09-02). Điểm mấu chốt của mã này là nó KHÔNG tốn gì: phép kiểm
// chạy trước khi bất cứ thứ gì chạm vào trang. Nếu hướng dẫn không nói rõ điều đó, operator
// sẽ tưởng mình vừa mất một lượt sinh và ngần ngại chạy lại — đúng phản ứng sai.
const wrongSurface = guide.HALT_GROUPS.find((group) => group.codes.includes("WRONG_SURFACE"));
assert.ok(wrongSurface, "the guide covers WRONG_SURFACE");
assert.match(wrongSurface.retry, /^No -- nothing was sent/, "WRONG_SURFACE phải nói rõ là chưa gửi gì");
assert.match(wrongSurface.action, /chatgpt\.com\/c\//, "operator phải được cho biết một tab đúng trông thế nào");
assert.match(wrongSurface.meaning, /composer/i, "phải giải thích vì sao mọi phép kiểm khác vẫn xanh: trang phóng CÓ ô soạn");

// CHUỖI ĐẦY ĐỦ, không chỉ danh mục. Khai một mã lỗi mà quên luật phân loại thì lớp bảo vệ im
// lặng không chạy: thông điệp rơi xuống nhánh cuối thành "OTHER", mà OTHER thì ĐƯỢC RETRY.
// Ghim cả ba mắt xích — phân loại → hard stop → không retry — vì hỏng một mắt là hỏng cả.
{
  const thrown = new Error("WRONG_SURFACE: tab đang ở https://chatgpt.com/ — đây không phải một cuộc hội thoại.");
  assert.equal(runner.classifyFailure(thrown, "PRE_SUBMIT"), "WRONG_SURFACE",
    "thông điệp WRONG_SURFACE phải được phân loại đúng, không rơi xuống OTHER");
  assert.ok(runner.HARD_STOP_FAILURE_TYPES.has("WRONG_SURFACE"), "WRONG_SURFACE phải là hard stop");
  assert.equal(runner.canRetry({ retry_count: 0, settings: { max_retries: 3 } }, "WRONG_SURFACE"), false,
    "không được retry: mỗi lần thử lại chỉ gặp đúng cái trang phóng đó, chỉ người mới sửa được");
}

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
