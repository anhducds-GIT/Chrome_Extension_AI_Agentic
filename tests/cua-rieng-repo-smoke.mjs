/* CỬA RIÊNG CỦA REPO NÀY — chúng còn sống không? (`N-68`)
 *
 * ══ VÌ SAO FILE NÀY TỒN TẠI, và vì sao nó KHÔNG nằm trong `claim-smoke.mjs` ══
 *
 * Repo này chạy trên một bộ khung dùng chung (`Ark_Repo_Harness`), và nó tự thêm cửa vào
 * những file mà **bộ khung sở hữu**. Mỗi lượt migrate là một lượt ghi đè. Đo 17/09, đúng một
 * lượt migrate (`4da1e9e5`, khung 0.3.0 → 1.8.0, 09/09) đã lấy mất hai cửa:
 *
 *   `claim.mjs --khai-vung`      chốt + dựng + ghim 08/09 (`38574081`, đóng `N-41`)
 *   `handoff.mjs --cat --giu`    chốt + dựng + ghim 09/09 (`e2322e47`, đóng `N-53`)
 *
 * **Cả hai đều CÓ phép ghim, và cả hai phép ghim đều không kêu.** Đó mới là bài học, không
 * phải chuyện mất cửa:
 *
 *   · `tests/claim-smoke.mjs` vỡ ở bước **import** (`does not provide an export named
 *     'BASELINE'`) và đang nằm trong khu cách ly `npm run test:chet`. Một phép ghim bị cách ly
 *     trông **y hệt** một phép ghim đang canh: cả hai đều không làm cổng đỏ.
 *   · `tests/handoff-smoke.mjs` bị **chính lượt migrate ghi đè** (164 dòng đổi, 122 xoá), nên
 *     khối ghim của `N-53` đi cùng cửa mà nó canh. Phép ghim và thứ nó canh chết chung một
 *     lượt là trường hợp tệ nhất: không có ai sống sót để kêu.
 *
 * Nên file này có MỘT luật viết ra thành tên: **phép ghim cho một cửa riêng của repo phải nằm
 * ở file mà bộ khung KHÔNG có bản của nó.** Tên `cua-rieng-repo-smoke.mjs` không tồn tại ở
 * upstream. Lượt migrate sau sẽ thay `claim.mjs` và `handoff.mjs` lần nữa — file này thì không,
 * nên nó sẽ ĐỎ, và đỏ đúng ngày hôm đó.
 *
 * ══ NÓ ĐO GÌ ══
 *
 * ① Cửa còn **được nối vào CLI** — chạy thật, xem mã thoát và chữ ra, không grep mã nguồn.
 *    Grep bắt được "chuỗi `--khai-vung` còn trong file"; nó KHÔNG bắt được "khối lệnh còn nối
 *    vào `main()`". Đúng cái bẫy ① mà `MULTIFLOW.md` mục 5 ghi: *ghim hàm không thay được ghim
 *    đường đi.*
 * ② Cửa đã **NGHỈ** thì phải nổ, không được thoát 0. Một cửa mất mà báo lỗi thì người ta sửa;
 *    một cửa mất mà thoát 0 thì người ta tin.
 * ③ Không lượt chạy nào của phép ghim này được **ghi vào `.agents/claims.json`** — nó là
 *    trạng thái sống của mọi lane khác.
 *
 * Chạy: `node tests/cua-rieng-repo-smoke.mjs`
 */

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BANG_QUYEN = path.join(ROOT, ".agents", "claims.json");

/* Chụp bảng quyền TRƯỚC mọi lượt chạy. Vế ③ so lại ở cuối. Đọc byte, không parse — một lượt
   ghi làm đổi thứ tự khoá mà giữ nguyên nội dung vẫn là một lượt ghi. */
const BANG_TRUOC = fs.readFileSync(BANG_QUYEN);

/* Chạy một lệnh và trả { ma, ra } — KHÔNG ném khi mã thoát khác 0, vì ở đây "thoát 3" là
   kết quả mong đợi chứ không phải sự cố. */
const chay = (lenh, ...doi) => {
  try {
    const ra = execFileSync(process.execPath, [path.join(ROOT, "scripts", lenh), ...doi], {
      cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
    });
    return { ma: 0, ra };
  } catch (loi) {
    return { ma: loi.status ?? -1, ra: `${loi.stdout ?? ""}${loi.stderr ?? ""}` };
  }
};

