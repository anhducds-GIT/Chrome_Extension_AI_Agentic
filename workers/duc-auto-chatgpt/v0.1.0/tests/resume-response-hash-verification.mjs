// Test ghim B-23: `response_sha256` phải được KIỂM, không chỉ được GHI.
//
// Lỗ gốc (Pass B độc lập 28/08, F-1, đã đọc lại bằng mắt trong code): nhánh
// `text_reasoning` của `validSavedAttribution` chỉ so HÌNH DẠNG chuỗi hash
// (`/^sha256:[A-Za-z0-9_-]{20,}$/`), không hề băm lại `response_text` để đối
// chiếu. Mở Result XLSX bằng Excel, sửa một chữ trong ô câu trả lời mà GIỮ
// NGUYÊN số ký tự, hàng đó vẫn được xếp SAFE_COMPLETE và bị bỏ qua khi chạy
// tiếp. Dấu vân tay nằm đó như một con số trang trí.
//
// File này KHÔNG soi mã nguồn cho phần hành vi — nó nạp resume-core.js THẬT và
// bridge-core.js THẬT vào một sandbox vm rồi CHẠY, với `crypto` WebCrypto thật
// của Node. Hàm băm đem đi đối chiếu là CHÍNH `DacBridgeCore.hashText`, tức
// đúng hàm đã ghi dấu lúc chạy — băm bằng một hàm khác thì phép so vô nghĩa,
// nên chỗ này không được thay bằng một bản chép trong test.
//
// Chỉ nhóm 6 (dây nối trong sidepanel.js) là soi tĩnh: side panel không nạp nổi
// vào Node bằng một harness nhỏ.

import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { webcrypto } from "node:crypto";

const root = new URL("../", import.meta.url);
const context = vm.createContext({ console, crypto: webcrypto, TextEncoder, TextDecoder });
for (const file of ["bridge-core.js", "checkpoint-core.js", "resume-core.js"]) {
  vm.runInContext(fs.readFileSync(new URL(file, root), "utf8"), context, { filename: file });
}
const resume = context.DacResumeCore;
const hashText = context.DacBridgeCore.hashText;

let passed = 0;
const ok = (name) => { passed += 1; console.log(`  ok  ${name}`); };

// Đối tượng sinh RA TRONG sandbox vm mang Object.prototype của sandbox, nên
// deepStrictEqual trượt vì khác prototype dù mọi trường giống hệt — một lần
// "đỏ" hoàn toàn vô nghĩa. So từng số một, thẳng thắn hơn và đọc rõ hơn.
function sameReport(report, expected, message) {
  assert.deepEqual({ checked: report.checked, matched: report.matched, mismatched: report.mismatched }, expected, message);
}

const GOOD = "Câu trả lời thật của ChatGPT, tiếng Việt còn nguyên dấu.";
// Sửa ĐÚNG một chữ, GIỮ NGUYÊN số ký tự — đây chính là ca mà response_char_count
// không bắt được, và là lý do tồn tại của dấu vân tay.
const TAMPERED_SAME_LENGTH = GOOD.replace("thật", "thất");
assert.equal(TAMPERED_SAME_LENGTH.length, GOOD.length, "ca thử phải giữ nguyên độ dài, nếu không nó chỉ đang thử lại response_char_count");
assert.notEqual(TAMPERED_SAME_LENGTH, GOOD, "ca thử phải thật sự khác chữ");

const goodHash = await hashText(GOOD);
assert.match(goodHash, /^sha256:[A-Za-z0-9_-]{20,}$/, "dấu vân tay thật phải đúng hình dạng mà phép kiểm cũ đòi — nếu không, ca 'lệch' bên dưới trượt vì lý do sai");

function textJob(id, response, recordedHash, extra = {}) {
  return {
    id,
    prompt: "p",
    task_type: "text_reasoning",
    status: "SUCCESS",
    persistence_verified: "true",
    output_type: "text",
    response_text: response,
    response_char_count: String(response.length),
    response_sha256: recordedHash,
    ...extra
  };
}

function workbook(jobs) {
  return { fileName: "run__results.xlsx", config: { run_id: "20260905-0000-run" }, jobs };
}

function stateOf(plan, id) { return plan.jobs.find((item) => item.job_id === id); }

