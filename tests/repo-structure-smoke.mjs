/* Phép kiểm cho `scripts/repo-structure.mjs` — nguồn sự thật duy nhất về hình dạng repo.
 *
 * Vì sao đáng ghim riêng một file: trước K1, ba script cùng "biết" hình dạng repo bằng ba đoạn
 * code riêng. Hai trong ba là regex `^workers/` chép tay, và chúng ĐÃ lệch nhau một lần thật
 * (26/08, đường dẫn tiếng Việt bị quy nhầm chủ). Gộp về một hàm chỉ có ích nếu hàm đó được
 * ghim — nếu không, lần sau ai đó sẽ lại chép tay thêm một bản thứ tư.
 *
 * Nguyên tắc xuyên suốt: khai sai thì NÉM. Lặng lẽ lùi về mặc định là kiểu hỏng tệ nhất —
 * mọi thứ vẫn chạy, bảng vẫn sinh ra, chỉ có điều nó đếm ở sai thư mục và quy commit sai chủ.
 */

import assert from "node:assert/strict";

import {
  appendOnlyFromNumstat,
  areaOf,
  stewardOf,
  claimPrefixesFrom,
  DEFAULT_CLAIM_PREFIXES,
  DEFAULT_UNITS,
  unitsFrom,
  unitDirOf,
  ownershipKeys,
  ownershipInvariant,
  appendOnlyAtEof,
  appendOnlyExemptFrom,
  DEFAULT_APPEND_ONLY_EXEMPT,
  lineCountOf,
  laneFromMessage,
  generatedFrom,
  quyTrachNhiemSuite,
  DEFAULT_REPO
} from "../scripts/repo-structure.mjs";
import fsMod from "node:fs";

let passed = 0;
const ok = (name) => { passed += 1; console.log(`  ok  ${name}`); };

/* ---- hình dạng đơn vị ---------------------------------------------------- */
{
  assert.deepEqual(unitsFrom({}), DEFAULT_UNITS, "khong khai units thi dung mac dinh");
  assert.deepEqual(unitsFrom({ units: { root_dir: "packages", marker: "package.json", depth: 1 } }),
    { rootDir: "packages", marker: "package.json", depth: 1, ten: "Đơn vị" }, "khai du ba truong thi doc dung ca ba");
  assert.equal(unitsFrom({ units: { depth: 3 } }).rootDir, DEFAULT_UNITS.rootDir,
    "khai thieu truong thi truong do lay mac dinh");
  assert.equal(unitsFrom({ units: { root_dir: null } }).rootDir, null,
    "root_dir null hop le — repo khong co don vi con");

  for (const [bad, why] of [
    [{ units: [] }, "units la mang"],
    [{ units: { root_dir: "a/b" } }, "root_dir co gach cheo"],
    [{ units: { root_dir: "" } }, "root_dir rong"],
    [{ units: { marker: "" } }, "marker rong"],
    [{ units: { marker: "docs/x.json" } }, "marker co duong dan"],
    [{ units: { root_dir: ".." } }, "root_dir la .."],
    [{ units: { root_dir: "." } }, "root_dir la ."],
    [{ units: { root_dir: "a" + String.fromCharCode(92) + "b" } }, "root_dir co dau gach nguoc"],
    [{ units: { marker: "a" + String.fromCharCode(92) + "b.json" } }, "marker co dau gach nguoc"],
    [{ units: { depth: 0 } }, "depth 0"],
    [{ units: { depth: 9 } }, "depth qua sau"],
    [{ units: { depth: "2" } }, "depth la chuoi"]
  ]) {
    assert.throws(() => unitsFrom(bad), /UNITS_HONG/, `khai sai (${why}) phai NEM`);
  }
  ok("hinh dang don vi: khong khai thi mac dinh, khai sai thi nem");
}

/* ---- tiền tố quyền sở hữu ------------------------------------------------ */
{
  // `null` = KHÔNG có file cấu hình. Đây mới là ca "repo chưa chuẩn hoá", và nó hợp lệ.
  assert.deepEqual(claimPrefixesFrom(null), DEFAULT_CLAIM_PREFIXES,
    "khong co file cau hinh thi giu hinh dang cu (tuong thich nguoc)");
  // Nhưng CÓ file mà thiếu `areas` thì phải NÉM. Gộp hai ca này làm một là kiểu hỏng im lặng:
  // gõ nhầm tên trường (`areass`) sẽ lùi về `workers/` và quy chủ sai cho mọi commit.
  assert.throws(() => claimPrefixesFrom({ schema_version: 1 }), /CAU_TRUC_THIEU_AREAS/,
    "co file ma thieu areas thi phai NEM, khong duoc lui ve mac dinh");
  assert.throws(() => claimPrefixesFrom({ areas: null }), /CAU_TRUC_THIEU_AREAS/,
    "areas: null cung phai NEM");

  // CHỈ vùng khai `per-package` mới sinh ra tiền tố. Vùng `root` thuộc `_root`, không chia nhỏ.
  const areas = {
    "docs/": { ownership_mode: "root" },
    "workers/": { ownership_mode: "per-package", claim_prefix: "workers/" },
    "packages/": { ownership_mode: "per-package" }        // thiếu claim_prefix → lấy chính khoá
  };
  assert.deepEqual([...claimPrefixesFrom({ areas })], ["workers/", "packages/"],
    "chi vung per-package moi sinh tien to; thieu claim_prefix thi lay chinh khoa");

  assert.deepEqual([...claimPrefixesFrom({ areas: { "docs/": { ownership_mode: "root" } } })], [],
    "repo khong co vung chia theo goi la hop le — moi thu thuoc _root");

  // Gõ sai `ownership_mode` mà im lặng bỏ qua là kiểu hỏng tệ nhất: danh sách tiền tố thành
  // rỗng, MỌI package bị quy về `_root`, và cổng vẫn xanh.
  assert.throws(() => claimPrefixesFrom({ areas: { "w/": { ownership_mode: "per-pacakge" } } }),
    /CAU_TRUC_HONG/, "go sai ownership_mode phai NEM chu khong im lang bo qua");

  // Hai vùng chia-theo-gói LỒNG NHAU: `areaOf` lấy tiền tố khớp đầu tiên, nên câu trả lời sẽ
  // phụ thuộc thứ tự khoá trong JSON — quyền sở hữu đổi theo cách người ta gõ file cấu hình.
  assert.throws(() => claimPrefixesFrom({ areas: {
    "p/": { ownership_mode: "per-package" },
    "p/s/": { ownership_mode: "per-package", claim_prefix: "p/s/" }
  } }), /CAU_TRUC_HONG/, "tien to long nhau phai NEM");

  // Khoá chú thích (bắt đầu bằng "_") không phải một vùng.
  assert.deepEqual([...claimPrefixesFrom({ areas: { "_doc_": "ghi chu", "w/": { ownership_mode: "per-package" } } })],
    ["w/"], "khoa chu thich khong duoc coi la mot vung");

  for (const [bad, why] of [
    [{ areas: [] }, "areas la mang"],
    [{ areas: { "w/": { ownership_mode: "per-package", claim_prefix: "khong-co-gach-cheo" } } }, "claim_prefix khong ket thuc bang /"],
    [{ areas: { "w/": { ownership_mode: "per-package", claim_prefix: "" } } }, "claim_prefix rong"],
    [{ areas: { "w/": { ownership_mode: "per-package", claim_prefix: 7 } } }, "claim_prefix khong phai chuoi"]
  ]) {
    assert.throws(() => claimPrefixesFrom(bad), /CAU_TRUC_HONG/, `khai sai (${why}) phai NEM`);
  }
  ok("tien to quyen doc tu areas da co san, khong them khoi cau hinh thu hai");
}

