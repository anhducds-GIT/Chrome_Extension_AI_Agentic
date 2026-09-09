/**
 * GHIM B-43 — tab bị che thì KHÔNG được chốt một câu trả lời chữ.
 *
 * ĐO LIVE 2026-09-09, và đây là loại lỗi tệ nhất trong gói: báo-thành-công-giả. Năm lượt trên
 * năm, máy ghi vào sổ 6 · 27 · 28 · 35 · 27 ký tự trong khi trang giữ 237 · 915 · 203 · 275 ·
 * 412. Job vẫn settle `SUCCESS`, `persistence_verified: true`, không gì đỏ lên. Cái ghi được
 * luôn là dòng tiêu đề bị cắt GIỮA CHỪNG — `"MODE: Audit | BUDGET: 100 w"`, thiếu cả ngoặc đóng.
 *
 * Cơ chế, dò từng giây suốt 202 giây một lượt chạy:
 *   giây 24  lượt trả lời mới hiện, 8 ký tự, nút Dừng BẬT
 *   giây 28  26 ký tự, nút Dừng vẫn bật
 *   giây 31  nút Dừng TẮT — chữ vẫn 26 ký tự
 *   giây 31 → 202  KHÔNG mọc thêm một ký tự nào trong gần ba phút
 * Rồi Đức bấm vào tab: cùng lượt đó nhảy **26 → 251 ký tự**, không có lượt sinh mới nào.
 *
 * Chrome bóp phanh tab bị che. Cả hai vế của luật chốt — *"không thấy nút Dừng"* và *"chữ đứng
 * yên 1,5 giây"* — đều THOẢ trong lúc câu trả lời mới đi được 10% đường.
 *
 * **Phép đo này bác bỏ hai giả thuyết rẻ hơn, ghi ra để đừng ai thử lại:**
 *   ⑴ *"nút Dừng chưa từng khớp, nên đòi `generationSeen` là xong"* — SAI. Dò ra nút Dừng bật
 *     liên tục 8 giây (`data-testid="stop-button" => 1`), nên cờ đó là `true`.
 *   ⑵ *"nới ngưỡng 1,5 giây lên cho chắc"* — SAI, và tệ hơn là vô hại giả: chữ đứng yên **171
 *     giây** mà vẫn chưa xong. Không có ngưỡng nào cứu được, chỉ làm mọi job chậm thêm.
 *
 * File này CẮT `waitForCompletion()` đã ship rồi CHẠY nó trong `node:vm` trên một DOM giả dựng
 * theo đúng đường cong đo được. Không grep chữ.
 *
 * Mỏ neo được ĐẾM. Ra 0 là công cụ hỏng, không phải "không có gì phải sửa".
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(path.join(here, "..", "content.js"), "utf8").split("\r\n").join("\n");

const START = "\n  async function waitForCompletion({ boundary, timeoutMs, expectImage = false, inputEvidence, attempt = null, maxImages = 1 }) {\n";
assert.equal(source.split(START).length - 1, 1, "cắt được ĐÚNG một waitForCompletion() — 0 nghĩa là mỏ neo hỏng");
const from = source.indexOf(START) + 1;
const END = "\n  }\n";
const to = source.indexOf(END, from);
assert.ok(to > from, "không tìm thấy chỗ đóng waitForCompletion()");
const shipped = source.slice(from, to + END.length);
assert.ok(shipped.includes("visibilityState"), "cắt nhầm khối: waitForCompletion() phải hỏi trạng thái hiển thị của trang");
assert.ok(shipped.includes("stable_text"), "cắt nhầm khối: phải chứa nhánh chốt theo chữ đứng yên");

/* Nắp chờ và phép kiểm "trông như bị cắt" nằm NGOÀI hàm, nên cắt luôn cả hai và lấy con số
   TỪ CHÍNH MÃ ĐÃ SHIP — chép tay con số vào đây là ghim một bản sao, và bản sao thì đổi được
   ở một bên mà bên kia vẫn xanh. */
