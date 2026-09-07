import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import {
  AUTO_BLOCKS,
  collectParityModel,
  compareParity,
  countLines,
  createHeadDeps,
  extractRegistryMethods,
  laFileMayDuocGhi,
  normalizedHash,
  PARITY_AUTO_FILE,
  renderAutoBlocks,
  replaceAutoBlocks,
  runFeatureParity,
  subtractSets
} from "../scripts/feature-parity.mjs";
import { generatedFrom } from "../scripts/repo-structure.mjs";

let passed = 0;
const ok = (name) => { passed += 1; console.log(`  ok  ${name}`); };

const GPT_DIR = "workers/duc-auto-chatgpt/v0.1.0";
const GEMINI_DIR = "workers/duc-auto-gemini/v0.2.0";

function markedDocument(overrides = {}) {
  const block = (name) => `<!-- AUTO:${name} START -->\n${overrides[name] ?? `cũ-${name}`}\n<!-- AUTO:${name} END -->`;
  return [
    "Lời người trước.",
    block("BRIDGE"),
    "## 2. Hành vi do người đọc — tuyệt đối không đụng",
    "Nhận dạng ảnh theo BYTE | ❌ | ✅ | [ĐỌC]",
    block("MODULES"),
    "Ghi chú mô tả module do người giữ.",
    block("DEBT-METHODS"),
    "Nợ hành vi — [KHAI]: giữ nguyên.",
    "Lời người sau."
  ].join("\r\n");
}

/* BẢN CỦA NGƯỜI trong fixture, và nó CỐ Ý còn mang mốc AUTO.
 *
 * Nếu bộ sinh còn bất kỳ đường ghi nào vào `FEATURE-PARITY.md` thì nó sẽ thấy đủ ba mốc ở đây
 * và ghi được — tức fixture này dựng được đúng ca hỏng. Khối 12 đo chỗ đó bằng cách so hash
 * trước/sau. Để một bản KHÔNG có mốc thì phép ghim sẽ xanh vì lý do sai (bộ sinh không tìm
 * thấy mốc), chứ không phải vì đường ghi đã bị bịt. */
const NGUOI_VIET = [
  "# Bảng của NGƯỜI",
  "## 2. Hành vi — chữ người, máy tuyệt đối không đụng",
  "Nhận dạng ảnh theo BYTE | ❌ | ✅ | [ĐỌC]",
  "<!-- AUTO:BRIDGE START -->",
  "bản cũ còn nằm lại — máy KHÔNG được phép ghi vào đây",
  "<!-- AUTO:BRIDGE END -->",
  "<!-- AUTO:MODULES START -->",
  "bản cũ",
  "<!-- AUTO:MODULES END -->",
  "<!-- AUTO:DEBT-METHODS START -->",
  "bản cũ",
  "<!-- AUTO:DEBT-METHODS END -->"
].join("\n");

function fakeRepo({ auto = markedDocument() } = {}) {
  const files = new Map([
    [PARITY_AUTO_FILE, auto],
    ["FEATURE-PARITY.md", NGUOI_VIET],
    [`${GPT_DIR}/bridge-core.js`, 'registryEntry({ name: "alpha" });\nregistryEntry({ name: "shared" });\n'],
    [`${GEMINI_DIR}/bridge-core.js`, 'registryEntry({ name: "beta" });\r\nregistryEntry({ name: "shared" });\r\n'],
    [`${GPT_DIR}/same.js`, "const x = 1;\n"],
    [`${GEMINI_DIR}/same.js`, "const x = 1;\r\n"],
    [`${GPT_DIR}/gpt-only.js`, "a\nb\n"],
    [`${GEMINI_DIR}/gemini-only.js`, "a\n"],
    [`${GPT_DIR}/different.js`, "1\n2\n3\n"],
    [`${GEMINI_DIR}/different.js`, "1\n"],
    [`${GPT_DIR}/README.md`, "không đếm"]
  ]);
  const writes = [];
  const deps = {
    readFile: (relPath) => {
      if (!files.has(relPath)) throw new Error(`fixture thiếu ${relPath}`);
      return files.get(relPath);
    },
    writeFile: (relPath, text) => { writes.push({ relPath, text }); files.set(relPath, text); },
    listFiles: (relPath) => [...files.keys()]
      .filter((name) => name.startsWith(`${relPath}/`) && !name.slice(relPath.length + 1).includes("/"))
      .map((name) => name.slice(relPath.length + 1))
  };
  return { deps, files, writes };
}

