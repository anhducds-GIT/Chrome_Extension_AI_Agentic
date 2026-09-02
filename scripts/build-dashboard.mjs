import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MODULE_FILE = path.resolve(fileURLToPath(import.meta.url));
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCHEMA = "extension-status/v1";
// "superseded" có mặt từ 2026-09-02: phiên S3 phải khai được một bản đã bị thay thế.
// Thiếu nó thì BRIEF-S3 bảo khai `lifecycle: superseded` còn validateStatus từ chối —
// đề bài và bộ kiểm đánh nhau. Audit Codex vòng 3 bắt được trước khi ai chạy S3.
const LIFECYCLES = new Set(["idea", "building", "active", "paused", "archived", "experimental", "superseded", "unclassified"]);
const REQUIRED = ["schema", "id", "name", "lifecycle", "version_source", "current_focus", "ref_readme", "ref_handoff"];
const BEHAVIOUR_EXTENSIONS = new Set([".js", ".mjs", ".json", ".html", ".css"]);
const EVIDENCE_ZONE = /(^|\/)(evidence[^/]*|pilot-[^/]*|batch-[^/]*)\//i;
export const STAMP_PREFIX = "Trang được sinh tại commit";
// Dòng "Phiên gần nhất" của Khối A cũng mang mã commit, nên cũng đổi theo TỪNG commit.
// Không lọc thì artifact cũ ngay sau mỗi lần commit và cổng kiểm đỏ vĩnh viễn —
// đúng lý do STAMP_PREFIX ra đời. Hai dòng này là DẤU SINH TRANG, không phải số đo.
export const SESSION_STAMP_PREFIX = "2. **Phiên gần nhất**";
const compareText = (left, right) => left < right ? -1 : left > right ? 1 : 0;

/* --- S2: cổng vào cho AI mới ---------------------------------------------
   Ba file GENERATED, sinh cùng một lượt từ CÙNG một model. Nếu tách ra sinh
   riêng thì sớm muộn ba file sẽ nói ba điều khác nhau — đúng thứ tầng
   GENERATED sinh ra để chống. */
export const LLMS_FILE = "llms.txt";
export const REPO_MAP_FILE = "repo-map.json";
export const DASHBOARD_FILE = "DASHBOARD.md";
export const REPO_MAP_SCHEMA_VERSION = 1;
export const REPO_PROFILE = "P1"; // monorepo nhiều gói — REPO-STRUCTURE-SPEC-V1 mục 3

// Hai trường này đổi theo TỪNG commit. So sánh nguyên văn thì cổng kiểm sẽ đỏ
// ngay sau mỗi commit dù nội dung thật không đổi. Lọc ra khi so, giống hệt cách
// STAMP_PREFIX được lọc khỏi DASHBOARD.
export const REPO_MAP_VOLATILE_KEYS = ["generated_at", "generated_commit"];

// Chỉ bỏ qua thứ KHÔNG được track. Cố tình không miễn trừ `scripts/`, `tests/`,
// `docs/`: miễn trừ là cách êm ái nhất để một con số nợ trông như đã trả. Thà để
// số đúng và cao, rồi khai chủ thật, còn hơn bịa ngoại lệ cho nó về 0.
const TOPLEVEL_IGNORED = new Set(["node_modules"]);

const childPath = (relPath, name) => relPath ? `${relPath}/${name}` : name;

export function parseStatus(text) {
  // Cắt BOM UTF-8 trước. Windows sinh BOM rất dễ (Notepad, PowerShell `Set-Content -Encoding
  // utf8` trên PS 5.1 đều thêm). Không cắt thì dòng đầu là "﻿---" chứ không phải "---",
  // parser coi như file KHÔNG có frontmatter, rồi báo "thiếu 8 trường bắt buộc" trong khi 8
  // trường đó đang nằm ngay trên màn hình. Fail-closed nên không nói dối, nhưng dẫn người
  // đọc đi sai hướng hoàn toàn. Gặp thật 2026-08-26 lúc dựng repo thử bằng PowerShell.
  const lines = String(text).replace(/^﻿/, "").replace(/\r\n?/g, "\n").split("\n");
  const frontmatter = {};
  if (lines[0] !== "---") return { frontmatter, body: lines.join("\n") };
  const end = lines.indexOf("---", 1);
  if (end < 0) return { frontmatter, body: lines.join("\n") };
  for (const raw of lines.slice(1, end)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const colon = line.indexOf(":");
    if (colon < 1) continue;
    const key = line.slice(0, colon).trim();
    let value = line.slice(colon + 1).trim();
    if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    frontmatter[key] = value;
  }
  return { frontmatter, body: lines.slice(end + 1).join("\n") };
}

function redactMarkdown(lines) {
  let inFence = false;
  return lines.map((entry) => {
    const fence = entry.text.match(/^\s*(```|~~~)/);
    if (fence) {
      inFence = !inFence;
      return { ...entry, text: "" };
    }
    if (inFence) return { ...entry, text: "" };
    return {
      ...entry,
      text: entry.text
        .replace(/(`+)([^\n]*?)\1/g, (match) => " ".repeat(match.length))
        .replace(/\]\((?:\\.|[^)])*\)/g, (match) => `]${" ".repeat(match.length - 1)}`)
    };
  });
}

function statusScanLines(text) {
  const lines = String(text).replace(/^﻿/, "").replace(/\r\n?/g, "\n").split("\n");
  const selected = [];
  if (lines[0] === "---") {
    const end = lines.indexOf("---", 1);
    if (end >= 0) {
      for (let index = 1; index < end; index += 1) {
        const match = lines[index].match(/^\s*(current_focus|last_verified_how)\s*:\s*(.*)$/);
        if (match) selected.push({ text: match[2], lineNumber: index + 1 });
      }
      for (let index = end + 1; index < lines.length; index += 1) {
        selected.push({ text: lines[index], lineNumber: index + 1 });
      }
      const frontmatterLines = selected.filter((entry) => entry.lineNumber < end + 1);
      const bodyLines = selected.filter((entry) => entry.lineNumber > end + 1);
      // Mỗi field frontmatter là một dòng độc lập; dấu fence gõ trong field đó không được
      // phép nuốt toàn bộ body. Trạng thái fence chỉ có nghĩa bên trong chính phần body.
      return [
        ...frontmatterLines.flatMap((entry) => redactMarkdown([entry])),
        ...redactMarkdown(bodyLines)
      ];
    }
  }
  return redactMarkdown(lines.map((line, index) => ({ text: line, lineNumber: index + 1 })));
}

// `(?<![\p{L}\d-])` — chữ số KHÔNG được tính nếu nó đi ngay sau dấu gạch nối, vì đó là mã
// việc chứ không phải phép đo: `G-01 lệnh dừng chưa ăn` bị mẫu Bridge khớp phải "01 lệnh".
// Mã việc nằm trong nhóm ĐƯỢC PHÉP (GPT chốt 27/08), nên bắt nó là báo oan.
// Gặp thật 2026-08-27: detector chặn đúng `current_focus` của STATUS Gemini ngay khi nó nhắc
// tới G-01. Sửa detector, KHÔNG bẻ câu văn cho vừa detector.
const NOT_TASK_ID = "(?<![\\p{L}\\d-])";
const STATUS_NUMBER_RULES = [
  {
    kind: "parity",
    pattern: new RegExp(`${NOT_TASK_ID}(?:nợ\\s+)?\\d+\\s+tính năng(?:\\s*\\+\\s*\\d+\\s+methods?)?(?:\\s+còn thiếu)?\\b`, "giu")
  },
  {
    kind: "parity",
    pattern: new RegExp(`${NOT_TASK_ID}(?:nợ\\s+\\d+\\s+methods?|\\d+\\s+methods?\\s+còn thiếu)\\b`, "giu")
  },
  {
    kind: "bridge",
    pattern: new RegExp(`\\b(?:Bridge\\s*\\(\\s*)?${NOT_TASK_ID}\\d+\\s+(?:lệnh|methods?)(?:\\s+Bridge)?(?:\\s*\\))?`, "giu")
  },
  {
    kind: "tests",
    pattern: new RegExp(`${NOT_TASK_ID}(?:\\d+\\s+file test|\\d+(?:/\\d+)?\\s+test)\\b`, "giu")
  },
  {
    kind: "version",
    pattern: /\b(?:version|bản)\s+v?\d+(?:\.\d+){2,}\b/giu
  }
];

function machineFactMessage({ kind, caught, source, lineNumber, bridgeMethods, testFiles, version }) {
  const prefix = `${source}:${lineNumber}: "${caught}"`;
  if (kind === "parity") {
    return `${prefix} là số món nợ parity do máy quản lý. Đừng ghi tay — trỏ sang FEATURE-PARITY.md.`;
  }
  const facts = {
    bridge: {
      label: "số lệnh Bridge do máy đo",
      measured: bridgeMethods,
      target: 'cột "Method Bridge [ĐO]" trên DASHBOARD.md'
    },
    tests: {
      label: "số file test do máy đo",
      measured: testFiles,
      target: 'cột "File test [ĐO]" trên DASHBOARD.md'
    },
    version: {
      label: "version do máy đọc từ version_source",
      measured: version,
      target: 'cột "Version [ĐO]" trên DASHBOARD.md'
    }
  };
  const fact = facts[kind];
  const written = caught.match(/\d+(?:\.\d+)*/u)?.[0];
  const measured = fact.measured === undefined || fact.measured === null ? "" : String(fact.measured);
  const freshness = measured && written !== measured
    ? `; số này đã mục rồi, máy hiện đo được ${measured}`
    : measured ? ` (hiện máy đo được ${measured})` : "";
  return `${prefix} là ${fact.label}${freshness}. Đừng ghi tay — trỏ sang ${fact.target}.`;
}

