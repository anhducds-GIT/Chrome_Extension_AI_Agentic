/* make-icons.mjs — sinh bộ icon của Udin Optic: chữ **U** trên nền vuông bo góc.
 *
 * Chép từ `duc-scouter/v0.1.0/scripts/make-icons.mjs` và đổi đúng phần VẼ CHỮ. Phần đóng gói
 * PNG, khử răng cưa, và nền bo góc giữ nguyên từng dòng.
 *
 * ─── VÌ SAO LÀ MỘT BỘ SINH, KHÔNG PHẢI BỐN FILE PNG DÁN VÀO ────────────────
 * PNG là nhị phân: `git diff` không đọc được, không ai sửa lại được, và ba tháng nữa không ai
 * biết nó vẽ bằng gì. Bộ sinh này không cần thư viện nào và chạy lại ra y hệt — nên icon là MÃ
 * NGUỒN chứ không phải một cục nhị phân mồ côi. Đổi màu hay đổi chữ thì sửa hằng số rồi chạy lại.
 *
 * ─── VÌ SAO PNG, KHÔNG PHẢI SVG ─────────────────────────────────────────────
 * Chrome KHÔNG nhận SVG làm icon extension. `manifest.json` chỉ ăn ảnh raster, nên đây không
 * phải lựa chọn — đừng "cải tiến" thành SVG rồi thấy icon biến mất.
 *
 * ─── CHỮ U VẼ BẰNG GÌ ───────────────────────────────────────────────────────
 * Hai cột dọc + một nửa vành khuyên dưới nối chúng lại — đúng cách chữ U được dựng. Không dùng
 * phông chữ: phông có ở máy này chưa chắc có ở máy khác, và một icon đổi hình theo máy là một
 * icon không kiểm được. Khử răng cưa bằng cách lấy mẫu 4×4 mỗi điểm ảnh.
 *
 * Chạy:  node workers/udin-optic/v0.1.0/scripts/make-icons.mjs            # ghi 4 file vào icons/
 *        node workers/udin-optic/v0.1.0/scripts/make-icons.mjs --preview  # in hình ra màn hình
 */

import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const THU_MUC_RA = join(HERE, "..", "icons");

/* ---- Hai thứ duy nhất đáng đổi ------------------------------------------ */
const NEN = [255, 193, 7, 255];        // NỀN vàng hổ phách #FFC107 — cùng tông với Scouter
const CHU = [26, 22, 4, 255];          // chữ U nâu gần đen, để nổi trên nền vàng
/* ------------------------------------------------------------------------- */

const CO = [16, 32, 48, 128];
const LAY_MAU = 4;                      // 4×4 mẫu mỗi điểm ảnh — đủ mượt ở 16px

/* Chữ U: hai cột dọc từ `TREN` xuống `TAM`, cộng nửa vành khuyên dưới tâm (0.5, TAM) bán kính
 * `W`. Toạ độ chuẩn hoá [0,1]², y hướng XUỐNG. */
const W = 0.20;                         // nửa bề ngang chữ = bán kính đường tim của vành
const TREN = 0.25;                      // đỉnh hai cột
const TAM = 0.58;                       // tâm vành dưới; đáy chữ = TAM + W

function trongCot(u, v, day) {
  if (v < TREN || v > TAM) return false;
  return Math.abs(Math.abs(u - 0.5) - W) <= day / 2;
}

/* Nửa vành DƯỚI: y hướng xuống nên "dưới" là góc trong [0°, 180°]. Lấy cả hai mép bằng `>= 0`
 * để hai đầu vành gặp đúng đáy hai cột — hở một ly ở chỗ nối thì ở 16px thành một vết đứt. */
function trongVanhDuoi(u, v, day) {
  const dx = u - 0.5, dy = v - TAM;
  if (Math.abs(Math.hypot(dx, dy) - W) > day / 2) return false;
  return dy >= 0;
}

/* Vuông bo góc, tính bằng khoảng cách tới hình chữ nhật đã co vào bán kính góc. */
function trongNen(u, v, le, banKinhGoc) {
  const nua = 0.5 - le;
  const dx = Math.abs(u - 0.5) - (nua - banKinhGoc);
  const dy = Math.abs(v - 0.5) - (nua - banKinhGoc);
  const ngoai = Math.hypot(Math.max(dx, 0), Math.max(dy, 0));
  return Math.min(Math.max(dx, dy), 0) + ngoai <= banKinhGoc;
}

/** Tỉ lệ che phủ của một điểm ảnh — đây là chỗ khử răng cưa. */
function chePhu(hinh, x, y, co) {
  let trung = 0;
  for (let sy = 0; sy < LAY_MAU; sy += 1) {
    for (let sx = 0; sx < LAY_MAU; sx += 1) {
      const u = (x + (sx + 0.5) / LAY_MAU) / co;
      const v = (y + (sy + 0.5) / LAY_MAU) / co;
      if (hinh(u, v)) trung += 1;
    }
  }
  return trung / (LAY_MAU * LAY_MAU);
}

