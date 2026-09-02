// Số đo đường gõ phải sống sót qua cổng gửi — kể cả khi cổng đó NÉM.
//
// Vì sao ghim (F-18, đo thật 02/09 lượt F4R2): `typeIntoFlowComposer` đã biết
// đường gõ hỏng và biết hỏng ở tầng nào — nó chờ nút Create sáng sau mỗi tầng
// dự phòng rồi trả về `{ ok, path }`. Nhưng con số đó chỉ được ghi vào
// `attempt.detection` SAU `waitForSendButtonReady`, tức là sau đúng cái cổng đã
// ném ở lượt đó. Kết quả: lượt hỏng về sổ cái với **0 số đo** về đường gõ, sổ
// cái chỉ nói "Send button did not become ready" — một câu chỉ tay vào nút gửi
// trong khi thứ hỏng là đường gõ. Hai phiên liền chẩn đoán sai vì thế, và phiên
// thứ ba được giao đi "đọc detection.typing_path của F4R2" — một con số **chưa
// bao giờ được ghi**. Bằng chứng: không có chuỗi "detection" nào trong
// `evidence/F4R2-*`.
//
// Ghim ở tầng nguồn (static) vì đây là bài toán THỨ TỰ trong runPrompt, và một
// test hành vi sẽ phải dựng cả DOM Flow giả để nói cùng một điều.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const content = fs.readFileSync(path.join(HERE, "..", "content.js"), "utf8");

const runStart = content.indexOf("async function runPrompt(");
const runEnd = content.indexOf("function attemptSnapshot", runStart);
assert.ok(runStart > -1 && runEnd > runStart, "runPrompt phải định vị được");
const run = content.slice(runStart, runEnd);

// 1. THỨ TỰ — điều thật sự được bảo vệ. Số đo phải được ghi giữa lúc gõ xong và
//    lúc bước vào cổng gửi; ghi sau cổng thì lượt hỏng lại mất số đo như F4R2.
const type = run.indexOf("typeIntoFlowComposer(activeComposer, prompt)");
const carry = run.indexOf('carryDiagnostic(requestAttempt, "typing_path", typing.path)');
const gate = run.indexOf("waitForSendButtonReady(");
assert.ok(type > -1, "lời gọi typeIntoFlowComposer phải định vị được");
assert.ok(carry > -1, "typing_path phải được ghi bằng carryDiagnostic ngay sau khi gõ");
assert.ok(gate > -1, "cổng waitForSendButtonReady phải định vị được");
assert.ok(type < carry && carry < gate, "typing_path phải được ghi SAU khi gõ và TRƯỚC cổng gửi — ghi sau cổng thì lượt hỏng không để lại số đo nào");

// 2. Đủ bộ số để so hai lượt với nhau. Riêng `composer_len_before_typing` là
//    thứ lượt F4R2 thiếu và đã phải ghi thành nợ: prompt 145 ký tự mà composer
//    đo 172, lệch 27 không giải thích được vì KHÔNG có mốc trước khi gõ.
// Đo trên ĐÚNG ĐOẠN đường thành công (từ sau khối try/catch tới cổng gửi), chứ
// không phải "có xuất hiện đâu đó trong runPrompt". `composer_len_before_typing`
// được ghi ở CẢ HAI nhánh (thành công và ném), nên một phép kiểm hỏi cả hàm sẽ
// vẫn XANH khi một trong hai nhánh bị xoá sạch. Mutation đã lọt lưới đúng kiểu
// đó hai lần trong phiên 02/09 — một lần mỗi nhánh.
const successPath = run.slice(run.indexOf("throw typingError;"), gate);
for (const key of ["typing_path", "typing_ok", "prompt_len", "composer_len_before_typing", "composer_len_after_typing"]) {
  assert.ok(successPath.includes(`carryDiagnostic(requestAttempt, "${key}"`), `đường THÀNH CÔNG thiếu số đo ${key}`);
}
const before = run.indexOf("const composerLenBeforeTyping = composerTextLength(activeComposer);");
assert.ok(before > -1 && before < type, "mốc độ dài composer phải được đo TRƯỚC khi gõ, nếu không thì nó không phải mốc so");

// 3. Không được erase ở vòng sau. recordDetection thay sạch attempt.detection
//    khi vòng dò kết quả xong, nên trường nào không nằm trong CARRIED_DIAGNOSTICS
//    thì ngay cả lượt THÀNH CÔNG cũng về sổ cái với typing_path rỗng — và không
//    ai so được lượt chạy được với lượt hỏng.
const carriedStart = content.indexOf("const CARRIED_DIAGNOSTICS");
const carried = content.slice(carriedStart, content.indexOf("function carryDiagnostic", carriedStart));
for (const key of ["typing_path", "typing_ok", "prompt_len", "composer_len_before_typing", "composer_len_after_typing"]) {
  assert.ok(carried.includes(`"${key}"`), `CARRIED_DIAGNOSTICS phải giữ lại ${key}`);
}

