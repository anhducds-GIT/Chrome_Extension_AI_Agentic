/* HELPER CHỈ DÙNG CHO BÀI KIỂM — danh sách script phải chép vào một repo tạm.
 *
 * ─── VÌ SAO NÓ Ở `tests/` CHỨ KHÔNG Ở `scripts/` ────────────────────────────
 * Hàm này từng là `fileScriptCanChep` trong `scripts/repo-structure.mjs`. Lượt migrate bộ khung
 * `4da1e9e5` (0.3.0 → 1.8.0) thay trọn file đó bằng bản của bộ khung, và hàm biến mất — cùng
 * với nó là `tests/build-dashboard-smoke.mjs` (**469 vế**) và `tests/dau-vet-vung-smoke.mjs`,
 * cả hai chết ngay dòng `import` và bị đẩy vào khu cách ly `npm run test:chet` suốt 9 ngày.
 *
 * Nó **không phải một bất biến của sản phẩm**: nó không đọc luật, không quyết gì, không ai
 * ngoài bài kiểm gọi nó. Một trợ thủ chỉ-dùng-cho-test sống trong một file mà **bộ khung sở
 * hữu** thì mỗi lượt nâng khung là một lượt nó có thể biến mất — và lúc đó phép ghim dùng nó
 * không đỏ, nó **không nạp nổi**, tức hỏng CÂM. Đưa về `tests/` là chữa đúng chỗ đó, không
 * phải chép lại một hàm đã chết.
 *
 * Ngược lại, thứ KHÔNG được làm thế: một bất biến của sản phẩm mà bị xoá thì phải để phép ghim
 * ĐỎ, không được dựng một bản sao trong `tests/` rồi ghim vào bản sao — cái đó là xanh giả.
 *
 * ─── NÓ LÀM GÌ ─────────────────────────────────────────────────────────────
 * Nhiều phép ghim dựng một repo tạm rồi chạy cổng kiểm trong đó. Trước 09/09 mỗi chỗ giữ một
 * DANH SÁCH GÕ TAY tên file cần chép — bảy bản, và cả bảy mục cùng lúc: hôm đó
 * `session-check.mjs` nhận thêm một import và bốn suite đỏ với `ERR_MODULE_NOT_FOUND`. Cái chết
 * đó trông y hệt một phép kiểm hỏng, nên nó vừa tốn thời gian vừa chỉ sai hướng.
 *
 * Nay suy từ chính mã nguồn. HAI kiểu phụ thuộc, bỏ kiểu thứ hai thì repo tạm vẫn chết:
 * `import` tĩnh, VÀ script được gọi như **tiến trình con** (`check-bootstrap.mjs` đi đường đó).
 *
 * `goc` là những script mà repo thử gọi thẳng. Trả về TÊN FILE, không phải đường dẫn.
 */
import fs from "node:fs";
import path from "node:path";

export function fileScriptCanChep(root, goc = ["session-check.mjs"]) {
  const thay = new Set();
  const hang = [...goc];
  const RE = [
    /from\s+"\.\/([\w.-]+\.mjs)"/g,
    /"scripts",\s*"([\w.-]+\.mjs)"/g,
    /scripts\/([\w.-]+\.mjs)/g
  ];
  while (hang.length) {
    const ten = hang.shift();
    if (thay.has(ten)) continue;
    let src;
    try { src = fs.readFileSync(path.join(root, "scripts", ten), "utf8"); } catch { continue; }
    thay.add(ten);
    for (const re of RE) for (const m of src.matchAll(re)) hang.push(m[1]);
  }
  return [...thay];
}
