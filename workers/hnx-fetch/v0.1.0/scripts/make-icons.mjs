/* make-icons.mjs — sinh bộ icon của HNX Fetch: chữ **HNX trắng trên nền xanh đậm**.
 *
 * ─── VÌ SAO LÀ MỘT BỘ SINH, KHÔNG PHẢI BỐN FILE PNG DÁN VÀO ────────────────
 * PNG là nhị phân: `git diff` không đọc được, không ai sửa lại được, và ba tháng nữa không ai
 * biết nó vẽ bằng gì. Bộ sinh này không cần thư viện nào và chạy lại ra y hệt — nên icon là
 * MÃ NGUỒN chứ không phải một cục nhị phân mồ côi. Đổi màu thì sửa hai hằng số ở dưới.
 *
 * ─── VÌ SAO PNG, KHÔNG PHẢI SVG ─────────────────────────────────────────────
 * Chrome KHÔNG nhận SVG làm icon extension. Đừng "cải tiến" thành SVG rồi thấy icon biến mất.
 *
 * ─── VÌ SAO XANH ĐẬM, CHỮ TRẮNG — VÀ VÌ SAO ĐÓ LÀ CẢ MỤC ĐÍCH ──────────────
 * Đức chốt 08/09: *"đổi icon thành HNX, không nhầm với extension scout. Màu text khác &
 * background khác."* Scouter là **chữ nâu tối trên nền vàng hổ phách**. Nên ở đây phải đổi
 * **cả hai** lớp, không chỉ một:
 *
 *   Scouter    nền #FFC107 (vàng)      chữ #1A1604 (nâu gần đen)
 *   HNX Fetch  nền #0F4C81 (xanh đậm)  chữ #FFFFFF (trắng)
 *
 * Xanh và vàng nằm gần hai đầu đối nhau trên vòng màu, nên hai ô icon phân biệt được ở 16px
 * **kể cả khi mắt chưa đọc ra chữ** — mà 16px thì đó mới là thứ thật sự làm việc. Chỉ đổi chữ
 * mà giữ nền thì hai icon vẫn là hai ô vàng cạnh nhau trên thanh công cụ.
 *
 * ─── CHỮ VẼ BẰNG GÌ ─────────────────────────────────────────────────────────
 * Ba chữ H · N · X đều là chữ **toàn nét thẳng**, nên vẽ bằng đoạn thẳng có bề dày — không cần
 * phông. Phông có ở máy này chưa chắc có ở máy khác, và một icon đổi hình theo máy là một icon
 * không kiểm được. Khử răng cưa bằng cách lấy mẫu 4×4 mỗi điểm ảnh.
 *
 * ─── 16px CHỈ VẼ "H", KHÔNG VẼ "HNX" ────────────────────────────────────────
 * Ở 16px, ba chữ chia nhau chưa tới 4 điểm ảnh mỗi chữ — nét dọc và khe hở đều rơi xuống dưới
 * một điểm ảnh, và cái ra được là một vệt bẩn chứ không phải chữ. Nên cỡ nhỏ vẽ **một chữ H
 * đậm**; cỡ lớn vẽ đủ **HNX**. Đây là cách mọi bộ icon tử tế vẫn làm, và nó KHÔNG phải lỗi:
 * ở 16px thứ làm việc là màu và hình khối, không phải chữ.
 *
 * Chạy:  node scripts/make-icons.mjs            # ghi 4 file vào icons/
 *        node scripts/make-icons.mjs --preview  # in hình ra màn hình, không ghi file
 */

import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const THU_MUC_RA = join(HERE, "..", "icons");

/* ---- Hai thứ duy nhất đáng đổi ------------------------------------------ */
const NEN = [15, 76, 129, 255];        // NỀN xanh đậm #0F4C81 — `null` để bỏ nền
const CHU = [255, 255, 255, 255];      // chữ TRẮNG, để nổi trên nền xanh
/* ------------------------------------------------------------------------- */

const CO = [16, 32, 48, 128];
const LAY_MAU = 4;                      // 4×4 mẫu mỗi điểm ảnh
const NGUONG_BA_CHU = 32;               // dưới cỡ này thì chỉ vẽ "H" — xem khối đầu file

/* ---- Chữ dựng từ ĐOẠN THẲNG, toạ độ chuẩn hoá [0,1]², y hướng XUỐNG -------
 * Mỗi chữ trả về danh sách đoạn `[x1, y1, x2, y2]` trong ô vuông riêng của nó; hàm gọi sẽ co
 * và dời chúng vào đúng chỗ. Tách ra thế này để thêm một chữ mới không phải đụng bộ vẽ. */
const NET = {
  H: [[0, 0, 0, 1], [1, 0, 1, 1], [0, 0.5, 1, 0.5]],
  N: [[0, 1, 0, 0], [0, 0, 1, 1], [1, 1, 1, 0]],
  X: [[0, 0, 1, 1], [1, 0, 0, 1]]
};

/* Khoảng cách từ điểm tới một đoạn thẳng. Dùng khoảng cách chứ không dùng phương trình đường:
 * đoạn có HAI đầu mút, và một công thức đường thẳng sẽ kéo nét dài ra vô tận ở hai đầu. */
