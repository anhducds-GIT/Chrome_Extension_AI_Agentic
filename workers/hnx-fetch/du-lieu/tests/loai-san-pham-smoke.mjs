/* loai-san-pham-smoke.mjs — cờ `--loai` của `tai-ket-qua.mjs` (H-05).
 *
 * ══ VÌ SAO GHIM CHỖ NÀY ══
 *
 * Trước 08/09, loại sản phẩm bị **gõ cứng** trong `tai-ket-qua.mjs`, còn `nguon-hnx.mjs` thì có
 * khai bảng loại. Hai thứ đó nhìn như đã nối với nhau, nhưng không: `PROTOCOL.md` từng khuyên
 * *"gặp FETCH_BODY_TOO_LARGE thì chia nhỏ theo loại sản phẩm"* — một lời khuyên **không làm theo
 * được**, và phải một lượt audit NỘI DUNG mới bắt ra.
 *
 * Bài học ghim ở đây: một bảng có sẵn KHÔNG có nghĩa là có đường dùng nó.
 *
 * ══ CHỖ NGUY HIỂM THẬT, và là lý do khối ⑶ tồn tại ══
 *
 * Trang HNX trả **200 OK kèm cả một trang HTML** khi tham số sai (đo 07/09) — sai tham số ở đây
 * không ra lỗi, nó ra một trang khác. Nên một mã loại gõ sai mà được lặng lẽ thay bằng mặc định
 * sẽ ghi dữ liệu của loại KHÁC vào SSOT, và SSOT thì chỉ nối thêm chứ không sửa lại được.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const LENH = path.join(here, "..", "tai-ket-qua.mjs");
const ma = fs.readFileSync(LENH, "utf8");
const { LOAI_SAN_PHAM } = await import("../nguon-hnx.mjs");

/* ---- ⑴ Cờ tồn tại, và nó thật sự tới được nơi dùng ---------------------- */
{
  assert.match(ma, /const loaiGo = \w+\("loai"\);/, "không đọc cờ --loai");
  assert.match(ma, /createNguonHnx\(\{ loaiSanPham \}\)/,
    "đọc cờ nhưng vẫn dựng nguồn bằng hằng số gõ cứng — cờ có mà không có tác dụng");
  assert.ok(!/createNguonHnx\(\{ loaiSanPham: LOAI_SAN_PHAM\./.test(ma),
    "còn sót đường gõ cứng loại sản phẩm");
}

/* ---- ⑵ Danh sách TỰ SINH từ bảng, không gõ lại ---------------------------
 * Gõ lại là dựng bản sao thứ hai của một bảng. Thêm loại thứ ba ở `nguon-hnx.mjs` mà quên ở
 * đây thì cờ im lặng từ chối nó, và người vận hành không có cách nào biết vì sao. */
{
  assert.match(ma, /Object\.hasOwn\(LOAI_SAN_PHAM, khoa\)/, "không tra bảng bằng tên");
  assert.match(ma, /Object\.values\(LOAI_SAN_PHAM\)/, "không tra bảng bằng mã trang");
  assert.match(ma, /Object\.entries\(LOAI_SAN_PHAM\)/, "câu lỗi không liệt kê từ chính bảng");
  for (const ten of Object.keys(LOAI_SAN_PHAM)) {
    assert.ok(!new RegExp('"' + ten + '"').test(ma) || ten === "CHI_SO_CO_PHIEU",
      `tên loại '${ten}' bị gõ lại thành chuỗi trong tệp lệnh — phải lấy từ bảng`);
  }
}

/* ---- ⑶ Chạy THẬT: mã sai phải DỪNG, không lặng lẽ dùng mặc định ---------
 * Hai khối trên soi mã nguồn nên bắt được "quên viết" mà KHÔNG bắt được "viết sai". Khối này
 * chạy thật tệp lệnh và đọc mã thoát. */
{
  const { execFileSync } = await import("node:child_process");
  const chay = (them) => {
    try {
      execFileSync(process.execPath,
        [LENH, "--pairing", "khong-co.json", "--master", path.join(here, "x.csv"), "--tu", "2026-01-01", "--den", "2026-01-02", ...them],
        { stdio: ["ignore", "pipe", "pipe"] });
      return { ma: 0, loi: "" };
    } catch (e) {
      return { ma: e.status, loi: String(e.stderr || "") };
    }
  };

  const sai = chay(["--loai", "KHONG-CO-LOAI-NAY"]);
  assert.equal(sai.ma, 2, "mã loại sai mà không dừng — nó sẽ lặng lẽ lấy dữ liệu của loại khác");
  assert.match(sai.loi, /Không có loại sản phẩm/, "câu lỗi không nói rõ chuyện gì");
  for (const ten of Object.keys(LOAI_SAN_PHAM)) {
    assert.ok(sai.loi.includes(ten), `câu lỗi không kể tên '${ten}' — người đọc không có đường tự thoát`);
  }

  /* Mã ĐÚNG thì phải đi qua cửa này. Không có vế đối chứng thì "luôn từ chối" cũng xanh, mà
   * bản đó thì cờ vô dụng theo hướng ngược lại. */
  for (const dung of ["CHI_SO_CO_PHIEU", "chi_so_co_phieu", "HDTLTPCP", "hdtltpcp"]) {
    const r = chay(["--loai", dung]);
    assert.notEqual(r.ma, 2, `mã hợp lệ '${dung}' bị từ chối`);
    assert.ok(!/Không có loại sản phẩm/.test(r.loi), `mã hợp lệ '${dung}' bị coi là sai`);
  }

  /* VẮNG cờ vẫn phải chạy được y như trước — thêm một cờ tuỳ chọn không được đổi đường mặc định. */
  const khongCo = chay([]);
  assert.ok(!/Không có loại sản phẩm/.test(khongCo.loi), "vắng cờ mà vẫn đòi loại sản phẩm");
}

console.log("loai-san-pham-smoke: 3 khoi, tat ca DAT");
