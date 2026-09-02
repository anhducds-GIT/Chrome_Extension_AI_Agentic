/* PHÉP THỬ REPO RỖNG — tiêu chí nghiệm thu của bộ trích template.
 *
 * Dựng một repo git **trống hoàn toàn**, thả bộ khung vào, làm đúng những gì README bảo làm,
 * rồi chạy cổng kiểm cấu trúc. **Không được có chỗ ĐỎ nào.**
 *
 * Vì sao phép thử này quan trọng hơn nó trông có vẻ: nó bắt kiểu hỏng mà mọi phép kiểm khác
 * đều mù — **template THIẾU thứ gì đó**. Chạy cổng trong repo gốc thì mọi thứ đều xanh, vì
 * repo gốc có đủ mọi file; chỉ khi bê bộ khung sang một chỗ trống mới lộ ra cái gì không đi
 * theo. Đo thật: bản trích đầu tiên đỏ B1 (quên `STATUS.md` cho gốc repo) và vàng B6 ở 4 chỗ
 * (bản đồ mục 6 để rỗng nên chính `README.md` cũng nằm ngoài đường điều hướng). Cả hai đều
 * KHÔNG thể phát hiện được từ trong repo gốc.
 *
 * Cặp đôi của nó là phép thử ngược — bộ máy cũ và mới sinh ra bảng giống hệt từng byte — bắt
 * kiểu hỏng ngược lại: **trích ra làm MẤT thứ gì đó**. Thiếu một trong hai là hụt.
 */

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { buildTemplateFiles, leakedNames, soleHeadingIndex, TEMPLATE_VERSION } from "../scripts/build-template.mjs";

let passed = 0;
const ok = (name) => { passed += 1; console.log(`  ok  ${name}`); };

const files = buildTemplateFiles();

/* ---- 1. Không mang tên riêng của repo gốc -------------------------------- */
{
  const leaks = leakedNames(files);
  assert.deepEqual(leaks, [], `template mang ten rieng cua repo goc: ${JSON.stringify(leaks)}`);

  // MẪU ĐỐI CHỨNG DƯƠNG — bắt buộc. Không có nó thì phép kiểm trên RỖNG NGHĨA: template hiện
  // đã sạch, nên "không thấy gì" đúng ở cả hai chiều, và một đột biến xoá sạch danh sách mẫu
  // dò vẫn thoát. Đo thật: đột biến đó ĐÃ thoát ở bản đầu của phép kiểm này.
  // TRỒNG ĐỦ BỐN MẪU, không chỉ một. Bản trước chỉ trồng `duc-auto`, nên ba mẫu còn lại
  // (`gg-flow`, tên repo gốc, `extension-observer`) CHƯA TỪNG được chứng minh là bắt được: một
  // đột biến xoá riêng chúng khỏi danh sách sẽ thoát sạch. Phiên K1 chỉ ra 02/09, mục (a) của
  // brief. Bài học lặp lại: đối chứng dương phải phủ TỪNG phần tử của bộ dò, không phủ "một cái
  // đại diện" — một cái đại diện chỉ chứng minh đúng cái đó.
  // Mỗi mẫu một chuỗi trồng RIÊNG, và chuỗi đó chỉ được khớp ĐÚNG mẫu đang thử. Bản đầu của
  // chính đối chứng này trồng "workers/duc-auto-gg-flow-video" — khớp CẢ HAI mẫu một lúc, nên
  // nó đếm ra 2 và không chứng minh được mẫu nào cả. Đúng bệnh nó đang đi chữa.
  const MAU_PHAI_BAT = [
    ["gia/mot.md", "duong dan workers/duc-auto-gemini/v0.2.0 lot vao", "duc-auto"],
    ["gia/hai.md", "nhac nhanh gg-flow-video trong van", "gg-flow"],
    ["gia/ba.md", "duong dan C:/X/Chrome_Extension_AI_Agentic/y", "Chrome_Extension_AI_Agentic"],
    ["gia/bon.md", "nhac goi extension-observer o day", "extension-observer"]
  ];
  for (const [file, text, expected] of MAU_PHAI_BAT) {
    const hits = leakedNames(new Map([[file, text], ["gia/sach.md", "khong co gi dang ngo"]]));
    assert.equal(hits.length, 1, `bo do phai bat DUNG MOT lan ten cam trong ${file}, dang bat ${hits.length}`);
    assert.equal(hits[0].file, file, `phai chi dung file co ten cam, khong bao oan ${hits[0].file}`);
    assert.equal(hits[0].found.toLowerCase(), expected.toLowerCase(),
      `phai bat dung mau "${expected}", dang bat "${hits[0].found}"`);
  }
  const planted = leakedNames(new Map([
    ["gia/mot.md", "duong dan workers/duc-auto-gemini/v0.2.0 lot vao"],
    ["gia/hai.md", "khong co gi dang ngo"]
  ]));
  assert.equal(planted.length, 1, "bo do phai bat duoc ten du an cam khi co that");
  assert.equal(planted[0].file, "gia/mot.md", "phai chi dung file co ten cam");
  ok(`bo khung ${TEMPLATE_VERSION} khong mang ten rieng cua repo goc (${files.size} file), va bo do co that su bat duoc`);
}

