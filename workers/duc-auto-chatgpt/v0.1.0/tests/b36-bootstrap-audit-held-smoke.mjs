/* GHIM B-36 (A) theo ADR-0049 — HÀNH VI, không tĩnh.

   Ba phép kiểm cũ để B-36 sống 8 tuần đúng vì chúng TĨNH: chúng khẳng định mã
   CÓ CHỨA dòng đăng ký determiner, không chứng minh determiner được tuân. Nên
   file này không grep một chữ nào của `sidepanel.js` — nó CHẠY panel thật
   trong `node:vm` (đúng lối `bridge-workspace-lease-race-smoke.mjs` đã mở) và
   dựng lại đúng ca đã đo live.

   Sân khấu là SỐ ĐO, không phải giả định. Phép đo quyết định 2026-09-06 đi
   bằng `DAC_DOWNLOAD_ARTIFACT` — đúng đường mọi mutation Bridge đi:

     requested_filename: "B36-probe-ticket__audit.jsonl"
     filename:           "…\Downloads\d31c629e-39e1-4a96-ae61-dde336b91792"
     persisted_bytes:    22        ok: true

   Nội dung file đúng nguyên vẹn; chỉ cái tên bị Chrome đặt. Nên stub download
   dưới đây trả GUID, và đó không phải bịa: đó là hành vi đã đo của Chrome 152.

   SÁU bất biến:

     ① phiên bootstrap (Đức chưa cấp quyền thư mục nào) KHÔNG phát một lượt
       tải nào qua Chrome Downloads;
     ② mutation vẫn THÀNH CÔNG, và nói thẳng ra dây rằng sổ chưa ra file;
     ③ sổ audit KHÔNG mất — lần ghi đầu vào thư mục thật xả TOÀN BỘ mục đã giữ;
     ④ mép ngược: thư mục thật đã bind thì ghi ngay, `audit_durable` hết false;
     ⑤ mép ngược quan trọng nhất: phiên do ĐỨC cấu hình chế độ Downloads thì
       VẪN đi đường tải và VẪN kiểm tên — (A) chỉ che ca bootstrap, nó không
       phải công tắc tắt lớp kiểm tên;
     ⑥ một mutation hỏng giữa đường rồi rollback thì dấu "máy tự dựng" phải
       sống sót — không thì lượt kế tiếp lại rơi về Chrome Downloads.

   ① mà không có ④ và ⑤ thì (A) chỉ là "tắt phần ghi", và tắt lớp bảo vệ để
   test xanh là việc luật vàng 3 cấm.  */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { FakeDOMParser, FakeXMLSerializer } from "./xlsx-test-utils.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (name) => fs.readFileSync(path.join(here, "..", name), "utf8");

/* ---- DOM giả: mọi phần tử trả lời được mọi lời gọi lúc nạp ---------------- */
function fakeClassList() {
  return { add() {}, remove() {}, toggle() {}, contains() { return false; } };
}
function fakeElement() {
  return {
    textContent: "", value: "", checked: false, hidden: false, disabled: false,
    indeterminate: false, title: "", placeholder: "", files: [],
    dataset: {}, style: { setProperty() {}, removeProperty() {} },
    classList: fakeClassList(), children: [],
    addEventListener() {}, removeEventListener() {},
    append() {}, appendChild() {}, prepend() {}, replaceChildren() {}, remove() {},
    setAttribute() {}, removeAttribute() {}, getAttribute() { return null; },
    closest() { return null; }, querySelector() { return null; }, querySelectorAll() { return []; },
    focus() {}, blur() {}, click() {}, scrollIntoView() {},
    insertBefore() {}, contains() { return false; },
    getBoundingClientRect() { return { top: 0, left: 0, width: 0, height: 0 }; }
  };
}
const documentStub = {
  getElementById: () => fakeElement(),
  createElement: () => fakeElement(),
  createDocumentFragment: () => fakeElement(),
  createTextNode: (text) => ({ textContent: String(text) }),
  querySelector: () => null, querySelectorAll: () => [],
  addEventListener() {}, removeEventListener() {},
  body: fakeElement(), documentElement: fakeElement(), execCommand() { return false; }
};