/* ---- 1. Băm lại: khớp thì đạt, lệch thì trượt --------------------------- */
{
  const wb = workbook([
    textJob("SACH", GOOD, goodHash),
    textJob("BI-SUA", TAMPERED_SAME_LENGTH, goodHash),
    { id: "ANH", prompt: "p", status: "SUCCESS", persistence_verified: "true", result_file: "ANH.png", requested_file: "ANH.png" }
  ]);

  // Phép kiểm hình dạng cũ KHÔNG phân biệt được hai hàng text này — chứng minh
  // ngay tại đây, để ca sau không "xanh oan" vì một lý do khác.
  assert.equal(resume.validSavedAttribution(wb.jobs[0]), true);
  assert.equal(resume.validSavedAttribution(wb.jobs[1]), true, "chỉ so hình dạng thì ô đã bị sửa vẫn qua — đúng lỗ B-23 mô tả");

  const report = await resume.verifyResponseHashes(wb, hashText);
  sameReport(report, { checked: 2, matched: 1, mismatched: 1 }, "chỉ hai hàng text có dấu được băm; hàng ảnh không đụng tới");

  const plan = resume.plan(wb);
  assert.equal(stateOf(plan, "SACH").state, "SAFE_COMPLETE", "hàng còn nguyên vẹn vẫn được bỏ qua như trước — bản vá không được làm hỏng đường đi bình thường");
  assert.equal(stateOf(plan, "BI-SUA").state, "AMBIGUOUS_SUBMITTED", "hàng bị sửa không còn được xếp SAFE_COMPLETE");
  assert.equal(stateOf(plan, "BI-SUA").code, "RESUME_RESPONSE_HASH_MISMATCH", "mã lỗi phải RIÊNG: gộp vào AMBIGUOUS chung chung thì người đọc tưởng job bị ngắt giữa chừng");
  assert.equal(stateOf(plan, "ANH").state, "SAFE_COMPLETE", "job ảnh không đi qua nhánh text — không được vạ lây");
  assert.equal(plan.ready, false, "kế hoạch có hàng bị sửa thì KHÔNG được sẵn sàng chạy tiếp");
  assert.ok(plan.findings.some((f) => f.code === "RESUME_RESPONSE_HASH_MISMATCH" && f.severity === "BLOCKER" && f.job_ids?.includes("BI-SUA")),
    "phải có một finding BLOCKER nêu đích danh job bị sửa — chặn mà không nói tên thì người vận hành không sửa được");
  ok("băm lại đối chiếu thật: ô bị sửa cùng độ dài bị bắt, ô nguyên vẹn vẫn qua, job ảnh không vạ lây");
}

/* ---- 2. Phán quyết không nằm trên job, nên không tự cấp được ------------ */
// Nếu phán quyết là một TRƯỜNG trên job thì codec có thể ghi ngược nó ra XLSX,
// và người sửa file chỉ cần thêm một cột để tự cấp cho mình một dấu đạt — đúng
// cái việc phép kiểm này sinh ra để chặn.
{
  const wb = workbook([
    textJob("GIA-MAO", TAMPERED_SAME_LENGTH, goodHash, {
      hash_verdict: true, response_hash_check: "MATCH", hashVerdict: true, verified: "true"
    })
  ]);
  await resume.verifyResponseHashes(wb, hashText);
  const plan = resume.plan(wb);
  assert.equal(stateOf(plan, "GIA-MAO").code, "RESUME_RESPONSE_HASH_MISMATCH", "không cột nào trong workbook được phép tự cấp dấu đạt cho chính nó");
  ok("phán quyết sống ngoài workbook: thêm cột 'đã kiểm' vào XLSX không mua được SAFE_COMPLETE");
}

/* ---- 3. Hàng thiếu dấu: đã trượt sẵn, và không bị đếm là đã băm ---------- */
{
  const wb = workbook([textJob("KHONG-DAU", GOOD, "")]);
  const report = await resume.verifyResponseHashes(wb, hashText);
  sameReport(report, { checked: 0, matched: 0, mismatched: 0 }, "hàng không có dấu thì không có gì để đối chiếu — đừng báo là đã kiểm");
  assert.equal(resume.plan(wb).jobs[0].state, "AMBIGUOUS_SUBMITTED", "thiếu dấu vẫn trượt như trước (phép kiểm hình dạng cũ), không phải bước lùi");
  ok("hàng thiếu response_sha256 vẫn trượt, và không bị khai khống là đã kiểm");
}

/* ---- 4. Sửa làm ĐỔI độ dài: lớp cũ vẫn phải bắt, không được nới --------- */
{
  const shorter = GOOD.slice(0, GOOD.length - 5);
  const wb = workbook([{ ...textJob("NGAN-DI", shorter, goodHash), response_char_count: String(GOOD.length) }]);
  await resume.verifyResponseHashes(wb, hashText);
  assert.equal(resume.plan(wb).jobs[0].state, "AMBIGUOUS_SUBMITTED", "đếm ký tự vẫn phải là một lớp riêng — bản vá này thêm lớp, không thay lớp");
  ok("phép đếm ký tự cũ không bị nới ra để nhường chỗ cho phép băm mới");
}

