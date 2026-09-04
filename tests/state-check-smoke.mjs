/* Phép ghim cho `scripts/state-check.mjs` — brief STATE-DRIFT-01.
 *
 * Mọi ca hỏng dựng bằng DỮ LIỆU truyền vào hàm thuần, không bằng repo thật. Repo thật đổi
 * mỗi phiên, nên phép kiểm dựa vào nó chỉ chứng minh *hôm nay* đang khớp — vô nghĩa ngày mai.
 * Đó chính là lý do `danhGia` nhận ba cặp làm tham số thay vì tự chạy git.
 *
 * Ba nhóm, và nhóm thứ ba là nhóm dễ bị bỏ nhất:
 *   A. ba trạng thái OK · MISMATCH · UNKNOWN, và `UNKNOWN` KHÔNG được đội lốt `OK`
 *   B. bản in ra phải LIỆT KÊ từng chỗ lệch, không tóm tắt thành con số
 *   C. luật KHÔNG-TỰ-SỬA ghim vào CẤU TRÚC nguồn, không ghim vào lời hứa
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { GIT_CHI_DOC, MA_THOAT, TRANG_THAI, commitChuaPush, danhGia, fetchMoi, gitChiDoc, khoaTaiRemote, render } from "../scripts/state-check.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const NGUON = readFileSync(join(ROOT, "scripts", "state-check.mjs"), "utf8");

let so = 0;
const kiem = (ten, fn) => { fn(); so += 1; console.log("  ok  " + ten); };

/* Bộ dữ liệu "mọi thứ khớp" — mỗi ca dưới đây làm hỏng ĐÚNG MỘT chỗ của nó. */
const KHOP = () => ({
  khoaMay: { _root: { owner: null }, _code: { owner: "claude-k2" } },
  khoaRemote: { _root: { owner: null }, _code: { owner: "claude-k2" } },
  artifact: [{ script: "build-dashboard.mjs", khop: true, chiTiet: "" }],
  commitChuaPush: [],
  loi: [],
});

/* ---- A. Ba trạng thái ------------------------------------------------------- */

kiem("ba cặp khớp → STATE OK, mã thoát 0, không lệch không mù", () => {
  const r = danhGia(KHOP());
  assert.equal(r.trangThai, TRANG_THAI.OK);
  assert.equal(r.ma, 0);
  assert.deepEqual(r.lech, []);
  assert.deepEqual(r.khongBiet, []);
});

kiem("CA THẬT 04/09 — khoá trả trên máy nhưng origin/main vẫn ghi đang giữ", () => {
  // Đây là defect sinh ra brief này. Phiên điều phối báo "đã trả ba khoá"; trên máy đúng là
  // trống, nhưng lượt trả chưa push nên GitHub — chỗ GPT audit và chỗ phiên khác nhìn vào —
  // vẫn thấy bị giữ. Đức là người bắt được, không phải hệ.
  const d = KHOP();
  d.khoaMay = { _root: { owner: null } };
  d.khoaRemote = { _root: { owner: "claude-dieu-phoi" } };
  const r = danhGia(d);
  assert.equal(r.trangThai, TRANG_THAI.MISMATCH);
  assert.equal(r.ma, 1);
  assert.equal(r.lech.length, 1);
  // Phải nói RÕ BÊN NÀO NÓI GÌ. "có 1 chỗ lệch" không cho ai hành động được.
  assert.match(r.lech[0], /_root/);
  assert.match(r.lech[0], /TRÊN MÁY TRỐNG/);
  assert.match(r.lech[0], /TRÊN origin\/main `claude-dieu-phoi`/);
});

kiem("khoá VẮNG MẶT một bên không bị ép phẳng thành TRỐNG", () => {
  // Bảng hai bên lệch nhau về danh sách khoá là ca thật (thêm `_docs`/`_code` ngày 02/09).
  // Ép phẳng "vắng mặt" thành "trống chủ" là bỏ qua đúng lúc cần thấy.
  const r = danhGia({ ...KHOP(), khoaMay: { _root: { owner: null }, _moi: { owner: null } } });
  assert.equal(r.trangThai, TRANG_THAI.MISMATCH);
  const dong = r.lech.find((l) => l.includes("_moi"));
  assert.ok(dong, "khoá chỉ có một bên phải được nêu tên");
  assert.match(dong, /KHÔNG CÓ KHOÁ NÀY/);
});

