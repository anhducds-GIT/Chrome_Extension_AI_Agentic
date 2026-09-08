/* Phép ghim cho tín hiệu "chưa thấy dấu vết trong repo" — N-09, BRIEF-K2-KHOA-RANH-01.
 *
 * Đây là một CƠ CHẾ ĐA PHIÊN, nên nó chịu luật mục 5 của `docs/protocols/MULTIFLOW.md`: mọi
 * chốt phải có phép ghim, và phép ghim phải qua được đột biến kiểm. Ba thứ được ghim ở đây là
 * HỢP ĐỒNG, không phải chi tiết cài đặt:
 *
 *   ① CHỮ. Tín hiệu chỉ được gọi là "chưa thấy dấu vết trong repo". Gọi nó là "rảnh" · "nhàn" ·
 *      "không làm gì" là nói một điều repo KHÔNG đo được — và ngày 06/09 đúng cách đọc đó đã
 *      làm một khoá bị nhả hộ, lane kia phải hoàn nguyên việc đã xong.
 *   ② MỨC. VÀNG, không bao giờ ĐỎ. Một lane đọc kỹ 30 phút trước khi sửa một dòng là lane TỐT;
 *      chặn nó là dạy mọi lane ghi bừa một byte để giữ khoá cho hợp lệ.
 *   ③ KHÔNG TỰ NHẢ. Máy hiện ra, người hỏi. Không lượt đo nào được tự trả khoá.
 *
 * Chạy: node tests/dau-vet-vung-smoke.mjs
 */
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { CHUA_THAY_DAU_VET, DAU_VET, dauVetTheoVung, dauVetThuan, mocMs } from "../scripts/repo-structure.mjs";

/* CHUOI TEST THAT. Tu khi `test` tro sang bo chay song song, chuoi that nam o `test:tuan-tu`
   va bo chay doc `test:tuan-tu ?? test`. Hoi `test` khong thoi thi phep ghim chi thay MOT dong
   goi bo chay, va no se DO oan — hoac te hon: mot ngay ai do doi lai thanh chuoi thang thi no
   im lang thoi soi gi ca. */
const chuoiTestThat = (pkg) => String(pkg.scripts?.["test:tuan-tu"] ?? pkg.scripts?.test ?? "");

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
let passed = 0;
const ok = (name) => { passed += 1; console.log(`  ok  ${name}`); };

/* Chữ bị cấm. KHÔNG dùng biên từ của regex ở đây — biên từ của JS dựa trên [A-Za-z0-9_] nên nó
   không bao giờ khớp cạnh chữ tiếng Việt có dấu, và regex sẽ khớp KHÔNG GÌ CẢ một cách im lặng
   (đã cắn hai lần trong repo này). So chuỗi thẳng, đừng regex. */
const CHU_CAM = ["rảnh", "nhàn", "không làm gì", "khong lam gi", "ranh roi", "idle"];

/* ---- 1. CHỮ LÀ HỢP ĐỒNG ---- */
{
  assert.equal(CHUA_THAY_DAU_VET, "chưa thấy dấu vết trong repo",
    "chu cua tin hieu la phan cua hop dong, khong phai chuyen chu nghia");
  for (const cam of CHU_CAM) {
    assert.ok(!CHUA_THAY_DAU_VET.toLowerCase().includes(cam),
      `tin hieu KHONG duoc mang chu "${cam}": repo chi thay duoc thu da cham repo`);
  }
  ok("chu hop dong dung nguyen van, va khong mang mot chu cam nao");
}

/* ---- 2. BA CHỖ HIỆN RA ĐỀU PHẢI DÙNG CHUNG MỘT CHỮ ----
 *
 * Không chỗ nào được gõ chuỗi riêng: ba bản của một chữ thì sớm muộn trả ba câu khác nhau —
 * repo này đã trả giá đúng thế với `append_only_exempt` ngày 02/09. */
{
  for (const f of ["claim.mjs", "what-next.mjs", "session-check.mjs"]) {
    const src = readFileSync(join(ROOT, "scripts", f), "utf8");
    assert.ok(src.includes("CHUA_THAY_DAU_VET"),
      `${f} phai dung hang CHUA_THAY_DAU_VET, khong duoc go chuoi rieng`);
    for (const cam of CHU_CAM) {
      assert.ok(!src.includes(`"${cam}`) && !src.includes("`" + cam),
        `${f} khong duoc mo mot chuoi bat dau bang chu cam "${cam}"`);
    }
  }
  ok("ba cho hien ra deu doc chung mot hang chu, khong cho nao go chuoi rieng");
}

