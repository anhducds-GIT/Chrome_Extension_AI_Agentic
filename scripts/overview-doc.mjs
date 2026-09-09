/* BỘ ĐỌC CỦA BẢNG — năm nguồn mà layout cũ chưa hề chiếu ra.
 *
 * VÌ SAO TÁCH RA MỘT FILE. Đức mở bảng của repo Chrome Extension 06/09 và thấy bảng của bộ
 * khung thiếu hẳn năm tab: **AI điều phối · Ý tưởng · Vận hành · Sức khoẻ & nợ · Cấu trúc**.
 * Repo kia đã tự đi trước và chứng minh chúng dùng được — nên việc đúng là **mang logic về
 * một nguồn rồi phát đi**, không phải để hai repo mỗi nơi một bảng.
 *
 * Bộ đọc ở riêng vì nó là thứ **kiểm được bằng phép kiểm thuần**: đưa vào một chuỗi, đòi ra
 * đúng một cấu trúc. Phần dựng HTML thì không — nó chỉ kiểm được bằng cách so chuỗi dài.
 *
 * BA LUẬT CỦA CẢ FILE NÀY, không có ngoại lệ:
 *
 * 1. **Không đọc đồng hồ.** Mọi con số "bao lâu rồi" suy từ git. Bảng nằm trong khối
 *    `generators`, nên một byte phụ thuộc đồng hồ là sang ngày mọi phiên bị chặn đẩy dù không
 *    dữ liệu nào đổi.
 * 2. **Đọc không ra thì NÉM, đừng đoán.** Trừ đúng những chỗ "rỗng là trạng thái hợp lệ" —
 *    và mỗi chỗ như thế đều có ghi chú nói vì sao rỗng khác hỏng.
 * 3. **Thà đếm THỪA nợ hơn đếm THIẾU.** Một mục đang mở bị đếm nhầm là đã đóng thì nó biến
 *    mất khỏi bảng và không ai đi tìm nữa.
 */

const NL = String.fromCharCode(10);
const CR = String.fromCharCode(13);
const donGian = (t) => String(t ?? "").split(CR).join("");

/* ---- 1. Sổ ý tưởng --------------------------------------------------------- */

/* Bốn bậc, ĐÓNG. Bậc lạ thì NÉM chứ không xếp vào "khác" — một bậc gõ sai mà lặng lẽ rơi vào
 * thùng "khác" là đúng cách một ý tưởng biến mất khỏi bảng mà không ai biết.
 *
 * `nghỉ` KHÔNG phải bậc thứ tư trên đường đi. Nó là nhánh rẽ ra. Thanh tiến độ phải vẽ nó
 * thành gạch ngang chứ không phải "gần xong" — nhầm chỗ này là báo cáo sai chiều. */
export const BAC = ["ý tưởng", "đang xây", "đã chứng minh", "nghỉ"];
export const BAC_SO = new Map(BAC.map((b, i) => [b, i]));

/* KHỚP ĐÚNG DẤU MÀ `what-next.mjs` ĐANG KHỚP, không rộng hơn.
 *
 * Hai chỗ cùng đọc một sổ mà nhận dạng khác nhau thì sẽ có ngày một ý tưởng hiện trên bảng mà
 * không hiện ở bản đồ việc — và không ai biết bên nào đúng. Tiền tố chỉ chữ in hoa (`[A-Z]+`),
 * dòng trường bắt đầu bằng `-` hoặc `*`, dấu hai chấm đặt trong hay ngoài cặp `**` đều nhận. */
const MUC_Y = /^##\s+([A-Z]+-\d+)\s*[·:]?\s*(.*)$/;
const TRUONG = /^\s*[-*]\s+\*\*([^:*]+):?\*\*:?\s*(.*)$/;
const KHOI = /^\*\*([^*]+)\*\*\s*[—-]\s*(.*)$/;