/** Đặt màu `tren` lên `duoi` theo độ phủ `a`. */
function phu(duoi, tren, a) {
  const at = (tren[3] / 255) * a;
  const ad = duoi[3] / 255;
  const ra = at + ad * (1 - at);
  if (ra <= 0) return [0, 0, 0, 0];
  const kenh = (i) => Math.round((tren[i] * at + duoi[i] * ad * (1 - at)) / ra);
  return [kenh(0), kenh(1), kenh(2), Math.round(ra * 255)];
}

export function veIcon(co) {
  /* Nét dày lên ở cỡ nhỏ: 0.115 ở 128px cho ra chưa tới 2 điểm ảnh ở 16px, và một chữ U dày
   * 1 điểm ảnh thì ở thanh công cụ nhìn ra vệt bẩn chứ không ra chữ. */
  const day = Math.max(0.115, 2.4 / co);
  const diem = new Uint8Array(co * co * 4);
  for (let y = 0; y < co; y += 1) {
    for (let x = 0; x < co; x += 1) {
      let mau = [0, 0, 0, 0];
      if (NEN) mau = phu(mau, NEN, chePhu((u, v) => trongNen(u, v, 0.02, 0.22), x, y, co));
      const s = chePhu((u, v) => trongCot(u, v, day) || trongVanhDuoi(u, v, day), x, y, co);
      if (s > 0) mau = phu(mau, CHU, s);
      const i = (y * co + x) * 4;
      diem[i] = mau[0]; diem[i + 1] = mau[1]; diem[i + 2] = mau[2]; diem[i + 3] = mau[3];
    }
  }
  return diem;
}

/* ---- Đóng gói PNG -------------------------------------------------------
 * Không dùng thư viện: PNG RGBA không nén trước là bốn khối đơn giản, và thêm một phụ thuộc
 * cho 40 dòng là đổi một thứ đọc được lấy một thứ phải bảo trì. */
const BANG_CRC = (() => {
  const bang = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    bang[n] = c >>> 0;
  }
  return bang;
})();

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (const b of buf) c = BANG_CRC[(c ^ b) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function khoi(ten, du_lieu) {
  const dai = Buffer.alloc(4);
  dai.writeUInt32BE(du_lieu.length, 0);
  const than = Buffer.concat([Buffer.from(ten, "ascii"), du_lieu]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(than), 0);
  return Buffer.concat([dai, than, crc]);
}

export function dongGoiPng(diem, co) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(co, 0);
  ihdr.writeUInt32BE(co, 4);
  ihdr[8] = 8;    // 8 bit mỗi kênh
  ihdr[9] = 6;    // RGBA
  /* Mỗi dòng quét mang một byte bộ lọc ở đầu; 0 = không lọc. */
  const tho = Buffer.alloc(co * (co * 4 + 1));
  for (let y = 0; y < co; y += 1) {
    tho[y * (co * 4 + 1)] = 0;
    Buffer.from(diem.buffer, y * co * 4, co * 4).copy(tho, y * (co * 4 + 1) + 1);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    khoi("IHDR", ihdr),
    khoi("IDAT", deflateSync(tho, { level: 9 })),
    khoi("IEND", Buffer.alloc(0))
  ]);
}

function xemThu(co) {
  const diem = veIcon(co);
  const thang = " .:-=+*#%@";
  const dong = [];
  for (let y = 0; y < co; y += 1) {
    let s = "";
    for (let x = 0; x < co; x += 1) {
      const i = (y * co + x) * 4;
      /* Chấm điểm theo ĐỘ VÀNG, không theo độ mờ: nền tối cũng đục, nên chấm theo độ mờ thì cả
       * ô vuông đen kịt và ta không thấy chữ U đâu. */
      const vang = (diem[i] / 255) * (diem[i + 3] / 255);
      s += thang[Math.min(thang.length - 1, Math.round(vang * (thang.length - 1)))];
    }
    dong.push(s);
  }
  return dong.join("\n");
}

if (process.argv.includes("--preview")) {
  console.log(xemThu(48));
  console.log("");
  console.log(xemThu(16));
} else {
  mkdirSync(THU_MUC_RA, { recursive: true });
  for (const co of CO) {
    const duong = join(THU_MUC_RA, `icon-${co}.png`);
    writeFileSync(duong, dongGoiPng(veIcon(co), co));
    console.log(`icons/icon-${co}.png`);
  }
  console.log("Xong. Nạp lại extension trong Chrome mới thấy icon mới.");
}
