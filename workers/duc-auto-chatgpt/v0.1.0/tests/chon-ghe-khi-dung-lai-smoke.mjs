/* CHỌN LẠI GHẾ KHI DÙNG LẠI THÔNG SỐ — Đức nêu 17/09, nguyên văn:
 *   *"Extension đã có tính năng đặt tối đa 3 ID rồi, nhưng lúc chạy script thì chưa có.
 *     Tôi cũng sẽ prefer có thể chọn được là tốt nhất. ko phải gõ."*
 *
 * ĐO ĐƯỢC, không phải cảm giác: `chay-chuoi.bat` hỏi *"Dùng lại thông số này?"*, và đường
 * `Enter = có` nhảy THẲNG tới `:dinhNghia`. `:chonProfile` chỉ nằm trên đường `:goTay`. Nên
 * ai bấm Enter — tức gần như mọi lượt — KHÔNG BAO GIỜ thấy menu ghế, và chạy lại với ghế +
 * địa chỉ hội thoại của lần trước. Ghế profile thì bám theo TAB ĐANG Ở TRƯỚC MẶT, nên sáng
 * 17/09 năm lượt chạy chết liên tiếp đúng vì thứ đó (`~~B-97~~`).
 *
 * Ghim CÁI GIÁ: phải có một lối GIỮA — giữ tên/vòng/phút, chọn lại ghế — và chọn bằng SỐ.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const bat = fs.readFileSync(path.join(here, "..", "duc-auto-chatgpt-loopback-bridge-host-v1", "chay-chuoi.bat"), "utf8");
/* Chuẩn hoá CRLF trước: tệp .bat giữ CRLF, nên mọi phép so có xuống dòng bên dưới sẽ trượt
   lặng lẽ nếu không — đúng kiểu trượt làm một phép ghim xanh mà không đo gì (đã dính một lần
   ngay lúc viết file này). */
const boRem = bat.split(/\r?\n/).filter((d) => !/^\s*rem\b/i.test(d)).join("\n");

/* ⑴ Lời thứ BA phải có mặt ngay trên câu hỏi Đức đọc — không phải một cờ giấu trong tài liệu. */
const cauHoi = boRem.split("\n").find((d) => d.includes("Dung lai thong so nay?"));
assert.ok(cauHoi, "vẫn phải có câu hỏi dùng-lại-thông-số");
assert.ok(/Enter/.test(cauHoi) && /\bk\b/.test(cauHoi), "hai lối cũ phải còn nguyên");
assert.ok(/\bg\b\s*=/.test(cauHoi), "phải mời lối thứ ba ngay trong câu hỏi — một lối không ai thấy thì bằng không có");
assert.ok(/ghe|hoi thoai/i.test(cauHoi), "và phải nói lối ấy làm gì, không chỉ đưa ra một chữ cái");

/* ⑵ Lối ấy phải THẬT SỰ dẫn tới menu ghế. */
/* Tìm NHÃN, không tìm chuỗi: dòng `goto :chonLaiGhe` cũng kết thúc bằng đúng mấy chữ ấy,
   và bắt trúng nó thì lát cắt chỉ dài hai dòng — một phép ghim đo nhầm khúc. */
const iNhanh = boRem.search(/^:chonLaiGhe$/m);
assert.ok(iNhanh > 0, "phải có nhánh chọn lại ghế");
assert.ok(/if \/i "%DUNGLAI%"=="g" goto :chonLaiGhe/.test(boRem), "phím `g` phải nhảy đúng vào nhánh ấy");
const than = boRem.slice(iNhanh, boRem.indexOf("goto :dinhNghia", iNhanh));
assert.ok(/call :chonProfile/.test(than), "nhánh ấy phải gọi CHÍNH menu đã có — không dựng menu thứ hai để hai bên trôi khỏi nhau");