/* ---- quy một đường dẫn về vùng sở hữu ------------------------------------ */
{
  const p = ["workers/"];
  assert.equal(areaOf("workers/abc/v1/content.js", p), "workers/abc", "file trong goi thuoc ve goi");
  assert.equal(areaOf("workers/abc/manifest.json", p), "workers/abc", "file ngay duoi goi van thuoc goi");
  assert.equal(areaOf("docs/x.md", p), "_root", "ngoai tien to thi thuoc _root");
  assert.equal(areaOf("scripts/build-dashboard.mjs", p), "_root", "script goc repo thuoc _root");

  // File nằm THẲNG dưới tiền tố không thuộc gói nào — nó là của _root.
  // Bản regex cũ (`^workers/[^/]+/`) trả undefined rồi bị gán "_root" ở safe-push, nhưng
  // ở session-check thì `startsWith("workers/")` lại coi nó KHÔNG phải file gốc. Hai script
  // bất đồng đúng ở ca này. Nay một hàm nên chỉ có một câu trả lời.
  assert.equal(areaOf("workers/GHI-CHU.md", p), "_root",
    "file nam thang duoi tien to khong thuoc goi nao — phai la _root");

  // Đường dẫn dị dạng (hai gạch chéo liền) KHÔNG được sinh ra một gói tên rỗng. Phép kiểm
  // này thêm vào sau khi một đột biến (`slash <= 0` → `slash < 0`) THOÁT: cả hai bản đều đúng
  // với đường dẫn bình thường, chỉ khác nhau đúng ở ca này. Không có nó thì dấu `<=` trong
  // code là một lựa chọn không ai bảo vệ.
  assert.equal(areaOf("workers//x.js", p), "_root",
    "duong dan hai gach cheo khong duoc tao ra goi ten rong");

  // Đường dẫn tiếng Việt có dấu: gốc lỗi thật ngày 26/08.
  assert.equal(areaOf("workers/gói-tiếng-việt/v1/tệp.js", p), "workers/gói-tiếng-việt",
    "duong dan tieng Viet phai duoc quy dung chu");

  // Nhiều tiền tố cùng lúc.
  assert.equal(areaOf("packages/alpha/index.js", ["workers/", "packages/"]), "packages/alpha",
    "nhieu tien to thi khop cai dung");
  assert.equal(areaOf("workers/abc/v1/x.js", []), "_root",
    "khong co tien to nao thi moi thu thuoc _root");
  ok("quy duong dan ve vung so huu: mot ham, mot cau tra loi, ke ca ca file nam thang duoi tien to");
}

/* ---- MẶC ĐỊNH PHẢI TRUNG TÍNH -------------------------------------------
   Ghim thẳng cái luật, không đi đường vòng. Phép thử repo rỗng KHÔNG bắt được lỗi này: bộ
   khung luôn khai tên riêng nên giá trị mặc định chẳng bao giờ được dùng ở đó. Đo thật: đột
   biến đổi mặc định về lại tên repo gốc ĐÃ THOÁT qua cả phép thử repo rỗng.

   Vì sao nó nguy hiểm: repo nào QUÊN khai sẽ lặng lẽ sinh ra một trang tự nhận là repo gốc,
   và không phép kiểm nào thấy vì file vẫn sinh ra bình thường. */
{
  for (const [field, value] of Object.entries(DEFAULT_REPO)) {
    if (typeof value !== "string") continue;
    for (const forbidden of ["Chrome Extension", "duc-auto", "gg-flow", "Agentic"]) {
      assert.ok(!value.includes(forbidden),
        `DEFAULT_REPO.${field} mang danh tinh repo goc ("${forbidden}") — mac dinh phai TRUNG TINH`);
    }
  }
  assert.ok(DEFAULT_REPO.name.trim().length > 0, "mac dinh van phai co mot cai ten doc duoc");
  ok("mac dinh khong mang danh tinh repo goc — quen khai thi trang noi that, khong noi doi");
}

/* ---- unitDirOf: chính thư mục đơn vị KHÔNG phải file bên trong nó ---------
   Ghim ca bien. Đột biến nới `<=` thành `<` đã THOÁT vì không ca nào chạm đúng ranh giới. */
{
  assert.equal(unitDirOf("workers/abc/v1", DEFAULT_UNITS), null,
    "duong dan CHINH LA thu muc don vi thi khong phai file ben trong no");
  assert.equal(unitDirOf("workers/abc/v1/manifest.json", DEFAULT_UNITS), "workers/abc/v1",
    "file ngay trong thu muc don vi thi thuoc ve no");
  assert.equal(unitDirOf("workers/abc", DEFAULT_UNITS), null, "chua du sau");
  assert.equal(unitDirOf("workers/abc/v1/tests/x.mjs", DEFAULT_UNITS), "workers/abc/v1",
    "file sau nhieu tang van thuoc dung don vi");
  ok("unitDirOf phan biet dung thu muc don vi voi file ben trong no");
}

