/* kiem-nhanh-smoke.mjs — phép ghim của nút "Kiểm tra kết nối" (`U3`).
 *
 * File này là bản chép của gói kia, **khác đúng dòng `import` bảng lệnh** — hai gói đặt
 * tên file lõi khác nhau. Hai file nó kiểm — `zoom-core.mjs` và `kiem-nhanh.mjs` — thì giống
 * **từng byte** giữa hai gói, và có phép ghim canh.
 *
 * HAI TẦNG:
 *   ⓐ gọi `kiemNhanh()` THẬT với năm phép dò giả — đo được từng bước, từng câu "làm gì tiếp".
 *   ⓑ trích khối `PHEP_DO_KIEM` THẬT ra khỏi `sidepanel.js` rồi chạy nó với một `engine` giả
 *     **áp đúng chữ ký của `ScouterEngine`**. Tầng này sinh ra từ một lỗi thật: bản đầu gọi
 *     `engine.runProbe("query", {...})` — sai cả thứ tự tham số (target đứng TRƯỚC) lẫn tên
 *     phép dò (`dom.query`, không phải `query`). Nó không ném; nó trả `PROBE_UNKNOWN` lặng lẽ,
 *     nên bước ④ sẽ luôn đỏ với một câu sai nguyên nhân. Một phép ghim dò chữ không thấy được
 *     loại lỗi này.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { kiemNhanh } from "../scripts/kiem-nhanh.mjs";
import { PROBE_NAMES } from "../scripts/scouter-probes.mjs";
import { capabilities } from "../scripts/scouter-bridge-core.mjs";

const goc = new URL("../", import.meta.url);
const nguon = fs.readFileSync(new URL("sidepanel.js", goc), "utf8");
const html = fs.readFileSync(new URL("sidepanel.html", goc), "utf8");

/* Cả hai giá trị này đọc TỪ CHÍNH GÓI, không gõ ở đây: file này được chép sang gói kia,
 * nơi số lệnh khác và tên miền là `null`. */
const SO_METHOD = capabilities().methods.length;
const neoMien = /const MIEN_LAM_VIEC = (null|"([^"]*)");/.exec(nguon);
assert.ok(neoMien, "không đọc được `MIEN_LAM_VIEC` từ `sidepanel.js`");
const MIEN = neoMien[2] ?? null;
const tabUdin = { targetId: "T1", url: `https://${MIEN || "vi-du-mien.test"}/canvas`, type: "page" };
const tabKhac = { targetId: "T2", url: "https://vi.wikipedia.org/", type: "page" };

/** Năm phép dò giả, mặc định là đường TỐT. Ghi lại phép nào đã bị gọi. */
function doGia(ghiDe = {}) {
  const daGoi = [];
  const co = (ten, fn) => async (...a) => { daGoi.push(ten); return fn(...a); };
  const nen = {
    day: co("day", async () => "connected"),
    nangLuc: co("nangLuc", async () => ({ methods: Array.from({ length: SO_METHOD }, (_, i) => ({ name: `m${i}`, read_only: i >= 5 })) })),
    quetTab: co("quetTab", async () => [tabKhac, tabUdin]),
    doTrang: co("doTrang", async () => 1),
    congTac: co("congTac", async () => ({ enabled: false, remaining: 0, cap_per_unlock: 200 }))
  };
  for (const [k, v] of Object.entries(ghiDe)) nen[k] = co(k, v);
  return { do_: nen, daGoi };
}

const chay = (ghiDe) => {
  const { do_, daGoi } = doGia(ghiDe);
  return kiemNhanh(do_, {
    mien: MIEN, soMethod: SO_METHOD,
    tenGoi: "goi-thu", cachBatMayChu: "Chạy `BO-KHOI-DONG.cmd`"
  }).then((k) => ({ ...k, daGoi }));
};

/* ═══ ⓐ ĐƯỜNG TỐT ══════════════════════════════════════════════════════════ */
{
  const k = await chay();
  assert.equal(k.dat, true, "mọi thứ tốt thì phải ĐẠT");
  assert.equal(k.buoc.length, 5, "năm bước, không phải sáu — xem đầu `kiem-nhanh.mjs`");
  assert.ok(k.buoc.every((b) => b.dat), "đường tốt không có bước nào đỏ");
  assert.ok(k.buoc.every((b) => b.lamGi === null), "đường tốt KHÔNG được hiện dòng 'làm gì tiếp'");
  if (MIEN) assert.match(k.buoc[2].noi, new RegExp(`1 tab ${MIEN}`), "phải nói rõ có mấy tab của miền đó");
  else assert.match(k.buoc[2].noi, /2 tab web/, "gói mở <all_urls> thì chỉ đếm tab web");
  assert.match(k.buoc[4].noi, /ĐANG ĐÓNG/, "công tắc đóng là mặc định, phải nói ra");
  assert.equal(k.buoc[4].dat, true, "công tắc ĐÓNG **không phải** hỏng — nó là lớp bảo vệ");
}

