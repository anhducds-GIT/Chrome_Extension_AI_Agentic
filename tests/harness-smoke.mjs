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
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { claimPrefixesFrom, kiemKhoaLa, ownershipKeys, readStructureFromDisk, unitsFrom } from "../scripts/repo-structure.mjs";
import { grandfatheredNote } from "../scripts/check-bootstrap.mjs";
import { isBehaviourFile } from "../scripts/build-dashboard.mjs";

/* Cấu trúc cho fixture: bỏ `docs.file_map` để bản đồ quay về mặc định `AGENTS.md` — fixture tự
   dựng bản đồ của nó trong AGENTS.md, còn repo thật khai bản đồ ở `docs/BAN-DO-CHI-TIET.md`.
   Không bỏ thì cổng báo "khai sai bản đồ" (đúng luật) thay vì kể tên file chưa khai. */
const docCauTrucThu = () => {
  const ct = JSON.parse(readFileSync(join(ROOT, ".repo-structure.json"), "utf8"));
  if (ct.docs) delete ct.docs.file_map;
  return ct;
};
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
let passed = 0;
const ok = (name) => { passed += 1; console.log(`  ok  ${name}`); };

/* ---- 1. Công cụ đẩy KHÔNG được im lặng khi không so được với remote ------- */
{
  // Hai ca có CÙNG hình dạng "không phân giải được origin/main", nhưng phải xử khác hẳn:
  //   a) remote CHƯA CÓ nhánh main -> cú đẩy ĐẦU TIÊN của repo mới. Hợp lệ; mọi repo dựng từ
  //      harness đều đi qua ca này, nên chặn nó là chặn chính việc harness sinh ra để làm.
  //   b) remote CÓ nhánh main mà máy không có -> máy đang lệch. PHẢI chặn: đếm "chưa đẩy" bằng
  //      một mốc không tồn tại là báo xong cho một cú đẩy CHƯA HỀ XẢY RA.
  // Bản đầu gộp cả hai vào một nhánh chặn, và repo nhà của harness không đẩy nổi lần đầu.
  //
  // PHẢI CHÉP SCRIPT SANG REPO TẠM, không chỉ đổi thư mục đang đứng: `safe-push.mjs` suy gốc
  // repo từ VỊ TRÍ FILE CỦA CHÍNH NÓ. Bản đầu của phép kiểm này dựng một repo tạm rất công phu
  // rồi đo một repo hoàn toàn khác, và vẫn XANH — vì repo chứa nó lúc ấy tình cờ cũng chưa có
  // remote.
  const temp = mkdtempSync(join(tmpdir(), "harness-push-"));
  try {
    const at = (...a) => execFileSync("git", a, { cwd: temp, encoding: "utf8" });
    at("init", "-q", "-b", "main");
    at("config", "user.name", "t"); at("config", "user.email", "t@e.invalid");
    mkdirSync(join(temp, "scripts"), { recursive: true });
    mkdirSync(join(temp, ".agents"), { recursive: true });
    /* `chay-test.mjs` PHAI di theo tu ban 1.3.79: safe-push doc dau xac nhan suite de quyet
       * dinh co tu dong cuon theo commit lane khac hay khong. Them mot import la them mot rang
       * buoc "nhung file nay di cung nhau" — ba fixture do ngay luot dau vi thieu no. */
    for (const name of ["safe-push.mjs", "repo-structure.mjs", "chay-test.mjs"]) {
      copyFileSync(join(ROOT, "scripts", name), join(temp, "scripts", name));
    }
    writeFileSync(join(temp, ".repo-structure.json"), JSON.stringify(docCauTrucThu(), null, 2), "utf8");
    writeFileSync(join(temp, ".agents", "claims.json"), JSON.stringify({ claims: {} }), "utf8");
    writeFileSync(join(temp, "a.txt"), "hi", "utf8");
    at("add", "-A"); at("commit", "-q", "-m", "mot");

    const chay = () => {
      const r = spawnSync(process.execPath, [join(temp, "scripts", "safe-push.mjs"), "--as", "thu", "--dry-run"],
        { cwd: temp, encoding: "utf8" });
      return { ...r, out: String(r.stdout || "") + String(r.stderr || "") };
    };

    // (a) chưa có remote nào -> KHÔNG được nói "không có gì để push"
    const a1 = chay();
    assert.doesNotMatch(a1.out, /Không có gì để push/,
      "khong duoc bao 'khong co gi de push' khi chua so duoc voi remote");
    assert.match(a1.out, /LẦN ĐẦU/, "remote chua co nhanh main thi phai nhan day la cu day dau tien");
    assert.match(a1.out, /mot/, "lan dau thi phai liet ke TOAN BO lich su, khong bo trong");

    // (b) ĐÃ CÓ remote và ĐANG BẰNG NHAU -> "không có gì để push" lúc này là câu ĐÚNG.
    // Đây là đối chứng cho (a): thiếu nó thì một script luôn in "LẦN ĐẦU" cũng qua được (a).
    const bare = mkdtempSync(join(tmpdir(), "harness-bare-"));
    try {
      execFileSync("git", ["init", "-q", "--bare", "-b", "main", bare], { encoding: "utf8" });
      at("remote", "add", "origin", bare);
      at("push", "-q", "origin", "main");
      const b1 = chay();
      assert.match(b1.out, /Không có gì để push/, "bang nhau that thi noi bang nhau moi dung");
      assert.doesNotMatch(b1.out, /LẦN ĐẦU/, "da co nhanh main tren remote thi khong con la lan dau");

      // (c) có remote, và máy ĐI TRƯỚC -> phải liệt kê ĐÚNG commit đang chờ, không im.
      writeFileSync(join(temp, "b.txt"), "them", "utf8");
      at("add", "-A"); at("commit", "-q", "-m", "hai");
      const c1 = chay();
      assert.doesNotMatch(c1.out, /Không có gì để push/, "co commit cho ma bao khong co gi la fail-open");
      assert.match(c1.out, /hai/, "phai liet ke commit dang cho");
      assert.doesNotMatch(c1.out, /mot/, "chi liet ke phan CHUA day, khong ke lai lich su cu");
    
      // (d) DUNG NGOAI `main` -> phai TU CHOI. Day la lo nguy hiem nhat tung tim thay o cong cu
      // nay: moi phep soi chay tren `origin/main..HEAD`, con cau day cu la `git push origin main`
      // — tuc nhanh main TREN MAY. Dung o nhanh khac thi hai thu do la hai lich su khac nhau:
      // soi mot dang, day mot neo. Cong cu sinh ra de chan "day kem viec nguoi khac" lai co the
      // tu lam dung viec do. Audit doc lap bat duoc 03/09.
      at("checkout", "-q", "-b", "nhanh-khac");
      writeFileSync(join(temp, "c.txt"), "rieng", "utf8");
      at("add", "-A"); at("commit", "-q", "-m", "ba");
      const d1 = chay();
      assert.match(d1.out, /TU_CHOI/, "dung ngoai main thi phai TU CHOI, khong duoc am tham day nhanh main tren may");
      assert.match(d1.out, /nhanh-khac/, "phai noi ro dang dung o nhanh nao");
      assert.notEqual(d1.status, 0, "tu choi thi ma thoat phai khac 0");
      at("checkout", "-q", "main");
    } finally { rmSync(bare, { recursive: true, force: true }); }

    ok("đẩy an toàn: lần đầu · bằng nhau · đi trước — cả ba nói đúng, không ca nào im lặng");
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
  // GÕ SAI TÊN TRƯỜNG cũng phải bị bắt, không chỉ gõ sai GIÁ TRỊ. Cấu hình vẫn là JSON hợp lệ,
  // vẫn parse ngon, và hậu quả không hiện ra ở đâu: `root_dri` làm bộ máy quét sai thư mục,
  // `mutabilty` làm vùng bằng chứng KHÔNG CÒN được bảo vệ chỉ-thêm. Cả hai đều im.
  assert.equal(kiemKhoaLa({ units: { root_dri: "pkgs" } }).length, 1, "go sai ten truong trong units phai bi bat");
  assert.equal(kiemKhoaLa({ areas: { "evidence/": { mutabilty: "append-only" } } }).length, 1,
    "go sai `mutabilty` phai bi bat — no lam MAT lop bao ve chi-them ma khong bao gi");
  // ĐỐI CHỨNG DƯƠNG: cấu hình đúng và các trường chú thích `_...` không được bị kêu oan.
  assert.deepEqual(kiemKhoaLa({ units: { _doc: "ghi chú", root_dir: "pkgs", marker: "m.json", depth: 2, ten: "Gói" } }), []);
  assert.deepEqual(kiemKhoaLa(readStructureFromDisk(ROOT)), [], "cau hinh THAT cua repo nay phai sach");
  ok("doc cau hinh: sai gia tri thi NEM · sai TEN TRUONG cung bi bat · khai dung thi khong");
}

/* ---- 4. Cổng kiểm cấu trúc phải XANH trên chính repo này ------------------- */
{
  // Nghiệm thu mà README hứa. Nếu repo của bạn đỏ ở đây thì đọc thẳng thông báo của cổng —
  // mỗi dòng nói cả chỗ sai lẫn cách sửa.
  const run = spawnSync(process.execPath, [join(ROOT, "scripts", "check-bootstrap.mjs")], { cwd: ROOT, encoding: "utf8" });
  const out = String(run.stdout || "") + String(run.stderr || "");
  const summary = out.split("\n").find((l) => l.startsWith("TỔNG:")) ?? "";

  // ĐỌC MÃ THOÁT, ĐỪNG ĐẾM TỔNG SỐ ĐỎ.
  //
  // Bản đầu đòi tổng số ĐỎ bằng 0. Nhưng quy trình migrate dặn để `bootstrap.blocking` RỖNG ở
  // repo mới — CHÍNH VÌ repo cũ chắc chắn đỏ vài chỗ, và bật chặn khi đang đỏ là tự khoá repo ở
  // phiên đầu tiên. Hai câu đó đá nhau: `check-bootstrap` thoát 0 (không phép kiểm CHẶN nào đỏ)
  // trong khi suite này thoát 1. Hai cửa đo cùng một thứ, trả hai kết quả, và **repo vừa migrate
  // không bao giờ xanh được**. Đo thật trên repo "Project 3 AI Agent Unify" ngày 03/09:
  // `check-bootstrap` exit 0 · `TỔNG: 63 chỗ ĐỎ (B10)` · suite này exit 1.
  //
  // Mã thoát mới là hợp đồng của cổng: nó đã biết phép kiểm nào đang CHẶN ở repo NÀY. Suite thì
  // không, và không nên đoán hộ.
  assert.equal(run.status, 0,
    `cong kiem cau truc thoat khac 0 — co phep kiem thuoc nhom CHAN dang do: "${summary}"`);

  // Nhưng đừng tin mã thoát một cách mù quáng: một `check-bootstrap` rỗng cũng thoát 0. Đòi có
  // dòng tổng kết đọc được, để "thoát 0" phải kèm bằng chứng là nó đã thật sự chạy.
  assert.ok(summary, "thoat 0 nhung KHONG co dong TONG: — cong nay chua chay gi, khong duoc tin");
  assert.match(summary, /chỗ[^0-9]*ĐỎ/, `dong tong ket khong doc duoc: "${summary}"`);
  ok("cong kiem cau truc: nhom CHAN dat het, va co bang chung da chay that");
}

/* ---- 5. Danh sách miễn trừ phải ĐƯỢC ĐỌC, dù khai kiểu nào ---------------- */
{
  // Bản hạt giống khai `"grandfathered": []` (một MẢNG). Bản đọc cũ hỏi `block.paths`, mà mảng
  // thì không có `.paths` — nên nó luôn đếm 0 và phép kiểm ngược KHÔNG BAO GIỜ CHẠY. Không ném,
  // không đỏ, không thiếu dòng nào trên màn hình: một phép kiểm đứng đó mà không kiểm gì.
  const gia = (grandfathered, tracked) => ({
    fileExists: () => true,
    readFile: () => JSON.stringify({ grandfathered }),
    git: { trackedPaths: () => tracked }
  });

  // (a) hình dạng MẢNG — hình dạng bản hạt giống thật sự dùng
  {
    const n = grandfatheredNote(gia(["cu/a.md", "cu/b.md"], ["cu/a.md"]));
    assert.equal(n.declared, 2, "khai kieu MANG phai duoc dem, dang dem 0 = phep kiem chet");
    assert.deepEqual(n.gone, ["cu/b.md"], "duong dan da bien mat khoi HEAD phai bi keu ten");
  }

  // (b) hình dạng KHỐI CÓ `paths` — hình dạng bản đọc cũ mong đợi. Vẫn phải chạy.
  {
    const n = grandfatheredNote(gia({ paths: ["cu/a.md"] }, []));
    assert.equal(n.declared, 1, "khai kieu KHOI cung phai duoc dem");
    assert.deepEqual(n.gone, ["cu/a.md"]);
  }

  // (c) hình dạng LẠ — phải KÊU LÊN, không im lặng nhận 0. Im lặng chấp nhận mọi thứ chính là
  //     cách lỗi này sinh ra lần đầu.
  {
    const n = grandfatheredNote(gia("cu/a.md", []));
    assert.equal(n.declared, 0);
    assert.ok(n.hinhDangLa, "hinh dang la thi phai bao, khong duoc im lang tra 0");
  }

  // (d) ĐỐI CHỨNG DƯƠNG: không khai gì thì không có ghi chú, và không được kêu hình dạng lạ.
  {
    assert.equal(grandfatheredNote(gia(undefined, [])), null, "khong khai thi khong co ghi chu");
    assert.equal(grandfatheredNote(gia([], [])).hinhDangLa, null, "mang rong la HOP LE, khong duoc keu");
  }
  ok("mien tru vinh vien: doc duoc ca hai hinh dang, hinh dang la thi keu len");
}

/* ---- 6. Sản phẩm của bộ sinh không được đếm là "code đã đổi" ------------- */
{
  // Vòng lặp không điểm dừng: sinh lại → `repo-map.json` đổi → cột "code đã đổi sau kiểm chứng"
  // bật CÓ → phải kiểm chứng lại → ghi mốc mới → sinh lại → … Đo thật ở repo NAV ngày 03/09:
  // KHÔNG → CÓ (1) → CÓ (2) → CÓ (3). Repo nhà không bắt được vì `STATUS.md` của chính nó khai
  // `lifecycle: building` và không có `last_verified_commit` — bộ khung chưa từng tự đi qua con
  // đường nó bán cho người khác.
  for (const f of ["repo-map.json", "llms.txt", "DASHBOARD.md"]) {
    assert.equal(isBehaviourFile(f), false, `${f} la san pham cua bo sinh, khong duoc dem la code doi`);
  }
  // ĐỐI CHỨNG DƯƠNG: code thật vẫn phải được đếm, kẻo bản vá này biến phép đo thành luôn-false.
  for (const f of ["scripts/x.mjs", "app/main.js", "src/a.json", "page/index.html"]) {
    assert.equal(isBehaviourFile(f), true, `${f} la code that, PHAI duoc dem`);
  }
  // Vùng bằng chứng vẫn không tính, và tài liệu cũng không.
  assert.equal(isBehaviourFile("evidence/run-1/a.json"), false);
  assert.equal(isBehaviourFile("docs/x.md"), false);

  // CA HỎNG ĐÃ XẢY RA THẬT, 05/09 — ba file cứng ở trên KHÔNG đủ. Repo nhà sinh thêm hai trang
  // `.html`, chúng lọt vào danh sách đuôi file hành vi, và cổng đóng phiên đỏ VĨNH VIỄN: mỗi
  // commit sinh lại artifact tự làm artifact vừa sinh cũ đi, không thứ tự commit nào hội tụ.
  // Danh sách ba file trên xanh suốt trong khi ca hỏng nằm ngay trong repo — phép kiểm không
  // phân biệt được hai nhánh thì nó là đồ trang trí, dù nó xanh (luật vàng số 2).
  //
  // Tên hai file đó mang tên dự án, mà file này đi theo bản trích — nên chúng KHÔNG được đóng
  // cứng ở đây. Repo tự khai qua `generated_files`; phép kiểm dựng khai báo giả để đo cơ chế.
  const khai = { generatedFiles: ["DASHBOARD-Ten-Repo.html", "SO-MIGRATE-Ten-Repo.html"] };
  for (const f of ["DASHBOARD-Ten-Repo.html", "SO-MIGRATE-Ten-Repo.html"]) {
    assert.equal(isBehaviourFile(f, khai), false, `${f} da khai la may sinh, khong duoc dem`);
    // VẾ THỨ HAI, và không có nó thì vế trên vô nghĩa: CHƯA khai thì vẫn phải đếm. Thiếu vế này
    // thì một bản vá biến mọi `.html` thành không-đếm cũng qua được phép kiểm.
    assert.equal(isBehaviourFile(f), true, `${f} chua khai thi PHAI van bi dem`);
  }
  // Khai một file không liên quan không được làm file khác thoát lưới.
  assert.equal(isBehaviourFile("app/main.html", khai), true, "file khong khai PHAI van bi dem");
  ok("san pham may sinh khong bi dem la code doi (ca ba file cung LAN file repo tu khai)");
}

/* ---- 7. Sửa vùng gốc mà không ghi Log thì phải ĐỎ ------------------------ */
{
  // Bản cũ chỉ duyệt `myPackages`. Repo KHÔNG có package con — như chính repo bộ khung này —
  // thì phép kiểm luôn trả "Không có gì phải ghi", kể cả khi phiên vừa viết lại nửa bộ máy.
  // Tức luật "phiên sau phải biết phiên trước làm gì" chưa từng được cưỡng chế ở đúng nơi việc
  // nặng nhất diễn ra. Audit độc lập bắt được 03/09.
  //
  // Ba ca, và ca thứ ba là chỗ dễ tưởng đã xong nhất: `git diff --numstat` cho một dòng bị SỬA
  // ra `1 thêm / 1 xoá`, nên phép đo "có dòng thêm" vẫn đạt. Log là thứ CHỈ ĐƯỢC THÊM.
  const fx = mkdtempSync(join(tmpdir(), "harness-log-"));
  try {
    const at = (...a) => execFileSync("git", a, { cwd: fx, encoding: "utf8" });
    at("init", "-q", "-b", "main");
    at("config", "user.name", "t"); at("config", "user.email", "t@e.invalid");
    mkdirSync(join(fx, "scripts"), { recursive: true });
    mkdirSync(join(fx, ".agents"), { recursive: true });
    /* CHÉP CẢ `scripts/`, KHÔNG gõ danh sách — xem ghi chú ở `tests/cong-do-that.mjs`: một danh
       sách gõ tay từng thiếu một import mới, và cổng cấu trúc CHẾT trong fixture suốt cả ngày mà
       suite vẫn xanh. Chép cả thư mục thì lớp lỗi đó biến mất theo cấu trúc. */
    for (const n of readdirSync(join(ROOT, "scripts")).filter((x) => x.endsWith(".mjs"))) {
      copyFileSync(join(ROOT, "scripts", n), join(fx, "scripts", n));
    }
    writeFileSync(join(fx, ".repo-structure.json"), JSON.stringify(docCauTrucThu(), null, 2), "utf8");
    copyFileSync(join(ROOT, "AGENTS.md"), join(fx, "AGENTS.md"));
    const cauHinhFx = docCauTrucThu();
    // Khai DU moi steward. Thieu mot khoa thi phep kiem "bat bien quyen so huu" do, va khoi
    // nay se doc nham cai do do la ket qua cua chinh no.
    const claimsFx = { claims: {} };
    for (const v of Object.values(cauHinhFx.areas ?? {})) {
      const k = v?.steward; if (k) claimsFx.claims[k] = { owner: null, task: null };
    }
    claimsFx.claims._root = { owner: "thu", task: "t" };
    claimsFx.claims._code = { owner: "thu", task: "t" };
    writeFileSync(join(fx, ".agents", "claims.json"), JSON.stringify(claimsFx), "utf8");
    writeFileSync(join(fx, "HANDOFF.md"), "# HANDOFF\n\n## Log\n- cu\n", "utf8");
    writeFileSync(join(fx, "package.json"), JSON.stringify({ name: "fx", private: true, type: "module", scripts: { test: "node -e 0" } }), "utf8");
    at("add", "-A"); at("commit", "-q", "-m", "nen");

    const chay = () => {
      const r = spawnSync(process.execPath, [join(fx, "scripts", "session-check.mjs"), "--as", "thu"], { cwd: fx, encoding: "utf8" });
      const out = String(r.stdout || "") + String(r.stderr || "");
      // Lay DUNG dong cua phep kiem nay. Cat theo cua so ky tu thi de nuot nham dau hieu
      // cua phep kiem KE BEN, va phep kiem se xanh/do vi ly do khong lien quan.
      const ds = out.split(String.fromCharCode(10));
      const k = ds.findIndex((l) => l.includes("HANDOFF đã ghi Log"));
      return k < 0 ? "(khong thay phep kiem HANDOFF)" : ds.slice(k, k + 2).join(String.fromCharCode(10));
    };

    const themVaoCode = () => writeFileSync(join(fx, "scripts", "claim.mjs"),
      readFileSync(join(fx, "scripts", "claim.mjs"), "utf8") + "\n// doi\n", "utf8");

    // (a) sửa code vùng gốc, KHÔNG ghi Log -> ĐỎ
    themVaoCode();
    assert.match(chay(), /ĐỎ/, "sua vung goc ma khong ghi Log thi phai DO");

    // (b) THÊM một dòng Log -> XANH
    writeFileSync(join(fx, "HANDOFF.md"), readFileSync(join(fx, "HANDOFF.md"), "utf8") + "- moi\n", "utf8");
    assert.match(chay(), /XANH/, "them dong Log that thi phai XANH");

    // (c) chỉ SỬA dòng Log cũ, không thêm dòng nào -> ĐỎ.
    //     Không có ca này thì phép đo "có dòng thêm" trông như đã canh, thật ra không: một dòng
    //     bị sửa cũng cho `them > 0`.
    at("add", "-A"); at("commit", "-q", "-m", "moc");
    themVaoCode();
    writeFileSync(join(fx, "HANDOFF.md"), readFileSync(join(fx, "HANDOFF.md"), "utf8").replace("- cu", "- cu sua"), "utf8");
    assert.match(chay(), /ĐỎ/, "sua dong Log CU khong phai la ghi Log — phai DO");

    ok("Log vung goc: khong ghi thi DO · them dong thi XANH · sua dong cu van DO");
  } finally { rmSync(fx, { recursive: true, force: true }); }
}

/* ---- 8. Quét secret: đọc mọi loại file, và không kêu oan ---------------- */
{
  // Bản đầu chỉ đọc `.js .mjs .json .md .ps1 .cmd`. Tức `.env`, `.yaml`, `.py` — đúng những nơi
  // secret hay nằm nhất — KHÔNG BAO GIỜ được mở ra. Tệ hơn: câu kết in "Quét N file được track,
  // sạch" với N là TỔNG số file track, trong khi nó chỉ đọc một phần. Lỗ thì vá được; một con số
  // nói dối trong báo cáo thì làm người đọc thôi không kiểm nữa.
  //
  // Nhưng mở rộng ra rồi thì phải KHÔNG KÊU OAN, kẻo cổng bị tắt. Cả hai chiều đều đã hỏng thật
  // trong cùng một ngày, nên cả hai đều phải có ca ở đây.
  const fx = mkdtempSync(join(tmpdir(), "harness-secret-"));
  try {
    const at = (...a) => execFileSync("git", a, { cwd: fx, encoding: "utf8" });
    at("init", "-q", "-b", "main");
    at("config", "user.name", "t"); at("config", "user.email", "t@e.invalid");
    mkdirSync(join(fx, "scripts"), { recursive: true });
    mkdirSync(join(fx, ".agents"), { recursive: true });
    /* CHÉP CẢ `scripts/`, KHÔNG gõ danh sách — xem ghi chú ở `tests/cong-do-that.mjs`: một danh
       sách gõ tay từng thiếu một import mới, và cổng cấu trúc CHẾT trong fixture suốt cả ngày mà
       suite vẫn xanh. Chép cả thư mục thì lớp lỗi đó biến mất theo cấu trúc. */
    for (const n of readdirSync(join(ROOT, "scripts")).filter((x) => x.endsWith(".mjs"))) {
      copyFileSync(join(ROOT, "scripts", n), join(fx, "scripts", n));
    }
    writeFileSync(join(fx, ".repo-structure.json"), JSON.stringify(docCauTrucThu(), null, 2), "utf8");
    copyFileSync(join(ROOT, "AGENTS.md"), join(fx, "AGENTS.md"));
    writeFileSync(join(fx, ".agents", "claims.json"), JSON.stringify({ claims: {} }), "utf8");
    writeFileSync(join(fx, "HANDOFF.md"), "# HANDOFF\n", "utf8");
    writeFileSync(join(fx, "package.json"), JSON.stringify({ name: "fx", type: "module", scripts: { test: "node -e 0" } }), "utf8");
    at("add", "-A"); at("commit", "-q", "-m", "nen");

    const dongSecret = () => {
      const r = spawnSync(process.execPath, [join(fx, "scripts", "session-check.mjs"), "--as", "thu"], { cwd: fx, encoding: "utf8" });
      const ds = (String(r.stdout || "") + String(r.stderr || "")).split("\n");
      const k = ds.findIndex((l) => l.includes("Không có secret"));
      return k < 0 ? "(khong thay phep kiem secret)" : ds.slice(k, k + 2).join("\n");
    };
    // GHÉP CHUỖI LÚC CHẠY, đừng viết thẳng vào mã nguồn. Bộ quét đọc MỌI file được track — kể cả
    // chính file này — nên một fixture viết thẳng sẽ làm cổng báo đỏ trên chính suite của nó.
    // Gặp thật ngay lần chạy đầu sau khi mở rộng bộ quét.
    const bi = "Qz7Rm2Vp9Ks4" + "Wt6Yb1Nc3Hd5Jf";
    const dat = (ten, noiDung) => { writeFileSync(join(fx, ten), noiDung, "utf8"); at("add", ten); };
    const go = (ten) => { at("rm", "-q", "-f", ten); };

    // (a) `.env` — đuôi mà bản cũ KHÔNG BAO GIỜ mở ra
    dat(".env", "OPENAI_API_" + "KEY=" + bi + "8" + String.fromCharCode(10));
    assert.match(dongSecret(), /ĐỎ/, "secret trong .env phai bi bat — day la doi duoc bo qua hoan toan o ban cu");
    go(".env");

    // (b) giá trị có nháy trong mã nguồn
    dat("a.js", "const x = { api_" + "key: " + JSON.stringify(bi) + " };" + String.fromCharCode(10));
    assert.match(dongSecret(), /ĐỎ/, "secret co nhay trong ma nguon phai bi bat");
    go("a.js");

    // (c) KHÔNG KÊU OAN — một lời gọi hàm. Ca thật ở repo Project 3AI: `_paperclip_env_value`
    //     vừa đủ 20 ký tự nên lot qua bản đầu, và cổng báo đỏ cho một dòng hoàn toàn vô hại.
    dat("b.py", "api_key = _paperclip_env_value(PAPERCLIP_API_KEY_ENV)\n");
    assert.match(dongSecret(), /XANH/, "loi goi ham KHONG phai secret — keu oan thi cong se bi tat");
    go("b.py");

    // (d) KHÔNG KÊU OAN — fixture tự khai mình là đồ giả
    dat("c.mjs", "const t = { to" + "ken: " + JSON.stringify("test-one-session-token-value") + " };" + String.fromCharCode(10));
    assert.match(dongSecret(), /XANH/, "fixture co chu 'test' khong phai secret that");
    go("c.mjs");

    // (e) ĐỐI CHỨNG: repo sạch thì phải XANH, và phải nói ĐÃ ĐỌC THẬT bao nhiêu file
    const sach = dongSecret();
    assert.match(sach, /XANH/, "repo sach phai XANH");
    assert.match(sach, /Đọc thật/, "phai bao so file DOC THAT, khong duoc bao tong so file track");
    ok("quet secret: doc ca .env · bat gia tri co nhay · khong keu oan loi goi ham va fixture");
  } finally { rmSync(fx, { recursive: true, force: true }); }
}

/* ---- 6. Mã thoát 0 KHÔNG phải bằng chứng --------------------------------- */
{
  // Lỗ này đã được dựng lại thật ngày 03/09: thay `check-bootstrap.mjs` bằng đúng một dòng
  // `process.exit(0);` thì cổng đóng phiên in ra
  //     [XANH] Cổng kiểm cấu trúc — không đọc được dòng tổng kết — nhóm CHẶN đạt hết
  // Toàn bộ bộ kiểm cấu trúc bị vô hiệu hoá, và cổng vẫn tuyên bố nhóm CHẶN đã đạt.
  //
  // Repo tạm KHÔNG khai `scripts.test` — cố ý, để cổng bỏ qua bước chạy suite và phép kiểm này
  // chạy trong vài giây thay vì vài phút. Ta chỉ đo đúng một dòng: dòng cấu trúc.
  const temp = mkdtempSync(join(tmpdir(), "harness-bc-"));
  try {
    const at = (...a) => execFileSync("git", a, { cwd: temp, encoding: "utf8" });
    at("init", "-q", "-b", "main");
    at("config", "user.name", "t"); at("config", "user.email", "t@e.invalid");
    mkdirSync(join(temp, "scripts"), { recursive: true });
    mkdirSync(join(temp, ".agents"), { recursive: true });
    /* CHÉP CẢ `scripts/`, KHÔNG gõ danh sách — xem ghi chú ở `tests/cong-do-that.mjs`: một danh
       sách gõ tay từng thiếu một import mới, và cổng cấu trúc CHẾT trong fixture suốt cả ngày mà
       suite vẫn xanh. Chép cả thư mục thì lớp lỗi đó biến mất theo cấu trúc. */
    for (const name of readdirSync(join(ROOT, "scripts")).filter((x) => x.endsWith(".mjs"))) {
      copyFileSync(join(ROOT, "scripts", name), join(temp, "scripts", name));
    }
    writeFileSync(join(temp, ".repo-structure.json"), JSON.stringify(docCauTrucThu(), null, 2), "utf8");
    // Phiên PHẢI GIỮ vùng, nếu không thì phép kiểm bản đồ tự bỏ qua (BỎ vì rỗng) và cả hai
    // ca (c)(d) dưới đây xanh mà không kiểm gì — đúng loại phép kiểm rỗng nghĩa mà repo này
    // đã bắt được bảy lần. Bản đầu của khối này mắc đúng lỗi đó.
    const giu = (task) => ({ owner: "thu", ai: "Test", claimed_at: "2026-01-01", task, released_at: null });
    writeFileSync(join(temp, ".agents", "claims.json"),
      JSON.stringify({ claims: { _root: giu("thu"), _docs: giu("thu"), _code: giu("thu"), _template: giu("thu") } }), "utf8");
    writeFileSync(join(temp, "package.json"), JSON.stringify({ name: "tam", private: true }), "utf8");
    writeFileSync(join(temp, "AGENTS.md"),
      ["# tam", "", "## 6. Bản đồ file", "",
       "| Khi bạn sắp… | Mở cái gì |", "|---|---|",
       "| Xem hồ sơ | `docs/co-khai/` |"].join(String.fromCharCode(10)), "utf8");
    at("add", "-A"); at("commit", "-q", "-m", "seed");

    const chay = () => {
      const r = spawnSync(process.execPath, [join(temp, "scripts", "session-check.mjs"), "--as", "thu"],
        { cwd: temp, encoding: "utf8" });
      return String(r.stdout || "") + String(r.stderr || "");
    };

    // (a) BỘ KIỂM BỊ VÔ HIỆU HOÁ — thoát 0, không in gì. Phải bị coi là CHƯA KIỂM.
    writeFileSync(join(temp, "scripts", "check-bootstrap.mjs"), "process.exit(0);", "utf8");
    const a = chay();
    assert.match(a, /BOOTSTRAP_KHONG_CO_BANG_CHUNG/,
      "bo kiem cau truc thoat 0 ma khong in bang chung thi PHAI do, khong duoc coi la dat");

    // (b) ĐỐI CHỨNG DƯƠNG: bộ kiểm có in dòng tổng kết thì KHÔNG được kêu.
    //     Thiếu vế này thì một cổng luôn báo lỗi cũng qua được (a).
    writeFileSync(join(temp, "scripts", "check-bootstrap.mjs"),
      "console.log('TỔNG: 0 chỗ ĐỎ (không có) · 0 chỗ VÀNG');", "utf8");
    const b = chay();
    assert.doesNotMatch(b, /BOOTSTRAP_KHONG_CO_BANG_CHUNG/,
      "bo kiem co in dong tong ket thi khong duoc keu thieu bang chung");

    // (c) KHAI MỘT THƯ MỤC LÀ ĐÃ KHAI NHỮNG GÌ TRONG NÓ.
    //     Đây là một chỗ NỚI CÓ CHỦ Ý, nên phải có hàng rào: nới thì được, nới thêm thì không.
    //     Không có nó thì mỗi hồ sơ migrate mới, mỗi ADR mới lại đòi một dòng bản đồ — vĩnh viễn,
    //     và tới lúc nào đó người ta bỏ khai. Luật không ai theo nổi là luật chết.
    mkdirSync(join(temp, "docs", "co-khai"), { recursive: true });
    writeFileSync(join(temp, "docs", "co-khai", "moi.md"), "x", "utf8");
    const c = chay();
    assert.doesNotMatch(c, /docs\/co-khai\/moi\.md/,
      "thu muc DA KHAI trong ban do thi file moi ben trong khong duoc keu la chua khai");

    // (d) HÀNG RÀO: thư mục CHƯA khai thì vẫn phải đỏ. Thiếu vế này thì một bản nới tay
    //     (nhận mọi đường dẫn) cũng qua được (c), và phép kiểm bản đồ thành đồ trang trí.
    mkdirSync(join(temp, "docs", "chua-khai"), { recursive: true });
    writeFileSync(join(temp, "docs", "chua-khai", "moi.md"), "x", "utf8");
    const d = chay();
    assert.match(d, /docs\/chua-khai\/moi\.md/,
      "thu muc CHUA khai thi file moi ben trong PHAI bi keu");
  } finally { rmSync(temp, { recursive: true, force: true }); }
  ok("ma thoat 0 khong phai bang chung: bo kiem cau truc cam thi cong phai DO");
}

/* ---- safe-push: nhanh dich = nhanh dang dung ---------------------------- */
{
  // `main` bi dong cung o muoi cho: fetch, ls-remote, moc so, cau day. Nen cong cu chi phuc vu
  // duoc MOT hinh dang repo. Do that 04/09: repo 3AI co viec bo khung nam tren mot nhanh tinh
  // nang, va cong cu KHONG CO CACH NAO day nhanh do len remote cua chinh no.
  //
  // Va luat "merge vao main phai hoi Duc" phai duoc GIU: dung o nhanh tinh nang thi day len
  // dung nhanh do, KHONG BAO GIO len main.
  const cha = mkdtempSync(join(tmpdir(), "push-nhanh-"));
  const kho = join(cha, "kho");
  const bare = join(cha, "bare.git");
  try {
    execFileSync("git", ["init", "-q", "--bare", bare], { encoding: "utf8" });
    mkdirSync(kho, { recursive: true });
    const at = (...a) => execFileSync("git", a, { cwd: kho, encoding: "utf8" });
    at("init", "-q", "-b", "main");
    at("config", "user.name", "t"); at("config", "user.email", "t@e.invalid");
    mkdirSync(join(kho, "scripts"), { recursive: true });
    mkdirSync(join(kho, ".agents"), { recursive: true });
    for (const name of ["safe-push.mjs", "repo-structure.mjs", "chay-test.mjs"]) {
      copyFileSync(join(ROOT, "scripts", name), join(kho, "scripts", name));
    }
    writeFileSync(join(kho, ".repo-structure.json"), JSON.stringify(docCauTrucThu(), null, 2), "utf8");
    writeFileSync(join(kho, ".agents", "claims.json"), JSON.stringify({ claims: {} }), "utf8");
    writeFileSync(join(kho, "a.txt"), "hi", "utf8");
    at("add", "-A"); at("commit", "-q", "-m", "mot\n\nLane: thu");
    at("remote", "add", "origin", bare);
    at("push", "-q", "-u", "origin", "main");

    const chay = () => {
      const r = spawnSync(process.execPath, [join(kho, "scripts", "safe-push.mjs"), "--as", "thu", "--dry-run"],
        { cwd: kho, encoding: "utf8" });
      return { ...r, out: String(r.stdout || "") + String(r.stderr || "") };
    };

    // (a) Nhanh tinh nang DA CO upstream -> day len chinh no, KHONG len main.
    at("checkout", "-q", "-b", "tinh-nang");
    writeFileSync(join(kho, "b.txt"), "hai", "utf8");
    at("add", "-A"); at("commit", "-q", "-m", "hai\n\nLane: thu");
    at("push", "-q", "-u", "origin", "tinh-nang");
    writeFileSync(join(kho, "c.txt"), "ba", "utf8");
    at("add", "-A"); at("commit", "-q", "-m", "ba\n\nLane: thu");

    const a = chay();
    assert.equal(a.status, 0, `nhanh tinh nang co upstream thi phai chay duoc: ${a.out.slice(0, 400)}`);
    assert.match(a.out, /origin\/tinh-nang/, "phai nham dung nhanh dang dung");
    assert.doesNotMatch(a.out, /SẮP ĐẨY LÊN origin\/main/,
      "dung o nhanh tinh nang ma nham main la mot quyet dinh HOP NHAT — luat bat hoi Duc");
    assert.match(a.out, /\bba\b/, "moc so phai la upstream cua nhanh do, nen chi con commit chua day");
    assert.doesNotMatch(a.out, /\bhai\b/, "commit da co tren upstream cua nhanh do thi khong duoc ke lai");

    // (a2) VA PHAI DAY THAT. `--dry-run` chi chung minh BAN BAO CAO, khong chung minh CAU DAY —
    //      dot bien "quay ve dong cung HEAD:main" van xanh neu chi kiem dry-run. Day that vao
    //      kho bare o ngay canh, roi doc lai HAI ref: nhanh tinh nang phai tien, main phai y nguyen.
    const refTruoc = (ten) => String(execFileSync("git", ["rev-parse", ten], { cwd: bare, encoding: "utf8" })).trim();
    const mainTruoc = refTruoc("refs/heads/main");
    const dayThat = spawnSync(process.execPath, [join(kho, "scripts", "safe-push.mjs"), "--as", "thu"],
      { cwd: kho, encoding: "utf8" });
    const dayOut = String(dayThat.stdout || "") + String(dayThat.stderr || "");
    assert.equal(dayThat.status, 0, `day that phai chay duoc: ${dayOut.slice(0, 400)}`);
    assert.equal(refTruoc("refs/heads/tinh-nang"), String(at("rev-parse", "HEAD")).trim(),
      "nhanh tinh nang tren remote PHAI tien toi HEAD");
    assert.equal(refTruoc("refs/heads/main"), mainTruoc,
      "main tren remote PHAI y nguyen — day mot nhanh khac len main la quyet dinh HOP NHAT");

    // (b) Nhanh tinh nang CHUA co upstream -> TU CHOI. Tao nhanh moi tren remote la cong bo mot
    //     thu MOI, va do la viec cua nguoi.
    at("checkout", "-q", "-b", "chua-co-tren-remote");
    const b = chay();
    assert.notEqual(b.status, 0, "nhanh chua co upstream thi phai TU CHOI");
    assert.match(b.out, /TU_CHOI/, "phai noi ro vi sao tu choi");

    // (c) DOI CHUNG: dung o `main` thi moi thu chay nhu cu.
    at("checkout", "-q", "main");
    const c = chay();
    assert.equal(c.status, 0, "o main thi phai chay binh thuong nhu truoc");
    assert.match(c.out, /origin\/main|Không có gì để push/, "o main thi moc so van la origin/main");
  } finally { rmSync(cha, { recursive: true, force: true }); }
  ok("safe-push: đẩy lên đúng nhánh đang đứng · chưa có upstream thì từ chối · ở main giữ nguyên");
}

/* ---- cong dong phien: moc so cung phai theo nhanh ----------------------- */
{
  // Cung benh da va o safe-push (v1.2.9), o tool anh em. Cong so voi `origin/main` dong cung.
  // Dung tren mot nhanh tinh nang ma nhanh goc CHUA CO `HANDOFF.md` thi
  // `git show origin/main:HANDOFF.md` NO, cong bao GIT_HONG, va theo dung luat fail-closed cua
  // chinh no thi MOI con so phia tren thanh "doan". Do that o repo 3AI ngay 04/09: cong khong
  // the xanh tren nhanh do — khong phai vi repo sai, ma vi cong cu chi biet mot hinh dang.
  const cha = mkdtempSync(join(tmpdir(), "cong-nhanh-"));
  const kho = join(cha, "kho");
  const bare = join(cha, "bare.git");
  try {
    execFileSync("git", ["init", "-q", "--bare", bare], { encoding: "utf8" });
    mkdirSync(kho, { recursive: true });
    const at = (...a) => execFileSync("git", a, { cwd: kho, encoding: "utf8" });
    at("init", "-q", "-b", "main");
    at("config", "user.name", "t"); at("config", "user.email", "t@e.invalid");
    mkdirSync(join(kho, "scripts"), { recursive: true });
    mkdirSync(join(kho, ".agents"), { recursive: true });
    /* CHÉP CẢ `scripts/`, KHÔNG gõ danh sách — xem ghi chú ở `tests/cong-do-that.mjs`: một danh
       sách gõ tay từng thiếu một import mới, và cổng cấu trúc CHẾT trong fixture suốt cả ngày mà
       suite vẫn xanh. Chép cả thư mục thì lớp lỗi đó biến mất theo cấu trúc. */
    for (const name of readdirSync(join(ROOT, "scripts")).filter((x) => x.endsWith(".mjs"))) {
      copyFileSync(join(ROOT, "scripts", name), join(kho, "scripts", name));
    }
    writeFileSync(join(kho, ".repo-structure.json"), JSON.stringify(docCauTrucThu(), null, 2), "utf8");
    writeFileSync(join(kho, ".agents", "claims.json"), JSON.stringify({ claims: {} }), "utf8");
    writeFileSync(join(kho, "a.txt"), "hi", "utf8");
    at("add", "-A"); at("commit", "-q", "-m", "mot\n\nLane: thu");
    at("remote", "add", "origin", bare);
    at("push", "-q", "-u", "origin", "main");

    // Nhanh tinh nang, va CHI o day moi co HANDOFF.md — dung hinh dang cua repo 3AI.
    at("checkout", "-q", "-b", "tinh-nang");
    writeFileSync(join(kho, "HANDOFF.md"), "# Log\n- mot dong\n", "utf8");
    at("add", "-A"); at("commit", "-q", "-m", "them handoff\n\nLane: thu");
    at("push", "-q", "-u", "origin", "tinh-nang");

    const r = spawnSync(process.execPath, [join(kho, "scripts", "session-check.mjs"), "--as", "thu"],
      { cwd: kho, encoding: "utf8" });
    const out = String(r.stdout || "") + String(r.stderr || "");
    assert.doesNotMatch(out, /GIT_HONG/,
      "moc so phai la upstream cua nhanh dang dung — so voi origin/main lam cong NO tren nhanh tinh nang");
    assert.doesNotMatch(out, /origin\/main:HANDOFF\.md/, "khong duoc doc HANDOFF.md tu origin/main nua");
    // VA phai la DUNG moc, khong chi la "khong no". Nhanh nay da day het len upstream cua no,
    // nen cong phai thay KHONG CON commit nao chua push. Neu moc van la `origin/main` thi commit
    // them HANDOFF se bi ke la "chua push" — sai, va sai mot cach IM LANG.
    assert.match(out, /Không có commit nào chưa push/,
      "moc so sai thi cong ke nham commit da day la chua day — sai im lang, kho thay hon ca no");

    // VA: `HANDOFF.md` chua co tren moc so cung KHONG duoc goi la git hong. Day la ca CHUA DAY —
    // file do bo khung them vao, nen no chi ton tai tren nhanh nay. Gop hai ly do lai la tu tao
    // mot vong luan quan: cong doi xanh moi duoc day, ma chi day xong no moi het do.
    // PHAI re tu `main` — nhanh KHONG co HANDOFF.md. Re tu `tinh-nang` thi upstream da co file
    // do roi, va phep kiem xanh vi khong dung lai duoc ca can dung, chu khong phai vi dung.
    at("checkout", "-q", "main");
    at("checkout", "-q", "-b", "chua-day-lan-nao");
    at("push", "-q", "-u", "origin", "chua-day-lan-nao");
    writeFileSync(join(kho, "HANDOFF.md"), "# Log\n- dong moi\n", "utf8");
    at("add", "-A"); at("commit", "-q", "-m", "them handoff lan dau\n\nLane: thu");
    const r2 = spawnSync(process.execPath, [join(kho, "scripts", "session-check.mjs"), "--as", "thu"],
      { cwd: kho, encoding: "utf8" });
    const out2 = String(r2.stdout || "") + String(r2.stderr || "");
    assert.doesNotMatch(out2, /GIT_HONG/,
      "'file chua co o moc so' KHONG phai 'git hong' — gop lai la tao mot vong luan quan");

  } finally { rmSync(cha, { recursive: true, force: true }); }
  ok("cổng đóng phiên: mốc so theo nhánh đang đứng, không nổ trên nhánh tính năng");
}

/* ---- secret: "la nhi phan" khac "khong doc duoc" ------------------------ */
{
  // Ban dau gop ca ba ly do (doc loi · qua lon · nhi phan) vao mot ro "khong kiem duoc", nen moi
  // repo co MOT CAI ANH deu mang vinh vien mot muc [BO] — tuc cong KHONG BAO GIO xanh duoc o bat
  // ky repo that nao. Do o 3AI 04/09: 33 file PNG/XLSX giu cong o "chua du bang chung" mai mai.
  //
  // KHONG phai noi long: phep kiem nay giai UTF-8 roi do mau CHU, nen no chua bao gio soi duoc
  // file nhi phan. Goi ten dung thu no von khong lam duoc thi khong mat mot chut phat hien nao.
  const kho = mkdtempSync(join(tmpdir(), "secret-nhiphan-"));
  try {
    const at = (...a) => execFileSync("git", a, { cwd: kho, encoding: "utf8" });
    at("init", "-q", "-b", "main");
    at("config", "user.name", "t"); at("config", "user.email", "t@e.invalid");
    mkdirSync(join(kho, "scripts"), { recursive: true });
    mkdirSync(join(kho, ".agents"), { recursive: true });
    /* CHÉP CẢ `scripts/`, KHÔNG gõ danh sách — xem ghi chú ở `tests/cong-do-that.mjs`: một danh
       sách gõ tay từng thiếu một import mới, và cổng cấu trúc CHẾT trong fixture suốt cả ngày mà
       suite vẫn xanh. Chép cả thư mục thì lớp lỗi đó biến mất theo cấu trúc. */
    for (const name of readdirSync(join(ROOT, "scripts")).filter((x) => x.endsWith(".mjs"))) {
      copyFileSync(join(ROOT, "scripts", name), join(kho, "scripts", name));
    }
    writeFileSync(join(kho, ".repo-structure.json"), JSON.stringify(docCauTrucThu(), null, 2), "utf8");
    writeFileSync(join(kho, ".agents", "claims.json"), JSON.stringify({ claims: {} }), "utf8");
    // Mot "buc anh": co byte 0 trong 8KB dau.
    writeFileSync(join(kho, "anh.png"), Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x01, 0x02]));
    writeFileSync(join(kho, "a.txt"), "khong co gi", "utf8");
    at("add", "-A"); at("commit", "-q", "-m", "mot\n\nLane: thu");

    const chay = () => {
      const r = spawnSync(process.execPath, [join(kho, "scripts", "session-check.mjs"), "--as", "thu"],
        { cwd: kho, encoding: "utf8" });
      return String(r.stdout || "") + String(r.stderr || "");
    };
    const out = chay();
    const khoiSecret = out.slice(out.indexOf("Không có secret"), out.indexOf("Không có secret") + 400);
    assert.doesNotMatch(khoiSecret, /KHÔNG đọc được/,
      "file nhi phan KHONG duoc goi la 'khong doc duoc' — do la mot cau tra loi, khong phai dau hoi");
    assert.match(khoiSecret, /bỏ qua 1 file nhị phân/, "nhung PHAI ke ra: bo qua im lang thi khong ai biet");

    // VA: mot tam anh LON van la anh. Phep thu nhi phan phai chay TRUOC phep thu kich thuoc —
    // dao lai thi PNG 3MB bi goi la "qua lon", tuc KHONG BIET, trong khi ta biet thua no la anh.
    const anhTo = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00]), Buffer.alloc(2_100_000, 7)]);
    writeFileSync(join(kho, "anh-to.png"), anhTo);
    at("add", "-A"); at("commit", "-q", "-m", "anh to\n\nLane: thu");
    const outTo = chay();
    const khoiTo = outTo.slice(outTo.indexOf("Không có secret"), outTo.indexOf("Không có secret") + 400);
    assert.match(khoiTo, /bỏ qua 2 file nhị phân/, "anh lon van la anh — khong duoc goi la 'qua lon'");
    assert.doesNotMatch(khoiTo, /KHÔNG đọc được/, "chua co file van ban nao chua soi thi khong duoc bao 'khong doc duoc'");

    // DOI CHUNG: file van ban that su KHONG doc duoc thi VAN phai la "khong kiem duoc".
    writeFileSync(join(kho, "to.txt"), "x".repeat(2_000_001), "utf8");
    at("add", "-A"); at("commit", "-q", "-m", "hai\n\nLane: thu");
    const out2 = chay();
    const khoi2 = out2.slice(out2.indexOf("Không có secret"), out2.indexOf("Không có secret") + 400);
    assert.match(khoi2, /KHÔNG đọc được/,
      "file van ban chua duoc soi that thi VAN la 'khong kiem duoc' — day moi la noi long neu bo");
  } finally { rmSync(kho, { recursive: true, force: true }); }
  ok("secret: file nhị phân là câu trả lời, file văn bản chưa soi được vẫn là dấu hỏi");
}

