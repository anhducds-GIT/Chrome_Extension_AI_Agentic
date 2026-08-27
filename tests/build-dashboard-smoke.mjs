import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { sep } from "node:path";

import { buildDashboard, collectModel, detectStatusMachineOwnedFacts, parsePorcelain, parseStatus, runDashboard, STAMP_PREFIX, validateStatus } from "../scripts/build-dashboard.mjs";

let passed = 0;
const ok = (name) => { passed += 1; console.log(`  ok  ${name}`); };

const SHA = "a".repeat(40);
const REQUIRED_PATHS = new Set([
  "workers/demo/v1/manifest.json",
  "workers/demo/v1/README.md",
  "workers/demo/v1/HANDOFF.md",
  "workers/demo/v1/evidence/proof.md"
]);

function validFm(overrides = {}) {
  return {
    schema: "extension-status/v1",
    id: "demo",
    name: "Bản demo",
    lifecycle: "active",
    version_source: "workers/demo/v1/manifest.json",
    last_verified: "2026-08-26",
    last_verified_commit: SHA,
    last_verified_how: "Kiểm tra thử",
    evidence_ref: "workers/demo/v1/evidence/proof.md",
    current_focus: "Kiểm tra dashboard",
    ref_readme: "workers/demo/v1/README.md",
    ref_handoff: "workers/demo/v1/HANDOFF.md",
    ...overrides
  };
}

function validationDeps({ existing = REQUIRED_PATHS, validJson = true, resolves = true, directories = new Set(), bindPackage = false } = {}) {
  return {
    statusPath: "workers/demo/v1/STATUS.md",
    fileExists: (relPath) => existing.has(relPath),
    isFile: (relPath) => existing.has(relPath) && !directories.has(relPath),
    readFile: () => validJson ? '{"name":"Demo","version":"1.2.3"}' : "{sai-json",
    git: { verifyCommit: () => resolves },
    ...(bindPackage ? { packageDir: "workers/demo/v1", packageId: "demo" } : {})
  };
}

function statusText(fm = validFm()) {
  return `---\n${Object.entries(fm).map(([key, value]) => `${key}: ${value}`).join("\n")}\n---\nNội dung ngắn.\n`;
}

function fakeRepo({ includeStatus = true, changedCommits = [], statusOverrides = null, dirty = [] } = {}) {
  const files = new Map([
    [".agents/claims.json", JSON.stringify({ claims: { "workers/demo": { owner: "codex-dashboard" }, _root: { owner: "claude-platform-2" } } })],
    ["manifest.json", JSON.stringify({ name: "Extension Observer V0", version: "0.1.0" })],
    ["workers/demo/v1/manifest.json", JSON.stringify({ name: "Demo từ manifest", version: "1.2.3" })],
    ["workers/demo/v1/README.md", "# Demo"],
    ["workers/demo/v1/HANDOFF.md", "# Handoff"],
    ["workers/demo/v1/evidence/proof.md", "proof"],
    ["workers/demo/v1/bridge-core.js", "registryEntry({\nregistryEntry({"],
    ["workers/demo/v1/tests/one.mjs", ""],
    ["workers/demo/v1/tests/two.mjs", ""]
  ]);
  if (includeStatus) files.set("workers/demo/v1/STATUS.md", statusText(validFm(statusOverrides ?? {})));
  const directories = new Map([
    ["workers", ["demo"]],
    ["workers/demo", ["v1"]]
  ]);
  return {
    root: "C:/repo co khoang trang",
    fileExists: (relPath) => files.has(relPath) || relPath === "workers/demo/v1/tests" || relPath === "tests",
    isFile: (relPath) => files.has(relPath),
    readFile: (relPath) => {
      if (!files.has(relPath)) throw new Error(`fixture thiếu ${relPath}`);
      return files.get(relPath);
    },
    listDirs: (relPath) => directories.get(relPath) ?? [],
    listFiles: (relPath) => [...files.keys()].filter((name) => name.startsWith(`${relPath}/`) && !name.slice(relPath.length + 1).includes("/")).map((name) => name.slice(relPath.length + 1)),
    git: {
      shortHead: () => "abc1234",
      headDate: () => "2026-08-26",
      verifyCommit: () => true,
      changedFilesSince: () => changedCommits,
      dirtyFiles: () => dirty
    }
  };
}

