import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import {
  AUTO_BLOCKS,
  collectParityModel,
  compareParity,
  countLines,
  extractRegistryMethods,
  normalizedHash,
  renderAutoBlocks,
  replaceAutoBlocks,
  runFeatureParity,
  subtractSets
} from "../scripts/feature-parity.mjs";

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

function fakeRepo({ parity = markedDocument() } = {}) {
  const files = new Map([
    ["FEATURE-PARITY.md", parity],
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
    const repo = fakeRepo({ parity: missing });
    const capture = captureOutput();
    assert.equal(runFeatureParity({ deps: repo.deps, output: capture.output }), 1);
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
      const repo = fakeRepo({ parity: missing });
      const capture = captureOutput();
      assert.equal(runFeatureParity({ deps: repo.deps, output: capture.output }), 1);
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
    const repo = fakeRepo({ parity: doubled });
    const capture = captureOutput();
    assert.equal(runFeatureParity({ deps: repo.deps, output: capture.output }), 1);
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
    const repo = fakeRepo({ parity: swapped });
    const capture = captureOutput();
    assert.equal(runFeatureParity({ deps: repo.deps, output: capture.output }), 1);
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
  const expected = replaceAutoBlocks(repo.files.get("FEATURE-PARITY.md"), renderAutoBlocks(collectParityModel(repo.deps)));
  repo.files.set("FEATURE-PARITY.md", expected);
  const pass = captureOutput();
  assert.equal(runFeatureParity({ check: true, deps: repo.deps, output: pass.output }), 0);
  assert.ok(pass.logs.some((message) => message.includes("đang khớp")));

  const needle = "**GPT 2 · Gemini 2.**";
  assert.ok(expected.includes(needle), "fixture phải có đúng dòng định làm cũ");
  const stale = expected.replace(needle, "**GPT 999 · Gemini 2.**");
  repo.files.set("FEATURE-PARITY.md", stale);
  const realLine = stale.replace(/\r\n?/g, "\n").split("\n").findIndex((line) => line.includes("GPT 999")) + 1;
  const fail = captureOutput();
  assert.equal(runFeatureParity({ check: true, deps: repo.deps, output: fail.output }), 1);
  assert.ok(fail.errors.some((message) => message.includes(`lệch tại dòng ${realLine}.`)));
  assert.ok(fail.errors.some((message) => message.includes("Đang có:")));
  assert.ok(fail.errors.some((message) => message.includes("Cần có:")));
  assert.ok(fail.errors.some((message) => message.includes("node scripts/feature-parity.mjs")));
  ok("--check trả đúng mã và báo dòng thật, hai phía, lệnh sửa");
}

/* 7. --check tuyệt đối không ghi ở cả PASS và FAIL, chứng minh bằng hash. */
{
  const repo = fakeRepo();
  const expected = replaceAutoBlocks(repo.files.get("FEATURE-PARITY.md"), renderAutoBlocks(collectParityModel(repo.deps)));
  for (const content of [expected, expected.replace("**GPT 2", "**GPT 999")]) {
    repo.files.set("FEATURE-PARITY.md", content);
    const beforeHash = sha(content);
    runFeatureParity({ check: true, deps: repo.deps, output: captureOutput().output });
    assert.equal(sha(repo.files.get("FEATURE-PARITY.md")), beforeHash);
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

/* 9. Ca repo thật: bộ trích phải khớp phép đo độc lập tại chỗ, gồm đúng 22/19 hiện hành. */
{
  const directExtract = (text) => [...text.matchAll(/registryEntry\s*\(\s*\{\s*name\s*:\s*["']([^"']+)["']/gs)]
    .map((match) => match[1]).sort();
  const gptText = readFileSync(new URL(`../${GPT_DIR}/bridge-core.js`, import.meta.url), "utf8");
  const geminiText = readFileSync(new URL(`../${GEMINI_DIR}/bridge-core.js`, import.meta.url), "utf8");
  const independentlyMeasured = { gpt: directExtract(gptText), gemini: directExtract(geminiText) };
  assert.equal(independentlyMeasured.gpt.length, 22, "repo thật phải đo lại được 22 method GPT");
  assert.equal(independentlyMeasured.gemini.length, 19, "repo thật phải đo lại được 19 method Gemini");
  assert.deepEqual(extractRegistryMethods(gptText), independentlyMeasured.gpt);
  assert.deepEqual(extractRegistryMethods(geminiText), independentlyMeasured.gemini);
  ok("repo thật được đo lại độc lập và khớp 22/19 method");
}

/* 10. So sánh chỉ ra chính xác dòng đầu tiên trên file thực tế. */
{
  assert.deepEqual(compareParity("a\nb\nc", "a\nX\nc"), { matches: false, line: 2, expected: "b", actual: "X" });
  assert.deepEqual(compareParity("a\r\nb\r\n", "a\nb\n"), { matches: true });
  ok("so sánh báo dòng đầu tiên và coi CRLF/LF là tương đương");
}

console.log(`\n${passed} passed, 0 failed, ${passed} total`);
