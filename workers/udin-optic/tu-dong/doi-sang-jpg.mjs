/* Udin Optic — đổi ảnh vừa tải về từ `.webp` sang `.jpg`.
 *
 * Đức yêu cầu 15/09: *"ảnh lưu về là .webp. Tôi muốn JPG"*. Udin trả ảnh WebP trên S3 và không
 * có tham số nào đổi được định dạng ở đầu kia, nên việc đổi phải làm ở đầu này.
 *
 * ─── VÌ SAO KHÔNG THÊM MỘT GÓI NPM ──────────────────────────────────────────
 * Node KHÔNG giải mã được WebP, mà repo này có **đúng không dependency nào**. Thêm `sharp` (nhị
 * phân native, vài chục MB) vào một repo không dependency là một thay đổi kiến trúc — để lấy
 * một việc mà **Windows đã làm sẵn**: WIC có codec WebP từ Windows 10 1809. Đo thật 15/09 trên
 * chính máy này: ảnh Udin 1728×1728 giải mã và ghi JPG được, không cài gì.
 *
 * Giá phải trả, nói trước: **chỉ chạy trên Windows**. Repo đã Windows-only ở nhiều chỗ, nên đây
 * không phải ràng buộc MỚI — nhưng nó là một ràng buộc, và nó được khai chứ không bị giấu.
 *
 * ─── ẢNH GỐC GIỮ NGUYÊN ─────────────────────────────────────────────────────
 * Không xoá `.webp`. Xoá dữ liệu gốc là việc phải hỏi Đức (luật gốc), và chính máy chủ Bridge
 * cũng cố ý KHÔNG có `file.delete` vì đúng lý do đó. Muốn chỉ còn JPG thì Đức xoá tay, hoặc nói
 * một câu rồi mở thêm một cờ.
 *
 * ─── KHÔNG TIN LỜI BÁO CỦA BỘ ĐỔI ───────────────────────────────────────────
 * PowerShell nói "xong" thì mới là **lời khai**. Mỗi tệp ra được đọc lại ở đây và kiểm **ba byte
 * đầu `FF D8 FF`** — một JPEG thật bắt đầu bằng đúng ba byte đó. Cùng một kỷ luật với lượt kiểm
 * `RIFF…WEBP` của `lay-anh.mjs`: kiểm bằng ĐĨA, không bằng câu trả lời.
 *
 *   node workers/udin-optic/tu-dong/doi-sang-jpg.mjs [<thư-mục-con-trong-vùng-ghi>]
 */
import { execFile } from "node:child_process";
import { readFileSync, existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { goi as goiThat } from "./goi-bridge.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
export const PS1 = join(HERE, "doi-sang-jpg.ps1");

const chayThat = (args) =>
  new Promise((ok, hong) => {
    execFile("powershell.exe", args, { encoding: "utf8", maxBuffer: 8 << 20 }, (loi, ra, loiRa) => {
      if (loi && !ra) return hong(new Error(`Không chạy được PowerShell: ${loi.message}. ${String(loiRa || "").slice(0, 200)}`));
      ok(ra);
    });
  });

/** Ba byte đầu của một JPEG thật. Đây là phép kiểm bằng ĐĨA, không phải bằng lời báo. */
export function laJpegThat(duong) {
  if (!existsSync(duong)) return false;
  const b = readFileSync(duong, { length: 3 }).subarray(0, 3);
  return b.length === 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
}

export async function doiSangJpg(thuMucCon, tuyChon = {}) {
  const goi = tuyChon.goi || goiThat;
  const chay = tuyChon.chay || chayThat;
  /* Hai phép ĐỌC ĐĨA tiêm được, để phép ghim của E2E chạy được chặng này mà không cần tệp thật.
   * Mặc định là bản THẬT, và bộ ghim riêng của file này chạy PowerShell thật — nên chỗ tiêm
   * không bao giờ trở thành đường lách cho chính nó. */
  const laJpeg = tuyChon.laJpeg || laJpegThat;
  const co = tuyChon.co || ((d) => statSync(d).size);

  /* Hỏi máy chủ vùng ghi ở đâu, KHÔNG gõ cứng: Đức đổi `--root` lúc bật máy chủ là mọi đường
   * dẫn gõ cứng thành sai, và sai một cách im lặng — nó sẽ chỉ báo "không thấy tệp nào". */
  const hc = await goi("host.capabilities", {}, tuyChon);
  const goc = hc.write_root || hc.data?.write_root;
  if (!goc) throw new Error("Máy chủ không khai `write_root` — không biết ảnh nằm ở đâu.");
  const thuMuc = thuMucCon ? resolve(goc, thuMucCon) : resolve(goc);

  const ra = await chay(["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", PS1, "-ThuMuc", thuMuc,
    "-ChatLuong", String(tuyChon.chatLuong ?? 92)]);

  const dong = String(ra).split(/\r?\n/).map((d) => d.trim()).filter(Boolean).map((d) => {
    try { return JSON.parse(d); } catch { return { thoLoi: d }; }
  });

  const hong = dong.filter((d) => d.loi);
  if (hong.length) throw new Error(`Đổi sang JPG hỏng ${hong.length} tệp: ${hong.map((d) => `${d.nguon || "?"} — ${d.loi}`).join(" · ")}`);
  if (dong.some((d) => d.trong)) throw new Error(`Không có tệp .webp nào trong '${thuMuc}' — chưa chạy lượt lấy ảnh, hay đưa nhầm thư mục?`);

  const xong = [];
  for (const d of dong) {
    if (!d.ra) continue;
    const duong = join(thuMuc, d.ra);
    /* Bộ đổi khai xong mà tệp không phải JPEG thì đó là một XANH GIẢ — bắt ở đây, đừng để nó
     * đi tiếp thành "đã có JPG". */
    if (!laJpeg(duong)) throw new Error(`'${d.ra}' không mở đầu bằng FF D8 FF — bộ đổi khai xong nhưng tệp KHÔNG phải JPEG.`);
    const that = co(duong);
    if (that !== null && that !== d.byteRa) throw new Error(`'${d.ra}': bộ đổi khai ${d.byteRa} byte, trên đĩa ${that}.`);
    xong.push({ ...d, duong });
  }
  return { thuMuc, so: xong.length, anh: xong };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const ket = await doiSangJpg(process.argv[2]);
  for (const a of ket.anh) {
    console.log(`${a.ra}  ${a.rong}×${a.cao}  ${a.byteNguon} → ${a.byteRa} byte`);
  }
  console.log(`\n${ket.so} ảnh sang JPG ở ${ket.thuMuc}\n(bản .webp giữ nguyên — xoá dữ liệu gốc là việc phải hỏi Đức)`);
}