const chuanBac = (raw) => {
  const t = String(raw ?? "").trim().toLowerCase();
  for (const b of BAC) if (t === b || t.startsWith(b)) return b;
  return null;
};

/**
 * `IDEAS.md` → danh sách ý tưởng.
 *
 * Quy ước GIỮ NGUYÊN của `what-next.mjs` — hai chỗ đọc cùng một sổ thì phải đọc cùng một dấu,
 * không thì bảng và bản đồ việc sẽ nói hai kiểu về cùng một ý tưởng.
 *
 * `extra` giữ MỌI trường lạ. Ai viết thêm một dòng `- **rủi ro:** …` vào sổ thì dòng đó vẫn
 * hiện lên bảng, không rơi vào hư không. Bảng không được im lặng nuốt chữ của người.
 */
export function readIdeas(text) {
  const dong = donGian(text).split(NL);
  const ra = [];
  let cur = null;
  let khoi = null;
  for (const l of dong) {
    const m = MUC_Y.exec(l);
    if (m) {
      if (cur) ra.push(cur);
      cur = { ma: m[1], ten: m[2].trim(), bac: null, viecKe: null, chu: null, phamVi: null, extra: [], khoi: [] };
      khoi = null;
      continue;
    }
    if (!cur) continue;
    const t = TRUONG.exec(l);
    if (t) {
      const ten = t[1].trim().toLowerCase();
      const gt = t[2].trim();
      if (ten === "bậc") {
        const b = chuanBac(gt);
        if (!b) {
          throw new Error(`BAC_LA: ý tưởng ${cur.ma} khai bậc "${gt}" — sổ chỉ có ${BAC.join(" · ")}. `
            + "Không đoán hộ: một bậc gõ sai mà bị xếp vào thùng khác là ý tưởng đó biến mất khỏi bảng.");
        }
        cur.bac = b;
      } else if (ten === "việc kế") cur.viecKe = gt;
      else if (ten === "chủ") cur.chu = gt;
      else if (ten === "phạm vi") cur.phamVi = gt;
      else cur.extra.push([t[1].trim(), gt]);
      continue;
    }
    const k = KHOI.exec(l.trim());
    if (k) { khoi = { ten: k[1].trim(), than: [k[2].trim()].filter(Boolean) }; cur.khoi.push(khoi); continue; }
    if (khoi && l.trim()) khoi.than.push(l.trim());
    else if (l.trim()) khoi = null;
  }
  if (cur) ra.push(cur);
  for (const y of ra) {
    if (!y.bac) {
      throw new Error(`THIEU_BAC: ý tưởng ${y.ma} không khai dòng "- **bậc:**". `
        + "Bậc là thứ quyết định nó nằm ở đâu trên thanh tiến độ — thiếu thì bảng phải dừng, không được vẽ bừa.");
    }
  }
  return ra;
}

/* ---- 2. Việc chờ người chốt ------------------------------------------------ */

/* HAI DẤU, hai loại việc khác hẳn nhau:
 *   @Đức:bấm  — việc tay vài phút, gom được thành một buổi
 *   @Đức:chốt — việc cần Đức NGHĨ, mỗi cái một lượt
 *
 * Gộp hai loại là hỏng cách dùng: một danh sách 20 mục lẫn lộn thì Đức không biết nên dành
 * 5 phút hay một buổi. Dấu không phân biệt hoa thường và cho phép bỏ dấu tiếng Việt, vì gõ
 * dấu trên một số bàn phím là phiền — nhưng KHÔNG cho phép biến thể khác, kẻo một câu văn
 * xuôi nhắc tới "Đức" lại thành một mục việc.
 */
const DAU_DUC = /@\s*(?:Đức|Duc|đức|duc)\s*:\s*(bấm|bam|chốt|chot)\b/i;
export const LOAI_DUC = { bam: "BẤM", chot: "CHỐT" };

