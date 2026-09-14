/* CHẶNG 2 của T7 — Scouter dò trang thử và GHI BÁO CÁO XUỐNG ĐĨA.
 *
 * Chạy:
 *   node workers/duc-scouter/pilots/trang-thu-cham/phuc-vu.mjs        (cửa sổ khác)
 *   SCOUTER_GHE=<instance_id> node .../scripts/do-trang.mjs
 *
 * Báo cáo KHÔNG vào repo: nó đi qua `file.write` xuống vùng ghi của máy chủ
 * (`host.capabilities` → `write_root`). Repo giữ mã; đĩa giữ thứ đo được.
 *
 * Vì sao dò rồi mới viết adapter, chứ không viết thẳng: luật vàng số 1 của repo
 * cấm đoán selector. Adapter chỉ được dựng trên thứ có trong báo cáo này.
 */
import { goi, timTab } from "./goi-bridge.mjs";

const URL_TRANG = process.env.TRANG_THU || "http://127.0.0.1:8642/";
/* Thư mục báo cáo đi theo trang, không gõ cứng: chặng ② của `T7` phải chạy được trên trang KHÁC
 * mà không sửa một dòng nào — đó chính là câu "năng lực chung" mà cả gói đang chứng minh. */
const THU_MUC = process.env.THU_MUC || "trang-thu-cham";
/* Trần của lượt dò — THAM SỐ, không gõ cứng. Đo 14/09: bộ trần cũ (50 · 10 · 200) chỉnh cho một
 * trang thử ~40 phần tử, và trên Udin (538 phần tử) nó cắt mất **ô prompt, ảnh kết quả và khối
 * chữ agent** — tức là báo cáo TRÔNG như đã dò xong mà adapter dựng từ nó sẽ mù ba thứ quan
 * trọng nhất. Một báo cáo bị cắt im lặng còn tệ hơn một lượt dò đỏ. */
const TRAN_TRANG = Number(process.env.TRAN_TRANG || 200);   // trần CỨNG của seed: 1..200
const TRAN_A11Y = Number(process.env.TRAN_A11Y || 500);
const SAU_CAY = Number(process.env.SAU_CAY || 10);          // trần CỨNG của seed: 1..10
const TRAN_CAY = Number(process.env.TRAN_CAY || 500);        // trần CỨNG của seed: 1..500