// Hàm thuần: chỉ nhận nội dung STATUS và các số generator vừa đo, không đọc file hay git.
// Mẫu neo vào danh từ machine-owned. Các số kiểm chứng, giới hạn an toàn và mã việc không
// có những danh từ này nên không bị bắt chỉ vì chúng chứa chữ số.
export function detectStatusMachineOwnedFacts(text, {
  statusPath = "STATUS.md",
  bridgeMethods,
  testFiles,
  version
} = {}) {
  const errors = [];
  for (const line of statusScanLines(text)) {
    const occupied = [];
    for (const rule of STATUS_NUMBER_RULES) {
      rule.pattern.lastIndex = 0;
      for (const match of line.text.matchAll(rule.pattern)) {
        const start = match.index;
        const end = start + match[0].length;
        if (occupied.some(([left, right]) => start < right && end > left)) continue;
        occupied.push([start, end]);
        errors.push(machineFactMessage({
          kind: rule.kind,
          caught: match[0],
          source: statusPath,
          lineNumber: line.lineNumber,
          bridgeMethods,
          testFiles,
          version
        }));
      }
    }
  }
  return errors;
}

export function validateStatus(fm, deps) {
  const errors = [];
  const source = deps.statusPath ?? "STATUS.md";
  const fail = (message) => errors.push(`${source}: ${message}`);
  if (fm.schema !== SCHEMA) fail(`schema phải là "${SCHEMA}", hiện là "${fm.schema || "thiếu"}".`);
  for (const key of REQUIRED) if (!fm[key]) fail(`thiếu trường bắt buộc "${key}".`);
  if (fm.lifecycle && !LIFECYCLES.has(fm.lifecycle)) fail(`lifecycle "${fm.lifecycle}" không hợp lệ.`);
  if (fm.lifecycle === "active" && !fm.last_verified) fail('lifecycle "active" phải có "last_verified".');
  // Bắt buộc CÓ ĐIỀU KIỆN. Khai "đã bị thay thế" mà không nói thay bằng bản nào thì
  // người đọc phải đi tìm — đúng một câu hỏi mà repo lẽ ra trả lời được. Không nhét
  // vào REQUIRED được vì REQUIRED áp cho mọi STATUS, còn luật này chỉ áp cho một
  // lifecycle. Audit Codex vòng 3 chỉ ra BRIEF-S3 không thể làm được nếu chỉ sửa
  // SCHEMA và REQUIRED.
  if (fm.lifecycle === "superseded" && !fm.superseded_by) {
    fail('lifecycle "superseded" phải có "superseded_by" trỏ tới bản thay thế.');
  }

  if (fm.version_source) {
    if (!deps.fileExists(fm.version_source)) {
      fail(`không tìm thấy version_source "${fm.version_source}".`);
    } else {
      try {
        JSON.parse(deps.readFile(fm.version_source));
      } catch {
        fail(`version_source "${fm.version_source}" không phải JSON hợp lệ.`);
      }
    }
  }

  for (const key of Object.keys(fm).filter((key) => key === "evidence_ref" || key.startsWith("ref_")).sort()) {
    if (!fm[key]) continue;
    if (!deps.fileExists(fm[key])) {
      fail(`không tìm thấy đường dẫn "${fm[key]}" được khai tại "${key}".`);
    } else if (!deps.isFile(fm[key])) {
      // Thư mục KHÔNG phải bằng chứng. Không chặn chỗ này thì `evidence_ref` trỏ vào
      // một thư mục rỗng cũng qua cửa, và luật "khai verified phải có bằng chứng" trở
      // thành hình thức. Auditor Codex bắt được lỗ này 2026-08-26.
      fail(`"${fm[key]}" khai tại "${key}" là THƯ MỤC, phải trỏ tới một FILE cụ thể.`);
    }
  }
  if (fm.last_verified && !fm.evidence_ref) fail(`đã khai last_verified "${fm.last_verified}" nhưng thiếu evidence_ref.`);

  // `id` và `version_source` phải THUỘC VỀ package đang khai. Không buộc thì một STATUS có
  // thể trỏ version_source sang extension khác: số version lấy của người ta, còn số method
  // và số test vẫn đếm của mình — số đúng nhưng gán nhầm chủ. Auditor Codex dựng được ca
  // đó thật 2026-08-26.
  if (deps.packageDir) {
    const expectedId = deps.packageId;
    if (expectedId && fm.id && fm.id !== expectedId) {
      fail(`id "${fm.id}" không trùng tên thư mục package "${expectedId}".`);
    }
    // CHUẨN HOÁ trước khi so. So chuỗi thô thì `v0.1.0/../../package-khac/manifest.json`
    // vẫn "bắt đầu bằng" thư mục package và lọt qua — auditor Codex lách được thật ở vòng 2
    // (2026-08-26): version lấy của extension khác, còn số method và số test vẫn đếm của
    // mình. Từng ô đều đúng, tổng thể thì nói dối.
    if (fm.version_source) {
      const normalized = path.posix.normalize(fm.version_source.replaceAll("\\", "/"));
      if (normalized !== fm.version_source || !normalized.startsWith(`${deps.packageDir}/`)) {
        fail(`version_source "${fm.version_source}" phải là đường dẫn thẳng nằm TRONG package "${deps.packageDir}" — không được dùng ".." hay "./", và không được trỏ ra ngoài, vì số đo sẽ bị gán nhầm extension.`);
      } else if (deps.realPath) {
        // Kiểm chuỗi VẪN chưa đủ: một junction/symlink thư mục nằm trong package có thể trỏ
        // thẳng sang package khác, và mọi phép so chuỗi đều thấy "nằm trong". Phải hỏi hệ
        // thống file đường dẫn THẬT. Auditor Codex dựng được ca này ở vòng 3 (2026-08-26):
        // version lấy của Gemini, còn 22 method + 94 test vẫn là của ChatGPT.
        const realSource = deps.realPath(fm.version_source);
        const realPackage = deps.realPath(deps.packageDir);
        if (!realSource || !realPackage || !realSource.startsWith(`${realPackage}${path.sep}`)) {
          fail(`version_source "${fm.version_source}" thực tế trỏ RA NGOÀI package "${deps.packageDir}" (có thể qua junction/symlink) — số đo sẽ bị gán nhầm extension.`);
        }
      }
    }
  }

  if (fm.last_verified_commit) {
    const sha = fm.last_verified_commit;
    if (!/^[0-9a-f]{40}$/i.test(sha)) {
      fail(`last_verified_commit "${sha}" phải có đúng 40 ký tự hex.`);
    } else {
      let resolves = false;
      try {
        resolves = deps.git.verifyCommit(sha) === true;
      } catch {
        resolves = false;
      }
      if (!resolves) fail(`last_verified_commit "${sha}" không resolve được thành commit trong repo.`);
    }
  }
  return errors;
}

function parseChangedCommits(output) {
  const commits = [];
  let current = null;
  for (const raw of String(output).replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (/^[0-9a-f]{40}$/i.test(line)) {
      current = { sha: line, files: [] };
      commits.push(current);
    } else if (current) {
      current.files.push(line.replaceAll("\\", "/"));
    }
  }
  return commits;
}

// Một file "đổi hành vi" = đuôi thuộc BEHAVIOUR_EXTENSIONS và KHÔNG nằm trong vùng bằng
// chứng. Lọc `.md` và vùng bằng chứng ra, nếu không cờ sẽ kêu oan ngay ngày đầu: chính
// commit thêm STATUS.md/HANDOFF đã "chạm package".
function isBehaviourFile(file) {
  const normalized = String(file).replaceAll("\\", "/");
  return !EVIDENCE_ZONE.test(normalized) && BEHAVIOUR_EXTENSIONS.has(path.posix.extname(normalized).toLowerCase());
}

function changedCommitCount(commits) {
  return commits.filter((commit) => commit.files.some(isBehaviourFile)).length;
}

// Tách riêng ra để test ghim được. `git status --porcelain` bình thường đã được gọi kèm
// `--no-renames`, nhưng nếu cờ đó rơi mất (hoặc git bản cũ) thì đổi tên hiện thành một dòng
// `R  cu -> moi` và vế `.js` cũ biến mất. Tách " -> " là lớp phòng thứ hai — và lớp phòng
// nào không có test ghim thì sớm muộn cũng bị gỡ đi mà không ai biết.
export function parsePorcelain(output) {
  return String(output).replace(/\r\n?/g, "\n").split("\n").filter(Boolean)
    .flatMap((line) => line.slice(3).split(" -> "))
    .map((entry) => entry.trim().replace(/^"|"$/g, ""))
    .filter(Boolean);
}

function readJson(deps, relPath) {
  return JSON.parse(deps.readFile(relPath));
}

