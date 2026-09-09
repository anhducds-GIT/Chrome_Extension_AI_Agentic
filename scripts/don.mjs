/* don.mjs — NHỊP DỌN: cất gọn phần cũ của những file CHỈ-THÊM, giữ nguyên từng chữ.
 *
 * VÌ SAO CÓ FILE NÀY. Đức chốt 2026-09-06: *"nội dung sẽ luôn bị phình sau 1 quá trình"*.
 * Dọn một lần bằng tay là dọn một lần; lượt sau lại phình. Ba file dưới đây **chỉ có một
 * chiều — tăng** vì luật cấm sửa/xoá dòng cũ, nên chúng cần một NHỊP chứ không phải một lượt.
 *
 * BA FILE, và vì sao đúng ba file này:
 *   · `HANDOFF.md`  — MỌI phiên AI phải nạp, ở MỌI repo. Phí nhân theo (số repo × số phiên).
 *   · `CHANGELOG.md`— sổ phát hành, chỉ-thêm, không bao giờ nhỏ lại.
 *   · `BACKLOG.md`  — mục đã đóng vẫn nằm đó; nửa sổ là việc đã xong thì bản đồ việc loãng.
 *
 * LUẬT TRUNG TÂM: **DỜI CHỖ, KHÔNG XOÁ.** Chữ đi nguyên vẹn sang `docs/archive/`, và lệnh này
 * TỰ ĐỐI CHIẾU trước khi ghi — phần cắt ra phải khớp BYTE với phần ghi vào, nếu không thì dừng
 * và không chạm file nào. Cổng đóng phiên kiểm lại điều đó một lần nữa một cách độc lập
 * (KHUNG-25): xoá dòng nào khỏi `HANDOFF.md` mà không có bản khớp byte trong kho lưu trữ thì
 * cổng vẫn ĐỎ. Hai lớp, cố ý — lệnh này có thể bị chạy sai, cổng thì không bỏ qua.
 *
 * MẶC ĐỊNH LÀ XEM TRƯỚC, không ghi gì. Muốn ghi thì `--apply`. Cùng thói quen với `upgrade.mjs`:
 * một lệnh dọn tự ghi ngay lần chạy đầu là một lệnh người ta sợ không dám chạy.
 *
 * CHẠY HAI LẦN PHẢI RA MỘT KẾT QUẢ. Lần hai không còn gì quá ngân sách thì nó nói "không có gì
 * phải dọn" và không tạo commit rỗng, không tạo file lưu trữ rỗng.
 *
 * CHỈ ĐỌC/GHI FILE. Không commit, không push, không đòi khoá nào — người chạy tự quyết.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { nganSachTu } from "./can-nang.mjs";
import { readStructureFromDisk } from "./repo-structure.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LUU_TRU = "docs/archive";

const doc = (rel) => {
  try { return fs.readFileSync(path.join(ROOT, rel), "utf8"); } catch { return null; }
};
// Tách theo `\n` sau khi chuẩn hoá `\r\n?`: repo có thể lẫn hai kiểu xuống dòng (đã đo thật:
// 75 file LF và 21 file CRLF trong cùng một cây làm việc), và một phép đếm dòng lệch vì CR
// là một phép đếm nói dối.
const dongCua = (text) => String(text).replace(/\r\n?/g, "\n").split("\n");

/* Cắt một file thành [đầu, ...các khối `## `]. Khối là đơn vị dời chỗ nhỏ nhất — dời NỬA khối
   thì phần còn lại mất đầu và không ai đọc được nó nữa. */
function tachKhoi(lines, tuDong = 0) {
  const dau = lines.slice(0, tuDong);
  const khoi = [];
  let hienTai = null;
  for (const d of lines.slice(tuDong)) {
    if (/^## /.test(d)) {
      if (hienTai) khoi.push(hienTai);
      hienTai = { tieuDe: d, dong: [d] };
      continue;
    }
    if (hienTai) hienTai.dong.push(d);
    else dau.push(d);
  }
  if (hienTai) khoi.push(hienTai);
  return { dau, khoi };
}

