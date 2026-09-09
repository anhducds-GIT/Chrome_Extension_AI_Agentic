/* Test ghim cho cổng kiểm cấu trúc B1…B15 (scripts/check-bootstrap.mjs), phiên S4 + Y-05.

   LUẬT CỦA BỘ TEST NÀY — đọc trước khi thêm phép kiểm:

   1. GHIM Ở TẦNG TÍCH HỢP. Repo này đã trả giá đúng một lần: gỡ chỗ GỌI `validateStatus`
      ra khỏi đường chạy mà cả suite vẫn xanh, vì mọi test đều gọi thẳng vào hàm. Nên phép
      kiểm 1 dưới đây đi qua `collectChecks()` và đòi đủ 14 mã theo đúng thứ tự — bỏ một
      phép kiểm khỏi danh sách chạy là đỏ ngay.

   2. MỖI PHÉP KIỂM PHẢI PHÂN BIỆT ĐƯỢC HAI NHÁNH. Mỗi khối dưới đây khẳng định CẢ HAI:
      fixture sạch thì XANH, fixture bị bẻ thì ĐỎ và đúng `tag`. Chỉ khẳng định vế "đỏ" thì
      một mutation kiểu "luôn luôn báo lỗi" sẽ thoát; chỉ khẳng định vế "xanh" thì mutation
      "không bao giờ báo lỗi" sẽ thoát. Đã có hai lần kết quả mutation nói dối vì thiếu vế.

   3. `fix` KHÔNG ĐƯỢC RỖNG. Đó là tiêu chí nghiệm thu của Đức: một dòng chỉ nói "sai" mà
      không nói "sửa thế nào" là chưa đạt. Phép kiểm 2 cưỡng chế điều đó cho MỌI finding.
*/
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  ADR_DIR, adrScopeOf, checkB1, checkB3, checkB4, checkB6, checkB9, checkB10, checkB11, checkB12, checkB14, checkB15,
  blockingFailures, checkGeneratedFreshness, checkStatusCode, collectChecks, DOC_LINE_LIMIT, grandfatheredNote, isAdrPath,
  NAV_DEPTH_LIMIT, parseLastCommitTimes, renderChecks, ruleBearingLines, runBootstrapCheck
} from "../scripts/check-bootstrap.mjs";
import { collectModel } from "../scripts/build-dashboard.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let passed = 0;
const ok = (name) => { passed += 1; console.log(`  ok  ${name}`); };

const DAY = 86400;
const NOW = 1788300000;
const EXPECTED_CODES = ["B1", "B2", "B3", "B4", "B5", "B6", "B7", "B8", "B9", "B10", "B11", "B12", "B13", "B14", "B15"];

// Danh sach chan THAT cua repo (.repo-structure.json). Fixture nao ghi de
// `.repo-structure.json` cung phai khai lai khoi nay, neu khong bo kiem se fail-closed.
const CHAN_THAT = ["B1", "B2", "B3", "B4", "B5", "B7", "B10", "B12"];

const fm = (fields) => `---\n${Object.entries(fields).map(([k, v]) => `${k}: ${v}`).join("\n")}\n---\n`;

/* ---------------------------------------------------------------------------
   Fixture: một repo tí hon nhưng HỢP LỆ HOÀN TOÀN — mọi phép kiểm phải xanh.
   Từng khối test sau đó chỉ bẻ ĐÚNG MỘT thứ. Fixture mà đã sẵn đỏ thì không phân biệt
   được "luật bắt được lỗi" với "luật lúc nào cũng kêu".
--------------------------------------------------------------------------- */
function fixture(overrides = {}) {
  const files = new Map(Object.entries({
    ".agents/claims.json": JSON.stringify({ claims: { "workers/demo": { owner: null }, _root: { owner: "s4-test" } } }),
    ".repo-structure.json": JSON.stringify({
      schema_version: 1,
      profile: "P1",
      areas: {
        "docs/": { steward: "_root", mutability: "rw" },
        "scripts/": { steward: "_root", mutability: "rw" },
        "evidence/": { steward: "_root", mutability: "append-only" },
        "pilots/": { steward: "_root", mutability: "append-only" },
        "workers/": { steward: null, mutability: "rw", ownership_mode: "per-package" }
      },
      grandfathered: { paths: ["evidence/co dau cach.md"] },
      // Mức chặn (phiên S7). Fixture khai ĐÚNG danh sách thật của repo, để test đo cùng một
      // chính sách mà repo đang chạy. `overrides.blocking` cho từng ca đổi danh sách này —
      // đó là thứ chứng minh mức chặn ĐẾN TỪ CẤU HÌNH chứ không viết cứng trong code.
      bootstrap: { blocking: overrides.blocking ?? ["B1", "B2", "B3", "B4", "B5", "B7", "B10", "B12"] }
    }),
    "manifest.json": JSON.stringify({ name: "Quan sát V0", version: "0.1.0" }),
    "STATUS.md": fm({
      schema: "extension-status/v2", id: "quan-sat", name: "Quan sát V0", lifecycle: "idea",
      owner: "s4-test", version_source: "manifest.json", current_focus: "Chưa chạy pilot nào",
      ref_readme: "README.md", ref_handoff: "HANDOFF.md", next_step: "Khai trạng thái", priority_rank: "2"
    }) + "Thân ngắn.\n",
    "llms.txt": "# Repo\n\n- [AGENTS.md](AGENTS.md)\n- [HANDOFF.md](HANDOFF.md)\n- [STATUS.md](STATUS.md)\n- [DASHBOARD.md](DASHBOARD.md)\n- [CLAUDE.md](CLAUDE.md)\n",
    "AGENTS.md": "# Luật\n\n- Một package một chủ.\n\nSổ tay: `workers/demo/v1/STATUS.md` · `workers/demo/v1/README.md` · `workers/demo/v1/HANDOFF.md` · `README.md` · `docs/ghi-chu.md`\n",
    "CLAUDE.md": "# CLAUDE.md\n\nLuật nằm ở AGENTS.md cùng thư mục.\n\n@AGENTS.md\n",
    "README.md": "# Repo\n",
    "HANDOFF.md": "# Bàn giao\n",
    "DASHBOARD.md": "# Bảng\n",
    "repo-map.json": "{}",
    // Code của đơn vị GỐC repo. Không có file này thì nhánh "gốc repo" của B14 không bao giờ
    // chạy, và một đột biến gỡ miễn trừ file máy sinh sẽ thoát — đã xảy ra thật ở vòng
    // mutation đầu tiên của phiên S4.
    "scripts/gen.mjs": "export const x = 1;\n",
    "docs/ghi-chu.md": fm({ kind: "study", status: "active", ttl_days: "180" }) + "Ghi chú.\n",
    "workers/demo/v1/manifest.json": JSON.stringify({ name: "Demo", version: "1.0.0" }),
    "workers/demo/v1/STATUS.md": fm({
      schema: "extension-status/v2", id: "demo", name: "Demo", lifecycle: "building",
      owner: "s4-test", version_source: "workers/demo/v1/manifest.json", current_focus: "Đang dựng",
      ref_readme: "workers/demo/v1/README.md", ref_handoff: "workers/demo/v1/HANDOFF.md",
      next_step: "Chạy pilot đầu", priority_rank: "1"
    }) + "Thân ngắn.\n",
    "workers/demo/v1/README.md": "# Demo\n",
    "workers/demo/v1/HANDOFF.md": "# Bàn giao demo\n",
    "workers/demo/v1/bridge-core.js": "registryEntry({\n",
    "workers/demo/v1/tests/one.mjs": "",
    "evidence/co dau cach.md": "bằng chứng\n",
    // `pilots/` KHÔNG khớp biểu thức vùng bằng chứng cứng (nó chỉ khớp `pilot-…`), nên đây là
    // bằng chứng DUY NHẤT rằng miễn trừ thật sự đọc từ `.repo-structure.json`, chứ không phải
    // đang trùng hợp với regex có sẵn.
    "pilots/v0/ghi-chep.md": "ghi chép chạy thử\n",
    ...overrides.files
  }));
  for (const key of overrides.remove ?? []) files.delete(key);

  const times = new Map([...files.keys()].map((key) => [key, NOW]));
  for (const [key, value] of Object.entries(overrides.times ?? {})) times.set(key, value);

  const paths = [...files.keys()];
  const trackedSet = new Set(paths);
  const childrenOf = (relPath) => {
    const head = relPath ? `${relPath}/` : "";
    const dirs = new Set();
    const kids = [];
    for (const name of paths) {
      if (!name.startsWith(head)) continue;
      const rest = name.slice(head.length);
      if (!rest) continue;
      const slash = rest.indexOf("/");
      if (slash < 0) kids.push(rest); else dirs.add(rest.slice(0, slash));
    }
    return { dirs: [...dirs], files: kids };
  };
  return {
    root: "C:/repo co khoang trang",
    fileExists: (relPath) => trackedSet.has(relPath) || paths.some((name) => name.startsWith(`${relPath}/`)),
    isFile: (relPath) => trackedSet.has(relPath),
    readFile: (relPath) => {
      if (!files.has(relPath)) throw new Error(`fixture thiếu ${relPath}`);
      return files.get(relPath);
    },
    listDirs: (relPath) => childrenOf(relPath).dirs,
    listFiles: (relPath) => childrenOf(relPath).files,
    writeFile: () => { throw new Error("fixture không ghi"); },
    git: {
      shortHead: () => "abc1234",
      headDate: () => "2026-09-02",
      verifyCommit: () => true,
      changedFilesSince: () => [],
      dirtyFiles: () => [],
      lastCommitDate: () => "2026-09-02",
      trackedPaths: () => paths,
      gitlinksAtRoot: () => [],
      lastCommitTimes: () => times,
      fileHistory: (relPath) => (overrides.history ?? {})[relPath] ?? [],
      showAt: (sha, relPath) => (overrides.blobs ?? {})[`${sha}:${relPath}`] ?? null,
      // Mọi đường dẫn TỪNG tồn tại = file đang có, cộng mọi file có mặt trong `history` (kể cả
      // file mà ca thử cố tình KHÔNG đặt vào `files` — tức file đã bị xoá).
      pathsEver: () => [...new Set([...paths, ...Object.keys(overrides.history ?? {})])]
    }
  };
}

