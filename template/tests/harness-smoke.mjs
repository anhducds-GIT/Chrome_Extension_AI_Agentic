/* SUITE HẠT GIỐNG CỦA BỘ KHUNG — bộ khung phải mang theo lưới đỡ của chính nó.
 *
 * Vì sao file này tồn tại (K1, 02/09): bản trích đầu mang 5 script — bộ sinh, hai cổng kiểm,
 * công cụ đẩy — mà KHÔNG mang một phép kiểm nào, và `package.json` không khai `scripts.test`.
 * Hệ quả đo được: `hasRootTestScript()` trả false vĩnh viễn, nên cổng đóng phiên của MỌI repo
 * dựng từ bộ khung không bao giờ chạy một dòng test. Cổng có, mà không có răng.
 *
 * Bốn khối dưới đây KHÔNG phải là bộ test đầy đủ của bộ khung. Chúng là bốn chỗ đã HỎNG THẬT
 * trong repo sinh ra bộ khung này — nên chúng là bốn chỗ đáng ghim nhất khi bạn chưa có gì.
 *
 * **Đây là hạt giống, không phải đích.** Repo của bạn thêm test của repo bạn vào cùng thư mục
 * này và nối vào `scripts.test`. Đừng xoá bốn khối này để cho nhanh — mỗi khối là một lần
 * ai đó đã trả giá.
 */

import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { claimPrefixesFrom, ownershipKeys, readStructureFromDisk, unitsFrom } from "../scripts/repo-structure.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
let passed = 0;
const ok = (name) => { passed += 1; console.log(`  ok  ${name}`); };

/* ---- 1. Công cụ đẩy KHÔNG được im lặng khi không so được với remote ------- */
{
  // Ca hỏng thật: repo vừa dựng, chưa `fetch` lần nào, nên ref `origin/main` không phân giải
  // được. Bản đầu nuốt lỗi rồi in "Không có gì để push" và thoát 0 — báo thành công cho một
  // lần đẩy CHƯA HỀ XẢY RA. Đúng là ca của một repo mới, tức là repo của bạn, ngay lúc này.
  //
  // PHẢI CHÉP SCRIPT SANG REPO TẠM, không được chỉ đổi thư mục đang đứng. `safe-push.mjs` suy
  // gốc repo từ VỊ TRÍ FILE CỦA CHÍNH NÓ, nên gọi nó bằng đường dẫn tuyệt đối với `cwd` trỏ đi
  // chỗ khác thì nó vẫn làm việc trên repo chứa nó. Bản đầu của phép kiểm này mắc đúng lỗi đó:
  // nó dựng một repo tạm rất công phu rồi đo một repo hoàn toàn khác, và vẫn XANH — vì repo
  // chứa nó lúc ấy tình cờ cũng chưa có remote. Chạy lại ở một repo CÓ remote mới lộ ra.
  const temp = mkdtempSync(join(tmpdir(), "harness-push-"));
  try {
    const at = (...a) => execFileSync("git", a, { cwd: temp, encoding: "utf8" });
    at("init", "-q", "-b", "main");
    at("config", "user.name", "t"); at("config", "user.email", "t@e.invalid");
    mkdirSync(join(temp, "scripts"), { recursive: true });
    mkdirSync(join(temp, ".agents"), { recursive: true });
    for (const name of ["safe-push.mjs", "repo-structure.mjs"]) {
      copyFileSync(join(ROOT, "scripts", name), join(temp, "scripts", name));
    }
    copyFileSync(join(ROOT, ".repo-structure.json"), join(temp, ".repo-structure.json"));
    writeFileSync(join(temp, ".agents", "claims.json"), JSON.stringify({ claims: {} }), "utf8");
    writeFileSync(join(temp, "a.txt"), "hi", "utf8");
    at("add", "-A"); at("commit", "-q", "-m", "mot");

    const run = spawnSync(process.execPath, [join(temp, "scripts", "safe-push.mjs"), "--as", "thu", "--dry-run"],
      { cwd: temp, encoding: "utf8" });
    const out = String(run.stdout || "") + String(run.stderr || "");
    assert.doesNotMatch(out, /Không có gì để push/,
      "khong duoc bao 'khong co gi de push' khi chua so duoc voi remote");
    assert.match(out, /KHONG_CO_ORIGIN_MAIN/, "phai noi ro la khong phan giai duoc origin/main");
    assert.notEqual(run.status, 0, "phai thoat khac 0 — day la CHAN, khong phai bo qua");
    ok("day an toan: khong co origin/main thi CHAN, khong im lang bao xong");
  } finally { rmSync(temp, { recursive: true, force: true }); }
}

