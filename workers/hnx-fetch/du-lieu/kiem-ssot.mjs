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

/* Ngày THIẾU HẲN không bao giờ hiện ra trong phép đếm ở trên — phải dò bằng lịch. */
const thieu = [];
if (ngay.length) {
  for (let d = new Date(ngay[0] + "T00:00:00Z"); d <= new Date(den + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + 1)) {
    const thu = d.getUTCDay();
    if (thu === 0 || thu === 6) continue;
    const s = d.toISOString().slice(0, 10);
    if (!theoNgay.has(s)) thieu.push(s);
  }
}

console.log("hàng          : " + than.length);
console.log("ngày          : " + ngay.length + (ngay.length ? "  (" + ngay[0] + " → " + ngay[ngay.length - 1] + ")" : ""));
console.log("ngày CUỐI     : " + (ngay[ngay.length - 1] || "—") + "   ← lượt lấy tiếp theo bắt đầu từ ngày SAU ngày này");
console.log("dòng lệch cột : " + (lechCot.length ? lechCot.join(" ") : "không"));
console.log("khoá trùng    : " + (trung.length ? trung.join(" ") : "không") + "   (khoá = ngày + ISIN)");
console.log("ngày KHÁC 8 hàng: " + (khac8.length ? JSON.stringify(khac8) : "không"));
console.log("ngày trong tuần THIẾU HẲN (tính tới " + den + "): " + (thieu.length ? thieu.join(" ") : "không"));
console.log("");
console.log(lechCot.length || trung.length ? "ĐỎ — dừng lại, báo Đức." : "Không thấy lỗi cấu trúc. Ngày thiếu và ngày khác 8 hàng có thể là ngày nghỉ — đối chiếu với bên PDF trước khi kết luận.");
