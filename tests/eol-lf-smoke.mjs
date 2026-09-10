/* Phép kiểm ghim cho `Y-17` — kiểu xuống dòng của repo phải là LF, ở mọi máy.
 *
 * Vì sao đáng ghim: ngày 05/09 một phép thử của gói Flow Video XANH với người vừa sửa file và
 * ĐỎ ngay sau một lượt `git checkout`. Nguyên nhân không nằm trong kho — kho vốn sạch LF — mà
 * nằm ở `core.autocrlf=true` đặt trên máy, khiến `git checkout` viết ra đĩa bản CRLF từ một
 * blob LF. Đó là loại xanh giả tệ nhất: xanh với người sửa, đỏ với người kiểm.
 *
 * `.gitattributes` với `* text=auto eol=lf` thắng `core.autocrlf`, nên đĩa và kho luôn khớp.
 * File này ghim đúng hai điều đó, và ghim bằng THƯỚC CỦA GIT (`git ls-files --eol`) chứ không
 * tự đếm byte: chính lượt sửa 06/09 đã bị một thước tự chế nói dối (perl đọc STDIN ở chế độ
 * text trên Windows nuốt sạch CR rồi báo "0 CRLF" ở cả hai phía).
 *
 * Đối chứng âm bắt buộc: nếu thước khớp 0 dòng thì đó là thước hỏng, không phải repo sạch.
 */

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

let passed = 0;
const ok = (name) => { passed += 1; console.log(`  ok  ${name}`); };

/* ---- 1. `.gitattributes` còn giữ luật nền ------------------------------- */
{
  const noiDung = readFileSync(path.join(GOC, ".gitattributes"), "utf8");
  const coLuatNen = noiDung
    .split("\n")
    .map((d) => d.replace(/#.*$/, "").trim())
    .some((d) => /^\*\s+text=auto\s+eol=lf$/.test(d));
  assert.ok(coLuatNen,
    "`.gitattributes` phai con dong `* text=auto eol=lf` — do la thu thang core.autocrlf");
  ok(".gitattributes giu luat nen `* text=auto eol=lf`");
}

/* ---- 2. không blob nào trong kho mang CRLF, không file nào trên đĩa mang CRLF ---- */
{
  const raw = execFileSync("git", ["ls-files", "--eol"], {
    cwd: GOC, encoding: "utf8", maxBuffer: 1 << 28
  });
  const dong = raw.split("\n").filter(Boolean);

  // ĐỐI CHỨNG ÂM — thước khớp 0 dòng nghĩa là thước hỏng, không phải repo sạch.
  assert.ok(dong.length > 100,
    `thuoc hong: \`git ls-files --eol\` chi tra ${dong.length} dong, khong the la ca repo`);

  const xau = { kho: [], dia: [] };
  let soKhaiCrlf = 0;
  for (const d of dong) {
    const m = /^i\/(\S+)\s+w\/(\S+)\s+attr\/(.*?)\t(.*)$/.exec(d);
    assert.ok(m, `khong doc duoc dong \`git ls-files --eol\`: ${d}`);
    const [, iEol, wEol, thuocTinh, duongDan] = m;
    /* `.bat` PHAI la CRLF tren dia — cmd.exe khong doc duoc tep lenh dung LF (do 10/09:
       cat dong sai, bao `'t' is not recognized`). Nen o day KHONG cam CRLF tren dia mot
       cach mu quang; chi cam CRLF mà KHONG AI KHAI. Thuoc van la thuoc cua git: doc chinh
       cot `attr/` no in ra, khong tu doan theo duoi tep. Ben KHO thi luat khong doi —
       moi blob van phai la LF, ke ca `.bat`. */
    const khaiCrlf = /\beol=crlf\b/.test(thuocTinh);
    if (khaiCrlf) soKhaiCrlf += 1;
    if (iEol === "crlf" || iEol === "mixed") xau.kho.push(`${duongDan} (i/${iEol})`);
    if (!khaiCrlf && (wEol === "crlf" || wEol === "mixed")) xau.dia.push(`${duongDan} (w/${wEol})`);
  }
  /* DOI CHUNG AM cho chinh cua mien tru: khong con tep nao khai eol=crlf thi cua nay da
     thanh mot nhanh chet, va lan sau ai do them `.bat` se khong biet no ton tai. */
  assert.ok(soKhaiCrlf > 0,
    "khong tep nao khai `eol=crlf` — cua mien tru nay dang la nhanh chet, xoa no hoac xem lai `.gitattributes`");

  assert.deepEqual(xau.kho, [],
    `co blob mang CRLF trong git — chay \`git add --renormalize .\`:\n  ${xau.kho.join("\n  ")}`);
  ok(`trong git: ${dong.length} file, 0 CRLF, 0 lan lon`);

  // Đĩa lệch kho thì `git checkout` sẽ tái sinh đúng cái bug gốc. Ghim luôn.
  assert.deepEqual(xau.dia, [],
    `co file mang CRLF tren dia — xoa roi \`git checkout --\` lai:\n  ${xau.dia.join("\n  ")}`);
  ok(`tren dia: ${dong.length} file, 0 CRLF, 0 lan lon`);
}

console.log(`\n${passed} passed, 0 failed, ${passed} total`);