kiem("artifact lệch HEAD → MISMATCH, nêu tên bộ sinh", () => {
  const d = KHOP();
  d.artifact = [{ script: "build-dashboard.mjs", khop: false, chiTiet: "DASHBOARD.md lệch 3 dòng" }];
  const r = danhGia(d);
  assert.equal(r.trangThai, TRANG_THAI.MISMATCH);
  assert.match(r.lech[0], /build-dashboard\.mjs/);
  assert.match(r.lech[0], /lệch 3 dòng/);
});

kiem("KHÔNG CHẠY ĐƯỢC phép đo artifact là UNKNOWN, không phải MISMATCH", () => {
  // Hai chuyện khác nhau: "đo được và thấy lệch" ≠ "không đo được". Gộp chúng thì một hôm
  // thiếu file sẽ được báo cáo như một sai lệch có thật, và người ta đi sửa nhầm chỗ.
  const d = KHOP();
  d.artifact = [{ script: "feature-parity.mjs", khop: null, chiTiet: "không có trong repo" }];
  const r = danhGia(d);
  assert.equal(r.trangThai, TRANG_THAI.UNKNOWN);
  assert.deepEqual(r.lech, []);
  assert.match(r.khongBiet[0], /feature-parity\.mjs/);
});

kiem("commit chưa push → MISMATCH, in cả SHA lẫn lane", () => {
  const d = KHOP();
  d.commitChuaPush = [{ sha: "731abb0", tieuDe: "chore: sinh lai artifact", lane: "claude-dieu-phoi" }];
  const r = danhGia(d);
  assert.equal(r.trangThai, TRANG_THAI.MISMATCH);
  assert.match(r.lech[0], /731abb0/);
  assert.match(r.lech[0], /claude-dieu-phoi/);
});

kiem("commit chưa push KHÔNG có nhãn Lane vẫn phải hiện, ghi rõ là không nhãn", () => {
  const d = KHOP();
  d.commitChuaPush = [{ sha: "abc1234", tieuDe: "wip", lane: "" }];
  const r = danhGia(d);
  assert.equal(r.trangThai, TRANG_THAI.MISMATCH);
  assert.match(r.lech[0], /KHÔNG NHÃN/);
});

kiem("FETCH HỎNG → UNKNOWN, và tuyệt đối KHÔNG phải OK", () => {
  // Đây là luật fail-open mà repo này cấm: mất mạng mà báo "mọi thứ khớp" là nói dối theo
  // hướng trấn an. Ba cặp dưới đây đều khớp — chỉ mỗi việc fetch hỏng.
  const d = KHOP();
  d.loi = ["`git fetch origin main` HỎNG (không có mạng)"];
  const r = danhGia(d);
  assert.equal(r.trangThai, TRANG_THAI.UNKNOWN);
  assert.notEqual(r.trangThai, TRANG_THAI.OK);
  assert.notEqual(r.ma, 0, "UNKNOWN không được mang mã thoát của OK");
  assert.match(r.khongBiet.join("\n"), /fetch/);
});

kiem("ĐỐI CHỨNG ÂM — không dữ liệu nào cả thì UNKNOWN, và nói ra CẢ BA cặp", () => {
  // Không có phép này thì một phép kiểm đọc hụt (mọi nguồn về null) vẫn xanh, vì "không thấy
  // lệch" trông y hệt "không lệch".
  const r = danhGia({});
  assert.equal(r.trangThai, TRANG_THAI.UNKNOWN);
  assert.deepEqual(r.lech, []);
  const noi = r.khongBiet.join("\n");
  assert.match(noi, /Cặp 1/);
  assert.match(noi, /Cặp 2/);
  assert.match(noi, /Cặp 3/);
});

kiem("bảng quyền hai bên đều RỖNG là không-biết, không phải khớp", () => {
  // Lỗi đọc im lặng cho ra hai object rỗng bằng nhau. So thẳng thì chúng "khớp" và cổng xanh
  // vì không đọc được gì — đúng kiểu xanh giả mà repo này đã dính ba lần.
  const r = danhGia({ ...KHOP(), khoaMay: {}, khoaRemote: {} });
  assert.equal(r.trangThai, TRANG_THAI.UNKNOWN);
  assert.match(r.khongBiet.join("\n"), /Cặp 1/);
});