/* ═══ ⓐ CỬA BRIDGE — ba nguyên nhân, ba câu KHÁC NHAU ══════════════════════
 * Đây là tiêu chí đóng của `U3`: tắt máy chủ rồi bấm thì nó phải nói đúng "máy chủ chưa
 * chạy", KHÔNG nói "lỗi", và phải khác hẳn câu "chưa chọn tệp ghép cặp". */
{
  const tat = await chay({ day: async () => "disconnected" });
  assert.equal(tat.dat, false);
  assert.equal(tat.buoc.length, 1, "bước ① hỏng thì DỪNG — bốn dòng đỏ ăn theo sẽ chôn mất dòng đỏ thật");
  assert.match(tat.buoc[0].noi, /chưa nối được máy chủ Bridge/);
  assert.match(tat.buoc[0].lamGi, /BO-KHOI-DONG\.cmd/, "phải chỉ ra ĐÚNG câu bật máy chủ mà gói truyền vào");
  assert.doesNotMatch(tat.buoc[0].noi, /^lỗi|error/i, "không được trả lời bằng chữ 'lỗi'");

  const chuaGhep = await chay({ day: async () => "unpaired" });
  assert.equal(chuaGhep.buoc.length, 1);
  assert.match(chuaGhep.buoc[0].noi, /chưa chọn tệp ghép cặp/);
  assert.match(chuaGhep.buoc[0].lamGi, /tao-tep-ghep-cap\.mjs --goi goi-thu/,
    "câu sinh tệp ghép cặp phải mang ĐÚNG tên gói được truyền vào");

  assert.notEqual(tat.buoc[0].noi, chuaGhep.buoc[0].noi,
    "máy chủ chưa chạy KHÁC chưa ghép cặp — gộp một câu là bắt Đức đoán");
  assert.notEqual(tat.buoc[0].lamGi, chuaGhep.buoc[0].lamGi);

  const la = await chay({ day: async () => "dang-nao-do" });
  assert.equal(la.dat, false, "trạng thái lạ phải ĐỎ, không được coi là tốt");
  const nem = await chay({ day: async () => { throw new Error("kho luu hong"); } });
  assert.equal(nem.dat, false);
  assert.match(nem.buoc[0].noi, /kho luu hong/, "lỗi thật phải hiện ra, không bị nuốt");
}

/* ═══ ⓐ DỪNG Ở BƯỚC HỎNG ĐẦU TIÊN — và KHÔNG chạy phép dò phía sau ═════════
 * Không chỉ là chuyện đẹp mắt: bước ④ gắn `chrome.debugger` vào một tab thật. Chạy nó sau
 * khi dây đã đứt là làm thao tác mạnh nhất tiện ích này có, cho một câu hỏi vô nghĩa. */
{
  const k = await chay({ day: async () => "disconnected" });
  assert.deepEqual(k.daGoi, ["day"], "dây đứt thì KHÔNG được quét tab, KHÔNG được gắn debugger");
}
{
  const k = await chay({ nangLuc: async () => ({ methods: [{ name: "x", read_only: true }] }) });
  assert.equal(k.dat, false);
  assert.equal(k.buoc.length, 2, "sai số lệnh thì dừng ở bước ②");
  assert.match(k.buoc[1].lamGi, /nạp lại/, "phải bảo nạp lại tiện ích");
  assert.match(k.buoc[1].lamGi, new RegExp(`Chờ ${SO_METHOD} lệnh mà thấy 1`), "phải nói CHỜ bao nhiêu, THẤY bao nhiêu");
  assert.deepEqual(k.daGoi, ["day", "nangLuc"]);
}
{
  const k = await chay({ quetTab: async () => [{ targetId: "X", url: "chrome://extensions", type: "page" }] });
  assert.equal(k.buoc.length, 3, "không có tab web thì dừng ở bước ③");
  assert.match(k.buoc[2].lamGi, /chrome:/, "phải giải thích vì sao trang chrome:// không tính");
  assert.deepEqual(k.daGoi, ["day", "nangLuc", "quetTab"]);
}

/* ═══ ⓐ BƯỚC ③ — có tab web nhưng KHÔNG có tab Udin thì vẫn đi tiếp, có báo ═ */
{
  const k = await chay({ quetTab: async () => [tabKhac] });
  assert.equal(k.buoc[2].dat, true, "có tab web là qua bước ③, dù không phải tab Udin");
  if (MIEN) assert.match(k.buoc[2].noi, new RegExp(`KHÔNG có tab ${MIEN}`), "phải NÓI RA là chưa mở trang làm việc");
}