const boDau = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Quét MỘT file, trả các dòng có dấu. `soDong` là số dòng 1-based — người gọi dùng nó để hỏi
 * git xem dòng ấy sinh ra ngày nào.
 *
 * Cố ý quét THEO DÒNG, không theo mục: dấu đặt ngay trên dòng của mục thì lúc mục đóng, dấu
 * mất theo. Không phải nhớ đi xoá ở một danh sách thứ hai — và một danh sách thứ hai thì luôn
 * cũ hơn thực tế.
 */
export function quetDauDuc(text, file) {
  const ra = [];
  const dong = donGian(text).split(NL);
  for (let i = 0; i < dong.length; i += 1) {
    const m = DAU_DUC.exec(dong[i]);
    if (!m) continue;
    const loai = boDau(m[1]).startsWith("bam") ? "bam" : "chot";
    const cau = dong[i].replace(DAU_DUC, "").replace(/^[#>\-*\s]+/, "").replace(/\*\*/g, "").trim();
    ra.push({ file, soDong: i + 1, loai, cau });
  }
  return ra;
}

/* ---- 3. Sổ nợ: đếm mục CÒN MỞ --------------------------------------------- */

/* Dấu đóng của sổ nợ bộ khung là **gạch mã**: `### ~~KHUNG-9~~ · …`. Đọc đúng dấu đó, không
 * dò từ khoá "xong" trong văn xuôi — có mục viết "gỡ khoá sau khi việc kia xong", và chữ
 * "xong" ở đó là điều kiện chứ không phải trạng thái. Dò giữa câu là đóng oan một việc đang
 * mở, tức bảng báo THIẾU nợ. Lệch về phía báo thừa, cố ý. */
const MUC_NO = /^###\s+(~~)?\s*([A-Z][A-Z0-9]*-\d+)\s*~*\s*[·:]?\s*(.*)$/;
/* Cùng mẫu với `what-next.mjs` — hai chỗ đọc CÙNG một sổ thì phải đọc cùng một dấu. */
const UU_TIEN_NO = /^##\s+(P[1-9])\b/;

export function readNo(text) {
  const ra = [];
  /* MỨC ƯU TIÊN đọc từ tiêu đề nhóm `## P<n>` đứng trên. Thêm 09/09 vì bảng bắt đầu LIỆT KÊ sổ
     nợ chứ không chỉ đếm — mà một danh sách 25 mục không có mức ưu tiên thì người đọc phải tự
     đi tra từng cái, tức danh sách chỉ dời công việc chứ không bớt. Mục nằm trước mọi tiêu đề
     nhóm thì mang `P?`: **không biết** khác **không quan trọng**, và trộn hai thứ đó là nói dối. */
  let uuTien = "P?";
  for (const l of donGian(text).split(NL)) {
    const ut = UU_TIEN_NO.exec(l);
    if (ut) { uuTien = ut[1]; continue; }
    const m = MUC_NO.exec(l);
    if (!m) continue;
    const ten = m[3].replace(/~~/g, "").trim();
    ra.push({ ma: m[2], ten, dong: Boolean(m[1]), uuTien, choChot: DAU_DUC.test(ten) });
  }
  return ra;
}

/* ---- 4. Bảng chủ sở hữu ---------------------------------------------------- */

/**
 * `.agents/claims.json` → từng khoá: đang có chủ hay không, ai giữ, giữ để làm gì.
 *
 * NÉM khi đọc không ra. Bảng quyền là thứ cả cơ chế chống giẫm chân đứng lên; một bảng quyền
 * hỏng mà bảng vẫn vẽ ra "0 khoá đang bận" là câu trả lời SAI cho đúng câu hỏi nguy hiểm nhất.
 */
export function readKhoa(raw) {
  let j;
  try { j = JSON.parse(raw); }
  catch (e) {
    throw new Error(`BANG_QUYEN_HONG: .agents/claims.json không phải JSON đọc được (${String(e.message).split(NL)[0]}). `
      + "Không vẽ bảng từ một bảng quyền hỏng — vẽ ra là nói dối về đúng thứ nguy hiểm nhất.");
  }
  const c = j?.claims;
  if (!c || typeof c !== "object") {
    throw new Error("BANG_QUYEN_HONG: .agents/claims.json không có khối `claims`. Đây là bảng chủ sở hữu, không phải một file JSON bất kỳ.");
  }
  const ra = [];
  for (const [khoa, v] of Object.entries(c)) {
    /* KHỚP ĐÚNG TÊN, không khớp tiền tố. Bản đầu lọc `startsWith("_doc")` và nuốt luôn khoá
     * vùng **`_docs`** — một vùng thật biến mất khỏi bảng, im lặng. Bắt được ngay lượt chạy
     * đầu trên dữ liệu thật. (Ở file này hai khoá chú thích vốn nằm NGOÀI khối `claims`, nên
     * chỗ này gần như không cần lọc; giữ lại đúng hai tên cho repo nào đặt chúng vào trong.) */
    if (khoa === "_doc" || khoa === "_labels") continue;
    const o = v && typeof v === "object" ? v : {};
    ra.push({ khoa, owner: o.owner || null, task: o.task || null, tu: o.claimed_at || null });
  }
  return ra.sort((a, b) => a.khoa.localeCompare(b.khoa));
}

/* ---- 5. Bốn cơ chế và năm bất biến của MULTIFLOW --------------------------- */

/* ĐỌC LẠI TỪ LUẬT, không chép. Bảng chép luật là bảng sẽ có ngày nói khác luật, và bảng là
 * thứ người ta đọc trước. Cắt tới mục `## ` KẾ TIẾP chứ không tới cuối file: cắt tới cuối là
 * fail-open đội lốt fail-closed — mục biến mất thì nó lặng lẽ nhặt bảng của mục khác. */
export function catMuc(text, so) {
  const dong = donGian(text).split(NL);
  const dau = dong.findIndex((l) => l.startsWith(`## ${so}.`));
  if (dau < 0) return null;
  const het = dong.findIndex((l, i) => i > dau && l.startsWith("## "));
  return dong.slice(dau + 1, het < 0 ? dong.length : het);
}

export function readCoChe(text) {
  const d = catMuc(text, 2);
  if (!d) return [];
  return d.filter((l) => l.startsWith("|") && !/^\|[\s:|-]+\|?\s*$/.test(l))
    .map((l) => l.replace(/^\||\|$/g, "").split("|").map((c) => c.trim()))
    .filter((c) => c.length >= 2 && /^\*\*.+\*\*$/.test(c[0]))
    .map((c) => ({ ten: c[0].replace(/\*\*/g, ""), cau: c[1] }));
}

export function readBatBien(text) {
  const d = catMuc(text, 4);
  if (!d) return [];
  /* Bất biến viết dạng `**① Câu chốt.** rồi văn xuôi giải thích chạy tiếp cùng dòng` — nên
   * KHÔNG được neo `$` vào cuối dòng. Bản đầu neo `$`, và kết quả là **không bắt được cái
   * nào** trong khi vẫn trả về mảng rỗng một cách lễ phép: bảng hiện "0 bất biến" ở đúng chỗ
   * đáng lẽ phải hiện năm luật lớn nhất của cơ chế. Rỗng-mà-đúng và rỗng-vì-đọc-hỏng trông
   * giống hệt nhau, nên chỗ này lấy đúng câu in đậm đầu dòng và bỏ phần giải thích. */
  const ra = [];
  for (const l of d) {
    const m = /^\*\*([①②③④⑤])\s*(.+?)\*\*/.exec(l.trim());
    if (m) ra.push({ so: m[1], cau: m[2].trim() });
  }
  return ra;
}

/* ---- 6. Bậc thang tuổi ----------------------------------------------------- */

/** Số ngày giữa hai mốc `YYYY-MM-DD`. `null` = không đo được, và null KHÁC 0. */
export function khoangNgay(sau, truoc) {
  const ms = (d) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(d ?? "").trim());
    return m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : NaN;
  };
  const a = ms(sau);
  const b = ms(truoc);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.round((a - b) / 86400000));
}