function measuredRow(deps, dirRelPath, manifestRelPath, tracked = trackedIndex(deps)) {
  const manifest = readJson(deps, manifestRelPath);
  const bridgePath = dirRelPath ? `${dirRelPath}/bridge-core.js` : "bridge-core.js";
  const testsPath = dirRelPath ? `${dirRelPath}/tests` : "tests";
  const bridgeMethods = deps.fileExists(bridgePath)
    ? (deps.readFile(bridgePath).match(/registryEntry\(\{/g) ?? []).length
    : 0;
  // Đếm từ git, không từ đĩa: một file test chưa commit không được phép làm đổi
  // cột "File test [ĐO]". Cùng gốc bệnh với phát hiện 1 của audit — Codex trích
  // `listDirs`, nhưng `listFiles` ở đây rò đúng y như vậy.
  const testFiles = tracked.filesIn(testsPath).filter((name) => name.toLowerCase().endsWith(".mjs")).length;
  return { name: manifest.name || "KHÔNG RÕ TÊN", version: manifest.version || "KHÔNG RÕ PHIÊN BẢN", bridgeMethods, testFiles };
}

export function collectModel(deps = createDefaultDeps()) {
  const tracked = trackedIndex(deps);
  const descriptors = [];
  // Phát hiện package cũng đọc từ git: một thư mục worker chưa commit không được
  // xuất hiện trong bảng đã commit.
  for (const packageName of tracked.dirsIn("workers")) {
    const packagePath = `workers/${packageName}`;
    for (const versionName of tracked.dirsIn(packagePath)) {
      const dirRelPath = `${packagePath}/${versionName}`;
      const manifestPath = `${dirRelPath}/manifest.json`;
      if (deps.fileExists(manifestPath)) descriptors.push({ packageName, packagePath, versionName, dirRelPath, manifestPath });
    }
  }

  const parsed = [];
  const errors = [];
  for (const descriptor of descriptors) {
    const statusPath = `${descriptor.dirRelPath}/STATUS.md`;
    if (!deps.fileExists(statusPath)) {
      parsed.push({ ...descriptor, statusPath, fm: null });
      continue;
    }
    const statusText = deps.readFile(statusPath);
    const fm = parseStatus(statusText).frontmatter;
    const statusErrors = validateStatus(fm, {
      ...deps,
      statusPath,
      packageDir: descriptor.dirRelPath,
      packageId: descriptor.packageName
    });
    errors.push(...statusErrors);
    // `version_source` hợp lệ vẫn là SSOT của version. Nếu STATUS sai ở bất kỳ luật nền nào,
    // đo từ manifest discovery để detector tiếp tục gom lỗi thay vì crash trước khi báo.
    const measuredPath = statusErrors.length === 0 ? fm.version_source : descriptor.manifestPath;
    const measured = measuredRow(deps, descriptor.dirRelPath, measuredPath, tracked);
    errors.push(...detectStatusMachineOwnedFacts(statusText, {
      statusPath,
      bridgeMethods: measured.bridgeMethods,
      testFiles: measured.testFiles,
      version: measured.version
    }));
    parsed.push({ ...descriptor, statusPath, fm, measured });
  }
  if (errors.length) {
    const error = new Error(errors.join("\n"));
    error.name = "StatusValidationError";
    error.validationErrors = errors;
    throw error;
  }

  const rows = parsed.map((item) => {
    const manifestPath = item.fm?.version_source ?? item.manifestPath;
    const measured = item.measured ?? measuredRow(deps, item.dirRelPath, manifestPath, tracked);
    const changedCount = item.fm?.last_verified_commit
      ? changedCommitCount(deps.git.changedFilesSince(item.fm.last_verified_commit, item.dirRelPath))
      : 0;
    return {
      key: item.dirRelPath,
      id: item.fm?.id ?? `${item.packageName}-${item.versionName}`,
      ...measured,
      lifecycle: item.fm?.lifecycle ?? "unclassified",
      missingStatus: !item.fm,
      lastVerified: item.fm?.last_verified ?? "",
      lastVerifiedCommit: item.fm?.last_verified_commit ?? "",
      lastVerifiedHow: item.fm?.last_verified_how ?? "",
      evidenceRef: item.fm?.evidence_ref ?? "",
      changedCount,
      currentFocus: item.fm?.current_focus ?? "CHƯA KHAI STATUS — cần khai trạng thái và việc đang mở.",
      // Ba trường của schema extension-status/v2. Chưa STATUS nào khai, nên hiện là "".
      // Đọc sẵn từ bây giờ để phiên S3 chỉ phải thêm dữ liệu vào STATUS, không phải
      // sửa lại bộ sinh.
      owner: item.fm?.owner ?? "",
      nextStep: item.fm?.next_step ?? "",
      priorityRank: rankOf(item.fm?.priority_rank),
      supersededBy: item.fm?.superseded_by ?? "",
      statusPath: item.fm ? item.statusPath : ""
    };
  });

  // Đơn vị ở gốc repo (Extension Observer V0) ĐỌC ĐƯỢC `STATUS.md` như mọi đơn vị khác.
  // Bản trước ghim cứng `missingStatus: true`, nên phiên S3 có tạo `STATUS.md` ở gốc thì
  // con số nợ vẫn không nhúc nhích — đề bài không thể đạt được mục tiêu của chính nó.
  // Audit Codex vòng 3, mục 4.2. Không truyền `packageDir` vào validateStatus: đơn vị gốc
  // không nằm trong `workers/`, nên luật "id và version_source phải thuộc package" không áp.
  const rootStatusPath = "STATUS.md";
  const rootFm = deps.fileExists(rootStatusPath) ? parseStatus(deps.readFile(rootStatusPath)).frontmatter : null;
  if (rootFm) {
    const rootErrors = validateStatus(rootFm, { ...deps, statusPath: rootStatusPath });
    if (rootErrors.length) {
      const error = new Error(rootErrors.join("\n"));
      error.name = "StatusValidationError";
      error.validationErrors = rootErrors;
      throw error;
    }
  }
  const rootMeasured = measuredRow(deps, "", rootFm?.version_source ?? "manifest.json", tracked);
  rows.push({
    key: "_root",
    id: rootFm?.id ?? "extension-observer-v0",
    ...rootMeasured,
    lifecycle: rootFm?.lifecycle ?? "unclassified",
    missingStatus: !rootFm,
    lastVerified: rootFm?.last_verified ?? "",
    lastVerifiedCommit: rootFm?.last_verified_commit ?? "",
    lastVerifiedHow: rootFm?.last_verified_how ?? "",
    evidenceRef: rootFm?.evidence_ref ?? "",
    changedCount: rootFm?.last_verified_commit
      ? changedCommitCount(deps.git.changedFilesSince(rootFm.last_verified_commit, "."))
      : 0,
    currentFocus: rootFm?.current_focus ?? "Chưa khai STATUS; đây là một việc đang mở.",
    owner: rootFm?.owner ?? "",
    nextStep: rootFm?.next_step ?? "",
    supersededBy: rootFm?.superseded_by ?? "",
    priorityRank: rankOf(rootFm?.priority_rank),
    statusPath: rootFm ? rootStatusPath : ""
  });

  const headDate = deps.git.headDate();
  const claims = readClaims(deps);
  const sortedRows = rows.sort((a, b) => compareText(a.key, b.key));
  const model = {
    shortHead: deps.git.shortHead(),
    headDate,
    rows: sortedRows,
    claims,
    // Chỉ dùng TẬP KHOÁ của claims.json (package nào đã có mục), không dùng giá trị
    // `owner`. Tập khoá đổi khi thêm/bớt package — chuyện cấu trúc, hiếm. Giá trị
    // `owner` đổi mỗi lần nhận/trả quyền — chuyện phiên, liên tục. Chỉ cái đầu được
    // phép ảnh hưởng tới artifact.
    priority: priorityFrom(sortedRows),
    topLevel: topLevelOwnership(deps, claims),
    docs: collectDocs(deps, headDate)
  };
  model.gatewayLinks = gatewayLinks(model, deps);
  model.health = {
    units_without_status: sortedRows.filter((row) => row.missingStatus).length,
    dead_links: model.gatewayLinks.filter((entry) => !entry.exists).length,
    undeclared_dirs: model.topLevel.filter((entry) => !entry.owner_declared).length,
    draft_debt: model.docs.filter((doc) => doc.overdue).length
  };
  return model;
}

/* --- S2: dữ liệu cho cổng vào -------------------------------------------- */

/* FAIL CLOSED. Bản trước nuốt lỗi và trả `{}` — nghĩa là một `claims.json` hỏng
   hoặc đang ghi dở sẽ làm MỌI thư mục thành "chưa khai chủ", con số nợ nhảy vọt,
   và không một dòng nào nói vì sao. Bảng điều hành nói dối êm ru còn tệ hơn bảng
   không sinh ra được. Audit Codex 2026-09-02, phát hiện 4. */
function readClaims(deps) {
  // Thiếu hẳn file cũng phải dừng. Bảng chủ sở hữu là bắt buộc; chạy tiếp với bảng
  // rỗng nghĩa là khai MỌI thư mục đều chưa có chủ — một con số nợ sai mà không ai
  // biết vì sao. Audit Codex vòng 2, phát hiện 2.
  if (!deps.fileExists(".agents/claims.json")) {
    throw new Error("CLAIMS_THIEU_FILE: không thấy .agents/claims.json. Đây là bảng chủ sở hữu bắt buộc — không sinh bảng từ một bảng chủ sở hữu không tồn tại.");
  }
  let parsed;
  try { parsed = readJson(deps, ".agents/claims.json"); }
  catch (error) {
    throw new Error(`CLAIMS_HONG: .agents/claims.json không phải JSON đọc được (${error.message}). Sửa file đó rồi chạy lại — không sinh bảng từ một bảng chủ sở hữu đang hỏng.`);
  }
  // `Array.isArray`: mảng cũng cho `typeof "object"`, nên `{"claims": []}` trước đây
  // lọt qua và lặng lẽ biến thành bảng rỗng.
  if (!parsed || typeof parsed.claims !== "object" || parsed.claims === null || Array.isArray(parsed.claims)) {
    throw new Error("CLAIMS_THIEU_KHOI: .agents/claims.json không có khối `claims`. Không đoán được ai giữ gì, nên dừng thay vì khai bừa là chưa ai khai.");
  }
  return parsed.claims;
}

/* "Việc ưu tiên #1" — vì sao KHÔNG lấy từ `.agents/claims.json`.

   Cám dỗ là lấy claim đang mở làm việc ưu tiên: nó có sẵn và máy đọc được. Nhưng
   claims.json là TRẠNG THÁI SỐNG — nhận/trả quyền vài lần mỗi phiên. Đổ nó vào một
   artifact máy sinh thì mỗi lần nhận quyền là artifact cũ đi, cổng kiểm đỏ, và
   phiên sau mở repo ra gặp một cái đỏ không phải của mình. Đúng cảnh đã xảy ra
   ngày 2026-09-02. Phép kiểm 22 trong bộ test ghim đúng luật này từ trước, và
   luật đó đúng.

   Nguồn ỔN ĐỊNH cho việc ưu tiên là trường `next_step` của STATUS — thuộc schema
   extension-status/v2, do phiên S3 thêm. Tới lúc đó Khối A khai thẳng CHƯA KHAI.
   Đây không phải thiếu sót giấu đi: nó hiện ra ngay dòng đầu bảng, đúng nguyên tắc
   "mỗi câu AI phải hỏi người = một trường dữ liệu còn thiếu". */
/* Thứ hạng phải do người KHAI, không do máy đoán.

   Bản trước lấy `declared[0]` — phần tử đầu sau khi sắp theo đường dẫn. Lúc mới có một
   đơn vị khai `next_step` thì trông đúng; nhưng khi schema v2 bắt MỌI đơn vị khai
   `next_step`, "việc ưu tiên #1" lặng lẽ trở thành "việc của package đứng đầu bảng chữ
   cái". Một con số sai mà trông rất hợp lý. Audit GPT 2026-09-02, mục 7.

   Nay: thứ hạng lấy từ `priority_rank` trong STATUS. Không ai khai thì nói CHƯA XẾP HẠNG
   — không đoán. Hai đơn vị cùng khai hạng nhỏ nhất thì nói XUNG ĐỘT — không chọn bừa
   một cái. Cả hai trường hợp đều hiện ra chỗ Đức nhìn, thay vì im lặng. */
/* `Number("")` trả 0 — và 0 là số nhỏ nhất, nên một `priority_rank:` bỏ trống sẽ
   THẮNG mọi đơn vị khai đàng hoàng, lặng lẽ. Audit Codex vòng 3, phát hiện 1.
   Phải đòi chuỗi không rỗng TRƯỚC khi ép sang số. Hạng cũng phải ≥ 1: hạng 0 hay
   hạng âm là dữ liệu hỏng, không phải "ưu tiên cao hơn nữa". */
export function rankOf(raw) {
  const text = String(raw ?? "").trim();
  if (text === "") return null;
  const value = Number(text);
  return Number.isInteger(value) && value >= 1 ? value : null;
}

// Một bản đã nghỉ hưu không được làm việc ưu tiên số 1. Nó vẫn có thể có `next_step`
// (ví dụ "chờ xoá sau khi V2 chạy ổn"), nhưng đưa nó lên đầu bảng là chỉ sai đường cho
// phiên sau. Audit GPT 2026-09-02, mục 3.
const NOT_PRIORITY_LIFECYCLES = new Set(["superseded", "archived"]);

export function priorityFrom(rows) {
  const declared = rows.filter((row) => row.nextStep && !NOT_PRIORITY_LIFECYCLES.has(row.lifecycle));
  if (declared.length === 0) return null;
  const ranked = declared.filter((row) => Number.isFinite(row.priorityRank));
  if (ranked.length === 0) {
    return { unranked: true, count: declared.length };
  }
  const best = Math.min(...ranked.map((row) => row.priorityRank));
  const winners = ranked.filter((row) => row.priorityRank === best);
  if (winners.length > 1) {
    return { conflict: true, rank: best, units: winners.map((row) => row.key).sort(compareText) };
  }
  return { unit: winners[0].key, title: winners[0].nextStep, statusPath: winners[0].statusPath, rank: best };
}

function firstSentence(text) {
  const flat = String(text).replace(/\s+/g, " ").trim();
  if (!flat) return "";
  const cut = flat.search(/[.·;]\s/);
  const head = cut > 0 ? flat.slice(0, cut) : flat;
  return safeTruncate(head, 160);
}

/* Cắt mà KHÔNG cắt gãy cú pháp markdown.
   Bản trước cắt cứng ở ký tự thứ 157, nên một câu kết thúc bằng "[hướng dẫn](docs/x.md)"
   biến thành "[hướng dẫn](docs/..." — một link mở mà không đóng, và mọi thứ sau nó
   trong dòng bị nuốt. Đức nhìn thấy đúng ca này trong `llms.txt` ngày 2026-09-02.
   Cả hai auditor đều bắt (Codex phát hiện 6, GPT xếp cùng nhóm). */
function safeTruncate(text, max) {
  if (text.length <= max) return text;
  let cut = text.slice(0, max);
  // Lùi về ranh giới từ gần nhất, nhưng đừng lùi quá nửa — thà cắt giữa từ còn hơn
  // trả về một mẩu cụt lủn.
  const space = cut.lastIndexOf(" ");
  if (space > max * 0.6) cut = cut.slice(0, space);
  // Cắt tại dấu mở SỚM NHẤT còn treo, không phải dấu mở cuối cùng.
  // So `lastIndexOf` như bản trước bị qua mặt bởi "… [treo (ổn) …": cặp ngoặc tròn
  // cân bằng ở sau che mất dấu `[` treo ở trước. Audit Codex vòng 3, phát hiện 3.
  // Quét một lượt bằng ngăn xếp thì không có thứ tự nào lách được.
  const stack = [];
  const pairs = { "]": "[", ")": "(" };
  for (let i = 0; i < cut.length; i += 1) {
    const ch = cut[i];
    if (ch === "[" || ch === "(") stack.push(i);
    else if (pairs[ch] && stack.length && cut[stack[stack.length - 1]] === pairs[ch]) stack.pop();
  }
  if (stack.length) cut = cut.slice(0, stack[0]);
  // Backtick lẻ cũng làm hỏng phần còn lại của dòng.
  if (((cut.match(/`/g) ?? []).length % 2) === 1) cut = cut.slice(0, cut.lastIndexOf("`"));
  return `${cut.trimEnd()}…`;
}

/* Liệt kê từ GIT, không từ đĩa.

   Bản trước dùng `deps.listDirs("")`, tức đọc thư mục thật trên máy. Hậu quả đo
   được (audit Codex 2026-09-02, phát hiện 1): tạo một thư mục rác CHƯA TRACK rồi
   sinh lại thì `undeclared_dirs` nhảy 7 → 8. Commit con số đó lên là cổng kiểm ĐỎ
   OAN cho phiên sau, vì cổng dựng lại từ HEAD và HEAD không có thư mục rác đó.
   Đúng cái đỏ oan mà phiên này mở màn đã phải đi dọn.

   `trackedPaths()` chạy cùng một lệnh git ở cả hai chế độ (đĩa và HEAD), nên hai
   chế độ luôn nhìn thấy y hệt nhau. */
function trackedIndex(deps) {
  const paths = deps.git.trackedPaths();
  const childrenOf = (prefix) => {
    const head = prefix ? `${prefix}/` : "";
    const dirs = new Set();
    const files = [];
    for (const relPath of paths) {
      if (!relPath.startsWith(head)) continue;
      const rest = relPath.slice(head.length);
      if (!rest) continue;
      const slash = rest.indexOf("/");
      if (slash < 0) files.push(rest);
      else dirs.add(rest.slice(0, slash));
    }
    return { dirs: [...dirs].sort(compareText), files: files.sort(compareText) };
  };
  return { paths, dirsIn: (p) => childrenOf(p).dirs, filesIn: (p) => childrenOf(p).files };
}

function topLevelDirsFromGit(deps) {
  const dirs = new Set(trackedIndex(deps).dirsIn(""));
  // Submodule ở tầng gốc được `ls-tree -r` trả về như MỘT đường dẫn không có dấu "/",
  // nên bị xếp nhầm là file và không bao giờ vào bảng chủ sở hữu — một thư mục cả
  // repo phụ thuộc vào mà không ai đứng tên. Audit Codex vòng 2, phát hiện 4.
  for (const name of deps.git.gitlinksAtRoot?.() ?? []) dirs.add(name);
  return [...dirs];
}

function topLevelOwnership(deps, claims) {
  const keys = Object.keys(claims);
  return topLevelDirsFromGit(deps)
    .filter((name) => !name.startsWith(".") && !TOPLEVEL_IGNORED.has(name))
    .sort(compareText)
    .map((name) => {
      // CHỈ xét khoá có tồn tại hay không. Cố tình KHÔNG đọc giá trị `owner`: ai đang
      // giữ là chuyện của phiên, không phải của bản đồ repo. Khai rồi trả quyền vẫn
      // là ĐÃ KHAI.
      const declared = keys.some((key) => key === name || key.startsWith(`${name}/`));
      return { path: `${name}/`, owner_declared: declared };
    });
}

const TTL_FALLBACK = { brief: 30, study: 180, guide: 365 };

/* Cùng lý do như `topLevelDirsFromGit`: liệt kê tài liệu từ git, không từ đĩa —
   một file .md chưa track không được phép làm đổi con số nợ.

   Và KHÔNG ĐƯỢC IM LẶNG THA. Bản trước: `ttl_days: ba-mươi` cho `Number()` ra NaN,
   `NaN > ttl` là false, nên tài liệu đó lặng lẽ thoát khỏi mọi phép đếm nợ. `kind`
   lạ không có trong bảng mặc định cũng vậy. Một trường gõ sai làm khoản nợ TÀNG HÌNH
   — mà cả Khối D sinh ra chỉ để làm nợ nhìn thấy được. Audit Codex 2026-09-02,
   phát hiện 5. Nay: không chứng minh được là còn hạn thì tính là quá hạn. */
function collectDocs(deps, headDate) {
  const out = [];
  for (const relPath of deps.git.trackedPaths()) {
    if (!relPath.startsWith("docs/") || !relPath.endsWith(".md")) continue;
    const fm = parseStatus(deps.readFile(relPath)).frontmatter;
    const active = fm.status === "active";
    // BÁC MỘT PHẦN phát hiện 3 của audit Codex vòng 2. Nó đề nghị: `kind` lạ thì
    // tính nợ NGAY CẢ KHI đã khai `ttl_days`. Tôi thử và thấy sai: hai file
    // `kind: spec` vừa commit hôm qua, có `ttl_days` đàng hoàng, lập tức bị gọi là
    // "quá hạn". Đó là BÁO OAN, và một bảng nợ báo oan thì người đọc sẽ học cách
    // phớt lờ nó — hỏng đúng thứ Khối D sinh ra để làm.
    // `ttl_days` khai thẳng thì hạn dùng LÀ chứng minh được, bất kể `kind` có nằm
    // trong bảng mặc định hay không. Bảng mặc định chỉ để suy ra hạn khi không ai khai.
    // Còn "kind lạ có hợp lệ không" là câu hỏi của cổng kiểm schema (phiên S4), không
    // phải của phép đếm quá hạn. Ghi lại để phiên sau đừng "sửa" ngược lại.
    const rawTtl = fm.ttl_days ?? TTL_FALLBACK[fm.kind];
    const ttl = Number(rawTtl);
    const ttlUsable = rawTtl !== undefined && String(rawTtl).trim() !== "" && Number.isFinite(ttl) && ttl > 0;
    const touched = deps.git.lastCommitDate?.(relPath) ?? "";
    const age = daysBetween(touched, headDate);
    // `age === null` một mình là không đủ: ngày hỏng kiểu "2026-99-99" cho `NaN` chứ
    // không phải `null`, và `NaN > ttl` là false nên tài liệu đó lặng lẽ được tha.
    const unprovable = !ttlUsable || age === null || !Number.isFinite(age);
    out.push({
      path: relPath,
      kind: fm.kind ?? "",
      status: fm.status ?? "",
      ttl_days: ttlUsable ? ttl : null,
      last_touched: touched,
      age_days: age,
      // Chỉ `status: active` mới tính nợ — tài liệu đã nghỉ hưu thì cũ là đúng.
      // Nhưng trong nhóm active, không đọc được hạn dùng = tính nợ, không tha.
      overdue: active && (unprovable || age > ttl),
      unprovable: active && unprovable
    });
  }
  return out.sort((a, b) => compareText(a.path, b.path));
}

function daysBetween(from, to) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) return null;
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000);
}

// MỘT nguồn link cho cả hai file cổng. Nếu DASHBOARD và llms.txt tự đi tìm link
// riêng thì "đếm link chết" sẽ đếm thiếu đúng những link mà file kia mới thêm.
function gatewayLinks(model, deps) {
  const entries = [
    { label: "AGENTS.md", path: "AGENTS.md", note: "hiến pháp repo — luật chung, đọc trước tiên" },
    { label: "DASHBOARD.md", path: DASHBOARD_FILE, note: "bảng trạng thái máy sinh: có extension gì, cái nào sống, việc đang mở" },
    { label: "HANDOFF.md", path: "HANDOFF.md", note: "phiên gần nhất ở gốc repo làm gì, còn gì mở" },
    { label: REPO_MAP_FILE, path: REPO_MAP_FILE, note: "bản đồ máy đọc — hệ điều phối cấp cao chỉ cần đọc file này" }
  ];
  for (const row of model.rows) {
    if (!row.statusPath) continue;
    entries.push({ label: row.name, path: row.statusPath, note: `${row.lifecycle} — ${firstSentence(row.currentFocus)}`, unit: true });
  }
  // Ba file GENERATED do CHÍNH lượt chạy này ghi ra — chúng tồn tại theo thiết kế.
  // Không miễn trừ thì lần chạy đầu (khi file chưa có trên đĩa) sẽ tự khai mình là
  // link chết, và nội dung sinh ra phụ thuộc vào việc chính nó đã chạy lần nào chưa
  // — artifact máy sinh mà không tất định thì cổng kiểm HEAD-vs-HEAD hết tin được.
  const selfProduced = new Set([DASHBOARD_FILE, LLMS_FILE, REPO_MAP_FILE]);
  // `isFile` chứ không phải `fileExists`: một thư mục trùng tên vẫn "tồn tại"
  // nhưng bấm vào link thì không mở ra tài liệu nào.
  const probe = (relPath) => deps.isFile ? deps.isFile(relPath) : deps.fileExists(relPath);
  return entries.map((entry) => ({
    ...entry,
    exists: selfProduced.has(entry.path) ? true : probe(entry.path)
  }));
}

function cell(value) {
  return String(value ?? "").replaceAll("|", "\\|").replace(/\r?\n/g, "<br>");
}

function link(label, relPath) {
  const href = relPath.replaceAll("\\", "/").split("/").map(encodeURIComponent).join("/");
  return `[${label}](${href})`;
}

function renderChanged(row) {
  if (!row.lastVerifiedCommit) return "KHÔNG ÁP DỤNG (chưa khai mốc commit)";
  return row.changedCount > 0 ? `CÓ (${row.changedCount} commit)` : "KHÔNG";
}

export function buildDashboard(model) {
  const lines = [
    "# Bảng điều hành Extension",
    "",
    "> **SINH TỰ ĐỘNG — ĐỪNG SỬA TAY.** Sinh lại bằng `node scripts/build-dashboard.mjs`.",
    "",
    `${STAMP_PREFIX} \`${model.shortHead}\` (${model.headDate}). Đây là lúc sinh trang, **KHÔNG phải lúc bất kỳ extension nào được kiểm chứng**.`,
    "",
    ...blockA(model),
    "## B · Có gì trong repo",
    "",
    "| Extension | Version [ĐO] | Lifecycle [KHAI] | Method Bridge [ĐO] | File test [ĐO] | Kiểm chứng cuối (ngày @ commit 7 ký tự, cách kiểm) [KHAI + bằng chứng] | Code đã commit đổi sau kiểm chứng? [ĐO] | Việc đang mở | Đọc sâu (link STATUS) |",
    "|---|---:|---|---:|---:|---|---|---|---|"
  ];

  for (const row of [...model.rows].sort((a, b) => compareText(String(a.key ?? a.id), String(b.key ?? b.id)))) {
    const lifecycle = row.missingStatus ? `${row.lifecycle} · CHƯA KHAI STATUS` : row.lifecycle;
    const verified = row.lastVerified
      ? `${row.lastVerified} @ \`${String(row.lastVerifiedCommit || "không khai").slice(0, 7)}\`${row.lastVerifiedHow ? ` — ${row.lastVerifiedHow}` : ""}${row.evidenceRef ? ` (${link("bằng chứng", row.evidenceRef)})` : ""}`
      : "CHƯA KHAI KIỂM CHỨNG";
    const changed = renderChanged(row);
    const deep = row.statusPath ? link("STATUS", row.statusPath) : "CHƯA KHAI STATUS";
    const values = [row.name, row.version, lifecycle, row.bridgeMethods, row.testFiles, verified, changed, row.currentFocus, deep];
    lines.push(`| ${values.map(cell).join(" | ")} |`);
  }

  lines.push("", ...blockD(model));

  lines.push(
    "",
    "## Chú giải",
    "",
    "- **[ĐO]**: Máy đếm trực tiếp từ repo, không qua tay người; đây là mức chắc chắn.",
    "- **[KHAI]**: Do con người khai trong STATUS; lời khai kiểm chứng chỉ hợp lệ khi có liên kết bằng chứng.",
    ""
  );
  return lines.join("\n");
}

/* MỘT chỗ diễn giải "việc ưu tiên #1" cho cả DASHBOARD lẫn llms.txt. Hai chỗ tự
   viết câu riêng thì sớm muộn sẽ nói hai điều khác nhau về cùng một dữ liệu. */
function priorityText(priority, makeLink) {
  if (!priority) {
    return "**CHƯA KHAI** — chưa STATUS nào khai `next_step` (trường của schema `extension-status/v2`, phiên S3 thêm). Tạm thời xem cột \"Việc đang mở\" ở bảng B.";
  }
  if (priority.unranked) {
    return `**CHƯA XẾP HẠNG** — ${priority.count} đơn vị có khai \`next_step\` nhưng không đơn vị nào khai \`priority_rank\`. Máy KHÔNG tự chọn hộ: chọn theo thứ tự bảng chữ cái là một con số sai trông rất hợp lý.`;
  }
  if (priority.conflict) {
    return `**XUNG ĐỘT** — ${priority.units.length} đơn vị cùng khai \`priority_rank: ${priority.rank}\` (${priority.units.map((unit) => `\`${unit}\``).join(" · ")}). Chỉ một việc được là số 1; sửa STATUS rồi sinh lại.`;
  }
  return `**${priority.unit}** — ${priority.title}${priority.statusPath && makeLink ? ` · ${makeLink("STATUS", priority.statusPath)}` : ""}`;
}

/* Khối A đặt TRÊN CÙNG có chủ đích: người (và AI) mới vào phải trả lời được
   "bắt đầu từ đâu" trước khi thấy bất kỳ bảng số nào. */
function blockA(model) {
  const priorityLine = priorityText(model.priority, (label, path) => link(label, path));
  return [
    "## A · Bắt đầu từ đâu",
    "",
    `1. **Việc ưu tiên #1** — ${priorityLine}`,
    `2. **Phiên gần nhất** — ${model.headDate} @ \`${model.shortHead}\` · ${link("HANDOFF.md", "HANDOFF.md")}`,
    `3. **Luật phải đọc trước khi sửa gì** — ${link("AGENTS.md", "AGENTS.md")} · cổng vào cho AI: ${link(LLMS_FILE, LLMS_FILE)}`,
    `4. **Ai đang giữ package nào** — \`.agents/claims.json\` (trạng thái sống, cố tình KHÔNG chép vào trang này để trang không mục theo từng lần nhận/trả quyền)`,
    ""
  ];
}

