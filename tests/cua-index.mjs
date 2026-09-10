/* PHÉP GHIM CHO CỬA INDEX — KHUNG-59.
 *
 * CA HỎNG THẬT, hai lượt trong ngày 10/09, hai chiều ngược nhau, hai lane khác nhau: một cây
 * làm việc git có ĐÚNG MỘT index, nên giữa `git add` của lane A và `git commit` của lane A, bất
 * kỳ `git commit` nào của lane B cũng gom trọn mẻ của A vào commit của B. Không mất nội dung —
 * mất TRUY NGUỒN, đúng thứ nhãn `Lane:` sinh ra để giữ.
 *
 * VÌ SAO FILE NÀY CHẠM ĐĨA, khác `tests/khoa-file.mjs` (mọi vế ở đó là hàm thuần): thứ phải ghim
 * ở đây là HÀNH VI CỦA GIT, không phải một quyết định của ta. Một vế thuần chỉ chứng minh hàm
 * `cuaIndex` phân loại đúng — nó KHÔNG chứng minh git gọi hook, không chứng minh hook thấy đúng
 * mẻ, không chứng minh commit bị huỷ. Đó là "phép ghim không phân biệt được hai nhánh".
 *
 * ĐO ĐƯỢC 10/09 trên fixture rời: git đặt `GIT_INDEX_FILE` sang index TẠM cho cả
 * `commit --only` và `commit -a`, nên `git diff --cached` trong `commit-msg` thấy đúng mẻ sắp
 * vào commit. Hook thoát khác 0 thì commit bị huỷ VÀ index còn nguyên.
 *
 * BỐN VẾ CUỐI (3e · 3f · 3g · 5) SINH TỪ MỘT VÒNG AUDIT ĐỘC LẬP 10/09, không từ tôi đọc lại
 * code. Cả bốn là fail-open THẬT trong bản đầu của tôi. Danh sách đột biến đã chạy ở CUỐI file.
 *
 * FIXTURE TỰ DỰNG, không mượn repo nhà: vế ở đây phải chạy được ở repo tiêu thụ.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { cuaIndex, EXIT, soatDanHang, xetCuaIndex } from "../scripts/claim.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let so = 0;
const ok = (t) => { so += 1; console.log(`  ok  ${t}`); };
const vungCua = (d) => (d.startsWith("scripts/") ? "_code" : "_root");
const LUC = "2026-09-10T10:00:00.000Z";

/* ---- 1. HÀM THUẦN: cửa index HẸP HƠN `--soat`, và hẹp đúng chỗ ----------
 *
 * Vế này ghim MỘT QUYẾT ĐỊNH: file vô chủ được qua cửa. Bỏ nó thì cửa chặn cả lượt commit hợp
 * lệ của lane quên nhận khoá, và một cửa chặn oan sẽ bị mở `--no-verify` cho mọi lượt. */
{
  const doiSo = {
    daDan: ["scripts/cua-toi.mjs", "scripts/cua-ho.mjs", "vo-chu.md"],
    tam: { "scripts/cua-toi.mjs": { owner: "lane-a", luc: LUC }, "scripts/cua-ho.mjs": { owner: "lane-b", luc: LUC } },
    claims: {},
    as: "lane-a",
    mienKhoa: [],
    maySinh: [],
    vungCua,
  };
  const hep = cuaIndex(doiSo).map((x) => x.duongDan);
  assert.deepEqual(hep, ["scripts/cua-ho.mjs"], "cua index chi chan file CO CHU va chu khong phai toi");

  // ĐỐI CHIẾU trong cùng một vế: `--soat` rộng hơn — nó cũng chặn file vô chủ. Hai cửa khác
  // nhau là CHỦ Ý; ghim cả hai cạnh nhau để phiên sau không "thống nhất" chúng lại.
  const rong = soatDanHang(doiSo).la.map((x) => x.duongDan);
  assert.deepEqual(rong, ["scripts/cua-ho.mjs", "vo-chu.md"], "--soat van rong hon: file vo chu cung bi chan");
  ok("1 · cửa index chặn ĐÚNG file có chủ khác · file vô chủ qua · `--soat` vẫn rộng hơn");
}

/* ---- 2. Cửa index chặn theo KHOÁ VÙNG, không chỉ khoá file --------------- */
{
  const la = cuaIndex({
    daDan: ["scripts/x.mjs"],
    tam: {},
    claims: { _code: { owner: "lane-b" } },
    as: "lane-a",
    mienKhoa: [], maySinh: [], vungCua,
  });
  assert.equal(la.length, 1);
  assert.equal(la[0].chuVung, "lane-b");

  // Chính tôi giữ vùng: qua.
  assert.deepEqual(cuaIndex({
    daDan: ["scripts/x.mjs"], tam: {}, claims: { _code: { owner: "lane-a" } },
    as: "lane-a", mienKhoa: [], maySinh: [], vungCua,
  }), []);
  ok("2 · vùng của lane khác cũng chặn · vùng của chính mình thì qua");
}

