import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MODULE_FILE = path.resolve(fileURLToPath(import.meta.url));
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCHEMA = "extension-status/v1";
const LIFECYCLES = new Set(["idea", "building", "active", "paused", "archived", "experimental", "unclassified"]);
const REQUIRED = ["schema", "id", "name", "lifecycle", "version_source", "current_focus", "ref_readme", "ref_handoff"];
const BEHAVIOUR_EXTENSIONS = new Set([".js", ".mjs", ".json", ".html", ".css"]);
const EVIDENCE_ZONE = /(^|\/)(evidence[^/]*|pilot-[^/]*|batch-[^/]*)\//i;
export const STAMP_PREFIX = "Trang được sinh tại commit";
const compareText = (left, right) => left < right ? -1 : left > right ? 1 : 0;

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

const STATUS_NUMBER_RULES = [
  {
    kind: "parity",
    pattern: /\b(?:nợ\s+)?\d+\s+tính năng(?:\s*\+\s*\d+\s+methods?)?(?:\s+còn thiếu)?\b/giu
  },
  {
    kind: "parity",
    pattern: /\b(?:nợ\s+\d+\s+methods?|\d+\s+methods?\s+còn thiếu)\b/giu
  },
  {
    kind: "bridge",
    pattern: /\b(?:Bridge\s*\(\s*)?\d+\s+(?:lệnh|methods?)(?:\s+Bridge)?(?:\s*\))?/giu
  },
  {
    kind: "tests",
    pattern: /\b(?:\d+\s+file test|\d+(?:\/\d+)?\s+test)\b/giu
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

function measuredRow(deps, dirRelPath, manifestRelPath) {
  const manifest = readJson(deps, manifestRelPath);
  const bridgePath = dirRelPath ? `${dirRelPath}/bridge-core.js` : "bridge-core.js";
  const testsPath = dirRelPath ? `${dirRelPath}/tests` : "tests";
  const bridgeMethods = deps.fileExists(bridgePath)
    ? (deps.readFile(bridgePath).match(/registryEntry\(\{/g) ?? []).length
    : 0;
  const testFiles = deps.fileExists(testsPath)
    ? deps.listFiles(testsPath).filter((name) => name.toLowerCase().endsWith(".mjs")).length
    : 0;
  return { name: manifest.name || "KHÔNG RÕ TÊN", version: manifest.version || "KHÔNG RÕ PHIÊN BẢN", bridgeMethods, testFiles };
}

export function collectModel(deps = createDefaultDeps()) {
  const descriptors = [];
  for (const packageName of [...deps.listDirs("workers")].sort(compareText)) {
    const packagePath = `workers/${packageName}`;
    for (const versionName of [...deps.listDirs(packagePath)].sort(compareText)) {
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
    const measured = measuredRow(deps, descriptor.dirRelPath, measuredPath);
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
    const measured = item.measured ?? measuredRow(deps, item.dirRelPath, manifestPath);
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
      statusPath: item.fm ? item.statusPath : ""
    };
  });

  const rootMeasured = measuredRow(deps, "", "manifest.json");
  rows.push({
    key: "_root",
    id: "extension-observer-v0",
    ...rootMeasured,
    lifecycle: "unclassified",
    missingStatus: true,
    lastVerified: "",
    lastVerifiedCommit: "",
    lastVerifiedHow: "",
    evidenceRef: "",
    changedCount: 0,
    currentFocus: "Chưa khai STATUS; đây là một việc đang mở.",
    statusPath: ""
  });

  return {
    shortHead: deps.git.shortHead(),
    headDate: deps.git.headDate(),
    rows: rows.sort((a, b) => compareText(a.key, b.key))
  };
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

// Giữ SỐ DÒNG THẬT trong file, không phải số thứ tự sau khi lọc. Dòng dấu commit bị lọc ra,
// nên nếu đếm theo danh sách đã lọc thì mọi dòng phía sau bị lùi một — và `--check` sẽ bảo
// Đức "lệch tại dòng 8" trong khi mở file ra thì nó nằm ở dòng 9. Lời nhắn dẫn sai chỗ cũng
// là bug, đúng luật vàng số 5.
// `\r\n?` chứ không phải `\r\n`: bắt cả CR đơn lẻ, cùng cách `parseStatus` đang làm.
function comparableLines(text) {
  return String(text).replace(/\r\n?/g, "\n").split("\n")
    .map((text, index) => ({ text, lineNumber: index + 1 }))
    .filter((entry) => !entry.text.startsWith(STAMP_PREFIX));
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
    if (!check) {
      deps.writeFile("DASHBOARD.md", generated);
      output.log("Đã sinh DASHBOARD.md thành công.");
      for (const row of model.rows.filter((item) => item.key !== "_root")) {
        const dirtyCount = (deps.git.dirtyFiles?.(row.key) ?? []).filter(isBehaviourFile).length;
        if (dirtyCount > 0) {
          output.log(`CẢNH BÁO: ${row.key} đang có ${dirtyCount} file .js sửa dở chưa commit — số trên trang là số ĐÃ COMMIT, chưa tính phần đang sửa.`);
        }
      }
      return 0;
    }

    if (!deps.fileExists("DASHBOARD.md")) {
      output.error("DASHBOARD.md đang thiếu nên không khớp với repo.");
      output.error("Hãy sửa bằng lệnh: node scripts/build-dashboard.mjs");
      return 1;
    }

    const comparison = compareDashboard(generated, deps.readFile("DASHBOARD.md"));
    if (comparison.matches) {
      output.log("DASHBOARD.md đang khớp với repo.");
      return 0;
    }

    output.error(`DASHBOARD.md lệch tại dòng ${comparison.line}.`);
    output.error(`- Đang có: ${comparison.actual}`);
    output.error(`- Cần có: ${comparison.expected}`);
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

export function createDefaultDeps(root = ROOT) {
  const absolute = (relPath) => path.join(root, ...relPath.replaceAll("\\", "/").split("/"));
  const git = (...args) => execFileSync("git", ["-c", "core.quotepath=false", ...args], { cwd: root, encoding: "utf8" });
  return {
    root,
    fileExists: (relPath) => fs.existsSync(absolute(relPath)),
    isFile: (relPath) => { try { return fs.statSync(absolute(relPath)).isFile(); } catch { return false; } },
    realPath: (relPath) => { try { return fs.realpathSync(absolute(relPath)); } catch { return null; } },
    readFile: (relPath) => fs.readFileSync(absolute(relPath), "utf8"),
    writeFile: (relPath, text) => fs.writeFileSync(absolute(relPath), text, "utf8"),
    listDirs: (relPath) => fs.readdirSync(absolute(relPath), { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort(compareText),
    listFiles: (relPath) => fs.readdirSync(absolute(relPath), { withFileTypes: true }).filter((entry) => entry.isFile()).map((entry) => entry.name).sort(compareText),
    git: {
      shortHead: () => git("rev-parse", "--short", "HEAD").trim(),
      headDate: () => git("log", "-1", "--format=%cd", "--date=format:%Y-%m-%d").trim(),
      verifyCommit: (sha) => {
        try {
          git("rev-parse", "--verify", `${sha}^{commit}`);
          return true;
        } catch {
          return false;
        }
      },
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
    listDirs: (relPath) => treeEntries(relPath).filter((name) => objectType(`${relPath}/${name}`) === "tree"),
    listFiles: (relPath) => treeEntries(relPath).filter((name) => objectType(`${relPath}/${name}`) === "blob"),
    git: {
      shortHead: () => git("rev-parse", "--short", "HEAD").trim(),
      headDate: () => git("log", "-1", "--format=%cd", "--date=format:%Y-%m-%d").trim(),
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
