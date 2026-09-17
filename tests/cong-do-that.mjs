/* CỔNG ĐỎ ĐƯỢC THẬT — một ca hỏng chạy được cho mỗi hàng cổng CHƯA TỪNG ĐỎ.
 *
 * ─── VÌ SAO FILE NÀY TỒN TẠI, VÀ VÌ SAO NÓ RA ĐỜI MUỘN 17/09 ───────────────
 * `can-nang.mjs` đếm được: qua hơn 300 lượt chạy cổng có ghi lại, sáu hàng dưới đây **chưa đỏ
 * lần nào**. Chính nó cũng ghi sẵn câu phải hỏi: *"dựng nổi ca hỏng cho nó không? Không dựng nổi
 * thì nó chưa bao giờ là phép kiểm thật."* — rồi đọc `tests/cong-do-that.mjs` để biết hàng nào
 * đã được trả lời.
 *
 * File ấy **chưa từng tồn tại**. Không trong cây làm việc, không trong `git log --all`, không bị
 * `.gitignore`. Nhưng bốn chỗ trong repo trích nó như một sự thật đã có:
 *   · `scripts/can-nang.mjs:288`        đọc nó để đánh dấu ✓ (đọc hụt → im lặng coi như trống)
 *   · `scripts/session-check.mjs:214`   *"Cả hai vế có ca hỏng dựng sẵn ở … khối 1"*
 *   · `scripts/build-dashboard.mjs`     trích một phép ĐO của nó: *"gọi cổng 50 lượt, tức 462 giây"*
 *   · `tests/harness-smoke.mjs` (×5)    *"xem ghi chú ở `tests/cong-do-that.mjs`"*
 *
 * Đó đúng là thứ `A1` đi tìm, và nó tệ hơn một hàng chưa đỏ: một **màu xanh giả có trích dẫn**.
 * Bốn câu trên đọc như bằng chứng, nên không ai đi kiểm — mười ngày liền.
 *
 * ─── LUẬT CỦA FILE NÀY ─────────────────────────────────────────────────────
 * ⑴ **HAI LƯỢT ĐO CHO MỖI HÀNG.** Trước khi bẻ phải XANH, sau khi bẻ phải ĐỎ. Chỉ đo vế đỏ thì
 *   một fixture đỏ sẵn vì lý do khác cũng xanh — đúng cái bẫy `assertion-must-distinguish-branches`
 *   mà repo này đã trả giá.
 * ⑵ **BẺ ĐÚNG MỘT THỨ**, giữa hai lượt đo, trong một kho tạm dùng xong xoá. Không bao giờ bẻ
 *   trong cây làm việc thật.
 * ⑶ **Chép CẢ `scripts/`**, không gõ danh sách: một danh sách gõ tay sẽ thiếu đúng cái import
 *   thêm vào tuần sau, và fixture chết trong im lặng.
 *
 * Chạy: `npm run test:do-that` — KHÔNG nằm trong `npm test`. Mỗi khối bật một tiến trình cổng
 * đầy đủ, và bộ kiểm chính đã 199/180 giây.
 */
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const NL = String.fromCharCode(10);
const NHAN = "thu";
let dat = 0;
const ok = (ten) => { dat += 1; console.log(`  ok  ${ten}`); };

/* Cấu trúc cho fixture: bỏ `docs.file_map` để bản đồ quay về mặc định `AGENTS.md` — fixture
   không mang `docs/BAN-DO-CHI-TIET.md` của repo thật. Cùng lý do với `harness-smoke.mjs`. */
function docCauTruc() {
  const ct = JSON.parse(readFileSync(join(ROOT, ".repo-structure.json"), "utf8"));
  if (ct.docs) delete ct.docs.file_map;
  return ct;
}

/**
 * Dựng một kho tạm chạy được cổng, và trả về bộ đồ nghề của nó.
 * `remote: true` thêm một kho bare + upstream — bắt buộc cho hàng "Nhãn lane trong commit",
 * vì không phân giải được mốc so thì hàng ấy BỎ QUA chứ không đỏ.
 */
