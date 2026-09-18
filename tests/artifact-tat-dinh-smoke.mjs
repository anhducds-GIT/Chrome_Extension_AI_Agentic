/* BẢN SINH ĐÃ COMMIT PHẢI SUY HOÀN TOÀN TỪ HEAD — `N-70`, đóng 18/09.
 *
 * ══ VÌ SAO BÀI NÀY TỒN TẠI ══
 *
 * `build-overview.mjs` nằm trong khối `generators` của `.repo-structure.json`, nên cổng đóng
 * phiên đối chiếu bản đã commit với một bản sinh lại **mỗi lượt chạy**. Một bộ sinh nhìn đồng hồ
 * vì thế không làm hỏng một phiên — nó chặn push của **MỌI** phiên, mỗi khi qua một mốc phút.
 * Chính docblock của file cấm điều đó; `N-70` mở ra vì lời cấm ấy không có ai canh.
 *
 * ══ VÀ MỘT LỜI KHAI CỦA CHÍNH TÔI ĐÃ BỊ ĐO BÁC ══
 *
 * `N-70` viết 18/09 nói *"`build-overview.mjs` NHÌN ĐỒNG HỒ"*, kèm một diff `giữ 47 phút` →
 * `giữ 48 phút`. **Sai vào lúc viết.** Lượt nâng bộ khung `30f8018a` đã thay `new Date()` bằng
 * `mocHEADLuc()` cho đường bản-đã-commit, và `30f8018a` là **tổ tiên** của chính commit ghi
 * `N-70`. Tôi quy một lượt bị từ chối `TRANG_CU` cho đồng hồ mà không đo — nguyên nhân thật là
 * **thứ tự**: sinh bản trước khi commit nguồn thì bản ấy tả HEAD cũ.
 *
 * Nên bài này không vá gì cả. Nó giữ cho một thứ ĐANG ĐÚNG khỏi lặng lẽ hỏng lại — và đó mới là
 * chỗ `N-70` đáng tồn tại.
 *
 * ══ CÁCH ĐO ══
 *
 * Sinh hai lượt trên CÙNG một HEAD, lượt sau với đồng hồ bị đẩy đi (`tests/_dong-ho-lui.mjs`),
 * rồi so TỪNG BYTE. Đẩy đồng hồ thay vì chờ thật: chờ 90 giây thì đúng nhưng không ai giữ nó
 * trong bộ chạy mỗi lượt.
 *
 * VÀ MỘT ĐỐI CHỨNG BẮT BUỘC (vế ②): với `--khoa-song` — bản SỐNG, thứ cố ý hỏi về BÂY GIỜ — hai
 * lượt phải **KHÁC** nhau. Thiếu vế này thì một cái shim đồng hồ hỏng sẽ làm vế ① xanh trọn vẹn,
 * và bài kiểm nói *"tất định"* trong khi nó chỉ đang nói *"tôi không đổi được gì cả"*.
 *
 * Chạy: node tests/artifact-tat-dinh-smoke.mjs
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
/* URL chứ không phải đường dẫn: trên Windows `--import C:\…` bị bộ nạp ESM đọc thành
   lược đồ `c:` và ném ERR_UNSUPPORTED_ESM_URL_SCHEME. */
const SHIM = pathToFileURL(path.join(ROOT, "tests", "_dong-ho-lui.mjs")).href;
const DICH_MS = 37 * 60 * 1000;   // 37 phút: qua nhiều mốc phút, và không tròn giờ

let passed = 0;
const ok = (ten) => { passed += 1; console.log(`  ok  ${ten}`); };

const tam = fs.mkdtempSync(path.join(os.tmpdir(), "tat-dinh-"));
const sinh = (ten, { dich = 0, song = false } = {}) => {
  const ra = path.join(tam, ten);
  const doiSo = dich ? ["--import", SHIM] : [];
  const r = spawnSync(process.execPath, [...doiSo, path.join(ROOT, "scripts", "build-overview.mjs"), ra, ...(song ? ["--khoa-song"] : [])], {
    cwd: ROOT, encoding: "utf8", timeout: 300000,
    env: { ...process.env, ARK_DICH_MS: String(dich) }
  });
  assert.equal(r.status, 0, `sinh trang hỏng (${ten}): ${String(r.stderr || r.stdout).slice(-400)}`);
  return fs.readFileSync(ra);
};

try {
  /* ---- ① BẢN ĐÃ COMMIT: đẩy đồng hồ 37 phút, byte phải y hệt ------------- */
  const a = sinh("a.html");
  const b = sinh("b.html", { dich: DICH_MS });

  if (!a.equals(b)) {
    const da = a.toString("utf8").split("\n");
    const db = b.toString("utf8").split("\n");
    const cho = [];
    for (let i = 0; i < Math.max(da.length, db.length) && cho.length < 3; i += 1) {
      if (da[i] !== db[i]) cho.push(`  dòng ${i + 1}:\n    - ${String(da[i]).trim().slice(0, 160)}\n    + ${String(db[i]).trim().slice(0, 160)}`);
    }
    assert.fail(
      `BAN_SINH_NHIN_DONG_HO: đẩy đồng hồ ${DICH_MS / 60000} phút trên CÙNG một HEAD làm bản ra đổi.\n`
      + `Bản đã commit phải suy HOÀN TOÀN từ HEAD — nó nằm trong \`generators\`, nên một chỗ nhìn\n`
      + `đồng hồ sẽ chặn push của MỌI phiên mỗi khi qua mốc phút đó (N-70).\n${cho.join("\n")}`
    );
  }
  ok(`bản đã commit: đẩy đồng hồ ${DICH_MS / 60000} phút trên cùng HEAD → khớp từng byte (${a.length} B)`);

  /* ---- ② ĐỐI CHỨNG: bản SỐNG phải ĐỔI, nếu không thì shim hỏng ----------- */
  const s1 = sinh("s1.html", { song: true });
  const s2 = sinh("s2.html", { song: true, dich: DICH_MS });
  assert.ok(!s1.equals(s2),
    "ĐỐI CHỨNG HỎNG: bản SỐNG (`--khoa-song`) cố ý hỏi về BÂY GIỜ, nên đẩy đồng hồ PHẢI làm nó "
    + "đổi. Hai bản giống hệt nghĩa là cái shim đồng hồ không ăn — và lúc đó vế ① xanh vì KHÔNG "
    + "ĐO ĐƯỢC GÌ, chứ không phải vì bản sinh tất định.");
  ok("đối chứng: bản SỐNG có đổi theo đồng hồ — nên vế ① thật sự đo được điều nó nói");
} finally {
  fs.rmSync(tam, { recursive: true, force: true });
}

console.log(`\n${passed} passed, 0 failed, ${passed} total`);