function checkHarness({ dashboard, exists = true } = {}) {
  const base = fakeRepo();
  const writes = [];
  const logs = [];
  const errors = [];
  const deps = {
    ...base,
    fileExists: (relPath) => relPath === "DASHBOARD.md" ? exists : base.fileExists(relPath),
    readFile: (relPath) => relPath === "DASHBOARD.md" ? dashboard : base.readFile(relPath),
    writeFile: (relPath, text) => writes.push({ relPath, text })
  };
  const output = {
    log: (message) => logs.push(message),
    error: (message) => errors.push(message)
  };
  return { deps, output, writes, logs, errors };
}

function antiDrift(text, measurements = {}) {
  return detectStatusMachineOwnedFacts(text, {
    statusPath: "workers/demo/v1/STATUS.md",
    bridgeMethods: 22,
    testFiles: 94,
    version: "0.3.0",
    ...measurements
  });
}

/* 1. Parser phẳng, có comment, dấu hai chấm và dấu nháy. */
{
  const parsed = parseStatus('---\n# bỏ qua\nschema: extension-status/v1\nid: demo\nname: "Tên: có dấu hai chấm"\nlifecycle: active\n---\nThân file.\n');
  assert.deepEqual(parsed.frontmatter, {
    schema: "extension-status/v1",
    id: "demo",
    name: "Tên: có dấu hai chấm",
    lifecycle: "active"
  });
  assert.equal(parsed.body, "Thân file.\n");
  ok("parse frontmatter phẳng ra đúng từng giá trị");
}

/* 1b. File có BOM UTF-8 vẫn phải parse được.
   Windows sinh BOM rất dễ. Không cắt BOM thì dòng đầu không khớp "---", parser coi như file
   không có frontmatter, và generator báo "thiếu 8 trường bắt buộc" trong khi 8 trường đó
   đang nằm ngay trên màn hình — dẫn người đọc đi sai hướng hoàn toàn. Gặp thật 2026-08-26. */
{
  const withBom = "﻿---\nschema: extension-status/v1\nid: demo\n---\nThân file.\n";
  assert.deepEqual(parseStatus(withBom).frontmatter, { schema: "extension-status/v1", id: "demo" },
    "BOM UTF-8 ở đầu file không được làm hỏng frontmatter");
  ok("file có BOM UTF-8 vẫn parse được frontmatter");
}

/* 2. Bằng chứng được khai nhưng file không tồn tại phải đỏ và nêu đúng file. */
{
  const missing = "workers/demo/v1/evidence/khong-co.md";
  const errors = validateStatus(validFm({ evidence_ref: missing }), validationDeps());
  assert.ok(errors.some((message) => message.includes(missing)), "lỗi phải nêu đúng file bằng chứng bị thiếu");
  ok("bằng chứng không tồn tại bị từ chối và lỗi nêu đúng file");
}

/* Các luật validate còn lại đều có test ghim riêng để mutation test làm đỏ. */
{
  const schemaErrors = validateStatus(validFm({ schema: "extension-status/v0" }), validationDeps());
  assert.ok(schemaErrors.some((message) => message.includes("extension-status/v1")));
  const missingField = validFm();
  delete missingField.current_focus;
  assert.ok(validateStatus(missingField, validationDeps()).some((message) => message.includes("current_focus")));
  assert.ok(validateStatus(validFm({ lifecycle: "unknown" }), validationDeps()).some((message) => message.includes("unknown")));
  const activeMissing = validFm();
  delete activeMissing.last_verified;
  assert.ok(validateStatus(activeMissing, validationDeps()).some((message) => message.includes("last_verified")));
  ok("schema, trường bắt buộc, lifecycle và active-last_verified đều được chặn");
}

{
  const missingVersion = new Set([...REQUIRED_PATHS].filter((name) => !name.endsWith("manifest.json")));
  assert.ok(validateStatus(validFm(), validationDeps({ existing: missingVersion })).some((message) => message.includes("manifest.json")));
  assert.ok(validateStatus(validFm(), validationDeps({ validJson: false })).some((message) => message.includes("JSON")));
  const missingRef = "workers/demo/v1/khong-co-runbook.md";
  assert.ok(validateStatus(validFm({ ref_runbook: missingRef }), validationDeps()).some((message) => message.includes(missingRef)));
  const noEvidence = validFm();
  delete noEvidence.evidence_ref;
  assert.ok(validateStatus(noEvidence, validationDeps()).some((message) => message.includes("thiếu evidence_ref")));
  ok("version_source, ref_* và lời khai thiếu evidence_ref đều được chặn");
}

