/* Phép ghim cho adapter dựng-từ-báo-cáo (`T7` chặng ③+④).
 *
 * Trang giả CHÉP HÌNH DẠNG TỪ DÂY THẬT, không từ trí nhớ: `file.read` trả
 * `{path,bytes,encoding,content}` ở tầng ngoài cùng, `scout.query` trả `{data:{matchCount,items,
 * hasMore}}`, `scout.page` trả `{data:{elements:{items,hasMore}}}` — cả ba đều hỏi thật 14/09.
 *
 * Hai việc nặng nhất bộ này canh:
 *   ① Thí nghiệm tìm nút phải nhận ra CẢ HAI lối vào trạng thái *bấm được*: `disabled` mở ra
 *     (Udin) và **chưa có mặt rồi hiện ra** (ChatGPT). Bản đầu chỉ biết lối thứ nhất.
 *   ② Dấu hiệu XONG là một TẬP có thành viên mới, không phải một con số lớn lên.
 */
import assert from "node:assert/strict";
import { chay, rutSelector, sangCss } from "../scripts/chay-tu-bao-cao.mjs";

const BAO_CAO = {
  url: "https://trang.thu/x",
  ba_cau: {
    go_o_dau: [{ selector: "INPUT.bi-nhieu", khop: 3 }, { selector: "TEXTAREA.oNhapChinh", khop: 1 }],
    bam_o_dau: [{ selector: "BUTTON.motCai", khop: 1 }],
    ket_qua_o_dau: [{ selector: "IMG.ketQua", khop: 2 }, { selector: "P", khop: 1 }],
  },
};

/* `nut` là bảng trạng thái của trang giả: `false` bấm được · `true` khoá · vắng mặt = chưa vẽ.
 * `sauKhiGo` là bảng SAU lượt gõ — nên một trang dựng được cả hai lối chỉ bằng dữ liệu. */
const KHOA_ROI_MO = {
  nut: { "button.motCai": true, "button.dangNhap": false, "button.haiCai": true },
  sauKhiGo: { "button.motCai": true, "button.dangNhap": false, "button.haiCai": false },
};
const CHUA_CO_ROI_HIEN = {
  nut: { "button.dangNhap": false },
  sauKhiGo: { "button.dangNhap": false, "#composer-submit-button": false },
};

function lam({ ca = KHOA_ROI_MO, sauKhiBam = ["cu-2", "moi-1"], coNhanDang = true, nhieuKhop = [], baoCao = BAO_CAO } = {}) {
  const nk = [];
  const trang = { daGo: false, ketQua: ["cu-1", "cu-2"] };
  const bangNut = () => (trang.daGo ? ca.sauKhiGo : ca.nut);
  const taNut = (k) => {
    /* Chữ ký ngược về thuộc tính, đúng chiều `chuKyNut` dựng nó: `#id` hoặc `thẻ.class`. */
    const at = bangNut()[k] ? { disabled: "" } : {};
    if (k.startsWith("#")) return { nodeName: "BUTTON", attributes: { ...at, id: k.slice(1) } };
    const [the, ...lop] = k.split(".");
    return { nodeName: the.toUpperCase(), attributes: { ...at, class: lop.join(" ") } };
  };
  const goi = async (method, p) => {
    nk.push({ method, p });
    if (method === "file.read") return { path: p.path, bytes: 1, encoding: "utf8", content: JSON.stringify(baoCao) };
    if (method === "scout.targets") return { data: { targets: [{ type: "page", url: baoCao.url + "/sau", targetId: "TAB" }] } };
    if (method === "scout.page") return { data: { elements: { items: Object.keys(bangNut()).map(taNut), hasMore: false } } };
    if (method === "scout.query") {
      if (p.selector === "img.ketQua") return { data: { matchCount: trang.ketQua.length, hasMore: false,
        items: trang.ketQua.map((src) => ({ attributes: coNhanDang ? { src } : {} })) } };
      if (p.selector === "textarea.oNhapChinh") return { data: { matchCount: 1, items: [{ attributes: {} }], hasMore: false } };
      const co = Object.prototype.hasOwnProperty.call(bangNut(), p.selector);
      /* `nhieuKhop` dựng đúng ca `G-87`: chữ ký dựng từ thuộc tính gom MỘT phần tử, mà đọc như
       * một selector CSS thì khớp NHIỀU. Hai lời khai đá nhau, và chỉ lượt hỏi lại trang thấy. */
      const n = nhieuKhop.includes(p.selector) ? 2 : (co ? 1 : 0);
      return { data: { matchCount: n, items: co ? [taNut(p.selector)] : [], hasMore: false } };
    }
    if (method === "scout.type") { trang.daGo = true; return { data: { typed: p.text.length } }; }
    if (method === "scout.click") { trang.ketQua = sauKhiBam; return { data: {} }; }
    throw new Error("method lạ " + method + " " + (p.selector || ""));
  };
  /* `tranMs` nhỏ: một trang giả "xong mà số kết quả không đổi" sẽ quay vòng chờ đến hết bộ nhớ
   * thay vì đỏ — đã xảy ra đúng như thế lúc viết bộ này. Phép ghim phải HỎNG NHANH. */
  return { nk, goi, ngu: async () => {}, buocMs: 0, tranMs: 200 };
}

