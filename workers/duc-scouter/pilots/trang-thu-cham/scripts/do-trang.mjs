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
const THU_MUC = "trang-thu-cham";

async function main() {
  const capabilities = await goi("host.capabilities");
  console.log(`vùng ghi: ${capabilities.write_root}`);

  /* Điều hướng trước, hỏi targetId SAU. targetId đổi sau một lượt đi khác nguồn,
   * nên hỏi trước là cầm một số đã chết. */
  const tabCu = await timTabBatKy();
  const di = await goi("scout.navigate", { target_id: tabCu, url: URL_TRANG, timeout_ms: 15000 });
  console.log(`tới nơi: ${di.data.ms}ms · ${di.data.arrivedBy}${di.data.reloaded ? " (nạp lại)" : ""}`);

  const tab = await timTab(URL_TRANG);
  const trang = await goi("scout.page", { target_id: tab, limit: 50 });
  const a11y = await goi("scout.a11y", { target_id: tab, limit: 300 });
  /* `scout.tree` KHÔNG thừa bên cạnh hai phép trên, và đây là chỗ đo được vì sao:
   * ô kết quả của trang này là một `div hidden`. Nó KHÔNG phải phần tử tương tác
   * nên `scout.page` bỏ qua, và lúc còn ẩn nó KHÔNG có trong cây trợ năng nên
   * `scout.a11y` cũng không thấy. Chỉ dò bằng hai phép đó thì adapter điều khiển
   * được ô nhập và cái nút mà không biết câu trả lời rơi vào đâu. */
  const cay = await goi("scout.tree", { target_id: tab, depth: 10, max_nodes: 200 });

  const baoCao = {
    do_luc: new Date().toISOString(),
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
async function timTabBatKy() {
  const ket = await goi("scout.targets");
  const trang = ket.data.targets.filter((t) => t.type === "page" && /^https?:/.test(t.url));
  if (trang.length === 0) throw new Error("Ghế này không có tab http(s) nào để mượn.");
  const dungSan = trang.find((t) => t.url.startsWith(URL_TRANG));
  return (dungSan || trang[0]).targetId;
}

main().catch((loi) => {
  console.error(String(loi.message || loi));
  process.exitCode = 1;
});
