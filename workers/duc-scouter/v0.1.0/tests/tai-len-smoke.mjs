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
  /* `Page.setInterceptFileChooserDialog` ĐÃ GỠ 17/09, và phép ghim này là chỗ giữ nó gỡ.
   *
   * Nó vào danh sách 16/09 để chặn hộp thoại mà đường `mo_bang` bật lên. Hiểm thật của nó là
   * ĐỂ QUÊN BẬT — khi còn bật, hộp thoại mà CHÍNH ĐỨC mở cũng im lặng không hiện, và không có
   * thông báo nào chỉ về đây. Đường `mo_bang` gỡ cùng ngày (`scout.tha` không đi qua hộp thoại
   * nào cả), nên method này không còn ai gọi. Một method GHI không ai gọi vẫn là một method
   * GHI còn mở, nên nó không được ở lại "phòng khi cần". */
  assert.ok(!WRITE_CDP_METHODS.includes("Page.setInterceptFileChooserDialog"),
    "gỡ 17/09 — mở lại là đổi luật an toàn, phải hỏi Đức (ADR gốc mục 2)");
  assert.ok(!WRITE_CDP_METHODS.includes("Page.enable"),
    "`Page.enable` chưa bao giờ cần ở đây — đo 16/09. Thêm nó là nới bề mặt cho một nhu cầu không có");
  assert.equal(WRITE_CDP_METHODS.length, 16,
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

/* ---- ⑦ ĐƯỜNG `mo_bang` ĐÃ GỠ 17/09, và khối này là chỗ giữ nó gỡ --------
 * Nó từng bấm một nút để trang dựng ô chọn tệp ra, và cú bấm ấy bật hộp thoại `Open` của Windows
 * lên màn hình Đức — mỗi lượt một cú Cancel. `input.tha` làm cùng việc mà không đi qua hộp thoại
 * nào, nên đường này không còn lý do tồn tại.
 *
 * Khai `mo_bang` bây giờ KHÔNG âm thầm thành công theo một đường khác: không có `selector` thì
 * `SELECTOR_REQUIRED`, và **không một lượt `Page.setInterceptFileChooserDialog` nào được bắn** —
 * vế sau mới là vế đắt, vì để quên cái chặn ở trạng thái BẬT nghĩa là Chrome của Đức im lặng
 * nuốt mọi hộp thoại chọn tệp, kể cả hộp thoại anh tự mở. */
{
  const t = lamTrang([42]);
  const ra = await runAction("input.upload", { sendRaw: t.sendRaw },
    { mo_bang: "#image", path: "a.webp", path_tuyet_doi: DUONG });
  assert.equal(ra.ok, false);
  assert.equal(ra.code, "SELECTOR_REQUIRED", JSON.stringify(ra));
  assert.equal(t.gan().length, 0);
  assert.equal(t.daGoi.filter((g) => g.m === "Page.setInterceptFileChooserDialog").length, 0,
    "lõi vẫn bắn lượt chặn hộp thoại — method ấy đã gỡ khỏi WRITE_CDP_METHODS, nên đây là một lượt gọi chết ở cửa");
}

/* ---- ⑧ `input.tha` — ĐƯỜNG KÉO-THẢ, KHÔNG HỘP THOẠI (16/09 khuya) --------
 *
 * Vì sao đường này ra đời: lời khai *"hộp thoại không hiện lên màn hình Đức"* của `W8` **SAI** —
 * Đức gửi ảnh chụp hộp thoại `Open` hai lần trong một tối. Ba giả thuyết đã đo và đều trượt, nên
 * `Page.setInterceptFileChooserDialog` không sửa được bằng hiểu biết hiện có. Đường này **không
 * đi qua hộp thoại nào cả** — đó là khác biệt về CẤU TẠO, không phải một lượt chặn khéo hơn. */
function lamTrangTha({ nutTrungDiem = 42 } = {}) {
  const daGoi = [];
  const sendRaw = async (m, p) => {
    daGoi.push({ m, p });
    if (m === "DOM.getDocument") return { root: { nodeId: 1 } };
    if (m === "DOM.querySelectorAll") return { nodeIds: p.nodeId === 1 ? [42] : [42] };
    if (m === "DOM.getBoxModel") return { model: { content: [10, 20, 110, 20, 110, 60, 10, 60], margin: [0, 0, 20, 0, 20, 10, 0, 10] } };
    if (m === "DOM.getNodeForLocation") return nutTrungDiem === null ? {} : { nodeId: nutTrungDiem };
    return {};
  };
  return { sendRaw, daGoi, tha: () => daGoi.filter((g) => g.m === "Input.dispatchDragEvent") };
}

{
  assert.ok(ACTION_NAMES.includes("input.tha"));
  assert.ok(WRITE_CDP_METHODS.includes("Input.dispatchDragEvent"));

  /* ⑨a Đường đúng: ĐỦ BA khung, ĐÚNG thứ tự, CÙNG một toạ độ, và `files` mang đường TUYỆT ĐỐI. */
  {
    const t = lamTrangTha();
    const ra = await runAction("input.tha", { sendRaw: t.sendRaw },
      { selector: "#canvas", path: "udin-optic/anh-1.webp", path_tuyet_doi: DUONG });
    assert.equal(ra.ok, true, JSON.stringify(ra));
    const b = t.tha();
    assert.deepEqual(b.map((g) => g.p.type), ["dragEnter", "dragOver", "drop"],
      "thiếu một khung là trang thật bỏ qua lượt thả — chuỗi này chép từ phép đo trên Chrome sạch");
    assert.equal(new Set(b.map((g) => `${g.p.x},${g.p.y}`)).size, 1, "ba khung phải cùng MỘT điểm");
    for (const g of b) {
      assert.deepEqual(g.p.data.files, [DUONG], "`files` mang đường TUYỆT ĐỐI do máy chủ đặt");
      assert.deepEqual(g.p.data.items, []);
    }
    /* Toạ độ suy từ hộp phần tử (tâm 60,40), KHÔNG phải từ người gọi. */
    assert.deepEqual([b[0].p.x, b[0].p.y], [60, 40]);
    /* Trả về đường TƯƠNG ĐỐI — nhật ký không chở đường ổ đĩa. */
    assert.equal(ra.data.path, "udin-optic/anh-1.webp");
    assert.equal(ra.data.method, "Input.dispatchDragEvent");
    /* CHỐT CỦA CẢ ĐƯỜNG NÀY: không đụng tới hộp thoại một lần nào. */
    assert.equal(t.daGoi.filter((g) => g.m === "Page.setInterceptFileChooserDialog").length, 0,
      "đường kéo-thả mà còn gọi tới lượt chặn hộp thoại thì nó đã thành đường cũ");
    assert.equal(t.daGoi.filter((g) => g.m === "DOM.setFileInputFiles").length, 0);
  }

  /* ⑨b Toạ độ của NGƯỜI GỌI bị bỏ qua — chốt ⑶. Đây là chỗ method này nguy hiểm nhất: nó nhận
   * `x`/`y`, nên một tham số lọt qua là "thả tệp vào bất kỳ đâu trên màn hình". */
  {
    const t = lamTrangTha();
    const ra = await runAction("input.tha", { sendRaw: t.sendRaw },
      { selector: "#canvas", x: 9999, y: 8888, path: "a.webp", path_tuyet_doi: DUONG });
    /* Không phải "bỏ qua" mà là **TỪ CHỐI THẲNG**, và khoá ấy nằm ở cổng chung của lõi ghi nên
     * `input.tha` thừa hưởng nó mà không phải viết thêm dòng nào. Đo lại ở đây vì method này là
     * method ĐẦU TIÊN của gói thật sự nhận `x`/`y` xuống CDP — nếu cổng ấy hở thì hở đúng ở đây. */
    assert.equal(ra.ok, false);
    assert.equal(ra.code, "COORDINATE_NOT_ACCEPTED");
    assert.equal(t.tha().length, 0, "từ chối rồi thì không được bắn một khung nào");
  }

  /* ⑨c Thiếu `path_tuyet_doi` → ĐỎ, và KHÔNG bắn một khung nào. Extension không tự ghép đường. */
  {
    const t = lamTrangTha();
    const ra = await runAction("input.tha", { sendRaw: t.sendRaw }, { selector: "#canvas", path: "a.webp" });
    assert.equal(ra.ok, false);
    assert.equal(ra.code, "UPLOAD_PATH_MISSING");
    assert.equal(t.tha().length, 0);
  }

  /* ⑨d Điểm thả bị lớp phủ che → ĐỎ, và KHÔNG bắn `drop`. Cùng khoá với `input.click` (`S-17`):
   * thả một tệp vào một lớp phủ là đưa tệp cho thứ không ai định đưa. */
  {
    const t = lamTrangTha({ nutTrungDiem: 777 });
    const ra = await runAction("input.tha", { sendRaw: t.sendRaw },
      { selector: "#canvas", path: "a.webp", path_tuyet_doi: DUONG });
    assert.equal(ra.ok, false, JSON.stringify(ra));
    assert.equal(t.tha().length, 0, "chưa kiểm được điểm thả thì không thả");
  }
}

console.log("  · tai-len lõi ghi (T29/W8 + kéo-thả): 8 khối xanh");