/* Khối D làm NỢ ĐIỀU HƯỚNG nhìn thấy được. Không nhìn thấy thì không ai trả. */
function blockD(model) {
  const rows = [
    ["Đơn vị chưa khai STATUS", model.health.units_without_status, "mỗi dòng là một câu hỏi AI sẽ phải hỏi Đức"],
    ["Link chết trong file cổng", model.health.dead_links, `kiểm ${model.gatewayLinks.length} link ở ${LLMS_FILE} và bảng B`],
    ["Thư mục top-level chưa khai chủ", model.health.undeclared_dirs, "chưa có khoá trong `.agents/claims.json`"],
    ["Tài liệu quá hạn chưa rà", model.health.draft_debt, "`status: active` mà quá `ttl_days` tính từ commit cuối chạm vào"]
  ];
  const lines = [
    "## D · Sức khoẻ điều hướng [ĐO]",
    "",
    "| Nợ | Số | Nghĩa là gì |",
    "|---|---:|---|"
  ];
  for (const [label, count, meaning] of rows) lines.push(`| ${label} | ${count} | ${meaning} |`);
  const undeclared = model.topLevel.filter((entry) => !entry.owner_declared).map((entry) => `\`${entry.path}\``);
  if (undeclared.length) lines.push("", `Thư mục chưa khai chủ: ${undeclared.join(" · ")}`);
  const dead = model.gatewayLinks.filter((entry) => !entry.exists).map((entry) => `\`${entry.path}\``);
  if (dead.length) lines.push("", `Link chết: ${dead.join(" · ")}`);
  return lines;
}

