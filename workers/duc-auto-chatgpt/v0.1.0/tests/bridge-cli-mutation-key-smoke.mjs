/**
 * Ghim B-38: lượt GHI qua CLI phải khai `--request-id` tường minh.
 *
 * Đo live 2026-09-08: `references.add` trả `REQUEST_TIMEOUT` nhưng lượt ghi **đã có tác dụng** —
 * chỉ đường trả lời hết giờ. Câu lỗi của host dặn nguyên văn *"retry the identical idempotency
 * key"*; tôi chạy lại đúng lệnh cũ và nó ghi **lần thứ hai**: checkpoint v2 → v3 cho 2 lượt ghi
 * có ý định. Gốc bệnh không ở lớp replay của host (`idempotent: true` khai đúng, khớp theo
 * `client_id` + `request_id`) mà ở `buildEnvelope` của CLI: nó mặc định sinh
 * `cli-${randomUUID()}`, nên "chạy lại đúng lệnh cũ" tạo một khoá KHÁC.
 *
 * Ba mép:
 *   ⑴ lượt GHI thiếu `--request-id` phải BỊ CHẶN, và chặn TRƯỚC khi gửi đi đâu
 *   ⑵ lượt CHỈ ĐỌC thiếu `--request-id` vẫn phải chạy (gọi lại `run.status` mười lần là
 *      chuyện bình thường; đòi khoá ở đó chỉ là thuế)
 *   ⑶ **danh sách chỉ-đọc của CLI phải KHỚP TUYỆT ĐỐI với `read_only` trong `bridge-core.js`**
 *
 * Mép ⑶ là mép đắt nhất và là lý do file này tồn tại. Danh sách chỉ-đọc nằm ở HAI nơi — registry
 * của host và hằng số của CLI — và hai bản sao của một luật thì sớm muộn nói hai chuyện khác nhau
 * (đúng bài học `.repo-structure.json`: một luật gõ cứng ở hai chỗ đã trả hai câu khác nhau cho
 * cùng một file ngày 02/09). Lệch chiều nào cũng đau: thêm một method chỉ-đọc mà quên khai ở CLI
 * thì nó đòi khoá vô cớ; thêm một **mutation** mà lỡ khai vào danh sách chỉ-đọc thì **B-38 quay
 * lại y nguyên** và im lặng.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { main, goiYRequestId } from "../duc-auto-chatgpt-loopback-bridge-host-v1/bridge-cli.mjs";

/* ---------- ⑶ hai danh sách phải khớp ---------- */

/** Lấy `read_only` THẬT từ registry của host: chạy `bridge-core.js` trong `node:vm` rồi đọc
    bảng method, thay vì dò chữ bằng regex — dò chữ không phân biệt được một dòng đã ship với
    một dòng nằm trong chú giải. */
const coreSource = fs.readFileSync(new URL("../bridge-core.js", import.meta.url), "utf8");
const ctx = { console, Object, Set, Map, Array, JSON, String, Number, Boolean, Math, Date, Error, TypeError, RegExp, isNaN, parseInt, parseFloat };
ctx.window = ctx;
ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(coreSource, ctx);
const core = ctx.DacBridgeCore;
assert.ok(core, "MỎ NEO KHÔNG KHỚP: chạy bridge-core.js không thấy DacBridgeCore");

const registry = core.METHOD_REGISTRY;
assert.ok(registry, "MỎ NEO KHÔNG KHỚP: không thấy METHOD_REGISTRY trong DacBridgeCore");
const entries = Array.isArray(registry) ? registry : Object.values(registry);
assert.ok(entries.length >= 20, `MỎ NEO KHÔNG KHỚP: bảng method chỉ có ${entries.length} mục, chờ ít nhất 20`);

const readOnlyTheoHost = new Set(entries.filter((e) => e && e.read_only === true).map((e) => e.name));
assert.ok(readOnlyTheoHost.size >= 6, `MỎ NEO KHÔNG KHỚP: host chỉ khai ${readOnlyTheoHost.size} method chỉ-đọc, chờ ít nhất 6`);

