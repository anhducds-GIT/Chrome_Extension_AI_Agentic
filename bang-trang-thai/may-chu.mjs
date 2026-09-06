/* CỬA ② + ③ — một tiến trình duy nhất: vừa canh nền, vừa phục vụ bảng tại chỗ.
 *
 * Một tiến trình, một mục khởi động, một chỗ để tắt (mục 5 của brief).
 *
 * CHỈ ĐỌC. Không có một đường GHI nào, và đó không phải là "chưa làm" mà là luật:
 * Đức đã bác việc tự nhập liệu — *"Tôi muốn là người ĐỌC thông tin AI báo cáo, chứ
 * không phải người báo cáo cho AI."* Thêm một đường ghi "cho tiện sau này" là cách một
 * máy chủ chỉ-đọc thành một máy chủ sửa được repo. Phép ghim đếm số đường và khoá
 * phương thức ở GET/HEAD; thêm đường thứ tư hay mở POST là ĐỎ.
 *
 * Nghe CHỈ ở 127.0.0.1. Không mở ra mạng.
 *
 * Dùng:  node bang-trang-thai/may-chu.mjs [--cong 4747]
 */
import http from "node:http";
import fs from "node:fs";
import {
  FILE_BANG, FILE_DUNG, chenBang, themCharset, docTrangThai, ghiTrangThai, sinhLai, vanTay, gioVN
} from "./loi.mjs";

export const CONG_MAC_DINH = 4747;
const DIA_CHI = "127.0.0.1";

/* ⑷ GỘP NHỊP. 30 giây một nhịp, và mỗi nhịp chỉ SO dấu vân tay — chỉ sinh khi repo
 * thật sự đổi. Sinh theo từng sự kiện file là đốt máy Đức vô ích: một lượt lane làm
 * việc đổi hàng chục file trong vài giây. */
export const NHIP_MS = 30_000;

/* BA ĐƯỜNG, TẤT CẢ CHỈ ĐỌC. Danh sách này là thứ phép ghim đếm. */
export const DUONG = ["/", "/lam-moi", "/trang-thai.json"];
export const PHUONG_THUC = ["GET", "HEAD"];

export function xuLy(req, res, boc) {
  if (!PHUONG_THUC.includes(req.method)) {
    res.writeHead(405, { "content-type": "text/plain; charset=utf-8", allow: PHUONG_THUC.join(", ") });
    res.end("Máy chủ này chỉ đọc. Không nhận lệnh ghi.\n");
    return;
  }
  const duong = (req.url || "/").split("?")[0];

  if (duong === "/lam-moi") {
    // Làm mới = chạy đúng cái lõi ở mục 1, chịu đủ bốn chốt. Không có đường tắt nào.
    boc.lamMoi();
    res.writeHead(303, { location: "/" });
    res.end();
    return;
  }

  if (duong === "/trang-thai.json") {
    res.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
    res.end(`${JSON.stringify(docTrangThai() ?? {}, null, 2)}\n`);
    return;
  }

  if (duong !== "/") {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Không có trang này. Bảng nằm ở /\n");
    return;
  }

  let html;
  try {
    // Đắp lại băng lúc phục vụ: thêm nút Làm mới và lấy nhịp mới nhất. `chenBang` gỡ
    // băng cũ trước khi chèn, nên gọi bao nhiêu lần cũng ra đúng một băng.
    html = themCharset(chenBang(fs.readFileSync(FILE_BANG, "utf8"), { ...(docTrangThai() ?? {}), quaMayChu: true }));
  } catch (loi) {
    res.writeHead(503, { "content-type": "text/html; charset=utf-8" });
    res.end(`<meta charset="utf-8"><p style="font:14px system-ui">Chưa sinh được bảng: ${loi.message}</p>\n`);
    return;
  }
  res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
  res.end(html);
}

async function main() {
  const args = process.argv.slice(2);
  const i = args.indexOf("--cong");
  const cong = i >= 0 ? Number(args[i + 1]) : CONG_MAC_DINH;

  let dangSinh = false;
  let vanTayCu = null;

  // Cờ dừng còn sót lại từ lượt tắt trước sẽ giết ngay bản vừa bật. Dọn lúc mở.
  try { fs.rmSync(FILE_DUNG); } catch { /* không có cờ là chuyện thường */ }

  // Nhịp thở: ghi mốc cho trang biết vòng canh còn sống, kể cả nhịp không phải sinh lại.
  const nhipThoi = () => {
    const tt = docTrangThai();
    if (tt) ghiTrangThai({ ...tt, nhip: new Date().toISOString() });
  };

  const sinh = async (batBuoc = false) => {
    if (dangSinh) return;
    const vt = vanTay();
    if (!batBuoc && vt === vanTayCu) { nhipThoi(); return; }
    dangSinh = true;
    try {
      const tt = await sinhLai({ nhip: new Date().toISOString() });
      vanTayCu = vt;
      console.log(tt.ngung
        ? `${gioVN(new Date().toISOString())} — ngừng sinh: ${tt.ly_do}`
        : `${gioVN(new Date().toISOString())} — đã sinh lại bảng`);
    } catch (loi) {
      // Chết thì im lặng chết, không làm hỏng gì: ghi một dòng rồi đi tiếp. Vòng canh
      // KHÔNG được dừng vì một lượt sinh hỏng — lần sau repo đổi thì thử lại.
      console.error(`lượt sinh hỏng: ${loi.message}`);
    } finally { dangSinh = false; }
  };

  const may = http.createServer((req, res) => xuLy(req, res, { lamMoi: () => { void sinh(true); } }));
  may.on("error", (loi) => {
    // Cổng đã có người nghe = một bản khác đang chạy rồi. Thoát sạch, không cửa sổ lỗi.
    console.error(`không mở được cổng ${cong}: ${loi.code || loi.message}`);
    process.exit(0);
  });

  may.listen(cong, DIA_CHI, async () => {
    console.log(`Bảng trạng thái đang phục vụ ở http://${DIA_CHI}:${cong}/`);
    await sinh(true);
  });

  setInterval(() => {
    // Cửa tắt: `Tat-tu-chay.cmd` đặt một file cờ. Không dùng lệnh giết tiến trình — giết
    // theo tên sẽ giết luôn tiến trình node của một phiên AI đang chạy.
    if (fs.existsSync(FILE_DUNG)) {
      try { fs.rmSync(FILE_DUNG); } catch { /* xoá không được thì thôi, vẫn phải dừng */ }
      console.log("Nhận lệnh dừng. Thoát.");
      process.exit(0);
    }
    void sinh(false);
  }, NHIP_MS).unref?.();

  // `unref` ở trên làm tiến trình có thể thoát khi không còn việc; máy chủ đang nghe nên
  // nó vẫn sống. Giữ nguyên: nếu cổng đóng vì lý do gì đó thì thoát sạch là đúng.
}

if (process.argv[1] && process.argv[1].endsWith("may-chu.mjs")) main();