/* ---- safe-push: detached HEAD thi TU CHOI ------------------------------- */
{
  // v1.2.9 viet `nhanhHienTai !== "HEAD" ? nhanhHienTai : "main"`, tuc dung o detached HEAD la
  // cong cu LANG LE nham `main` roi day `HEAD:main`. Do dung la cu HOP NHAT ma luat muc 2 bat
  // phai hoi Duc — toi bang duong TAI NAN, khong ai chon.
  //
  // Va no TE HON ban truoc v1.2.9: hoi do co mot cau `if` chan moi thu khong phai `main`; cai
  // lui-ve-mac-dinh nay xoa mat cau do.
  const cha = mkdtempSync(join(tmpdir(), "detached-"));
  const kho = join(cha, "kho");
  const bare = join(cha, "bare.git");
  try {
    execFileSync("git", ["init", "-q", "--bare", bare], { encoding: "utf8" });
    mkdirSync(kho, { recursive: true });
    const at = (...a) => execFileSync("git", a, { cwd: kho, encoding: "utf8" });
    at("init", "-q", "-b", "main");
    at("config", "user.name", "t"); at("config", "user.email", "t@e.invalid");
    mkdirSync(join(kho, "scripts"), { recursive: true });
    mkdirSync(join(kho, ".agents"), { recursive: true });
    for (const name of ["safe-push.mjs", "repo-structure.mjs", "chay-test.mjs"]) {
      copyFileSync(join(ROOT, "scripts", name), join(kho, "scripts", name));
    }
    writeFileSync(join(kho, ".repo-structure.json"), JSON.stringify(docCauTrucThu(), null, 2), "utf8");
    writeFileSync(join(kho, ".agents", "claims.json"), JSON.stringify({ claims: {} }), "utf8");
    writeFileSync(join(kho, "a.txt"), "hi", "utf8");
    at("add", "-A"); at("commit", "-q", "-m", "mot\n\nLane: thu");
    at("remote", "add", "origin", bare);
    at("push", "-q", "-u", "origin", "main");
    writeFileSync(join(kho, "b.txt"), "hai", "utf8");
    at("add", "-A"); at("commit", "-q", "-m", "hai\n\nLane: thu");

    const mainTruoc = String(execFileSync("git", ["rev-parse", "refs/heads/main"], { cwd: bare, encoding: "utf8" })).trim();
    at("checkout", "-q", "--detach", "HEAD");
    const r = spawnSync(process.execPath, [join(kho, "scripts", "safe-push.mjs"), "--as", "thu"], { cwd: kho, encoding: "utf8" });
    const out = String(r.stdout || "") + String(r.stderr || "");
    assert.notEqual(r.status, 0, "detached HEAD thi phai TU CHOI, khong duoc lui ve main");
    assert.match(out, /detached HEAD/, "phai noi ro vi sao");
    assert.doesNotMatch(out, /SẮP ĐẨY LÊN origin\/main/, "khong duoc nham main");
    assert.equal(String(execFileSync("git", ["rev-parse", "refs/heads/main"], { cwd: bare, encoding: "utf8" })).trim(),
      mainTruoc, "main tren remote PHAI y nguyen — day khong phai chuyen 'tien tay'");
  } finally { rmSync(cha, { recursive: true, force: true }); }
  ok("safe-push: detached HEAD → từ chối, không lùi về main");
}

console.log(`\n${passed} passed, 0 failed, ${passed} total`);
