// Ảnh sinh ra dạng blob: phải thành data URL mà background CHẤP NHẬN được.
//
// Bằng chứng live 2026-08-26 (job Q001 "Huế", tiếp sau Pilot-REF-01): cả 3 lần
// thử đều gắn ảnh xong, gửi xong, PHÁT HIỆN được ảnh, rồi cùng chết ở
// "Generated image URL was not usable." DOM probe cho thấy ảnh Gemini sinh ra
// có lúc là https://lh3... có lúc là blob: — tấm của lần chạy đó là blob:.
// `downloadableUrl` có chuyển blob sang data URL, nhưng `FileReader` lấy MIME
// từ NHÃN của Blob, và nhãn đó do trang tự đặt. Nhãn rỗng hoặc không phải ảnh
// → "data:application/octet-stream;base64,..." → background từ chối đúng luật
// (nó chỉ nhận https: hoặc data:image/).
//
// Luật ghim: đọc BYTE để biết đó là ảnh gì, đừng tin nhãn, và đừng đoán.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const read = (name) => fs.readFileSync(path.join(HERE, "..", name), "utf8");
const content = read("content.js");
const background = read("background.js");
const panel = read("sidepanel.js");

// 1. Có phép nhận dạng theo byte, và nó phủ đủ các định dạng background biết mở.
assert.match(content, /function sniffImageType\(bytes\)/, "phải có phép nhận dạng theo byte");
const sniff = content.slice(content.indexOf("function sniffImageType(bytes)"), content.indexOf("let lastBlobConversion"));
for (const [label, type] of [["PNG", "image/png"], ["JPEG", "image/jpeg"], ["GIF", "image/gif"], ["WEBP", "image/webp"], ["AVIF", "image/avif"]]) {
  assert.ok(sniff.includes(type), `phép nhận dạng thiếu ${label} (${type})`);
}
assert.match(sniff, /return null;/, "không nhận ra thì phải trả null, không được đoán bừa một MIME");

// 2. Byte thắng nhãn. Nếu nhãn thắng thì một blob dán nhãn png nhưng chứa byte
//    jpeg sẽ được lưu dưới đuôi file nói dối.
const convertStart = content.indexOf("async function downloadableUrl(");
assert.ok(convertStart > -1, "phải tìm được downloadableUrl — nếu đổi chữ ký thì sửa mốc cắt ở đây, đừng bỏ phép kiểm");
const convert = content.slice(convertStart, content.indexOf("async function waitForCompletion"));
assert.match(convert, /const sniffed = sniffImageType\(head\)/, "phải nhận dạng byte trước");
assert.match(convert, /const type = sniffed \|\| \(raw\.type\.startsWith\("image\/"\) \? raw\.type : null\)/, "byte phải được ưu tiên hơn nhãn, nhãn chỉ là phương án cuối");
assert.match(convert, /BLOB_NOT_AN_IMAGE/, "không xác định được thì phải báo lỗi rõ, không được đẩy rác xuống background");
assert.ok(/blob type/.test(convert) && /byte đầu/.test(convert), "thông điệp lỗi phải mang nhãn thật, cỡ, và byte đầu — đủ để chẩn đoán từ sổ cái");
assert.ok(!/new Blob\(\[raw\], \{ type: "image\/png" \}\)/.test(convert), "không được mặc định cứng thành image/png — đó là đoán");

// 3. Không được nới lỏng lớp bảo vệ ở background để cho qua (luật vàng 3).
//    Dùng so khớp chuỗi nguyên văn, KHÔNG dùng regex: bản đầu của phép kiểm
//    này viết bằng regex nhiều lớp thoát và nó khớp nhầm — nới lỏng hẳn lớp
//    bảo vệ thành `if (false)` mà test vẫn xanh. Một assertion giả canh đúng
//    cái luật quan trọng nhất còn tệ hơn không có assertion nào.
for (const guard of ['!/^https:\\/\\//i.test(url)', '!/^data:image\\//i.test(url)']) {
  assert.ok(background.includes(guard), `background phải vẫn giữ nguyên chốt \`${guard}\` — chỉ nhận https: hoặc data:image/`);
}

