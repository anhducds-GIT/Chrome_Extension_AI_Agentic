/* PHÉP GHIM CHO DẤU XÁC NHẬN SUITE — `scripts/chay-test.mjs`.
 *
 * Cơ chế này cho cổng đóng phiên **thôi chạy lại** một chuỗi suite vừa chạy xong (đo 08/09: 535s
 * chạy hai lần trong một vòng làm việc). Nó đứng ngay cạnh một lớp bảo vệ, nên phần lớn phép
 * ghim ở đây là chiều **TỪ CHỐI**: mỗi cách một cây làm việc CHƯA xanh có thể lọt qua.
 *
 * Nếu một ngày ai đó nới một điều kiện dưới đây cho "tiện", họ đang bật một cửa để báo xong mà
 * chưa chạy gì — chính xác thứ cổng sinh ra để chặn.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { bamLenh, danhSachSuite, danhSachTuanTu, moiTruongNay, xetDau, TEN_DAU } from "../scripts/chay-test.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let so = 0;
const ok = (t) => { so += 1; console.log(`  ok  ${t}`); };

const CAY = { head: "a".repeat(40), bam: "b".repeat(32) };
const LENH = bamLenh(["node tests/x.mjs", "node tests/y.mjs"]);
const LUC = "2026-09-08T10:00:00.000Z";
const NOW = Date.parse("2026-09-08T10:05:00.000Z");   // 5 phút sau
const DAU_TOT = { ok: true, head: CAY.head, bam: CAY.bam, lenh: LENH, moi_truong: moiTruongNay(), luc: LUC };

/* ---- 1. Chiều NHẬN: mọi thứ khớp thì dùng lại được -------------------------
   Không có vế này thì một hàm luôn trả `false` cũng qua hết các vế dưới, và cơ chế thành
   trang trí — cổng vẫn chạy lại 535s mỗi lần, không ai biết. */
{
  const r = xetDau(DAU_TOT, CAY, LENH, { now: NOW });
  assert.equal(r.dung, true, `dau khop moi thu phai dung duoc: ${r.vi_sao}`);
  assert.match(r.vi_sao, /5 phút/, "phai noi ro dau bao nhieu tuoi — nguoi doc can biet no noi ve luc nao");
  ok("khớp hết thì dùng lại được, và nói rõ dấu bao nhiêu tuổi");
}

/* ---- 2. Chiều TỪ CHỐI — sáu cửa, mỗi cửa một cách lọt ---------------------- */
{
  const ca = [
    ["chưa có dấu", null],
    ["dấu rỗng", {}],
    ["dấu ghi lượt chạy ĐỎ", { ...DAU_TOT, ok: false }],
    ["ĐỔI HEAD (đã commit thêm)", { ...DAU_TOT, head: "c".repeat(40) }],
    ["ĐỔI CÂY LÀM VIỆC (sửa một byte)", { ...DAU_TOT, bam: "d".repeat(32) }],
    ["ĐỔI DANH SÁCH SUITE (bớt một suite)", { ...DAU_TOT, lenh: bamLenh(["node tests/x.mjs"]) }],
    ["QUÁ HẠN (31 phút)", { ...DAU_TOT, luc: "2026-09-08T09:29:00.000Z" }],
    ["mốc thời gian rác", { ...DAU_TOT, luc: "hôm qua" }],
    ["mốc ở TƯƠNG LAI (đồng hồ bị vặn)", { ...DAU_TOT, luc: "2026-09-08T11:00:00.000Z" }],
    // Phiên Codex bắt được cửa này khi chấm chéo: HEAD + cây làm việc KHÔNG nói gì về môi trường.
    ["ĐỔI MÔI TRƯỜNG (nâng bản Node)", { ...DAU_TOT, moi_truong: "v22.0.0 win32 x64" }],
    ["dấu cũ KHÔNG ghi môi trường", (() => { const d = { ...DAU_TOT }; delete d.moi_truong; return d; })()],
  ];
  for (const [ten, dau] of ca) {
    const r = xetDau(dau, CAY, LENH, { now: NOW });
    assert.equal(r.dung, false, `PHAI TU CHOI: ${ten}`);
    assert.ok(String(r.vi_sao).length > 5, `${ten}: phai noi VI SAO tu choi, khong im lang`);
  }
  ok(`từ chối đủ ${ca.length} cửa: chưa có · rỗng · đỏ · đổi HEAD · đổi cây · đổi danh sách · quá hạn · mốc rác · mốc tương lai · đổi môi trường · dấu cũ thiếu môi trường`);
}

