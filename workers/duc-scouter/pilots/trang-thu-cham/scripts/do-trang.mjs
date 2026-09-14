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

  /* Khai thẳng lượt dò có bị cắt không. Người đọc báo cáo (kể cả AI ở chặng ③) phải biết mình
   * đang cầm một bản đầy đủ hay một bản cụt — `hasMore` là thứ trang nói thật, đừng nuốt nó. */
  const biCat = {
    trang: trang.data.hasMore === true,
    a11y: a11y.data.hasMore === true,
    cay: cay.data.truncated === true || cay.data.hasMore === true,
  };
  if (biCat.trang || biCat.a11y || biCat.cay) {
    console.log(`CẢNH BÁO — báo cáo BỊ CẮT: ${Object.entries(biCat).filter(([, v]) => v).map(([k]) => k).join(" ")}. Nâng trần rồi dò lại.`);
  }

  const baoCao = {
    do_luc: new Date().toISOString(),
    bi_cat: biCat,
    url: URL_TRANG,
    target_id: tab,
    trang: trang.data,
    a11y: a11y.data,
    cay: cay.data,
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
