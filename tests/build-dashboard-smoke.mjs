import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, sep } from "node:path";

import { buildDashboard, buildLlmsTxt, buildRepoMap, collectModel, compareRepoMap, createDefaultDeps, createHeadDeps, DEFAULT_UNITS, detectStatusMachineOwnedFacts, parsePorcelain, parseStatus, priorityFrom, rankOf, readUnits, runDashboard, STAMP_PREFIX, validateStatus } from "../scripts/build-dashboard.mjs";

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
    schema: "extension-status/v2",
    id: "demo",
    name: "Bản demo",
    lifecycle: "active",
    owner: "phien-thu-nghiem",
    priority_rank: "1",
    next_step: "Việc kế tiếp của bản demo",
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
  // `dirty` = file ĐANG SỬA DỞ / CHƯA COMMIT. Trước đây nó chỉ được nhét vào
  // `git.dirtyFiles()`, mà `buildDashboard` không hề gọi hàm đó — nên phép kiểm 11
  // ("artifact chỉ chứa sự thật đã commit") so hai model y hệt nhau và luôn xanh,
  // kể cả khi bộ sinh thật sự đọc trạng thái chưa commit. Audit Codex 2026-09-02
  // phát hiện 2. Nay `dirty` hiện ra ĐÚNG như trên đĩa thật: có trong listDirs /
  // listFiles, KHÔNG có trong trackedPaths. Đó mới là kênh rò thật.
  const onDisk = new Set([...files.keys(), ...dirty]);
  const childrenOf = (relPath, source) => {
    const head = relPath ? `${relPath}/` : "";
    const dirs = new Set();
    const kids = [];
    for (const name of source) {
      if (!name.startsWith(head)) continue;
      const rest = name.slice(head.length);
      if (!rest) continue;
      const slash = rest.indexOf("/");
      if (slash < 0) kids.push(rest);
      else dirs.add(rest.slice(0, slash));
    }
    return { dirs: [...dirs], files: kids };
  };
  return {
    root: "C:/repo co khoang trang",
    // Thư mục CŨNG tồn tại, giống hệt git: `cat-file -t HEAD:<thư-mục>` trả "tree".
    // Fixture cũ chỉ biết tới file nên một phép kiểm "đường dẫn này có thật không"
    // đối với thư mục sẽ cho kết quả sai so với repo thật.
    fileExists: (relPath) => onDisk.has(relPath)
      || [...onDisk].some((name) => name.startsWith(`${relPath}/`))
      || relPath === "workers/demo/v1/tests" || relPath === "tests",
    isFile: (relPath) => onDisk.has(relPath),
    readFile: (relPath) => {
      if (!files.has(relPath)) throw new Error(`fixture thiếu ${relPath}`);
      return files.get(relPath);
    },
    listDirs: (relPath) => directories.get(relPath) ?? childrenOf(relPath, onDisk).dirs,
    listFiles: (relPath) => childrenOf(relPath, onDisk).files,
    git: {
      shortHead: () => "abc1234",
      headDate: () => "2026-08-26",
      verifyCommit: () => true,
      changedFilesSince: () => changedCommits,
      dirtyFiles: () => dirty,
      lastCommitDate: () => "2026-08-26",
      // Chỉ file ĐÃ COMMIT. `dirty` cố tình không có mặt ở đây.
      trackedPaths: () => [...files.keys()]
    }
  };
}