/* ---- 3. HÀM THUẦN — bốn nhánh, kể cả nhánh "không đo được" ---- */
{
  const moc = {
    "_code": "2026-09-06T10:00Z",
    "_docs": "2026-09-06T10:00Z",
    "_root": "2026-09-06T10:00Z",
    "_hong": "khong-phai-ngay"
  };
  const sau = mocMs("2026-09-06T11:00Z");
  const truoc = mocMs("2026-09-06T09:00Z");
  const r = dauVetThuan(moc, [
    { ms: sau, areas: ["_docs"] },        // commit SAU lúc nhận, chạm `_docs`
    { ms: truoc, areas: ["_code"] }       // commit TRƯỚC lúc nhận, không tính
  ], ["_root"]);                          // `_root` có file bị sửa trên đĩa

  assert.equal(r.get("_code").trangThai, DAU_VET.CHUA_THAY,
    "commit co TRUOC luc nhan khong phai dau vet cua luot giu nay");
  assert.equal(r.get("_docs").trangThai, DAU_VET.THAY, "co commit sau luc nhan thi THOI bao");
  assert.equal(r.get("_root").trangThai, DAU_VET.THAY, "co file bi sua tren dia thi THOI bao");
  assert.equal(r.get("_hong").trangThai, DAU_VET.KHONG_DO_DUOC,
    "moc nhan khong doc duoc la KHONG DO DUOC — khong duoc doi lot CHUA_THAY");
  ok("bon nhanh: chua thay - co commit - co sua tren dia - khong do duoc");
}

/* ---- 4. GIT HỎNG = KHÔNG ĐO ĐƯỢC, không phải "chưa thấy" ----
 *
 * Đây là họ lỗi đã bị loại khỏi cổng đóng phiên nhiều lần: lỗi đọc lặng lẽ biến thành "sạch".
 * Ở đây "sạch" nghĩa là mời người ta đi giành một khoá có thể đang bận. */
{
  const troc = mkdtempSync(join(tmpdir(), "dau-vet-khong-git-"));
  try {
    const r = dauVetTheoVung(troc, { areas: {} }, { "_root": "2026-09-06T10:00Z" });
    assert.equal(r.get("_root").trangThai, DAU_VET.KHONG_DO_DUOC,
      "khong doc duoc git thi phai noi KHONG DO DUOC, tuyet doi khong noi CHUA_THAY");
  } finally { rmSync(troc, { recursive: true, force: true }); }
  ok("git hong -> KHONG_DO_DUOC, khong bao gio roi ve CHUA_THAY");
}