function captureOutput() {
  const logs = [];
  const errors = [];
  return { logs, errors, output: { log: (message) => logs.push(message), error: (message) => errors.push(message) } };
}

function sha(text) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function outsideMarkerBytes(text) {
  let remaining = text;
  const outside = [];
  for (const name of AUTO_BLOCKS) {
    const start = `<!-- AUTO:${name} START -->`;
    const end = `<!-- AUTO:${name} END -->`;
    const startAt = remaining.indexOf(start);
    const endAt = remaining.indexOf(end, startAt + start.length);
    assert.ok(startAt >= 0 && endAt >= 0, `fixture phải có đủ marker ${name}`);
    outside.push(remaining.slice(0, startAt + start.length));
    remaining = remaining.slice(endAt);
  }
  outside.push(remaining);
  return outside;
}

/* 1. Trích tên method, kể cả khoảng trắng và xuống dòng bất thường. */
{
  const source = [
    'registryEntry({ name: "zeta", handler() {} });',
    "registryEntry (\n  {\n    name : 'alpha',\n    handler() {}\n  }\n);",
    'registryEntry({ name: "zeta" });'
  ].join("\n");
  assert.deepEqual(extractRegistryMethods(source), ["alpha", "zeta"]);
  ok("trích và sắp tên method đúng với xuống dòng bất thường");
}

/* 2. Phép trừ tập hợp đúng cả hai chiều. */
{
  assert.deepEqual(subtractSets(["shared", "gpt", "gpt"], ["shared", "gemini"]), ["gpt"]);
  assert.deepEqual(subtractSets(["shared", "gemini"], ["shared", "gpt"]), ["gemini"]);
  ok("phép trừ method đúng cả hai chiều");
}

/* 3. CRLF/LF phải cùng hash; khác nội dung phải khác hash. */
{
  assert.equal(normalizedHash("a\r\nb\r\n"), normalizedHash("a\nb\n"));
  assert.notEqual(normalizedHash("a\nb\n"), normalizedHash("a\nc\n"));
  assert.equal(countLines("a\r\nb\r\n"), 3, "giữ cùng quy ước đếm split-lines của bảng hiện hành");
  const model = collectParityModel(fakeRepo().deps);
  assert.deepEqual(model.modules.sharedIdentical, ["same.js"]);
  ok("hash chuẩn hoá CRLF/LF trước khi so module");
}

/* 4. Chỉ nội dung giữa marker đổi; mục 2 và mọi byte ngoài marker giữ nguyên. */
{
  const before = markedDocument();
  const blocks = { BRIDGE: "bridge mới", MODULES: "module mới", "DEBT-METHODS": "nợ method mới" };
  const after = replaceAutoBlocks(before, blocks);
  assert.deepEqual(outsideMarkerBytes(after), outsideMarkerBytes(before));
  assert.ok(after.includes("## 2. Hành vi do người đọc — tuyệt đối không đụng\r\nNhận dạng ảnh theo BYTE | ❌ | ✅ | [ĐỌC]"));
  ok("mọi byte ngoài marker, đặc biệt mục 2, được giữ nguyên");
}

/* 5. Thiếu từng marker phải lỗi rõ và run không ghi file. */
{
  for (const name of AUTO_BLOCKS) {
    const missing = markedDocument().replace(`<!-- AUTO:${name} END -->`, "");
    assert.throws(
      () => replaceAutoBlocks(missing, { BRIDGE: "a", MODULES: "b", "DEBT-METHODS": "c" }),
      (error) => error.message.includes(`AUTO:${name} END`) && error.message.includes("Không ghi file")
    );
    const repo = fakeRepo();
    const capture = captureOutput();
    assert.equal(runFeatureParity({ deps: repo.deps, khung: missing, output: capture.output }), 1);
    assert.deepEqual(repo.writes, []);
  }
  ok("thiếu marker nêu đúng marker và không ghi gì");
}

