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
  const chuKy = (items, { loc, duyNhatTruoc = false } = {}) => {
    const dem = new Map();
    for (const it of items) {
      if (loc && !loc(it)) continue;
      const lop = String(it.attributes?.class || "").split(/\s+/).filter(Boolean);
      const ten = it.nodeName + (lop.length ? "." + lop.join(".") : "");
      dem.set(ten, (dem.get(ten) || 0) + 1);
    }
    /* Hai câu ĐÍCH THAO TÁC xếp *khớp đúng một* lên trước; câu KẾT QUẢ xếp theo số đông.
     * Không phải hai quy tắc tuỳ hứng mà là một quy tắc của repo nhìn từ hai phía: luật gói
     * số 7 — mọi lượt bấm phải khớp đúng một — nên với đích thao tác, chữ ký khớp 1 là chữ ký
     * DÙNG ĐƯỢC còn chữ ký khớp 21 là chữ ký vô dụng; với vùng kết quả thì ngược lại, nhiều
     * mới đúng. Đo 14/09: xếp thuần theo số đông chôn `BUTTON.agent-send-button` (1) xuống
     * dưới `BUTTON.message-copy-btn` (21) — báo cáo có câu trả lời mà giấu nó đi. */
    const hang = duyNhatTruoc ? (x) => (x[1] === 1 ? 0 : 1) : () => 0;
    return [...dem]
      .sort((a, b) => hang(a) - hang(b) || b[1] - a[1])
      .map(([selector, khop]) => ({ selector, khop }));
  };
  const nhapDuoc = new Set(["TEXTAREA", "INPUT"]);
  const baCau = {
    go_o_dau: chuKy(trang.data.elements.items, {
      loc: (it) => nhapDuoc.has(it.nodeName) || it.attributes?.contenteditable === "true",
      duyNhatTruoc: true,
    }),
    bam_o_dau: chuKy(trang.data.elements.items, {
      loc: (it) => it.nodeName === "BUTTON" || it.nodeName === "A",
      duyNhatTruoc: true,
    }),
    ket_qua_o_dau: chuKy(noiDung.data.items),
  };
  for (const [cau, ds] of Object.entries(baCau)) {
    console.log(`${cau}: ${ds.length === 0 ? "KHÔNG CÓ ỨNG VIÊN NÀO" : ds.slice(0, 3).map((x) => `${x.selector} (${x.khop})`).join(" · ")}`);
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
