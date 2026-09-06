// F-35 — Flow báo quá tải: đọc chữ TRƯỚC khi gõ, và dừng hẳn cả mẻ.
//
// Đo thật 2026-09-07 trên `flow.google.com`, nguyên văn Đức đọc trên trang:
//   "Flow is currently experiencing high demand, affecting video generation.
//    Requests may need to be retried at a later time."
//
// Kiểm bằng máy cùng ngày: `securityBlockerPattern` KHÔNG khớp, và
// `matchesGenerationLimit` cũng KHÔNG khớp. Nên trước bản vá này runner coi
// trang hoàn toàn bình thường — nó gõ, nó bấm Create (CREDIT TIÊU NGAY TẠI ĐÓ),
// rồi ngồi hết trần chờ một video có thể không bao giờ tới.
//
// Đây là loại trạng thái thứ BA, và là loại duy nhất trong ba loại mà "cứ thử
// đi" tốn tiền thật. Hai loại kia đều dừng trước khi gõ nên hỏng thì 0 credit.
//
// Đức chốt 2026-09-07: **dừng hẳn cả mẻ, không tự thử lại.**
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const load = (ten) => {
  const ctx = { window: {}, URL };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(new URL("../" + ten, import.meta.url), "utf8"), ctx);
  return ctx.window;
};
const ADAPTER = load("provider-adapter.js").DacProviderAdapter;
const RUNNER = load("runner-core.js").DacRunnerCore;
const GUIDE = load("halt-instructions-core.js").DacHaltInstructions;
const content = fs.readFileSync(new URL("../content.js", import.meta.url), "utf8");

/* ---- 1. Bộ dò: khớp câu thật, từ chối câu gần giống ---------------------- */

const CAU_THAT = "Flow is currently experiencing high demand, affecting video generation. Requests may need to be retried at a later time.";
assert.equal(ADAPTER.matchesProviderOverload(CAU_THAT), true, "phải khớp câu đã đo trên trang");

// Khớp theo CỤM ĐẶC TRƯNG, không theo cả câu: bài học F-11 là khớp chính xác cả
// chuỗi thì một chữ đổi là trượt sạch.
assert.equal(ADAPTER.matchesProviderOverload("Flow is experiencing high demand right now."), true,
  "câu ngắn hơn nhưng cùng cụm đặc trưng vẫn phải khớp — nếu không thì một chữ đổi là trượt");


// Biểu thức có HAI nhánh, và nhánh thứ hai phải được canh riêng. Đo bằng đột
// biến 2026-09-07: phá riêng nhánh hai mà suite vẫn xanh, vì mọi ca lúc đó đều
// bị nhánh một bắt trước. Một nhánh không ai canh là một nhánh không ai biết đã
// hỏng — nó chỉ lộ ra đúng hôm Google đổi chữ đầu câu, tức đúng hôm cần nó nhất.
const CHI_NHANH_HAI = "Due to high demand, affecting video generation, please retry later.";
assert.equal(ADAPTER.matchesProviderOverload(CHI_NHANH_HAI), true,
  "nhánh dự phòng phải bắt được câu không mang chữ của nhánh một");
assert.equal(/experiencing high demand/i.test(CHI_NHANH_HAI), false,
  "ca này phải nằm NGOÀI tầm nhánh một, nếu không nó không canh được nhánh hai");
for (const cau of [
  "high demand",                                  // hai chữ trần: quá thường
  "This product is in high demand among creators.",
  "You have reached your daily limit.",           // hết hạn mức, loại khác
  "Please complete the CAPTCHA.",                 // bảo mật, loại khác
  "",
]) {
  assert.equal(ADAPTER.matchesProviderOverload(cau), false,
    `báo động giả ở đây làm Đức mất một mẻ chạy: ${JSON.stringify(cau)}`);
}

