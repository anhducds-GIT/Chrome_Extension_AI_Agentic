/* Phép ghim cho W6 — thêm một khung vào canvas. Chạy không cần trình duyệt.
 *
 * Máy giả dưới đây chép hình dạng THẬT đo ngày 16/09 trên `vinfast.udinbv.com/optic`: nút mở
 * menu khớp **1**, menu có **bốn** mục `Frame` · `Image` · `Video` · `3D Model`, và một lượt
 * thêm khung làm `.canvas-image-container.is-empty-frame` đi từ **7 → 8**. Bài học
 * `fake-encodes-my-belief`: một máy giả chép đúng cái hiểu SAI của mình thì xanh hết rồi ngã ở
 * lượt gọi thật đầu tiên.
 *
 * Quá nửa số khối ở đây ghim ĐƯỜNG HỎNG, và khối ⓓ là khối đắt nhất: menu tắt mà khung không
 * tăng. Đó là cách chặng này có thể trả lời SAI trong khi mọi thứ trông đúng.
 */
import assert from "node:assert/strict";
import { themKhung, SEL, NHAN_DA_THAY, NHAN_LAM_DUOC } from "../them-khung.mjs";

const NHAN = ["Frame", "Image", "Video", "3D Model"];

/**
 * @param {object} c
 * @param {number} [c.khungTruoc=7]  số khung trước khi bấm
 * @param {number} [c.themVao=1]     bấm xong thì thêm mấy khung (0 = trang không phản ứng)
 * @param {number} [c.soNut=1]       số phần tử khớp nút mở menu
 * @param {string[]} [c.nhan]        nhãn các mục trong menu, theo thứ tự
 * @param {boolean} [c.menuMoSan]    menu đã mở sẵn từ trước
 */
function lam(c = {}) {
  const khungTruoc = c.khungTruoc ?? 7;
  const themVao = c.themVao ?? 1;
  const nhan = c.nhan ?? NHAN;
  let khung = khungTruoc;
  let menu = c.menuMoSan ? 1 : 0;
  const daGoi = [];
  const goi = async (method, p) => {
    daGoi.push({ method, selector: p.selector, wait_for: p.wait_for, wait_state: p.wait_state });
    if (method === "scout.query") {
      if (p.selector === SEL.nut) return { data: { matchCount: c.soNut ?? 1 } };
      if (p.selector === SEL.menu) return { data: { matchCount: menu } };
      if (p.selector === SEL.khung) return { data: { matchCount: khung } };
      const m = p.selector.match(/nth-of-type\((\d+)\)$/);
      if (m) return { data: { matchCount: nhan[Number(m[1]) - 1] === undefined ? 0 : 1 } };
      return { data: { matchCount: 0 } };
    }
    if (method === "scout.text") {
      const m = p.selector.match(/nth-of-type\((\d+)\)$/);
      return { data: { text: nhan[Number(m[1]) - 1], matchCount: 1 } };
    }
    if (method === "scout.click") {
      if (p.selector === SEL.nut) { menu = menu === 1 ? 0 : 1; return { data: { da_kiem: true } }; }
      /* Bấm một mục: menu tắt LUÔN LUÔN — kể cả khi trang không thêm khung nào. Đây chính là
       * chỗ `wait_state: "absent"` không đủ để kết luận, và là lý do khối ⓓ tồn tại. */
      menu = 0;
      khung += themVao;
      return { data: { da_kiem: true } };
    }
    if (method === "scout.wait") {
      const dat = khung >= (p.min_count ?? 1);
      return { data: { satisfied: dat, matchCount: khung, waitedMs: 5 } };
    }
    throw new Error(`máy giả không biết method '${method}'`);
  };
  return { goi, tab: "TAB1", daGoi };
}

/* ⓐ đường đúng: đếm trước → mở menu → tìm đúng nhãn → bấm → đếm sau */
{
  const t = lam();
  const k = await themKhung(t);
  assert.equal(k.loai, "Frame");
  assert.equal(k.truoc, 7);
  assert.equal(k.sau, 8);
  assert.equal(k.them, 1);
  assert.equal(k.viTri, 1, "Frame là mục đầu tiên trên trang thật 16/09");

  /* ĐẾM PHẢI XẢY RA TRƯỚC CÚ BẤM. Không có lượt đếm trước thì không có gì để so, và chặng này
   * tụt về đúng cái bẫy `S1` đã gỡ. */
  const iDemTruoc = t.daGoi.findIndex((g) => g.method === "scout.query" && g.selector === SEL.khung);
  const iBamMuc = t.daGoi.findIndex((g) => g.method === "scout.click" && g.selector !== SEL.nut);
  assert.ok(iDemTruoc !== -1 && iDemTruoc < iBamMuc,
    `phải đếm khung TRƯỚC khi bấm — thứ tự thật: ${t.daGoi.map((g) => `${g.method}:${g.selector}`).join(" → ")}`);

  /* Hai cú bấm phải mang mốc, và mốc phải NGƯỢC chiều nhau. */
  const bamNut = t.daGoi.find((g) => g.method === "scout.click" && g.selector === SEL.nut);
  const bamMuc = t.daGoi[iBamMuc];
  assert.equal(bamNut.wait_for, SEL.menu, "mở menu mà không có mốc thì không biết nó đã mở chưa");
  assert.equal(bamMuc.wait_for, SEL.menu);
  assert.equal(bamMuc.wait_state, "absent", "bấm mục xong thì menu PHẢI biến mất — đó là mốc");
}

