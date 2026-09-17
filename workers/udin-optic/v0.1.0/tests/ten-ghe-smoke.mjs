/* Phép ghim cho lượt TÁCH GHẾ — chạy không cần trình duyệt.
 *
 * ─── VÌ SAO ──────────────────────────────────────────────────────────────────
 * Đức mở hai cửa sổ Chrome, tách ra, cả hai cùng cắm extension Udin, rồi nói trước cái sắp xảy
 * ra: *"bạn sẽ có thể gặp một tình trạng là trùng tên gọi và trùng tên profile."*
 *
 * Chỗ hỏng là một khoảng mù CÓ THẬT: bảng bên **chỉ thấy ghế của chính nó** (`G-96`, đo 16/09 —
 * extension chỉ TRẢ LỜI, không phát đi được yêu cầu nào). Nên nó cảnh báo được bằng chữ mà
 * **không kiểm được**. Phép kiểm đứng ở `tu-dong/chon-ghe.mjs`, phía gọi.
 *
 * ─── CHỖ ĐẮT NHẤT, VÀ NÓ KHÔNG PHẢI CÁI DANH SÁCH ──────────────────────────
 * Cùng một công thức tên gợi ý bị viết ở **HAI chỗ**: `chon-ghe.mjs` (Node) và `sidepanel.js`
 * (trong extension). Chúng không import được của nhau — một bên chạy trong Node, một bên trong
 * trang extension. Hai bản của một luật thì sớm muộn lệch, và lúc lệch thì Đức gõ tên theo bảng
 * bên rồi lệnh lại bảo ghế chưa đặt tên. Khối ⓓ là sợi dây buộc hai bên.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { xepGhe, tenGoiY, tuoi, lietKe } from "../../tu-dong/chon-ghe.mjs";

const goc = dirname(fileURLToPath(import.meta.url));
const LUC = Date.parse("2026-09-17T08:00:00.000Z");
const ghe = (id, label, tre = 5) => ({
  instance_id: id, label,
  last_seen_at: new Date(LUC - tre * 1000).toISOString(),
});

/* ---- ⓐ HAI GHẾ TRÙNG TÊN → đánh dấu CẢ HAI -----------------------------
 * Đánh dấu một cái thì người đọc tưởng cái kia là "cái đúng" — mà không, gọi tên ấy KHÔNG TRÚNG
 * CÁI NÀO. Đây là khối phân biệt bản đúng với một bản chỉ đánh dấu bản trùng thứ hai. */
{
  const ds = xepGhe([ghe("aaa-1", "Udin_main"), ghe("bbb-2", "Udin_main"), ghe("ccc-3", "khac")], LUC);
  assert.deepEqual(ds.map((g) => g.trung), [true, true, false]);
  assert.deepEqual(ds.map((g) => g.so), [1, 2, 3]);
}

/* ---- ⓑ HAI GHẾ CHƯA ĐẶT TÊN thì KHÔNG phải trùng -----------------------
 * Phân biệt thật, không phải chi tiết: chưa ai gọi chúng bằng tên nên chưa có gì hỏng. Báo
 * "trùng" ở đây là dạy Đức đi sửa một thứ không hỏng, và lần sau anh sẽ bỏ qua cảnh báo thật. */
{
  const ds = xepGhe([ghe("aaa-1", ""), ghe("bbb-2", null), ghe("ccc-3", "   ")], LUC);
  assert.deepEqual(ds.map((g) => g.trung), [false, false, false]);
  assert.deepEqual(ds.map((g) => g.nhan), [null, null, null]);
}

/* ---- ⓒ Khoảng trắng hai đầu KHÔNG tạo ra một cái tên khác -------------- */
{
  const ds = xepGhe([ghe("aaa-1", "  main "), ghe("bbb-2", "main")], LUC);
  assert.deepEqual(ds.map((g) => g.trung), [true, true], "` main ` và `main` là MỘT tên");
  assert.deepEqual(ds.map((g) => g.nhan), ["main", "main"]);
}