/* 3. Hàm render thuần và byte-stable. */
{
  const model = collectModel(fakeRepo());
  assert.equal(buildDashboard(model), buildDashboard(model));
  ok("buildDashboard trả byte giống hệt với cùng model");
}

/* 2b. Bốn nhóm số machine-owned phải bị bắt, kể cả frontmatter tự do. */
{
  const cases = [
    ["Bridge (22 lệnh)", "Method Bridge [ĐO]"],
    ["19 method", "Method Bridge [ĐO]"],
    ["81 file test", "File test [ĐO]"],
    ["version 0.3.0", "Version [ĐO]"]
  ];
  for (const [violation, target] of cases) {
    const errors = antiDrift(statusText(validFm()) + violation + "\n");
    assert.ok(errors.some((message) => message.includes(`\"${violation}\"`) && message.includes(target)),
      `lỗi phải nêu chuỗi bị bắt và chỗ thay thế cho ${violation}`);
  }
  const parity = antiDrift(statusText(validFm({ current_focus: "nợ 6 tính năng + 3 method" })));
  assert.ok(parity.some((message) => message.includes('"nợ 6 tính năng + 3 method"') && message.includes("FEATURE-PARITY.md")));
  const missingMethods = antiDrift(statusText(validFm({ current_focus: "3 method còn thiếu" })));
  assert.ok(missingMethods.some((message) => message.includes('"3 method còn thiếu"') && message.includes("FEATURE-PARITY.md")));
  ok("bốn nhóm số machine-owned bị bắt và lỗi trỏ đúng nguồn thay thế");
}

/* 2c. Số lời khai, giới hạn an toàn, mã việc và tên riêng hợp lệ tuyệt đối không bị bắt. */
{
  const sha40 = "0123456789abcdef0123456789abcdef01234567";
  const allowed = [
    "2026-08-26 3/3 5/5 9/9 18/18 90 giây 1054 ms 3,5MB",
    `B-14 B-15 B-17 B-19 B-21 B-14…B-21 v0.1.0 v0.2.0 V0.3 00d1f99 dd3c736 ${sha40}`,
    'mục 6 V0.1 vòng 3 "Duc Auto ChatGPT V0.3"'
  ].join("\n");
  assert.deepEqual(antiDrift(statusText(validFm({
    current_focus: "B-14…B-21; việc thật không chạy qua trần 90 giây",
    last_verified_how: "Pilot live 3/3 và 5/5 phép kiểm"
  })) + allowed), []);
  ok("toàn bộ số lời khai, giới hạn, mã việc và tên riêng hợp lệ không bị báo oan");
}

/* 2d. Code và đường dẫn bị loại trước khi quét. */
{
  const hidden = statusText(validFm({
    version_source: "workers/demo/v0.1.0/manifest.json",
    ref_readme: "workers/demo/v0.2.0/README.md",
    current_focus: "xem `Bridge (22 lệnh)`"
  })) + [
    "[đọc README](workers/demo/v0.1.0/README.md)",
    "```text",
    "81 file test",
    "```"
  ].join("\n");
  assert.deepEqual(antiDrift(hidden), []);
  ok("code span, code fence, link target và frontmatter đường dẫn bị loại trước khi quét");
}

/* 2e. Detector phải nối thật vào collectModel và gom mọi lỗi thay vì dừng ở lỗi đầu. */
{
  const violating = fakeRepo({ statusOverrides: {
    current_focus: "nợ 6 tính năng + 3 method",
    last_verified_how: "đã chạy 81 file test"
  } });
  assert.throws(
    () => collectModel(violating),
    (error) => error.name === "StatusValidationError"
      && error.validationErrors.length === 2
      && error.message.includes("FEATURE-PARITY.md")
      && error.message.includes("File test [ĐO]"),
    "collectModel phải gom cả hai lỗi anti-drift"
  );
  ok("anti-drift nối thật vào collectModel và gom hết lỗi");
}

