#!/usr/bin/env node
/* Cưỡng chế luật mục 2 của `BACKLOG.md` ở gốc repo: mỗi mục `## N-xx` PHẢI khai `đóng khi:`.
 *
 * VÌ SAO ĐÂY LÀ MỘT FILE, KHÔNG PHẢI MỘT DÒNG TRONG `package.json` (N-01, 06/09).
 * Luật này trước đây sống bằng một lệnh `node -e "..."` nhét trong `scripts.test`. Nó chặn
 * thật — bỏ trường `đóng khi:` khỏi một mục thì cổng ĐỎ. Nhưng **không có phép ghim nào canh
 * chính nó**: xoá dòng đó khỏi `package.json` là luật biến mất trong im lặng và mọi test vẫn
 * xanh. `MULTIFLOW.md` mục 5 gọi đúng tên chuyện này — *"một chốt không có test ghim thì nó
 * chỉ là bình luận"*.
 *
 * Không khai được điều kiện đóng thì mục đó chưa đủ chín để ghi vào sổ: nó là một cảm giác,
 * không phải một việc.
 *
 * Chỉ soi mục `## N-`. Mười bốn mục `## Y-` chuyển từ `IDEAS.md` ngày 06/09 được miễn — chúng
 * ra đời trước luật này, và sửa chúng là sửa chữ của phiên khác.
 *
 *   node scripts/backlog-check.mjs [đường-dẫn-sổ]
 *
 * Ra 0 nếu mọi mục đều khai. Ra 1 kèm tên mục nếu có mục thiếu. Ra 2 nếu không đọc được sổ. */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MODULE_FILE = path.resolve(fileURLToPath(import.meta.url));
const ROOT = path.resolve(path.dirname(MODULE_FILE), "..");

export const TRUONG_DONG_KHI = "- **đóng khi:**";

/* Cắt sổ theo tiêu đề mục. Tách bằng chính dòng tiêu đề nên phần văn xuôi mở đầu (luật của sổ,
   bản mẫu trong khối mã) rơi ra ngoài — bản mẫu viết `## N-xx`, không phải `## N-<số>`. */
export function docMuc(text) {
  const muc = [];
  let hienTai = null;
  for (const line of String(text ?? "").split(/\r?\n/)) {
    /* Dấu phân cách CỐ Ý không bắt buộc. Bản cũ trong `package.json` cắt bằng `\n## N-[0-9]`,
       tức nhận mọi tiêu đề `## N-<số>`; đòi thêm dấu `·` là làm phép kiểm HỞ RA — một mục viết
       thiếu dấu sẽ lọt qua mà không ai biết, đúng loại im lặng mà N-01 sinh ra để chặn. */
    const m = /^##\s+(N-\d+)(?![\w-])\s*[·:.\-]?\s*(.*)$/.exec(line);
    if (m) {
      hienTai = { ma: m[1], ten: m[2].trim(), than: [] };
      muc.push(hienTai);
      continue;
    }
    if (hienTai) hienTai.than.push(line);
  }
  return muc;
}