/* --- S2: llms.txt — cổng vào cho AI ---------------------------------------
   Định dạng llmstxt.org: một `#` tiêu đề · một `>` blockquote tóm tắt · các mục
   `##` chứa link, mỗi link kèm MỘT dòng mô tả. Mục tiêu độ dài: dưới 50 dòng.
   Nhiều công cụ AI tự tìm `/llms.txt` khi được trỏ vào một nguồn, nên đây là
   file đầu tiên một phiên mới chạm vào. */
export function buildLlmsTxt(model) {
  const units = model.gatewayLinks.filter((entry) => entry.unit);
  const core = model.gatewayLinks.filter((entry) => !entry.unit);
  const alive = model.rows.filter((row) => !row.missingStatus).length;

  const lines = [
    "# Chrome Extension AI Agentic",
    "",
    `> Monorepo ${model.rows.length} extension Chrome tự động hoá các trang AI (ChatGPT, Gemini, Google Flow) qua một Bridge chung. ${alive}/${model.rows.length} đơn vị đã khai trạng thái. Mọi con số trong repo này là máy đếm, không gõ tay.`,
    "",
    `> **SINH TỰ ĐỘNG — ĐỪNG SỬA TAY.** Sinh lại bằng \`node scripts/build-dashboard.mjs\`.`,
    "",
    `${STAMP_PREFIX} \`${model.shortHead}\` (${model.headDate}).`,
    "",
    "## Việc ưu tiên #1",
    "",
    `- ${priorityText(model.priority, null)}`,
    "",
    "## Đọc theo thứ tự này",
    ""
  ];
  for (const entry of core) lines.push(linkLine(entry));
  lines.push("", "## Từng extension", "");
  if (units.length === 0) lines.push("- CHƯA KHAI — chưa đơn vị nào có STATUS.md.");
  for (const entry of units) lines.push(linkLine(entry));
  lines.push(
    "",
    "## Luật bắt buộc trước khi sửa gì",
    "",
    "- Một package chỉ MỘT phiên AI được ghi: xem `.agents/claims.json`, chủ không phải bạn thì chỉ đọc.",
    "- Đóng phiên phải xanh cổng: `node scripts/session-check.mjs --as <tên-phiên>`.",
    "- Push bằng `node scripts/safe-push.mjs --as <tên-phiên>`, không bao giờ `git push` trần.",
    ""
  );
  return lines.join("\n");
}

