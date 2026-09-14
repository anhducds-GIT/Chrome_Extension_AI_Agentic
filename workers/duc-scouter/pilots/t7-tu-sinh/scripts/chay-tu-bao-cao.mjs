/* CHẶNG ③+④ của `T7` — adapter dựng TỪ BÁO CÁO, chạy trên trang, so với bản làm tay.
 *
 * Vì sao file này KHÔNG có một selector nào gõ sẵn:
 *   Chặng ③ đòi adapter dựng *chỉ từ báo cáo chặng ②*. Mà người viết chặng ③ ở đây là tôi,
 *   và tôi ĐÃ BIẾT ba selector của Udin từ `pilots/udin-optic/`. Gõ chúng ra rồi bảo "tôi đọc
 *   từ báo cáo" thì không ai kiểm được — kể cả tôi. Nên cách duy nhất còn lại là **để mã tự
 *   rút selector ra khỏi báo cáo lúc chạy**: không có chỗ nào cho trí nhớ của tôi chen vào.
 *
 *   Đổi lại, thứ file này chứng minh MẠNH HƠN chặng ③ đòi: không phải *"một adapter dựng được
 *   từ báo cáo"* mà *"báo cáo đủ để một kẻ chưa từng thấy trang này lái được nó"*.
 *
 * Ba luật rút selector, và cả ba đều không biết gì về Udin:
 *   ① Ô nhập  — chữ ký đầu tiên của `ba_cau.go_o_dau` khớp **đúng một**.
 *   ② Cái nút — KHÔNG đoán bằng chữ ("Send" là tiếng Anh của một trang cụ thể). Thay vào đó
 *     **hỏi trang bằng một thí nghiệm**: gõ chữ vào ô, xem nút nào từ `disabled` chuyển sang
 *     mở. Đúng một nút đổi thì đó là nó; không thì DỪNG, vì đoán bừa một nút để bấm là thứ
 *     luật gói số 7 cấm.
 *   ③ Vùng kết quả — chữ ký đông nhất của `ba_cau.ket_qua_o_dau`. Đích thao tác phải khớp
 *     đúng một; vùng kết quả thì ngược lại, nhiều mới đúng.
 *
 *   SCOUTER_GHE=<id> node workers/duc-scouter/pilots/t7-tu-sinh/scripts/chay-tu-bao-cao.mjs "<prompt MỚI>"
 */
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { goi as goiThat } from "../../trang-thu-cham/scripts/goi-bridge.mjs";

const DUONG_BAO_CAO = process.env.BAO_CAO || "t7-udin/bao-cao-moi-nhat.json";
const nghiThat = (ms) => new Promise((r) => setTimeout(r, ms));

/* Chữ ký trong báo cáo là `TEXTAREA.agent-textarea` — tên thẻ VIẾT HOA, vì CDP trả `nodeName`
 * viết hoa. CSS thì phân biệt chữ hoa thường ở phần class, còn tên thẻ thì không — nhưng hạ
 * hết xuống thường là sai khi class có chữ hoa. Chỉ hạ đúng phần tên thẻ. */
export function sangCss(chuKy) {
  const i = chuKy.indexOf(".");
  return i < 0 ? chuKy.toLowerCase() : chuKy.slice(0, i).toLowerCase() + chuKy.slice(i);
}

export function rutSelector(baoCao) {
  const ba = baoCao?.ba_cau;
  if (!ba) throw new Error("Báo cáo không có khối `ba_cau` — đây là báo cáo của bản chặng ② CŨ, dò lại trước đã.");
  const oNhap = (ba.go_o_dau || []).find((x) => x.khop === 1);
  if (!oNhap) throw new Error(`Báo cáo không có ô nhập nào khớp đúng một (${(ba.go_o_dau || []).length} chữ ký) — chưa lái được trang này.`);
  const ketQua = (ba.ket_qua_o_dau || [])[0];
  if (!ketQua) throw new Error("Báo cáo không có vùng kết quả nào — sẽ không biết lượt chạy đã xong hay chưa.");
  const nut = (ba.bam_o_dau || []).filter((x) => x.khop === 1).map((x) => sangCss(x.selector));
  if (nut.length === 0) throw new Error("Báo cáo không có cái nút nào khớp đúng một — luật gói số 7 không cho bấm thứ khớp nhiều.");
  return { oNhap: sangCss(oNhap.selector), ungVienNut: nut, ketQua: sangCss(ketQua.selector), ketQuaTruoc: ketQua.khop };
}

