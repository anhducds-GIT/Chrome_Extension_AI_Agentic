/* Gọi Bridge từ dòng lệnh — dùng chung cho mọi chặng của pilot này.
 *
 * Tệp ghép cặp chứa TOKEN nên nó nằm NGOÀI repo (repo này PUBLIC). Ở đây chỉ có
 * ĐƯỜNG DẪN tới nó, và đường dẫn đó đổi được bằng biến môi trường SCOUTER_GHEP.
 * Không bao giờ in token ra màn hình, kể cả lúc lỗi.
 *
 * Phong bì phải đủ SÁU trường hoặc extension trả INVALID_ENVELOPE: máy chủ chỉ
 * soát ba trường đầu, ba trường sau do extension soát — nên một lượt gọi lọt cửa
 * máy chủ vẫn bật ở cửa extension.
 */
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

const GHEP_MAC_DINH =
  "C:/WORKING ZONE/Chrome Extension Bridge/duc-scouter/duc-scouter-bridge-pairing-v1.json";

export function docGhepCap(duong = process.env.SCOUTER_GHEP || GHEP_MAC_DINH) {
  try {
    return JSON.parse(readFileSync(duong, "utf8"));
  } catch (loi) {
    throw new Error(
      `Không đọc được tệp ghép cặp ở ${duong}. Bridge đã chạy chưa? (${loi.code || loi.message})`,
    );
  }
}

export async function goi(method, params = {}, tuyChon = {}) {
  const cap = tuyChon.capDat || docGhepCap();
  const ghe = tuyChon.ghe ?? process.env.SCOUTER_GHE ?? null;

  const than = {
    protocol: "duc-scouter.bridge",
    version: 1,
    kind: "request",
    request_id: randomUUID(),
    sent_at: new Date().toISOString(),
    client: { client_id: tuyChon.clientId || "pilot-trang-thu-cham" },
    method,
    params,
  };
  if (ghe) than.target = ghe;

  const res = await fetch(`http://127.0.0.1:${cap.port}/v1/rpc`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${cap.token}` },
    body: JSON.stringify(than),
  });

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
}

/* Tiện cho mọi chặng: lấy targetId của tab đang đứng ở một URL.
 * PHẢI hỏi lại sau mỗi lượt điều hướng khác nguồn — targetId đổi, dùng lại số cũ
 * là đo nhầm tab. */
export async function timTab(urlBatDau, tuyChon = {}) {
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
}
