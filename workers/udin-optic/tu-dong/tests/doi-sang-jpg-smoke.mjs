/* Phép ghim cho lượt đổi `.webp` → `.jpg`.
 *
 * Khối ⓐ CHẠY THẬT `doi-sang-jpg.ps1` — tiến trình thật, WIC thật, tệp thật trên đĩa. Nó phải
 * thật, vì thứ đáng nghi nhất ở đây KHÔNG phải logic JavaScript mà là *"Windows có giải mã và
 * ghi ảnh được không"*. Một máy giả cho câu đó là hỏi chính niềm tin của tôi (`fake-encodes-my-belief`).
 *
 * Nguồn của khối ⓐ là **icon PNG của chính gói này** — có sẵn trong repo, nhỏ, và đi qua ĐÚNG
 * đường mã mà `.webp` đi (bộ đổi không rẽ nhánh theo định dạng; WIC chọn codec). Không cần tạo
 * một tệp `.webp` mẫu, thứ mà Node không mã hoá nổi.
 *
 * Các khối còn lại tiêm một bộ chạy giả, và chúng ghim đúng một câu: **lời khai của bộ đổi
 * không phải bằng chứng.** "Xong" mà tệp không mở đầu `FF D8 FF` là một XANH GIẢ.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { doiSangJpg, laJpegThat, PS1 } from "../doi-sang-jpg.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));

// ⓐ CHẠY THẬT: PowerShell + WIC đổi được ảnh và ghi ra JPEG thật
{
  const tam = fs.mkdtempSync(path.join(os.tmpdir(), "udin-jpg-"));
  const nguon = path.join(HERE, "..", "..", "v0.1.0", "icons", "icon-128.png");
  assert.ok(fs.existsSync(nguon), "không thấy icon nguồn — sửa đường dẫn, đừng bỏ khối này");
  fs.copyFileSync(nguon, path.join(tam, "thu.png"));

  const ra = execFileSync("powershell.exe",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", PS1, "-ThuMuc", tam, "-Duoi", ".png"],
    { encoding: "utf8" });
  const d = JSON.parse(String(ra).trim().split(/\r?\n/).filter(Boolean)[0]);
  assert.equal(d.loi, undefined, `bộ đổi báo lỗi: ${d.loi}`);
  assert.equal(d.ra, "thu.jpg");
  assert.equal(d.rong, 128, "phải giữ nguyên kích thước");
  assert.equal(d.cao, 128);

  const duong = path.join(tam, "thu.jpg");
  assert.ok(laJpegThat(duong), "tệp ra phải mở đầu bằng FF D8 FF");
  assert.equal(fs.statSync(duong).size, d.byteRa, "số byte khai phải bằng số byte trên đĩa");
  assert.ok(fs.existsSync(path.join(tam, "thu.png")), "ảnh GỐC phải còn — xoá dữ liệu gốc là việc phải hỏi Đức");
  fs.rmSync(tam, { recursive: true, force: true });
}

// ⓑ `laJpegThat` phân biệt được hai nhánh, không chỉ "có tệp hay không"
{
  const tam = fs.mkdtempSync(path.join(os.tmpdir(), "udin-jpg2-"));
  const that = path.join(tam, "that.jpg");
  const gia = path.join(tam, "gia.jpg");
  fs.writeFileSync(that, Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]));
  fs.writeFileSync(gia, Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00, 0x00]));   /* RIFF — một tệp webp đổi tên */
  assert.equal(laJpegThat(that), true);
  assert.equal(laJpegThat(gia), false, "đổi ĐUÔI tệp không đổi được định dạng — đây đúng là ca phải bắt");
  assert.equal(laJpegThat(path.join(tam, "khong-co.jpg")), false);
  fs.rmSync(tam, { recursive: true, force: true });
}

/* Bộ chạy giả: trả về các dòng JSON y như `.ps1` in ra. */
const lam = ({ dong = [], root = "C:/vung-ghi", khaiRoot = true } = {}) => {
  const nk = [];
  return {
    nk,
    goi: async (method) => {
      nk.push(method);
      if (method === "host.capabilities") return khaiRoot ? { write_root: root } : {};
      throw new Error("method lạ " + method);
    },
    chay: async (args) => { nk.push(args.at(-3)); return dong.map((d) => JSON.stringify(d)).join("\r\n"); }
  };
};

// ⓒ hỏi máy chủ vùng ghi ở đâu — KHÔNG gõ cứng đường dẫn
{
  const t = lam({ dong: [{ nguon: "a.webp", ra: "a.jpg", byteNguon: 9, byteRa: 8, rong: 4, cao: 4 }] });
  await doiSangJpg("udin-optic/abc", { ...t, }).catch(() => {});
  assert.ok(t.nk.includes("host.capabilities"), "phải hỏi `write_root`; gõ cứng thì Đức đổi --root là sai IM LẶNG");
  const t2 = lam({ khaiRoot: false });
  await assert.rejects(() => doiSangJpg("x", t2), /không biết ảnh nằm ở đâu|write_root/);
}

// ⓓ bộ đổi khai XONG mà tệp không phải JPEG → phải ĐỎ. Đây là khối đắt nhất bộ này.
{
  const t = lam({ dong: [{ nguon: "a.webp", ra: "khong-ton-tai.jpg", byteNguon: 9, byteRa: 8, rong: 4, cao: 4 }] });
  await assert.rejects(() => doiSangJpg("x", t), /KHÔNG phải JPEG/,
    "một lượt đổi khai xong mà không kiểm lại đĩa là đúng cái XANH GIẢ mà bộ này sinh ra để chặn");
}

// ⓔ mỗi ca hỏng nói đúng chuyện của nó
{
  await assert.rejects(() => doiSangJpg("x", lam({ dong: [{ nguon: "a.webp", loi: "codec khong ho tro" }] })),
    /hỏng 1 tệp.*codec khong ho tro/s);
  await assert.rejects(() => doiSangJpg("x", lam({ dong: [{ trong: true, thuMuc: "d" }] })),
    /Không có tệp \.webp nào/, "thư mục rỗng KHÔNG được coi là xong — im lặng ở đây đọc y hệt một lượt chạy tốt");
}

console.log("  · doi-sang-jpg: 5 khối xanh");
