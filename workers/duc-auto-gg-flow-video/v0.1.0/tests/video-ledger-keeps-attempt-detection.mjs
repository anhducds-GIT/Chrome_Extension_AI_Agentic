// Sổ cái nhánh VIDEO không được xoá chẩn đoán tiền-submit (F-21).
//
// Vì sao ghim — đo thật, lượt live F4R3 ngày 02/09, sau khi đã tiêu 15 credit:
// `detection_diagnostics` được ghi HAI LẦN cho cùng một lượt. Lần đầu là
// `applyAttemptTelemetry` (sidepanel.js), mang theo mọi thứ xác lập TRƯỚC cổng
// gửi — `typing_path`, `attach`, các số đo composer. Lần sau là chỗ ghi kết quả
// video, và nó **ghi thay trắng**. Nên sổ cái trả về `undefined` cho tất cả,
// kể cả `attach` vốn đã nằm trong CARRIED_DIAGNOSTICS từ lâu.
//
// Đây là loại lỗi mà suite KHÔNG bắt được và audit đọc diff cũng không: nó nằm ở
// THỨ TỰ hai lần ghi vào cùng một ô, và chỉ một lượt chạy thật mới lộ. Cùng họ
// với ca `attach` năm 26/08 đã ghi trong `attach-path-recorded-static.mjs`.
//
// Ghim hai tầng, vì hai tầng hỏng theo hai kiểu khác nhau:
//   1. HÀNH VI của `mergeDetection` — nó có thật sự giữ lại bản cũ không.
//   2. DÂY NỐI ở sidepanel — nhánh video có thật sự GỌI nó không. Bài học đã trả
//      giá: mutation phá bên trong validator thì suite đỏ, nhưng xoá đúng LỜI GỌI
//      thì suite vẫn xanh.
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

function load(name, globalName) {
  const context = {};
  vm.runInNewContext(fs.readFileSync(new URL(`../${name}`, import.meta.url), "utf8"), context);
  return context[globalName];
}

const TELEMETRY = load("attempt-telemetry-core.js", "DacAttemptTelemetry");
const panel = fs.readFileSync(new URL("../sidepanel.js", import.meta.url), "utf8");

/* ---- 1. hành vi ---------------------------------------------------------- */

assert.ok(TELEMETRY.mergeDetection, "mergeDetection phải tồn tại");

// Ca thật của F-21: lần ghi đầu có typing_path + attach, lần ghi sau là kết quả video.
const first = JSON.stringify({ typing_path: "input_events", typing_ok: true, composer_len_before_typing: 28, attach: null, decision_reason: "PENDING" });
const merged = JSON.parse(TELEMETRY.mergeDetection(first, { candidate_video_ids: ["v1"], video_id: "v1", decision_reason: null }));
assert.equal(merged.typing_path, "input_events", "chẩn đoán tiền-submit phải sống sót qua lần ghi kết quả — đây chính là F-21");
assert.equal(merged.composer_len_before_typing, 28, "số đo composer phải sống sót");
assert.ok("attach" in merged, "attach phải sống sót");
assert.deepEqual(merged.candidate_video_ids, ["v1"], "trường của lần ghi sau phải có mặt");
assert.equal(merged.video_id, "v1");
// Lần ghi sau THẮNG khi trùng khoá: nó mới hơn và nó là kết quả đã chốt.
assert.equal(merged.decision_reason, null, "trùng khoá thì giá trị mới phải đè lên giá trị cũ");

// Không bao giờ được ném, và không được nuốt mất dữ liệu mới.
for (const broken of ["", null, undefined, "{khong phai json}", "[1,2,3]", '"chuoi"', "12"]) {
  const out = TELEMETRY.mergeDetection(broken, { video_id: "v2" });
  assert.equal(JSON.parse(out).video_id, "v2", `bản cũ hỏng (${JSON.stringify(broken)}) không được làm mất trường mới`);
}
// Mảng KHÔNG được trải thành các khoá "0","1","2".
assert.deepEqual(Object.keys(JSON.parse(TELEMETRY.mergeDetection("[1,2,3]", { video_id: "v2" }))), ["video_id"], "bản cũ là mảng thì bỏ qua, không trải chỉ số thành khoá");

/* ---- 2. dây nối ---------------------------------------------------------- */

const videoWrite = panel.match(/write_outcome: "url_recorded", detection_diagnostics: ([^\n]*?)\}\) \}\);/);
assert.ok(videoWrite, "không tìm thấy lần ghi sổ cái của nhánh video");
assert.match(videoWrite[1], /DacAttemptTelemetry\.mergeDetection\(item\.detection_diagnostics,/, "nhánh video phải TRỘN với bản đã ghi, không được JSON.stringify thẳng đè lên");
assert.ok(!/write_outcome: "url_recorded", detection_diagnostics: JSON\.stringify\(/.test(panel), "nhánh video không được quay lại lối ghi thay trắng");

// Thứ tự CHẠY vẫn phải là: applyAttemptTelemetry ghi TRƯỚC, rồi finishDetectedOutput
// chồng lên. Đảo lại thì bản trộn cũng vô nghĩa vì chưa có gì để mà giữ.
//
// Đo theo LỜI GỌI, không theo vị trí định nghĩa hàm trong file: `finishDetectedOutput`
// được định nghĩa ở trên vòng lặp gọi nó, nên so vị trí định nghĩa cho kết quả
// ngược hẳn thứ tự chạy. Bản ghim đầu của phép kiểm này đã sai đúng kiểu đó.
const callSites = [...panel.matchAll(/applyAttemptTelemetry\(item, response\.attempt\);|finishDetectedOutput\(item, response\.result,/g)];
assert.ok(callSites.length >= 4, `phải thấy đủ các cặp lời gọi, đang thấy ${callSites.length}`);
for (let i = 0; i < callSites.length; i += 2) {
  assert.match(callSites[i][0], /^applyAttemptTelemetry/, "mỗi đường chạy phải gọi applyAttemptTelemetry TRƯỚC finishDetectedOutput");
  assert.match(callSites[i + 1][0], /^finishDetectedOutput/, "mỗi đường chạy phải gọi finishDetectedOutput SAU applyAttemptTelemetry");
}

console.log("video ledger keeps pre-submit detection: PASS");
