#!/usr/bin/env node
/* mutation-check.mjs — ĐỘT BIẾN KIỂM cho gói `hnx-fetch`.
 *
 * Câu hỏi mà tệp này trả lời: *`be-mat-hep-smoke.mjs` có thật sự bắt được gì không?*
 * Một phép ghim chưa qua đột biến kiểm là một phép ghim **chưa biết có răng**. Cách duy nhất
 * biết được: cố tình làm hỏng đúng cái chốt nó canh, rồi xem nó có đỏ lên không. Con nào
 * **sống sót** nghĩa là chốt đó đang không ai canh.
 *
 * Bộ máy (kèm khoá chống chạy song song và nhật ký hồi phục trên đĩa) ở `mutation-runner.mjs`,
 * chép từ Scouter. Tệp này chỉ có DANH SÁCH CON.
 *
 * Mỏ neo viết MỘT DÒNG bất cứ khi nào được — mỏ neo nhiều dòng đã im lặng khớp 0 chỗ trên tệp
 * CRLF một lần rồi. Và **mỏ neo khớp 0 lần thì bộ đo báo ĐỎ, không báo BỎ QUA**: một lượt bỏ
 * qua đọc y hệt một lượt đạt, mà đó đúng là cách ba chốt của Scouter nằm không ai canh suốt
 * một ngày (`D9` · `H2` · `F6`, phát hiện 08/09).
 *
 * Chạy: node v0.1.0/scripts/mutation-check.mjs
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { chayDotBien } from "./mutation-runner.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PIN = path.join(ROOT, "tests", "be-mat-hep-smoke.mjs");

const BATCHES = [
  {
    /* Lời hứa lớn nhất của gói: nó KHÔNG bấm được. Ba con dưới đây là ba cách lời hứa đó chết
     * trong im lặng — và cả ba đều là những thay đổi trông vô hại trong một lượt diff vội. */
    ten: "BỀ MẶT — từ vựng đóng ở bốn lệnh",
    target: path.join(ROOT, "scripts", "bridge-core.mjs"),
    pin: PIN,
    mutants: [
      {
        ma: "N1",
        ten: "Nối lại một lệnh BẤM vào từ vựng — gói mất lời hứa lớn nhất của nó",
        tim: '    name: "scout.fetch", read_only: false, deadline_ms: 60000,',
        thay: '    name: "scout.click", read_only: false, deadline_ms: 60000,',
        soLan: 1
      },
      {
        ma: "N2",
        ten: "Nói dối cờ read_only: lệnh gọi mạng tự khai là chỉ đọc, nên nó thoát cái phanh",
        tim: '    name: "scout.fetch", read_only: false, deadline_ms: 60000,',
        thay: '    name: "scout.fetch", read_only: true, deadline_ms: 60000,',
        soLan: 1
      },
      {
        ma: "N3",
        ten: "Dùng chung tên giao thức với Scouter — hai extension nói cùng một thứ tiếng trên một máy chủ",
        tim: 'export const PROTOCOL = "hnx-fetch.bridge";',
        thay: 'export const PROTOCOL = "duc-scouter.bridge";',
        soLan: 1
      },
      {
        ma: "N4",
        ten: "Gỡ chốt từ vựng: chấp nhận mọi tên method từ ngoài dây",
        tim: "  if (!Object.hasOwn(METHOD_REGISTRY, method)) {",
        thay: "  if (false && !Object.hasOwn(METHOD_REGISTRY, method)) {",
        soLan: 1
      }
    ]
  },
  {
    /* Cái phanh. Đây là thứ duy nhất đứng giữa một AI và một lượt gọi mạng không giới hạn từ
     * trình duyệt của Đức, nên nó phải chịu được nhiều con nhất. */
    ten: "PHANH — công tắc, trần, và thứ tự trừ ngân sách",
    target: path.join(ROOT, "scripts", "fetch-core.mjs"),
    pin: PIN,
    mutants: [
      {
        ma: "N5",
        ten: "Bỏ trần: hết ngân sách vẫn gọi tiếp",
        tim: "    if (gate.used >= WRITE_CAP_PER_UNLOCK) {",
        thay: "    if (false && gate.used >= WRITE_CAP_PER_UNLOCK) {",
        soLan: 1
      },
      {
        ma: "N6",
        ten: "Nới trần thành vô hạn — trần còn đó nhưng không còn chặn gì",
        tim: "const WRITE_CAP_PER_UNLOCK = 200;",
        thay: "const WRITE_CAP_PER_UNLOCK = 100000;",
        soLan: 1
      },
      {
        ma: "N7",
        ten: "Trần đọc từ chính bản ghi trong kho lưu — kẻ bị chặn tự đặt trần cho mình",
        tim: "    if (gate.used >= WRITE_CAP_PER_UNLOCK) {",
        thay: "    if (gate.used >= (gate.cap_per_unlock || WRITE_CAP_PER_UNLOCK)) {",
        soLan: 1
      },
      {
        ma: "N8",
        ten: "HỎNG THÌ MỞ: kho lưu hỏng thì coi như công tắc ĐANG BẬT, thay vì coi như đang tắt",
        tim: "      stored = await chromeApi.storage.local.get([WRITE_GATE_STORAGE_KEY]);",
        thay: "      try { stored = await chromeApi.storage.local.get([WRITE_GATE_STORAGE_KEY]); } catch { stored = { [WRITE_GATE_STORAGE_KEY]: { enabled: true, enabled_at: 1, used: 0 } }; }",
        soLan: 1
      },
      {
        ma: "N9",
        ten: "GỌI TRƯỚC, TRỪ SAU — một vòng lặp gọi hỏng quay mãi mà trần không bao giờ chạm",
        tim: "      const budget = await spendWriteBudget();",
        thay: "      const budget = { used: 0, cap_per_unlock: WRITE_CAP_PER_UNLOCK, remaining: WRITE_CAP_PER_UNLOCK };",
        soLan: 1
      },
      {
        ma: "N10",
        ten: "Bật công tắc KHÔNG đặt lại bộ đếm — ngân sách không bao giờ được nạp lại đúng chỗ",
        tim: "    ? { enabled: true, enabled_at: at, used: 0 }",
        thay: "    ? { enabled: true, enabled_at: at, used: WRITE_CAP_PER_UNLOCK }",
        soLan: 1
      }
    ]
  },
  {
    /* Manifest. Không phải mã, nhưng nó là chỗ lời hứa "không có debugger" thật sự sống. */
    ten: "MANIFEST — quyền là TRẦN, không phải sàn",
    target: path.join(ROOT, "manifest.json"),
    pin: PIN,
    mutants: [
      {
        ma: "N11",
        ten: "Khai lại quyền debugger — Chrome dựng dải băng, và extension bấm được",
        tim: '  "permissions": ["storage", "alarms", "sidePanel"],',
        thay: '  "permissions": ["storage", "alarms", "sidePanel", "debugger"],',
        soLan: 1
      },
      {
        ma: "N12",
        ten: "Mở vùng đích ra mọi trang — một lượt gọi lạc chạm được trang sau đăng nhập của Đức",
        tim: '  "host_permissions": ["https://hnx.vn/*", "https://*.hnx.vn/*", "http://127.0.0.1/*"],',
        thay: '  "host_permissions": ["<all_urls>", "http://127.0.0.1/*"],',
        soLan: 1
      }
    ]
  },
  {
    /* Tệp chép nguyên văn. Con này canh CHÍNH PHÉP GHIM chống trôi — nếu nó sống sót thì phép
     * ghim đó là đồ trang trí, và hai bản sẽ trôi xa nhau đúng như ba gói `duc-auto-*`. */
    ten: "CHỐNG TRÔI — bản chép phải còn khớp bản gốc",
    target: path.join(ROOT, "scripts", "transport.mjs"),
    pin: PIN,
    mutants: [
      {
        ma: "N13",
        ten: "Sửa một dòng của bản chép — bản chép trôi khỏi bản gốc mà không ai khai",
        tim: "const RECONNECT_CEILING_MS = 5000;",
        thay: "const RECONNECT_CEILING_MS = 5001;",
        soLan: 1
      }
    ]
  }
];

chayDotBien(BATCHES, ROOT);
