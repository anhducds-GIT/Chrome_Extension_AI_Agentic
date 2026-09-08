/**
 * Ghim B-37: `audit_durable: false` phải nói RÕ vì sao, không gộp ba nguyên nhân vào một câu.
 *
 * Đo live 2026-09-08: Đức bấm chọn một thư mục, đóng/mở panel, rồi `jobs.add` qua Bridge vẫn
 * trả đúng một câu cố định *"phiên này chưa có thư mục nào Đức cấp quyền"*. Ba tình huống khác
 * nhau cùng cho ra câu đó, và ba tình huống ấy cần ba hành động khác nhau:
 *   ⑴ chưa hồ sơ nào còn quyền      → nhờ người bấm chọn một thư mục
 *   ⑵ có TỪ HAI hồ sơ trở lên       → (D) cố ý không chọn hộ; phải nhờ người nói RÕ cái nào
 *   ⑶ đọc kho hồ sơ không được      → bấm cũng không chữa, chuyện khác hẳn
 * Nên hôm đó tôi không kết luận được (D) hỏng hay (D) đang chạy đúng luật ở nhánh ⑵ — và một
 * câu báo không phân biệt được hai nguyên nhân thì nó không giúp chẩn đoán (bài học lỗi #2 của
 * `AI-OPERATOR-GUIDE.md`).
 *
 * KHÔNG grep chữ: cắt `outputAdoptReasonNote()` đã ship ra khỏi `sidepanel.js` và CHẠY nó với
 * từng trạng thái chẩn đoán. Grep chỉ thấy ba chuỗi có mặt; nó không phân biệt được "ba câu cho
 * ba nhánh" với "ba câu mà nhánh nào cũng trả về câu đầu".
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const sidepanel = fs.readFileSync(new URL("../sidepanel.js", import.meta.url), "utf8");

const dau = sidepanel.indexOf("  function outputAdoptReasonNote() {");
assert.ok(dau >= 0, "MỎ NEO KHÔNG KHỚP: không thấy outputAdoptReasonNote trong sidepanel.js");
const cuoi = sidepanel.indexOf("\n  async function adoptAuthorizedOutputProfile()", dau);
assert.ok(cuoi > dau, "MỎ NEO KHÔNG KHỚP: không thấy mép cuối của outputAdoptReasonNote");
const source = sidepanel.slice(dau, cuoi);

/** Chạy hàm đã ship với một trạng thái chẩn đoán cho trước. */
function noiGi(diag) {
  const ctx = { console, String, JSON, state: { outputAdoptDiag: diag } };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(`${source}\nglobalThis.__note = outputAdoptReasonNote;`, ctx);
  return ctx.__note();
}

const chuaCoDiag = noiGi(null);
const khongHoSo = noiGi({ reason: "KHONG_HO_SO_NAO_CON_QUYEN", profiles: 3, authorized: 0 });
const nhieuHoSo = noiGi({ reason: "NHIEU_HO_SO_KHONG_CHON_HO", profiles: 4, authorized: 2 });
const khoHong = noiGi({ reason: "KHO_HO_SO_KHONG_DOC_DUOC", profiles: null, authorized: null });

/* ⑴ Bốn nhánh phải ra BỐN câu khác nhau. Đây là toàn bộ điểm của B-37: trước lượt vá, cả bốn
   đều ra đúng một chuỗi hằng. */
const cau = { chuaCoDiag, khongHoSo, nhieuHoSo, khoHong };
const rieng = new Set(Object.values(cau));
assert.equal(
  rieng.size,
  4,
  "bốn nhánh phải ra bốn câu KHÁC nhau — trùng nhau nghĩa là B-37 quay lại:\n" +
  Object.entries(cau).map(([k, v]) => `  ${k}: ${v.slice(0, 90)}…`).join("\n")
);

/* ⑵ Nhánh "nhiều hồ sơ" phải nêu ĐÚNG CON SỐ, vì đó là thứ biến câu báo thành một việc làm
   được: người đọc biết mình phải CHỌN, không phải BẤM THÊM. */
