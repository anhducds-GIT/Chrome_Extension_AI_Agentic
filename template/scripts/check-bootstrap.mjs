/* Cổng kiểm CẤU TRÚC — 15 phép kiểm B1…B15, phiên S4.

   Mục tiêu: nợ điều hướng hiện ra BẰNG SỐ CÓ TÊN. Mỗi phép kiểm chặn đứng một câu hỏi mà
   một phiên AI mới sẽ phải đi hỏi Đức. Không trả lời được bằng repo = một khoản nợ.

   Ở phiên S4 file này CHỈ IN RA, KHÔNG CHẶN AI. Nó luôn thoát mã 0 (trừ khi chính nó hỏng).
   Bật chặn là việc của phiên S7 — đừng tiện tay bật sớm.

   Cách dùng:
     node scripts/check-bootstrap.mjs           (in tối đa 12 dòng mỗi phép kiểm)
     node scripts/check-bootstrap.mjs --all     (in hết, không cắt)

   ĐỌC TỪ HEAD, giống hệt build-dashboard.mjs. Sửa STATUS xong phải commit rồi mới thấy số
   đổi — đó là chủ ý, không phải lỗi: hai bộ đọc hai nguồn khác nhau thì sớm muộn sẽ nói hai
   con số khác nhau.

   NĂM PHÉP KIỂM DÙNG LẠI PHÉP ĐO CÓ SẴN, KHÔNG ĐO LẠI:
     B1 · B3 · B4 · B11  ← `model.health` của build-dashboard.mjs
     B2 · B5 · B7        ← `validateStatusDetailed` (mã lỗi gắn ngay tại chỗ đang đo)
   Đo lại lần thứ hai là cách chắc chắn nhất để một ngày nào đó hai con số nói khác nhau.
*/
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { collectModel, createHeadDeps, parseStatus } from "./build-dashboard.mjs";

const MODULE_FILE = path.resolve(fileURLToPath(import.meta.url));
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const NAV_ROOT = "llms.txt";
export const NAV_DEPTH_LIMIT = 3;     // B6
export const DOC_LINE_LIMIT = 200;    // B9
export const DOC_STALE_DAYS = 30;     // B14
export const ADR_DIR = "docs/adr/";   // B12 — tên thư mục, khớp ở CẢ HAI tầng (xem isAdrPath)
const DEFAULT_SHOW = 12;
const DAY = 86400;

const RED = "ĐỎ";
const WARN = "VÀNG";

// Vùng bằng chứng: chỉ được THÊM, và KHÔNG phải tài liệu điều hướng. Cùng một biểu thức mà
// build-dashboard.mjs dùng để lọc "file đổi hành vi" — giữ chung một định nghĩa.
const EVIDENCE_ZONE = /(^|\/)(evidence[^/]*|pilot-[^/]*|batch-[^/]*)\//i;
const BEHAVIOUR_EXTENSIONS = new Set([".js", ".mjs", ".json", ".html", ".css"]);
// File máy sinh: độ tươi của chúng do B8/B13 lo, không phải B14.
const GENERATED_FILES = new Set(["DASHBOARD.md", "llms.txt", "repo-map.json", "FEATURE-PARITY.md"]);

const compareText = (left, right) => left < right ? -1 : left > right ? 1 : 0;
const isMarkdown = (relPath) => relPath.toLowerCase().endsWith(".md");

/* ---------------------------------------------------------------------------
   Deps. Đọc từ HEAD như bộ sinh, cộng thêm hai thứ bộ sinh không cần:
   - `lastCommitTimes()`: MỘT lượt `git log` cho ra thời điểm chạm cuối của MỌI file.
     Gọi `git log` từng file thì với ~1000 file là ~1000 tiến trình con; và tệ hơn, hai phép
     kiểm có thể vô tình gọi khác tham số rồi ra hai đáp án cho cùng một câu hỏi.
   - `fileHistory()` / `showAt()`: chỉ B12 (ADR) cần, vì nó phải nhìn ngược lịch sử.
--------------------------------------------------------------------------- */
export function createBootstrapDeps(root = ROOT) {
  const head = createHeadDeps(root);
  const git = (...args) => execFileSync("git", ["-c", "core.quotepath=false", ...args], {
    cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 256 * 1024 * 1024
  });
  return {
    ...head,
    git: {
      ...head.git,
      lastCommitTimes: () => parseLastCommitTimes(
        git("log", "--name-only", "--no-renames", "--pretty=format:%x01%ct")
      ),
      fileHistory: (relPath) => git("log", "--reverse", "--format=%H", "--", relPath)
        .split("\n").map((line) => line.trim()).filter(Boolean),
      showAt: (sha, relPath) => { try { return git("show", `${sha}:${relPath}`); } catch { return null; } }
    }
  };
}

/* Tách riêng để test ghim được — định dạng của `git log` là thứ dễ đổi dưới chân mình nhất.
   Mỗi commit mở đầu bằng \x01 rồi tới `%ct`; sau đó là các dòng tên file. Chỉ giữ lần chạm
   ĐẦU TIÊN gặp được: `git log` đi từ mới về cũ, nên lần đầu chính là lần chạm gần nhất. */
export function parseLastCommitTimes(output) {
  const times = new Map();
  let current = null;
  for (const raw of String(output).replace(/\r\n?/g, "\n").split("\n")) {
    if (raw.startsWith("\x01")) {
      const value = Number(raw.slice(1).trim());
      current = Number.isFinite(value) ? value : null;
      continue;
    }
    const file = raw.trim();
    if (!file || current === null) continue;
    if (!times.has(file)) times.set(file, current);
  }
  return times;
}

/* ---------------------------------------------------------------------------
   Hình dạng một kết quả:
     { code, level, title, state: "ok"|"fail"|"skip", note, findings: [...] }
   Một finding:
     { tag, where, why, fix: ["…", "…"] }
   `fix` KHÔNG được rỗng. Một dòng chỉ nói "sai" mà không nói "sửa thế nào" là chưa đạt —
   đây là tiêu chí nghiệm thu của Đức, không phải trang trí.
--------------------------------------------------------------------------- */
const ok = (code, level, title, note) => ({ code, level, title, state: "ok", note, findings: [] });
const skip = (code, level, title, note) => ({ code, level, title, state: "skip", note, findings: [] });
const report = (code, level, title, findings, note) => findings.length
  ? { code, level, title, state: "fail", note, findings }
  : ok(code, level, title, note);