// ⓐ rút selector: ô nhập và vùng kết quả — KHÔNG rút cái nút
{
  const s = rutSelector(BAO_CAO);
  assert.equal(s.oNhap, "textarea.oNhapChinh", "phải bỏ qua chữ ký khớp 3, lấy chữ ký khớp ĐÚNG MỘT");
  assert.equal(s.ketQua, "img.ketQua", "vùng kết quả lấy chữ ký ĐÔNG nhất");
  assert.equal(s.ungVienNut, undefined, "cái nút KHÔNG lấy từ báo cáo nữa — chính trang trả lời câu đó");
  /* báo cáo KHÔNG có `bam_o_dau` vẫn phải dùng được: trên ChatGPT nút gửi chưa tồn tại lúc dò */
  const khongNut = { url: "u", ba_cau: { go_o_dau: [{ selector: "INPUT", khop: 1 }], bam_o_dau: [], ket_qua_o_dau: [{ selector: "P", khop: 4 }] } };
  assert.equal(rutSelector(khongNut).oNhap, "input");
  assert.equal(sangCss("TEXTAREA.agent-textarea"), "textarea.agent-textarea");
  assert.equal(sangCss("DIV.CoChuHoa"), "div.CoChuHoa", "class giữ nguyên chữ hoa — hạ hết là hỏng selector");
}

// ⓑ lối KHOÁ → MỞ (Udin): bấm đúng cái đổi, không bấm cái vốn đã bấm được
{
  const t = lam();
  const k = await chay("một prompt mới", t);
  assert.equal(k.selector.nut, "button.haiCai", "phải bấm cái ĐỔI TRẠNG THÁI");
  assert.equal(k.ketQuaTruoc, 2);
  assert.equal(k.ketQuaSau, 2, "ca cần thử đúng là ca TỔNG SỐ KHÔNG ĐỔI");
  assert.equal(k.ketQuaMoi, 1, "một thành viên mới dù tổng số đứng yên — đếm thì mù, tập thì thấy");
  const iGo = t.nk.findIndex((g) => g.method === "scout.type");
  const iBam = t.nk.findIndex((g) => g.method === "scout.click");
  assert.ok(iGo >= 0 && iBam > iGo, "bấm phải đứng sau gõ");
  assert.equal(t.nk.filter((g) => g.method === "scout.click").length, 1, "chỉ được bấm MỘT lần");
  assert.ok(t.nk.findIndex((g) => g.method === "scout.query" && g.p.selector === "img.ketQua") < iGo, "mốc kết quả chụp trước khi gõ");
}

