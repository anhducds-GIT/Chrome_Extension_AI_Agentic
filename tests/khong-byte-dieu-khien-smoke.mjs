/* khong-byte-dieu-khien-smoke.mjs — KHÔNG tệp mã nguồn nào được mang byte điều khiển thô.
 *
 * ══ VÌ SAO PHÉP GHIM NÀY TỒN TẠI ══
 *
 * Đo thật 08/09: `workers/hnx-fetch/v0.1.0/scripts/fetch-core.mjs` mang **một byte NUL** ở giữa
 * một dòng chú thích — chỗ định viết sáu ký tự `\u0000` dạng chữ, nhưng một lượt thoát chuỗi hỏng
 * đã ghi ra byte thật.
 *
 * Cái đắt KHÔNG phải byte đó. Cái đắt là: **git coi cả tệp là nhị phân**, nên `git diff` của nó
 * chỉ in `Bin 23842 -> 23847 bytes`. Mọi thay đổi về sau **bị giấu vĩnh viễn** — kể cả một bản vá
 * làm yếu khối phanh, kể cả một dòng gửi token ra ngoài. Vòng kiểm tra chéo của repo này đứng
 * trên việc đọc diff, nên một tệp nhị phân là một tệp **không ai kiểm được nữa**.
 *
 * Và nó **không làm suite nào đỏ**: Node đọc tệp bình thường, mọi phép ghim vẫn xanh. Đây đúng
 * loại hỏng mà cổng kiểm sinh ra để bắt — hỏng ở tầng *người còn đọc được không*, không ở tầng
 * *máy còn chạy được không*.
 *
 * CHO PHÉP: tab (9) · xuống dòng (10) · về đầu dòng (13). Repo này có tệp CRLF thật.
 * CHẶN: mọi byte điều khiển còn lại, kể cả NUL, kể cả `\x1b` của mã màu terminal lỡ tay dán vào.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/* Hỏi git danh sách tệp, không tự đi bộ cây thư mục: git đã biết `.gitignore`, biết `node_modules`,
 * và biết tệp nào thật sự được theo dõi. Tự đi bộ là dựng lại một luật đã có, sai chỗ nào không ai
 * biết. */
const dsTep = execFileSync("git", ["ls-files", "-z"], { cwd: GOC, maxBuffer: 64 * 1024 * 1024 })
  .toString("utf8").split("\0").filter(Boolean);

/* Chỉ soi tệp CHỮ. Ảnh, PDF, PNG icon là nhị phân **có lý do**, và chúng phải nhị phân. */
const DUOI_CHU = new Set([".mjs", ".js", ".json", ".md", ".html", ".css", ".cmd", ".txt", ".csv", ".yml", ".yaml"]);
const CHO_PHEP = new Set([9, 10, 13]);

/* BA GÓI ĐÓNG BĂNG được BỎ QUA, và đây là chỗ dễ đọc nhầm nhất của phép ghim này.
 *
 * Không phải vì mã của chúng sạch — `workers/duc-auto-gg-flow-video/v0.1.0/tests/
 * halt-instructions-core-smoke.mjs` mang một byte 0x08 ở dòng 27, đo được 08/09. Mà vì luật mục 1
 * của `AGENTS.md` chỉ cho ĐỌC ba gói đó. Một phép ghim đòi sửa thứ không ai được sửa là một phép
 * ghim **không lượt chạy nào làm xanh nổi** — nó sẽ chặn mọi phiên cho tới khi ai đó gỡ nó, và
 * lúc đó ta mất cả phần còn lại.
 *
 * Chỗ hở đó ghi ở `BACKLOG.md` gốc repo. Mở băng gói nào thì sửa trong chính lượt mở. */
const DONG_BANG = JSON.parse(fs.readFileSync(path.join(GOC, ".repo-structure.json"), "utf8")).frozen || [];

const hong = [];
let daSoi = 0;
let boQua = 0;
for (const rel of dsTep) {
  if (!DUOI_CHU.has(path.extname(rel).toLowerCase())) continue;
  if (DONG_BANG.some((g) => rel === g || rel.startsWith(g + "/"))) { boQua += 1; continue; }
  const tuyet = path.join(GOC, rel);
  let b;
  try { b = fs.readFileSync(tuyet); } catch { continue; }   /* tệp vừa bị xoá giữa chừng */
  daSoi += 1;
  for (let i = 0; i < b.length; i++) {
    const c = b[i];
    if (c < 32 && !CHO_PHEP.has(c)) {
      const dong = b.slice(0, i).toString("utf8").split("\n").length;
      hong.push(`${rel}:${dong} — byte 0x${c.toString(16).padStart(2, "0")} ở offset ${i}`);
      break;   /* một dòng một tệp là đủ để đi sửa */
    }
  }
}

/* Ghim CHIỀU NGƯỢC: nếu bộ lọc đuôi tệp hỏng và không tệp nào được soi, phép ghim này sẽ xanh
 * mà không kiểm gì cả — đúng cái bẫy "mỏ neo khớp 0 lần" mà bộ đột biến kiểm đã trả giá. */
assert.ok(daSoi > 100, `chỉ soi được ${daSoi} tệp — bộ lọc hỏng, phép ghim này đang xanh vì rỗng`);

assert.deepEqual(hong, [],
  "tệp mã nguồn mang byte điều khiển thô — git sẽ coi là nhị phân và GIẤU MỌI DIFF về sau:\n  " +
  hong.join("\n  "));

/* HÌNH DẠNG chứ không phải SỐ LƯỢNG — sửa 12/09.
 * Bản trước đòi `frozen` KHÔNG rỗng, và nó gộp hai chuyện khác hẳn nhau: "khối đổi hình dạng
 * nên cái bỏ qua đang bỏ qua số không" (lỗi thật) với "hôm nay không gói nào bị đóng băng"
 * (trạng thái Đức tự chốt 08/09: *"tôi mở băng để chuẩn bị làm các extension đó"*, ghi ngay
 * trong `_frozen_doc`). Nên nó ĐỎ vì một quyết định của Đức, và đỏ như thế thì không ai sửa
 * được — chỉ có cách đóng băng lại một gói để làm nguôi một phép kiểm.
 * Nay tách đôi: khối phải CÒN và phải là mảng · và nếu có khai gói nào thì lượt bỏ qua phải
 * thật sự bỏ qua được cái gì đó — đúng cái bẫy "mỏ neo khớp 0 lần" ở trên. */
assert.ok(Array.isArray(DONG_BANG),
  "khoi frozen cua .repo-structure.json khong con la mang — cai bo qua tren dang doc nham hinh dang");
if (DONG_BANG.length > 0) {
  assert.ok(boQua > 0,
    `khai ${DONG_BANG.length} goi dong bang ma khong tep nao bi bo qua — mo neo khong khop lan nao`);
}

console.log(`khong-byte-dieu-khien-smoke: ${daSoi} tep chu sach, bo qua ${boQua} tep cua goi dong bang`);
