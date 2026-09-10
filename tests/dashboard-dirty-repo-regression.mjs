/* Bộ sinh bảng CHẾT khi có file .js sửa dở — `behaviourOpts is not defined`.
 *
 * Đo 2026-09-10: `node scripts/build-dashboard.mjs` ném thẳng
 *
 *     DASHBOARD_READ_FAILED ... behaviourOpts is not defined
 *
 * `behaviourOpts` được khai trong `collectModel`, nhưng lượt migrate bộ khung
 * 0.3.0 → 1.8.0 (`4da1e9e5`) để `runDashboard` đọc nó ở PHẠM VI KHÁC. Nhánh đó
 * chỉ chạy khi có ít nhất một vùng đang bẩn, nên nó qua mặt mọi lượt sinh trên
 * cây sạch — và bảng là kênh trạng thái Đức đọc, nên nó chết đúng lúc đang có
 * việc dở, tức đúng lúc cần nhất.
 *
 * VÌ SAO ĐỨNG RIÊNG, KHÔNG THÊM MÉP VÀO `build-dashboard-smoke.mjs`: file đó ĐÃ
 * CÓ một mép đi đúng đường này (mép 11, "dirty state chỉ in cảnh báo stdout") —
 * nó lẽ ra phải đỏ. Nhưng CẢ SUITE GỐC không nạp được từ cùng lượt migrate ấy:
 * `build-dashboard-smoke.mjs` import `fileScriptCanChep` từ
 * `scripts/repo-structure.mjs`, và lượt migrate đã xoá export đó. 28 file test ở
 * gốc repo hiện KHÔNG CHẠY ĐƯỢC, còn cổng phiên chỉ chạy suite của GÓI nên không
 * ai thấy. Đó là việc của lane giữ bộ khung, KHÔNG phải chỗ để tôi đoán.
 *
 * File này chỉ import ĐÚNG module đang vá, nên nó chạy được ngay hôm nay. Ngày
 * suite gốc sống lại thì gộp vào cũng được — nhưng đừng xoá mép này.
 *
 * VÀ NÓ DÙNG REPO THẬT, chỉ thay đúng MỘT cái công tắc (`dirtyFiles`). Bản nháp
 * đầu của chính file này dựng cả một repo giả, và nó phình ra tới bốn vòng sửa
 * mà chưa chạy nổi — một repo giả là một repo thứ hai phải bảo trì, và nó sẽ
 * xanh trên một hình dạng repo không còn tồn tại. */
import assert from "node:assert/strict";
import { collectModel, createDefaultDeps, runDashboard } from "../scripts/build-dashboard.mjs";

// Một đường .js bịa, KHÔNG cần tồn tại: `dirtyFiles` là thứ duy nhất đọc nó, và
// ta đang thay chính hàm đó. Cái cần dựng lại là TÌNH HUỐNG, không phải cái file.
const BAN = "workers/duc-auto-chatgpt/v0.1.0/mot-file-dang-sua.js";

const goc = createDefaultDeps();
const deps = {
  ...goc,
  // Không ghi ra đĩa: mép này đo hành vi của bộ sinh, không phải nội dung trang.
  writeFile: () => {},
  git: { ...goc.git, dirtyFiles: () => [BAN] }
};

/* ---- ⑴ model phải MANG theo `behaviourOpts` ---------------------------- */
// Đây là hình dạng bản vá dựa vào. Mép ⑵ cũng bắt được nếu nó mất, nhưng mép
// này NÓI RA LÝ DO, nên lúc đỏ thì người đọc biết ngay phải nhìn đâu.
assert.ok(
  collectModel(goc).behaviourOpts,
  "model phải mang `behaviourOpts` — `runDashboard` đọc nó ở phạm vi khác nơi nó được khai"
);

/* ---- ⑵ MÉP CHỊU TẢI: có file .js bẩn thì bộ sinh KHÔNG được chết -------- */
const logs = [];
const errors = [];
const ma = runDashboard({ deps, output: { log: (m) => logs.push(m), error: (m) => errors.push(m) } });
assert.deepEqual(errors, [], 'bộ sinh không được ném khi có file sửa dở — trước bản vá 10/09 nó ném "behaviourOpts is not defined" và chết cả lượt sinh');
assert.equal(ma, 0, "mã thoát phải là 0");

/* ---- ⑶ và nó vẫn phải NÓI cảnh báo, chứ không im lặng cho qua ----------- */
// Bọc try/catch quanh nhánh cảnh báo cũng làm mép ⑵ xanh. Mép này chặn đúng
// đường thoát đó: im lặng không phải là sửa.
assert.ok(
  logs.some((m) => m.includes("CẢNH BÁO") && m.includes(".js")),
  "vẫn phải in cảnh báo 'có file .js sửa dở' — nuốt lỗi cũng làm mép ⑵ xanh, nên mép này chặn đường đó"
);

console.log("dashboard dirty-repo regression: PASS");