const modelOf = (deps) => collectModel(deps, { tolerant: true });
const codesOf = (checks) => checks.map((check) => check.code);
const find = (checks, code) => checks.find((check) => check.code === code);
const tags = (check) => check.findings.map((finding) => finding.tag);

/* ---- 1. WIRING: đủ 14 phép kiểm, đúng thứ tự, và fixture sạch thì không đỏ -- */
{
  const { checks, model } = collectChecks(fixture());
  assert.deepEqual(codesOf(checks), EXPECTED_CODES, "phải chạy đủ 15 phép kiểm B1…B15, đúng thứ tự");
  assert.equal(checks.length, 15, "15 phép kiểm, không hơn không kém");
  assert.deepEqual(model.statusErrors, [], "fixture sạch thì không có lỗi STATUS nào");
  const red = checks.filter((check) => check.state === "fail" && check.level === "ĐỎ");
  assert.deepEqual(red.map((check) => check.code), [], `fixture sạch KHÔNG được đỏ, nhưng đỏ ở: ${red.map((c) => `${c.code}:${JSON.stringify(c.findings)}`).join(" | ")}`);
  // B12 không áp dụng được (fixture không có docs/adr/) — phải nói "BỎ", không được giả xanh.
  assert.equal(find(checks, "B12").state, "skip", "chưa có docs/adr/ thì B12 phải là BỎ QUA, không phải XANH");
  assert.match(find(checks, "B12").note, /KHÔNG ÁP DỤNG/, "B12 phải nói rõ KHÔNG ÁP DỤNG");
  ok("WIRING · collectChecks chạy đủ 14 phép kiểm B1…B14 và fixture sạch thì không đỏ");
}

/* ---- 2. MỌI finding phải kèm cách sửa ------------------------------------- */
{
  // Bẻ hỏng nhiều thứ cùng lúc để gom được nhiều loại finding nhất trong một lượt.
  const deps = fixture({
    remove: ["workers/demo/v1/STATUS.md", "docs/ghi-chu.md"],
    files: {
      ".repo-structure.json": JSON.stringify({ schema_version: 1, areas: { "workers/": {} }, bootstrap: { blocking: CHAN_THAT } }),
      "CLAUDE.md": "# CLAUDE.md\n\n## Luật riêng\n\n- Luật này chỉ có ở CLAUDE.md và không có bên kia.\n",
      "workers/demo/v1/AGENTS.md": `${"x\n".repeat(DOC_LINE_LIMIT + 5)}`
    }
  });
  const { checks } = collectChecks(deps);
  const findings = checks.flatMap((check) => check.findings);
  assert.ok(findings.length >= 5, `fixture bẻ hỏng phải sinh ra nhiều finding, đang có ${findings.length}`);
  for (const finding of findings) {
    assert.ok(finding.where && String(finding.where).trim(), "finding phải nói CHỖ SAI");
    assert.ok(Array.isArray(finding.fix) && finding.fix.length > 0, `finding "${finding.where}" thiếu cách sửa — chưa đạt tiêu chí nghiệm thu`);
    for (const step of finding.fix) assert.ok(String(step).trim().length > 10, "mỗi dòng sửa phải nói được điều gì đó");
  }
  ok("NGHIỆM THU · mọi finding đều nói CẢ chỗ sai LẪN cách sửa");
}

/* ---- B1 ------------------------------------------------------------------- */
{
  const clean = checkB1(modelOf(fixture()));
  assert.equal(clean.state, "ok", "đủ STATUS thì B1 xanh");
  const broken = checkB1(modelOf(fixture({ remove: ["workers/demo/v1/STATUS.md"] })));
  assert.equal(broken.state, "fail");
  assert.deepEqual(tags(broken), ["NO-STATUS"]);
  assert.match(broken.findings[0].where, /workers\/demo\/v1\/manifest\.json/, "phải chỉ đúng thư mục thiếu STATUS");
  ok("B1 · thư mục có manifest.json mà không có STATUS.md");
}

/* ---- B2 · lấy từ validateStatusDetailed, KHÔNG đo lại --------------------- */
{
  const clean = checkStatusCode(modelOf(fixture()), "B2");
  assert.equal(clean.state, "ok");
  const deps = fixture({ files: { "workers/demo/v1/STATUS.md": fm({
    schema: "extension-status/v2", id: "demo", name: "Demo", lifecycle: "superseded",
    owner: "s4-test", version_source: "workers/demo/v1/manifest.json", current_focus: "Đã nghỉ",
    ref_readme: "workers/demo/v1/README.md", ref_handoff: "workers/demo/v1/HANDOFF.md"
  }) + "Thân.\n" } });
  const broken = checkStatusCode(modelOf(deps), "B2");
  assert.equal(broken.state, "fail");
  assert.deepEqual(tags(broken), ["NO-SUPERSEDED-BY"]);
  // Và nó phải KHÁC B5: nếu mã bị gán bừa thì hai phép kiểm sẽ cùng kêu về một dòng.
  assert.equal(checkStatusCode(modelOf(deps), "B5").state, "ok", "thiếu superseded_by là B2, không được đếm sang B5");
  ok("B2 · superseded mà thiếu superseded_by, và không lẫn sang B5");
}

/* ---- B3 ------------------------------------------------------------------- */
{
  assert.equal(checkB3(modelOf(fixture())).state, "ok", "khai đủ areas thì B3 xanh");
  const deps = fixture({ files: { ".repo-structure.json": JSON.stringify({ schema_version: 1, areas: { "workers/": {} }, bootstrap: { blocking: CHAN_THAT } }) } });
  const broken = checkB3(modelOf(deps));
  assert.equal(broken.state, "fail");
  assert.deepEqual(broken.findings.map((finding) => finding.where).sort(), ["docs/", "evidence/", "pilots/", "scripts/"],
    "chỉ còn workers/ được khai, bốn thư mục kia phải bị gọi tên");
  assert.ok(broken.findings.every((finding) => finding.tag === "UNDECLARED-DIR"));
  ok("B3 · thư mục top-level không có mục trong areas");
}

/* ---- B4 ------------------------------------------------------------------- */
{
  assert.equal(checkB4(modelOf(fixture())).state, "ok", "link đủ file thì B4 xanh");
  const broken = checkB4(modelOf(fixture({ remove: ["HANDOFF.md"] })));
  assert.equal(broken.state, "fail");
  assert.deepEqual(tags(broken), ["DEAD-LINK"]);
  assert.match(broken.findings[0].where, /HANDOFF\.md/);
  ok("B4 · link trong file cổng trỏ tới file không tồn tại");
}

/* ---- B5 ------------------------------------------------------------------- */
{
  assert.equal(checkStatusCode(modelOf(fixture()), "B5").state, "ok");
  const deps = fixture({ files: { "workers/demo/v1/STATUS.md": fm({
    schema: "extension-status/v2", id: "demo", name: "Demo", lifecycle: "building",
    owner: "s4-test", version_source: "workers/demo/v1/manifest.json", current_focus: "Đang dựng",
    ref_readme: "workers/demo/v1/README.md", ref_handoff: "workers/demo/v1/HANDOFF.md"
  }) + "Thân.\n" } });
  const broken = checkStatusCode(modelOf(deps), "B5");
  assert.equal(broken.state, "fail", "thiếu next_step + priority_rank phải bị B5 bắt");
  assert.equal(broken.findings.length, 2);
  assert.ok(broken.findings.every((finding) => finding.tag === "SCHEMA-V2"));
  ok("B5 · STATUS thiếu trường bắt buộc có điều kiện của schema v2");
}

/* ---- B6 ------------------------------------------------------------------- */
{
  const clean = checkB6(fixture(), ["evidence/", "pilots/"]);
  assert.equal(clean.state, "ok", `fixture sạch thì mọi tài liệu đều trong tầm ${NAV_DEPTH_LIMIT} bước, đang lỗi: ${JSON.stringify(clean.findings)}`);
  // Bỏ đúng một tham chiếu trong AGENTS.md -> file đó thành không tới được.
  const deps = fixture({ files: { "AGENTS.md": "# Luật\n\n- Một package một chủ.\n\nSổ tay: `workers/demo/v1/STATUS.md` · `workers/demo/v1/README.md` · `workers/demo/v1/HANDOFF.md` · `README.md`\n" } });
  const broken = checkB6(deps, ["evidence/", "pilots/"]);
  assert.equal(broken.state, "fail");
  assert.deepEqual(broken.findings.map((finding) => finding.where), ["docs/ghi-chu.md"]);
  assert.match(broken.findings[0].why, /không tới được/);
  // Vùng append-only KHÔNG được tính: "evidence/co dau cach.md" cũng không tới được, nhưng
  // nó là bằng chứng chứ không phải đường đi. Bỏ miễn trừ đi là số nhảy lên 2.
  assert.deepEqual(checkB6(deps, []).findings.map((finding) => finding.where), ["docs/ghi-chu.md", "pilots/v0/ghi-chep.md"],
    "bỏ miễn trừ append-only thì pilots/ phải bị đếm — chứng minh miễn trừ đọc thật từ .repo-structure.json");
  ok("B6 · độ sâu điều hướng, và vùng append-only được miễn trừ thật");
}

/* ---- B7 ------------------------------------------------------------------- */
{
  assert.equal(checkStatusCode(modelOf(fixture()), "B7").state, "ok");
  const deps = fixture({ files: { "workers/demo/v1/STATUS.md": fm({
    schema: "extension-status/v2", id: "demo", name: "Demo", lifecycle: "sap-xong",
    owner: "s4-test", version_source: "workers/demo/v1/manifest.json", current_focus: "Đang dựng",
    ref_readme: "workers/demo/v1/README.md", ref_handoff: "workers/demo/v1/HANDOFF.md",
    next_step: "Chạy pilot", priority_rank: "1"
  }) + "Thân.\n" } });
  const broken = checkStatusCode(modelOf(deps), "B7");
  assert.equal(broken.state, "fail");
  assert.deepEqual(tags(broken), ["BAD-LIFECYCLE"]);
  assert.equal(checkStatusCode(modelOf(deps), "B5").state, "ok", "lifecycle lạ là B7, không được đếm sang B5");
  ok("B7 · lifecycle không thuộc danh sách hợp lệ, và không lẫn sang B5");
}