/* 5b. Thiếu marker START cũng phải chặn — không chỉ marker END.
   Ca 5 chỉ xoá marker END, nên gỡ hẳn chốt kiểm marker START vẫn xanh: che phủ bất đối xứng.
   Claude bắt được bằng mutation 27/08. Thiếu chốt này thì script ghi bừa vào một file đang
   chứa lập luận của người — đúng thứ nguy hiểm hơn cả việc không chạy. */
{
  for (const name of AUTO_BLOCKS) {
    for (const edge of ["START", "END"]) {
      const token = `<!-- AUTO:${name} ${edge} -->`;
      const missing = markedDocument().replace(token, "");
      assert.notEqual(missing, markedDocument(), `fixture phải thật sự mất ${token}`);
      assert.throws(
        () => replaceAutoBlocks(missing, { BRIDGE: "a", MODULES: "b", "DEBT-METHODS": "c" }),
        (error) => error.message.includes(`AUTO:${name} ${edge}`) && error.message.includes("Không ghi file"),
        `thiếu ${token} phải ném lỗi nêu đúng marker`
      );
      const repo = fakeRepo();
      const capture = captureOutput();
      assert.equal(runFeatureParity({ deps: repo.deps, khung: missing, output: capture.output }), 1);
      assert.deepEqual(repo.writes, [], "thiếu marker thì tuyệt đối không được ghi gì");
    }
  }
  ok("thiếu marker START hay END đều chặn và đều không ghi gì");
}

/* 5c. Marker xuất hiện HAI lần phải chặn.
   Không chặn thì script ghi vào khối đầu tiên nó gặp — có thể là khối sai — và phần còn lại
   âm thầm mục. Claude bắt được bằng mutation 27/08: gỡ chốt này, suite vẫn xanh. */
{
  for (const name of AUTO_BLOCKS) {
    const token = `<!-- AUTO:${name} START -->`;
    const doubled = markedDocument().replace(token, `${token}\n${token}`);
    assert.notEqual(doubled, markedDocument(), `fixture phải thật sự nhân đôi ${token}`);
    const repo = fakeRepo();
    const capture = captureOutput();
    assert.equal(runFeatureParity({ deps: repo.deps, khung: doubled, output: capture.output }), 1);
    assert.deepEqual(repo.writes, [], "marker trùng lặp thì không được ghi gì");
  }
  ok("marker xuất hiện hai lần bị chặn và không ghi gì");
}

/* 5e. Marker SAI THỨ TỰ (END nằm trước START) phải chặn.
   Không chặn thì `end < start`, phép cắt chuỗi ra rác, và script ghi rác đè lên tài liệu.
   Claude bắt được bằng mutation 27/08: vô hiệu chốt này, suite vẫn xanh. */
{
  for (const name of AUTO_BLOCKS) {
    const startToken = `<!-- AUTO:${name} START -->`;
    const endToken = `<!-- AUTO:${name} END -->`;
    // Đảo chỗ hai marker qua một mốc tạm, để không tự thay lại chính mình.
    const swapped = markedDocument()
      .replace(startToken, " TMP ")
      .replace(endToken, startToken)
      .replace(" TMP ", endToken);
    assert.ok(swapped.indexOf(endToken) < swapped.indexOf(startToken),
      `fixture phải thật sự đảo được thứ tự marker ${name}`);
    const repo = fakeRepo();
    const capture = captureOutput();
    assert.equal(runFeatureParity({ deps: repo.deps, khung: swapped, output: capture.output }), 1);
    assert.deepEqual(repo.writes, [], "marker sai thứ tự thì không được ghi gì");
  }
  ok("marker sai thứ tự bị chặn và không ghi gì");
}

