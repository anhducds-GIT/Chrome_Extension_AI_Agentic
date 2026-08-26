// Đường gắn ảnh tham chiếu phải được ghi lại KỂ CẢ KHI THÀNH CÔNG.
//
// Vì sao ghim: Pilot-REF-01 (26/08) chạy đạt 2/2 nhưng không để lại dấu vết
// nào cho biết Gemini đã chấp nhận đường chính (ô nhập file tạm) hay đường dự
// phòng (giả lập kéo-thả) — `attachmentFingerprint` chỉ được ghi khi THẤT BẠI.
// Hệ quả: Google đổi giao diện làm hỏng đường chính thì hệ thống âm thầm rơi
// sang đường dự phòng và vẫn chạy, tới khi đường dự phòng cũng hỏng mới sập,
// và không có lịch sử nào cho biết nó đã chống đỡ âm thầm bao lâu.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const content = fs.readFileSync(path.join(HERE, "..", "content.js"), "utf8");
const panel = fs.readFileSync(path.join(HERE, "..", "sidepanel.js"), "utf8");

// 1. Có hàm tóm tắt riêng, và nó chạy trên đường THÀNH CÔNG của confirmReferences.
assert.match(content, /function attachSummary\(staged\)/, "attachSummary phải tồn tại");
const confirmStart = content.indexOf("async function confirmReferences(staged)");
assert.ok(confirmStart > -1, "confirmReferences phải tồn tại");
const confirmBlock = content.slice(confirmStart, content.indexOf("/* ---- send + completion", confirmStart));
assert.match(confirmBlock, /return attachSummary\(staged\);/, "đường thành công phải trả về bản tóm tắt");
const returnIndex = confirmBlock.indexOf("return attachSummary(staged);");
const catchIndex = confirmBlock.indexOf("} catch (error) {");
assert.ok(returnIndex > -1 && catchIndex > -1 && returnIndex < catchIndex, "bản tóm tắt phải nằm trong nhánh try (thành công), không phải nhánh catch");

// 2. Bản tóm tắt phải nói rõ ĐƯỜNG NÀO, và phải tách được "selector có tên
//    khớp" với "chỉ heuristic theo kích thước đỡ" — đó mới là cảnh báo sớm.
const summaryStart = content.indexOf("function attachSummary(staged)");
const summaryBlock = content.slice(summaryStart, content.indexOf("async function confirmReferences", summaryStart));
for (const field of ["path:", "expected:", "added:", "by_selector:"]) {
  assert.ok(summaryBlock.includes(field), `bản tóm tắt thiếu trường ${field}`);
}
assert.match(content, /function selectorAttachmentCount\(scope\)/, "phải có phép đếm chỉ-theo-selector");
const selectorStart = content.indexOf("function selectorAttachmentCount(scope)");
const selectorBlock = content.slice(selectorStart, content.indexOf("function attachSummary", selectorStart));
assert.ok(!/getBoundingClientRect/.test(selectorBlock), "phép đếm chỉ-theo-selector KHÔNG được dùng heuristic kích thước — nếu dùng thì nó không còn phân biệt được gì");

// 3. Bản tóm tắt phải đi được tới panel. Không gửi kèm result thì nó chết ở
//    content script: recordDetection() ghi đè sạch attempt.detection khi vòng
//    dò kết quả xong.
assert.match(content, /const attach = await confirmReferences\(staged\);/, "phải giữ lại giá trị trả về");
assert.match(content, /if \(result && attach\) result\.attach = attach;/, "phải gắn bản tóm tắt vào result");
// `result` chỉ là bản sao phòng bị cho lần ghi detected-not-downloaded. Đường
// quyết định là attempt.detection — xem mục 5. Assertion ở đây từng ghim đúng
// KẾT LUẬN SAI ("recordDetection ghi đè nên phải đi kèm result"): suy luận đó
// đúng về chuyện ghi đè nhưng sai về chỗ nào thắng cuối cùng, và chỉ một lần
// chạy thật mới chỉ ra. Ghi lại để đừng ai quay về lối cũ.

// 4. Panel phải ghi nó xuống sổ cái, không được nuốt.
assert.match(panel, /attach: result\?\.attach \?\? null/, "detection_diagnostics phải kèm bản tóm tắt đường gắn ảnh");

// 5. ĐƯỜNG THẬT SỰ TỚI SỔ CÁI. Bản đầu chỉ gắn vào `result` và job chạy ĐẠT
//    nhưng sổ cái trả về `undefined` — vì `applyAttemptTelemetry` (chỗ ghi
//    quyết định của panel) chỉ tuần tự hoá `attempt.detection`, và nó chạy SAU
//    lần ghi detected-not-downloaded. Chỉ chạy thật mới lộ ra chuyện này.
assert.match(content, /decision_reason: "PENDING", attach: attach \?\? null/, "attach phải nằm trong attempt.detection lúc khởi tạo, không chỉ trên result");
const record = content.slice(content.indexOf("const CARRIED_DIAGNOSTICS"), content.indexOf("function carryDiagnostic"));
assert.match(record, /\["attach", "blob_conversion"\]/, "danh sách giữ lại phải gồm attach và blob_conversion");
assert.match(record, /attempt\.detection = \{ \.\.\.values, \.\.\.carried \}/, "recordDetection phải giữ lại các trường mang theo khi ghi đè");

console.log("attach path recorded on success: PASS");
