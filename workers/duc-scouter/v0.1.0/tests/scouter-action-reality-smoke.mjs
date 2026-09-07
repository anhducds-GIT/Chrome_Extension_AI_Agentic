/* scouter-action-reality-smoke.mjs — phép ghim cho phần CHẤM ĐIỂM của phép đo ② (`S-06`).
 *
 * Ghim cái gì, và cố ý KHÔNG ghim cái gì — cùng lý do với phép đo ①:
 *
 *   GHIM   — luật chấm: số đo nào ra ĐẠT, số đo nào ra KHÔNG ĐẠT.
 *   KHÔNG  — bản thân Chrome. Suite của gói chạy không cần trình duyệt, và một phép ghim đòi
 *            mở Chrome sẽ đỏ trên mọi máy không có Chrome — tức là nó báo sai chỗ.
 *
 * Vì sao phần chấm đáng được ghim riêng: nó là chỗ DUY NHẤT quyết định câu "ĐẠT hay không",
 * và `ROADMAP.md` treo cả bước 2 lên đúng câu đó. Một luật chấm nới lỏng âm thầm sẽ cho ra
 * "ĐẠT" trên một đường ghi đã bấm nhầm phần tử — đúng kịch bản phép đo tồn tại để bắt.
 *
 * GHIM CẢ HAI CHIỀU. Chiều "số đo tốt phải ra ĐẠT" là chiều dễ quên, mà thiếu nó thì cách sửa
 * rẻ nhất để test xanh là bắt `verdict()` luôn trả về không-đạt.
 *
 * Chạy: node tests/scouter-action-reality-smoke.mjs
 */

import { CRITERIA, verdict } from "../scripts/scouter-action-reality-probe.mjs";

let failures = 0;
function check(label, condition) {
  if (condition) console.log(`  xanh  ${label}`);
  else { console.log(`  ĐỎ    ${label}`); failures += 1; }
}

/* Số đo MẪU của một lượt ĐẠT — chép đúng hình dạng `measure()` sinh ra. */
function datHet() {
  return {
    click_tren2: { ok: true, hit: { id: "tren2", isTrusted: true, uaIsActive: true } },
    gate: { popupAllowed: true },
    click_duoi: { ok: true, hit: { id: "duoi" }, scrollY: 1288 },
    click_len: { ok: true, hit: { id: "tren1" } },
    type: { ok: true, value: "xin chao", trustedKeydowns: 8 },
    key: { ok: true, enter: { isTrusted: true, target: "txt" } },
    mo_ho: { ok: false, code: "SELECTOR_AMBIGUOUS", extraClicks: 0 },
    khong_khop: { ok: false, code: "SELECTOR_NO_MATCH", extraClicks: 0 },
    toa_do: { ok: false, code: "COORDINATE_NOT_ACCEPTED", extraClicks: 0 },
    ky_tu_dieu_khien: { ok: false, code: "TEXT_HAS_CONTROL_CHAR" },
    cdpUsed: ["DOM.getBoxModel", "Input.dispatchMouseEvent"],
    cdpOutside: []
  };
}

/* Sửa một nhánh sâu rồi trả về bản mới — để mỗi ca hỏng chỉ khác bản ĐẠT ĐÚNG MỘT CHỖ. */
function hong(sua) {
  const m = datHet();
  sua(m);
  return m;
}

console.log("scouter-action-reality-smoke — luật chấm của phép đo ②");

/* ---- ① Chiều THUẬN: số đo tốt phải ra ĐẠT ------------------------------- */
{
  const v = verdict(datHet());
  check("số đo của một lượt tốt ra ĐẠT", v.pass === true);
  check("mọi tiêu chí đều xanh", v.lines.every((l) => l.pass));
  check(`đủ ${CRITERIA.length} tiêu chí, không thiếu dòng nào`, v.lines.length === CRITERIA.length);
}

/* ---- ② Chiều NGHỊCH: mỗi hỏng hóc phải đỏ ĐÚNG tiêu chí của nó ----------
 * Đỏ đúng chỗ mới có giá trị. Một bản chấm "hễ có gì lạ thì đỏ hết" cũng đỏ, nhưng nó không
 * chỉ được cho người đọc chỗ nào hỏng — mà đó là cả công dụng của một phép đo. */
