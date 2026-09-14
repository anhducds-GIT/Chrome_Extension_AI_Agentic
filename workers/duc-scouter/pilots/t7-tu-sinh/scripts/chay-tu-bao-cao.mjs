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
 * Ba câu, và chúng KHÔNG cùng một nguồn — đây là bài học của trang thứ hai (`T21`, 14/09):
 *   ① Ô nhập — từ BÁO CÁO: chữ ký đầu của `ba_cau.go_o_dau` khớp **đúng một**. Báo cáo trả lời
 *     được câu này vì ô nhập luôn có mặt, và HTML/ARIA khai rõ nó (`role=textbox`, `type`).
 *   ② Cái nút — từ CHÍNH TRANG, không từ báo cáo. Hai lý do, cả hai đo được: KHÔNG đoán bằng
 *     chữ (`"Send"` là tiếng Anh của một trang cụ thể), và trên ChatGPT nút gửi **chưa tồn tại**
 *     lúc dò nên nó không có chữ ký nào trong báo cáo để mà lọc. Thay vào đó: chụp trang trước
 *     và sau lượt gõ, lấy cái nút ĐỔI từ *chưa bấm được* sang *bấm được* — `disabled` mở ra,
 *     hoặc chưa có mặt rồi hiện ra. Đúng một nút đổi thì đó là nó; không thì DỪNG, vì đoán bừa
 *     một nút để bấm là thứ luật gói số 7 cấm.
 *   ③ Vùng kết quả — từ báo cáo: chữ ký đông nhất của `ba_cau.ket_qua_o_dau`. **Câu này chưa
 *     tổng quát**: trên Udin kết quả là một bầy `img` nên đúng, trên ChatGPT nó ra `li.list-none`
 *     và sai. *Kết quả* là một khái niệm ngữ nghĩa mà HTML không đánh dấu.
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
  /* `bam_o_dau` KHÔNG còn là điều kiện bắt buộc, và đây là bài học của trang thứ hai: trên
   * ChatGPT nút gửi **không tồn tại** lúc dò (`#composer-submit-button` khớp 0 khi ô trống),
   * nên nó không có chữ ký nào trong báo cáo để mà lọc. Báo cáo trả lời được *gõ ở đâu* và
   * *kết quả ở đâu*; **chính trang** trả lời *bấm ở đâu*, bằng cái nó đổi sau lượt gõ. */
  return { oNhap: sangCss(oNhap.selector), ketQua: sangCss(ketQua.selector), ketQuaTruoc: ketQua.khop };
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

  /* ---- THÍ NGHIỆM TÌM NÚT: SO CHÍNH TRANG, TRƯỚC VÀ SAU LƯỢT GÕ ----------
   * Bản đầu chỉ soi danh sách ứng viên của báo cáo và chỉ biết một dấu hiệu: `disabled` mở ra.
   * Trang thứ hai phá cả hai giả định cùng lúc (`G-89`):
   *   · ChatGPT **không vẽ** nút gửi khi ô trống → nó không có mặt trong báo cáo để mà lọc;
   *   · nên dấu hiệu phải là *chưa bấm được → bấm được*, trong đó **chưa có mặt** cũng là một
   *     cách chưa bấm được.
   * Chụp cả trang trước và sau, rồi lấy phần ĐỔI. Ai đổi thì trang tự khai ra, không ai đoán.
   */
  const chuKyNut = (it) => {
    const a = it.attributes || {};
    if (typeof a.id === "string" && /^[A-Za-z][\w-]*$/.test(a.id)) return "#" + a.id;
    const tid = a["data-testid"] ?? a["data-test-id"] ?? a["data-qa"];
    if (typeof tid === "string" && tid !== "") return `${it.nodeName.toLowerCase()}[data-testid=${JSON.stringify(tid)}]`;
    const lop = String(a.class || "").split(/\s+/).filter(Boolean);
    return lop.length ? it.nodeName.toLowerCase() + "." + lop.join(".") : null;   // không có móc thì không theo dõi được
  };
  const chupNut = async () => {
    const map = new Map();
    for (let offset = 0; ; offset += 200) {
      const d = (await goi("scout.page", { target_id: tab, offset, limit: 200 }, tuyChon)).data;
      for (const it of d.elements.items) {
        const la = it.nodeName === "BUTTON" || it.nodeName === "A" || it.attributes?.role === "button";
        if (!la) continue;
        const k = chuKyNut(it);
        if (k === null) continue;
        /* Một chữ ký trùng nhiều phần tử thì bỏ hẳn: luật gói số 7 không cho bấm thứ khớp nhiều. */
        map.set(k, map.has(k) ? "nhieu" : ("disabled" in (it.attributes || {})));
      }
      if (!d.elements.hasMore) return map;
    }
  };

  const nutTruoc = await chupNut();

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

  /* Nút cần tìm là nút ĐỔI TỪ *chưa bấm được* SANG *bấm được*. Hai lối vào cùng một trạng
   * thái, và cả hai đều gặp trên trang thật:
   *   · `disabled` → mở      (Udin)
   *   · không có mặt → có mặt (ChatGPT)
   * Ai đã bấm được từ trước lượt gõ thì KHÔNG phải nó — nếu không, nút "đăng nhập" nào cũng
   * thành ứng viên. */
  let doi = [];
  for (let i = 0; i < 12 && doi.length === 0; i++) {
    const nutSau = await chupNut();
    doi = [...nutSau].filter(([k, v]) => v === false && nutTruoc.get(k) !== false && nutTruoc.get(k) !== "nhieu").map(([k]) => k);
    if (doi.length === 0) await nghi(300);
  }
  if (doi.length !== 1) {
    throw new Error(
      doi.length === 0
        ? `Gõ xong mà không nút nào đổi sang bấm được (trang có ${nutTruoc.size} nút mang móc) — chữ không tới được trang, hoặc trang này không khoá/hiện nút theo ô nhập. Chưa bấm gì.`
        : `Gõ xong thì ${doi.length} nút cùng đổi sang bấm được (${doi.slice(0, 5).join(" · ")}) — thí nghiệm không chỉ ra được MỘT nút. Luật gói số 7 không cho bấm khi chưa chắc. Chưa bấm gì.`,
    );
  }
  const nut = doi[0];
  /* Chữ ký dựng từ thuộc tính; hỏi lại trang xem nó có thật khớp ĐÚNG MỘT không — không thì
   * đừng bấm. Đây là luật gói số 7, và nó không được suy ra, phải đo. */
  { const d = await dem(nut);
    if (d.matchCount !== 1) throw new Error(`Nút '${nut}' khớp ${d.matchCount} phần tử, không phải 1 — không bấm.`); }

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
        nutCoMocTruoc: nutTruoc.size,
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
