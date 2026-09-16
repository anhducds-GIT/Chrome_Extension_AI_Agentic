/* Phép ghim cho `input.upload` — phần LÕI GHI (`T29`/`W8`, 16/09). Không cần trình duyệt.
 *
 * ─── VÌ SAO KHỐI NÀY Ở ĐÂY CHỨ KHÔNG Ở GÓI UDIN ────────────────────────────
 * `scout.upload` chỉ lên dây ở `udin-optic`, nên chỗ tự nhiên để ghim nó có vẻ là bên ấy. Sai,
 * và cái sai đó đã suýt xảy ra: `scouter-actions-core.mjs` là tệp của **gói này**, còn Udin giữ
 * một **bản chép từng byte**. Đặt phép ghim bên Udin thì con đột biến mổ bản gốc ở đây trong khi
 * phép ghim đọc bản chép bên kia — nó **sống sót mà bộ đo vẫn xanh**, và đó đúng là hạng màu
 * xanh giả tệ nhất. Phép ghim phải ở cùng gói với tệp nó canh.
 *
 * Phần máy chủ ghép đường dẫn (`ghepDuongUpload`) thì ngược lại — nó là tệp của Udin, nên nó
 * được ghim ở `workers/udin-optic/v0.1.0/tests/tai-len-smoke.mjs`.
 */
import assert from "node:assert/strict";
import { runAction, ACTION_NAMES, WRITE_CDP_METHODS } from "../scripts/scouter-actions-core.mjs";

const DUONG = "C:\\vung-ghi\\udin-optic\\anh-1.webp";

/** Trang giả: `idOTep` là danh sách nút mà `input[type="file"]` khớp; selector thường khớp 42. */
function lamTrang(idOTep) {
  const daGoi = [];
  const sendRaw = async (m, p) => {
    daGoi.push({ m, p });
    if (m === "DOM.getDocument") return { root: { nodeId: 1, baseURL: "https://vi-du.test/" } };
    if (m === "DOM.querySelectorAll") {
      return { nodeIds: p.selector === 'input[type="file"]' ? idOTep : [42] };
    }
    return {};
  };
  return { sendRaw, daGoi, gan: () => daGoi.filter((g) => g.m === "DOM.setFileInputFiles") };
}

/* ---- ① Từ vựng và cửa CDP ---------------------------------------------- */
{
  assert.ok(ACTION_NAMES.includes("input.upload"));
  assert.ok(WRITE_CDP_METHODS.includes("DOM.setFileInputFiles"),
    "hành động có mà method CDP không được khai thì nó chết ở cửa `createWriteSender`");
  /* Cửa này mở 16/09 và KHÔNG được kéo theo cửa nào khác: `DOM.setFileInputFiles` là method
   * duy nhất của lượt mở ấy. Con số dưới đây đổi tay, và đổi tay là chỗ người ta dừng lại nghĩ. */
  assert.equal(WRITE_CDP_METHODS.length, 15,
    "danh sách method CDP của lõi GHI đổi = đổi luật an toàn. Thêm một cái phải hỏi Đức (ADR gốc mục 2)");
}

/* ---- ② THIẾU `path_tuyet_doi` → ĐỎ, và KHÔNG lùi về `path` --------------
 * Trường ấy do MÁY CHỦ đặt. Chạy trên một máy chủ chưa có móc ghép đường dẫn thì lệnh phải
 * chết. Lùi về `path` nghĩa là extension tự ghép đường dẫn — đúng cái việc nó không bao giờ
 * được làm, vì nó không biết vùng ghi ở đâu. */
{
  const t = lamTrang([42]);
  const ra = await runAction("input.upload", { sendRaw: t.sendRaw },
    { selector: "#tep", path: "udin-optic/anh-1.webp" });
  assert.equal(ra.ok, false);
  assert.equal(ra.code, "UPLOAD_PATH_MISSING");
  assert.deepEqual(t.daGoi, [], "đã từ chối mà vẫn chạm dây — phải đỏ TRƯỚC lệnh CDP đầu tiên");

  for (const xau of ["", "   ", 7, null]) {
    const u = lamTrang([42]);
    const r = await runAction("input.upload", { sendRaw: u.sendRaw },
      { selector: "#tep", path: "a.webp", path_tuyet_doi: xau });
    assert.equal(r.code, "UPLOAD_PATH_MISSING", `path_tuyet_doi=${JSON.stringify(xau)} phải đỏ`);
  }
}