/* ---- TRÙNG MÃ — N-12 -----------------------------------------------------
 *
 * Ca thật, HAI LẦN TRONG MỘT NGÀY (06/09): hai lane cùng ghi mục `N-08`, rồi hai lane cùng
 * ghi mục `N-13`. Cả hai lượt đều vào HEAD, và không lớp nào kêu. Bộ kiểm này thì còn làm
 * người đọc đi sửa nhầm khối: nó gộp hai khối thành một mã rồi báo mã đó thiếu trường.
 *
 * VÌ SAO NÓ SẼ CÒN XẢY RA, VÀ VÌ SAO KHÔNG SỬA BẰNG CÁCH CẤP SỐ TẬP TRUNG: ba sổ ở gốc repo
 * cố ý MIỄN KHOÁ cho thao tác thêm dòng — không có miễn trừ đó thì không lane nào ghi được
 * Log. Miễn khoá nghĩa là nhiều lane cùng ghi hợp lệ, và cả hai cùng đọc thấy "số kế tiếp là
 * 08". Dựng một bộ cấp số tập trung là dựng một cái KHOÁ THỨ HAI cho đúng thứ vừa được miễn
 * khoá. Rẻ nhất: phát hiện trùng rồi báo đỏ, người sửa mất 30 giây.
 *
 * CỬA RA PHẢI RẺ NGANG CỬA VÀO — và đây là chỗ dễ làm sai nhất. Sổ này miễn khoá KHI CHỈ
 * THÊM DÒNG Ở CUỐI; sửa tiêu đề một khối cũ là viết lại chữ của lane khác VÀ đòi khoá
 * `_root`. Nếu lối gỡ trùng bắt phải sửa tiêu đề thì bộ kiểm này thành một cái chặn mà người
 * bị chặn KHÔNG CÓ QUYỀN gỡ. Nên lối gỡ cũng là MỘT DÒNG THÊM Ở CUỐI:
 *
 *   - **ĐỔI MÃ N-09 → N-19** · 2026-09-07 · lane `x` · vài chữ nhận ra khối · **đóng khi:** ...
 *
 * Chữ khối cũ giữ nguyên (luật mục 1 của sổ). Một dòng gỡ đúng MỘT lượt trùng, và nó mang
 * luôn `đóng khi:` cho mã mới — vì khối cũ thường chính là khối chưa khai trường đó, mà thêm
 * trường vào giữa khối là sửa chữ người khác, đúng thứ vừa cấm.
 *
 * AI ĐỔI SỐ: khối ĐẦU TIÊN giữ mã — nó có trước. Khối thứ hai, thứ ba… nhận mã mới theo đúng
 * thứ tự các dòng `ĐỔI MÃ` cùng mã cũ. Luật này phải CỐ ĐỊNH, không "đoán khối nào mới hơn":
 * một quy tắc gỡ mà đọc hai lần ra hai kết quả thì nó không gỡ được gì cả.
 *
 * Mã ĐÍCH cũng bị đếm như mọi mã khác, nên đổi sang một mã đang có người dùng vẫn ĐỎ — đó chỉ
 * là dời chỗ va chạm. */
export const DONG_DOI_MA = "- **ĐỔI MÃ";

export function doiMa(text) {
  const ra = [];
  for (const line of String(text ?? "").split(/\r?\n/)) {
    const m = /^-\s+\*\*ĐỔI\s+MÃ\s+(N-\d+)\s*(?:->|\u2192)\s*(N-\d+)\*\*(.*)$/.exec(line);
    if (!m) continue;
    const k = m[3].indexOf(TRUONG_DONG_KHI.replace(/^-\s*/, ""));
    ra.push({
      tu: m[1],
      sang: m[2],
      dongKhi: k === -1 ? "" : m[3].slice(k + TRUONG_DONG_KHI.replace(/^-\s*/, "").length).trim()
    });
  }
  return ra;
}

/* Mục sau khi áp các dòng đổi mã.
 *
 * ĐÁNH SỐ THEO MÃ ĐÃ GIẢI, KHÔNG THEO MÃ GỐC CỦA TIÊU ĐỀ. Bản đầu đánh số theo mã gốc, và
 * `claude-assistant` tìm ra lỗ ngay trong ngày: va chạm có thể nằm giữa ⑴ một khối đã được đổi
 * SANG `N-19` và ⑵ một tiêu đề vốn là `N-19`. Khối ⑵ là khối ĐẦU TIÊN mang mã đó trong tiêu đề
 * nên nó luôn ở lần gặp thứ nhất, và không dòng đổi mã nào chạm tới được — tức **mã ĐÍCH của
 * một lượt đổi có thể va chạm mà cửa append-only không gỡ nổi**, đúng thứ cơ chế này sinh ra
 * để tránh. Đánh số theo mã đã giải thì các lượt đổi NỐI ĐUÔI được: `N-09 → N-19`, rồi
 * `N-19 → N-20`, rồi `N-20 → N-26`. Mỗi dòng đổi dùng đúng một lần (`shift`), nên một dây đổi
 * vòng tròn cũng cạn hàng đợi rồi dừng; trần 32 vòng là dây bảo hiểm, không phải luật.
 *
 * Khối đầu tiên nhận một mã thì GIỮ mã đó — nó có trước. Khối đến sau mới phải đổi. */
