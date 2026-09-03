/* Phép ghim cho `scripts/what-next.mjs`.
 *
 * Mọi phép dưới đây dựng ca hỏng bằng CHUỖI, không bằng repo thật — repo thật đổi mỗi
 * phiên, nên một phép kiểm dựa vào nó sẽ xanh/đỏ theo việc người khác làm, chứ không theo
 * code này. Ba phép kiểm trong repo này đã từng xanh một cách vô nghĩa vì lý do đó.
 *
 * Mỗi phép ghim một lỗi ĐÃ XẢY RA THẬT trong lúc viết file, không phải lỗi tưởng tượng.
 */

import assert from "node:assert/strict";

import { banDoVung, dangBiChan, locChoDuc, parseBacklog, parseIdeas, render, songSongDuoc, tieuDiemTuStatus } from "../scripts/what-next.mjs";

let so = 0;
const kiem = (ten, fn) => { fn(); so += 1; console.log("  ok  " + ten); };

/* --- parseBacklog ------------------------------------------------------------ */

kiem("mục thường được đọc, kèm ưu tiên của khối P đang mở", () => {
  const doc = parseBacklog(["## P1 — Chặn vòng tự hành", "", "### G-01 · Lệnh dừng ăn muộn — **[ĐỌC]**", "văn xuôi", "## P3 — Khi rảnh", "### G-09 · Suite gốc không chạy"].join("\n"));
  assert.deepEqual(doc.mo.map((v) => [v.ma, v.uuTien]), [["G-01", "P1"], ["G-09", "P3"]]);
  assert.equal(doc.mo[0].tieuDe, "Lệnh dừng ăn muộn — [ĐỌC]");
});

kiem("mục gạch ngang là đóng, KHÔNG vào danh sách mở", () => {
  const doc = parseBacklog("### ~~B-01 · Khoá tab lúc Run~~ — ĐÃ ĐÓNG `55b47`");
  assert.deepEqual(doc.mo, []);
  assert.deepEqual(doc.khaiSai, []); // đã gạch đúng quy ước, nên không phải khai sai
});

kiem("ĐÓNG mà KHÔNG gạch: bị loại khỏi mở, VÀ bị nêu tên — ca G-11 thật", () => {
  // Lỗi đã xảy ra: bản đầu viết `\b(ĐÓNG)\b`, mà `\b` dựa trên [A-Za-z0-9_] nên không tạo
  // được biên trước `Đ`. G-11 lọt vào danh sách mở, và bảng đem việc đã xong đi giao lại.
  const doc = parseBacklog("### G-11 · Đo live bản trần 5 giây — **ĐÓNG 28/08** ✅");
  assert.deepEqual(doc.mo, [], "mục đã đóng không được coi là việc mở");
  assert.deepEqual(doc.khaiSai, ["G-11"], "phải nêu tên để người sửa lại cho đúng quy ước");
});

kiem("chữ đóng viết thường trong tiêu đề KHÔNG làm mục biến mất", () => {
  // Lưới hứng cố ý chỉ nhận IN HOA. Nếu nhận cả chữ thường thì một việc mở tên
  // "Cổng đóng phiên bắt oan" sẽ tự biến mất khỏi bảng — mất việc, không ai biết.
  const doc = parseBacklog("### B-30 · Cổng đóng phiên bắt oan phiên này vì file rác");
  assert.deepEqual(doc.mo.map((v) => v.ma), ["B-30"]);
});

/* --- parseIdeas -------------------------------------------------------------- */

const SO_Y = [
  "## Y-01 · MVP: dùng Claude Code điều phối GPT",
  "- **bậc:** ý tưởng",
  "- **việc kế:** Đức mô tả rõ hơn phạm vi thử",
  "## Y-04 · Bảng trạng thái sinh ngay trong repo",
  "- **bậc:** đã chứng minh",
  "- **việc kế:** Không còn gì",
  "- **nhà:** `scripts/build-overview.mjs`",
  "## Y-06 · Một ý đã bị bác",
  "- **bậc:** nghỉ",
  "- **việc kế:** không",
  "## Y-02 · Protocol làm nhiều việc song song",
  "- **bậc:** đang xây",
  "- **chủ:** `claude-y02`",
  "- **phạm vi:** `scripts/claim.mjs` · CẤM đụng `session-check.mjs`",
  "- **việc kế:** hai vấn đề cần Đức chọn một câu",
].join("\n");

