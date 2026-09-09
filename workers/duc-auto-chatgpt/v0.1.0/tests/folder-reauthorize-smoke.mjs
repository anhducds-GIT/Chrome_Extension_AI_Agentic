/* B-53 · Quyền thư mục HẾT sau mỗi lần nạp lại — xin lại phải tốn MỘT cú bấm,
 * không phải đi lại cả cây thư mục.
 *
 * ĐO LIVE 2026-09-09, ngay sau một lượt Đức nạp lại tiện ích:
 *
 *     audit_durable: false
 *     "đếm được 3 hồ sơ, 0 còn quyền"
 *     checkpoint.verified: false
 *
 * Handle sống sót trong IndexedDB; QUYỀN thì không. Và trước bản vá này, mã
 * **chỉ có `queryPermission`** (hỏi) — **không chỗ nào gọi `requestPermission`**
 * (xin lại). Nên lối duy nhất là mở lại hộp chọn thư mục, mỗi lần reload.
 *
 * Đây cũng là chỗ tôi suýt nói sai với Đức: "cấp quyền một lần là xong". Phép
 * đo bác nó, và bản vá này là câu trả lời đúng cho câu hỏi thật của Đức.
 *
 * HAI LUẬT PHẢI GIỮ, và file này ghim cả hai:
 *   ⑴ chỉ xin lại khi có ĐÚNG MỘT hồ sơ — nhiều hơn thì KHÔNG đoán (ADR-0049
 *     hệ quả 8: chọn hộ một trong mấy thư mục pilot là đem bằng chứng run này
 *     ghi vào hồ sơ run khác);
 *   ⑵ dọn hồ sơ thừa CHỈ sau một lựa chọn tường minh của Đức — cú bấm chọn thư
 *     mục chính là lời khai "đây mới là thư mục của tôi".
 *
 * File này CẮT hai hàm đã ship ra khỏi `output-profile-core.js` và CHẠY chúng
 * trên một kho hồ sơ giả. */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const src = fs.readFileSync(new URL("../output-profile-core.js", import.meta.url), "utf8").split("\r\n").join("\n");

const start = src.indexOf("  async function reauthorizeSole()");
const end = src.indexOf("  (typeof window !== \"undefined\"");
assert.ok(start > 0, "output-profile-core.js còn định nghĩa `reauthorizeSole` — nếu nó dời chỗ thì phép ghim đi theo, KHÔNG xoá");
assert.ok(end > start, "hai hàm còn đứng ngay trên dòng export");
const block = src.slice(start, end);

// Xin lại quyền BẮT BUỘC dùng `requestPermission`; `queryPermission` chỉ HỎI và
// nó chính là thứ mã cũ có mà vẫn bó tay.
assert.match(block, /requestPermission\(\{ mode: "readwrite" \}\)/, "phải gọi `requestPermission`, không phải chỉ `queryPermission`");

const chay = vm.runInNewContext(
  `(function (deps) {\nconst { list, remove, profileId } = deps;\n${block}\nreturn { reauthorizeSole, pruneOthers };\n})`
);

function khoHoSo(hoSo) {
  const daXoa = [];
  const api = chay({
    list: async () => hoSo,
    remove: async (id) => { daXoa.push(id); },
    profileId: (id) => String(id)
  });
  return { ...api, daXoa };
}
const hoSoCo = (id, ketQua) => ({
  profile_id: id,
  last_known_handle_name: `thu-muc-${id}`,
  directory_handle: {
    name: `thu-muc-${id}`,
    async requestPermission() { if (ketQua instanceof Error) throw ketQua; return ketQua; }
  }
});

/* ---- ca 1: ĐÚNG MỘT hồ sơ, Chrome đồng ý — ca thường gặp nhất ------------ */
const mot = khoHoSo([hoSoCo("pilot", "granted")]);
const ok = await mot.reauthorizeSole();
assert.equal(ok.state, "authorized", "một hồ sơ + Chrome đồng ý → xin lại được, KHÔNG cần mở hộp chọn thư mục");
assert.equal(ok.profile.profile_id, "pilot");