/* Giữ các khối MỚI NHẤT sao cho file còn lại ≤ ngân sách. Trả `{ giu, doi }`.
   LUÔN giữ ít nhất một khối: một nhật ký rỗng thì phiên sau mù hoàn toàn, tệ hơn nhật ký dài.

   `moiNhatOTren` KHÔNG được đoán, phải khai — và đây là một lỗi THẬT bắt được lúc chạy thử
   06/09. Hai file xếp ngược chiều nhau: `HANDOFF.md` thêm lượt mới ở CUỐI, `CHANGELOG.md`
   thêm bản mới ở ĐẦU. Bản đầu của hàm này chỉ có một chiều, nên nó định dời **bản 1.3.7 vừa
   phát** vào kho lưu trữ và giữ lại bản 1.3.0 — tức đúng ngược. Lệnh vẫn chạy, vẫn báo thành
   công, và không có gì đỏ. Một lệnh dọn sai chiều thì nó cất đi đúng thứ người ta cần đọc. */
/* DỌN TỚI 80% TRẦN, KHÔNG TỚI ĐÚNG TRẦN — đo 09/09, và nó làm chính nhịp này vô dụng.
 *
 * Bản trước dọn cho tới sát ngân sách: `HANDOFF.md` 1264 → **đúng 600/600**. Nhưng luật mục 7
 * bắt MỌI phiên ghi một dòng Log vào file đó, nên **ngay dòng Log kế tiếp** là 601/600 — đỏ lại.
 * Tức muốn giữ xanh thì phải chạy nhịp dọn ở MỖI phiên, và một "nhịp" phải chạy mỗi lượt thì nó
 * không còn là nhịp, nó là thuế.
 *
 * Chừa 20% là chừa chỗ cho khoảng chục lượt bàn giao nữa. Đây KHÔNG phải nới ngân sách: trần
 * không đổi, chỉ có lượt dọn dời đi nhiều hơn — tức SIẾT về phía an toàn. */
export const CHUA_CHO = 0.8;

function chonKhoiGiu(dau, khoi, nganSach, dongThem, moiNhatOTren) {
  const dich = Math.max(1, Math.floor(nganSach * CHUA_CHO));
  let tong = dau.length + dongThem;
  const giu = [];
  const thuTu = moiNhatOTren ? [...khoi.keys()] : [...khoi.keys()].reverse();
  const chon = new Set();
  for (const i of thuTu) {
    const n = khoi[i].dong.length;
    if (chon.size && tong + n > dich) break;
    chon.add(i);
    tong += n;
  }
  for (let i = 0; i < khoi.length; i += 1) if (chon.has(i)) giu.push(khoi[i]);
  return { giu, doi: khoi.filter((_, i) => !chon.has(i)) };
}

/* --- Một việc dọn: tính ra nên ghi gì, KHÔNG ghi --------------------------- */

/* DẤU CHÂN CỦA CHÍNH LỆNH NÀY. Mỗi lượt dọn để lại một dòng trỏ sang kho lưu trữ. Lượt sau
   phải NHẬN RA và GỠ nó ra trước khi tính, nếu không nó bị coi là nội dung thật: bị cuốn vào
   kho, rồi lượt sau nữa lại thêm một dòng nữa. Đo thật 06/09: chạy hai lượt liên tiếp thì
   con trỏ của lượt một nằm trong file lưu trữ của lượt hai, và người đọc phải lần theo chuỗi.
   Đây chính là lý do dòng trỏ nay trỏ vào THƯ MỤC, không trỏ vào một file cụ thể — thư mục
   không đổi tên theo từng lượt, nên dòng này ổn định và lượt sau nhận ra được nó. */
const DAU_CHAN = "Phần CŨ hơn đã dời sang kho lưu trữ";
const TRO = `**${DAU_CHAN}** — [\`${LUU_TRU}/\`](${LUU_TRU}/) · chữ giữ nguyên từng dòng, cắt bằng \`npm run don\`.`;

/* MỐC THÁNG LÀ SIÊU DỮ LIỆU CỦA FILE SỐNG, KHÔNG PHẢI NỘI DUNG — vá 09/09, một lỗi THẬT.
 *
 * `handoff.mjs` ghi `<!-- HANDOFF-THANG: YYYY-MM -->` ở CUỐI `HANDOFF.md`; lệnh này dời các khối
 * cuối đi, nên nó **cuốn luôn mốc tháng vào kho lưu trữ**. Kết quả: file sống mất mốc, và phép
 * ghim `handoff-smoke` đỏ với *"HANDOFF.md gốc đã có mục thì PHẢI khai tháng"*.
 *
 * Đây là hình dạng "hai cơ chế cùng sửa một file mà không biết nhau" — cùng họ với chuyện thẻ
 * *Đã xong* của bảng đọc thẳng sổ nợ, bắt được cùng ngày. Nên xử cùng cách: gỡ mốc ra trước khi
 * tính, gắn lại vào file sống sau khi ghép — y như cách `DAU_CHAN` đã làm với dấu chân của chính
 * lệnh này. Kho lưu trữ KHÔNG cần mốc: nó không xoay nữa. */
