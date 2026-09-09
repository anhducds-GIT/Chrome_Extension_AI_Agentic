/* PHÉP GHIM CHO GÓI ASSISTANT — `scripts/state-check.mjs` + `scripts/what-next.mjs`.
 *
 * Hai lệnh này là công cụ của vai ĐIỀU PHỐI: một cái trả lời "việc nào chạy song song được
 * ngay", một cái trả lời "điều tôi sắp báo cáo có đúng với nguồn thẩm quyền không".
 *
 * Mọi ca hỏng ở khối A→D dựng bằng DỮ LIỆU truyền vào hàm thuần, không bằng repo thật. Repo
 * thật đổi mỗi phiên, nên phép kiểm dựa vào nó chỉ chứng minh *hôm nay* đang khớp — vô nghĩa
 * ngày mai. Đó chính là lý do `danhGia` nhận ba cặp làm tham số thay vì tự chạy git.
 *
 * Khối E thì NGƯỢC LẠI, và nó là khối quan trọng nhất: dựng một repo THẬT có hình dạng KHÁC
 * HẲN repo nhà (tên vùng khác · không có đơn vị con · không `IDEAS.md` · không `BACKLOG.md`
 * · không `STATUS.md` · KHÔNG CÓ remote) rồi chạy cả hai lệnh trong đó. Chỉ chạy được ở repo
 * giống repo nhà thì chưa phải port, mới chỉ là chép.
 */

import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  GIT_CHI_DOC, MA_THOAT, TRANG_THAI, artifactSoVoiHead, commitChuaPush, danhGia,
  fetchMoi, gitChiDoc, khoaTaiRemote, render,
} from "../scripts/state-check.mjs";
import {
  banDoVung, daDongBang, dangBiChan, locChoNguoiChot, parseBacklog, parseIdeas, songSongDuoc,
  tenNguoiChotTu, tieuDiemTuStatus, timSo, timTrongDonVi, render as renderBanDo,
} from "../scripts/what-next.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
/* MỌI phép ghim tầng mã nguồn đọc qua ĐÚNG CỬA NÀY, và cửa chuẩn hoá xuống dòng về LF.
 *
 * VÌ SAO: repo không có `.gitattributes`, nên ở máy Windows bật `core.autocrlf` thì lượt
 * `git checkout` trả file về CRLF, còn máy vừa GHI file thì để LF. Cùng MỘT commit, hai
 * dạng byte — và `git status` nói SẠCH ở cả hai. Đo thật: bản vừa ghi 52 xanh, bản vừa
 * checkout (tức bản mà BẤT KỲ AI clone repo này cũng nhận được) chết ở phép thứ 29.
 *
 * Những phép ghim này khẳng định về CẤU TRÚC MÃ — có mấy chỗ gọi tiến trình con, nhập từ
 * `node:fs` những tên nào, còn đóng cứng tên khoá vùng không. Không phép nào trong số đó
 * nói về kiểu xuống dòng. Nên chúng phải đọc CÙNG MỘT THỨ ở cả hai dạng file.
 *
 * Chuẩn hoá ở MỘT CHỖ, chứ không rắc `\r?` vào từng phép khẳng định: rắc từng chỗ thì chỗ
 * thứ tám bị quên, và triệu chứng lại đúng là cái đã cắn một lần — "phép kiểm tự nhiên hỏng".
 * Chuẩn hoá KHÔNG làm yếu phép nào: nó bỏ đi byte xuống dòng, không bỏ đi điều được khẳng định.
 */
const docNguon = (ten) => readFileSync(join(ROOT, "scripts", ten), "utf8")
  .replace(/\r\n/g, "\n");
const NGUON_STATE = docNguon("state-check.mjs");
const NGUON_NEXT = docNguon("what-next.mjs");

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

kiem("CA THẬT — khoá đã trả trên máy nhưng origin/main vẫn ghi đang giữ", () => {
  // Đây là defect sinh ra gói này. Một phiên báo "đã trả ba khoá"; trên máy đúng là trống,
  // nhưng lượt trả chưa push nên remote — chỗ AI audit và chỗ phiên khác nhìn vào — vẫn thấy
  // bị giữ. CHỦ DỰ ÁN là người bắt được, không phải hệ.
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
  d.artifact = [{ script: "bo-sinh-khong-co.mjs", khop: null, chiTiet: "không có trong repo" }];
  const r = danhGia(d);
  assert.equal(r.trangThai, TRANG_THAI.UNKNOWN);
  assert.deepEqual(r.lech, []);
  assert.match(r.khongBiet[0], /bo-sinh-khong-co\.mjs/);
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
  // Đây là luật fail-open mà bộ khung cấm: mất mạng mà báo "mọi thứ khớp" là nói dối theo
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
  // regex vắt qua hai mốc (`[\s\S]*?`) chạy tràn ra ngoài phạm vi và cho xanh giả.
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
});

