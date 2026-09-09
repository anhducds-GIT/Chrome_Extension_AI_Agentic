/**
 * Ghim ADR-0050 mục ⒠: nắp chờ giữa hai lượt gửi Bridge = 90 giây, khai ở ĐÚNG MỘT CHỖ,
 * và cái cửa chặn ấy phải THẬT SỰ CHẶN.
 *
 * Đức hạ 5 phút xuống 90 giây ngày 08/09, nguyên văn: *"Tôi mở khoá bridge trial Min xuống còn
 * 90 giây."* Con số này đáng canh vì nó là **lớp chắn CUỐI** chống một vòng lặp hỏng đốt sạch
 * hạn mức: hạ xuống 90 giây làm tốc độ tiêu credit tối đa tăng hơn ba lần, và sau lượt này hai
 * lớp còn lại chỉ là công tắc Chế độ phát triển và nắp 30 job mỗi lượt.
 *
 * Trước lượt này **không phép ghim nào canh GIÁ TRỊ** — hai phép ghim có sẵn chỉ khẳng định cái
 * TÊN `BRIDGE_TRIAL_MIN_INTERVAL_MS` còn xuất hiện. Nên con số đổi được mà cả suite vẫn xanh.
 *
 * **Bản đầu của chính file này chỉ ghim TĨNH, và thử phá cho 3/5 — hai con thoát đều là lỗ thật:**
 * gõ cứng `const remainingSeconds = 90;` (câu báo nói dối từ giây thứ hai) và `if (false)` (cửa
 * chặn mở toang) đều đi qua, vì khẳng định tĩnh chỉ soi xem *chuỗi có mặt không*. Nên bốn mép
 * cuối **CHẠY** `bridgeRunTrial()` đã ship, dùng lại đúng cách cắt của
 * `run-trial-workbook-not-loaded-smoke.mjs`.
 *
 * Bảy mép:
 *   ⑴ giá trị đúng 90 giây, đọc từ chính hằng đã ship
 *   ⑵ khai ở ĐÚNG MỘT CHỖ — cùng kỷ luật ADR-0015 dựng cho trần thời gian
 *   ⑶ vẫn còn một nắp thật: 0 hoặc âm là bỏ nắp, không phải "nới nắp"
 *   ⑷ vừa chạy xong → CHẶN, và chặn TRƯỚC khi chạm cửa validate
 *   ⑸ số giây báo ra phải SUY TỪ mốc lượt trước, không phải hằng số chết
 *   ⑹ quá 90 giây → cho đi tiếp (mép ngược: chống một bản "chặn mọi lúc")
 *   ⑺ chưa từng chạy trial → cho đi tiếp
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
await import(pathToFileURL(path.join(here, "..", "bridge-core.js")));
const core = globalThis.DacBridgeCore;

const source = fs.readFileSync(path.join(here, "..", "sidepanel.js"), "utf8").split("\r\n").join("\n");

/* ---------- ⑴⑵⑶ giá trị và nơi khai ---------- */

const dong = source.split("\n").filter((l) => /^\s*const BRIDGE_TRIAL_MIN_INTERVAL_MS\s*=/.test(l));
assert.equal(dong.length, 1, `phải khai ĐÚNG MỘT chỗ — thấy ${dong.length}`);

const ctxHang = {};
vm.createContext(ctxHang);
vm.runInContext(`${dong[0]}\nglobalThis.__nap = BRIDGE_TRIAL_MIN_INTERVAL_MS;`, ctxHang);
const NAP = ctxHang.__nap;

assert.equal(NAP, 90 * 1000, `ADR-0050 mục ⒠ chốt 90 giây — đang là ${NAP / 1000} giây`);
assert.ok(
  Number.isFinite(NAP) && NAP > 0,
  "nắp phải là một số dương thật: 0 hoặc âm là BỎ nắp, và đó là một quyết định khác hẳn " +
  "'hạ nắp' — nó gỡ lớp chắn cuối chống vòng lặp hỏng đốt sạch hạn mức của Đức"
);