export function noiTuoi(ngay) {
  if (ngay === null) return "chưa đo được tuổi";
  if (ngay === 0) return "nêu hôm nay";
  if (ngay === 1) return "treo 1 ngày";
  return `treo ${ngay} ngày`;
}


/* ---- 7. Ba loại việc giao được, và bộ đọc hồ sơ migrate -------------------
 *
 * HAI KHỐI NÀY Ở ĐÂY VÌ CHIỀU PHỤ THUỘC, không phải vì chúng thuộc về nhau.
 *
 * Bảng cần biết ba loại việc giao được (`giao-viec.mjs`) và cần đọc hồ sơ migrate
 * (`build-so-migrate.mjs`). Nhưng hai lệnh kia **ở lại repo nhà**, còn bảng thì **đi theo bản
 * trích** — nên bảng nhập từ chúng là mọi repo đích nạp trang sẽ chết ngay dòng import, với
 * một câu lỗi không nói gì về nguyên nhân thật.
 *
 * Lối ra là **đảo chiều**: hằng số và bộ đọc nằm ở file ĐI THEO, còn hai lệnh ở lại thì nhập
 * từ đây. Một nguồn cho mỗi thứ, và chiều phụ thuộc chảy từ thứ ở lại sang thứ đi theo — chứ
 * không ngược. Đo được lúc chuẩn bị phát bản 1.3.17. */