function linkLine(entry) {
  const dead = entry.exists ? "" : " ⚠ LINK CHẾT";
  return `- [${entry.label}](${encodeLinkPath(entry.path)}): ${entry.note}${dead}`;
}

function encodeLinkPath(relPath) {
  return relPath.replaceAll("\\", "/").split("/").map(encodeURIComponent).join("/");
}

/* --- S2: repo-map.json — hợp đồng máy đọc ---------------------------------
   Đây là GIAO DIỆN CROSS-REPO: một hệ điều phối cấp cao (P5) chỉ đọc file này,
   không đọc gì khác trong repo. Vì vậy hình dạng phải ỔN ĐỊNH kể cả khi trường
   chưa có dữ liệu — trường trống trả `null`, KHÔNG bỏ khoá đi. Bỏ khoá là bắt
   phía đọc đoán, và mỗi lần đoán là một lần lệch.
   `schema_version` bắt buộc: thiếu nó thì mọi hệ đọc file này sẽ vỡ khi một repo
   nâng cấp trước các repo khác. */
export function buildRepoMap(model) {
  const map = {
    schema_version: REPO_MAP_SCHEMA_VERSION,
    generated_at: model.headDate,
    generated_commit: model.shortHead,
    profile: REPO_PROFILE,
    entry_point: LLMS_FILE,
    law_files: ["AGENTS.md", "CLAUDE.md"],
    top_level: model.topLevel,
    units: model.rows.map((row) => ({
      id: row.id,
      path: row.key === "_root" ? "." : row.key,
      lifecycle: row.lifecycle,
      status_md: row.statusPath || null,
      // `owner`, `next_step`, `superseded_by` là trường của schema extension-status/v2,
      // do phiên S3 khai vào STATUS. Giữ khoá với giá trị null ngay từ bây giờ để hình
      // dạng hợp đồng không đổi khi S3 đổ dữ liệu vào — phía đọc không phải đoán.
      // `owner` CỐ TÌNH không lấy từ claims.json: xem ghi chú ở `priorityFrom`.
      // `|| null` chứ không phải `?? null`: STATUS chưa khai thì giá trị là chuỗi
      // rỗng, mà `?? ` không bắt chuỗi rỗng — hợp đồng sẽ trả `""` thay vì `null`,
      // và phía đọc phải xử lý hai kiểu "không có" thay vì một.
      owner: row.owner || null,
      next_step: row.nextStep || null,
      priority_rank: Number.isFinite(row.priorityRank) ? row.priorityRank : null,
      superseded_by: row.supersededBy || null,
      last_verified: row.lastVerified || null,
      last_verified_commit: row.lastVerifiedCommit || null,
      open_item: row.currentFocus || null
    })),
    // Khoá luôn có mặt để hình dạng hợp đồng ổn định. Rỗng cho tới khi STATUS có
    // `next_step` (S3). KHÔNG đổ claim đang mở vào đây: claim là trạng thái sống,
    // xem ghi chú ở `priorityFrom`. Phía đọc muốn biết ai đang giữ gì thì đọc
    // `.agents/claims.json` — nguồn sự thật duy nhất của việc đó.
    // MẢNG, không phải object. C1 bản đầu vẽ nó như một object đơn — không diễn tả
    // được hai trạng thái có thật: "không có việc nào" và "nhiều việc song song".
    // Đã sửa SPEC cho khớp code thay vì ngược lại (quyết định 2026-09-02, ghi ở C1).
    // 0..n, không phải 0-hoặc-1. Tôi đã lấy lý do "diễn tả được nhiều việc song song"
    // để chốt kiểu mảng, rồi lại chỉ phát ra đúng một mục — hình dạng đúng mà nội dung
    // không sống theo. Audit Codex vòng 3, phát hiện 2. Nay liệt kê MỌI đơn vị có
    // `next_step`, xếp theo hạng, đơn vị chưa xếp hạng nằm cuối.
    active_work: model.rows
      .filter((row) => row.nextStep)
      .sort((a, b) => (a.priorityRank ?? Infinity) - (b.priorityRank ?? Infinity) || compareText(a.key, b.key))
      .map((row) => ({
        id: row.key,
        unit: row.key,
        title: row.nextStep,
        rank: Number.isFinite(row.priorityRank) ? row.priorityRank : null,
        claim: null
      })),
    health: model.health
  };
  return `${JSON.stringify(map, null, 2)}\n`;
}