/* Không gõ lại con số ở đâu khác. Cùng cái bẫy ADR-0015 đã gặp: trước lượt vá đó, trần 90 giây
   nằm rải ở BỐN nơi, và sửa một chỗ để ba chỗ kia nói khác đi. Lọc dòng chú giải trước khi soi —
   chuỗi "5 phút" cố ý còn trong chú giải để kể lại giá trị cũ. */
const maThuan = source
  .split("\n")
  .filter((l) => !l.trim().startsWith("//") && !l.trim().startsWith("*") && !l.trim().startsWith("/*"))
  .filter((l) => !/const BRIDGE_TRIAL_MIN_INTERVAL_MS/.test(l))
  .join("\n");
assert.doesNotMatch(maThuan, /\b90000\b/, "đừng gõ lại nắp dưới dạng 90000 — dẫn xuất từ hằng");
assert.doesNotMatch(maThuan, /\b90 \* 1000\b/, "đừng gõ lại nắp dưới dạng `90 * 1000` — dẫn xuất từ hằng");

/* ---------- ⑷⑸⑹⑺ CHẠY hàm đã ship ---------- */

const START = "\n  async function bridgeRunTrial(params, call) {\n";
assert.equal(source.split(START).length - 1, 1, "cắt được ĐÚNG một hàm bridgeRunTrial() — 0 nghĩa là mỏ neo hỏng");
const from = source.indexOf(START) + 1;
const END = "\n  }\n";
const to = source.indexOf(END, from);
assert.ok(to > from, "không tìm thấy chỗ đóng hàm bridgeRunTrial()");
const shipped = source.slice(from, to + END.length);
assert.ok(shipped.includes("await assertBridgeSubmitCooldown();"), "cắt nhầm khối: bridgeRunTrial() phải gọi cửa chặn nắp chờ dùng chung");

/* ═══ MỘT NGÂN SÁCH, MỌI CỬA — mép chịu tải của B-42 ═══

   `chat.say` gõ một tin nhắn thật vào hội thoại của Đức, nên nó tiêu quota y như một lượt
   trial. Nếu nó có nắp chờ RIÊNG — kể cả một bản sao đọc cùng một khoá — thì tốc độ tiêu credit
   tối đa của cả gói **gấp đôi**, và cái nới đó không hiện ra ở đâu trong diff: hai hàm giống
   nhau từng chữ vẫn là hai ngân sách. Nên ghim ba vế: cả hai cửa gọi ĐÚNG MỘT hàm · chỉ có
   ĐÚNG MỘT chỗ đọc/ghi khoá mốc trong cả file · và `chat.say` gọi nó TRƯỚC lượt gõ. */
{
  const than = source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/.*$/gm, " ");
  const goi = [...than.matchAll(/await assertBridgeSubmitCooldown\(\);/g)].length;
  assert.equal(goi, 2, `phải có ĐÚNG 2 cửa gọi nắp chờ (run.trial và chat.say), đếm được ${goi}. Thêm cửa gửi thứ ba thì nó CŨNG phải đi qua đây, đừng nới mép này`);
  const khai = [...than.matchAll(/async function assertBridgeSubmitCooldown\(/g)].length;
  assert.equal(khai, 1, "và chỉ ĐÚNG MỘT bản cài — hai bản sao là hai ngân sách");
  assert.equal([...than.matchAll(/BRIDGE_TRIAL_MIN_INTERVAL_MS/g)].length, 2, "hằng nắp chờ chỉ được khai một chỗ và đọc một chỗ");

  const S2 = "\n  async function bridgeChatSay(params, call) {\n";
  assert.equal(source.split(S2).length - 1, 1, "mỏ neo hỏng: không thấy bridgeChatSay()");
  const f2 = source.indexOf(S2) + 1;
  const thanSay = source.slice(f2, source.indexOf("\n  }\n", f2) + "\n  }\n".length);
  assert.ok(thanSay.indexOf("assertBridgeSubmitCooldown()") < thanSay.indexOf("DAC_CHAT_SAY"), "chat.say phải qua nắp chờ TRƯỚC khi gõ");
  assert.ok(thanSay.indexOf("assertTrialDevMode") < thanSay.indexOf("assertBridgeSubmitCooldown()"), "và qua công tắc Chế độ phát triển trước cả nắp chờ");
  assert.ok(thanSay.includes("queueRunLock.tryBeginMutation()"), "chat.say phải LẤY latch, không đọc cờ — nó await nhiều lần");
  assert.ok(thanSay.indexOf("stampBridgeSubmit()") < thanSay.indexOf("sendMessage(workspaceTab.id, payload)"), "đóng dấu nắp TRƯỚC lượt gửi: một lượt chết giữa đường mà không tiêu nắp là mất phanh");
  assert.ok(thanSay.indexOf("ghiSoChatSay(dong)") < thanSay.indexOf("if (!dong.submitted) throw"), "ghi sổ TRƯỚC khi ném: lượt không khẳng định được là lượt cần có trong sổ nhất");
  assert.ok(!/expectImage|reference_images|referenceImages|saveGeneratedImage|output_folder/.test(thanSay), "chat.say không đính tệp, không sinh ảnh, không chạm thư mục đích");
}

