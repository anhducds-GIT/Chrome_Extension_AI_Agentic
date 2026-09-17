/* Gọi Bridge từ dòng lệnh — DÙNG CHUNG cho mọi gói, không riêng gói nào.
 *
 * Tệp ghép cặp chứa TOKEN nên nó nằm NGOÀI repo (repo này PUBLIC). Ở đây chỉ có
 * ĐƯỜNG DẪN tới nó. Không bao giờ in token ra màn hình, kể cả lúc lỗi.
 *
 * Phong bì phải đủ SÁU trường hoặc extension trả INVALID_ENVELOPE: máy chủ chỉ
 * soát ba trường đầu, ba trường sau do extension soát — nên một lượt gọi lọt cửa
 * máy chủ vẫn bật ở cửa extension.
 *
 * ─── VÌ SAO LÀ MỘT CÁI XƯỞNG CHỨ KHÔNG PHẢI HAI HÀM ────────────────────────
 * Bản trước sống ở `duc-scouter/pilots/trang-thu-cham/scripts/` và **gõ cứng bốn thứ riêng của
 * Scouter**: tên giao thức · đường tệp ghép cặp · hai tên biến môi trường. Udin Optic sắp dọn
 * sang gói riêng với giao thức `udin-optic.bridge` và tệp ghép cặp riêng — chép y nguyên bản cũ
 * sang đó thì **Udin tự khai sai tên mình trên dây**, và máy chủ từ chối mọi phong bì.
 *
 * Đó KHÔNG phải một cái bẫy mới: `G9` bắt đúng nó ở `transport.mjs` ngày 12/09, khi một hằng số
 * `"duc-scouter"` đi theo bản chép sang `hnx-fetch`. Cùng một luật, khác tầng — **tên gói là
 * hiểu biết riêng của một chỗ, nên nó vào THAM SỐ, không vào lớp dùng chung.**
 *
 * Mỗi gói dựng một cái vỏ năm dòng khai danh tính của mình rồi `export` lại. Nhờ vậy 10 chỗ gọi
 * bên Scouter không phải sửa một ký tự nào.
 */
import { readFileSync } from "node:fs";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
import { duongGhepCapChuan } from "../bridge-host/tao-tep-ghep-cap.mjs";