const NHAN_THANG = "<!-- HANDOFF-THANG:";
const layMocThang = (lines) => lines.find((d) => d.includes(NHAN_THANG)) ?? null;

const goDauChan = (lines) => {
  const ra = lines.filter((d) => !d.includes(DAU_CHAN) && !d.includes(NHAN_THANG));
  // Bỏ luôn dải `---` + dòng trống thừa ở đuôi mà dấu chân để lại.
  while (ra.length && (ra[ra.length - 1].trim() === "" || ra[ra.length - 1].trim() === "---")) ra.pop();
  return ra;
};

const DAU_LUU_TRU_CHO = (tieuDe, nguon, viSao) => [
  `# ${tieuDe}`,
  "",
  `> **CHỮ GIỮ NGUYÊN, chỉ ĐỔI CHỖ.** Cắt từ \`${nguon}\` bằng \`npm run don\`.`,
  `> ${viSao}`,
  `> Không dòng nào bị sửa, không dòng nào bị bỏ. Bản mới nhất vẫn ở [${nguon}](../../${nguon}).`,
  ""
];

/* Một việc dọn, dùng chung cho mọi file chỉ-thêm.
   `moiNhatOTren`: `CHANGELOG.md` thêm bản mới ở ĐẦU, `HANDOFF.md` thêm lượt mới ở CUỐI.
   `mocDau`: regex của dòng mở đầu phần "được phép dời"; phần trước nó luôn giữ lại. */
function donMotFile({ ten, nganSach, moiNhatOTren, mocDau, tieuDeLuu, viSao, tenFile }) {
  const text = doc(ten);
  if (text === null) return null;
  const goc = dongCua(text);
  const lines = goDauChan(goc);
  const chua = { ten, trong: goc.length, nganSach, doi: [] };
  if (goc.length <= nganSach) return chua;

  const iMoc = mocDau ? lines.findIndex((d) => mocDau.test(d)) : -1;
  const tuDong = iMoc >= 0 ? iMoc + 1 : 0;
  const { dau, khoi } = tachKhoi(lines, tuDong);

  /* PHẦN ĐUÔI DO CHÍNH LỆNH THÊM VÀO ĐƯỢC ĐẾM CHÍNH XÁC, không ước lượng.
     Bản đầu đoán con số này rồi bỏ một vòng lặp đằng sau để hứng phần đoán sai — và đột biến
     kiểm 06/09 cho thấy vòng lặp đó **không bao giờ chạy tới**: phá nó đi mà không phép kiểm nào đỏ.
     Một nhánh không thể chạy tới và một nhánh đúng trông giống hệt nhau trên bảng. Nên bỏ vòng
     lặp, và lấy đúng độ dài thật của phần đuôi — sai số bằng không theo cấu trúc, chứ không
     bằng một lớp hứng đặt thêm. */
  const { giu, doi } = chonKhoiGiu(dau, khoi, nganSach, soDongDuoi(moiNhatOTren), moiNhatOTren);
  if (!doi.length) return chua;
  const ra = ghepLai({ dau, giu, tuDong, moiNhatOTren });
  // Gắn lại mốc tháng vào FILE SỐNG (xem ghi chú ở `goDauChan`). Không có mốc thì gắn gì cả.
  const mocThang = layMocThang(goc);
  if (mocThang) ra.push(mocThang);

  return {
    ...chua, doi,
    fileLuu: tenChuaDung(`${LUU_TRU}/${tenFile(doi)}`),
    noiDungLuu: [...DAU_LUU_TRU_CHO(tieuDeLuu(doi), ten, viSao(goc.length)), ...doi.flatMap((k) => k.dong)],
    noiDungMoi: ra
  };
}

/* Phần đuôi của một lượt dọn — MỘT nguồn duy nhất, để phép đếm và phép ghi không thể lệch nhau.
   File xếp mới-nhất-ở-trên thì dấu chân xuống đuôi; file xếp ngược thì nó lên đầu, ngay sau
   phần đầu — người đọc gặp nó trước khi lội xuống, chứ không phải sau khi đã lội hết. */
const DUOI = (moiNhatOTren) => (moiNhatOTren ? ["", "---", "", TRO] : [TRO, ""]);
const soDongDuoi = (moiNhatOTren) => DUOI(moiNhatOTren).length;

