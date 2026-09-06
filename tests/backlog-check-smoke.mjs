/* Phép ghim cho `scripts/backlog-check.mjs` — N-01.
 *
 * Phép quan trọng nhất là phép CUỐI: `package.json` phải còn gọi bộ kiểm này. Trước 06/09 luật
 * "mỗi mục `## N-xx` phải khai `đóng khi:`" sống bằng một dòng `node -e` nhét trong `scripts.test`
 * và **không có gì canh chính dòng đó** — xoá nó đi là luật biến mất trong im lặng, mọi test vẫn
 * xanh. Ghim một mình bộ kiểm là chưa đủ: một bộ kiểm không ai gọi thì cũng chỉ là bình luận.
 *
 * Ghim CẢ HAI CHIỀU (luật vàng 2): thiếu trường thì ĐỎ · đủ trường thì XANH. Chiều "đủ thì xanh"
 * không thừa — một bộ kiểm luôn đỏ sẽ bị người ta gỡ khỏi cổng trong vòng một ngày.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { docMuc, kiemSo, thieuDongKhi, TRUONG_DONG_KHI } from "../scripts/backlog-check.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BO_KIEM = path.join(ROOT, "scripts", "backlog-check.mjs");
let passed = 0;
const ok = (name) => { passed += 1; console.log(`  ok  ${name}`); };

const so = (...dong) => dong.join("\n");
const muc = (ma, dongKhi) => so(
  `## ${ma} · một câu nói vấn đề`,
  "",
  dongKhi === null ? "- **mở:** 2026-09-06 · lane `x`" : `${TRUONG_DONG_KHI} ${dongKhi}`,
  "- **vùng:** `_code`",
  ""
);

/* ---- 1. Chiều ĐỎ: một mục thiếu `đóng khi:` thì phải kêu tên đúng mục đó ---- */
{
  const text = so(muc("N-01", "lệnh: node tests/x.mjs xanh"), muc("N-02", null), muc("N-03", "đức: chốt có làm không"));
  assert.deepEqual(thieuDongKhi(text), ["N-02"], "phai keu dung ten muc thieu, khong keu ca so");
  assert.equal(kiemSo(text).tong, 3, "dem du ba muc");
  ok("thieu truong dong-khi: keu dung N-02, khong bao oan N-01/N-03");
}

/* ---- 2. Trường có mặt nhưng BỎ TRỐNG cũng là chưa khai ---- */
{
  const trong = so(`## N-04 · việc gì đó`, `${TRUONG_DONG_KHI}   `, "- **vùng:** `_root`");
  assert.deepEqual(thieuDongKhi(trong), ["N-04"],
    "truong rong trong nhu da khai voi may dem dong, nhung voi mat nguoi thi no khong noi gi");
  ok("truong dong-khi bo trong van tinh la chua khai");
}

/* ---- 3. Chiều XANH: đủ trường thì không kêu ai ---- */
{
  const text = so(muc("N-01", "lệnh: node tests/x.mjs xanh"), muc("N-02", "đức: chốt có cần bảng đếm không"));
  assert.deepEqual(thieuDongKhi(text), [], "du truong thi khong duoc bao oan");
  ok("du truong dong-khi: khong bao oan mot muc nao");
}

/* ---- 4. Chỉ soi `## N-`. Mục `## Y-` và bản mẫu `## N-xx` được miễn ----
 *
 * 14 mục `Y-` chuyển từ `IDEAS.md` ra đời TRƯỚC luật này, và sửa chúng là sửa chữ của phiên
 * khác. Bản mẫu trong khối mã viết `## N-xx` — không phải số, nên nó rơi ra ngoài. */
{
  const text = so(
    "## Y-03 · mục chuyển từ sổ ý tưởng, không khai đóng khi",
    "## N-xx · <bản mẫu trong khối mã>",
    "## N-99 · một mục thật",
    `${TRUONG_DONG_KHI} lệnh: node tests/x.mjs xanh`
  );
  assert.deepEqual(docMuc(text).map((m) => m.ma), ["N-99"], "chi soi ## N-<so>, bo qua Y- va ban mau N-xx");
  assert.deepEqual(thieuDongKhi(text), [], "Y-03 khong khai ma van phai xanh — no duoc mien");
  ok("mien muc Y- va ban mau N-xx, chi soi ## N-<so>");
}

