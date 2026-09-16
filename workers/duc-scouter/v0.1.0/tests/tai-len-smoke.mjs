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
  /* HAI cửa mở ngày 16/09, và chỉ hai. `Page.setInterceptFileChooserDialog` mở SAU, khi phép đo
   * cho thấy ô nhận file của Udin chỉ sống trong lúc hộp thoại mở.
   *
   * Và nó KHÔNG kéo theo cửa nào khác — chỗ này đáng ghi vì nó ngược với trực giác: phép đo
   * 16/09 cho thấy nó chạy **không cần `Page.enable`** và **không cần kênh sự kiện** (ô nhận file
   * nằm lại trong DOM chờ, nên hỏi lại là thấy). Hai method đáng lẽ phải mở kèm mà hoá ra không.
   * Con số dưới đây đổi TAY, và đổi tay là chỗ người ta dừng lại nghĩ. */
  assert.ok(WRITE_CDP_METHODS.includes("Page.setInterceptFileChooserDialog"));
  assert.ok(!WRITE_CDP_METHODS.includes("Page.enable"),
    "`Page.enable` KHÔNG cần cho lượt chặn hộp thoại — đo 16/09. Thêm nó là nới bề mặt cho một nhu cầu không có");
  assert.equal(WRITE_CDP_METHODS.length, 17,
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


/* ═══ ĐƯỜNG ⒝ — BẤM MỘT NÚT ĐỂ TRANG DỰNG Ô CHỌN TỆP RA (`mo_bang`) ═══════
 * Đo trên trang Udin 16/09: ô `<input type=file>` được dựng TẠM rồi XOÁ ĐI — nó chỉ sống trong
 * lúc hộp thoại đang mở. Nên trình tự bắt buộc là CHẶN hộp thoại TRƯỚC, rồi mới bấm.
 */

/** Trang giả cho đường ⒝: cú bấm dựng thêm `themO` ô chọn tệp mới. */
function lamTrangMo({ themO = 1, chanNem = false, tatNem = false } = {}) {
  const daGoi = [];
  let oTep = [9];                     /* trang đã sẵn một ô, để phép lọc "ô MỚI" có việc thật */
  let daBam = false;
  const sendRaw = async (m, p) => {
    daGoi.push({ m, p });
    if (m === "Page.setInterceptFileChooserDialog") {
      if (p.enabled && chanNem) throw new Error("Chrome tu choi chan");
      if (!p.enabled && tatNem) throw new Error("Chrome tu choi tat chan");
      return {};
    }
    if (m === "DOM.getDocument") return { root: { nodeId: 1 } };
    if (m === "DOM.querySelectorAll") {
      if (p.selector === 'input[type="file"]') return { nodeIds: daBam ? [...oTep, ...Array.from({ length: themO }, (_, i) => 100 + i)] : oTep };
      return { nodeIds: [42] };
    }
    /* `margin` cần cho `gocCuon` (`S-23`): nó suy độ cuộn từ mép âm của `:root`. Thiếu nó thì
     * lượt bấm đỏ bằng `CLICK_HIT_TEST_FAILED` — máy giả thiếu, không phải mã sai. */
    if (m === "DOM.getBoxModel") return { model: { content: [0, 0, 20, 0, 20, 10, 0, 10], margin: [0, 0, 20, 0, 20, 10, 0, 10] } };
    if (m === "DOM.getNodeForLocation") return { nodeId: 42 };
    if (m === "Input.dispatchMouseEvent") { if (p.type === "mouseReleased") daBam = true; return {}; }
    return {};
  };
  const chan = () => daGoi.filter((g) => g.m === "Page.setInterceptFileChooserDialog").map((g) => g.p.enabled);
  return { sendRaw, daGoi, chan, gan: () => daGoi.filter((g) => g.m === "DOM.setFileInputFiles") };
}

/* ---- ⑦ Đường đúng của `mo_bang`: CHẶN trước, bấm sau, TẮT cuối --------- */
{
  const t = lamTrangMo();
  const ra = await runAction("input.upload", { sendRaw: t.sendRaw },
    { mo_bang: "#image", path: "udin-optic/anh-1.webp", path_tuyet_doi: DUONG });
  assert.equal(ra.ok, true, JSON.stringify(ra));
  assert.deepEqual(t.chan(), [true, false], "phải BẬT chặn rồi TẮT, đúng một lần mỗi chiều");

  /* THỨ TỰ LÀ CẢ VẤN ĐỀ: bấm trước khi chặn thì hộp thoại hệ điều hành dựng lên màn hình Đức
   * và đứng đó tới khi có người bấm tay — đúng cái đã hai lần bị từ chối. */
  const ten = t.daGoi.map((g) => `${g.m}${g.m === "Page.setInterceptFileChooserDialog" ? `:${g.p.enabled}` : ""}`);
  assert.ok(ten.indexOf("Page.setInterceptFileChooserDialog:true") < ten.indexOf("Input.dispatchMouseEvent"),
    `phải CHẶN trước khi BẤM — thứ tự thật: ${ten.join(" → ")}`);
  assert.ok(ten.lastIndexOf("Page.setInterceptFileChooserDialog:false") > ten.indexOf("DOM.setFileInputFiles"),
    "lượt TẮT phải đứng sau lượt gắn file");

  /* Gắn vào ô MỚI hiện ra, không phải ô vốn đã có. */
  assert.deepEqual(t.gan()[0].p, { nodeId: 100, files: [DUONG] },
    "phải đổ vào ô MỚI do cú bấm dựng ra, không phải ô trang vốn đã có");
  assert.equal(ra.data.mo_bang, "#image");
  assert.equal(ra.data.selector, null);
}

/* ---- ⑧ KHỐI ĐẮT NHẤT CỦA CẢ TỆP: hỏng giữa chừng thì VẪN PHẢI TẮT -----
 * Để quên cái chặn ở trạng thái BẬT nghĩa là hộp thoại chọn tệp mà CHÍNH ĐỨC mở cũng im lặng
 * không hiện — anh sẽ tưởng Chrome hỏng, và không một thông báo nào chỉ về đây. Đây là hậu quả
 * tệ nhất mà `T29` có thể gây ra, và nó xảy ra ở NHÁNH LỖI, nhánh không ai chạy thử. */
{
  /* ⒜ cú bấm không dựng ra ô nào */
  const a = lamTrangMo({ themO: 0 });
  const ra = await runAction("input.upload", { sendRaw: a.sendRaw },
    { mo_bang: "#image", path: "a.webp", path_tuyet_doi: DUONG });
  assert.equal(ra.ok, false);
  assert.equal(ra.code, "NO_FILE_CHOOSER");
  assert.deepEqual(a.chan(), [true, false], "lượt gọi ĐỎ mà cái chặn vẫn BẬT — Chrome của Đức nuốt mọi hộp thoại từ đây");

  /* ⒝ cú bấm dựng ra NHIỀU ô → từ chối, và vẫn tắt */
  const b = lamTrangMo({ themO: 3 });
  const rb = await runAction("input.upload", { sendRaw: b.sendRaw },
    { mo_bang: "#image", path: "a.webp", path_tuyet_doi: DUONG });
  assert.equal(rb.code, "SELECTOR_AMBIGUOUS");
  assert.equal(b.gan().length, 0, "nhiều ô mới thì KHÔNG đổ vào cái đầu tiên");
  assert.deepEqual(b.chan(), [true, false]);
}

/* ---- ⑨ Phải chọn ĐÚNG MỘT đường, và khai cả hai là chưa quyết --------- */
{
  for (const p of [
    { selector: "#tep", mo_bang: "#image" },
    {}
  ]) {
    const t = lamTrangMo();
    const ra = await runAction("input.upload", { sendRaw: t.sendRaw }, { ...p, path: "a.webp", path_tuyet_doi: DUONG });
    assert.equal(ra.code, "UPLOAD_MODE_UNCLEAR", JSON.stringify(p));
    assert.deepEqual(t.daGoi, [], "chưa quyết mà đã chạm dây — và tệ hơn, có thể đã bật cái chặn");
  }
}

/* ---- ⑨ `input.tha` — ĐƯỜNG KÉO-THẢ, KHÔNG HỘP THOẠI (16/09 khuya) --------
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

console.log("  · tai-len lõi ghi (T29/W8 + kéo-thả): 10 khối xanh");