/* Đọc hằng số của CLI bằng cách cắt khối ra và CHẠY nó — không import, vì nó không được export
   (và không nên export: nó là chi tiết bên trong). */
const cliSource = fs.readFileSync(new URL("../duc-auto-chatgpt-loopback-bridge-host-v1/bridge-cli.mjs", import.meta.url), "utf8");
const dau = cliSource.indexOf("const READ_ONLY_METHODS = Object.freeze(new Set([");
assert.ok(dau >= 0, "MỎ NEO KHÔNG KHỚP: không thấy READ_ONLY_METHODS trong bridge-cli.mjs");
const cuoi = cliSource.indexOf("]));", dau);
assert.ok(cuoi > dau, "MỎ NEO KHÔNG KHỚP: không thấy mép cuối của READ_ONLY_METHODS");
const cliCtx = { Object, Set };
vm.createContext(cliCtx);
vm.runInContext(`${cliSource.slice(dau, cuoi + 4)}\nglobalThis.__ro = READ_ONLY_METHODS;`, cliCtx);
const readOnlyTheoCli = cliCtx.__ro;

/* Chỉ so trên những method CLI THẬT SỰ GỬI ĐƯỢC. So trên toàn bộ registry là so quá rộng:
   `session.hello` là `read_only: true` ở host nhưng không có trong `COMMANDS`, nên CLI không
   bao giờ gửi nó và việc nó vắng trong danh sách chỉ-đọc chẳng gây hại gì. (Lượt chạy đầu của
   phép ghim này đỏ đúng vì thế — giữ lại ghi chú để phiên sau không "sửa" bằng cách nhét một
   method không gửi được vào danh sách.) Bất biến thật là: MỌI method CLI gửi được phải được hai
   bên xếp loại GIỐNG NHAU. */
const cmdDau = cliSource.indexOf("const COMMANDS = Object.freeze({");
assert.ok(cmdDau >= 0, "MỎ NEO KHÔNG KHỚP: không thấy COMMANDS trong bridge-cli.mjs");
const cmdCuoi = cliSource.indexOf("});", cmdDau);
assert.ok(cmdCuoi > cmdDau, "MỎ NEO KHÔNG KHỚP: không thấy mép cuối của COMMANDS");
const cmdCtx = { Object };
vm.createContext(cmdCtx);
vm.runInContext(`${cliSource.slice(cmdDau, cmdCuoi + 3)}\nglobalThis.__cmd = COMMANDS;`, cmdCtx);
const methodCliGuiDuoc = new Set(Object.values(cmdCtx.__cmd));
assert.ok(methodCliGuiDuoc.size >= 20, `MỎ NEO KHÔNG KHỚP: CLI chỉ gửi được ${methodCliGuiDuoc.size} method, chờ ít nhất 20`);

/* `bridge.sessions` do CHÍNH HOST trả lời (`bridge-host.mjs`, nhánh
   `envelope.method === "bridge.sessions"`), không đi xuống panel — nên nó hợp lệ khi vắng
   trong `METHOD_REGISTRY`. Khai tường minh ở đây, và CỐ Ý khai bằng một danh sách chốt cứng
   thay vì nới phép kiểm: một method lạ khác xuất hiện thì vẫn phải ĐỎ. Kèm phép kiểm ngược —
   nếu method này thôi được host xử lý thì dòng dưới đỏ và danh sách phải rút lại. */
const METHOD_HOST_TU_XU_LY = Object.freeze(["bridge.sessions"]);
const hostSource = fs.readFileSync(new URL("../duc-auto-chatgpt-loopback-bridge-host-v1/bridge-host.mjs", import.meta.url), "utf8");
for (const m of METHOD_HOST_TU_XU_LY) {
  assert.ok(
    hostSource.includes(`envelope.method === "${m}"`),
    `${m} được khai là host tự xử lý, nhưng bridge-host.mjs không còn nhánh nào bắt nó — ` +
    "rút nó khỏi METHOD_HOST_TU_XU_LY, hoặc nó là một method chết"
  );
}