/* ---- Thư mục giả: File System Access vừa đủ, và nó GIỮ được nội dung ------
   Đây là đường ghi đã đo là CHẠY (`checkpoint.verified: true`, 04/09) — nó
   không đi qua Chrome Downloads nên determiner không nằm trên đường. */
function fakeDirectory(name = "Thu-muc-Duc-cap-quyen") {
  /* Giu BYTE, khong giu chuoi. Ban dau no giu chuoi va bao size =
     text.length — tuc dem KY TU. Cho chu tieng Viet co dau, mot ky tu la 2-3
     byte UTF-8, nen `verifyPersistedFile` doi 2392 byte ma nghe 2371 va nem
     PERSISTENCE_VERIFICATION_FAILED. San khau giả sai cach dem thi phep ghim
     do lech may, khong do lech ma. */
  const files = new Map();
  const handle = {
    name,
    async queryPermission() { return "granted"; },
    async requestPermission() { return "granted"; },
    async getFileHandle(leaf, { create = false } = {}) {
      if (!files.has(leaf)) {
        if (!create) {
          const error = new Error(`No file '${leaf}'.`);
          error.name = "NotFoundError";
          throw error;
        }
        files.set(leaf, "");
      }
      return {
        name: leaf,
        async getFile() {
          const bytes = files.get(leaf) ?? new Uint8Array(0);
          return {
            size: bytes.byteLength,
            async text() { return new TextDecoder().decode(bytes); },
            async arrayBuffer() { return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength); }
          };
        },
        async createWritable() {
          const chunks = [];
          return {
            async write(chunk) {
              if (typeof chunk === "string") chunks.push(new TextEncoder().encode(chunk));
              else chunks.push(new Uint8Array(await chunk.arrayBuffer()));
            },
            async close() {
              const total = chunks.reduce((sum, part) => sum + part.byteLength, 0);
              const joined = new Uint8Array(total);
              let at = 0;
              for (const part of chunks) { joined.set(part, at); at += part.byteLength; }
              files.set(leaf, joined);
            }
          };
        }
      };
    },
    async removeEntry(leaf) { files.delete(leaf); },
    async *values() { for (const leaf of files.keys()) yield { kind: "file", name: leaf }; },
    async *entries() { for (const leaf of [...files.keys()]) yield [leaf, { kind: "file", name: leaf }]; }
  };
  return { handle, files };
}

/* ---- Chrome giả. Lượt tải trả GUID, đúng như đã đo 06/09 ------------------ */
const GUIDS = [
  "d31c629e-39e1-4a96-ae61-dde336b91792",
  "16f87e2b-3d75-4a5d-9cee-884f1c7b732a",
  "05a491ce-623c-4d7a-bb81-f677686cf7ec",
  "bd00d527-e43a-4806-bb1b-df5c59f6aa19"
];
const downloads = [];
let downloadId = 600;
const storeValues = { "dac.bridge.dev_mode.v1": true };

