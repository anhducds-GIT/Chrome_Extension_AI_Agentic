/* CHẶNG 4 của T7 — nạp lại trang rồi cho adapter chạy, rồi SO với thứ đã biết.
 *
 *   SCOUTER_GHE=<instance_id> node .../scripts/vong.mjs
 *
 * Nạp lại trước khi chạy là cố ý: adapter phải chạy được từ một trang SẠCH, không
 * dựa vào thứ lượt trước để lại. `scout.navigate` tới đúng URL đang đứng chỉ nạp
 * lại được từ 12/09 (T3) — trước đó nó treo 15 giây rồi báo sai nguyên nhân.
 */
import { goi, timTab } from "./goi-bridge.mjs";
import { chay } from "./adapter.mjs";

const URL_TRANG = process.env.TRANG_THU || "http://127.0.0.1:8642/";
const CAU = process.argv[2] || "vong khep mot lan";
/* Tab MƯỢN thì phải TRẢ. Đặt `TRA_VE=<url http(s) cũ>` thì dù vòng đạt hay hỏng,
 * tab cũng được đưa về đó ở cuối. Không đặt thì để nguyên ở trang thử. */
const TRA_VE = process.env.TRA_VE || null;

async function main() {
  const tabCu = await timTab(URL_TRANG);
  const lai = await goi("scout.navigate", { target_id: tabCu, url: URL_TRANG, timeout_ms: 15000 });
  console.log(`① nạp lại: ${lai.data.ms}ms · ${lai.data.arrivedBy} · reloaded=${lai.data.reloaded}`);

  const ket = await chay(CAU);
  console.log(`② adapter: bấm trúng ${JSON.stringify(ket.trungVao)} · ${ket.tongMs}ms`);
  console.log(`③ trang vọng lại: ${JSON.stringify(ket.vong)}`);

  /* Thứ "làm tay": trang này vọng lại ĐÚNG câu đã gõ. Sai một ký tự cũng là sai —
   * đừng so kiểu "có chứa". */
  const dung = ket.vong === CAU;
  console.log(`④ so với thứ làm tay: ${dung ? "KHỚP" : "LỆCH"} (chờ ${JSON.stringify(CAU)})`);
  if (!dung) process.exitCode = 1;
}

async function traTab() {
  if (!TRA_VE) return;
  try {
    const tab = await timTab(URL_TRANG);
    const ve = await goi("scout.navigate", { target_id: tab, url: TRA_VE, timeout_ms: 20000 });
    console.log(`⑤ đã trả tab về ${ve.data.url}`);
  } catch (loi) {
    console.error(`⑤ KHÔNG trả được tab về ${TRA_VE}: ${loi.message || loi}`);
    process.exitCode = 1;
  }
}

main()
  .catch((loi) => {
    console.error(String(loi.message || loi));
    process.exitCode = 1;
  })
  .finally(traTab);