/* A2 (2026-09-02) — KHOÁ QUYỀN theo `steward`.
   Trước A2, mọi thứ ngoài vùng chia-theo-gói gộp về một khoá `_root`. Đo thật: 77% commit
   trong ngày chạm gốc repo, và một khoá chặn cả những việc KHÔNG chồng nhau. Phép kiểm này
   ghim cả hai chiều — tách đúng, và khai sai thì NÉM. */
{
  const st = {
    areas: {
      "_doc_": "khoá chú thích, phải bị bỏ qua",
      "docs/": { steward: "_docs" },
      "scripts/": { steward: "_code" },
      "tests/": { steward: "_code" },
      "template/": { steward: "_template" },
      "evidence/": { steward: "_root" },
      "khong-khai-steward/": { mutability: "rw" },
      "workers/": { steward: null, ownership_mode: "per-package", claim_prefix: "workers/" }
    }
  };
  const p = ["workers/"];
  const at = (f) => stewardOf(f, st, p);

  assert.equal(at("docs/studies/x.md"), "_docs", "file trong docs/ thuoc khoa _docs");
  assert.equal(at("scripts/claim.mjs"), "_code", "scripts/ va tests/ CHUNG mot khoa _code");
  assert.equal(at("tests/a.mjs"), "_code", "scripts/ va tests/ CHUNG mot khoa _code");
  assert.equal(at("template/README.md"), "_template", "bo khung co khoa rieng");
  assert.equal(at("evidence/e.md"), "_root", "vung van khai _root thi giu nguyen _root");
  assert.equal(at("khong-khai-steward/x.md"), "_root", "khong khai steward thi ve _root — giu hinh dang cu");
  assert.equal(at("AGENTS.md"), "_root", "file o tang ngoai cung khong thuoc vung nao -> _root");
  assert.equal(at("HANDOFF.md"), "_root", "HANDOFF.md o goc cung vay");
  assert.equal(at("workers/abc/v1/x.js"), "workers/abc",
    "vung chia-theo-goi KHONG bi steward de len — areaOf da tra loi truoc");

  // Không có file cấu hình, hoặc `areas` sai kiểu → giữ hình dạng cũ, KHÔNG ném.
  assert.equal(stewardOf("docs/x.md", null, p), "_root", "chua co file cau hinh thi ve _root");
  assert.equal(stewardOf("docs/x.md", { areas: [] }, p), "_root", "areas sai kieu thi ve _root, khong nem");

  // FAIL CLOSED: khai steward sai hình dạng thì NÉM. Im lặng về `_root` là kiểu hỏng tệ nhất —
  // vùng đó lặng lẽ dùng chung khoá, hai phiên lại choảng nhau, và cổng vẫn xanh.
  for (const bad of ["docs", "", 42, {}, []]) {
    assert.throws(() => stewardOf("docs/x.md", { areas: { "docs/": { steward: bad } } }, p),
      /CAU_TRUC_HONG/, `steward = ${JSON.stringify(bad)} phai NEM, khong duoc im lang ve _root`);
  }
  ok("A2 · khoa quyen doc tu steward: tach dung tung vung, khai sai thi NEM, thieu khai thi giu _root");
}


/* A2 · MIỄN TRỪ `HANDOFF.md` — chỉ khi CHỈ THÊM DÒNG.
   Vì sao cần miễn trừ: luật mục 7 bắt MỌI phiên ghi Log vào `HANDOFF.md` ở gốc. Bắt phải nhận
   thêm một khoá chỉ để tuân luật là tự chặn luật của mình.
   Vì sao miễn trừ phải CÓ ĐIỀU KIỆN: sửa hay xoá dòng cũ là viết lại lịch sử của phiên khác.
   Một miễn trừ không có điều kiện là một cái lỗ, và nó sẽ không bao giờ tự lộ ra. */
{
  const f = appendOnlyFromNumstat;
  assert.equal(f(""), true, "file khong doi thi coi nhu chi-them-dong");
  assert.equal(f(null), true, "khong co dong numstat nao cung vay");
  assert.equal(f(undefined), true, "va undefined nua");
  assert.equal(f("12\t0\tHANDOFF.md"), true, "them 12 xoa 0 = chi them dong -> MIEN");
  assert.equal(f("  12\t0\tHANDOFF.md  "), true, "khoang trang hai dau khong duoc lam sai ket qua");

  assert.equal(f("12\t3\tHANDOFF.md"), false, "xoa 3 dong = viet lai lich su -> KHONG mien");
  assert.equal(f("0\t9\tHANDOFF.md"), false, "chi xoa cung khong mien");

  // FAIL CLOSED — day moi la phan de hong am tham.
  assert.equal(f("-\t-\tHANDOFF.md"), false,
    "git tra '-' cho file nhi phan: doc khong ra so thi KHONG mien, khong duoc doan la 0");
  assert.equal(f("rac"), false, "chuoi la thi KHONG mien");
  assert.equal(f("5"), false, "thieu cot so xoa thi KHONG mien");
  assert.equal(f("12\tx\tHANDOFF.md"), false, "cot so xoa khong phai so thi KHONG mien");
  ok("A2 · mien tru HANDOFF chi khi chi-them-dong; doc khong ra so thi FAIL CLOSED");
}