export async function chay(prompt, tuyChon = {}) {
  if (typeof prompt !== "string" || !prompt.trim()) throw new Error("Thiếu prompt — mỗi lượt chạy thật phải có chữ MỚI.");
  const goi = tuyChon.goi || goiThat;
  const nghi = tuyChon.ngu || nghiThat;

  /* Báo cáo đi về qua ĐÚNG cái cửa đã ghi nó ra — `file.read` của máy chủ. Đọc thẳng bằng `fs`
   * cũng ra cùng nội dung, nhưng lúc đó vòng tự cải tiến khép qua đĩa của tôi chứ không qua
   * Bridge, và thứ T7 cần chứng minh chính là cái vòng đi qua Bridge. */
  const tep = await goi("file.read", { path: tuyChon.duongBaoCao || DUONG_BAO_CAO }, tuyChon);
  const baoCao = JSON.parse(tep.content);
  const sel = rutSelector(baoCao);

  const tab = await timTab(goi, baoCao.url, tuyChon);
  const dem = async (selector) => (await goi("scout.query", { target_id: tab, selector, limit: 1 }, tuyChon)).data;
  const khoa = async (selector) => {
    const d = await dem(selector);
    return d.matchCount === 1 && "disabled" in (d.items[0]?.attributes || {});
  };

  /* ---- THÍ NGHIỆM TÌM NÚT ------------------------------------------------
   * Chụp trạng thái khoá của mọi ứng viên TRƯỚC, gõ chữ, chụp lại. Nút đổi từ khoá sang mở là
   * nút nhận chữ của ô này. Đây cũng đúng là phép kiểm "chữ đã tới React chưa" (`G-29`) — một
   * lượt gõ, hai câu trả lời. */
  const truoc = new Map();
  for (const s of sel.ungVienNut) truoc.set(s, await khoa(s));
  const daKhoa = sel.ungVienNut.filter((s) => truoc.get(s));
  if (daKhoa.length === 0) {
    throw new Error(
      `Không ứng viên nút nào đang KHOÁ (${sel.ungVienNut.length} ứng viên) — thí nghiệm không phân biệt được cái nào ` +
      "nhận chữ. Ô có thể đang có chữ sẵn: xoá ô rồi dò lại. Chưa gõ gì, chưa bấm gì.",
    );
  }

  /* ---- MỐC KẾT QUẢ: một TẬP, không phải một con số -----------------------
   * Bản đầu chờ "số phần tử kết quả TĂNG". Chạy thật 14/09 cho thấy nó hỏng câm: ảnh của Udin
   * là URL ký có hạn, hết hạn thì rụng khỏi DOM — nên trong lúc 4 ảnh mới hiện ra, 8 ảnh cũ
   * biến mất và con số đi từ 36 xuống 32. Lượt chạy thành công, ảnh có thật, mà adapter quay
   * vòng chờ 590 giây rồi bị giết.
   *
   * Một tập chỉ-thêm không chữa được ca đó; phải hỏi *có THÀNH VIÊN MỚI không*. Nhận dạng lấy
   * theo thứ tự `src` → `href` → `id`: không cái nào là hiểu biết về một trang cụ thể, cả ba
   * đều là chỗ HTML đặt danh tính của một phần tử. */
  const nhanDang = (it) => it.attributes?.src || it.attributes?.href || it.attributes?.id || null;
  const tapKetQua = async () => {
    const tap = new Set();
    let khop = 0;
    for (let offset = 0; ; offset += 200) {
      const d = (await goi("scout.query", { target_id: tab, selector: sel.ketQua, offset, limit: 200 }, tuyChon)).data;
      khop = d.matchCount;
      for (const it of d.items) { const v = nhanDang(it); if (v) tap.add(v); }
      if (!d.hasMore) return { tap, khop };
    }
  };

  const moc = await tapKetQua();
  if (moc.khop > 0 && moc.tap.size === 0) {
    throw new Error(
      `Vùng kết quả '${sel.ketQua}' có ${moc.khop} phần tử nhưng không cái nào mang \`src\`/\`href\`/\`id\` — ` +
      "không có cách nào phân biệt kết quả MỚI với kết quả cũ, nên sẽ không biết lúc nào xong. Chưa gõ gì, chưa bấm gì.",
    );
  }
  await goi("scout.type", { target_id: tab, selector: sel.oNhap, text: prompt }, tuyChon);

  let mo = [];
  for (let i = 0; i < 10 && mo.length === 0; i++) {
    mo = [];
    for (const s of daKhoa) if (!(await khoa(s))) mo.push(s);
    if (mo.length === 0) await nghi(300);
  }
  if (mo.length !== 1) {
    throw new Error(
      mo.length === 0
        ? `Gõ xong mà không nút nào mở khoá (thử ${daKhoa.length} ứng viên) — chữ không tới được trang, hoặc trang này không dùng nút khoá/mở. Chưa bấm gì.`
        : `Gõ xong thì ${mo.length} nút cùng mở khoá (${mo.join(" · ")}) — thí nghiệm không chỉ ra được MỘT nút. Luật gói số 7 không cho bấm khi chưa chắc. Chưa bấm gì.`,
    );
  }
  const nut = mo[0];

  /* ---- TỪ ĐÂY TRỞ ĐI TRANG SẼ LÀM VIỆC THẬT ----------------------------- */
  const t0 = Date.now();
  await goi("scout.click", { target_id: tab, selector: nut }, tuyChon);

  const tran = tuyChon.tranMs ?? 900000;
  let moi = [];
  for (;;) {
    const nay = await tapKetQua();
    moi = [...nay.tap].filter((v) => !moc.tap.has(v));
    if (moi.length > 0) {
      return {
        selector: { oNhap: sel.oNhap, nut, ketQua: sel.ketQua },
        ungVienNut: sel.ungVienNut.length,
        daThuKhoa: daKhoa.length,
        ketQuaTruoc: moc.khop,
        ketQuaSau: nay.khop,
        ketQuaMoi: moi.length,
        giay: Math.round((Date.now() - t0) / 1000),
      };
    }
    if (Date.now() - t0 > tran) {
      /* *Quá giờ* ≠ *hỏng*: credit đã tiêu và trang có thể vẫn đang chạy. Gộp hai câu này lại
       * đã làm mất trắng một lượt chạy ngày 14/09 (`G-55`), nên lối ra phải nói rõ nó là ca nào. */
      const e = new Error(
        `Đã bấm ${Math.round((Date.now() - t0) / 1000)}s mà chưa có phần tử '${sel.ketQua}' nào MỚI ` +
        `(lúc bấm ${moc.khop}, giờ ${nay.khop}). Trang CÓ THỂ vẫn đang chạy — đây không phải "hỏng".`,
      );
      e.dangChay = true;
      throw e;
    }
    await nghi(tuyChon.buocMs ?? 3000);
  }
}

async function timTab(goi, url, tuyChon) {
  const ket = await goi("scout.targets", {}, tuyChon);
  const t = ket.data.targets.find((x) => x.type === "page" && typeof x.url === "string" && x.url.startsWith(url));
  if (!t) throw new Error(`Không ghế nào đang mở ${url} — báo cáo dò trang đó, adapter phải chạy trên đúng trang đó.`);
  return t.targetId;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  chay(process.argv.slice(2).find((a) => !a.startsWith("--")))
    .then((k) => console.log(JSON.stringify(k, null, 2)))
    .catch((e) => { console.error(e.message); process.exitCode = 1; });
}
