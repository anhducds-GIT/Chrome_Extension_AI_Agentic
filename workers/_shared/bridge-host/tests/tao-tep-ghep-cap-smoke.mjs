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
/* BỐN cấp, không phải ba. Tệp này ở `workers/_shared/bridge-host/tests/`, nên lùi ba cấp chỉ
 * tới `workers/`. Bản đầu lùi ba, và hệ quả là phép ghim **chỉ chứng minh bộ sinh không ghi được
 * vào `workers/`** — thu hẹp chốt lại chỉ bảo vệ một thư mục con mà vẫn xanh. Codex tìm ra 08/09.
 *
 * Đây đúng loại lỗi đắt nhất trong một phép ghim: nó không đỏ, nó chỉ **đo ít hơn nó tự khai**. */
const GOC_REPO = path.resolve(here, "..", "..", "..", "..");
assert.ok(fs.existsSync(path.join(GOC_REPO, "AGENTS.md")) && fs.existsSync(path.join(GOC_REPO, ".agents")),
  "GOC_REPO không trỏ vào gốc repo — mọi khối dưới đây đang đo nhầm chỗ");

const { dungTepGhepCap, sinhToken, namTrongRepo, NHA_BRIDGE, duongGhepCapChuan } =
  await import("../tao-tep-ghep-cap.mjs");
const { validatePairing } = await import("../bridge-host-core.mjs");
const nguonBoSinh = fs.readFileSync(path.join(here, "..", "tao-tep-ghep-cap.mjs"), "utf8");

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

  /* 16 giá trị khác nhau **KHÔNG** chứng minh ngẫu nhiên mật mã — một bộ đếm cũng qua được phép
   * đó. Audit độc lập 08/09 chỉ đúng chỗ này. Nên soi thẳng NGUỒN: token phải đến từ
   * `crypto.randomBytes`. Đây là một phép ghim đọc mã, và nó khai rõ như vậy — nó bắt được lượt
   * "dọn code" đổi sang `Math.random`, và không bắt được gì tinh vi hơn thế. */
  const nguon = fs.readFileSync(path.join(here, "..", "tao-tep-ghep-cap.mjs"), "utf8");
  assert.ok(nguon.includes("crypto.randomBytes(32)"), "token không còn sinh từ crypto.randomBytes");
  /* Soi LƯỢT GỌI `Math.random(`, không soi chữ `Math.random`: chính chú thích của bộ sinh có
   * nhắc tên đó để dặn đừng dùng, nên soi chữ trần thì phép ghim đỏ vì đọc chính lời dặn. */
  assert.ok(!nguon.includes("Math.random("), "bộ sinh token có gọi Math.random");
}

/* ---- ⑵ CHỐT ⑴: không bao giờ ghi vào trong kho mã ----------------------
 * Chạy THẬT, và thử cả đường dẫn có dấu cách — chỗ bản đầu trượt. */
{
  const S = String.fromCharCode(92);
  const trongRepo = [
    path.join(GOC_REPO, "thu-ghim.json"),
    path.join(GOC_REPO, "workers", "thu-ghim.json"),
    path.join(GOC_REPO, "workers", "..", "thu-ghim.json"),   /* đi vòng rồi quay lại vẫn là trong repo */
    /* Ba đường dưới đây do audit độc lập 08/09 chỉ ra, và **đường UNC đã LỌT thật** trước khi vá:
     * một tệp có token rơi vào gốc repo. Giữ cả ba, kể cả hai đường chưa từng lọt — chúng cùng
     * một gốc bệnh (so đường dẫn mà chuẩn hoá chưa đủ sâu), nên bịt một cái không bịt hai cái kia. */
    path.join(GOC_REPO, "..bi-mat.json"),                    /* tên tệp bắt đầu bằng dấu chấm kép */
    path.join(GOC_REPO, "workers", "..bi-mat.json"),
    S + S + "?" + S + path.resolve(GOC_REPO) + S + "thu-unc.json"   /* đường dẫn mở rộng Windows */
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

    /* Lượt `existsSync` chỉ để in một câu dễ hiểu — giữa lượt hỏi và lượt ghi có một khe, nên nó
     * KHÔNG phải chốt. Chốt thật là cờ `wx`: hệ điều hành từ chối. Audit 08/09 chỉ ra khe này.
     * Ghim bằng cách soi nguồn, vì tái hiện một cuộc đua thật ở đây tốn hơn giá trị nó mang lại. */
    assert.ok(nguonBoSinh.includes('flag: "wx"'), "lượt ghi không dùng cờ wx — chỉ còn existsSync, và nó có khe");

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

/* ---- ⑸ NHÀ CHUNG CỦA BRIDGE — mọi gói một chỗ, không tản mát ----------
 *
 * Đức chốt 08/09 sau khi gặp lỗi này VÀI LẦN: mọi thứ thuộc Bridge nằm dưới một thư mục duy
 * nhất, mỗi gói một thư mục con mang đúng tên gói. Quy ước đó đã tồn tại từ trước — bốn gói cũ
 * đều theo — nhưng nó chỉ nằm trong đầu người, nên chính lượt 08/09 tôi vẫn đặt một tệp ghép
 * cặp vào thư mục hồ sơ người dùng.
 *
 * Nên phép ghim này canh đúng một điều: **công cụ phải TỰ đặt đúng chỗ**. Một quy ước chỉ nằm
 * trong văn xuôi thì phụ thuộc vào việc AI có đọc đúng trang đó không, và đó là thứ đã hỏng. */
{
  const S = String.fromCharCode(92);
  assert.equal(NHA_BRIDGE, "C:" + S + "WORKING ZONE" + S + "Chrome Extension Bridge",
    "nhà chung của Bridge bị đổi — nếu Đức đổi thật thì sửa cả ở đây, đừng để hai bản");

  /* Đường dẫn chuẩn phải ra ĐÚNG hình dạng bốn gói cũ đang dùng: thư mục con mang tên gói, và
   * tệp mang tên gói kèm hậu tố. Đo từ thư mục thật ngày 08/09. */
  assert.equal(duongGhepCapChuan("hnx-fetch"),
    [NHA_BRIDGE, "hnx-fetch", "hnx-fetch-bridge-pairing-v1.json"].join(S),
    "tên tệp/thư mục lệch quy ước bốn gói cũ đang dùng");

  /* Cờ `--goi` phải TỒN TẠI và phải nối vào đường chuẩn. Không có nó thì mỗi lượt lại là một
   * lần người gõ tự nhớ đường — và cái đó đã hỏng vài lần. */
  assert.ok(nguonBoSinh.includes('co("goi")'), "bộ sinh không còn nhận --goi");
  assert.ok(nguonBoSinh.includes("duongGhepCapChuan(tenGoi)"),
    "có cờ --goi nhưng không nối vào đường chuẩn — cờ có mà không có tác dụng");

  /* Câu hướng dẫn phải NÓI RA nhà chung. Người đọc câu lỗi là người đang lạc đường. */
  const r = chay([]);
  assert.equal(r.ma, 2);
  assert.ok(r.loi.includes("Nhà chung của Bridge"), "câu hướng dẫn không nói nhà chung ở đâu");
  assert.ok(r.loi.includes("Chrome Extension Bridge"), "câu hướng dẫn không in ra đường dẫn thật");
  assert.ok(r.loi.includes("--goi"), "câu hướng dẫn không nhắc cách gọi nên dùng");
}

console.log("tao-tep-ghep-cap-smoke: 5 khoi, tat ca DAT");