// ⓒ lối CHƯA CÓ → HIỆN RA (ChatGPT): nút không hề có trong báo cáo, vẫn tìm ra
{
  const t = lam({ ca: CHUA_CO_ROI_HIEN });
  const k = await chay("prompt", t);
  assert.equal(k.selector.nut, "#composer-submit-button", "nút chỉ hiện ra SAU lượt gõ — bản cũ mù hoàn toàn ca này");
  assert.equal(t.nk.filter((g) => g.method === "scout.click").length, 1);
}

// ⓓ hai nút cùng đổi → KHÔNG bấm gì (luật gói số 7: chưa chắc thì không bấm)
{
  const t = lam({ ca: { nut: { "button.a": true, "button.b": true }, sauKhiGo: { "button.a": false, "button.b": false } } });
  await assert.rejects(() => chay("prompt", t), /2 nút cùng đổi/);
  assert.equal(t.nk.filter((g) => g.method === "scout.click").length, 0, "chưa chắc mà vẫn bấm là hỏng đúng chỗ đắt nhất");
}

// ⓔ không nút nào đổi → không bấm (chữ không tới được trang)
{
  const t = lam({ ca: { nut: { "button.a": true }, sauKhiGo: { "button.a": true } } });
  await assert.rejects(() => chay("prompt", t), /không nút nào đổi/);
  assert.equal(t.nk.filter((g) => g.method === "scout.click").length, 0);
}

// ⓕ nút vốn đã bấm được từ trước KHÔNG được thành ứng viên
{
  const t = lam({ ca: { nut: { "button.dangNhap": false }, sauKhiGo: { "button.dangNhap": false } } });
  await assert.rejects(() => chay("prompt", t), /không nút nào đổi/);
}

// ⓕ2 chữ ký gom một mà khớp NHIỀU → hỏi lại trang thấy, và KHÔNG bấm (luật gói số 7)
{
  const t = lam({ nhieuKhop: ["button.haiCai"] });
  await assert.rejects(() => chay("prompt", t), /khớp 2 phần tử, không phải 1/);
  assert.equal(t.nk.filter((g) => g.method === "scout.click").length, 0, "chữ ký suy ra không đủ — phải ĐO trước khi bấm");
}

// ⓖ kết quả co lại nhiều hơn nở ra: vẫn phải nhận ra là XONG
{
  const t = lam({ sauKhiBam: ["moi-1"] });
  const k = await chay("prompt", t);
  assert.equal(k.ketQuaSau, 1, "tổng số GIẢM từ 2 xuống 1");
  assert.equal(k.ketQuaMoi, 1);
}

// ⓗ phần tử kết quả không mang src/href/id → dừng TRƯỚC lượt gõ
{
  const t = lam({ coNhanDang: false });
  await assert.rejects(() => chay("prompt", t), /không cái nào mang/);
  assert.equal(t.nk.filter((g) => g.method === "scout.type").length, 0);
}

// ⓘ báo cáo thiếu — mỗi ca một câu nói rõ thiếu gì
{
  await assert.rejects(() => chay("p", lam({ baoCao: { url: "u" } })), /chặng ② CŨ/);
  const khongMotAi = { url: "u", ba_cau: { go_o_dau: [{ selector: "INPUT", khop: 4 }], bam_o_dau: [], ket_qua_o_dau: [] } };
  await assert.rejects(() => chay("p", lam({ baoCao: khongMotAi })), /khớp đúng một \(1 chữ ký\)/);
  const khongKetQua = { url: "u", ba_cau: { go_o_dau: [{ selector: "INPUT", khop: 1 }], bam_o_dau: [], ket_qua_o_dau: [] } };
  await assert.rejects(() => chay("p", lam({ baoCao: khongKetQua })), /không có vùng kết quả/);
}

// ⓙ thiếu prompt → không đụng gì tới trang
{
  const t = lam();
  await assert.rejects(() => chay("  ", t), /chữ MỚI/);
  assert.equal(t.nk.length, 0);
}

console.log("  · t7-tu-sinh: 11 khối xanh");