/* ---- ca 2: BA hồ sơ — KHÔNG được đoán ----------------------------------- */
// Đây đúng trạng thái đo được trên máy Đức: "3 hồ sơ, 0 còn quyền".
const ba = khoHoSo([hoSoCo("a", "granted"), hoSoCo("b", "granted"), hoSoCo("c", "granted")]);
const nhieu = await ba.reauthorizeSole();
assert.equal(nhieu.state, "khong_duy_nhat", "nhiều hơn một hồ sơ thì KHÔNG đoán — chọn hộ là ghi bằng chứng run này vào hồ sơ run khác");
assert.equal(nhieu.count, 3);
assert.equal(nhieu.profile, null, "không được trả về một hồ sơ nào khi đang phân vân");

/* ---- ca 3: Chrome từ chối / vẫn hỏi ------------------------------------- */
const tuChoi = khoHoSo([hoSoCo("pilot", "prompt")]);
assert.equal((await tuChoi.reauthorizeSole()).state, "permission_required", "Chrome vẫn hỏi thì trạng thái phải nói đúng thế, không được khai là đã có quyền");
const chan = khoHoSo([hoSoCo("pilot", "denied")]);
assert.equal((await chan.reauthorizeSole()).state, "unavailable", "bị chặn thì fail CLOSED");
const nem = khoHoSo([hoSoCo("pilot", new Error("gesture hết hạn"))]);
const loi = await nem.reauthorizeSole();
assert.equal(loi.state, "unavailable", "ném thì cũng fail closed, không để lọt thành 'authorized'");
assert.match(loi.error, /gesture/, "và giữ lại nguyên văn lý do để chẩn đoán");

/* ---- ca 4: không có hồ sơ nào ------------------------------------------- */
const rong = khoHoSo([]);
assert.equal((await rong.reauthorizeSole()).state, "khong_duy_nhat", "chưa có hồ sơ nào thì cũng không xin được — phải mở hộp chọn");
assert.equal((await rong.reauthorizeSole()).count, 0);

/* ---- ca 5: hồ sơ cũ không có handle thì không tính là ứng viên ---------- */
const lanLon = khoHoSo([hoSoCo("pilot", "granted"), { profile_id: "cu", directory_handle: null }]);
assert.equal((await lanLon.reauthorizeSole()).state, "authorized", "hồ sơ không có handle là rác, không được làm nghẽn lối xin lại");

/* ---- ca 6: DỌN hồ sơ thừa, giữ đúng cái Đức vừa chọn -------------------- */
const don = khoHoSo([hoSoCo("a", "granted"), hoSoCo("giu", "granted"), hoSoCo("c", "granted")]);
const daXoa = await don.pruneOthers("giu");
assert.deepEqual([...daXoa].sort(), ["a", "c"], "dọn hết trừ cái vừa chọn");
assert.ok(!don.daXoa.includes("giu"), "KHÔNG được xoá chính hồ sơ Đức vừa chọn");
assert.equal(don.daXoa.length, 2);

/* ---- ca 7: dọn khi chỉ có một thì không đụng gì ------------------------- */
const donMot = khoHoSo([hoSoCo("giu", "granted")]);
assert.equal((await donMot.pruneOthers("giu")).length, 0, "một hồ sơ thì không có gì để dọn");

/* ---- Panel phải XIN LẠI TRƯỚC rồi mới mở hộp chọn ---------------------- */
const panel = fs.readFileSync(new URL("../sidepanel.js", import.meta.url), "utf8");
const chon = panel.slice(panel.indexOf("async function choosePrimaryDestination()"), panel.indexOf("function choosePrimaryDestinationFromUserGesture"));
assert.match(chon, /await window\.DacOutputProfiles\.reauthorizeSole\(\)/, "panel phải thử xin lại quyền trước");
assert.ok(
  chon.indexOf("reauthorizeSole") < chon.indexOf("showDirectoryPicker"),
  "xin lại phải đứng TRƯỚC hộp chọn — đảo lại là Đức luôn phải đi lại cả cây thư mục, đúng cái bản vá này gỡ"
);
assert.match(chon, /pruneOthers\(profileId\)/, "sau một lựa chọn tường minh thì dọn hồ sơ thừa, để lần reload sau xin lại được");
assert.ok(
  chon.indexOf("showDirectoryPicker") < chon.indexOf("pruneOthers"),
  "chỉ dọn SAU khi Đức đã tự tay chọn — dọn trước là đoán"
);

console.log("folder reauthorize (B-53): PASS");