const CA_HONG = [
  ["bấm trúng phần tử BÊN CẠNH (lệch toạ độ)", "CLICK_LANDS_ON_THE_RIGHT_ELEMENT",
    (m) => { m.click_tren2.hit.id = "tren1"; }],
  ["trang không coi cú bấm là thật", "CLICK_IS_TRUSTED_AND_ACTIVATES",
    (m) => { m.click_tren2.hit.isTrusted = false; }],
  ["cổng hoạt động không mở (popup bị chặn)", "CLICK_IS_TRUSTED_AND_ACTIVATES",
    (m) => { m.gate.popupAllowed = false; }],
  ["không với được nút dưới màn hình", "CLICK_REACHES_BELOW_THE_FOLD",
    (m) => { m.click_duoi.hit.id = "doi"; }],
  ["cuộn được xuống nhưng không cuộn lại lên", "CLICK_SCROLLS_BACK_UP",
    (m) => { m.click_len.hit.id = "duoi"; }],
  ["ô nhập thiếu một ký tự", "TYPE_PUTS_THE_EXACT_TEXT_IN",
    (m) => { m.type.value = "xin cha"; }],
  ["chữ vào đủ nhưng phím không phải phím thật", "TYPE_PUTS_THE_EXACT_TEXT_IN",
    (m) => { m.type.trustedKeydowns = 0; }],
  ["Enter tới nhầm phần tử", "KEY_ENTER_ARRIVES_TRUSTED",
    (m) => { m.key.enter.target = "tren1"; }],
  ["selector mơ hồ KHÔNG bị từ chối", "AMBIGUOUS_SELECTOR_REFUSED_ON_A_REAL_DOM",
    (m) => { m.mo_ho = { ok: true, extraClicks: 1 }; }],
  ["từ chối selector mơ hồ NHƯNG vẫn kịp bấm", "AMBIGUOUS_SELECTOR_REFUSED_ON_A_REAL_DOM",
    (m) => { m.mo_ho.extraClicks = 1; }],
  ["selector không khớp gì lại bấm bừa", "NO_MATCH_SELECTOR_REFUSED",
    (m) => { m.khong_khop = { ok: true, extraClicks: 1 }; }],
  ["toạ độ người gọi đưa vào được chấp nhận", "CALLER_COORDINATES_REFUSED",
    (m) => { m.toa_do = { ok: true, extraClicks: 1 }; }],
  ["ký tự xuống dòng lọt vào giữa chuỗi", "CONTROL_CHAR_TEXT_REFUSED",
    (m) => { m.ky_tu_dieu_khien = { ok: true }; }],
  ["lõi gửi một lệnh CDP ngoài danh sách của chính nó", "CORE_STAYED_INSIDE_ITS_CDP_LIST",
    (m) => { m.cdpOutside = ["Runtime.evaluate"]; }],
  ["lõi không gửi lệnh nào — phép đo chạy rỗng", "CORE_STAYED_INSIDE_ITS_CDP_LIST",
    (m) => { m.cdpUsed = []; }]
];

for (const [ten, tieuChi, sua] of CA_HONG) {
  const v = verdict(hong(sua));
  const do_ = v.lines.filter((l) => !l.pass).map((l) => l.id);
  check(`${ten} → KHÔNG ĐẠT`, v.pass === false);
  check(`   …và đỏ đúng ${tieuChi}`, do_.includes(tieuChi));
}

/* ---- ③ Số đo THIẾU không được đọc thành ĐẠT ----------------------------
 * Chỗ này đã cắn thật ở nơi khác trong repo: một trường vắng mặt so sánh ra `undefined`, và
 * một luật chấm viết hớ sẽ coi đó là "không có gì sai". Phép đo chưa chạy phải ra KHÔNG ĐẠT. */
for (const rong of [{}, null, undefined, { click_tren2: {} }]) {
  const v = verdict(rong);
  check(`số đo rỗng (${JSON.stringify(rong)}) ra KHÔNG ĐẠT`, v.pass === false);
}

/* ---- ④ Mỗi tiêu chí phải giải thích được vì sao nó ở đây ---------------- */
{
  check("tiêu chí nào cũng có câu `why`", CRITERIA.every((c) => typeof c.why === "string" && c.why.length > 40));
  check("không có mã tiêu chí trùng nhau", new Set(CRITERIA.map((c) => c.id)).size === CRITERIA.length);
}

console.log(failures === 0
  ? `scouter-action-reality-smoke: ${CRITERIA.length} tiêu chí, ${CA_HONG.length} ca hỏng, tất cả ĐẠT`
  : `scouter-action-reality-smoke: ${failures} chỗ ĐỎ`);
process.exit(failures === 0 ? 0 : 1);