function ghepLai({ dau, giu, tuDong, moiNhatOTren }) {
  const than = giu.flatMap((k) => k.dong);
  if (moiNhatOTren) return [...dau, ...than, ...DUOI(true)];
  return [...dau.slice(0, tuDong), ...DUOI(false), ...dau.slice(tuDong), ...than];
}

/* NHÃN NGÀY cho file lưu trữ. Quét MỌI khối bị dời, lấy `YYYY-MM` đầu tiên tìm được.
   Bản đầu lọc mọi ký tự không phải số rồi cắt 6 chữ số đầu — nghe thì hợp lý, nhưng chạy thật
   06/09 trên tiêu đề `## Lượt · Đẩy hộ 12 commit của bốn lane` thì nó ra `HANDOFF-12.md`.
   Bản thứ hai chỉ xem tiêu đề khối CŨ NHẤT — và đúng khối đó không có ngày, ra `HANDOFF-cu.md`.
   Nên quét cả danh sách: chỉ cần MỘT khối có ngày là đủ đặt tên.
   Một file lưu trữ tên vô nghĩa là một file không ai mở — chữ vẫn còn mà coi như đã mất.
   Luật vàng số 5: tên file cũng là chữ người đọc nhìn thấy. */
const nhanNgay = (doi) => {
  for (const k of doi) {
    const m = String(k.tieuDe).match(/(\d{4})-(\d{2})/);
    if (m) return `${m[1]}-${m[2]}`;
  }
  /* KHÔNG khối nào có ngày — xảy ra thật: một lượt bàn giao đặt tiêu đề `## Lượt · Đẩy hộ…`.
     Lúc đó lấy tháng CẤT, vì câu hỏi người đọc đặt ra khi nhìn kho lưu trữ là *"cái này cất hồi nào"*.
     Đây KHÔNG phải cái bẫy "bộ sinh nhìn đồng hồ": đồng hồ chỉ quyết định MỘT CÁI TÊN lúc ghi, không
     đi vào bất kỳ phép so nào — nên sang ngày mới không phiên nào bị chặn. Và `tenChuaDung`
     bên dưới đảm bảo hai lượt cùng tháng không đè nhau. */
  return new Date().toISOString().slice(0, 7);
};

/* KHÔNG ĐƯỢC GHI ĐÈ MỘT FILE LƯU TRỮ ĐÃ CÓ. Hai lượt dọn trong cùng một tháng cho ra cùng một
   nhãn, nên bản đầu sẽ **ghi đè lượt trước** — tức chính lệnh dọn làm mất đúng thứ nó sinh ra để
   giữ. Đây là lỗ nguy hiểm nhất của cả lệnh này, và nó IM LẶNG: file cũ biến mất, không báo gì.
   Thấy trùng thì thêm hậu tố `-2`, `-3`… chứ tuyệt đối không đè. */
const tenChuaDung = (rel) => {
  if (!fs.existsSync(path.join(ROOT, rel))) return rel;
  for (let i = 2; i < 100; i += 1) {
    const thu = rel.replace(/\.md$/, `-${i}.md`);
    if (!fs.existsSync(path.join(ROOT, thu))) return thu;
  }
  throw new Error(`DON_SAI: quá nhiều file lưu trữ trùng tên quanh ${rel}`);
};

const tinhNhatKy = (NS) => donMotFile({
  ten: "HANDOFF.md",
  nganSach: NS.soNhatKy,
  moiNhatOTren: false,
  // Hai mục `## Trạng thái hiện tại` và `## Log` là đầu file — dời chúng đi thì file mất
  // phần nói "đang ở đâu", tức đúng thứ phiên sau mở ra để đọc đầu tiên.
  mocDau: /^## Log\b/,
  tieuDeLuu: () => "Nhật ký bàn giao — LƯU TRỮ",
  viSao: (n) => `Nhật ký gốc đã ${n} dòng / ngân sách ${NS.soNhatKy} — mà nhật ký là thứ MỌI phiên AI phải nạp mỗi lần mở.`,
  tenFile: (doi) => `HANDOFF-${nhanNgay(doi)}.md`
});