/* 2f. Hai STATUS thật trong repo là ca hồi quy chống báo oan. */
{
  for (const relPath of [
    "workers/duc-auto-chatgpt/v0.1.0/STATUS.md",
    "workers/duc-auto-gemini/v0.2.0/STATUS.md"
  ]) {
    const text = readFileSync(new URL(`../${relPath}`, import.meta.url), "utf8");
    assert.deepEqual(detectStatusMachineOwnedFacts(text, { statusPath: relPath }), [],
      `${relPath} đang sạch và không được bị detector báo oan`);
  }
  ok("detector trả 0 cảnh báo trên cả hai STATUS thật");
}

/* 4. Manifest không có STATUS vẫn phải thành một hàng rõ ràng. */
{
  const output = buildDashboard(collectModel(fakeRepo({ includeStatus: false })));
  assert.match(output, /CHƯA KHAI STATUS/);
  assert.match(output, /Demo từ manifest/);
  ok("thư mục có manifest nhưng thiếu STATUS vẫn hiện trong registry");
}

/* 5. Cả SHA sai dạng và SHA 40 hex không resolve đều phải đỏ, có tên SHA. */
{
  const shortSha = "abc123";
  const badShape = validateStatus(validFm({ last_verified_commit: shortSha }), validationDeps());
  assert.ok(badShape.some((message) => message.includes(shortSha)));
  const ghostSha = "b".repeat(40);
  const ghost = validateStatus(validFm({ last_verified_commit: ghostSha }), validationDeps({ resolves: false }));
  assert.ok(ghost.some((message) => message.includes(ghostSha)));
  ok("SHA sai dạng và commit ma đều bị từ chối, lỗi nêu đúng SHA");
}

/* 6. Bộ lọc changed_since_verified phải đúng theo cả hai hướng. */
{
  const harmless = [
    { sha: "1".repeat(40), files: ["workers/demo/v1/STATUS.md", "workers/demo/v1/evidence-new/data.json"] },
    { sha: "2".repeat(40), files: ["workers/demo/v1/Pilot-07-Tạo Ảnh tô màu/result.json", "workers/demo/v1/Batch-01/data.json"] }
  ];
  const harmlessOutput = buildDashboard(collectModel(fakeRepo({ changedCommits: harmless })));
  assert.match(harmlessOutput, /\| KHÔNG \| codex-dashboard \|/);

  const behavioural = [
    ...harmless,
    { sha: "3".repeat(40), files: ["workers/demo/v1/content.js"] },
    { sha: "4".repeat(40), files: ["workers/demo/v1/sidepanel.css", "workers/demo/v1/HANDOFF.md"] }
  ];
  const behaviouralOutput = buildDashboard(collectModel(fakeRepo({ changedCommits: behavioural })));
  assert.match(behaviouralOutput, /CÓ \(2 commit\)/);
  ok("lọc thay đổi tài liệu/bằng chứng và đếm commit hành vi đúng hai hướng");
}

/* 7. Luật lõi phải được NỐI THẬT vào generator, không chỉ tồn tại rời trong validateStatus.

   Vì sao có ca này: mọi ca trên đều gọi thẳng `validateStatus`. Nếu ai đó gỡ lời gọi
   `validateStatus` ra khỏi `collectModel`, tất cả các ca trên VẪN XANH trong khi dashboard
   sinh ra bình thường từ một lời khai bằng chứng ma — đúng loại "test giả" mà AGENTS.md
   mục 3 luật 2 cấm. Đã phá thử thật ngày 2026-08-26: gỡ đường nối -> 9/9 vẫn xanh.
   Ca này ghim chính đường nối đó. */
{
  const ghost = "workers/demo/v1/evidence/khong-he-co.md";
  assert.throws(
    () => collectModel(fakeRepo({ statusOverrides: { evidence_ref: ghost } })),
    (error) => error.name === "StatusValidationError" && error.message.includes(ghost),
    "collectModel PHẢI từ chối dựng model khi STATUS khai bằng chứng ma"
  );
  // Chiều ngược lại: repo hợp lệ thì không được ném — nếu không, ca trên xanh vì lý do sai.
  assert.doesNotThrow(() => collectModel(fakeRepo()));
  ok("luật bằng chứng được nối thật vào collectModel, không chỉ nằm rời");
}