/* ---- 5–8. BA CHỖ HIỆN RA, chạy thật trong một repo tạm ---- */
{
  /* Giờ ĐẶT SẴN, không lấy từ đồng hồ máy: mốc nhận nằm giữa hai commit, và nếu để git tự lấy
     giờ thì cả hai rơi vào cùng một giây và ca "có commit sau mốc" biến mất. */
  const GIEO = "2026-01-01T00:00:00Z";
  const SAU_MOC = "2026-01-01T01:00:00Z";
  const NL = String.fromCharCode(10);
  const temp = mkdtempSync(join(tmpdir(), "dau-vet-repo-"));
  const gitAt = (...a) => execFileSync("git", ["-c", "core.quotepath=false", ...a], { cwd: temp, encoding: "utf8" });
  /* Commit với GIỜ ĐẶT SẴN. Bản trước để git tự lấy giờ máy cho cả commit gieo hạt lẫn commit
     "dấu vết", nên hai commit rơi vào CÙNG MỘT GIÂY và mốc nhận nằm lẫn giữa chúng — ca
     "có commit sau mốc" không dựng được. Đặt giờ tường minh thì phép ghim không đua với đồng hồ. */
  const gitLuc = (khi, ...a) => execFileSync("git", ["-c", "core.quotepath=false", ...a],
    { cwd: temp, encoding: "utf8", env: { ...process.env, GIT_AUTHOR_DATE: khi, GIT_COMMITTER_DATE: khi } });
  const put = (rel, text) => {
    const t = join(temp, ...rel.split("/"));
    mkdirSync(dirname(t), { recursive: true });
    writeFileSync(t, text, "utf8");
  };
  try {
    gitAt("init", "-b", "main");
    gitAt("config", "user.name", "K2 Dau Vet");
    gitAt("config", "user.email", "k2@example.invalid");
    // Máy Windows hay bật `core.autocrlf` toàn cục; bật thì `git status` trong repo tạm coi mọi
    // file là đã bị sửa, và ca "chưa thấy dấu vết" không bao giờ dựng được.
    gitAt("config", "core.autocrlf", "false");
    mkdirSync(join(temp, "scripts"), { recursive: true });
    /* Chép đủ bộ: `session-check.mjs` import cả `handoff.mjs` lẫn `check-bootstrap.mjs`; thiếu
       một file thì repo tạm chết vì ERR_MODULE_NOT_FOUND, và cái chết đó trông y hệt một phép
       kiểm hỏng. */
    for (const name of ["repo-structure.mjs", "handoff.mjs", "session-check.mjs", "check-bootstrap.mjs",
                        "claim.mjs", "what-next.mjs", "build-dashboard.mjs", "feature-parity.mjs", "backlog-check.mjs", "chay-test.mjs"]) {
      copyFileSync(join(ROOT, "scripts", name), join(temp, "scripts", name));
    }
    put(".repo-structure.json", JSON.stringify({
      schema_version: 1,
      // Không phép kiểm cấu trúc nào CHẶN trong repo tạm: repo này cố ý thiếu gần hết bộ khung,
      // nên để trống danh sách chặn thì mã thoát của cổng chỉ còn nói về thứ ta đang đo.
      bootstrap: { blocking: [] },
      areas: {
        "docs/": { steward: "_docs", mutability: "rw", ownership_mode: "root" },
        "scripts/": { steward: "_code", mutability: "rw", ownership_mode: "root" },
        "workers/": { steward: null, mutability: "rw", ownership_mode: "per-package", claim_prefix: "workers/" }
      }
    }, null, 2));
    put("docs/ghi-chu.md", "seed\n");
    put("mot-file-goc.md", "seed\n");
    /* MỐC NHẬN nằm giữa commit gieo hạt (00:00:00) và commit dấu vết (01:00:00). Cả hai commit
       đặt giờ tường minh, nên phép ghim không phụ thuộc lúc nó chạy. */
    const moc = "2026-01-01T00:00:01Z";
    const bangQuyen = (chuCode) => JSON.stringify({ claims: {
      "_code":  { owner: chuCode,     claimed_at: moc },   // không commit, không sửa -> CHƯA THẤY
      "_docs":  { owner: "lane-im",   claimed_at: moc },   // có commit sau mốc         -> thôi báo
      "_root":  { owner: "lane-khac", claimed_at: moc }    // có file sửa trên đĩa      -> thôi báo
    } }, null, 2);
    put(".agents/claims.json", bangQuyen("lane-im"));
    // Đóng dấu niêm phong: thiếu nó thì cổng ĐỎ vì lý do chẳng liên quan, và mã thoát của cổng
    // hết nói lên điều gì về tín hiệu này.
    execFileSync(process.execPath, [join(temp, "scripts", "claim.mjs"), "--restamp", "--as", "lane-im"],
      { cwd: temp, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

    gitAt("add", ".");
    gitLuc(GIEO, "commit", "-m", "seed" + NL + NL + "Lane: nguoi-gieo");
    gitAt("update-ref", "refs/remotes/origin/main", "HEAD");

    // Một commit SAU mốc, chỉ chạm `docs/` — dấu vết bằng commit của `_docs`.
    put("docs/ghi-chu.md", "seed\nthem mot dong\n");
    gitAt("add", "docs/ghi-chu.md");
    gitLuc(SAU_MOC, "commit", "-m", "docs: mot dau vet that" + NL + NL + "Lane: lane-im");
    // Không commit nào chạm `_root` hay `_code` sau mốc — dấu vết của `_root` CHỈ đến từ một
    // file bị sửa trên đĩa, và `_code` thì không có gì cả.
    put("mot-file-goc.md", "seed\nsua tren dia, chua commit\n");

    const truocKhiChay = readFileSync(join(temp, ".agents", "claims.json"), "utf8");

    /* --- 5. `claim.mjs --list` --- */
    const list = spawnSync(process.execPath, [join(temp, "scripts", "claim.mjs"), "--list"], { cwd: temp, encoding: "utf8" });
    const dong = (khoa, chu) => list.stdout.split("\n").find((l) => l.includes(khoa) && l.includes(chu)) ?? "";
    const dongCode = dong("_code", "lane-im");
    assert.ok(dongCode.includes(CHUA_THAY_DAU_VET), `--list phai gan nhan cho vung im: ${dongCode}`);
    assert.ok(!dong("_docs", "lane-im").includes(CHUA_THAY_DAU_VET),
      "co commit sau moc thi --list THOI bao");
    assert.ok(!dong("_root", "lane-khac").includes(CHUA_THAY_DAU_VET),
      "co file sua tren dia thi --list THOI bao");
    for (const cam of CHU_CAM) {
      assert.ok(!dongCode.toLowerCase().includes(cam), `dong nhan cua --list khong duoc mang chu "${cam}"`);
    }
    ok("claim.mjs --list: gan nhan dung vung im, thoi bao khi co commit hoac co sua tren dia");

    /* --- 6. `what-next.mjs` — bản đồ việc mà phiên điều phối đọc --- */
    const wn = spawnSync(process.execPath, [join(temp, "scripts", "what-next.mjs")], { cwd: temp, encoding: "utf8" });
    assert.ok(wn.stdout.includes(CHUA_THAY_DAU_VET),
      `what-next phai hien tin hieu o muc B. stdout:\n${wn.stdout}\n${wn.stderr}`);
    assert.ok(wn.stdout.includes("HỎI, đừng nhả"),
      "what-next phai noi thang: thay tin hieu thi HOI, dung nha ho — cam 2b cua brief");
    ok("what-next.mjs: hien tin hieu kem cau nhac HOI, dung nha ho");

    /* --- 7. Cổng đóng phiên: VÀNG, KHÔNG ĐỎ ----
     *
     * ĐO BẰNG PHÉP SO HAI LƯỢT, không bằng một con số tuyệt đối. Repo tạm có thể đỏ vì lý do
     * chẳng liên quan, và lúc đó "mã thoát 1" không nói lên điều gì. Hai lượt khác nhau ĐÚNG
     * một chỗ — vùng `_code` có chủ hay không — nên chênh lệch mã thoát giữa chúng CHÍNH LÀ
     * ảnh hưởng của tín hiệu này, và nó phải bằng không. */
    const chayCong = () => spawnSync(process.execPath,
      [join(temp, "scripts", "session-check.mjs"), "--as", "lane-im", "--quick"], { cwd: temp, encoding: "utf8" });
    const coVang = chayCong();
    assert.ok(coVang.stdout.includes(CHUA_THAY_DAU_VET),
      `cong dong phien phai nhac chinh lane dang giu khoa. stdout:\n${coVang.stdout}\n${coVang.stderr}`);
    assert.ok(coVang.stdout.includes("VÀNG (không chặn)"), "phai noi ro day la VANG va khong chan");
    assert.ok(!coVang.stderr.includes("CỔNG BỊ SỬA"), "so phep kiem phai khop EXPECTED_CHECKS");

    /* --- 8. CẤM MÁY TỰ NHẢ KHOÁ — kiểm NGAY ở đây, trước khi lượt hai cố ý sửa bảng ---
     * Ba lượt đo vừa chạy (`--list`, `what-next`, cổng đóng phiên) đều thấy `_code` chưa có dấu
     * vết nào. Không lượt nào được phép tự trả khoá: máy HIỆN RA, người HỎI. */
    assert.equal(readFileSync(join(temp, ".agents", "claims.json"), "utf8"), truocKhiChay,
      "ba luot do vua chay KHONG duoc sua bang quyen mot byte nao: may HIEN RA, nguoi HOI");
    ok("cam may tu nha khoa: ba luot do khong sua bang quyen mot byte nao");

    // Lượt hai: đúng vùng đó không còn chủ, nên không còn gì để báo vàng.
    put(".agents/claims.json", bangQuyen(null));
    execFileSync(process.execPath, [join(temp, "scripts", "claim.mjs"), "--restamp", "--as", "lane-im"],
      { cwd: temp, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    const khongVang = chayCong();
    assert.ok(!khongVang.stdout.includes(CHUA_THAY_DAU_VET), "vung khong co chu thi khong co gi de bao");

    /* NỀN PHẢI XANH, nếu không thì phép so ở dưới rỗng nghĩa. Đo thật lúc viết: repo tạm thiếu
       `bootstrap.blocking` nên CẢ HAI lượt đều ra 1, hai con số bằng nhau, và đột biến "đổi vàng
       thành đỏ" THOÁT SẠCH qua phép so. Ghim nền xanh chính là chỗ bịt lỗ đó. */
    assert.equal(khongVang.status, 0,
      `nen phai XANH thi phep so moi noi len dieu gi. Ra ${khongVang.status}:\n${khongVang.stdout}`);
    assert.equal(coVang.status, khongVang.status,
      `MUC NGHIEM TRONG LA PHAN CUA HOP DONG: tin hieu nay VANG, khong bao gio DO — co vang ${coVang.status}`
      + ` vs khong vang ${khongVang.status}\n${coVang.stdout}`);
    ok("cong dong phien: VANG khong doi ma thoat (so hai luot), va noi voi chinh lane dang giu khoa");
  } finally { rmSync(temp, { recursive: true, force: true }); }
}

/* ---- 9. `package.json` PHẢI còn gọi phép ghim này ----
 *
 * Bài học N-01: một phép ghim không ai chạy thì nó cũng chỉ là bình luận. Gỡ nó khỏi
 * `scripts.test` là cả cơ chế trên biến mất trong im lặng, và mọi test vẫn xanh. */
{
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
  assert.ok(chuoiTestThat(pkg).includes("tests/dau-vet-vung-smoke.mjs"),
    "scripts.test phai con goi phep ghim nay — go no ra la co che bien mat trong im lang");
  ok("package.json con goi phep ghim nay");
}

console.log(`\n${passed} passed, 0 failed, ${passed} total`);