async function main() {
  const capabilities = await goi("host.capabilities");
  console.log(`vùng ghi: ${capabilities.write_root}`);

  /* Điều hướng trước, hỏi targetId SAU. targetId đổi sau một lượt đi khác nguồn,
   * nên hỏi trước là cầm một số đã chết. */
  const tabCu = await timTabBatKy(true);
  if (tabCu) {
    /* ĐÃ có tab đứng sẵn ở đúng trang → KHÔNG điều hướng. `scout.navigate` tới đúng URL đang đứng
     * là một lượt NẠP LẠI (T3), và trên một trang có phiên làm việc thật thì nạp lại là xoá mất
     * thứ ta định dò. Chặng ② chỉ ĐỌC; nó không có lý do gì để đụng vào trạng thái trang. */
    console.log(`dùng tab đã đứng sẵn ở ${URL_TRANG} — không điều hướng`);
  } else {
    const di = await goi("scout.navigate", { target_id: await timTabBatKy(false), url: URL_TRANG, timeout_ms: 15000 });
    console.log(`tới nơi: ${di.data.ms}ms · ${di.data.arrivedBy}${di.data.reloaded ? " (nạp lại)" : ""}`);
  }

  const tab = await timTab(URL_TRANG);
  const trang = await goi("scout.page", { target_id: tab, limit: TRAN_TRANG });
  const a11y = await goi("scout.a11y", { target_id: tab, limit: TRAN_A11Y });
  /* `scout.tree` KHÔNG thừa bên cạnh hai phép trên, và đây là chỗ đo được vì sao:
   * ô kết quả của trang này là một `div hidden`. Nó KHÔNG phải phần tử tương tác
   * nên `scout.page` bỏ qua, và lúc còn ẩn nó KHÔNG có trong cây trợ năng nên
   * `scout.a11y` cũng không thấy. Chỉ dò bằng hai phép đó thì adapter điều khiển
   * được ô nhập và cái nút mà không biết câu trả lời rơi vào đâu. */
  const cay = await goi("scout.tree", { target_id: tab, depth: SAU_CAY, max_nodes: TRAN_CAY });

  /* PHÉP DÒ THỨ TƯ, thêm 14/09 — và nó không cần một method mới nào.
   *
   * Ba phép trên cộng lại vẫn mù đúng thứ quan trọng nhất: **kết quả hiện ra ở đâu**.
   * `scout.page` chỉ kể phần tử TƯƠNG TÁC; `scout.a11y` trả vai trò và tên chứ không trả
   * class, nên đọc nó xong vẫn không dựng nổi một selector; `scout.tree` thì cụt ở mép độ sâu.
   * Đo 14/09 trên Udin: trang có 36 ảnh kết quả, báo cáo trả về 0 — mà vẫn tự khai đã dò xong.
   *
   * Lời đáp rẻ nhất đã nằm sẵn trong từ vựng: `scout.query` nhận selector bất kỳ. Danh sách
   * dưới đây là các thẻ NỘI DUNG của HTML, không một chữ nào riêng của trang nào — nên nó
   * không phạm luật gói số 1, và chặng ② vẫn chạy được trên trang khác không sửa dòng nào. */
  const CHON_NOI_DUNG =
    "img,video,canvas,figure,picture,pre,code,table,h1,h2,h3,p,li,[role='img'],[role='status'],[role='alert']";
  const noiDung = await goi("scout.query", { target_id: tab, selector: CHON_NOI_DUNG, limit: TRAN_TRANG });

  /* Khai thẳng lượt dò có bị cắt không. Người đọc báo cáo (kể cả AI ở chặng ③) phải biết mình
   * đang cầm một bản đầy đủ hay một bản cụt — `hasMore` là thứ trang nói thật, đừng nuốt nó. */
  const biCat = {
    trang: trang.data.hasMore === true,
    a11y: a11y.data.hasMore === true,
    /* `truncated` của `scout.tree` chỉ canh NGÂN SÁCH NÚT. Nhát cắt ở mép ĐỘ SÂU là một cửa
     * khác hẳn, và nó đúng là cửa đã lọt: 14/09 báo cáo Udin khai `truncated:false` trong khi
     * 42 nhánh cụt và 79 nút con rơi ra ngoài. Đọc thiếu con số này là đọc một cái xanh giả. */
    cay: cay.data.truncated === true || cay.data.hasMore === true || (cay.data.cutByDepth || 0) > 0,
    noi_dung: noiDung.data.hasMore === true,
  };
  if (Object.values(biCat).some(Boolean)) {
    console.log(`CẢNH BÁO — báo cáo BỊ CẮT: ${Object.entries(biCat).filter(([, v]) => v).map(([k]) => k).join(" ")}.`);
    if (biCat.cay && cay.data.truncated !== true) {
      console.log(`  cây cụt theo ĐỘ SÂU: ${cay.data.cutByDepth} nhánh, ${cay.data.childrenDropped} nút con rơi ra ngoài — nâng \`max_nodes\` KHÔNG chữa được, trần sâu của seed là ${SAU_CAY}.`);
    }
  }

  /* BA CÂU mà một adapter phải trả lời được trước khi viết được dòng đầu tiên. Báo cáo 220 KB
   * mà người đọc phải tự lọc thì trên thực tế là báo cáo chưa trả lời — nên gom chữ ký
   * `thẻ.class` kèm số đếm, đúng thứ ta vẫn phải làm bằng tay để nhìn ra câu trả lời.
   * KHÔNG chọn hộ: chọn hộ là đoán, mà đoán selector là luật vàng số 1 của repo. */
  /* MÓC MẠNH NHẤT TRƯỚC — đo 14/09 trên ChatGPT, và đây là chỗ bản đầu vứt câu trả lời đi.
   *
   * Bản đầu dựng chữ ký thuần `thẻ.class`. Trên Udin (class ít, có nghĩa) nó ra đúng. Trên
   * ChatGPT nó ra `a.interactive-bg-secondary.behavior-btn.…print\:hidden` — mười class tiện
   * ích, dài, giòn, và **sai**: nút gửi thật là `#composer-submit-button`, ô nhập thật là
   * `#prompt-textarea`. Cả hai cái `id` ấy **đã nằm sẵn trong thuộc tính báo cáo trả về** —
   * luật che là một danh sách CHO PHÉP 24 tên, và `id` · `data-testid` · `aria-label` đều ở
   * trong đó. Báo cáo không thiếu dữ liệu; nó thiếu một luật biết dùng dữ liệu ấy.
   *
   * Thứ tự: `#id` → `[data-testid]` → `thẻ.class`. Mỗi bậc do một trang THẬT đòi, không bậc
   * nào thêm phòng xa. `id` phải là định danh thường — loại `:r3:`, `radix-:R1:` mà React sinh
   * ra mỗi lượt vẽ: một selector khớp đúng một hôm nay mà chết sau lượt nạp lại thì tệ hơn là
   * không có. */
  const ID_BEN = /^[A-Za-z][\w-]*$/;
  const moc = (it) => {
    const a = it.attributes || {};
    if (typeof a.id === "string" && ID_BEN.test(a.id)) return "#" + a.id;
    const tid = a["data-testid"] ?? a["data-test-id"] ?? a["data-qa"];
    if (typeof tid === "string" && tid !== "") return `${it.nodeName}[data-testid=${JSON.stringify(tid)}]`;
    const lop = String(a.class || "").split(/\s+/).filter(Boolean);
    return it.nodeName + (lop.length ? "." + lop.join(".") : "");
  };
  /* HỎI CHUẨN TRƯỚC, HỎI HÌNH DẠNG CLASS SAU.
   *
   * Đo 14/09 trên ChatGPT: ba ứng viên "gõ ở đâu" đều khớp đúng một, nên xếp theo số khớp là
   * xếp bừa — và nó ra `#upload-files` đứng đầu, một ô `type="file"`. Nhưng trang đã tự khai
   * hết: `#upload-files` mang `type="file"` và `tabindex="-1"`, còn ô thật `#prompt-textarea`
   * mang `role="textbox"`. Nút gửi thì mang `type="submit"`.
   *
   * Đây KHÔNG phải hiểu biết về ChatGPT — đây là HTML và ARIA, thứ chính tác giả trang viết ra
   * để người khác đọc được trang. Luật cũ bỏ qua chúng để đi đếm class, tức là bỏ qua lời khai
   * để đi đoán vân tay. `G-88`. */
  const KHONG_GO_DUOC = new Set(["file", "checkbox", "radio", "range", "color", "submit", "reset", "button", "image", "hidden"]);
  const diemGo = (a) => (a.role === "textbox" ? 2 : 0) + (a.tabindex === "-1" ? -2 : 0) + (a.contenteditable === "true" ? 1 : 0);
  const diemBam = (a) => (a.type === "submit" ? 2 : 0) + (a.tabindex === "-1" ? -2 : 0);
  const chuKy = (items, { loc, diem, duyNhatTruoc = false } = {}) => {
    const dem = new Map();
    for (const it of items) {
      if (loc && !loc(it)) continue;
      const k = moc(it);
      const cu = dem.get(k);
      dem.set(k, { gom: (cu?.gom || 0) + 1, diem: Math.max(cu?.diem ?? -99, diem ? diem(it.attributes || {}) : 0) });
    }
    /* Hai câu ĐÍCH THAO TÁC xếp *khớp đúng một* lên trước; câu KẾT QUẢ xếp theo số đông.
     * Không phải hai quy tắc tuỳ hứng mà là một quy tắc của repo nhìn từ hai phía: luật gói
     * số 7 — mọi lượt bấm phải khớp đúng một — nên với đích thao tác, chữ ký khớp 1 là chữ ký
     * DÙNG ĐƯỢC còn chữ ký khớp 21 là chữ ký vô dụng; với vùng kết quả thì ngược lại, nhiều
     * mới đúng. Đo 14/09: xếp thuần theo số đông chôn `BUTTON.agent-send-button` (1) xuống
     * dưới `BUTTON.message-copy-btn` (21) — báo cáo có câu trả lời mà giấu nó đi. */
    return { dem, duyNhatTruoc };
  };
  /* `khop` phải ĐO, không được SUY — và đây là chỗ bản đầu 14/09 nói dối.
   * Chữ ký gom theo bộ class Y HỆT; CSS thì khớp theo TẬP CON. `BUTTON.create-mode-btn` gom
   * đúng 1 phần tử (cái còn lại có thêm class `active`) nhưng đọc như một selector thì khớp 2.
   * Cả báo cáo này đứng trên ba chữ *khớp đúng một*, nên một con số suy ra là một cái xanh giả
   * nữa — và chặng ④ đã bỏ đúng cái nút cần vì nó. Hỏi lại trang thì hết đoán: đọc không tốn gì.
   *
   * `nodeName` của CDP viết HOA; CSS phân biệt hoa-thường ở phần class nhưng không ở tên thẻ,
   * nên chỉ hạ đúng phần tên thẻ rồi phát ra selector DÙNG ĐƯỢC NGAY. */
  /* Tên class KHÔNG phải lúc nào cũng là một định danh CSS hợp lệ. Trên trang dùng CSS tiện ích
   * (Tailwind và họ hàng) chúng là `text-[13px]`, `md:w-1/2`, `@[45rem]/thread:px-6` — nối thẳng
   * sau dấu chấm là một selector Chrome từ chối, và lượt dò ChatGPT 14/09 chết đúng ở đó. Thoát
   * theo luật định danh CSS: mọi ký tự ngoài chữ-số-gạch-dưới-gạch-nối, và chữ số đứng đầu. */
  const thoat = (lop) =>
    lop.replace(/[^a-zA-Z0-9_ -￿-]/g, (c) => "\\" + c).replace(/^(-?)(\d)/, (_, g, d) => `${g}\\3${d} `);
  const raCss = (chuKy) => {
    /* `#id` đã là selector hợp lệ — hạ chữ nó là hỏng nó, vì CSS PHÂN BIỆT hoa thường ở `id`. */
    if (chuKy.startsWith("#")) return chuKy;
    const nganh = chuKy.indexOf("[");
    if (nganh > 0) return chuKy.slice(0, nganh).toLowerCase() + chuKy.slice(nganh);
    const i = chuKy.indexOf(".");
    if (i < 0) return chuKy.toLowerCase();
    return chuKy.slice(0, i).toLowerCase() + chuKy.slice(i + 1).split(".").map((c) => "." + thoat(c)).join("");
  };
  const doKhop = async ({ dem, duyNhatTruoc }) => {
    const ds = [];
    for (const [chuKy, { gom, diem }] of dem) {
      const selector = raCss(chuKy);
      /* MỘT chữ ký hỏng không được giết cả lượt dò. Báo cáo là thứ phiên sau đọc để hiểu trang;
       * mất cả báo cáo vì một selector lạ thì đắt hơn nhiều so với mất một dòng trong nó — và
       * dòng hỏng ấy vẫn phải HIỆN RA, vì im lặng bỏ nó đi là cái xanh giả thứ năm. */
      let khop = null, loi = null;
      try { khop = (await goi("scout.query", { target_id: tab, selector, limit: 1 })).data.matchCount; }
      catch (e) { loi = String(e.message).slice(0, 120); }
      ds.push({ selector, khop, gom, diem, ...(loi ? { loi } : {}) });
    }
    /* Đích thao tác xếp theo `khop` ĐO ĐƯỢC (khớp đúng một lên đầu — luật gói số 7).
     * Vùng kết quả xếp theo `gom`, tức cỡ NHÓM có bộ class y hệt, chứ KHÔNG theo `khop`: một
     * chữ ký không class là tập cha của mọi chữ ký có class cùng thẻ, nên `img` luôn khớp
     * nhiều hơn `img.batch-grid-image` và luôn thắng — một chiến thắng không mang tin gì.
     * Đo 14/09: `img` (39) đè `img.batch-grid-image` (32) đúng ở lượt dò này. */
    const hang = duyNhatTruoc ? (x) => (x.khop === 1 ? 0 : 1) : () => 0;
    return ds.sort((a, b) => hang(a) - hang(b) || b.diem - a.diem || (duyNhatTruoc ? (b.khop ?? -1) - (a.khop ?? -1) : b.gom - a.gom));
  };
  const nhapDuoc = new Set(["TEXTAREA", "INPUT"]);
  const baCau = {
    go_o_dau: await doKhop(chuKy(trang.data.elements.items, {
      loc: (it) => {
        const a = it.attributes || {};
        if (a.contenteditable === "true" || a.role === "textbox") return true;
        if (it.nodeName === "TEXTAREA") return true;
        /* `INPUT` không phải lúc nào cũng là chỗ gõ chữ: `type` nói rõ cái nào không. */
        return it.nodeName === "INPUT" && !KHONG_GO_DUOC.has(String(a.type || "text").toLowerCase());
      },
      diem: diemGo, duyNhatTruoc: true,
    })),
    bam_o_dau: await doKhop(chuKy(trang.data.elements.items, {
      loc: (it) => it.nodeName === "BUTTON" || it.nodeName === "A",
      diem: diemBam, duyNhatTruoc: true,
    })),
    ket_qua_o_dau: await doKhop(chuKy(noiDung.data.items)),
  };
  for (const [cau, ds] of Object.entries(baCau)) {
    const hong = ds.filter((x) => x.loi).length;
    console.log(`${cau}: ${ds.length === 0 ? "KHÔNG CÓ ỨNG VIÊN NÀO" : ds.slice(0, 3).map((x) => `${x.selector} (${x.khop ?? "?"})`).join(" · ")}`
      + (hong ? `   [${hong}/${ds.length} chữ ký Chrome từ chối làm selector]` : ""));
  }

  const baoCao = {
    do_luc: new Date().toISOString(),
    bi_cat: biCat,
    ba_cau: baCau,
    url: URL_TRANG,
    target_id: tab,
    trang: trang.data,
    a11y: a11y.data,
    cay: cay.data,
    noi_dung: noiDung.data,
  };
  const chu = JSON.stringify(baoCao, null, 2);

  const dau = new Date().toISOString().replace(/[:.]/g, "-");
  for (const ten of [`${THU_MUC}/bao-cao-${dau}.json`, `${THU_MUC}/bao-cao-moi-nhat.json`]) {
    const ghi = await goi("file.write", { path: ten, content: chu });
    console.log(`ghi ${ghi.path} — ${ghi.bytes} byte`);
  }
}

/* Tab nào cũng được miễn là http(s) và trả lại được. Ưu tiên tab đã đứng sẵn ở
 * trang thử (lượt chạy thứ hai trở đi), rồi mới tới tab khác. */
async function timTabBatKy(chiTabDungSan) {
  const ket = await goi("scout.targets");
  const trang = ket.data.targets.filter((t) => t.type === "page" && /^https?:/.test(t.url));
  const dungSan = trang.find((t) => t.url.startsWith(URL_TRANG));
  if (chiTabDungSan) return dungSan ? dungSan.targetId : null;
  if (trang.length === 0) throw new Error("Ghế này không có tab http(s) nào để mượn.");
  return trang[0].targetId;
}

main().catch((loi) => {
  console.error(String(loi.message || loi));
  process.exitCode = 1;
});