// 4. Thông điệp từ chối phải nói nó ĐÃ NHẬN ĐƯỢC GÌ. Bí ẩn ngày 26/08 mất 3
//    lần thử mới lần ra chỉ vì thông điệp im lặng.
assert.match(background, /url\.slice\(0, 40\)/, "phải kèm phần đầu URL (40 ký tự, không kèm dữ liệu)");
assert.match(background, /nhận được: \$\{head\}/, "thông điệp phải in phần đầu đó ra");

// 5. Kết quả chuyển đổi phải tới được sổ cái, cùng lý do như attach:
//    recordDetection() ghi đè attempt.detection nên phải đi kèm result.
assert.match(content, /if \(result && lastBlobConversion\) result\.blob_conversion = lastBlobConversion;/, "phải gắn vào result");
assert.match(panel, /blob_conversion: result\?\.blob_conversion \?\? null/, "panel phải ghi xuống sổ cái");

// 6. Đường đối chiếu thủ công cùng họ lỗi nhưng chưa chuyển đổi được (handler
//    đang đồng bộ). Ít nhất nó phải dừng lại và nói rõ, thay vì đẩy một URL vô
//    dụng xuống background rồi chết với thông điệp khó hiểu.
const reconcile = content.slice(content.indexOf("function inspectPersistedImage(message)"), content.indexOf("chrome.runtime.onMessage.addListener"));
assert.match(reconcile, /startsWith\("blob:"\)/, "đường đối chiếu phải tự nhận ra blob:");
assert.match(reconcile, /RECONCILE_BLOB_UNSUPPORTED/, "và phải báo mã lỗi riêng, đọc là hiểu");

// 7. Cùng bài học như attach: phải vào `attempt.detection` mới tới được sổ cái.
assert.match(content, /carryDiagnostic\(attempt, "blob_conversion", lastBlobConversion\)/, "kết quả chuyển đổi phải ghi vào attempt.detection");
assert.match(content, /image_url: await downloadableUrl\(decision\.candidate\.source, attempt\)/, "downloadableUrl phải nhận attempt để ghi được");

// 8. Biến ghi nhận ở phạm vi module PHẢI đặt lại mỗi lần thử, không thì một job
//    không có blob nào sẽ thừa hưởng nhãn của job trước — sổ cái nói dối.
const submit = content.slice(content.indexOf("const staged = await stageReferences(referenceImages)") - 400, content.indexOf("const sendButton = await waitForSendButtonReady()"));
assert.match(submit, /lastBlobConversion = null;/, "phải đặt lại lastBlobConversion trước mỗi lần thử");

// 9. Nhánh "kết quả là chữ" từng rò URL blob thô ra ngoài, khiến lỗi hiện ra
//    dưới dạng gây hiểu nhầm "URL không dùng được" trong khi nguyên nhân thật
//    là ảnh không được chấm là output gán được. Nay phải thất bại TRUNG THỰC,
//    và tuyệt đối KHÔNG được tự chuyển đổi ở đây — làm vậy là biến FAIL thành
//    SUCCESS, tức đổi luật attribution, phải hỏi Đức (AGENTS.md 2.4).
assert.match(content, /const imageDownloadable = imageUrl && \/\^\(https:\|data:\)\/i\.test\(String\(imageUrl\)\) \? imageUrl : null;/, "nhánh chữ phải lọc URL không tải được");
assert.match(content, /image_url: imageDownloadable,/, "nhánh chữ phải trả URL đã lọc, không phải URL thô");
const textBranch = content.slice(content.indexOf("const imageDownloadable"), content.indexOf("stableSince = 0;"));
assert.ok(!/downloadableUrl/.test(textBranch), "nhánh chữ KHÔNG được tự chuyển đổi blob — đó là đổi luật attribution, phải hỏi Đức");
assert.match(content, /carryDiagnostic\(attempt, "image_url_dropped"/, "lý do bỏ URL phải tới được sổ cái qua attempt.detection");
assert.match(content, /\["attach", "blob_conversion", "image_url_dropped"\]/, "image_url_dropped phải nằm trong danh sách mang theo");

console.log("blob image conversion: PASS");