/* 5d. Đếm module chỉ tính `.js`.
   Fixture có sẵn `README.md` ghi "không đếm". Gỡ bộ lọc `.js` thì số file module sai mà
   không ca nào kêu — Claude bắt được bằng mutation 27/08. */
{
  const repo = fakeRepo();
  const model = collectParityModel(repo.deps);
  assert.equal(model.modules.gptCount, 4,
    "chỉ đếm 4 file .js bên GPT: bridge-core, same, gpt-only, different — KHÔNG đếm README.md");
  assert.equal(model.modules.geminiCount, 4,
    "bên Gemini cũng đúng 4 file .js");
  ok("đếm module chỉ tính .js, không tính tài liệu");
}

/* 6. --check PASS khi khớp; FAIL nêu dòng thật, hai phía và lệnh sửa. */
{
  const repo = fakeRepo();
  const khung = markedDocument();
  const expected = replaceAutoBlocks(khung, renderAutoBlocks(collectParityModel(repo.deps)));
  repo.files.set(PARITY_AUTO_FILE, expected);
  const pass = captureOutput();
  assert.equal(runFeatureParity({ check: true, deps: repo.deps, khung, output: pass.output }), 0);
  assert.ok(pass.logs.some((message) => message.includes("đang khớp")));

  const needle = "**GPT 2 · Gemini 2.**";
  assert.ok(expected.includes(needle), "fixture phải có đúng dòng định làm cũ");
  const stale = expected.replace(needle, "**GPT 999 · Gemini 2.**");
  repo.files.set(PARITY_AUTO_FILE, stale);
  const realLine = stale.replace(/\r\n?/g, "\n").split("\n").findIndex((line) => line.includes("GPT 999")) + 1;
  const fail = captureOutput();
  assert.equal(runFeatureParity({ check: true, deps: repo.deps, khung, output: fail.output }), 1);
  assert.ok(fail.errors.some((message) => message.includes(`lệch tại dòng ${realLine}.`)));
  assert.ok(fail.errors.some((message) => message.includes("Đang có:")));
  assert.ok(fail.errors.some((message) => message.includes("Cần có:")));
  assert.ok(fail.errors.some((message) => message.includes("node scripts/feature-parity.mjs")));
  ok("--check trả đúng mã và báo dòng thật, hai phía, lệnh sửa");
}

/* 7. --check tuyệt đối không ghi ở cả PASS và FAIL, chứng minh bằng hash. */
{
  const repo = fakeRepo();
  const khung = markedDocument();
  const expected = replaceAutoBlocks(khung, renderAutoBlocks(collectParityModel(repo.deps)));
  for (const content of [expected, expected.replace("**GPT 2", "**GPT 999")]) {
    repo.files.set(PARITY_AUTO_FILE, content);
    const beforeHash = sha(content);
    runFeatureParity({ check: true, deps: repo.deps, khung, output: captureOutput().output });
    assert.equal(sha(repo.files.get(PARITY_AUTO_FILE)), beforeHash);
  }
  assert.deepEqual(repo.writes, []);
  ok("--check không ghi file ở cả PASS lẫn FAIL");
}

/* 8. Hai lần sinh độc lập trên cùng cây byte-stable và render không sửa model. */
{
  const first = collectParityModel(fakeRepo().deps);
  const second = collectParityModel(fakeRepo().deps);
  const snapshot = JSON.stringify(first);
  assert.deepEqual(renderAutoBlocks(first), renderAutoBlocks(second));
  assert.equal(JSON.stringify(first), snapshot);
  const source = markedDocument();
  assert.equal(replaceAutoBlocks(source, renderAutoBlocks(first)), replaceAutoBlocks(source, renderAutoBlocks(second)));
  ok("thu thập và sinh lặp lại cho byte giống hệt");
}

