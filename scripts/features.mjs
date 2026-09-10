/* DANH MỤC TÍNH NĂNG — checklist đo được, chạy ở BẤT KỲ repo nào.
 *
 *   node scripts/features.mjs                  # đo chính repo này
 *   node scripts/features.mjs <đường-dẫn>      # đo một repo khác
 *   node scripts/features.mjs --json           # máy đọc
 *   node scripts/features.mjs --migrate <đường-dẫn>   # checklist để dán vào hồ sơ migrate
 *
 * ================== VÌ SAO FILE NÀY TỒN TẠI ==================
 *
 * Câu "bộ khung này làm được gì" trước nay chỉ trả lời được bằng cách đọc `AGENTS.md` mục 6 —
 * một bảng bốn mươi dòng viết cho người sắp LÀM một việc, không phải cho người muốn biết repo
 * ĐANG CÓ gì. Và lúc migrate thì câu hỏi thật là: *repo đích đã nhận đủ chưa.*
 *
 * MỖI MỤC PHẢI ĐO ĐƯỢC. Một danh mục tính năng không đo được thì nó là quảng cáo: nó nói repo
 * có gì lúc ai đó viết nó, và im lặng mãi về sau. Nên khối `can` trong `features.json` khai file
 * và lệnh phải tồn tại, và lệnh này chỉ đi kiểm — không tin một chữ nào trong phần mô tả.
 *
 * BA TRẠNG THÁI, KHÔNG PHẢI HAI:
 *   XONG    — mọi thứ mục đó cần đều có mặt
 *   MỘT PHẦN— có một số, thiếu một số. Đây là ca NGUY HIỂM NHẤT và là lý do không gộp về hai
 *             trạng thái: một mục "một phần" trông như đang chạy nhưng hỏng ở chỗ không ai nhìn.
 *             Ví dụ thật: repo đích nhận `tests/bang-song.mjs` mà không nhận `bang-song/` —
 *             suite gãy ngay lượt đầu vì một lý do không nói gì về nguyên nhân.
 *   THIẾU   — không có gì
 *
 * VÀ PHẠM VI PHẢI ĐƯỢC TÔN TRỌNG. Mục khai `chi-repo-nha` (bộ sinh bản trích, sổ phát hành,
 * lệnh nâng cấp) thì repo đích KHÔNG thiếu nó — đòi nó ở repo đích là báo thiếu sai, và một bản
 * báo cáo báo thiếu sai thì người đọc sẽ thôi tin cả bản.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const NHA = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const NL = String.fromCharCode(10);

/* NĂM trạng thái, không phải bốn. `CU` là trạng thái thêm ngày 10/09 và nó vá một lỗ ĐO ĐƯỢC:
 * ba repo vừa migrate xong đọc `33 xong · 0 một phần · 0 vấn đề` — xanh tuyệt đối — trong khi
 * `upgrade --plan` ở cùng ngày kể **7 file CŨ** ở cả ba. Bảy file đó tra ngược `can.file` ra
 * đúng bảy tính năng, trong đó có `F8.5` (dấu xác nhận suite, bản 1.8.3 vá một FAIL-OPEN) và
 * `F3.2` (cổng đóng phiên). Tức danh mục nói ĐỦ cho một cơ chế đang chạy bản cũ mười bản.
 *
 * `[x]` trả lời *"có chưa"*. Nó KHÔNG trả lời *"có bản nào"* — và với một bộ khung phát hành
 * liên tục thì câu thứ hai mới là câu tốn tiền. */
export const TRANG_THAI = Object.freeze({ XONG: "xong", CU: "cu", MOT_PHAN: "mot-phan", THIEU: "thieu", NGOAI_PHAM_VI: "ngoai-pham-vi" });

/** Đọc danh mục. NÉM nếu hỏng — một danh mục đọc không được thì mọi con số sau đó vô nghĩa,
 *  và trả về danh sách rỗng sẽ in ra "0 tính năng, tất cả đều xong". */
export function docDanhMuc(root = NHA) {
  const p = path.join(root, "features.json");
  const raw = fs.readFileSync(p, "utf8");
  const d = JSON.parse(raw);
  if (!Array.isArray(d?.blocks)) throw new Error("features.json: thiếu khối `blocks`");
  return d;
}