// Hai lớp kia KHÔNG được nuốt câu này — nuốt là chẩn đoán sai loại, và bảng
// hướng dẫn sẽ chỉ Đức đi làm một việc không liên quan.
assert.equal(ADAPTER.securityBlockerPattern.test(CAU_THAT.toLowerCase()), false,
  "câu quá tải không được rơi vào nhánh bảo mật");
assert.equal(ADAPTER.matchesGenerationLimit(CAU_THAT), false,
  "câu quá tải không được rơi vào nhánh hết hạn mức");

/* ---- 2. Cổng chặn nằm ĐÚNG hai chỗ ------------------------------------- */

const soLan = content.split("providerOverloadText()").length - 1;
assert.ok(soLan >= 3, `phải gọi bộ dò ở cổng trước-khi-gõ, ở vòng chờ, và ở dom_probe — mới thấy ${soLan} chỗ`);

const congGui = content.slice(content.indexOf("async function waitForChatReady"), content.indexOf("async function waitForChatReady") + 3000);
assert.ok(congGui.includes("providerOverloadText()"),
  "cổng sẵn sàng phải kiểm TRƯỚC khi gõ — đó là chỗ duy nhất credit chưa tiêu");

const vongCho = content.slice(content.indexOf("async function waitForVideoCompletion"), content.indexOf("async function waitForVideoCompletion") + 2000);
assert.ok(vongCho.includes("providerOverloadText()"),
  "vòng chờ cũng phải kiểm: credit tiêu rồi thì việc còn lại là nói đúng sự thật, thay vì ngồi hết trần rồi bảo 'không thấy đầu ra'");

assert.ok(content.includes("providerOverloadBlocker: providerOverloadText()"),
  "dom_probe phải khai trạng thái này, nếu không thì không chẩn đoán được từ xa");

/* ---- 3. LUẬT F-20: câu ném quyết định hành vi retry --------------------- */

assert.equal(RUNNER.classifyFailure("OVERLOAD_STOP: Flow provider overload notice detected."), "PROVIDER_OVERLOADED",
  "câu ném phải cho ra đúng loại — sửa lời văn ở đây LÀ sửa hành vi retry");
assert.equal(RUNNER.classifyFailure("Flow is currently experiencing high demand"), "PROVIDER_OVERLOADED",
  "nhận cả khi câu gốc của trang lọt thẳng vào lời báo lỗi");
// Hai câu của hai loại kia phải giữ nguyên phán quyết cũ.
assert.equal(RUNNER.classifyFailure("HARD_STOP: Flow security/interstitial blocker detected."), "SECURITY_HARD_STOP");
assert.equal(RUNNER.classifyFailure("LIMIT_STOP: out of credits"), "GENERATION_LIMIT_REACHED");

/* ---- 4. Chốt của Đức: dừng hẳn, KHÔNG tự thử lại ----------------------- */

assert.ok(RUNNER.FAILURE_TYPES.has("PROVIDER_OVERLOADED"), "phải là một loại thất bại chính danh");
const item = { retry_count: 0, settings: { max_retries: 5 } };
assert.equal(RUNNER.canRetry(item, "PROVIDER_OVERLOADED"), false,
  "Đức chốt 2026-09-07: dừng hẳn cả mẻ, KHÔNG tự thử lại — mỗi lượt thử đều đi qua cú bấm Create");
// Đối chứng: một loại thường thì vẫn được thử lại, để chắc phép trên không xanh vì lý do khác.
assert.equal(RUNNER.canRetry(item, "OTHER"), true, "phép đối chứng: loại thường vẫn thử lại được");

const nhom = GUIDE.HALT_GROUPS.find((g) => g.codes.includes("PROVIDER_OVERLOADED"));
assert.ok(nhom, "phải có trang hướng dẫn cho Đức đọc lúc đang kẹt");
assert.match(nhom.action, /KHÔNG bị trừ credit/, "câu Đức cần nhất: job dừng ở đây không tốn gì");

console.log("provider-overload-gate: OK");