/* ---- B8 · B13 ------------------------------------------------------------- */
{
  const fresh = fixture();
  const clean = checkGeneratedFreshness(fresh, { code: "B8", file: "DASHBOARD.md", times: fresh.git.lastCommitTimes() });
  assert.equal(clean.state, "ok", "DASHBOARD cùng thời điểm STATUS thì coi là tươi");

  // So theo GIÂY chứ không theo NGÀY: lệch nửa buổi trong cùng một ngày vẫn phải bị bắt.
  const stale = fixture({ times: { "DASHBOARD.md": NOW - 3600, "llms.txt": NOW - 3600 } });
  const times = stale.git.lastCommitTimes();
  const brokenB8 = checkGeneratedFreshness(stale, { code: "B8", file: "DASHBOARD.md", times });
  assert.equal(brokenB8.state, "fail", "DASHBOARD cũ hơn STATUS 1 tiếng (cùng ngày) vẫn phải bị bắt");
  assert.deepEqual(tags(brokenB8), ["STALE-B8"]);
  const brokenB13 = checkGeneratedFreshness(stale, { code: "B13", file: "llms.txt", times });
  assert.equal(brokenB13.state, "fail");
  assert.deepEqual(tags(brokenB13), ["STALE-B13"]);

  // Chưa từng commit thì phải nói ra, không được im lặng cho qua.
  const missing = fixture({ remove: ["DASHBOARD.md"] });
  const never = checkGeneratedFreshness(missing, { code: "B8", file: "DASHBOARD.md", times: missing.git.lastCommitTimes() });
  assert.deepEqual(tags(never), ["MISSING-B8"]);
  ok("B8 · B13 artifact máy sinh cũ hơn STATUS (so theo giây, không theo ngày)");
}

/* ---- B9 ------------------------------------------------------------------- */
{
  assert.equal(checkB9(fixture()).state, "ok");
  // Đúng ở NGƯỠNG: 200 dòng thì thôi, 201 dòng thì kêu. Ghim cả hai để một mutation
  // đổi `>` thành `>=` (hoặc ngược lại) không thể thoát.
  const atLimit = fixture({ files: { "workers/demo/v1/AGENTS.md": `${"x\n".repeat(DOC_LINE_LIMIT)}` } });
  assert.equal(checkB9(atLimit).state, "ok", `đúng ${DOC_LINE_LIMIT} dòng thì chưa vượt`);
  const over = fixture({ files: { "workers/demo/v1/AGENTS.md": `${"x\n".repeat(DOC_LINE_LIMIT + 1)}` } });
  const broken = checkB9(over);
  assert.equal(broken.state, "fail");
  assert.deepEqual(tags(broken), ["TOO-LONG"]);
  assert.match(broken.findings[0].why, new RegExp(`${DOC_LINE_LIMIT + 1} dòng`));
  ok("B9 · AGENTS.md / CLAUDE.md vượt giới hạn dòng, đúng ở ngưỡng");
}

/* ---- B10 ------------------------------------------------------------------ */
{
  assert.equal(checkB10(fixture()).state, "ok", "CLAUDE.md chỉ trỏ sang AGENTS.md thì xanh");
  // Văn xuôi KHÔNG bị tính là luật — nếu tính thì CLAUDE.md thật của repo bị báo oan.
  assert.deepEqual(ruleBearingLines("# CLAUDE.md\n\nLuật nằm ở AGENTS.md.\n\n@AGENTS.md\n"), [],
    "đoạn văn giới thiệu và tiêu đề đầu file không phải là luật");
  const broken = checkB10(fixture({ files: { "CLAUDE.md": "# CLAUDE.md\n\n- Được phép push thẳng lên main không cần cổng kiểm.\n" } }));
  assert.equal(broken.state, "fail");
  assert.deepEqual(tags(broken), ["CLAUDE-ONLY-RULE"]);
  // Dòng luật CÓ trong AGENTS.md thì không bị kêu — chứng minh nó thật sự đi so, chứ không
  // phải "hễ thấy gạch đầu dòng là kêu".
  assert.equal(checkB10(fixture({ files: { "CLAUDE.md": "# CLAUDE.md\n\n- Một package một chủ.\n" } })).state, "ok",
    "dòng luật đã có trong AGENTS.md thì không phải là luật riêng của CLAUDE.md");
  ok("B10 · CLAUDE.md chứa dòng luật không có trong AGENTS.md, và không báo oan văn xuôi");
}

/* ---- B11 ------------------------------------------------------------------ */
{
  assert.equal(checkB11(modelOf(fixture())).state, "ok");
  const overdue = checkB11(modelOf(fixture({ files: {
    "docs/ghi-chu.md": fm({ kind: "brief", status: "active", ttl_days: "1" }) + "Ghi chú.\n"
  } })));
  // `lastCommitDate` của fixture trả 2026-09-02 và headDate cũng vậy -> tuổi 0, chưa quá hạn.
  assert.equal(overdue.state, "ok", "cùng ngày thì chưa quá hạn");
  const unreadable = checkB11(modelOf(fixture({ files: {
    "docs/ghi-chu.md": fm({ kind: "khong-biet", status: "active" }) + "Ghi chú.\n"
  } })));
  assert.equal(unreadable.state, "fail", "không đọc được hạn dùng thì phải tính là nợ, không được im lặng tha");
  assert.deepEqual(tags(unreadable), ["TTL-UNREADABLE"]);
  ok("B11 · tài liệu quá ttl_days, và hạn không đọc được thì tính là nợ");
}

/* ---- B12 · sổ định danh quyết định (ADR-0026) -----------------------------
   Tới 09/09 B12 hỏi "thân ADR có đổi kể từ lúc Accepted không". Đức bỏ luật bất biến ngày
   09/09: ADR nay được gộp, phân nhóm, dịch, viết lại. Câu hỏi mới: **quyết định nào từng được
   cấp số mà nay không file nào nhận**. Gộp thì tự do, mất thì ĐỎ. */
{
  const none = checkB12(fixture());
  assert.equal(none.state, "skip", "chưa có docs/adr/ thì BỎ QUA");
  assert.match(none.note, /KHÔNG ÁP DỤNG/);

  const a1 = `${ADR_DIR}0001-chon-bridge.md`;
  const a2 = `${ADR_DIR}0002-doi-y.md`;
  const than = (t) => `# ADR\n\n## Quyết định\n\n${t}\n`;
  const banA1 = fm({ status: "Accepted", adr: "0001" }) + than("Chọn Bridge.");
  const banA2 = fm({ status: "Accepted", adr: "0002" }) + than("Đổi sang WebSocket.");

  // ⑴ CHIỀU XANH — hai file, hai số, không mất gì.
  const dayDu = fixture({
    files: { [a1]: banA1, [a2]: banA2 },
    history: { [a1]: ["s1"], [a2]: ["s2"] },
    blobs: { [`s1:${a1}`]: banA1, [`s2:${a2}`]: banA2 }
  });
  assert.equal(checkB12(dayDu).state, "ok", "hai ADR, hai số, không mất gì -> xanh");

  // ⑵ VIẾT LẠI THÂN LÀ HỢP LỆ — đây là chỗ luật vừa đổi, và nếu vế này thiếu thì một bản vá
  //    "khôi phục lại phép so thân" sẽ đi qua mà suite vẫn xanh.
  const daVietLai = fixture({
    files: { [a1]: fm({ status: "Accepted", adr: "0001" }) + than("Viết lại cho gọn, cùng một quyết định.") },
    history: { [a1]: ["s1", "s2"] },
    blobs: { [`s1:${a1}`]: banA1, [`s2:${a1}`]: fm({ status: "Accepted", adr: "0001" }) + than("Viết lại.") }
  });
  assert.equal(checkB12(daVietLai).state, "ok",
    "viết lại thân ADR đã Accepted nay HỢP LỆ (ADR-0026) — B12 không còn canh chuyện đó");

  // ⑶ GỘP HAI ADR LÀM MỘT, khai `decides` -> XANH. Đây là việc Đức đặt hàng.
  const banGop = fm({ status: "Accepted", adr: "0001", decides: "[0001, 0002]" })
    + than("Gộp: chọn Bridge, rồi đổi sang WebSocket.");
  const daGop = fixture({
    files: { [a1]: banGop },
    history: { [a1]: ["s1", "s3"], [a2]: ["s2"] },
    blobs: { [`s1:${a1}`]: banA1, [`s3:${a1}`]: banGop, [`s2:${a2}`]: banA2 }
  });
  assert.equal(checkB12(daGop).state, "ok", "gộp mà khai `decides` đủ thì không mất quyết định nào");

  // ⑷ CHIỀU ĐỎ — gộp mà QUÊN khai. Đây là rủi ro thật của việc 26 file gộp còn 8.
  const gopThieu = fixture({
    files: { [a1]: fm({ status: "Accepted", adr: "0001" }) + than("Gộp nhưng quên khai 0002.") },
    history: { [a1]: ["s1", "s3"], [a2]: ["s2"] },
    blobs: {
      [`s1:${a1}`]: banA1,
      [`s3:${a1}`]: fm({ status: "Accepted", adr: "0001" }) + than("Gộp nhưng quên khai."),
      [`s2:${a2}`]: banA2
    }
  });
  const mat = checkB12(gopThieu);
  assert.equal(mat.state, "fail", "quyết định 0002 biến mất mà không ai nhận -> ĐỎ");
  assert.deepEqual(tags(mat), ["ADR-LOST"]);
  assert.match(mat.findings[0].why, /0002/, "phải gọi đúng tên số hiệu đã mất");
  assert.match(mat.findings[0].fix.join(" "), /decides/, "phải chỉ đúng đường sửa");

  // ⑸ CHIỀU ĐỎ — hai file cùng nhận một số thì không biết đọc bản nào.
  const doiChu = fixture({
    files: { [a1]: banGop, [a2]: banA2 },
    history: { [a1]: ["s1"], [a2]: ["s2"] },
    blobs: { [`s1:${a1}`]: banGop, [`s2:${a2}`]: banA2 }
  });
  const trung = checkB12(doiChu);
  assert.equal(trung.state, "fail", "0002 vừa nằm trong file gộp vừa còn file riêng -> ĐỎ");
  assert.deepEqual(tags(trung), ["ADR-DUPLICATE"]);

  ok("B12 · gộp/viết lại thì tự do, MẤT hoặc TRÙNG một quyết định thì đỏ (ADR-0026)");
}

