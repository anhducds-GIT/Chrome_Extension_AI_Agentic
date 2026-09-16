/* Phép ghim cho W5 — chọn chế độ Agent / Manual Gen. Chạy không cần trình duyệt.
 *
 * Máy giả dưới đây chép hình dạng THẬT đo ngày 16/09 trên `vinfast.udinbv.com/optic`:
 * `button.create-mode-btn` khớp **2**, `:nth-of-type(1)` = `"Agent"` và đang mang `active`,
 * `:nth-of-type(2)` = `"Manual Gen"`, `button.create-mode-btn.active` khớp **1**.
 * Bài học `fake-encodes-my-belief`: một máy giả chép đúng cái hiểu SAI của mình thì xanh hết
 * rồi ngã ở lượt gọi thật đầu tiên — nên mọi con số ở đây là số đọc được từ trang, không phải
 * số tôi thấy hợp lý.
 *
 * Khối ⓒ là khối đắt nhất của cả tệp, và nó ghim một chuyện khác hẳn `W6`: ở đây **phép đếm
 * hiển nhiên nhất là phép đếm vô dụng**. Số nút mang `.active` bằng 1 ở CẢ nhánh chạy đúng lẫn
 * nhánh cú bấm không tới trang, nên nó không phân biệt được gì.
 */
import assert from "node:assert/strict";
import { chonCheDo, SEL, CHE_DO_DA_THAY } from "../chon-che-do.mjs";

const NHAN = ["Agent", "Manual Gen"];

/**
 * @param {object} c
 * @param {string[]} [c.nhan]        nhãn các nút, theo thứ tự trang bày
 * @param {number[]} [c.hoat=[1]]    các nút đang mang `.active`, 1-based
 * @param {boolean} [c.bamToi=true]  cú bấm có tới trang không (false = `S-22`)
 * @param {string[]} [c.nhanSauBam]  nhãn sau khi bấm, nếu trang xếp lại menu giữa chừng
 */
function lam(c = {}) {
  let nhan = c.nhan ?? NHAN;
  let hoat = new Set(c.hoat ?? [1]);
  const daGoi = [];
  const soThuTu = (sel) => {
    const m = sel.match(/nth-of-type\((\d+)\)(\.active)?$/);
    return m ? { i: Number(m[1]), chonActive: Boolean(m[2]) } : null;
  };
  const goi = async (method, p) => {
    daGoi.push({ method, selector: p.selector, wait_for: p.wait_for, wait_state: p.wait_state });
    if (method === "scout.query") {
      if (p.selector === SEL.nut) return { data: { matchCount: nhan.length } };
      if (p.selector === SEL.dangChon) return { data: { matchCount: hoat.size } };
      const n = soThuTu(p.selector);
      if (!n) return { data: { matchCount: 0 } };
      if (n.i > nhan.length) return { data: { matchCount: 0 } };
      return { data: { matchCount: n.chonActive ? (hoat.has(n.i) ? 1 : 0) : 1 } };
    }
    if (method === "scout.text") {
      const n = soThuTu(p.selector);
      /* `scout.text` TỪ CHỐI khớp 0 hoặc 2+ — đó là điều kiện của ADR-0006, viết thẳng trong
       * mô tả method, không phải một tuỳ chọn. Máy giả phải từ chối y như vậy: một máy giả dễ
       * tính hơn dây thật thì mọi phép ghim đứng trên nó đều rộng hơn nó tưởng, và chỗ rộng ra
       * đó chính là chỗ bản thật sẽ ngã (`fake-encodes-my-belief`). */
      if (!n || n.i < 1 || n.i > nhan.length) {
        const e = new Error(`scout.text từ chối: selector '${p.selector}' khớp 0 phần tử.`);
        e.code = "SELECTOR_NOT_UNIQUE";
        throw e;
      }
      return { data: { text: nhan[n.i - 1], matchCount: 1 } };
    }
    if (method === "scout.click") {
      const n = soThuTu(p.selector);
      /* `bamToi: false` = cú bấm không tới trang (`S-22`). Trang đứng im: nút cũ VẪN `active`,
       * nên `button.create-mode-btn.active` vẫn khớp đúng 1. Đó là cả cái bẫy. */
      if (c.bamToi !== false) hoat = new Set([n.i]);
      if (c.nhanSauBam) nhan = c.nhanSauBam;
      return { data: { da_kiem: c.bamToi !== false } };
    }
    throw new Error(`máy giả không biết method '${method}'`);
  };
  return { goi, tab: "TAB1", daGoi, demActive: () => hoat.size };
}