/* B-42 tách phép kiểm nắp chờ ra `assertBridgeSubmitCooldown()` để `chat.say` dùng ĐÚNG NÓ
   thay vì một bản sao. Sân khấu phải nạp thêm hàm đó — nếu không thì `bridgeRunTrial()` cắt ra
   sẽ ném `ReferenceError`, và một `ReferenceError` đọc y hệt "bản vá làm hỏng luật". Nạp hàm
   THẬT, không giả: cả hai cửa nay được kiểm qua cùng một khối mã đã ship. */
const COOL = "\n  async function assertBridgeSubmitCooldown() {\n";
assert.equal(source.split(COOL).length - 1, 1, "cắt được ĐÚNG một hàm assertBridgeSubmitCooldown()");
const coolFrom = source.indexOf(COOL) + 1;
const coolFn = source.slice(coolFrom, source.indexOf("\n  }\n", coolFrom) + "\n  }\n".length);
assert.ok(coolFn.includes("TRIAL_COOLDOWN_ACTIVE"), "cắt nhầm khối: hàm nắp chờ phải chứa mã lỗi của nó");

const REQ = "\n  function requireBridgeWorkbook() {\n";
assert.equal(source.split(REQ).length - 1, 1, "cắt được ĐÚNG một hàm requireBridgeWorkbook()");
const reqFrom = source.indexOf(REQ) + 1;
const requireFn = source.slice(reqFrom, source.indexOf(END, reqFrom) + END.length);

const constants = source.match(/^ {2}const BRIDGE_(?:LAST_TRIAL_STORAGE_KEY|TRIAL_MIN_INTERVAL_MS) = .*$/gm) || [];
assert.equal(constants.length, 2, "mỏ neo hỏng: phải lấy được đúng 2 hằng số của đường trial");

/** Khoá kho lưu mốc lượt trước — lấy từ chính mã đã ship, không chép tay. */
const ctxKhoa = {};
vm.createContext(ctxKhoa);
vm.runInContext(`${constants.join("\n")}\nglobalThis.__k = BRIDGE_LAST_TRIAL_STORAGE_KEY;`, ctxKhoa);
const KHOA = ctxKhoa.__k;
assert.ok(typeof KHOA === "string" && KHOA.length > 0, "mỏ neo hỏng: không đọc được khoá kho lưu mốc lượt trước");

/** Dựng sân khấu với một mốc "lượt trial gần nhất" cho trước. `null` = chưa từng chạy. */
function sanKhau(lastTrialAt) {
  const touched = { validated: 0 };
  const sandbox = {
    window: { DacBridgeCore: core },
    state: { bridgeDevMode: true, workbook: { jobs: [{ id: "Q001" }], config: {} }, runSelection: new Set(), prepared: { queue: [], settings: {} } },
    queueRunLock: { tryBeginRun: () => true, endRunStart: () => {} },
    clearBridgeAttention: () => {},
    bindRunTab: async () => {},
    resolveWorkspaceTab: async () => null,
    releaseRunTab: () => {},
    controls: () => {},
    authoritativeValidate: async () => { touched.validated += 1; throw new Error("Open an XLSX workbook first."); },
    chrome: {
      storage: {
        local: {
          get: async () => (lastTrialAt === null ? {} : { [KHOA]: lastTrialAt }),
          set: async () => {}
        }
      }
    },
    crypto, Date, console, Set, Number, Math, touched
  };
  vm.createContext(sandbox);
  vm.runInContext(`${constants.join("\n")}\nvar bridgeRunTrial;${coolFn}${requireFn}${shipped}bridgeRunTrial`, sandbox);
  return { sandbox, touched };
}