const chromeStub = {
  runtime: {
    id: "c".repeat(32),
    getManifest: () => ({ version: "0.3.0" }),
    connect: () => ({ postMessage() {}, disconnect() {}, onMessage: { addListener() {} }, onDisconnect: { addListener() {} } }),
    sendMessage: async (message) => {
      if (message?.type === "DAC_DOWNLOAD_ARTIFACT") {
        downloads.push({ filename: message.filename, bytes: message.expectedBytes });
        downloadId += 1;
        const guid = GUIDS[(downloads.length - 1) % GUIDS.length];
        // Chrome đặt tên theo đoạn cuối của blob URL và BỎ QUA cả `filename`
        // lẫn đề xuất của determiner. Số đo, không phải mô hình.
        return {
          ok: true,
          download_id: downloadId,
          filename: `C:\\Users\\MAYTEST_12\\Downloads\\${guid}`,
          requested_filename: String(message.filename || "").split("/").pop(),
          persisted_bytes: message.expectedBytes
        };
      }
      if (message?.type === "DAC_BRIDGE_WORKSPACES_GET") return { ok: true, seats: [] };
      if (message?.type === "DAC_BRIDGE_STATUS_GET") return { ok: true, status: { state: "disconnected", paired: false } };
      return { ok: true };
    },
    onMessage: { addListener() {} }
  },
  tabs: {
    async get() { throw new Error("No tab."); },
    async sendMessage() { return { ok: true }; },
    async query() { return []; },
    async reload() {},
    onRemoved: { addListener() {} }, onUpdated: { addListener() {} },
    onReplaced: { addListener() {} }, onActivated: { addListener() {} }
  },
  storage: {
    local: {
      async get(key) {
        if (Array.isArray(key)) return Object.fromEntries(key.map((name) => [name, storeValues[name]]));
        if (typeof key === "string") return { [key]: storeValues[key] };
        return { ...storeValues };
      },
      async set(next) { Object.assign(storeValues, next); },
      async remove(key) { delete storeValues[key]; }
    },
    session: { async get(key) { return { [key]: "marked" }; }, async set() {} },
    onChanged: { addListener() {} }
  },
  alarms: { create() {}, clear() {}, onAlarm: { addListener() {} } },
  downloads: {
    onDeterminingFilename: { addListener() {} },
    onChanged: { addListener() {} },
    async search() { return []; },
    async erase() { return []; }
  },
  sidePanel: {}
};

/* ---- Nạp panel đúng thứ tự script của sidepanel.html ---------------------- */
const context = {
  console, TextEncoder, TextDecoder, URL, URLSearchParams, Date, Math, JSON,
  setTimeout, clearTimeout, setInterval, clearInterval, queueMicrotask,
  structuredClone, crypto: globalThis.crypto, performance,
  atob: (value) => Buffer.from(value, "base64").toString("binary"),
  btoa: (value) => Buffer.from(value, "binary").toString("base64"),
  document: documentStub, navigator: {}, chrome: chromeStub,
  DOMParser: FakeDOMParser, XMLSerializer: FakeXMLSerializer,
  FileReader: class { readAsDataURL() {} },
  Blob: globalThis.Blob, File: globalThis.File,
  requestAnimationFrame: (callback) => setTimeout(callback, 0),
  cancelAnimationFrame: (handle) => clearTimeout(handle)
};
context.window = context;
context.self = context;
context.globalThis = context;
vm.createContext(context);

const panelHtml = read("sidepanel.html");
const scriptOrder = [...panelHtml.matchAll(/<script src="([^"]+)"><\/script>/g)].map((match) => match[1]);
assert.equal(scriptOrder.at(-1), "sidepanel.js", "panel nạp sidepanel.js cuối cùng");
for (const name of scriptOrder) vm.runInContext(read(name), context, { filename: name });

const tick = () => new Promise((resolve) => setTimeout(resolve, 5));
await tick(); await tick();

const hooks = context.DacBridgeExecutorTestHooks;
assert.ok(hooks?.handlers?.["jobs.add"], "panel mở cửa handler cho test");
/* `state` là mối nối test, cùng họ với `handlers` đã có: không có nó thì
   KHÔNG cách nào bind một thư mục đã cấp quyền từ ngoài, vì đường bind duy
   nhất là cú bấm `showDirectoryPicker` của người — và đó chính là cái vòng
   kẹt mà B-36 mô tả. Đọc-ghi state ở đây không mở thêm bề mặt nào: các
   handler kề bên vốn đã sửa trọn state ấy. */
assert.ok(hooks?.state, "panel mở cửa state cho test — cần để bind thư mục đã cấp quyền");
const state = hooks.state;