/* --- S2: so sánh repo-map.json ------------------------------------------
   So theo NGHĨA (JSON đã bỏ hai trường đổi theo commit), không so theo chữ.
   So theo chữ thì một lần đổi thứ tự khoá vô hại cũng làm cổng đỏ. */
export function compareRepoMap(expected, actual) {
  const strip = (text, label) => {
    let parsed;
    try { parsed = JSON.parse(text); }
    catch { return { broken: `${label}: không phải JSON hợp lệ` }; }
    // Bỏ qua GIÁ TRỊ (nó đổi theo từng commit), nhưng vẫn ĐÒI KHOÁ CÓ MẶT và đúng
    // kiểu. Bản trước xoá vô điều kiện, nên một `repo-map.json` mất hẳn hai trường
    // xuất xứ vẫn được coi là khớp — hợp đồng cross-repo mất khả năng truy nguồn mà
    // cổng vẫn xanh. Codex phát hiện 3, GPT xếp MAJOR; hai auditor cùng chỉ một chỗ.
    // Đòi ĐÚNG HÌNH DẠNG, không chỉ "là chuỗi không rỗng". Bản trước nhận cả `khac123`
    // làm mã commit hợp lệ — tức trường truy nguồn có thể chứa rác mà cổng vẫn xanh,
    // đúng thứ nó sinh ra để chống. Audit GPT 2026-09-02, mục 5.
    const SHAPES = {
      generated_at: { test: (value) => /^\d{4}-\d{2}-\d{2}$/.test(value), want: "ngày dạng YYYY-MM-DD" },
      generated_commit: { test: (value) => /^[0-9a-f]{7,40}$/.test(value), want: "mã commit hệ 16, 7–40 ký tự" }
    };
    for (const key of REPO_MAP_VOLATILE_KEYS) {
      const value = parsed[key];
      if (typeof value !== "string" || value.trim() === "") {
        return { broken: `${label}: thiếu hoặc sai kiểu trường xuất xứ \`${key}\` (phải là chuỗi không rỗng)` };
      }
      if (!SHAPES[key].test(value.trim())) {
        return { broken: `${label}: trường xuất xứ \`${key}\` sai hình dạng — phải là ${SHAPES[key].want}, đang là "${value}"` };
      }
      delete parsed[key];
    }
    return { value: parsed };
  };
  const left = strip(expected, "bản sinh ra");
  const right = strip(actual, REPO_MAP_FILE);
  if (right.broken) return { matches: false, reason: right.broken };
  if (left.broken) return { matches: false, reason: left.broken };
  const a = JSON.stringify(left.value, null, 2);
  const b = JSON.stringify(right.value, null, 2);
  if (a === b) return { matches: true };
  const aLines = a.split("\n");
  const bLines = b.split("\n");
  for (let i = 0; i < Math.max(aLines.length, bLines.length); i += 1) {
    if (aLines[i] !== bLines[i]) {
      return { matches: false, line: i + 1, expected: aLines[i] ?? "<thiếu dòng>", actual: bLines[i] ?? "<thiếu dòng>" };
    }
  }
  return { matches: false, reason: "khác nhau nhưng không định vị được dòng" };
}

// Giữ SỐ DÒNG THẬT trong file, không phải số thứ tự sau khi lọc. Dòng dấu commit bị lọc ra,
// nên nếu đếm theo danh sách đã lọc thì mọi dòng phía sau bị lùi một — và `--check` sẽ bảo
// Đức "lệch tại dòng 8" trong khi mở file ra thì nó nằm ở dòng 9. Lời nhắn dẫn sai chỗ cũng
// là bug, đúng luật vàng số 5.
// `\r\n?` chứ không phải `\r\n`: bắt cả CR đơn lẻ, cùng cách `parseStatus` đang làm.
function comparableLines(text) {
  return String(text).replace(/\r\n?/g, "\n").split("\n")
    .map((text, index) => ({ text, lineNumber: index + 1 }))
    .filter((entry) => !entry.text.startsWith(STAMP_PREFIX) && !entry.text.startsWith(SESSION_STAMP_PREFIX));
}

export function compareDashboard(expected, actual) {
  const expectedLines = comparableLines(expected);
  const actualLines = comparableLines(actual);
  const length = Math.max(expectedLines.length, actualLines.length);
  for (let index = 0; index < length; index += 1) {
    if (expectedLines[index]?.text !== actualLines[index]?.text) {
      return {
        matches: false,
        // Số dòng lấy theo FILE TRÊN ĐĨA (bản `actual`) — đó là file Đức sẽ mở ra xem.
        line: actualLines[index]?.lineNumber ?? expectedLines[index]?.lineNumber ?? 1,
        expected: expectedLines[index]?.text ?? "<thiếu dòng>",
        actual: actualLines[index]?.text ?? "<thiếu dòng>"
      };
    }
  }
  return { matches: true };
}

export function runDashboard({ check = false, deps = createDefaultDeps(), output = console } = {}) {
  try {
    const model = collectModel(deps);
    const generated = buildDashboard(model);
    const generatedLlms = buildLlmsTxt(model);
    const generatedMap = buildRepoMap(model);
    if (!check) {
      deps.writeFile(DASHBOARD_FILE, generated);
      deps.writeFile(LLMS_FILE, generatedLlms);
      deps.writeFile(REPO_MAP_FILE, generatedMap);
      output.log(`Đã sinh ${DASHBOARD_FILE}, ${LLMS_FILE} và ${REPO_MAP_FILE} thành công.`);
      // BẪY THỨ TỰ, phải nói to. Bộ sinh đọc HOÀN TOÀN từ HEAD. Nếu bạn vừa sửa
      // STATUS/manifest mà CHƯA commit rồi chạy lệnh này, artifact sinh ra phản ánh
      // HEAD CŨ — rồi bạn commit dữ liệu mới nằm cạnh artifact cũ, và cổng kiểm đỏ.
      // Audit Codex vòng 3 chỉ ra đúng cái bẫy này trong đề bài phiên S3.
      // Thứ tự đúng: commit nguồn TRƯỚC → chạy lệnh này → commit artifact riêng.
      const dirtyInputs = (deps.git.dirtyFiles?.(".") ?? [])
        .filter((file) => /(^|\/)(STATUS\.md|manifest\.json|claims\.json)$/i.test(file) || file.startsWith("docs/"));
      if (dirtyInputs.length) {
        output.log(`CẢNH BÁO THỨ TỰ: ${dirtyInputs.length} file đầu vào đang sửa dở chưa commit (${dirtyInputs.slice(0, 3).join(", ")}${dirtyInputs.length > 3 ? ", …" : ""}).`);
        output.log("Trang vừa sinh dựng từ HEAD nên KHÔNG có các thay đổi đó. Hãy commit nguồn trước, chạy lại lệnh này, rồi commit artifact bằng một commit riêng.");
      }
      const debt = model.health.units_without_status + model.health.dead_links
        + model.health.undeclared_dirs + model.health.draft_debt;
      if (debt > 0) {
        output.log(`Nợ điều hướng [ĐO]: chưa khai STATUS ${model.health.units_without_status} · link chết ${model.health.dead_links} · thư mục chưa khai chủ ${model.health.undeclared_dirs} · tài liệu quá hạn ${model.health.draft_debt}. Chi tiết ở Khối D của ${DASHBOARD_FILE}.`);
      }
      for (const row of model.rows.filter((item) => item.key !== "_root")) {
        const dirtyCount = (deps.git.dirtyFiles?.(row.key) ?? []).filter(isBehaviourFile).length;
        if (dirtyCount > 0) {
          output.log(`CẢNH BÁO: ${row.key} đang có ${dirtyCount} file .js sửa dở chưa commit. Trang này dựng HOÀN TOÀN TỪ HEAD, nên phần đang sửa KHÔNG có ở đây — commit trước rồi sinh lại.`);
        }
      }
      return 0;
    }

    // Kiểm CẢ BA file. Chỉ kiểm DASHBOARD thì llms.txt và repo-map.json có thể mục
    // âm thầm — mà đó lại đúng là hai file một phiên AI mới đọc đầu tiên.
    const targets = [
      { file: DASHBOARD_FILE, generated, compare: compareDashboard },
      { file: LLMS_FILE, generated: generatedLlms, compare: compareDashboard },
      { file: REPO_MAP_FILE, generated: generatedMap, compare: compareRepoMap }
    ];
    const problems = [];
    for (const target of targets) {
      if (!deps.fileExists(target.file)) {
        problems.push(`${target.file} đang thiếu nên không khớp với repo.`);
        continue;
      }
      const comparison = target.compare(target.generated, deps.readFile(target.file));
      if (comparison.matches) continue;
      if (comparison.reason) {
        problems.push(`${target.file} ${comparison.reason}.`);
        continue;
      }
      problems.push(`${target.file} lệch tại dòng ${comparison.line}. - Đang có: ${comparison.actual} | - Cần có: ${comparison.expected}`);
    }
    if (problems.length === 0) {
      output.log(`${DASHBOARD_FILE}, ${LLMS_FILE} và ${REPO_MAP_FILE} đang khớp với repo.`);
      return 0;
    }
    for (const problem of problems) output.error(problem);
    output.error("Hãy sửa bằng lệnh: node scripts/build-dashboard.mjs");
    return 1;
  } catch (error) {
    // Lỗi không phải validate (thiếu git, thiếu file, JSON hỏng...) phải in NGUYÊN VĂN
    // thông báo gốc. Nuốt nó rồi thay bằng một câu chung chung thì người đọc không biết
    // sửa gì — đúng thứ luật vàng số 5 cấm.
    const messages = error.validationErrors ?? [
      "DASHBOARD_READ_FAILED: không đọc được đủ dữ liệu từ repo. Thường là do thiếu một file đầu vào, JSON hỏng, hoặc git không chạy được ở thư mục này.",
      `Nguyên văn lỗi (tiếng Anh, để tra cứu): ${error.message}`
    ];
    output.error("Không thể sinh DASHBOARD.md:");
    for (const message of messages) output.error(`- ${message}`);
    return 1;
  }
}