/* ---- 2. KHÔNG mang theo tầng GENERATED ----------------------------------- */
{
  // Chép trang máy sinh sang repo khác là làm MỌI repo cùng hiển thị trạng thái của repo gốc.
  // Đây là kiểu hỏng tệ nhất vì nó im lặng: bảng vẫn đẹp, chỉ có điều nói về repo khác.
  for (const forbidden of ["DASHBOARD.md", "llms.txt", "repo-map.json", "FEATURE-PARITY.md"]) {
    assert.ok(!files.has(forbidden),
      `${forbidden} thuoc tang GENERATED — bo SINH thi di theo, san pham cua no thi KHONG`);
  }
  // Và cũng không mang bằng chứng của repo gốc. SOI CẢ BA HÌNH DẠNG, không chỉ `evidence/`:
  // luật vùng bằng chứng của repo (AGENTS.md mục 4) gồm `pilot-*` · `Pilot-*` · `Batch-*` nữa,
  // nên chỉ soi một tiền tố là bỏ sót hai hình dạng còn lại. Phiên K1 chỉ ra 02/09, mục (b).
  const VUNG_BANG_CHUNG = /^(evidence|pilots?|pilot-|Pilot-|Batch-|batch-)/;
  for (const rel of files.keys()) {
    assert.ok(!VUNG_BANG_CHUNG.test(rel), `${rel}: bang chung cua repo nao la cua repo do`);
  }
  // Đối chứng dương cho chính bộ dò trên — không có nó thì phép kiểm rỗng nghĩa y như mục 1.
  for (const gia of ["evidence/x.md", "pilots/v0/x.md", "pilot-07/x.md", "Pilot-07/x.md", "Batch-01/x.md"]) {
    assert.ok(VUNG_BANG_CHUNG.test(gia), `bo do phai coi ${gia} la vung bang chung`);
  }
  assert.ok(!VUNG_BANG_CHUNG.test("docs/pilot-ghi-chu.md"), "khong duoc bao oan file chi NHAC chu pilot o giua duong dan");
  ok("khong mang theo trang may sinh, khong mang theo bang chung");
}

/* ---- 2b. Mốc cắt mục 6 phải là TIÊU ĐỀ THẬT và DUY NHẤT ------------------ */
/* Phiên K1 chỉ ra 02/09, mục (d). Bản cũ dùng `indexOf("\n## 6.")` — lấy lần khớp ĐẦU TIÊN,
   không kiểm gì. Một dòng văn hay khối trích dẫn nhắc `## 6.` nằm TRƯỚC tiêu đề thật là cắt
   sai, và cắt sai ÂM THẦM: bộ trích vẫn sinh ra `AGENTS.md`, chỉ là mất một phần mục 5. */
{
  const f = soleHeadingIndex;

  // Chỉ nhận dòng BẮT ĐẦU bằng mốc. Nhắc trong trích dẫn hay giữa câu thì không tính.
  const trichDan = "# Luat\n\n> muc `## 6.` noi rang ...\n\nvan xuoi nhac ## 6. o giua cau\n\n## 6. So tay\n\nthan\n";
  const hit = f(trichDan, "## 6.");
  assert.equal(hit.hits.length, 1, "chi duoc tinh dong BAT DAU bang moc, khong tinh nhac trong trich dan hay giua cau");
  assert.equal(trichDan.slice(hit.index, hit.index + 12), "## 6. So tay", "phai tro dung tieu de THAT");

  // ĐÂY LÀ CA HỎNG: hai tiêu đề thật thì FAIL CLOSED, không âm thầm chọn cái đầu.
  assert.throws(() => f("## 6. Mot\n\nthan\n\n## 6. Hai\n", "## 6."), /TRICH_HONG/,
    "hai moc that thi phai NEM, khong duoc tu chon cai dau roi cat sai");
  // Và thông báo phải nói SỐ DÒNG, để người sửa biết đi đâu — tiêu chí nghiệm thu của Đức.
  try {
    f("## 6. Mot\n\nthan\n\n## 6. Hai\n", "## 6.");
    assert.fail("phai nem");
  } catch (error) {
    assert.match(error.message, /dòng 1, 5/, "phai chi dung so dong cua tung moc: " + error.message);
  }

  assert.equal(f("khong co moc nao\n", "## 6.").index, -1, "khong co moc thi tra -1, de ben goi tu bao loi");

  // Và trên AGENTS.md THẬT: mỗi mốc đúng một dòng. Nếu repo này vi phạm thì bộ trích phải đỏ
  // ở đây trước khi nó kịp sinh ra một bản trích bị cắt sai.
  const luatThat = readFileSync(new URL("../AGENTS.md", import.meta.url), "utf8");
  for (const moc of ["## 6.", "## 7."]) {
    assert.equal(f(luatThat, moc).hits.length, 1, `AGENTS.md that phai co DUNG MOT dong bat dau bang \`${moc}\``);
  }
  ok("moc cat muc 6 la tieu de THAT va DUY NHAT; hai moc thi FAIL CLOSED kem so dong");
}