/* ---- 3. FIXTURE GIT THẬT — các ca của ngày 10/09 ------------------------ */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ark-cua-index-"));
const g = (...a) => execFileSync("git", a, { cwd: tmp, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
const commit = (msg, ...them) => {
  try {
    return { ma: 0, ra: execFileSync("git", ["commit", ...them, "-m", msg], { cwd: tmp, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }) };
  } catch (e) {
    return { ma: e.status ?? 1, ra: `${e.stdout || ""}${e.stderr || ""}` };
  }
};
const daDan = () => g("diff", "--cached", "--name-only").split("\n").map((x) => x.trim()).filter(Boolean);
const bang = (tam) => {
  const noi = { claims: { _code: { owner: null }, _root: { owner: null } }, tam };
  fs.writeFileSync(path.join(tmp, ".agents", "claims.json"), `${JSON.stringify(noi, null, 2)}\n`);
};

try {
  g("init", "-q", ".");
  g("config", "user.email", "t@t");
  g("config", "user.name", "t");
  fs.mkdirSync(path.join(tmp, ".agents"), { recursive: true });
  fs.mkdirSync(path.join(tmp, "scripts"), { recursive: true });
  fs.mkdirSync(path.join(tmp, ".githooks"), { recursive: true });
  /* Bản đồ vùng của fixture. Cửa hỏi chính bộ quy vùng của repo, nên fixture phải khai thật. */
  fs.writeFileSync(path.join(tmp, ".repo-structure.json"), `${JSON.stringify({
    schema_version: 1,
    repo: "fixture",
    areas: {
      "scripts/": { steward: "_code", mutability: "rw", ownership_mode: "root" },
      ".agents/": { steward: "_root", mutability: "rw", ownership_mode: "root" },
    },
  }, null, 2)}\n`);
  bang({});
  fs.writeFileSync(path.join(tmp, "scripts", "cua-toi.mjs"), "// toi\n");
  fs.writeFileSync(path.join(tmp, "scripts", "cua-ho.mjs"), "// ho\n");
  g("add", "-A");
  g("commit", "-q", "-m", "goc");

  /* Hook y HỆT bản của repo, chỉ trỏ `claim.mjs` về repo nhà — fixture không có `scripts/` của
     bộ khung. Chép nội dung thay vì viết lại: viết lại là ghim một hook KHÁC hook đang chạy. */
  const goc = fs.readFileSync(path.join(ROOT, ".githooks", "commit-msg"), "utf8");
  assert.match(goc, /--cua-index/, "hook that phai goi `--cua-index`; ghim nay vo nghia neu no goi thu khac");
  /* `--goc` là thứ chính fixture này lôi ra 10/09: thiếu nó thì cửa đọc index của cây ĐANG
     commit bằng gốc repo KHÁC, git nổ `fatal: unable to read <oid>`, và cửa fail-closed chặn
     MỌI commit. Ghim ở đây vì `KHUNG-50` sắp dựng một `git worktree` có gốc khác gốc module. */
  assert.match(goc, /--goc "\$goc"/, "hook phai truyen --goc: thieu no thi cua doc index cua cay khac");
  /* HOOK KHÔNG ĐƯỢC TỰ ĐỌC NHÃN. Vòng audit 10/09 ca ⑶: bản đầu đọc bằng `sed 's/^[Ll]ane:…'`,
     tức bộ đọc thứ hai cho một khái niệm đã có nhà (`laneFromMessage`). Hai bộ lệch nhau ở chữ
     thường, ở nhiều nhãn, ở nhãn có khoảng trắng — nên viết được lời nhắn lọt cửa dưới tên A
     rồi được cổng quy cho tên B. Vế 3g dựng lại đúng lời nhắn đó. */
  assert.match(goc, /--loi-nhan "\$1"/, "hook phai chuyen FILE loi nhan cho claim.mjs, khong tu doc nhan");
  // Soi THÂN hook, bỏ dòng chú thích — chú thích có quyền nhắc `sed` để kể lại chỗ vấp.
  const thanHook = goc.split("\n").filter((l) => !l.trim().startsWith("#")).join("\n");
  assert.doesNotMatch(thanHook, /sed|[Ll]ane:/, "than hook KHONG duoc chua mot bo doc nhan thu hai");
  fs.writeFileSync(
    path.join(tmp, ".githooks", "commit-msg"),
    goc.replace('exec node "$goc/scripts/claim.mjs"', `exec node ${JSON.stringify(path.join(ROOT, "scripts", "claim.mjs"))}`),
    { mode: 0o755 },
  );
  g("config", "core.hooksPath", ".githooks");

  /* ⒜ Lượt 10/09: lane-b dàn file của mình, lane-a chạy `git commit -a`. */
  bang({ "scripts/cua-ho.mjs": { owner: "lane-b", luc: LUC } });
  fs.appendFileSync(path.join(tmp, "scripts", "cua-ho.mjs"), "// ho viet\n");
  fs.appendFileSync(path.join(tmp, "scripts", "cua-toi.mjs"), "// toi viet\n");
  g("add", "scripts/cua-ho.mjs");
  const a = commit("feat: viec cua toi\n\nLane: lane-a", "-a");
  assert.notEqual(a.ma, 0, "CA HONG CHINH: `commit -a` cua lane-a KHONG duoc di qua");
  assert.match(a.ra, /CUA_INDEX_CUON_VIEC_LANE_KHAC/);
  assert.match(a.ra, /scripts\/cua-ho\.mjs/, "phai NEU TEN duong dan bi cuon");
  assert.match(a.ra, /lane-b/, "phai NEU TEN lane bi cuon — khong ten thi khong biet hoi ai");
  assert.equal(g("log", "--oneline").trim().split("\n").length, 1, "commit phai bi HUY, HEAD khong doi");
  assert.deepEqual(daDan(), ["scripts/cua-ho.mjs"], "index con NGUYEN me cua lane-b sau khi bi tu choi");
  ok("3a · lane khác đã `git add` thì `git commit -a` của tôi BỊ HUỶ, nêu tên file và tên lane, index còn nguyên");

  /* ⒝ Cách xử mà chính thông báo mách: `--only` phần của mình. Phải QUA, và phải không cuốn. */
  const b = commit("feat: viec cua toi\n\nLane: lane-a", "--only", "scripts/cua-toi.mjs");
  assert.equal(b.ma, 0, `--only phan cua minh phai QUA. Ra: ${b.ra}`);
  assert.match(g("show", "--stat", "--oneline", "HEAD"), /cua-toi\.mjs/);
  assert.doesNotMatch(g("show", "--stat", "--oneline", "HEAD"), /cua-ho\.mjs/, "`--only` khong duoc cuon file lane khac");
  assert.deepEqual(daDan(), ["scripts/cua-ho.mjs"], "me cua lane-b van con dan, cho chinh ho commit");
  ok("3b · `git commit --only <phần của mình>` ĐI QUA · không cuốn file lane khác · mẻ của họ còn nguyên");

  /* ⒞ Chính chủ commit mẻ của mình: phải QUA. Một cửa fail-closed mà chặn cả chính chủ thì nó
     là cửa không ai dùng được, và nó sẽ bị mở `--no-verify` trong một ngày. */
  const c = commit("feat: viec cua lane-b\n\nLane: lane-b");
  assert.equal(c.ma, 0, `chinh chu phai commit duoc me cua minh. Ra: ${c.ra}`);
  assert.match(g("show", "--stat", "--oneline", "HEAD"), /cua-ho\.mjs/);
  ok("3c · chính chủ commit mẻ của mình thì ĐI QUA");

  /* ⒟ Nhãn `Lane:` thiếu: cửa này KHÔNG chặn — cửa đó là phép kiểm "Nhãn lane trong commit" của
     cổng đóng phiên và của `safe-push`. Ghim vế này để phiên sau không thêm cửa thứ hai canh
     cùng một điều (AGENTS.md mục 8). */
  bang({ "scripts/cua-ho.mjs": { owner: "lane-b", luc: LUC } });
  fs.appendFileSync(path.join(tmp, "scripts", "cua-ho.mjs"), "// ho viet nua\n");
  g("add", "scripts/cua-ho.mjs");
  const d = commit("chore: khong nhan lane");
  assert.equal(d.ma, 0, "thieu nhan Lane: thi cua INDEX im lang — canh o cong dong phien va safe-push");
  ok("3d · thiếu nhãn `Lane:` thì cửa index im lặng, không giành việc của cửa khác");

  /* ⒠ VÒNG AUDIT 10/09, ca ⑴ `CUA_INDEX_AMEND_BYPASS` — đường lách HAI BƯỚC.
     Commit KHÔNG nhãn (cửa im lặng theo ⒟) rồi `git commit --amend` thêm nhãn của mình: index
     bằng HEAD nên `diff --cached` RỖNG, và bản đầu của tôi cho qua ở đúng dòng đó. Commit cuối
     mang tên tôi mà chứa việc lane khác, và cổng đóng phiên KHÔNG thấy gì lạ — nhãn đã có. */
  bang({ "scripts/cua-ho.mjs": { owner: "lane-b", luc: LUC } });
  fs.appendFileSync(path.join(tmp, "scripts", "cua-ho.mjs"), "// buoc mot\n");
  g("add", "scripts/cua-ho.mjs");
  const e1 = commit("chore: khong nhan lane");
  assert.equal(e1.ma, 0, "buoc mot phai qua — do la he qua CO Y cua ⒟");
  const e2 = commit("feat: viec cua toi\n\nLane: lane-a", "--amend");
  assert.notEqual(e2.ma, 0, "buoc hai (`--amend` them nhan) KHONG duoc di qua");
  assert.match(e2.ra, /CUA_INDEX_CUON_VIEC_LANE_KHAC/);
  assert.match(e2.ra, /cua-ho\.mjs/, "phai soi lai NOI DUNG dang duoc dong lai, khong chi me index");
  ok("3e · đường lách `--amend`: commit không nhãn rồi thêm nhãn — cửa soi lại nội dung, BỊ HUỶ");

  /* ⒡ VÒNG AUDIT 10/09, ca ⑵ `CUA_INDEX_PATH_LOSS` — đường dẫn ngoài ASCII.
     `--name-only` trần thì git TRÍCH DẪN tên thành `"scripts/k\341\273\271…"`, và tên đã trích
     dẫn không khớp hàng nào trong bảng quyền — nên file CÓ CHỦ đọc thành VÔ CHỦ, cửa cho qua.
     Repo phát hành có sẵn cả một danh sách `grandfathered` toàn đường dẫn tiếng Việt có dấu,
     nên đây là ca thật. */
  const tenCoDau = "scripts/kỹ-thuật.mjs";
  fs.writeFileSync(path.join(tmp, tenCoDau), "// cua ho\n");
  bang({ [tenCoDau]: { owner: "lane-b", luc: LUC } });
  g("add", tenCoDau);
  const f = commit("feat: viec cua toi\n\nLane: lane-a");
  assert.notEqual(f.ma, 0, "duong dan tieng Viet co dau van phai bi CHAN");
  assert.match(f.ra, /CUA_INDEX_CUON_VIEC_LANE_KHAC/);
  assert.match(f.ra, /lane-b/);
  /* ĐO 10/09, ba đột biến: bỏ `-z` mà giữ `core.quotepath=false` thì vế này VẪN XANH, và ngược
     lại cũng xanh — mỗi cái tự đủ. Ca hỏng chỉ dựng lại được khi thiếu CẢ HAI, và đó đúng là
     bản đầu. Nên vế này ghim "có ít nhất một trong hai", không ghim `-z` là thứ chịu lực. */
  ok("3f · đường dẫn tiếng Việt có dấu vẫn bị chặn — index đọc không qua lớp trích dẫn của git");

  /* ⒢ VÒNG AUDIT 10/09, ca ⑶ `CUA_INDEX_LANE_AMBIGUOUS` — HAI bộ đọc nhãn trả HAI tên.
   *
   * DỰNG ĐÚNG CHIỀU LÁCH, không phải chiều ngược. Bản đầu để hook đọc bằng `sed
   * 's/^[Ll]ane:…' | head -1` nên nó lấy dòng ĐẦU và nhận cả chữ thường. `laneFromMessage`
   * (thứ cổng và `safe-push` dùng) chỉ nhận `Lane:` hoa. Nên lời nhắn dưới đây tách hai bộ:
   *   - bộ `sed`           → "lane-a"  → lane-a LÀ chủ file → cho qua
   *   - `laneFromMessage`  → "lane-b"  → cổng quy commit cho lane-b
   * Tức lane-b cuốn được việc của lane-a, và cổng vẫn thấy một commit có nhãn hợp lệ.
   *
   * Ca này KHÔNG dựng nổi nếu khoá file thuộc lane-b — lúc đó cửa từ chối vì lý do khác, và
   * phép ghim xanh mà chẳng chứng minh gì. Vế đầu tôi viết đúng sai chỗ đó. */
  bang({ "scripts/cua-ho.mjs": { owner: "lane-a", luc: LUC } });
  fs.appendFileSync(path.join(tmp, "scripts", "cua-ho.mjs"), "// cua lane-a\n");
  g("add", "scripts/cua-ho.mjs");
  const g1 = commit("feat: hai bo doc\n\nlane: lane-a\nLane: lane-b");
  assert.notEqual(g1.ma, 0, "`lane:` chu thuong KHONG duoc thanh mot bo doc thu hai");
  assert.match(g1.ra, /CUA_INDEX_CUON_VIEC_LANE_KHAC/);
  assert.match(g1.ra, /"lane-b"/, "cua phai dung DUNG ten ma cong se dung: lane-b");

  const g2 = commit("feat: hai nhan\n\nLane: lane-a\nLane: lane-b");
  assert.notEqual(g2.ma, 0, "hai nhan khac nhau: cua KHONG duoc tu chon mot cai");
  assert.match(g2.ra, /CUA_INDEX_NHAN_KHONG_QUY_THUOC_DUOC/);

  const g3 = commit("feat: nhan rong\n\nLane:");
  assert.notEqual(g3.ma, 0, "nhan RONG: khong biet la ai thi khong biet file nao cua minh");
  assert.match(g3.ra, /CUA_INDEX_NHAN_KHONG_QUY_THUOC_DUOC/);
  ok("3g · một bộ đọc nhãn duy nhất: `lane:` chữ thường · hai nhãn khác nhau · nhãn rỗng — đều BỊ CHẶN");

  /* ⒣ THÁO CỬA RA thì ca hỏng ⒜ QUAY LẠI. Đây là vế chứng minh phép ghim này ghim thật — không
     có nó thì mọi vế trên vẫn xanh khi hook chỉ còn là một file rỗng. */
  g("config", "--unset", "core.hooksPath");
  const e = commit("feat: khong co cua\n\nLane: lane-b");
  assert.equal(e.ma, 0, "khong co cua thi git cho qua — day la trang thai TRUOC ban va");
  assert.match(g("show", "--stat", "--oneline", "HEAD"), /cua-ho\.mjs/, "va no CUON file cua lane-a: dung ca hong KHUNG-59");
  ok("3h · tháo cửa ra thì ca hỏng KHUNG-59 QUAY LẠI — phép ghim trên phân biệt được hai nhánh");
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

/* ---- 4. Hợp đồng mã thoát với git --------------------------------------- */
{
  assert.equal(EXIT.REFUSED, 3, "hook dua ma thoat cua `claim.mjs` cho git; doi so nay la doi hop dong voi git");
  ok("4 · mã TỪ CHỐI vẫn là 3 — git huỷ commit khi hook thoát khác 0");
}

/* ---- 5. CỬA ĐÃ BẬT CHƯA — ba nhánh, và một trong ba là fail-open đã có thật
 *
 * VÒNG AUDIT 10/09, ca ⑷: bản đầu chỉ hỏi *"file hook có tồn tại không"*, nên XOÁ file hook đi
 * là cổng chuyển sang XANH (bỏ qua) — cửa biến mất mà cổng nói không sao. Cả cơ chế vô nghĩa
 * nếu nó không được bật, nên phép kiểm bật/tắt cũng phải có phép ghim. */
{
  const batRoi = xetCuaIndex({ coTrenDia: true, daTheoDoi: true, hooksPath: ".githooks\n" });
  assert.equal(batRoi.ok, true);
  assert.ok(!batRoi.skipped, "cua dang bat thi DAT, khong phai bo qua");

  const tat = xetCuaIndex({ coTrenDia: true, daTheoDoi: true, hooksPath: "" });
  assert.equal(tat.ok, false);
  assert.match(tat.msg, /CUA_INDEX_TAT/);
  assert.match(tat.msg, /core\.hooksPath \.githooks/, "phai NEU CACH BAT, khong chi neu loi");

  const troNoiKhac = xetCuaIndex({ coTrenDia: true, daTheoDoi: true, hooksPath: ".hooks-cua-ai-do" });
  assert.equal(troNoiKhac.ok, false);
  assert.match(troNoiKhac.msg, /\.hooks-cua-ai-do/, "phai NEU TEN cho no dang tro toi");
  assert.match(troNoiKhac.msg, /HỎI người đặt trước/, "KHONG duoc day phien sau ghi de cau hinh cua nguoi khac");

  /* ĐÂY là ca fail-open đã có thật: file bị xoá nhưng repo VẪN THEO DÕI nó. */
  const biThao = xetCuaIndex({ coTrenDia: false, daTheoDoi: true, hooksPath: ".githooks" });
  assert.equal(biThao.ok, false, "repo theo doi file hook ma file khong con tren dia: DO, khong duoc bo qua");
  assert.match(biThao.msg, /CUA_INDEX_BI_THAO/);

  /* Còn repo TIÊU THỤ chưa bao giờ nhận bản trích thì bỏ qua là đúng — chặn nó là chặn oan, và
     một cổng chặn oan ở repo người khác thì họ tắt cả cổng. */
  const chuaNhan = xetCuaIndex({ coTrenDia: false, daTheoDoi: false, hooksPath: "" });
  assert.equal(chuaNhan.ok, true);
  assert.equal(chuaNhan.skipped, true, "repo chua nhan cua thi BO QUA, khong DO");
  ok("5 · bật · tắt · trỏ nơi khác · BỊ THÁO (đỏ) · chưa nhận cửa (bỏ qua) — bốn nhánh khác nhau");
}

console.log(`\n${so} passed, 0 failed, ${so} total — SUITE XANH`);

/* ---- ĐỘT BIẾN ĐÃ CHẠY — chín lượt, chín lượt ĐỎ --------------------------
 *
 * ⑴ `cuaIndex` trả `[]`                              → vế 1 đỏ
 * ⑵ `cuaIndex` trả nguyên `la` (rộng bằng `--soat`)   → vế 1 đỏ
 * ⑶ hook rỗng (`exit 0`)                              → vế 3a đỏ
 * ⑷ hook không truyền `--goc`                         → vế đọc chữ hook đỏ
 * ⑸ `core.hooksPath` tắt                              → vế 3a đỏ
 * ⑹ bỏ đường soi lại khi mẻ RỖNG (`--amend`)          → vế 3e đỏ
 * ⑺ bỏ CẢ `-z` và `core.quotepath=false`              → vế 3f đỏ
 * ⑻ nhãn không quy thuộc được thì CHO QUA             → vế 3g đỏ
 * ⑼ đọc nhãn bằng bộ thứ hai (chữ thường, dòng đầu)   → vế 3g đỏ
 * ⑽ `xetCuaIndex` bỏ qua khi file mất, bất kể theo dõi → vế 5 đỏ
 *
 * ĐỘT BIẾN XANH — ghi lại vì nó nói một điều khác: bỏ `-z` mà giữ `core.quotepath=false` thì
 * vế 3f VẪN xanh, và ngược lại cũng xanh. Hai cái mỗi cái tự đủ; ca hỏng chỉ dựng lại được khi
 * thiếu CẢ HAI. Nên vế 3f ghim "có ít nhất một trong hai", không ghim `-z` là thứ chịu lực.
 */

/* ---- 6. CỬA TẦNG MÁY — T2 (10/09) --------------------------------------
 *
 * Đức: *"các luật cũng cần kèm cơ chế hook, chứ không thì AI vẫn làm sai."* Luật này đã có:
 * sửa tầng máy thì phải cắt bản. Nó bị cưỡng chế bởi SUITE, và hôm nay tôi vi phạm rồi phát
 * hiện SAU 11 PHÚT. Cửa `commit-msg` biết đúng mẻ sắp vào commit, trả lời trong ~0,2 giây.
 *
 * SÁU VẾ, và bốn trong sáu là ĐỐI CHỨNG NGƯỢC — vì một cửa chặn oan là ai đó gõ `--no-verify`,
 * và từ lúc đó nó không canh gì nữa. Ca `--amend` là ca tôi thiết kế để chống chặn oan: nhánh
 * amend đọc mẻ so với `HEAD^`, nên số bản cũng phải so với `HEAD^`. */
{
  /* VẾ NÀY CHỈ ĐO ĐƯỢC Ở NƠI PHÁT HÀNH, và nó phải NÓI RA chứ không giả vờ đo.
   *
   * Cửa tầng máy đọc ba hằng số từ `scripts/build-template.mjs` — file CỐ Ý không đi theo bản
   * trích (nó là một trong hai dấu hiệu "nơi phát hành"). Nên ở một repo dựng từ bản trích,
   * cửa đó không thể chạy, và cũng KHÔNG CẦN: `.mjs` ở đó là mã của họ.
   *
   * `template-null-repo` bắt được đúng chỗ này: nó chạy suite CỦA repo giả, và vế này đòi một
   * thông báo mà repo giả không có cách nào sinh ra. Bỏ qua có điều kiện là câu trả lời ĐÚNG —
   * còn dựng một `build-template.mjs` giả để vế xanh thì là đo chính cái giả đó.
   *
   * Ca ⑺ (repo KHÔNG phải nơi phát hành thì cửa không áp) VẪN chạy ở mọi repo — nó là ranh
   * giới, và ranh giới thì phải đúng ở cả hai bên. */
  const coBoPhatHanh = fs.existsSync(path.join(ROOT, "scripts", "build-template.mjs"));
  const t2 = fs.mkdtempSync(path.join(os.tmpdir(), "ark-cua-may-"));
  const g2 = (...a) => execFileSync("git", a, { cwd: t2, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  const cm = (msg, ...them) => {
    try { return { ma: 0, ra: execFileSync("git", ["commit", ...them, "-m", msg], { cwd: t2, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }) }; }
    catch (e) { return { ma: e.status ?? 1, ra: `${e.stdout || ""}${e.stderr || ""}` }; }
  };
  const ghi = (rel, noi) => {
    const abs = path.join(t2, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, noi);
  };
  const datBan = (v) => ghi("package.json", `${JSON.stringify({ name: "thu", version: v, scripts: { test: "node tests/x.mjs" } }, null, 2)}\n`);
  const nhan = "\n\nLane: lane-a";
  try {
    g2("init", "-q", ".");
    g2("config", "user.email", "t@t");
    g2("config", "user.name", "t");
    ghi(".repo-structure.json", `${JSON.stringify({ schema_version: 1, repo: "thu", areas: { "scripts/": { steward: "_code", mutability: "rw", ownership_mode: "root" }, ".agents/": { steward: "_root", mutability: "rw", ownership_mode: "root" } } }, null, 2)}\n`);
    ghi(".agents/claims.json", `${JSON.stringify({ claims: { _code: { owner: null }, _root: { owner: null } }, tam: {} }, null, 2)}\n`);
    datBan("1.0.0");
    /* FIXTURE PHẢI LÀ NƠI PHÁT HÀNH. Cửa tầng máy CHỈ áp ở repo phát hành bộ khung — ở repo
     * đích thì `.mjs` là mã CỦA HỌ, và đòi họ tăng số bản của bộ khung là vô nghĩa.
     * `laNoiPhatHanh` đòi HAI dấu hiệu, cả hai cố ý không đi theo bản trích. Không dựng chúng
     * thì vế này đo một repo mà cửa không áp — tức đo số 0. */
    ghi("scripts/build-template.mjs", "// dau hieu noi phat hanh\n");
    ghi("RELEASE-LEDGER.json", JSON.stringify({ ban: {} }, null, 2) + "\n");

    ghi("scripts/may.mjs", "// v1\n");
    ghi("docs/tay.md", "# tay\n");
    g2("add", "-A");
    g2("commit", "-q", "-m", `goc${nhan}`);
    const hook = path.join(t2, ".githooks", "commit-msg");
    fs.mkdirSync(path.dirname(hook), { recursive: true });
    fs.writeFileSync(hook, fs.readFileSync(path.join(ROOT, ".githooks", "commit-msg"), "utf8")
      .replace('exec node "$goc/scripts/claim.mjs"', `exec node "${path.join(ROOT, "scripts", "claim.mjs").replaceAll("\\", "/")}"`));
    fs.chmodSync(hook, 0o755);
    g2("config", "core.hooksPath", ".githooks");
    const dinh = () => g2("rev-parse", "HEAD").trim();

    /* MỘT `ok()` DUY NHẤT CHO VẾ NÀY, nhãn đổi theo nhánh — `core-contract` đếm số vế bằng số
     * lời gọi `ok(` TĨNH trong file, nên hai lời gọi cho một vế làm con số đếm được (15) lệch
     * khỏi số vế chạy được (14). Và một con số sai trong tài liệu "không làm đỏ bất cứ thứ gì
     * nên nó sống rất lâu" — chính câu phép kiểm đó in ra. */
    let nhan6 = "6 · cửa tầng máy — BỎ QUA ở repo dựng từ bản trích: nó là cửa của NƠI PHÁT HÀNH, và `scripts/build-template.mjs` cố ý không đi theo bản trích";
    if (coBoPhatHanh) {
    // ⑴ CHẶN: chạm tầng máy, số bản không đổi.
    const truoc = dinh();
    ghi("scripts/may.mjs", "// v2\n");
    g2("add", "scripts/may.mjs");
    const a = cm(`feat: sua tang may${nhan}`);
    assert.notEqual(a.ma, 0, "cham tang may ma khong cat ban thi PHAI bi chan");
    assert.match(a.ra, /CUA_TANG_MAY_CHUA_CAT_BAN/, `phai neu ten loi: ${a.ra.slice(0, 300)}`);
    assert.match(a.ra, /scripts\/may\.mjs/, "phai NEU TEN file tang may trong me");
    assert.equal(dinh(), truoc, "commit phai bi HUY — HEAD khong duoc doi");

    // ⑵ QUA: cắt bản trong cùng mẻ.
    datBan("1.0.1");
    g2("add", "package.json");
    const b = cm(`feat: sua tang may + cat ban${nhan}`);
    assert.equal(b.ma, 0, `cat ban trong cung me thi phai QUA: ${b.ra.slice(0, 300)}`);

    /* ⑶ CHẶN: `--amend` thêm nội dung tầng máy MỚI dưới CÙNG một số bản.
     *
     * Kỳ vọng đầu của tôi là "phải qua" — và nó SAI, cửa mới đúng. Sổ phát hành là vùng
     * chỉ-thêm: một số bản đã ghi dấu vân tay thì không ghi được dấu thứ hai cho số đó. Nên
     * đổi nội dung tầng máy dưới một số đã cắt là trạng thái KHÔNG hợp lệ, dù chỉ tạm.
     * Hệ quả về nếp làm: CẮT BẢN TRƯỚC, rồi mới commit — đúng hướng `R2`. */
    ghi("scripts/may.mjs", "// v2b\n");
    g2("add", "scripts/may.mjs");
    const c = cm(`feat: sua tang may + cat ban (amend)${nhan}`, "--amend");
    assert.notEqual(c.ma, 0, "amend them noi dung tang may duoi CUNG so ban thi PHAI bi chan");
    assert.match(c.ra, /CUA_TANG_MAY_CHUA_CAT_BAN/, `phai neu ten loi: ${c.ra.slice(0, 200)}`);

    /* ⑶b QUA: `--amend` MẺ RỖNG — chỉ sửa lời nhắn, sau khi đã cắt bản.
     *
     * Đây là ca `mocSo` sinh ra để chống chặn oan: mẻ rỗng nên cửa index đọc lại nội dung so
     * với `HEAD^`, và số bản cũng phải so với `HEAD^` (1.0.0 → 1.0.1, khác nhau → qua). So với
     * `HEAD` trong ca này là chặn oan một bản đã cắt đúng. */
    /* BỎ DÀN TRƯỚC RỒI MỚI PHỤC HỒI. `checkout --` lấy nội dung từ INDEX, mà index vẫn còn
     * `v2b` đã dàn ở lượt bị chặn ⑶ (cửa huỷ commit nhưng KHÔNG chạm index — đó là hợp đồng
     * của nó). Không `reset` thì mẻ vẫn không rỗng và ca này đo một thứ khác. */
    g2("reset", "-q", "HEAD", "--", "scripts/may.mjs");
    g2("checkout", "--", "scripts/may.mjs");
    assert.equal(g2("diff", "--cached", "--name-only").trim(), "", "tien de ca nay: me phai RONG");
    const cb = cm(`feat: sua tang may + cat ban (sua loi nhan)${nhan}`, "--amend");
    assert.equal(cb.ma, 0, `amend me RONG sau khi da cat ban PHAI qua: ${cb.ra.slice(0, 300)}`);

    // ⑷ QUA: mẻ chỉ có tài liệu — không chạm tầng máy.
    ghi("docs/tay.md", "# tay 2\n");
    g2("add", "docs/tay.md");
    const d = cm(`docs: chi tai lieu${nhan}`);
    assert.equal(d.ma, 0, `me chi co tai lieu thi khong lien quan cua nay: ${d.ra.slice(0, 300)}`);

    // ⑸ QUA: `template/` là bản SINH RA từ tầng máy, không phải tầng máy.
    ghi("template/scripts/may.mjs", "// ban sinh\n");
    g2("add", "template/scripts/may.mjs");
    const e2 = cm(`chore: ban trich${nhan}`);
    assert.equal(e2.ma, 0, `template/ la ban sinh, khong duoc tinh la tang may: ${e2.ra.slice(0, 300)}`);

    // ⑹ QUA: không có `package.json` thì FAIL-OPEN — để cổng đóng phiên nói, đừng chặn ở cửa.
    g2("rm", "-q", "--cached", "package.json");
    fs.rmSync(path.join(t2, "package.json"));
    ghi("scripts/may.mjs", "// v3\n");
    g2("add", "scripts/may.mjs");
    const f2 = cm(`feat: repo khong co package.json${nhan}`);
    assert.equal(f2.ma, 0, `khong doc duoc so ban thi phai FAIL-OPEN: ${f2.ra.slice(0, 300)}`);

    /* ⑺ KHÔNG PHẢI NƠI PHÁT HÀNH → CỬA TẦNG MÁY KHÔNG ÁP, và đây là ca tôi vừa làm sai.
     * Bản đầu tôi viết `process.exit(EXIT.OK)` cho nhánh này — mà khối đó nằm TRƯỚC phép kiểm
     * quyền sở hữu index, nên nó tắt sạch cửa KHUNG-59 ở MỌI repo đích. Vế 3a bắt được. Nay là
     * `break`, và vế này ghim chính ranh giới đó: bỏ hai dấu hiệu đi thì commit tầng máy KHÔNG
     * cắt bản phải ĐI QUA (vì repo này không phát hành gì), mà cửa index vẫn phải còn răng. */
    g2("rm", "-q", "--cached", "scripts/build-template.mjs", "RELEASE-LEDGER.json");
    fs.rmSync(path.join(t2, "scripts", "build-template.mjs"));
    fs.rmSync(path.join(t2, "RELEASE-LEDGER.json"));
    g2("commit", "-q", "-m", `chore: thoi la noi phat hanh${nhan}`);
    ghi("scripts/may.mjs", "// v4 o repo DICH\n");
    g2("add", "scripts/may.mjs");
    const h = cm(`feat: sua .mjs o repo dich${nhan}`);
    assert.equal(h.ma, 0, `repo KHONG phai noi phat hanh thi cua tang may khong ap: ${h.ra.slice(0, 300)}`);

    nhan6 = "6 · cửa tầng máy — TÁM nhánh: chặn khi chưa cắt bản · chặn cả `--amend` thêm nội dung dưới cùng bản · qua khi đã cắt · `--amend` mẻ RỖNG không bị chặn oan · tài liệu · `template/` · thiếu `package.json` · và KHÔNG áp ở repo không phải nơi phát hành";
    }
    ok(nhan6);
  } finally {
    fs.rmSync(t2, { recursive: true, force: true });
  }
}

/* ---- 7. CỬA TỰ TRẢ KHOÁ SAU COMMIT — T2 (10/09) ------------------------
 *
 * Luật mục 1: khoá FILE trả NGAY SAU commit chứa lượt ghi. Trước hook này luật đó chỉ được CỔNG
 * cưỡng chế — tức cuối phiên. Đức đòi hai lần: *"khoá phải nhả ngay khi hết sửa, hook tốt vào"*.
 *
 * BA VẾ, và vế giữa là chỗ kiểm toán độc lập [B]#5 tìm ra: một file VỪA vào commit mà VẪN còn
 * sửa dở (dàn một phần, hay sửa tiếp sau `git add`) thì lượt ghi CHƯA xong — trả khoá lúc đó là
 * lấy mất lưới đỡ của chính lane đang sửa. Nên cửa hỏi git: còn hiện trong `status --porcelain`
 * thì GIỮ khoá. */
{
  const t3 = fs.mkdtempSync(path.join(os.tmpdir(), "ark-tra-khoa-"));
  const g3 = (...a) => execFileSync("git", a, { cwd: t3, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  const ghi3 = (rel, noi) => {
    const abs = path.join(t3, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, noi);
  };
  const khoaFile = (ds) => ghi3(".agents/claims.json", `${JSON.stringify({
    claims: { _code: { owner: null }, _root: { owner: null } },
    tam: Object.fromEntries(ds.map((d) => [d, { owner: "lane-a", claimed_at: new Date().toISOString() }])),
  }, null, 2)}\n`);
  const dangGiu = () => Object.keys(JSON.parse(fs.readFileSync(path.join(t3, ".agents", "claims.json"), "utf8")).tam ?? {}).sort();
  try {
    g3("init", "-q", ".");
    g3("config", "user.email", "t@t");
    g3("config", "user.name", "t");
    ghi3(".repo-structure.json", `${JSON.stringify({ schema_version: 1, repo: "thu", areas: { "scripts/": { steward: "_code", mutability: "rw", ownership_mode: "root" }, ".agents/": { steward: "_root", mutability: "rw", ownership_mode: "root" } } }, null, 2)}\n`);
    khoaFile([]);
    ghi3("scripts/a.mjs", "// a1\n");
    ghi3("scripts/b.mjs", "// b1\n");
    g3("add", "-A");
    g3("commit", "-q", "-m", "goc\n\nLane: lane-a");
    for (const ten of ["commit-msg", "post-commit"]) {
      const dich = path.join(t3, ".githooks", ten);
      fs.mkdirSync(path.dirname(dich), { recursive: true });
      fs.writeFileSync(dich, fs.readFileSync(path.join(ROOT, ".githooks", ten), "utf8")
        .replace(/node "\$goc\/scripts\/claim\.mjs"/g, `node "${path.join(ROOT, "scripts", "claim.mjs").replaceAll("\\", "/")}"`));
      fs.chmodSync(dich, 0o755);
    }
    g3("config", "core.hooksPath", ".githooks");

    // ⑴ File SẠCH sau commit → khoá được TRẢ.
    khoaFile(["scripts/a.mjs", "scripts/b.mjs"]);
    ghi3("scripts/a.mjs", "// a2\n");
    g3("add", "scripts/a.mjs");
    g3("commit", "-q", "-m", "sua a\n\nLane: lane-a");
    assert.deepEqual(dangGiu(), ["scripts/b.mjs"],
      "khoa cua file DA VAO COMMIT va sach thi phai duoc tra; khoa cua file khac phai CON");

    // ⑵ File vào commit MÀ VẪN còn sửa dở → khoá phải GIỮ. (kiểm toán [B]#5)
    khoaFile(["scripts/a.mjs", "scripts/b.mjs"]);
    ghi3("scripts/b.mjs", "// b2 da dan\n");
    g3("add", "scripts/b.mjs");
    ghi3("scripts/b.mjs", "// b2 da dan + sua tiep KHI CHUA commit\n");
    g3("commit", "-q", "-m", "sua b nhung con sua do\n\nLane: lane-a");
    assert.ok(dangGiu().includes("scripts/b.mjs"),
      `file vao commit ma VAN con sua do thi PHAI giu khoa — dang giu: ${JSON.stringify(dangGiu())}`);

    // ⑶ Commit KHÔNG nhãn `Lane:` → cửa im lặng, không trả hộ ai.
    khoaFile(["scripts/a.mjs"]);
    ghi3("scripts/a.mjs", "// a3\n");
    g3("add", "scripts/a.mjs");
    g3("commit", "-q", "-m", "khong nhan");
    assert.deepEqual(dangGiu(), ["scripts/a.mjs"],
      "commit khong nhan thi cua khong biet ai dang commit — khong duoc tra ho khoa cua ai");

    ok("7 · tự trả khoá sau commit: file sạch được trả · file còn sửa dở GIỮ khoá · commit không nhãn thì không trả hộ ai");
  } finally {
    fs.rmSync(t3, { recursive: true, force: true });
  }
}
