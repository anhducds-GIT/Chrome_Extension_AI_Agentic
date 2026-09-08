/* ngay-nghi-smoke.mjs — tệp ghi chú "ngày không có phiên" bên cạnh SSOT (H-03).
 *
 * ══ ĐỨC CHỐT GÌ, VÀ RỦI RO ĐI KÈM ══
 *
 * Đức chốt 08/09: ngày nghỉ thì ghi lại, để lượt sau thôi lấy lại. Rủi ro đã ghi trong sổ nợ từ
 * trước và KHÔNG biến mất chỉ vì đã chốt: **nếu HNX bổ sung dữ liệu cho một ngày đã đánh dấu, ta
 * sẽ không bao giờ lấy nữa.**
 *
 * Nên phép ghim này canh hai thứ khác nhau:
 *   ⑴ cái dấu **có tác dụng** (không thì chốt của Đức chỉ nằm trên giấy), và
 *   ⑵ **cửa thoát vẫn mở** — xoá một dòng là ngày đó được lấy lại. Không có ⑵ thì cái dấu là
 *     một quyết định vĩnh viễn, mà nó không xứng đáng vĩnh viễn.
 *
 * ══ VÀ MỘT THỨ NỮA: SSOT PHẢI SẠCH ══
 *
 * Ghi chú về dữ liệu KHÔNG được nằm lẫn trong dữ liệu. Một hàng giả "ngày này nghỉ" trong SSOT
 * nghĩa là mọi lượt đếm/cộng/trung bình về sau phải nhớ lọc nó ra — và sẽ có lượt quên.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const { docMaster, docNgayNghi, duongNgayNghi, themNgayNghi, themHang, COT_NGAY_NGHI } =
  await import("../master.mjs");
const { COT_MASTER } = await import("../luoc-do-master.mjs");

function thuMucTam() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "ghim-ngay-nghi-"));
}

/* ---- ⑴ Tệp nằm CẠNH SSOT, và tên suy được từ tên SSOT ------------------- */
{
  assert.equal(duongNgayNghi("D:/a/b/HNX.csv"), "D:/a/b/HNX.ngay-nghi.csv");
  assert.equal(duongNgayNghi("D:/a/b/HNX.CSV"), "D:/a/b/HNX.ngay-nghi.csv", "đuôi viết hoa cũng phải nhận");
  /* Không có đuôi .csv thì nối thêm, đừng cắt mất phần tên. */
  assert.equal(duongNgayNghi("D:/a/b/HNX"), "D:/a/b/HNX.ngay-nghi.csv");
}