/* ---- K2-2b · MOT CUA DUY NHAT cho cau hoi "file nay thuoc ai" ------------ */
/* Vi sao ghim: day la LAN LECH THU HAI o dung hai file cua lan thu nhat. 26/08 hai ban regex
   `^workers/` lech nhau -> chua bang `areaOf` dung chung. 02/09 A2 them `stewardOf` va chi noi
   day cho `session-check.mjs`, KHONG noi cho `safe-push.mjs` -> `docs/studies/X.md` thi cong quy
   `_docs` con safe-push quy `_root`, nen mot phien giu `_docs` lam xong, cong XANH, roi bi chinh
   safe-push tu choi day viec cua minh.

   Bai hoc dat hon ban va: tach ham dung chung KHONG chan duoc lech, vi nguoi sau van them duoc
   ham thu hai. Nen o day ghim HAI thu khac nhau: ham cho dung dap an, VA hai script that su di
   qua no. */
{
  const parsed = {
    areas: {
      "docs/":     { steward: "_docs",     ownership_mode: "root" },
      "scripts/":  { steward: "_code",     ownership_mode: "root" },
      "tests/":    { steward: "_code",     ownership_mode: "root" },
      "template/": { steward: "_template", ownership_mode: "root" },
      "evidence/": { steward: "_root",     ownership_mode: "root" },
      "workers/":  { steward: null, ownership_mode: "per-package", claim_prefix: "workers/" }
    }
  };
  const prefixes = claimPrefixesFrom(parsed);
  const files = [
    "docs/studies/X.md", "docs/README.md", "scripts/safe-push.mjs", "tests/a.mjs",
    "template/AGENTS.md", "AGENTS.md", "workers/pkg-a/v1/x.js", "workers/pkg-b/v1/y.js"
  ];
  assert.deepEqual(
    ownershipKeys(files, parsed, prefixes),
    ["_code", "_docs", "_root", "_template", "workers/pkg-a", "workers/pkg-b"],
    "tap khoa phai la tap stewardOf, da sap xep, khong trung"
  );
  for (const f of files) {
    assert.equal(ownershipKeys([f], parsed, prefixes)[0], stewardOf(f, parsed, prefixes),
      `cua chung phai tra dung nhu stewardOf cho ${f}`);
  }
  // DAY LA CA DA HONG THAT 02/09.
  assert.deepEqual(ownershipKeys(["docs/studies/X.md"], parsed, prefixes), ["_docs"],
    "REGRESSION 02/09: docs/ phai ra _docs, KHONG duoc ra _root");
  // `isAdmin` mac dinh KHONG mien gi — quen truyen thi mien tru bien mat, khong phai noi ra.
  assert.deepEqual(ownershipKeys([".agents/claims.json"], parsed, prefixes), ["_root"],
    "FAIL CLOSED: khong truyen isAdmin thi khong mien gi ca");
  assert.deepEqual(
    ownershipKeys([".agents/claims.json"], parsed, prefixes, (f) => f === ".agents/claims.json"), [],
    "truyen isAdmin thi mien dung file do");
  assert.throws(() => ownershipKeys("docs/x.md", parsed, prefixes), /OWNERSHIP_HONG/,
    "dua vao mot chuoi thay vi mang thi NEM, khong lang le coi la mot file");
  ok("K2-2b · ownershipKeys = tap stewardOf; docs/ KHONG ve _root; thieu isAdmin thi FAIL CLOSED");
}