/* ---- 2. Một file chỉ thuộc MỘT vùng, và bảng khai chủ phải được TÔN TRỌNG --- */
{
  // Đã lệch HAI LẦN ở cùng hai file: hai bản regex riêng (26/08), rồi một hàm mới chỉ nối cho
  // cổng mà không nối cho công cụ đẩy (02/09). Lần hai: cổng quy `docs/x.md` về `_docs`, công
  // cụ đẩy quy về `_root` — phiên giữ `_docs` làm xong, cổng XANH, rồi bị chính công cụ đẩy
  // từ chối đẩy việc của mình.
  //
  // CHÚ Ý — vì sao khối này TỰ DỰNG cấu trúc thay vì đọc `.repo-structure.json` của repo:
  // bộ khung khai mọi thư mục về cùng một chủ `_root`, nên đọc cấu trúc thật thì MỌI đường dẫn
  // đều trả `_root` và phép kiểm không phân biệt được gì — nó sẽ xanh kể cả khi hàm quy chủ bị
  // hỏng hoàn toàn. Đo thật lúc viết: cả bốn đường dẫn đều ra `_root`. Muốn ghim được thì
  // fixture PHẢI dựng nổi ca nhiều chủ.
  const nhieuChu = {
    areas: {
      "docs/": { steward: "_docs", ownership_mode: "root" },
      "scripts/": { steward: "_code", ownership_mode: "root" },
      "tests/": { steward: "_code", ownership_mode: "root" }
    }
  };
  const prefixes = claimPrefixesFrom(nhieuChu);
  const mong = { "docs/a.md": "_docs", "scripts/b.mjs": "_code", "tests/c.mjs": "_code", "README.md": "_root" };
  for (const [file, vung] of Object.entries(mong)) {
    const ra = ownershipKeys([file], nhieuChu, prefixes, () => false);
    assert.deepEqual(ra, [vung], `${file}: phai quy ve ${vung}, khong phai ${JSON.stringify(ra)}`);
  }
  // Quy cả cụm phải ra đúng tập hợp của quy lẻ — đây là chỗ hai công cụ từng lệch nhau.
  const cum = ownershipKeys(Object.keys(mong), nhieuChu, prefixes, () => false);
  assert.deepEqual([...cum].sort(), [...new Set(Object.values(mong))].sort(),
    "quy ca cum phai ra dung tap hop cua quy le");
  ok("quy chu: bang khai nhieu chu duoc ton trong, quy le va quy cum cung dap an");
}

/* ---- 3. Khai cấu trúc SAI thì phải NÉM, không lặng lẽ lùi về mặc định ------ */
{
  // Fail-open ở đây là kiểu hỏng tệ nhất của cả bộ khung: khai sai một chữ thì mọi commit bị
  // quy chủ sai, mà bảng vẫn đẹp và cổng vẫn xanh.
  const xau = [
    { units: { root_dir: "", marker: "manifest.json", depth: 2 } },
    { units: { root_dir: "pkgs", marker: "", depth: 2 } },
    { units: { root_dir: "..", marker: "manifest.json", depth: 2 } }
  ];
  for (const cfg of xau) {
    assert.throws(() => unitsFrom(cfg), `khai sai phai NEM, khong duoc lui ve mac dinh: ${JSON.stringify(cfg)}`);
  }
  // ĐỐI CHỨNG DƯƠNG — không có nó thì ba dòng trên rỗng nghĩa: một hàm ném với MỌI đầu vào
  // cũng qua được. Phải chứng minh nó KHÔNG ném với đầu vào đúng.
  assert.doesNotThrow(() => unitsFrom({ units: { root_dir: "pkgs", marker: "manifest.json", depth: 2 } }),
    "khai DUNG thi khong duoc nem — neu nem thi phep kiem tren khong chung minh duoc gi");
  ok("doc cau hinh: khai sai thi NEM (3 ca), khai dung thi khong (doi chung duong)");
}

/* ---- 4. Cổng kiểm cấu trúc phải XANH trên chính repo này ------------------- */
{
  // Nghiệm thu mà README hứa. Nếu repo của bạn đỏ ở đây thì đọc thẳng thông báo của cổng —
  // mỗi dòng nói cả chỗ sai lẫn cách sửa.
  const run = spawnSync(process.execPath, [join(ROOT, "scripts", "check-bootstrap.mjs")], { cwd: ROOT, encoding: "utf8" });
  const out = String(run.stdout || "") + String(run.stderr || "");
  const summary = out.split("\n").find((l) => l.startsWith("TỔNG:")) ?? "";
  const m = summary.match(/([0-9]+)[^0-9]*chỗ[^0-9]*ĐỎ/);
  assert.ok(m, `khong doc duoc so cho DO tu dong tong ket: "${summary}"`);
  assert.equal(Number(m[1]), 0, `cong kiem cau truc con cho DO: "${summary}"`);
  ok("cong kiem cau truc: 0 cho DO tren chinh repo nay");
}

console.log(`\n${passed} passed, 0 failed, ${passed} total`);