/* MỘT ĐƯỜNG ĐỌC DUY NHẤT, VÀ NÓ LÀ HEAD.

   Ba vòng audit đều quay về đúng một chỗ. Vòng 1 bắt việc LIỆT KÊ đọc từ đĩa; tôi
   vá phần đó. Vòng 2 bắt tiếp: việc ĐỌC NỘI DUNG vẫn từ đĩa, nên chỉ cần sửa một
   `STATUS.md` mà chưa commit là cả ba artifact đổi theo — lời hứa "chỉ chứa sự thật
   đã commit" vẫn sai. Tôi đã tự dựng lại ca đó và thấy đúng.

   Vá phần ngọn thêm lần nữa thì lần sau lại lòi ra một kênh khác. Nên: bộ sinh
   ĐỌC HOÀN TOÀN TỪ HEAD ở CẢ HAI chế độ. Đĩa chỉ còn dùng để GHI. Hai chế độ nay
   khác nhau đúng một điểm — ghi ra file hay đem đi so — nên không còn cách nào để
   chúng bất đồng.

   Đổi lại: sửa STATUS xong phải commit rồi mới thấy bảng cập nhật. Đó đúng là quy
   trình đã ghi (commit trước → sinh lại → commit artifact), và bộ sinh nay tự nói
   ra điều đó khi thấy có file sửa dở. */
export function createDefaultDeps(root = ROOT) {
  const absolute = (relPath) => path.join(root, ...relPath.replaceAll("\\", "/").split("/"));
  const git = (...args) => execFileSync("git", ["-c", "core.quotepath=false", ...args], { cwd: root, encoding: "utf8" });
  const head = createHeadDeps(root);
  return {
    ...head,
    // `realPath` ĐÃ BỊ GỠ, và đây là lý do — không phải là nới lỏng.
    //
    // Vòng trước tôi giữ nó lại với lý lẽ "thừa thì giữ, gỡ thì không". Sai. Nó là
    // thứ DUY NHẤT còn kéo hệ thống file vào đường ĐỌC, nên lời hứa "đĩa chỉ dùng để
    // ghi" vẫn sai. Đo được (audit Codex vòng 3): xoá `manifest.json` khỏi working
    // tree trong khi HEAD vẫn có nó thì bộ sinh CHẾT, kèm thông báo dẫn sai hướng
    // hoàn toàn — "version_source trỏ RA NGOÀI package" trong khi thật ra chỉ là
    // thiếu file trên đĩa.
    //
    // Lớp nó bảo vệ là junction/symlink trỏ version_source sang package khác. Lớp đó
    // nay VÔ NGHĨA: `readFile` là `git show HEAD:<path>`, và git phân giải đường dẫn
    // trong cây commit chứ không đi theo junction của hệ thống file. Một symlink được
    // commit vào git là một blob chứa chữ, `JSON.parse` sẽ hỏng ngay. Phép kiểm chuỗi
    // (chuẩn hoá + phải nằm trong package) vẫn chạy và vẫn chặn `..`.
    // Gỡ một lớp chắn cho một kênh đã bịt thì không phải là gỡ bảo vệ.
    writeFile: (relPath, text) => fs.writeFileSync(absolute(relPath), text, "utf8"),
    git: {
      ...head.git,
      // `--no-renames` BẮT BUỘC. Mặc định git gộp đổi tên thành một dòng chỉ ghi tên MỚI,
      // nên đổi `bridge-core.js` -> `bridge-core.md` sẽ chỉ hiện một file `.md` và bị bộ lọc
      // tài liệu nuốt mất — code biến mất khỏi package mà cột vẫn khai "KHÔNG đổi". Tắt
      // gộp đi thì nó thành xoá + thêm, và vế `.js` bị xoá được đếm đúng.
      // Auditor Codex dựng được ca này thật ở vòng 2, 2026-08-26.
      changedFilesSince: (sha, dirRelPath) => parseChangedCommits(git("log", `${sha}..HEAD`, "--name-only", "--no-renames", "--pretty=format:%H", "--", dirRelPath)),
      // Việc đang sửa dở trên đĩa: sửa, thêm mới, chưa track. `-uall` để thư mục mới không
      // bị gộp thành một dòng duy nhất và giấu mất file `.js` bên trong.
      // `--no-renames` cùng lý do như trên: `git status` mặc định gộp đổi tên thành
      // `R  cu -> moi` trên MỘT dòng, nên vế `.js` cũ bị mất. Vẫn tách thêm " -> " để
      // phòng trường hợp git đổi mặc định hoặc chạy trên bản cũ.
      dirtyFiles: (dirRelPath) => parsePorcelain(git("status", "--porcelain", "-uall", "--no-renames", "--", dirRelPath))
    }
  };
}

export function createHeadDeps(root = ROOT) {
  const git = (...args) => execFileSync("git", ["-c", "core.quotepath=false", ...args], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const treeEntries = (relPath) => git("ls-tree", "-z", "--name-only", `HEAD:${relPath}`)
    .split("\0").filter(Boolean).sort(compareText);
  const objectType = (relPath) => {
    try { return git("cat-file", "-t", `HEAD:${relPath}`).trim(); }
    catch { return null; }
  };
  return {
    root,
    fileExists: (relPath) => objectType(relPath) !== null,
    isFile: (relPath) => objectType(relPath) === "blob",
    readFile: (relPath) => git("show", `HEAD:${relPath}`),
    writeFile: () => { throw new Error("HEAD_READ_ONLY: --check-head không được ghi file."); },
    // `childPath` chứ không phải `${relPath}/${name}`: khi relPath là "" (thư mục gốc
    // repo, cần cho phép đếm top-level của S2) thì cách cũ sinh ra "/docs" và
    // `cat-file -t HEAD:/docs` không phân giải được — mọi thư mục gốc sẽ bị coi là
    // không tồn tại, và số "chưa khai chủ" âm thầm về 0.
    listDirs: (relPath) => treeEntries(relPath).filter((name) => objectType(childPath(relPath, name)) === "tree"),
    listFiles: (relPath) => treeEntries(relPath).filter((name) => objectType(childPath(relPath, name)) === "blob"),
    git: {
      shortHead: () => git("rev-parse", "--short", "HEAD").trim(),
      headDate: () => git("log", "-1", "--format=%cd", "--date=format:%Y-%m-%d").trim(),
      // Ngày commit cuối chạm vào file. Dùng làm "lần rà gần nhất" để tính nợ tài
      // liệu quá hạn — vì frontmatter CỐ TÌNH không có trường `created`/`last_reviewed`:
      // ngày gõ tay sẽ mục, còn lịch sử git thì không nói dối được.
      lastCommitDate: (relPath) => git("log", "-1", "--format=%cd", "--date=format:%Y-%m-%d", "--", relPath).trim(),
      // Danh sách file ĐÃ TRACK tại HEAD. Cả chế độ đĩa lẫn chế độ HEAD đều gọi
      // đúng lệnh này, nên hai chế độ không bao giờ nhìn thấy hai tập file khác
      // nhau. `-z` để tên có dấu cách / tiếng Việt không bị git bọc dấu nháy.
      trackedPaths: () => git("ls-tree", "-r", "-z", "--name-only", "HEAD").split("\0").filter(Boolean),
      // Submodule ở tầng gốc: `ls-tree` KHÔNG có `-r` mới khai kiểu đối tượng, và
      // gitlink có kiểu "commit". Với `-r --name-only` nó chỉ là một tên trơ, không
      // có dấu "/", nên bị xếp nhầm là file.
      gitlinksAtRoot: () => git("ls-tree", "-z", "HEAD").split("\0").filter(Boolean)
        .filter((entry) => entry.split(/\s+/)[1] === "commit")
        .map((entry) => entry.slice(entry.indexOf("\t") + 1)),
      verifyCommit: (sha) => {
        try {
          git("rev-parse", "--verify", `${sha}^{commit}`);
          return true;
        } catch {
          return false;
        }
      },
      changedFilesSince: (sha, dirRelPath) => parseChangedCommits(git("log", `${sha}..HEAD`, "--name-only", "--no-renames", "--pretty=format:%H", "--", dirRelPath))
    }
  };
}

function main() {
  const args = process.argv.slice(2);
  const checkHead = args.includes("--check-head");
  process.exitCode = runDashboard({
    check: checkHead || args.includes("--check"),
    deps: checkHead ? createHeadDeps() : createDefaultDeps()
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === MODULE_FILE) main();
