// Test ghim cho hai lệnh Bridge cuối của `G-04`:
//   · `output.set_folder_hint` — ghi đường dẫn thư mục Đức đang nhắm tới, dưới
//     dạng SIÊU DỮ LIỆU ĐỂ HIỂN THỊ trên một hồ sơ đầu ra đã lưu.
//   · `profiles.remove` — gỡ MỘT bản ghi hồ sơ cũ trong extension.
//
// Hai lệnh này nguy hiểm hơn vẻ ngoài vì cả hai đều dính tới nơi ảnh của Đức
// được ghi xuống. Ba chỗ đáng canh nhất, và cả ba đều là chuyện TỪ CHỐI:
//
//   ① Nhiều hồ sơ mà không nói rõ hồ sơ nào -> TỪ CHỐI, không đoán. Đoán ở đây
//      là ghi đường dẫn của pilot này lên pilot khác, và Đức sẽ copy nhầm mà
//      không biết — cái sai không lộ ra cho tới lúc ảnh nằm sai chỗ.
//   ② Gỡ hồ sơ ĐANG dùng trong phiên -> TỪ CHỐI. Gỡ nó là để lại cấu hình trỏ
//      vào một hồ sơ không còn tồn tại, và lỗi sẽ nổ GIỮA một lượt ghi ảnh chứ
//      không nổ ở đây.
//   ③ `profiles.remove` phải khai TƯỜNG MINH rằng nó chỉ xoá siêu dữ liệu, tuyệt
//      đối không đụng file trên đĩa. Một lệnh tên là "remove" mà không nói rõ nó
//      xoá cái gì là chỗ dễ hiểu nhầm nhất trong cả bộ lệnh.

import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const sidepanel = fs.readFileSync(new URL("sidepanel.js", root), "utf8");
const core = fs.readFileSync(new URL("output-profile-core.js", root), "utf8");

/* ---- Lớp kho: ba hàm mới phải có mặt và phải ghi trong MỘT giao dịch ------ */

assert.match(core, /DacOutputProfiles = \{[^}]*\blist\b[^}]*\bsetHint\b[^}]*\bremove\b[^}]*\}/, "kho xuất đủ ba hàm mới");

