/* CỔNG XUẤT BẢN — ĐỘ TƯƠI ARTIFACT PHẢI CHẶN ĐÚNG, VÀ CHỈ ĐÚNG THẾ (PUSH-GATE-01, 05/09).
 *
 * Hai khẳng định dưới đây KÉO NGƯỢC NHAU. Đó là điểm chính của file này: đạt vế một mà mất vế
 * hai thì không phải "sửa cổng", mà là "phá cổng". Nên chúng phải nằm cạnh nhau, trong cùng
 * một fixture, chạy trong cùng một lượt.
 *
 *   ① HẾT CHẶN OAN  — bộ sinh đang sửa dở trong cây làm việc KHÔNG được chặn một lane khác
 *                     đẩy các commit đã hoàn tất, không liên quan.
 *   ② CHẶN ĐÚNG VẪN CÒN — artifact đã commit lệch với HEAD thì VẪN bị từ chối, và câu từ chối
 *                     vẫn phải nói ra đúng bộ sinh cần chạy.
 *
 * VÌ SAO PHẢI DỰNG REPO GIẢ chứ không đo trên repo thật: ba bộ sinh thật của repo này chạy
 * `--check-head` mất ~40 giây một lượt, và chúng đọc dữ liệu thật nên không dựng nổi ca "lệch".
 * Bộ sinh giả ở đây bắt chước đúng ba tính chất mà phép kiểm dựa vào: tự suy gốc repo theo VỊ
 * TRÍ FILE CỦA CHÍNH NÓ, đọc đầu vào từ HEAD qua git, và `--check-head` thoát khác 0 khi lệch.
 *
 * PHẢI CHÉP SCRIPT SANG REPO TẠM, không được chỉ đổi thư mục đang đứng — `safe-push.mjs` suy
 * gốc repo từ vị trí file của chính nó. Cùng cái bẫy đã ghi trong `harness-smoke.mjs` khối 1.
 *
 * ĐỘT BIẾN KIỂM (bắt buộc theo `MULTIFLOW.md` mục 5, vì đây là một trong bốn cơ chế đa phiên):
 *   · Trả lại cửa "bộ sinh sửa dở thì từ chối" trong `safe-push.mjs`  → ① phải ĐỎ.
 *   · Bỏ nhánh `if (!artifact.ok)` trong `safe-push.mjs`               → ② phải ĐỎ.
 * Cả hai đã chạy thật lúc viết file này, và cả hai đỏ ĐÚNG khẳng định của mình.
 */

import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const NEWLINE = String.fromCharCode(10);
let passed = 0;
const ok = (name) => { passed += 1; console.log(`  ok  ${name}`); };

/* Bộ sinh giả. Ba tính chất phải giống bộ sinh thật, nếu không phép ghim đo nhầm thứ khác:
   1. ROOT suy từ vị trí file của chính nó — đây là lý do "chạy blob HEAD ở thư mục tạm" hỏng,
      và là lý do bản chụp phải là CẢ REPO chứ không phải một file.
   2. Đầu vào đọc từ HEAD qua git, không đọc cây làm việc.
   3. `--check-head` thoát 1 khi artifact đã commit lệch với bản sinh từ HEAD. */
const BO_SINH_GIA = [
  'import { execFileSync } from "node:child_process";',
  'import fs from "node:fs";',
  'import path from "node:path";',
  'import { fileURLToPath } from "node:url";',
  '',
  'const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");',
  'const oHead = (f) => execFileSync("git", ["show", `HEAD:${f}`], { cwd: ROOT, encoding: "utf8" });',
  'const mong = `ART:${oHead("hat-giong.txt").trim()}`;',
  '',
  'if (process.argv.includes("--check-head")) {',
  '  let daCommit = "";',
  '  try { daCommit = oHead("ART.txt"); } catch { daCommit = ""; }',
  '  if (daCommit !== mong) {',
  '    console.error("ART_CU: ART.txt da commit khong khop voi HEAD.");',
  '    process.exit(1);',
  '  }',
  '  console.log("ART.txt khop voi HEAD.");',
  '  process.exit(0);',
  '}',
  'fs.writeFileSync(path.join(ROOT, "ART.txt"), mong, "utf8");'
].join(NEWLINE);