const napDong = (source.match(/^ {2}const TEXT_SETTLE_MS = .*$/m) || [])[0];
assert.ok(napDong, "mỏ neo hỏng: không thấy nắp chờ chữ đứng yên");
const TRUNC_START = "\n  function looksTruncated(text) {\n";
assert.equal(source.split(TRUNC_START).length - 1, 1, "cắt được ĐÚNG một looksTruncated()");
const truncFrom = source.indexOf(TRUNC_START) + 1;
const truncFn = source.slice(truncFrom, source.indexOf(END, truncFrom) + END.length);

const ctxNap = {};
vm.createContext(ctxNap);
vm.runInContext(`${napDong}\nglobalThis.__nap = TEXT_SETTLE_MS;`, ctxNap);
assert.equal(
  ctxNap.__nap, 6000,
  `Đức chốt 09/09 giãn nắp chờ đọc lên 6 giây — đang là ${ctxNap.__nap / 1000} giây. ` +
  "Con số cũ 1,5 giây đọc một quãng ChatGPT ngừng gõ thành 'xong'."
);

/**
 * Sân khấu dựng theo đúng đường cong đã đo. `kichBan` là danh sách mốc:
 * mỗi mốc `{ tuGiay, text, stop, hidden }` áp dụng từ giây đó trở đi.
 * Đồng hồ giả: `sleep` đẩy thời gian, nên 180 giây timeout không tiêu 180 giây thật.
 */
function sanKhau(kichBan, { timeoutMs = 180000, expectImage = false } = {}) {
  let dongHo = 1_000_000;
  const batDau = dongHo;
  const hienTai = () => {
    let moc = kichBan[0];
    for (const m of kichBan) if ((dongHo - batDau) / 1000 >= m.tuGiay) moc = m;
    return moc;
  };
  const sandbox = {
    Date: { now: () => dongHo },
    Math, String, Number, Boolean, JSON, Object, Array, Error, Set,
    console,
    sleep: async (ms) => { dongHo += ms; },
    STATE: { abortRequested: false },
    securityBlockerText: () => null,
    matchesGenerationLimit: () => false,
    findStopButton: () => (hienTai().stop ? { id: "stop" } : null),
    assistantMessages: () => [{ id: "m1" }],
    newAssistantMessages: () => [{ id: "m1" }],
    assistantMessageText: () => hienTai().text,
    imageCandidates: () => [],
    findAbPoll: () => null,
    imageDecision: () => ({ decision: { attribution: null } }),
    boundaryTelemetry: () => ({}),
    recordDetection: () => {},
    // Đường ẢNH gọi `window.DacImageEvidence`. Bản đầu của phép ghim này KHÔNG có `window`,
    // nên mép ⑹ ném `window is not defined` và **xanh vì lý do sai** — nó không hề chạy tới
    // chỗ nó tưởng đang canh. Thử phá bắt được đúng chỗ đó: con "nới sang cả đường ảnh" đi
    // lọt. Stub này để mép ⑹ chạy thật.
    window: {
      DacImageEvidence: {
        settledForImages: () => ({ settled: false }),
        completionForImage: () => ({ reason: "NO_NEW_IMAGE" })
      }
    },
    document: { get visibilityState() { return hienTai().hidden ? "hidden" : "visible"; } }
  };
  vm.createContext(sandbox);
  vm.runInContext(`${napDong}\nvar looksTruncated, waitForCompletion;${truncFn}${shipped}waitForCompletion`, sandbox);
  return {
    chay: () => sandbox.waitForCompletion({ boundary: { assistant_count: 0 }, timeoutMs, expectImage, inputEvidence: {}, attempt: {} }),
    giay: () => Math.round((dongHo - batDau) / 1000)
  };
}

const HEADER = "MODE: Audit | BUDGET: 100 w";                        // 27 ký tự, đúng cái đã ghi hụt
const DAY_DU = `[MODE: Audit | BUDGET: 100 w | RULES: ✓ đã đọc]\n\n${"x".repeat(200)}`;

/* ⑴ Trang HIỆN, chữ đứng yên → chốt bình thường. Mép này giữ cho bản vá không nuốt luôn
   đường chạy đúng: tuyệt đại đa số lượt chạy là trang hiện. */
{
  const s = sanKhau([{ tuGiay: 0, text: DAY_DU, stop: false, hidden: false }]);
  const ket = await s.chay();
  assert.equal(ket.type, "text");
  assert.equal(ket.text, DAY_DU, "trang hiện thì chốt đúng cả câu trả lời");
  assert.ok(s.giay() >= 6, `phải CHỜ hết nắp chữ-đứng-yên mới chốt — mới ${s.giay()} giây đã chốt`);
  assert.ok(s.giay() <= 15, `nhưng chốt xong thì thôi, không chờ tới hết giờ — mất ${s.giay()} giây`);
}