/* ---- B12 · số hiệu đánh THEO TỪNG THƯ MỤC ---------------------------------
   ADR-0000 luật 3. Bản đầu của phép kiểm mới dùng SỐ TRẦN làm định danh và lập tức báo 50 chỗ
   trùng oan trên repo thật — `0001` ở gốc và `0001` trong mỗi gói là bốn quyết định khác nhau.
   Chính phép kiểm bắt được lỗi mô hình của nó, và vế này giữ cho nó không tái phát. */
{
  const goc = `${ADR_DIR}0001-quyet-dinh-goc.md`;
  const goi = "workers/demo/v1/docs/adr/0001-quyet-dinh-goi.md";
  const b = (n) => fm({ status: "Accepted", adr: n }) + "# ADR\n\n## Quyết định\n\nX.\n";
  const haiTang = fixture({
    files: { [goc]: b("0001"), [goi]: b("0001") },
    history: { [goc]: ["s1"], [goi]: ["s2"] },
    blobs: { [`s1:${goc}`]: b("0001"), [`s2:${goi}`]: b("0001") }
  });
  assert.equal(checkB12(haiTang).state, "ok",
    "cùng số 0001 nhưng KHÁC thư mục là hai quyết định khác nhau — không được báo trùng");

  assert.equal(adrScopeOf(goc), ADR_DIR);
  assert.equal(adrScopeOf(goi), "workers/demo/v1/docs/adr/");

  // Quét CẢ HAI tầng (bẫy 1 của BRIEF-S5) — vế này giữ nguyên từ bản cũ, nó vẫn đúng.
  assert.equal(isAdrPath("docs/adr/0000-x.md"), true, "ADR gốc repo");
  assert.equal(isAdrPath("workers/duc-auto-gemini/v0.2.0/docs/adr/0001-x.md"), true, "ADR trong package");
  assert.equal(isAdrPath("docs/adr/README.txt"), false, "không phải .md thì không phải ADR");
  assert.equal(isAdrPath("docs/adrenaline/0001-x.md"), false, "trùng tiền tố chữ không phải thư mục ADR");

  // Và mất một quyết định TRONG PACKAGE cũng phải bắt được, không chỉ ở gốc repo.
  const matTrongGoi = fixture({
    files: { [goi]: b("0002") },
    history: { [goi]: ["s1", "s2"] },
    blobs: { [`s1:${goi}`]: b("0001"), [`s2:${goi}`]: b("0002") }
  });
  const kq = checkB12(matTrongGoi);
  assert.equal(kq.state, "fail", "0001 của package biến mất -> ĐỎ");
  assert.match(kq.findings[0].where, /workers\/demo\/v1\/docs\/adr/);
  ok("B12 · định danh = thư mục + số, nên hai tầng không đụng nhau mà vẫn bị canh riêng");
}

/* ---- B12 ở TẦNG TÍCH HỢP -------------------------------------------------- */
// Gọi thẳng checkB12 là chưa đủ: repo này đã trả giá vì một luật bị gỡ khỏi ĐƯỜNG CHẠY mà
// suite vẫn xanh. Ca này đi qua collectChecks, đúng như khi chạy thật.
{
  const adr = "workers/demo/v1/docs/adr/0001-quyet-dinh-goi.md";
  const b = (n) => fm({ status: "Accepted", adr: n }) + "# ADR\n\n## Quyết định\n\nX.\n";
  const deps = fixture({
    files: { [adr]: b("0007") },
    history: { [adr]: ["sha1", "sha2"] },
    blobs: { [`sha1:${adr}`]: b("0001"), [`sha2:${adr}`]: b("0007") }
  });
  const { checks } = collectChecks(deps);
  const b12 = find(checks, "B12");
  assert.equal(b12.state, "fail", "B12 phải ĐỎ khi chạy qua collectChecks, không chỉ khi gọi thẳng hàm");
  assert.equal(b12.level, "ĐỎ");
  assert.deepEqual(tags(b12), ["ADR-LOST"]);
  assert.ok(b12.findings[0].fix.length > 0, "phải nói cách sửa");

  // Và khi KHÔNG có ADR nào thì vẫn phải là BỎ QUA, không phải XANH giả.
  const { checks: khongAdr } = collectChecks(fixture());
  assert.equal(find(khongAdr, "B12").state, "skip");
  ok("TÍCH HỢP · B12 chạy thật qua collectChecks, bắt quyết định mất trong package");
}


/* ---- B14 ------------------------------------------------------------------ */
{
  const fresh = fixture();
  assert.equal(checkB14(fresh, modelOf(fresh), fresh.git.lastCommitTimes()).state, "ok");
  // Đúng ở NGƯỠNG 30 ngày: chậm đúng 30 thì thôi, chậm 31 thì kêu.
  const at30 = fixture({ times: { "workers/demo/v1/README.md": NOW - 30 * DAY } });
  assert.equal(checkB14(at30, modelOf(at30), at30.git.lastCommitTimes()).state, "ok", "chậm đúng 30 ngày thì chưa tính");
  const at31 = fixture({ times: { "workers/demo/v1/README.md": NOW - 31 * DAY } });
  const broken = checkB14(at31, modelOf(at31), at31.git.lastCommitTimes());
  assert.equal(broken.state, "fail");
  assert.deepEqual(broken.findings.map((finding) => finding.where), ["workers/demo/v1/README.md"]);
  assert.deepEqual(tags(broken), ["STALE-DOC"]);
  // File MÁY SINH không bị tính — độ tươi của chúng là việc của B8/B13.
  const generatedOld = fixture({ times: { "DASHBOARD.md": NOW - 400 * DAY } });
  assert.equal(checkB14(generatedOld, modelOf(generatedOld), generatedOld.git.lastCommitTimes()).state, "ok",
    "DASHBOARD.md là file máy sinh, B14 không được đếm nó");
  ok("B14 · tài liệu chậm hơn code cùng đơn vị, đúng ở ngưỡng 30 ngày, bỏ qua file máy sinh");
}

/* ---- parseLastCommitTimes: chỉ giữ lần chạm GẦN NHẤT ---------------------- */
{
  const times = parseLastCommitTimes("\x01200\nA.md\nB.md\n\x01100\nA.md\nC.md\n");
  assert.equal(times.get("A.md"), 200, "git log đi từ mới về cũ — lần đầu gặp là lần chạm gần nhất");
  assert.equal(times.get("B.md"), 200);
  assert.equal(times.get("C.md"), 100);
  ok("parseLastCommitTimes giữ đúng lần chạm gần nhất");
}

/* ---- Danh sách miễn trừ không được để mục nát ----------------------------- */
{
  const clean = grandfatheredNote(fixture());
  assert.equal(clean.declared, 1);
  assert.deepEqual(clean.gone, [], "đường dẫn miễn trừ còn ở HEAD thì không kêu");
  const rotten = grandfatheredNote(fixture({ remove: ["evidence/co dau cach.md"] }));
  assert.deepEqual(rotten.gone, ["evidence/co dau cach.md"], "đường dẫn miễn trừ đã biến mất thì phải nói ra");
  ok("MIỄN TRỪ · danh sách grandfathered đã mục thì phải nói ra");
}

/* ---- BA MÃ THOÁT (phiên S7 đổi hợp đồng của S4) -------------------------- */
/* S4 cho MỌI khoản nợ thoát 0 vì lúc đó chỉ in ra. S7 tách ba:
     0 = nhóm CHẶN đạt hết (cảnh báo vẫn có thể đỏ) · 1 = nợ nhóm CHẶN · 2 = bộ kiểm hỏng.
   Ghim cả ba, và ghim CẢ HAI CHIỀU cho mã 1 — thiếu chiều 0 thì một đột biến "hễ có finding
   là thoát 1" sẽ thoát, và lúc đó B6 đỏ sẽ khoá cả repo. */
const chay = (deps) => {
  const logs = []; const errs = [];
  const code = runBootstrapCheck({ deps, output: { log: (m) => logs.push(m), error: (m) => errs.push(m) } });
  return { code, out: logs.join("\n"), err: errs.join("\n") };
};

{
  // CHIỀU ĐỎ · B1 thuộc nhóm CHẶN.
  const r = chay(fixture({ remove: ["workers/demo/v1/STATUS.md"] }));
  assert.equal(r.code, 1, "B1 thuộc nhóm CHẶN — có nợ thì phải thoát 1 để cổng đóng phiên đỏ theo");
  assert.match(r.out, /CHẶN \(đỏ là không được báo xong\)/, "phải in rõ nhóm nào đang chặn");
  assert.match(r.out, /B1 NO-STATUS/, "phải in ra đúng khoản nợ vừa dựng");
  assert.match(r.out, /^CHAN: B1 \(1 chỗ\)/m, "dòng CHAN là dòng session-check grep — phải có mã và số chỗ");
  assert.match(r.out, /\[ĐỎ  \] \[CHẶN\] B1/, "dòng của phép kiểm phải mang dấu [CHẶN]");

  // ĐẦU VÀO HỎNG là chuyện khác hẳn: bộ kiểm hỏng, không phải repo có nợ.
  const bad = chay(fixture({ files: { ".agents/claims.json": "{khong-phai-json" } }));
  assert.equal(bad.code, 2, "claims.json hỏng = KHÔNG CHẠY ĐƯỢC, không được lẫn với mã 1");
  assert.match(bad.err, /CLAIMS_HONG/, "phải in nguyên văn lỗi gốc");
  ok("MÃ THOÁT · nợ nhóm CHẶN thoát 1, bộ kiểm hỏng thoát 2, hai thứ không lẫn nhau");
}