function dungKho(ten, { remote = false } = {}) {
  const cha = mkdtempSync(join(tmpdir(), `do-that-${ten}-`));
  const fx = join(cha, "kho");
  mkdirSync(fx, { recursive: true });
  const at = (...a) => execFileSync("git", a, { cwd: fx, encoding: "utf8" });
  at("init", "-q", "-b", "main");
  at("config", "user.name", "t");
  at("config", "user.email", "t@e.invalid");
  at("config", "core.autocrlf", "false");   // fixture chi de do, dung de git canh bao CRLF lam nhieu bao cao

  mkdirSync(join(fx, "scripts"), { recursive: true });
  mkdirSync(join(fx, ".agents"), { recursive: true });
  mkdirSync(join(fx, "evidence"), { recursive: true });
  for (const n of readdirSync(join(ROOT, "scripts")).filter((x) => x.endsWith(".mjs"))) {
    copyFileSync(join(ROOT, "scripts", n), join(fx, "scripts", n));
  }

  const ct = docCauTruc();
  writeFileSync(join(fx, ".repo-structure.json"), JSON.stringify(ct, null, 2), "utf8");
  copyFileSync(join(ROOT, "AGENTS.md"), join(fx, "AGENTS.md"));

  /* Khai ĐỦ mọi steward. Thiếu một khoá thì hàng "Bất biến quyền sở hữu ba tầng" đỏ sẵn, và
     khối ① sẽ đọc nhầm cái đỏ đó là kết quả của chính nó. */
  const claims = {};
  for (const v of Object.values(ct.areas ?? {})) if (v?.steward) claims[v.steward] = { owner: null, task: null };
  claims._root = { owner: NHAN, task: "t" };
  claims._code = { owner: NHAN, task: "t" };
  claims._docs = { owner: NHAN, task: "t" };
  writeFileSync(join(fx, ".agents", "claims.json"), JSON.stringify({ claims }), "utf8");

  writeFileSync(join(fx, "HANDOFF.md"), `# HANDOFF${NL}${NL}## Log${NL}- cu${NL}`, "utf8");
  writeFileSync(join(fx, "package.json"),
    JSON.stringify({ name: "fx", private: true, type: "module", scripts: { test: "node -e 0" } }), "utf8");
  writeFileSync(join(fx, "evidence", "cu.md"), `# bang chung cu${NL}- dong mot${NL}`, "utf8");
  at("add", "-A");
  at("commit", "-q", "-m", `nen${NL}${NL}Lane: ${NHAN}`);

  if (remote) {
    const bare = join(cha, "bare.git");
    execFileSync("git", ["init", "-q", "--bare", bare], { encoding: "utf8" });
    at("remote", "add", "origin", bare);
    at("push", "-q", "-u", "origin", "main");
  }

  /* Cắt ĐÚNG hàng cần đọc. Cắt theo cửa sổ ký tự thì dễ nuốt nhãn của hàng kế bên, và lúc đó
     phép kiểm xanh/đỏ vì một lý do không liên quan. */
  const hang = (tenHang) => {
    const r = spawnSync(process.execPath, [join(fx, "scripts", "session-check.mjs"), "--as", NHAN],
      { cwd: fx, encoding: "utf8" });
    const ds = (String(r.stdout || "") + String(r.stderr || "")).split(NL);
    const i = ds.findIndex((l) => l.includes("] " + tenHang));
    return i < 0 ? `(KHÔNG THẤY HÀNG "${tenHang}" trong báo cáo)` : ds.slice(i, i + 2).join(NL);
  };

  return { fx, at, hang, don: () => rmSync(cha, { recursive: true, force: true }) };
}