const banSo = (k) => (k.tieuDe.match(/^##\s+([0-9][0-9.]*)/) || [])[1] || "cu";
const nhanBan = (doi) => (doi.length === 1 ? banSo(doi[0]) : `${banSo(doi[doi.length - 1])}-den-${banSo(doi[0])}`);

const tinhPhatHanh = (NS) => donMotFile({
  ten: "CHANGELOG.md",
  nganSach: NS.soPhatHanh,
  moiNhatOTren: true,
  mocDau: null,
  tieuDeLuu: (doi) => `CHANGELOG — LƯU TRỮ, bản ${nhanBan(doi)}`,
  viSao: (n) => `Sổ phát hành là file CHỈ-THÊM nên phình vô hạn — ${n} dòng / ngân sách ${NS.soPhatHanh}.`,
  tenFile: (doi) => `CHANGELOG-${nhanBan(doi)}.md`
});

/* --- Kiểm chứng: phần cắt ra phải khớp BYTE phần ghi vào ------------------- */

/* KHÔNG tin phép tính của chính mình. Một lệnh dọn tính sai thì nó XOÁ MẤT LỊCH SỬ, và không
   ai biết cho tới lúc cần tra. Nên trước khi ghi, dựng lại nguyên bản từ hai mảnh và so với
   bản gốc — lệch một byte là dừng, không chạm file nào. */
function kiemChung(viec, goc) {
  const dongLuu = viec.noiDungLuu.slice(6);          // bỏ 6 dòng đầu do lệnh tự thêm (DAU_LUU_TRU_CHO)
  const dongDoi = viec.doi.flatMap((k) => k.dong);
  if (dongLuu.length !== dongDoi.length) return `số dòng lưu trữ (${dongLuu.length}) khác số dòng cắt ra (${dongDoi.length})`;
  for (let i = 0; i < dongDoi.length; i += 1) {
    if (dongLuu[i] !== dongDoi[i]) return `dòng ${i + 1} của phần dời KHÔNG khớp byte`;
  }
  const gocSet = new Set(dongCua(goc));
  const mat = dongDoi.filter((d) => !gocSet.has(d));
  if (mat.length) return `${mat.length} dòng trong phần dời không có trong bản gốc — phép tính sai`;
  return null;
}

/* --- Chạy ----------------------------------------------------------------- */

const apply = process.argv.includes("--apply");

let NS;
try { NS = nganSachTu(readStructureFromDisk(ROOT)); }
catch (e) { console.error("NGAN_SACH_HONG: " + (e.message || e)); process.exit(2); }

const viecs = [tinhNhatKy(NS), tinhPhatHanh(NS)].filter(Boolean);
const phaiDon = viecs.filter((v) => v.doi.length);

console.log("NHỊP DỌN — dời phần cũ sang kho lưu trữ, giữ nguyên từng chữ");
console.log("".padEnd(70, "─"));
for (const v of viecs) {
  const dau = v.doi.length ? "▸" : "✓";
  console.log(`  ${dau} ${v.ten.padEnd(16)} ${String(v.trong).padStart(5)} / ${v.nganSach} dòng`);
  if (v.doi.length) {
    console.log(`      dời ${v.doi.length} khối (${v.doi.reduce((a, k) => a + k.dong.length, 0)} dòng) → ${v.fileLuu}`);
    console.log(`      còn lại ${v.noiDungMoi.length} dòng`);
  }
}

if (!phaiDon.length) {
  console.log("");
  console.log("Không có gì phải dọn — mọi file chỉ-thêm đều trong ngân sách.");
  process.exit(0);
}

for (const v of phaiDon) {
  const loi = kiemChung(v, doc(v.ten));
  if (loi) {
    console.error("");
    console.error(`DON_SAI: ${v.ten} — ${loi}.`);
    console.error("KHÔNG ghi file nào. Đây là lớp tự kiểm: thà không dọn còn hơn dọn mất chữ.");
    process.exit(2);
  }
}

if (!apply) {
  console.log("");
  console.log("Đây là XEM TRƯỚC — chưa ghi file nào. Ghi thật: npm run don -- --apply");
  console.log("Sau khi ghi: commit phần dọn và phần ghi Log bằng HAI commit riêng — cổng đóng");
  console.log("phiên đọc cả dải chưa đẩy, nên gộp một commit thì nó không phân biệt được.");
  process.exit(0);
}

fs.mkdirSync(path.join(ROOT, LUU_TRU), { recursive: true });
for (const v of phaiDon) {
  fs.writeFileSync(path.join(ROOT, v.fileLuu), v.noiDungLuu.join("\n").replace(/\n*$/, "\n"), "utf8");
  fs.writeFileSync(path.join(ROOT, v.ten), v.noiDungMoi.join("\n").replace(/\n*$/, "\n"), "utf8");
  console.log(`  đã ghi: ${v.fileLuu} · ${v.ten}`);
}
console.log("");
console.log("XONG. Kiểm lại bằng: npm run can-nang");
console.log("Nhớ khai file lưu trữ mới vào Bản đồ file — cổng đóng phiên bắt.");