/* ---- 3. Hạn dùng đọc được từ ngoài, và biên là ">" ------------------------- */
{
  const dungHan = { ...DAU_TOT, luc: new Date(NOW - 30 * 60000).toISOString() };
  assert.equal(xetDau(dungHan, CAY, LENH, { now: NOW }).dung, true, "dung bang han thi VAN dung duoc");
  assert.equal(xetDau(dungHan, CAY, LENH, { now: NOW + 61000 }).dung, false, "hon han mot phut thi thoi");
  assert.equal(xetDau(DAU_TOT, CAY, LENH, { now: NOW, phut: 1 }).dung, false, "ha han xuong 1 phut thi dau 5 phut phai bi tu choi");
  ok("hạn dùng: đúng bằng hạn thì được, quá thì thôi, và hạ hạn từ ngoài thì đổi kết quả");
}

/* ---- 4. Băm phải NHẠY với thứ nó phải nhạy -------------------------------- */
{
  assert.notEqual(bamLenh(["a", "b"]), bamLenh(["b", "a"]), "doi THU TU suite la mot chuoi khac");
  assert.notEqual(bamLenh(["a"]), bamLenh(["a", "b"]), "them mot suite la mot chuoi khac");
  assert.equal(bamLenh(["a", "b"]), bamLenh(["a", "b"]), "cung danh sach thi cung bam");
  ok("băm danh sách suite nhạy với thêm/bớt/đổi thứ tự");
}

/* ---- 5. CỔNG PHẢI THẬT SỰ GỌI, KHÔNG CHỈ CÓ HÀM ---------------------------
   Bốn khối trên ghim hàm thuần. Nhưng gỡ lời gọi khỏi `session-check.mjs` mà để lại hàm thì
   bốn khối đó VẪN XANH và cổng lặng lẽ quay về chạy lại 535s — chậm thì thấy, còn chiều ngược
   lại nguy hơn: ai đó gọi hàm rồi bỏ qua kết quả. Nên soi ĐÚNG LỜI GỌI. */
{
  const gate = fs.readFileSync(path.join(ROOT, "scripts", "session-check.mjs"), "utf8").replace(/\r\n/g, "\n");
  assert.match(gate, /xetDau\(docDau\(ROOT\), dauCay\(ROOT\), bamLenh\(danhSachSuite\(ROOT\)\)\)/,
    "cong phai xet dau bang DU BA nguon: dau tren dia, cay lam viec that, danh sach suite that");
  /* Hai vế dưới cố ý hỏi HÀNH VI, không hỏi tên biến: hai repo gọi nhánh chạy đầy đủ bằng hai
     cái tên khác nhau (`runRootSuite()` ở nơi phát hành, `rootSuiteParts()` ở repo tiêu thụ), mà
     điều phải ghim thì y hệt — kết quả xét PHẢI được rẽ nhánh, và đường chạy đầy đủ PHẢI còn. */
  assert.match(gate, /\.dung/, "cong phai RE NHANH theo ket qua xet, khong duoc goi roi bo qua");
  assert.match(gate, /runRootSuite\(\)|rootSuiteParts\(\)/,
    "nhanh chay lai day du PHAI con do — dau chi la duong tat, khong phai duong duy nhat");
  ok("cổng thật sự gọi phép xét, rẽ nhánh theo nó, và vẫn giữ đường chạy đầy đủ");
}

/* ---- 6. Dấu KHÔNG được đi theo repo --------------------------------------- */
{
  const bo = fs.readFileSync(path.join(ROOT, ".gitignore"), "utf8");
  assert.ok(bo.includes(TEN_DAU), `${TEN_DAU} phai nam trong .gitignore — commit no la cho may khac muon dau cua may nay`);
  ok(".gitignore chặn dấu đi theo repo");
}

/* ---- 7. Danh sách chạy-riêng đọc từ cấu hình, không gõ cứng --------------- */
{
  const bo = fs.readFileSync(path.join(ROOT, "scripts", "chay-test.mjs"), "utf8");
  assert.ok(!/serial:\s*\[\s*"/.test(bo), "danh sach chay-rieng KHONG duoc go cung trong script");
  assert.ok(Array.isArray(danhSachTuanTu(ROOT)), "phai doc duoc tu .repo-structure.json");
  ok("danh sách chạy-riêng khai ở cấu hình, không gõ cứng trong script");
}

console.log(`\n${so} passed, 0 failed, ${so} total`);