assert.match(nhieuHoSo, /\b2\b/, "nhánh nhiều hồ sơ phải nêu số hồ sơ còn quyền (sân khấu: 2)");
assert.match(nhieuHoSo, /không chọn hộ|CỐ Ý/, "phải nói rõ đây là hành vi CỐ Ý, không phải lỗi");
assert.match(nhieuHoSo, /output\.configure|Side Panel/, "phải chỉ đường ra: chọn ở panel hoặc chỉ thẳng bằng output.configure");

/* ⑶ Nhánh kho hỏng phải nói rõ BẤM KHÔNG CHỮA ĐƯỢC. Đây là nhánh dễ bị nhập nhèm nhất: nếu nó
   cũng khuyên "chọn một thư mục" thì người vận hành sẽ bấm mãi mà không hiểu vì sao vô hiệu. */
assert.match(khoHong, /không đọc được kho hồ sơ/, "nhánh kho hỏng phải nói đúng nguyên nhân");
assert.match(khoHong, /KHÔNG phải chuyện bấm chọn|bấm cũng không chữa/, "phải nói rõ bấm không chữa được");

/* ⑷ Nhánh "không hồ sơ nào" phải nêu cả hai con số đếm được — nó là nhánh phân biệt "chưa từng
   cấp quyền" với "đã có hồ sơ nhưng quyền đã mất", và hai chuyện đó dẫn tới hai câu nhờ khác nhau. */
assert.match(khongHoSo, /3/, "phải nêu số hồ sơ tìm thấy");
assert.match(khongHoSo, /0/, "phải nêu số hồ sơ còn quyền");

/* ⑸ Mọi câu phải giữ ba tính chất operator đọc được: nói sổ đang được GIỮ, cảnh báo đóng panel
   là mất sổ, và viết tiếng Việt CÓ DẤU (luật vàng 5 — mã lỗi thì tiếng Anh, chữ người thì không). */
for (const [ten, noiDung] of Object.entries(cau)) {
  assert.match(noiDung, /giữ trong bộ nhớ phiên/, `${ten}: phải nói sổ đang được giữ, chưa ra file`);
  assert.match(noiDung, /mất sổ/, `${ten}: phải cảnh báo đóng panel trước lúc xả là mất sổ`);
  assert.match(noiDung, /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i,
    `${ten}: chữ operator phải là tiếng Việt CÓ DẤU`);
}

/* ---------- DÂY NỐI, không chỉ hàm lá ----------
   Thử phá 08/09 lộ ra rằng phần trên chỉ kiểm `outputAdoptReasonNote()` với chẩn đoán do TAY
   tôi đưa vào — nên xoá hẳn lượt GHI chẩn đoán trong `adoptAuthorizedOutputProfile()` vẫn để
   mọi test xanh. Hàm dựng câu đúng mà không ai điền dữ liệu cho nó thì câu vẫn sai. Đây đúng
   bài học "ghim cái DÂY, đừng chỉ ghim cái luật". */

const adoptDau = sidepanel.indexOf("  async function adoptAuthorizedOutputProfile() {");
assert.ok(adoptDau >= 0, "MỎ NEO KHÔNG KHỚP: không thấy adoptAuthorizedOutputProfile");
const adoptCuoi = sidepanel.indexOf("\n  /* Gọi ở MỌI chỗ vừa dựng một bộ settings", adoptDau);
assert.ok(adoptCuoi > adoptDau, "MỎ NEO KHÔNG KHỚP: không thấy mép cuối của adoptAuthorizedOutputProfile");
const adoptSource = sidepanel.slice(adoptDau, adoptCuoi);

