/* scouter-input-trust-smoke.mjs — phép ghim cho phần CHẤM ĐIỂM của phép đo ①.
 *
 * Ghim cái gì, và cố ý KHÔNG ghim cái gì:
 *
 *   GHIM   — luật chấm: nhật ký nào thì ra ĐẠT, nhật ký nào thì ra KHÔNG ĐẠT.
 *   KHÔNG  — bản thân Chrome. Suite gốc repo chạy không cần trình duyệt (package.json), và
 *            một phép ghim đòi mở Chrome sẽ đỏ trên mọi máy không có Chrome — tức là nó
 *            báo sai chỗ.
 *
 * Vì sao phần chấm đáng được ghim riêng: nó là chỗ DUY NHẤT quyết định câu "ĐẠT hay không",
 * và ADR-0010 treo thứ tự 24 mục còn lại lên đúng câu đó. Một luật chấm nới lỏng âm thầm
 * sẽ cho ra "ĐẠT" trên một trình duyệt đã chặn — mà đó chính là kịch bản phép đo tồn tại
 * để bắt.
 *
 * Chạy: node tests/scouter-input-trust-smoke.mjs
 */

import { CRITERIA, splitByMark, summarise, verdict } from "../scripts/scouter-input-trust-probe.mjs";

let failures = 0;
function check(label, condition) {
  if (condition) {
    console.log(`  xanh  ${label}`);
  } else {
    console.log(`  ĐỎ    ${label}`);
    failures += 1;
  }
}

/* Nhật ký MẪU của một lượt đo ĐẠT — chép đúng hình dạng trang thử sinh ra. */
function passingRaw(overrides = {}) {
  const ev = (type, extra = {}) => ({
    type, isTrusted: false, target: "btn", activeElement: "btn",
    uaIsActive: false, uaHasBeenActive: false, key: null, inputType: null, valueLength: null, ...extra
  });
  const raw = {
    log: [
      { mark: "A_dispatchEvent" }, ev("click", { isTrusted: false }),
      { mark: "B_elementClick" }, ev("click", { isTrusted: false }),
      { mark: "C_cdpMouse" },
      ev("mousedown", { isTrusted: true, uaIsActive: true }),
      ev("click", { isTrusted: true, uaIsActive: true, uaHasBeenActive: true }),
      { mark: "D_valueAssign" }, ev("input", { target: "txt", valueLength: 1 }),
      { mark: "E_cdpKey" },
      ev("keydown", { isTrusted: true, target: "txt", key: "a", uaIsActive: true, valueLength: 1 }),
      ev("input", { isTrusted: true, target: "txt", inputType: "insertText", valueLength: 2 }),
      { mark: "F_insertText" }, ev("input", { isTrusted: true, target: "txt", valueLength: 4 })
    ],
    gate: { popupAllowed: true },
    insertTextAvailable: true
  };
  return { ...raw, ...overrides };
}

/** Sửa đúng một sự kiện trong một chặng — để mỗi ca hỏng chỉ hỏng một chỗ. */
function mutate(raw, mark, type, patch) {
  const log = raw.log.map((e) => e);
  let inStage = false;
  for (let i = 0; i < log.length; i += 1) {
    if (log[i].mark) { inStage = log[i].mark === mark; continue; }
    if (inStage && log[i].type === type) { log[i] = { ...log[i], ...patch }; break; }
  }
  return { ...raw, log };
}

console.log("① luật chấm nói ĐẠT với một lượt đo tốt");
check("lượt đo tốt → ĐẠT", verdict(passingRaw()).pass === true);
check("cả năm tiêu chí đều xanh", verdict(passingRaw()).lines.every((l) => l.pass));

console.log("② mỗi cách hỏng phải làm luật chấm ĐỎ — không cách nào được lọt");
const broken = [
  ["bấm qua trình duyệt ra isTrusted=false (Chrome đã chặn)",
    mutate(passingRaw(), "C_cdpMouse", "click", { isTrusted: false })],
  ["bấm qua trình duyệt không mở được cổng hoạt động",
    mutate(passingRaw(), "C_cdpMouse", "click", { uaIsActive: false })],
  ["popup bị chặn dù isTrusted=true",
    { ...passingRaw(), gate: { popupAllowed: false } }],
  ["trang thử hỏng: sự kiện giả lập lại ra isTrusted=true",
    mutate(passingRaw(), "A_dispatchEvent", "click", { isTrusted: true })],
  ["trang thử hỏng: element.click() lại ra isTrusted=true",
    mutate(passingRaw(), "B_elementClick", "click", { isTrusted: true })],
  ["gõ phím trusted nhưng ô nhập KHÔNG dài thêm",
    mutate(passingRaw(), "E_cdpKey", "input", { valueLength: 1 })],
  ["gõ phím ra isTrusted=false",
    mutate(passingRaw(), "E_cdpKey", "keydown", { isTrusted: false })],
  ["không có cổng hoạt động nào được ghi",
    { ...passingRaw(), gate: null }],
  ["nhật ký rỗng — phép đo chưa chạy gì",
    { log: [], gate: null, insertTextAvailable: false }],
  /* Ca này bắt được thứ tám ca trên KHÔNG bắt được, và nó là ca THẬT: lệnh CDP được nhận,
   * nhưng trang KHÔNG hề thấy cú bấm nào (EXP-14 mục 17 gọi là INPUT_ACCEPTED_APP_IGNORED).
   * Lúc đó `isTrusted` không phải false — nó KHÔNG TỒN TẠI. Luật chấm viết bằng "khác false"
   * sẽ chấm ĐẠT cho đúng cảnh này; đột biến kiểm ngày 06/09 đã chứng minh chỗ đó sống sót,
   * nên ca này được thêm vào để giết nó. */
  ["lệnh được nhận nhưng trang không thấy cú bấm nào",
    { ...passingRaw(), log: passingRaw().log.filter((e) => !(e.type === "click" && e.isTrusted === true)) }]
];
for (const [label, raw] of broken) check(`${label} → KHÔNG ĐẠT`, verdict(raw).pass === false);