/* DAY NOI moi la thu phai ghim. Phep kiem ham o tren KHONG bat duoc ca hong 02/09, vi luc do
   `stewardOf` hoan toan dung — chi co `safe-push.mjs` la khong goi no. */
{
  const readScript = (name) => fsMod.readFileSync(new URL(`../scripts/${name}`, import.meta.url), "utf8");
  // TRA-KHOA-01, 06/09: `claim.mjs --release` nay cung phai quy commit ve vung (de cuong che
  // luat "tra quyen SAU khi day"), nen no vao danh sach nay. Va `safe-push.mjs` khong con goi
  // `ownershipKeys` THANG nua — no goi `commitChuaDay`, tuc VAN la cua chung, chi them mot
  // tang. Chap nhan ca hai TEN, nhung dong ngay cua sau ben duoi: `commitChuaDay` bat buoc
  // phai la ke goi `ownershipKeys`, neu khong thi "them mot tang" chinh la them mot cua thu hai.
  for (const name of ["session-check.mjs", "safe-push.mjs", "claim.mjs"]) {
    assert.match(readScript(name), /(ownershipKeys|commitChuaDay)\(/,
      `${name} phai di qua cua chung (ownershipKeys, hoac commitChuaDay goi no) — day la dung cai day noi da dut 02/09`);
  }
  const cauTruc = readScript("repo-structure.mjs");
  const than = cauTruc.slice(cauTruc.indexOf("export function commitChuaDay("));
  assert.notEqual(than, "", "khong tim thay commitChuaDay trong repo-structure.mjs");
  assert.match(than, /ownershipKeys\(/,
    "commitChuaDay PHAI goi ownershipKeys — neu khong thi no la cua quy vung thu hai, dung con bug 02/09");
  for (const name of ["safe-push.mjs", "claim.mjs"]) {
    assert.doesNotMatch(readScript(name), /\bareaOf\(/,
      `${name} KHONG duoc tu quy vung bang areaOf — do la cua thu hai, va no da lech mot lan`);
  }
  ok("K2-2b · DAY NOI: ba script deu di qua cua chung; commitChuaDay khong duoc thanh cua thu hai; khong ai co duong rieng");
}

/* ---- K2-2b · bat bien ba tang (audit GPT 02/09) -------------------------- */
/* LAW `steward` <-> STATE khoa quyen <-> MAY mot ham. Lech mot tang thi bang noi mot dang may
   noi mot neo, va cong LANG LE quy viec cho sai nguoi ma van xanh. Thieu mot trong ba = FAIL. */
{
  const areas = {
    "docs/":     { steward: "_docs" },
    "scripts/":  { steward: "_code" },
    "evidence/": { steward: "_root" }
  };
  const claims = {
    "_docs": { owner: null }, "_code": { owner: null }, "_root": { owner: null },
    "workers/pkg": { owner: null }
  };
  assert.deepEqual(ownershipInvariant({ areas }, claims), [], "ba tang khop thi khong co van de");

  const thieuKhoa = ownershipInvariant({ areas }, { "_docs": {}, "_root": {} });
  assert.equal(thieuKhoa.length, 1);
  assert.match(thieuKhoa[0], /STEWARD_THIEU_KHOA/);
  assert.match(thieuKhoa[0], /_code/, "phai noi thang khoa nao thieu");
  assert.match(thieuKhoa[0], /scripts\//, "va thu muc nao dang khai no");

  const khoaChet = ownershipInvariant({ areas }, { ...claims, "_template": { owner: null } });
  assert.equal(khoaChet.length, 1);
  assert.match(khoaChet[0], /KHOA_KHONG_VUNG/);
  assert.match(khoaChet[0], /_template/);

  // Khoa chia-theo-goi khong bat dau bang "_" nen khong duoc tinh la khoa chet — neu tinh, moi
  // repo co package deu do oan.
  assert.deepEqual(ownershipInvariant({ areas }, { ...claims, "workers/them": { owner: null } }), [],
    "khoa package khong phai khoa vung goc, khong duoc tinh la khoa chet");
  // `steward: null` = ve `_root`, hop le, khong doi khoa rieng.
  assert.deepEqual(ownershipInvariant({ areas: { "workers/": { steward: null } } }, { "_root": {} }), [],
    "steward null thi khong doi khoa nao");
  // FAIL CLOSED: dau vao hong thi noi la hong, khong tra rong (rong = "dat").
  assert.match(ownershipInvariant(null, claims)[0], /BAT_BIEN_HONG/);
  assert.match(ownershipInvariant({ areas }, null)[0], /BAT_BIEN_HONG/);
  assert.match(ownershipInvariant({ areas: [] }, claims)[0], /BAT_BIEN_HONG/);
  // `_root` PHAI CO MAT. Mien no khoi phep kiem khoa-chet la dung (khong thu muc nao can khai
  // no), nhung quen doi no ton tai thi moi file o tang ngoai cung thanh mo coi vinh vien.
  // Audit doc lap (Codex, vong 2) bat dung cho nay trong ban dau cua toi.
  assert.match(ownershipInvariant({ areas: { "workers/": { steward: null } } }, {})[0], /THIEU_KHOA_ROOT/,
    "khong co khoa _root thi phai bao — file o tang ngoai cung se khong ai nhan duoc");
  assert.deepEqual(ownershipInvariant({ areas: { "workers/": { steward: null } } }, { "_root": {} }), [],
    "co _root thi du, khong doi thu muc nao phai khai no");
  ok("K2-2b · bat bien ba tang: thieu khoa / khoa chet / thieu _root / dau vao hong deu bi bat");
}

/* ---- K2-2b · "CHI THEM VAO CUOI FILE?" ---------------------------------- */
/* Vi sao chat hon `appendOnlyFromNumstat`: ham do chi chung minh "0 dong bi xoa", KHONG chung
   minh dong moi nam o CUOI. Nen mot phien khong giu khoa goc van chen duoc mot dong bia vao
   GIUA `HANDOFF.md` va duoc mien tru hanh chinh cho qua — mot lo CAP QUYEN. Audit doc lap
   (Codex, vong 2) bac dung: ghi chu ra thi khong co nghia la duoc phep mo rong no. */
{
  const f = appendOnlyAtEof;
  const cu = "a\nb\nc\n";                              // 3 dong

  assert.equal(f("", cu), true, "file khong doi thi mien");
  assert.equal(f(null, cu), true, "khong co diff cung vay");

  // THEM THUAN O CUOI: mot hunk, khong cham dong cu, bat dau ngay sau dong 3.
  assert.equal(f("@@ -3,0 +4,2 @@\n+moi 1\n+moi 2\n", cu), true, "them 2 dong o cuoi -> MIEN");
  assert.equal(f("@@ -3,0 +4 @@\n+mot dong\n", cu), true, "them dung 1 dong o cuoi -> MIEN");

  // CHEN GIUA: dung 1 hunk, 0 dong xoa — `appendOnlyFromNumstat` se MIEN oan, ham nay thi khong.
  assert.equal(f("@@ -1,0 +2,1 @@\n+dong bia\n", cu), false,
    "DAY LA LO: chen giua file, 0 dong xoa, numstat mien oan -> ham nay PHAI tu choi");
  assert.equal(appendOnlyFromNumstat("1\t0\tHANDOFF.md"), true,
    "va day la bang chung ham cu THAT SU mien oan ca do — hai ham khong the thay nhau");

  // CHAM DONG CU: sua hoac xoa thi khong bao gio mien.
  assert.equal(f("@@ -3,1 +3,2 @@\n-c\n+c\n+moi\n", cu), false, "cham dong cu -> KHONG mien");
  assert.equal(f("@@ -2,1 +1,0 @@\n-b\n", cu), false, "xoa dong -> KHONG mien");

  // FAIL CLOSED.
  assert.equal(f("@@ -1,0 +2 @@\n+x\n@@ -3,0 +5 @@\n+y\n", cu), false,
    "hai hunk = chen nhieu cho, KHONG mien du ca hai deu khong xoa gi");
  assert.equal(f("rac khong phai diff\n", cu), false, "khong doc ra hunk thi KHONG mien");
  assert.equal(f("@@ -x,0 +4 @@\n+y\n", cu), false, "moc hunk khong phai so thi KHONG mien");

  // File MOI toanh: khong ton tai o ban cu = 0 dong, ca file la them o cuoi.
  assert.equal(f("@@ -0,0 +1,2 @@\n+a\n+b\n", ""), true, "file moi thi toan bo la them o cuoi");
  // Nhung dung so dong SAI thi lech: hunk noi "sau dong 5" ma ban cu chi 3 dong.
  assert.equal(f("@@ -5,0 +6 @@\n+x\n", cu), false, "moc khong khop so dong ban cu -> KHONG mien");

  // Dem dong: chuoi git tra ve ket thuc bang "\n", khong duoc dem thanh mot dong rong.
  assert.equal(lineCountOf(""), 0);
  assert.equal(lineCountOf("a\n"), 1);
  assert.equal(lineCountOf("a\nb\n"), 2);
  assert.equal(lineCountOf("a\nb"), 2, "khong co newline cuoi thi dong cuoi van tinh");
  ok("K2-2b · appendOnlyAtEof: chen giua file KHONG duoc mien; nhieu hunk / moc la deu FAIL CLOSED");
}

/* ---- DANH SACH FILE MIEN — mot nguon, hai ben doc ---------------------- */
/* Vi sao ghim: truoc 04/09 tap file mien duoc go CUNG o ca `session-check.mjs` va
   `safe-push.mjs`. Hai ban sao cua cung mot luat, va ngay 02/09 hai ben da tra HAI CAU KHAC
   NHAU cho cung mot file — chinh ly do `ownershipKeys` phai gom ve mot cua. Duc chot them
   `IDEAS.md` ngay 04/09; them vao hai danh sach go cung la gieo lai con bug do. */
{
  const f = appendOnlyExemptFrom;

  assert.deepEqual(f(null), DEFAULT_APPEND_ONLY_EXEMPT, "khong co file cau hinh -> giu hinh dang cu");
  assert.deepEqual(f({}), DEFAULT_APPEND_ONLY_EXEMPT, "co file ma khong khai truong -> giu hinh dang cu");
  assert.deepEqual(f({ append_only_exempt: ["HANDOFF.md", "IDEAS.md"] }), ["HANDOFF.md", "IDEAS.md"]);
  assert.deepEqual(f({ append_only_exempt: [] }), [], "khai rong la mot lua chon hop le: khong mien gi");
  assert.deepEqual(f({ append_only_exempt: [" IDEAS.md "] }), ["IDEAS.md"], "cat khoang trang hai dau");

  // KHAI SAI THI NEM. Lui lang le ve mac dinh la cach mot mien tru Duc DA CHOT bien mat ma
  // cong van xanh — va nguoi phat hien se la nguoi bi cong chan oan, khong phai nguoi go sai.
  for (const rac of [{ append_only_exempt: "HANDOFF.md" }, { append_only_exempt: [""] }, { append_only_exempt: ["a", 7] }, { append_only_exempt: {} }]) {
    assert.throws(() => f(rac), /CAU_TRUC_HONG/, `khai sai phai nem: ${JSON.stringify(rac)}`);
  }

  // `.agents/claims.json` KHONG duoc nam trong danh sach nay. No mien VO DIEU KIEN (tra quyen
  // khong the la "them dong o cuoi"), con danh sach nay chi mien KHI them o cuoi. Tron hai loai
  // vao mot danh sach la mat mat dieu kien — va mat theo chieu NOI LONG.
  assert.ok(!f({ append_only_exempt: ["HANDOFF.md", "IDEAS.md"] }).includes(".agents/claims.json"),
    "claims.json phai duoc mien bang duong rieng, khong qua danh sach chi-them-o-cuoi");

  // Doc chinh file cau hinh cua repo: luat Duc chot 04/09 phai CO THAT trong do, khong chi trong
  // van xuoi cua AGENTS.md. Mot luat khong may nao doc thi som muon bi bo qua.
  const thuc = f(JSON.parse(fsMod.readFileSync(new URL("../.repo-structure.json", import.meta.url), "utf8")));
  assert.ok(thuc.includes("HANDOFF.md"), "HANDOFF.md phai con duoc mien");
  assert.ok(thuc.includes("IDEAS.md"), "IDEAS.md phai duoc mien — Duc chot 04/09");
  ok("mien tru: mot nguon o .repo-structure.json · khai sai thi nem · claims.json di duong rieng");
}

/* ---- K2-3 · nhan lane trong commit ------------------------------------- */
/* Nhan tra loi "commit nay do phien nao lam". Vi sao can: safe-push quy commit theo chu HIEN TAI
   cua vung, ma chu so huu la trang thai SONG con commit la chuyen DA QUA — sai ca hai chieu, va
   chieu nguy hiem la IM LANG DAY KEM viec nguoi khac khi ban vua nhan vung cua ho.

   Phan biet HAI ca khong-quy-thuoc-duoc, va do la diem quan trong nhat cua ham nay:
     · KHONG CO nhan  -> ca THUONG (509 commit lich su deu vay), ben goi tu quyet
     · CO nhan ma HONG -> LOI, phai noi ra, khong duoc doan lay cai dau */
{
  const f = laneFromMessage;

  assert.deepEqual(f("tieu de\n\nthan\n\nLane: claude-abc\n"), { lane: "claude-abc", problem: null },
    "trailer o cuoi thi doc duoc");
  assert.deepEqual(f("Lane: claude-abc"), { lane: "claude-abc", problem: null }, "khong co newline cuoi cung duoc");
  assert.deepEqual(f("tieu de\n\nLane:   claude-abc   \n"), { lane: "claude-abc", problem: null },
    "khoang trang hai dau nhan bi cat");
  assert.deepEqual(f("Lane: a\nCo-Authored-By: x\nLane: a\n"), { lane: "a", problem: null },
    "hai dong CUNG mot nhan thi khong phai xung dot");

  // KHONG CO nhan = ca thuong, KHONG phai loi.
  assert.deepEqual(f("tieu de\n\nthan khong co nhan\n"), { lane: null, problem: null });
  assert.deepEqual(f(""), { lane: null, problem: null });
  assert.deepEqual(f(null), { lane: null, problem: null });

  // Chi nhan TRAILER o DAU DONG. Nhac giua cau thi khong tinh — neu tinh thi mot commit ke ve
  // nhan cua nguoi khac se bi quy cho nguoi do.
  assert.deepEqual(f("tieu de\n\nban cu ghi Lane: nguoi-khac o giua cau\n"), { lane: null, problem: null },
    "nhac giua cau KHONG duoc tinh la trailer");
  assert.deepEqual(f("tieu de\n\n> Lane: trong-trich-dan\n"), { lane: null, problem: null },
    "trong khoi trich dan cung khong tinh");

  // FAIL CLOSED — ba kieu hong, moi kieu mot ma rieng de doc log biet ngay phai sua gi.
  assert.match(f("Lane:\n").problem, /LANE_RONG/);
  assert.match(f("Lane:    \n").problem, /LANE_RONG/);
  assert.match(f("Lane: hai tu\n").problem, /LANE_CO_KHOANG_TRANG/);
  const xungDot = f("Lane: mot\n\nLane: hai\n");
  assert.equal(xungDot.lane, null, "xung dot thi KHONG duoc tra ve mot trong hai");
  assert.match(xungDot.problem, /LANE_XUNG_DOT/);
  assert.match(xungDot.problem, /mot, hai/, "phai ke ra ca hai nhan de nguoi sua biet");
  ok("K2-3 · laneFromMessage: doc trailer, phan biet THIEU voi HONG, va ba kieu hong deu FAIL CLOSED");
}

/* ---- K2-1 · thu MAY so huu thi khong ai phai nhan quyen ------------------ */
/* DO DUOC: 5/27 luot nhan `_root` ngay 02/09 (19%) ton tai CHI de chay bo sinh. Noi dung may
   file do tat dinh tu HEAD — khong ai so huu chung. Tranh chap quanh chung la NHAN TAO.

   KHONG lam yeu lop bao ve nao: mien khoi TRANH CHAP quyen, nhung noi dung van bi phep kiem #7
   doi chieu voi HEAD o moi phien. Sua tay mot dong trong DASHBOARD.md van DO — chi la do o phep
   kiem DUNG cho, thay vi doi mot cai khoa khong lien quan. */
{
  const parsed = {
    generated: ["DASHBOARD.md", "llms.txt", "repo-map.json", "FEATURE-PARITY.md"],
    areas: {
      "docs/": { steward: "_docs", ownership_mode: "root" },
      "scripts/": { steward: "_code", ownership_mode: "root" },
      "workers/": { steward: null, ownership_mode: "per-package", claim_prefix: "workers/" }
    }
  };
  const prefixes = claimPrefixesFrom(parsed);

  // CA QUYET DINH: commit CHI cham file may sinh -> KHONG can khoa nao.
  assert.deepEqual(ownershipKeys(["DASHBOARD.md", "llms.txt", "repo-map.json"], parsed, prefixes), [],
    "commit chi sinh lai artifact thi khong doi khoa nao — day la 19% luot nhan quyen bi xoa");

  // Nhung tron voi file THAT thi van doi khoa cua file that.
  assert.deepEqual(ownershipKeys(["DASHBOARD.md", "scripts/x.mjs"], parsed, prefixes), ["_code"],
    "tron file may sinh voi file that thi van phai nhan khoa cua file that");
  assert.deepEqual(ownershipKeys(["llms.txt", "docs/a.md", "workers/pkg/v1/y.js"], parsed, prefixes),
    ["_docs", "workers/pkg"], "mien dung nhung file da khai, khong mien lay");

  // CHUA KHAI thi khong mien gi — tuong thich nguoc, va la mac dinh an toan.
  const chuaKhai = { areas: parsed.areas };
  assert.deepEqual(ownershipKeys(["DASHBOARD.md"], chuaKhai, prefixes), ["_root"],
    "chua khai `generated` thi hanh vi y HET truoc: DASHBOARD.md van thuoc _root");

  // Khai HONG thi NEM — lang le lui ve mac dinh la mo mot lo ma doc cau hinh khong thay.
  const nem = (g, re) => assert.throws(() => generatedFrom({ generated: g }), re, `phai nem voi ${JSON.stringify(g)}`);
  nem("DASHBOARD.md", /GENERATED_HONG/);              // chuoi thay vi mang
  nem([""], /GENERATED_HONG/);
  nem(["   "], /GENERATED_HONG/);
  nem([42], /GENERATED_HONG/);
  nem(["/etc/passwd"], /GENERATED_HONG/);             // tuyet doi
  nem(["C:/x/y.md"], /GENERATED_HONG/);               // tuyet doi kieu Windows
  nem(["../ngoai-repo.md"], /GENERATED_HONG/);        // di nguoc len tren
  nem(["docs/"], /GENERATED_HONG/);                   // ca THU MUC — lo rong
  assert.deepEqual(generatedFrom({}), [], "khong khai = mang rong");
  assert.deepEqual(generatedFrom(null), [], "khong co cau hinh = mang rong");
  ok("K2-1 · file may sinh khong doi khoa; tron voi file that thi van doi; khai hong thi NEM");
}

/* ---- K2-1 nửa LUẬT — repo NÀY phải khai, và khai đúng ---------------------
 *
 * Khối trên ghim tầng MÁY (`generatedFrom` xử lý cấu hình ra sao). Khối này ghim tầng LUẬT:
 * `.repo-structure.json` của chính repo này. Hai thứ khác nhau — máy có thể đúng hoàn hảo
 * trong khi repo quên khai, và khi đó 19% lượt nhận khoá `_root` chỉ-để-chạy-bộ-sinh quay lại
 * y nguyên mà không phép kiểm nào kêu.
 *
 * Phép kiểm quan trọng nhất ở đây là chiều NGƯỢC: mỗi artifact bộ sinh ghi ra mà KHÔNG có
 * trong danh sách thì phải nằm trong danh sách loại trừ có lý do. Nhờ vậy, ai thêm một bộ sinh
 * mới sẽ đụng đúng test này và buộc phải QUYẾT ĐỊNH, thay vì để file mới rơi vào im lặng.
 */
{
  const thatSu = JSON.parse(fsMod.readFileSync(new URL("../.repo-structure.json", import.meta.url), "utf8"));
  const khai = generatedFrom(thatSu);

  assert.ok(khai.length > 0, "repo NAY phai khai khoi `generated` — thieu la nghen `_root` gia quay lai");
  for (const ten of khai) {
    assert.ok(fsMod.existsSync(new URL(`../${ten}`, import.meta.url)),
      `"${ten}" khai la may sinh nhung khong co trong repo — khai thua thi mien nham`);
  }

  // Chiều ngược: bộ sinh ghi ra những gì? Đọc thẳng hằng số trong mã nguồn, không gõ tay lại.
  const nguon = ["../scripts/build-dashboard.mjs", "../scripts/feature-parity.mjs"]
    .map((p) => fsMod.readFileSync(new URL(p, import.meta.url), "utf8")).join("\n");
  const boSinhGhi = [...nguon.matchAll(/^(?:export )?const \w*(?:FILE|_FILE) = "([^"]+)";$/gm)].map((m) => m[1]);
  assert.ok(boSinhGhi.length >= 4, "khong doc duoc hang so ten artifact tu ma nguon bo sinh — sua regex, dung bo qua");

  // CỐ Ý để ngoài: nửa file là chữ của người, có bằng chứng [ĐỌC]. Miễn nó = mở đường ghi vào
  // nửa của người mà không phải giữ khoá. Đây không phải sót — đổi thì phải đổi cả dòng này.
  const coYDeNgoai = new Set(["FEATURE-PARITY.md"]);
  const sot = boSinhGhi.filter((t) => !khai.includes(t) && !coYDeNgoai.has(t));
  assert.deepEqual(sot, [],
    `bo sinh ghi ra file khong khai va cung khong co ly do de ngoai: ${sot.join(", ")} — quyet dinh di, dung de im lang`);

  for (const t of coYDeNgoai) {
    assert.ok(!khai.includes(t), `${t} KHONG duoc mien: nua muc 2 la chu cua NGUOI, mien la mo duong ghi khong can khoa`);
  }
  ok("K2-1 nua LUAT: repo nay khai du artifact may sinh; file nua-nguoi khong duoc mien; bo sinh moi khong lot im lang");
}

/* ---- K2-9 v2 · suite đỏ là của ai — quy theo TRẠNG THÁI, không theo ĐƯỜNG DẪN
 *
 * Bản v1 quy theo đường dẫn file test. Audit GPT bác đúng, sai theo cả hai chiều: tôi commit
 * vào `scripts/` dùng chung mà làm test gói khác đỏ thì cổng [BỎ] một regression THẬT; còn một
 * suite gốc đọc file sửa dở của lane khác thì vẫn chặn oan tôi. Gốc bệnh là suite chạy trên một
 * CÂY LÀM VIỆC DÙNG CHUNG, nên câu hỏi đúng là: **lỗi này có trong thứ đã commit không?**
 *
 * Hàm nằm ở ĐÂY chứ không ở `session-check.mjs` vì file đó là SCRIPT — nạp nó là nó chạy và
 * `process.exit`. Không import được thì không ghim được từng nhánh, và mutation đã chứng minh
 * điều đó: nhánh "không trích được HEAD" gỡ ra mà suite vẫn xanh. Đúng cách chia repo đã khai:
 * hàm suy ra thì thuần và dùng chung, việc đọc thì mỗi bên tự làm.
 */
{
  // CHỐT GPT, và là ca v1 mất: chính TÔI còn sửa dở thì HEAD cũng xanh — lấy "HEAD xanh" ra
  // miễn là tôi tự miễn cho lỗi của mình. Quy được vì luật mục 1: chỉ tôi được ghi vào vùng tôi
  // giữ. Điều kiện này phải xét TRƯỚC mọi thứ khác, nên ghim cả khi HEAD xanh lẫn khi HEAD đỏ.
  for (const head of [true, false, null]) {
    const v = quyTrachNhiemSuite({ vungToiGiuConBan: ["scripts/x.mjs"], ketQuaTrenHead: head });
    assert.equal(v.ok, false, `toi con sua do thi PHAI do, ke ca khi HEAD = ${head}`);
    assert.match(v.ly_do, /TOI_CON_SUA_DO/);
    assert.match(v.ly_do, /scripts\/x\.mjs/, "phai ke ten file, de nguoi doc biet commit cai gi");
  }

  // Vùng tôi sạch → mới được hỏi HEAD.
  const doOHead = quyTrachNhiemSuite({ vungToiGiuConBan: [], ketQuaTrenHead: false });
  assert.equal(doOHead.ok, false, "HEAD do = regression DA COMMIT, phai chan");
  assert.equal(doOHead.ly_do, "REGRESSION_DA_COMMIT");

  const xanhOHead = quyTrachNhiemSuite({ vungToiGiuConBan: [], ketQuaTrenHead: true });
  assert.equal(xanhOHead.ok, true, "HEAD xanh + vung toi sach = nhiem tu cay lam viec, khong chan toi");
  assert.equal(xanhOHead.bo_qua, true, "nhung phai la BO, khong phai XANH — cay lam viec dang hong that");
  assert.equal(xanhOHead.ly_do, "NHIEM_TU_CAY_LAM_VIEC");

  // FAIL CLOSED — nhánh này mutation đã cho THOÁT khi hàm còn nằm trong session-check.mjs.
  // Không trích được HEAD nghĩa là KHÔNG BIẾT, và không biết thì không được miễn.
  const khongBiet = quyTrachNhiemSuite({ vungToiGiuConBan: [], ketQuaTrenHead: null });
  assert.equal(khongBiet.ok, false, "khong trich duoc HEAD thi PHAI do — khong biet khong duoc doi lot da dat");
  assert.equal(khongBiet.ly_do, "KHONG_TRICH_DUOC_HEAD");
  ok("K2-9 v2 · vung toi ban thi chan truoc moi thu; HEAD do thi chan; HEAD xanh thi BO; khong biet thi chan");
}

/* ---- units.ten — tên gọi một đơn vị, dùng cho tiêu đề bảng ---------------- */
{
  // Trước 03/09 bộ sinh đóng cứng chữ "Extension" ở tiêu đề bảng VÀ ở tên cột, nên mọi repo
  // dựng từ bộ khung — kể cả repo tài liệu — đều nhận một bảng gọi mọi thứ là Extension. Lộ ra
  // ngay lần đầu dựng thử một repo mới bằng init-repo. Cùng họ với lỗi "bộ sinh đóng cứng tên
  // repo gốc" mà audit vòng một đã bắt: một chữ của repo này lọt vào bộ khung của mọi repo khác.
  assert.equal(unitsFrom({}).ten, "Đơn vị", "khong khai thi phai lui ve mot chu trung tinh");
  assert.equal(unitsFrom({ units: { ten: "Dịch vụ" } }).ten, "Dịch vụ", "khai gi thi phai dung cai do");

  // FAIL CLOSED: khai rỗng hay sai kiểu thì NÉM, không lặng lẽ lùi về mặc định — một bảng mang
  // tên sai vẫn trông hoàn toàn bình thường, nên đây là kiểu hỏng im lặng.
  // `null` KHÔNG nằm trong danh sách này, và đó là lựa chọn có ý thức: cả file dùng `??` nên
  // null nghĩa là "chưa khai" y như `marker` và `depth`, và lùi về một chữ trung tính thì an
  // toàn — bảng chỉ generic đi, không nói sai. Phép kiểm dưới ghim đúng điều đó.
  assert.equal(unitsFrom({ units: { ten: null } }).ten, "Đơn vị", "null = chua khai, lui ve mac dinh");
  for (const xau of [{ units: { ten: "" } }, { units: { ten: "   " } }, { units: { ten: 7 } }]) {
    assert.throws(() => unitsFrom(xau), /UNITS_HONG/, `khai sai phai NEM: ${JSON.stringify(xau)}`);
  }
  ok("units.ten: mac dinh trung tinh · khai thi ton trong · khai sai thi nem");
}


console.log(`\n${passed} passed, 0 failed, ${passed} total`);