/* ---- ③ KHỐI ĐẮT NHẤT: phần tử KHÔNG phải ô chọn tệp -------------------
 * Hỏi CHROME khớp CSS, đừng đọc thuộc tính rồi suy. Một `<div type="file">` lọt qua phép suy,
 * và `DOM.setFileInputFiles` lên phần tử ấy trả một câu lỗi của Chrome đọc không ra nguyên nhân.
 * Quan trọng hơn: lượt gắn file **không được xảy ra** khi ta chưa chắc đích là ô chọn tệp. */
{
  const t = lamTrang([7]);       /* ô chọn tệp thật là nút 7; selector khớp nút 42 */
  const ra = await runAction("input.upload", { sendRaw: t.sendRaw },
    { selector: "#khong-phai", path: "a.webp", path_tuyet_doi: DUONG });
  assert.equal(ra.ok, false);
  assert.equal(ra.code, "NOT_A_FILE_INPUT");
  assert.equal(t.gan().length, 0,
    "đã từ chối mà vẫn gọi DOM.setFileInputFiles — đó đúng là thứ phép kiểm này sinh ra để chặn");

  /* Và trang KHÔNG có ô chọn tệp nào cũng phải đỏ, không phải đỏ vì lý do khác. */
  const u = lamTrang([]);
  const rb = await runAction("input.upload", { sendRaw: u.sendRaw },
    { selector: "#tep", path: "a.webp", path_tuyet_doi: DUONG });
  assert.equal(rb.code, "NOT_A_FILE_INPUT");
}

/* ---- ④ Đường đúng: gắn ĐÚNG MỘT file vào ĐÚNG nút ---------------------
 * TRANG GIẢ Ở ĐÂY CÓ **HAI** Ô CHỌN TỆP, và nút selector khớp KHÔNG phải cái đầu — cố ý.
 * Bản đầu của khối này chỉ dựng một ô (`[42]`), tức *"ô đầu tiên"* và *"ô selector khớp"* là
 * cùng một con số, nên một bản gắn file vào `nodeIds[0]` vẫn xanh trọn vẹn. Con đột biến `U5`
 * sống sót đúng vì thế, và nó tố PHÉP GHIM chứ không tố mã. Một trang thật có nhiều ô chọn tệp
 * là chuyện bình thường; giữ hai số khác nhau ở đây là thứ duy nhất phân biệt hai nhánh. */
{
  const t = lamTrang([9, 42]);
  const ra = await runAction("input.upload", { sendRaw: t.sendRaw },
    { selector: "#tep", path: "udin-optic/anh-1.webp", path_tuyet_doi: DUONG });
  assert.equal(ra.ok, true, JSON.stringify(ra));
  assert.equal(t.gan().length, 1);
  assert.deepEqual(t.gan()[0].p, { nodeId: 42, files: [DUONG] },
    "đúng MỘT file, và đúng nút mà selector khớp — KHÔNG phải ô chọn tệp đầu tiên của trang");
  assert.equal(ra.data.files, 1);
  assert.equal(ra.data.method, "DOM.setFileInputFiles");
}

/* ---- ⑤ Kết quả KHÔNG chở đường tuyệt đối ra ngoài ---------------------
 * Người gọi vốn đã biết thứ mình xin; nhật ký thì không cần chở cả đường dẫn ổ đĩa của Đức. */
{
  const t = lamTrang([42]);
  const ra = await runAction("input.upload", { sendRaw: t.sendRaw },
    { selector: "#tep", path: "udin-optic/anh-1.webp", path_tuyet_doi: DUONG });
  assert.equal(ra.data.path, "udin-optic/anh-1.webp", "trả lại `path` TƯƠNG ĐỐI người gọi đưa");
  assert.ok(!JSON.stringify(ra.data).includes("vung-ghi"),
    "kết quả chở đường tuyệt đối ra ngoài — nhật ký không cần biết vùng ghi nằm đâu");
}

/* ---- ⑥ Selector khớp 0 hoặc nhiều → ĐỎ, dùng lại chốt chung ----------- */
{
  const daGoi = [];
  const sendRaw = async (m, p) => {
    daGoi.push({ m, p });
    if (m === "DOM.getDocument") return { root: { nodeId: 1 } };
    if (m === "DOM.querySelectorAll") return { nodeIds: p.selector === 'input[type="file"]' ? [1, 2] : [1, 2] };
    return {};
  };
  const ra = await runAction("input.upload", { sendRaw },
    { selector: "input", path: "a.webp", path_tuyet_doi: DUONG });
  assert.equal(ra.ok, false);
  assert.equal(ra.code, "SELECTOR_AMBIGUOUS", "khớp nhiều thì từ chối — 'lấy cái đầu tiên' là chỗ phá hỏng đồ thật");
  assert.equal(daGoi.filter((g) => g.m === "DOM.setFileInputFiles").length, 0);
}

console.log("  · tai-len lõi ghi (T29/W8): 6 khối xanh");