/* ---- 5. Tiêu đề THIẾU dấu phân cách vẫn bị soi ----
 *
 * Bản cũ cắt bằng `\n## N-[0-9]`, tức nhận mọi tiêu đề `## N-<số>`. Đòi thêm dấu `·` là làm
 * phép kiểm hở ra: một mục viết thiếu dấu sẽ lọt qua mà không ai biết. */
{
  const text = so("## N-07 khong co dau cham giua", "- **vùng:** `_code`");
  assert.deepEqual(thieuDongKhi(text), ["N-07"], "thieu dau phan cach thi VAN bi soi, khong duoc lot");
  ok("tieu de thieu dau phan cach van bi soi — phep kiem khong ho ra");
}

/* ---- 6. Chạy thật: mã thoát 1 khi thiếu, 0 khi đủ ----
 *
 * Cổng đóng phiên đọc MÃ THOÁT, không đọc chữ in ra. Một bộ kiểm in "thiếu 2 mục" rồi thoát 0
 * là một bộ kiểm không chặn gì cả. */
{
  const thu = fs.mkdtempSync(path.join(os.tmpdir(), "backlog-check-"));
  const chay = (text) => {
    const f = path.join(thu, "BACKLOG.md");
    fs.writeFileSync(f, text, "utf8");
    try {
      execFileSync(process.execPath, [BO_KIEM, f], { encoding: "utf8", stdio: "pipe" });
      return 0;
    } catch (e) { return e.status; }
  };
  assert.equal(chay(so(muc("N-01", "lệnh: node tests/x.mjs xanh"))), 0, "du truong thi ma thoat 0");
  assert.equal(chay(so(muc("N-01", null))), 1, "thieu truong thi ma thoat 1 — neu khong thi cong khong chan gi");
  fs.rmSync(thu, { recursive: true, force: true });
  ok("ma thoat: 0 khi du, 1 khi thieu");
}

/* ---- 7. Sổ THẬT ở gốc repo phải xanh ---- */
{
  const { tong, thieu } = kiemSo(fs.readFileSync(path.join(ROOT, "BACKLOG.md"), "utf8"));
  assert.ok(tong >= 3, `so that phai co it nhat 3 muc N-, dem duoc ${tong}`);
  assert.deepEqual(thieu, [], `so that dang thieu truong dong-khi o: ${thieu.join(" ")}`);
  ok(`so that o goc repo: ${tong} muc N-, khong muc nao thieu truong dong-khi`);
}

/* ---- 8. `package.json` PHẢI còn gọi bộ kiểm này ----
 *
 * Đây là phép ghim mà N-01 sinh ra để đòi. Không có nó thì gỡ bộ kiểm khỏi cổng là một luật
 * biến mất trong im lặng — chính xác cái đã xảy ra được mô tả trong sổ nợ. */
{
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
  const GOI = "scripts/backlog-check.mjs";
  assert.ok(String(pkg.scripts.test).includes(GOI),
    "scripts.test phai con goi backlog-check.mjs — go no ra la luat bien mat trong im lang");
  assert.ok(String(pkg.scripts["test:backlog"] ?? "").includes(GOI),
    "scripts.test:backlog phai goi backlog-check.mjs, khong duoc giu ban sao thu hai cua cung mot luat");
  assert.ok(String(pkg.scripts.test).includes("tests/backlog-check-smoke.mjs"),
    "scripts.test phai chay ca phep ghim nay — mot phep ghim khong ai chay thi cung chi la binh luan");
  ok("package.json con goi bo kiem VA phep ghim cua no");
}

console.log(`\n${passed} passed, 0 failed, ${passed} total`);