let so = 0;
const ok = (ten) => { so += 1; console.log(`  ok  ${ten}`); };

/* ---- ① `claim.mjs --khai-vung` — cửa CÒN SỐNG ------------------------------------------
 *
 * Gọi bằng một khoá CHẮC CHẮN bị từ chối, nên lượt chạy không ghi gì. Thứ đo được là: lệnh
 * đi tới ĐÚNG khối xử lý của `--khai-vung` (mã lỗi riêng `KHONG_KHAI_DUOC`, thoát 3), chứ
 * không rơi xuống bảng hướng dẫn dùng chung (thoát 2) — đó đúng là cách cửa này chết lần
 * trước: nó không báo lỗi gì cả, nó chỉ in bảng `Dùng: --take|--release`. */
{
  const r = chay("claim.mjs", "--khai-vung", "khoa-khong-bao-gio-co-that", "--as", "phep-ghim-cua-rieng");
  assert.ok(
    !/Dùng: node scripts\/claim\.mjs --take\|--release/.test(r.ra),
    "CUA_DA_MAT: `--khai-vung` rơi xuống bảng hướng dẫn chung — khối lệnh của nó KHÔNG còn nối "
      + `vào CLI. Đây đúng cách nó biến mất ngày 09/09; xem N-68.\n--- lệnh in ra ---\n${r.ra}`,
  );
  assert.match(
    r.ra, /KHONG_KHAI_DUOC/,
    `CUA_DA_MAT: không thấy mã \`KHONG_KHAI_DUOC\` — cửa \`--khai-vung\` không còn.\n${r.ra}`,
  );
  assert.equal(r.ma, 3, `\`--khai-vung\` với khoá sai phải thoát 3 (TỪ CHỐI), nhận ${r.ma}.\n${r.ra}`);
  ok("claim.mjs --khai-vung còn nối vào CLI, và từ chối đúng cách");
}

/* Vế NGƯỢC — và nó là vế đắt hơn. Không có nó thì một bản `--khai-vung` **luôn từ chối** vẫn
   qua sạch phép ghim trên. Khoá đã có trong bảng phải cho ra `KHOA_DA_CO`, tức lệnh đọc được
   bảng quyền thật chứ không từ chối mù. */
{
  const r = chay("claim.mjs", "--khai-vung", "_root", "--as", "phep-ghim-cua-rieng");
  assert.match(
    r.ra, /KHOA_DA_CO/,
    `\`--khai-vung _root\` phải nói KHOA_DA_CO — nếu nó cũng trả KHONG_KHAI_DUOC thì lệnh đang `
      + `từ chối MÙ, không hề đọc bảng quyền.\n${r.ra}`,
  );
  ok("claim.mjs --khai-vung đọc bảng quyền thật (khoá đã có ≠ khoá không khai được)");
}