export const TRAN_NOI_DUOI = 32;

export function docMucDaGo(text) {
  const hang = new Map();
  for (const d of doiMa(text)) {
    if (!hang.has(d.tu)) hang.set(d.tu, []);
    hang.get(d.tu).push(d);
  }
  const daGap = new Map();
  return docMuc(text).map((m) => {
    let ma = m.ma;
    let doiTu;
    let dongKhiNgoai;
    for (let i = 0; i < TRAN_NOI_DUOI; i += 1) {
      if ((daGap.get(ma) ?? 0) === 0) break;          // mã này chưa ai dùng — nhận
      const d = (hang.get(ma) || []).shift();
      if (!d) break;                                   // hết dòng đổi — để trùng, `trungMa` sẽ kêu
      doiTu = ma;
      ma = d.sang;
      dongKhiNgoai = d.dongKhi;
    }
    daGap.set(ma, (daGap.get(ma) ?? 0) + 1);
    return doiTu === undefined ? m : { ...m, ma, doiTu, dongKhiNgoai };
  });
}

/** Mã nào vẫn còn hai khối trở lên sau khi gỡ. */
export function trungMa(text) {
  const dem = new Map();
  for (const m of docMucDaGo(text)) dem.set(m.ma, (dem.get(m.ma) ?? 0) + 1);
  return [...dem.entries()].filter(([, lan]) => lan > 1)
    .map(([ma, lan]) => ({ ma, lan })).sort((a, b) => a.ma.localeCompare(b.ma));
}

/* Khai = có dòng `- **đóng khi:**` VÀ có chữ đứng sau nó. Một dòng để trống là chưa khai:
   trường rỗng trông như đã khai với máy đếm dòng, mà với mắt người thì không nói gì cả.
   Dòng `ĐỔI MÃ` mang `đóng khi:` cũng tính — cùng một cửa append-only, xem khối trên. */
export function thieuDongKhi(text) {
  return docMucDaGo(text)
    .filter((m) => {
      if (String(m.dongKhiNgoai ?? "").trim() !== "") return false;
      const dong = m.than.find((l) => l.trimStart().startsWith(TRUONG_DONG_KHI));
      return dong === undefined || dong.trimStart().slice(TRUONG_DONG_KHI.length).trim() === "";
    })
    .map((m) => m.ma);
}

/* MỤC NÀO CÒN MỞ — sổ này đóng mục bằng cách THÊM DÒNG Ở CUỐI, không gạch tiêu đề.
 *
 * Cửa ra phải rẻ ngang cửa vào (luật mục 1 của sổ), nên một mục đã đóng vẫn giữ nguyên tiêu đề
 * `## N-xx` của nó và chỉ có thêm một dòng `- **ĐÓNG N-xx** · …` ở cuối file. Hệ quả: **đếm
 * tiêu đề là đếm sai**, và tôi đã đếm sai đúng kiểu đó một lần (báo 14 mục mở trong khi thật
 * ra 12) vì tưởng mục đóng thì tiêu đề bị gạch như ở repo bộ khung.
 *
 * Chỉ dòng `- **ĐÓNG <mã>**` mới đóng. Một mục tự khai *"ĐÃ VÁ 06/09"* trong thân **không**
 * tính là đóng — cố ý: lời tự khai trong thân là chữ của người viết mục, còn dòng ở cuối là
 * một lượt ghi riêng có ngày, có lane, có bằng chứng. Sổ đã có sẵn một dòng
 * `- **LÀM RÕ DÒNG ĐÓNG N-30** …` không phải dòng đóng, nên phép so phải khớp ĐẦU dòng.
 *
 * Mã lấy SAU khi gỡ `ĐỔI MÃ` (`docMucDaGo`), vì dòng đóng viết theo mã cuối cùng. */
const RE_DONG = new RegExp("^-\\s+\\*\\*ĐÓNG\\s+([A-Za-z]+-\\d+)\\*\\*");

export function daDong(text) {
  const ra = new Set();
  for (const dong of String(text).split(/\r?\n/)) {
    const m = RE_DONG.exec(dong.trimStart());
    if (m) ra.add(m[1]);
  }
  return ra;
}