/** Ba loại việc giao được cho một phiên AI khác. `ghi` = lượt này có ghi vào repo đích không. */
export const VIEC = {
  nang: { doc: "docs/briefs/NANG-BO-KHUNG.md", nhan: "nâng bộ khung", ghi: true },
  migrate: { doc: "docs/briefs/MIGRATE-REPO.md", nhan: "đưa repo lên chuẩn", ghi: true },
  audit: { doc: "docs/briefs/AUDIT-REPO.md", nhan: "audit trước migrate", ghi: false },
  /* ONBOARD — việc thứ tư, và là việc DUY NHẤT giao cho phiên AI THƯỜNG TRÚ của repo đích chứ
   * không cho một phiên đi làm rồi đi. Đo được sau ba lượt migrate: 3 lượt xong, 0 lượt có phiên
   * AI ở repo đích chạy trọn một vòng làm việc. Bộ khung tới nơi rồi NẰM ĐÓ — migrate đưa công
   * cụ tới, nó không đưa người cầm tới. `ghi: true` vì lượt onboard có làm một việc nhỏ thật. */
  onboard: { doc: "docs/briefs/ONBOARD-AI-REPO-DICH.md", nhan: "đưa AI của repo đích go live", ghi: true }
};

export const THU_MUC_MIGRATE = "docs/migrations";

/* Frontmatter tối giản — CHỈ dùng cho hồ sơ migrate, và cố ý không gọi sang `md-mini.mjs`:
 * file này phải nhập được từ một phép kiểm thuần, không kéo theo cả bộ dựng HTML. */
export function tachDauHoSo(raw) {
  const d = donGian(raw).split(NL);
  if (d[0] !== "---") return { fm: {}, than: raw };
  const het = d.indexOf("---", 1);
  if (het < 0) return { fm: {}, than: raw };
  const fm = {};
  for (const l of d.slice(1, het)) {
    const i = l.indexOf(":");
    if (i <= 0) continue;
    let v = l.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    fm[l.slice(0, i).trim()] = v;
  }
  return { fm, than: d.slice(het + 1).join(NL).replace(/^\n+/, "") };
}