kiem("ý tưởng đã có nhà, và ý tưởng đã nghỉ, đều rời bảng", () => {
  const y = parseIdeas(SO_Y);
  assert.deepEqual(y.map((i) => i.ma), ["Y-01", "Y-02"]);
});

kiem("bốn trường được đọc đúng chỗ", () => {
  const y2 = parseIdeas(SO_Y).find((i) => i.ma === "Y-02");
  assert.equal(y2.bac, "đang xây");
  assert.equal(y2.chu, "`claude-y02`");
  assert.match(y2.phamVi, /CẤM đụng/);
});

kiem("chờ Đức đọc `việc kế`, không đọc tiêu đề", () => {
  // Hai lỗi thật, ngược chiều nhau:
  // (a) bản đầu liệt kê động từ (`cần Đức|chờ Đức|Đức chốt`) và BỎ SÓT Y-01 ("Đức mô tả");
  // (b) nếu quét cả tiêu đề thì Y-03 ("Trường Đức cần làm…") vào danh sách chờ Đức oan,
  //     dù bước kế của nó là việc của AI.
  const cho = locChoDuc(parseIdeas(SO_Y));
  assert.deepEqual(cho.map((i) => i.ma), ["Y-01", "Y-02"]);
  const oan = locChoDuc([{ ma: "Y-03", tieuDe: "Trường Đức cần làm trong hồ sơ", viecKe: "chuyển human_action thành bắt buộc" }]);
  assert.deepEqual(oan, [], "tiêu đề nhắc Đức không có nghĩa là đang chờ Đức");
});

/* --- banDoVung + song song --------------------------------------------------- */

const CAU_TRUC = {
  units: { root_dir: "workers", marker: "manifest.json", depth: 2 },
  areas: {
    "docs/": { steward: "_docs" },
    "scripts/": { steward: "_code" },
    "workers/": { steward: null, ownership_mode: "per-package", claim_prefix: "workers/" },
  },
};
const CLAIMS = {
  claims: {
    _root: { owner: "phien-a", claimed_at: "2026-09-03T10:00", task: "một việc" },
    _code: { owner: null },
    "workers/duc-auto-gemini": { owner: null },
    "workers/duc-auto-chatgpt": { owner: "phien-b", claimed_at: "2026-09-01T10:00", task: "việc khác" },
  },
};
const banDo = (viecTheoFile) => banDoVung({
  viecTheoFile, claims: CLAIMS, structure: CAU_TRUC, prefixes: ["workers/"], now: new Date("2026-09-03T12:00"),
});

kiem("vùng của một việc SUY từ đường dẫn sổ nợ, không khai tay", () => {
  const v = banDo([{ relPath: "workers/duc-auto-gemini/v0.2.0/BACKLOG.md", viec: [{ ma: "G-01", uuTien: "P1", tieuDe: "x" }] }]);
  const gemini = v.find((x) => x.khoa === "workers/duc-auto-gemini");
  assert.deepEqual(gemini.viec.map((w) => w.ma), ["G-01"]);
});

kiem("vùng đang bị giữ vẫn hiện dù không mục nợ nào trỏ tới", () => {
  // Nếu chỉ dựng vùng từ sổ nợ thì `_root` (đang bị giữ, không có BACKLOG.md nào)
  // sẽ vô hình — đúng với người cần biết nhất: người vừa mất khoá.
  const v = banDo([]);
  assert.ok(v.find((x) => x.khoa === "_root"), "_root phải hiện");
  assert.deepEqual(dangBiChan(v).map((x) => x.khoa), ["_root", "workers/duc-auto-chatgpt"]);
});