/** Chạy hàm nhận-thư-mục đã ship, với kho hồ sơ giả. Trả về `{ketQua, diag}`. */
async function chayAdopt({ profiles, resolveRa, listNem = false, diagCu = null }) {
  const state = { outputSettings: { image: null }, separateResultDestination: false, outputAdoptDiag: diagCu };
  const ctx = {
    console, Object, Set, JSON, String,
    state,
    window: {
      DacOutputProfiles: {
        list: async () => { if (listNem) throw new Error("kho hong"); return profiles; },
        resolve: async (id) => resolveRa(id)
      },
      DacOutputLocation: { directoryLocation: (h, n) => ({ kind: "directory", handle: h, name: n }) }
    }
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(`${adoptSource}\nglobalThis.__adopt = adoptAuthorizedOutputProfile;`, ctx);
  const ketQua = await ctx.__adopt();
  return { ketQua, diag: state.outputAdoptDiag };
}

const hoSo = (id) => ({ profile_id: id, directory_handle: { id }, last_known_handle_name: `thu-muc-${id}` });
const choPhep = (p) => ({ state: "authorized", profile: p });

/* ⑹ KHÔNG hồ sơ nào còn quyền → phải ghi lý do kèm hai con số. */
{
  const { ketQua, diag } = await chayAdopt({
    profiles: [hoSo("a"), hoSo("b"), hoSo("c")],
    resolveRa: () => ({ state: "prompt" })
  });
  assert.equal(ketQua, null, "không hồ sơ nào còn quyền thì không nhận");
  assert.ok(diag, "phải GHI chẩn đoán — không ghi thì câu báo ở trên không có dữ liệu để nói");
  assert.equal(diag.reason, "KHONG_HO_SO_NAO_CON_QUYEN");
  assert.equal(diag.profiles, 3);
  assert.equal(diag.authorized, 0);
}

/* ⑺ HAI hồ sơ còn quyền → cố ý không chọn hộ, và lý do phải phân biệt được với ⑹. */
{
  const a = hoSo("a"), b = hoSo("b");
  const { ketQua, diag } = await chayAdopt({
    profiles: [a, b],
    resolveRa: (id) => choPhep(id === "a" ? a : b)
  });
  assert.equal(ketQua, null, "hai hồ sơ thì KHÔNG được chọn hộ — chọn hộ là ghi bằng chứng run này vào hồ sơ run khác");
  assert.equal(diag.reason, "NHIEU_HO_SO_KHONG_CHON_HO", "lý do phải khác hẳn ca 'không hồ sơ nào'");
  assert.equal(diag.authorized, 2, "phải đếm đúng số hồ sơ còn quyền — đó là con số câu báo đọc ra");
}

/* ⑻ Kho hồ sơ hỏng → lý do thứ ba, và KHÔNG được nuốt thành hai ca kia. */
{
  const { ketQua, diag } = await chayAdopt({ profiles: [], resolveRa: () => null, listNem: true });
  assert.equal(ketQua, null);
  assert.equal(diag.reason, "KHO_HO_SO_KHONG_DOC_DUOC");
}

/* ⑼ ĐÚNG MỘT hồ sơ → nhận, và chẩn đoán CŨ phải bị XOÁ.
   Sân khấu cố ý bắt đầu với một chẩn đoán CŨ còn nằm đó — đúng cảnh thật: lượt trước thất bại
   nên đã ghi lý do, rồi Đức cấp quyền, lượt sau thành công. Bản đầu của mép này bắt đầu với
   `null` nên xoá hẳn dòng dọn vẫn xanh (thử phá 08/09 bắt được) — một mép chỉ đo được cái nó
   dọn khi có thứ để dọn. */
{
  const a = hoSo("a");
  const { ketQua, diag } = await chayAdopt({
    profiles: [a],
    resolveRa: () => choPhep(a),
    diagCu: { reason: "NHIEU_HO_SO_KHONG_CHON_HO", profiles: 4, authorized: 2 }
  });
  assert.equal(ketQua, "a", "đúng một hồ sơ còn quyền thì phải NHẬN — đây là mép ngược, thiếu nó thì 'không bao giờ nhận' cũng xanh");
  assert.equal(
    diag,
    null,
    "nhận được rồi thì chẩn đoán CŨ phải bị xoá — giữ lại thì lượt hỏi sau vẫn đọc thấy lý do " +
    "'có hai thư mục' trong khi đã chọn xong, và câu báo nói sai trong lúc mọi thứ đã ổn"
  );
}
console.log("B-37 câu báo phân biệt được bốn nguyên nhân (9 mép, gồm dây nối ghi chẩn đoán): PASS");
