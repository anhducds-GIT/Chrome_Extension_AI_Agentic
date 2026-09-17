/* B-50 NỬA CÒN LẠI — NẮP 30 GIÂY CỦA TIỆN ÍCH CŨNG PHẢI NÓI RA MÌNH LÀ LOẠI NÀO.
 *
 * `bridge-timeout-diagnosis-smoke.mjs` đã ghim phép chẩn đoán bên HOST từ 11/09. Nó chưa bao
 * giờ chạy cho ca thường gặp nhất, và đây là số đo:
 *   • nắp của host   = 35 giây (`DEFAULT_REQUEST_TIMEOUT_MS`)
 *   • nắp của tiện ích = `deadline_ms` của phương thức = **30 giây** cho `chat.read`
 * Tầng trong luôn bắn TRƯỚC 5 giây, và nó bắn `details` RỖNG. Đo 17/09, chuỗi "Scouter
 * Improve 01": Đức nhìn ba lượt `REQUEST_TIMEOUT` liên tiếp, cả ba in "chưa rõ vì sao" —
 * trong khi bộ chạy đã sẵn sàng in `diagnosis`/`remedy` từ 11/09. Một phép chẩn đoán không
 * bao giờ chạy thì bằng không có.
 *
 * Ghim hai tầng: ⑴ MỘT lượt gọi THẬT chứng minh `details` đi lọt qua lớp lỗi (hình dạng dây,
 * không phải niềm tin của tôi); ⑵ nguồn của transport phải dựng đủ ba ca và ba câu chữa KHÁC
 * NHAU — gộp chúng lại là quay về đúng chỗ xuất phát.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
await import(pathToFileURL(path.join(here, "..", "bridge-core.js")));
const core = globalThis.DacBridgeCore;

const boChuThich = (ma) =>
  String(ma ?? "").replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

/* ⑴ HÌNH DẠNG DÂY, đo bằng một lượt gọi thật — không mô tả lại. Nếu lớp lỗi nuốt tham số thứ
   ba thì mọi phép ghim nguồn bên dưới đều xanh trong khi Đức vẫn thấy "chưa rõ vì sao". */
{
  const e = new core.BridgeProtocolError("REQUEST_TIMEOUT", undefined, { diagnosis: "EXECUTOR_KET", remedy: "x", waited_ms: 30000 });
  assert.equal(e.code, "REQUEST_TIMEOUT");
  assert.equal(e.details.diagnosis, "EXECUTOR_KET", "`details` phải sống sót qua BridgeProtocolError — đây là cả đường dây");
  assert.equal(e.details.waited_ms, 30000);
  const trong = new core.BridgeProtocolError("REQUEST_TIMEOUT");
  assert.deepEqual(trong.details, {}, "và bản không khai details vẫn phải rỗng — nếu không thì phép so dưới đây vô nghĩa");
}

