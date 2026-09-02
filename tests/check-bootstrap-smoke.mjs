/* Test ghim cho cổng kiểm cấu trúc B1…B14 (scripts/check-bootstrap.mjs), phiên S4.

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
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  ADR_DIR, checkB1, checkB3, checkB4, checkB6, checkB9, checkB10, checkB11, checkB12, checkB14,
  checkGeneratedFreshness, checkStatusCode, collectChecks, DOC_LINE_LIMIT, grandfatheredNote, isAdrPath,
  NAV_DEPTH_LIMIT, parseLastCommitTimes, renderChecks, ruleBearingLines, runBootstrapCheck
} from "../scripts/check-bootstrap.mjs";
import { collectModel } from "../scripts/build-dashboard.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let passed = 0;
const ok = (name) => { passed += 1; console.log(`  ok  ${name}`); };

const DAY = 86400;
const NOW = 1788300000;
const EXPECTED_CODES = ["B1", "B2", "B3", "B4", "B5", "B6", "B7", "B8", "B9", "B10", "B11", "B12", "B13", "B14"];

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
      grandfathered: { paths: ["evidence/co dau cach.md"] }
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
      showAt: (sha, relPath) => (overrides.blobs ?? {})[`${sha}:${relPath}`] ?? null
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
  assert.deepEqual(codesOf(checks), EXPECTED_CODES, "phải chạy đủ 14 phép kiểm B1…B14, đúng thứ tự");
  assert.equal(checks.length, 14, "14 phép kiểm, không hơn không kém");
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
      ".repo-structure.json": JSON.stringify({ schema_version: 1, areas: { "workers/": {} } }),
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
  const deps = fixture({ files: { ".repo-structure.json": JSON.stringify({ schema_version: 1, areas: { "workers/": {} } }) } });
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

/* ---- B12 ------------------------------------------------------------------ */
{
  const none = checkB12(fixture());
  assert.equal(none.state, "skip", "chưa có docs/adr/ thì BỎ QUA");
  assert.match(none.note, /KHÔNG ÁP DỤNG/);

  const adr = `${ADR_DIR}0001-chon-bridge.md`;
  const body = "Chọn Bridge làm lớp vận chuyển.\n";
  const accepted = fm({ status: "Accepted" }) + body;
  const untouched = fixture({
    files: { [adr]: accepted },
    history: { [adr]: ["sha1", "sha2"] },
    blobs: { [`sha1:${adr}`]: fm({ status: "Proposed" }) + body, [`sha2:${adr}`]: accepted }
  });
  assert.equal(checkB12(untouched).state, "ok", "ADR vừa được Accepted, chưa ai sửa thân -> xanh");

  const edited = fixture({
    files: { [adr]: accepted },
    history: { [adr]: ["sha1", "sha2", "sha3"] },
    blobs: {
      [`sha1:${adr}`]: fm({ status: "Proposed" }) + body,
      [`sha2:${adr}`]: accepted,
      [`sha3:${adr}`]: fm({ status: "Accepted" }) + "Đổi ý, chọn thứ khác.\n"
    }
  });
  const broken = checkB12(edited);
  assert.equal(broken.state, "fail");
  assert.deepEqual(tags(broken), ["ADR-EDITED"]);

  // Sửa RIÊNG frontmatter sau khi Accepted là hợp lệ — đó là cách một ADR bị thay thế
  // đúng luật. Không có vế này thì mutation "hễ commit sau Accepted là kêu" sẽ thoát.
  const supersededLater = fixture({
    files: { [adr]: accepted },
    history: { [adr]: ["sha1", "sha2", "sha3"] },
    blobs: {
      [`sha1:${adr}`]: fm({ status: "Proposed" }) + body,
      [`sha2:${adr}`]: accepted,
      [`sha3:${adr}`]: fm({ status: "Accepted", superseded_by: "docs/adr/0002.md" }) + body
    }
  });
  assert.equal(checkB12(supersededLater).state, "ok", "đổi frontmatter sau Accepted là hợp lệ, chỉ thân mới bị cấm");

  // ĐÚNG HAI COMMIT. Ghim cái thoát sớm `history.length <= 1`: nới nó thành `<= 2` là ca này
  // lọt, mà đây đúng là ca mỏng nhất của một ADR bị sửa (thêm Accepted rồi sửa ngay).
  const haiCommit = fixture({
    files: { [adr]: accepted },
    history: { [adr]: ["sha1", "sha2"] },
    blobs: { [`sha1:${adr}`]: accepted, [`sha2:${adr}`]: fm({ status: "Accepted" }) + "Thân đã bị sửa.\n" }
  });
  assert.equal(checkB12(haiCommit).state, "fail", "ADR chỉ có 2 commit mà thân đã đổi thì vẫn phải bắt được");

  // HAI TẦNG (bẫy 1 của BRIEF-S5). ADR trong package phải được quét y như ADR ở gốc repo.
  // Bản S4 chỉ so startsWith("docs/adr/") nên ca này lọt hoàn toàn.
  assert.equal(isAdrPath("docs/adr/0000-x.md"), true, "ADR gốc repo");
  assert.equal(isAdrPath("workers/duc-auto-gemini/v0.2.0/docs/adr/0001-x.md"), true, "ADR trong package");
  assert.equal(isAdrPath("docs/adr/README.txt"), false, "không phải .md thì không phải ADR");
  assert.equal(isAdrPath("docs/adrenaline/0001-x.md"), false, "trùng tiền tố chữ không phải là thư mục ADR");

  const adrGoi = "workers/demo/v1/docs/adr/0001-quyet-dinh-goi.md";
  const trongGoi = fixture({
    files: { [adrGoi]: accepted },
    history: { [adrGoi]: ["sha1", "sha2", "sha3"] },
    blobs: {
      [`sha1:${adrGoi}`]: fm({ status: "Proposed" }) + body,
      [`sha2:${adrGoi}`]: accepted,
      [`sha3:${adrGoi}`]: fm({ status: "Accepted" }) + "Đổi ý.\n"
    }
  });
  const brokenGoi = checkB12(trongGoi);
  assert.equal(brokenGoi.state, "fail", "ADR trong package bị sửa thân cũng phải bị bắt");
  assert.match(brokenGoi.findings[0].where, /workers\/demo\/v1\/docs\/adr/);
  ok("B12 · quét CẢ HAI tầng ADR, bắt được ca 2 commit, và sửa frontmatter thì không sao");
}