/** Mã của những mục CHƯA có dòng đóng. */
export function dangMo(text) {
  const xong = daDong(text);
  return docMucDaGo(text).filter((m) => !xong.has(m.ma)).map((m) => m.ma);
}

/* ---- MỤC VÔ HÌNH VỚI CÔNG CỤ — N-42 --------------------------------------
 *
 * Ca thật 07/09: lane `claude-scouter-s06` ghi hai mục dạng `- **A-01**` thay vì tiêu đề
 * `## N-<số>`. `docMuc` cắt sổ theo tiêu đề, nên hai mục đó **không được đếm, không bị kiểm
 * trường `đóng khi`, không báo gì cả** — số mục y nguyên sau khi thêm hai mục. Dựa trên con
 * số sai đó, lane này báo Đức sổ *"nay 11 mục, vượt trần 10"* và Đức nâng trần lên 15. Trần
 * nâng thì vô hại; **lý do đưa ra thì sai**. Một cuốn sổ im lặng nuốt mục mới làm mọi quyết
 * định dựa trên số mục của nó thành đáng ngờ.
 *
 * Ca thứ hai, tìm ra 08/09: `## MỞ · N-42 (…)` — hình dạng của sổ GÓI (`workers/*`), hợp lệ ở
 * đó nhưng vô hình ở đây. Cùng một bệnh, hình dạng khác.
 *
 * VÌ SAO BÁO ĐỎ CHỨ KHÔNG TỰ HIỂU CẢ HAI HÌNH DẠNG: hai quyển sổ có hai quy ước đóng mục khác
 * nhau (sổ này thêm dòng ở cuối, sổ gói viết `## ĐÓNG · X`). Nhận bừa hình dạng kia vào đây là
 * đếm một mục đã đóng thành mục mở. Rẻ hơn và thật hơn: nói thẳng "viết sai chỗ", 30 giây sửa.
 *
 * KHÔNG quét trong khối mã — luật của sổ có in bản mẫu, và bản mẫu không phải mục nợ. */
const RE_GACH_DAU_DONG = new RegExp("^-\\s+\\*\\*([A-Z]+-\\d+)\\*\\*");
const RE_HINH_DANG_SO_GOI = new RegExp("^##\\s+(?:MỞ|ĐÓNG)\\s*·\\s*([A-Z]+-\\d+)");
const RE_RAO_MA = /^\s*```/;

/** Dòng trông như một mục nợ nhưng công cụ KHÔNG thấy. Trả `{ dong, ma, hinhDang }`. */
export function mucVoHinh(text) {
  const ra = [];
  let trongRao = false;
  const dongs = String(text ?? "").split(/\r?\n/);
  for (let i = 0; i < dongs.length; i += 1) {
    const dong = dongs[i];
    if (RE_RAO_MA.test(dong)) { trongRao = !trongRao; continue; }
    if (trongRao) continue;
    const g = RE_GACH_DAU_DONG.exec(dong.trimStart());
    if (g) { ra.push({ dong: i + 1, ma: g[1], hinhDang: "gạch đầu dòng `- **" + g[1] + "**`" }); continue; }
    const h = RE_HINH_DANG_SO_GOI.exec(dong);
    if (h) ra.push({ dong: i + 1, ma: h[1], hinhDang: "hình dạng sổ GÓI `## MỞ · " + h[1] + "`" });
  }
  return ra;
}