/**
 * Hồ sơ migrate → danh sách, mới nhất lên đầu.
 *
 * `nguon` là một cặp `{ liet, doc }` do người gọi đưa vào — nhờ vậy cùng một bộ đọc chạy được
 * cả trên HEAD (bản đem commit) lẫn trên đĩa (phép kiểm dựng kho giả trong thư mục tạm, chỗ
 * chưa có commit nào để mà đọc).
 *
 * Hồ sơ thiếu `repo` hay `ngay` thì **KHÔNG bỏ qua im lặng** — nó vẫn hiện và tự khai là thiếu.
 * Bỏ qua im lặng nghĩa là một lần migrate biến mất khỏi lịch sử, đúng thứ sổ này sinh ra để chặn.
 */
export function readHoSo(nguon) {
  const ra = [];
  for (const f of nguon.liet()) {
    const raw = nguon.doc(f);
    const { fm, than } = tachDauHoSo(raw);
    ra.push({ file: `${THU_MUC_MIGRATE}/${f}`, fm: fm ?? {}, body: than ?? raw });
  }
  // Mới nhất lên đầu: người mở sổ gần như luôn hỏi "lần gần nhất thế nào".
  return ra.sort((a, b) => String(b.fm.ngay ?? "").localeCompare(String(a.fm.ngay ?? "")));
}

/* ---- 8. Checklist tính năng trong một hồ sơ migrate -------------------------
 *
 * Đức chốt 07/09: *"ở repo đích, đặc biệt là mục dashboard mới… cần ghi rõ checklist các
 * feature list sẽ được migrate cũng như là ngày phiên bản."*
 *
 * Khối chữ do `features.mjs --migrate` sinh và người dán vào hồ sơ. Bộ đọc này chiếu nó lên
 * bảng — nên bảng **không khai lần thứ hai**: hồ sơ nói gì thì bảng nói đúng thế.
 *
 * KHÔNG CÓ KHỐI THÌ TRẢ `null`, và bảng phải nói thẳng là **chưa đo**. Suy bừa ra "chưa có
 * tính năng nào" là bịa một con số nợ; suy bừa ra "đủ" thì tệ hơn. Ba hồ sơ đầu được ghi
 * TRƯỚC khi danh mục tính năng tồn tại, nên `null` là trạng thái hợp lệ, không phải lỗi.
 *
 * ĐỌC NGÀY VÀ BẢN TỪ CHÍNH DÒNG TIÊU ĐỀ, không lấy ngày sinh bảng: một checklist đo hôm qua
 * mà bảng dán ngày hôm nay lên là bảng nói dối về tuổi của số đo. Thiếu thì để `null`.
 */
const DAU_CHECKLIST = /^##\s+Checklist tính năng[^\n]*$/;
const KHOI_F = /^\*\*(F\d+)\s*·\s*(.+?)\*\*\s*—\s*(\d+)\/(\d+)\s*$/;
const MUC_F = /^-\s+\[([x~\-\s])\]\s+`([A-Z]\d+(?:\.\d+)?)`\s+(.+?)\s*$/;
const TRANG_F = { x: "xong", "~": "mot-phan", " ": "thieu", "-": "ngoai" };