kiem("không khai bộ sinh nào thì cặp 2 là không-biết, không phải im lặng cho qua", () => {
  const r = danhGia({ ...KHOP(), artifact: [] });
  assert.equal(r.trangThai, TRANG_THAI.UNKNOWN);
  assert.match(r.khongBiet.join("\n"), /Cặp 2/);
});

kiem("không hỏi được origin/main thì cặp 3 là không-biết", () => {
  const r = danhGia({ ...KHOP(), commitChuaPush: null });
  assert.equal(r.trangThai, TRANG_THAI.UNKNOWN);
  assert.match(r.khongBiet.join("\n"), /Cặp 3/);
});

kiem("vừa lệch vừa mù → MISMATCH, nhưng phần mù KHÔNG bị nuốt", () => {
  const d = KHOP();
  d.khoaMay = { _root: { owner: null } };
  d.khoaRemote = { _root: { owner: "ai-do" } };
  d.loi = ["`git fetch` HỎNG"];
  const r = danhGia(d);
  assert.equal(r.trangThai, TRANG_THAI.MISMATCH, "lệch THẬT là thứ hành động được ngay");
  assert.equal(r.lech.length, 1);
  assert.equal(r.khongBiet.length, 1, "phần không biết vẫn phải giữ để in ra");
});

kiem("ba mã thoát khác nhau, chỉ OK là 0", () => {
  assert.equal(MA_THOAT[TRANG_THAI.OK], 0);
  assert.notEqual(MA_THOAT[TRANG_THAI.MISMATCH], 0);
  assert.notEqual(MA_THOAT[TRANG_THAI.UNKNOWN], 0);
  assert.notEqual(MA_THOAT[TRANG_THAI.MISMATCH], MA_THOAT[TRANG_THAI.UNKNOWN]);
});

/* ---- B. Bản in ra ----------------------------------------------------------- */

const IN = (d, extra = {}) => render({ ketQua: danhGia(d), boSinh: ["build-dashboard.mjs"], as: "claude-x", luc: new Date("2026-09-04T03:00Z"), ...extra });

kiem("bản in LIỆT KÊ từng chỗ lệch, không tóm tắt thành con số", () => {
  const d = KHOP();
  d.khoaMay = { _root: { owner: null }, _code: { owner: "claude-k2" } };
  d.khoaRemote = { _root: { owner: "phien-cu" }, _code: { owner: "phien-khac" } };
  const ra = IN(d);
  assert.match(ra, /^STATE MISMATCH/);
  // Từng khoá phải có DÒNG CỦA RIÊNG NÓ, kèm cả hai bên. Cắt đúng dòng rồi mới khẳng định —
  // regex `/mở[\s\S]*?đóng/` chạy tràn ra ngoài phạm vi và cho xanh giả (đã cắn 4 lần ở repo này).
  const dongCua = (khoa) => ra.split("\n").find((l) => l.startsWith("  ✗ Cặp 1 · khoá `" + khoa + "`")) || "";
  assert.match(dongCua("_root"), /TRÊN MÁY TRỐNG/);
  assert.match(dongCua("_root"), /`phien-cu`/);
  assert.match(dongCua("_code"), /`claude-k2`/);
  assert.match(dongCua("_code"), /`phien-khac`/);
});

kiem("không OK thì IN RA lệnh sửa, kèm tên phiên người chạy đưa vào", () => {
  const ra = IN({ ...KHOP(), commitChuaPush: [{ sha: "abc1234", tieuDe: "x", lane: "claude-x" }] });
  assert.match(ra, /KHÔNG TỰ SỬA GÌ/);
  assert.match(ra, /node scripts\/safe-push\.mjs --as claude-x/);
  assert.match(ra, /node scripts\/build-dashboard\.mjs/);
  assert.match(ra, /đừng `--restamp` cho xong việc/);
});

kiem("OK thì KHÔNG in lệnh sửa — đừng dụ người ta chạy khi không có gì để chữa", () => {
  const ra = IN(KHOP());
  assert.match(ra, /^STATE OK/);
  assert.doesNotMatch(ra, /safe-push/);
});