/** Repo đích có lệnh này trong `package.json` không? Không có `package.json` → `null` = KHÔNG
 *  BIẾT, khác hẳn `false` = không có lệnh. Repo Python không có `package.json` là chuyện thường,
 *  và báo nó "thiếu mọi lệnh" là báo sai. */
export function docLenh(repo) {
  try {
    const d = JSON.parse(fs.readFileSync(path.join(repo, "package.json"), "utf8"));
    return d?.scripts && typeof d.scripts === "object" ? d.scripts : {};
  } catch (_) { return null; }
}

/* "REPO NÀY CÓ PHẢI NƠI PHÁT HÀNH BỘ KHUNG KHÔNG" — suy bằng DẤU HIỆU, không bằng đường dẫn.
 *
 * Bản đầu so `path.resolve(repo) === path.resolve(NHA)`. Nó đúng ở repo phát hành và SAI ở mọi
 * repo khác: file này ĐI THEO BẢN TRÍCH, nên khi một repo đích chạy `npm run features` thì `NHA`
 * chính là gốc repo đó — phép so trả `true`, và repo đích bị đòi cả bộ máy phát hành
 * (`build-template.mjs`, `RELEASE-LEDGER.json`, `upgrade.mjs`…) mà nó không bao giờ cần.
 *
 * Bắt được vì phép ghim chạy TRONG một repo dựng từ bản trích và đỏ ngay. Nếu chỉ chạy ở repo
 * nhà thì bug này im lặng mãi, và mọi bản báo cáo tính năng ở repo đích đều báo thiếu sai.
 *
 * Dấu hiệu: hai file của tầng phát hành, và cả hai CỐ Ý không đi theo bản trích. Đòi cả hai chứ
 * không một — một file lẻ có thể tồn tại vì lý do khác. */
export const DAU_HIEU_PHAT_HANH = Object.freeze(["scripts/build-template.mjs", "RELEASE-LEDGER.json"]);

export function laNoiPhatHanh(repo, co = null) {
  const kiem = co ?? ((r, f) => { try { fs.statSync(path.join(r, ...f.split("/"))); return true; } catch (_) { return false; } });
  return DAU_HIEU_PHAT_HANH.every((f) => kiem(repo, f));
}

const coTrenDia = (repo, rel) => {
  try { fs.statSync(path.join(repo, ...rel.split("/"))); return true; } catch (_) { return false; }
};

/* Đọc nội dung một file của repo đích. `null` = không đọc được, và bên gọi phải coi đó là THIẾU
   chứ không phải "chắc là có" — đây là chỗ một phép đo dễ ngã về phía dễ nhất. */
const docNoiDungTrenDia = (repo, rel) => {
  try { return fs.readFileSync(path.join(repo, ...rel.split("/")), "utf8"); } catch (_) { return null; }
};