export function docChecklistTinhNang(than) {
  const dong = donGian(than).split(NL);
  /* KHỐI CUỐI, không phải khối đầu. Hồ sơ migrate là vùng CHỈ THÊM: đo lại thì dán thêm một
   * khối mới xuống dưới, khối cũ giữ nguyên để tra. Lấy khối đầu là bảng luôn chiếu lần đo
   * XA NHẤT — tức càng đo lại nhiều lần thì bảng càng nói về quá khứ sâu hơn. */
  let i = -1;
  for (let k = 0; k < dong.length; k++) if (DAU_CHECKLIST.test(dong[k].trim())) i = k;
  if (i < 0) return null;
  const dau = dong[i];
  const ban = /danh mục bản\s+(\S+)/.exec(dau);
  const ngay = /đo ngày\s+([0-9-]+)/.exec(dau);
  const khoi = [];
  const dem = { xong: 0, "mot-phan": 0, thieu: 0, ngoai: 0 };
  for (let k = i + 1; k < dong.length; k++) {
    const l = dong[k];
    if (/^##\s+/.test(l)) break;
    const mk = KHOI_F.exec(l.trim());
    if (mk) { khoi.push({ ma: mk[1], ten: mk[2].trim(), xong: Number(mk[3]), tong: Number(mk[4]), muc: [] }); continue; }
    const mm = MUC_F.exec(l);
    if (!mm || !khoi.length) continue;
    const trang = TRANG_F[mm[1]] || "thieu";
    dem[trang]++;
    /* Cắt phần `*(từ bản …)*` và phần `— thiếu: …` ra khỏi tên, giữ lại cả hai làm trường
     * riêng: dán nguyên vào một ô bảng thì dòng dài gấp ba và cái tên biến mất giữa chữ. */
    let ten = mm[3];
    const tuBan = /\*\(từ bản\s+([^)]+)\)\*/.exec(ten);
    const thieu = /—\s*thiếu:\s*(.+)$/.exec(ten);
    ten = ten.replace(/\*\(từ bản[^)]*\)\*/, "").replace(/—\s*thiếu:.*$/, "").trim();
    khoi[khoi.length - 1].muc.push({
      trang, ma: mm[2], ten,
      tuBan: tuBan ? tuBan[1].trim() : null,
      thieu: thieu ? thieu[1].replace(/`/g, "").trim() : null
    });
  }
  if (!khoi.length) return null;
  return {
    ban: ban ? ban[1] : null,
    ngay: ngay ? ngay[1] : null,
    khoi,
    dem,
    xong: khoi.reduce((a, b) => a + b.xong, 0),
    tong: khoi.reduce((a, b) => a + b.tong, 0)
  };
}

/* ---- 9. Làm mới: F5 có đổi số hay không -------------------------------------
 *
 * Đức nêu 07/09: *"nếu hiện tại F5 là check status mới nhất được rồi thì phải giải thích"*.
 *
 * Câu trả lời KHÁC NHAU cho hai file, và đó chính là chỗ dễ hiểu sai nhất của cả bảng:
 * bản đã commit suy từ HEAD nên F5 **không** đổi số; bản SỐNG đọc bảng quyền từ đĩa nên F5
 * **có**. Nói gộp "F5 đi" là dạy sai một trong hai.
 *
 * ĐO, KHÔNG ĐOÁN: có bảng sống hay không thì xem repo có khai lệnh chạy nó; cổng thì đọc từ
 * chính mã nguồn máy chủ. Đọc không ra cổng thì nói "cổng máy chủ in ra lúc chạy" — đóng cứng
 * một con số là dẫn người xem tới bảng CỦA REPO KHÁC khi cổng bị chiếm và máy chủ nhảy cổng.
 */
export function nguonLamMoi({ tenBang, lenh = [], maMayChu = null } = {}) {
  const co = (k) => lenh.some((x) => Array.isArray(x) && x[0] === k);
  const cong = (() => {
    const m = /CONG_MAC_DINH\s*=\s*(\d{2,5})/.exec(String(maMayChu || ""));
    return m ? Number(m[1]) : null;
  })();
  const anhChup = {
    file: tenBang || null,
    f5: false,
    lenh: co("overview") ? "npm run overview" : "node scripts/build-overview.mjs"
  };
  if (!co("bang-song:may-chu")) return { anhChup, song: null };
  return {
    anhChup,
    song: {
      file: "bang-song/BANG.html",
      f5: true,
      cong,
      url: cong ? `http://127.0.0.1:${cong}/` : null,
      cua: [
        { nhan: "Nhấp đúp — không cần dòng lệnh", gia: "bang-song\\Xem-bang.cmd" },
        { nhan: "Máy chủ tại chỗ, F5 là thấy", gia: "npm run bang-song:may-chu" },
        { nhan: "Tự chạy lúc bật máy", gia: "bang-song\\Bat-tu-chay.cmd" }
      ]
    }
  };
}