function dungRepoGia() {
  const box = mkdtempSync(join(tmpdir(), "push-gate-"));
  const repo = join(box, "repo-gia");
  const bare = join(box, "origin.git");
  mkdirSync(repo, { recursive: true });
  const at = (...a) => execFileSync("git", a, { cwd: repo, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

  execFileSync("git", ["init", "-q", "--bare", "-b", "main", bare], { encoding: "utf8" });
  at("init", "-q", "-b", "main");
  at("config", "user.name", "thu"); at("config", "user.email", "thu@e.invalid");

  mkdirSync(join(repo, "scripts"), { recursive: true });
  mkdirSync(join(repo, ".agents"), { recursive: true });
  for (const name of ["safe-push.mjs", "repo-structure.mjs"]) {
    copyFileSync(join(ROOT, "scripts", name), join(repo, "scripts", name));
  }
  writeFileSync(join(repo, "scripts", "gia-lap-bo-sinh.mjs"), BO_SINH_GIA, "utf8");
  writeFileSync(join(repo, ".repo-structure.json"),
    JSON.stringify({ areas: {}, generators: ["gia-lap-bo-sinh.mjs"] }, null, 2), "utf8");
  writeFileSync(join(repo, ".agents", "claims.json"), JSON.stringify({ claims: {} }), "utf8");
  writeFileSync(join(repo, "hat-giong.txt"), "mot", "utf8");

  // Bộ sinh đọc đầu vào TỪ HEAD, nên phải có HEAD trước rồi mới sinh được — đúng như bộ sinh
  // thật. Hai commit: một cho đầu vào, một cho artifact.
  at("add", "-A");
  at("commit", "-q", "-m", `khoi tao${NEWLINE}${NEWLINE}Lane: lane-A`);
  execFileSync(process.execPath, [join(repo, "scripts", "gia-lap-bo-sinh.mjs")], { cwd: repo, encoding: "utf8" });
  at("add", "-A");
  at("commit", "-q", "-m", `sinh artifact lan dau${NEWLINE}${NEWLINE}Lane: lane-A`);
  at("remote", "add", "origin", bare);
  at("push", "-q", "origin", "main");

  const day = (as) => spawnSync(process.execPath, [join(repo, "scripts", "safe-push.mjs"), "--as", as, "--dry-run"],
    { cwd: repo, encoding: "utf8" });
  return { box, repo, at, day, dispose: () => rmSync(box, { recursive: true, force: true }) };
}

const g = dungRepoGia();
try {
  // Một commit đã hoàn tất, có nhãn, KHÔNG liên quan gì tới bộ sinh — đây là thứ lane-B muốn đẩy.
  writeFileSync(join(g.repo, "ghi-chu.txt"), "viec cua lane-B", "utf8");
  g.at("add", "-A");
  g.at("commit", "-q", "-m", `viec cua lane-B${NEWLINE}${NEWLINE}Lane: lane-B`);

  /* ---- ① HẾT CHẶN OAN ---------------------------------------------------- */
  {
    // Làm bẩn bộ sinh trong CÂY LÀM VIỆC, và làm bẩn theo kiểu ĐỘC nhất có thể: bản trong cây
    // làm việc luôn thoát 1. Nếu cổng còn dùng bản ở cây làm việc để phán xử — dù bằng cách
    // chạy nó, hay bằng cách từ chối tin nó — thì nó CHẮC CHẮN từ chối. Chỉ bản chạy trên ảnh
    // chụp HEAD mới qua được. Đây là điều làm phép ghim này không rỗng.
    const sach = readFileSync(join(g.repo, "scripts", "gia-lap-bo-sinh.mjs"), "utf8");
    writeFileSync(join(g.repo, "scripts", "gia-lap-bo-sinh.mjs"),
      `console.error("BAN SUA DO — khong duoc dung de phan xu"); process.exit(1);${NEWLINE}${sach}`, "utf8");

    const run = g.day("lane-B");
    const out = String(run.stdout || "") + String(run.stderr || "");
    assert.doesNotMatch(out, /TỪ CHỐI PUSH/,
      `bo sinh sua do trong cay lam viec KHONG duoc chan mot lane khac day viec khong lien quan.${NEWLINE}${out}`);
    assert.doesNotMatch(out, /đang sửa dở chưa commit/,
      "khong duoc con cua tu choi 'bo sinh dang sua do' — do la cho chan oan");
    assert.equal(run.status, 0, `phai day duoc (--dry-run thoat 0). Ra:${NEWLINE}${out}`);
    ok("① het chan oan: bo sinh ban trong cay lam viec khong chan lane khac");

    writeFileSync(join(g.repo, "scripts", "gia-lap-bo-sinh.mjs"), sach, "utf8");
  }

  /* ---- ② CHẶN ĐÚNG VẪN CÒN ----------------------------------------------- */
  {
    // Đổi đầu vào rồi commit mà KHÔNG sinh lại — artifact đã commit nay lệch với HEAD. Đây đúng
    // là ca mà bảo đảm cũ nói tới: "không ai đẩy được một nhánh mà artifact đã commit không khớp
    // với HEAD". Cây làm việc lúc này SẠCH, nên không có gì để đổ cho phiên khác.
    writeFileSync(join(g.repo, "hat-giong.txt"), "hai", "utf8");
    g.at("add", "-A");
    g.at("commit", "-q", "-m", `doi dau vao ma khong sinh lai${NEWLINE}${NEWLINE}Lane: lane-B`);

    const run = g.day("lane-B");
    const out = String(run.stdout || "") + String(run.stderr || "");
    assert.match(out, /TỪ CHỐI PUSH — sự thật máy sinh chưa khớp/,
      `artifact da commit lech voi HEAD thi VAN phai bi tu choi.${NEWLINE}${out}`);
    assert.match(out, /node scripts\/gia-lap-bo-sinh\.mjs/,
      "cau tu choi phai noi ro bo sinh nao can chay");
    assert.notEqual(run.status, 0, "phai thoat khac 0 — day la CHAN, khong phai canh bao");
    ok("② chan dung van con: artifact da commit lech voi HEAD thi VAN bi tu choi");
  }

  /* ---- ③ ĐỐI CHỨNG DƯƠNG ------------------------------------------------- */
  {
    // Không có khối này thì ② rỗng nghĩa: một bản "luôn từ chối" cũng qua sạch cả ①? Không —
    // ① đã là đối chứng dương một nửa. Nhưng ① chạy với cây làm việc BẨN, nên nó chưa chứng
    // minh được cổng cho qua khi mọi thứ ĐỀU sạch. Sinh lại rồi commit, phải hết từ chối.
    execFileSync(process.execPath, [join(g.repo, "scripts", "gia-lap-bo-sinh.mjs")], { cwd: g.repo, encoding: "utf8" });
    g.at("add", "-A");
    g.at("commit", "-q", "-m", `sinh lai${NEWLINE}${NEWLINE}Lane: lane-B`);

    const run = g.day("lane-B");
    const out = String(run.stdout || "") + String(run.stderr || "");
    assert.doesNotMatch(out, /TỪ CHỐI PUSH/, `sinh lai roi thi phai het tu choi.${NEWLINE}${out}`);
    assert.equal(run.status, 0, `phai thoat 0 sau khi sinh lai.${NEWLINE}${out}`);
    ok("③ doi chung duong: sinh lai roi commit thi cong cho qua");
  }
} finally { g.dispose(); }

console.log(`${NEWLINE}${passed} passed, 0 failed, ${passed} total`);
