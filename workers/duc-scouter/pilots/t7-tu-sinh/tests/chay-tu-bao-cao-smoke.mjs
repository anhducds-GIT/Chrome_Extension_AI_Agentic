/* Phép ghim cho adapter dựng-từ-báo-cáo (`T7` chặng ③+④).
 *
 * Trang giả ở đây CHÉP HÌNH DẠNG TỪ DÂY THẬT, không từ trí nhớ: `file.read` trả
 * `{path,bytes,encoding,content}` ở tầng ngoài cùng (hỏi thật 14/09), còn `scout.query` trả
 * `{data:{matchCount,items,hasMore}}`. Một lần đoán sai hình dạng dây đã lọt qua 15 phép ghim
 * xanh trước đây, nên chỗ này không đoán.
 *
 * Việc nặng nhất của bộ này là ghim cái **thí nghiệm tìm nút**: đích thao tác phải do trang
 * chỉ ra, không do người viết nhớ ra. */
import assert from "node:assert/strict";
import { chay, rutSelector, sangCss } from "../scripts/chay-tu-bao-cao.mjs";

const BAO_CAO = {
  url: "https://trang.thu/x",
  ba_cau: {
    go_o_dau: [{ selector: "INPUT.bi-nhieu", khop: 3 }, { selector: "TEXTAREA.oNhapChinh", khop: 1 }],
    bam_o_dau: [{ selector: "BUTTON.motCai", khop: 1 }, { selector: "BUTTON.haiCai", khop: 1 },
                { selector: "BUTTON.baCai", khop: 1 }, { selector: "BUTTON.day-la-dam-dong", khop: 9 }],
    ket_qua_o_dau: [{ selector: "IMG.ketQua", khop: 2 }, { selector: "P", khop: 1 }],
  },
};

/* `sauKhiBam` thay hẳn TẬP kết quả, không chỉ đổi con số — vì ca đắt nhất của trang thật là
 * *"có kết quả mới mà tổng số KHÔNG tăng"*: ảnh Udin là URL ký có hạn, cũ rụng đi trong khi
 * mới hiện ra. Một trang giả chỉ đếm được thì không bao giờ dựng nổi ca ấy. */
function lam({ moKhoa = ["button.haiCai"], dangKhoa = ["button.motCai", "button.haiCai"],
               sauKhiBam = ["cu-2", "moi-1"], coNhanDang = true, baoCao = BAO_CAO } = {}) {
  const nk = [];
  const trang = { daGo: false, ketQua: ["cu-1", "cu-2"] };
  const goi = async (method, p) => {
    nk.push({ method, p });
    if (method === "file.read") return { path: p.path, bytes: 1, encoding: "utf8", content: JSON.stringify(baoCao) };
    if (method === "scout.targets") return { data: { targets: [{ type: "page", url: baoCao.url + "/sau", targetId: "TAB" }] } };
    if (method === "scout.query") {
      if (p.selector === "img.ketQua") return { data: { matchCount: trang.ketQua.length, hasMore: false,
        items: trang.ketQua.map((src) => ({ attributes: coNhanDang ? { src } : {} })) } };
      if (p.selector === "textarea.oNhapChinh") return { data: { matchCount: 1, items: [{ attributes: {} }], hasMore: false } };
      /* Nút: khoá lúc đầu; sau lượt gõ thì đúng những cái trong `moKhoa` mở ra. */
      const khoa = dangKhoa.includes(p.selector) && !(trang.daGo && moKhoa.includes(p.selector));
      return { data: { matchCount: 1, items: [{ attributes: khoa ? { disabled: "" } : {} }], hasMore: false } };
    }
    if (method === "scout.type") { trang.daGo = true; return { data: { typed: p.text.length } }; }
    if (method === "scout.click") { trang.ketQua = sauKhiBam; return { data: {} }; }
    throw new Error("method lạ " + method + " " + (p.selector || ""));
  };
  /* `tranMs` nhỏ: một trang giả "xong mà số kết quả không đổi" sẽ quay vòng chờ đến hết bộ nhớ
   * thay vì đỏ — đã xảy ra đúng như thế lúc viết bộ này. Phép ghim phải HỎNG NHANH. */
  return { nk, goi, ngu: async () => {}, buocMs: 0, tranMs: 200 };
}

// ⓐ rút đúng ba selector từ báo cáo, và HẠ tên thẻ chứ không hạ class
{
  const s = rutSelector(BAO_CAO);
  assert.equal(s.oNhap, "textarea.oNhapChinh", "phải bỏ qua chữ ký khớp 3, lấy chữ ký khớp ĐÚNG MỘT");
  assert.equal(s.ketQua, "img.ketQua", "vùng kết quả lấy chữ ký ĐÔNG nhất");
  assert.deepEqual(s.ungVienNut, ["button.motCai", "button.haiCai", "button.baCai"], "nút khớp 9 không được vào danh sách ứng viên");
  assert.equal(sangCss("TEXTAREA.agent-textarea"), "textarea.agent-textarea");
  assert.equal(sangCss("DIV.CoChuHoa"), "div.CoChuHoa", "class giữ nguyên chữ hoa — hạ hết là hỏng selector");
  assert.equal(sangCss("P"), "p");
}

