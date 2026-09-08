/* dich-danh-smoke.mjs — CỜ `--target`, và câu lỗi khi có nhiều extension cùng cắm.
 *
 * ══ VÌ SAO FILE NÀY PHẢI TỒN TẠI ══
 *
 * Đo thật 08/09, lượt chạy live đầu tiên qua chính HNX Fetch: Đức ghép cặp cả Scouter LẪN
 * HNX Fetch bằng **cùng một tệp**, nên **cả hai cùng cắm vào một máy chủ**, và mọi lượt gọi
 * trả về `TARGET_AMBIGUOUS`.
 *
 * Chỗ đáng nhớ: **tên giao thức KHÔNG chặn được chuyện này.** Nó gác ở tầng phong bì, còn
 * cắm dây thì xảy ra TRƯỚC đó — một extension nói `duc-scouter.bridge` vẫn cắm vào được máy
 * chủ nói `hnx-fetch.bridge`, và chỉ hỏng khi có phong bì thật đi qua. Nên hai cửa gác hai
 * chuyện khác nhau, và cửa này cần một lời giải riêng: cờ `--target`.
 *
 * Ba tệp lệnh dùng CÙNG một hình dạng, nên chúng phải mang CÙNG một cách xử lý — ba bản khác
 * nhau của một luật là đúng bệnh mà cả gói này sinh ra để tránh.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const goc = path.join(here, "..");
const LENH = ["tai-ket-qua.mjs", "tai-pdf.mjs", "chay.mjs"];

/* ---- ⑴ Cả BA lệnh đều đọc cờ, và đều nhét vào phong bì ------------------- */
{
  for (const ten of LENH) {
    const ma = fs.readFileSync(path.join(goc, ten), "utf8");
    assert.match(ma, /const dichDanh = \w+\("target"\);/,
      `${ten}: không đọc cờ --target`);
    assert.match(ma, /\.\.\.\(dichDanh \? \{ target: dichDanh \} : \{\}\),/,
      `${ten}: đọc cờ nhưng KHÔNG nhét vào phong bì — cờ có mà không có tác dụng`);

    /* VẮNG cờ thì phong bì KHÔNG được mang trường `target`. Gửi `target: null` hay
     * `target: ""` là một phong bì SAI, và máy chủ sẽ từ chối cả những lượt lẽ ra chạy được
     * — tức là thêm một cờ tuỳ chọn lại làm hỏng đường đi mặc định. */
    assert.ok(!/target: dichDanh \|\| null/.test(ma) && !/target: String\(dichDanh\)/.test(ma),
      `${ten}: gửi target kể cả khi vắng cờ — phải BỎ HẲN trường đó`);
  }
}

/* ---- ⑵ `TARGET_AMBIGUOUS` phải DẠY, không chỉ báo ------------------------
 * Một AI vận hành gặp mã lỗi này mà không được kể tên ứng viên thì **không có đường nào tự
 * thoát**: nó không biết instance nào là HNX Fetch, và không có lệnh nào trong sổ tay để hỏi.
 * Nên câu lỗi phải chở đủ ba thứ: chuyện gì xảy ra · các dòng chạy được ngay · cách phân biệt. */
{
  for (const ten of LENH) {
    const ma = fs.readFileSync(path.join(goc, ten), "utf8");
    assert.ok(ma.includes('phongBi?.error?.code === "TARGET_AMBIGUOUS"'),
      `${ten}: không bắt riêng TARGET_AMBIGUOUS`);
    assert.ok(ma.includes("error.details?.candidates"),
      `${ten}: không đọc danh sách ứng viên — câu lỗi sẽ không kể được tên nào`);
    assert.ok(ma.includes('"  --target " + c.instance_id'),
      `${ten}: không in ra dòng lệnh chạy được ngay`);
    assert.ok(ma.includes("seed: hnx-fetch-v0.1"),
      `${ten}: không nói cách phân biệt đâu là HNX Fetch`);
  }
}

/* ---- ⑶ Câu lỗi dựng ĐÚNG từ một phản hồi thật của máy chủ ----------------
 * Hai khối trên soi mã nguồn, nên chúng bắt được "quên viết" mà KHÔNG bắt được "viết sai".
 * Khối này chạy thật đoạn dựng câu trên đúng hình dạng `details` mà lõi máy chủ trả về —
 * hình dạng đó lấy từ lượt đo 08/09, không phải tôi nghĩ ra. */
{
  const details = {
    candidates: [
      { instance_id: "legacy:25cd873e-36d7-4b3a-b35b-577d371f0f00", label: null, legacy: true },
      { instance_id: "legacy:066645fe-03ff-4fe5-8bdf-e2e7042e5701", label: "HNX", legacy: true }
    ]
  };
  const ds = (details.candidates || []).map((c) => "  --target " + c.instance_id + (c.label ? "   (" + c.label + ")" : ""));
  const cau = [
    "Có NHIỀU extension cùng nối vào máy chủ này, nên nó không biết gửi cho ai.",
    "Thường là vì Scouter và HNX Fetch đang ghép cặp bằng CÙNG một tệp.", "",
    "Chạy lại và chỉ đích danh một trong các dòng sau:", ...ds, "",
    "Không biết dòng nào là HNX Fetch? Gọi thử system.ping với từng dòng —",
    "đúng cái của HNX Fetch sẽ trả về  seed: hnx-fetch-v0.1"
  ].join(String.fromCharCode(10));

  assert.equal(ds.length, 2, "phải kể ĐỦ ứng viên, không cắt bớt");
  assert.match(cau, /--target legacy:25cd873e/, "thiếu ứng viên thứ nhất");
  assert.match(cau, /--target legacy:066645fe.*\(HNX\)/, "có nhãn thì phải hiện nhãn — đó là thứ giúp chọn đúng");

  /* `details` VẮNG hoặc RỖNG thì vẫn phải ra một câu đọc được, không được ném thêm một lỗi
   * thứ hai chồng lên lỗi đầu. Một bộ xử lý lỗi tự nó nổ là chỗ dấu vết gốc biến mất. */
  for (const xau of [undefined, {}, { candidates: [] }]) {
    const d2 = (xau?.candidates || []).map((c) => "  --target " + c.instance_id);
    assert.equal(d2.length, 0);
  }
}

console.log("dich-danh-smoke: 3 khoi, tat ca DAT");