/* 8. Determinism đo bằng hai model dựng ĐỘC LẬP, và render không được sửa model. */
{
  const first = collectModel(fakeRepo());
  const second = collectModel(fakeRepo());
  const snapshot = JSON.stringify(first);
  const output = buildDashboard(first);
  assert.equal(output, buildDashboard(second), "hai lần thu thập cùng cây phải render y hệt");
  assert.equal(JSON.stringify(first), snapshot, "buildDashboard không được sửa model đầu vào");
  ok("hai model dựng độc lập render giống hệt, và render không sửa model");
}

/* 9. Bằng chứng trỏ vào THƯ MỤC không phải là bằng chứng.
   Auditor độc lập (Codex, 2026-08-26) dựng được ca này thật: `evidence_ref` trỏ vào một
   thư mục thì `fs.existsSync` trả true, generator exit 0, và luật bằng chứng thành hình thức. */
{
  const asDir = "workers/demo/v1/evidence";
  const deps = validationDeps({
    existing: new Set([...REQUIRED_PATHS, asDir]),
    directories: new Set([asDir])
  });
  const errors = validateStatus(validFm({ evidence_ref: asDir }), deps);
  assert.ok(errors.some((message) => message.includes(asDir) && message.includes("THƯ MỤC")),
    "evidence_ref trỏ vào thư mục phải bị từ chối và lỗi phải nói rõ là thư mục");
  // Chiều ngược lại: trỏ đúng vào file thì không được kêu.
  assert.equal(validateStatus(validFm(), deps).length, 0);
  ok("bằng chứng trỏ vào thư mục bị từ chối, trỏ vào file thì qua");
}

/* 10. `id` và `version_source` phải thuộc về đúng package đang khai.
   Auditor dựng được ca gán số nhầm chủ: version lấy của extension khác, còn số method và
   số test vẫn đếm của mình — từng ô đều "đúng", tổng thể thì nói dối. */
{
  const bound = { bindPackage: true };
  const wrongId = validateStatus(validFm({ id: "khong-phai-ten-thu-muc" }), validationDeps(bound));
  assert.ok(wrongId.some((message) => message.includes("khong-phai-ten-thu-muc")),
    "id không trùng tên thư mục package phải bị chặn");

  const foreign = "workers/extension-khac/v1/manifest.json";
  const wrongSource = validateStatus(
    validFm({ version_source: foreign }),
    validationDeps({ ...bound, existing: new Set([...REQUIRED_PATHS, foreign]) })
  );
  assert.ok(wrongSource.some((message) => message.includes(foreign) && message.includes("TRONG package")),
    "version_source trỏ ra ngoài package phải bị chặn");

  assert.equal(validateStatus(validFm(), validationDeps(bound)).length, 0, "khai đúng thì không được kêu");
  ok("id và version_source bị buộc thuộc đúng package đang khai");
}

/* 11. Cột "Code đổi sau kiểm chứng?" phải thấy cả việc ĐANG SỬA DỞ, chưa commit.
   Lịch sử commit mù với working tree. Chỉ đếm commit thì dashboard khai "KHÔNG đổi" trong
   khi trên đĩa đang có một `.js` sửa dở — đúng cái trấn an sai mà cột này sinh ra để chặn. */
{
  const clean = buildDashboard(collectModel(fakeRepo({ dirty: [] })));
  assert.match(clean, /\| KHÔNG \| codex-dashboard \|/, "cây sạch phải là KHÔNG");

  // Chỉ sửa tài liệu / vùng bằng chứng thì vẫn phải là KHÔNG.
  const docsOnly = buildDashboard(collectModel(fakeRepo({
    dirty: ["workers/demo/v1/HANDOFF.md", "workers/demo/v1/evidence/them.json"]
  })));
  assert.match(docsOnly, /\| KHÔNG \| codex-dashboard \|/, "sửa dở chỉ tài liệu/bằng chứng vẫn là KHÔNG");

  // Một `.js` sửa dở chưa commit thì PHẢI hiện ra.
  const dirtyCode = buildDashboard(collectModel(fakeRepo({
    dirty: ["workers/demo/v1/content.js", "workers/demo/v1/HANDOFF.md"]
  })));
  assert.match(dirtyCode, /CÓ \(1 file đang sửa dở, CHƯA commit\)/,
    "một .js sửa dở chưa commit phải hiện lên cột thay đổi");
  ok("cột thay đổi thấy cả việc đang sửa dở, và không kêu oan vì tài liệu");
}