/* ⑴b ĐỨC CHỐT 09/09: giãn nắp chờ, *"vì nhiều task lớn GPT mất thời gian để gõ chữ"*.
   Mép này ghim đúng cái đó bằng HÀNH VI: chữ ngừng 4 giây rồi gõ tiếp. Với nắp cũ 1,5 giây,
   quãng ngừng ấy bị đọc thành "xong" và câu trả lời bị cắt mất đuôi. */
{
  const DOAN_DAU = "[MODE: Explain | BUDGET: 120 w | RULES: ✓ đã đọc] KẾT LUẬN: xong phần một.";
  const s = sanKhau([
    { tuGiay: 0, text: DOAN_DAU, stop: false, hidden: false },
    { tuGiay: 4, text: DAY_DU, stop: false, hidden: false }
  ]);
  const ket = await s.chay();
  assert.equal(ket.text, DAY_DU, "ngừng gõ 4 giây rồi gõ tiếp thì KHÔNG được chốt ở đoạn đầu — đó là nắp cũ 1,5 giây");
}

/* ⑴c ĐỨC CHỐT 09/09 vế hai: *"đọc mà thấy bị ngắt thì cần đọc lại"*. Chữ đứng yên MÃI nhưng
   đứt giữa chừng (ngoặc `[` chưa đóng — đúng năm mẩu đã ghi hụt) thì không bao giờ được chốt,
   dù trang HIỆN và dù chờ bao lâu. Đây là chỗ nắp thời gian một mình không cứu được. */
{
  const s = sanKhau([{ tuGiay: 0, text: "[MODE: Audit | BUDGET: 100 w", stop: false, hidden: false }], { timeoutMs: 60000 });
  const loi = await s.chay().then(() => null, (e) => e);
  assert.ok(loi, "chữ đứt giữa chừng thì KHÔNG được chốt, dù nó đứng yên bao lâu");
  assert.match(String(loi.message), /TEXT_INCOMPLETE/, "và phải nói ĐÚNG là còn dở, không phải 'hết giờ' trơn");
  assert.equal(loi.detection?.truncated_chars, 28, "kèm số ký tự đọc được, để biết hụt bao nhiêu");
}

/* ⑴d Đứt rồi ĐỦ: chốt được ngay khi câu chữ liền lại. Thiếu mép này thì một bản "không bao
   giờ chốt job chữ nào" cũng xanh với ⑴c. */
{
  const s = sanKhau([
    { tuGiay: 0, text: "[MODE: Audit | BUDGET: 100 w", stop: false, hidden: false },
    { tuGiay: 10, text: DAY_DU, stop: false, hidden: false }
  ], { timeoutMs: 60000 });
  const ket = await s.chay();
  assert.equal(ket.text, DAY_DU, "liền lại thì chốt, và chốt bằng bản đầy đủ");
}

/* ⑴e MÉP NGƯỢC chống bắt oan: một câu trả lời BÌNH THƯỜNG có ngoặc cân và kết bằng dấu câu
   phải chốt như thường. Phép kiểm "trông như bị cắt" mà bắt oan thì mọi job đều chạy tới hết
   giờ — hỏng nặng hơn hẳn cái nó chữa. */
{
  const BINH_THUONG = "Ba lý do (theo thứ tự): một, hai, ba. Xem thêm [tài liệu](https://x.dev).";
  const s = sanKhau([{ tuGiay: 0, text: BINH_THUONG, stop: false, hidden: false }]);
  const ket = await s.chay();
  assert.equal(ket.text, BINH_THUONG, "ngoặc cân và kết bằng dấu chấm thì KHÔNG phải là bị cắt");
}

