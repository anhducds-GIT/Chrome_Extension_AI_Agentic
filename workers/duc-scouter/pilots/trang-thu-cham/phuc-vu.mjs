// Phục vụ trang thử qua http trên 127.0.0.1 — KHÔNG ra ngoài máy.
// Vì sao phải có máy chủ: scout.navigate chỉ nhận http(s); file: và data: bị
// chặn ở readUrlDi, cố ý. Mở bằng file:// thì cả chuỗi T7 không chạy được.
//
//   node workers/duc-scouter/pilots/trang-thu-cham/phuc-vu.mjs [cổng]
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, normalize } from "node:path";

const GOC = join(dirname(fileURLToPath(import.meta.url)), "trang");
const CONG = Number(process.argv[2] || 8642);
const KIEU = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8" };

const may = createServer(async (req, res) => {
  const duong = new URL(req.url, "http://127.0.0.1").pathname;
  const ten = duong === "/" ? "index.html" : duong.replace(/^\/+/, "");
  const dich = normalize(join(GOC, ten));
  // Ra ngoài thư mục trang thì từ chối — máy chủ này chỉ phục vụ đúng một thư mục.
  if (!dich.startsWith(GOC)) { res.writeHead(403).end("403"); return; }
  try {
    const than = await readFile(dich);
    const duoi = dich.slice(dich.lastIndexOf("."));
    res.writeHead(200, { "Content-Type": KIEU[duoi] || "application/octet-stream", "Cache-Control": "no-store" });
    res.end(than);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("404");
  }
});

// Chỉ nghe trên vòng lặp nội bộ. Đừng đổi thành 0.0.0.0.
may.listen(CONG, "127.0.0.1", () => console.log(`trang thử: http://127.0.0.1:${CONG}/`));
