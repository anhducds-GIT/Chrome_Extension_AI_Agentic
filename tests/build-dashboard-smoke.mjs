import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, sep } from "node:path";

import { buildDashboard, buildLlmsTxt, buildRepoMap, collectModel, compareRepoMap, createHeadDeps, detectStatusMachineOwnedFacts, parsePorcelain, parseStatus, runDashboard, STAMP_PREFIX, validateStatus } from "../scripts/build-dashboard.mjs";

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
    fileExists: (relPath) => onDisk.has(relPath) || relPath === "workers/demo/v1/tests" || relPath === "tests",
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
    assert.match(run.stdout, /\[XANH\] Sự thật máy sinh còn tươi/, `${label}: Gate 7 phải XANH`);
    assert.doesNotMatch(run.stdout, /\[BỎ  \] Sự thật máy sinh còn tươi/, `${label}: --quick không được bỏ Gate 7`);
    assert.doesNotMatch(run.stderr, /CỔNG BỊ SỬA/, `${label}: số phép kiểm phải khớp EXPECTED_CHECKS`);
  };

  try {
    gitAt("init", "-b", "main");
    gitAt("config", "user.name", "Gate 7 Test");
    gitAt("config", "user.email", "gate7@example.invalid");
    mkdirSync(join(tempRoot, "scripts"), { recursive: true });
    for (const name of ["build-dashboard.mjs", "feature-parity.mjs", "session-check.mjs"]) {
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
    assert.notEqual(stale.status, 0, "artifact stale đã commit phải làm cổng đỏ");
    assert.match(stale.stdout, /\[ĐỎ  \] Sự thật máy sinh còn tươi/);
    assert.match(stale.stdout, /build-dashboard\.mjs không khớp với HEAD/);
    assert.match(stale.stdout, /feature-parity\.mjs không khớp với HEAD/);
    assert.match(stale.stdout, /node scripts\/build-dashboard\.mjs && node scripts\/feature-parity\.mjs/);
    ok("Gate 7 dùng HEAD, chỉ đọc, không bị --quick bỏ, và bắt artifact stale");
  } finally {
    assert.ok(tempRoot.startsWith(join(tmpdir(), "gate7-committed-truth-")), "chỉ dọn đúng temp fixture Gate 7");
    rmSync(tempRoot, { recursive: true, force: true });
  }
}


/* ==========================================================================
   S2 — cổng vào: llms.txt + repo-map.json + Khối A/D
   ========================================================================== */

function s2Repo({ claims = null, generatedOnDisk = true, dirty = [], statusOverrides = null } = {}) {
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
  // Trường của schema v2 (S3 mới đổ dữ liệu) phải CÓ MẶT với giá trị null, không được biến mất.
  assert.ok("next_step" in unit && unit.next_step === null, "next_step phải có mặt, giá trị null");
  assert.ok("superseded_by" in unit && unit.superseded_by === null, "superseded_by phải có mặt, giá trị null");
  assert.ok("owner" in unit && unit.owner === null, "owner phải có mặt, giá trị null (S3 khai vào STATUS, KHONG lay tu claims)");
  assert.deepEqual(map.active_work, [], "chưa STATUS nào khai next_step thì active_work rỗng, không đổ claim vào");
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
  onlyStamp.generated_commit = "khac123";
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

  assert.throws(() => withStatus({ schema: "extension-status/v0" }), /extension-status\/v1/,
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
  const model = collectModel(s2Repo({ statusOverrides: { next_step: "Đo lại trần 90 giây" } }));
  assert.ok(model.priority, "collectModel phải TỰ suy ra việc ưu tiên từ next_step của STATUS");
  assert.equal(model.priority.title, "Đo lại trần 90 giây");
  assert.equal(model.priority.unit, "workers/demo/v1");
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
console.log(`\n${passed} passed, 0 failed, ${passed} total`);