const tenTheoHost = new Set(entries.map((e) => e && e.name));
const khongCoOHost = [...methodCliGuiDuoc]
  .filter((m) => !tenTheoHost.has(m) && !METHOD_HOST_TU_XU_LY.includes(m))
  .sort();
assert.deepEqual(khongCoOHost, [], `CLI gửi method mà không ai khai: ${khongCoOHost.join(", ")}`);

const thieuOCli = [...readOnlyTheoHost].filter((m) => methodCliGuiDuoc.has(m) && !readOnlyTheoCli.has(m)).sort();
const thuaOCli = [...readOnlyTheoCli].filter((m) => !readOnlyTheoHost.has(m) && !METHOD_HOST_TU_XU_LY.includes(m)).sort();

assert.deepEqual(
  thuaOCli,
  [],
  `CLI khai là chỉ-đọc nhưng host KHÔNG khai read_only: ${thuaOCli.join(", ")}. ` +
  "Đây là chiều NGUY HIỂM: một mutation lọt vào danh sách chỉ-đọc thì CLI thôi đòi khoá, và B-38 " +
  "quay lại y nguyên — im lặng, vì lượt ghi hai lần chỉ hiện ra ở số checkpoint."
);
assert.deepEqual(
  thieuOCli,
  [],
  `host khai read_only nhưng CLI không có: ${thieuOCli.join(", ")}. Chiều này chỉ gây thuế vô cớ ` +
  "(đòi --request-id cho một lượt chỉ đọc), nhưng vẫn phải khớp — hai bản sao của một luật thì " +
  "sớm muộn nói hai chuyện khác nhau."
);

/* ---------- ⑴ và ⑵: hành vi của main() ---------- */

/** Bộ ghép cặp giả, đủ hình dạng cho `validatePairing`. Ghi ra tệp tạm vì CLI đọc từ đĩa. */
const pairingPath = new URL("./.b38-pairing-tmp.json", import.meta.url);
fs.writeFileSync(pairingPath, JSON.stringify({
  schema_version: 1,
  host: "127.0.0.1",
  port: 59999,
  // Đường dẫn CỐ ĐỊNH, `validatePairing` đối chiếu từng chữ (bridge-host.mjs dòng ~86).
  http_url: "http://127.0.0.1:59999/v1/rpc",
  websocket_url: "ws://127.0.0.1:59999/v1/extension",
  // Token hợp lệ về HÌNH DẠNG (validatePairing đòi đúng 32 byte base64url) nhưng dựng từ một
  // hạt cố định và trỏ vào cổng 59999 không ai nghe — nên nó không mở được cửa nào. KHÔNG dùng
  // token thật: một tệp test không bao giờ được mang bí mật đi đâu.
  // ĐỌC ĐƯỢC BẰNG MẮT LÀ MỘT YÊU CẦU, không phải thẩm mỹ — đổi 12/09. Chuỗi cũ dựng từ một
  // hạt ngẫu nhiên nên nó TRÔNG y hệt token thật, và bộ dò secret của cổng đỏ mỗi lượt chạy
  // với câu "nghi có token thật". Một cảnh báo phải soi bằng mắt mỗi phiên là một cảnh báo
  // sẽ bị bỏ qua, và ngày nó đúng thì không ai đọc. Chuỗi nay vẫn đủ 43 ký tự base64url để
  // `validatePairing` nhận, nhưng nói thẳng nó là gì.
  token: "fake-token-khong-mo-duoc-cua-nao-chi-do-hin",
  created_at: "2026-09-08T00:00:00.000Z"
}));

const paramsPath = new URL("./.b38-params-tmp.json", import.meta.url);
fs.writeFileSync(paramsPath, JSON.stringify({ jobs: [{ prompt: "b38 do phep", task_type: "text_reasoning" }] }));