/** Đo MỘT mục. Thuần với `deps`, nên đột biến kiểm được mà không cần dựng repo thật. */
export function xetMuc(muc, repo, laRepoNha, lenh, co = coTrenDia, docNoiDung = docNoiDungTrenDia, fileCu = null) {
  if (muc.pham_vi === "chi-repo-nha" && !laRepoNha) return { trangThai: TRANG_THAI.NGOAI_PHAM_VI, thieu: [], co: [] };
  if (muc.pham_vi === "chi-repo-dich" && laRepoNha) return { trangThai: TRANG_THAI.NGOAI_PHAM_VI, thieu: [], co: [] };

  const canFile = muc.can?.file ?? [];
  const canLenh = muc.can?.lenh ?? [];
  /* `chuoi` đo DÂY NỐI, không đo file. Vì sao cần một kiểu đo thứ ba: một cơ chế có thể có đủ
   * file mà KHÔNG ai gọi được nó — đúng ca `[~]` mà chính danh mục cảnh báo, và đã xảy ra thật
   * (`session-check.mjs` có mặt nhưng thiếu `npm run gate`). Đo bằng `lenh` thì không xong, vì
   * TÊN alias khác nhau ở mỗi repo: ở đây bộ chạy song song nằm dưới `test`, ở repo tiêu thụ nó
   * là `test:song-song` — hỏi tên là hỏi chi tiết triển khai. Nên hỏi HÀNH VI: có alias nào TRỎ
   * VÀO nó không. */
  const canChuoi = muc.can?.chuoi ?? [];
  /* `trong_file` đo NỘI DUNG, không đo sự có mặt. Vì sao cần kiểu đo thứ tư — đo 08/09 trên bốn
   * repo đã migrate: `F4.7` (luật hai vai) khai `can.file = ["AGENTS.md","BACKLOG.md"]`, mà hai
   * file đó có ở MỌI repo đã lắp từ lâu, nên mục báo `[x]` khắp nơi trong khi
   * `grep -cE "giữ lõi|phát & thu"` ra **0 trên 4**. Danh mục báo ĐẠT cho một tính năng ở nơi nó
   * KHÔNG TỒN TẠI.
   *
   * Gốc bệnh: có những tính năng là một ĐOẠN LUẬT nằm trong một file repo đích TỰ SỞ HỮU.
   * `upgrade.mjs` không bao giờ ghi `AGENTS.md` của họ — đúng, đó là file của họ — nên với loại
   * mục này *"file có tồn tại"* và *"nội dung đã tới"* là hai câu khác nhau, và `can.file` chỉ
   * hỏi câu dễ. */
  const canTrongFile = muc.can?.trong_file ?? [];
  const doTrongFile = (m) => {
    const noi = docNoiDung(repo, m.file);
    return noi !== null && (m.chuoi ?? []).every((c) => noi.includes(c));
  };
  const coTrong = canTrongFile.filter(doTrongFile);
  const thieuTrong = canTrongFile.filter((m) => !doTrongFile(m));
  const coFile = canFile.filter((f) => co(repo, f));
  const thieuFile = canFile.filter((f) => !co(repo, f));

  /* Lệnh chỉ tính khi ĐỌC ĐƯỢC `package.json`. Không đọc được thì bỏ qua vế lệnh chứ không tính
   * là thiếu — xem ghi chú ở `docLenh`. Repo khác nghề vẫn đo được phần file. */
  const coLenh = lenh === null ? canLenh : canLenh.filter((l) => Object.hasOwn(lenh, l));
  const thieuLenh = lenh === null ? [] : canLenh.filter((l) => !Object.hasOwn(lenh, l));

  // Cùng luật với `lenh`: không đọc được `package.json` thì BỎ QUA vế này, không tính là thiếu.
  const giaTri = lenh === null ? [] : Object.values(lenh).map((v) => String(v));
  const coChuoi = lenh === null ? canChuoi : canChuoi.filter((c) => giaTri.some((v) => v.includes(c)));
  const thieuChuoi = lenh === null ? [] : canChuoi.filter((c) => !giaTri.some((v) => v.includes(c)));

  const tongCan = canFile.length + canLenh.length + canChuoi.length + canTrongFile.length;
  const tongCo = coFile.length + coLenh.length + coChuoi.length + coTrong.length;

  /* FILE CŨ chỉ hạ được XONG xuống CU, không bao giờ che một mục đang MỘT PHẦN hay THIẾU.
   * Thứ tự nặng nhẹ cố ý: *một phần* nguy hơn *cũ*, và *cũ* nguy hơn *đủ*. Một mục vừa thiếu
   * một nửa vừa có file cũ thì cái phải xử trước vẫn là nửa đang thiếu — báo `[!]` ở đó là
   * hạ mức báo động của một ca nặng hơn. */
  const cuTrongMuc = fileCu === null ? [] : canFile.filter((f) => fileCu.has(f));
  const trangThai = tongCo === 0 && tongCan > 0 ? TRANG_THAI.THIEU
    : tongCo === tongCan ? (cuTrongMuc.length ? TRANG_THAI.CU : TRANG_THAI.XONG)
      : TRANG_THAI.MOT_PHAN;

  return {
    trangThai,
    cu: cuTrongMuc,
    co: [...coFile, ...coLenh.map((l) => `npm run ${l}`), ...coChuoi.map((c) => `một alias npm gọi ${c}`),
      ...coTrong.map((m) => `nội dung trong ${m.file}`)],
    thieu: [...thieuFile, ...thieuLenh.map((l) => `npm run ${l}`), ...thieuChuoi.map((c) => `một alias npm gọi ${c}`),
      ...thieuTrong.map((m) => `nội dung trong ${m.file} (thiếu: ${(m.chuoi ?? []).filter((c) => !(docNoiDung(repo, m.file) ?? "").includes(c)).join(" · ")})`)]
  };
}

