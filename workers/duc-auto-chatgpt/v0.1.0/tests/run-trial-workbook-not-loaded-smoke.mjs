/**
 * GHIM CHO B-11 — `run.trial` khi chưa nạp workbook phải trả
 * `WORKBOOK_NOT_LOADED` / `retryable: true`, không phải `INTERNAL_ERROR` với
 * nguyên nhân thật giấu sau công tắc Chế độ phát triển.
 *
 * Đức chốt 2026-09-06: CHO thử lại. Lý do: mở workbook là việc người làm trong
 * năm giây, nên bắt agent chết hẳn là vô lý — đúng cách `run.status` đang làm.
 *
 * B-11 và B-16 chỉ CÙNG GỐC một nửa: cả hai đều là Error trần rơi vào cùng chỗ
 * giặt trắng `bridgeError()`. Nhưng câu của B-11 — "Open an XLSX workbook
 * first." — KHÔNG mang tiền tố mã nào, nên bảng `PREPARE_VALIDATION_GUIDANCE`
 * của B-16 không thể nhận ra nó; và điều B-11 cần là đổi `retryable`, thứ B-16
 * cố ý không đụng tới. Vá đúng chỗ ném, không nới bảng của B-16.
 *
 * Không grep mã: file này CẮT chính hàm `bridgeRunTrial()` đã ship ra khỏi
 * `sidepanel.js` rồi CHẠY nó. Một bản vá dời phép kiểm xuống SAU
 * `authoritativeValidate()` — chữ còn nguyên, hành vi chết — vẫn phải đỏ.
 *
 * Mỏ neo được ĐẾM. Ra 0 là công cụ hỏng, không phải "không có gì phải sửa".
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
await import(pathToFileURL(path.join(here, "..", "bridge-core.js")));
const core = globalThis.DacBridgeCore;

// Hợp đồng nền: mã này phải sẵn có và phải là thử-lại-được. Nếu ai đó lật nó
// thành false thì bản vá dưới đây thành vô nghĩa mà vẫn "xanh".
assert.equal(core.ERROR_DEFINITIONS.WORKBOOK_NOT_LOADED.retryable, true, "WORKBOOK_NOT_LOADED phải thử lại được — đó là toàn bộ điều Đức chốt cho B-11");
assert.equal(core.ERROR_DEFINITIONS.INTERNAL_ERROR.retryable, false, "INTERNAL_ERROR vẫn là không thử lại được — chính chỗ B-11 đang rơi vào");

const source = fs.readFileSync(path.join(here, "..", "sidepanel.js"), "utf8").split("\r\n").join("\n");

const START = "\n  async function bridgeRunTrial(params, call) {\n";
const starts = source.split(START).length - 1;
assert.equal(starts, 1, "cắt được ĐÚNG một hàm bridgeRunTrial() — 0 nghĩa là mỏ neo hỏng");
const from = source.indexOf(START) + 1;
const END = "\n  }\n";
const to = source.indexOf(END, from);
assert.ok(to > from, "không tìm thấy chỗ đóng hàm bridgeRunTrial()");
const shipped = source.slice(from, to + END.length);
assert.ok(shipped.includes("authoritativeValidate"), "cắt nhầm khối: bridgeRunTrial() phải gọi authoritativeValidate()");

// `requireBridgeWorkbook()` đã ship sẵn trong panel; cắt nó ra chạy cùng, để
// test đo đúng hàm đó chứ không đo một bản chép tay.
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

// Hai hằng số của đường trial: LẤY TỪ CHÍNH sidepanel.js, không chép tay —
// chép tay thì giá trị thật đổi mà test vẫn đo giá trị cũ.
const constants = source.match(/^ {2}const BRIDGE_(?:LAST_TRIAL_STORAGE_KEY|TRIAL_MIN_INTERVAL_MS) = .*$/gm) || [];
assert.equal(constants.length, 2, "mỏ neo hỏng: phải lấy được đúng 2 hằng số của đường trial");

function makeSandbox(workbook) {
  const touched = { validated: 0, lockTaken: 0, tabBound: 0 };
  const sandbox = {
    window: { DacBridgeCore: core },
    state: { bridgeDevMode: true, workbook, runSelection: new Set(), prepared: { queue: [], settings: {} } },
    queueRunLock: {
      tryBeginRun: () => { touched.lockTaken += 1; return true; },
      endRunStart: () => {}
    },
    clearBridgeAttention: () => {},
    bindRunTab: async () => { touched.tabBound += 1; },
    resolveWorkspaceTab: async () => null,
    releaseRunTab: () => {},
    controls: () => {},
    authoritativeValidate: async () => { touched.validated += 1; throw new Error("Open an XLSX workbook first."); },
    chrome: { storage: { local: { get: async () => ({}), set: async () => {} } } },
    crypto,
    Date,
    console,
    Set,
    Number,
    Math,
    touched
  };
  vm.createContext(sandbox);
  vm.runInContext(`${constants.join("\n")}\nvar bridgeRunTrial;${coolFn}${requireFn}${shipped}bridgeRunTrial`, sandbox);
  return { sandbox, touched };
}

/* ---- chưa nạp workbook: phải là WORKBOOK_NOT_LOADED, thử lại được ------- */

{
  const { sandbox, touched } = makeSandbox(null);
  const error = await sandbox.bridgeRunTrial({ job_ids: ["Q001"] }, {}).then(
    () => null,
    (thrown) => thrown
  );
  assert.ok(error, "gọi run.trial khi chưa nạp workbook phải ném");
  assert.equal(error.name, "BridgeProtocolError", "phải là lỗi có mã trên dây, không phải Error trần bị giặt thành INTERNAL_ERROR");
  assert.equal(error.code, "WORKBOOK_NOT_LOADED");
  assert.equal(error.retryable, true, "Đức chốt: agent ĐƯỢC thử lại — mở workbook là việc năm giây của người");
  // Phép kiểm phải chặn TRƯỚC chỗ giặt trắng, không phải sau: authoritativeValidate()
  // chính là nơi ném câu Error trần, nên rơi tới đó rồi thì bản vá vô nghĩa.
  assert.equal(touched.validated, 0, "không được để rơi tới authoritativeValidate() — dời phép kiểm xuống sau đó là bản vá chết");
}

/* ---- mép ngược: có workbook thì phép kiểm này không được cản đường ------ */

{
  const { sandbox, touched } = makeSandbox({ jobs: [{ id: "Q001" }], config: {} });
  const error = await sandbox.bridgeRunTrial({ job_ids: ["Q001"] }, {}).then(
    () => null,
    (thrown) => thrown
  );
  assert.ok(error, "stub authoritativeValidate vẫn ném, nên vẫn có lỗi");
  assert.notEqual(error.code, "WORKBOOK_NOT_LOADED", "có workbook rồi mà vẫn báo thiếu workbook là chặn oan");
  assert.equal(touched.validated, 1, "có workbook thì lời gọi phải đi tiếp tới cửa validate như cũ");
}

console.log("B-11 run.trial WORKBOOK_NOT_LOADED smoke tests: PASS");