const im = { stdout: { write() {} }, stderr: { write() {} } };
/** `fetch` nổ nếu bị gọi: mép ⑴ đòi chặn TRƯỚC khi gửi, nên một lượt gửi ra ngoài là ĐỎ. */
const fetchNo = () => { throw new Error("KHONG DUOC GUI: chốt phải chặn TRƯỚC khi chạm mạng"); };

try {
  /* ⑴ lượt GHI thiếu khoá: phải ném, và câu ném phải dạy được người đọc. */
  let loi = null;
  try {
    await main(["jobs-add", "--pairing", fileURLToPathish(pairingPath), "--params-file", fileURLToPathish(paramsPath)], { ...im, fetch: fetchNo });
  } catch (e) { loi = e; }
  assert.ok(loi, "B-38: lượt GHI thiếu --request-id phải bị CHẶN");
  assert.match(loi.message, /--request-id/, "câu chặn phải nêu đúng cờ phải khai");
  assert.match(loi.message, /jobs\.add/, "câu chặn phải nêu method bị chặn");
  assert.match(loi.message, /REQUEST_TIMEOUT/, "câu chặn phải kể VÌ SAO — số đo 08/09, không phải một lời mắng suông");
  assert.match(loi.message, /cli-jobs-add-[0-9a-f]{20}/, "câu chặn phải kèm một khoá gợi ý copy được ngay");

  /* Khoá gợi ý phải TIỀN ĐỊNH theo tham số: cùng tham số ra cùng khoá (nên lượt chạy lại dán
     lại được), khác tham số ra khác khoá (nên hai ý định khác nhau không đụng nhau). */
  const a = goiYRequestId("jobs.add", { jobs: [{ prompt: "x" }] });
  const b = goiYRequestId("jobs.add", { jobs: [{ prompt: "x" }] });
  const c = goiYRequestId("jobs.add", { jobs: [{ prompt: "y" }] });
  assert.equal(a, b, "cùng method + cùng tham số phải ra CÙNG khoá gợi ý");
  assert.notEqual(a, c, "tham số khác phải ra khoá KHÁC");
  assert.notEqual(goiYRequestId("jobs.remove", { job_id: "Q001" }), goiYRequestId("jobs.update", { job_id: "Q001" }), "method khác phải ra khoá khác");

  /* ⑵ mép ngược: lượt CHỈ ĐỌC thiếu khoá vẫn phải đi tới bước gửi. Ở đây `fetch` nổ, nên nó
     nổ với câu CỦA FETCH — chứng minh chốt đã cho nó đi qua. Thiếu mép này thì một bản
     "chặn mọi thứ" cũng làm ⑴ xanh, mà đó là bỏ hẳn đường chỉ đọc. */
  let loiDoc = null;
  try {
    await main(["run-status", "--pairing", fileURLToPathish(pairingPath)], { ...im, fetch: fetchNo });
  } catch (e) { loiDoc = e; }
  assert.ok(loiDoc, "sân khấu này luôn ném ở fetch — nếu không ném thì mỏ neo hỏng");
  assert.match(
    loiDoc.message,
    /KHONG DUOC GUI/,
    "lượt CHỈ ĐỌC phải đi TỚI bước gửi mà không cần --request-id; nếu nó bị chặn bởi chốt B-38 " +
    "thì chốt đang bắt oan đường chỉ đọc"
  );
} finally {
  fs.rmSync(pairingPath, { force: true });
  fs.rmSync(paramsPath, { force: true });
}

/** Đường dẫn tệp cho CLI: nó `path.resolve` nên cần đường dẫn hệ điều hành, không phải URL. */
function fileURLToPathish(url) {
  return decodeURIComponent(url.pathname.replace(/^\/([A-Za-z]:)/, "$1"));
}

console.log("B-38 lượt ghi qua CLI phải khai khoá idempotency (3 mép): PASS");
