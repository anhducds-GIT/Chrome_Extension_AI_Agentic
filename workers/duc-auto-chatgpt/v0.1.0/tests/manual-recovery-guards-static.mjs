// Ghim hai mục của `BACKLOG.md`, cùng nằm ở vùng cứu-thủ-công của `sidepanel.js`:
//
//   B-25 — câu lỗi lúc recreate phải là tiếng Việt CÓ DẤU. Luật vàng 4 của gói:
//          chữ operator nhìn thấy là tiếng Việt, chỉ MÃ LỖI (phần trước dấu hai
//          chấm) mới tiếng Anh vì nó là định danh trong audit JSONL / ledger / test.
//
//   B-24 — `resolveExistingOutput()` là code chết (0 nút trong `sidepanel.html`),
//          nhưng nó gọi `saveGeneratedImage` mà KHÔNG kiểm `task_type`. Ngày ai
//          đó nối lại nút, một job text sẽ thành SUCCESS kèm `result_file` là
//          tên file ẢNH. Chốt kiểm task_type phải đứng TRƯỚC mọi tác dụng phụ.
//
// TRẦN TUYÊN BỐ, nói thẳng: đây là phép kiểm TĨNH. Cả hai hàm nằm trong IIFE của
// `sidepanel.js` và cần gần như trọn bộ state của panel mới chạy được, nên ở đây
// chỉ đọc mã. Yếu hơn một phép kiểm chạy thật — nhưng thứ nó canh là *chữ* và
// *thứ tự dòng*, và cả hai đều đọc thẳng ra được từ mã nguồn.

import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../sidepanel.js", import.meta.url), "utf8");
const html = fs.readFileSync(new URL("../sidepanel.html", import.meta.url), "utf8");

/** Cắt một hàm ra khỏi `sidepanel.js`, ĐẾM mỏ neo — ra 0 là công cụ đo hỏng. */
function segment(startNeedle, endNeedle) {
  const starts = source.split(startNeedle).length - 1;
  assert.equal(starts, 1, `mỏ neo \`${startNeedle}\` phải khớp ĐÚNG 1 chỗ, đang khớp ${starts}`);
  const ends = source.split(endNeedle).length - 1;
  assert.equal(ends, 1, `mỏ neo \`${endNeedle}\` phải khớp ĐÚNG 1 chỗ, đang khớp ${ends}`);
  const from = source.indexOf(startNeedle);
  const to = source.indexOf(endNeedle);
  assert.ok(to > from, `\`${endNeedle}\` phải nằm SAU \`${startNeedle}\` — neo trượt thì phép kiểm này vô nghĩa`);
  return source.slice(from, to);
}

/* ===== B-25 · câu lỗi lúc recreate ======================================== */

const confirmRecreate = segment("async function confirmRecreate", "async function confirmRerun");

// Dấu tiếng Việt. Cố ý KHÔNG dùng `\b` — nó không bao giờ khớp cạnh chữ Đ/ế, và
// đã hai lần làm một regex trong repo này im lặng khớp rỗng.
const CO_DAU = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/;

// Xoá mọi ô `${...}` trước đã. Không xoá thì một dấu nháy NẰM TRONG ô nội suy
// (`${x || "..."}`) cắt cụt chuỗi đang đọc, và phép kiểm đỏ vì công cụ đo chứ
// không phải vì chữ sai.
const sachONoiSuy = confirmRecreate.replace(/\$\{(?:[^{}]|\{[^{}]*\})*\}/g, "");