const call = Object.freeze({ request: { client: { client_id: "b36-pin" } }, method: null, context: {} });
const jobsAdd = (n) => hooks.handlers["jobs.add"]({
  jobs: Array.from({ length: n }, (_unused, index) => ({ prompt: `Ghim B-36 so ${index + 1}`, reference_images: [], settings: { timeout_sec: 180 } }))
}, call);
const auditLeaf = () => context.DacOutputLocation.effective(state.outputSettings).auditFilename;

/* ==========================================================================
   ① + ② — phiên bootstrap: không tải, mutation vẫn thành công, và nói thẳng
   ========================================================================== */
downloads.length = 0;
let bootstrap = null;
let bootstrapFailure = null;
try { bootstrap = await jobsAdd(1); } catch (error) { bootstrapFailure = error; }

assert.equal(
  bootstrapFailure ? String(bootstrapFailure.message || bootstrapFailure) : "",
  "",
  "B-36: phien bootstrap phai dung duoc — no dang chet vi Chrome dat ten GUID cho artifact"
);
assert.deepEqual(
  downloads, [],
  "① khong mot luot tai nao o phien bootstrap: Chrome Downloads khong dat ten noi artifact cua goi nay"
);
assert.equal(bootstrap.audit_durable, false, "② dây phải biết sổ CHƯA ra file — không được im");
// Checkpoint cũng chưa ra file, nên nó KHÔNG được tự khai là đã nghiệm thu.
// Con `storage: "held"` đổi thành `"downloads"` lọt lưới ở vòng thử phá đầu
// đúng vì thiếu dòng này — và hậu quả là dây nghe "verified: true" cho một
// file không nằm ở đâu cả.
assert.equal(bootstrap.checkpoint?.verified, false, "② checkpoint chưa ra file thì không được khai là đã nghiệm thu");
assert.match(String(bootstrap.audit_note || ""), /\S/, "② phải kèm một câu nói vì sao chưa bền");
assert.match(String(bootstrap.audit_note || ""), /[ạảãàáâậầấẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i, "② câu đó là chữ operator đọc → tiếng Việt CÓ DẤU (luật vàng 5)");

/* ==========================================================================
   ③ — sổ không mất: giữ thêm một lượt nữa, rồi bind thư mục thật và ghi
   ========================================================================== */
await jobsAdd(2);
assert.deepEqual(downloads, [], "① vẫn không tải, kể cả sau nhiều lượt mutation liên tiếp");
const heldEvents = state.auditEvents.length;
assert.ok(heldEvents >= 2, `sổ phải đang giữ ít nhất 2 mục trong bộ nhớ, thấy ${heldEvents}`);

const { handle, files } = fakeDirectory();
state.outputSettings.image = context.DacOutputLocation.directoryLocation(handle, handle.name);
state.outputSettings.result = { kind: "same_as_image" };

const afterBind = await jobsAdd(1);
assert.deepEqual(downloads, [], "④ thư mục thật không đi qua Chrome Downloads — không lượt tải nào");
assert.notEqual(afterBind.audit_durable, false, "④ đã có thư mục thật thì sổ hết 'chưa bền'");

const writtenBytes = files.get(auditLeaf());
assert.ok(writtenBytes, `③ sổ audit phải có mặt trong thư mục thật với tên '${auditLeaf()}'`);
const written = new TextDecoder().decode(writtenBytes);
const lines = written.split("\n").filter((line) => line.trim());
assert.ok(
  lines.length >= heldEvents + 1,
  `③ lan ghi dau phai xa TOAN BO muc da giu: giu ${heldEvents} + 1 moi = it nhat ${heldEvents + 1} dong, thay ${lines.length}`
);
for (const line of lines) assert.doesNotThrow(() => JSON.parse(line), "③ mỗi dòng xả ra phải là một mục JSONL đọc được");

/* ==========================================================================
   ⑤ — mép ngược: ĐỨC cấu hình Downloads thì VẪN đi đường tải, VẪN kiểm tên
   (A) là miếng che ca bootstrap. Nếu nó biến thành "thôi kiểm tên" thì đó là
   phương án (C) — phương án ADR-0049 đã LOẠI, vì bằng chứng vận hành mất tên
   là bằng chứng không tra được.
   ========================================================================== */
downloads.length = 0;
// KHÔNG đặt dấu bằng tay ở đây. Dựng settings đúng cách Đức mở một workbook
// thật dựng nó — qua `fromWorkbook` với config có nội dung — và để chính việc
// object này KHÔNG mang dấu `autoDefaulted` là thứ quyết định. Bản trước của
// ca này gán `outputAutoDefaulted = false` bằng tay, nên đột biến "không bao
// giờ xoá cờ" lọt lưới: test đã tự dọn hộ đúng cái nó phải bắt.
state.outputSettings = context.DacOutputLocation.fromWorkbook(
  { output_destination_mode: "downloads", output_downloads_subfolder: "Duc chon tay" },
  state.workbook.fileName
);
assert.equal(state.outputSettings.autoDefaulted, undefined, "⑤ settings dựng từ config THẬT không được mang dấu 'máy tự dựng'");

let ducFailure = null;
try { await jobsAdd(1); } catch (error) { ducFailure = error; }
assert.ok(downloads.length >= 1, "⑤ phien do DUC cau hinh Downloads VAN phai di duong tai — (A) khong duoc thanh cong tac tat lop kiem ten");
assert.ok(ducFailure, "⑤ và lượt đó vẫn phải kêu to: Chrome đặt tên GUID là một lỗi thật, chưa được vá");
assert.match(
  String(ducFailure.message || ducFailure) + JSON.stringify(ducFailure?.details || {}),
  /PERSISTENCE_FILENAME_MISMATCH|PERSISTENCE_VERIFICATION_FAILED/,
  "⑤ và nó kêu ĐÚNG chỗ: lệch tên / không nghiệm thu được, chứ không phải một lỗi khác"
);

/* ==========================================================================
   ⑥ — mép ngược thứ ba: một mutation HỎNG GIỮA ĐƯỜNG rồi rollback thì dấu
   "máy tự dựng" phải sống sót. Dấu nằm trên object settings, mà rollback
   phục hồi settings từ một bản clone — nên nếu bản clone đó đổi sang danh
   sách trắng, dấu rụng và lượt mutation KẾ TIẾP lại ghi vào thư mục Tải
   xuống, tức B-36 quay lại đúng như trước. Đột biến "clone → whitelist" lọt
   lưới ở vòng thử phá thứ hai đúng vì thiếu ca này.

   Cách buộc rollback mà không sửa mã: một job trỏ vào ảnh mẫu không tồn tại
   → `prepare()` trong `apply` ném MISSING_REFERENCE.
   ========================================================================== */
state.outputSettings = null;
state.workbook = null;
state.auditEvents.length = 0;
downloads.length = 0;

const reborn = await jobsAdd(1);
assert.equal(reborn.audit_durable, false, "⑥ dựng lại phiên bootstrap: vẫn phải là 'chưa bền'");

let rolledBack = null;
try {
  await hooks.handlers["jobs.add"]({ jobs: [{ prompt: "Job tro vao anh khong ton tai", reference_images: ["khong-he-co-file-nay.png"], settings: { timeout_sec: 180 } }] }, call);
} catch (error) { rolledBack = error; }
assert.ok(rolledBack, "⑥ job trỏ vào ảnh không tồn tại phải hỏng — nếu không thì ca này chưa hề chạm rollback");

const afterRollback = await jobsAdd(1);
assert.deepEqual(downloads, [], "⑥ sau rollback vẫn KHÔNG được tải: dấu 'máy tự dựng' phải sống sót qua clone");
assert.equal(afterRollback.audit_durable, false, "⑥ và dây vẫn phải nghe 'chưa bền'");

console.log("b36 bootstrap audit held smoke tests: PASS (6 bất biến)");