const goi = async (sandbox) => sandbox.bridgeRunTrial({ job_ids: ["Q001"] }, {}).then(() => null, (e) => e);

/* ⑷ Vừa chạy xong → phải CHẶN, và chặn trước cửa validate. */
{
  const { sandbox, touched } = sanKhau(Date.now());
  const loi = await goi(sandbox);
  assert.ok(loi, "vừa chạy trial xong mà gọi lại thì phải bị chặn");
  assert.match(String(loi.message || ""), /TRIAL_COOLDOWN_ACTIVE/, "phải là đúng cửa chặn nắp chờ, không phải một lỗi khác tình cờ");
  assert.equal(
    touched.validated,
    0,
    "nắp chờ phải chặn TRƯỚC khi chạm authoritativeValidate() — rơi tới đó rồi thì lượt gọi đã " +
    "làm việc thật, và cái nắp chỉ còn là lời nói"
  );
}

/* ⑸ Số giây báo ra phải SUY TỪ mốc lượt trước. Đây là mép mà bản ghim tĩnh để lọt: gõ cứng
   `const remainingSeconds = 90;` vẫn qua được mọi khẳng định chuỗi, nhưng câu báo sẽ nói "chờ
   thêm 90 giây" ở giây thứ 89 — người vận hành đọc rồi bấm lại quá sớm, mãi không hiểu vì sao. */
{
  const { sandbox } = sanKhau(Date.now() - 30 * 1000);   // đã trôi 30s, còn ~60s
  const loi = await goi(sandbox);
  assert.ok(loi, "mới 30 giây thì vẫn phải bị chặn");
  const so = Number(String(loi.message || "").match(/(\d+)\s*giây/)?.[1]);
  assert.ok(Number.isFinite(so), `câu báo phải nêu số giây còn lại — nhận được: ${loi.message}`);
  assert.ok(
    so >= 55 && so <= 61,
    `đã trôi 30 giây thì phải báo còn khoảng 60 giây, không phải ${so}. Một con số đứng yên ở 90 ` +
    "nghĩa là câu báo đang gõ cứng hằng thay vì trừ đi phần đã trôi"
  );
}

/* ⑹ Mép ngược: quá 90 giây thì phải cho đi tiếp. Thiếu mép này thì một bản "chặn mọi lúc"
   cũng làm ⑷ và ⑸ xanh, mà đó là khoá cứng cả đường gửi. */
{
  const { sandbox, touched } = sanKhau(Date.now() - 91 * 1000);
  const loi = await goi(sandbox);
  assert.doesNotMatch(String(loi?.message || ""), /TRIAL_COOLDOWN_ACTIVE/, "quá 90 giây rồi thì nắp chờ không được cản nữa");
  assert.equal(touched.validated, 1, "hết nắp thì lượt gọi phải đi tiếp tới cửa validate như thường");
}

/* ⑺ Chưa từng chạy trial lần nào → không có gì để chờ. */
{
  const { sandbox, touched } = sanKhau(null);
  const loi = await goi(sandbox);
  assert.doesNotMatch(String(loi?.message || ""), /TRIAL_COOLDOWN_ACTIVE/, "chưa từng chạy trial thì không có nắp nào để áp");
  assert.equal(touched.validated, 1, "lượt đầu tiên phải đi thẳng tới cửa validate");
}

console.log("ADR-0050⒠ nắp chờ 90 giây, cửa chặn chạy thật (7 mép): PASS");