/* ---- B1 · thư mục có manifest.json mà không có STATUS.md ------------------ */
export function checkB1(model) {
  // K1 (2026-09-02): tên file đánh dấu đọc từ `.repo-structure.json` (khối `units`), không
  // đóng cứng "manifest.json" nữa — repo khác dùng tên khác thì thông báo lỗi phải nói đúng
  // tên của họ, nếu không người đọc sẽ đi tạo nhầm file.
  const marker = model.units?.marker ?? "manifest.json";
  const findings = model.rows.filter((row) => row.missingStatus).map((row) => ({
    tag: "NO-STATUS",
    where: row.key === "_root" ? `./${marker} (${row.name})` : `${row.key}/${marker} (${row.name})`,
    fix: [
      `tạo: ${row.key === "_root" ? "" : `${row.key}/`}STATUS.md ở cùng thư mục, chép từ STATUS.template.md`,
      "tối thiểu cần: schema, id, name, lifecycle, owner, version_source, current_focus, ref_readme, ref_handoff, next_step, priority_rank"
    ]
  }));
  return report("B1", RED, `Thư mục có ${marker} mà không có STATUS.md`, findings,
    `đã soi ${model.rows.length} đơn vị`);
}

/* ---- B2 · B5 · B7 — lấy thẳng từ validateStatusDetailed ------------------- */
const STATUS_CODE_META = {
  B2: {
    level: RED,
    title: "lifecycle: superseded mà thiếu (hoặc sai) superseded_by",
    tag: "NO-SUPERSEDED-BY",
    fix: [
      'thêm vào frontmatter: superseded_by: <đường dẫn tới bản thay thế>',
      "đường dẫn phải trỏ tới thứ CÓ THẬT trong repo, viết thẳng, không dùng \"..\" hay \"./\""
    ]
  },
  B5: {
    level: RED,
    title: "STATUS.md thiếu trường bắt buộc của schema v2",
    tag: "SCHEMA-V2",
    fix: [
      "mở STATUS.template.md ở gốc repo, đối chiếu từng trường",
      "bắt buộc: schema, id, name, lifecycle, owner, version_source, current_focus, ref_readme, ref_handoff",
      "bắt buộc CÓ ĐIỀU KIỆN: next_step + priority_rank (đơn vị còn sống) · last_verified + evidence_ref (lifecycle: active)"
    ]
  },
  B7: {
    level: RED,
    title: "lifecycle không thuộc danh sách hợp lệ",
    tag: "BAD-LIFECYCLE",
    fix: ["chọn đúng một trong: idea · building · active · paused · experimental · archived · superseded"]
  }
};

export function checkStatusCode(model, code) {
  const meta = STATUS_CODE_META[code];
  const findings = (model.statusErrors ?? [])
    .filter((entry) => entry.code === code)
    .map((entry) => ({ tag: meta.tag, where: entry.message, fix: meta.fix }));
  return report(code, meta.level, meta.title, findings);
}

/* ---- B3 · thư mục top-level chưa khai chủ --------------------------------- */
export function checkB3(model) {
  const findings = model.topLevel.filter((entry) => !entry.owner_declared).map((entry) => ({
    tag: "UNDECLARED-DIR",
    where: entry.path,
    fix: [
      `thêm vào khối "areas" của .repo-structure.json: "${entry.path}": { "steward": "_root", "mutability": "rw", "ownership_mode": "root", "note": "…" }`,
      "steward là chủ của cả thư mục; nếu chủ khai theo từng package thì đặt ownership_mode: \"per-package\""
    ]
  }));
  return report("B3", RED, "Thư mục top-level không có mục trong areas", findings,
    `đã soi ${model.topLevel.length} thư mục top-level`);
}

/* ---- B4 · link chết trong file cổng --------------------------------------- */
export function checkB4(model) {
  const findings = model.gatewayLinks.filter((entry) => !entry.exists).map((entry) => ({
    tag: "DEAD-LINK",
    where: `${entry.path} (nhãn "${entry.label}")`,
    fix: [
      "tạo file đó, HOẶC sửa đường dẫn khai sai ở nguồn sinh ra link",
      entry.unit
        ? "link đơn vị sinh từ STATUS.md của chính đơn vị — sửa ở đó rồi chạy: node scripts/build-dashboard.mjs"
        : "link cố định nằm trong gatewayLinks() của scripts/build-dashboard.mjs"
    ]
  }));
  return report("B4", RED, "Link trong DASHBOARD.md / llms.txt trỏ tới file không tồn tại", findings,
    `đã soi ${model.gatewayLinks.length} link`);
}

/* ---- B6 · độ sâu điều hướng ----------------------------------------------- */
/* "Độ sâu" = số lần phải bấm/mở file, tính từ `llms.txt` (cổng vào của AI mới, độ sâu 0).
   Một tham chiếu = link markdown `[…](đường/dẫn)` HOẶC đường dẫn nằm trong backtick — vì
   AGENTS.md mục "Sổ tay mở khi cần" trỏ đường bằng backtick chứ không phải link. Chỉ tính
   khi đường dẫn khớp một file CÓ THẬT tại HEAD, nên không có chuyện đếm nhầm chữ thường.

   Miễn trừ: vùng bằng chứng (append-only trong .repo-structure.json, cộng thư mục Pilot-…,
   Batch-…, evidence trong package) — đó là bằng chứng, không phải đường đi; và tài liệu đã khai
   `status:` khác `active` — hồ sơ đã nghỉ thì sâu là đúng. KHÔNG miễn trừ `drafts/`: nó là
   nợ thật, phiên S6 sẽ dọn. */
export function navigationDepth(deps, paths) {
  const tracked = new Set(paths);
  const depth = new Map();
  if (!tracked.has(NAV_ROOT)) return depth;
  depth.set(NAV_ROOT, 0);
  const queue = [NAV_ROOT];
  while (queue.length) {
    const current = queue.shift();
    for (const target of referencesIn(deps, current, tracked)) {
      if (depth.has(target)) continue;
      depth.set(target, depth.get(current) + 1);
      queue.push(target);
    }
  }
  return depth;
}