/* ---- VIỆC CHỜ ĐỨC PHẢI CÓ DẤU — N-29 --------------------------------------
 *
 * Đức chốt 07/09: *"NEEDS ĐỨC: một SSOT duy nhất, dùng cơ chế `@Đức:bấm` / `@Đức:chốt`"*.
 * Đích đúng, nhưng cắt ngay hôm đó là MẤT DỮ LIỆU — đo được: 17 dấu trong ba sổ,
 * `human_action` khác rỗng ở 4 trong 5 gói, mà Scouter **không có một dấu nào trong cả gói**
 * trong khi `human_action` của nó là việc thật. Gộp ngay là việc đó biến mất khỏi bảng, im lặng.
 *
 * Nên thứ tự bắt buộc là ⑴ đặt dấu → ⑵ hai cơ chế đếm bằng nhau → ⑶ mới bỏ nguồn cũ. Hàm này
 * là phép đo của bước ⑵, và nó ở lại làm cái chuông cho bước ⑶: ai thêm một `human_action` mà
 * không đặt dấu thì nó kêu, thay vì việc đó lặng lẽ rơi khỏi bảng.
 *
 * MỘT NGUỒN DUY NHẤT NÓI THIẾU THÌ TỆ HƠN HAI NGUỒN NÓI LỆCH: hai nguồn lệch thì thấy được,
 * một nguồn thiếu thì không.
 *
 * Ba trạng thái của `human_action`, và gộp bất kỳ hai cái là bảng nói dối (build-overview.mjs
 * đã khai đúng thế): chuỗi thật = có việc · `"không"` = đã trả lời, không có gì · rỗng = CHƯA
 * AI TRẢ LỜI. Chỉ trạng thái thứ nhất mới đòi dấu. */
const RE_HUMAN = /^human_action:\s*"(.*)"\s*$/m;
const RE_DAU_DUC = new RegExp("@(?:Đức|Duc)\\s*:\\s*(?:chốt|chot|bấm|bam)", "iu");
const RE_LIFECYCLE = /^lifecycle:\s*"?([a-z-]+)"?/m;
const DA_NGHI = new Set(["superseded", "archived"]);

/** Việc chờ Đức khai trong `human_action` mà cả GÓI không có lấy một dấu `@Đức`.
    `docFile(rel)` đọc nội dung · `dsFile` là mọi đường dẫn đang theo dõi. */
export function viecDucKhongDau(dsFile, docFile) {
  const trongGoi = (rel) => {
    // Gói = thư mục chứa STATUS.md. Dấu đặt ở đâu trong gói cũng tính — sổ nợ riêng, IDEAS,
    // hay chính hồ sơ trạng thái. N-29 đo ở mức GÓI, không ở mức dòng.
    const goi = rel.slice(0, rel.lastIndexOf("/") + 1);
    return dsFile.filter((f) => f.startsWith(goi) && /\.md$/.test(f));
  };
  const ra = [];
  for (const rel of dsFile.filter((f) => f.endsWith("STATUS.md"))) {
    let text;
    try { text = docFile(rel); } catch { continue; }
    const doi = RE_LIFECYCLE.exec(text);
    if (doi && DA_NGHI.has(doi[1])) continue;          // đơn vị đã nghỉ thì không chờ ai nữa
    const m = RE_HUMAN.exec(text);
    const viec = m ? m[1].trim() : "";
    if (!viec || viec.toLowerCase() === "không" || viec.toLowerCase() === "khong") continue;
    const coDau = trongGoi(rel).some((f) => {
      try { return RE_DAU_DUC.test(docFile(f)); } catch { return false; }
    });
    if (!coDau) ra.push({ hoSo: rel, viec: viec.slice(0, 100) });
  }
  return ra;
}

export function kiemSo(text) {
  const tong = docMucDaGo(text).length;
  const thieu = thieuDongKhi(text);
  return { tong, mo: dangMo(text), thieu, trung: trungMa(text), voHinh: mucVoHinh(text) };
}

