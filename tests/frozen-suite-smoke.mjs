#!/usr/bin/env node
/* frozen-suite-smoke.mjs — ghim cờ `frozen` và phép chọn suite.
 *
 * Vì sao file này nằm RIÊNG, không nằm trong `session-check.mjs`: việc sửa lần này SỬA CHÍNH CỔNG
 * KIỂM, nên nếu tiêu chuẩn chấm nó cũng nằm trong cổng thì bản sửa tự chấm mình (ADR-0019 ⑸).
 *
 * Trước 07/09 cờ `frozen` chỉ là chữ — `.repo-structure.json` tự khai *"cờ này HIỆN CHƯA CÓ PHÉP
 * GHIM NÀO CANH"*. Nên gỡ cờ đi thì không test nào đỏ. File này là phép ghim đó.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chonSuiteBoDongBang, frozenFrom, PHU_THUOC_CHUNG_DONG_BANG } from "../scripts/repo-structure.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

let dat = 0;
const ok = (ten, fn) => {
  fn();
  dat += 1;
  console.log(`  ok   ${ten}`);
};

const LENH_DONG_BANG = { cmd: "node workers/duc-auto-chatgpt/v0.1.0/tests/run-all.mjs", nhan: null };
const LENH_SONG = { cmd: "node workers/duc-scouter/v0.1.0/tests/run-all.mjs", nhan: null };
const LENH_GOC = { cmd: "node tests/build-dashboard-smoke.mjs", nhan: null };
const BA_LENH = [LENH_DONG_BANG, LENH_SONG, LENH_GOC];
const DONG_BANG = ["workers/duc-auto-chatgpt"];

const chon = (o) => chonSuiteBoDongBang({ chacChanDoDuocCham: true, ...o });

/* ---- frozenFrom: đọc cấu hình, và TỪ CHỐI cấu hình hỏng thay vì đoán ---- */

ok("không khai `frozen` thì không gói nào đóng băng", () => {
  assert.deepEqual(frozenFrom({}), []);
  assert.deepEqual(frozenFrom(undefined), []);
});

ok("chuẩn hoá dấu gạch chéo và bỏ dấu gạch cuối", () => {
  assert.deepEqual(frozenFrom({ frozen: ["workers\\a\\", "workers/b/"] }), ["workers/a", "workers/b"]);
});

ok("cấu hình hỏng thì NỔ, không lặng lẽ coi như rỗng", () => {
  // Coi cấu hình hỏng là "rỗng" nghĩa là một lỗi gõ tay làm cờ mất tác dụng mà không ai biết.
  assert.throws(() => frozenFrom({ frozen: "workers/a" }), /FROZEN_HONG/);
  assert.throws(() => frozenFrom({ frozen: [""] }), /FROZEN_HONG/);
  assert.throws(() => frozenFrom({ frozen: [123] }), /FROZEN_HONG/);
  assert.throws(() => frozenFrom({ frozen: ["/tuyet/doi"] }), /FROZEN_HONG/);
  assert.throws(() => frozenFrom({ frozen: ["workers/../ra-ngoai"] }), /FROZEN_HONG/);
});

/* ---- chọn suite: bỏ đúng cái cần bỏ, giữ đúng cái cần giữ ---- */

ok("gói đóng băng KHÔNG ai chạm thì suite của nó bị bỏ qua", () => {
  // `daCham` phải là chỗ NGOÀI vùng chung — `scripts/` nay là vùng chung, nên dùng nó ở đây
  // sẽ làm phép kiểm này đo sai thứ nó muốn đo.
  const r = chon({ menhLenh: BA_LENH, frozen: DONG_BANG, daCham: ["docs/README.md"] });
  assert.equal(r.boQua.length, 1);
  assert.equal(r.boQua[0].goi, "workers/duc-auto-chatgpt");
  assert.deepEqual(r.chay, [LENH_SONG, LENH_GOC]);
});

ok("CHẠM vào gói đóng băng thì suite của nó CHẠY LẠI ngay", () => {
  // Vế chịu tải. Gói đóng băng là chỉ-đọc, nên suite của nó chỉ đỏ được khi có người vừa chạm —
  // và đúng lúc đó nó là phép kiểm CẦN NHẤT, không phải phép kiểm thừa.
  const r = chon({
    menhLenh: BA_LENH,
    frozen: DONG_BANG,
    daCham: ["workers/duc-auto-chatgpt/v0.1.0/sidepanel.js"]
  });
  assert.deepEqual(r.boQua, []);
  assert.deepEqual(r.chay, BA_LENH);
});

