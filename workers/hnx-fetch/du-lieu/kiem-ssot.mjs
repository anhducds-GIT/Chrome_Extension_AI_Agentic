/* kiem-ssot.mjs — soi tệp SSOT: ngày cuối · ngày thiếu · hàng lệch · khoá trùng.
 * Dùng: node kiem-ssot.mjs "<đường dẫn SSOT>" [YYYY-MM-DD tính lùi từ ngày này, mặc định hôm nay]
 * KHÔNG ghi gì. Chỉ đọc và in. */
import fs from "node:fs";
const LF = String.fromCharCode(10), CR = String.fromCharCode(13);
const duong = process.argv[2];
const den = process.argv[3] || new Date().toISOString().slice(0, 10);
if (!duong) { console.error("Thiếu đường dẫn SSOT."); process.exit(2); }

const tho = fs.readFileSync(duong, "utf8").replace(/^\uFEFF/, "");
const dong = tho.split(CR + LF).filter((d) => d.trim() !== "");
const tieuDe = dong[0].split(",").map((o) => o.replace(/^"|"$/g, ""));
const than = dong.slice(1).map((d) => d.split(",").map((o) => o.replace(/^"|"$/g, "")));

/* Ngày nghỉ được ghi bởi `tai-ket-qua.mjs` vào tệp sidecar nằm cạnh SSOT. Bộ soi phải đọc
 * CÙNG dấu đó; nếu fetcher bỏ qua mà bộ soi vẫn báo "thiếu" thì người vận hành sẽ bị kéo về
 * đúng những ngày đã xác nhận là không có phiên. Tệp sidecar hỏng phải ĐỎ, không coi như rỗng. */
function duongNgayNghi(duongMaster) {
  return String(duongMaster).replace(/\.csv$/i, "") + ".ngay-nghi.csv";
}
function docNgayNghi(duongMaster) {
  const tep = duongNgayNghi(duongMaster);
  if (!fs.existsSync(tep)) return new Set();
  const raw = fs.readFileSync(tep, "utf8").replace(/^\uFEFF/, "");
  const lines = raw.split(/\r?\n/).filter((d) => d.trim() !== "");
  if (lines.length === 0) return new Set();
  const dau = lines[0].split(",")[0].replace(/^"|"$/g, "");
  if (dau !== "trade_date") {
    throw new Error(`Tệp ngày nghỉ ${tep} không có cột 'trade_date' ở đầu. Không đoán, không bỏ qua.`);
  }
  const ngay = new Set();
  for (const line of lines.slice(1)) {
    const n = line.split(",")[0].replace(/^"|"$/g, "");
    if (/^\d{4}-\d{2}-\d{2}$/.test(n)) ngay.add(n);
  }
  return ngay;
}
const ngayNghi = docNgayNghi(duong);

/* Khoá duy nhất là (ngày, ISIN) — KHÔNG phải chỉ ngày. Một ngày có nhiều hợp đồng, nên đếm
 * theo ngày không phát hiện được hai bản ghi của cùng một hợp đồng. */
const iNgay = tieuDe.indexOf("trade_date");
const iIsin = tieuDe.indexOf("isin");
if (iNgay < 0 || iIsin < 0) { console.error("Tiêu đề thiếu trade_date hoặc isin — không phải tệp SSOT."); process.exit(2); }

const theoNgay = new Map();
const khoa = new Map();
const lechCot = [];
for (const [i, o] of than.entries()) {
  if (o.length !== tieuDe.length) lechCot.push(i + 2);
  const n = o[iNgay];
  theoNgay.set(n, (theoNgay.get(n) || 0) + 1);
  const k = n + "|" + o[iIsin];
  khoa.set(k, (khoa.get(k) || 0) + 1);
}
const ngay = [...theoNgay.keys()].sort();
const trung = [...khoa.entries()].filter(([, c]) => c > 1).map(([k]) => k);
const khac8 = [...theoNgay.entries()].filter(([, c]) => c !== 8);

/* Ngày THIẾU HẲN không bao giờ hiện ra trong phép đếm ở trên — phải dò bằng lịch. Ngày nghỉ
 * đã được ghi nhận trong sidecar không phải là dữ liệu thiếu và phải bị loại ở chính đây. */
const thieu = [];
if (ngay.length) {
  for (let d = new Date(ngay[0] + "T00:00:00Z"); d <= new Date(den + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + 1)) {
    const thu = d.getUTCDay();
    if (thu === 0 || thu === 6) continue;
    const s = d.toISOString().slice(0, 10);
    if (!theoNgay.has(s) && !ngayNghi.has(s)) thieu.push(s);
  }
}

console.log("hàng          : " + than.length);
console.log("ngày          : " + ngay.length + (ngay.length ? "  (" + ngay[0] + " → " + ngay[ngay.length - 1] + ")" : ""));
console.log("ngày CUỐI     : " + (ngay[ngay.length - 1] || "—") + "   ← lượt lấy tiếp theo bắt đầu từ ngày SAU ngày này");
console.log("dòng lệch cột : " + (lechCot.length ? lechCot.join(" ") : "không"));
console.log("khoá trùng    : " + (trung.length ? trung.join(" ") : "không") + "   (khoá = ngày + ISIN)");
console.log("ngày KHÁC 8 hàng: " + (khac8.length ? JSON.stringify(khac8) : "không"));
console.log("ngày nghỉ đã ghi : " + ngayNghi.size + (ngayNghi.size ? "  (không tính là thiếu)" : ""));
console.log("ngày trong tuần THIẾU HẲN (tính tới " + den + "): " + (thieu.length ? thieu.join(" ") : "không"));
console.log("");
console.log(lechCot.length || trung.length ? "ĐỎ — dừng lại, báo Đức." : "Không thấy lỗi cấu trúc. Ngày nghỉ đã ghi được loại khỏi danh sách thiếu; ngày khác 8 hàng vẫn cần đối chiếu.");