/* ⓐ đường đúng: đọc bảng trước → bấm đúng nút mang nhãn → đọc lại ------------ */
{
  const t = lam();
  const k = await chonCheDo({ ...t, che: "Manual Gen" });
  assert.equal(k.che, "Manual Gen");
  assert.equal(k.truoc, 1, "trang mở ra ở Agent — đo thật 16/09");
  assert.equal(k.viTri, 2);
  assert.equal(k.sau, 2);
  assert.equal(k.daBam, true);

  /* ĐỌC PHẢI XẢY RA TRƯỚC CÚ BẤM. Không có lượt đọc trước thì không có gì để so. */
  const iDocTruoc = t.daGoi.findIndex((g) => g.method === "scout.text");
  const iBam = t.daGoi.findIndex((g) => g.method === "scout.click");
  assert.ok(iDocTruoc !== -1 && iDocTruoc < iBam,
    `phải đọc bảng nút TRƯỚC khi bấm — thứ tự thật: ${t.daGoi.map((g) => g.method).join(" → ")}`);

  /* Và phải đọc LẠI sau khi bấm, nếu không thì `sau` chỉ là cái `truoc` chép lại. */
  assert.ok(t.daGoi.slice(iBam).some((g) => g.method === "scout.text"),
    "không đọc lại sau khi bấm thì kết quả chỉ là lời hứa của chính mình");

  /* Mốc của cú bấm phải là CHÍNH NÚT XIN đang bật, không phải một cái mốc chung chung. */
  const bam = t.daGoi[iBam];
  assert.match(bam.selector, /nth-of-type\(2\)$/);
  assert.equal(bam.wait_for, `${SEL.nut}:nth-of-type(2).active`);
  assert.equal(bam.wait_state, "present");
}

/* ⓑ xin đúng chế độ đang bật → KHÔNG bấm lần nào ---------------------------
 * Đây là lệnh đặt TRẠNG THÁI. Bấm lại một nút đang bật là thừa, và trên một toggle lỡ viết kiểu
 * bập bênh thì nó tắt đúng cái mình vừa xin. */
{
  const t = lam();
  const k = await chonCheDo({ ...t, che: "Agent" });
  assert.equal(k.daBam, false);
  assert.equal(k.truoc, 1);
  assert.equal(k.sau, 1);
  assert.equal(t.daGoi.filter((g) => g.method === "scout.click").length, 0,
    "đã ở đúng chế độ mà vẫn bấm — cú bấm thừa đó là cú có thể tắt đúng thứ vừa xin");
}

/* ⓒ KHỐI ĐẮT NHẤT: cú bấm không tới trang -----------------------------------
 * `S-22` đúng hình dạng này: lệnh chạy trọn, trang đứng im. Một bản tin *“vẫn có đúng một nút
 * active”* sẽ báo ĐẠT ở đây. */
{
  const t = lam({ bamToi: false });
  assert.equal(t.demActive(), 1, "tiền đề: trước khi bấm có đúng MỘT nút active");
  await assert.rejects(() => chonCheDo({ ...t, che: "Manual Gen" }),
    /KHÔNG sang 'Manual Gen'|trước ở nút 1, sau ở nút 1/,
    "trang đứng im mà vẫn báo đạt — đây đúng lời nói dối W5 sinh ra để diệt");

  /* VÀ ĐÂY LÀ TIỀN ĐỀ CỦA CẢ KHỐI, ghim thẳng ra chứ không để trong đầu ai: phép đếm `.active`
   * — cái hiển nhiên nhất để đếm — cho ra CÙNG MỘT SỐ ở cả hai nhánh. Một phép ghim dựa vào nó
   * xanh ở cả lượt đúng lẫn lượt hỏng, tức là nó không ghim gì cả (`assertion-must-distinguish-branches`). */
  assert.equal(t.demActive(), 1, "sau lượt hỏng vẫn đúng MỘT nút active — con số ấy không phân biệt được gì");
  const tOk = lam();
  await chonCheDo({ ...tOk, che: "Manual Gen" });
  assert.equal(tOk.demActive(), 1, "sau lượt ĐÚNG cũng đúng MỘT nút active — cùng con số, khác kết quả");
}