/* ---- B12 ở TẦNG TÍCH HỢP -------------------------------------------------- */
// Gọi thẳng checkB12 là chưa đủ: repo này đã trả giá vì một luật bị gỡ khỏi ĐƯỜNG CHẠY mà
// suite vẫn xanh. Ca này đi qua collectChecks, đúng như khi chạy thật.
{
  const adr = "workers/demo/v1/docs/adr/0001-quyet-dinh-goi.md";
  const body = "Chọn Bridge làm lớp vận chuyển.\n";
  const deps = fixture({
    files: { [adr]: fm({ status: "Accepted" }) + body },
    history: { [adr]: ["sha1", "sha2"] },
    blobs: {
      [`sha1:${adr}`]: fm({ status: "Accepted" }) + body,
      [`sha2:${adr}`]: fm({ status: "Accepted" }) + "Thân đã bị sửa sau khi Accepted.\n"
    }
  });
  const { checks } = collectChecks(deps);
  const b12 = find(checks, "B12");
  assert.equal(b12.state, "fail", "B12 phải ĐỎ khi chạy qua collectChecks, không chỉ khi gọi thẳng hàm");
  assert.equal(b12.level, "ĐỎ");
  assert.deepEqual(tags(b12), ["ADR-EDITED"]);
  assert.ok(b12.findings[0].fix.length > 0, "phải nói cách sửa");

  // Và khi KHÔNG có ADR nào thì vẫn phải là BỎ QUA, không phải XANH giả.
  const { checks: khongAdr } = collectChecks(fixture());
  assert.equal(find(khongAdr, "B12").state, "skip");
  ok("TÍCH HỢP · B12 chạy thật qua collectChecks, bắt ADR trong package bị sửa");
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

/* ---- CHẾ ĐỘ CẢNH BÁO: có nợ vẫn thoát 0 ---------------------------------- */
{
  const logs = [];
  const errors = [];
  const deps = fixture({ remove: ["workers/demo/v1/STATUS.md"] });
  const code = runBootstrapCheck({ deps, output: { log: (m) => logs.push(m), error: (m) => errors.push(m) } });
  assert.equal(code, 0, "S4 CHỈ CẢNH BÁO — có nợ ĐỎ vẫn phải thoát 0. Bật chặn là việc của S7.");
  const text = logs.join("\n");
  assert.match(text, /CHẾ ĐỘ CẢNH BÁO/);
  assert.match(text, /B1 NO-STATUS/, "phải in ra đúng khoản nợ vừa dựng");
  assert.match(text, /TỔNG: 1 chỗ ĐỎ/);

  // Nhưng ĐẦU VÀO HỎNG thì khác hẳn: đó là bộ kiểm hỏng, phải thoát khác 0 và nói nguyên văn.
  const brokenInput = fixture({ files: { ".agents/claims.json": "{khong-phai-json" } });
  const errs = [];
  const bad = runBootstrapCheck({ deps: brokenInput, output: { log: () => {}, error: (m) => errs.push(m) } });
  assert.equal(bad, 2, "claims.json hỏng = KHÔNG CHẠY ĐƯỢC, không được báo xanh");
  assert.match(errs.join("\n"), /CLAIMS_HONG/, "phải in nguyên văn lỗi gốc");
  ok("CHẾ ĐỘ CẢNH BÁO · có nợ vẫn thoát 0, nhưng đầu vào hỏng thì thoát 2");
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
  assert.match(gate, /const EXPECTED_CHECKS = 8;/, "thêm cổng con thì EXPECTED_CHECKS phải là 8 — lớp chống tự tháo cổng");
  // Và nó KHÔNG được biến nợ cấu trúc thành cổng đỏ ở phiên S4.
  const block = gate.slice(gate.indexOf("Cổng kiểm cấu trúc B1–B14"));
  assert.match(block, /CHỈ CẢNH BÁO, không chặn/, "cổng con phải nói rõ nó chỉ cảnh báo");
  ok("TÍCH HỢP · session-check.mjs gọi cổng kiểm cấu trúc, EXPECTED_CHECKS = 8");
}

/* NGHIỆM THU CỦA ĐỨC — mỗi cảnh báo phải nói CẢ chỗ sai LẪN cách sửa.

   Tìm ra bằng audit độc lập 2026-09-02: xoá sạch dấu `→` khỏi bộ sinh thông báo thì
   toàn bộ 30+ dòng hướng dẫn mất dấu mà suite vẫn 20/20 xanh. Nội dung vẫn còn nên
   mức nhẹ, nhưng đây LÀ tiêu chí nghiệm thu Đức dùng để phán đạt hay không — thứ
   Đức dùng để chấm bài mà không có test ghim thì sớm muộn sẽ trôi. */
{
  const output = execFileSync(process.execPath, [path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "scripts", "check-bootstrap.mjs")], {
    cwd: path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), encoding: "utf8"
  });
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

console.log(`\n${passed} passed, 0 failed, ${passed} total`);