/* 12. `version_source` không được lách ra ngoài package bằng `..`.
   So chuỗi thô thì `v1/../../package-khac/manifest.json` vẫn "bắt đầu bằng" thư mục package
   và lọt. Auditor Codex lách được thật ở vòng 2 (2026-08-26): version lấy của extension
   khác, số method và số test vẫn đếm của mình — từng ô đúng, tổng thể nói dối. */
{
  const traversal = "workers/demo/v1/../../extension-khac/v1/manifest.json";
  const errors = validateStatus(
    validFm({ version_source: traversal }),
    validationDeps({ bindPackage: true, existing: new Set([...REQUIRED_PATHS, traversal]) })
  );
  assert.ok(errors.some((message) => message.includes(traversal)),
    "version_source dùng .. để trỏ ra ngoài package phải bị chặn");
  ok("version_source không lách được ra ngoài package bằng ..");
}

/* 13. Đổi tên `.js` -> `.md` phải bị đếm là ĐỔI CODE, cả khi đã commit lẫn khi đang sửa dở.
   Git mặc định gộp đổi tên thành một dòng chỉ ghi tên MỚI, nên vế `.js` biến mất và bộ lọc
   tài liệu nuốt luôn — code rời khỏi package mà cột vẫn khai "KHÔNG đổi". Generator phải
   gọi git kèm `--no-renames` để nó thành xoá + thêm. Auditor Codex dựng được ca này. */
{
  // Đã commit: git --no-renames trả về CẢ hai vế.
  const renamedCommit = [{ sha: "5".repeat(40), files: ["workers/demo/v1/bridge-core.js", "workers/demo/v1/bridge-core.md"] }];
  assert.match(
    buildDashboard(collectModel(fakeRepo({ changedCommits: renamedCommit }))),
    /CÓ \(1 commit\)/,
    "đổi tên .js -> .md đã commit phải bị đếm là đổi code"
  );

  // Đang sửa dở: cùng lý do, cả hai vế phải tới được bộ lọc.
  assert.match(
    buildDashboard(collectModel(fakeRepo({ dirty: ["workers/demo/v1/bridge-core.js", "workers/demo/v1/bridge-core.md"] }))),
    /CÓ \(1 file đang sửa dở, CHƯA commit\)/,
    "đổi tên .js -> .md chưa commit phải bị đếm là đổi code"
  );
  ok("đổi tên .js sang .md bị đếm là đổi code, cả đã commit lẫn đang sửa dở");
}

/* 14. Lệnh git thật phải mang đúng cờ — đây là thứ fixture KHÔNG kiểm được.
   Fixture tiêm sẵn kết quả, nên nếu generator quên `--no-renames` thì mọi ca trên vẫn xanh.
   Ca này soi thẳng vào chuỗi lệnh, giống cách `session-check-utf8-paths.mjs` ghim
   `core.quotepath=false`. */
{
  const source = readFileSync(new URL("../scripts/build-dashboard.mjs", import.meta.url), "utf8");
  // Bỏ dòng chú thích trước khi soi — bài học từ `bridge-run-stop-chat-reload-smoke.mjs`:
  // bản đầu của test đó khớp phải chữ trong một dòng CHÚ THÍCH và báo đỏ oan.
  const lines = source.split("\n").filter((line) => !line.trim().startsWith("//"));
  for (const name of ["changedFilesSince", "dirtyFiles"]) {
    const line = lines.find((candidate) => candidate.includes(`${name}: (`));
    assert.ok(line, `không tìm thấy hàm ${name}`);
    assert.ok(line.includes('"--no-renames"'),
      `${name} phải gọi git kèm cờ --no-renames, nếu không đổi tên .js -> .md sẽ tàng hình`);
  }
  assert.ok(lines.join("\n").includes('"core.quotepath=false"'),
    "git phải được gọi kèm core.quotepath=false — tên thư mục tiếng Việt");
  ok("lệnh git thật mang đủ cờ --no-renames và core.quotepath=false");
}

