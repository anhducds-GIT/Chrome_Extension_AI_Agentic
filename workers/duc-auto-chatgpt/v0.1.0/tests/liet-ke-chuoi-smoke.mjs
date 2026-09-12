/* `liet-ke-chuoi.mjs` — danh sách chuỗi có trạng thái, chọn bằng SỐ.
 *
 * Đức nêu 12/09: *"dùng script dừng riêng tôi thấy khó dùng vì phải gõ tay tên luồng dẫn đến
 * sai. Trong lịch sử tôi thấy còn rất nhiều luồng đã không còn chạy nữa nhưng vẫn thấy có
 * trong list, gây confuse và khó thao tác."*
 *
 * Hai mép chịu tải, và mép thứ hai mới là mép thật:
 *   ⑴ "đang chạy" phải đo bằng PID CÒN SỐNG, không phải bằng "có tệp khoá".
 *   ⑵ Cái tên KHÔNG được đi qua bàn phím. Kho nhật ký của Đức đang có `HNX` và `HNX ` (thừa
 *      đúng một dấu cách) đứng cạnh nhau — gõ tay một trong hai là dừng nhầm chuỗi.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { trangThaiChuoi, dongCuoi, xepChuoi } from "../duc-auto-chatgpt-loopback-bridge-host-v1/liet-ke-chuoi.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BO = path.join(HERE, "..", "duc-auto-chatgpt-loopback-bridge-host-v1", "liet-ke-chuoi.mjs");

/* ① Tự kiểm của chính bộ liệt kê phải CHẠY, không chỉ tồn tại. Một `--tu-kiem` không ai gọi là
   một phép kiểm chết — repo này vừa mất ba ngày vì đúng chuyện đó (18/31 bài không ai chạy). */
{
  const ra = execFileSync(process.execPath, [BO, "--tu-kiem"], { encoding: "utf8" });
  assert.match(ra, /tự kiểm: \d+\/\d+ xanh/, "`--tu-kiem` phải chạy và phải báo số");
  console.log("  ok  ① tự kiểm của bộ liệt kê có người gọi");
}

/* ② "ĐANG CHẠY" đo bằng pid còn sống — CẢ HAI CHIỀU.
   Chỉ khẳng định chiều "sống" thì một đột biến "luôn luôn đang chạy" sẽ thoát, và khi đó mọi
   xác trong danh sách lại hiện ra là đang chạy — đúng cái Đức than phiền, chỉ đảo ngược. */
{
  const khoa = '{"pid":36772,"tu":"2026-09-12T05:31:36.000Z","nhan":"Mo rong Scouter"}';
  assert.equal(trangThaiChuoi({ ten: "x", khoaTho: khoa, nhatKyTho: "" }, () => true).nhan, "ĐANG CHẠY",
    "pid còn sống thì đang chạy");
  assert.equal(trangThaiChuoi({ ten: "x", khoaTho: khoa, nhatKyTho: "" }, () => false).nhan, "đã chết",
    "CÓ tệp khoá KHÔNG có nghĩa là đang chạy — pid 36772 của Đức đã chết mà khoá vẫn nằm đó");

  /* Khoá hỏng vẫn là CÓ khoá. Đọc thành "không có khoá" là mất lớp chống hai bản chạy cùng tab. */
  assert.equal(trangThaiChuoi({ ten: "x", khoaTho: "{hỏng", nhatKyTho: "" }, () => false).nhan, "đã chết",
    "khoá không phân tích được vẫn phải tính là có khoá");
  console.log("  ok  ② đang chạy = pid còn sống, không phải = có tệp khoá");
}

/* ③ Nhật ký dòng cuối cụt — lượt tắt máy giữa lúc ghi. Lùi một dòng, đừng bỏ cả tệp. */
{
  assert.equal(dongCuoi('{"su_kien":"BAT_DAU"}\n{"su_kien":"DA_G').su_kien, "BAT_DAU");
  assert.equal(dongCuoi("   \n  \n"), null, "toàn dòng trắng thì trả null");
  assert.equal(dongCuoi(null), null, "không có gì thì trả null, không ném");
  console.log("  ok  ③ dòng cuối cụt không làm mất cả nhật ký");
}

/* ④ Xếp: đang chạy lên đầu. Người mở danh sách này gần như luôn muốn cái đang chạy. */
{
  const xep = xepChuoi([{ ten: "z", bac: 2 }, { ten: "a", bac: 3 }, { ten: "m", bac: 0 }, { ten: "b", bac: 1 }]);
  assert.deepEqual(xep.map((x) => x.ten), ["m", "b", "z", "a"], "0 đang chạy · 1 khoá mồ côi · rồi phần còn lại");
  console.log("  ok  ④ đang chạy xếp lên đầu");
}

/* ⑤ CÁI TÊN KHÔNG ĐI QUA BÀN PHÍM. Đây là mép chính — mọi thứ trên chỉ phục vụ nó. */
{
  const src = fs.readFileSync(BO, "utf8");
  const iChon = src.indexOf("let chon = null;");
  assert.ok(iChon > 0, "không tìm thấy vòng hỏi — phép ghim dưới sẽ vô nghĩa");
  const vongHoi = src.slice(iChon, src.indexOf("rl.close();", iChon));
  assert.ok(vongHoi.includes("Number(tra)"), "phải nhận một CON SỐ");
  assert.ok(!/ds\.find|\.ten === tra|includes\(tra\)/.test(vongHoi),
    "KHÔNG được nhận cả tên — nhận tên là mở lại đúng cái cửa vừa đóng");

  const bat = fs.readFileSync(path.join(HERE, "..", "duc-auto-chatgpt-loopback-bridge-host-v1", "dung-chuoi.bat"), "utf8");
  assert.ok(bat.includes("liet-ke-chuoi.mjs"), "dung-chuoi.bat phải gọi bộ liệt kê, không tự `for /d` nữa");
  /* Luật viết .bat của repo này, cả hai đều đã trả giá thật. */
  assert.ok(!/if [^\r\n]*\([\r\n]/.test(bat.replace(/^rem.*$/gm, "")),
    "không dùng khối ngoặc quanh `if` — trong khối, biến bành trướng lúc PHÂN TÍCH");
  for (const d of bat.split("\n")) {
    if (!/^\s*echo /.test(d) || /^\s*rem/.test(d)) continue;
    if (!/%SO%|%TEP_CHON%|%BO_LIET_KE%|%NHAN%/.test(d)) continue;
    assert.match(d, /"/, `echo có đường dẫn phải ngoặc kép (tên chuỗi của Đức có \`&\`): ${d.trim()}`);
  }
  console.log("  ok  ⑤ chọn bằng số, tên không đi qua bàn phím; .bat theo luật ngoặc của repo");
}

console.log("liet-ke-chuoi-smoke: xanh");
