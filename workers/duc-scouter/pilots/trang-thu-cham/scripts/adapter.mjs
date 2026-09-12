/* CHẶNG 3 của T7 — ADAPTER cho trang thử chậm.
 *
 * Mọi selector dưới đây LẤY TỪ BÁO CÁO của chặng 2, không cái nào gõ từ trí nhớ:
 *   #o-nhap   — scout.page → elements.items[0].attributes.id (INPUT)
 *   #nut-gui  — scout.page → elements.items[1].attributes.id (BUTTON)
 *   #ket-qua  — scout.tree → nút DIV ẩn; scout.page KHÔNG thấy (không tương tác)
 *               và scout.a11y cũng KHÔNG thấy lúc nó còn ẩn.
 *
 * Đây là HIỂU BIẾT VỀ MỘT TRANG, nên nó ở `pilots/`. Không một dòng nào của file
 * này được phép trôi lên seed — luật gói số 1.
 */
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

import { goi as goiThat, timTab as timTabThat } from "./goi-bridge.mjs";

const URL_TRANG = process.env.TRANG_THU || "http://127.0.0.1:8642/";

export const SELECTOR = Object.freeze({
  oNhap: "#o-nhap",
  nut: "#nut-gui",
  ketQua: "#ket-qua",
});

/* Câu trả lời của trang này bắt đầu bằng đúng chuỗi này. Adapter phải biết nó để
 * nhặt đúng dòng ra khỏi cây trợ năng — seed không có phép "đọc chữ của MỘT phần
 * tử", nên đường duy nhất là đọc cây rồi lọc. Ghi lại ở TRIALS: đó là một khuyết
 * thật của seed, không phải chuyện riêng của trang này. */
const TIEN_TO = "Đã vọng lại: ";

/* `goi` và `timTab` đi vào bằng tham số chứ không gọi thẳng, để phép ghim chạy
 * được KHÔNG cần trình duyệt. Một adapter chỉ kiểm được khi có Chrome thật là một
 * adapter không ai kiểm. */
async function dungMot(goi, tab, selector, tuyChon) {
  const ket = await goi("scout.query", { target_id: tab, selector }, tuyChon);
  const dem = ket.data.matchCount ?? ket.data.total ?? ket.data.count;
  if (dem !== 1) {
    throw new Error(`Selector ${selector} khớp ${dem} phần tử, cần đúng 1. Trang đã đổi → dò lại chặng 2.`);
  }
  return ket.data;
}

export async function chay(cau, tuyChon = {}) {
  const goi = tuyChon.goi || goiThat;
  const timTab = tuyChon.timTab || timTabThat;
  const batDau = Date.now();
  const tab = await timTab(URL_TRANG, tuyChon);

  /* Soát TRƯỚC khi chạm vào trang. Một selector khớp 0 hoặc 2 nghĩa là trang đã
   * đổi, và lúc đó dừng lại rẻ hơn gõ nhầm chỗ. */
  for (const selector of Object.values(SELECTOR)) await dungMot(goi, tab, selector, tuyChon);

  /* `usable`, không phải `present` (T2). `present` chỉ chứng minh cái nút nằm
   * trong DOM — nó vẫn trả lời "có" khi một tấm chắn phủ kín trang. */
  const san = await goi(
    "scout.wait",
    { target_id: tab, selector: SELECTOR.nut, state: "usable", timeout_ms: 5000 },
    tuyChon,
  );
  if (!san.data.satisfied) {
    throw new Error(`Nút chưa bấm được: ${san.data.usableBlockedBy || "hết giờ"}`);
  }

  await goi("scout.type", { target_id: tab, selector: SELECTOR.oNhap, text: cau }, tuyChon);

  const bam = await goi("scout.click", { target_id: tab, selector: SELECTOR.nut }, tuyChon);
  /* Nút này là `<button><span>▶</span><span>Gửi</span></button>` nên điểm giữa rơi
   * vào một `span`. `hit: "descendant"` là ĐÚNG, không phải hụt. */
  const trungVao = bam.data.hit;

  /* Dấu đặt NGAY trong tay nghe lượt bấm, không qua bộ đếm giờ. Nó tách được hai
   * ca mà `scout.click` một mình KHÔNG tách được: "lượt bấm không tới nơi" và
   * "tới nơi rồi nhưng trang chưa trả lời". Đo 12/09: `scout.click` báo
   * `hit: descendant` trong khi tay nghe KHÔNG hề chạy — xem `S-22`. */
  const dau = await goi(
    "scout.query",
    { target_id: tab, selector: `${SELECTOR.ketQua}[data-bam]` },
    tuyChon,
  );
  if (dau.data.matchCount !== 1) {
    throw new Error(
      "LUOT_BAM_KHONG_TOI_NOI: scout.click báo trúng " +
        `(${JSON.stringify(trungVao)}) nhưng tay nghe lượt bấm của trang không chạy. ` +
        "Xem S-22 — cửa sổ Chrome của ghế này có đang hiện không?",
    );
  }

  /* Kết quả hiện ra sau một khoảng trễ — đây là chỗ bắt buộc phải chờ.
   * `:not([hidden])` để lượt chờ hỏi "đã hiện chưa", không phải "có tồn tại không":
   * ô kết quả nằm sẵn trong DOM từ lúc tải, nên chờ nó "có mặt" là thoả ngay tức khắc. */
  const hien = await goi(
    "scout.wait",
    { target_id: tab, selector: `${SELECTOR.ketQua}:not([hidden])`, state: "present", timeout_ms: 8000 },
    tuyChon,
  );
  if (!hien.data.satisfied) throw new Error("Chờ 8s mà kết quả không hiện.");

  const a11y = await goi("scout.a11y", { target_id: tab, limit: 300 }, tuyChon);
  const dong = a11y.data.nodes.find((n) => typeof n.name === "string" && n.name.startsWith(TIEN_TO));
  if (!dong) throw new Error(`Kết quả đã hiện nhưng không đọc được chữ trong cây trợ năng.`);

  return {
    cau,
    vong: dong.name.slice(TIEN_TO.length),
    trungVao,
    choMs: hien.data.ms ?? null,
    tongMs: Date.now() - batDau,
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const cau = process.argv[2] || "xin chao scouter";
  chay(cau)
    .then((k) => console.log(JSON.stringify(k, null, 2)))
    .catch((loi) => {
      console.error(String(loi.message || loi));
      process.exitCode = 1;
    });
}