/* ---- 3. Repo rỗng + bộ khung → cổng kiểm KHÔNG có chỗ đỏ ------------------ */
{
  const tempRoot = mkdtempSync(join(tmpdir(), "template-null-repo-"));
  try {
    const at = (cmd, args) => execFileSync(cmd, args, { cwd: tempRoot, encoding: "utf8" });
    const gitAt = (...args) => at("git", ["-c", "core.quotepath=false", ...args]);

    for (const [rel, text] of files) {
      const abs = join(tempRoot, ...rel.split("/"));
      mkdirSync(dirname(abs), { recursive: true });
      writeFileSync(abs, text, "utf8");
    }

    gitAt("init", "-q", "-b", "main");
    gitAt("config", "user.name", "Null Repo Test");
    gitAt("config", "user.email", "nullrepo@example.invalid");
    gitAt("add", "-A");
    gitAt("commit", "-q", "-m", "khoi tao tu bo khung");

    // Bước README bảo làm: sinh trang TRƯỚC khi đo. Bỏ bước này là đo một repo chưa có cổng
    // vào máy đọc, và phép kiểm điều hướng sẽ vàng — đúng, nhưng không phải điều đang thử.
    at(process.execPath, [join(tempRoot, "scripts", "build-dashboard.mjs")]);
    gitAt("add", "-A");
    gitAt("commit", "-q", "-m", "sinh trang lan dau");

    let out;
    try {
      out = at(process.execPath, [join(tempRoot, "scripts", "check-bootstrap.mjs")]);
    } catch (error) {
      throw new Error(`cong kiem cau truc thoat khac 0 tren repo rong:\n${error.stdout ?? ""}${error.stderr ?? ""}`);
    }

    const summary = out.split("\n").find((line) => line.startsWith("TỔNG:")) ?? "";
    // ĐỌC SỐ, đừng dò chuỗi. Bản đầu dùng một mẫu dò không chặn biên số nên nó khớp cả
    // "10 chỗ ĐỎ" lẫn "40 chỗ ĐỎ" — phép kiểm nghiệm thu sẽ XANH kể cả khi repo có 40 chỗ đỏ.
    // Audit độc lập bắt được 2026-09-02. Con số 0 tôi báo là thật, nhưng không gì bảo vệ nó.
    const count = (label) => {
      const m = summary.match(new RegExp("([0-9]+)[^0-9]*chỗ[^0-9]*" + label));
      assert.ok(m, `khong doc duoc so "${label}" tu dong tong ket: "${summary}"`);
      return Number(m[1]);
    };
    assert.equal(count("ĐỎ"), 0, `repo rong phai KHONG co cho do: "${summary}"`);
    assert.equal(count("VÀNG"), 0, `repo rong nen sach ca VANG: "${summary}"`);

    // CỔNG ĐÓNG PHIÊN cũng phải chạy được. Bản đầu CHỈ chạy cổng cấu trúc nên nó mù hoàn toàn
    // với việc cổng đóng phiên đòi một script mà bộ khung cố ý không mang theo — repo dựng từ
    // bộ khung hỏng ngay ở cổng của chính nó. Phép thử nghiệm thu phải chạy ĐỦ MỌI CỔNG mà
    // người dùng thật sẽ chạy; nếu không nó chỉ chứng minh đúng phần mình đã nghĩ tới.
    let gate = "";
    try {
      gate = at(process.execPath, [join(tempRoot, "scripts", "session-check.mjs"), "--as", "phep-thu-repo-rong"]);
    } catch (error) {
      gate = String(error.stdout || "") + String(error.stderr || "");
    }
    assert.ok(!/Cannot find module|ENOENT|KHONG_CHAY_DUOC/i.test(gate),
      "cong dong phien phai CHAY DUOC tren repo dung tu bo khung: " + gate.slice(0, 900));
    assert.ok(!/feature-parity/i.test(gate),
      "cong dong phien khong duoc doi script ma bo khung khong mang theo: " + gate.slice(0, 900));

    // CỔNG KHÔNG ĐƯỢC IM LẶNG BÁO XANH KHI NÓ CHƯA KIỂM GÌ — nửa chưa vá của lỗi nặng số 1,
    // phiên K1 tìm ra 02/09. Dây chuyền: bộ khung không mang `tests/` và `package.json` của nó
    // không khai `scripts.test` → `hasRootTestScript()` false VĨNH VIỄN → phép kiểm Test trả
    // XANH kèm câu "Không package nào của bạn có suite bị ảnh hưởng". Repo gốc hết bệnh sau bản
    // vá trước, bộ khung thì vẫn nguyên — mà bộ khung mới là thứ sắp nhân ra nhiều repo. Nhân
    // một cổng kiểm rỗng ra 21 repo còn tệ hơn không có bộ khung.
    //
    // Ba vế, và cả ba đều cần: nói ĐÚNG chuyện gì đang xảy ra · KHÔNG nói câu gây hiểu nhầm là
    // đã kiểm · và hiện ở mức BỎ QUA chứ không phải XANH.
    // Ca trên chạy với một phiên KHÔNG giữ khoá nào, và khi đó "không có suite nào bị ảnh
    // hưởng" là câu ĐÚNG. Ca hỏng thật là: phiên CÓ giữ khoá gốc, CÓ sửa file, mà repo không có
    // suite — lúc đó cổng phải nói ra, không được im. Dựng đúng ca đó, không dựng ca dễ.
    writeFileSync(join(tempRoot, ".agents", "claims.json"),
      JSON.stringify({ claims: { _root: { owner: "phep-thu-co-khoa", ai: null, claimed_at: null, task: "thu", released_at: null } } }, null, 2), "utf8");
    writeFileSync(join(tempRoot, "README.md"), "# Repo\n\nmot dong moi de co gi cho cong kiem\n", "utf8");
    let gateOwned = "";
    try {
      gateOwned = at(process.execPath, [join(tempRoot, "scripts", "session-check.mjs"), "--as", "phep-thu-co-khoa"]);
    } catch (error) {
      gateOwned = String(error.stdout || "") + String(error.stderr || "");
    }
    assert.match(gateOwned, /REPO CHƯA CÓ SUITE GỐC/,
      "cong phai NOI TO rang repo nay chua co suite, thay vi im lang bao xanh: " + gateOwned.slice(0, 900));
    assert.doesNotMatch(gateOwned, /Không package nào của bạn có suite bị ảnh hưởng/,
      "cau nay ngu y ĐA KIEM va khong thay gi — sai, vi that ra chua kiem duoc mot dong nao");
    assert.match(gateOwned, /\[BỎ  \] Test xanh/,
      "chua kiem duoc gi thi phai hien la BO QUA, khong duoc doi lot XANH");

    // NỘI DUNG trang sinh ra không được mang danh tính repo gốc. Kiểm DANH SÁCH file mang theo
    // là chưa đủ: bộ sinh từng đóng cứng tên repo gốc ngay trong trang cổng vào, nên mọi repo
    // dùng bộ khung đều sinh ra một trang TỰ NHẬN LÀ repo gốc, và mọi phép kiểm cũ đều xanh.
    for (const artifact of ["llms.txt", "DASHBOARD.md", "repo-map.json"]) {
      const text = readFileSync(join(tempRoot, artifact), "utf8");
      assert.ok(!/Chrome Extension AI Agentic/i.test(text),
        artifact + " sinh ra trong repo la MANG TEN repo goc — bo sinh dang dong cung danh tinh");
    }
    ok("repo rong: cong cau truc 0/0 · cong dong phien chay duoc · trang sinh ra khong mang ten repo goc");
  } finally {
    assert.ok(tempRoot.startsWith(join(tmpdir(), "template-null-repo-")), "chi don dung temp fixture cua phep kiem nay");
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

console.log(`\n${passed} passed, 0 failed, ${passed} total`);