{
  // CHIỀU XANH · B6 đỏ (18 chỗ trong repo thật) nhưng B6 KHÔNG thuộc nhóm CHẶN -> vẫn thoát 0.
  // Đây là phép kiểm mà brief S7 gọi là bắt buộc: thiếu nó thì một hôm nào đó ai bật chặn B6
  // mà không ai biết.
  const deps = fixture({ files: {
    "AGENTS.md": "# Luật\n\n- Một package một chủ.\n\nSổ tay: `workers/demo/v1/STATUS.md` · `workers/demo/v1/README.md` · `workers/demo/v1/HANDOFF.md` · `README.md`\n"
  } });
  const r = chay(deps);
  const b6 = find(collectChecks(deps).checks, "B6");
  assert.equal(b6.state, "fail", "tiền đề: fixture này phải làm B6 đỏ, nếu không thì phép kiểm dưới đây vô nghĩa");
  assert.equal(b6.blocking, false, "B6 KHÔNG được nằm trong nhóm chặn");
  assert.equal(r.code, 0, "B6 chỉ cảnh báo — đỏ thì vẫn phải đóng phiên được");
  assert.match(r.out, /^CHAN: không có/m, "và phải nói rõ là nhóm CHẶN không có gì đỏ");
  ok("CHIỀU XANH · phép kiểm nhóm CẢNH BÁO đỏ thì cổng vẫn cho đóng phiên");
}

{
  // Bốn phép kiểm CHẶN khác, mỗi cái một ca hỏng thật -> đều phải thoát 1.
  const cases = [
    ["B3", fixture({ files: { ".repo-structure.json": JSON.stringify({
      schema_version: 1, areas: { "workers/": {} }, bootstrap: { blocking: ["B1", "B2", "B3", "B4", "B5", "B7", "B10", "B12"] } }) } })],
    ["B4", fixture({ remove: ["HANDOFF.md"] })],
    ["B10", fixture({ files: { "CLAUDE.md": "# CLAUDE.md\n\n- Được phép push thẳng lên main không cần cổng kiểm.\n" } })],
    // B12 nay bắt QUYẾT ĐỊNH BỊ MẤT, không bắt "thân đã sửa" (ADR-0026). Ca hỏng thật: một file
    // ADR bị xoá lúc gộp, mà file gộp quên khai `decides` — đúng rủi ro của việc 26 file còn 8.
    ["B12", (() => {
      const cu = "workers/demo/v1/docs/adr/0001-x.md";
      const gop = "workers/demo/v1/docs/adr/0002-gop.md";
      const b = (n) => fm({ status: "Accepted", adr: n }) + "# ADR\n\n## Quyết định\n\nX.\n";
      return fixture({
        files: { [gop]: b("0002") },                    // 0001 đã bị xoá khỏi cây làm việc
        history: { [cu]: ["sha1"], [gop]: ["sha2"] },
        blobs: { [`sha1:${cu}`]: b("0001"), [`sha2:${gop}`]: b("0002") }
      });
    })()]
  ];
  for (const [code, deps] of cases) {
    const r = chay(deps);
    assert.equal(r.code, 1, `${code} thuộc nhóm CHẶN — vi phạm phải thoát 1`);
    assert.match(r.out, new RegExp(`^CHAN: .*${code}`, "m"), `dòng CHAN phải nêu ${code}`);
  }
  ok("CHIỀU ĐỎ · B3 · B4 · B10 · B12 vi phạm thì đều thoát 1");
}

{
  // FAIL CLOSED trên chính CẤU HÌNH. Cách dễ nhất để tự tháo chặn là xoá cấu hình đi.
  const thieu = chay(fixture({ files: { ".repo-structure.json": JSON.stringify({
    schema_version: 1, areas: { "docs/": {}, "scripts/": {}, "evidence/": {}, "pilots/": {}, "workers/": {} } }) } }));
  assert.equal(thieu.code, 2, "thiếu bootstrap.blocking KHÔNG được lặng lẽ thành 'chẳng chặn gì'");
  assert.match(thieu.err, /CHAN_THIEU_KHAI/);

  // Và một mã gõ sai trong danh sách chặn cũng phải là lỗi to: nó là một phép kiểm tưởng
  // đang chặn mà thật ra không chặn gì.
  const gosai = chay(fixture({ blocking: ["B1", "B99"] }));
  assert.equal(gosai.code, 2, "mã lạ trong bootstrap.blocking phải báo lỗi, không được bỏ qua");
  assert.match(gosai.err, /CHAN_MA_LA.*B99/s);
  ok("FAIL CLOSED · xoá cấu hình chặn, hoặc gõ sai mã, đều thoát 2");
}

{
  // Danh sách chặn ĐẾN TỪ CẤU HÌNH, không viết cứng. Đổi cấu hình thì hành vi đổi theo —
  // không có phép kiểm này thì một đột biến "chặn mọi phép kiểm mức ĐỎ" sẽ thoát, vì hôm nay
  // hai danh sách trùng nhau.
  const deps = fixture({ blocking: ["B6"], files: {
    "AGENTS.md": "# Luật\n\n- Một package một chủ.\n\nSổ tay: `workers/demo/v1/STATUS.md` · `workers/demo/v1/README.md` · `workers/demo/v1/HANDOFF.md` · `README.md`\n"
  } });
  const { checks } = collectChecks(deps);
  assert.equal(find(checks, "B6").blocking, true, "khai B6 vào cấu hình thì B6 phải thành nhóm CHẶN");
  assert.equal(find(checks, "B1").blocking, false, "và B1 không còn chặn nữa");
  assert.equal(chay(deps).code, 1, "B6 đỏ + B6 được khai chặn -> phải thoát 1");
  // Ngược lại: danh sách rỗng thì không gì chặn được, dù B1 đỏ.
  const rong = fixture({ blocking: [], remove: ["workers/demo/v1/STATUS.md"] });
  assert.equal(chay(rong).code, 0, "danh sách chặn rỗng (khai tường minh) thì B1 đỏ vẫn thoát 0");
  ok("CẤU HÌNH · mức chặn đọc thật từ .repo-structure.json, không viết cứng trong code");
}

/* ---- Cắt bớt dòng nhưng phải nói là đã cắt -------------------------------- */
{
  const check = { code: "B6", level: "VÀNG", title: "thử", state: "fail", findings:
    Array.from({ length: 5 }, (_, index) => ({ tag: "DEEP-NAV", where: `f${index}.md`, fix: ["sửa đi"] })) };
  const text = renderChecks([check], { showLimit: 2 }).join("\n");
  assert.match(text, /còn 3 chỗ nữa/, "cắt bớt thì phải nói rõ còn bao nhiêu, đừng giấu");
  assert.match(text, /--all/, "và phải chỉ cách xem hết");
  ok("HIỂN THỊ · cắt bớt danh sách thì nói rõ còn bao nhiêu và cách xem hết");
}