/* ⑵ NGUỒN của transport: nắp 30 giây phải dựng chẩn đoán. */
{
  const ma = boChuThich(fs.readFileSync(new URL("../bridge-transport-loopback.js", import.meta.url), "utf8"));

  /* ĐO CHÍNH LƯỢT GỌI, KHÔNG ĐO CHỮ Ở GẦN NÓ. Đột biến `Q1` đã lọt ở bản đầu: nó để
     nguyên cả khối `{ diagnosis, remedy, … }` nhưng **ngắt nó ra khỏi lượt reject**, và phép
     ghim cũ — cắt 1400 ký tự sau chỗ tìm thấy — vẫn thấy đủ chữ nên vẫn xanh. Một khối được
     dựng rồi vứt đi đọc ra y hệt một khối được gửi đi. Nên ghim HÌNH DẠNG LỢT GỌI: tham số
     thứ ba phải nằm NGAY TRONG lượt reject ấy. */
  const LOI_GOI = 'reject(new core.BridgeProtocolError("REQUEST_TIMEOUT", undefined, {';
  assert.equal(ma.split(LOI_GOI).length - 1, 1,
    "nắp chờ executor phải reject KÈM `details` ngay trong chính lượt gọi — dựng khối rồi vứt đi thì Đức vẫn thấy \"chưa rõ vì sao\"");
  assert.equal(ma.split('BridgeProtocolError("REQUEST_TIMEOUT")').length - 1, 0,
    "không được còn lượt nào bắn `REQUEST_TIMEOUT` trống không — một lối còn bỏ ngỏ là đủ để tái diễn");
  const i = ma.indexOf(LOI_GOI);
  const khoi = ma.slice(i, i + 1400);

  /* Tên trường phải TRÙNG thứ bộ chạy đã đọc từ 11/09 (`cd.diagnosis`, `cd.remedy` trong
     `chuoi-reasoning.mjs`). Đặt tên khác là viết một câu trả lời không ai đọc. */
  assert.ok(/diagnosis:/.test(khoi), "phải kèm `diagnosis` — đúng tên bộ chạy đọc");
  assert.ok(/remedy:/.test(khoi), "phải kèm `remedy` — đúng tên bộ chạy đọc");
  assert.ok(/waited_ms:/.test(khoi), "phải nói chờ bao lâu, nếu không thì không biết nắp nào vừa bắn");

  /* BA ca, và phải là BA CHUỖI KHÁC NHAU. Một `diagnosis` luôn trả cùng một chữ thì nó là
     trang trí: nó xanh ở mọi phép ghim mà không phân biệt được gì. */
  const nhan = [...khoi.matchAll(/"(PANEL_DA_DONG|EXECUTOR_KET|PANEL_IM)"/g)].map((m) => m[1]);
  assert.equal(new Set(nhan).size, 3, `phải phân biệt đủ ba ca, đang thấy: ${[...new Set(nhan)].join(", ") || "(không có)"}`);

  /* BA CÂU CHỮA PHẢI KHỚP BA CA — không chỉ "khác nhau". Đột biến `Q3` đã lọt ở bản đầu:
     nó thay một câu chữa bằng một câu chung chung, ba câu VẪN khác nhau, nên phép đếm
     `new Set(...).size` vẫn xanh. Đếm sự khác biệt không đo được tính ĐÚNG VIỆC. Nên đòi mỗi
     câu mang **thao tác riêng của ca ấy**: panel đóng thì mở panel · executor kẹt thì là chuyện
     của TAB bị che · panel im thì đóng-rồi-mở panel. */
  for (const [ca, dau] of [["panel đóng", /Mở lại side panel/], ["executor kẹt", /tab[\s\S]{0,80}bị che/], ["panel im", /Đóng rồi mở lại side panel/]]) {
    assert.ok(dau.test(khoi), `câu chữa cho ca "${ca}" phải nói ra thao tác riêng của ca ấy, không phải một câu chung chung`);
  }
  const cauChua = [...khoi.matchAll(/"([^"]{40,})"/g)].map((m) => m[1]);
  assert.equal(new Set(cauChua).size, cauChua.length, "và ba câu vẫn phải KHÁC NHAU");

  /* Phép so phải đọc mốc Ở THỜI ĐIỂM PHÁN QUYẾT, không ở lúc gửi: cả cổng lẫn mốc đều đổi
     trong quãng chờ. Đây đúng là bài học host đã trả giá một lần ở B-50. */
  assert.ok(/heard_during_wait/.test(khoi), "phải có phép so 'trong lúc chờ có nghe thấy panel không'");
  const iGui = ma.indexOf("const ngheLucGui = ngheExecutorLuc;");
  assert.ok(iGui > 0 && iGui < i, "ảnh chụp mốc phải lấy TRƯỚC khi gửi, nếu không thì không có gì để so");

  /* Và mốc phải được nhích bởi MỌI khung từ panel, không chỉ khung trả lời đúng lượt đang
     chờ — chính chỗ đó mới tách được 'panel bận' khỏi 'panel im'. */
  const iNhich = ma.indexOf("ngheExecutorLuc = Date.now();");
  const iLoc = ma.indexOf('message?.type === "DAC_BRIDGE_RPC_RESPONSE"');
  assert.ok(iNhich > 0 && iLoc > 0 && iNhich < iLoc,
    "mốc phải nhích TRƯỚC mọi phép lọc loại khung — lọc trước thì 'panel bận' không bao giờ phân biệt được với 'panel im'");
}

console.log("Nắp 30 giây của tiện ích nói ra vì sao (B-50 nửa còn lại): PASS");