// 4. Object.assign ở biên submit thay TOÀN BỘ detection. Không trải bản cũ vào
//    thì lần ghi sớm ở mục 1 bị xoá đúng trên đường THÀNH CÔNG.
assert.match(run, /detection: \{ \.\.\.\(requestAttempt\.detection \|\| \{\}\),/, "Object.assign ở biên submit phải trải lại detection đã ghi sớm, không được thay trắng");

// 5. Chữ báo lỗi phải nói ra đường gõ. Đây là thứ operator ĐỌC khi lượt chết ở
//    PRE_SUBMIT — sổ cái có số nhưng câu báo lỗi mới là chỗ người ta nhìn trước.
const gateFn = content.slice(content.indexOf("async function waitForSendButtonReady"), content.indexOf("// Magic-byte sniff"));
assert.match(gateFn, /typingNote = ""/, "cổng gửi phải nhận được chú thích đường gõ");
assert.match(gateFn, /Send button did not become ready\$\{typingNote\}/, "chú thích đường gõ phải nằm trong câu báo lỗi");
assert.match(run, /waitForSendButtonReady\(undefined, ` \(typing_path=\$\{typing\.path\}/, "lời gọi phải truyền đường gõ vào câu báo lỗi");

// 6. F-19: câu báo lỗi này chạy trên trang Google Flow, không phải Gemini.
//    Chữ "Gemini DOM" gửi người đọc ledger đi tìm nhầm trang.
assert.ok(!/Send button did not become ready[^"`]*Gemini/.test(content), "câu báo lỗi cổng gửi không được nói 'Gemini' trên nhánh Flow (F-19)");

// 7. LỚP BẢO VỆ KHÔNG ĐƯỢC ĐỘNG VÀO. Bản vá này là thuần bằng chứng: nó KHÔNG
//    được rẽ nhánh theo typing.ok. Tầng dự phòng cuối (paste_event) trả về mà
//    chưa chờ React một nhịp nào, nên typing.ok=false ở đó không có nghĩa lượt
//    gõ đã hỏng — fail-fast theo nó sẽ giết đúng tầng dự phòng đang đỡ.
assert.ok(!/if\s*\(\s*!typing\.ok\s*\)/.test(run), "không được fail-fast theo typing.ok: tầng paste_event trả về trước khi React kịp cập nhật");

// 8. Đường NÉM của chính lượt gõ cũng phải để lại dấu (audit độc lập vòng 1,
//    02/09). `typeIntoFlowComposer` ném được — abort, HARD_STOP, focus hỏng —
//    và khi đó không có `typing` để ghi, đúng lại cái bệnh F-18. Bọc thì được,
//    nhưng phải NÉM LẠI NGUYÊN LỖI: `HARD_STOP`/`USER_STOP` được phân loại
//    bằng chữ, nên bọc lại hay đổi chữ là mất luôn cú dừng cứng.
const catchBlock = run.match(/\} catch \(typingError\) \{([\s\S]*?)throw typingError;/);
assert.ok(catchBlock, "phải bọc lượt gõ và ném lại NGUYÊN lỗi cũ, không bọc lại và không đổi chữ");
assert.match(catchBlock[1], /carryDiagnostic\(requestAttempt, "typing_path", "threw"\)/, "lượt gõ ném thì cũng phải ghi dấu");
// Ghim RIÊNG lần ghi trong nhánh catch. Hai nhánh cùng ghi
// `composer_len_before_typing`, nên một phép kiểm chỉ hỏi "chuỗi này có xuất
// hiện trong runPrompt không" sẽ vẫn XANH khi nhánh catch bị xoá sạch — đúng
// một đột biến đã lọt lưới lúc chạy mutation, và đây là bản vá cho nó.
assert.match(catchBlock[1], /carryDiagnostic\(requestAttempt, "composer_len_before_typing", composerLenBeforeTyping\)/, "nhánh ném cũng phải để lại mốc độ dài trước khi gõ");

// 9. LUAT CHUNG, thay cho viec liet ke tay tung truong. Moi khoa duoc ghi bang
//    carryDiagnostic trong runPrompt PHAI co mat trong CARRIED_DIAGNOSTICS,
//    khong tru khoa nao.
//
//    Vi sao ghim o dang luat chu khong dang danh sach: cung mot loi da xay ra
//    NAM LAN trong ngay 02/09 — sua luat o mot cho, quen day noi o cho khac.
//    Lan cuoi la `pacing_ms`: no duoc ghi dung, roi recordDetection xoa sach vi
//    khong ai them no vao danh sach giu lai, va so cai tra ve null. Mot phep
//    kiem liet ke tay se lai bo sot truong tiep theo; phep kiem nay thi khong.
const written = [...run.matchAll(/carryDiagnostic\(requestAttempt, "([a-z_]+)"/g)].map((m) => m[1]);
assert.ok(written.length >= 6, `phai thay it nhat 6 lan ghi carryDiagnostic, dang thay ${written.length}`);
for (const key of new Set(written)) {
  assert.ok(carried.includes(`"${key}"`),
    `"${key}" duoc ghi bang carryDiagnostic nhung KHONG co trong CARRIED_DIAGNOSTICS — recordDetection se xoa no va so cai tra ve null`);
}

console.log("typing path survives the send gate: PASS");