function cachDoan(px, py, [x1, y1, x2, y2]) {
  const dx = x2 - x1, dy = y2 - y1;
  const dai2 = dx * dx + dy * dy;
  let t = dai2 === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / dai2;
  t = Math.max(0, Math.min(1, t));
  const qx = x1 + t * dx, qy = y1 + t * dy;
  return Math.hypot(px - qx, py - qy);
}

/* Bố cục chữ trong ô icon. Trả về danh sách đoạn ĐÃ dời/co về toạ độ của cả ô. */
function bocucChu(co) {
  const chuoi = co >= NGUONG_BA_CHU ? ["H", "N", "X"] : ["H"];
  /* Ô chữ phải KHÔNG QUÁ CAO so với bề rộng. Bản đầu để 0.24–0.76 nên mỗi ô chữ cao gấp gần
   * ba lần bề rộng — và ở tỉ lệ đó, đường chéo của chữ N chạy sát hai nét dọc rồi dính liền
   * thành một cục đặc. Hạ chiều cao xuống cho ô chữ gần vuông hơn thì đường chéo mới tách ra. */
  const LE = 0.10;                       // lề trái/phải
  const TREN = 0.30, DUOI = 0.70;        // mép trên/dưới của chữ
  const rong = (1 - 2 * LE) / chuoi.length;
  const KHE = chuoi.length > 1 ? rong * 0.26 : 0;   // khe giữa hai chữ
  const rongChu = rong - KHE;
  const cao = DUOI - TREN;

  const ra = [];
  chuoi.forEach((ten, i) => {
    const x0 = LE + i * rong + KHE / 2;
    for (const [ax, ay, bx, by] of NET[ten]) {
      ra.push([x0 + ax * rongChu, TREN + ay * cao, x0 + bx * rongChu, TREN + by * cao]);
    }
  });
  return ra;
}

/* Nền vuông bo góc — cùng hình dạng với Scouter, cố ý: hai icon phải phân biệt bằng MÀU và
 * CHỮ, không bằng hình dạng ô. Đổi cả hình dạng thì mắt phải học hai thứ thay vì một. */
function trongNen(u, v, le, r) {
  const x = Math.min(Math.max(u, le), 1 - le);
  const y = Math.min(Math.max(v, le), 1 - le);
  const cx = Math.min(Math.max(x, le + r), 1 - le - r);
  const cy = Math.min(Math.max(y, le + r), 1 - le - r);
  if (u < le || u > 1 - le || v < le || v > 1 - le) return false;
  return Math.hypot(u - cx, v - cy) <= r + 1e-9;
}

/* Lấy mẫu 4×4 mỗi điểm ảnh rồi lấy trung bình — khử răng cưa rẻ tiền mà đủ mượt ở 16px. */
function chePhu(trong, x, y, co) {
  let dat = 0;
  for (let sy = 0; sy < LAY_MAU; sy += 1) {
    for (let sx = 0; sx < LAY_MAU; sx += 1) {
      const u = (x + (sx + 0.5) / LAY_MAU) / co;
      const v = (y + (sy + 0.5) / LAY_MAU) / co;
      if (trong(u, v)) dat += 1;
    }
  }
  return dat / (LAY_MAU * LAY_MAU);
}

function phu(duoi, tren, a) {
  if (a <= 0) return duoi;
  const aT = (tren[3] / 255) * a;
  const aD = duoi[3] / 255;
  const aRa = aT + aD * (1 - aT);
  if (aRa <= 0) return [0, 0, 0, 0];
  const kenh = (i) => Math.round((tren[i] * aT + duoi[i] * aD * (1 - aT)) / aRa);
  return [kenh(0), kenh(1), kenh(2), Math.round(aRa * 255)];
}

export function veIcon(co) {
  /* Nét dày lên ở cỡ nhỏ: một nét dày chưa tới 2 điểm ảnh thì ở thanh công cụ nhìn ra vệt bẩn
   * chứ không ra chữ. Cùng lý do với bộ sinh của Scouter. */
  const day = Math.max(0.055, 2.0 / co);
  const doan = bocucChu(co);
  const diem = new Uint8Array(co * co * 4);
  for (let y = 0; y < co; y += 1) {
    for (let x = 0; x < co; x += 1) {
      let mau = [0, 0, 0, 0];
      if (NEN) mau = phu(mau, NEN, chePhu((u, v) => trongNen(u, v, 0.02, 0.22), x, y, co));
      const s = chePhu((u, v) => doan.some((d) => cachDoan(u, v, d) <= day / 2), x, y, co);
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
      /* Chấm điểm theo ĐỘ SÁNG của chữ (kênh lục), không theo độ mờ: nền xanh cũng đục, nên
       * chấm theo độ mờ thì cả ô vuông đặc và ta không thấy chữ đâu. */
      const sang = (diem[i + 1] / 255) * (diem[i + 3] / 255);
      s += thang[Math.min(thang.length - 1, Math.round(sang * (thang.length - 1)))];
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