kiem("bản in CẤM tự sửa bảng quyền cho khớp, và chỉ sang chủ dự án", () => {
  // Cám dỗ nguy hiểm nhất của một cổng đối chiếu: tự làm cho hai bên khớp lại. Làm thế là
  // đóng dấu hợp lệ cho vụ sửa tay và xoá luôn tang chứng.
  const ra = IN({ ...KHOP(), commitChuaPush: [{ sha: "abc1234", tieuDe: "x", lane: "claude-x" }] });
  const dong = ra.split("\n").find((l) => l.includes("bảng quyền lệch")) || "";
  assert.match(dong, /ĐỪNG tự sửa/, "phải là lời CẤM, không phải chỉ dẫn: " + dong);
  assert.match(ra, /HỎI CHỦ DỰ ÁN/);
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
  // "chưa hỏi được". Gộp hai cái đó là đúng kiểu fail-open mà bộ khung cấm.
  const loi = [];
  assert.equal(commitChuaPush(loi, { git: () => { throw new Error("unknown revision"); } }), null);
  assert.match(loi.join("\n"), /origin\/main/);
});

kiem("cặp 3 đọc được SHA, tiêu đề và nhãn Lane từ commit chưa push", () => {
  const gia = (a) => {
    if (a[0] === "rev-parse") return "731abb0\n";
    if (a[1] === "--format=%H") return "abcdef1234567\n";
    if (a.includes("--format=%s")) return "feat: mot viec\n";
    return "feat: mot viec\n\nLane: claude-exec-promoteA\n";
  };
  const ra = commitChuaPush([], { git: gia });
  assert.deepEqual(ra, [{ sha: "abcdef1", tieuDe: "feat: mot viec", lane: "claude-exec-promoteA" }]);
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
  const soLan = (NGUON_STATE.match(/"git"/g) || []).length;
  assert.equal(soLan, 1, "chỉ được có đúng một chỗ gọi tiến trình `git` trong cả file");
  // CẮT ĐÚNG THÂN HÀM rồi mới khẳng định, không dùng regex vắt qua hai mốc.
  const dau = NGUON_STATE.indexOf("export function gitChiDoc");
  const cuoi = NGUON_STATE.indexOf("/* ---- TRUNG TÂM", dau);
  assert.ok(dau > 0 && cuoi > dau, "không tìm thấy thân hàm gitChiDoc — mốc cắt đã đổi, sửa phép kiểm này");
  assert.ok(NGUON_STATE.slice(dau, cuoi).includes('"git"'), "chỗ gọi `git` duy nhất phải nằm trong gitChiDoc");
});