function referencesIn(deps, relPath, tracked) {
  if (!/\.(md|txt)$/i.test(relPath)) return [];
  let text;
  try { text = deps.readFile(relPath); } catch { return []; }
  const dir = path.posix.dirname(relPath) === "." ? "" : path.posix.dirname(relPath);
  const found = new Set();
  const consider = (raw) => {
    if (!raw) return;
    const cleaned = String(raw).split("#")[0].trim().replaceAll("\\", "/");
    // Bỏ URL ngoài (http:, mailto:) và mọi thứ không giống đường dẫn.
    if (!cleaned || /^[a-z][a-z0-9+.-]*:/i.test(cleaned)) return;
    const candidates = [path.posix.normalize(dir ? `${dir}/${cleaned}` : cleaned), path.posix.normalize(cleaned)];
    for (const candidate of candidates) {
      if (tracked.has(candidate)) { found.add(candidate); return; }
    }
  };
  for (const match of text.matchAll(/\]\(([^)\s]+)\)/g)) consider(match[1]);
  for (const match of text.matchAll(/`([^`\n]+)`/g)) consider(match[1]);
  return [...found];
}

export function checkB6(deps, appendOnlyAreas) {
  const paths = deps.git.trackedPaths();
  const depth = navigationDepth(deps, paths);
  const findings = [];
  for (const relPath of paths.filter(isMarkdown).sort(compareText)) {
    if (isEvidencePath(relPath, appendOnlyAreas)) continue;
    if (isRetiredDoc(deps, relPath)) continue;
    const reached = depth.get(relPath);
    if (reached !== undefined && reached <= NAV_DEPTH_LIMIT) continue;
    findings.push({
      tag: "DEEP-NAV",
      where: relPath,
      why: reached === undefined ? `không tới được từ ${NAV_ROOT}` : `độ sâu ${reached} (giới hạn ${NAV_DEPTH_LIMIT})`,
      fix: [
        `trỏ tới nó từ một file đang ở độ sâu ≤ ${NAV_DEPTH_LIMIT - 1} — thường là AGENTS.md (mục "Sổ tay mở khi cần") hoặc HANDOFF.md của package`,
        "hoặc nếu nó đã hết vai trò: chuyển sang docs/archive/ và đặt frontmatter `status:` khác `active`"
      ]
    });
  }
  return report("B6", WARN, `Độ sâu điều hướng > ${NAV_DEPTH_LIMIT} tính từ ${NAV_ROOT}`, findings,
    `đã tới được ${depth.size} file từ ${NAV_ROOT}`);
}

function isEvidencePath(relPath, appendOnlyAreas) {
  return EVIDENCE_ZONE.test(relPath) || appendOnlyAreas.some((area) => relPath.startsWith(area));
}

// Hồ sơ đã nghỉ thì nằm sâu là đúng. Dùng đúng khái niệm `status: active` mà Khối D dùng cho
// nợ tài liệu — hai phép kiểm hiểu "còn sống" giống nhau thì mới không cãi nhau.
//
// TỪ PHIÊN S5, ĐÂY LÀ CHỖ 112 ADR RƠI VÀO, và nói thẳng ra để phiên sau không tưởng là bug:
// ADR mang `status: Accepted`, tức khác `active`, nên B6 KHÔNG soi chúng. Đó là đúng — một
// ADR là bản ghi bất biến, ngang `evidence/`, không phải một chặng trên đường điều hướng; và
// nếu soi thì 112 file sẽ nhấn chìm 49 khoản nợ điều hướng thật. Nhưng phải nói rõ: chúng
// thoát B6 vì LUẬT NÀY, không phải vì đã có ai trỏ tới được chúng.
function isRetiredDoc(deps, relPath) {
  let text;
  try { text = deps.readFile(relPath); } catch { return false; }
  const status = parseStatus(text).frontmatter.status;
  return status !== undefined && status !== "" && status !== "active";
}

/* ---- B8 · B13 — artifact máy sinh cũ hơn STATUS ---------------------------- */
/* Cùng một phép so, hai đích khác nhau, nên viết một lần. So bằng GIÂY của commit chứ không
   bằng NGÀY: hai commit cùng ngày là chuyện thường ở repo này, so theo ngày thì một artifact
   cũ hơn nửa buổi vẫn được coi là tươi. */
export function checkGeneratedFreshness(deps, { code, file, times }) {
  const statuses = deps.git.trackedPaths().filter((relPath) => /(^|\/)STATUS\.md$/.test(relPath));
  const newest = statuses
    .map((relPath) => ({ relPath, time: times.get(relPath) }))
    .filter((entry) => Number.isFinite(entry.time))
    .sort((a, b) => b.time - a.time)[0];
  const title = `${file} cũ hơn commit gần nhất của một STATUS.md`;
  if (!newest) return skip(code, WARN, title, "không có STATUS.md nào có lịch sử commit — không đo được");
  const own = times.get(file);
  if (!Number.isFinite(own)) {
    return report(code, WARN, title, [{
      tag: `MISSING-${code}`,
      where: file,
      why: "chưa từng được commit",
      fix: [`chạy: node scripts/build-dashboard.mjs`, `rồi commit ${file}`]
    }]);
  }
  if (own >= newest.time) return ok(code, WARN, title, `${file} tươi hơn ${newest.relPath}`);
  return report(code, WARN, title, [{
    tag: `STALE-${code}`,
    where: file,
    why: `chạm cuối ${stamp(own)}, trong khi ${newest.relPath} chạm ${stamp(newest.time)}`,
    fix: ["chạy: node scripts/build-dashboard.mjs", `rồi commit ${file} (commit nguồn TRƯỚC, sinh lại SAU — bộ sinh đọc từ HEAD)`]
  }]);
}

function stamp(seconds) {
  return new Date(seconds * 1000).toISOString().slice(0, 16).replace("T", " ");
}

/* ---- B9 · AGENTS.md / CLAUDE.md quá dài ------------------------------------ */
export function checkB9(deps) {
  const findings = [];
  for (const relPath of deps.git.trackedPaths().filter((p) => /(^|\/)(AGENTS|CLAUDE)\.md$/.test(p)).sort(compareText)) {
    const lines = countLines(deps.readFile(relPath));
    if (lines <= DOC_LINE_LIMIT) continue;
    findings.push({
      tag: "TOO-LONG",
      where: relPath,
      why: `${lines} dòng (giới hạn ${DOC_LINE_LIMIT})`,
      fix: [
        "cắt phần chi tiết kỹ thuật ra một sổ tay riêng, để lại một dòng trỏ tới nó",
        "AGENTS.md gốc repo là Tầng 1 — luật chung, cố tình giữ một trang; chi tiết thuộc Tầng 2"
      ]
    });
  }
  return report("B9", WARN, `AGENTS.md / CLAUDE.md vượt ${DOC_LINE_LIMIT} dòng`, findings);
}

function countLines(text) {
  return String(text).replace(/^﻿/, "").replace(/\r\n?/g, "\n").replace(/\n$/, "").split("\n").length;
}

/* ---- B10 · CLAUDE.md chứa luật không có trong AGENTS.md -------------------- */
/* Chỉ soi DÒNG MANG LUẬT: gạch đầu dòng, danh sách đánh số, dòng bảng, và tiêu đề từ cái thứ
   hai trở đi. Văn xuôi giới thiệu và tiêu đề đầu file không bị tính — nếu tính thì CLAUDE.md
   hiện tại (một đoạn văn nói "luật nằm ở AGENTS.md, đừng chép sang đây") sẽ bị báo oan, mà
   nó đang làm ĐÚNG thứ phép kiểm này muốn.
   Nội dung trong khối code ``` cũng bỏ qua: đó là ví dụ lệnh, không phải luật. */