/** Đo cả danh mục trên một repo. */
export function do1Repo(danhMuc, repo, laRepoNha, co = coTrenDia, docNoiDung = docNoiDungTrenDia, fileCu = null) {
  const lenh = docLenh(repo);
  return danhMuc.blocks.map((b) => ({
    ...b,
    muc: b.muc.map((m) => ({ ...m, ket: xetMuc(m, repo, laRepoNha, lenh, co, docNoiDung, fileCu) }))
  }));
}

export function demTheoTrangThai(ketQua) {
  const d = { xong: 0, cu: 0, "mot-phan": 0, thieu: 0, "ngoai-pham-vi": 0 };
  for (const b of ketQua) for (const m of b.muc) d[m.ket.trangThai] += 1;
  return d;
}

const O = { xong: "[x]", cu: "[!]", "mot-phan": "[~]", thieu: "[ ]", "ngoai-pham-vi": "[-]" };

function inCho1Nguoi(danhMuc, ketQua, repo, laRepoNha) {
  const dem = demTheoTrangThai(ketQua);
  console.log("");
  console.log(`DANH MỤC TÍNH NĂNG — ${repo}`);
  console.log(`  danh mục bản ${danhMuc.version}${laRepoNha ? " · đo CHÍNH repo phát hành" : " · đo một repo đã lắp"}`);
  console.log("");

  for (const b of ketQua) {
    const cuaB = b.muc.filter((m) => m.ket.trangThai !== TRANG_THAI.NGOAI_PHAM_VI);
    const xongB = cuaB.filter((m) => m.ket.trangThai === TRANG_THAI.XONG).length;
    console.log(`${b.ma} · ${b.ten}   —   ${xongB}/${cuaB.length}`);
    for (const m of b.muc) {
      const t = m.ket.trangThai;
      const duoi = t === TRANG_THAI.NGOAI_PHAM_VI ? `  (chỉ cần ở ${m.pham_vi === "chi-repo-nha" ? "repo phát hành" : "repo đã lắp"})`
        : t === TRANG_THAI.CU ? `  — bản CŨ: ${m.ket.cu.join(", ")}`
          : t === TRANG_THAI.XONG ? ""
          : `  → thiếu: ${m.ket.thieu.join(", ")}`;
      console.log(`  ${O[t]} ${m.ma} ${m.ten}${m.tuy_chon ? " (tuỳ chọn)" : ""}   [từ bản ${m.tu_ban}]${duoi}`);
    }
    console.log("");
  }

  console.log(`TỔNG: ${dem.xong} xong · ${dem["mot-phan"]} một phần · ${dem.thieu} thiếu · ${dem["ngoai-pham-vi"]} ngoài phạm vi`);
  if (dem["mot-phan"]) {
    console.log("");
    console.log("⚠ MỘT PHẦN là ca đáng lo hơn THIẾU: mục đó trông như đang chạy nhưng hỏng ở chỗ");
    console.log("  không ai nhìn. Xử nó trước, đừng xử theo thứ tự trong bảng.");
  }
}

/** Khối markdown để DÁN VÀO HỒ SƠ MIGRATE. Cố ý ra markdown chứ không ra bảng đẹp: nó phải sống
 *  được trong một file `.md` chỉ-thêm ở repo đích, và phải đọc được sau sáu tháng. */