/* ---- 5. Hàm băm phải được TIÊM VÀO, không tự chế ------------------------ */
{
  // So theo TÊN chứ không theo constructor: lỗi ném ra từ trong sandbox vm là
  // TypeError CỦA SANDBOX, không phải của tiến trình này, nên `rejects(..., TypeError)`
  // trượt vì một lý do chẳng liên quan gì tới bản vá.
  await assert.rejects(
    () => resume.verifyResponseHashes(workbook([textJob("X", GOOD, goodHash)])),
    (error) => error?.name === "TypeError" && /hash callback is required/i.test(error.message),
    "thiếu hàm băm thì phải nổ, không được lặng lẽ bỏ qua phép kiểm"
  );
  // Và hàm băm thật phải là hàm ĐÃ GHI dấu: đối chiếu ngược lại chính
  // DacBridgeCore.hashText mà runner dùng lúc ghi (text-output-core nhận nó
  // qua verifiedTextTransition). Nếu hai bên lệch nhau thì mọi hàng đều báo
  // lệch, và bản vá này biến thành một cái cửa chặn oan.
  vm.runInContext(fs.readFileSync(new URL("text-output-core.js", root), "utf8"), context, { filename: "text-output-core.js" });
  const captured = context.DacTextOutputCore.capture({ type: "text", text: GOOD });
  const written = context.DacTextOutputCore.ledgerFields(captured, await hashText(captured.response_text));
  const wb = workbook([{ id: "VONG-TRON", prompt: "p", status: "SUCCESS", ...written, persistence_verified: "true" }]);
  const report = await resume.verifyResponseHashes(wb, hashText);
  sameReport(report, { checked: 1, matched: 1, mismatched: 0 }, "hàng do CHÍNH đường ghi text sinh ra phải tự khớp — nếu không, cửa mới chặn oan mọi run thật");
  assert.equal(resume.plan(wb).jobs[0].state, "SAFE_COMPLETE");
  ok("vòng tròn khép: hàng do đường ghi thật sinh ra khớp dấu, và hàm băm là hàm được tiêm vào");
}

/* ---- 6. Dây nối: cửa bắt buộc nằm TRƯỚC phép kiểm blocker --------------- */
{
  const sidepanel = fs.readFileSync(new URL("sidepanel.js", root), "utf8");
  const start = sidepanel.indexOf("async function authoritativeValidate(");
  assert.notEqual(start, -1, "không tìm thấy authoritativeValidate()");
  const body = sidepanel.slice(start, sidepanel.indexOf("\n  async function ", start + 1))
    .split("\n").filter((line) => !line.trim().startsWith("//")).join("\n");
  const iVerify = body.indexOf("verifyResponseHashes(state.workbook, window.DacBridgeCore.hashText)");
  const iReplan = body.indexOf("state.resumePlan = window.DacResumeCore.plan(state.workbook)");
  const iBlocked = body.indexOf("RESUME_BLOCKED");
  const iApply = body.indexOf("applyToQueue(state.prepared.queue");
  assert.notEqual(iVerify, -1, "authoritativeValidate() phải băm lại bằng CHÍNH DacBridgeCore.hashText — cửa duy nhất mọi đường chạy đi qua");
  assert.notEqual(iReplan, -1, "băm xong phải dựng lại kế hoạch, nếu không phán quyết mới không tới được findings");
  assert.notEqual(iBlocked, -1, "không tìm thấy cửa RESUME_BLOCKED");
  assert.notEqual(iApply, -1, "không tìm thấy chỗ áp kế hoạch vào hàng đợi");
  assert.ok(iVerify < iReplan, "phải băm TRƯỚC rồi mới dựng kế hoạch — ngược lại là dựng kế hoạch trên phán quyết cũ");
  assert.ok(iReplan < iBlocked, "kế hoạch mới phải có TRƯỚC phép kiểm blocker, nếu không blocker đọc bản kế hoạch cũ");
  assert.ok(iBlocked < iApply, "chặn xong mới áp vào hàng đợi — không được áp rồi mới chặn");
  ok("dây nối: băm lại → dựng lại kế hoạch → cửa RESUME_BLOCKED → áp vào hàng đợi, đúng thứ tự đó");
}

console.log(`PASS resume response hash verification: ${passed}/6 nhóm — response_sha256 nay được ĐỌC, không chỉ được GHI`);