/* ═══ ⓐ BƯỚC ④ — ưu tiên tab Udin, và hỏng thì nói đúng nguyên nhân ════════ */
{
  const daDo = [];
  const k = await chay({ doTrang: async (t) => { daDo.push(t.targetId); return 1; } });
  assert.deepEqual(daDo, [MIEN ? tabUdin.targetId : tabKhac.targetId],
    "phải dò ĐÚNG tab Udin, không phải tab đầu danh sách — chỉ tab ấy hỏng thì ba bước trên vẫn xanh mà việc thật vẫn chết");
  assert.equal(k.dat, true);
}
{
  const k = await chay({ doTrang: async () => { throw new Error("ATTACH_FAILED: Another debugger"); } });
  assert.equal(k.buoc.length, 4);
  assert.equal(k.buoc[3].dat, false);
  assert.match(k.buoc[3].noi, /Another debugger/, "lý do thật của Chrome phải tới được mắt Đức");
  assert.match(k.buoc[3].lamGi, /DevTools/, "và phải kèm việc cần làm");
}
{
  const k = await chay({ doTrang: async () => 0 });
  assert.equal(k.buoc[3].dat, false, "`body` khớp 0 nghĩa là không đọc được, dù không ném");
}

/* ═══ ⓐ BƯỚC ⑤ — công tắc MỞ thì báo số lượt còn lại ═══════════════════════ */
{
  const k = await chay({ congTac: async () => ({ enabled: true, remaining: 17, cap_per_unlock: 200 }) });
  assert.equal(k.dat, true);
  assert.match(k.buoc[4].noi, /ĐANG MỞ/);
  assert.match(k.buoc[4].noi, /17\/200/, "phải hiện số lượt còn lại — Đức cần biết mình sắp hết TRƯỚC khi hết");
}
{
  const k = await chay({ congTac: async () => { throw new Error("khong doc duoc"); } });
  assert.equal(k.dat, true, "đọc công tắc hỏng KHÔNG được làm cả bộ kiểm thành ĐỎ — nó chỉ là dòng báo");
  assert.equal(k.buoc.length, 5);
}

/* ═══ ⓐ SỐ LỆNH ghim vào bảng lệnh THẬT, không gõ tay ══════════════════════ */
assert.match(nguon, /soMethod: capabilities\(\)\.methods\.length/,
  "nơi gọi phải ĐẾM từ bảng lệnh thật, không gõ một con số vào — hai con số gõ ở hai chỗ thì sớm muộn lệch");
/* `kiemNhanh` la async, nen no TRA VE mot promise bi tu choi chu khong nem tai cho:
   `assert.throws` se khong bat duoc, va phep ghim se xanh gia. */
await assert.rejects(() => kiemNhanh({}, { tenGoi: "x", cachBatMayChu: "y" }), /soMethod/,
  "thiếu `soMethod` thì NÉM, không được lặng lẽ dùng một con số mặc định của gói nào");

/* ═══ ⓑ KHỐI PHÉP DÒ THẬT trong `sidepanel.js` ═════════════════════════════ */

const neo = /const PHEP_DO_KIEM = \{[\s\S]*?\n\};\n/.exec(nguon);
assert.ok(neo, "neo khối `PHEP_DO_KIEM` hỏng — tầng ⓑ sẽ không chạy gì mà vẫn xanh");

const daGan = [];
const ctx = vm.createContext({
  console, URL,
  TRANSPORT_CONSTANTS: { STATUS_STORAGE_KEY: "kh_trang_thai" },
  capabilities,
  readWriteGateState: async () => ({ enabled: false, remaining: 0, cap_per_unlock: 200 }),
  chrome: { storage: { local: { get: async () => ({ kh_trang_thai: { status: "connected" } }) } } },
  /* `engine` giả ÁP ĐÚNG CHỮ KÝ của `ScouterEngine`. Đây là chỗ bắt lỗi thật đã xảy ra. */
  engine: {
    scanTargets: async () => [tabKhac, tabUdin],
    runProbe: async (target, name, params) => {
      assert.ok(target && (target.id || target.targetId),
        "tham số THỨ NHẤT của `runProbe` là TARGET, không phải tên phép dò");
      assert.ok(PROBE_NAMES.includes(name),
        `'${name}' không nằm trong PROBE_NAMES — \`ScouterEngine\` sẽ trả PROBE_UNKNOWN chứ KHÔNG ném, nên lỗi này im lặng`);
      daGan.push({ id: target.id ?? target.targetId, name, params });
      return { ok: true, probe: name, data: { selector: params.selector, matchCount: 1 }, cdp: [] };
    }
  }
});
vm.runInContext(neo[0] + "\nglobalThis.__do = PHEP_DO_KIEM;", ctx);
const doThat = ctx.__do;