/* ⑵ MÉP CHÍNH. Trang BỊ CHE, chữ mới đi được dòng tiêu đề rồi đứng yên mãi — đúng đường cong
   đã đo. Trước bản vá, đây là một SUCCESS với 27 ký tự. Nay phải KHÔNG chốt. */
{
  const s = sanKhau([
    { tuGiay: 0, text: "", stop: true, hidden: true },
    { tuGiay: 4, text: HEADER, stop: true, hidden: true },
    { tuGiay: 7, text: HEADER, stop: false, hidden: true }   // nút Dừng tắt, chữ đứng yên mãi
  ], { timeoutMs: 60000 });
  const loi = await s.chay().then(() => null, (e) => e);
  assert.ok(loi, "tab bị che thì KHÔNG được chốt — đây là chỗ đẻ ra báo-thành-công-giả");
  assert.doesNotMatch(String(loi.message), new RegExp(HEADER.slice(0, 10)), "và tuyệt đối không trả về mẩu chữ đó như một kết quả");
}

/* ⑶ Che rồi HIỆN LẠI: chốt được, và chốt bằng chữ ĐẦY ĐỦ. Đây là mô phỏng đúng cú bấm của Đức
   09/09 — cùng một lượt trả lời nhảy 26 → 251 ký tự, không có lượt sinh mới nào. */
{
  const s = sanKhau([
    { tuGiay: 0, text: HEADER, stop: false, hidden: true },
    { tuGiay: 20, text: DAY_DU, stop: false, hidden: false }
  ], { timeoutMs: 60000 });
  const ket = await s.chay();
  assert.equal(ket.text, DAY_DU, "hiện lại thì phải lấy chữ ĐẦY ĐỦ, không phải mẩu đã đọc lúc bị che");
  assert.ok(s.giay() >= 20, "và nó phải thật sự CHỜ tới lúc trang hiện, không chốt sớm rồi vá sau");
}

/* ⑷ Hết giờ trong lúc bị che → mã lỗi phải NÓI ĐÚNG nguyên nhân. Một câu "hết giờ" trơn là
   đúng cách con bug này sống được: nó đổ lỗi cho nhà cung cấp và người vận hành tìm sai chỗ. */
{
  const s = sanKhau([{ tuGiay: 0, text: HEADER, stop: false, hidden: true }], { timeoutMs: 30000 });
  const loi = await s.chay().then(() => null, (e) => e);
  assert.match(String(loi.message), /TAB_HIDDEN_NO_STREAM/, "phải nêu đúng nguyên nhân: tab bị che");
  assert.match(String(loi.message), /Mở tab/, "và nêu việc phải làm");
  assert.ok(loi.detection?.hidden_polls > 0, "kèm số đo, để lần sau không phải đoán lại");
}

/* ⑸ MÉP NGƯỢC: hết giờ mà trang KHÔNG bị che thì vẫn là lỗi cũ. Thiếu mép này thì một bản
   biến MỌI timeout thành "tab bị che" cũng xanh — và nó sẽ chỉ người vận hành đi sai hướng
   đúng ở những ca mà nguyên nhân thật sự nằm chỗ khác. */
{
  const s = sanKhau([{ tuGiay: 0, text: "", stop: true, hidden: false }], { timeoutMs: 30000 });
  const loi = await s.chay().then(() => null, (e) => e);
  assert.doesNotMatch(String(loi.message), /TAB_HIDDEN_NO_STREAM/, "trang hiện mà hết giờ thì KHÔNG được đổ cho tab bị che");
  assert.match(String(loi.message), /OUTPUT_DETECTION_TIMEOUT/, "vẫn là lỗi hết giờ như cũ");
}

/* ⑹ Đường ẢNH không bị đụng. Bản vá này nhắm đúng ca đã đo (job chữ); ảnh có luật riêng và
   một tab bị che ở đó rơi vào timeout chứ không thành công giả, nên nới sang đó là sửa một
   thứ chưa ai đo. */
{
  const s = sanKhau([{ tuGiay: 0, text: "", stop: false, hidden: true }], { timeoutMs: 30000, expectImage: true });
  const loi = await s.chay().then(() => null, (e) => e);
  assert.doesNotMatch(String(loi.message), /TAB_HIDDEN_NO_STREAM/, "đường ảnh giữ nguyên mã lỗi cũ");
}

console.log("B-43 tab bị che thì không chốt, chạy thật (10 mép): PASS");
