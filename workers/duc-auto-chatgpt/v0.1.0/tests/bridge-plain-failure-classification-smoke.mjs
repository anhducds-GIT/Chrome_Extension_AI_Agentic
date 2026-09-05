/**
 * GHIM CHO B-16 — lỗi người sửa được KHÔNG được giặt thành INTERNAL_ERROR.
 *
 * Bất biến: một Error trần mang mã lỗi mà `prepare()` ném ra (thiếu ảnh tham
 * chiếu, alias trùng, quá trần ảnh...) phải ra tới dây dưới đúng mã của nó —
 * `VALIDATION_FAILED` kèm câu chỉ đường tiếng Việt — chứ không phải
 * `INTERNAL_ERROR` với nguyên nhân thật giấu trong `details.debug` sau cái
 * công tắc Chế độ phát triển.
 *
 * Không grep mã: file này CẮT chính hàm `bridgeError()` đã ship ra khỏi
 * `sidepanel.js` rồi CHẠY nó trong `node:vm`. Nên dời lời gọi
 * `classifyPlainFailure` xuống SAU nhánh giặt trắng — bản vá còn nguyên chữ mà
 * chết hẳn về hành vi — vẫn làm test đỏ. Phép kiểm tĩnh không bắt được cái đó,
 * và ba phép kiểm tĩnh của gói này đã để một lỗi sống 8 tuần.
 *
 * `sidepanel.js` là file CRLF. Cắt bằng anchor `^`/`$` trên file CRLF sẽ báo
 * "không khớp" trông y hệt "không có gì để sửa", nên ở đây chuẩn hoá xuống LF
 * trước, và ĐẾM số lần khớp rồi dừng hẳn nếu bằng 0.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
await import(pathToFileURL(path.join(here, "..", "bridge-core.js")));
await import(pathToFileURL(path.join(here, "..", "bridge-proposal-core.js")));
const core = globalThis.DacBridgeCore;
const proposalCore = globalThis.DacBridgeProposalCore;

/* ---- phần 1: hợp đồng thuần của classifyPlainFailure ---- */

const OWNER_FIXABLE = [
  ["MISSING_REFERENCE: Q001 requires 'REF-A-RED-CIRCLE.png'.", "references.add"],
  ["AMBIGUOUS_REFERENCE: Q001 requires 'REF.png'.", "alias"],
  ["DUPLICATE_REFERENCE: Q001 requests the same file more than once.", "trùng"],
  ["DUPLICATE_ALIAS: 'red'.", "alias"],
  ["MAX_INPUT_IMAGES: Q001 requests 11, limit is 10.", "max_input_images"],
  ["INVALID_TASK_TYPE: Q001 must use image_generation or text_reasoning.", "task_type"]
];

for (const [message, guidanceNeedle] of OWNER_FIXABLE) {
  const mapped = core.classifyPlainFailure(new Error(message));
  assert.ok(mapped, `${message.split(":")[0]} phải được nhận ra, không rơi vào nhánh giặt trắng`);
  assert.equal(mapped.code, "VALIDATION_FAILED");
  assert.ok(mapped.message.includes(message), "nguyên nhân thật phải còn nguyên trong message, không chỉ trong details.debug");
  assert.ok(mapped.message.includes(guidanceNeedle), `${message.split(":")[0]} phải kèm câu chỉ đường sửa được`);
  // Luật an toàn mục 2 (retry) không được đổi kèm: INTERNAL_ERROR và
  // VALIDATION_FAILED đều retryable:false, nên bản vá này chỉ đổi mã.
  assert.equal(mapped.retryable, false, "bản vá đổi MÃ, không đổi luật retry");
}

