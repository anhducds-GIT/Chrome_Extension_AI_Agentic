/* tao-tep-ghep-cap-smoke.mjs — bộ sinh tệp ghép cặp (H-06).
 *
 * ══ CHỐT ⑴ ĐÃ HỎNG CÂM MỘT LẦN, VÀ ĐÓ LÀ LÝ DO FILE NÀY TỒN TẠI ══
 *
 * Lượt thử đầu 08/09: chốt "không ghi vào trong kho mã" **không nổ**, và bộ sinh đã đặt một tệp
 * CÓ TOKEN thẳng vào gốc repo. Nguyên nhân: gốc repo được tính bằng cách tự gỡ `URL.pathname`,
 * mà trên Windows chuỗi đó là `/C:/WORKING%20ZONE/...` — dấu cách còn nguyên dạng `%20`, nên
 * đường dẫn dựng ra không khớp thư mục thật và phép so luôn trả "nằm ngoài repo".
 *
 * Một chốt hỏng CÂM tệ hơn không có chốt: không có thì người ta còn cẩn thận.
 *
 * Nên phép ghim này KHÔNG so chuỗi — nó **chạy thật tệp lệnh** và xem có tệp nào rơi vào repo
 * không. Và nó cố ý thử một đường dẫn **có dấu cách**, vì đó chính là chỗ bản đầu trượt.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const LENH = path.join(here, "..", "tao-tep-ghep-cap.mjs");
const GOC_REPO = path.resolve(here, "..", "..", "..");

const { dungTepGhepCap, sinhToken, namTrongRepo } = await import("../tao-tep-ghep-cap.mjs");
const { validatePairing } = await import("../bridge-host-core.mjs");

function chay(args) {
  try {
    const ra = execFileSync(process.execPath, [LENH, ...args], { stdio: ["ignore", "pipe", "pipe"] });
    return { ma: 0, ra: String(ra), loi: "" };
  } catch (e) {
    return { ma: e.status, ra: String(e.stdout || ""), loi: String(e.stderr || "") };
  }
}

/* ---- ⑴ Tệp sinh ra phải qua được ĐÚNG hàm mà máy chủ dùng ---------------
 * Không dựng lại lược đồ trong test: dựng lại là có hai bản của một luật, và bản trong test sẽ
 * là bản sai. Bản đầu sinh token dạng hex và bị chính `validatePairing` chặn — giữ vế này để
 * không ai "sửa" ngược cho dễ đọc. */
{
  const tep = dungTepGhepCap(32152);
  validatePairing(tep);
  assert.match(tep.token, /^[A-Za-z0-9_-]{43}$/, "token sai hình dạng — máy chủ sẽ từ chối tệp");
  assert.equal(tep.host, "127.0.0.1", "chỉ được nghe loopback");
  assert.equal(tep.http_url, "http://127.0.0.1:32152/v1/rpc");
  assert.equal(tep.websocket_url, "ws://127.0.0.1:32152/v1/extension");

  /* Hai lượt sinh KHÔNG được ra cùng token. Một bộ sinh trả hằng số vẫn qua được mọi phép kiểm
   * hình dạng ở trên, mà nó thì vô dụng hoàn toàn. */
  const bo = new Set(Array.from({ length: 16 }, () => sinhToken()));
  assert.equal(bo.size, 16, "token lặp lại — bộ sinh không ngẫu nhiên");
}

/* ---- ⑵ CHỐT ⑴: không bao giờ ghi vào trong kho mã ----------------------
 * Chạy THẬT, và thử cả đường dẫn có dấu cách — chỗ bản đầu trượt. */
{
  const trongRepo = [
    path.join(GOC_REPO, "thu-ghim.json"),
    path.join(GOC_REPO, "workers", "thu-ghim.json"),
    path.join(GOC_REPO, "workers", "..", "thu-ghim.json")   /* đi vòng rồi quay lại vẫn là trong repo */
  ];
  for (const p of trongRepo) {
    const r = chay(["--ra", p]);
    assert.equal(r.ma, 3, `ghi được vào ${p} — token lọt vào kho mã`);
    assert.match(r.loi, /TU_CHOI/, "từ chối mà không nói vì sao");
    assert.ok(!fs.existsSync(p), `TỆP THẬT SỰ ĐÃ RƠI VÀO REPO: ${p}`);
  }

  /* Phép so đường dẫn, kiểm thẳng — kể cả khi gốc repo có dấu cách trong tên. */
  const gocCoDauCach = path.join(os.tmpdir(), "GOC CO DAU CACH");
  assert.equal(namTrongRepo(path.join(gocCoDauCach, "a.json"), gocCoDauCach), true,
    "đường dẫn có DẤU CÁCH bị coi là nằm ngoài — đúng lỗi đã xảy ra 08/09");
  assert.equal(namTrongRepo(path.join(os.tmpdir(), "cho-khac", "a.json"), gocCoDauCach), false);
}

/* ---- ⑶ CHỐT ⑵: không bao giờ ghi đè tệp đã có --------------------------
 * Ghi đè một tệp ghép cặp đang dùng là làm chết kết nối của extension đang chạy, mà người gõ
 * lệnh không hề biết. */
{
  const thuMuc = fs.mkdtempSync(path.join(os.tmpdir(), "ghim-ghep-cap-"));
  const ra = path.join(thuMuc, "pairing.json");
  try {
    const lan1 = chay(["--ra", ra, "--cong", "32199"]);
    assert.equal(lan1.ma, 0, "lượt sinh hợp lệ bị từ chối: " + lan1.loi);
    assert.ok(fs.existsSync(ra), "báo thành công mà không có tệp nào");
    validatePairing(JSON.parse(fs.readFileSync(ra, "utf8")));

    const truoc = fs.readFileSync(ra, "utf8");
    const lan2 = chay(["--ra", ra, "--cong", "32199"]);
    assert.equal(lan2.ma, 3, "ghi đè được tệp đã có");
    assert.equal(fs.readFileSync(ra, "utf8"), truoc, "tệp bị đổi dù lệnh báo từ chối");

    /* Thư mục không có thì DỪNG, không tự tạo: gõ nhầm một ký tự là đặt token ở chỗ không ai nhìn. */
    assert.equal(chay(["--ra", path.join(thuMuc, "khong-co", "p.json")]).ma, 3);
  } finally {
    fs.rmSync(thuMuc, { recursive: true, force: true });
  }
}

/* ---- ⑷ Thiếu tham số thì DẠY, không im ---------------------------------- */
{
  const r = chay([]);
  assert.equal(r.ma, 2);
  assert.match(r.loi, /--ra/, "câu hướng dẫn không nói cần cờ gì");
}

console.log("tao-tep-ghep-cap-smoke: 4 khoi, tat ca DAT");