/* 15. Ba lớp bảo vệ mà vòng audit 3 chỉ ra là CHƯA có test ghim.
   Auditor gỡ từng lớp và suite vẫn 17/17 xanh — lớp bảo vệ không có test ghim thì sớm muộn
   cũng bị gỡ mà không ai biết. Đây đúng là "test giả" ở dạng nhẹ. */
{
  // (a) Đường dẫn không chuẩn tắc nhưng VẪN nằm trong package: "./" và "sub/..".
  //     Điều kiện `normalized !== fm.version_source` là thứ duy nhất bắt được ca này.
  for (const crooked of ["workers/demo/v1/./manifest.json", "workers/demo/v1/sub/../manifest.json"]) {
    const errors = validateStatus(
      validFm({ version_source: crooked }),
      validationDeps({ bindPackage: true, existing: new Set([...REQUIRED_PATHS, crooked]) })
    );
    assert.ok(errors.some((message) => message.includes(crooked)),
      `version_source không chuẩn tắc "${crooked}" phải bị chặn`);
  }

  // (b) Junction/symlink: chuỗi thì "nằm trong", đường dẫn THẬT thì ra ngoài.
  const viaJunction = "workers/demo/v1/foreign-version/manifest.json";
  const junctionDeps = {
    ...validationDeps({ bindPackage: true, existing: new Set([...REQUIRED_PATHS, viaJunction]) }),
    realPath: (relPath) => relPath === "workers/demo/v1"
      ? `${sep}repo${sep}workers${sep}demo${sep}v1`
      : `${sep}repo${sep}workers${sep}extension-khac${sep}v1${sep}manifest.json`
  };
  assert.ok(
    validateStatus(validFm({ version_source: viaJunction }), junctionDeps)
      .some((message) => message.includes(viaJunction)),
    "version_source đi qua junction ra ngoài package phải bị chặn"
  );
  // Chiều ngược lại: realPath nằm đúng trong package thì không được kêu.
  const honestDeps = {
    ...validationDeps({ bindPackage: true }),
    realPath: (relPath) => relPath === "workers/demo/v1"
      ? `${sep}repo${sep}workers${sep}demo${sep}v1`
      : `${sep}repo${sep}workers${sep}demo${sep}v1${sep}manifest.json`
  };
  assert.equal(validateStatus(validFm(), honestDeps).length, 0, "khai đúng và realPath đúng thì không được kêu");

  // (c) Tách " -> " của git status: lớp phòng thứ hai khi cờ --no-renames rơi mất.
  assert.deepEqual(
    parsePorcelain("R  pkg/bridge-core.js -> pkg/bridge-core.md\n M pkg/content.js\n?? pkg/moi.js\n"),
    ["pkg/bridge-core.js", "pkg/bridge-core.md", "pkg/content.js", "pkg/moi.js"],
    "dòng đổi tên phải cho ra CẢ HAI vế, nếu không vế .js cũ biến mất"
  );
  ok("ba lớp bảo vệ vòng 3 đều đã có test ghim (chuẩn tắc, junction, tách đổi tên)");
}

/* Markdown có dấu | trong lời khai không được phá bảng. */
{
  const model = collectModel(fakeRepo());
  model.rows[0].currentFocus = "A | B";
  assert.match(buildDashboard(model), /A \\\| B/);
  ok("ký tự gạch đứng trong ô được escape");
}

/* 16. --check PASS khi dashboard khớp, trả exit 0 và xác nhận bằng tiếng Việt. */
{
  const expected = buildDashboard(collectModel(fakeRepo()));
  const harness = checkHarness({ dashboard: expected });
  assert.equal(runDashboard({ check: true, deps: harness.deps, output: harness.output }), 0);
  assert.ok(harness.logs.some((message) => message.includes("đang khớp")));
  ok("--check trả exit 0 khi dashboard khớp");
}

/* 17. --check FAIL khi một ô lệch, nêu dòng lệch và lệnh sửa. */
{
  const expected = buildDashboard(collectModel(fakeRepo()));
  const stale = expected.replace("Kiểm tra dashboard", "Nội dung đã cũ");
  const harness = checkHarness({ dashboard: stale });
  assert.equal(runDashboard({ check: true, deps: harness.deps, output: harness.output }), 1);
  assert.ok(harness.errors.some((message) => /lệch tại dòng \d+/.test(message)), "phải nêu dòng lệch");
  assert.ok(harness.errors.some((message) => message.includes("node scripts/build-dashboard.mjs")), "phải nêu lệnh sửa");
  ok("--check trả exit khác 0, nêu dòng lệch và lệnh sửa khi một ô bị cũ");
}