kiem("UNKNOWN nói thẳng rằng KHÔNG BIẾT không phải là KHỚP", () => {
  const ra = IN({ ...KHOP(), loi: ["`git fetch` HỎNG"] });
  assert.match(ra, /^STATE UNKNOWN/);
  assert.match(ra, /KHÔNG BIẾT không phải là KHỚP/);
});

/* ---- B2. Lớp vỏ chạm git — tiêm `git` giả, không cần rút mạng thật ---------- */

kiem("fetch HỎNG được GHI LẠI, không nuốt — rồi thành UNKNOWN ở cuối đường", () => {
  // Ca fail-open mà brief này sinh ra để chặn, dựng bằng ba dòng thay vì rút dây mạng.
  const loi = [];
  const ok = fetchMoi(loi, { git: () => { throw new Error("fatal: unable to access"); } });
  assert.equal(ok, false);
  assert.equal(loi.length, 1);
  assert.match(loi[0], /fetch/);
  assert.equal(danhGia({ ...KHOP(), loi }).trangThai, TRANG_THAI.UNKNOWN);
});

kiem("fetch chạy đúng lệnh, và chạy được thì KHÔNG đẻ ra cảnh báo rỗng", () => {
  const loi = [];
  let thay = null;
  assert.equal(fetchMoi(loi, { git: (a) => { thay = a; return ""; } }), true);
  assert.deepEqual(thay, ["fetch", "--quiet", "origin", "main"]);
  assert.deepEqual(loi, []);
});

kiem("không đọc được bảng quyền trên origin/main → null + ghi lý do", () => {
  const loi = [];
  assert.equal(khoaTaiRemote(loi, { git: () => { throw new Error("path does not exist"); } }), null);
  assert.match(loi.join("\n"), /origin\/main/);
});

kiem("origin/main không phân giải được → cặp 3 trả null, KHÔNG trả mảng rỗng", () => {
  // Mảng rỗng nghĩa là "đã hỏi, không có commit nào chưa push" — tức OK. null nghĩa là
  // "chưa hỏi được". Gộp hai cái đó là đúng kiểu fail-open mà repo này cấm.
  const loi = [];
  assert.equal(commitChuaPush(loi, { git: () => { throw new Error("unknown revision"); } }), null);
  assert.match(loi.join("\n"), /origin\/main/);
});

kiem("cặp 3 đọc được SHA, tiêu đề và nhãn Lane từ commit chưa push", () => {
  const gia = (a) => {
    if (a[0] === "rev-parse") return "731abb0\n";
    if (a[1] === "--format=%H") return "abcdef1234567\n";
    if (a.includes("--format=%s")) return "feat: mot viec\n";
    return "feat: mot viec\n\nLane: claude-exec-statedrift\n";
  };
  const ra = commitChuaPush([], { git: gia });
  assert.deepEqual(ra, [{ sha: "abcdef1", tieuDe: "feat: mot viec", lane: "claude-exec-statedrift" }]);
});

/* ---- C. Luật KHÔNG-TỰ-SỬA, ghim vào CẤU TRÚC -------------------------------- */

kiem("cửa git TỪ CHỐI mọi lệnh có thể sửa gì đó", () => {
  for (const xau of ["push", "commit", "checkout", "reset", "add", "restore", "tag", "rebase"]) {
    assert.throws(() => gitChiDoc([xau], { chay: () => "" }), /STATE_CHECK_CHI_DOC/, "`git " + xau + "` phải bị từ chối");
  }
  assert.throws(() => gitChiDoc([], { chay: () => "" }), /STATE_CHECK_CHI_DOC/, "gọi rỗng cũng phải bị từ chối");
});

kiem("cửa git cho qua lệnh chỉ đọc, và truyền đúng đối số", () => {
  let thay = null;
  const ra = gitChiDoc(["log", "--format=%H"], { root: "/x", chay: (bin, args) => { thay = [bin, args]; return "ket-qua"; } });
  assert.equal(ra, "ket-qua");
  assert.deepEqual(thay, ["git", ["-c", "core.quotepath=false", "log", "--format=%H"]]);
});