export function checkB10(deps) {
  const findings = [];
  for (const relPath of deps.git.trackedPaths().filter((p) => /(^|\/)CLAUDE\.md$/.test(p)).sort(compareText)) {
    const dir = path.posix.dirname(relPath) === "." ? "" : `${path.posix.dirname(relPath)}/`;
    const agentsPath = `${dir}AGENTS.md`;
    if (!deps.fileExists(agentsPath)) {
      findings.push({
        tag: "NO-AGENTS",
        where: relPath,
        why: `không có ${agentsPath} cạnh nó`,
        fix: [`tạo ${agentsPath} làm bản luật thật, rồi để ${relPath} chỉ trỏ sang nó`]
      });
      continue;
    }
    const agents = normalizeForCompare(deps.readFile(agentsPath));
    for (const line of ruleBearingLines(deps.readFile(relPath))) {
      const needle = normalizeForCompare(line.text);
      if (needle.length < 12 || agents.includes(needle)) continue;
      findings.push({
        tag: "CLAUDE-ONLY-RULE",
        where: `${relPath}:${line.lineNumber}`,
        why: `dòng luật này không có trong ${agentsPath}: "${trim(line.text, 70)}"`,
        fix: [
          `chuyển dòng đó sang ${agentsPath} (bản luật thật), rồi xoá khỏi ${relPath}`,
          `${relPath} chỉ nên trỏ sang ${agentsPath} — một bản luật, nhiều cửa vào`
        ]
      });
    }
  }
  return report("B10", RED, "CLAUDE.md chứa dòng luật không có trong AGENTS.md", findings);
}