/** @param {{goi:string, ghepEnv?:string, gheEnv?:string, clientId?:string}} khai */
export function taoGoiBridge(khai) {
  const tenGoi = khai?.goi;
  /* Không đoán tên gói. Khai sai tên còn tệ hơn không khai — cùng lý lẽ với `WORKER_ID` ở
   * `transport.mjs`: `bridge.sessions` là chỗ người ta nhìn để phân biệt các ghế. */
  if (typeof tenGoi !== "string" || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(tenGoi)) {
    throw new Error("taoGoiBridge: thiếu `goi` — tên gói, dạng chữ thường và gạch nối.");
  }
  const giaoThuc = `${tenGoi}.bridge`;
  const ghepEnv = khai.ghepEnv || null;
  const gheEnv = khai.gheEnv || null;
  const clientId = khai.clientId || `pilot-${tenGoi}`;

  /* Đường tệp ghép cặp đọc từ `.repo-structure.json` qua `duongGhepCapChuan`, KHÔNG gõ cứng.
   * Bản cũ gõ cứng đúng chuỗi đó — tức là bản đồ thư mục có hai bản, và chính `.repo-structure
   * .json` đã dặn *"khong duoc go cung o hai noi"*. */
  const duongGhepCap = () => (ghepEnv && process.env[ghepEnv]) || duongGhepCapChuan(tenGoi);

  const docGhepCap = (duong = duongGhepCap()) => {
    try {
      return JSON.parse(readFileSync(duong, "utf8"));
    } catch (loi) {
      throw new Error(
        `Không đọc được tệp ghép cặp ở ${duong}. Bridge đã chạy chưa? (${loi.code || loi.message})`,
      );
    }
  };

  const goi = async (method, params = {}, tuyChon = {}) => {
    const cap = tuyChon.capDat || docGhepCap();
    const ghe = tuyChon.ghe ?? (gheEnv ? process.env[gheEnv] : null) ?? null;

    const than = {
      protocol: giaoThuc,
      version: 1,
      kind: "request",
      request_id: randomUUID(),
      sent_at: new Date().toISOString(),
      client: { client_id: tuyChon.clientId || clientId },
      method,
      params,
    };
    if (ghe) than.target = ghe;

    /* `fetch` hỏng ở tầng mạng thì Node ném đúng hai chữ **"fetch failed"** — và hai chữ ấy
     * không nói được thứ duy nhất người đọc cần biết: *máy chủ có đang nghe không*. Đó là khác
     * biệt giữa "bật máy chủ lên" và "máy chủ đang chạy nhưng vừa chết giữa lượt gọi", hai việc
     * phải làm khác hẳn nhau. Ngày 17/09 máy chủ chết ba lần trong một phiên và mỗi lần lại tốn
     * một lượt đoán, vì câu báo giống hệt nhau.
     *
     * Không cần dụng cụ mới: câu trả lời NẰM SẴN trong `err.cause.code`, chỉ là bản cũ vứt nó
     * đi. Đo 17/09 trên chính máy này: cổng trống → `ECONNREFUSED`, kèm `connect ECONNREFUSED
     * 127.0.0.1:<cổng>`. Một lượt dò cổng riêng sẽ là phép đo THỨ HAI cho một câu hỏi đã có đáp
     * án — và nó còn đo ở một thời điểm khác lượt gọi thật, nên có thể nói khác. */
    let res;
    try {
      res = await fetch(`http://127.0.0.1:${cap.port}/v1/rpc`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${cap.token}` },
        body: JSON.stringify(than),
      });
    } catch (loi) {
      const ma = loi?.cause?.code || "KHONG_RO";
      if (ma === "ECONNREFUSED") {
        throw new Error(
          `KHÔNG CÓ AI NGHE ở 127.0.0.1:${cap.port} — máy chủ Bridge của '${tenGoi}' chưa chạy ` +
            `(hoặc đã chết). Bật lại bằng START-BRIDGE trong ${dirname(duongGhepCap())}, ` +
            `rồi chạy lại lệnh này. (${ma})`,
        );
      }
      throw new Error(
        `CÓ NGƯỜI NGHE ở 127.0.0.1:${cap.port} nhưng lượt gọi '${method}' đứt giữa chừng (${ma}). ` +
          "Máy chủ chết giữa lượt, hoặc treo — khác hẳn ca chưa bật: bật lại một máy chủ đang " +
          "chạy sẽ KHÔNG chữa được. Xem *.BRIDGE.stderr.log cạnh tệp ghép cặp trước đã.",
      );
    }

    const chu = await res.text();
    let goiTin;
    try {
      goiTin = JSON.parse(chu);
    } catch {
      throw new Error(`Máy chủ trả thứ không phải JSON (HTTP ${res.status}): ${chu.slice(0, 200)}`);
    }
    if (!goiTin.ok) {
      const loi = goiTin.error || {};
      throw new Error(`${method} hỏng: ${loi.code || "KHONG_RO"} — ${loi.message || chu.slice(0, 200)}`);
    }
    return goiTin.result;
  };

  /* Tiện cho mọi chặng: lấy targetId của tab đang đứng ở một URL.
   * PHẢI hỏi lại sau mỗi lượt điều hướng khác nguồn — targetId đổi, dùng lại số cũ
   * là đo nhầm tab. */
  const timTab = async (urlBatDau, tuyChon = {}) => {
    const ket = await goi("scout.targets", {}, tuyChon);
    const trang = ket.data.targets.filter((t) => t.type === "page");
    const trung = trang.filter((t) => t.url.startsWith(urlBatDau));
    if (trung.length !== 1) {
      throw new Error(
        `Cần đúng MỘT tab đang ở ${urlBatDau}, thấy ${trung.length}. ` +
          `Đang mở: ${trang.map((t) => t.url.slice(0, 60)).join(" · ")}`,
      );
    }
    return trung[0].targetId;
  };

  return { goi, timTab, docGhepCap, giaoThuc };
}