kiem("song song = khoá TRỐNG và CÓ việc mở; thiếu một vế thì không tính", () => {
  const v = banDo([
    { relPath: "workers/duc-auto-gemini/v0.2.0/BACKLOG.md", viec: [{ ma: "G-01", uuTien: "P1", tieuDe: "x" }] },
    { relPath: "workers/duc-auto-chatgpt/v0.1.0/BACKLOG.md", viec: [{ ma: "B-02", uuTien: "P1", tieuDe: "y" }] },
  ]);
  // gemini: trống + có việc → tính. chatgpt: có việc nhưng CÓ CHỦ → không tính.
  // _code: trống nhưng KHÔNG việc mở → không tính (trống không phải là việc).
  assert.deepEqual(songSongDuoc(v).map((x) => x.khoa), ["workers/duc-auto-gemini"]);
});

kiem("giữ quá ngưỡng thì IN cờ, và chỉ ở vùng quá ngưỡng", () => {
  const v = banDo([]);
  assert.ok(v.find((x) => x.khoa === "workers/duc-auto-chatgpt").gio > 6, "giữ từ 01/09 tới 03/09 là quá ngưỡng");
  assert.ok(v.find((x) => x.khoa === "_root").gio < 6, "giữ 2 giờ thì chưa");
  // Đo giá trị `gio` là chưa đủ: bỏ hẳn điều kiện in cờ trong render thì phép kiểm cũ vẫn
  // xanh (mutation "ngưỡng giờ nhắc bị nới" thoát đúng vì thế). Cờ phải được kiểm Ở CHỖ
  // người đọc thấy nó — từng DÒNG, không phải cả trang: cả trang thì một chữ ⚠ ở phần chú
  // giải cuối cũng làm khẳng định xanh, bất kể vùng nào bị gắn cờ.
  const dong = render({ vungs: v, ideas: [], now: new Date("2026-09-03T12:00") }).split("\n");
  const cuaVung = (khoa) => dong.find((l) => l.includes("▸ " + khoa + "  ←")) || "";
  assert.match(cuaVung("workers/duc-auto-chatgpt"), /⚠/, "vùng giữ 2 ngày phải có cờ");
  assert.doesNotMatch(cuaVung("_root"), /⚠/, "vùng giữ 2 giờ thì không được có cờ");
});

/* --- tiêu điểm từ STATUS: nguồn việc thứ hai -------------------------------- */

const STATUS_FLOW = [
  "---",
  "schema: extension-status/v2",
  "lifecycle: building",
  "priority_rank: 1",
  'next_step: "F-25 (vong chay chet am tham) — chua giai"',
  "---",
  "# STATUS",
].join("\n");

kiem("đọc được next_step và thứ hạng ưu tiên từ STATUS", () => {
  const t = tieuDiemTuStatus(STATUS_FLOW);
  assert.equal(t.rank, 1);
  assert.match(t.nextStep, /F-25/);
});

kiem("STATUS không khai next_step thì không đẻ ra tiêu điểm rỗng", () => {
  assert.equal(tieuDiemTuStatus("---\nlifecycle: idea\n---\n"), null);
});

kiem("gói có 0 mục nợ nhưng CÓ tiêu điểm vẫn hiện ở danh sách song song", () => {
  // Ca thật: `workers/duc-auto-gg-flow-video` có 0 mục nợ trong BACKLOG, còn F-25 — việc
  // ưu tiên #1 của cả repo — chỉ nằm ở `next_step`. Bản đầu lọc theo `viec.length > 0` nên
  // gói đó biến mất khỏi bản đồ đúng lúc nó là việc quan trọng nhất.
  const v = banDoVung({
    viecTheoFile: [{ relPath: "workers/duc-auto-gemini/v0.2.0/BACKLOG.md", viec: [] }],
    tieuDiemTheoFile: [{ relPath: "workers/duc-auto-gemini/v0.2.0/STATUS.md", tieuDiem: tieuDiemTuStatus(STATUS_FLOW) }],
    claims: CLAIMS, structure: CAU_TRUC, prefixes: ["workers/"], now: new Date("2026-09-03T12:00"),
  });
  assert.deepEqual(songSongDuoc(v).map((x) => x.khoa), ["workers/duc-auto-gemini"]);
  assert.match(render({ vungs: v, ideas: [], now: new Date("2026-09-03T12:00") }), /F-25/);
});