function main(argv) {
  /* `--can-duc` chi la MOT KHUNG NHIN, khong phai mot phep kiem rieng: lượt chạy mặc định đã
     đo và đã tính vào mã thoát. Có cờ này vì điều kiện đóng của N-29 gọi đúng tên nó, và một
     luật trỏ tới lệnh không chạy được thì nó là chữ, không phải luật. */
  const chiCanDuc = argv.includes("--can-duc");
  const duongDan = argv.filter((a) => !a.startsWith("--"))[0] ?? "BACKLOG.md";
  let text;
  try {
    text = fs.readFileSync(duongDan, "utf8");
  } catch {
    console.error(`KHONG_DOC_DUOC_SO: không mở được ${duongDan}. Sổ nợ hạ tầng phải nằm ở gốc repo.`);
    return 2;
  }
  const { tong, thieu, trung, voHinh } = kiemSo(text);
  /* Quét CẢ REPO, không chỉ quyển sổ ở gốc — vì câu hỏi "việc nào đang chờ Đức" trải khắp
     các gói. Git hỏng thì danh sách rỗng và phép này im, KHÔNG báo "sạch": không đo được mà
     nói sạch là cấp giấy chứng nhận cho một phép đo chưa chạy. */
  let khongDau = [];
  try {
    const ds = execFileSync("git", ["ls-files"], { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 26 })
      .split(String.fromCharCode(10)).map((d) => d.trim()).filter(Boolean);
    khongDau = viecDucKhongDau(ds, (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8"));
  } catch { khongDau = []; }
  if (!chiCanDuc) console.log(`BACKLOG: ${tong} muc, ${thieu.length} thieu truong dong-khi, ${trung.length} ma bi trung, ${voHinh.length} muc vo hinh`);
  console.log(`CAN DUC: ${khongDau.length} goi co human_action ma khong co dau @Duc nao`);
  if (chiCanDuc) {
    for (const k of khongDau) console.error(`  ${k.hoSo} — "${k.viec}"`);
    return khongDau.length ? 1 : 0;
  }
  for (const ma of thieu) {
    console.error(`  ${ma}: thiếu "${TRUONG_DONG_KHI} lệnh: <lệnh chạy được>" hoặc "${TRUONG_DONG_KHI} đức: <câu Đức phải chốt>"`);
  }
  if (thieu.length) console.error("Luật mục 2 của BACKLOG.md: không khai được điều kiện đóng thì mục đó chưa đủ chín để ghi vào sổ.");
  for (const t of trung) {
    console.error(`  ${t.ma}: ${t.lan} khối cùng mang mã này${t.daGo ? ` (đã gỡ ${t.daGo})` : ""} — hai lane đã chọn trùng số.`);
  }
  if (trung.length) {
    console.error(`Sổ này miễn khoá KHI CHỈ THÊM DÒNG Ở CUỐI, nên cửa ra cũng là một dòng thêm ở cuối — đừng sửa tiêu đề khối cũ:`);
    console.error(`  ${DONG_DOI_MA} <mã cũ> → <mã mới chưa ai dùng>** · <ngày> · lane \`<tên>\` · khối "<vài chữ đầu của tiêu đề>" đọc là <mã mới> từ nay`);
    console.error("Mỗi dòng gỡ đúng một lượt trùng. Chữ khối cũ giữ nguyên — luật mục 1 của sổ.");
  }
  for (const v of voHinh) {
    console.error(`  dòng ${v.dong}: mục viết theo ${v.hinhDang} — công cụ KHÔNG thấy nó.`);
  }
  if (voHinh.length) {
    console.error("Sổ này chỉ đếm mục viết `## N-<số> · <tiêu đề>`. Hình dạng khác thì không được đếm,");
    console.error("không bị kiểm trường `đóng khi`, và KHÔNG kêu — ngày 07/09 hai mục đã mất tích đúng thế,");
    console.error("rồi con số sai đó thành lý do xin Đức nâng trần. Sửa: đổi dòng đó thành tiêu đề `## N-<số>`.");
  }
  for (const k of khongDau) {
    console.error(`  ${k.hoSo}: human_action co viec that ma ca goi khong co dau @Đức nao — "${k.viec}"`);
  }
  if (khongDau.length) {
    console.error("Bang 'Đức cần làm' doc DAU, khong doc human_action (N-29). Khong dat dau thi viec do");
    console.error("roi khoi bang MOT CACH IM LANG. Sua: gan `@Đức:bấm` (hoac `@Đức:chốt`) vao chinh dong");
    console.error("`human_action:`, hoac vao dong muc tuong ung trong so no cua goi.");
    console.error("Khong con viec gi cho Đức? Thi khai `human_action: \"không\"` — do la gia tri luoc do danh cho");
    console.error("'da tra loi, khong co gi cho'. Mot CAU van xuoi noi dieu do thi may van doc thanh viec that.");
  }
  return thieu.length || trung.length || voHinh.length || khongDau.length ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === MODULE_FILE) process.exit(main(process.argv.slice(2)));