/* 17b. Số dòng báo ra phải là SỐ DÒNG THẬT trong file Đức sẽ mở, không phải số thứ tự sau
   khi lọc. Dòng dấu commit bị lọc ra, nên đếm theo danh sách đã lọc thì mọi dòng phía sau
   bị lùi một — `--check` sẽ chỉ Đức tới đúng một dòng nằm cạnh dòng sai. Lời nhắn dẫn sai
   chỗ cũng là bug. Bắt được 2026-08-27 khi chạy `--check` thật trên repo: nó báo dòng 8,
   dòng thật là 9. Suite lúc đó 25/25 xanh — không ca nào ghim con số này. */
{
  const expected = buildDashboard(collectModel(fakeRepo()));
  const marker = "Kiểm tra dashboard";
  const stale = expected.replace(marker, "Nội dung đã cũ");

  // Số dòng thật, đếm trên chính chuỗi sẽ được ghi ra đĩa (dòng dấu commit VẪN nằm trong đó).
  const realLine = stale.split("\n").findIndex((line) => line.includes("Nội dung đã cũ")) + 1;
  assert.ok(realLine > 0, "fixture phải thật sự có dòng bị làm cũ");

  const harness = checkHarness({ dashboard: stale });
  runDashboard({ check: true, deps: harness.deps, output: harness.output });
  assert.ok(
    harness.errors.some((message) => message.includes(`lệch tại dòng ${realLine}.`)),
    `phải báo đúng dòng ${realLine} của file trên đĩa, không phải số thứ tự sau khi lọc`
  );
  // Chốt chặn: fixture phải thật sự có dòng dấu commit phía trên, nếu không ca này vô nghĩa
  // (không lọc gì thì hai cách đếm trùng nhau và mutation sẽ không đỏ).
  const stampLine = stale.split("\n").findIndex((line) => line.startsWith(STAMP_PREFIX)) + 1;
  assert.ok(stampLine > 0 && stampLine < realLine,
    "dòng dấu commit phải nằm TRƯỚC dòng lệch, nếu không ca này không chứng minh được gì");
  ok("--check báo đúng số dòng thật trong file, không phải số sau khi lọc dấu commit");
}

/* 18. Chỉ khác dòng dấu commit vẫn PASS; bộ lọc dùng chung mốc STAMP_PREFIX. */
{
  const expected = buildDashboard(collectModel(fakeRepo()));
  const differentStamp = expected.replace(
    new RegExp(`^${STAMP_PREFIX}.*$`, "m"),
    `${STAMP_PREFIX} \`fffffff\` (1999-01-01). Dấu commit khác hoàn toàn.`
  );
  const harness = checkHarness({ dashboard: differentStamp });
  assert.equal(runDashboard({ check: true, deps: harness.deps, output: harness.output }), 0);
  ok("--check bỏ qua đúng dòng dấu commit qua mốc STAMP_PREFIX");
}

/* 19. CRLF trên đĩa và LF sinh trong bộ nhớ là cùng nội dung. */
{
  const expected = buildDashboard(collectModel(fakeRepo()));
  const harness = checkHarness({ dashboard: expected.replaceAll("\n", "\r\n") });
  assert.equal(runDashboard({ check: true, deps: harness.deps, output: harness.output }), 0);
  ok("--check chuẩn hóa CRLF về LF trước khi so");
}

/* 20. --check tuyệt đối không ghi file ở cả PASS lẫn FAIL. */
{
  const expected = buildDashboard(collectModel(fakeRepo()));
  for (const dashboard of [expected, expected.replace("Kiểm tra dashboard", "Đã cũ")]) {
    const harness = checkHarness({ dashboard });
    runDashboard({ check: true, deps: harness.deps, output: harness.output });
    assert.deepEqual(harness.writes, [], "--check không được gọi writeFile ở bất kỳ kết cục nào");
  }
  ok("--check không ghi DASHBOARD.md ở cả kết cục PASS và FAIL");
}

/* 21. Thiếu DASHBOARD.md là lệch có hướng dẫn, không crash. */
{
  const harness = checkHarness({ exists: false });
  assert.equal(runDashboard({ check: true, deps: harness.deps, output: harness.output }), 1);
  assert.ok(harness.errors.some((message) => message.includes("đang thiếu")));
  assert.ok(harness.errors.some((message) => message.includes("node scripts/build-dashboard.mjs")));
  ok("--check coi DASHBOARD.md bị thiếu là lệch và không crash");
}

console.log(`\n${passed} passed, 0 failed, ${passed} total`);