// Đây là một phát hiện audit thật, port kèm theo code: đọc-sửa-ghi phải nằm
// TRONG MỘT giao dịch readwrite. Một cặp get()+put() ở hai giao dịch riêng có
// thể HỒI SINH một handle cũ đè lên một lượt bind() đang chạy song song.
for (const ten of ["setHint", "remove"]) {
  const than = new RegExp(`async function ${ten}\\([\\s\\S]*?\\n  \\}`).exec(core);
  assert.ok(than, `còn hàm ${ten}`);
  assert.equal(
    (than[0].match(/database\.transaction\(STORE, "readwrite"\)/g) || []).length, 1,
    `${ten} mở ĐÚNG MỘT giao dịch readwrite — tách đọc và ghi ra hai giao dịch có thể hồi sinh handle cũ đè lên một bind() song song`
  );
  assert.doesNotMatch(than[0], /await transaction\(/, `${ten} không được đi qua helper một-thao-tác: nó cần đọc rồi ghi trong cùng một giao dịch`);
}

// `remove` trả true/false theo việc bản ghi có tồn tại hay không, KHÔNG ném khi
// vắng mặt — người gọi cần phân biệt "vừa xoá" với "vốn không có".
assert.match(core, /existed = Boolean\(read\.result\);/, "remove đọc trạng thái tồn tại trước khi xoá");

/* ---- Lớp lệnh: trích thân hàm thật rồi chạy ------------------------------ */

class BridgeProtocolError extends Error {
  constructor(code, message, detail) { super(message || code); this.code = code; this.detail = detail; }
}

function dungLenh(ten, { profiles = [], hoSoDangDung = {}, setHintTraVe = undefined } = {}) {
  const than = new RegExp(`async function ${ten}\\(params\\) \\{[\\s\\S]*?\\n  \\}`).exec(sidepanel);
  assert.ok(than, `trích được ${ten} ra khỏi sidepanel.js — neo hỏng thì phép kiểm này vô nghĩa`);
  const daVe = { render: 0, setHint: null, removed: null };
  const state = { outputSettings: hoSoDangDung.outputSettings };
  const deps = {
    state,
    renderOutput: () => { daVe.render += 1; },
    window: {
      DacBridgeCore: { BridgeProtocolError },
      DacOutputProfiles: {
        list: async () => profiles,
        setHint: async (id, hint) => { daVe.setHint = { id, hint }; return setHintTraVe !== undefined ? setHintTraVe : { profile_id: id }; },
        remove: async (id) => { daVe.removed = id; return profiles.some((p) => p.profile_id === id); },
      },
      DacOutputLocation: { fromWorkbook: () => ({ tao_moi: true }) },
    },
  };
  const ten2 = Object.keys(deps);
  const fn = new Function(...ten2, `${than[0]}\nreturn ${ten};`)(...ten2.map((k) => deps[k]));
  return { fn, daVe, state };
}

const hoSo = (id) => ({ profile_id: id });
const DUONG_DAN = ["C:", "Anh", "Pilot-09"].join(String.fromCharCode(92));

/* --- ① Chưa có hồ sơ nào ------------------------------------------------- */
{
  const { fn, daVe } = dungLenh("bridgeOutputSetFolderHint", { profiles: [] });
  await assert.rejects(
    () => fn({ folder_hint: DUONG_DAN }),
    (e) => e.code === "VALIDATION_FAILED" && /NO_OUTPUT_PROFILE/.test(e.message),
    "chưa hồ sơ nào thì nói rõ Đức phải chọn folder một lần trước, không im lặng tạo bừa"
  );
  assert.equal(daVe.setHint, null, "bị từ chối thì KHÔNG ghi gì xuống kho");
}

/* --- ① Nhiều hồ sơ mà không nói rõ cái nào -> TỪ CHỐI, KHÔNG ĐOÁN -------- */
{
  const { fn, daVe } = dungLenh("bridgeOutputSetFolderHint", { profiles: [hoSo("pilot-09"), hoSo("pilot-10")] });
  await assert.rejects(
    () => fn({ folder_hint: DUONG_DAN }),
    (e) => e.code === "VALIDATION_FAILED" && /PROFILE_AMBIGUOUS/.test(e.message) && /pilot-09, pilot-10/.test(e.message),
    "nhiều hồ sơ thì TỪ CHỐI và kể tên chúng ra — đoán ở đây là ghi đường dẫn của pilot này lên pilot khác"
  );
  assert.equal(daVe.setHint, null, "và không ghi gì cả");
}

/* --- Đúng một hồ sơ thì suy ra được, không bắt khai thừa ------------------ */
{
  const { fn, daVe, state } = dungLenh("bridgeOutputSetFolderHint", { profiles: [hoSo("pilot-09")] });
  const ket = await fn({ folder_hint: DUONG_DAN });
  assert.deepEqual(ket, { profile_id: "pilot-09", folder_hint: DUONG_DAN });
  assert.deepEqual(daVe.setHint, { id: "pilot-09", hint: DUONG_DAN }, "ghi đúng hồ sơ duy nhất");
  assert.equal(state.outputSettings.folderHint, DUONG_DAN, "cấu hình phiên cũng nhận đường dẫn — không có nó thì kho đổi mà màn hình vẫn trống");
  assert.equal(daVe.render, 1, "vẽ lại thẻ đầu ra để Đức thấy");
}

/* --- Phiên vừa nạp lại, chưa mở workbook nào ------------------------------ */
//
// `state.outputSettings` chưa tồn tại. Bỏ qua là ghi được vào kho mà thẻ trên
// màn hình vẫn trống, và Đức không thấy gì đổi.
{
  const { fn, state } = dungLenh("bridgeOutputSetFolderHint", { profiles: [hoSo("pilot-09")], hoSoDangDung: { outputSettings: undefined } });
  await fn({ folder_hint: DUONG_DAN });
  assert.equal(state.outputSettings.folderHint, DUONG_DAN, "dựng cấu hình rỗng rồi ghi vào, thay vì bỏ qua");
}

/* --- Hồ sơ được nêu tên nhưng kho không có ------------------------------- */
{
  const { fn } = dungLenh("bridgeOutputSetFolderHint", { profiles: [hoSo("pilot-09")], setHintTraVe: null });
  await assert.rejects(
    () => fn({ folder_hint: DUONG_DAN, profile_id: "pilot-99" }),
    (e) => e.code === "VALIDATION_FAILED" && /PROFILE_NOT_FOUND/.test(e.message),
    "kho nói không có thì báo đúng thế, không coi như đã ghi"
  );
}

/* --- ② Gỡ hồ sơ ĐANG dùng -> TỪ CHỐI, cả hai đường ghi ------------------- */
for (const [ten, dung] of [["ảnh", { image: { profileId: "pilot-09" } }], ["result XLSX", { result: { profileId: "pilot-09" } }]]) {
  const { fn, daVe } = dungLenh("bridgeProfilesRemove", { profiles: [hoSo("pilot-09")], hoSoDangDung: { outputSettings: dung } });
  await assert.rejects(
    () => fn({ profile_id: "pilot-09" }),
    (e) => e.code === "VALIDATION_FAILED" && /PROFILE_IN_USE/.test(e.message),
    `hồ sơ đang bind cho ${ten} thì KHÔNG gỡ được — gỡ là để lại cấu hình trỏ vào chỗ trống, và lỗi sẽ nổ giữa một lượt ghi ảnh`
  );
  assert.equal(daVe.removed, null, "bị từ chối thì KHÔNG gỡ");
}

/* --- Gỡ hồ sơ khác thì được ---------------------------------------------- */
{
  const { fn, daVe } = dungLenh("bridgeProfilesRemove", {
    profiles: [hoSo("pilot-09"), hoSo("pilot-cu")],
    hoSoDangDung: { outputSettings: { image: { profileId: "pilot-09" } } },
  });
  const ket = await fn({ profile_id: "pilot-cu" });
  assert.equal(daVe.removed, "pilot-cu");
  assert.equal(daVe.render, 1);
  /* ③ Phạm vi phải khai TƯỜNG MINH trong chính câu trả lời. */
  assert.equal(ket.removed, true);
  assert.equal(ket.scope, "extension_local_metadata_only", "câu trả lời tự khai đây chỉ là siêu dữ liệu trong extension");
  assert.equal(ket.disk_files_deleted, false, "và tự khai KHÔNG file nào trên đĩa bị xoá — một lệnh tên 'remove' phải nói rõ nó xoá cái gì");
}

/* --- Gỡ hồ sơ không tồn tại ---------------------------------------------- */
{
  const { fn } = dungLenh("bridgeProfilesRemove", { profiles: [] });
  await assert.rejects(
    () => fn({ profile_id: "khong-co" }),
    (e) => e.code === "VALIDATION_FAILED" && /PROFILE_NOT_FOUND/.test(e.message)
  );
}

/* ---- Hợp đồng tham số: chạy bộ kiểm THẬT của Bridge ---------------------- */

const ctx = vm.createContext({ console });
vm.runInContext(fs.readFileSync(new URL("bridge-core.js", root), "utf8"), ctx);
const bridge = ctx.DacBridgeCore;
const B = String.fromCharCode(92);

assert.doesNotThrow(() => bridge.validateParams("output.set_folder_hint", { folder_hint: `C:${B}Anh` }), "đường dẫn ổ đĩa");
assert.doesNotThrow(() => bridge.validateParams("output.set_folder_hint", { folder_hint: `${B}${B}srv${B}share${B}x` }), "đường dẫn UNC");
assert.throws(() => bridge.validateParams("output.set_folder_hint", { folder_hint: "Anh/Pilot-09" }), /absolute Windows path/, "đường dẫn tương đối vô dụng với một trường sinh ra để COPY-PASTE");

// Ký tự vô hình / đổi chiều làm đường dẫn HIỆN RA khác hẳn đường dẫn được COPY.
// Dựng bằng MÃ SỐ, không gõ ký tự thật vào file: bản đầu của file này gõ thẳng
// U+200B vào chuỗi, tức mắc đúng cái lỗi mà mấy dòng dưới đang đi cấm.
const VO_HINH = String.fromCharCode(0x200b);
const DOI_CHIEU = String.fromCharCode(0x202e);
const DIEU_KHIEN = String.fromCharCode(7);
assert.throws(() => bridge.validateParams("output.set_folder_hint", { folder_hint: `C:${B}Anh${VO_HINH}Lua` }), /invisible or directional/);
assert.throws(() => bridge.validateParams("output.set_folder_hint", { folder_hint: `C:${B}Anh${DOI_CHIEU}Lua` }), /invisible or directional/);
assert.throws(() => bridge.validateParams("output.set_folder_hint", { folder_hint: `C:${B}Anh${DIEU_KHIEN}` }), /control characters/);
assert.throws(() => bridge.validateParams("output.set_folder_hint", { folder_hint: `C:${B}Anh`, profile_id: "Pilot_09" }), /lowercase slug/);
assert.throws(() => bridge.validateParams("profiles.remove", { profile_id: "" }), /params\.profile_id/);
// So bằng `{...}` vì `validateParams` trả về đối tượng có prototype khác — phép
// so sâu nghiêm ngặt soi cả prototype, và hai bên "trông giống hệt" vẫn khác nhau.
assert.deepEqual({ ...bridge.validateParams("profiles.remove", { profile_id: "pilot-09" }) }, { profile_id: "pilot-09" });

// Mã nguồn phải giữ các dãy ký tự đặc biệt ở dạng CHUỖI THOÁT ASCII. Viết thẳng
// ký tự thật vào file làm git coi file là nhị phân và giấu diff vĩnh viễn — đã
// dính đúng lượt viết bản vá này, do một heredoc nuốt mất dấu thoát.
const nguon = fs.readFileSync(new URL("bridge-core.js", root), "utf8");
const THO = new RegExp("[" + [0x00, 0x08].map((c) => String.fromCharCode(c)).join("-") + String.fromCharCode(0x0b) + String.fromCharCode(0x0c) + String.fromCharCode(0x0e) + "-" + String.fromCharCode(0x1f) + String.fromCharCode(0x7f) + VO_HINH + DOI_CHIEU + String.fromCharCode(0xfeff) + "]");
assert.doesNotMatch(nguon, THO, "bridge-core.js không được chứa ký tự điều khiển hay ký tự vô hình THÔ — chúng làm git coi file là nhị phân và giấu diff vĩnh viễn");
// Tim CHUOI CHU `\u0000-\u001f` trong ma nguon, khong tim ky tu that:
// nen regex phai thoat hai lan. Ban dau thieu mot lop va no di tim dung cai
// thu vua bi cam o dong tren.
assert.match(nguon, /\\u0000-\\u001f/, "dãy ký tự điều khiển vẫn viết bằng chuỗi thoát đọc được");

console.log("output profile commands: PASS");