kiem("danh sách chỉ-đọc không chứa động từ ghi nào", () => {
  const ghi = ["push", "commit", "add", "checkout", "reset", "merge", "rebase", "restore", "clean", "stash", "tag", "am", "apply"];
  for (const g of ghi) assert.ok(!GIT_CHI_DOC.includes(g), "`" + g + "` không được nằm trong danh sách chỉ-đọc");
});

kiem("mọi lệnh git của nguồn đi qua ĐÚNG MỘT cửa, và cửa đó là gitChiDoc", () => {
  // Ghim vào cấu trúc chứ không dò tên hàm: nếu ai đó thêm một `execFileSync("git", …)` thứ
  // hai ở chỗ khác thì nó đi vòng qua danh sách chỉ-đọc, và luật không-tự-sửa mất hiệu lực.
  const soLan = (NGUON.match(/"git"/g) || []).length;
  assert.equal(soLan, 1, "chỉ được có đúng một chỗ gọi tiến trình `git` trong cả file");
  // CẮT ĐÚNG THÂN HÀM rồi mới khẳng định, không dùng regex vắt qua hai mốc.
  const dau = NGUON.indexOf("export function gitChiDoc");
  const cuoi = NGUON.indexOf("/* ---- TRUNG TÂM", dau);
  assert.ok(dau > 0 && cuoi > dau, "không tìm thấy thân hàm gitChiDoc — mốc cắt đã đổi, sửa phép kiểm này");
  assert.ok(NGUON.slice(dau, cuoi).includes('"git"'), "chỗ gọi `git` duy nhất phải nằm trong gitChiDoc");
});

kiem("nguồn KHÔNG chứa một lời gọi ghi file nào", () => {
  const camGhi = /writeFileSync|appendFileSync|mkdirSync|rmSync|unlinkSync|createWriteStream|writeFile\(/;
  assert.doesNotMatch(NGUON, camGhi, "lệnh này chỉ đọc — thấy sai lệch thì BÁO, không tự làm cho khớp");
  // Nhập từ `node:fs` phải liệt kê tên, và chỉ tên đọc. `import fs from "node:fs"` mở lại
  // cả cánh cửa mà phép kiểm trên vừa đóng.
  const dongFs = NGUON.split("\n").filter((l) => l.includes("node:fs"));
  assert.deepEqual(dongFs, ['import { existsSync } from "node:fs";']);
});

kiem("nguồn chỉ sinh ĐÚNG MỘT loại tiến trình con, và đó là `--check-head`", () => {
  // Cửa `gitChiDoc` chặn được `git push`, nhưng KHÔNG chặn được `node scripts/claim.mjs
  // --restamp` — đó là tiến trình con, không phải lệnh git. Nên phải đếm cả lối kia: ngoài
  // cửa git, cả file chỉ được sinh đúng một tiến trình, và nó là phép đo artifact đã có sẵn.
  const goi = NGUON.match(/execFileSync\(/g) || [];
  assert.equal(goi.length, 1, "chỉ được một lời gọi execFileSync ngoài cửa git");
  assert.match(NGUON, /execFileSync\(process\.execPath, \[file, "--check-head"\]/);
});

kiem("mọi chỗ nhắc `--restamp` đều là lời CẤM, không phải chỉ dẫn để tự chạy", () => {
  const dongRestamp = NGUON.split("\n").filter((l) => l.includes("--restamp"));
  assert.ok(dongRestamp.length > 0, "phải có ít nhất một chỗ nói tới restamp — để CẢNH BÁO");
  for (const l of dongRestamp) {
    assert.match(l, /đừng|ĐỪNG|không|KHÔNG|cấm|CẤM/, "chỗ nhắc `--restamp` phải là lời cấm: " + l.trim());
  }
});

kiem("cặp 2 TÁI DÙNG phép đo đã có, không nhân bản", () => {
  // Hai bản sao của một luật đã trả hai câu khác nhau cho cùng một file ngày 02/09.
  assert.match(NGUON, /import \{[^}]*generatorsFrom[^}]*\} from "\.\/repo-structure\.mjs"/);
  assert.match(NGUON, /"--check-head"/);
});

console.log(`\n${so} passed, 0 failed, ${so} total`);