/* ⑶ XOÁ CẢ HAI GIÁ TRỊ CŨ TRƯỚC KHI HỎI. Giữ lại một nửa — ghế mới, địa chỉ cũ — là cách dễ
   nhất để gõ vào một hội thoại cũ, và cái đó không hoàn tác được. Đo bằng VỊ TRÍ: phải xoá
   TRƯỚC lượt gọi menu; xoá sau là xoá mất chính thứ vừa chọn. */
const iCall = than.indexOf("call :chonProfile");
for (const bien of ["DICH", "DIA_CHI"]) {
  const iXoa = than.indexOf(`set "${bien}="`);
  assert.ok(iXoa >= 0, `phải xoá \`${bien}\` cũ trước khi hỏi lại`);
  assert.ok(iXoa < iCall, `\`${bien}\` phải xoá TRƯỚC \`call :chonProfile\` — xoá sau là xoá mất thứ vừa chọn`);
}

/* ⑷ Nhánh chỉ được vào bằng `goto`. Rơi tự nhiên vào nó là ép mọi lượt Enter phải chọn lại. */
const truoc = boRem.slice(0, iNhanh).trimEnd();
assert.ok(truoc.endsWith("goto :dinhNghia"), "dòng ngay trước nhãn phải là một lệnh nhảy — nếu không thì lối Enter rơi thẳng vào đây");

/* ⑸ VÀ PHẢI CHỌN BẰNG SỐ, KHÔNG GÕ. Đây là câu chữ của Đức, nên ghim bằng HÀNH VI THẬT:
   gọi thẳng hàm đọc lựa chọn của bộ chọn ghế. */
const { dungMenu, hieuLuaChon, choNgoi } = await import(
  pathToFileURL(path.join(here, "..", "duc-auto-chatgpt-loopback-bridge-host-v1", "chon-profile.mjs")));

const ghe = [
  { label: "anhducds", last_seen_at: new Date().toISOString() },
  { label: "kaito", last_seen_at: new Date().toISOString() },
  { label: "gpt-kichban", last_seen_at: new Date().toISOString() },
];
const menu = dungMenu(ghe);
assert.equal(hieuLuaChon("2", menu), "kaito", "gõ MỘT CON SỐ phải chọn được ghế — đây là nguyên văn yêu cầu của Đức");
assert.equal(hieuLuaChon("3", menu), "gpt-kichban", "và số ấy phải trỏ đúng hàng đang hiện");
assert.equal(hieuLuaChon("9", menu), null, "số ngoài danh sách thì hỏi lại, không đoán bừa");

/* ⑹ Ba ghế cùng lúc thì nhãn thôi là chưa đủ — phải nói mỗi ghế ĐANG NHÌN hội thoại nào.
   Đúng cảnh Đức mô tả: "nhiều trang GPT cùng đang mở". */
const DA = "https://chatgpt.com/g/g-p-6aa92660ce888191b50b14bb0f993c32-aves-contest/c/6aaae0ae-b6d0-83ec-b27a-2ce53d99b41d";
const KHAC = "https://chatgpt.com/g/g-p-6a81f074203481919c3204e947a1c281-chrome-extension-workflow/c/6aaba9e8-b968-83ec-820c-e35dcfc86200";
const coCho = dungMenu(ghe, Date.now(), new Map([["anhducds", DA], ["kaito", KHAC], ["gpt-kichban", ""]]));
assert.ok(coCho[0].dong.includes("aves-contest"), "hàng 1 phải hiện hội thoại nó đang nhìn");
assert.ok(coCho[1].dong.includes("chrome-extension-workflow"), "hàng 2 phải hiện hội thoại KHÁC — đó là cả mục đích");
assert.notEqual(choNgoi(DA), choNgoi(KHAC), "hai hội thoại khác nhau phải đọc ra hai chữ khác nhau");
assert.equal(hieuLuaChon("1", coCho), "anhducds", "và thêm dòng phụ không được làm hỏng phép chọn bằng số");

console.log("Chọn lại ghế khi dùng lại thông số (Đức 17/09): PASS");