assert.equal(await doThat.day(), "connected", "phép dò dây phải đọc đúng khoá trạng thái của transport");
assert.equal((await doThat.nangLuc()).methods.length, SO_METHOD);
assert.equal((await doThat.quetTab()).length, 2);
assert.equal(await doThat.doTrang(tabUdin), 1, "phép dò trang phải trả về `matchCount`, không phải cả phong bì");
/* So từng trường chứ không `deepStrictEqual`: `params` sinh BÊN TRONG vm nên prototype của
 * nó thuộc realm khác, và phép so đỏ với hai giá trị in ra giống hệt nhau. */
assert.equal(daGan.length, 1, "bước ④ gắn debugger ĐÚNG một lượt");
assert.equal(daGan[0].id, tabUdin.targetId, "phải dò đúng tab Udin");
assert.equal(daGan[0].name, "dom.query", "phải đi ĐÚNG đường mà `scout.query` đi");
assert.equal(daGan[0].params.selector, "body");
assert.equal(daGan[0].params.limit, 1);

/* Phép dò thất bại trả `{ ok:false }` chứ KHÔNG ném. Không bóc ra thì bước ④ đọc `undefined`
 * rồi báo một nguyên nhân sai. */
{
  const ctx2 = vm.createContext({
    console, URL, TRANSPORT_CONSTANTS: { STATUS_STORAGE_KEY: "k" }, capabilities,
    readWriteGateState: async () => ({}), chrome: { storage: { local: { get: async () => ({}) } } },
    engine: { scanTargets: async () => [], runProbe: async () => ({ ok: false, code: "ATTACH_FAILED", detail: "Another debugger is already attached" }) }
  });
  vm.runInContext(neo[0] + "\nglobalThis.__do = PHEP_DO_KIEM;", ctx2);
  await assert.rejects(() => ctx2.__do.doTrang(tabUdin), /ATTACH_FAILED/,
    "`{ ok:false }` phải được ném ra, không được trả về lặng lẽ");
}

/* ═══ ⓑ Khối trên HTML phải có đủ ba mảnh nút này dùng ═════════════════════ */
for (const id of ["kiem-chay", "kiem-ket", "kiem-list"]) {
  assert.match(html, new RegExp(`id="${id}"`), `thiếu #${id} thì nút kiểm tra không vẽ được gì`);
}
assert.match(html, /aria-live="polite"[^>]*>|id="kiem-ket"[^>]*aria-live="polite"/,
  "dòng kết luận phải `aria-live` — nó đổi sau khi bấm, và trình đọc màn hình cần biết");

/* ═══ ⓒ MỌI `id` BẢNG BÊN GỌI ĐỀU PHẢI CÓ TRONG HTML ════════════════
 * `$("#x").addEventListener(…)` trên một `id` không có sẽ ném `TypeError` và **giết mọi dòng phía
 * sau** — tức một nút mới gõ nhầm tên làm hỏng cả những nút đã chạy tốt. MV3 không báo gì: trang
 * vẫn tải, chỉ có mã là không chạy, và người ngồi trước nó chỉ thấy một bảng trắng.
 *
 * Đây là nửa TĨNH, chạy không cần Chrome nên nó nằm trong suite nhanh. Nửa SỐNG — nạp gói vào
 * một Chrome sạch rồi nghe console — ở `duc-scouter/v0.1.0/scripts/do-bang-ben.mjs`, chạy bằng
 * `npm run scouter:bang-ben` hoặc `npm run udin:bang-ben`. */
{
  const idGoi = new Set();
  for (const mm of nguon.matchAll(/\$\(\s*["'`]#([A-Za-z0-9_-]+)["'`]\s*\)/g)) idGoi.add(mm[1]);
  for (const mm of nguon.matchAll(/getElementById\(\s*["'`]([A-Za-z0-9_-]+)["'`]\s*\)/g)) idGoi.add(mm[1]);
  assert.ok(idGoi.size > 10, "không rút được `id` nào từ `sidepanel.js` — neo hỏng thì khối này mất răng mà vẫn xanh");
  const idCo = new Set([...html.matchAll(/\sid="([A-Za-z0-9_-]+)"/g)].map((mm) => mm[1]));
  const thieu = [...idGoi].filter((id) => !idCo.has(id)).sort();
  assert.deepEqual(thieu, [],
    `bảng bên gọi những id KHÔNG có trong HTML: ${thieu.join(", ")} — mỗi cái là một \`TypeError\` giết phần còn lại của file`);
}

console.log("kiem-nhanh-smoke: OK");