/** Hai lượt đo bắt buộc: xanh trước khi bẻ, đỏ sau khi bẻ. */
function doHaiVe(k, tenHang, be) {
  assert.doesNotMatch(k.hang(tenHang), /\[ĐỎ/,
    `NỀN ĐÃ ĐỎ SẴN cho "${tenHang}" — fixture hỏng, lượt đo sau không chứng minh được gì`);
  be();
  assert.match(k.hang(tenHang), /\[ĐỎ/,
    `bẻ xong mà "${tenHang}" vẫn không đỏ — hàng này CHƯA phải một phép kiểm`);
}

/* ---- ① Bất biến quyền sở hữu ba tầng ------------------------------------
 * Bẻ: gỡ một khoá quyền mà `.repo-structure.json` đang khai là steward. Đây đúng ca ngày
 * 02/09 sinh ra hàng này: hai tầng lệch nhau thì bảng nói một đằng máy nói một nẻo. */
{
  const k = dungKho("so-huu");
  try {
    doHaiVe(k, "Bất biến quyền sở hữu ba tầng", () => {
      const d = join(k.fx, ".agents", "claims.json");
      const o = JSON.parse(readFileSync(d, "utf8"));
      delete o.claims._docs;
      writeFileSync(d, JSON.stringify(o), "utf8");
    });
  } finally { k.don(); }
  ok("Bất biến quyền sở hữu ba tầng — gỡ một khoá steward thì ĐỎ");
}

/* ---- ② Không có secret lọt vào repo --------------------------------------
 * Bẻ: commit một chuỗi mang đúng hình dạng token GitHub.
 *
 * NỐI TỪ MẢNH, KHÔNG VIẾT THẲNG. Chính file này nằm trong repo và bị cổng thật quét — viết
 * nguyên chuỗi vào đây là tự làm repo đỏ vì phép kiểm đo phép kiểm. Và nó phải KHÔNG mang dấu
 * hàng giả (`test`, `example`, `fake`, `dummy`…), nếu không `laHangGia` gạt nó đi đúng luật. */
{
  const k = dungKho("secret");
  try {
    doHaiVe(k, "Không có secret lọt vào repo", () => {
      const giaDang = "gh" + "p_" + "Kq7Wn3Bd5Rm2Vy8Hs4Jc6Lp0Zg9Ar4Nd";
      writeFileSync(join(k.fx, "cau-hinh.yml"), `khoa: ${giaDang}${NL}`, "utf8");
      k.at("add", "-A");
      k.at("commit", "-q", "-m", `them${NL}${NL}Lane: ${NHAN}`);
    });
  } finally { k.don(); }
  ok("Không có secret lọt vào repo — token đúng hình dạng thì ĐỎ");
}

/* ---- ③ Luật biên dịch sạch ----------------------------------------------
 * Bẻ: một file luật trích một VẾ ĐÃ CHẾT. Chỉ ① của bộ biên dịch mới đỏ (mồ côi / trùng / quá
 * hạn là MÙI, cố ý không đỏ), nên ca hỏng phải đánh đúng vế ấy. */
{
  const k = dungKho("luat");
  const VE1 = String.fromCodePoint(0x2474);   // ⑴ — dựng bằng mã điểm, chuỗi này từng bị nuốt
  try {
    doHaiVe(k, "Luật biên dịch sạch", () => {
      mkdirSync(join(k.fx, "docs", "adr"), { recursive: true });
      writeFileSync(join(k.fx, "docs", "adr", "0001-mot.md"), [
        "---", "adr: 0001", "status: Accepted", "---",
        "# ADR-0001 — mot quyet dinh",
        "",
        "## Vế đã chết",
        `- **0001 ${VE1} — Đức chốt ngược lại.**`, "",
      ].join(NL), "utf8");
      writeFileSync(join(k.fx, "LUAT-THU.md"), `# luat${NL}${NL}Theo ADR-0001 ${VE1} thì phải làm thế.${NL}`, "utf8");

      const d = join(k.fx, ".repo-structure.json");
      const ct = JSON.parse(readFileSync(d, "utf8"));
      ct.luat = { ...(ct.luat ?? {}), ra_soat: { ...(ct.luat?.ra_soat ?? {}), "LUAT-THU.md": "2026-09-17" } };
      writeFileSync(d, JSON.stringify(ct, null, 2), "utf8");
    });
  } finally { k.don(); }
  ok("Luật biên dịch sạch — file luật trích một vế đã chết thì ĐỎ");
}

/* ---- ④ Mọi lệnh git đọc được --------------------------------------------
 * Bẻ: xoá `.git`. Đây không phải ca giả định — ghi chú của chính hàng này kể ba đường tới cùng
 * một chuỗi rỗng (không phải kho git · git không có trong PATH · output vượt buffer), và cả ba
 * từng dẫn tới "0 file được track · secret 0/0 sạch · XANH TOÀN BỘ".
 *
 * PHẢI CÓ REMOTE. Đo được lúc dựng khối này: một kho KHÔNG có `origin` đã đỏ sẵn ở hàng này, vì
 * `rev-parse --verify origin/main` thất bại và lượt đó đi qua `git()` (ghi vào `gitLoi`) chứ
 * không qua `gitLoiLaBinhThuong` (nơi "không có" là một câu trả lời hợp lệ). Không dựng remote
 * thì nền đã đỏ, và lượt đo sau chứng minh đúng con số không. */
{
  const k = dungKho("git-hong", { remote: true });
  try {
    doHaiVe(k, "Mọi lệnh git đọc được", () => rmSync(join(k.fx, ".git"), { recursive: true, force: true }));
  } finally { k.don(); }
  ok("Mọi lệnh git đọc được — kho mất .git thì ĐỎ, không im lặng báo 0");
}

/* ---- ⑤ Nhãn lane trong commit -------------------------------------------
 * Bẻ: một commit mang HAI nhãn khác nhau → không quy thuộc được cho ai.
 * Thiếu nhãn thì chỉ NHẮC (cố ý: 509 commit cũ không nhãn), nên ca hỏng phải là nhãn HỎNG. */
{
  const k = dungKho("lane", { remote: true });
  try {
    doHaiVe(k, "Nhãn lane trong commit", () => {
      writeFileSync(join(k.fx, "drafts-x.md"), `x${NL}`, "utf8");
      k.at("add", "-A");
      k.at("commit", "-q", "-m", `hai nhan${NL}${NL}Lane: ${NHAN}${NL}Lane: mot-lane-khac`);
    });
  } finally { k.don(); }
  ok("Nhãn lane trong commit — một commit mang hai nhãn thì ĐỎ");
}

/* ---- ⑥ Vùng CHỈ-THÊM không bị viết lại ----------------------------------
 * Bẻ: SỬA một file `evidence/` đã có. Thêm mới thì được; sửa/xoá/đổi tên thì không.
 * Ca này dễ tưởng đã xong nhất: `git diff --numstat` cho một dòng bị sửa ra "1 thêm / 1 xoá",
 * nên phép đo "có dòng thêm" vẫn đạt — phải đo mã trạng thái `[MDR]`. */
{
  const k = dungKho("chi-them");
  try {
    doHaiVe(k, "Vùng CHỈ-THÊM không bị viết lại", () => {
      writeFileSync(join(k.fx, "evidence", "cu.md"), `# bang chung cu${NL}- dong mot DA BI VIET LAI${NL}`, "utf8");
    });
  } finally { k.don(); }
  ok("Vùng CHỈ-THÊM không bị viết lại — sửa một dòng bằng chứng cũ thì ĐỎ");
}

console.log(`${NL}${dat}/6 hàng cổng chứng minh được là ĐỎ ĐƯỢC.`);