export function khoiMigrate(danhMuc, ketQua, ngay, fileCu = null, banChuan = null, banGhim = null) {
  const dong = [];
  dong.push(`## Checklist tính năng đã migrate — danh mục bản ${danhMuc.version} · đo ngày ${ngay}`);
  dong.push("");
  dong.push("> Khối này do `node scripts/features.mjs --migrate <repo>` sinh ra. **Đo, không tự khai.**");
  dong.push("> `[x]` đủ · `[!]` **có nhưng bản CŨ** · `[~]` một phần (xử trước) · `[ ]` thiếu · `[-]` chỉ cần ở repo phát hành.");
  dong.push("> `[!]` chỉ đo được khi lệnh chạy **tại repo bộ khung**: repo đích không với tới bản chuẩn nên");
  dong.push("> không tự biết mình tụt lại. Khối thiếu dòng *đối chiếu bản chuẩn* ở cuối = **CHƯA ĐO**, không phải đã mới.");
  dong.push("");
  for (const b of ketQua) {
    const cuaB = b.muc.filter((m) => m.ket.trangThai !== TRANG_THAI.NGOAI_PHAM_VI);
    const xongB = cuaB.filter((m) => m.ket.trangThai === TRANG_THAI.XONG).length;
    dong.push(`**${b.ma} · ${b.ten}** — ${xongB}/${cuaB.length}`);
    dong.push("");
    for (const m of b.muc) {
      const t = m.ket.trangThai;
      /* THIẾU VÌ CHƯA LẮP khác THIẾU VÌ REPO ĐANG CŨ, và hai ca ấy đi về hai lượt việc khác nhau.
       * `tu_ban` cho tới trước chỉ được IN RA — hai chỗ dùng, cả hai đều là `console`. Ở đây nó gánh
       * việc thật: một mục ra đời ở bản **sau** bản repo đích đang ghim thì không phải lỗi của lượt
       * migrate — nó là việc NÂNG. Đếm nhầm sang cột “thiếu” là đổ việc cho nhầm người. */
      const chuaToiLuot = t === TRANG_THAI.THIEU && banGhim && soSanhBan(m.tu_ban, banGhim) > 0;
      const duoi = t === TRANG_THAI.CU ? ` — **bản CŨ**: \`${m.ket.cu.join("` `")}\``
        : t === TRANG_THAI.XONG || t === TRANG_THAI.NGOAI_PHAM_VI ? ""
          : chuaToiLuot ? ` — thiếu: \`${m.ket.thieu.join("` `")}\` — **việc NÂNG, không phải việc migrate**: cơ chế này ra đời ở bản ${m.tu_ban}, repo đang ghim ${banGhim}`
            : ` — thiếu: \`${m.ket.thieu.join("` `")}\``;
      dong.push(`- ${O[t]} \`${m.ma}\` ${m.ten} *(từ bản ${m.tu_ban})*${duoi}`);
    }
    dong.push("");
  }
  const dem = demTheoTrangThai(ketQua);
  dong.push(`**Tổng: ${dem.xong} xong · ${dem.cu} bản cũ · ${dem["mot-phan"]} một phần · ${dem.thieu} thiếu.**`);
  /* DÒNG NÀY BẮT BUỘC PHẢI CÓ MẶT Ở CẢ HAI CA. Một bảng không có `[!]` nào trông y hệt nhau khi
   * *"đã đối chiếu, không có gì cũ"* và khi *"chưa đối chiếu lần nào"* — nên phải nói ra ca nào.
   * Im lặng ở đây là để người đọc tự điền ca dễ chịu hơn. */
  dong.push("");
  dong.push(fileCu === null
    ? "> **CHƯA đối chiếu bản chuẩn.** Cột `[!]` không đo được ở lượt này, nên `0 bản cũ` ở trên đọc đúng là *chưa biết*. Muốn biết thì chạy lệnh trên **tại repo bộ khung**."
    : `> Đã đối chiếu với bản chuẩn${banChuan ? ` **${banChuan}**` : ""}: ${fileCu.size} file tầng máy đang là bản CŨ ở repo đích.`);
  return dong.join(NL) + NL;
}

/* ĐO XEM TÍNH NĂNG ĐANG CHẠY BẢN NÀO — và vì sao nó nằm ở ĐÂY chứ không nằm trong `xetMuc`.
 *
 * `features.mjs` ĐI THEO BẢN TRÍCH; `upgrade.mjs` và `build-template.mjs` Ở LẠI repo nhà. Chiều
 * phụ thuộc phải chảy từ thứ ở lại sang thứ đi theo — nhập tĩnh hai file kia là mọi repo đích
 * chết ngay dòng `import`, và đó đã là lỗi lặp ba lần trong chính bộ này. Nên: nhập ĐỘNG, trong
 * try/catch, và thiếu thì trả `null`.
 *
 * `null` KHÁC tập rỗng, và khác biệt đó là toàn bộ điểm của hàm này. Tập rỗng nói *"đã đối chiếu,
 * không có gì cũ"*. `null` nói *"CHƯA ĐỐI CHIẾU"* — bản in phải nói ra điều đó, vì một bảng
 * không có `[!]` nào trông y hệt nhau ở hai ca ngược nhau.
 *
 * Phép so là của `upgrade.mjs`, không viết lại: nó so BA chiều (bản chuẩn ↔ bản ở repo ↔ dấu vân
 * tay trong sổ ghim) nên phân biệt được *"đang ghim bản cũ"* với *"có người sửa tay"*. Chép lại
 * phép so đó ở đây là dựng nguồn sự thật thứ hai cho đúng câu hỏi đắt nhất. */