kiem("nguồn KHÔNG chứa một lời gọi ghi file nào", () => {
  const camGhi = /writeFileSync|appendFileSync|mkdirSync|rmSync|unlinkSync|createWriteStream|writeFile\(/;
  for (const [ten, nguon] of [["state-check", NGUON_STATE], ["what-next", NGUON_NEXT]]) {
    assert.doesNotMatch(nguon, camGhi, ten + " chỉ đọc — thấy sai lệch thì BÁO, không tự làm cho khớp");
  }
  // Nhập từ `node:fs` của state-check phải liệt kê tên, và chỉ tên đọc.
  // `import fs from "node:fs"` mở lại cả cánh cửa mà phép kiểm trên vừa đóng.
  const dongFs = NGUON_STATE.split("\n").filter((l) => l.includes("node:fs"));
  assert.deepEqual(dongFs, ['import { existsSync } from "node:fs";']);
});

kiem("nguồn chỉ sinh ĐÚNG MỘT loại tiến trình con, và đó là `--check-head`", () => {
  // Cửa `gitChiDoc` chặn được `git push`, nhưng KHÔNG chặn được một tiến trình con gọi lệnh
  // khác của repo (ví dụ một lệnh đóng dấu lại bảng quyền) — đó không phải lệnh git. Nên phải
  // đếm cả lối kia: ngoài cửa git, cả file chỉ được sinh đúng một tiến trình, và nó là phép
  // đo artifact đã có sẵn.
  const goi = NGUON_STATE.match(/execFileSync\(/g) || [];
  assert.equal(goi.length, 1, "chỉ được một lời gọi execFileSync ngoài cửa git");
  assert.match(NGUON_STATE, /execFileSync\(process\.execPath, \[file, "--check-head"\]/);
});

kiem("cặp 2 TÁI DÙNG phép đo đã có, không nhân bản", () => {
  assert.match(NGUON_STATE, /import \{[^}]*generatorsFrom[^}]*\} from "\.\/repo-structure\.mjs"/);
  assert.match(NGUON_STATE, /"--check-head"/);
});

kiem("KHÔNG ĐÓNG CỨNG một tên khoá vùng nào trong mã của cả hai lệnh", () => {
  // Đây là phép ghim cho chính việc port: tên vùng `_root`/`_docs`/`_code` là hình dạng của
  // MỘT repo, không phải hợp đồng. Ở repo khai vùng khác, một tên đóng cứng trỏ vào hư không
  // mà không ai phát hiện.
  //
  // Bỏ chú thích TRƯỚC KHI dò: hai file này CÓ nhắc `_root` trong chú thích, và đó là chỗ
  // đúng để nhắc (giải thích vì sao đã xoá). Dò cả chú thích thì phép kiểm này chỉ dạy người
  // ta xoá lời giải thích.
  const boChuThich = (s) => s
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n").map((l) => l.replace(/(^|\s)\/\/.*$/, "$1")).join("\n");
  for (const [ten, nguon] of [["state-check", NGUON_STATE], ["what-next", NGUON_NEXT]]) {
    const ma = boChuThich(nguon);
    for (const khoa of ["_root", "_docs", "_code", "_template"]) {
      assert.ok(!ma.includes('"' + khoa + '"') && !ma.includes("'" + khoa + "'"),
        ten + " còn đóng cứng tên khoá vùng `" + khoa + "` trong MÃ (không phải chú thích)");
    }
  }
});

kiem("KHÔNG còn tên gói / mã việc riêng của repo nào lọt vào hai file", () => {
  // BA MẪU ĐẦU GHÉP TỪ MẢNH, CỐ Ý — đừng viết lại thành chữ liền cho "gọn".
  // Từ bản 1.3.0 file này đi theo bản trích, mà bộ trích có một cổng từ chối MỌI file mang tên
  // dự án gốc sang repo khác. Viết thẳng ba cái tên đó vào đây thì chính cổng ấy đỏ và bộ khung
  // không phát hành được — đã đo thật 05/09, không phải lo xa. Ghép mảnh giữ NGUYÊN mẫu khớp:
  // đột biến kiểm chạy trên cả hai cách viết cho cùng một kết quả.
  const ghep = (...manh) => new RegExp(manh.join(""), "i");
  const CAM = [ghep("duc", "-auto"), ghep("gg", "-flow"), ghep("Chrome_Extension", "_AI_Agentic"),
    /\bF-\d+\b/, /\bG-\d+\b/, /\bY-\d+\b/, /ROLE-DRIFT-\d+/, /STATE-DRIFT-\d+/];
  for (const [ten, nguon] of [["state-check", NGUON_STATE], ["what-next", NGUON_NEXT]]) {
    for (const mau of CAM) {
      const moc = nguon.match(mau);
      assert.ok(!moc, ten + " còn mang dấu vết riêng của một repo: " + (moc && moc[0]));
    }
  }
});

/* ---- D. what-next: đọc sổ, ghép vùng, và chịu được thiếu file --------------- */

kiem("sổ nợ: mục mở được đọc kèm ưu tiên, mục gạch ngang bị bỏ", () => {
  const { mo, khaiSai } = parseBacklog([
    "## P1", "### A-01 · viec mot", "### ~~A-02~~ · viec hai da dong",
    "## P3", "### B-07 · viec ba",
  ].join("\n"));
  assert.deepEqual(mo.map((m) => m.ma), ["A-01", "B-07"]);
  assert.deepEqual(mo.map((m) => m.uuTien), ["P1", "P3"]);
  assert.deepEqual(khaiSai, []);
});

kiem("mục đóng bằng TỪ KHOÁ mà không gạch bị NÊU TÊN, không âm thầm bỏ qua", () => {
  // Ca thật: một mục chỉ ghi `**ĐÓNG 28/08**`. Chỉ đọc `~~` thì nó bị đếm là việc mở và bảng
  // đem đi giao cho phiên khác. Và `\b` tiếng Việt không dùng được — `\bĐÓNG` khớp rỗng.
  const { mo, khaiSai } = parseBacklog("### C-11 · viec nay **ĐÓNG 28/08**");
  assert.deepEqual(mo, []);
  assert.deepEqual(khaiSai, ["C-11"]);
});

kiem("sổ ý tưởng: bậc `nghỉ` và mục đã có `nhà:` đều rời khỏi bản đồ", () => {
  const ra = parseIdeas([
    "## Z-01 · con song", "- **bậc:** đang xây", "- **chủ:** phien-a", "- **phạm vi:** thu muc x",
    "## Z-02 · da nghi", "- **bậc:** nghỉ",
    "## Z-03 · da co nha", "- **bậc:** đang xây", "- **nhà:** docs/abc.md",
  ].join("\n"));
  assert.deepEqual(ra.map((y) => y.ma), ["Z-01"]);
  assert.equal(ra[0].chu, "phien-a");
});

kiem("KHÔNG đóng cứng tiền tố mã ý tưởng — repo nào tự chọn chữ đầu", () => {
  const ra = parseIdeas("## IDEA-9 · gi cung duoc\n- **bậc:** đang xây\n- **phạm vi:** x");
  assert.deepEqual(ra.map((y) => y.ma), ["IDEA-9"]);
});

kiem("chưa khai người chốt → trả null (KHÔNG LỌC ĐƯỢC), không phải mảng rỗng", () => {
  // Rỗng vì không có mục nào chờ, và rỗng vì không biết cách tìm, là hai chuyện khác nhau.
  // Gộp lại là bảng nói "không ai đang chờ bạn" trong khi nó chưa hề tìm.
  const muc = [{ ma: "Z-1", viecKe: "chờ Lan chốt hướng" }];
  assert.equal(locChoNguoiChot(muc, ""), null);
  assert.equal(locChoNguoiChot(muc, "   "), null);
  assert.deepEqual(locChoNguoiChot(muc, "Lan").map((m) => m.ma), ["Z-1"]);
  assert.deepEqual(locChoNguoiChot(muc, "Minh"), []);
});

kiem("lọc người chốt KHÔNG dựa vào `\\b` — chữ tiếng Việt có dấu vẫn khớp", () => {
  // `\b` dựa trên [A-Za-z0-9_], nên cạnh `Đ`/`ế` không có biên nào và regex khớp rỗng, im lặng.
  const muc = [{ ma: "Z-2", viecKe: "Đức mô tả rõ hơn" }, { ma: "Z-3", viecKe: "AI tu lam duoc" }];
  assert.deepEqual(locChoNguoiChot(muc, "Đức").map((m) => m.ma), ["Z-2"]);
});

kiem("tên người chốt đọc từ `repo.owner`, thiếu thì rỗng — không ném", () => {
  assert.equal(tenNguoiChotTu({ repo: { owner: " Lan " } }), "Lan");
  assert.equal(tenNguoiChotTu({ repo: {} }), "");
  assert.equal(tenNguoiChotTu({}), "");
  assert.equal(tenNguoiChotTu(null), "");
});

kiem("`STATUS.md` không khai next_step → không có tiêu điểm, không ném", () => {
  assert.equal(tieuDiemTuStatus("---\nlifecycle: active\n---\n"), null);
  const t = tieuDiemTuStatus("---\nlifecycle: active\nnext_step: lam viec X\npriority_rank: 2\n---\n");
  assert.equal(t.nextStep, "lam viec X");
  assert.equal(t.rank, 2);
});

kiem("repo KHÔNG có đơn vị con (`root_dir: null`) → không đi mò thư mục mặc định", () => {
  // Bản đầu viết `units.rootDir || "workers"`, nên ở repo không có `workers/` nó lặng lẽ quét
  // một thư mục không tồn tại và trả rỗng vì lý do SAI.
  let daHoi = null;
  const deps = { exists: (p) => { daHoi = p; return true; }, readDir: () => [] };
  assert.deepEqual(timTrongDonVi("/x", { rootDir: null, depth: 1 }, "BACKLOG.md", deps), []);
  assert.equal(daHoi, null, "không được hỏi đĩa một thư mục nào khi repo không khai đơn vị con");
});

kiem("sổ nợ trong THƯ MỤC VÙNG đã khai cũng được đọc, không chỉ cây đơn vị", () => {
  // Bản đầu chỉ tìm ở cây đơn vị con. Ở repo khai vùng theo THƯ MỤC (`luat/`, `may/`) mà
  // không có đơn vị con nào, mọi sổ nợ trở nên vô hình và bản đồ luôn nói "không có việc nào"
  // — sai vì lý do không ai nhìn ra được. Đo thật trên fixture repo hình dạng khác.
  const co = new Set(["/x/luat/BACKLOG.md", "/x/BACKLOG.md"]);
  const deps = { exists: (f) => co.has(f.split("\\").join("/")), readDir: () => [] };
  const ra = timSo("/x", { rootDir: null, depth: 1 },
    { areas: { "luat/": { steward: "_luat" }, "may/": { steward: "_may" }, "_doc_": "chú thích" } },
    "BACKLOG.md", deps).map((f) => f.split("\\").join("/"));
  assert.deepEqual(ra.sort(), ["/x/BACKLOG.md", "/x/luat/BACKLOG.md"]);
});

kiem("VÙNG SUY TỪ ĐƯỜNG DẪN theo `steward` đã khai, không theo tên có sẵn", () => {
  const structure = {
    areas: {
      "ho-so/": { steward: "_bangchung" },
      "may/": { steward: "_may" },
    },
  };
  const vungs = banDoVung({
    viecTheoFile: [
      { relPath: "ho-so/2026/BACKLOG.md", viec: [{ ma: "A-1", tieuDe: "x", uuTien: "P1" }] },
      { relPath: "may/BACKLOG.md", viec: [{ ma: "A-2", tieuDe: "y", uuTien: "P2" }] },
    ],
    claims: { claims: { _bangchung: { owner: null }, _may: { owner: "phien-b", claimed_at: "2026-09-04", task: "lam may" } } },
    structure,
    prefixes: [],
    now: new Date("2026-09-04T12:00Z"),
  });
  assert.deepEqual(vungs.map((v) => v.khoa).sort(), ["_bangchung", "_may"]);
  assert.deepEqual(songSongDuoc(vungs).map((v) => v.khoa), ["_bangchung"]);
  assert.deepEqual(dangBiChan(vungs).map((v) => v.khoa), ["_may"]);
});

kiem("việc thuộc khoá KHÔNG CÓ trong bảng quyền không được báo là 'sẵn sàng làm'", () => {
  // Khoá vắng mặt nghĩa là KHÔNG AI ĐANG CANH vùng đó — báo nó là "trống chủ, cứ làm" là mời
  // hai phiên vào ghi cùng lúc mà không gì chặn. Ca này lộ ra ở repo khai tên vùng khác hẳn.
  const vungs = banDoVung({
    viecTheoFile: [{ relPath: "la/x/BACKLOG.md", viec: [{ ma: "A-1", tieuDe: "x", uuTien: "P1" }] }],
    claims: { claims: { _may: { owner: null } } },
    structure: { areas: { "la/": { steward: "_la" } } },
    prefixes: [],
  });
  const la = vungs.find((v) => v.khoa === "_la");
  assert.ok(la, "vùng suy ra từ đường dẫn vẫn phải hiện");
  assert.equal(la.khongCoTrongBang, true);
  assert.deepEqual(songSongDuoc(vungs), [], "không được xếp vào danh sách chạy song song");
  const ra = renderBanDo({ vungs, ideas: [], now: new Date("2026-09-04T00:00Z"), tenNguoiChot: "Lan" });
  assert.match(ra, /bảng quyền KHÔNG có khoá đó/);
  assert.match(ra, /`_la`/);
});

kiem("bảng quyền RỖNG → bản đồ vẫn in được, mục A và B đều nói rõ là rỗng", () => {
  const ra = renderBanDo({ vungs: [], ideas: [], now: new Date("2026-09-04T00:00Z"), tenNguoiChot: "Lan" });
  assert.match(ra, /A · CHẠY SONG SONG ĐƯỢC NGAY — 0 luồng/);
  assert.match(ra, /B · ĐANG CÓ CHỦ — 0 vùng/);
  assert.match(ra, /C · ĐANG CHỜ NGƯỜI CHỐT — 0 mục/);
});

kiem("chưa khai người chốt → mục C nói KHÔNG LỌC ĐƯỢC, không in danh sách rỗng", () => {
  const ra = renderBanDo({ vungs: [], ideas: [{ ma: "Z-1", viecKe: "chờ Lan", bac: "", chu: "", phamVi: "", nha: "" }], now: new Date("2026-09-04T00:00Z"), tenNguoiChot: "" });
  assert.match(ra, /KHÔNG LỌC ĐƯỢC/);
  assert.match(ra, /repo\.owner/);
  assert.doesNotMatch(ra, /ĐANG CHỜ NGƯỜI CHỐT — 0 mục/);
});

kiem("artifactSoVoiHead: bộ sinh đã khai mà KHÔNG có file → khop null, không ném", () => {
  const ra = artifactSoVoiHead(["khong-he-ton-tai.mjs"], mkdtempSync(join(tmpdir(), "ark-trong-")));
  assert.equal(ra.length, 1);
  assert.equal(ra[0].khop, null);
  assert.match(ra[0].chiTiet, /KHÔNG có trong repo/);
});

/* ---- E. REPO THẬT, HÌNH DẠNG KHÁC HẲN — phép thử của việc port -------------
 *
 * Cố tình khác repo nhà ở SÁU chỗ, mỗi chỗ là một cách gói này có thể chỉ-chạy-được-ở-nhà:
 *   1. tên khoá vùng khác hẳn (`_luat`, `_may`, `_bangchung`) — KHÔNG có `_root`/`_docs`/`_code`
 *   2. `units.root_dir: null` — không có thư mục đơn vị con nào
 *   3. không có `IDEAS.md`
 *   4. không có `BACKLOG.md`
 *   5. không có `STATUS.md`
 *   6. KHÔNG CÓ remote `origin` — ca này phải ra `UNKNOWN`, không được ra `OK`
 */
{
  const kho = mkdtempSync(join(tmpdir(), "ark-fixture-la-"));
  const git = (...a) => execFileSync("git", a, { cwd: kho, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  try {
    git("init", "--quiet", "--initial-branch=main");
    git("config", "user.email", "fixture@example.invalid");
    git("config", "user.name", "fixture");
    git("config", "commit.gpgsign", "false");

    mkdirSync(join(kho, "scripts"), { recursive: true });
    mkdirSync(join(kho, ".agents"), { recursive: true });
    for (const f of ["state-check.mjs", "what-next.mjs", "claim.mjs", "repo-structure.mjs", "build-dashboard.mjs"]) {
      copyFileSync(join(ROOT, "scripts", f), join(kho, "scripts", f));
    }
    writeFileSync(join(kho, "package.json"), JSON.stringify({ name: "kho-ho-so", private: true, type: "module" }, null, 2), "utf8");
    writeFileSync(join(kho, ".repo-structure.json"), JSON.stringify({
      schema_version: 1,
      repo: { name: "Kho Hồ Sơ", tagline: null, owner: "Lan" },
      profile: "P3",
      units: { root_dir: null, marker: "package.json", depth: 1, ten: "Hồ sơ" },
      areas: {
        "luat/": { steward: "_luat", mutability: "rw", ownership_mode: "root" },
        "may/": { steward: "_may", mutability: "rw", ownership_mode: "root" },
        "ho-so/": { steward: "_bangchung", mutability: "append-only", ownership_mode: "root" },
      },
      // KHAI MỘT BỘ SINH CHƯA CÓ FILE: cặp 2 phải thành "không đo được", không phải
      // "không có gì lệch". Đây là ca thật của một repo đang giữa đường migrate.
      generators: ["bo-sinh-chua-co.mjs"],
      generated: [],
      grandfathered: [],
      bootstrap: { blocking: [] },
    }, null, 2) + "\n", "utf8");
    writeFileSync(join(kho, ".agents", "claims.json"), JSON.stringify({
      claims: {
        _luat: { owner: null, ai: null, claimed_at: null, task: null, released_at: null },
        _may: { owner: "phien-kho-la", ai: null, claimed_at: "2026-09-04", task: "sua bo may", released_at: null },
        _bangchung: { owner: null, ai: null, claimed_at: null, task: null, released_at: null },
      },
    }, null, 2) + "\n", "utf8");
    // Sổ nợ nằm trong THƯ MỤC VÙNG, không ở cây đơn vị con — repo này không có đơn vị con nào.
    mkdirSync(join(kho, "luat"), { recursive: true });
    mkdirSync(join(kho, "may"), { recursive: true });
    writeFileSync(join(kho, "luat", "BACKLOG.md"), "## P1\n### L-01 · sua mot cau luat\n", "utf8");
    writeFileSync(join(kho, "may", "BACKLOG.md"), "## P2\n### M-04 · viec cua bo may\n", "utf8");
    git("add", "-A");
    git("commit", "--quiet", "-m", "fixture: kho ho so hinh dang khac\n\nLane: fixture");

    const chay = (script) => spawnSync(process.execPath, [join(kho, "scripts", script)], { cwd: kho, encoding: "utf8" });

    kiem("FIXTURE · what-next chạy được ở repo tên vùng khác, không đơn vị, thiếu cả ba sổ", () => {
      const r = chay("what-next.mjs");
      assert.equal(r.status, 0, "phải chạy được, stderr: " + r.stderr);
      assert.equal(r.stderr.trim(), "", "không được ném lỗi vì thiếu file: " + r.stderr);
      // Ba khoá của repo LẠ phải hiện, và khoá của repo nhà tuyệt đối KHÔNG được hiện.
      for (const k of ["_luat", "_may"]) assert.ok(r.stdout.includes(k), "thiếu khoá " + k);
      for (const k of ["_root", "_docs", "_code"]) assert.ok(!r.stdout.includes(k), "lọt khoá của repo nhà: " + k);
      // `_luat` trống chủ và CÓ việc → phải nằm ở mục A; `_may` có chủ → mục B, chỉ đọc.
      assert.match(r.stdout, /A · CHẠY SONG SONG ĐƯỢC NGAY — 1 luồng/);
      assert.match(r.stdout, /▸ _luat {2}— 1 việc mở/);
      assert.match(r.stdout, /P1 {2}L-01/);
      assert.match(r.stdout, /_may {2}← phien-kho-la/);
      assert.match(r.stdout, /1 việc mở trong vùng này — KHÔNG giao cho phiên khác/);
      // Người chốt khai trong cấu hình → mục C lọc được, không báo "KHÔNG LỌC ĐƯỢC".
      assert.doesNotMatch(r.stdout, /KHÔNG LỌC ĐƯỢC/);
    });

    kiem("FIXTURE · VẮNG REMOTE → state-check ra UNKNOWN, mã thoát 2 — KHÔNG ra OK", () => {
      // Đây là điều kiện nghiệm thu quan trọng nhất của việc port: fail-open ở đây nghĩa là
      // mất mạng được báo cáo như tin tốt.
      const r = chay("state-check.mjs");
      assert.equal(r.status, MA_THOAT[TRANG_THAI.UNKNOWN], "mã thoát phải là 2 (UNKNOWN), đang là " + r.status);
      assert.match(r.stdout, /^STATE UNKNOWN/);
      assert.ok(!r.stdout.includes("STATE OK"), "vắng remote KHÔNG được báo là OK");
      // Cả ba cặp đều phải nói ra là không đối chiếu được, không cặp nào bị nuốt.
      assert.match(r.stdout, /Cặp 1/);
      assert.match(r.stdout, /Cặp 2/);
      assert.match(r.stdout, /Cặp 3/);
      assert.match(r.stdout, /KHÔNG BIẾT không phải là KHỚP/);
    });

    kiem("FIXTURE · CẤU HÌNH HỎNG → state-check vẫn ra UNKNOWN, KHÔNG chết với vết ngăn xếp", () => {
      // Bản đầu gọi `generatorsFrom` không bọc, nên `generators: []` làm cả lệnh chết với mã
      // thoát 1 — tức nó BÁO CÓ SAI LỆCH trong khi thật ra chưa nhìn được gì. Ca này bắt được
      // trên chính fixture này, không phải suy luận.
      const cau = join(kho, ".repo-structure.json");
      const luu = readFileSync(cau, "utf8");
      writeFileSync(cau, luu.replace('"bo-sinh-chua-co.mjs"', ""), "utf8");
      try {
        const r = chay("state-check.mjs");
        assert.equal(r.status, MA_THOAT[TRANG_THAI.UNKNOWN], "cấu hình hỏng phải ra 2 (UNKNOWN), đang là " + r.status);
        assert.match(r.stdout, /^STATE UNKNOWN/);
        assert.match(r.stdout, /danh sách bộ sinh/);
      } finally { writeFileSync(cau, luu, "utf8"); }
    });

    kiem("FIXTURE · vắng bảng quyền hẳn thì cả hai lệnh vẫn chạy, và nói rõ là không đọc được", () => {
      rmSync(join(kho, ".agents", "claims.json"));
      const bd = chay("what-next.mjs");
      assert.equal(bd.status, 0, "bản đồ việc phải chạy được dù không có bảng quyền: " + bd.stderr);
      assert.match(bd.stdout, /Không đọc được bảng quyền/);
      const st = chay("state-check.mjs");
      assert.equal(st.status, MA_THOAT[TRANG_THAI.UNKNOWN]);
      assert.match(st.stdout, /^STATE UNKNOWN/);
    });
  } finally {
    rmSync(kho, { recursive: true, force: true });
  }
}

/* ---- CO "CHO NGUOI CHOT" trong so no -------------------------------------
 *
 * CA HONG DA XAY RA THAT, 05/09: muc C cua ban do CHI doc so y tuong (IDEAS.md). Repo khong co
 * so do thi muc C in ra "0 muc, khong ai lam thay duoc" — tuc KHANG DINH da kiem va khong co gi —
 * trong khi so no dang co HAI muc can nguoi chot. Nguoi chot doc bang roi tin minh khong phai
 * quyet gi. Do that o repo nha: 2 muc cho chot, bang bao 0.
 *
 * CO KHAI TUONG MINH, KHONG DO TEN TRONG VAN XUOI. Ban cu lay ten nguoi chot roi tim ten do
 * trong truong "viec ke" — doi cach xung ho mot chu la muc bien mat, va khong ai biet. */
kiem("so no: co CHO NGUOI CHOT khai tuong minh, van xuoi khong trung, khong dinh sang muc sau", () => {
  const { mo } = parseBacklog([
    "## P1",
    "### K-1 · muc can quyet",
    "> **CHỜ NGƯỜI CHỐT:** chon mot trong ba loi",
    "### K-2 · muc thuong",
    "van xuoi noi viec nay cho nguoi chot quyet, nhung KHONG phai dong khai",
    "### K-3 · muc thuong khac",
  ].join(String.fromCharCode(10)));

  assert.equal(mo.length, 3, "phai doc du ba muc");
  assert.equal(mo[0].choChot, true, "K-1 khai co tuong minh -> phai la cho chot");
  // VE DOI CHUNG, va khong co no thi ve tren vo nghia: van xuoi KHONG duoc tinh la co.
  assert.equal(mo[1].choChot, false, "K-2 chi co van xuoi -> KHONG duoc tinh la cho chot");
  assert.equal(mo[2].choChot, false, "K-3 khong co gi -> khong phai cho chot");

  // Co cua muc truoc KHONG duoc dinh sang muc sau.
  const { mo: m2 } = parseBacklog([
    "### A-1 · a", "> **CHỜ NGƯỜI CHỐT:** x", "### A-2 · b",
  ].join(String.fromCharCode(10)));
  assert.equal(m2[0].choChot, true, "A-1 phai co co");
  assert.equal(m2[1].choChot, false, "co KHONG duoc dinh sang muc ke tiep");
});
/* ---- GÓI ĐÓNG BĂNG KHÔNG ĐƯỢC NẰM Ở MỤC "LÀM ĐƯỢC NGAY" -------------------
 *
 * Ca thật 2026-09-08 ở repo tiêu thụ: bảng này xếp một gói chủ dự án ĐÃ ĐÓNG BĂNG vào mục
 * "chạy song song được ngay", hạng ưu tiên #2, 22 việc mở — vì nó không đọc khối `frozen`
 * trong khi cổng đóng phiên có đọc. Hai công cụ của cùng một repo nói ngược nhau, và cái nói
 * sai lại chính là cái AI đọc để CHỌN việc.
 *
 * Ghim CẢ BA vế, vì hai vế đầu mà thiếu vế ba thì cách "sửa" rẻ nhất là ẩn hẳn gói đi — và
 * ẩn hẳn làm nợ của gói đó vô hình với người đọc. */
kiem("gói đóng băng: ra khỏi mục A, vào mục riêng, và KHÔNG biến mất", () => {
  const chung = {
    viecTheoFile: [
      { relPath: "goi/song/BACKLOG.md", viec: [{ ma: "X-1", tieuDe: "viec that", uuTien: "P1" }] },
      { relPath: "goi/da-dong/BACKLOG.md", viec: [{ ma: "X-2", tieuDe: "no cu", uuTien: "P1" }] },
    ],
    claims: { claims: { "goi/song": { owner: null }, "goi/da-dong": { owner: null } } },
    structure: { areas: { "goi/": { ownership_mode: "per-package", claim_prefix: "goi/" } } },
    prefixes: ["goi/"],
  };

  // Đối chứng: KHÔNG khai đóng băng thì cả hai vùng đều nằm ở mục A. Thiếu vế này thì một hàm
  // luôn trả rỗng cũng làm ca dưới xanh.
  const chuaKhai = songSongDuoc(banDoVung({ ...chung, frozen: [] }));
  assert.deepEqual(chuaKhai.map((v) => v.khoa).sort(), ["goi/da-dong", "goi/song"],
    "chua khai dong bang thi ca hai vung deu la viec lam duoc ngay");

  const vungs = banDoVung({ ...chung, frozen: ["goi/da-dong"] });
  assert.deepEqual(songSongDuoc(vungs).map((v) => v.khoa), ["goi/song"],
    "goi da dong bang KHONG duoc nam o muc 'lam duoc ngay', du no trong chu");
  assert.deepEqual(daDongBang(vungs).map((v) => v.khoa), ["goi/da-dong"],
    "no phai hien o muc rieng — an han thi no cua goi do vo hinh");
  assert.equal(daDongBang(vungs)[0].viec.length, 1, "viec mo cua goi dong bang van phai dem duoc");

  // Đóng băng một gói KHÔNG được kéo theo gói có tên bắt đầu giống nó.
  const cungTienTo = banDoVung({ ...chung, frozen: ["goi/so"] });
  assert.deepEqual(songSongDuoc(cungTienTo).map((v) => v.khoa).sort(), ["goi/da-dong", "goi/song"],
    "`goi/so` KHONG duoc dong bang `goi/song` — so tien to phai theo ranh gioi thu muc");
});

console.log(`\n${so} passed, 0 failed, ${so} total`);