/* 9. Ca repo thật: bộ trích phải khớp một phép đo ĐỘC LẬP tại chỗ.
 *
 * KHÔNG ghim con số chính xác nữa (trước đây là 22/19). Lý do rất cụ thể, xảy ra 03/09: một lane
 * khác thêm method Bridge thứ 23 vào gói của họ, và khối này ĐỎ — chặn một phiên chẳng liên quan
 * gì tới Bridge. Con số method là thứ mọi lane đều làm nó đổi, nên ghim cứng nó là dựng một cái
 * bẫy chéo-lane, không phải một lớp bảo vệ.
 *
 * Lớp bảo vệ THẬT là hai dòng `deepEqual` dưới: bộ trích của bộ sinh phải khớp một phép đo bằng
 * regex viết độc lập ngay tại đây. Nếu bộ trích hỏng thì hai bên lệch, và nó đỏ — bất kể có bao
 * nhiêu method. Thêm một NGƯỠNG SÀN để bắt ca cả hai cùng hỏng về 0 (regex sai, đổi tên hàm
 * `registryEntry`): đó là thứ duy nhất mà phép so hai bên không tự bắt được.
 */
{
  const directExtract = (text) => [...text.matchAll(/registryEntry\s*\(\s*\{\s*name\s*:\s*["']([^"']+)["']/gs)]
    .map((match) => match[1]).sort();
  const gptText = readFileSync(new URL(`../${GPT_DIR}/bridge-core.js`, import.meta.url), "utf8");
  const geminiText = readFileSync(new URL(`../${GEMINI_DIR}/bridge-core.js`, import.meta.url), "utf8");
  const independentlyMeasured = { gpt: directExtract(gptText), gemini: directExtract(geminiText) };
  // NGƯỠNG SÀN, không phải con số chính xác: bắt ca "cả hai phép đo cùng hỏng về gần 0" mà phép
  // so hai bên không tự bắt được. 15 là sàn an toàn — hai nhánh đang ở 23 và 19 hôm nay.
  const SAN = 15;
  assert.ok(independentlyMeasured.gpt.length >= SAN,
    `do lai duoc ${independentlyMeasured.gpt.length} method GPT — duoi san ${SAN} thi gan nhu chac la phep do hong, khong phai repo teo di`);
  assert.ok(independentlyMeasured.gemini.length >= SAN,
    `do lai duoc ${independentlyMeasured.gemini.length} method Gemini — duoi san ${SAN} thi gan nhu chac la phep do hong`);
  // ĐÂY là lớp bảo vệ thật, và nó không mục theo thời gian.
  assert.deepEqual(extractRegistryMethods(gptText), independentlyMeasured.gpt);
  assert.deepEqual(extractRegistryMethods(geminiText), independentlyMeasured.gemini);
  ok("repo thật: bộ trích khớp phép đo độc lập (ngưỡng sàn, không ghim con số dễ mục)");
}

/* 10. So sánh chỉ ra chính xác dòng đầu tiên trên file thực tế. */
{
  assert.deepEqual(compareParity("a\nb\nc", "a\nX\nc"), { matches: false, line: 2, expected: "b", actual: "X" });
  assert.deepEqual(compareParity("a\r\nb\r\n", "a\nb\n"), { matches: true });
  ok("so sánh báo dòng đầu tiên và coi CRLF/LF là tương đương");
}

/* 11. HEAD deps đọc blob/listing đã commit, không đọc file working tree. */
{
  const deps = createHeadDeps();
  const committed = execFileSync("git", ["-c", "core.quotepath=false", "show", "HEAD:FEATURE-PARITY.md"], {
    cwd: new URL("..", import.meta.url),
    encoding: "utf8"
  });
  assert.equal(deps.readFile("FEATURE-PARITY.md"), committed);
  assert.ok(deps.listFiles(GPT_DIR).includes("bridge-core.js"));
  assert.throws(() => deps.writeFile("FEATURE-PARITY.md", "không được ghi"), /HEAD_READ_ONLY/);
  ok("HEAD deps đọc git blob/listing và từ chối ghi");
}

/* 12. ADR-0014 · VẾ BẢO VỆ CHỮ CỦA NGƯỜI: máy ghi vào `FEATURE-PARITY.md` thì ĐỎ.
 *
 * Đây là vế khiến lượt tách khác hẳn với "miễn khoá cả file". Vế kia — file máy lạc hậu thì
 * cổng đỏ — đã có ở khối 6. Không có vế này thì ta vừa mở đường cho một lượt sinh máy đè lên
 * mục 2, thứ người viết tay và có bằng chứng [ĐỌC].
 *
 * Đo bằng HAI đường, cố ý: hỏi thẳng cái chốt, và đo hành vi của cả lượt sinh. Một đường thì
 * gỡ chốt vẫn có thể xanh — bản của `FEATURE-PARITY.md` trong fixture CÒN mang đủ ba mốc AUTO,
 * nên nếu đường ghi chưa bị bịt thì bộ sinh ghi được vào đó thật. */
{
  assert.equal(laFileMayDuocGhi(PARITY_AUTO_FILE), true, "file máy là file DUY NHẤT được ghi");
  for (const ngoaiVung of ["FEATURE-PARITY.md", "AGENTS.md", "DASHBOARD.md", "", "feature-parity-auto.md"]) {
    assert.equal(laFileMayDuocGhi(ngoaiVung), false,
      `bộ sinh KHÔNG được ghi ${JSON.stringify(ngoaiVung)} — chỉ ${PARITY_AUTO_FILE}`);
  }

  const repo = fakeRepo();
  const truoc = sha(repo.files.get("FEATURE-PARITY.md"));
  assert.ok(repo.files.get("FEATURE-PARITY.md").includes("<!-- AUTO:BRIDGE START -->"),
    "fixture phải dựng được ca hỏng: bản của người CÒN mốc AUTO, nên đường ghi chưa bịt là ghi được thật");
  const capture = captureOutput();
  assert.equal(runFeatureParity({ deps: repo.deps, output: capture.output }), 0);
  assert.deepEqual(repo.writes.map((w) => w.relPath), [PARITY_AUTO_FILE],
    `một lượt sinh chỉ được ghi ĐÚNG ${PARITY_AUTO_FILE}, không ghi gì khác`);
  assert.equal(sha(repo.files.get("FEATURE-PARITY.md")), truoc,
    "bản của NGƯỜI không được đổi một byte nào sau một lượt sinh — kể cả khi nó còn mốc AUTO");
  assert.ok(repo.files.get(PARITY_AUTO_FILE).includes("**GPT 2 · Gemini 2.**"),
    "và số đo phải thật sự vào file máy, nếu không thì khẳng định trên xanh vì bộ sinh không làm gì cả");
  ok("ADR-0014: máy chỉ ghi file máy — bản của NGƯỜI không đổi một byte, kể cả khi còn mốc AUTO");
}

/* 13. ADR-0014 · KHÔNG CÓ NGUỒN SỰ THẬT THỨ HAI, và có con trỏ.
 *
 * Chỗ dễ làm sai mà chính ADR ghi ra: chép khối AUTO sang file mới rồi để bản cũ nằm lại. Hai
 * bản của cùng một con số là hai nguồn sự thật, và repo này đã có ca một luật nằm ở hai chỗ
 * trả hai câu khác nhau. Nên đo trên repo THẬT, không trên fixture. */
{
  const nguoi = readFileSync(new URL("../FEATURE-PARITY.md", import.meta.url), "utf8");
  for (const name of AUTO_BLOCKS) {
    for (const edge of ["START", "END"]) {
      assert.ok(!nguoi.includes(`<!-- AUTO:${name} ${edge} -->`),
        `FEATURE-PARITY.md KHÔNG được còn mốc AUTO:${name} ${edge} — bản cũ nằm lại là nguồn sự thật thứ hai (ADR-0014)`);
    }
  }
  assert.ok(nguoi.includes(PARITY_AUTO_FILE),
    `FEATURE-PARITY.md phải giữ một CON TRỎ sang ${PARITY_AUTO_FILE} — không có nó thì người đọc mục 2 tưởng số liệu biến mất`);
  assert.ok(/^##\s+2\./m.test(nguoi),
    "và mục 2 — chữ của người — phải còn nguyên ở đó; đó là thứ cả lượt tách này sinh ra để bảo vệ");
  ok("ADR-0014 repo thật: FEATURE-PARITY.md hết mốc AUTO, còn con trỏ, còn mục 2");
}

/* 14. ADR-0014 · MIỄN KHOÁ PHẢI KHAI Ở CẤU HÌNH, không gõ cứng vào script.
 *
 * Luật này đã trả giá một lần: trước 04/09 danh sách miễn trừ bị gõ cứng ở hai chỗ, và hai bản
 * sao của một luật trả hai câu khác nhau cho cùng một file. Đọc bằng `generatedFrom` — đúng
 * hàm mà cả cổng đóng phiên lẫn `safe-push` đi qua — chứ không tự đọc JSON ở đây, để phép ghim
 * này không thành bản sao thứ ba. */
{
  const cauHinh = JSON.parse(readFileSync(new URL("../.repo-structure.json", import.meta.url), "utf8"));
  const mienKhoa = generatedFrom(cauHinh);
  assert.ok(mienKhoa.includes(PARITY_AUTO_FILE),
    `${PARITY_AUTO_FILE} phải nằm trong khối \`generated\` của .repo-structure.json — đó là chỗ DUY NHẤT cấp miễn khoá, và không có nó thì cả lượt tách vô ích`);
  assert.ok(!mienKhoa.includes("FEATURE-PARITY.md"),
    "còn FEATURE-PARITY.md thì KHÔNG được miễn — nó là chữ của người, chạm nó vẫn phải giữ `_root`");
  ok("ADR-0014: miễn khoá khai ở `generated`, và bản của người vẫn KHÔNG được miễn");
}

/* 15. ADR-0014 · BỘ SINH DETERMINISTIC VÀ KHÔNG ĐỌC ĐỒNG HỒ.
 *
 * File máy nằm trong khối `generators`, nên cổng kiểm nó mỗi phiên và `safe-push` từ chối đẩy
 * khi nó lệch. Nếu nội dung phụ thuộc giờ đồng hồ thì sang ngày mới là MỌI lane bị chặn đẩy dù
 * không dữ liệu nào đổi. Mục `N-21` vừa vá đúng bệnh đó ở một artifact khác.
 *
 * Ba vế: hai lượt trên cùng cây ra giống hệt từng byte · không có một mốc ngày nào trong bản
 * ra · và bộ sinh chạy được khi `Date.now` bị làm cho NÉM. Vế thứ ba là vế chứng minh, hai vế
 * đầu chỉ là dấu hiệu: một bộ sinh đọc đồng hồ rồi làm tròn về tháng vẫn qua được hai vế đầu. */
{
  const lan1 = fakeRepo();
  const lan2 = fakeRepo();
  runFeatureParity({ deps: lan1.deps, output: captureOutput().output });
  runFeatureParity({ deps: lan2.deps, output: captureOutput().output });
  assert.equal(lan1.writes.length, 1, "một lượt sinh, một lượt ghi");
  assert.equal(sha(lan1.writes[0].text), sha(lan2.writes[0].text),
    "hai lượt sinh trên cùng một cây phải ra giống hệt TỪNG BYTE");
  assert.doesNotMatch(lan1.writes[0].text, /\d{4}-\d{2}-\d{2}/,
    "bản ra KHÔNG được chứa một mốc ngày nào — có mốc là sang ngày mới mọi lane bị chặn đẩy");

  const nowGoc = Date.now;
  let ketQua;
  try {
    Date.now = () => { throw new Error("DONG_HO_BI_CAM: bộ sinh không được đọc đồng hồ hệ thống."); };
    const lan3 = fakeRepo();
    assert.equal(runFeatureParity({ deps: lan3.deps, output: captureOutput().output }), 0,
      "bộ sinh phải chạy được khi đồng hồ hệ thống bị cấm — đọc đồng hồ là ném ngay tại đây");
    ketQua = lan3.writes[0].text;
  } finally {
    Date.now = nowGoc;
  }
  assert.equal(sha(ketQua), sha(lan1.writes[0].text),
    "và ra đúng cùng một byte như khi đồng hồ còn dùng được");
  ok("ADR-0014: hai lượt sinh giống hệt từng byte, không mốc ngày, chạy được khi cấm đọc đồng hồ");
}

console.log(`\n${passed} passed, 0 failed, ${passed} total`);