/* ---- Cổng đóng phiên PHẢI thật sự gọi cổng kiểm cấu trúc ------------------ */
// Ghim ở tầng tích hợp, không tin vào ý định. Gỡ cổng con ra khỏi session-check là đỏ ở đây.
{
  const gate = fs.readFileSync(path.join(ROOT, "scripts/session-check.mjs"), "utf8");
  // Phải soi ĐÚNG LỜI GỌI, không phải soi cả file: bản trước chỉ tìm chuỗi "check-bootstrap.mjs"
  // và một đột biến đổi lời gọi sang script khác vẫn thoát, vì tên cũ còn nằm trong dòng ghi chú.
  assert.match(gate, /execFileSync\(process\.execPath,\s*\[path\.join\(ROOT,\s*"scripts",\s*"check-bootstrap\.mjs"\)\]/,
    "session-check.mjs phải THẬT SỰ chạy scripts/check-bootstrap.mjs, không phải chỉ nhắc tên nó trong ghi chú");
  // 2026-09-02, K2-2b: 8 → 9. Thêm phép kiểm "Bất biến quyền sở hữu ba tầng" (LAW `steward` ↔
  // STATE khoá quyền ↔ MÁY một hàm), vì trong cùng ngày `session-check` và `safe-push` đã quy
  // một file về hai vùng khác nhau mà cổng vẫn xanh. Con số này phải sửa BẰNG TAY ở hai chỗ —
  // đó là chủ ý: lớp chống tự tháo cổng chỉ có nghĩa nếu đổi nó là một hành động có ý thức.
  // 2026-09-03, K2-3: 9 → 10 ("Nhãn lane trong commit").
  // 2026-09-03, K2-4: 10 → 11. Thêm "Bảng quyền chưa bị sửa tay" — `claim.mjs` giữ đường ghi,
  // nhưng cùng ngày `claims.json` bị mở ra sửa tay đi vòng qua nó, lấy mất khoá của một phiên
  // đang làm dở, và KHÔNG phép kiểm nào kêu. Cổng là chỗ duy nhất nạn nhân chắc chắn chạy tới.
  // 2026-09-06, claude-handoff-tran: 12 → 13. Thêm "HANDOFF: mục mới trong trần, file đúng
  // tháng" (ADR-0011) — trần độ dài một mục nhật ký, chặn ở ĐẦU VÀO.
  // 2026-09-09, claude-luat-rasoat: 16 → 17. Thêm "Luật biên dịch sạch" — mối nối giữa SỔ CÁI
  // (docs/adr) và BẢN HIỆU LỰC (AGENTS.md + sổ tay) trước đó KHÔNG ai canh, và lượt gộp 27 ADR
  // để lại hai chỗ trích vào một quyết định ĐÃ CHẾT. Đức chốt một bộ rule compiler (ADR-0027).
  assert.match(gate, /const EXPECTED_CHECKS = 17;/, "thêm cổng con thì EXPECTED_CHECKS phải là 17 — lớp chống tự tháo cổng");
  // Và nó KHÔNG được biến nợ cấu trúc thành cổng đỏ ở phiên S4.
  // S7: cổng con nay PHẢI biến mã thoát 1 thành cổng đỏ, và phải TÁCH mã 1 (repo có nợ) khỏi
  // mã 2 (bộ kiểm hỏng). Đây là mắt nối duy nhất giữa check-bootstrap và cổng đóng phiên;
  // gỡ nó ra là cả phiên S7 thành trang trí, nên nó phải có test.
  const block = gate.slice(gate.indexOf("check(\"Cổng kiểm cấu trúc B1–B14\""));
  // `\)` bắt buộc: không có nó thì `/error\.status === 1/` khớp luôn cả `=== 101`, và một đột
  // biến đổi số so sánh (làm nhánh mã 1 không bao giờ chạy) sẽ thoát. Bắt được ở mutation S7.
  assert.match(block, /if \(error\.status === 1\)/, "cổng con phải nhận ra ĐÚNG mã thoát 1 = repo có nợ nhóm CHẶN");
  // Ghim `ok: false` NGAY TRONG nhánh đó, không chỉ ghim câu chữ. Bản trước chỉ tìm câu
  // "nhóm CHẶN nên CHƯA được báo xong" nên một đột biến đổi `ok: false` -> `ok: true` mà GIỮ
  // NGUYÊN câu chữ đã thoát sạch — cổng in ra lời cảnh báo rồi vẫn cho báo xong. Tìm được ở
  // vòng mutation của chính phiên S7.
  // Buộc `ok: false` với ĐÚNG thông báo của nhánh mã 1. Bản trước dùng `[\s\S]{0,300}?` nên
  // nó khớp sang câu `return { ok: false, … BOOTSTRAP_KHONG_CHAY_DUOC }` ngay bên dưới, và
  // đột biến `ok: false` -> `ok: true` vẫn thoát. Hai lần liên tiếp phép kiểm này ghim hụt,
  // cùng một gốc bệnh: ghim gần chỗ đúng thay vì ghim đúng chỗ.
  assert.match(block, /return \{ ok: false, msg: `\$\{tomTat\(out\)\} — có nợ thuộc nhóm CHẶN nên CHƯA được báo xong\./,
    "nhánh mã thoát 1 phải trả về ok: false kèm đúng thông báo đó — in ra lời cảnh báo rồi vẫn cho xanh là vô nghĩa");
  assert.match(block, /BOOTSTRAP_KHONG_CHAY_DUOC/, "mã khác 1 vẫn phải là 'bộ kiểm hỏng', không lẫn với nợ");
  // Thứ tự quan trọng: nhánh mã 1 phải nằm TRƯỚC nhánh 'bộ kiểm hỏng', nếu không mọi khoản nợ
  // sẽ bị dán nhãn sai và người đóng phiên đi sửa bộ kiểm thay vì sửa repo.
  assert.ok(block.indexOf("error.status === 1") < block.indexOf("BOOTSTRAP_KHONG_CHAY_DUOC"),
    "nhánh mã 1 phải xét trước nhánh bộ kiểm hỏng");
  assert.match(block, /^\s*return \{ ok: true, msg: `\$\{tomTat\(stdout\)\}/m, "mã 0 mới được xanh");
  ok("TÍCH HỢP · session-check.mjs biến mã thoát 1 thành cổng đỏ, EXPECTED_CHECKS = 12");
}

/* ---- Mắt nối cuối: MÃ THOÁT THẬT CỦA MỘT TIẾN TRÌNH ---------------------- */
// Mọi phép kiểm trên đây gọi `runBootstrapCheck` trong cùng tiến trình, nên chúng ghim GIÁ TRỊ
// TRẢ VỀ. Nhưng session-check đọc MÃ THOÁT của một tiến trình con — đó là hai thứ khác nhau,
// nối với nhau bằng đúng một dòng `process.exitCode = ...`. Dòng đó cũng phải có bằng chứng.
{
  const src = fs.readFileSync(path.join(ROOT, "scripts/check-bootstrap.mjs"), "utf8");
  assert.match(src, /process\.exitCode = runBootstrapCheck\(/, "main() phải đem giá trị trả về ra làm mã thoát");

  // Và chạy THẬT một tiến trình con để xem con số shell nhìn thấy. `deps` không tuần tự hoá
  // qua biên tiến trình được, nên ca dựng được ở đây là ca "không đọc nổi đầu vào" -> 2.
  const url = JSON.stringify(pathToFileURL(path.join(ROOT, "scripts/check-bootstrap.mjs")).href);
  const probe = `import { runBootstrapCheck } from ${url};
    process.exit(runBootstrapCheck({
      deps: { fileExists: () => false, readFile: () => "", isFile: () => false, git: {} },
      output: { log() {}, error() {} }
    }));`;
  const r = spawnSync(process.execPath, ["--input-type=module", "-e", probe], { encoding: "utf8" });
  assert.equal(r.status, 2, "đầu vào không đọc nổi -> tiến trình phải thoát 2, và shell phải THẤY đúng con số đó");
  ok("MẮT NỐI · mã thoát của tiến trình thật đúng bằng giá trị runBootstrapCheck trả về");
}

/* NGHIỆM THU CỦA ĐỨC — mỗi cảnh báo phải nói CẢ chỗ sai LẪN cách sửa.

   Tìm ra bằng audit độc lập 2026-09-02: xoá sạch dấu `→` khỏi bộ sinh thông báo thì
   toàn bộ 30+ dòng hướng dẫn mất dấu mà suite vẫn 20/20 xanh. Nội dung vẫn còn nên
   mức nhẹ, nhưng đây LÀ tiêu chí nghiệm thu Đức dùng để phán đạt hay không — thứ
   Đức dùng để chấm bài mà không có test ghim thì sớm muộn sẽ trôi. */
{
  // Từ S7, `check-bootstrap.mjs` thoát 1 khi repo có nợ thuộc nhóm CHẶN — hoàn toàn bình
  // thường, và `execFileSync` thì NÉM khi mã thoát khác 0. Không bắt lấy stdout ở đây thì
  // phép kiểm nghiệm thu này sẽ đỏ oan đúng vào ngày repo có một khoản nợ chặn. Mã 2 (bộ kiểm
  // hỏng) thì vẫn phải để nó nổ — lúc đó không có gì đáng đọc.
  const output = (() => {
    const bin = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "scripts", "check-bootstrap.mjs");
    const cwd = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
    const r = spawnSync(process.execPath, [bin], { cwd, encoding: "utf8" });
    assert.ok(r.status === 0 || r.status === 1,
      `check-bootstrap.mjs phải thoát 0 hoặc 1, nhận ${r.status}. Mã 2 = BỘ KIỂM HỎNG: ${String(r.stderr).trim().split("\n").slice(0, 3).join(" | ")}`);
    return r.stdout;
  })();
  const lines = output.split("\n");
  const warnings = lines.map((line, index) => ({ line, index })).filter((entry) => entry.line.trimStart().startsWith("✗"));
  assert.ok(warnings.length > 0, "nền: repo hiện phải có ít nhất một cảnh báo để phép kiểm này có nghĩa");

  for (const { line, index } of warnings) {
    // Đọc các dòng thụt sâu hơn ngay dưới nó, tới cảnh báo kế tiếp.
    const detail = [];
    for (let i = index + 1; i < lines.length; i += 1) {
      const next = lines[i];
      if (!next.trim() || next.trimStart().startsWith("✗") || !next.startsWith("    ")) break;
      detail.push(next);
    }
    assert.ok(detail.some((entry) => entry.includes("vì:")),
      `cảnh báo phải nói VÌ SAO sai: ${line.trim()}`);
    assert.ok(detail.some((entry) => entry.trimStart().startsWith("→")),
      `cảnh báo phải có ít nhất một dòng "→" nói CÁCH SỬA: ${line.trim()}`);
  }
  ok(`NGHIỆM THU · cả ${warnings.length} cảnh báo đều nói cả chỗ sai lẫn cách sửa`);
}

/* Y-05 — B15: chữ operator viết không dấu (luật vàng 5).
   Heuristic CỐ TÌNH bảo thủ: chỉ báo khi ≥40 chữ cái mà KHÔNG có lấy một dấu tiếng Việt nào.
   Phép kiểm này ghim đúng ranh giới đó — cả hai phía. Báo oan một lần là từ đó không ai nhìn
   nó nữa, và lúc ấy nó vô dụng hoàn toàn. */
{
  const unit = (fields) => ({ rows: [{ key: "workers/demo/v1", currentFocus: "", nextStep: "", humanAction: "", ...fields }] });
  const codes = (r) => r.findings.map((f) => f.where);

  // Không dấu, đủ dài → PHẢI báo.
  const khongDau = checkB15(unit({ nextStep: "Duc reload extension o TUNG profile roi dien ten ho so Chrome vao o trong bang" }));
  assert.equal(khongDau.state, "fail", "chu khong dau, du dai thi PHAI bao");
  assert.ok(codes(khongDau)[0].includes("next_step"), "phai chi dung ten truong sai");

  // Có dấu → im.
  assert.equal(checkB15(unit({ nextStep: "Sau khi Đức nạp lại tiện ích thì gọi bridge.sessions để đối chiếu đủ tên hồ sơ" })).state,
    "ok", "co dau thi khong duoc bao");

  // Ngắn thì im, dù không dấu — "F-21 xong" không phải văn tiếng Việt bỏ dấu.
  assert.equal(checkB15(unit({ nextStep: "F-21 xong" })).state, "ok", "chuoi ngan thi khong bao oan");

  // Mã, đường dẫn và tên file ĐƯỢC PHÉP tiếng Anh — bỏ ra TRƯỚC khi đo.
  // FIXTURE PHẢI ĐỦ DÀI ĐỂ PHÂN BIỆT. Bản đầu chỉ có 5 mã, góp 5 chữ cái — dưới ngưỡng 40 nên
  // bỏ mã hay không cũng ra cùng kết quả, và một đột biến xoá hẳn luật bỏ mã vẫn THOÁT. Đo
  // thật: nó đã thoát. Nay dùng 16 mã (48 chữ cái) để luật bỏ mã thành load-bearing.
  // Mã ba chữ: mỗi mã góp 3 chữ cái, nên 14 mã = 42 — vượt ngưỡng 40. Mã một chữ như "B-14"
  // chỉ góp 1, và đó chính là chỗ bản đầu tính sai: 16 mã mới được 16 chữ cái.
  const toanMa = "BRG-01 BRG-02 BRG-03 XLS-11 XLS-12 XLS-13 DOM-21 DOM-22 DOM-23 RUN-31 RUN-32 RUN-33 EVD-41 EVD-42";
  assert.ok(toanMa.replace(/[^A-Z]/g, "").length >= 40,
    "fixture phai du dai de luat bo ma thanh load-bearing, neu khong phep kiem nay la gia");
  assert.equal(checkB15(unit({ nextStep: toanMa })).state,
    "ok", "chi toan ma thi khong phai van tieng Viet — khong duoc bao oan");
  assert.equal(checkB15(unit({ nextStep: "`bridge.sessions` `run.trial` `diagnostics.dom_probe` `jobs.add` `run.stop`" })).state,
    "ok", "ten dinh danh trong dau nhay nguoc cung khong phai van");

  // Soi CẢ BA trường operator, không chỉ next_step.
  const baTruong = checkB15(unit({
    currentFocus: "Nang nhip lan hai sau khi Google gan co unusual activity tren trang that",
    humanAction: "Mo tung ho so Chrome roi nap lai tien ich va dien ten ho so vao o"
  }));
  assert.equal(baTruong.findings.length, 2, "phai soi ca current_focus va human_action, khong chi next_step");

  // Trường rỗng không phải vi phạm — B15 nói về CÁCH VIẾT, không nói về việc thiếu khai.
  assert.equal(checkB15(unit({})).state, "ok", "truong rong la viec cua phep kiem khac, khong phai B15");

  // Và B15 phải ở mức CẢNH BÁO: hai gói đang do phiên khác giữ, chặn là đỏ vì việc người khác.
  assert.equal(khongDau.level, "VÀNG", "B15 phai la canh bao — khong the chan vi chu cua goi minh khong so huu");
  ok("B15 bao dung chu khong dau, im voi chu co dau / chuoi ngan / toan ma; soi ca ba truong; muc canh bao");
}


/* ---- BẢN MẪU ADR KHÔNG ĐƯỢC DẠY LẠI LUẬT ĐÃ CHẾT — thay N-39 ngày 09/09 ----
 *
 * Bản cũ ghim điều NGƯỢC LẠI: nó bắt bản mẫu phải chào đời ở `Proposed`, vì "B12 chốt mốc
 * bất biến ở commit ĐẦU TIÊN mà status thành Accepted". Vế đó CHẾT 09/09 — ADR-0026 ⑵ bỏ
 * luật bất biến từng byte, và B12 đổi câu hỏi sang "có số hiệu nào biến mất không".
 *
 * KHÔNG gỡ phép ghim, ĐỔI câu hỏi của nó. Bỏ trống chỗ này thì không gì chặn người sau chép
 * lại cửa hai bước — cửa đó nay không bảo vệ gì và tốn thêm một commit, đã tốn thật một lần
 * 09/09 ở lượt tách 10 ADR cho gói `duc-auto-gg-flow-video`.
 *
 * Ghim CẢ HAI chiều: khối chép phải là `Accepted`, VÀ bản mẫu phải còn giữ lời khai vế đã
 * chết — thiếu lời khai thì người sau đọc `Accepted` như một mặc định tuỳ tiện rồi "sửa cho
 * đúng" theo luật cũ mà họ vẫn nhớ. */
{
  const mau = fs.readFileSync(path.join(ROOT, "docs", "_TEMPLATE-adr.md"), "utf8");
  const trongKhoiChep = mau.slice(mau.indexOf("Phần dưới là nội dung cần chép:"));
  assert.match(trongKhoiChep, /^status: Accepted$/m,
    "khoi noi dung can chep phai mang status: Accepted (ADR-0026 ve 2)");
  assert.doesNotMatch(trongKhoiChep, /^status: Proposed$/m,
    "cua hai buoc Proposed -> Accepted da chet 09/09, dung day lai");
  assert.ok(mau.includes("Vế đã chết"),
    "ban mau phai NOI RA rang cua hai buoc da chet, khong chi im lang bo di");
  assert.match(mau, /ADR-0026/,
    "loi khai ve da chet phai neu ten quyet dinh thay no — luat cua chinh ADR-0026");
  ok("ban mau ADR day luat DANG SONG, va noi ra ve da chet (thay N-39)");
}
/* ---- THƯỚC CÓC KHO CHỮ: con số phải ở CẤU HÌNH, không gõ cứng ------------
 *
 * Cả giá trị của thước nằm ở chỗ HẠ ĐƯỢC: mỗi lượt dọn thì kéo con số xuống, và chỗ đã hạ
 * không quay lại. Gõ cứng vào script thì hạ nó là sửa mã, mà sửa mã cần khoá `_code` — nên
 * người dọn `docs/` (khoá `_docs`) sẽ bỏ qua, và thước đứng yên mãi ở con số đầu tiên.
 *
 * Repo này đã đo đúng cái bệnh đó một lần: trước 04/09 danh sách miễn append-only bị gõ cứng
 * ở HAI script, và hai bản sao trả hai câu khác nhau cho cùng một file. */
{
  const gate = fs.readFileSync(path.join(ROOT, "scripts", "session-check.mjs"), "utf8");
  assert.match(gate, /structure\?\.docs\?\.tran_dong_khong_ke_adr/,
    "thuoc phai doc tu .repo-structure.json, khong duoc go cung vao script");
  assert.match(gate, /KHO_CHU_PHINH/, "phai co ma loi rieng de tra duoc");
  assert.match(gate, /startsWith\("docs\/adr\/"\)/,
    "phai TRU docs/adr — ADR bat bien nen chi co the to len, tinh vao thuoc la cong don vinh vien");

  const ct = JSON.parse(fs.readFileSync(path.join(ROOT, ".repo-structure.json"), "utf8"));
  assert.equal(typeof ct.docs?.tran_dong_khong_ke_adr, "number",
    "repo nay dang dung thuoc coc nen phai khai con so — bo di la tat den bao");
  ok("thuoc coc kho chu: con so o cau hinh, tru ADR, co ma loi rieng");
}

/* ---- THƯỚC THỨ BA: CÁI MỘT PHIÊN THẬT SỰ TRẢ, ĐO BẰNG KÝ TỰ -----------------
 *
 * Bản đầu (cùng ngày 09/09) đo DÒNG và nói dối ngay lượt đầu: một lượt nén giảm **32% số dòng**
 * mà chỉ giảm **7% số ký tự**. Đo `chatgpt/AGENTS.md`: 123 ký tự một dòng, gấp rưỡi `AGENTS.md`
 * gốc — thước dòng đếm thiếu nó một phần ba. **Dòng nói dối; ký tự thì không.**
 *
 * Nó cũng đo sai CHỖ: tổng 19 nơi chứa luật là con số không phiên nào trả. Ghim ba vế:
 * đơn vị là ký tự · danh sách file nạp-mọi-phiên đọc từ cấu hình · có ĐÍCH tách khỏi THƯỚC
 * (mô hình giới hạn ③: máy canh thước, không canh đích). */
{
  const gate = fs.readFileSync(path.join(ROOT, "scripts", "session-check.mjs"), "utf8");
  assert.match(gate, /NAP_MOI_PHIEN_PHINH/, "phai co ma loi rieng de tra duoc");
  assert.match(gate, /nap\.moi_phien/,
    "danh sach file nap-moi-phien phai doc tu cau hinh, khong go cung vao script");
  assert.doesNotMatch(gate, /tran_dong_ban_hieu_luc/,
    "thuoc DONG da bi bo — no do sai don vi, dung de sot lai mot ban thu hai");

  const ct = JSON.parse(fs.readFileSync(path.join(ROOT, ".repo-structure.json"), "utf8"));
  assert.equal(typeof ct.luat?.nap?.tran_ky_tu_moi_phien, "number", "phai khai THUOC");
  assert.equal(typeof ct.luat?.nap?.dich_ky_tu_moi_phien, "number",
    "phai khai DICH rieng — thuoc la con so hom nay, dich la cho phai toi");
  /* Bản đầu ghim `dich < tran` — "đích phải nhỏ hơn thước". Ngày 09/09 lượt nén đưa thước
     nap-moi-phien XUỐNG DƯỚI đích, và phép ghim đó đỏ vì ĐÃ ĐẠT. Một phép ghim đỏ khi thành công
     là một phép ghim đo sai chuyện. Cái phải ghim là THỨ TỰ Ý NGHĨA, không phải khoảng cách hôm
     nay: bien (đích thật) < dich (trần tuyệt đối) — ghim ngay dưới đây, cho cả hai thước. */
  assert.notEqual(ct.luat.nap.dich_ky_tu_moi_phien, ct.luat.nap.tran_ky_tu_moi_phien,
    "dich va thuoc phai la hai con so khac nhau — gop lam mot la mat mot tang");
  assert.ok(Array.isArray(ct.luat?.nap?.moi_phien) && ct.luat.nap.moi_phien.length,
    "phai khai file nao duoc nap moi phien");
  ok("thuoc nap moi phien: don vi KY TU, danh sach o cau hinh, dich tach khoi thuoc");

  /* BIEN — ADR-0033 (1). Duc chot 09/09: "muc tieu khong phai dat nguong, ma phai nho hon nguong
     margin 30-40%, vi sau nay se tiep tuc phinh ra". Nen moi thuoc co BA con so, khong phai hai:
     thuoc (hom nay, may canh) < ... < bien (dich that) < dich (tran tuyet doi). Ghim ca ba, va
     ghim CA THU TU — mot cai bien >= dich la mot cai bien khong mua duoc cho tho nao. */
  for (const hau of ["moi_phien", "mot_goi"]) {
    const bien = ct.luat?.nap?.[`bien_ky_tu_${hau}`];
    const dich = ct.luat?.nap?.[`dich_ky_tu_${hau}`];
    assert.equal(typeof bien, "number", `phai khai bien_ky_tu_${hau} — dich that nam DUOI tran`);
    assert.ok(bien < dich, `bien_ky_tu_${hau} phai NHO hon dich (tran tuyet doi)`);
    assert.ok(bien >= dich * 0.55 && bien <= dich * 0.75,
      `bien_ky_tu_${hau} phai nam trong dai 30-40% duoi tran nhu Duc chot`);
  }
  /* Thuoc goi do BO, khong do mot file (ADR-0033 (2)). Ghim o cong: no phai cong phan goc vao. */
  assert.match(gate, /nen \+ n > nangNhat/,
    "thuoc goi phai do BO (nen dinh tuyen + file cua goi), khong do rieng mot file");
  ok("bien tach khoi tran o ca hai thuoc, va thuoc goi do BO chu khong do mot file");
}

/* ---- HOOK: THUOC PHAI DI THEO LUAT, KHONG TUT LAI SAU NO (ADR-0034 (4)) -----
 *
 * Ngay 09/09 thuoc do `AGENTS.md` cua goi mot minh va bao "8.900 token, duoi tran", trong khi
 * phien that tra 30.500 — vi 70% hoa don nam o `HANDOFF.md`, thu ma `AGENTS.md` muc 1 bat doc
 * nhung thuoc khong dem. Do la benh DO SAI CHO, no da no HAI LAN trong mot ngay.
 *
 * Nen ghim chinh CHO NOI HAI BEN GAP NHAU: danh sach file trong cau hinh phai bang danh sach
 * file muc 1 bat doc. Them mot file vao muc 1 ma quen khai o cau hinh -> DO o day, truoc khi no
 * kip thanh mot khoan token khong ai dem. */
{
  const ct = JSON.parse(fs.readFileSync(path.join(ROOT, ".repo-structure.json"), "utf8"));
  const ds = ct.luat?.nap?.mo_phien_goi;
  assert.ok(Array.isArray(ds) && ds.length,
    "phai khai `nap.mo_phien_goi` — danh sach file cua goi ma trinh tu mo phien bat doc");

  const agents = fs.readFileSync(path.join(ROOT, "AGENTS.md"), "utf8");
  const mucMo = agents.split(/\n(?=## )/).find((m) => /\*\*Mở:\*\*/.test(m));
  assert.ok(mucMo, "AGENTS.md phai con mot muc noi trinh tu MO PHIEN (`**Mở:**`)");

  /* Cat dung CAU "Mo:", khong lay ca muc. Ban dau lay ca muc va mot con dot bien THOAT:
     them `BACKLOG.md` vao cau hinh van XANH, vi muc 1 co nhac BACKLOG.md — nhung nhac de noi
     GHI VAO DAU, khong phai NAP LUC MO. "Ten file co xuat hien" khong phai cau hoi; cau hoi la
     "no co nam trong trinh tu mo phien khong". */
  const dongMo = (mucMo.match(/\*\*Mở:\*\*[\s\S]*?(?=\n\*\*[^*]|$)/) ?? [""])[0];
  assert.ok(dongMo.length > 20, "khong cat duoc cau `**Mở:**` cua muc 1");
  const truocCanhBao = dongMo.split(/Đừng nạp/)[0];

  for (const f of ds) {
    assert.ok(truocCanhBao.includes(f),
      `\`${f}\` khai o nap.mo_phien_goi ma trinh tu MO PHIEN khong goi ten — thuoc dang dem mot file khong ai doc luc mo`);
  }
  assert.ok(!/HANDOFF\.md/.test(truocCanhBao),
    "trinh tu mo phien khong duoc bat nap HANDOFF.md — no la ~70% hoa don cu (ADR-0034)");
  ok("hook: danh sach bo mo phien o cau hinh KHOP voi AGENTS.md muc 1, va muc 1 khong nap HANDOFF");
}

/* ---- TRAN CUNG cua bo mo phien (ADR-0035 (4)) ------------------------------
 *
 * Duc chot 09/09: 2.000-3.000 token moi phien dung goi, va "phai luon duy tri o so nho nhu vay la
 * MUC TIEU CUA VIEC COMPILE". Moi thuoc truoc do trong repo la thuoc coc: no bao do, roi ai do
 * nang no len (hom nay chinh toi nang mot cai). Tran nay khong co duong do — no chan ngay luot
 * SINH. Nen thu phai ghim la: tran con do, no du nho, va cong dong CUNG MOT cong thuc voi bo sinh
 * (neu hai ben cong khac nhau thi mot ben lai do sai cho — benh da no hai lan trong mot ngay). */
{
  const ct = JSON.parse(fs.readFileSync(path.join(ROOT, ".repo-structure.json"), "utf8"));
  const ph = ct.luat?.phien_goi;
  assert.ok(ph, "phai khai `luat.phien_goi` — bo mo phien cua goi");
  assert.equal(typeof ph.tran_ky_tu, "number", "phai khai TRAN CUNG `phien_goi.tran_ky_tu`");
  assert.ok(ph.tran_ky_tu <= 6600,
    `tran bo mo phien phai <= 6600 ky tu (~3.000 token, Duc chot 09/09), dang la ${ph.tran_ky_tu}`);
  assert.ok(Array.isArray(ph.dinh_tuyen) && ph.dinh_tuyen.length,
    "phai khai `phien_goi.dinh_tuyen` — phan nen mot phien goi nap truoc PHIEN.md");
  assert.ok(typeof ph.core === "string" && ph.core, "phai khai `phien_goi.core`");

  const sinh = fs.readFileSync(path.join(ROOT, "scripts", "rule-compile.mjs"), "utf8");
  assert.match(sinh, /PHIEN_QUA_TRAN/, "bo sinh phai co ma loi rieng cho luot vuot tran");
  assert.match(sinh, /boKyTu > tran/,
    "bo sinh phai so CA BO voi tran, khong so rieng PHIEN.md");
  assert.match(sinh, /loi\+\+; continue;[\s\S]{0,80}const duong = path\.join\(ROOT, thuMuc, "PHIEN\.md"\)/,
    "vuot tran phai TU CHOI GHI (tang loi roi continue), khong phai canh bao roi van ghi");

  // Cong phai cong dung cong thuc do: dinh_tuyen + mo_phien_goi, khong phai moi_phien + ...
  const gate2 = fs.readFileSync(path.join(ROOT, "scripts", "session-check.mjs"), "utf8");
  assert.match(gate2, /phien_goi\?\.dinh_tuyen/,
    "cong phai lay nen cua phien GOI tu `phien_goi.dinh_tuyen`, giong bo sinh");
  ok("tran CUNG cua bo mo phien: con do, <= 3.000 token, tu choi ghi, va cong cong cung cong thuc");
}
/* ---- CHỐT commit-msg: NỬA CÒN LẠI CỦA N-40 — N-49 -------------------------
 *
 * `--soat` đo đúng nhưng chạy TRƯỚC `git commit`, và ngày 08/09 đo được cửa sổ giữa hai lệnh:
 * `--soat` trả "tất cả thuộc quyền ghi", rồi `git commit` trả mã 1 "no changes added" vì lane
 * thứ ba đã mang file đã dàn đi trong đúng khoảng đó. Bản vá phải nằm TRONG lượt commit.
 *
 * Ghim hai thứ, và thứ hai quan trọng hơn: hook TỒN TẠI, và hook được CÀI. `core.hooksPath`
 * nằm ở `.git/config` — không đi theo git — nên một hook không được cài là một file nằm im
 * mà ai cũng tưởng đang canh. */
{
  const hook = path.join(ROOT, ".githooks", "commit-msg");
  assert.ok(fs.existsSync(hook), "repo phai co .githooks/commit-msg");
  const ma = fs.readFileSync(hook, "utf8");

  // BA CHỐT FAIL-OPEN. Hook chạy trên MỌI lượt commit của MỌI lane; một hook hỏng là cả repo
  // không commit được, và cái giá đó lớn hơn cái nó canh.
  assert.match(ma, /command -v node/, "khong co node tren PATH thi phai CHO QUA");
  assert.match(ma, /\[ -z "\$lane" \] && exit 0/, "khong tim thay nhan Lane thi phai CHO QUA (merge, revert)");
  assert.match(ma, /\[ "\$ma" -eq 3 \]/, "CHI ma 3 (vi pham that) moi chan — moi loi la khac phai cho qua");
  assert.match(ma, /--no-verify/, "phai chi ra cua thoat: mot chot khong the vuot se bi go han");

  // Và cổng phải canh việc hook ĐƯỢC CÀI — nhưng CHỈ khi repo có hook, nếu không thì mọi repo
  // tạm mà fixture dựng lên đều đỏ (bẫy "cổng nhận thêm phụ thuộc" đã cắn bốn lần 08/09).
  const gate = fs.readFileSync(path.join(ROOT, "scripts", "session-check.mjs"), "utf8");
  assert.match(gate, /HOOK_CHUA_CAI/, "cong phai co ma loi rieng cho viec hook chua duoc cai");
  assert.match(gate, /coHook && hooksPath !== "\.githooks"/,
    "chi doi hooksPath KHI repo co hook — khong thi moi fixture chay cong deu do");
  ok("chot commit-msg: co that, fail-open ba cho, va cong canh viec no duoc cai (N-49)");
}

/* ---- N-48 · commit CÓ NHÃN thì không còn là mồ côi -------------------------
 *
 * Bản cũ chỉ miễn file mà mọi commit chạm nó mang nhãn của NGƯỜI KHÁC, nên commit của chính
 * bạn — nhãn đầy đủ — vẫn bắt giữ khoá VÙNG tới lúc đẩy. Với khoá mức file (trả ngay sau mỗi
 * lượt ghi) điều đó kéo ngược cả cơ chế về khoá vùng; gặp thật ngay lượt đầu dùng. */
{
  const gate = fs.readFileSync(path.join(ROOT, "scripts", "session-check.mjs"), "utf8");
  assert.match(gate, /const daQuyThuocDuoc = /, "phep loc phai hoi 'da quy thuoc duoc chua'");
  assert.doesNotMatch(gate, /nhan !== asLabel/,
    "khong duoc con dieu kien 'nhan phai la cua NGUOI KHAC' — do la cho keo nguoc ve khoa vung");
  assert.match(gate, /every\(\(nhan\) => Boolean\(nhan\)\)/,
    "mien khi MOI nguon deu co nhan; mot nguon khong nhan la du de KHONG mien");
  ok("N-48 · commit mang nhan cua chinh minh khong con bi doi khoa vung");
}
console.log(`\n${passed} passed, 0 failed, ${passed} total`);