export async function doFileCu(repo, laRepoNha, nhap = (u) => import(u)) {
  if (laRepoNha) return null;   // repo nhà LÀ bản chuẩn; không có gì để đối chiếu với chính nó
  try {
    const url = (ten) => pathToFileURL(path.join(NHA, "scripts", ten)).href;
    const [up, bt] = await Promise.all([nhap(url("upgrade.mjs")), nhap(url("build-template.mjs"))]);
    if (typeof up?.soSanh !== "function" || typeof bt?.buildTemplateFiles !== "function") return null;
    const ghim = up.docSoGhim(repo);
    if (ghim?.trangThai !== "CO") return null;   // chưa lắp, hoặc sổ ghim hỏng → KHÔNG BIẾT
    return new Set(up.soSanh(repo, bt.buildTemplateFiles(), ghim.so)
      .filter((d) => d.trangThai === "CŨ").map((d) => d.rel));
  } catch (_) { return null; }
}

/* So hai số phiên bản x.y.z. Cùng phép so với `doi-hinh.mjs`, nhưng file này ĐI THEO BẢN TRÍCH
 * còn file kia Ở LẠI NHÀ — nhập chéo là repo đích chết dòng import. Bốn dòng, chép có lý do. */
export function soSanhBan(a, b) {
  const p = (v) => String(v ?? "").split(".").map((x) => Number.parseInt(x, 10) || 0);
  const [x, y] = [p(a), p(b)];
  for (let i = 0; i < 3; i += 1) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) - (y[i] ?? 0);
  return 0;
}

/* Bản của repo nhà, đọc từ `package.json`. Đọc không được thì `null` — bản in bỏ tên bản chứ
 * không đoán, vì một số phiên bản sai còn tệ hơn không có số nào. */
/* Bản repo đích đang ghim, đọc từ sổ ghim của chính nó. Không có sổ (chưa lắp) → `null`, và
 * `null` làm mọi mục quay về cách đọc cũ chứ không đoán. */
function docBanGhim(repo) {
  try { return JSON.parse(fs.readFileSync(path.join(repo, ".ark", "harness.lock.json"), "utf8")).version ?? null; }
  catch (_) { return null; }
}

function banChuanNha() {
  try { return JSON.parse(fs.readFileSync(path.join(NHA, "package.json"), "utf8")).version ?? null; }
  catch (_) { return null; }
}

async function main() {
  const args = process.argv.slice(2);
  const jsonRa = args.includes("--json");
  const raMigrate = args.includes("--migrate");
  const duong = args.find((a) => !a.startsWith("--"));
  const repo = duong ? path.resolve(duong) : NHA;
  const laRepoNha = laNoiPhatHanh(repo);

  let danhMuc;
  try { danhMuc = docDanhMuc(NHA); }
  catch (e) {
    console.error(`DANH_MUC_HONG: ${String(e.message).split(NL)[0]}`);
    console.error("Không đọc được `features.json` thì KHÔNG đo được gì. Sửa file đó rồi chạy lại.");
    process.exit(2);
  }

  try { fs.statSync(repo); }
  catch (_) {
    console.error(`KHONG_CO_REPO: ${repo}`);
    process.exit(2);
  }

  const fileCu = await doFileCu(repo, laRepoNha);
  const banGhim = docBanGhim(repo);
  const ketQua = do1Repo(danhMuc, repo, laRepoNha, undefined, undefined, fileCu);

  if (jsonRa) { console.log(JSON.stringify({ version: danhMuc.version, repo, laRepoNha, blocks: ketQua }, null, 2)); return; }
  if (raMigrate) { console.log(khoiMigrate(danhMuc, ketQua, new Date().toISOString().slice(0, 10), fileCu, banChuanNha(), banGhim)); return; }
  inCho1Nguoi(danhMuc, ketQua, repo, laRepoNha);

  /* MÃ THOÁT KHÔNG PHẢI PHÁN QUYẾT. Lệnh này ĐO, nó không chặn ai: một repo đang migrate dở thì
   * thiếu tính năng là chuyện đương nhiên, và cho nó thoát khác 0 sẽ biến một bản báo cáo thành
   * một cái cổng — rồi người ta bọc nó trong `|| true` và mất luôn bản báo cáo. */
}

if (process.argv[1] && process.argv[1].endsWith("features.mjs")) main();