/* ---- ⑵ Ghi rồi đọc lại được, và KHÔNG ghi trùng ------------------------- */
{
  const d = thuMucTam();
  try {
    const master = path.join(d, "SSOT.csv");
    assert.equal(docNgayNghi(master).coTep, false, "chưa có tệp mà đã báo có");
    assert.equal(docNgayNghi(master).ngay.size, 0);

    assert.deepEqual(themNgayNghi(master, "2026-09-02"), { them: 1 });
    assert.deepEqual(themNgayNghi(master, "2026-09-02"), { them: 0 }, "ghi trùng — tệp này là một TẬP HỢP, không phải nhật ký");
    assert.deepEqual(themNgayNghi(master, "2026-04-30"), { them: 1 });

    const doc = docNgayNghi(master);
    assert.equal(doc.coTep, true);
    assert.deepEqual([...doc.ngay].sort(), ["2026-04-30", "2026-09-02"]);

    /* Cùng quy ước với SSOT: BOM · CRLF · mọi ô bọc nháy — để Đức mở bằng Excel không vỡ chữ. */
    const tho = fs.readFileSync(duongNgayNghi(master), "utf8");
    assert.ok(tho.startsWith("\uFEFF"), "thiếu BOM — Excel sẽ đọc sai tiếng Việt");
    assert.ok(tho.includes("\r\n"), "thiếu CRLF");
    assert.match(tho.split("\r\n")[0], /^\uFEFF"trade_date","ly_do","ghi_nhan_luc"$/, "hàng tiêu đề sai");
    assert.deepEqual([...COT_NGAY_NGHI], ["trade_date", "ly_do", "ghi_nhan_luc"]);

    /* Có ghi NGÀY QUAN SÁT — đó là thứ cho phép xét lại về sau. */
    assert.match(tho, /"KHONG_CO_PHIEN","\d{4}-\d{2}-\d{2}T/, "không ghi lý do + lúc quan sát");
  } finally {
    fs.rmSync(d, { recursive: true, force: true });
  }
}

/* ---- ⑶ CỬA THOÁT: xoá một dòng là ngày đó quay lại danh sách thiếu ------ */
{
  const d = thuMucTam();
  try {
    const master = path.join(d, "SSOT.csv");
    themNgayNghi(master, "2026-09-02");
    themNgayNghi(master, "2026-04-30");
    const duong = duongNgayNghi(master);

    const conLai = fs.readFileSync(duong, "utf8").split("\r\n").filter((x) => !x.includes("2026-04-30"));
    fs.writeFileSync(duong, conLai.join("\r\n"), "utf8");

    const sau = docNgayNghi(master);
    assert.deepEqual([...sau.ngay], ["2026-09-02"], "xoá dòng mà ngày đó vẫn bị coi là nghỉ — cửa thoát đã đóng");
  } finally {
    fs.rmSync(d, { recursive: true, force: true });
  }
}

/* ---- ⑷ Tệp HỎNG thì NÉM, không im lặng coi như rỗng --------------------
 * Coi như rỗng nghĩa là lặng lẽ lấy lại tất cả — tốn hạn mức ghi thật, và người chạy không hề
 * biết tệp đã hỏng. Cùng luật với `docMaster`: "chưa có" khác hẳn "hỏng". */
{
  const d = thuMucTam();
  try {
    const master = path.join(d, "SSOT.csv");
    fs.writeFileSync(duongNgayNghi(master), "\uFEFF\"ngay_nao_do\",\"x\"\r\n", "utf8");
    assert.throws(() => docNgayNghi(master), /NGAY_NGHI_SAI_DAU|không có cột/,
      "tệp sai đầu mà vẫn đọc — sẽ ghi đè lên thứ không hiểu");
  } finally {
    fs.rmSync(d, { recursive: true, force: true });
  }
}

/* ---- ⑸ Ngày sai dạng bị TỪ CHỐI, không lặng lẽ ghi vào ------------------ */
{
  const d = thuMucTam();
  try {
    const master = path.join(d, "SSOT.csv");
    for (const xau of ["02/09/2026", "2026-9-2", "hom qua", "", null, undefined]) {
      assert.throws(() => themNgayNghi(master, xau), /NGAY_SAI_DANG|yyyy-mm-dd/, `nhận bừa '${xau}'`);
    }
    assert.equal(fs.existsSync(duongNgayNghi(master)), false, "từ chối rồi mà vẫn tạo tệp");
  } finally {
    fs.rmSync(d, { recursive: true, force: true });
  }
}

/* ---- ⑹ SSOT KHÔNG bị đụng tới ------------------------------------------
 * Đây là bất biến đắt nhất của khối này: ghi chú về dữ liệu không được lẫn vào dữ liệu. */
{
  const d = thuMucTam();
  try {
    const master = path.join(d, "SSOT.csv");
    const hang = [COT_MASTER.map((c) => (c === "trade_date" ? "2026-09-07" : c === "isin" ? "VN000X" : "1"))];
    themHang(master, hang);
    const truoc = fs.readFileSync(master, "utf8");
    const dem = docMaster(master);

    themNgayNghi(master, "2026-09-02");

    assert.equal(fs.readFileSync(master, "utf8"), truoc, "SSOT bị sửa khi ghi ngày nghỉ");
    const sau = docMaster(master);
    assert.equal(sau.soHang, dem.soHang, "số hàng SSOT đổi");
    assert.equal(sau.ngay.has("2026-09-02"), false, "ngày nghỉ lọt vào SSOT — mọi phép cộng của Đức sẽ tính nó");
  } finally {
    fs.rmSync(d, { recursive: true, force: true });
  }
}

/* ---- ⑺ LỆNH THẬT có dùng cái dấu không -------------------------------
 * Sáu khối trên ghim MODULE. Module đúng mà lệnh không gọi tới thì chốt của Đức vẫn nằm trên
 * giấy — đúng loại lỗi mà `H-05` đã dính một lần (bảng loại sản phẩm có sẵn, nhưng không có
 * đường dùng nó). Khối này chạy THẬT `tai-ket-qua.mjs --thu-xem` và đọc đầu ra. */
{
  const { execFileSync } = await import("node:child_process");
  const d = thuMucTam();
  try {
    const master = path.join(d, "SSOT.csv");
    const ghepCap = path.join(d, "pairing.json");
    fs.writeFileSync(ghepCap, JSON.stringify({ schema_version: 1, host: "127.0.0.1", port: 39999 }), "utf8");

    /* 2026-09-02 là thứ Tư — một NGÀY LÀM VIỆC, nên nó phải nằm trong danh sách thiếu.
     * (T7/CN đã bị loại từ trước bởi `ngayLamViec`, không liên quan tới tệp này.) */
    const chay = () => String(execFileSync(process.execPath, [
      path.join(import.meta.dirname ?? path.dirname(new URL(import.meta.url).pathname), "..", "tai-ket-qua.mjs"),
      "--pairing", ghepCap, "--master", master, "--tu", "2026-09-01", "--den", "2026-09-03", "--thu-xem"
    ], { stdio: ["ignore", "pipe", "pipe"] }));

    const truoc = chay();
    assert.match(truoc, /2026-09-02/, "ngày làm việc chưa có dữ liệu mà không nằm trong danh sách thiếu");

    themNgayNghi(master, "2026-09-02");

    const sau = chay();
    assert.ok(!sau.split(String.fromCharCode(10)).some((x) => x.trim() === "2026-09-02"),
      "đã ghi nhận KHÔNG CÓ PHIÊN mà lệnh vẫn định lấy lại — cái dấu không có tác dụng");
    assert.ok(sau.includes("Nghỉ"), "không báo cho người chạy biết đã bỏ qua mấy ngày");
    assert.ok(sau.includes("ngay-nghi.csv"), "không chỉ ra tệp nào để xoá dòng — cửa thoát vô hình");
  } finally {
    fs.rmSync(d, { recursive: true, force: true });
  }
}

console.log("ngay-nghi-smoke: 7 khoi, tat ca DAT");