/* ⓓ trước khi bấm mà không đọc được trạng thái → ĐỎ, đừng bấm mù ------------- */
{
  await assert.rejects(() => chonCheDo({ ...lam({ hoat: [] }), che: "Manual Gen" }),
    /Không nút nào mang '\.active'/);
  await assert.rejects(() => chonCheDo({ ...lam({ hoat: [1, 2] }), che: "Manual Gen" }),
    /2 nút cùng mang '\.active'/,
    "hai nút cùng bật là trạng thái không đọc được — im lặng lấy cái cuối là bịa ra một con số");

  /* Và cả hai phải đỏ TRƯỚC cú bấm. */
  for (const hoat of [[], [1, 2]]) {
    const t = lam({ hoat });
    await assert.rejects(() => chonCheDo({ ...t, che: "Manual Gen" }));
    assert.equal(t.daGoi.filter((g) => g.method === "scout.click").length, 0,
      "chưa đọc được trạng thái mà đã bấm — bấm xong cũng không kết luận được gì");
  }
}

/* ⓔ nhãn lạ và nhãn rỗng → ĐỎ trước khi chạm dây ---------------------------- */
{
  for (const che of ["Manual", "manual gen", "", "   ", 7, undefined, null]) {
    const t = lam();
    await assert.rejects(() => chonCheDo({ ...t, che }), /chuỗi nhãn chế độ|Không nút chế độ nào/);
  }
  /* Nhãn lạ vẫn phải ĐỌC trang trước khi kết luận — lời từ chối phải kể đã đọc được gì, nếu không
   * người sửa phải tự đi dò lại từ đầu. Nhưng tuyệt đối không được BẤM. */
  const t = lam();
  await assert.rejects(() => chonCheDo({ ...t, che: "Manual" }),
    (e) => /Không nút chế độ nào/.test(e.message) && e.message.includes("Manual Gen"));
  assert.equal(t.daGoi.filter((g) => g.method === "scout.click").length, 0);

  assert.deepEqual([...CHE_DO_DA_THAY], NHAN, "bảng nhãn lệch với thứ đo được trên trang");
}

/* ⓕ số nút ngoài khoảng → ĐỎ, không lấy đại cái đầu tiên -------------------- */
{
  for (const nhan of [[], ["Agent"], Array.from({ length: 9 }, (_, i) => `M${i}`)]) {
    await assert.rejects(() => chonCheDo({ ...lam({ nhan }), che: "Agent" }), /Cần từ 2 đến 8 nút/);
  }
}

/* ⓖ trang đổi thứ tự: vẫn phải tìm theo NHÃN, không bấm theo số gõ cứng ----- */
{
  const t = lam({ nhan: ["Manual Gen", "Agent"], hoat: [2] });
  const k = await chonCheDo({ ...t, che: "Manual Gen" });
  assert.equal(k.viTri, 1, "phải tìm nhãn ở vị trí THẬT của nó");
  assert.equal(k.truoc, 2);
  assert.equal(k.sau, 1);
  const bam = t.daGoi.find((g) => g.method === "scout.click");
  assert.match(bam.selector, /nth-of-type\(1\)$/);
}

/* ⓗ trang xếp lại menu NGAY SAU cú bấm → ĐỎ ---------------------------------
 * Nút số 2 đang bật đúng như xin, nhưng nhãn của nó nay là thứ khác — tức thứ vừa bật không phải
 * thứ vừa xin. `sau === viTri` một mình không bắt được chuyện này. */
{
  const t = lam({ nhanSauBam: ["Agent", "Video Gen"] });
  await assert.rejects(() => chonCheDo({ ...t, che: "Manual Gen" }),
    /nhãn của nó đã đổi thành 'Video Gen'/,
    "nút đúng vị trí nhưng sai nhãn vẫn là sai — vị trí một mình không đủ khi trang xếp lại được");
}

console.log("chon-che-do (W5) smoke tests: PASS");