ok("suite của gói SỐNG không bao giờ bị bỏ", () => {
  const r = chon({ menhLenh: BA_LENH, frozen: ["workers/duc-scouter", ...DONG_BANG], daCham: [] });
  assert.ok(r.boQua.some((m) => m.cmd === LENH_SONG.cmd), "khai đóng băng thì mới được bỏ");
  const r2 = chon({ menhLenh: BA_LENH, frozen: DONG_BANG, daCham: [] });
  assert.ok(r2.chay.includes(LENH_SONG), "không khai đóng băng thì phải chạy");
});

ok("FAIL-CLOSED: không đo chắc được ai chạm gì thì CHẠY HẾT", () => {
  // `origin/main` không phân giải được thì danh sách commit chưa đẩy RỖNG OAN. Bỏ suite dựa trên
  // một phép đo rỗng oan là đúng cách mất một phép kiểm mà không ai biết.
  const r = chonSuiteBoDongBang({
    menhLenh: BA_LENH, frozen: DONG_BANG, daCham: [], chacChanDoDuocCham: false
  });
  assert.deepEqual(r.boQua, []);
  assert.deepEqual(r.chay, BA_LENH);
});

ok("khớp theo RANH GIỚI thư mục, không khớp theo tiền tố chuỗi", () => {
  // `workers/duc-auto-chatgptX/` KHÔNG phải là chạm vào `workers/duc-auto-chatgpt`.
  const r = chon({
    menhLenh: BA_LENH, frozen: DONG_BANG,
    daCham: ["workers/duc-auto-chatgptX/a.js", "workers/duc-auto-chatgpt-cu/b.js"]
  });
  assert.equal(r.boQua.length, 1, "hai đường dẫn na ná không được tính là chạm");
});

ok("không khai gói đóng băng nào thì không bỏ gì", () => {
  const r = chon({ menhLenh: BA_LENH, frozen: [], daCham: [] });
  assert.deepEqual(r.boQua, []);
  assert.deepEqual(r.chay, BA_LENH);
});

/* ---- Cấu hình THẬT của repo này phải còn đúng ---- */

/* KHÔNG CÒN ĐÒI `length > 0` — Đức mở băng toàn bộ 2026-09-08 (ADR-0024), nên danh sách nay
   RỖNG một cách hợp lệ. Đây KHÔNG phải nới lỏng để cổng xanh (luật vàng 3): sự thật đổi, nên
   phép kiểm phải hỏi lại câu đúng.

   Câu cũ *"danh sách không được rỗng"* trói phép kiểm vào một trạng thái NHẤT THỜI của repo —
   cùng cái bẫy đã cắn ở bộ khung, nơi ba phép ghim đỏ oan trong một repo mới sinh vì chúng đòi
   nhật ký phải có mục. Câu đúng là câu còn nghĩa ở CẢ HAI trạng thái: **khoá `frozen` phải còn
   được KHAI**, và **mọi mục trong đó phải nhất quán**.

   Cơ chế vẫn được ghim đầy đủ — bởi các ca dựng bằng dữ liệu tổng hợp ở trên, thứ không mục
   theo việc hôm nay Đức đóng băng gói nào. */
ok("khối `frozen` thật: còn được khai, trỏ vào gói CÓ TỒN TẠI, và không chứa gói sống", () => {
  const cauHinh = JSON.parse(fs.readFileSync(path.join(ROOT, ".repo-structure.json"), "utf8"));
  assert.ok(Array.isArray(cauHinh.frozen),
    "khoá `frozen` phải còn được khai (mảng, rỗng cũng được) — gỡ hẳn nó đi là gỡ cả công tắc, "
    + "và lần sau Đức muốn đóng băng lại thì phải dựng lại từ đầu");
  const dongBang = frozenFrom(cauHinh);
  for (const g of dongBang) {
    assert.ok(fs.existsSync(path.join(ROOT, g)),
      `khai đóng băng '${g}' mà thư mục không tồn tại — cờ trỏ vào chỗ trống thì nó không bỏ được gì`);
  }
  // Gói sống KHÔNG được nằm trong danh sách: đó là gói duy nhất đang được ghi, nên suite của nó
  // là phép kiểm đắt giá nhất chứ không phải phép kiểm bỏ được.
  for (const song of ["workers/duc-scouter", "workers/hnx-fetch"]) {
    assert.ok(!dongBang.includes(song),
      `gói SỐNG "${song}" bị khai đóng băng — suite của nó sẽ không chạy nữa`);
  }
});

/* ---- Vùng chung: chạm vào là chạy hết, và danh sách vùng chung KHÔNG được mục ---- */

ok("chạm VÙNG CHUNG thì suite gói đóng băng chạy lại, dù gói không đổi", () => {
  // Phiên Codex bác đúng câu "gói không đổi thì suite chỉ có thể xanh": thứ NGOÀI gói vẫn đổi
  // được. Đo 07/09: một gói đóng băng import `scripts/repo-structure.mjs`.
  for (const f of ["scripts/repo-structure.mjs", "package.json", ".repo-structure.json"]) {
    const r = chon({ menhLenh: BA_LENH, frozen: DONG_BANG, daCham: [f] });
    assert.deepEqual(r.boQua, [], `chạm '${f}' mà vẫn bỏ suite gói đóng băng`);
    assert.deepEqual(r.chay, BA_LENH);
  }
});