// Bắt MỌI chuỗi dạng `MA_LOI: <đuôi>` bên trong hàm này. Đây là hình dạng của
// một câu lỗi operator đọc được: mã tiếng Anh, dấu hai chấm, rồi chữ cho người.
const cauLoi = [...sachONoiSuy.matchAll(/["'`]([A-Z][A-Z0-9_]{3,}): ([^"'`]*)["'`]/g)]
  .map((m) => ({ ma: m[1], duoi: m[2] }));
// ĐẾM. Ra 0 nghĩa là mỏ neo hỏng, KHÔNG phải "không còn gì phải dịch".
assert.ok(cauLoi.length >= 9, `confirmRecreate() phải còn ít nhất 9 câu lỗi dạng \`MA: đuôi\`, đang đếm ${cauLoi.length} — đếm hụt nghĩa là mỏ neo hỏng, không phải hết việc`);

for (const { ma, duoi } of cauLoi) {
  // Đuôi chỉ gồm ô `${...}` thì chữ thật nằm ở module khác — canh ở đây là canh
  // nhầm chỗ. `OUTPUT_LOCATION:` rơi vào diện này và được canh riêng bên dưới.
  const chuRieng = duoi.replace(/\$\{[^}]*\}/g, "").trim();
  if (!/[A-Za-zÀ-ỹ]/.test(chuRieng)) continue;
  assert.match(duoi, CO_DAU, `câu lỗi \`${ma}\` chưa có tiếng Việt có dấu (luật vàng 4): "${duoi}"`);
  // Và MÃ LỖI vẫn phải là tiếng Anh in hoa — dịch luôn cả mã là làm hỏng định
  // danh trong audit JSONL, Result ledger và mọi test đang đọc theo mã.
  assert.doesNotMatch(ma, CO_DAU, `mã lỗi \`${ma}\` phải giữ tiếng Anh, chỉ phần sau dấu hai chấm mới dịch`);
}

// Ba mã mà B-25 gọi tên: chúng phải còn nguyên (mã tiếng Anh) VÀ có đuôi tiếng Việt.
for (const ma of ["RECREATE_PERSISTENCE_REQUIRED", "RECREATE_COMPLETION_UNVERIFIED", "OUTPUT_LOCATION"]) {
  assert.ok(confirmRecreate.includes(`${ma}:`), `mã \`${ma}\` phải còn nguyên tiếng Anh trong confirmRecreate()`);
}
// Đuôi của `OUTPUT_LOCATION:` đến từ `output-location-core.js`, nên canh ở đó.
const outputCore = fs.readFileSync(new URL("../output-location-core.js", import.meta.url), "utf8");
const details = [...outputCore.matchAll(/detail: (["'`])([\s\S]*?)\1/g)].map((m) => m[2]);
assert.ok(details.length >= 5, `phải đọc được ít nhất 5 câu \`detail:\` của preflight, đang đọc ${details.length}`);
for (const cau of details) {
  assert.match(cau, CO_DAU, `câu \`detail:\` này đi thẳng ra sau \`OUTPUT_LOCATION:\` cho Đức đọc, phải tiếng Việt có dấu:\n      ${cau}`);
}

/* ===== B-24 · đường đối soát ảnh không được nuốt job text ================= */

const resolveExisting = segment("async function resolveExistingOutput", "async function openExistingRun");

const guard = resolveExisting.indexOf("RECONCILE_IMAGE_ONLY");
assert.ok(guard > 0, "`resolveExistingOutput()` phải có chốt `RECONCILE_IMAGE_ONLY` — thiếu nó thì một job text nối lại được sẽ thành SUCCESS kèm result_file là tên file ẢNH");
assert.match(
  resolveExisting.slice(0, guard + 200),
  /taskType\(item\.job\) !== "image_generation"/,
  "chốt phải hỏi ĐÚNG `taskType(item.job) !== \"image_generation\"` — hỏi khác đi là hỏi một câu khác"
);

// Chốt phải đứng TRƯỚC mọi tác dụng phụ. Dời nó xuống sau là chữ còn nguyên mà
// hành vi chết — đúng kiểu bản vá đã lọt lưới ở B-16.
for (const sauDo of ['send({ type: "DAC_MANUAL_RECONCILE_EXISTING_OUTPUT"', "saveGeneratedImage(", "state.manualReconciliationRunning = true", "reconciliationProof(item)"]) {
  const viTri = resolveExisting.indexOf(sauDo);
  assert.ok(viTri > 0, `không tìm thấy \`${sauDo}\` trong resolveExistingOutput() — neo hỏng`);
  assert.ok(viTri > guard, `chốt \`RECONCILE_IMAGE_ONLY\` phải đứng TRƯỚC \`${sauDo}\``);
}

// Và nó vẫn phải là code CHẾT: 0 nút trong `sidepanel.html`. Ngày con số này
// khác 0, B-24 phải được mở lại và Đức phải chốt trước.
assert.doesNotMatch(html, /resolveExistingOutput/, "`sidepanel.html` không được có nút nào gọi `resolveExistingOutput` — nối lại là việc phải hỏi Đức (B-24)");
assert.equal(
  source.split("resolveExistingOutput").length - 1,
  1,
  "`resolveExistingOutput` phải xuất hiện ĐÚNG 1 lần trong sidepanel.js (chính dòng định nghĩa) — nhiều hơn nghĩa là đã có người gọi nó"
);

console.log("manual recovery guards static (B-24 + B-25): PASS");