kiem("tiêu điểm KHÔNG bị cộng vào số mục nợ", () => {
  // Hai loại dữ liệu khác nhau. Gộp số là đếm một việc hai lần, và con số đó sẽ được
  // ai đó trích lại vào tài liệu — số sai thì đi rất xa.
  const v = banDoVung({
    viecTheoFile: [{ relPath: "workers/duc-auto-gemini/v0.2.0/BACKLOG.md", viec: [{ ma: "G-01", uuTien: "P1", tieuDe: "x" }] }],
    tieuDiemTheoFile: [{ relPath: "workers/duc-auto-gemini/v0.2.0/STATUS.md", tieuDiem: tieuDiemTuStatus(STATUS_FLOW) }],
    claims: CLAIMS, structure: CAU_TRUC, prefixes: ["workers/"], now: new Date("2026-09-03T12:00"),
  });
  assert.match(render({ vungs: v, ideas: [], now: new Date("2026-09-03T12:00") }), /— 1 việc mở/);
});

kiem("vùng ưu tiên #1 xếp trên vùng không khai thứ hạng", () => {
  const v = banDoVung({
    viecTheoFile: [],
    tieuDiemTheoFile: [
      { relPath: "workers/duc-auto-gemini/v0.2.0/STATUS.md", tieuDiem: { nextStep: "sau", rank: null } },
      { relPath: "workers/duc-auto-chatgpt/v0.1.0/STATUS.md", tieuDiem: tieuDiemTuStatus(STATUS_FLOW) },
    ],
    claims: CLAIMS, structure: CAU_TRUC, prefixes: ["workers/"], now: new Date("2026-09-03T12:00"),
  });
  assert.equal(v[0].khoa, "workers/duc-auto-chatgpt", "vùng khai ưu tiên #1 phải lên đầu");
  // Xếp đúng thứ tự là chưa đủ: thứ hạng phải HIỆN RA. Không hiện thì Đức đọc bảng không
  // biết vì sao dòng này nằm trên dòng kia, và phải mở STATUS mới biết — đúng cái bảng này
  // sinh ra để khỏi phải làm. Bỏ nhãn khỏi render từng thoát phép thử phá vì thiếu dòng này.
  assert.match(render({ vungs: v, ideas: [], now: new Date("2026-09-03T12:00") }), /\[ưu tiên #1\]/);
});

/* --- render ------------------------------------------------------------------ */

kiem("bảng in ra nói được cả ba điều: song song, bị chặn, chờ Đức", () => {
  const v = banDo([{ relPath: "workers/duc-auto-gemini/v0.2.0/BACKLOG.md", viec: [{ ma: "G-01", uuTien: "P1", tieuDe: "Lệnh dừng ăn muộn" }] }]);
  const ra = render({ vungs: v, ideas: parseIdeas(SO_Y), now: new Date("2026-09-03T12:00"), khaiSai: ["G-11"] });
  assert.match(ra, /CHẠY SONG SONG ĐƯỢC NGAY — 1 luồng/);
  assert.match(ra, /G-01/);
  assert.match(ra, /phien-b/, "phải nói ai đang giữ vùng bị chặn");
  assert.match(ra, /ĐANG CHỜ ĐỨC — 2 mục/);
  assert.match(ra, /G-11/, "mục khai sai phải hiện lên đầu bảng");
});

kiem("không có việc song song thì nói thẳng, không im lặng bỏ trống mục", () => {
  const ra = render({ vungs: banDo([]), ideas: [], now: new Date("2026-09-03T12:00") });
  assert.match(ra, /không có: mọi vùng có việc mở đều đang có chủ/);
});

console.log("\nwhat-next-smoke: " + so + "/" + so + " xanh");