ok("chạm chỗ KHÔNG phải vùng chung thì vẫn bỏ được", () => {
  // Không có vế này thì "chạy hết cho chắc" sẽ ăn hết phần tiết kiệm mà không ai thấy.
  const r = chon({ menhLenh: BA_LENH, frozen: DONG_BANG, daCham: ["docs/README.md", "HANDOFF.md"] });
  assert.equal(r.boQua.length, 1);
});

ok("gói đóng băng không dẫn ra chỗ ngoài danh sách — trong phạm vi IMPORT NHẬN DIỆN ĐƯỢC", () => {
  /* Phép ghim này thu hẹp một chỗ mục, KHÔNG khoá hết. Phiên Codex (#20) chỉ đúng giới hạn của nó
   * và tôi nhận: nó dò bằng **biểu thức tìm chuỗi trên `import` / `require` tĩnh**, nên nó KHÔNG
   * thấy `import()` động, cũng không thấy file được đọc bằng `fs`. Nên gọi nó là *"kiểm các import
   * nhận diện được"* — đừng đọc thành *"danh sách không thể mục"*.
   *
   * Vẫn đáng có: đường phụ thuộc đã tìm được thật hôm nay là một `import` tĩnh, và loại đó thì
   * phép này bắt. Chưa dựng bộ phân tích phụ thuộc đầy đủ — Codex cũng nói chưa cần. */
  const cauHinh = JSON.parse(fs.readFileSync(path.join(ROOT, ".repo-structure.json"), "utf8"));
  const dongBang = frozenFrom(cauHinh);
  const RE = /(?:from|import|require\()\s*["']([^"']+)["']/g;

  const lechRaNgoai = [];
  const diTung = (thuMuc) => {
    for (const e of fs.readdirSync(thuMuc, { withFileTypes: true })) {
      const day = path.join(thuMuc, e.name);
      if (e.isDirectory()) { if (e.name !== "node_modules") diTung(day); continue; }
      if (!/\.(mjs|js|cjs)$/.test(e.name)) continue;
      const nguon = fs.readFileSync(day, "utf8");
      for (const m of nguon.matchAll(RE)) {
        const dich = m[1];
        if (!dich.startsWith(".")) continue; // gói node hoặc `node:` — không phải file trong repo
        const tuyetDoi = path.resolve(path.dirname(day), dich);
        const tuongDoi = path.relative(ROOT, tuyetDoi).replaceAll("\\", "/");
        const goi = dongBang.find((g) => tuongDoi === g || tuongDoi.startsWith(`${g}/`));
        if (goi) continue; // vẫn trong gói đóng băng nào đó — không phải dẫn ra ngoài
        const daKhai = PHU_THUOC_CHUNG_DONG_BANG.some((c) =>
          (c.endsWith("/") ? tuongDoi.startsWith(c) : tuongDoi === c));
        if (!daKhai) {
          lechRaNgoai.push(`${path.relative(ROOT, day).replaceAll("\\", "/")} → ${tuongDoi}`);
        }
      }
    }
  };
  for (const g of dongBang) diTung(path.join(ROOT, g));

  assert.deepEqual(lechRaNgoai, [],
    "gói đóng băng có một IMPORT TĨNH dẫn ra chỗ chưa khai trong PHU_THUOC_CHUNG_DONG_BANG — "
    + "suite của nó sẽ bị bỏ qua đúng lúc thứ nó phụ thuộc vừa đổi. Khai thêm chỗ đó vào hằng số.");
});

ok("`session-check.mjs` thật sự GỌI phép chọn này", () => {
  // Không có vế này thì hàm trên có thể đúng hoàn hảo mà cổng không hề dùng nó — đúng dạng
  // "gỡ chỗ gọi thì mọi test vẫn xanh" đã ghi trong bộ nhớ dài hạn.
  const nguon = fs.readFileSync(path.join(ROOT, "scripts", "session-check.mjs"), "utf8");
  assert.match(nguon, /chonSuiteBoDongBang\(\{/, "cổng phải gọi chonSuiteBoDongBang");
  assert.match(nguon, /frozenFrom\(/, "cổng phải đọc khối `frozen` từ cấu hình");
  assert.match(nguon, /chacChanDoDuocCham:\s*originMainResolves/,
    "vế fail-closed phải nối vào `originMainResolves`, không phải hằng `true`");
});

console.log(`\n${dat} passed, 0 failed, ${dat} total`);