/* Lõi quyết định, kiểm thẳng — ba nhánh, mỗi nhánh một lý do khác nhau. Phần trên chứng minh
   *đường đi* còn nối; phần này chứng minh *luật* còn đúng. Cần cả hai: repo này đã có một lần
   hàm trả đúng mà nơi gọi lờ đi. */
{
  const { kiemKhoaKhaiDuoc } = await import("../scripts/claim.mjs");
  const { claimPrefixesFrom, readStructureFromDisk } = await import("../scripts/repo-structure.mjs");
  /* Dùng CẤU HÌNH THẬT, không dựng bản giả. Bản giả đầu tiên tôi viết ở đây bị chính
     `stewardOf()` ném ra (`steward` phải bắt đầu bằng `_`) — tức bản giả đang khai một cấu
     hình repo này sẽ không bao giờ chấp nhận, và một phép ghim chạy trên cấu hình không có
     thật thì nó đang ghim thứ khác. */
  const cauTruc = readStructureFromDisk(ROOT);
  const that = { structure: cauTruc, prefixes: claimPrefixesFrom(cauTruc), coThuMuc: () => true };

  assert.equal(kiemKhoaKhaiDuoc("  ", that).ok, false, "tên khoá rỗng phải bị từ chối");
  assert.equal(kiemKhoaKhaiDuoc("co-khoang-trang ", that).ok, false, "tên khoá dính khoảng trắng phải bị từ chối");

  /* Nhánh "chưa công nhận là một vùng": một tên không có trong `areas` phải quy về vùng bao
     ngoài, nên `stewardOf` trả khác chính nó. */
  const chuaCongNhan = kiemKhoaKhaiDuoc("khoa-khong-bao-gio-co-that", that);
  assert.equal(chuaCongNhan.ok, false, "khoá chưa khai trong `areas` phải bị từ chối");
  assert.match(chuaCongNhan.ly_do, /chưa công nhận/, "lý do phải nói ĐÚNG nhánh nào chặn");

  /* Nhánh "chưa có thư mục": dùng một khoá vùng THẬT, chỉ giả mỗi phép hỏi đĩa. Nếu hai nhánh
     này trả cùng một câu thì phép ghim trên vô nghĩa — nên khẳng định chúng KHÁC nhau. */
  const khoaThat = "workers/duc-scouter";
  const khongCoThuMuc = kiemKhoaKhaiDuoc(khoaThat, { ...that, coThuMuc: () => false });
  assert.equal(khongCoThuMuc.ok, false, "vùng chưa có thư mục trên đĩa phải bị từ chối");
  assert.match(khongCoThuMuc.ly_do, /chưa có trên đĩa/, "lý do từ chối phải nói ĐÚNG nhánh nào chặn");
  assert.notEqual(chuaCongNhan.ly_do, khongCoThuMuc.ly_do, "hai nhánh từ chối phải nói hai câu khác nhau");

  /* Và vế THUẬN — thiếu nó thì một bản `return {ok:false}` vô điều kiện vẫn qua sạch. */
  assert.equal(kiemKhoaKhaiDuoc(khoaThat, that).ok, true, `"${khoaThat}" là vùng thật, có trên đĩa — phải ĐƯỢC khai`);

  ok("kiemKhoaKhaiDuoc: 4 nhánh chặn + 1 nhánh thuận, mỗi nhánh một câu riêng");
}

/* ---- ② `handoff.mjs --cat` — cửa ĐÃ NGHỈ, và nó phải NỔ ---------------------------------
 *
 * Cửa này KHÔNG được khôi phục (có `--rotate` theo tháng và `npm run don` theo ngân sách rồi —
 * `AGENTS.md` giới hạn ⑴ cấm cài một tính năng hai lần). Thứ phải giữ là: nó **nổ**. Bản
 * trước nuốt im lặng mọi cờ lạ và thoát 0, nên bốn nơi trong repo vẫn dạy một câu lệnh
 * "chạy được" mà không cắt gì. */
{
  const r = chay("handoff.mjs", "--cat", "HANDOFF.md", "--giu", "20");
  assert.notEqual(
    r.ma, 0,
    "CO_LA_BI_NUOT: `handoff.mjs --cat` thoát 0. Cửa đó đã mất từ 09/09 mà vẫn báo thành công — "
      + `đúng cái làm nó vô hình 8 ngày. Xem N-68.\n${r.ra}`,
  );
  assert.match(r.ra, /CO_LA/, `phải nói rõ CO_LA, đừng chỉ thoát khác 0.\n${r.ra}`);
  assert.match(
    r.ra, /npm run don/,
    `câu lỗi phải KỂ TÊN đường còn sống — một lời từ chối không kèm lối đi là một ngõ cụt.\n${r.ra}`,
  );
  ok("handoff.mjs --cat nổ, và câu lỗi chỉ sang đường còn sống");
}

/* Vế NGƯỢC: cửa còn sống KHÔNG được vạ lây. Thiếu vế này thì một bản "từ chối mọi thứ" vẫn
   qua sạch. */
{
  const r = chay("handoff.mjs", "--check");
  assert.equal(r.ma, 0, `\`--check\` là cờ hợp lệ, không được nổ.\n${r.ra}`);
  assert.doesNotMatch(r.ra, /CO_LA/, "cờ hợp lệ không được báo CO_LA");
  ok("handoff.mjs --check không bị vạ lây");
}

/* ---- ③ Không lượt chạy nào chạm bảng quyền ---------------------------------------------- */
{
  assert.ok(
    BANG_TRUOC.equals(fs.readFileSync(BANG_QUYEN)),
    "PHEP_GHIM_GHI_BAY: phép ghim này vừa ghi vào `.agents/claims.json` — đó là trạng thái SỐNG "
      + "của mọi lane khác. Mọi lượt chạy ở đây phải là lượt BỊ TỪ CHỐI.",
  );
  ok("không lượt chạy nào chạm .agents/claims.json");
}

console.log(`cua-rieng-repo-smoke: ${so} phép — XANH`);