/* ⓑ hai lời từ chối đứng TRƯỚC khi chạm dây ------------------------------
 * Nhánh cần tệp là nhánh nguy hiểm nhất của cả chặng: bấm nhầm nó là dựng một hộp thoại hệ
 * điều hành lên màn hình của Đức và treo Chrome. Nên nó phải đỏ trước khi có một lượt gọi nào. */
{
  for (const loai of ["Image", "Video", "3D Model"]) {
    const t = lam();
    await assert.rejects(() => themKhung({ ...t, loai }), /hộp thoại chọn tệp|scout\.upload|W8/,
      `'${loai}' phải bị từ chối kèm LÝ DO, không phải một câu 'không hợp lệ' chung chung`);
    assert.deepEqual(t.daGoi, [], `'${loai}' đã chạm dây trước khi bị từ chối — đúng chỗ không được phép chạm`);
  }
  const t = lam();
  await assert.rejects(() => themKhung({ ...t, loai: "Nhan La" }), /Không có nhãn/);
  assert.deepEqual(t.daGoi, [], "nhãn lạ cũng phải đỏ trước khi chạm dây");

  for (const xau of ["", "   ", 7, null]) {
    if (xau === null) continue;   /* null = mặc định "Frame", có chủ ý */
    await assert.rejects(() => themKhung({ ...lam(), loai: xau }), /chuỗi nhãn|Không có nhãn/);
  }
  assert.deepEqual([...NHAN_LAM_DUOC], ["Frame"],
    "mở rộng danh sách này là mở một hộp thoại hệ điều hành, không phải mở một tính năng — đọc đầu file trước");
  assert.deepEqual([...NHAN_DA_THAY], NHAN, "bảng nhãn lệch với thứ đo được trên trang");
}

/* ⓒ nút mở menu khớp ≠ 1 → ĐỎ, không lấy cái đầu tiên */
{
  for (const soNut of [0, 3]) {
    await assert.rejects(() => themKhung(lam({ soNut })), /Cần đúng MỘT nút/);
  }
}

/* ⓓ KHỐI ĐẮT NHẤT: menu tắt mà khung KHÔNG tăng --------------------------
 * `wait_state: "absent"` trả lời câu *menu còn không*, không trả lời câu *khung có thêm không*.
 * Một bản chỉ tin cái mốc ấy sẽ báo ĐẠT ở đây. */
{
  const t = lam({ themVao: 0 });
  await assert.rejects(() => themKhung(t), /số khung KHÔNG tăng đúng một|trước 7, sau 7/,
    "menu tắt mà khung không tăng mà vẫn báo đạt — đây đúng lời nói dối W6 sinh ra để diệt");

  /* Và chiều ngược: thêm HAI khung cũng là sai — trang làm thứ ta không xin. */
  await assert.rejects(() => themKhung(lam({ themVao: 2 })), /KHÔNG tăng đúng một/,
    "thêm hai khung cũng phải đỏ: `sau >= truoc` là phép kiểm không phân biệt được hai nhánh");
}

/* ⓔ menu đang mở sẵn thì ĐỪNG bấm nút mở lần nữa ------------------------
 * Bấm một cái đang mở là ĐÓNG nó, rồi mọi bước sau đi tìm mục trong hư không. */
{
  const t = lam({ menuMoSan: true });
  const k = await themKhung(t);
  assert.equal(k.them, 1);
  assert.equal(t.daGoi.filter((g) => g.method === "scout.click" && g.selector === SEL.nut).length, 0,
    "menu đang mở mà vẫn bấm nút mở — cú bấm đó ĐÓNG menu lại");
}

/* ⓕ nhãn đổi chỗ: vẫn phải tìm ra Frame, không bấm theo số thứ tự --------
 * Trang đổi thứ tự menu là chuyện bình thường, và ở đây bấm nhầm số thứ tự nghĩa là bấm trúng
 * `Image` — tức mở hộp thoại hệ điều hành. */
{
  const t = lam({ nhan: ["Image", "Video", "Frame", "3D Model"] });
  const k = await themKhung(t);
  assert.equal(k.viTri, 3, "phải tìm Frame ở vị trí THẬT của nó, không bấm theo vị trí gõ cứng");
  const bamMuc = t.daGoi.find((g) => g.method === "scout.click" && g.selector !== SEL.nut);
  assert.match(bamMuc.selector, /nth-of-type\(3\)$/);
  /* Và nó phải DỪNG ở chỗ tìm thấy, không đọc tiếp cho hết menu. */
  assert.equal(t.daGoi.filter((g) => g.method === "scout.text").length, 3);
}

/* ⓖ menu không còn nhãn nào khớp → ĐỎ và KỂ RA đã đọc được gì */
{
  const t = lam({ nhan: ["Khung", "Anh"] });
  await assert.rejects(() => themKhung(t), (e) =>
    /Không mục nào/.test(e.message) && e.message.includes("Khung") && e.message.includes("Anh"),
    "đỏ mà không kể đã đọc được nhãn gì thì người sửa phải tự đi dò lại từ đầu");
}

console.log("them-khung (W6) smoke tests: PASS");