export function ruleBearingLines(text) {
  const lines = String(text).replace(/^﻿/, "").replace(/\r\n?/g, "\n").split("\n");
  const out = [];
  let inFence = false;
  let headingsSeen = 0;
  let index = 0;
  // Bỏ frontmatter nếu có.
  if (lines[0] === "---") {
    const end = lines.indexOf("---", 1);
    if (end > 0) index = end + 1;
  }
  for (; index < lines.length; index += 1) {
    const raw = lines[index];
    if (/^\s*(```|~~~)/.test(raw)) { inFence = !inFence; continue; }
    if (inFence) continue;
    if (/^\s*#{1,6}\s/.test(raw)) {
      headingsSeen += 1;
      if (headingsSeen > 1) out.push({ text: raw, lineNumber: index + 1 });
      continue;
    }
    if (/^\s*(?:[-*+]\s|\d+[.)]\s|\|)/.test(raw)) out.push({ text: raw, lineNumber: index + 1 });
  }
  return out;
}

function normalizeForCompare(text) {
  return String(text)
    .replace(/^﻿/, "")
    .replace(/[`*_>#|]/g, " ")
    .replace(/^\s*(?:[-+]|\d+[.)])\s+/gm, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

const trim = (text, max) => {
  const flat = String(text).replace(/\s+/g, " ").trim();
  return flat.length <= max ? flat : `${flat.slice(0, max - 1)}…`;
};

/* ---- B11 · tài liệu quá hạn ttl_days --------------------------------------- */
export function checkB11(model) {
  const findings = model.docs.filter((doc) => doc.overdue).map((doc) => ({
    tag: doc.unprovable ? "TTL-UNREADABLE" : "TTL-OVERDUE",
    where: doc.path,
    why: doc.unprovable
      ? `không đọc được hạn dùng (kind: "${doc.kind || "thiếu"}", ttl_days: "${doc.ttl_days ?? "thiếu"}")`
      : `${doc.age_days} ngày kể từ lần chạm cuối, hạn ${doc.ttl_days} ngày`,
    fix: doc.unprovable
      ? [
        "thêm vào frontmatter: ttl_days: <số ngày>, và kind: brief | study | guide",
        "không chứng minh được là còn hạn thì bị tính là quá hạn — cố ý, để một trường gõ sai không làm khoản nợ tàng hình"
      ]
      : [
        "rà lại nội dung rồi commit (lần chạm cuối lấy từ git, không phải ngày gõ tay)",
        "hoặc nếu đã xong việc: đổi frontmatter sang `status: archived` và chuyển vào docs/archive/"
      ]
  }));
  return report("B11", WARN, "Tài liệu trong docs/ quá ttl_days", findings, `đã soi ${model.docs.length} tài liệu`);
}

/* ---- B12 · ADR đã Accepted bị sửa nội dung --------------------------------- */
/* Repo CHƯA có `docs/adr/` (đó là phiên S5), nên hôm nay phép kiểm này in KHÔNG ÁP DỤNG —
   không bịa ra một kết quả xanh. Phần thân vẫn được viết đủ và có test ghim bằng fixture,
   để phiên S5 tạo thư mục xong là nó chạy được ngay, không phải viết lại.

   Luật: đi xuôi lịch sử của từng file ADR, tìm commit ĐẦU TIÊN mà `status` thành Accepted.
   Sau mốc đó, mọi commit làm đổi PHẦN THÂN (ngoài frontmatter) là vi phạm — sửa frontmatter
   thì được, vì `superseded_by`/`status` chính là cách một ADR được thay thế đúng luật. */
/* ADR sống ở HAI TẦNG (ADR-0000, luật 3): `docs/adr/` ở gốc cho quyết định của cả repo, và
   `workers/<gói>/<phiên-bản>/docs/adr/` cho quyết định của một package. Bản S4 chỉ so
   `startsWith(ADR_DIR)` nên nó chỉ thấy tầng gốc — làm đúng roadmap (ADR trong package) thì
   B12 vẫn in KHÔNG ÁP DỤNG, tức phép kiểm không đạt được mục tiêu của chính nó.
   BRIEF-S5 gọi đây là "bẫy 1" và tìm ra nó trước khi ai vấp. */
export function isAdrPath(relPath) {
  return isMarkdown(relPath) && (relPath.startsWith(ADR_DIR) || relPath.includes(`/${ADR_DIR}`));
}

export function checkB12(deps) {
  const files = deps.git.trackedPaths().filter(isAdrPath).sort(compareText);
  const title = "ADR đã Accepted bị sửa nội dung";
  if (!files.length) {
    return skip("B12", RED, title, `KHÔNG ÁP DỤNG — repo chưa có thư mục \`${ADR_DIR}\` nào (gốc repo, hoặc trong package)`);
  }
  const findings = [];
  for (const relPath of files) {
    const history = deps.git.fileHistory(relPath);
    // Một file mới thêm chỉ có ĐÚNG một commit, nên không thể có commit nào SAU mốc Accepted.
    // Thoát sớm ở đây tránh đọc blob của cả trăm ADR mỗi lần chạy cổng — và nó đúng về logic,
    // không phải nới lỏng: không có commit thứ hai thì không có gì để so.
    if (history.length <= 1) continue;
    let acceptedAt = -1;
    let acceptedBody = null;
    let lechTai = null;
    for (let index = 0; index < history.length; index += 1) {
      const text = deps.git.showAt(history[index], relPath);
      if (text === null) continue;
      const { frontmatter, body } = parseStatus(text);
      const accepted = String(frontmatter.status ?? "").trim().toLowerCase() === "accepted";
      if (acceptedAt < 0) {
        if (accepted) { acceptedAt = index; acceptedBody = normalizeForCompare(body); }
        continue;
      }
      if (lechTai === null && normalizeForCompare(body) !== acceptedBody) lechTai = history[index];
    }
    if (acceptedAt < 0) continue;
    /* SO TRẠNG THÁI HIỆN TẠI, không so "đã từng bị sửa" — và đây không phải nới lỏng.

       Bản đầu báo lỗi ngay khi có MỘT commit nào đó từng đổi phần thân. Nghe đúng luật hơn,
       nhưng tôi tự chạy bài nghiệm thu phần A và thấy hậu quả: `git revert` bản sửa cũng là
       một lần đổi thân sau mốc Accepted, nên B12 ĐỎ VĨNH VIỄN và không cách nào xoá — trừ
       việc sửa lịch sử, thứ luật cấm. Một phép kiểm thuộc nhóm CHẶN mà không xoá được là cái
       bẫy khoá cả repo, đúng thứ BRIEF-S7 cảnh báo ở mục điều kiện mở.
       Nay: hỏi "nội dung ADR HIỆN TẠI có còn đúng bản đã Accepted không". Sửa rồi hoàn nguyên
       thì xanh lại — và lịch sử git vẫn giữ nguyên dấu vết, không ai xoá được nó. */
    const hienTai = normalizeForCompare(parseStatus(deps.readFile(relPath)).body);
    if (hienTai === acceptedBody) continue;
    findings.push({
      tag: "ADR-EDITED",
      where: relPath,
      why: `phần thân HIỆN TẠI khác bản đã Accepted tại ${history[acceptedAt].slice(0, 7)}${lechTai ? ` (lệch từ ${lechTai.slice(0, 7)})` : ""}`,
      fix: [
        `hoàn nguyên phần thân về đúng bản đã Accepted: git show ${history[acceptedAt].slice(0, 12)}:${relPath}`,
        "muốn đổi quyết định thì viết ADR MỚI và đặt `status: superseded` cho bản cũ — ADR là biên bản, không phải bản nháp",
        "phép kiểm này so TRẠNG THÁI HIỆN TẠI, nên hoàn nguyên là xoá được nó; lịch sử git vẫn giữ dấu vết lần sửa"
      ]
    });
  }
  return report("B12", RED, title, findings, `đã soi ${files.length} ADR`);
}

/* ---- B14 · tài liệu mô tả code đã đổi lâu mà chưa đụng --------------------- */
/* Một đơn vị = một thư mục `workers/<gói>/<phiên bản>`, cộng đơn vị GỐC repo (code của nó là
   `scripts/`, tài liệu là các `.md` ở tầng ngoài cùng). So: lần chạm cuối của CODE với lần
   chạm cuối của TỪNG tài liệu trong cùng đơn vị. Chênh quá 30 ngày = tài liệu đang mô tả một
   bản code không còn tồn tại. File máy sinh không tính — độ tươi của chúng là việc của
   B8/B13. Vùng bằng chứng không tính — nó chỉ được thêm, không mô tả code. */
export function checkB14(deps, model, times) {
  const paths = deps.git.trackedPaths();
  const units = model.rows.map((row) => row.key === "_root"
    ? { key: "gốc repo", codePrefix: "scripts/", docs: paths.filter((p) => isMarkdown(p) && !p.includes("/") && !GENERATED_FILES.has(p)) }
    : { key: row.key, codePrefix: `${row.key}/`, docs: paths.filter((p) => isMarkdown(p) && path.posix.dirname(p) === row.key && !GENERATED_FILES.has(p)) });

  const findings = [];
  for (const unit of units) {
    const codeTimes = paths
      .filter((relPath) => relPath.startsWith(unit.codePrefix) && !EVIDENCE_ZONE.test(relPath))
      .filter((relPath) => BEHAVIOUR_EXTENSIONS.has(path.posix.extname(relPath).toLowerCase()))
      .map((relPath) => times.get(relPath))
      .filter(Number.isFinite);
    if (!codeTimes.length) continue;
    const codeTime = Math.max(...codeTimes);
    for (const doc of unit.docs.sort(compareText)) {
      const docTime = times.get(doc);
      if (!Number.isFinite(docTime)) continue;
      const behind = Math.floor((codeTime - docTime) / DAY);
      if (behind <= DOC_STALE_DAYS) continue;
      findings.push({
        tag: "STALE-DOC",
        where: doc,
        why: `code của ${unit.key} chạm ${stamp(codeTime)}, tài liệu này chạm ${stamp(docTime)} — chậm ${behind} ngày`,
        fix: [
          "đọc lại tài liệu, sửa chỗ đã lệch với code rồi commit",
          "nếu đọc xong thấy vẫn đúng thì vẫn commit một dòng (ví dụ ghi ngày rà) — cột này đo lần chạm, không đo nội dung"
        ]
      });
    }
  }
  return report("B14", WARN, `Tài liệu chậm hơn code cùng đơn vị quá ${DOC_STALE_DAYS} ngày`, findings,
    `đã soi ${units.length} đơn vị`);
}

/* ---- B15 · chữ operator viết không dấu (luật vàng 5) --------------------- */
/* Luật vàng 5 của `AGENTS.md` đã quy định: **chữ operator nhìn thấy là tiếng Việt**, mã lỗi
   mới dùng tiếng Anh. Ba trường `current_focus` · `next_step` · `human_action` là chữ Đức
   đọc trên bảng trạng thái — nên chúng thuộc diện đó.
   Trước khi có bảng, chưa ai đọc mấy trường này bằng mắt người, nên luật bị vi phạm âm thầm
   suốt: Đức mở bảng ra thấy "CAN DUC RELOAD EXTENSION roi chay mot chuoi de do pacing_ms".
   Luật không kiểm được bằng máy thì sớm muộn cũng bị bỏ qua — đó là lý do có phép kiểm này.

   HEURISTIC CỐ TÌNH BẢO THỦ: chỉ báo khi phần chữ dài từ 40 ký tự mà KHÔNG có LẤY MỘT dấu
   tiếng Việt nào. Một câu tiếng Việt 40 chữ cái luôn có ít nhất một dấu, nên zero dấu gần
   như chắc chắn là tiếng Việt đã bị bỏ dấu — hoặc tiếng Anh, mà tiếng Anh ở đây cũng là vi
   phạm cùng luật đó.
   Hệ quả của việc bảo thủ: một câu 200 ký tự chỉ có ĐÚNG MỘT chữ có dấu thì lọt. Chấp nhận
   có chủ đích — một phép kiểm hay báo oan sẽ bị ngó lơ, và lúc đó nó vô dụng hoàn toàn. */
const OPERATOR_FIELDS = [
  ["current_focus", "currentFocus"],
  ["next_step", "nextStep"],
  ["human_action", "humanAction"]
];
const VN_DAU = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;

export function checkB15(model) {
  const findings = [];
  for (const row of model.rows) {
    for (const [khai, field] of OPERATOR_FIELDS) {
      const text = String(row[field] ?? "").trim();
      if (!text) continue;
      // Bỏ mã, đường dẫn và tên file trước khi đo — chúng ĐƯỢC PHÉP là tiếng Anh.
      const prose = text
        .replace(/`[^`]*`/g, " ")
        .replace(/\S*\/\S*/g, " ")
        .replace(/\b[A-Z]{1,3}-\d+\b/g, " ")
        .replace(/\S*\.(?:js|mjs|md|json|html)\b/gi, " ");
      const letters = prose.replace(/[^\p{L}]/gu, "");
      if (letters.length < 40 || VN_DAU.test(prose)) continue;
      findings.push({
        tag: "NO-DIACRITICS",
        where: `${row.key === "_root" ? "STATUS.md" : row.key + "/STATUS.md"} → ${khai}`,
        why: `${letters.length} chữ cái mà không có một dấu tiếng Việt nào — Đức đọc trường này trên bảng trạng thái`,
        fix: [
          "viết lại thành tiếng Việt CÓ DẤU — đây là chữ Đức đọc trên bảng trạng thái, không phải ghi chú cho máy",
          "giữ tiếng Anh cho mã lỗi và tên định danh; bỏ thuật ngữ mà người ngoài không hiểu",
          `đang là: "${prose.trim().slice(0, 70)}…"`
        ]
      });
    }
  }
  return report("B15", WARN, "Chữ operator viết không dấu (luật vàng 5)", findings,
    `đã soi ${model.rows.length} đơn vị × ${OPERATOR_FIELDS.length} trường`);
}

/* ---------------------------------------------------------------------------
   Chạy cả 14 phép kiểm.
--------------------------------------------------------------------------- */
export function collectChecks(deps) {
  // tolerant: STATUS sai luật KHÔNG được giết cổng kiểm — nó sinh ra để chỉ tên cái sai.
  const model = collectModel(deps, { tolerant: true });
  const times = deps.git.lastCommitTimes();
  const appendOnly = appendOnlyAreas(deps);
  const checks = [
    checkB1(model),
    checkStatusCode(model, "B2"),
    checkB3(model),
    checkB4(model),
    checkStatusCode(model, "B5"),
    checkB6(deps, appendOnly),
    checkStatusCode(model, "B7"),
    checkGeneratedFreshness(deps, { code: "B8", file: "DASHBOARD.md", times }),
    checkB9(deps),
    checkB10(deps),
    checkB11(model),
    checkB12(deps),
    checkGeneratedFreshness(deps, { code: "B13", file: "llms.txt", times }),
    checkB14(deps, model, times),
    checkB15(model)
  ];
  // Gắn mức chặn từ cấu hình. Làm ở ĐÂY, một chỗ duy nhất, để không có đường nào dựng ra một
  // danh sách phép kiểm mà quên gắn — quên gắn nghĩa là `blocking` undefined, và undefined thì
  // không bao giờ chặn: một lỗ fail-open im lặng.
  const blocking = blockingCodes(deps);
  for (const check of checks) check.blocking = blocking.has(check.code);
  const laKhaiBua = [...blocking].filter((code) => !checks.some((check) => check.code === code));
  if (laKhaiBua.length) {
    throw new Error(`CHAN_MA_LA: \`bootstrap.blocking\` khai mã không tồn tại: ${laKhaiBua.join(", ")}. Sửa .repo-structure.json — một mã gõ sai là một phép kiểm tưởng đang chặn mà thật ra không chặn gì.`);
  }
  // Trả kèm `model` để nơi gọi KHÔNG phải dựng lại lần thứ hai. Dựng hai lần thì hai lần đó
  // có thể khác nhau (git đổi giữa chừng), và đó đúng là kiểu bug không ai tìm ra.
  return { checks, model };
}

// Vùng "chỉ được thêm" lấy từ chính `.repo-structure.json`, không gõ tay danh sách vào đây:
// thêm một vùng append-only mới mà phải nhớ sửa hai chỗ thì sớm muộn sẽ quên một chỗ.
function appendOnlyAreas(deps) {
  if (!deps.fileExists(".repo-structure.json")) return [];
  const areas = JSON.parse(deps.readFile(".repo-structure.json")).areas ?? {};
  return Object.entries(areas).filter(([, value]) => value?.mutability === "append-only").map(([key]) => key);
}

/* MỨC CHẶN — phiên S7. Đọc từ `.repo-structure.json`, KHÔNG viết cứng ở đây.
   Lý do đặt ngoài code: đây là chính sách (Đức chốt bật/tắt chặn từng phép kiểm), còn `level`
   của mỗi phép kiểm là bản chất của nó. Hôm nay hai thứ trùng nhau (đúng 8 phép kiểm mức ĐỎ
   đang bị chặn) nhưng chúng sẽ tách ra: S8 sẽ bật chặn thêm B6/B9 sau khi trả nợ, mà bản chất
   hai phép kiểm đó vẫn là cảnh báo chất lượng.

   FAIL CLOSED, và đây là điểm chính: thiếu khai thì NÉM, không mặc định "chẳng chặn gì".
   Cách dễ nhất để tự tháo chặn là xoá cấu hình đi — nên xoá cấu hình phải là một lỗi to,
   không phải một sự im lặng. Cùng một lý lẽ đã dùng cho `claims.json` và `areas`. */
export function blockingCodes(deps) {
  if (!deps.fileExists(".repo-structure.json")) {
    throw new Error("CHAN_THIEU_FILE: không thấy .repo-structure.json — không đọc được mức chặn nào đang bật. Không đoán hộ.");
  }
  let parsed;
  try { parsed = JSON.parse(deps.readFile(".repo-structure.json")); }
  catch (error) {
    throw new Error(`CAU_TRUC_HONG: .repo-structure.json không phải JSON đọc được (${error.message}).`);
  }
  const list = parsed?.bootstrap?.blocking;
  if (!Array.isArray(list)) {
    throw new Error('CHAN_THIEU_KHAI: .repo-structure.json không có `bootstrap.blocking` dạng mảng. Đây là danh sách phép kiểm được phép làm đỏ cổng đóng phiên; thiếu nó thì cổng không biết mình đang cưỡng chế cái gì, nên dừng thay vì lặng lẽ tha hết.');
  }
  return new Set(list.map(String));
}

// Những phép kiểm ĐANG bị chặn mà lại đỏ. Đây là thứ duy nhất được phép làm đỏ cổng đóng phiên.
export function blockingFailures(checks) {
  return checks.filter((check) => check.blocking && check.state === "fail");
}

/* Khối miễn trừ vĩnh viễn. CHƯA phép kiểm nào dùng tới nó (phép kiểm tên đường dẫn là việc
   của phiên S7) — nên nó được in ra như một ghi chú, không phải một phép kiểm giả. Nhưng một
   danh sách miễn trừ để mục nát cũng là nợ, nên ở đây có kiểm: đường dẫn nào đã biến mất
   khỏi HEAD thì phải nói ra. */
export function grandfatheredNote(deps) {
  if (!deps.fileExists(".repo-structure.json")) return null;
  const block = JSON.parse(deps.readFile(".repo-structure.json")).grandfathered;
  if (!block) return null;
  const declared = Array.isArray(block.paths) ? block.paths : [];
  const tracked = new Set(deps.git.trackedPaths());
  const gone = declared.filter((relPath) => !tracked.has(relPath));
  return { declared: declared.length, gone };
}

export function renderChecks(checks, { showLimit = DEFAULT_SHOW, extras = null } = {}) {
  const dangChan = checks.filter((check) => check.blocking).map((check) => check.code);
  const chiCanhBao = checks.filter((check) => !check.blocking).map((check) => check.code);
  const lines = [
    "",
    "CỔNG KIỂM CẤU TRÚC — 15 phép kiểm B1…B15",
    `CHẶN (đỏ là không được báo xong): ${dangChan.join(" · ") || "không có"}`,
    `CHỈ CẢNH BÁO (đỏ vẫn đóng phiên được): ${chiCanhBao.join(" · ") || "không có"}`,
    "Danh sách chặn khai ở `bootstrap.blocking` trong .repo-structure.json, không viết cứng trong code.",
    ""
  ];
  for (const check of checks) {
    const badge = check.state === "skip" ? "BỎ  " : check.state === "ok" ? "XANH" : (check.level === RED ? "ĐỎ  " : "VÀNG");
    const count = check.state === "fail" ? ` — ${check.findings.length} chỗ` : "";
    const dau = check.blocking ? " [CHẶN]" : "";
    lines.push(`  [${badge}]${dau} ${check.code} · ${check.title}${count}`);
    if (check.note) lines.push(`         ${check.note}`);
    const shown = check.findings.slice(0, showLimit);
    for (const finding of shown) {
      lines.push(`    ✗ ${check.code} ${finding.tag}: ${finding.where}`);
      if (finding.why) lines.push(`        vì: ${finding.why}`);
      for (const step of finding.fix) lines.push(`        → ${step}`);
    }
    const hidden = check.findings.length - shown.length;
    if (hidden > 0) lines.push(`    … còn ${hidden} chỗ nữa — chạy lại kèm --all để xem hết.`);
    lines.push("");
  }
  const red = checks.filter((c) => c.state === "fail" && c.level === RED);
  const warn = checks.filter((c) => c.state === "fail" && c.level === WARN);
  const redCount = red.reduce((sum, c) => sum + c.findings.length, 0);
  const warnCount = warn.reduce((sum, c) => sum + c.findings.length, 0);
  lines.push(`TỔNG: ${redCount} chỗ ĐỎ (${red.map((c) => c.code).join(", ") || "không có"}) · ${warnCount} chỗ VÀNG (${warn.map((c) => c.code).join(", ") || "không có"})`);
  // Dòng máy đọc được. `session-check.mjs` grep đúng tiền tố này để nói cho người đóng phiên
  // biết vì sao cổng đỏ. Đổi chữ ở đây thì phải đổi cả bên đó — có test ghim hai đầu.
  const chan = blockingFailures(checks);
  lines.push(chan.length
    ? `CHAN: ${chan.map((c) => `${c.code} (${c.findings.length} chỗ)`).join(", ")} — thuộc nhóm CHẶN nên KHÔNG được báo xong. Sửa rồi chạy lại.`
    : "CHAN: không có — mọi phép kiểm thuộc nhóm CHẶN đều đạt.");
  const skipped = checks.filter((c) => c.state === "skip");
  if (skipped.length) lines.push(`BỎ QUA: ${skipped.map((c) => `${c.code} (${c.note})`).join(" · ")}`);
  if (extras?.drift) {
    lines.push(`NGOÀI 14 PHÉP KIỂM: ${extras.drift} chỗ trong STATUS đang gõ tay một con số MÁY SỞ HỮU. Chạy: node scripts/build-dashboard.mjs để xem nguyên văn.`);
  }
  if (extras?.grandfathered) {
    const { declared, gone } = extras.grandfathered;
    // KHÔNG nói "phiên S7 sẽ dùng" nữa: S7 đã chạy và cố ý KHÔNG dùng khối này. Phép kiểm tên
    // đường dẫn chưa tồn tại trong B1…B15, nên nói nó "sắp được dùng" là hứa hộ một phiên
    // không có thật. Nói đúng cái nó đang làm: kiểm ngược, chống danh sách miễn trừ mục nát.
    lines.push(`MIỄN TRỪ VĨNH VIỄN: ${declared} đường dẫn cũ (có dấu cách / tiếng Việt có dấu) khai ở khối "grandfathered" của .repo-structure.json. B1…B15 KHÔNG có phép kiểm tên đường dẫn, nên khối này hiện chỉ được kiểm NGƯỢC: đường dẫn nào đã biến mất khỏi HEAD thì phải xoá khỏi danh sách.`);
    if (gone.length) {
      lines.push(`  ✗ ${gone.length} đường dẫn trong danh sách miễn trừ KHÔNG còn ở HEAD: ${gone.slice(0, 3).join(", ")}${gone.length > 3 ? ", …" : ""}`);
      lines.push("        → xoá chúng khỏi khối \"grandfathered\" — danh sách miễn trừ để mục nát cũng là một khoản nợ.");
    }
  }
  lines.push("");
  return lines;
}

export function runBootstrapCheck({ deps = createBootstrapDeps(), output = console, showLimit = DEFAULT_SHOW } = {}) {
  let collected;
  try {
    collected = collectChecks(deps);
  } catch (error) {
    // Đầu vào không đọc nổi (claims.json / .repo-structure.json hỏng, không có git).
    // In NGUYÊN VĂN, và thoát khác 0 — đây là "cổng kiểm hỏng", không phải "repo có nợ".
    output.error("");
    output.error("CỔNG KIỂM CẤU TRÚC KHÔNG CHẠY ĐƯỢC — không đọc nổi đầu vào.");
    output.error(`Nguyên văn lỗi: ${error.message}`);
    output.error("Thường là .agents/claims.json hoặc .repo-structure.json hỏng JSON, hoặc git không chạy được ở thư mục này.");
    output.error("");
    return 2;
  }
  const { checks, model } = collected;
  const extras = {
    drift: (model.statusErrors ?? []).filter((entry) => entry.code === "DRIFT").length,
    grandfathered: grandfatheredNote(deps)
  };
  for (const line of renderChecks(checks, { showLimit, extras })) output.log(line);
  /* BA MÃ THOÁT, và chúng KHÔNG được gộp — phiên S7.
       0 = không có phép kiểm thuộc nhóm CHẶN nào đỏ. Cảnh báo (B6, B9…) vẫn có thể đỏ.
       1 = có nợ thuộc nhóm CHẶN → cổng đóng phiên phải đỏ theo.
       2 = CHÍNH BỘ KIỂM không chạy được (xem khối catch ở trên).
     Gộp 1 với 2 thì người đóng phiên đọc "cổng đỏ" mà không biết mình phải sửa repo hay sửa
     bộ kiểm — hai việc khác hẳn nhau. Đây cũng là lớp fail-closed đã có từ S4: bộ kiểm hỏng
     không được im lặng thành "repo ổn". */
  return blockingFailures(checks).length ? 1 : 0;
}

function main() {
  const args = process.argv.slice(2);
  process.exitCode = runBootstrapCheck({ showLimit: args.includes("--all") ? Number.POSITIVE_INFINITY : DEFAULT_SHOW });
}

if (process.argv[1] && path.resolve(process.argv[1]) === MODULE_FILE) main();