console.log("③ chốt chống nới lỏng âm thầm");
/* Xoá bớt một tiêu chí là cách rẻ nhất để "cho nó xanh". Ghim con số lại thì việc đó phải
 * đi kèm sửa file này, tức là phải cố ý. */
check("đúng năm tiêu chí, không ai bớt đi cái nào", CRITERIA.length === 5);
check("mọi tiêu chí đều có câu VÌ SAO cho người đọc",
  CRITERIA.every((c) => typeof c.why === "string" && c.why.length > 20));
check("đủ mặt năm mã tiêu chí",
  ["A_JS_DISPATCH_UNTRUSTED", "B_ELEMENT_CLICK_UNTRUSTED", "C_CDP_MOUSE_TRUSTED",
    "C_CDP_MOUSE_ACTIVATES", "E_CDP_KEY_TRUSTED_AND_TYPED"]
    .every((id) => CRITERIA.some((c) => c.id === id)));

console.log("④ từng tiêu chí phải tự đứng được, không dựa vào tiêu chí bên cạnh");
/* Vì sao mục này tồn tại: chấm theo TỔNG (`verdict().pass`) che mất tiêu chí hỏng, vì chỉ
 * cần MỘT tiêu chí đỏ là tổng đã đỏ. Đột biến kiểm 06/09 chứng minh chỗ đó: nới
 * `C_CDP_MOUSE_TRUSTED` từ `=== true` thành `!== false` SỐNG SÓT qua toàn bộ mục ②, vì
 * `C_CDP_MOUSE_ACTIVATES` đỏ hộ nó. Bản nới lỏng đó chấm ĐẠT cho một trang KHÔNG hề thấy cú
 * bấm nào. Nên từ đây mỗi tiêu chí được soi RIÊNG. */
const lineOf = (raw, id) => verdict(raw).lines.find((l) => l.id === id);
const noClickAtAll = {
  ...passingRaw(),
  log: passingRaw().log.filter((e) => !(e.type === "click" && e.isTrusted === true))
};
check("C_CDP_MOUSE_TRUSTED tự đỏ khi trang KHÔNG ghi được cú bấm nào",
  lineOf(noClickAtAll, "C_CDP_MOUSE_TRUSTED").pass === false);
check("C_CDP_MOUSE_TRUSTED tự đỏ khi cú bấm ra isTrusted=false",
  lineOf(mutate(passingRaw(), "C_cdpMouse", "click", { isTrusted: false }), "C_CDP_MOUSE_TRUSTED").pass === false);
check("C_CDP_MOUSE_TRUSTED xanh ở lượt đo tốt",
  lineOf(passingRaw(), "C_CDP_MOUSE_TRUSTED").pass === true);
check("B_ELEMENT_CLICK_UNTRUSTED tự đỏ khi element.click() ra true",
  lineOf(mutate(passingRaw(), "B_elementClick", "click", { isTrusted: true }), "B_ELEMENT_CLICK_UNTRUSTED").pass === false);
check("E_CDP_KEY_TRUSTED_AND_TYPED tự đỏ khi ô nhập không dài thêm",
  lineOf(mutate(passingRaw(), "E_cdpKey", "input", { valueLength: 1 }), "E_CDP_KEY_TRUSTED_AND_TYPED").pass === false);
check("C_CDP_MOUSE_ACTIVATES tự đỏ khi popup bị chặn",
  lineOf({ ...passingRaw(), gate: { popupAllowed: false } }, "C_CDP_MOUSE_ACTIVATES").pass === false);

console.log("⑤ cắt nhật ký theo mốc");
const stages = splitByMark(passingRaw().log);
check("cắt ra đủ sáu chặng", Object.keys(stages).length === 6);
check("sự kiện trước mốc đầu tiên bị bỏ, không gán nhầm vào chặng nào",
  Object.keys(splitByMark([{ type: "click", isTrusted: true }])).length === 0);
check("đếm đúng số ký tự gõ thêm", summarise(passingRaw()).E.typedChars === 1);

console.log(failures === 0 ? "\nXANH — luật chấm của phép đo ① còn nguyên." : `\nĐỎ — ${failures} mục.`);
process.exit(failures === 0 ? 0 : 1);