/* ---- ⓓ MỘT công thức tên gợi ý, hai nơi viết — phải khớp --------------- */
{
  assert.equal(tenGoiY("dc207c62-d973-428a-980e-520f97a9932e"), "udin-dc207c");
  assert.equal(tenGoiY("ab"), null, "id quá ngắn thì KHÔNG bịa ra tên");
  /* Hai ghế khác id thì tên gợi ý phải khác — đó là cả lý do tên ấy suy từ id. */
  assert.notEqual(tenGoiY("aaaaaaaa-1111"), tenGoiY("bbbbbbbb-2222"));

  /* Bản trong extension: đọc THẲNG từ `sidepanel.js` rồi chạy nó, không chép lại công thức vào
   * đây. Chép lại là dựng bản thứ BA của cùng một luật. */
  const js = readFileSync(join(goc, "..", "sidepanel.js"), "utf8");
  const than = js.match(/function tenGoiYTuSo\(id\) \{([\s\S]*?)\n\}/);
  assert.ok(than, "không tìm thấy `tenGoiYTuSo` trong sidepanel.js — bảng bên mất nút đặt tên riêng?");
  // eslint-disable-next-line no-new-func
  const banPanel = new Function("id", than[1]);
  for (const id of ["dc207c62-d973-428a-980e-520f97a9932e", "f3f7264e-0b31-4417-8c65-06e6b1b47535", "ab", ""]) {
    assert.equal(banPanel(id), tenGoiY(id), `tên gợi ý LỆCH giữa bảng bên và chon-ghe.mjs cho id ${JSON.stringify(id)}`);
  }
}

/* ---- ⓔ Tuổi đọc ra được, không phải một mốc ISO ------------------------ */
{
  assert.equal(tuoi(new Date(LUC - 5000).toISOString(), LUC), "5s trước");
  assert.equal(tuoi(new Date(LUC - 120000).toISOString(), LUC), "2 phút trước");
  assert.equal(tuoi(new Date(LUC - 7200000).toISOString(), LUC), "2 giờ trước");
}

/* ---- ⓕ `lietKe` hỏi ĐÚNG MỘT method, và không tự bịa khi máy chủ trả rỗng */
{
  const daGoi = [];
  const ds = await lietKe({ goi: async (m) => { daGoi.push(m); return { sessions: [ghe("x-1", "a")] }; }, bayGio: LUC });
  assert.deepEqual(daGoi, ["bridge.sessions"]);
  assert.equal(ds.length, 1);
  const rong = await lietKe({ goi: async () => ({}), bayGio: LUC });
  assert.deepEqual(rong, [], "máy chủ không trả `sessions` thì trả danh sách RỖNG, đừng ném");
  /* Và ca PHÂN BIỆT: máy chủ trả thẳng `null`. Thiếu ca này thì một bản bỏ `?.` vẫn xanh —
   * `xepGhe` tự canh mảng rỗng nên hai bản giống hệt nhau ở mọi ca khác. */
  const rong2 = await lietKe({ goi: async () => null, bayGio: LUC });
  assert.deepEqual(rong2, [], "máy chủ trả `null` cũng phải ra danh sách rỗng, không được ném");
}

/* ---- ⓖ Nút trong bảng bên phải NỐI ĐƯỢC DÂY --------------------------- */
{
  const html = readFileSync(join(goc, "..", "sidepanel.html"), "utf8");
  const js = readFileSync(join(goc, "..", "sidepanel.js"), "utf8");
  assert.ok(html.includes('id="ten-ghe-goi-y"'), "thiếu nút gợi ý tên trong HTML");
  assert.ok(js.includes('$("#ten-ghe-goi-y").addEventListener'), "nút có trong HTML mà không ai nghe — bấm không đổi gì");
  /* Nó chỉ ĐIỀN vào ô, KHÔNG tự lưu: lưu tên là cắt dây nối, và một cú cắt dây không ai bấm là
   * một cú cắt dây không ai hiểu. */
  /* CẮT ĐÚNG THÂN HÀM, không cắt theo số ký tự. Bản đầu lấy 500 ký tự sau chỗ bắt đầu và trùm
   * luôn sang hàm nghe nút "Lưu tên" ngay bên dưới — rồi báo đỏ cho một đoạn mã hoàn toàn đúng.
   * Cùng họ với `detectors-match-your-own-prose`: phép dò bắt trúng thứ nằm cạnh nó. */
  const dau = js.indexOf('$("#ten-ghe-goi-y").addEventListener');
  const cuoi = js.indexOf('});', dau);
  assert.ok(dau > 0 && cuoi > dau, "không cắt được thân hàm nghe nút gợi ý");
  const than = js.slice(dau, cuoi);
  assert.ok(!than.includes("luuTenGhe("), "nút gợi ý KHÔNG được tự lưu — lưu tên là cắt dây nối");
  assert.ok(than.includes('$("#ten-ghe").value'), "nút gợi ý phải ĐIỀN vào ô tên");
}

console.log("  · udin ten-ghe: 7 khối xanh");