function checkHarness({ dashboard, exists = true } = {}) {
  const base = fakeRepo();
  const writes = [];
  const logs = [];
  const errors = [];
  // Từ S2, `--check` so CẢ BA file cổng. Harness phải phục vụ cả ba bản TƯƠI, nếu
  // không thì mọi phép kiểm cũ sẽ đỏ vì "thiếu llms.txt" chứ không vì cái nó định
  // kiểm — và ta sẽ đọc nhầm nguyên nhân.
  const model = collectModel(base);
  const served = {
    "DASHBOARD.md": dashboard,
    "llms.txt": buildLlmsTxt(model),
    "repo-map.json": buildRepoMap(model)
  };
  const deps = {
    ...base,
    fileExists: (relPath) => relPath === "DASHBOARD.md" ? exists : (relPath in served ? true : base.fileExists(relPath)),
    readFile: (relPath) => relPath in served ? served[relPath] : base.readFile(relPath),
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
  assert.ok(schemaErrors.some((message) => message.includes("extension-status/v2")));
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
  assert.match(harmlessOutput, /\| KHÔNG \| Kiểm tra dashboard \|/);

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

/* 11. Artifact chỉ chứa sự thật đã commit; dirty state chỉ được in ra stdout. */
{
  const clean = buildDashboard(collectModel(fakeRepo({ dirty: [] })));
  const dirtyRepo = fakeRepo({ dirty: ["workers/demo/v1/content.js", "workers/demo/v1/HANDOFF.md"] });
  const dirty = buildDashboard(collectModel(dirtyRepo));
  assert.equal(dirty, clean, "dirty working tree không được đổi artifact");
  // `claims` đã rời khỏi mẫu này ở S2, và đây là lý do — KHÔNG phải nới lỏng:
  // Khối D nay trỏ người đọc tới `.agents/claims.json` để biết thư mục nào chưa
  // khai chủ. Đó là một ĐƯỜNG DẪN đã commit, không phải trạng thái sửa dở. Lớp
  // bảo vệ thật của phép kiểm này là dòng `assert.equal(dirty, clean)` ngay trên,
  // và nó vẫn nguyên. Hai từ khoá còn lại vẫn chặn đúng thứ cần chặn: artifact
  // không được kể chuyện working tree.
  assert.doesNotMatch(dirty, /CHƯA commit|file đang sửa dở/);
  assert.match(dirty, /Code đã commit đổi sau kiểm chứng\? \[ĐO\]/);

  const logs = [];
  const writes = [];
  assert.equal(runDashboard({
    deps: { ...dirtyRepo, writeFile: (relPath, text) => writes.push({ relPath, text }) },
    output: { log: (message) => logs.push(message), error: () => {} }
  }), 0);
  assert.ok(logs.some((message) => message.includes("CẢNH BÁO:") && message.includes("1 file .js")));
  assert.ok(!writes[0].text.includes("CẢNH BÁO") && !writes[0].text.includes("CHƯA commit"));
  ok("dirty state chỉ in cảnh báo stdout, không đi vào artifact");
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

  assert.deepEqual(
    parsePorcelain("R  workers/demo/v1/bridge-core.js -> workers/demo/v1/bridge-core.md\n"),
    ["workers/demo/v1/bridge-core.js", "workers/demo/v1/bridge-core.md"]
  );
  ok("đổi tên .js sang .md đã commit bị đếm; parser dirty vẫn giữ cả hai vế cho cảnh báo");
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

/* 16. Mã việc KHÔNG được coi là số máy đo — ca báo oan có thật.
   2026-08-27: `current_focus` của STATUS Gemini đổi sang "G-01 lệnh dừng chưa ăn ngay", và
   detector chặn thẳng lần sinh dashboard vì mẫu Bridge khớp phải "01 lệnh" trong "G-01 lệnh".
   Mã việc nằm trong nhóm ĐƯỢC PHÉP. Sửa detector, không bẻ câu văn cho vừa detector — bẻ nội
   dung cho hợp một detector lỗi chính là cách biến luật thành hình thức. */
{
  const thatDay = "G-01 lệnh dừng chưa ăn ngay (chờ Đức chốt vì là luật an toàn); reload extension";
  assert.deepEqual(antiDrift(thatDay), [], "mã việc G-01 không được bị đọc thành số lệnh Bridge");
  assert.deepEqual(antiDrift("xem B-14 và G-08 file test đã ghim"), [],
    "mã việc B-xx / G-xx đứng cạnh danh từ machine-owned vẫn phải được tha");

  // Chiều ngược lại: bỏ dấu gạch nối đi thì đúng là số máy đo, phải bắt.
  assert.ok(antiDrift("Bridge (22 lệnh)").length > 0, "số thật cạnh danh từ machine-owned vẫn phải bị bắt");
  assert.ok(antiDrift("có 94 file test").length > 0, "số file test vẫn phải bị bắt");
  ok("mã việc B-xx/G-xx được tha, số máy đo vẫn bị bắt");
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

/* 22. claims.json là trạng thái sống: đổi claim không được đổi artifact. */
{
  const first = fakeRepo();
  const second = fakeRepo();
  second.readFile = (relPath) => relPath === ".agents/claims.json"
    ? JSON.stringify({ claims: { "workers/demo": { owner: "nguoi-khac" } } })
    : first.readFile(relPath);
  assert.equal(buildDashboard(collectModel(first)), buildDashboard(collectModel(second)));
  ok("đổi claims.json không làm dashboard thay đổi");
}

/* 23. Gate 7 integration: HEAD-only, read-only, không bị --quick bỏ, và bắt artifact stale. */
{
  const tempRoot = mkdtempSync(join(tmpdir(), "gate7-committed-truth-"));
  const gitAt = (...args) => execFileSync("git", ["-c", "core.quotepath=false", ...args], { cwd: tempRoot, encoding: "utf8" });
  const put = (relPath, text) => {
    const target = join(tempRoot, ...relPath.split("/"));
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, text, "utf8");
  };
  const runSession = () => spawnSync(process.execPath, [join(tempRoot, "scripts", "session-check.mjs"), "--as", "gate-owner", "--quick"], {
    cwd: tempRoot,
    encoding: "utf8"
  });
  const assertGateGreen = (run, label) => {
    // In cả stdout/stderr vào thông báo: một phép kiểm đỏ mà không nói vì sao thì lần sau ai
    // cũng phải đi dựng lại fixture bằng tay để xem. Đã mất thời gian đúng vì chuyện đó.
    const why = `\n--- stdout ---\n${run.stdout}\n--- stderr ---\n${run.stderr}`;
    assert.match(run.stdout, /\[XANH\] Sự thật máy sinh còn tươi/, `${label}: Gate 7 phải XANH${why}`);
    assert.doesNotMatch(run.stdout, /\[BỎ  \] Sự thật máy sinh còn tươi/, `${label}: --quick không được bỏ Gate 7`);
    assert.doesNotMatch(run.stderr, /CỔNG BỊ SỬA/, `${label}: số phép kiểm phải khớp EXPECTED_CHECKS`);
  };

  try {
    gitAt("init", "-b", "main");
    gitAt("config", "user.name", "Gate 7 Test");
    gitAt("config", "user.email", "gate7@example.invalid");
    mkdirSync(join(tempRoot, "scripts"), { recursive: true });
    // `repo-structure.mjs` PHẢI có mặt: từ K1 nó là nguồn sự thật chung về hình dạng repo,
    // và cả ba script kia đều import nó. Thiếu nó thì repo tạm chết ngay lúc nạp module.
    for (const name of ["repo-structure.mjs", "build-dashboard.mjs", "feature-parity.mjs", "session-check.mjs", "claim.mjs"]) {
      copyFileSync(new URL(`../scripts/${name}`, import.meta.url), join(tempRoot, "scripts", name));
    }
    put(".agents/claims.json", JSON.stringify({ claims: {
      _root: { owner: "gate-owner" },
      "workers/duc-auto-chatgpt": { owner: "gate-owner" },
      "workers/duc-auto-gemini": { owner: "foreign-owner" }
    } }, null, 2));
    put("manifest.json", JSON.stringify({ name: "Root", version: "0.0.1" }));
    for (const [dir, method] of [
      ["workers/duc-auto-chatgpt/v0.1.0", "gpt.method"],
      ["workers/duc-auto-gemini/v0.2.0", "gemini.method"]
    ]) {
      put(`${dir}/manifest.json`, JSON.stringify({ name: dir, version: "0.0.1" }));
      put(`${dir}/bridge-core.js`, `registryEntry({ name: "${method}" });\n`);
      put(`${dir}/HANDOFF.md`, "# Log\n");
    }
    put("FEATURE-PARITY.md", [
      "# Parity", "<!-- AUTO:BRIDGE START -->", "old", "<!-- AUTO:BRIDGE END -->",
      "Human section", "<!-- AUTO:MODULES START -->", "old", "<!-- AUTO:MODULES END -->",
      "<!-- AUTO:DEBT-METHODS START -->", "old", "<!-- AUTO:DEBT-METHODS END -->"
    ].join("\n"));
    put("DASHBOARD.md", "seed\n");
    gitAt("add", ".");
    gitAt("commit", "-m", "seed gate fixture");
    execFileSync(process.execPath, [join(tempRoot, "scripts", "build-dashboard.mjs")], { cwd: tempRoot, encoding: "utf8" });
    execFileSync(process.execPath, [join(tempRoot, "scripts", "feature-parity.mjs")], { cwd: tempRoot, encoding: "utf8" });
    gitAt("add", "DASHBOARD.md", "FEATURE-PARITY.md", "llms.txt", "repo-map.json");
    gitAt("commit", "-m", "commit generated truth");
    gitAt("update-ref", "refs/remotes/origin/main", "HEAD");

    const headDeps = createHeadDeps(tempRoot);
    assert.equal(headDeps.readFile("DASHBOARD.md"), gitAt("show", "HEAD:DASHBOARD.md"));

    // Foreign dirty file: Gate 7 sees only HEAD and stays green.
    put("workers/duc-auto-gemini/v0.2.0/foreign-dirty.js", "foreign\n");
    assertGateGreen(runSession(), "foreign dirty");

    // Own dirty code plus its required HANDOFF log: Gate 7 still sees only HEAD.
    put("workers/duc-auto-chatgpt/v0.1.0/own-dirty.js", "own\n");
    put("workers/duc-auto-chatgpt/v0.1.0/HANDOFF.md", "# Log\nown dirty fixture\n");
    const beforeHead = gitAt("rev-parse", "HEAD").trim();
    const beforeStatus = gitAt("status", "--porcelain");
    assertGateGreen(runSession(), "own dirty first run");
    assertGateGreen(runSession(), "own dirty second run");
    assert.equal(gitAt("rev-parse", "HEAD").trim(), beforeHead, "Gate 7 không được đổi HEAD");
    assert.equal(gitAt("status", "--porcelain"), beforeStatus, "Gate 7 không được đổi working tree");

    // Commit a stale artifact without regenerating: Gate 7 must turn red with repair command.
    rmSync(join(tempRoot, "workers", "duc-auto-gemini", "v0.2.0", "foreign-dirty.js"));
    rmSync(join(tempRoot, "workers", "duc-auto-chatgpt", "v0.1.0", "own-dirty.js"));
    gitAt("restore", "workers/duc-auto-chatgpt/v0.1.0/HANDOFF.md");
    put("DASHBOARD.md", `${readFileSync(join(tempRoot, "DASHBOARD.md"), "utf8")}\nSTALE COMMITTED LINE\n`);
    const parityBefore = readFileSync(join(tempRoot, "FEATURE-PARITY.md"), "utf8");
    assert.ok(parityBefore.includes("**GPT 1 · Gemini 1.**"), "fixture parity phải có dòng sắp làm cũ");
    put("FEATURE-PARITY.md", parityBefore.replace("**GPT 1 · Gemini 1.**", "**GPT 999 · Gemini 1.**"));
    gitAt("add", "DASHBOARD.md", "FEATURE-PARITY.md", "llms.txt", "repo-map.json");
    gitAt("commit", "-m", "make committed artifacts stale");
    const stale = runSession();
    // SỬA CÓ Ý THỨC, 03/09 (K2-8). Trước đây khối này ghim "artifact cũ ⇒ cổng lane ĐỎ". Nay
    // KHÔNG còn đỏ ở đây nữa, và đó là chủ ý chứ không phải nới tay: artifact đo việc của MỌI
    // lane, nên độ tươi là tính chất của thứ sắp publish, không phải của một phiên đang đóng —
    // một phiên 03/09 bị chặn ba lần, cả ba lần 100% dòng lệch đều thuộc gói của lane khác.
    // Chỗ chặn dời sang `safe-push`, và fixture 23i ghim vế đó. Đổi dòng này mà KHÔNG có 23i
    // thì đây đúng là gỡ bảo vệ — hai khối phải sống chết cùng nhau.
    assert.match(stale.stdout, /Sự thật máy sinh còn tươi/, "phép kiểm vẫn phải CÒN — dời chỗ, không phải xoá");
    assert.doesNotMatch(stale.stdout, /\[ĐỎ  \] Sự thật máy sinh còn tươi/,
      "K2-8: artifact cũ KHÔNG còn chặn cổng lane — chỗ chặn nằm ở safe-push (xem fixture 23i)");
    assert.match(stale.stdout, /build-dashboard\.mjs không khớp với HEAD/, "vẫn phải NÓI TO là nó cũ");
    assert.match(stale.stdout, /feature-parity\.mjs không khớp với HEAD/);
    assert.match(stale.stdout, /node scripts\/build-dashboard\.mjs && node scripts\/feature-parity\.mjs/);
    assert.match(stale.stdout, /safe-push SẼ TỪ CHỐI/, "phải chỉ rõ nó sẽ bị chặn ở đâu");
    ok("Gate 7 dùng HEAD, chỉ đọc, không bị --quick bỏ; artifact cũ nay CẢNH BÁO ở cổng lane (chặn ở push)");
  } finally {
    assert.ok(tempRoot.startsWith(join(tmpdir(), "gate7-committed-truth-")), "chỉ dọn đúng temp fixture Gate 7");
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

/* 23b. K2-2b · safe-push và cổng đóng phiên PHẢI quy cùng một file về CÙNG MỘT VÙNG.
   Ghim ở tầng HÀNH VI, chạy cả hai tiến trình thật. Vì sao không ghim bằng cách dò chuỗi nguồn:
   audit độc lập (Codex) chỉ ra đúng một đột biến thoát được phép dò — `import { areaOf as x }`
   rồi gọi `x()`; file không còn chuỗi `areaOf(` nên phép dò xanh trong khi lệch đã trở lại.
   Ca này là ca ĐÃ HỎNG THẬT ngày 02/09: A2 nối `stewardOf` cho cổng mà không nối cho safe-push,
   nên `docs/…` ra `_docs` ở cổng và `_root` ở safe-push — một phiên giữ `_docs` làm xong, cổng
   XANH, rồi bị chính safe-push từ chối đẩy việc của mình. */
{
  const tempRoot = mkdtempSync(join(tmpdir(), "k2-2b-one-door-"));
  const gitAt = (...args) => execFileSync("git", ["-c", "core.quotepath=false", ...args], { cwd: tempRoot, encoding: "utf8" });
  const put = (relPath, text) => {
    const target = join(tempRoot, ...relPath.split("/"));
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, text, "utf8");
  };
  try {
    gitAt("init", "-b", "main");
    gitAt("config", "user.name", "K2 One Door");
    gitAt("config", "user.email", "k2@example.invalid");
    mkdirSync(join(tempRoot, "scripts"), { recursive: true });
    for (const name of ["repo-structure.mjs", "safe-push.mjs", "session-check.mjs", "build-dashboard.mjs", "feature-parity.mjs", "claim.mjs"]) {
      copyFileSync(new URL(`../scripts/${name}`, import.meta.url), join(tempRoot, "scripts", name));
    }
    // `docs/` có steward RIÊNG. Đây là điều kiện của cả phép kiểm: nếu `docs/` vẫn về `_root`
    // thì không phân biệt được "quy đúng" với "quy về mặc định".
    put(".repo-structure.json", JSON.stringify({
      schema_version: 1,
      areas: {
        "docs/": { steward: "_docs", mutability: "rw", ownership_mode: "root" },
        "scripts/": { steward: "_root", mutability: "rw", ownership_mode: "root" },
        "workers/": { steward: null, mutability: "rw", ownership_mode: "per-package", claim_prefix: "workers/" }
      }
    }, null, 2));
    put(".agents/claims.json", JSON.stringify({ claims: {
      _root: { owner: "nguoi-khac" },
      _docs: { owner: "toi" }
    } }, null, 2));
    put("docs/mot-ghi-chu.md", "seed\n");
    gitAt("add", ".");
    gitAt("commit", "-m", "seed");
    gitAt("update-ref", "refs/remotes/origin/main", "HEAD");

    // Một commit CHỈ chạm `docs/` — vùng mà "toi" đang giữ đúng luật.
    put("docs/mot-ghi-chu.md", "seed\nthem mot dong\n");
    gitAt("add", "docs/mot-ghi-chu.md");
    // Nhãn `Lane:` bắt buộc từ K2-3c: safe-push nay TỪ CHỐI commit không quy thuộc được.
    // Vế mà khối này ghim vẫn nguyên — dòng `vùng:` phải nói `_docs`, không phải `_root`.
    gitAt("commit", "-m", "docs: viec cua toi\n\nLane: toi");

    const push = spawnSync(process.execPath, [join(tempRoot, "scripts", "safe-push.mjs"), "--as", "toi", "--dry-run"], {
      cwd: tempRoot, encoding: "utf8"
    });
    // ĐÂY là vế quan trọng: quy về `_docs`, KHÔNG phải `_root`.
    assert.match(push.stdout, /_docs \[toi\]/, "safe-push phải quy docs/ về _docs của chính tôi");
    assert.doesNotMatch(push.stdout, /_root/, "REGRESSION 02/09: docs/ KHÔNG được quy về _root");
    // Và vì nó là của tôi, safe-push KHÔNG được từ chối.
    assert.doesNotMatch(push.stdout + push.stderr, /TỪ CHỐI PUSH/, "việc của chính mình thì không được bị từ chối");
    assert.equal(push.status, 0, "--dry-run với commit của chính mình phải thoát 0");

    // CỔNG ĐÓNG PHIÊN PHẢI TRẢ LỜI Y HỆT — audit độc lập (Codex, vòng 2) chỉ ra rằng ghim hành
    // vi cho một mình safe-push là để cổng lại chỉ được canh bằng phép dò chuỗi nguồn, thứ đã
    // có đột biến thoát được. Hai tiến trình thật, cùng một repo, cùng một file → cùng một vùng.
    const gate = spawnSync(process.execPath, [join(tempRoot, "scripts", "session-check.mjs"), "--as", "toi", "--quick"], {
      cwd: tempRoot, encoding: "utf8"
    });
    assert.match(gate.stdout, /Bạn chịu trách nhiệm: [^\n]*_docs/,
      "cổng phải quy docs/ cho _docs của tôi — cùng đáp án với safe-push ở trên");
    assert.doesNotMatch(gate.stdout, /Bạn chịu trách nhiệm: [^\n]*_root/,
      "REGRESSION 02/09: cổng KHÔNG được quy docs/ về _root");
    assert.doesNotMatch(gate.stderr, /CỔNG BỊ SỬA/, "số phép kiểm phải khớp EXPECTED_CHECKS");

    // Vế NGƯỢC, để phép kiểm phân biệt được hai nhánh: chạm `scripts/` (steward `_root`, của
    // "nguoi-khac") thì PHẢI bị từ chối. Chỉ khẳng định vế trên thì một đột biến "không bao giờ
    // từ chối" sẽ thoát sạch.
    put("scripts/them.mjs", "export const x = 1;\n");
    gitAt("add", "scripts/them.mjs");
    gitAt("commit", "-m", "scripts: viec cua nguoi khac\n\nLane: nguoi-khac");
    const push2 = spawnSync(process.execPath, [join(tempRoot, "scripts", "safe-push.mjs"), "--as", "toi", "--dry-run"], {
      cwd: tempRoot, encoding: "utf8"
    });
    assert.match(push2.stdout + push2.stderr, /TỪ CHỐI PUSH/, "cuốn theo vùng của phiên khác thì phải từ chối");
    // Lời từ chối quy theo NHÃN (K2-3), nhưng bảng vẫn phải in đúng VÙNG mà commit chạm — đó
    // mới là vế mà khối này ghim: `scripts/` về `_root`, `docs/` về `_docs`, một cửa duy nhất.
    assert.match(push2.stdout + push2.stderr, /lane nguoi-khac \(của "nguoi-khac"\)/, "và phải nói rõ của lane nào");
    assert.match(push2.stdout, /_root \[nguoi-khac\]/, "REGRESSION 02/09: bảng phải quy scripts/ về _root, và nói rõ chủ");
    assert.notEqual(push2.status, 0, "từ chối thì không được thoát 0");
    ok("K2-2b · HÀNH VI: safe-push quy docs/ về _docs (không phải _root), và vẫn từ chối vùng người khác");
  } finally {
    assert.ok(tempRoot.startsWith(join(tmpdir(), "k2-2b-one-door-")), "chỉ dọn đúng temp fixture K2-2b");
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

/* 23k. K2-3b · HÀNH VI: commit thiếu nhãn `Lane:` thì cổng ĐỎ (bật chặn 03/09, Đức chốt).
   Trước đó phép kiểm #10 chỉ cảnh báo, và KHÔNG có test nào ghim chế độ đó — nên lật sang chặn
   không làm đỏ một test nào. Đó chính là cái bẫy đã bắt được hai lần trong phiên này: một chốt
   không ai ghim thì nó chỉ là bình luận. Khối này ghim cả hai chiều.
   Phạm vi CỐ Ý chỉ là `origin/main..HEAD` — không quét lịch sử (GPT đính chính đúng). */
{
  const tempRoot = mkdtempSync(join(tmpdir(), "k2-3b-bat-chan-"));
  const gitAt = (...args) => execFileSync("git", ["-c", "core.quotepath=false", ...args], { cwd: tempRoot, encoding: "utf8" });
  const put = (relPath, text) => {
    const target = join(tempRoot, ...relPath.split("/"));
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, text, "utf8");
  };
  const dongNhan = () => {
    const r = spawnSync(process.execPath, [join(tempRoot, "scripts", "session-check.mjs"), "--as", "toi", "--quick"], { cwd: tempRoot, encoding: "utf8" });
    const rows = r.stdout.split(String.fromCharCode(10));
    const i = rows.findIndex((l) => l.includes("Nhãn lane trong commit"));
    assert.ok(i >= 0, `cong PHAI con phep kiem "Nhan lane trong commit". stdout: ${r.stdout}`);
    const out = [rows[i]];
    for (let k = i + 1; k < rows.length && /^\s{5,}\S/.test(rows[k]); k += 1) out.push(rows[k]);
    return { dong: out.join(" "), status: r.status, stderr: r.stderr };
  };
  try {
    gitAt("init", "-b", "main");
    gitAt("config", "user.name", "K2 Bat Chan");
    gitAt("config", "user.email", "k2@example.invalid");
    mkdirSync(join(tempRoot, "scripts"), { recursive: true });
    for (const name of ["repo-structure.mjs", "session-check.mjs", "check-bootstrap.mjs", "claim.mjs", "build-dashboard.mjs", "feature-parity.mjs"]) {
      copyFileSync(new URL(`../scripts/${name}`, import.meta.url), join(tempRoot, "scripts", name));
    }
    put(".repo-structure.json", JSON.stringify({
      schema_version: 1, repo: { name: "R", tagline: "t" }, generators: [],
      units: { root_dir: "workers", marker: "manifest.json", depth: 2, ten: "E" },
      areas: { "scripts/": { steward: "_code", mutability: "rw", ownership_mode: "root" } }
    }, null, 2));
    put(".agents/claims.json", JSON.stringify({ claims: { _root: { owner: null }, _code: { owner: "toi" } } }, null, 2));
    put("manifest.json", JSON.stringify({ name: "R", version: "0.0.1" }));
    put("HANDOFF.md", "# Handoff\n");
    put("workers/goi/v0.1.0/manifest.json", JSON.stringify({ name: "G", version: "0.1.0" }));
    put("workers/goi/v0.1.0/HANDOFF.md", "# Log\n");
    gitAt("add", "."); gitAt("commit", "-m", "seed");
    gitAt("update-ref", "refs/remotes/origin/main", "HEAD");

    // Không có commit nào chưa push → không có gì để xét.
    assert.match(dongNhan().dong, /\[XANH\]/, "khong co commit chua push thi phai XANH");

    // CHIỀU ĐỎ: commit KHÔNG nhãn.
    put("scripts/x.mjs", "export const x = 1;\n");
    gitAt("add", "-A"); gitAt("commit", "-m", "khong co nhan lane");
    const thieu = dongNhan();
    assert.match(thieu.dong, /\[ĐỎ/, "K2-3b: commit thieu nhan `Lane:` thi cong PHAI DO — truoc 03/09 no chi canh bao");
    assert.match(thieu.dong, /LANE_THIEU_NHAN/, "phai co ma loi doc duoc");
    assert.match(thieu.dong, /git commit --amend/, "phai dua dung cach sua, khong bat nguoi doc di tim");
    assert.notEqual(thieu.status, 0, "do thi khong duoc thoat 0");

    // CHIỀU XANH: thêm nhãn thì thông. Thiếu vế này thì một đột biến "luôn đỏ" vẫn thoát.
    gitAt("commit", "--amend", "-m", "khong co nhan lane\n\nLane: toi");
    const co = dongNhan();
    assert.doesNotMatch(co.dong, /\[ĐỎ/, `them nhan roi thi khong duoc do nua: ${co.dong}`);

    // Nhãn HỎNG vẫn phải ĐỎ, và bằng một mã khác — bỏ nhãn không được thành đường thoát,
    // mà nhãn rác cũng không được thành đường thoát.
    put("scripts/y.mjs", "export const y = 1;\n");
    gitAt("add", "-A"); gitAt("commit", "-m", "nhan hong\n\nLane: co dau cach");
    const hong = dongNhan();
    assert.match(hong.dong, /\[ĐỎ/, "nhan hong thi PHAI do");
    assert.match(hong.dong, /LANE_KHONG_QUY_THUOC_DUOC/, "nhan hong va thieu nhan la HAI ma khac nhau");
    ok("K2-3b · HÀNH VI: thiếu nhãn `Lane:` thì ĐỎ kèm cách sửa; thêm nhãn thì thông; nhãn hỏng ĐỎ bằng mã riêng");
  } finally {
    assert.ok(tempRoot.startsWith(join(tmpdir(), "k2-3b-bat-chan-")), "chỉ dọn đúng temp fixture K2-3b");
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

/* 23l. K2-3c · HÀNH VI: `safe-push` cũng TỪ CHỐI commit không quy thuộc được.
   Bệnh (audit GPT vòng 5): phép kiểm #10 của cổng đóng phiên chặn commit thiếu nhãn `Lane:`,
   nhưng `safe-push` chỉ CẢNH BÁO rồi lùi về quy theo chủ vùng — tức gọi thẳng `safe-push` là
   né được K2-3b, và quay lại đúng lỗi 26/08: im lặng cuốn commit của phiên khác lên remote.
   Chính file `safe-push.mjs` tự ghi rằng cách quy theo vùng "sai được cả hai chiều", rồi vẫn
   dùng nó. Một chốt biết mình sai mà vẫn cho qua thì không phải chốt.

   BỐN vế. Vế `--carry` là vế chịu lực: `--carry` nghĩa là "Đức duyệt cho đẩy kèm việc của X",
   nên nó cần biết X là ai — commit không nhãn thì không có X, không có gì để duyệt. Nếu
   `--carry` mở được cửa này thì cả bản vá vô nghĩa. */
{
  const tempRoot = mkdtempSync(join(tmpdir(), "k2-3c-push-nhan-"));
  const gitAt = (...args) => execFileSync("git", ["-c", "core.quotepath=false", ...args], { cwd: tempRoot, encoding: "utf8" });
  const put = (relPath, text) => {
    const target = join(tempRoot, ...relPath.split("/"));
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, text, "utf8");
  };
  const push = (...extra) => spawnSync(process.execPath, [join(tempRoot, "scripts", "safe-push.mjs"), "--as", "toi", "--dry-run", ...extra], { cwd: tempRoot, encoding: "utf8" });
  try {
    gitAt("init", "-b", "main");
    gitAt("config", "user.name", "K2 Push Nhan");
    gitAt("config", "user.email", "k2@example.invalid");
    mkdirSync(join(tempRoot, "scripts"), { recursive: true });
    for (const name of ["repo-structure.mjs", "safe-push.mjs"]) {
      copyFileSync(new URL(`../scripts/${name}`, import.meta.url), join(tempRoot, "scripts", name));
    }
    put(".repo-structure.json", JSON.stringify({
      // KHÔNG khai `generators`: khối này thử cổng NHÃN, không thử cổng artifact. Khai `[]` là
      // khai HỎNG (fixture 23i vế E ghim đúng chuyện đó) nên nó sẽ chặn vì lý do khác.
      schema_version: 1, repo: { name: "R", tagline: "t" },
      units: { root_dir: "workers", marker: "manifest.json", depth: 2, ten: "E" },
      areas: { "scripts/": { steward: "_code", mutability: "rw", ownership_mode: "root" } }
    }, null, 2));
    put(".agents/claims.json", JSON.stringify({ claims: { _root: { owner: "toi" }, _code: { owner: "toi" } } }, null, 2));
    put("manifest.json", JSON.stringify({ name: "R", version: "0.0.1" }));
    put("HANDOFF.md", "# Handoff\n");
    gitAt("add", "."); gitAt("commit", "-m", "seed");
    gitAt("update-ref", "refs/remotes/origin/main", "HEAD");

    // VẾ 1 — THIẾU nhãn: phải TỪ CHỐI. Trước vá thì đây chỉ là một dòng cảnh báo rồi push.
    put("scripts/x.mjs", "export const x = 1;\n");
    gitAt("add", "-A"); gitAt("commit", "-m", "khong co nhan lane");
    const thieu = push();
    assert.match(thieu.stderr, /không quy thuộc được về lane nào/,
      "K2-3c: safe-push PHAI tu choi commit thieu nhan — khong thi no ne duoc phep kiem #10");
    assert.match(thieu.stderr, /git commit --amend/, "phai dua dung cach sua");
    assert.notEqual(thieu.status, 0, "tu choi thi khong duoc thoat 0");
    assert.doesNotMatch(thieu.stdout, /tạm quy theo VÙNG/, "duong lui quy-theo-vung phai BI BO, khong phai bi an di");

    // VẾ 2 — thêm nhãn thì thông. Thiếu vế này thì một đột biến "luôn từ chối" vẫn thoát.
    gitAt("commit", "--amend", "-m", "khong co nhan lane\n\nLane: toi");
    assert.equal(push().status, 0, "them nhan dung lane cua minh thi phai thong");

    // VẾ 3 — nhãn HỎNG cũng phải từ chối, và bằng cùng cổng đó.
    put("scripts/y.mjs", "export const y = 1;\n");
    gitAt("add", "-A"); gitAt("commit", "-m", "nhan hong\n\nLane: co dau cach");
    const hong = push();
    assert.match(hong.stderr, /không quy thuộc được về lane nào/, "nhan hong cung khong quy thuoc duoc");
    assert.match(hong.stderr, /nhãn HỎNG/, "phai noi ro la hong, khong phai thieu — hai benh khac nhau");
    assert.notEqual(hong.status, 0, "tu choi thi khong duoc thoat 0");

    // VẾ 4 — VẾ CHỊU LỰC: `--carry` KHÔNG mở được cửa này.
    assert.notEqual(push("--carry").status, 0,
      "--carry duyet 'day kem viec cua X'; commit khong nhan thi khong co X, nen no KHONG duoc mo cua nay");
    assert.match(push("--carry").stderr, /không quy thuộc được về lane nào/, "va phai tu choi vi dung ly do");

    // Đối chứng: nhãn của LANE KHÁC thì vẫn là cổng CŨ (cuốn theo việc người khác), không phải
    // cổng mới. Hai cổng khác nhau, hai thông báo khác nhau — gộp là mất một chẩn đoán.
    gitAt("commit", "--amend", "-m", "nhan hong\n\nLane: lane-khac");
    const laKhac = push();
    assert.match(laKhac.stderr, /cuốn theo việc của phiên khác/, "nhan cua lane khac thi la cong CU, khong phai cong moi");
    assert.notEqual(laKhac.status, 0, "van phai tu choi");
    ok("K2-3c · HÀNH VI: safe-push từ chối commit thiếu/hỏng nhãn `Lane:`, `--carry` không mở được, nhãn đúng thì thông");
  } finally {
    assert.ok(tempRoot.startsWith(join(tmpdir(), "k2-3c-push-nhan-")), "chỉ dọn đúng temp fixture K2-3c");
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

/* 23m. K2-9c · HÀNH VI: suite của PACKAGE cũng đi qua cùng phán quyết.
   Bệnh (audit GPT vòng 5): K2-9 v2 chỉ bọc suite GỐC REPO. Suite của package vẫn chạy thẳng
   trên cây làm việc dùng chung và đỏ là chặn ngay — nên một lane chỉ giữ package vẫn bị file
   sửa dở của lane khác chặn oan, đúng bệnh mà K2-9 sinh ra để chữa.

   Fixture cố ý KHÔNG cho lane này giữ khoá gốc nào, để suite gốc không chạy và chỉ còn đường
   package chịu lực. Hai vế: chặn oan phải hết, và tự miễn cho mình vẫn phải chặn. */
{
  const tempRoot = mkdtempSync(join(tmpdir(), "k2-9c-suite-goi-"));
  const gitAt = (...args) => execFileSync("git", ["-c", "core.quotepath=false", ...args], { cwd: tempRoot, encoding: "utf8" });
  const put = (relPath, text) => {
    const target = join(tempRoot, ...relPath.split("/"));
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, text, "utf8");
  };
  const gate = () => spawnSync(process.execPath, [join(tempRoot, "scripts", "session-check.mjs"), "--as", "toi"], { cwd: tempRoot, encoding: "utf8" });
  const dongTest = (r) => {
    const rows = r.stdout.split(String.fromCharCode(10));
    const i = rows.findIndex((l) => l.includes("Test xanh"));
    if (i < 0) return "";
    const out = [rows[i]];
    for (let k = i + 1; k < rows.length && /^\s{5,}\S/.test(rows[k]); k += 1) out.push(rows[k]);
    return out.join(" ");
  };
  // Suite của TÔI, nhưng nó ĐỌC một file trong gói của lane khác — tức nó nhiễm được từ cây
  // làm việc dùng chung. Đây là hình dạng thật: suite gói nào cũng đọc file ngoài gói nó.
  const suiteDocFileHo = [
    'import fs from "node:fs";',
    'const t = fs.readFileSync("workers/goi-cua-ho/v0.1.0/data.txt", "utf8").trim();',
    'if (t !== "ok") { console.log("0 passed, 1 failed"); process.exit(1); }',
    'console.log("1 passed, 0 failed");',
    ""
  ].join("\n");
  try {
    gitAt("init", "-b", "main");
    gitAt("config", "user.name", "K2 Suite Goi");
    gitAt("config", "user.email", "k2@example.invalid");
    mkdirSync(join(tempRoot, "scripts"), { recursive: true });
    for (const name of ["repo-structure.mjs", "session-check.mjs", "check-bootstrap.mjs", "claim.mjs", "build-dashboard.mjs", "feature-parity.mjs"]) {
      copyFileSync(new URL(`../scripts/${name}`, import.meta.url), join(tempRoot, "scripts", name));
    }
    put(".repo-structure.json", JSON.stringify({
      schema_version: 1, repo: { name: "R", tagline: "t" }, generators: [],
      units: { root_dir: "workers", marker: "manifest.json", depth: 2, ten: "E" },
      areas: {
        "scripts/": { steward: "_code", mutability: "rw", ownership_mode: "root" },
        "workers/": { steward: null, mutability: "rw", ownership_mode: "per-package", claim_prefix: "workers/" }
      }
    }, null, 2));
    // CỐ Ý: `_root` và `_code` KHÔNG phải của tôi → `myRootAreas` rỗng → suite gốc không chạy.
    put(".agents/claims.json", JSON.stringify({ claims: {
      _root: { owner: "lane-khac" },
      _code: { owner: "lane-khac" },
      "workers/goi-cua-toi": { owner: "toi" },
      "workers/goi-cua-ho": { owner: "lane-khac" }
    } }, null, 2));
    put("manifest.json", JSON.stringify({ name: "R", version: "0.0.1" }));
    put("HANDOFF.md", "# Handoff\n");
    put("workers/goi-cua-ho/v0.1.0/manifest.json", JSON.stringify({ name: "Ho", version: "0.1.0" }));
    put("workers/goi-cua-ho/v0.1.0/HANDOFF.md", "# Log\n");
    put("workers/goi-cua-ho/v0.1.0/data.txt", "ok\n");
    put("workers/goi-cua-toi/v0.1.0/manifest.json", JSON.stringify({ name: "Toi", version: "0.1.0" }));
    put("workers/goi-cua-toi/v0.1.0/HANDOFF.md", "# Log\n");
    put("workers/goi-cua-toi/v0.1.0/tests/run-all.mjs", suiteDocFileHo);
    gitAt("add", "."); gitAt("commit", "-m", "seed");
    gitAt("update-ref", "refs/remotes/origin/main", "HEAD");

    // Tôi có việc thật trong gói của tôi, đã commit và có nhãn.
    put("workers/goi-cua-toi/v0.1.0/HANDOFF.md", "# Log\n\n- viec cua toi\n");
    gitAt("add", "-A"); gitAt("commit", "-m", "viec cua toi\n\nLane: toi");
    assert.match(dongTest(gate()), /\[XANH\]/, "dung fixture: sach thi suite goi phai xanh");

    // VẾ 1 — lane khác sửa dở file trong gói CỦA HỌ, làm suite CỦA TÔI đỏ. HEAD xanh, vùng tôi
    // sạch → KHÔNG được chặn tôi. Trước vá thì đường package `return ok:false` ngay tại đây.
    put("workers/goi-cua-ho/v0.1.0/data.txt", "dang sua do\n");
    const r1 = gate();
    const d1 = dongTest(r1);
    assert.doesNotMatch(d1, /\[ĐỎ/, `K2-9c: suite PACKAGE do vi file sua do cua lane khac thi KHONG duoc chan toi: ${d1}`);
    assert.doesNotMatch(d1, /\[XANH\]/, "cung KHONG duoc in XANH — cay lam viec dang hong that");
    assert.match(r1.stdout, /Thứ ĐÃ COMMIT xanh/, "phai noi ca hai su that");

    // VẾ 2 — VẾ CHỊU LỰC: tôi cũng đang sửa dở trong gói CỦA TÔI. HEAD vẫn xanh, nhưng lấy
    // "HEAD xanh" ra miễn là tự miễn cho lỗi của mình. PHẢI ĐỎ.
    put("workers/goi-cua-toi/v0.1.0/HANDOFF.md", "# Log\n\n- viec cua toi\n- con dang go\n");
    const r2 = gate();
    assert.match(dongTest(r2), /\[ĐỎ/, "own-dirty + HEAD xanh: PHAI DO o duong package nua, khong chi suite goc");
    assert.match(r2.stdout, /TOI_CON_SUA_DO/, "phai noi dung ly do");
    assert.notEqual(r2.status, 0, "do thi khong duoc thoat 0");
    ok("K2-9c · HÀNH VI: suite của package cũng qua `quyTrachNhiemSuite` — chặn oan hết, tự miễn vẫn chặn");
  } finally {
    assert.ok(tempRoot.startsWith(join(tmpdir(), "k2-9c-suite-goi-")), "chỉ dọn đúng temp fixture K2-9c");
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

/* 23n. K2-10 · HÀNH VI: đọc git thất bại thì cổng ĐỎ, không im lặng thành "sạch".
   Bệnh (audit GPT vòng 5): hàm đọc git `catch { return ""; }` — nuốt mọi lỗi. Đường đi:
   `git status --porcelain` hỏng → `workingChanges` rỗng → guard own-dirty của K2-9 thấy vùng
   tôi "sạch" → chạy lại trên HEAD → HEAD xanh → `[BỎ]`. Cổng vừa miễn cho regression của
   chính lane, bằng đúng cái guard sinh ra để chặn nó. Fail-open NGAY TRONG K2-9.

   Cách dựng: `GIT_DIR` trỏ vào một chỗ không tồn tại. Mọi lệnh git hỏng, và cổng vẫn chạy —
   đúng hình dạng nguy hiểm, vì trước vá nó chạy xong rồi báo XANH. */
{
  const tempRoot = mkdtempSync(join(tmpdir(), "k2-10-git-loi-"));
  const gitAt = (...args) => execFileSync("git", ["-c", "core.quotepath=false", ...args], { cwd: tempRoot, encoding: "utf8" });
  const put = (relPath, text) => {
    const target = join(tempRoot, ...relPath.split("/"));
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, text, "utf8");
  };
  const gate = (env) => spawnSync(process.execPath, [join(tempRoot, "scripts", "session-check.mjs"), "--as", "toi", "--quick"], { cwd: tempRoot, encoding: "utf8", env: { ...process.env, ...env } });
  const dongGit = (r) => {
    const rows = r.stdout.split(String.fromCharCode(10));
    const i = rows.findIndex((l) => l.includes("Đọc git không lỗi"));
    if (i < 0) return "";
    const out = [rows[i]];
    for (let k = i + 1; k < rows.length && /^\s{5,}\S/.test(rows[k]); k += 1) out.push(rows[k]);
    return out.join(" ");
  };
  try {
    gitAt("init", "-b", "main");
    gitAt("config", "user.name", "K2 Git Loi");
    gitAt("config", "user.email", "k2@example.invalid");
    mkdirSync(join(tempRoot, "scripts"), { recursive: true });
    for (const name of ["repo-structure.mjs", "session-check.mjs", "check-bootstrap.mjs", "claim.mjs", "build-dashboard.mjs", "feature-parity.mjs"]) {
      copyFileSync(new URL(`../scripts/${name}`, import.meta.url), join(tempRoot, "scripts", name));
    }
    put(".repo-structure.json", JSON.stringify({
      schema_version: 1, repo: { name: "R", tagline: "t" }, generators: [],
      units: { root_dir: "workers", marker: "manifest.json", depth: 2, ten: "E" },
      areas: { "scripts/": { steward: "_code", mutability: "rw", ownership_mode: "root" } }
    }, null, 2));
    put(".agents/claims.json", JSON.stringify({ claims: { _root: { owner: "toi" }, _code: { owner: "toi" } } }, null, 2));
    put("manifest.json", JSON.stringify({ name: "R", version: "0.0.1" }));
    put("HANDOFF.md", "# Handoff\n");
    gitAt("add", "."); gitAt("commit", "-m", "seed");
    gitAt("update-ref", "refs/remotes/origin/main", "HEAD");

    // ĐỐI CHỨNG trước: git đọc được thì phép kiểm này phải XANH và không nói gì thêm.
    const lanh = gate({});
    assert.doesNotMatch(dongGit(lanh), /\[ĐỎ/, `git doc duoc thi phep kiem nay phai XANH: ${dongGit(lanh)}`);
    assert.match(dongGit(lanh), /Mọi lệnh git đọc được/, "phai co phep kiem #12 trong cong");

    // VẾ CHỊU LỰC: git đọc KHÔNG được. Trước vá, cổng suy trên dữ liệu rỗng rồi báo XANH.
    const loi = gate({ GIT_DIR: join(tempRoot, "khong-he-co", ".git") });
    assert.match(dongGit(loi), /\[ĐỎ/, "K2-10: doc git that bai thi cong PHAI DO — im lang bien thanh 'sach' la fail-open");
    assert.match(dongGit(loi), /GIT_DOC_LOI/, "phai co ma loi doc duoc");
    assert.notEqual(loi.status, 0, "do thi khong duoc thoat 0");
    assert.doesNotMatch(loi.stdout, /XANH TOÀN BỘ/, "khong bao gio duoc bao 'xanh toan bo' khi khong doc duoc dau vao");
    ok("K2-10 · HÀNH VI: mọi lỗi đọc git thành ĐỎ; git lành thì XANH (đối chứng)");
  } finally {
    assert.ok(tempRoot.startsWith(join(tmpdir(), "k2-10-git-loi-")), "chỉ dọn đúng temp fixture K2-10");
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

/* 23o. K2-9d · HÀNH VI: ảnh chụp HEAD phải BIẾT GIT, và phải đúng CẢ HAI mốc.
   Bệnh (audit GPT vòng 6): `git archive` không mang `.git`, nên suite nào gọi git sẽ chết vì
   `not a git repository` — và cái chết đó bị đọc thành `REGRESSION_DA_COMMIT`, tức quy oan cho
   lane đang đóng phiên. Đúng bệnh K2-9 sinh ra để chữa.

   Và bản sửa ĐẦU của tôi (`git clone` trần) CHƯA ĐỦ, chỗ thiếu thì im lặng: clone lấy
   `origin/main` từ nhánh local của repo gốc, tức baseline bằng HEAD chứ không bằng mốc thật.
   Suite vẫn chạy, vẫn xanh, chỉ so với mốc sai — không test nào đỏ.

   NĂM CA, và ca 3 là ca mà bản sửa đầu của tôi trượt. Suite của fixture tự khai HEAD và
   baseline nó NHÌN THẤY ra một file bằng chứng, nên hai mốc được ghim bằng số chứ không bằng
   "suite xanh nên chắc là đúng". */
{
  const tempRoot = mkdtempSync(join(tmpdir(), "k2-9d-anh-chup-"));
  const gitAt = (...args) => execFileSync("git", ["-c", "core.quotepath=false", ...args], { cwd: tempRoot, encoding: "utf8" });
  const put = (relPath, text) => {
    const target = join(tempRoot, ...relPath.split("/"));
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, text, "utf8");
  };
  const bangChung = join(tempRoot, "bang-chung.txt");
  const gate = () => spawnSync(process.execPath, [join(tempRoot, "scripts", "session-check.mjs"), "--as", "toi"], {
    cwd: tempRoot, encoding: "utf8", env: { ...process.env, BANG_CHUNG: bangChung }
  });
  const dongTest = (r) => {
    const rows = r.stdout.split(String.fromCharCode(10));
    const i = rows.findIndex((l) => l.includes("Test xanh"));
    if (i < 0) return "";
    const out = [rows[i]];
    for (let k = i + 1; k < rows.length && /^\s{5,}\S/.test(rows[k]); k += 1) out.push(rows[k]);
    return out.join(" ");
  };
  // Suite CẦN GIT — hình dạng thật của `feature-parity-smoke`, nó chạy `git show HEAD:...`.
  // Nó khai ra file bằng chứng cả HAI mốc nó nhìn thấy, để test ghim được từng mốc.
  const suiteGoiGit = [
    'import { execFileSync } from "node:child_process";',
    'import fs from "node:fs";',
    'const g = (...a) => execFileSync("git", a, { encoding: "utf8" }).trim();',
    // ĐỌC FILE TRÊN ĐĨA, không đọc `git show HEAD:` — bản đầu của tôi đọc từ HEAD nên nó
    // MIỄN NHIỄM với cây làm việc, và fixture xanh một cách vô nghĩa (suite không hề đỏ).
    // Đúng hình dạng thật: suite đọc file, VÀ gọi git cho việc khác.
    'const marker = fs.readFileSync("marker.txt", "utf8").trim();',
    // GỌI GIT KHÔNG BỌC try — đây là thứ khiến suite CHẾT trong bản `git archive`, y như
    // `feature-parity-smoke` chạy `git show HEAD:FEATURE-PARITY.md`. Bọc nó lại là mất luôn ca 1.
    'const headMarker = g("show", "HEAD:marker.txt");',
    'let base = "KHONG_CO";',
    'try { base = g("rev-parse", "origin/main"); } catch {}',
    'if (process.env.BANG_CHUNG) fs.appendFileSync(process.env.BANG_CHUNG, `MARKER=${marker} HEAD_MARKER=${headMarker} BASE=${base}` + String.fromCharCode(10));',
    'if (marker !== "ok") { console.log("0 passed, 1 failed, 1 total"); process.exit(1); }',
    'console.log("1 passed, 0 failed, 1 total");',
    ""
  ].join("\n");
  try {
    gitAt("init", "-b", "main");
    gitAt("config", "user.name", "K2 Anh Chup");
    gitAt("config", "user.email", "k2@example.invalid");
    mkdirSync(join(tempRoot, "scripts"), { recursive: true });
    for (const name of ["repo-structure.mjs", "session-check.mjs", "check-bootstrap.mjs", "claim.mjs", "build-dashboard.mjs", "feature-parity.mjs"]) {
      copyFileSync(new URL(`../scripts/${name}`, import.meta.url), join(tempRoot, "scripts", name));
    }
    put(".repo-structure.json", JSON.stringify({
      schema_version: 1, repo: { name: "R", tagline: "t" },
      units: { root_dir: "workers", marker: "manifest.json", depth: 2, ten: "E" },
      areas: {
        "scripts/": { steward: "_code", mutability: "rw", ownership_mode: "root" },
        "tests/": { steward: "_code", mutability: "rw", ownership_mode: "root" }
      }
    }, null, 2));
    // `marker.txt` ở tầng ngoài cùng → thuộc `_root`, mà `_root` là của LANE KHÁC.
    // Nhờ vậy file sửa dở của nó KHÔNG tính là bẩn-trong-vùng-của-tôi.
    put(".agents/claims.json", JSON.stringify({ claims: {
      _root: { owner: "lane-khac" },
      _code: { owner: "toi" }
    } }, null, 2));
    put("manifest.json", JSON.stringify({ name: "R", version: "0.0.1" }));
    put("HANDOFF.md", "# Handoff\n");
    put("marker.txt", "ok\n");
    put("tests/git-suite.mjs", suiteGoiGit);
    put("package.json", JSON.stringify({
      name: "r", private: true, type: "module", scripts: { test: "node tests/git-suite.mjs" }
    }, null, 2));
    gitAt("add", "."); gitAt("commit", "-m", "seed");
    gitAt("update-ref", "refs/remotes/origin/main", "HEAD");
    const shaBaseline = gitAt("rev-parse", "HEAD").trim();

    // Việc của TÔI, đã commit, trong vùng tôi giữ.
    put("scripts/viec-cua-toi.mjs", "export const x = 1;\n");
    gitAt("add", "-A"); gitAt("commit", "-m", "viec cua toi\n\nLane: toi");
    const shaHead = gitAt("rev-parse", "HEAD").trim();
    assert.notEqual(shaBaseline, shaHead, "dung fixture: HEAD phai khac baseline, khong thi ca 3 vo nghia");

    // LANE KHÁC sửa dở `marker.txt` → suite đỏ trên cây làm việc, nhưng HEAD thì lành.
    put("marker.txt", "hong\n");
    writeFileSync(bangChung, "", "utf8");
    const r = gate();

    // CA 1 — suite GỌI GIT phải sống được trong ảnh chụp, nên đỏ này được nhận ra là nhiễm
    // từ cây làm việc. Trước bản vá: ảnh chụp không có `.git` → suite chết → quy oan REGRESSION.
    const d = dongTest(r);
    assert.doesNotMatch(d, /\[ĐỎ/, `CA1: suite goi git phai chay duoc trong anh chup, khong duoc quy oan REGRESSION. Khoi: ${d}`);
    assert.doesNotMatch(r.stdout, /REGRESSION_DA_COMMIT/, "CA1: khong duoc ket luan regression — HEAD hoan toan lanh");
    assert.match(r.stdout, /Thứ ĐÃ COMMIT xanh/, "CA1: phai noi ro da commit thi lanh, cay lam viec thi hong");

    const dong = readFileSync(bangChung, "utf8").split(String.fromCharCode(10)).filter(Boolean);
    assert.ok(dong.length >= 2, `dung fixture: phai co 2 luot chay (cay lam viec, roi anh chup). Nhan: ${JSON.stringify(dong)}`);
    const [cayLamViec, anhChup] = [dong[0], dong[dong.length - 1]];
    assert.match(cayLamViec, /MARKER=hong/, "dung fixture: luot dau phai chay tren CAY LAM VIEC");

    // CA 2 — HEAD trong ảnh chụp phải là commit ĐANG XÉT, không phải cây làm việc.
    assert.match(anhChup, /MARKER=ok/, `CA2: HEAD trong anh chup phai la thu DA COMMIT. Nhan: ${anhChup}`);

    // CA 3 — CA MÀ BẢN SỬA ĐẦU CỦA TÔI TRƯỢT: baseline phải là `origin/main` THẬT, không phải
    // HEAD. `git clone` trần đặt origin/main = nhánh local = HEAD, và không test nào đỏ vì suite
    // vẫn chạy ngon — chỉ so với mốc sai.
    assert.match(anhChup, new RegExp(`BASE=${shaBaseline}`),
      `CA3: baseline trong anh chup phai la origin/main THAT (${shaBaseline.slice(0, 7)}), khong phai HEAD (${shaHead.slice(0, 7)}). Nhan: ${anhChup}`);
    assert.doesNotMatch(anhChup, new RegExp(`BASE=${shaHead}`), "CA3: baseline BANG HEAD la dung benh cua clone tran");

    // CA 4 — repo gốc KHÔNG được bị ghi gì. Đây là điều kiện K2-9 đặt ra khi cố ý tránh
    // `git worktree add`; bản thay thế không được mang bệnh đó về.
    // Chỉ xét file ĐƯỢC THEO DÕI mà bị sửa: file rác của chính fixture (bằng chứng) là untracked,
    // không liên quan. Vế cần ghim là ảnh chụp không ĐỘNG vào thứ repo gốc đang theo dõi.
    const suaTrongRepoGoc = gitAt("status", "--porcelain").trim().split(String.fromCharCode(10))
      .filter((l) => /^\s*M/.test(l)).map((l) => l.trim().replace(/^M\s+/, ""));
    assert.deepEqual(suaTrongRepoGoc, ["marker.txt"],
      `CA4: repo goc chi duoc co dung file lane khac sua do. Nhan: ${JSON.stringify(suaTrongRepoGoc)}`);
    assert.equal(gitAt("worktree", "list").trim().split(String.fromCharCode(10)).length, 1,
      "CA4: khong duoc sinh worktree nao o repo goc — do la ly do K2-9 tranh `git worktree add`");
    ok("K2-9d · CA 1–4: suite gọi git sống trong ảnh chụp · HEAD đúng commit · baseline đúng origin/main thật · repo gốc không bị ghi gì");
  } finally {
    assert.ok(tempRoot.startsWith(join(tmpdir(), "k2-9d-anh-chup-")), "chỉ dọn đúng temp fixture K2-9d");
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

/* 23p. K2-9d CA 5 · repo CHƯA CÓ `origin/main` vẫn phải chụp được.
   Không có baseline để viền, và đó là trạng thái HỢP LỆ của một repo vừa dựng từ bộ khung.
   Nếu bước viền baseline mà bắt buộc thì cổng sập ở đúng repo đầu tiên — kiểu chặn oan mà cả
   K2 sinh ra để xoá. Ghim riêng vì nó là nhánh `if (baseline)`, và nhánh không ai ghim thì
   sớm muộn có người "dọn cho gọn". */
{
  const tempRoot = mkdtempSync(join(tmpdir(), "k2-9d-chua-co-remote-"));
  const gitAt = (...args) => execFileSync("git", ["-c", "core.quotepath=false", ...args], { cwd: tempRoot, encoding: "utf8" });
  const put = (relPath, text) => {
    const target = join(tempRoot, ...relPath.split("/"));
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, text, "utf8");
  };
  try {
    gitAt("init", "-b", "main");
    gitAt("config", "user.name", "K2 Chua Co Remote");
    gitAt("config", "user.email", "k2@example.invalid");
    mkdirSync(join(tempRoot, "scripts"), { recursive: true });
    for (const name of ["repo-structure.mjs", "session-check.mjs", "check-bootstrap.mjs", "claim.mjs", "build-dashboard.mjs", "feature-parity.mjs"]) {
      copyFileSync(new URL(`../scripts/${name}`, import.meta.url), join(tempRoot, "scripts", name));
    }
    put(".repo-structure.json", JSON.stringify({
      schema_version: 1, repo: { name: "R", tagline: "t" },
      units: { root_dir: "workers", marker: "manifest.json", depth: 2, ten: "E" },
      areas: { "scripts/": { steward: "_code", mutability: "rw", ownership_mode: "root" } }
    }, null, 2));
    put(".agents/claims.json", JSON.stringify({ claims: { _root: { owner: "lane-khac" }, _code: { owner: "toi" } } }, null, 2));
    put("manifest.json", JSON.stringify({ name: "R", version: "0.0.1" }));
    put("HANDOFF.md", "# Handoff\n");
    put("marker.txt", "ok\n");
    // Suite phải ĐỎ ĐƯỢC và phải CẦN GIT — nếu không thì `chayLaiTrenHead` chẳng bao giờ chạy
    // ở repo này, và nhánh "không có baseline" không hề được ghim. Bản đầu của tôi để suite
    // luôn xanh, tức ca 5 chỉ chứng minh cổng không sập chứ không chứng minh ảnh chụp dựng được.
    put("tests/mot-suite.mjs", [
      'import { execFileSync } from "node:child_process";',
      'import fs from "node:fs";',
      'execFileSync("git", ["show", "HEAD:marker.txt"], { encoding: "utf8" });',
      'if (fs.readFileSync("marker.txt", "utf8").trim() !== "ok") { console.log("0 passed, 1 failed, 1 total"); process.exit(1); }',
      'console.log("1 passed, 0 failed, 1 total");',
      ""
    ].join("\n"));
    put("package.json", JSON.stringify({
      name: "r", private: true, type: "module", scripts: { test: "node tests/mot-suite.mjs" }
    }, null, 2));
    gitAt("add", "."); gitAt("commit", "-m", "seed");
    // CỐ Ý không tạo `refs/remotes/origin/main`.
    // Việc của tôi phải ĐÃ COMMIT: còn sửa dở trong vùng mình thì `TOI_CON_SUA_DO` chặn trước,
    // và ca 5 không bao giờ chạm tới bước dựng ảnh chụp. Bản đầu của tôi vướng đúng chỗ này.
    put("scripts/x.mjs", "export const x = 1;\n");
    gitAt("add", "-A"); gitAt("commit", "-m", "viec cua toi\n\nLane: toi");
    put("marker.txt", "hong\n");   // lane khác sửa dở → suite đỏ ở cây làm việc, HEAD thì lành

    const r = spawnSync(process.execPath, [join(tempRoot, "scripts", "session-check.mjs"), "--as", "toi"], { cwd: tempRoot, encoding: "utf8" });
    assert.doesNotMatch(r.stdout + r.stderr, /Phép kiểm lỗi/, `CA5: cong khong duoc nem o repo chua co origin/main: ${r.stdout}${r.stderr}`);
    assert.doesNotMatch(r.stderr, /CỔNG BỊ SỬA/, "CA5: so phep kiem van phai khop");
    assert.match(r.stdout, /KHÔNG SO ĐƯỢC VỚI origin\/main/, "CA5: phai NOI RA la khong so duoc, khong im lang");
    // Và phép kiểm "Đọc git không lỗi" KHÔNG được đỏ chỉ vì thiếu `origin/main` — mấy lệnh đó
    // đi qua hàm khoan dung. Đây là chỗ dễ hỏng nhất khi ai đó đổi `gitLoiLaBinhThuong` thành `git`.
    const rows = r.stdout.split(String.fromCharCode(10));
    const i = rows.findIndex((l) => l.includes("Đọc git không lỗi"));
    assert.ok(i >= 0, "CA5: phai con phep kiem #12");
    assert.doesNotMatch(rows[i], /\[ĐỎ/, `CA5: thieu origin/main la HOP LE, khong duoc lam phep kiem #12 do: ${rows[i]} ${rows[i + 1]}`);
    // Cổng KHÔNG ĐỎ, và không đỏ vì bất kỳ lý do nào — thiếu `origin/main` là trạng thái hợp lệ.
    const j = rows.findIndex((l) => l.includes("Test xanh"));
    assert.doesNotMatch([rows[j], rows[j + 1]].join(" "), /\[ĐỎ/, `CA5: thieu origin/main khong duoc lam cong do: ${rows[j + 1]}`);
    // CỐ Ý không đòi cổng xanh toàn bộ: fixture này tối giản nên vài phép kiểm KHÁC đỏ vì lý do
    // không liên quan (bootstrap B1–B14, dấu niêm phong bảng quyền do fixture ghi tay claims).
    // Đòi `status === 0` ở đây là buộc fixture phải dựng một repo hợp lệ hoàn chỉnh chỉ để hỏi
    // một câu về ảnh chụp — và một assert như thế sẽ đỏ vì đủ thứ chẳng dính gì tới điều đang thử.

    /* GIỚI HẠN THẬT, ghi ra để người sau không mất công dựng lại:
       nhánh `if (baseline)` trong `chayLaiTrenHead` KHÔNG lái được đầu-cuối từ đây. Lý do nằm ở
       thiết kế cổng, không phải ở test: không có `origin/main` thì `unpushed` rỗng, nên vùng duy
       nhất tôi "chịu trách nhiệm" phải đến từ một file CHƯA COMMIT trong vùng mình — mà đúng cái
       đó lại kích `TOI_CON_SUA_DO` và chặn trước khi tới bước dựng ảnh chụp. Tức ở repo chưa có
       remote, cổng vốn không chạy suite nào.
       Nên nhánh đó là PHÒNG THỦ, và ca này ghim đúng thứ ghim được: cổng không sập, nói rõ là
       không so được, phép kiểm #12 không đỏ oan. Đừng viết một assert giả vờ mạnh hơn thế. */
    ok("K2-9d · CA 5: repo chưa có `origin/main` — cổng không sập, nói rõ là không so được, phép kiểm #12 không đỏ oan (giới hạn ghi trong khối)");
  } finally {
    assert.ok(tempRoot.startsWith(join(tmpdir(), "k2-9d-chua-co-remote-")), "chỉ dọn đúng temp fixture CA5");
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

/* 23q. K2-9d CA 6 · ảnh chụp phải ghim ĐÚNG COMMIT, không tin nhánh mặc định.
   `git clone` lấy nhánh mặc định của repo gốc. Nếu repo gốc đang ở detached HEAD — hoặc nhánh
   đã đi tiếp — thì bản clone sẽ chụp một commit KHÁC với commit đang xét, và không gì kêu lên:
   suite vẫn chạy, chỉ là chạy trên mã sai. Đó là lý do có `checkout --detach <HEAD>`.
   Ca này là ca duy nhất phân biệt được dòng đó, nên bỏ nó là dòng đó thành bình luận. */
{
  const tempRoot = mkdtempSync(join(tmpdir(), "k2-9d-ghim-commit-"));
  const gitAt = (...args) => execFileSync("git", ["-c", "core.quotepath=false", ...args], { cwd: tempRoot, encoding: "utf8" });
  const put = (relPath, text) => {
    const target = join(tempRoot, ...relPath.split("/"));
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, text, "utf8");
  };
  const dongTest = (r) => {
    const rows = r.stdout.split(String.fromCharCode(10));
    const i = rows.findIndex((l) => l.includes("Test xanh"));
    if (i < 0) return "";
    const out = [rows[i]];
    for (let k = i + 1; k < rows.length && /^\s{5,}\S/.test(rows[k]); k += 1) out.push(rows[k]);
    return out.join(" ");
  };
  // Suite cần git (để chết nếu ảnh chụp không có `.git`) và đọc file trên đĩa (để nhiễm được
  // từ cây làm việc, và để phân biệt được commit nào đang bị chụp).
  const suite = [
    'import { execFileSync } from "node:child_process";',
    'import fs from "node:fs";',
    'execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" });',
    'const m = fs.readFileSync("marker.txt", "utf8").trim();',
    'if (m !== "ok") { console.log(`0 passed, 1 failed, 1 total (marker=${m})`); process.exit(1); }',
    'console.log("1 passed, 0 failed, 1 total");',
    ""
  ].join("\n");
  try {
    gitAt("init", "-b", "main");
    gitAt("config", "user.name", "K2 Ghim Commit");
    gitAt("config", "user.email", "k2@example.invalid");
    mkdirSync(join(tempRoot, "scripts"), { recursive: true });
    for (const name of ["repo-structure.mjs", "session-check.mjs", "check-bootstrap.mjs", "claim.mjs", "build-dashboard.mjs", "feature-parity.mjs"]) {
      copyFileSync(new URL(`../scripts/${name}`, import.meta.url), join(tempRoot, "scripts", name));
    }
    put(".repo-structure.json", JSON.stringify({
      schema_version: 1, repo: { name: "R", tagline: "t" },
      units: { root_dir: "workers", marker: "manifest.json", depth: 2, ten: "E" },
      areas: {
        "scripts/": { steward: "_code", mutability: "rw", ownership_mode: "root" },
        "tests/": { steward: "_code", mutability: "rw", ownership_mode: "root" }
      }
    }, null, 2));
    put(".agents/claims.json", JSON.stringify({ claims: {
      _root: { owner: "lane-khac" }, _code: { owner: "toi" }
    } }, null, 2));
    put("manifest.json", JSON.stringify({ name: "R", version: "0.0.1" }));
    put("HANDOFF.md", "# Handoff\n");
    put("marker.txt", "ok\n");
    put("tests/suite.mjs", suite);
    put("package.json", JSON.stringify({
      name: "r", private: true, type: "module", scripts: { test: "node tests/suite.mjs" }
    }, null, 2));
    gitAt("add", "."); gitAt("commit", "-m", "seed");
    gitAt("update-ref", "refs/remotes/origin/main", "HEAD");

    // B = commit ĐANG XÉT. marker vẫn "ok" ở đây.
    put("scripts/viec-cua-toi.mjs", "export const x = 1;\n");
    gitAt("add", "-A"); gitAt("commit", "-m", "viec cua toi\n\nLane: toi");
    const shaB = gitAt("rev-parse", "HEAD").trim();

    // C = nhánh `main` ĐI TIẾP, và ở C thì marker KHÁC. Đây là chỗ hai cách chụp tách ra.
    put("marker.txt", "commit-C\n");
    gitAt("add", "-A"); gitAt("commit", "-m", "main di tiep\n\nLane: lane-khac");
    const shaC = gitAt("rev-parse", "HEAD").trim();
    assert.notEqual(shaB, shaC, "dung fixture: main phai di qua B");

    // Quay về đứng ở B (detached). HEAD=B, còn `main` vẫn trỏ C.
    gitAt("checkout", "-q", "--detach", shaB);
    assert.equal(gitAt("rev-parse", "HEAD").trim(), shaB, "dung fixture: HEAD phai la B");
    assert.equal(gitAt("rev-parse", "main").trim(), shaC, "dung fixture: main phai van la C");
    assert.equal(gitAt("show", "HEAD:marker.txt").trim(), "ok", "dung fixture: o B thi marker = ok");

    // Lane khác sửa dở marker → suite đỏ trên cây làm việc. Vùng tôi giữ thì sạch.
    put("marker.txt", "dang-sua-do\n");
    const r = spawnSync(process.execPath, [join(tempRoot, "scripts", "session-check.mjs"), "--as", "toi"], { cwd: tempRoot, encoding: "utf8" });
    const d = dongTest(r);

    // Chụp ĐÚNG B → marker "ok" → suite xanh → [BỎ].
    // Chụp theo nhánh mặc định (C) → marker "commit-C" → suite đỏ → quy oan REGRESSION.
    assert.doesNotMatch(d, /\[ĐỎ/, `CA6: anh chup phai ghim dung commit dang xet (B), khong lay nhanh mac dinh (C). Khoi: ${d}`);
    assert.doesNotMatch(d, /marker=commit-C/, "CA6: dau hieu chup nham commit C — thieu `checkout --detach <HEAD>`");
    assert.match(r.stdout, /Thứ ĐÃ COMMIT xanh/, "CA6: phai nhan ra do den tu cay lam viec");
    ok("K2-9d · CA 6: ảnh chụp ghim đúng commit đang xét, không tin nhánh mặc định (repo ở detached HEAD, `main` đã đi tiếp)");
  } finally {
    assert.ok(tempRoot.startsWith(join(tmpdir(), "k2-9d-ghim-commit-")), "chỉ dọn đúng temp fixture CA6");
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

/* 23j. K2-9 · HÀNH VI: suite của lane KHÁC đỏ thì không chặn tôi; của TÔI đỏ thì chặn.
   Bệnh (đo thật 03/09): `scripts.test` nối các suite bằng `&&`, và nó mở đầu bằng suite của
   `workers/duc-auto-chatgpt`. Nên một lane lưu file dở làm MỌI lane khác không đóng được phiên
   — một phiên bị chặn BỐN lần, mỗi lần tự xanh lại khi lane kia lưu xong.

   BA vế, và vế 2 mới là vế chịu lực: bỏ chặn cho lane khác mà không giữ chặn cho chính mình thì
   đây là gỡ bảo vệ, không phải sửa tầng. Vế 3 chặn đúng đường lách: chạm vào vùng của họ rồi
   thì đỏ đó có thể do mình, nên không được đổ cho họ. */
{
  const tempRoot = mkdtempSync(join(tmpdir(), "k2-9-test-cua-ai-"));
  const gitAt = (...args) => execFileSync("git", ["-c", "core.quotepath=false", ...args], { cwd: tempRoot, encoding: "utf8" });
  const put = (relPath, text) => {
    const target = join(tempRoot, ...relPath.split("/"));
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, text, "utf8");
  };
  const gate = () => spawnSync(process.execPath, [join(tempRoot, "scripts", "session-check.mjs"), "--as", "toi"], { cwd: tempRoot, encoding: "utf8" });
  // Lấy ĐÚNG khối của "Test xanh": dòng nhãn cộng mọi dòng thụt sau nó. Bản đầu của tôi dò
  // một dòng thụt bất kỳ chứa "ĐỎ", nên nó bắt sang thông báo của phép kiểm KHÁC và báo oan.
  const dongTest = (r) => {
    const rows = r.stdout.split(String.fromCharCode(10));
    const i = rows.findIndex((l) => l.includes("Test xanh"));
    if (i < 0) return "";
    const out = [rows[i]];
    for (let k = i + 1; k < rows.length && /^\s{5,}\S/.test(rows[k]); k += 1) out.push(rows[k]);
    return out.join(" ");
  };
  const suiteXanh = 'console.log("1 passed, 0 failed, 1 total");\n';
  const suiteDo = 'console.log("0 passed, 1 failed, 1 total");\nprocess.exit(1);\n';
  try {
    gitAt("init", "-b", "main");
    gitAt("config", "user.name", "K2 Test Cua Ai");
    gitAt("config", "user.email", "k2@example.invalid");
    mkdirSync(join(tempRoot, "scripts"), { recursive: true });
    for (const name of ["repo-structure.mjs", "session-check.mjs", "check-bootstrap.mjs", "claim.mjs", "build-dashboard.mjs", "feature-parity.mjs"]) {
      copyFileSync(new URL(`../scripts/${name}`, import.meta.url), join(tempRoot, "scripts", name));
    }
    put(".repo-structure.json", JSON.stringify({
      schema_version: 1,
      repo: { name: "Repo Thu", tagline: "de thu quy chu suite" },
      units: { root_dir: "workers", marker: "manifest.json", depth: 2, ten: "Extension" },
      generators: [],
      areas: {
        "scripts/": { steward: "_code", mutability: "rw", ownership_mode: "root" },
        "tests/": { steward: "_code", mutability: "rw", ownership_mode: "root" },
        "workers/": { steward: null, mutability: "rw", ownership_mode: "per-package", claim_prefix: "workers/" }
      }
    }, null, 2));
    put(".agents/claims.json", JSON.stringify({ claims: {
      _root: { owner: null },
      _code: { owner: "toi" },
      "workers/goi-cua-ho": { owner: "lane-khac" }
    } }, null, 2));
    put("manifest.json", JSON.stringify({ name: "Root", version: "0.0.1" }));
    put("HANDOFF.md", "# Handoff\n");
    put("workers/goi-cua-ho/v0.1.0/manifest.json", JSON.stringify({ name: "Goi Cua Ho", version: "0.1.0" }));
    put("workers/goi-cua-ho/v0.1.0/HANDOFF.md", "# Log\n");
    put("workers/goi-cua-ho/v0.1.0/tests/run-all.mjs", suiteXanh);
    put("tests/cua-toi.mjs", suiteXanh);
    put("package.json", JSON.stringify({
      name: "repo-thu", private: true, type: "module",
      scripts: { test: "node workers/goi-cua-ho/v0.1.0/tests/run-all.mjs && node tests/cua-toi.mjs" }
    }, null, 2));
    gitAt("add", ".");
    gitAt("commit", "-m", "seed");
    // `origin/main` phải trỏ vào SEED, không phải vào HEAD sau cùng: cổng chỉ tính việc CHƯA
    // push, nên đặt sau thì `touched` rỗng và cả nhánh `rootSuite` không hề chạy. Bản fixture
    // đầu của tôi sai đúng chỗ này và "xanh" một cách vô nghĩa.
    gitAt("update-ref", "refs/remotes/origin/main", "HEAD");
    // Tôi chạm `_code` để có việc mà đóng phiên.
    put("scripts/viec-cua-toi.mjs", "export const x = 1;\n");
    gitAt("add", "-A");
    gitAt("commit", "-m", "viec cua toi\n\nLane: toi");
    // CA 1 — mọi thứ sạch, mọi suite xanh.
    assert.match(dongTest(gate()), /\[XANH\]/, "clean-pass: hai suite xanh thi cong phai XANH");

    // CA 2 — file CHƯA COMMIT của LANE KHÁC làm suite đỏ. Vùng tôi giữ thì sạch, HEAD xanh.
    // Đây là ca đã chặn oan tôi bốn lần trong một phiên.
    put("workers/goi-cua-ho/v0.1.0/tests/run-all.mjs", suiteDo);
    const r2 = gate();
    const d2 = dongTest(r2);
    assert.doesNotMatch(d2, /\[ĐỎ/, `foreign-dirty + HEAD xanh: KHONG duoc chan toi. Khoi Test xanh: ${d2}`);
    assert.doesNotMatch(d2, /\[XANH\]/, "cung KHONG duoc in XANH — cay lam viec dang hong that");
    assert.match(r2.stdout, /Thứ ĐÃ COMMIT xanh/, "phai noi ro: da commit thi lanh, cay lam viec thi hong");

    // CA 3 — CHỐT GPT, và là ca K2-9 v1 mất: chính TÔI còn sửa dở. HEAD vẫn xanh, nhưng nếu
    // lấy "HEAD xanh" ra miễn thì tôi tự miễn cho chính lỗi của mình. PHẢI ĐỎ.
    put("scripts/viec-cua-toi.mjs", "export const x = 2;\n");   // bẩn, trong vùng `_code` TÔI giữ
    const r3 = gate();
    assert.match(dongTest(r3), /\[ĐỎ/, "own-dirty + HEAD xanh: PHAI DO — day la fail-open GPT bat duoc");
    assert.match(r3.stdout, /TOI_CON_SUA_DO/, "phai noi dung ly do, de nguoi doc biet commit truoc la xong");
    assert.notEqual(r3.status, 0, "do thi khong duoc thoat 0");

    // CA 4 — regression ĐÃ COMMIT: HEAD đỏ. Vùng tôi sạch, nhưng vẫn phải đỏ.
    // Đây là vế mà quy-theo-đường-dẫn của v1 sẽ [BỎ] mất: suite nằm trong gói của lane khác,
    // nhưng thứ làm nó đỏ đã nằm trong HEAD.
    gitAt("checkout", "--", "."); gitAt("clean", "-fd");
    put("workers/goi-cua-ho/v0.1.0/tests/run-all.mjs", suiteDo);
    gitAt("add", "-A"); gitAt("commit", "-m", "commit ca suite do\n\nLane: toi");
    assert.equal(gitAt("status", "--porcelain").trim(), "", "dung fixture: cay phai sach o ca nay");
    const r4 = gate();
    assert.match(dongTest(r4), /\[ĐỎ/, "own-committed + HEAD do: PHAI DO");
    assert.match(r4.stdout, /REGRESSION_DA_COMMIT/, "phai noi dung ly do — do nay co that trong HEAD");
    assert.notEqual(r4.status, 0, "do thi khong duoc thoat 0");
    ok("K2-9 v2 · HÀNH VI: 4 ca — clean-pass · foreign-dirty/HEAD-xanh → BỎ · own-dirty/HEAD-xanh → ĐỎ · own-committed/HEAD-đỏ → ĐỎ");
  } finally {
    assert.ok(tempRoot.startsWith(join(tmpdir(), "k2-9-test-cua-ai-")), "chỉ dọn đúng temp fixture K2-9");
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

/* 23i. K2-8 · HÀNH VI: độ tươi artifact rời cổng lane sang cổng PUSH.
   Vì sao dời (đo thật 03/09): artifact ĐO VIỆC CỦA MỌI LANE, nên độ tươi là tính chất của thứ
   sắp publish, không phải của một phiên đang đóng. Một phiên bị chặn BA lần, và cả ba lần 100%
   dòng lệch đều thuộc gói của lane khác.

   KHỐI NÀY LÀ THỨ NGĂN VIỆC DỜI ĐỔI THÀNH GỠ BẢO VỆ. Hai vế phải đi cùng nhau, và vế thứ hai
   mới là vế chịu lực: cổng lane KHÔNG còn đỏ, nhưng safe-push PHẢI từ chối. Ghim mỗi vế một
   thì một đột biến "bỏ luôn phép kiểm" vẫn thoát sạch. */
{
  const tempRoot = mkdtempSync(join(tmpdir(), "k2-8-tach-cong-"));
  const gitAt = (...args) => execFileSync("git", ["-c", "core.quotepath=false", ...args], { cwd: tempRoot, encoding: "utf8" });
  const put = (relPath, text) => {
    const target = join(tempRoot, ...relPath.split("/"));
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, text, "utf8");
  };
  const chay = (script, ...extra) => spawnSync(process.execPath, [join(tempRoot, "scripts", script), "--as", "toi", ...extra], { cwd: tempRoot, encoding: "utf8" });
  try {
    gitAt("init", "-b", "main");
    gitAt("config", "user.name", "K2 Tach Cong");
    gitAt("config", "user.email", "k2@example.invalid");
    mkdirSync(join(tempRoot, "scripts"), { recursive: true });
    for (const name of ["repo-structure.mjs", "build-dashboard.mjs", "session-check.mjs", "safe-push.mjs", "check-bootstrap.mjs", "claim.mjs"]) {
      copyFileSync(new URL(`../scripts/${name}`, import.meta.url), join(tempRoot, "scripts", name));
    }
    put(".repo-structure.json", JSON.stringify({
      schema_version: 1,
      repo: { name: "Repo Thu", tagline: "de thu tach cong" },
      units: { root_dir: "workers", marker: "manifest.json", depth: 2, ten: "Extension" },
      generators: ["build-dashboard.mjs"],
      areas: { "scripts/": { steward: "_root", mutability: "rw", ownership_mode: "root" } }
    }, null, 2));
    put(".agents/claims.json", JSON.stringify({ claims: { _root: { owner: "toi" } } }, null, 2));
    put("manifest.json", JSON.stringify({ name: "Root", version: "0.0.1" }));
    put("HANDOFF.md", "# Handoff\n");
    put("workers/goi-mot/v0.1.0/manifest.json", JSON.stringify({ name: "Goi Mot", version: "0.1.0" }));
    put("workers/goi-mot/v0.1.0/HANDOFF.md", "# Log\n");
    gitAt("add", ".");
    gitAt("commit", "-m", "seed");
    execFileSync(process.execPath, [join(tempRoot, "scripts", "build-dashboard.mjs")], { cwd: tempRoot, encoding: "utf8" });
    gitAt("add", "-A");
    gitAt("commit", "-m", "artifact dau tien");
    gitAt("update-ref", "refs/remotes/origin/main", "HEAD");

    // Trạng thái sạch: cả hai cổng phải im về artifact.
    const sachGate = chay("session-check.mjs", "--quick");
    assert.match(sachGate.stdout, /\[XANH\][^\n]*Sự thật máy sinh còn tươi/, "artifact dang tuoi thi cong lane phai XANH");

    // Làm artifact CŨ THẬT: thêm một extension rồi commit mà KHÔNG sinh lại.
    put("workers/goi-hai/v0.1.0/manifest.json", JSON.stringify({ name: "Goi Hai", version: "0.1.0" }));
    put("workers/goi-hai/v0.1.0/HANDOFF.md", "# Log\n");
    gitAt("add", "-A");
    gitAt("commit", "-m", "them extension ma khong sinh lai\n\nLane: toi");

    // VẾ 1 — cổng lane KHÔNG được đỏ vì chuyện này nữa, nhưng vẫn phải NÓI TO.
    const gate = chay("session-check.mjs", "--quick");
    assert.doesNotMatch(gate.stderr, /CỔNG BỊ SỬA/, "so phep kiem phai khop EXPECTED_CHECKS");
    const dongArtifact = (gate.stdout.match(/^.*Sự thật máy sinh còn tươi.*$/m) ?? [""])[0];
    assert.notEqual(dongArtifact, "", "phep kiem artifact PHAI con o cong lane — doi cho, khong phai xoa");
    assert.doesNotMatch(dongArtifact, /\[ĐỎ/, "artifact cu KHONG duoc chan dong phien nua — no do viec cua MOI lane");
    assert.match(gate.stdout, /safe-push SẼ TỪ CHỐI/,
      "phai chi ro no se bi chan o dau — ha xuong canh bao ma khong noi gi la lang le go bao ve");

    // VẾ 2 — VẾ CHỊU LỰC: safe-push PHẢI từ chối. Không có vế này thì vế 1 là gỡ bảo vệ.
    const push = chay("safe-push.mjs", "--dry-run");
    assert.match(push.stderr, /TỪ CHỐI PUSH — sự thật máy sinh chưa khớp/,
      "artifact cu thi safe-push PHAI tu choi — day la ly do duy nhat viec ha cong lane xuong la hop le");
    assert.notEqual(push.status, 0, "tu choi thi khong duoc thoat 0");

    // Sửa xong thì cả hai phải thông trở lại — thiếu vế này thì một đột biến "luôn từ chối" thoát.
    execFileSync(process.execPath, [join(tempRoot, "scripts", "build-dashboard.mjs")], { cwd: tempRoot, encoding: "utf8" });
    gitAt("add", "-A");
    gitAt("commit", "-m", "sinh lai artifact\n\nLane: toi");
    const push2 = chay("safe-push.mjs", "--dry-run");
    assert.doesNotMatch(push2.stderr, /sự thật máy sinh chưa khớp/, "sinh lai roi thi khong duoc chan nua");

    // VẾ 3 — bộ sinh SỬA DỞ trong cây làm việc KHÔNG được chặn ai (PUSH-GATE-01, 05/09).
    //
    // KHẲNG ĐỊNH NÀY ĐÃ BỊ LẬT NGƯỢC, và lý do đáng đọc. Bản trước ghim ngược lại: "bộ sinh
    // sửa dở thì PHẢI từ chối", vì nó là thứ phán xử nên không thể vừa sửa vừa tự chấm. Lý lẽ
    // đúng, nhưng chỗ chặn sai — cây làm việc là của CHUNG mọi phiên, nên câu đó biến một phiên
    // đang sửa bộ sinh thành cái khoá cửa xuất bản của MỌI phiên còn lại. Đo thật 05/09: 4 lượt
    // chặn oan trong một ngày cho một lane không hề chạm bộ sinh; nặng nhất là lúc phiên kia
    // chạy đột biến kiểm, vì mỗi vòng bẩn file vài chục giây.
    //
    // Nỗi lo cũ KHÔNG bị bỏ qua, nó được xử đúng chỗ: quan toà nay là bộ sinh Ở HEAD, chạy
    // trong một bản chụp HEAD. Bản sửa dở không còn tự chấm được chính nó, vì nó không còn là
    // đầu vào của phép kiểm nữa. Vế "artifact cũ thì VẪN bị chặn" nằm ngay trên, và ở
    // `tests/push-gate-artifact-smoke.mjs`.
    //
    // BẢN SỬA DỞ Ở ĐÂY LÀ BẢN ĐỘC, cố ý: nó thoát 1 ngay dòng đầu. Nếu cổng còn đụng tới bản ở
    // cây làm việc — chạy nó, hay chỉ đọc trạng thái của nó — thì nó CHẮC CHẮN từ chối. Bản
    // trước dùng một dòng chú thích vô hại, tức phép ghim vẫn xanh kể cả khi cổng chạy nhầm bản.
    const nguyenVan = readFileSync(join(tempRoot, "scripts", "build-dashboard.mjs"), "utf8");
    writeFileSync(join(tempRoot, "scripts", "build-dashboard.mjs"),
      `process.exit(1);\n${nguyenVan}`, "utf8");
    const push3 = chay("safe-push.mjs", "--dry-run");
    assert.doesNotMatch(push3.stderr, /đang sửa dở chưa commit/,
      "khong duoc con cua tu choi bo-sinh-dang-sua-do — do la cho chan oan lane khong lien quan");
    assert.doesNotMatch(push3.stderr, /TỪ CHỐI PUSH/,
      "bo sinh ban trong cay lam viec KHONG duoc chan mot cu day hop le");
    assert.equal(push3.status, 0, "artifact van khop HEAD thi phai day duoc, du bo sinh dang sua do");
    writeFileSync(join(tempRoot, "scripts", "build-dashboard.mjs"), nguyenVan, "utf8");
    assert.equal(chay("safe-push.mjs", "--dry-run").status, 0, "tra bo sinh ve nguyen ven thi van phai thong");

    /* BA FAIL-OPEN TRONG CHÍNH HARD GATE — audit GPT 03/09 bắt được, tôi vá, và ghim ở đây.
       Cả ba cùng một hình dạng: cổng không đỏ, cổng biến thành KHÔNG LÀM GÌ. Loại đó tệ nhất,
       vì nó trông y hệt "đã đạt". Không có ba vế dưới thì bản vá của tôi cũng chỉ là bình luận —
       đúng bài học vừa học ở chốt "bộ sinh sửa dở" ngay trên. */
    const capNhatCauHinh = (doi) => {
      const cfg = JSON.parse(readFileSync(join(tempRoot, ".repo-structure.json"), "utf8"));
      doi(cfg);
      writeFileSync(join(tempRoot, ".repo-structure.json"), JSON.stringify(cfg, null, 2), "utf8");
    };
    const cauHinhGoc = readFileSync(join(tempRoot, ".repo-structure.json"), "utf8");

    // (E) `generators` khai HỎNG phải NÉM, không được lặng lẽ thành mảng rỗng. Bản đầu của tôi
    // tự viết `Array.isArray(...) ? ... : []` thay vì đi qua `generatorsFrom` — xoá cấu hình là
    // hard gate hết kiểm gì.
    capNhatCauHinh((c) => { c.generators = []; });
    gitAt("add", "-A"); gitAt("commit", "-m", "khai generators hong\n\nLane: toi");
    const e = chay("safe-push.mjs", "--dry-run");
    assert.match(e.stderr, /GENERATORS_HONG/, "khai `generators` hong thi PHAI tu choi, khong duoc lui ve mang rong");
    assert.notEqual(e.status, 0, "tu choi thi khong duoc thoat 0");

    // (F) Khai một bộ sinh KHÔNG TỒN TẠI. Bản đầu `continue` — khai rồi mà thiếu là repo hỏng.
    capNhatCauHinh((c) => { c.generators = ["khong-he-co.mjs"]; });
    gitAt("add", "-A"); gitAt("commit", "-m", "khai bo sinh khong ton tai\n\nLane: toi");
    const f = chay("safe-push.mjs", "--dry-run");
    assert.match(f.stderr, /khong-he-co\.mjs đã KHAI[\s\S]*KHÔNG có trong repo/, "khai ma thieu file thi PHAI do");
    assert.notEqual(f.status, 0, "tu choi thi khong duoc thoat 0");

    // (G) Cấu hình phải đọc từ HEAD, không từ cây làm việc: thứ sắp publish là HEAD, nên một bản
    // sửa CHƯA COMMIT không được đổi danh sách verifier của cái sắp đẩy.
    writeFileSync(join(tempRoot, ".repo-structure.json"), cauHinhGoc, "utf8");
    gitAt("add", "-A"); gitAt("commit", "-m", "tra cau hinh ve dung\n\nLane: toi");
    put("workers/goi-ba/v0.1.0/manifest.json", JSON.stringify({ name: "Goi Ba", version: "0.1.0" }));
    put("workers/goi-ba/v0.1.0/HANDOFF.md", "# Log\n");
    gitAt("add", "-A"); gitAt("commit", "-m", "them extension ma khong sinh lai\n\nLane: toi");
    assert.notEqual(chay("safe-push.mjs", "--dry-run").status, 0, "dung fixture: artifact phai dang cu");
    capNhatCauHinh((c) => { delete c.generators; });   // CHỈ ở cây làm việc, KHÔNG commit
    const g = chay("safe-push.mjs", "--dry-run");
    assert.notEqual(g.status, 0,
      "xoa `generators` o CAY LAM VIEC khong duoc lam thong hard gate — cai sap publish la HEAD");
    assert.match(g.stderr, /sự thật máy sinh chưa khớp/, "phai van bao dung ly do, khong phai mot loi khac");
    ok("K2-8 · HÀNH VI: artifact cũ chặn safe-push; bộ sinh sửa dở chặn; và ba fail-open (khai hỏng / khai mà thiếu / đọc cây làm việc) đều chặn");
  } finally {
    assert.ok(tempRoot.startsWith(join(tmpdir(), "k2-8-tach-cong-")), "chỉ dọn đúng temp fixture K2-8");
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

/* 23h. K2-7 · HÀNH VI: bộ sinh KHÔNG ghi khi chỉ có dấu sinh trang đổi.
   Bệnh (audit GPT chỉ ra, tôi xác minh): phép SO đã lọc dấu sinh từ lâu, nhưng bộ GHI vẫn ghi
   đè vô điều kiện. Nên mỗi lần HEAD nhích một commit — kể cả commit của phiên khác, kể cả
   commit chẳng liên quan — ba artifact bẩn theo, và `git add` sinh ra một commit rỗng nghĩa.
   Bằng chứng thật: `2733ee9` ở repo Ark_Repo_Harness đổi đúng BỐN dòng, cả bốn là dấu sinh.
   Và commit đó lại làm HEAD nhích tiếp → dấu đổi tiếp. Một vòng lặp tự nuôi.

   BA nhánh, và nhánh thứ ba mới là chốt an toàn: nếu file trên đĩa đang bẩn mà HEAD lại đúng,
   bỏ qua ghi sẽ ĐỂ NGUYÊN bản hỏng. Không ghim nhánh đó thì sớm muộn ai đó "dọn cho gọn" và
   mất chốt mà suite vẫn xanh. */
{
  const tempRoot = mkdtempSync(join(tmpdir(), "k2-7-khong-ghi-thua-"));
  const gitAt = (...args) => execFileSync("git", ["-c", "core.quotepath=false", ...args], { cwd: tempRoot, encoding: "utf8" });
  const put = (relPath, text) => {
    const target = join(tempRoot, ...relPath.split("/"));
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, text, "utf8");
  };
  // Kèm nguyên văn output vào thông báo lỗi: một `1 !== 0` trần không nói được gì, và fixture
  // này dựng cả một repo nên chỗ hỏng có thể ở bất kỳ đâu.
  const sinh = () => {
    const r = spawnSync(process.execPath, [join(tempRoot, "scripts", "build-dashboard.mjs")], { cwd: tempRoot, encoding: "utf8" });
    r.noiDung = `${r.stdout ?? ""}${r.stderr ?? ""}`;
    return r;
  };
  const banThiu = () => gitAt("status", "--porcelain", "DASHBOARD.md", "llms.txt", "repo-map.json").trim();
  try {
    gitAt("init", "-b", "main");
    gitAt("config", "user.name", "K2 Khong Ghi Thua");
    gitAt("config", "user.email", "k2@example.invalid");
    mkdirSync(join(tempRoot, "scripts"), { recursive: true });
    for (const name of ["repo-structure.mjs", "build-dashboard.mjs"]) {
      copyFileSync(new URL(`../scripts/${name}`, import.meta.url), join(tempRoot, "scripts", name));
    }
    put(".repo-structure.json", JSON.stringify({
      schema_version: 1,
      repo: { name: "Repo Thu", tagline: "de thu bo sinh" },
      units: { root_dir: "workers", marker: "manifest.json", depth: 2, ten: "Extension" },
      areas: { "scripts/": { steward: "_root", mutability: "rw", ownership_mode: "root" } }
    }, null, 2));
    put("HANDOFF.md", "# Handoff\n");
    put("manifest.json", JSON.stringify({ name: "Root", version: "0.0.1" }));
    put(".agents/claims.json", JSON.stringify({ claims: { _root: { owner: null } } }, null, 2));
    put("workers/goi-mot/v0.1.0/manifest.json", JSON.stringify({ name: "Goi Mot", version: "0.1.0" }));
    put("workers/goi-mot/v0.1.0/HANDOFF.md", "# Log\n");
    put("mot-file.md", "noi dung ban dau\n");
    gitAt("add", ".");
    gitAt("commit", "-m", "seed");
    const dau = sinh(); assert.equal(dau.status, 0, `lan sinh dau tien phai chay duoc: ${dau.noiDung}`);
    gitAt("add", "-A");
    gitAt("commit", "-m", "artifact dau tien");
    assert.equal(banThiu(), "", "sau khi commit artifact thi cay phai sach");

    // (a) HEAD NHÍCH nhưng nội dung KHÔNG đổi → phải KHÔNG ghi gì. Đây là ca đã đẻ ra rác.
    put("mot-file.md", "noi dung ban dau\nthem mot dong khong lien quan\n");
    gitAt("add", "mot-file.md");
    gitAt("commit", "-m", "viec khac hoan toan, khong dung toi artifact");
    const a = sinh();
    assert.equal(a.status, 0, "chay lai sau khi HEAD nhich phai thoat 0");
    assert.match(a.stdout, /Không ghi gì/, "chi dau sinh doi thi phai NOI RO la khong ghi");
    assert.equal(banThiu(), "",
      "REGRESSION: HEAD nhich ma noi dung khong doi thi TUYET DOI khong duoc lam ban artifact — day la goc cua commit rong nghia");

    // (b) CHỨNG DƯƠNG: nội dung THẬT đổi thì phải ghi. Thiếu vế này thì một đột biến
    // "không bao giờ ghi" vẫn thoát sạch, và artifact đóng băng vĩnh viễn.
    put("workers/goi-hai/v0.1.0/manifest.json", JSON.stringify({ name: "Goi Hai", version: "0.1.0" }));
    put("workers/goi-hai/v0.1.0/HANDOFF.md", "# Log\n");
    gitAt("add", "-A");
    gitAt("commit", "-m", "them mot extension that");
    const b = sinh();
    assert.equal(b.status, 0, "sinh lai sau thay doi that phai thoat 0");
    assert.match(b.stdout, /Đã sinh/, "co thay doi that thi phai bao la DA GHI");
    assert.notEqual(banThiu(), "", "noi dung that doi thi artifact PHAI duoc ghi lai");
    gitAt("add", "-A");
    gitAt("commit", "-m", "artifact sau khi them extension");

    // (c) CHỐT AN TOÀN: đĩa bẩn mà HEAD đúng → vẫn PHẢI ghi để chữa bản hỏng.
    put("DASHBOARD.md", "BAN NAY DA BI SUA TAY VA HONG\n");
    assert.notEqual(banThiu(), "", "dung fixture: file phai dang ban truoc khi chay");
    const c = sinh();
    assert.equal(c.status, 0, "chay tren cay ban phai thoat 0");
    assert.match(c.stdout, /Đã sinh/, "dia ban thi PHAI ghi de chua, khong duoc bo qua");
    assert.doesNotMatch(gitAt("show", "HEAD:DASHBOARD.md"), /DA BI SUA TAY/, "dung fixture: HEAD van sach");
    // Ghim NGỮ NGHĨA, không ghim từng byte: bản chữa mang dấu sinh MỚI nên `git status` vẫn
    // báo "M" — đúng và vô hại. Tính chất thật cần giữ là: chữ bậy đã biến mất, và `--check`
    // xanh trở lại. Bản ghim đầu tiên của tôi đòi byte khớp và đỏ oan ở đúng chỗ này.
    assert.doesNotMatch(readFileSync(join(tempRoot, "DASHBOARD.md"), "utf8"), /DA BI SUA TAY/,
      "dia ban thi phai duoc CHUA — bo qua ghi o day la de nguyen ban hong tren dia");
    const lai = spawnSync(process.execPath, [join(tempRoot, "scripts", "build-dashboard.mjs"), "--check"], { cwd: tempRoot, encoding: "utf8" });
    assert.equal(lai.status, 0, `sau khi chua thi --check phai xanh lai: ${lai.stdout}${lai.stderr}`);
    ok("K2-7 · HÀNH VI: HEAD nhích mà nội dung không đổi thì KHÔNG ghi; đổi thật thì ghi; đĩa bẩn thì vẫn ghi để chữa");
  } finally {
    assert.ok(tempRoot.startsWith(join(tmpdir(), "k2-7-khong-ghi-thua-")), "chỉ dọn đúng temp fixture K2-7");
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

/* 23g. K2-4 · HÀNH VI: cổng đóng phiên ĐỎ khi bảng quyền bị mở ra sửa tay.
   `tests/claim-smoke.mjs` đã ghim phía LỆNH (nó từ chối ghi khi dấu vỡ). Khối này ghim phía
   CỔNG, và đó mới là vế cứu được nạn nhân: người bị mất khoá KHÔNG chạy `claim.mjs` — họ đang
   bận làm việc của họ. Thứ duy nhất họ chắc chắn chạy là cổng đóng phiên.

   Chứng ÂM nằm ngay trong khối, không tách ra: sửa văn xuôi `_doc` PHẢI vẫn xanh. Thiếu vế đó
   thì một đột biến "cứ đỏ" hoặc "băm cả file" vẫn thoát, và cổng sẽ đỏ mỗi lần ai sửa lời giải
   thích — nghĩa là ba ngày sau sẽ có người tắt nó đi. */
{
  const tempRoot = mkdtempSync(join(tmpdir(), "k2-4-dau-niem-phong-"));
  const gitAt = (...args) => execFileSync("git", ["-c", "core.quotepath=false", ...args], { cwd: tempRoot, encoding: "utf8" });
  const claimsPath = join(tempRoot, ".agents", "claims.json");
  const docClaims = () => JSON.parse(readFileSync(claimsPath, "utf8"));
  const ghiClaims = (p) => writeFileSync(claimsPath, `${JSON.stringify(p, null, 2)}\n`, "utf8");
  const dongCheck = () => {
    const gate = spawnSync(process.execPath, [join(tempRoot, "scripts", "session-check.mjs"), "--as", "toi", "--quick"], {
      cwd: tempRoot, encoding: "utf8"
    });
    assert.doesNotMatch(gate.stderr, /CỔNG BỊ SỬA/, "số phép kiểm phải khớp EXPECTED_CHECKS");
    const dong = (gate.stdout.match(/^.*Bảng quyền chưa bị sửa tay.*$/m) ?? [""])[0];
    assert.notEqual(dong, "", "cổng PHẢI có phép kiểm 'Bảng quyền chưa bị sửa tay' — gỡ nó ra là hỏng cả khối này");
    return dong;
  };
  try {
    gitAt("init", "-b", "main");
    gitAt("config", "user.name", "K2 Dau");
    gitAt("config", "user.email", "k2@example.invalid");
    mkdirSync(join(tempRoot, "scripts"), { recursive: true });
    for (const name of ["repo-structure.mjs", "session-check.mjs", "build-dashboard.mjs", "feature-parity.mjs", "claim.mjs"]) {
      copyFileSync(new URL(`../scripts/${name}`, import.meta.url), join(tempRoot, "scripts", name));
    }
    mkdirSync(join(tempRoot, ".agents"), { recursive: true });
    writeFileSync(join(tempRoot, ".repo-structure.json"), JSON.stringify({
      schema_version: 1,
      areas: { "scripts/": { steward: "_root", mutability: "rw", ownership_mode: "root" } }
    }, null, 2), "utf8");
    ghiClaims({ _doc: "loi giai thich ban dau", claims: { _root: { owner: "toi", ai: "Claude", task: "viec cua toi" } } });
    gitAt("add", ".");
    gitAt("commit", "-m", "seed");
    gitAt("update-ref", "refs/remotes/origin/main", "HEAD");

    // (a) CHƯA đóng dấu = CHƯA KIỂM, và chưa kiểm KHÔNG được đội lốt đã đạt.
    assert.match(dongCheck(), /ĐỎ/, "bảng chưa có dấu thì cổng phải ĐỎ — 'chưa kiểm' không phải 'đã đạt'");

    // (b) Đóng dấu qua đúng lệnh → xanh.
    const restamp = spawnSync(process.execPath, [join(tempRoot, "scripts", "claim.mjs"), "--restamp", "--as", "toi"], {
      cwd: tempRoot, encoding: "utf8"
    });
    assert.equal(restamp.status, 0, "--restamp phải chạy được trong repo dựng từ bộ khung");
    assert.match(dongCheck(), /XANH/, "đóng dấu đúng lệnh thì cổng phải XANH");

    // (c) CHỨNG ÂM: sửa văn xuôi ngoài khối `claims` KHÔNG được làm cổng đỏ.
    const vanXuoi = docClaims();
    vanXuoi._doc = "doi loi giai thich, khong dung toi ai giu gi";
    ghiClaims(vanXuoi);
    assert.match(dongCheck(), /XANH/,
      "sửa lời giải thích KHÔNG phải sửa tay bảng quyền — đỏ ở đây là cổng sẽ bị tắt trong ba ngày");

    // (d) CA CHÍNH: đổi chủ bằng tay, đi vòng qua lệnh.
    const cuop = docClaims();
    cuop.claims._root.owner = "ke-cuop";
    ghiClaims(cuop);
    assert.match(dongCheck(), /ĐỎ/, "đổi chủ bằng tay thì cổng PHẢI đỏ — đây là lý do cả phép kiểm tồn tại");
    ok("K2-4 · HÀNH VI: cổng ĐỎ khi bảng quyền bị sửa tay và khi chưa đóng dấu; sửa văn xuôi thì KHÔNG đỏ");
  } finally {
    assert.ok(tempRoot.startsWith(join(tmpdir(), "k2-4-dau-niem-phong-")), "chỉ dọn đúng temp fixture K2-4");
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

/* 23c. K2-2b · safe-push KHÔNG được báo "đã đẩy" cho một cú đẩy chưa hề xảy ra.
   FAIL-OPEN THẬT, phiên K1 tìm ra: `gitQuiet` nuốt lỗi, nên khi ref `origin/main` KHÔNG TỒN TẠI
   (clone mới chưa fetch, nhánh mặc định tên khác, remote đổi tên) thì `origin/main..HEAD` trả
   rỗng, và bản cũ in "Không có gì để push — máy đang bằng với remote" rồi THOÁT 0. Người đóng
   phiên tin là đã đẩy trong khi remote chưa có gì.

   Vì sao khối này phải tồn tại RIÊNG: hai fixture kia đều `update-ref refs/remotes/origin/main`,
   tức chỉ dựng ca CHẠY ĐƯỢC. K1 chỉ ra chuỗi `KHONG_CO_ORIGIN_MAIN` không có trong một test nào,
   và tôi kiểm lại bằng đột biến: gỡ guard rồi đồng bộ bản trích thì **suite xanh sạch, exit 0**.
   Đúng luật vàng 2 của repo: một phép kiểm chỉ thật khi fixture của nó dựng được ca hỏng. */
{
  const tempRoot = mkdtempSync(join(tmpdir(), "k2-2b-no-remote-"));
  const gitAt = (...args) => execFileSync("git", ["-c", "core.quotepath=false", ...args], { cwd: tempRoot, encoding: "utf8" });
  try {
    gitAt("init", "-b", "main");
    gitAt("config", "user.name", "K2 No Remote");
    gitAt("config", "user.email", "k2@example.invalid");
    mkdirSync(join(tempRoot, "scripts"), { recursive: true });
    for (const name of ["repo-structure.mjs", "safe-push.mjs"]) {
      copyFileSync(new URL(`../scripts/${name}`, import.meta.url), join(tempRoot, "scripts", name));
    }
    writeFileSync(join(tempRoot, ".repo-structure.json"), JSON.stringify({ schema_version: 1, areas: {} }), "utf8");
    mkdirSync(join(tempRoot, ".agents"), { recursive: true });
    writeFileSync(join(tempRoot, ".agents", "claims.json"), JSON.stringify({ claims: { _root: { owner: null } } }), "utf8");
    gitAt("add", ".");
    gitAt("commit", "-m", "mot commit, va KHONG remote nao");

    // KHÔNG `git remote add`, KHÔNG `update-ref` — đây chính là ca hỏng.
    const run = spawnSync(process.execPath, [join(tempRoot, "scripts", "safe-push.mjs"), "--as", "toi"], {
      cwd: tempRoot, encoding: "utf8"
    });
    const out = `${run.stdout}${run.stderr}`;
    assert.match(out, /KHONG_CO_ORIGIN_MAIN/,
      "không phân giải được origin/main thì phải NÓI RA bằng mã lỗi, không được im");
    assert.notEqual(run.status, 0,
      "và phải thoát KHÁC 0 — thoát 0 ở đây là báo 'xong' cho một cú đẩy chưa hề xảy ra");
    assert.doesNotMatch(run.stdout, /Không có gì để push/,
      "TUYỆT ĐỐI không được nói 'máy đang bằng với remote' khi chưa biết remote ở đâu");
    // Câu lỗi phải nói CÁCH SỬA, không chỉ nói sai — tiêu chí nghiệm thu của Đức.
    assert.match(out, /git remote -v/, "phải chỉ luôn lệnh để tự kiểm");
    ok("K2-2b · FAIL-OPEN: khong co origin/main thi safe-push CHAN, khong bao 'da bang voi remote'");
  } finally {
    assert.ok(tempRoot.startsWith(join(tmpdir(), "k2-2b-no-remote-")), "chỉ dọn đúng temp fixture no-remote");
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

/* 23d. K2-3 · safe-push quy commit theo AI ĐÃ LÀM, không theo AI ĐANG GIỮ VÙNG.
   ĐÂY LÀ CA NGUY HIỂM NHẤT của mô hình cũ, và nó im lặng: một commit của phiên khác nằm trong
   vùng mà TÔI vừa nhận thì phép quy theo-vùng nói "của tôi" → safe-push **đẩy kèm việc của họ
   mà không cảnh báo gì**. Chiều ngược lại chỉ gây chặn oan (ồn ào, ai cũng thấy); chiều này
   công bố việc chưa ai duyệt (im lặng, không ai thấy). Audit độc lập chỉ ra cặp này khi bác bản
   K2-2 đầu tiên, và đó là lý do K2-3 phải đứng TRƯỚC K2-2. */
{
  const tempRoot = mkdtempSync(join(tmpdir(), "k2-3-lane-trailer-"));
  const gitAt = (...args) => execFileSync("git", ["-c", "core.quotepath=false", ...args], { cwd: tempRoot, encoding: "utf8" });
  const put = (relPath, text) => {
    const target = join(tempRoot, ...relPath.split("/"));
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, text, "utf8");
  };
  const push = (label) => spawnSync(process.execPath, [join(tempRoot, "scripts", "safe-push.mjs"), "--as", label, "--dry-run"], {
    cwd: tempRoot, encoding: "utf8"
  });
  try {
    gitAt("init", "-b", "main");
    gitAt("config", "user.name", "K2-3 Lane");
    gitAt("config", "user.email", "k2@example.invalid");
    mkdirSync(join(tempRoot, "scripts"), { recursive: true });
    for (const name of ["repo-structure.mjs", "safe-push.mjs"]) {
      copyFileSync(new URL(`../scripts/${name}`, import.meta.url), join(tempRoot, "scripts", name));
    }
    put(".repo-structure.json", JSON.stringify({
      schema_version: 1,
      areas: { "docs/": { steward: "_docs", mutability: "rw", ownership_mode: "root" } }
    }, null, 2));
    // `_docs` là của "toi" — nên phép quy THEO VÙNG sẽ nói mọi commit trong `docs/` là của tôi.
    put(".agents/claims.json", JSON.stringify({ claims: {
      _root: { owner: null }, _docs: { owner: "toi" }
    } }, null, 2));
    put("docs/ghi-chu.md", "seed\n");
    gitAt("add", ".");
    gitAt("commit", "-m", "seed");
    gitAt("update-ref", "refs/remotes/origin/main", "HEAD");

    // Commit của NGƯỜI KHÁC, trong vùng của TÔI, mang nhãn của họ.
    put("docs/ghi-chu.md", "seed\nviec cua nguoi khac\n");
    gitAt("add", "docs/ghi-chu.md");
    gitAt("commit", "-m", "docs: viec cua nguoi khac\n\nLane: nguoi-khac");

    const r1 = push("toi");
    const out1 = `${r1.stdout}${r1.stderr}`;
    // MÔ HÌNH CŨ SẼ CHO QUA ĐÂY. Mô hình mới phải TỪ CHỐI.
    assert.match(out1, /CHỐI PUSH/,
      "commit cua phien khac phai bi tu choi DU no nam trong vung toi dang giu: " + out1.slice(0, 700));
    assert.match(out1, /lane nguoi-khac/, "va phai noi ro quy theo NHAN, khong phai theo vung");
    assert.notEqual(r1.status, 0, "tu choi thi khong duoc thoat 0");

    // Vế NGƯỢC: chính chủ nhãn thì đẩy được, dù vùng KHÔNG phải của họ (`_docs` là của "toi").
    // Đây là chiều thứ hai của cùng một lỗi cũ: mô hình theo-vùng se TU CHOI viec cua chinh ho.
    const r2 = push("nguoi-khac");
    const out2 = `${r2.stdout}${r2.stderr}`;
    assert.doesNotMatch(out2, /CHỐI PUSH/,
      "chinh chu nhan phai day duoc viec cua minh, du vung da doi chu: " + out2.slice(0, 700));
    assert.match(out2, /lane nguoi-khac — của bạn/, "va phai noi ro day la cua ho");
    assert.equal(r2.status, 0, "viec cua chinh minh thi --dry-run phai thoat 0");

    // Commit KHÔNG có nhãn: lùi về quy theo vùng, VÀ phải nói to là đang lùi.
    put("docs/ghi-chu.md", "seed\nviec cua nguoi khac\nkhong nhan\n");
    gitAt("add", "docs/ghi-chu.md");
    gitAt("commit", "-m", "docs: khong co nhan");
    const r3 = push("toi");
    const out3 = `${r3.stdout}${r3.stderr}`;
    assert.match(out3, /KHÔNG có nhãn/, "thieu nhan thi phai NOI TO la dang lui ve quy theo vung");
    assert.match(out3, /Lane: toi/, "va phai chi luon dong can them, kem dung nhan cua phien dang chay");

    // Nhãn HỎNG: fail closed — thà chặn oan mình còn hơn im lặng đẩy việc người khác.
    put("docs/ghi-chu.md", "seed\nviec cua nguoi khac\nkhong nhan\nnhan hong\n");
    gitAt("add", "docs/ghi-chu.md");
    gitAt("commit", "-m", "docs: nhan hong\n\nLane: mot\nLane: hai");
    const r4 = push("toi");
    const out4 = `${r4.stdout}${r4.stderr}`;
    assert.match(out4, /NHÃN HỎNG|LANE_XUNG_DOT/, "hai nhan khac nhau thi phai bao hong, khong duoc chon cai dau");
    assert.notEqual(r4.status, 0, "khong quy thuoc duoc thi FAIL CLOSED");
    ok("K2-3 · safe-push quy theo NHAN: commit nguoi khac trong vung cua toi bi TU CHOI; thieu nhan thi noi to; nhan hong thi fail closed");
  } finally {
    assert.ok(tempRoot.startsWith(join(tmpdir(), "k2-3-lane-trailer-")), "chỉ dọn đúng temp fixture K2-3");
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

/* 23e. K2-1 · file MÁY SINH không đòi khoá — và sửa tay vẫn phải ĐỎ.
   Hai vế, và vế thứ hai mới là vế khó: rất dễ viết một bản vá "miễn file máy sinh" rồi vô tình
   miễn luôn cả việc kiểm chứng nội dung chúng. Audit GPT 02/09 chốt đúng điều kiện: bỏ khỏi
   TRANH CHẤP QUYỀN được, bỏ khỏi KIỂM CHỨNG thì không. Nên fixture này khẳng định cả hai. */
{
  const tempRoot = mkdtempSync(join(tmpdir(), "k2-1-generated-"));
  const gitAt = (...args) => execFileSync("git", ["-c", "core.quotepath=false", ...args], { cwd: tempRoot, encoding: "utf8" });
  const put = (relPath, text) => {
    const target = join(tempRoot, ...relPath.split("/"));
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, text, "utf8");
  };
  try {
    gitAt("init", "-b", "main");
    gitAt("config", "user.name", "K2-1 Generated");
    gitAt("config", "user.email", "k2@example.invalid");
    mkdirSync(join(tempRoot, "scripts"), { recursive: true });
    for (const name of ["repo-structure.mjs", "safe-push.mjs"]) {
      copyFileSync(new URL(`../scripts/${name}`, import.meta.url), join(tempRoot, "scripts", name));
    }
    // `_root` là của NGƯỜI KHÁC. Trước K2-1, một commit chỉ sinh lại `DASHBOARD.md` sẽ quy về
    // `_root` và bị từ chối — đúng 19% lượt nhận quyền mà phép đo tìm ra.
    put(".repo-structure.json", JSON.stringify({
      schema_version: 1,
      generated: ["DASHBOARD.md", "llms.txt"],
      areas: { "docs/": { steward: "_docs", mutability: "rw", ownership_mode: "root" } }
    }, null, 2));
    put(".agents/claims.json", JSON.stringify({ claims: {
      _root: { owner: "nguoi-khac" }, _docs: { owner: null }
    } }, null, 2));
    put("DASHBOARD.md", "bang\n");
    put("llms.txt", "cong vao\n");
    put("docs/x.md", "seed\n");
    gitAt("add", ".");
    gitAt("commit", "-m", "seed");
    gitAt("update-ref", "refs/remotes/origin/main", "HEAD");

    // VẾ MỘT: commit CHỈ sinh lại artifact → không đòi khoá nào → đẩy được.
    put("DASHBOARD.md", "bang\nso moi\n");
    put("llms.txt", "cong vao\nmuc moi\n");
    gitAt("add", "DASHBOARD.md", "llms.txt");
    gitAt("commit", "-m", "chore: sinh lai artifact\n\nLane: toi");
    const r1 = spawnSync(process.execPath, [join(tempRoot, "scripts", "safe-push.mjs"), "--as", "toi", "--dry-run"], {
      cwd: tempRoot, encoding: "utf8"
    });
    const out1 = `${r1.stdout}${r1.stderr}`;
    assert.doesNotMatch(out1, /CHỐI PUSH/,
      "commit chi sinh lai artifact KHONG duoc bi tu choi — day la 19% luot nhan quyen bi xoa: " + out1.slice(0, 600));
    assert.match(out1, /chỉ thao tác hành chính|\(chỉ/, "va phai hien la khong cham vung nao");
    assert.equal(r1.status, 0, "--dry-run phai thoat 0");

    // VẾ HAI — VẾ KHÓ: tron file may sinh voi file THAT thi van doi khoa cua file that.
    // Neu ban va lam sai ve nay thi no thanh mot duong lach: nhet mot file that vao cung commit
    // voi artifact roi day di ma khong can khoa.
    put("docs/x.md", "seed\nsua noi dung that\n");
    put("DASHBOARD.md", "bang\nso moi\nthem\n");
    gitAt("add", "docs/x.md", "DASHBOARD.md");
    gitAt("commit", "-m", "docs: sua that, nup sau artifact\n\nLane: toi");
    // `_docs` trống chủ nên safe-push hiện "[trống chủ]" chứ không từ chối — điều phải khẳng
    // định là nó VẪN THẤY `_docs`, tức không bị artifact che mất.
    const r2 = spawnSync(process.execPath, [join(tempRoot, "scripts", "safe-push.mjs"), "--as", "toi", "--dry-run"], {
      cwd: tempRoot, encoding: "utf8"
    });
    assert.match(`${r2.stdout}${r2.stderr}`, /_docs/,
      "file THAT trong cung commit voi artifact van phai lo ra vung cua no — khong duoc nup sau artifact");
    ok("K2-1 · HANH VI: commit chi sinh lai artifact khong doi khoa; file that KHONG nup duoc sau artifact");
  } finally {
    assert.ok(tempRoot.startsWith(join(tmpdir(), "k2-1-generated-")), "chỉ dọn đúng temp fixture K2-1");
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

/* 23f. K2-1b · việc ĐÃ COMMIT của lane khác không phải việc MỒ CÔI của tôi.
   ĐO ĐƯỢC: 6/64 lượt nhận quyền ngày 02/09 (9%) là phiên giữ khoá vì KHÔNG PUSH ĐƯỢC, không vì
   đang làm — "DANG GIU DEN KHI PUSH XONG". Lý do phải giữ: trả quyền sớm thì file trong commit
   chưa push rơi vào vùng không chủ, và cổng phiên SAU đỏ oan. Nhãn `Lane:` tháo được ràng buộc.

   HAI VẾ, và vế hai mới là vế khó: chỉ miễn khi commit mang nhãn NGƯỜI KHÁC. Không nhãn thì giữ
   nguyên hành vi cũ — nới theo chiều "không nhãn thì cho qua" là biến bản vá thành đường lách:
   cứ bỏ nhãn là hết bị soi. */
{
  const tempRoot = mkdtempSync(join(tmpdir(), "k2-1b-orphan-"));
  const gitAt = (...args) => execFileSync("git", ["-c", "core.quotepath=false", ...args], { cwd: tempRoot, encoding: "utf8" });
  const put = (relPath, text) => {
    const target = join(tempRoot, ...relPath.split("/"));
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, text, "utf8");
  };
  const gate = () => spawnSync(process.execPath, [join(tempRoot, "scripts", "session-check.mjs"), "--as", "toi", "--quick"], {
    cwd: tempRoot, encoding: "utf8"
  });
  try {
    gitAt("init", "-b", "main");
    gitAt("config", "user.name", "K2-1b Orphan");
    gitAt("config", "user.email", "k2@example.invalid");
    mkdirSync(join(tempRoot, "scripts"), { recursive: true });
    for (const name of ["repo-structure.mjs", "session-check.mjs", "build-dashboard.mjs", "check-bootstrap.mjs", "claim.mjs"]) {
      copyFileSync(new URL(`../scripts/${name}`, import.meta.url), join(tempRoot, "scripts", name));
    }
    put(".repo-structure.json", JSON.stringify({
      schema_version: 1,
      generators: [],
      areas: { "docs/": { steward: "_docs", mutability: "rw", ownership_mode: "root" } }
    }, null, 2));
    // `_docs` TRỐNG CHỦ — đúng trạng thái sau khi một phiên trả quyền mà chưa push.
    put(".agents/claims.json", JSON.stringify({ claims: { _root: { owner: null }, _docs: { owner: null } } }, null, 2));
    put("docs/x.md", "seed\n");
    gitAt("add", ".");
    gitAt("commit", "-m", "seed");
    gitAt("update-ref", "refs/remotes/origin/main", "HEAD");

    // VẾ MỘT: commit của LANE KHÁC, đã commit, chưa push, vùng trống chủ → KHÔNG được tính là
    // việc mồ côi của tôi. Trước K2-1b đây là ĐỎ, và là lý do người ta phải giữ khoá tới lúc push.
    put("docs/x.md", "seed\nviec cua nguoi khac\n");
    gitAt("add", "docs/x.md");
    gitAt("commit", "-m", "docs: viec cua nguoi khac\n\nLane: nguoi-khac");
    const g1 = gate();
    assert.doesNotMatch(g1.stdout, /chưa khai chủ|chưa ai đứng tên/,
      "commit da co NHAN cua lane khac thi KHONG phai viec mo coi cua toi: " + g1.stdout.slice(0, 700));

    // VẾ HAI — FAIL CLOSED: cùng hoàn cảnh, nhưng commit KHÔNG có nhãn → vẫn phải ĐỎ.
    // Đây là vế chống lách. Sai vế này thì bỏ nhãn là thoát mọi phép soi.
    gitAt("reset", "--hard", "HEAD~1");
    put("docs/x.md", "seed\nkhong co nhan\n");
    gitAt("add", "docs/x.md");
    gitAt("commit", "-m", "docs: khong co nhan gi ca");
    const g2 = gate();
    assert.match(g2.stdout, /chưa ai đứng tên|chưa khai chủ/,
      "commit KHONG NHAN thi phai giu hanh vi cu — bo nhan khong duoc thanh duong lach: " + g2.stdout.slice(0, 700));

    // VẾ BA: nhãn HỎNG cũng không được miễn — không quy thuộc được thì không miễn cho ai.
    gitAt("reset", "--hard", "HEAD~1");
    put("docs/x.md", "seed\nnhan hong\n");
    gitAt("add", "docs/x.md");
    gitAt("commit", "-m", "docs: nhan hong\n\nLane: mot\nLane: hai");
    const g3 = gate();
    assert.match(g3.stdout, /chưa ai đứng tên|chưa khai chủ/,
      "nhan HONG thi khong duoc mien — fail closed: " + g3.stdout.slice(0, 700));
    ok("K2-1b · viec da commit CO NHAN cua lane khac khong phai mo coi; khong nhan / nhan hong thi VAN do");
  } finally {
    assert.ok(tempRoot.startsWith(join(tmpdir(), "k2-1b-orphan-")), "chỉ dọn đúng temp fixture K2-1b");
    rmSync(tempRoot, { recursive: true, force: true });
  }
}


/* ==========================================================================
   S2 — cổng vào: llms.txt + repo-map.json + Khối A/D
   ========================================================================== */

function s2Repo({ claims = null, generatedOnDisk = true, dirty = [], statusOverrides = null, rootStatus = false } = {}) {
  const base = fakeRepo({ dirty, statusOverrides });
  const extra = new Map([
    ["docs/studies/ALIVE.md", "---\nkind: study\nstatus: active\nttl_days: 180\n---\nCòn hạn.\n"],
    ["docs/studies/STALE.md", "---\nkind: brief\nstatus: active\nttl_days: 30\n---\nQuá hạn.\n"],
    ["docs/archive/RETIRED.md", "---\nkind: study\nstatus: archived\nttl_days: 180\n---\nĐã nghỉ.\n"],
    // Hai file nay ton tai de Khoi D con do duoc: drafts/ la thu muc DA COMMIT
    // nhung chua khai chu; node_modules/ da commit nhung phai bi mien tru.
    ["drafts/CU.md", "nhap cu"],
    ["node_modules/goi/index.js", ""],
    ["AGENTS.md", "# luật"],
    ["HANDOFF.md", "# bàn giao"]
  ]);
  if (rootStatus) {
    extra.set("STATUS.md", statusText({
      schema: "extension-status/v2", id: "extension-observer-v0", name: "Observer goc repo",
      lifecycle: "building", owner: "phien-thu-nghiem", priority_rank: "9",
      next_step: "Viec cua don vi goc", version_source: "manifest.json",
      current_focus: "Dang dung", ref_readme: "AGENTS.md", ref_handoff: "HANDOFF.md"
    }));
  }
  const generatedNames = new Set(["DASHBOARD.md", "llms.txt", "repo-map.json"]);
  if (generatedOnDisk) {
    extra.set("DASHBOARD.md", "cũ");
    extra.set("llms.txt", "cũ");
    extra.set("repo-map.json", "{}");
  }
  const dirs = new Map([
    // CO Y KHONG hardcode thu muc goc o day. Hardcode thi `listDirs("")` tra ve
    // cung mot danh sach du tren dia co gi — va mot mutation quay ve doc-tu-dia
    // se THOAT. De no tinh tu onDisk (co ca file dirty) thi phep kiem A1 moi that.
    ["docs", ["studies", "archive"]],
    ["docs/studies", []],
    ["docs/archive", []],
    ["workers", ["demo"]],
    ["workers/demo", ["v1"]]
  ]);
  const claimsJson = JSON.stringify({
    claims: claims ?? {
      "workers/demo": { owner: "codex-dashboard", ai: "codex", claimed_at: "2026-09-01", task: "Sửa cột đo. Việc phụ không tính." },
      _root: { owner: null, ai: null, task: "đã trả" }
    }
  });
  // Ngày commit cuối: STALE.md bị bỏ quên 90 ngày, các file khác vừa chạm.
  // RETIRED.md CŨNG phải thật sự cũ. Nếu nó mới thì phép kiểm "đã nghỉ hưu không
  // tính nợ" xanh vì lý do sai (nó mới), và việc gỡ điều kiện `status === active`
  // sẽ không bị bắt. Mutation M6 thoát đúng vì lý do này.
  const touched = { "docs/studies/STALE.md": "2026-05-29", "docs/archive/RETIRED.md": "2026-01-01" };
  return {
    ...base,
    fileExists: (relPath) => extra.has(relPath) || relPath === "docs" || base.fileExists(relPath),
    isFile: (relPath) => extra.has(relPath) || base.isFile(relPath),
    readFile: (relPath) => {
      if (relPath === ".agents/claims.json") return claimsJson;
      if (extra.has(relPath)) return extra.get(relPath);
      return base.readFile(relPath);
    },
    listDirs: (relPath) => dirs.get(relPath) ?? base.listDirs(relPath),
    listFiles: (relPath) => {
      const own = [...extra.keys()].filter((name) => name.startsWith(`${relPath}/`) && !name.slice(relPath.length + 1).includes("/"));
      return own.length ? own.map((name) => name.slice(relPath.length + 1)) : base.listFiles(relPath);
    },
    git: {
      ...base.git,
      lastCommitDate: (relPath) => touched[relPath] ?? "2026-08-26",
      // Tai lieu trong docs/ deu DA COMMIT trong fixture nay; ba file GENERATED thi khong.
      trackedPaths: () => [...base.git.trackedPaths(), ...[...extra.keys()].filter((k) => !generatedNames.has(k))]
    }
  };
}

/* S2-1. llms.txt đúng định dạng llmstxt.org và đủ ngắn. */
{
  const text = buildLlmsTxt(collectModel(s2Repo()));
  const lines = text.split("\n");
  assert.ok(lines[0].startsWith("# "), "dòng đầu phải là tiêu đề `#`");
  assert.ok(lines.some((line) => line.startsWith("> ")), "phải có blockquote tóm tắt");
  assert.ok(lines.filter((line) => line.startsWith("## ")).length >= 3, "phải có ít nhất 3 mục `##`");
  const linkLines = lines.filter((line) => line.startsWith("- ["));
  assert.ok(linkLines.length >= 4, "phải có link");
  for (const line of linkLines) {
    assert.match(line, /^- \[[^\]]+\]\([^)]+\): .+/, `link phải kèm mô tả một dòng: ${line}`);
  }
  assert.ok(lines.length < 50, `llms.txt phải dưới 50 dòng, đang ${lines.length}`);
  assert.match(text, /SINH TỰ ĐỘNG — ĐỪNG SỬA TAY/);
  ok("S2 llms.txt đúng định dạng llmstxt.org, mỗi link một dòng mô tả, dưới 50 dòng");
}

/* S2-2. repo-map.json giữ đủ khoá hợp đồng, kể cả khoá chưa có dữ liệu. */
{
  const map = JSON.parse(buildRepoMap(collectModel(s2Repo())));
  for (const key of ["schema_version", "generated_at", "generated_commit", "profile", "entry_point", "law_files", "top_level", "units", "active_work", "health"]) {
    assert.ok(key in map, `thiếu khoá hợp đồng: ${key}`);
  }
  assert.equal(map.schema_version, 1);
  assert.equal(map.entry_point, "llms.txt");
  for (const key of ["units_without_status", "dead_links", "undeclared_dirs", "draft_debt"]) {
    assert.equal(typeof map.health[key], "number", `health.${key} phải là số`);
  }
  const unit = map.units.find((item) => item.path === "workers/demo/v1");
  // Từ S3, STATUS đã khai các trường v2 nên chúng có giá trị thật. Hai luật vẫn phải giữ:
  // (a) khoá LUÔN có mặt, kể cả khi không có dữ liệu — phía đọc không phải phân biệt
  // "không có" với "chưa hỗ trợ"; (b) `owner` lấy từ STATUS chứ KHÔNG từ claims.json.
  for (const key of ["next_step", "superseded_by", "owner", "priority_rank"]) {
    assert.ok(key in unit, `khoá hợp đồng "${key}" phải luôn có mặt`);
  }
  assert.equal(unit.superseded_by, null, "không khai thì phải là null, không phải chuỗi rỗng");
  assert.equal(unit.owner, "phien-thu-nghiem", "owner lấy từ STATUS");
  assert.notEqual(unit.owner, "codex-dashboard", "và TUYỆT ĐỐI không lấy từ claims.json");
  assert.equal(map.active_work.length, 1, "đơn vị có next_step phải xuất hiện trong active_work");
  ok("S2 repo-map.json giữ nguyên hình dạng hợp đồng, trường chưa có dữ liệu vẫn giữ khoá");
}

/* S2-3. Bốn con số nợ đếm đúng, không bịa miễn trừ. */
{
  const model = collectModel(s2Repo());
  assert.equal(model.health.units_without_status, 1, "chỉ _root thiếu STATUS trong fixture");
  assert.equal(model.health.draft_debt, 1, "đúng một tài liệu active quá ttl_days");
  // node_modules bị bỏ; docs + drafts chưa khai chủ; workers đã khai qua workers/demo.
  assert.equal(model.health.undeclared_dirs, 2, "docs/ và drafts/ chưa khai chủ");
  assert.ok(model.topLevel.every((entry) => entry.path !== "node_modules/"), "node_modules không được tính");
  const workers = model.topLevel.find((entry) => entry.path === "workers/");
  assert.equal(workers.owner_declared, true, "workers/ đã khai qua khoá workers/demo");
  ok("S2 Khối D đếm đúng bốn loại nợ, chỉ miễn trừ node_modules");
}

/* S2-4. Tài liệu đã nghỉ hưu thì cũ là đúng, không tính nợ. */
{
  const model = collectModel(s2Repo());
  const retired = model.docs.find((doc) => doc.path === "docs/archive/RETIRED.md");
  assert.equal(retired.status, "archived");
  assert.equal(retired.overdue, false, "status khác active thì không bao giờ tính quá hạn");
  assert.ok(retired.age_days > retired.ttl_days, "fixture phải THỰC SỰ quá tuổi, nếu không phép kiểm này xanh vì lý do sai");
  ok("S2 chỉ `status: active` mới bị tính là tài liệu quá hạn");
}

/* S2-5. REGRESSION: nội dung sinh ra KHÔNG được phụ thuộc vào việc file đã tồn tại chưa.
   Bug thật gặp lúc dựng S2: lần chạy đầu, repo-map.json chưa có trên đĩa nên chính nó
   bị đếm là "link chết", và artifact ra khác lần chạy thứ hai. Artifact máy sinh mà
   không tất định thì cổng kiểm HEAD-vs-HEAD vô nghĩa. */
{
  const withFiles = collectModel(s2Repo({ generatedOnDisk: true }));
  const withoutFiles = collectModel(s2Repo({ generatedOnDisk: false }));
  assert.equal(withoutFiles.health.dead_links, withFiles.health.dead_links, "số link chết không được đổi theo việc file sinh đã có hay chưa");
  assert.equal(buildLlmsTxt(withoutFiles), buildLlmsTxt(withFiles), "llms.txt phải tất định");
  assert.equal(buildRepoMap(withoutFiles), buildRepoMap(withFiles), "repo-map.json phải tất định");
  assert.equal(withFiles.health.dead_links, 0, "fixture không có link chết thật");
  ok("S2 artifact tất định — không tự đếm mình là link chết ở lần chạy đầu");
}

/* S2-6. Link chết THẬT thì vẫn phải bị bắt. */
{
  const base = s2Repo();
  const model = collectModel({ ...base, isFile: (relPath) => relPath === "AGENTS.md" ? false : base.isFile(relPath) });
  assert.equal(model.health.dead_links, 1, "AGENTS.md biến mất phải bị đếm là link chết");
  assert.match(buildLlmsTxt(model), /LINK CHẾT/);
  ok("S2 link chết thật vẫn bị bắt và hiện ngay trong llms.txt");
}

/* S2-7. Khối A nằm TRÊN bảng, Khối D nằm dưới, và Khối A nói được việc ưu tiên #1. */
{
  const text = buildDashboard(collectModel(s2Repo()));
  const posA = text.indexOf("## A · Bắt đầu từ đâu");
  const posB = text.indexOf("## B · Có gì trong repo");
  const posD = text.indexOf("## D · Sức khoẻ điều hướng [ĐO]");
  assert.ok(posA > -1 && posB > -1 && posD > -1, "phải có đủ ba khối");
  assert.ok(posA < posB && posB < posD, "thứ tự phải là A trước bảng, D sau bảng");
  assert.match(text, /Việc ưu tiên #1.*CHƯA KHAI/s);
  assert.match(text, /Ai đang giữ package nào.*claims.json/s, "Khối A phải TRỎ tới claims.json chứ không chép nội dung nó");
  assert.match(text, /Phiên gần nhất.*HANDOFF\.md/s);
  ok("S2 Khối A trên cùng nói được việc ưu tiên #1, Khối D nằm dưới bảng");
}

/* S2-8. REGRESSION: GIÁ TRỊ owner trong claims.json không được lọt vào artifact.
   Phép kiểm 22 đã ghim luật này từ trước S2. Bản thiết kế Khối A đầu tiên của tôi
   vi phạm nó (lấy claim đang mở làm "việc ưu tiên #1"), nên thiết kế bị sửa chứ
   không phải phép kiểm. Claim đổi vài lần mỗi phiên; artifact mà bám theo nó thì
   lúc nào cũng cũ, và cổng kiểm đỏ cho phiên sau. */
{
  const held = collectModel(s2Repo());
  const released = collectModel(s2Repo({ claims: { "workers/demo": { owner: null }, _root: { owner: null } } }));
  assert.equal(buildDashboard(released), buildDashboard(held), "nhận/trả quyền không được đổi DASHBOARD");
  assert.equal(buildLlmsTxt(released), buildLlmsTxt(held), "nhận/trả quyền không được đổi llms.txt");
  assert.equal(buildRepoMap(released), buildRepoMap(held), "nhận/trả quyền không được đổi repo-map.json");
  assert.doesNotMatch(buildRepoMap(held), /codex-dashboard/, "tên phiên đang giữ không được nằm trong artifact");
  ok("S2 giá trị owner của claims.json không lọt vào artifact — chỉ tập khoá mới được dùng");
}

/* S2-8b. Khi S3 khai next_step vào STATUS thì Khối A phải tự có việc ưu tiên #1. */
{
  const model = collectModel(s2Repo());
  const withNext = { ...model, rows: model.rows.map((row) => row.key === "workers/demo/v1" ? { ...row, nextStep: "Đo lại trần 90 giây" } : row) };
  withNext.priority = { unit: "workers/demo/v1", title: "Đo lại trần 90 giây", statusPath: "workers/demo/v1/STATUS.md" };
  assert.match(buildDashboard(withNext), /Việc ưu tiên #1.*Đo lại trần 90 giây/s);
  const map = JSON.parse(buildRepoMap(withNext));
  assert.equal(map.active_work.length, 1, "có next_step thì active_work phải có một mục");
  assert.equal(map.units.find((u) => u.path === "workers/demo/v1").next_step, "Đo lại trần 90 giây");
  ok("S2 đã nối sẵn đường cho S3: có next_step là Khối A và active_work tự đầy");
}

/* S2-9. So repo-map.json bỏ qua hai trường đổi theo commit, nhưng bắt thay đổi thật. */
{
  const model = collectModel(s2Repo());
  const generated = buildRepoMap(model);
  const onlyStamp = JSON.parse(generated);
  onlyStamp.generated_commit = "deadbee";
  onlyStamp.generated_at = "1999-01-01";
  assert.equal(compareRepoMap(generated, `${JSON.stringify(onlyStamp, null, 2)}\n`).matches, true, "đổi mỗi dấu commit thì không được coi là lệch");

  const realChange = JSON.parse(generated);
  realChange.health.undeclared_dirs = 999;
  const verdict = compareRepoMap(generated, `${JSON.stringify(realChange, null, 2)}\n`);
  assert.equal(verdict.matches, false, "đổi số thật phải bị bắt");
  assert.ok(verdict.line > 0, "phải chỉ được dòng lệch");

  assert.equal(compareRepoMap(generated, "{khong-phai-json").matches, false, "JSON hỏng phải bị bắt");
  ok("S2 so repo-map.json bỏ qua dấu commit, vẫn bắt đúng thay đổi thật và JSON hỏng");
}

/* S2-10. Chế độ --check phải kiểm CẢ BA file, không chỉ DASHBOARD. */
{
  const base = s2Repo();
  const model = collectModel(base);
  const fresh = {
    "DASHBOARD.md": buildDashboard(model),
    "llms.txt": buildLlmsTxt(model),
    "repo-map.json": buildRepoMap(model)
  };
  const run = (overrides) => {
    const errors = [];
    const files = { ...fresh, ...overrides };
    const code = runDashboard({
      check: true,
      deps: {
        ...base,
        fileExists: (relPath) => relPath in files ? files[relPath] !== null : base.fileExists(relPath),
        readFile: (relPath) => relPath in files ? files[relPath] : base.readFile(relPath),
        writeFile: () => { throw new Error("check mode không được ghi"); }
      },
      output: { log: () => {}, error: (message) => errors.push(message) }
    });
    return { code, errors: errors.join(" | ") };
  };
  assert.equal(run({}).code, 0, "ba file tươi thì phải xanh");
  assert.match(run({ "llms.txt": "# sai\n" }).errors, /llms\.txt/, "llms.txt cũ phải bị bắt");
  assert.match(run({ "repo-map.json": '{"schema_version":1}' }).errors, /repo-map\.json/, "repo-map.json cũ phải bị bắt");
  assert.match(run({ "llms.txt": null }).errors, /llms\.txt đang thiếu/, "thiếu llms.txt phải bị bắt");
  ok("S2 --check kiểm cả ba file cổng, thiếu hay cũ đều đỏ");
}

/* ==========================================================================
   VÒNG SỬA SAU AUDIT — mỗi phép kiểm dưới đây ghim đúng một phát hiện mà
   auditor độc lập (Codex, 2026-09-02) tìm ra và tôi đã tự kiểm chứng lại.
   ========================================================================== */

/* A1. PHÁT HIỆN 1 — trạng thái CHƯA COMMIT không được lọt vào artifact.
   Đo thật trước khi sửa: tạo một thư mục rác chưa track rồi sinh lại thì
   `undeclared_dirs` nhảy 7 → 8. Commit con số đó lên là cổng kiểm ĐỎ OAN cho
   phiên sau, vì cổng dựng lại từ HEAD và HEAD không có thư mục rác đó. */
{
  const clean = collectModel(s2Repo());
  const withJunk = collectModel(s2Repo({ dirty: [
    "rac-chua-track/ghi-chu.md",       // cả một thư mục top-level mới
    "docs/studies/CHUA-TRACK.md",       // một tài liệu chưa commit
    "workers/demo/v1/tests/ba.mjs",     // một file test chưa commit
    "workers/moi-toanh/v1/manifest.json" // cả một package chưa commit
  ] }));

  assert.equal(withJunk.health.undeclared_dirs, clean.health.undeclared_dirs,
    "thư mục chưa track không được làm đổi số nợ");
  assert.equal(withJunk.health.draft_debt, clean.health.draft_debt,
    "tài liệu chưa track không được làm đổi số nợ");
  assert.equal(withJunk.rows.length, clean.rows.length,
    "package chưa commit không được hiện trong bảng đã commit");
  const demo = withJunk.rows.find((row) => row.key === "workers/demo/v1");
  assert.equal(demo.testFiles, clean.rows.find((row) => row.key === "workers/demo/v1").testFiles,
    "file test chưa commit không được làm đổi cột File test [ĐO]");

  assert.equal(buildDashboard(withJunk), buildDashboard(clean), "DASHBOARD phải y hệt");
  assert.equal(buildLlmsTxt(withJunk), buildLlmsTxt(clean), "llms.txt phải y hệt");
  assert.equal(buildRepoMap(withJunk), buildRepoMap(clean), "repo-map.json phải y hệt");
  ok("SAU-AUDIT trạng thái chưa commit (thư mục, tài liệu, test, package) không lọt vào artifact");
}

/* A2. PHÁT HIỆN 4 — `claims.json` hỏng phải BÁO ĐỎ, không được im lặng bỏ qua.
   Bản trước nuốt lỗi và trả `{}`, nghĩa là mọi thư mục thành "chưa khai chủ",
   con số nợ nhảy vọt, và không một dòng nào nói vì sao. */
{
  const base = s2Repo();
  const broken = { ...base, readFile: (relPath) => relPath === ".agents/claims.json" ? "{khong-phai-json" : base.readFile(relPath) };
  assert.throws(() => collectModel(broken), /CLAIMS_HONG/, "claims.json hỏng phải ném lỗi có mã tra được");

  const noBlock = { ...base, readFile: (relPath) => relPath === ".agents/claims.json" ? '{"gi-do":1}' : base.readFile(relPath) };
  assert.throws(() => collectModel(noBlock), /CLAIMS_THIEU_KHOI/, "claims.json thiếu khối claims phải ném lỗi");
  ok("SAU-AUDIT claims.json hỏng làm bộ sinh dừng lại, không âm thầm khai bừa là chưa ai khai");
}

/* A3. PHÁT HIỆN 5 — hạn dùng không đọc được thì TÍNH NỢ, không được âm thầm tha.
   `Number("ba-mươi")` ra NaN, `NaN > ttl` là false, nên tài liệu đó lặng lẽ thoát
   khỏi mọi phép đếm. Một trường gõ sai làm khoản nợ TÀNG HÌNH — đúng thứ Khối D
   sinh ra để chống. */
{
  const mk = (frontmatter) => {
    const base = s2Repo();
    return { ...base, readFile: (relPath) => relPath === "docs/studies/ALIVE.md" ? frontmatter : base.readFile(relPath) };
  };
  const debtOf = (fm) => {
    const doc = collectModel(mk(fm)).docs.find((item) => item.path === "docs/studies/ALIVE.md");
    return doc;
  };

  const badTtl = debtOf("---\nkind: study\nstatus: active\nttl_days: ba-muoi\n---\n");
  assert.equal(badTtl.overdue, true, "ttl_days không phải số phải bị tính là nợ");
  assert.equal(badTtl.unprovable, true, "và phải được đánh dấu là không chứng minh được");

  assert.equal(debtOf("---\nkind: study\nstatus: active\nttl_days:\n---\n").overdue, true, "ttl_days rỗng phải bị tính là nợ");
  assert.equal(debtOf("---\nkind: loai-la\nstatus: active\n---\n").overdue, true, "kind lạ, không suy ra được hạn, phải bị tính là nợ");

  // Chiều ngược lại: khai đúng và còn hạn thì KHÔNG được báo oan.
  const good = debtOf("---\nkind: study\nstatus: active\nttl_days: 180\n---\n");
  assert.equal(good.overdue, false, "khai đúng và còn hạn thì không được báo oan");
  // Và đã nghỉ hưu thì hạn hỏng cũng không phải nợ của ai.
  assert.equal(debtOf("---\nkind: study\nstatus: archived\nttl_days: ba-muoi\n---\n").overdue, false,
    "tài liệu đã nghỉ hưu thì không tính nợ dù hạn dùng hỏng");
  ok("SAU-AUDIT hạn dùng không đọc được thì tính là nợ, không âm thầm tha");
}

/* A4. MUTATION THOÁT SỐ 1 — gỡ `validateStatus` ra khỏi đường chạy thì cả suite
   vẫn xanh. Đây là loại "xoá chỗ gọi" mà repo này đã trả giá một lần: mọi phép
   kiểm đơn vị vẫn gọi thẳng hàm đó nên vẫn xanh, chỉ sợi dây NỐI nó vào bộ sinh
   là đứt. Ghim ở tầng tích hợp, qua nhiều luật khác nhau. */
{
  const withStatus = (overrides) => collectModel(s2Repo({ statusOverrides: overrides }));

  assert.throws(() => withStatus({ schema: "extension-status/v0" }), /extension-status\/v2/,
    "schema sai phải bị chặn NGAY TRONG collectModel");
  assert.throws(() => withStatus({ lifecycle: "khong-co-that" }), /khong-co-that/,
    "lifecycle lạ phải bị chặn ngay trong collectModel");
  assert.throws(() => withStatus({ id: "khac-package" }), /khac-package/,
    "id không thuộc package phải bị chặn ngay trong collectModel");
  assert.throws(() => withStatus({ last_verified_commit: "khong-phai-sha" }), /khong-phai-sha/,
    "SHA sai dạng phải bị chặn ngay trong collectModel");
  ok("SAU-AUDIT validateStatus được ghim ở tầng tích hợp qua 4 luật, gỡ chỗ gọi là đỏ");
}

/* A5. MUTATION THOÁT SỐ 2 — thay `priority: priorityFrom(sortedRows)` bằng
   `priority: null` thì suite cũ vẫn xanh, vì phép kiểm S2-8b tự tay gán
   `withNext.priority` thay vì để `collectModel` tự suy ra. Nay bơm `next_step`
   vào ĐÚNG frontmatter của STATUS và bắt bộ sinh tự tìm ra. */
{
  const model = collectModel(s2Repo({ statusOverrides: { next_step: "Đo lại trần 90 giây", priority_rank: "1" } }));
  assert.ok(model.priority, "collectModel phải TỰ suy ra việc ưu tiên từ next_step của STATUS");
  assert.equal(model.priority.title, "Đo lại trần 90 giây");
  assert.equal(model.priority.unit, "workers/demo/v1");
  assert.equal(model.priority.rank, 1, "thứ hạng phải lấy từ priority_rank đã khai");
  assert.match(buildDashboard(model), /Việc ưu tiên #1.*Đo lại trần 90 giây/s);
  assert.match(buildLlmsTxt(model), /Đo lại trần 90 giây/);
  const map = JSON.parse(buildRepoMap(model));
  assert.equal(map.active_work.length, 1);
  assert.equal(map.units.find((u) => u.path === "workers/demo/v1").next_step, "Đo lại trần 90 giây");
  ok("SAU-AUDIT việc ưu tiên #1 do collectModel tự suy ra từ STATUS, không phải do test gán tay");
}

/* A6. MUTATION THOÁT SỐ 3 — bỏ hai trường xuất xứ khỏi repo-map thì không
   assertion nào kêu. Đây là hai trường trả lời câu "kiểm chứng lần cuối khi nào,
   ở commit nào" — thiếu chúng thì hợp đồng cross-repo mất khả năng truy nguồn. */
{
  const map = JSON.parse(buildRepoMap(collectModel(s2Repo())));
  const unit = map.units.find((item) => item.path === "workers/demo/v1");
  assert.equal(unit.last_verified, "2026-08-26", "repo-map phải giữ ngày kiểm chứng cuối");
  assert.equal(unit.last_verified_commit, "a".repeat(40), "repo-map phải giữ commit kiểm chứng cuối");
  assert.equal(unit.status_md, "workers/demo/v1/STATUS.md");
  assert.equal(unit.lifecycle, "active");
  ok("SAU-AUDIT repo-map giữ đủ trường truy nguồn (ngày + commit kiểm chứng cuối)");
}

/* ==========================================================================
   VÒNG AUDIT GPT — hai lỗ hổng test GPT tìm ra và tôi đã tự kiểm chứng:
   cả hai mutation dưới đây THOÁT được suite 51 phép kiểm.
   ========================================================================== */

/* B1. GPT-1 — xoá vòng lặp liệt kê extension khỏi `llms.txt` thì suite vẫn xanh,
   vì phép kiểm cũ chỉ đếm "có ít nhất 4 link" — đúng bằng số link lõi. Cổng vào
   mất sạch phần quan trọng nhất (repo có extension gì) mà không ai kêu. */
{
  const model = collectModel(s2Repo());
  const text = buildLlmsTxt(model);
  const withStatus = model.rows.filter((row) => row.statusPath);
  assert.ok(withStatus.length > 0, "fixture phải có ít nhất một đơn vị đã khai STATUS");
  for (const row of withStatus) {
    assert.ok(text.includes(row.statusPath), `llms.txt phải liệt kê ${row.statusPath}`);
    assert.ok(text.includes(row.name), `llms.txt phải nêu tên ${row.name}`);
  }
  // Và mục "Từng extension" không được rỗng khi có đơn vị thật.
  const section = text.split("## Từng extension")[1] ?? "";
  assert.equal((section.match(/^- \[/gm) ?? []).length, withStatus.length,
    "mục Từng extension phải có đúng một dòng cho mỗi đơn vị đã khai STATUS");
  ok("SAU-GPT llms.txt liệt kê ĐỦ từng extension, không chỉ đủ số link lõi");
}

/* B2. GPT-2 — xoá riêng một dòng khỏi bảng Khối D thì suite vẫn xanh, vì phép
   kiểm cũ đọc con số trong model chứ không đọc bảng đã render. Nợ biến mất khỏi
   thứ Đức thật sự nhìn. */
{
  const text = buildDashboard(collectModel(s2Repo()));
  const block = text.split("## D · Sức khoẻ điều hướng [ĐO]")[1] ?? "";
  for (const label of [
    "Đơn vị chưa khai STATUS",
    "Link chết trong file cổng",
    "Thư mục top-level chưa khai chủ",
    "Tài liệu quá hạn chưa rà"
  ]) {
    assert.ok(block.includes(label), `Khối D phải render dòng "${label}"`);
  }
  const rows = (block.match(/^\| [^|]+ \| \d+ \|/gm) ?? []).length;
  assert.equal(rows, 4, "Khối D phải có ĐÚNG bốn dòng nợ có số, không thiếu dòng nào");
  ok("SAU-GPT Khối D render đủ bốn dòng nợ, không chỉ đúng bốn con số trong model");
}

/* B3. GPT-4 — cổng kiểm không được tự kiểm mình bằng một bộ kiểm đang sửa dở.
   Phép kiểm 7 chạy `scripts/build-dashboard.mjs` ở WORKING TREE để phán xem
   artifact đã commit có khớp HEAD không. Một bản sửa dở của chính bộ sinh đó có
   thể làm cổng nói dối. Ghim: bộ sinh phải khai được nó đang chạy bản nào. */
{
  const text = readFileSync(new URL("../scripts/session-check.mjs", import.meta.url), "utf8");
  assert.match(text, /verifierMatchesHead|GENERATOR_DIRTY/,
    "session-check phải có bước kiểm chính bộ sinh trước khi tin kết quả của nó");
  ok("SAU-GPT cổng kiểm có bước xác nhận bộ sinh chưa bị sửa dở trước khi tin nó");
}

/* ==========================================================================
   AUDIT VÒNG 2 (Codex) — gốc bệnh và ba mutation còn thoát.
   ========================================================================== */

/* C1. VÒNG 2 PHÁT HIỆN 1 (gốc bệnh) — nội dung file ĐÃ TRACK nhưng SỬA DỞ vẫn
   lọt vào artifact. Vòng 1 tôi mới vá phần LIỆT KÊ; phần ĐỌC NỘI DUNG vẫn từ đĩa,
   nên chỉ cần sửa một STATUS.md chưa commit là cả ba artifact đổi theo. Tôi tự
   dựng lại ca đó trên repo thật và thấy đúng.
   Vá gốc: bộ sinh đọc HOÀN TOÀN TỪ HEAD ở cả hai chế độ; đĩa chỉ dùng để ghi. */
{
  const base = s2Repo();
  // Cùng một tập file đã commit, nhưng "trên đĩa" nội dung đã bị sửa.
  const dirtyContent = {
    ...base,
    readFile: (relPath) => {
      const clean = base.readFile(relPath);
      if (relPath === "workers/demo/v1/STATUS.md") return clean.replace("Kiểm tra dashboard", "NOI_DUNG_SUA_DO");
      if (relPath === "docs/studies/ALIVE.md") return "---\nkind: study\nstatus: active\nttl_days: 1\n---\n";
      return clean;
    }
  };
  const clean = collectModel(base);
  const dirty = collectModel(dirtyContent);

  // Đây là hợp đồng: hai model chỉ khác nhau khi nội dung ĐÃ COMMIT khác nhau.
  // Với deps thật, `readFile` lấy blob HEAD nên nhánh "sửa dở" không tồn tại.
  assert.notEqual(buildDashboard(dirty), buildDashboard(clean),
    "fixture phải THỰC SỰ tạo ra khác biệt, nếu không phép kiểm này xanh vì lý do sai");
  ok("SAU-VONG2 fixture chứng minh được nội dung khác nhau thì artifact khác nhau");
}

/* C2. VÒNG 2 — deps thật phải đọc từ HEAD, không đọc từ đĩa.
   Ghim ở tầng hợp đồng: bộ đọc mặc định và bộ đọc HEAD phải là CÙNG một đường.
   Nếu ai đó trả `readFile` về `fs.readFileSync` thì phép kiểm này đỏ. */
{
  // Đo THẬT trên một repo git tạm, không dò văn bản nguồn. Bản đầu của phép kiểm này
  // dò chuỗi `readFile: (relPath) => fs.readFileSync`, và một mutation chỉ cần đổi tên
  // tham số thành `(r)` là lách qua — tôi đã thử và nó thoát thật. Dò văn bản nguồn là
  // phép kiểm giả: nó ghim CÁCH VIẾT, không ghim HÀNH VI.
  const tempRoot = mkdtempSync(join(tmpdir(), "head-only-reads-"));
  try {
    const gitAt = (...args) => execFileSync("git", ["-c", "core.quotepath=false", ...args], { cwd: tempRoot, encoding: "utf8" });
    const put = (relPath, text) => {
      const target = join(tempRoot, ...relPath.split("/"));
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, text, "utf8");
    };
    gitAt("init", "-b", "main");
    gitAt("config", "user.name", "Head Only Test");
    gitAt("config", "user.email", "headonly@example.invalid");
    put("docs/ghi-chu.md", "NOI_DUNG_DA_COMMIT\n");
    put("thu-muc-da-commit/x.md", "x\n");
    gitAt("add", ".");
    gitAt("commit", "-m", "seed");

    const deps = createDefaultDeps(tempRoot);
    assert.equal(deps.readFile("docs/ghi-chu.md").trim(), "NOI_DUNG_DA_COMMIT", "nền: đọc được nội dung đã commit");

    // Giờ sửa trên đĩa mà KHÔNG commit, và thêm cả thư mục lẫn file chưa track.
    put("docs/ghi-chu.md", "NOI_DUNG_SUA_DO\n");
    put("thu-muc-chua-track/y.md", "y\n");
    assert.equal(deps.readFile("docs/ghi-chu.md").trim(), "NOI_DUNG_DA_COMMIT",
      "readFile phải trả nội dung ĐÃ COMMIT, không phải bản sửa dở trên đĩa");
    const tracked = deps.git.trackedPaths();
    assert.ok(tracked.includes("docs/ghi-chu.md"), "nền: file đã commit phải có trong danh sách");
    assert.ok(!tracked.some((p) => p.startsWith("thu-muc-chua-track/")),
      "file chưa track không được xuất hiện trong danh sách");
    assert.equal(deps.fileExists("thu-muc-chua-track/y.md"), false,
      "file chưa track phải được coi là KHÔNG tồn tại");
    ok("SAU-VONG2 bộ đọc mặc định đọc từ HEAD trên repo git thật, bản sửa dở không lọt");
  } finally {
    assert.ok(tempRoot.startsWith(join(tmpdir(), "head-only-reads-")), "chỉ dọn đúng temp fixture của phép kiểm này");
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

/* C3. VÒNG 2 PHÁT HIỆN 2 — `readClaims` còn hai lối im lặng: thiếu hẳn file, và
   `{"claims": []}` (mảng lọt qua phép kiểm typeof object). */
{
  const base = s2Repo();
  const missing = {
    ...base,
    fileExists: (relPath) => relPath === ".agents/claims.json" ? false : base.fileExists(relPath)
  };
  assert.throws(() => collectModel(missing), /CLAIMS_THIEU_FILE/,
    "claims.json là bảng chủ sở hữu bắt buộc — thiếu hẳn file phải dừng, không chạy tiếp với bảng rỗng");

  const asArray = {
    ...base,
    readFile: (relPath) => relPath === ".agents/claims.json" ? '{"claims":[]}' : base.readFile(relPath)
  };
  assert.throws(() => collectModel(asArray), /CLAIMS_THIEU_KHOI/,
    "claims phải là object, mảng rỗng không được lọt");

  // Ngược lại: bảng rỗng hợp lệ vẫn phải chạy được.
  const emptyOk = {
    ...base,
    readFile: (relPath) => relPath === ".agents/claims.json" ? '{"claims":{}}' : base.readFile(relPath)
  };
  assert.doesNotThrow(() => collectModel(emptyOk), "claims rỗng hợp lệ thì vẫn phải chạy");
  ok("SAU-VONG2 claims.json thiếu file hoặc sai kiểu đều bị chặn, rỗng hợp lệ vẫn chạy");
}

/* C4. VÒNG 2 PHÁT HIỆN 3 + MUTATION 3 — hai lối cuối còn im lặng tha nợ:
   `kind` lạ NHƯNG có ttl_days rõ ràng, và ngày commit sai định dạng cho NaN
   (không phải null) nên lọt qua phép kiểm `age === null`. */
{
  const mk = (frontmatter, touchedDate) => {
    const base = s2Repo();
    return {
      ...base,
      readFile: (relPath) => relPath === "docs/studies/ALIVE.md" ? frontmatter : base.readFile(relPath),
      git: { ...base.git, lastCommitDate: (relPath) => relPath === "docs/studies/ALIVE.md" && touchedDate ? touchedDate : base.git.lastCommitDate(relPath) }
    };
  };
  const doc = (fm, date) => collectModel(mk(fm, date)).docs.find((item) => item.path === "docs/studies/ALIVE.md");

  const badDate = doc("---\nkind: study\nstatus: active\nttl_days: 180\n---\n", "2026-99-99");
  assert.equal(badDate.overdue, true, "ngày commit không phân giải được phải bị tính là nợ, không được tha");
  assert.equal(badDate.unprovable, true);

  // CỐ Ý không tính nợ ở đây. Audit Codex đề nghị "kind lạ thì tính nợ dù có
  // ttl_days"; tôi thử và thấy đó là BÁO OAN — hai file `kind: spec` vừa commit, có
  // `ttl_days` đàng hoàng, lập tức bị gọi là quá hạn. `ttl_days` khai thẳng thì hạn
  // dùng LÀ chứng minh được. Còn "kind lạ có hợp lệ không" là việc của cổng kiểm
  // schema (S4), không phải của phép đếm quá hạn.
  const strangeKindWithTtl = doc("---\nkind: loai-la\nstatus: active\nttl_days: 180\n---\n", "2026-08-26");
  assert.equal(strangeKindWithTtl.overdue, false, "kind lạ NHƯNG có ttl_days rõ ràng thì không được báo oan");
  const strangeKindNoTtl = doc("---\nkind: loai-la\nstatus: active\n---\n", "2026-08-26");
  assert.equal(strangeKindNoTtl.overdue, true, "kind lạ VÀ không có ttl_days thì không suy ra được hạn — tính nợ");

  const good = doc("---\nkind: study\nstatus: active\nttl_days: 180\n---\n", "2026-08-26");
  assert.equal(good.overdue, false, "khai đúng, kind hợp lệ, ngày hợp lệ thì không được báo oan");
  ok("SAU-VONG2 kind lạ và ngày hỏng đều bị tính là nợ, không còn lối im lặng nào");
}

/* C5. VÒNG 2 PHÁT HIỆN 4 — submodule ở tầng gốc bị git trả về như một đường dẫn
   KHÔNG có dấu "/", nên bị xếp nhầm là FILE và không bao giờ vào bảng chủ sở hữu. */
{
  const base = s2Repo();
  const withSubmodule = {
    ...base,
    git: {
      ...base.git,
      // Đúng như git thật trả về: `ls-tree -r --name-only` cho ra một cái tên TRƠN,
      // không có dấu "/", nên phân loại theo chuỗi sẽ xếp nhầm nó là file. Chỉ
      // `ls-tree` (không -r) mới khai kiểu đối tượng là "commit".
      trackedPaths: () => [...base.git.trackedPaths(), "vendor"],
      gitlinksAtRoot: () => ["vendor"]
    }
  };
  const model = collectModel(withSubmodule);
  assert.ok(model.topLevel.some((entry) => entry.path === "vendor/"),
    "submodule ở tầng gốc phải xuất hiện trong bảng chủ sở hữu, không được biến mất");
  assert.equal(model.health.undeclared_dirs, collectModel(base).health.undeclared_dirs + 1,
    "và phải được đếm vào nợ, vì chưa ai đứng tên nó");
  ok("SAU-VONG2 submodule ở tầng gốc vẫn được tính vào thư mục chưa khai chủ");
}

/* ==========================================================================
   PATCH TÀI LIỆU — bốn quyết định kỹ thuật, mỗi cái một phép kiểm ghim.
   ========================================================================== */

/* D1. Thứ hạng phải do NGƯỜI khai. Máy không được đoán, và không được chọn bừa
   khi có tranh chấp. Bản trước lấy phần tử đầu sau khi sắp theo đường dẫn, nên khi
   schema v2 bắt mọi đơn vị khai `next_step` thì "ưu tiên #1" lặng lẽ thành "việc
   của package đứng đầu bảng chữ cái". */
{
  // (a) Tu S3, thu hang la BAT BUOC voi don vi con song — bo trong bi chan ngay o
  // tang validate, tuc CHAT HON viec chi hien "CHUA XEP HANG". Nhanh "chua xep hang"
  // trong priorityFrom van con, va van duoc ghim truc tiep o phep kiem D2 duoi day:
  // no la lop phong cho repo chua migrate, khong phai duong di binh thuong nua.
  assert.throws(() => collectModel(s2Repo({ statusOverrides: { next_step: "Việc gì đó", priority_rank: "" } })),
    /priority_rank/, "don vi con song bo trong thu hang phai bi chan ngay khi validate");
  assert.throws(() => collectModel(s2Repo({ statusOverrides: { next_step: "Việc gì đó", priority_rank: "0" } })),
    /priority_rank/, "hang 0 cung bi chan");
  // Va don vi da nghi huu thi KHONG bi doi thu hang — bat no khai mot con so vo nghia
  // chi tao rac.
  assert.doesNotThrow(() => collectModel(s2Repo({ statusOverrides: {
    lifecycle: "superseded", superseded_by: "workers/demo/v1", priority_rank: "", next_step: ""
  } })), "don vi da nghi huu khong bi doi thu hang hay viec ke tiep");

  // (b) Khai rõ thì lấy đúng cái hạng nhỏ nhất.
  const ranked = collectModel(s2Repo({ statusOverrides: { next_step: "Việc số một", priority_rank: "1" } }));
  assert.equal(ranked.priority.unit, "workers/demo/v1");
  assert.equal(JSON.parse(buildRepoMap(ranked)).active_work.length, 1);
  assert.equal(JSON.parse(buildRepoMap(ranked)).units.find((u) => u.path === "workers/demo/v1").priority_rank, 1);
  ok("PATCH thứ hạng lấy từ priority_rank; không ai khai thì nói CHƯA XẾP HẠNG chứ không đoán");
}

/* D2. Hai đơn vị cùng khai hạng nhỏ nhất = XUNG ĐỘT. Máy phải NÓI RA, không
   được chọn bừa một cái — chọn bừa là con số sai trông rất hợp lý. */
{
  const row = (key, rank, step) => ({ key, priorityRank: rank, nextStep: step, statusPath: key + "/STATUS.md" });

  const conflict = priorityFrom([row("workers/a/v1", 1, "Việc A"), row("workers/b/v1", 1, "Việc B")]);
  assert.equal(conflict.conflict, true, "hai đơn vị cùng hạng 1 phải là xung đột");
  assert.deepEqual(conflict.units, ["workers/a/v1", "workers/b/v1"], "và phải nêu ĐỦ tên cả hai");

  const clear = priorityFrom([row("workers/z/v1", 1, "Việc Z"), row("workers/a/v1", 2, "Việc A")]);
  assert.equal(clear.unit, "workers/z/v1", "hạng nhỏ nhất thắng, KHÔNG phải thứ tự bảng chữ cái");

  const noRank = priorityFrom([row("workers/a/v1", null, "Việc A")]);
  assert.equal(noRank.unranked, true, "có next_step mà không có hạng thì nói chưa xếp hạng");

  assert.equal(priorityFrom([row("workers/a/v1", 1, "")]), null, "không có next_step thì không có việc ưu tiên");

  // Và bảng phải hiện xung đột ra cho người đọc, không nuốt.
  const model = collectModel(s2Repo());
  const shown = buildDashboard({ ...model, priority: conflict });
  assert.match(shown, /XUNG ĐỘT/);
  assert.ok(shown.includes("workers/a/v1"), "phải nêu tên đơn vị đang tranh chấp");
  ok("PATCH hai đơn vị cùng hạng 1 bị báo XUNG ĐỘT, hạng nhỏ nhất thắng chứ không phải bảng chữ cái");
}

/* D3. `compareRepoMap` bỏ qua GIÁ TRỊ dấu commit nhưng vẫn ĐÒI khoá có mặt.
   Bản trước xoá vô điều kiện, nên một repo-map mất hẳn hai trường xuất xứ vẫn được
   coi là khớp — hợp đồng cross-repo mất khả năng truy nguồn mà cổng vẫn xanh. */
{
  const generated = buildRepoMap(collectModel(s2Repo()));

  const otherStamp = JSON.parse(generated);
  otherStamp.generated_commit = "deadbee";
  otherStamp.generated_at = "1999-01-01";
  assert.equal(compareRepoMap(generated, `${JSON.stringify(otherStamp, null, 2)}\n`).matches, true,
    "đổi GIÁ TRỊ dấu commit thì vẫn phải coi là khớp");

  for (const [label, mutate] of [
    ["thiếu hẳn", (map) => { delete map.generated_commit; }],
    ["rỗng", (map) => { map.generated_commit = "  "; }],
    ["sai kiểu", (map) => { map.generated_commit = 12345; }]
  ]) {
    const broken = JSON.parse(generated);
    mutate(broken);
    const verdict = compareRepoMap(generated, `${JSON.stringify(broken, null, 2)}\n`);
    assert.equal(verdict.matches, false, `trường xuất xứ ${label} phải bị bắt`);
    assert.match(verdict.reason ?? "", /generated_commit/, "và lỗi phải nêu đúng tên trường");
  }
  ok("PATCH compareRepoMap bỏ qua giá trị dấu commit nhưng vẫn đòi khoá có mặt, đúng kiểu");
}

/* D4. Cắt câu không được cắt gãy cú pháp markdown. Đức nhìn thấy đúng ca này trong
   llms.txt: một link bị cắt giữa chừng thành "[nhãn](docs/..." nuốt hết phần sau. */
{
  const long = (tail) => `${"x".repeat(150)} ${tail}`;
  const build = (focus) => buildLlmsTxt(collectModel(s2Repo({ statusOverrides: { current_focus: focus } })));

  const withLink = build(long("[hướng dẫn](docs/huong-dan.md) và thêm nữa"));
  const line = withLink.split("\n").find((entry) => entry.includes("xxx"));
  assert.ok(line, "phải tìm được dòng bị cắt");
  const afterLabel = line.slice(line.indexOf("xxx"));
  const opens = (afterLabel.match(/\(/g) ?? []).length;
  const closes = (afterLabel.match(/\)/g) ?? []).length;
  assert.equal(opens, closes, `cắt xong không được để lại dấu ngoặc lẻ: ${afterLabel.slice(-60)}`);
  assert.ok(!/\[[^\]]*$/.test(afterLabel), "không được để lại dấu [ mở mà chưa đóng");

  const withTick = build(long("dùng `một-lệnh-rất-dài-nào-đó` rồi thôi"));
  const tickLine = withTick.split("\n").find((entry) => entry.includes("xxx"));
  assert.equal(((tickLine.slice(tickLine.indexOf("xxx")).match(/`/g) ?? []).length % 2), 0,
    "không được để lại backtick lẻ");
  ok("PATCH cắt câu dài không làm gãy link markdown hay backtick");
}

/* ==========================================================================
   AUDIT VÒNG 3 (Codex) — bốn phát hiện và ba mutation còn thoát.
   ========================================================================== */

/* E1. VÒNG 3 PHÁT HIỆN 1 — `priority_rank:` bỏ TRỐNG cho `Number("") === 0`, và 0 là
   số nhỏ nhất nên nó THẮNG mọi đơn vị khai đàng hoàng, lặng lẽ. */
{
  assert.equal(rankOf(""), null, "rỗng thì không phải hạng");
  assert.equal(rankOf("   "), null, "toàn khoảng trắng cũng vậy");
  assert.equal(rankOf(undefined), null);
  assert.equal(rankOf("0"), null, "hạng 0 là dữ liệu hỏng, không phải ưu tiên cao nhất");
  assert.equal(rankOf("-1"), null, "hạng âm cũng vậy");
  assert.equal(rankOf("1.5"), null, "hạng phải là số nguyên");
  assert.equal(rankOf("abc"), null);
  assert.equal(rankOf("2"), 2);
  assert.equal(rankOf(" 3 "), 3, "khoảng trắng thừa vẫn đọc được");

  // Va nhanh trong priorityFrom van dung khi du lieu den tu noi khac (repo chua migrate).
  assert.equal(priorityFrom([{ key: "a", priorityRank: rankOf(""), nextStep: "Việc A", lifecycle: "active", statusPath: "a" }]).unranked,
    true, "rank rong phai thanh chua xep hang, khong duoc thanh hang 0");
  ok("SAU-VONG3 priority_rank rỗng/0/âm/thập phân đều không phải hạng, không lén thắng");
}

/* E2. VÒNG 3 PHÁT HIỆN 2 — `active_work` mang hình dạng MẢNG nhưng chỉ chứa được
   0-hoặc-1. Tôi lấy lý do "diễn tả được nhiều việc song song" để chốt kiểu mảng rồi
   lại không sống theo nó. */
{
  const model = collectModel(s2Repo({ statusOverrides: { next_step: "Việc của demo", priority_rank: "2" } }));
  const twoJobs = {
    ...model,
    rows: model.rows.map((row) => row.key === "_root"
      ? { ...row, nextStep: "Việc của gốc repo", priorityRank: 1 }
      : row)
  };
  const work = JSON.parse(buildRepoMap(twoJobs)).active_work;
  assert.equal(work.length, 2, "hai đơn vị có next_step thì active_work phải có hai mục");
  assert.equal(work[0].unit, "_root", "xếp theo HẠNG: hạng 1 đứng trước");
  assert.equal(work[0].rank, 1);
  assert.equal(work[1].rank, 2);

  // Đơn vị chưa xếp hạng vẫn phải có mặt, và nằm cuối.
  const mixed = { ...model, rows: model.rows.map((row) => row.key === "_root" ? { ...row, nextStep: "Chưa xếp hạng", priorityRank: null } : row) };
  const mixedWork = JSON.parse(buildRepoMap(mixed)).active_work;
  assert.equal(mixedWork.length, 2);
  assert.equal(mixedWork[mixedWork.length - 1].rank, null, "chưa xếp hạng thì nằm cuối, rank null");
  ok("SAU-VONG3 active_work chứa 0..n việc, xếp theo hạng, chưa xếp hạng nằm cuối");
}

/* E3. VÒNG 3 PHÁT HIỆN 3 — `safeTruncate` vẫn để lọt một dấu mở treo khi có cặp
   ngoặc cân bằng đứng SAU nó: "… [treo (ổn) …". So `lastIndexOf` bị qua mặt. */
{
  const build = (focus) => buildLlmsTxt(collectModel(s2Repo({ statusOverrides: { current_focus: focus } })));
  const balanced = (text) => {
    const stack = [];
    const pairs = { "]": "[", ")": "(" };
    for (const ch of text) {
      if (ch === "[" || ch === "(") stack.push(ch);
      else if (pairs[ch] && stack[stack.length - 1] === pairs[ch]) stack.pop();
    }
    return stack.length === 0;
  };
  for (const tail of [
    "[treo (ổn) rồi thêm nữa cho dài ra",
    "[nhãn](docs/x.md) và tiếp tục dài",
    "(mở tròn [rồi vuông] mà chưa đóng tròn",
    "dùng `lệnh-dài-quá-cỡ` rồi nói thêm"
  ]) {
    const line = build(`${"x".repeat(150)} ${tail}`).split("\n").find((entry) => entry.includes("xxx"));
    const cut = line.slice(line.indexOf("xxx"));
    assert.ok(balanced(cut), `cắt xong phải cân ngoặc: ${cut.slice(-70)}`);
    assert.equal(((cut.match(/`/g) ?? []).length % 2), 0, `và không được để backtick lẻ: ${cut.slice(-70)}`);
  }
  ok("SAU-VONG3 cắt câu cân được cả ngoặc lồng nhau, không bị cặp cân bằng phía sau che");
}

/* E4. MUTATION THOÁT SỐ 1 — xoá chỗ gọi `safeTruncate` thì suite cũ vẫn xanh, vì các
   ví dụ trong phép kiểm đều CÂN khi không bị cắt. Không assertion nào đòi có trần độ dài. */
{
  const long = `${"y".repeat(400)} hết`;
  const text = buildLlmsTxt(collectModel(s2Repo({ statusOverrides: { current_focus: long } })));
  const line = text.split("\n").find((entry) => entry.includes("yyy"));
  const note = line.slice(line.indexOf("yyy"));
  assert.ok(note.length <= 170, `phần mô tả phải bị cắt về dưới trần, đang ${note.length} ký tự`);
  assert.ok(note.endsWith("…"), "và phải có dấu … cho người đọc biết là đã cắt");
  ok("SAU-VONG3 mô tả dài bị cắt về đúng trần và có dấu …, không chỉ cân ngoặc");
}

/* E5. MUTATION THOÁT SỐ 2 — đổi `profile` sang giá trị khác thì không ai kêu, vì phép
   kiểm cũ chỉ hỏi "khoá có tồn tại không". `profile` là thứ hệ điều phối cấp cao dùng
   để biết đọc repo này theo luật nào; sai giá trị là đọc sai cả repo. */
{
  const map = JSON.parse(buildRepoMap(collectModel(s2Repo())));
  assert.equal(map.profile, "P1", "repo này là monorepo nhiều gói — profile phải đúng P1");
  assert.equal(map.entry_point, "llms.txt");
  assert.equal(map.schema_version, 1);
  assert.deepEqual(map.law_files, ["AGENTS.md", "CLAUDE.md"]);
  ok("SAU-VONG3 hợp đồng ghim GIÁ TRỊ của profile/entry_point/schema_version, không chỉ sự tồn tại");
}

/* E6. MUTATION THOÁT SỐ 3 — chỉ kiểm `generated_commit` mà bỏ `generated_at` thì lọt,
   vì mọi phép kiểm âm tính cũ chỉ đụng vào một trong hai trường. */
{
  const generated = buildRepoMap(collectModel(s2Repo()));
  for (const key of ["generated_at", "generated_commit"]) {
    for (const [label, value] of [["thiếu hẳn", undefined], ["rỗng", "  "], ["sai kiểu", 12345]]) {
      const broken = JSON.parse(generated);
      if (value === undefined) delete broken[key]; else broken[key] = value;
      const verdict = compareRepoMap(generated, `${JSON.stringify(broken, null, 2)}\n`);
      assert.equal(verdict.matches, false, `${key} ${label} phải bị bắt`);
      assert.ok((verdict.reason ?? "").includes(key), `và lỗi phải nêu đúng tên trường ${key}`);
    }
  }
  ok("SAU-VONG3 CẢ HAI trường xuất xứ đều được kiểm, không chỉ generated_commit");
}

/* E7. VÒNG 3 MỤC 4.2 — đơn vị gốc repo phải ĐỌC ĐƯỢC `STATUS.md` như mọi đơn vị khác.
   Bản trước ghim cứng `missingStatus: true`, nên phiên S3 có tạo file đó thì con số nợ
   vẫn không nhúc nhích — đề bài không thể đạt mục tiêu của chính nó. */
{
  const withRoot = collectModel(s2Repo({ rootStatus: true }));
  const rootRow = withRoot.rows.find((row) => row.key === "_root");
  assert.equal(rootRow.missingStatus, false, "gốc repo có STATUS.md thì không được coi là thiếu");
  assert.equal(rootRow.lifecycle, "building", "và phải lấy lifecycle từ chính file đó");
  assert.equal(rootRow.statusPath, "STATUS.md");
  assert.equal(withRoot.health.units_without_status, collectModel(s2Repo()).health.units_without_status - 1,
    "khai STATUS ở gốc phải làm con số nợ giảm đúng 1");
  assert.ok(buildLlmsTxt(withRoot).includes("STATUS.md"), "và đơn vị gốc phải xuất hiện ở cổng vào");
  ok("SAU-VONG3 đơn vị gốc repo đọc được STATUS.md, khai xong là nợ giảm thật");
}

/* E8. VÒNG 3 MỤC 4.3 + 4.4 — `lifecycle: superseded` phải hợp lệ, và khai nó mà không
   nói thay bằng bản nào thì phải ĐỎ. BRIEF-S3 bảo khai `superseded`; nếu bộ kiểm từ
   chối thì đề bài và bộ kiểm đánh nhau. */
{
  const base = { statusPath: "workers/demo/v1/STATUS.md", fileExists: () => true, isFile: () => true,
    readFile: () => '{"name":"D","version":"1.0.0"}', git: { verifyCommit: () => true } };
  const fm = (extra) => ({ ...validFm(), lifecycle: "superseded", ...extra });

  const missing = validateStatus(fm({}), base);
  assert.ok(missing.some((message) => message.includes("superseded_by")), "superseded mà thiếu superseded_by phải đỏ");

  const complete = validateStatus(fm({ superseded_by: "workers/demo/v1" }), base);
  assert.deepEqual(complete, [], "khai đủ thì không được kêu");

  // Và các lifecycle khác KHÔNG bị đòi superseded_by.
  assert.deepEqual(validateStatus(validFm(), base), [], "lifecycle khác không bị đòi superseded_by");
  ok("SAU-VONG3 lifecycle superseded hợp lệ, và bắt buộc superseded_by CÓ ĐIỀU KIỆN");
}

/* E9. VÒNG 3 MỤC 1 — bộ sinh không được phụ thuộc hệ thống file ở đường ĐỌC nữa.
   `realPath` là thứ cuối cùng còn kéo đĩa vào: xoá một file khỏi working tree trong khi
   HEAD vẫn có nó thì bộ sinh chết, kèm thông báo dẫn sai hướng hoàn toàn. */
{
  const source = readFileSync(new URL("../scripts/build-dashboard.mjs", import.meta.url), "utf8");
  const block = source.slice(source.indexOf("export function createDefaultDeps"), source.indexOf("export function createHeadDeps"));
  assert.doesNotMatch(block, /realPath:/, "createDefaultDeps không được cung cấp realPath — nó kéo đĩa vào đường đọc");
  // Phép kiểm hành vi đi kèm nằm ở khối "bộ đọc mặc định đọc từ HEAD" phía trên; ở đây
  // chỉ ghim thêm rằng luật CHUỖI (chặn "..") vẫn còn nguyên, tức là không nới lỏng.
  const deps = { statusPath: "workers/demo/v1/STATUS.md", packageDir: "workers/demo/v1", packageId: "demo",
    fileExists: () => true, isFile: () => true, readFile: () => "{}", git: { verifyCommit: () => true } };
  const escaped = validateStatus({ ...validFm(), version_source: "workers/demo/v1/../../khac/manifest.json" }, deps);
  assert.ok(escaped.some((message) => message.includes("version_source")), 'luật chuỗi vẫn phải chặn ".."');
  ok("SAU-VONG3 realPath đã gỡ khỏi đường đọc, luật chuỗi chặn \"..\" vẫn nguyên");
}

/* E10. AUDIT GPT — ba lo cuoi. */
{
  // (a) Ban da nghi huu khong duoc lam viec uu tien so 1.
  const row = (key, rank, step, lifecycle) => ({ key, priorityRank: rank, nextStep: step, lifecycle, statusPath: key + "/STATUS.md" });
  const picked = priorityFrom([
    row("workers/cu/v1", 2, "Cho xoa sau khi V2 chay on", "superseded"),
    row("workers/moi/v2", 1, "Viec that", "active")
  ]);
  assert.equal(picked.unit, "workers/moi/v2", "ban superseded khong duoc xet, ban con song hang 1 duoc chon");

  // Tuong tac dang chu y: neu hang 1 lai nam tren mot ban DA NGHI HUU thi ban con song
  // thap nhat la hang 2 -> he bao CHUA CO HANG 1 thay vi lang le don hang 2 len. Do la
  // dung: no noi cho chu repo biet thu hang cua ho dang gan sai cho.
  const misplaced = priorityFrom([
    row("workers/cu/v1", 1, "Da nghi", "superseded"),
    row("workers/moi/v2", 2, "Viec that", "active")
  ]);
  assert.equal(misplaced.norank1, true, "hang 1 gan cho ban da nghi huu thi phai bao ra");
  assert.equal(priorityFrom([row("workers/cu/v1", 1, "x", "archived")]), null, "archived cung vay");

  // (b) Ma commit phai dung hinh dang, khong nhan rac.
  const generated = buildRepoMap(collectModel(s2Repo()));
  for (const [key, bad] of [["generated_commit", "khac123"], ["generated_commit", "ZZZZZZZ"], ["generated_at", "hom-qua"], ["generated_at", "2026-13-99x"]]) {
    const broken = JSON.parse(generated); broken[key] = bad;
    const verdict = compareRepoMap(generated, `${JSON.stringify(broken, null, 2)}\n`);
    assert.equal(verdict.matches, false, key + " = " + bad + " phai bi bat");
    assert.ok((verdict.reason ?? "").includes("hình dạng"), "va phai noi ro la sai hinh dang");
  }
  // Ma commit that thi phai qua.
  const okMap = JSON.parse(generated); okMap.generated_commit = "a1b2c3d";
  assert.equal(compareRepoMap(generated, `${JSON.stringify(okMap, null, 2)}\n`).matches, true, "ma commit that phai qua");

  // (c) Cong kiem khong duoc tra "on" khi khong hoi duoc git.
  const gate = readFileSync(new URL("../scripts/session-check.mjs", import.meta.url), "utf8");
  assert.match(gate, /VERIFIER_UNKNOWN/, "git hong thi cong phai noi khong biet, khong duoc noi on");
  assert.ok(!gate.includes("return true; // không hỏi được git"), "khong duoc quay ve fail-open");
  ok("SAU-GPT superseded khong lam uu tien 1, ma commit phai dung hinh dang, cong fail-closed khi git hong");
}

/* ==========================================================================
   AUDIT VÒNG 4 — ba lớp mới. Codex tự chạy suite lần này (73/73), nên con số
   không còn là lời khai.
   ========================================================================== */

/* F1. VÒNG 4 MỤC 2 — hạng nhỏ nhất phải LÀ 1. Nếu cả repo chỉ có hạng 2 và 3 thì
   `Math.min` vẫn chọn ra hạng 2 và trình bày nó như "việc ưu tiên #1" — một con số
   không ai khai là số 1 mà trông y như thật. */
{
  const row = (key, rank, step) => ({ key, priorityRank: rank, nextStep: step, lifecycle: "active", statusPath: key + "/STATUS.md" });

  const noOne = priorityFrom([row("workers/a/v1", 2, "A"), row("workers/b/v1", 3, "B")]);
  assert.equal(noOne.norank1, true, "khong co hang 1 thi phai noi ra, khong duoc lay hang 2 lam so 1");
  assert.equal(noOne.lowest, 2, "va phai noi ro hang nho nhat dang la bao nhieu");

  const good = priorityFrom([row("workers/a/v1", 1, "A"), row("workers/b/v1", 2, "B")]);
  assert.equal(good.unit, "workers/a/v1", "co hang 1 thi chon dung no");

  // Va phai hien ra cho nguoi doc, khong nuot.
  const model = collectModel(s2Repo());
  const shown = buildDashboard({ ...model, priority: noOne });
  assert.ok(shown.includes("CHƯA CÓ HẠNG 1"), "bang phai noi ro chua ai khai hang 1");
  ok("SAU-VONG4 khong co hang 1 thi bao ra, khong lay hang nho nhat lam so 1");
}

/* F2. VÒNG 4 MỤC 4 — `superseded_by` trỏ tới thứ không tồn tại thì lời khai vô giá
   trị: người đọc đi theo và lạc. Bản trước chỉ kiểm "có khai hay không". */
{
  // Chi "workers/demo/v2" va cac duong dan chuan la co that; moi thu khac la bia.
  const base = { statusPath: "workers/demo/v1/STATUS.md",
    fileExists: (p) => p === "workers/demo/v2" || REQUIRED_PATHS.has(p),
    isFile: () => true, readFile: () => '{"name":"D","version":"1.0.0"}', git: { verifyCommit: () => true } };
  const fm = (target) => ({ ...validFm(), lifecycle: "superseded", superseded_by: target, priority_rank: "", next_step: "" });

  for (const bad of ["banana", "workers/missing/v999", "../outside", "./workers/demo/v2"]) {
    const errors = validateStatus(fm(bad), base);
    assert.ok(errors.some((message) => message.includes("superseded_by")), `superseded_by "${bad}" phai bi bat`);
  }
  assert.deepEqual(validateStatus(fm("workers/demo/v2"), base), [], "tro toi thu co that thi phai qua");
  ok("SAU-VONG4 superseded_by phai tro toi thu CO THAT, khong nhan duong dan bia");
}

/* F3. VÒNG 4 MỤC 3 — đơn vị GỐC repo không có `packageDir` nên toàn bộ khối ràng buộc
   danh tính bị bỏ qua: `STATUS.md` ở gốc có thể trỏ `version_source` sang package khác
   và lấy số đo của người ta. */
{
  const base = { statusPath: "STATUS.md", rootUnit: true, fileExists: () => true, isFile: () => true,
    readFile: () => '{"name":"D","version":"1.0.0"}', git: { verifyCommit: () => true } };
  const errors = validateStatus({ ...validFm(), version_source: "workers/duc-auto-gemini/v0.2.0/manifest.json" }, base);
  assert.ok(errors.some((message) => message.includes("version_source")), "don vi goc tro version_source vao thu muc con phai bi chan");

  assert.deepEqual(validateStatus({ ...validFm(), version_source: "manifest.json" }, base), [],
    "tro dung file o tang ngoai cung thi phai qua");
  ok("SAU-VONG4 don vi goc repo khong lay duoc so do cua package khac");
}

/* F4. VÒNG 4 MỤC 7 — ngày phải CÓ THẬT, không chỉ đúng định dạng. "2026-13-99" khớp
   regex nhưng không tồn tại trên lịch. */
{
  const generated = buildRepoMap(collectModel(s2Repo()));
  for (const bad of ["2026-13-99", "2026-02-30", "0000-00-00"]) {
    const broken = JSON.parse(generated); broken.generated_at = bad;
    const verdict = compareRepoMap(generated, `${JSON.stringify(broken, null, 2)}\n`);
    assert.equal(verdict.matches, false, `ngay khong co that "${bad}" phai bi bat`);
  }
  const okMap = JSON.parse(generated); okMap.generated_at = "2026-02-28";
  assert.equal(compareRepoMap(generated, `${JSON.stringify(okMap, null, 2)}\n`).matches, true, "ngay co that phai qua");
  ok("SAU-VONG4 ngay xuat xu phai co that tren lich, khong chi dung dinh dang");
}

/* F5. S3 — `next_step` bắt buộc CÓ ĐIỀU KIỆN: đơn vị còn sống phải khai, đơn vị đã
   nghỉ hưu thì không. Không ghim thì gỡ hẳn luật này đi mà suite vẫn xanh. */
{
  const base = { statusPath: "workers/demo/v1/STATUS.md", fileExists: (p) => REQUIRED_PATHS.has(p) || p === "workers/demo/v2",
    isFile: () => true, readFile: () => '{"name":"D","version":"1.0.0"}', git: { verifyCommit: () => true } };

  const live = validFm(); delete live.next_step;
  assert.ok(validateStatus(live, base).some((m) => m.includes("next_step")), "don vi con song thieu next_step phai do");

  const liveNoRank = validFm(); delete liveNoRank.priority_rank;
  assert.ok(validateStatus(liveNoRank, base).some((m) => m.includes("priority_rank")), "don vi con song thieu priority_rank phai do");

  const retired = { ...validFm(), lifecycle: "superseded", superseded_by: "workers/demo/v2" };
  delete retired.next_step; delete retired.priority_rank;
  assert.deepEqual(validateStatus(retired, base), [], "don vi da nghi huu KHONG bi doi next_step hay priority_rank");
  ok("SAU-VONG4 next_step va priority_rank bat buoc dung cho don vi con song");
}

/* F6. S3 — nguồn khai chủ là `.repo-structure.json` (tầng LAW), KHÔNG phải
   `.agents/claims.json` (tầng STATE). Fixture phải CÓ file đó, nếu không thì một
   mutation "quay về đọc claims" sẽ thoát vì hai đường cho cùng kết quả. */
{
  const base = s2Repo();
  const structure = JSON.stringify({ schema_version: 1, profile: "P1", areas: {
    "docs/": { steward: "_root" }, "workers/": { steward: null, ownership_mode: "per-package" }
  } });
  const withAreas = {
    ...base,
    fileExists: (p) => p === ".repo-structure.json" ? true : base.fileExists(p),
    readFile: (p) => p === ".repo-structure.json" ? structure : base.readFile(p),
    git: { ...base.git, trackedPaths: () => [...base.git.trackedPaths(), ".repo-structure.json"] }
  };
  const model = collectModel(withAreas);
  const declared = model.topLevel.filter((entry) => entry.owner_declared).map((entry) => entry.path).sort();
  assert.deepEqual(declared, ["docs/", "workers/"], "chi thu muc khai trong areas moi duoc tinh la co chu");
  // `drafts/` co trong claims? Khong. Nhung diem chinh: `node_modules/` bi mien tru va
  // `drafts/` KHONG co trong areas nen phai bi dem la no — ket qua khac han duong claims.
  assert.ok(model.topLevel.some((entry) => entry.path === "drafts/" && !entry.owner_declared),
    "drafts/ khong co trong areas thi phai bi dem la chua khai chu");

  // Va file hong thi phai bao do, khong am tham lui ve claims.
  const broken = { ...withAreas, readFile: (p) => p === ".repo-structure.json" ? "{khong-phai-json" : withAreas.readFile(p) };
  assert.throws(() => collectModel(broken), /CAU_TRUC_HONG/, ".repo-structure.json hong phai bao do");
  const noAreas = { ...withAreas, readFile: (p) => p === ".repo-structure.json" ? '{"schema_version":1}' : withAreas.readFile(p) };
  assert.throws(() => collectModel(noAreas), /CAU_TRUC_THIEU_AREAS/, "thieu khoi areas phai bao do");
  ok("SAU-VONG4 chu thu muc lay tu .repo-structure.json, file hong thi bao do chu khong lui ve claims");
}
/* K1 (2026-09-02) — HÌNH DẠNG ĐƠN VỊ THAM SỐ HOÁ.
   Trước K1, bộ sinh đóng cứng "workers" và "manifest.json". Đó là hình dạng riêng của repo
   Chrome, không phải luật chung — nên bộ MÁY không đi được sang repo khác dù bộ LUẬT đã sạch
   91% tên dự án. Ghim: (a) không khai thì y như cũ, (b) khai sai thì NÉM chứ không âm thầm
   lùi về mặc định, (c) khai hình dạng khác thì tìm đúng đơn vị ở chỗ khác — đo trên repo git
   THẬT, vì đó là điều duy nhất chứng minh được tính di động. */
{
  const cfg = (obj) => ({
    fileExists: (p) => p === ".repo-structure.json",
    readFile: () => JSON.stringify(obj)
  });

  assert.deepEqual(readUnits({ fileExists: () => false }), DEFAULT_UNITS,
    "repo chua co .repo-structure.json thi phai dung hinh dang mac dinh");
  assert.deepEqual(readUnits(cfg({ schema_version: 1 })), DEFAULT_UNITS,
    "khong khai khoi units thi phai dung mac dinh — day la loi tuong thich nguoc");
  assert.equal(DEFAULT_UNITS.rootDir, "workers", "mac dinh phai la hinh dang cu cua repo Chrome");
  assert.equal(DEFAULT_UNITS.marker, "manifest.json", "mac dinh phai la hinh dang cu cua repo Chrome");

  assert.deepEqual(readUnits(cfg({ units: { root_dir: "packages", marker: "package.json", depth: 1 } })),
    { rootDir: "packages", marker: "package.json", depth: 1, ten: "Đơn vị" }, "khai du ba truong thi phai doc dung ca ba");
  assert.equal(readUnits(cfg({ units: { depth: 3 } })).rootDir, "workers",
    "khai thieu truong thi truong do lay mac dinh");
  assert.equal(readUnits(cfg({ units: { root_dir: null } })).rootDir, null,
    "root_dir null la hop le — repo khong co don vi con");

  // FAIL CLOSED. Khai sai mà lặng lẽ lùi về mặc định là kiểu hỏng tệ nhất: bảng vẫn sinh ra,
  // trông như thật, và đếm đơn vị ở SAI thư mục.
  for (const [bad, why] of [
    [{ units: [] }, "units la mang"],
    [{ units: { root_dir: "a/b" } }, "root_dir co dau gach cheo"],
    [{ units: { root_dir: "" } }, "root_dir rong"],
    [{ units: { marker: "" } }, "marker rong"],
    [{ units: { marker: "docs/x.json" } }, "marker co duong dan"],
    [{ units: { depth: 0 } }, "depth 0"],
    [{ units: { depth: 9 } }, "depth qua sau"],
    [{ units: { depth: "2" } }, "depth la chuoi"]
  ]) {
    assert.throws(() => readUnits(cfg(bad)), /UNITS_HONG/, `khai sai (${why}) phai NEM, khong duoc lui ve mac dinh`);
  }
  ok("K1 hinh dang don vi doc tu cau hinh; khong khai thi y nhu cu, khai sai thi nem");
}

{
  // Phép kiểm di động THẬT: một repo có layout khác hẳn repo Chrome —
  // `packages/<ten>/package.json`, KHÔNG có tầng phiên bản. Bản trước K1 sẽ tìm trong
  // "workers/" và trả về 0 đơn vị con; bản sau phải tìm đúng `packages/alpha`.
  const tempRoot = mkdtempSync(join(tmpdir(), "units-shape-"));
  try {
    const gitAt = (...args) => execFileSync("git", ["-c", "core.quotepath=false", ...args], { cwd: tempRoot, encoding: "utf8" });
    const put = (relPath, text) => {
      const target = join(tempRoot, ...relPath.split("/"));
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, text, "utf8");
    };
    gitAt("init", "-b", "main");
    gitAt("config", "user.name", "Units Shape Test");
    gitAt("config", "user.email", "units@example.invalid");
    put(".repo-structure.json", JSON.stringify({
      schema_version: 1,
      units: { root_dir: "packages", marker: "package.json", depth: 1 },
      areas: { "packages/": {}, "docs/": {}, "workers/": {} }
    }));
    put(".agents/claims.json", JSON.stringify({ claims: {} }));
    // MỒI BẪY, cố ý: repo tạm CÓ luôn `workers/` với một đơn vị hợp lệ. Không có mồi này thì
    // hai phép kiểm dưới đều RỖNG — "không tìm trong workers/" đúng một cách vô nghĩa vì
    // workers/ không tồn tại, và một đột biến lùi `root_dir: null` về "workers" vẫn thoát.
    // Đo thật: đột biến đó ĐÃ thoát ở bản đầu của phép kiểm này.
    put("workers/legacy/package.json", JSON.stringify({ name: "Goi Cu", version: "1.0.0" }));
    put("packages/alpha/package.json", JSON.stringify({ name: "Goi Alpha", version: "2.0.0" }));
    put("packages/alpha/README.md", "readme\n");
    put("docs/ghi-chu.md", "---\nkind: study\nstatus: active\nttl_days: 90\n---\nx\n");
    gitAt("add", ".");
    gitAt("commit", "-m", "seed");

    const model = collectModel(createDefaultDeps(tempRoot), { tolerant: true });
    const keys = model.rows.map((row) => row.key);
    assert.ok(keys.includes("packages/alpha"),
      `phai tim thay don vi o layout khac; dang thay: ${JSON.stringify(keys)}`);
    assert.ok(!keys.some((k) => k.startsWith("workers/")),
      "khong duoc con tim trong workers/ khi cau hinh da khai packages/");
    assert.equal(model.units.marker, "package.json", "model phai lo hinh dang ra cho cong kiem cau truc doc");

    put(".repo-structure.json", JSON.stringify({
      schema_version: 1,
      units: { root_dir: null, marker: "package.json", depth: 1 },
      areas: { "packages/": {}, "docs/": {}, "workers/": {} }
    }));
    gitAt("add", ".");
    gitAt("commit", "-m", "khong co don vi con");
    const bare = collectModel(createDefaultDeps(tempRoot), { tolerant: true });
    assert.deepEqual(bare.rows.map((row) => row.key), ["_root"],
      "root_dir null thi chi con don vi GOC — day la ca cua repo trong, tuc phep thu repo rong");
    ok("K1 bo may tim dung don vi tren repo git THAT co layout khac han, va chiu duoc repo khong co don vi con");
  } finally {
    assert.ok(tempRoot.startsWith(join(tmpdir(), "units-shape-")), "chi don dung temp fixture cua phep kiem nay");
    rmSync(tempRoot, { recursive: true, force: true });
  }
}


/* Y-03 (2026-09-02) — trường `human_action`: việc đang chờ tay Đức.
   GIAI ĐOẠN 1 là TUỲ CHỌN có chủ đích: lúc thêm trường, gói gg-flow-video đang do phiên khác
   giữ nên không sửa được: bắt buộc ngay là cổng đỏ vì việc của người khác. Luật chung của mọi
   lần đổi lược đồ — không đòi hỏi được thứ mà người khai chưa có.
   Nhưng KHAI RỖNG thì phải đỏ: rỗng làm bảng không phân biệt được "không có gì chờ Đức" với
   "chưa ai trả lời câu đó", và hai thứ đó khác nhau hoàn toàn. */
{
  assert.deepEqual(validateStatus(validFm(), validationDeps()), [],
    "khong khai human_action thi VAN hop le — giai doan 1 la tuy chon");

  for (const bad of ["", "   ", "\t"]) {
    const errors = validateStatus(validFm({ human_action: bad }), validationDeps());
    assert.ok(errors.some((m) => m.includes("human_action")),
      `human_action khai rong (${JSON.stringify(bad)}) phai do — rong khac voi "khong"`);
  }

  assert.deepEqual(validateStatus(validFm({ human_action: "không" }), validationDeps()), [],
    '"khong" la mot cau tra loi hop le: da tra loi, va khong co gi cho');
  assert.deepEqual(validateStatus(validFm({ human_action: "Nạp lại tiện ích ở từng hồ sơ." }), validationDeps()), [],
    "khai mot cau tieng Viet la hop le");
  ok("Y-03 human_action: tuy chon o giai doan 1, nhung khai RONG thi do");
}


console.log(`\n${passed} passed, 0 failed, ${passed} total`);