// Lỗi lạ vẫn phải là lỗi lạ. Luật "cứ CHỮ_HOA: là lỗi người sửa được" sẽ gắn
// nhãn sai cho bug nội bộ thật và đẩy chữ nội bộ tuỳ ý ra dây.
for (const stranger of [
  new Error("TypeError: cannot read properties of undefined"),
  new Error("SOMETHING_ELSE: an internal invariant broke"),
  new Error("no colon at all"),
  new Error(": leading colon"),
  // Đã mang mã rồi thì thôi — nếu không, gọi hai lần là dán câu chỉ đường hai
  // lần vào cùng một message.
  new core.BridgeProtocolError("VALIDATION_FAILED", "MISSING_REFERENCE: Q001 requires 'REF.png'.")
]) {
  assert.equal(core.classifyPlainFailure(stranger), null, `"${stranger.message}" phải giữ nguyên đường cũ`);
}

/* ---- phần 2: chạy chính hàm bridgeError() đã ship ---- */

const source = fs.readFileSync(path.join(here, "..", "sidepanel.js"), "utf8").split("\r\n").join("\n");
const START = "\n  function bridgeError(error) {\n";
const matches = source.split(START).length - 1;
assert.equal(matches, 1, "cắt được ĐÚNG một hàm bridgeError() — 0 nghĩa là anchor hỏng, không phải 'không có gì để sửa'");
const from = source.indexOf(START) + 1;
const END = "\n  }\n";
const to = source.indexOf(END, from);
assert.ok(to > from, "không tìm thấy chỗ đóng hàm bridgeError()");
const shipped = source.slice(from, to + END.length);
assert.ok(shipped.includes("INTERNAL_ERROR"), "cắt nhầm khối: hàm bridgeError() phải chứa nhánh INTERNAL_ERROR");

function runShipped({ bridgeDevMode }) {
  const context = vm.createContext({
    window: { DacBridgeCore: core, DacBridgeProposalCore: proposalCore },
    state: { bridgeDevMode },
    console: { error() {} }
  });
  vm.runInContext(`${shipped}\nglobalThis.__bridgeError = bridgeError;`, context);
  return context.__bridgeError;
}

for (const bridgeDevMode of [false, true]) {
  const bridgeError = runShipped({ bridgeDevMode });

  // Cái bắt được live 2026-08-26. Phải đúng CẢ HAI trạng thái công tắc: bản
  // vá chỉ chạy khi Chế độ phát triển BẬT là không vá gì cả — người vận hành
  // thật chạy với công tắc TẮT.
  const missing = bridgeError(new Error("MISSING_REFERENCE: Q001 requires 'REF-A-RED-CIRCLE.png'."));
  assert.equal(missing.code, "VALIDATION_FAILED", `dev_mode=${bridgeDevMode}: MISSING_REFERENCE không bao giờ được thành INTERNAL_ERROR`);
  assert.ok(missing.message.includes("REF-A-RED-CIRCLE.png"), `dev_mode=${bridgeDevMode}: tên file thiếu phải hiện trên dây`);
  assert.ok(missing.message.includes("references.add"), `dev_mode=${bridgeDevMode}: phải chỉ đường sửa`);
  assert.equal(missing.retryable, false);

  // Lớp cũ không được yếu đi.
  const known = bridgeError(new core.BridgeProtocolError("WORKBOOK_NOT_LOADED"));
  assert.equal(known.code, "WORKBOOK_NOT_LOADED", `dev_mode=${bridgeDevMode}: BridgeProtocolError vẫn đi thẳng`);

  const proposal = bridgeError(new proposalCore.ProposalError("PROPOSAL_EXPIRED", "gone"));
  assert.equal(proposal.code, "PROPOSAL_EXPIRED", `dev_mode=${bridgeDevMode}: ProposalError vẫn được chuyển mã`);

  const stranger = bridgeError(new Error("SOMETHING_ELSE: an internal invariant broke"));
  if (bridgeDevMode) {
    assert.equal(stranger.code, "INTERNAL_ERROR", "dev_mode=true: lỗi lạ vẫn là INTERNAL_ERROR");
    assert.ok(stranger.details.debug, "dev_mode=true: lỗi lạ vẫn kèm details.debug như cũ");
  } else {
    assert.ok(!(stranger instanceof core.BridgeProtocolError), "dev_mode=false: lỗi lạ vẫn trả về nguyên Error như cũ");
  }
}

console.log("bridge plain failure classification smoke tests: PASS");