// ⓑ đường xanh: trang tự chỉ ra cái nút, bấm đúng nó, và bấm SAU khi gõ
{
  const t = lam();
  const k = await chay("một prompt mới", t);
  assert.equal(k.selector.nut, "button.haiCai", "phải bấm cái nút ĐỔI TRẠNG THÁI, không phải cái đầu danh sách");
  assert.equal(k.selector.oNhap, "textarea.oNhapChinh");
  assert.equal(k.ketQuaTruoc, 2);
  assert.equal(k.ketQuaSau, 2, "ca cần thử đúng là ca TỔNG SỐ KHÔNG ĐỔI");
  assert.equal(k.ketQuaMoi, 1, "một thành viên mới, dù tổng số đứng yên — đếm thì mù, tập thì thấy");
  const iGo = t.nk.findIndex((g) => g.method === "scout.type");
  const iBam = t.nk.findIndex((g) => g.method === "scout.click");
  assert.ok(iGo >= 0 && iBam > iGo, "bấm phải đứng sau gõ — thí nghiệm cần lượt gõ mới phân biệt được nút");
  assert.equal(t.nk.filter((g) => g.method === "scout.click").length, 1, "chỉ được bấm MỘT lần");
  /* và số kết quả phải đọc TRƯỚC lượt gõ: đọc sau là đã lẫn kết quả của lượt này vào mốc */
  const iDemDau = t.nk.findIndex((g) => g.method === "scout.query" && g.p.selector === "img.ketQua");
  assert.ok(iDemDau < iGo, "mốc kết quả phải chụp trước khi gõ");
}

// ⓒ hai nút cùng mở khoá → KHÔNG bấm gì (luật gói số 7: chưa chắc thì không bấm)
{
  const t = lam({ moKhoa: ["button.motCai", "button.haiCai"] });
  await assert.rejects(() => chay("prompt", t), /2 nút cùng mở khoá/);
  assert.equal(t.nk.filter((g) => g.method === "scout.click").length, 0, "chưa chắc mà vẫn bấm là hỏng đúng chỗ đắt nhất");
}

// ⓓ không nút nào mở khoá → không bấm (chữ không tới được trang)
{
  const t = lam({ moKhoa: [] });
  await assert.rejects(() => chay("prompt", t), /không nút nào mở khoá/);
  assert.equal(t.nk.filter((g) => g.method === "scout.click").length, 0);
}

// ⓔ không ứng viên nào đang khoá → dừng TRƯỚC lượt gõ (ô có thể đang có chữ sẵn)
{
  const t = lam({ dangKhoa: [] });
  await assert.rejects(() => chay("prompt", t), /Không ứng viên nút nào đang KHOÁ/);
  assert.equal(t.nk.filter((g) => g.method === "scout.type").length, 0, "chưa phân biệt được nút thì đừng gõ vào ô của người ta");
}

// ⓕ báo cáo thiếu — mỗi ca một câu nói rõ thiếu gì, không phải một câu chung
{
  await assert.rejects(() => chay("p", lam({ baoCao: { url: "u" } })), /chặng ② CŨ/);
  const khongMotAi = { url: "u", ba_cau: { go_o_dau: [{ selector: "INPUT", khop: 4 }], bam_o_dau: [], ket_qua_o_dau: [] } };
  await assert.rejects(() => chay("p", lam({ baoCao: khongMotAi })), /khớp đúng một \(1 chữ ký\)/);
  const khongKetQua = { url: "u", ba_cau: { go_o_dau: [{ selector: "INPUT", khop: 1 }], bam_o_dau: [{ selector: "BUTTON", khop: 1 }], ket_qua_o_dau: [] } };
  await assert.rejects(() => chay("p", lam({ baoCao: khongKetQua })), /không có vùng kết quả/);
}

// ⓖ thiếu prompt → không đụng gì tới trang (mỗi lượt chạy thật phải có chữ mới)
{
  const t = lam();
  await assert.rejects(() => chay("  ", t), /chữ MỚI/);
  assert.equal(t.nk.length, 0);
}

// ⓗ kết quả co lại nhiều hơn nở ra: vẫn phải nhận ra là XONG
{
  const t = lam({ sauKhiBam: ["moi-1"] });
  const k = await chay("prompt", t);
  assert.equal(k.ketQuaSau, 1, "tổng số GIẢM từ 2 xuống 1");
  assert.equal(k.ketQuaMoi, 1);
}

// ⓘ phần tử kết quả không mang src/href/id → dừng TRƯỚC lượt gõ, vì sẽ không bao giờ biết lúc nào xong
{
  const t = lam({ coNhanDang: false });
  await assert.rejects(() => chay("prompt", t), /không cái nào mang/);
  assert.equal(t.nk.filter((g) => g.method === "scout.type").length, 0);
}

console.log("  · t7-tu-sinh: 9 khối xanh");
