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
  DEFAULT_REPO
} from "../scripts/repo-structure.mjs";

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


console.log(`\n${passed} passed, 0 failed, ${passed} total`);
