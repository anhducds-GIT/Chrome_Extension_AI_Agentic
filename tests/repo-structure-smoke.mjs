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
  lineCountOf,
  DEFAULT_REPO
} from "../scripts/repo-structure.mjs";
import fsMod from "node:fs";

let passed = 0;
const ok = (name) => { passed += 1; console.log(`  ok  ${name}`); };

/* ---- hình dạng đơn vị ---------------------------------------------------- */
{
  assert.deepEqual(unitsFrom({}), DEFAULT_UNITS, "khong khai units thi dung mac dinh");
  assert.deepEqual(unitsFrom({ units: { root_dir: "packages", marker: "package.json", depth: 1 } }),
    { rootDir: "packages", marker: "package.json", depth: 1 }, "khai du ba truong thi doc dung ca ba");
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
  for (const name of ["session-check.mjs", "safe-push.mjs"]) {
    assert.match(readScript(name), /ownershipKeys\(/,
      `${name} phai goi ownershipKeys — day la dung cai day noi da dut 02/09`);
  }
  assert.doesNotMatch(readScript("safe-push.mjs"), /\bareaOf\(/,
    "safe-push.mjs KHONG duoc tu quy vung bang areaOf — do la cua thu hai, va no da lech mot lan");
  ok("K2-2b · DAY NOI: ca hai script di qua cua chung, va safe-push khong con duong rieng");
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


console.log(`\n${passed} passed, 0 failed, ${passed} total`);
