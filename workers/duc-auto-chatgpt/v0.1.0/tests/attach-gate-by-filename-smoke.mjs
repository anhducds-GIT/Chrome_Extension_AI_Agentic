/* B-49 · Cổng chờ TRƯỚC KHI GỬI: nhìn TÊN FILE, và thôi hỏi nhầm câu.
 *
 * Đức chốt 2026-09-10, hai vế cùng một hàm vì làm nửa vời là mở cổng gửi sớm:
 *
 *   ⑴ BỎ `!uploadIsPending()`. Đo live 09/09: nhóm đó khớp lúc trang ĐANG SINH
 *     ẢNH, không phải lúc ảnh đang tải lên (cửa sổ gắn thật 3,82 giây với
 *     1,83MB, ~27 lượt dò, cả ba mục 0/0/0). Nên gắn ảnh trong lúc một lượt
 *     khác còn đang vẽ thì cổng chặn 15 giây rồi ném một lỗi NÓI SAI NGUYÊN
 *     NHÂN: ảnh đã sẵn, thứ chưa xong là lượt sinh của người khác.
 *
 *   ⑵ NHÌN TÊN, KHÔNG ĐẾM. Phép đếm cũ (`>= previousPreviewCount + n`) trả lời
 *     "đủ mấy cái chưa" mà không trả lời "đúng mấy cái đó chưa": một chip sót
 *     lại của lượt trước cũng được tính, và cổng mở khi ảnh của LƯỢT NÀY chưa
 *     hiện → gửi kèm nhầm ảnh, mà attribution không có đường sửa sau.
 *
 * Mép ⑶ dưới đây là mép chịu tải: nó dựng ĐÚNG cảnh phép đếm cũ mở cổng sai, và
 * đòi cổng mới đóng. Bỏ mép đó thì cả lượt vá này mất chỗ dựa.
 *
 * File này CẮT ba hàm đã ship ra khỏi `content.js` và CHẠY chúng trên một DOM
 * giả — không dựng bản sao, vì bản sao là thứ xanh trong khi hàng thật đỏ. */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const src = fs.readFileSync(new URL("../content.js", import.meta.url), "utf8").split("\r\n").join("\n");

/* ---- cắt khối, và ĐẾM mỏ neo ------------------------------------------- */
const MO_NEO_DAU = "  function chipMangTen(label, fileName) {";
const MO_NEO_CUOI = "  async function attachReferenceImages(referenceImages) {";
const dem = (chuoi, khoa) => chuoi.split(khoa).length - 1;
// Mỏ neo khớp 0 lần thì `indexOf` trả -1 và `slice` vẫn cho ra MỘT CHUỖI —
// harness chạy tiếp, xanh, mà chẳng kiểm gì. Đếm trước, đó là luật của repo này.
assert.equal(dem(src, MO_NEO_DAU), 1, "MỎ NEO LỆCH: `chipMangTen` phải có đúng một định nghĩa trong content.js");
assert.equal(dem(src, MO_NEO_CUOI), 1, "MỎ NEO LỆCH: `attachReferenceImages` phải có đúng một định nghĩa");
const dau = src.indexOf(MO_NEO_DAU);
const cuoi = src.indexOf(MO_NEO_CUOI);
assert.ok(dau > 0 && cuoi > dau, "ba hàm còn đứng liền nhau, ngay trên `attachReferenceImages`");
const block = src.slice(dau, cuoi);

/* ---- ⑴ tĩnh: cổng này KHÔNG được đọc `uploadIsPending` ------------------ */
// Bỏ dòng chú thích trước khi soi, nếu không thì chính đoạn giải thích "vì sao
// đã gỡ `uploadIsPending`" sẽ làm phép kiểm đỏ. Cùng loại bẫy đã dính hai lần.
const blockKhongChuThich = block.split("\n").filter((dong) => !dong.trim().startsWith("//")).join("\n");
assert.doesNotMatch(blockKhongChuThich, /uploadIsPending/, "vế ⑴: cổng trước-khi-gửi KHÔNG được hỏi `uploadIsPending` — nó đo 'trang đang bận', không phải 'ảnh đang tải lên'");
assert.doesNotMatch(blockKhongChuThich, /previousPreviewCount|attachmentPreviewCount/, "vế ⑵: phép đếm cũ phải biến mất hẳn, không được sót một nhánh nào");
assert.match(blockKhongChuThich, /SEL\.attachmentChip/, "vế ⑵: phải đọc nhóm chip đã đo ở B-14 (`aria-label` = tên file)");
// `uploadIsPending` vẫn phải SỐNG ở chỗ câu hỏi của nó là đúng — gỡ khỏi một
// cổng không phải là cớ để xoá nó khỏi repo.
assert.ok(dem(src, "attachmentPending: uploadIsPending()") >= 1, "`uploadIsPending` vẫn phải được `DacChatReadiness` dùng — ở đó câu hỏi 'trang có đang bận không' là ĐÚNG");

/* ---- DOM giả ------------------------------------------------------------ */
function moiTruong({ chips = [], files = [], abort = false, blocker = "", busy = true }) {
  const nodes = chips.map((label) => ({
    __label: label,
    getAttribute: (ten) => (ten === "aria-label" ? label : null)
  }));
  // `busy` mặc định BẬT: mọi mép dưới đây chạy trong đúng cảnh vế ⑴ nói tới —
  // trang đang sinh dở một lượt khác. Cổng mới phải không thèm biết tới nó.
  const goiY = { busy };
  const api = vm.runInNewContext(
    `(function (deps) {\nconst { document, SEL, isVisible, STATE, securityBlockerText, sleep } = deps;\n${block}\nreturn { chipMangTen, attachmentChipLabels, fileInputHasReference, waitForReferenceImagesReady };\n})`
  )({
    document: {
      querySelectorAll(selector) {
        assert.ok(selector.includes('role="group"'), `cổng phải hỏi đúng nhóm chip, đang hỏi: ${selector}`);
        return nodes;
      }
    },
    SEL: { attachmentChip: ['form div[role="group"][aria-label]', 'form div[data-default-action="true"]'] },
    isVisible: () => true,
    STATE: { get abortRequested() { return abort; } },
    securityBlockerText: () => blocker,
    sleep: () => Promise.resolve()
  });
  return { ...api, fileInput: { files: files.map((name) => ({ name })) }, goiY };
}
const anh = (...ten) => ten.map((fileName) => ({ fileName }));

/* ---- mép 1: đường thường — file đã nạp, chip đã hiện đúng tên ----------- */
{
  const m = moiTruong({ chips: ["anh-mau.png", "so-do.png"], files: ["anh-mau.png", "so-do.png"] });
  await m.waitForReferenceImagesReady(m.fileInput, anh("anh-mau.png", "so-do.png"), 300);
}

/* ---- mép 2 (vế ⑴): trang ĐANG SINH mà ảnh đã sẵn → vẫn phải mở ---------- */
{
  // Đây chính là ca đã chết oan 15 giây trước bản vá. Không có cờ `busy` nào lọt
  // vào hàm được nữa, nên mép này đo bằng chính sự IM LẶNG: nó chạy xong.
  const m = moiTruong({ chips: ["a.png"], files: ["a.png"], busy: true });
  await m.waitForReferenceImagesReady(m.fileInput, anh("a.png"), 300);
}

/* ---- mép 3 (vế ⑵) — MÉP CHỊU TẢI: chip sót của lượt trước ---------------- */
{
  // Phép đếm CŨ: baseline 0, cần >= 0 + 2, đếm được 2 chip → MỞ CỔNG, và lượt
  // gửi đi kèm `cu-roi-rot.png` thay cho `moi-2.png`. Cổng mới phải đóng.
  const m = moiTruong({ chips: ["cu-roi-rot.png", "moi-1.png"], files: ["moi-1.png", "moi-2.png"] });
  await assert.rejects(
    () => m.waitForReferenceImagesReady(m.fileInput, anh("moi-1.png", "moi-2.png"), 200),
    (loi) => {
      assert.match(loi.message, /moi-2\.png/, "phải NÊU ĐÍCH DANH file chưa thấy chip — câu báo cũ không nói, và hai phiên đã đi tìm nhầm chỗ");
      assert.doesNotMatch(loi.message, /moi-1\.png/, "không được đổ oan cho file đã sẵn sàng");
      assert.match(loi.message, /chip/, "phải nói rõ thiếu ở phía CHIP, không phải phía ô nhập file");
      return true;
    },
    "chip sót lại của lượt trước KHÔNG được tính là chip của lượt này"
  );
}

/* ---- mép 4: nhãn có tô điểm cỡ file thì vẫn phải khớp ------------------- */
{
  const m = moiTruong({ chips: ["anh-mau.png, 1,2 MB"], files: ["anh-mau.png"] });
  await m.waitForReferenceImagesReady(m.fileInput, anh("anh-mau.png"), 300);
}

/* ---- mép 5: KHỚP NHẦM theo chuỗi con — lỗi của chính bản nháp đầu ------- */
{
  // `"aa.png".includes("a.png")` là TRUE. Bản nháp đầu của lượt vá này dùng
  // đúng phép đó, nên một chip của file khác mở được cổng. Giữ mép này.
  assert.equal(moiTruong({}).chipMangTen("aa.png", "a.png"), false, "chip `aa.png` KHÔNG phải chip của `a.png`");
  assert.equal(moiTruong({}).chipMangTen("anh.png.bak", "anh.png"), false, "đuôi thừa cũng là file khác");
  assert.equal(moiTruong({}).chipMangTen("bao-cao,q1.png", "bao-cao,q1.png"), true, "tên file có sẵn dấu phẩy vẫn phải khớp — vế đẳng thức đứng trước");
  const m = moiTruong({ chips: ["aa.png"], files: ["a.png"] });
  await assert.rejects(() => m.waitForReferenceImagesReady(m.fileInput, anh("a.png"), 200), /a\.png/);
}

/* ---- mép 6: chip đủ nhưng ô nhập file chưa nhận → hai vế phải tách ------ */
{
  const m = moiTruong({ chips: ["a.png"], files: [] });
  await assert.rejects(
    () => m.waitForReferenceImagesReady(m.fileInput, anh("a.png"), 200),
    (loi) => {
      assert.match(loi.message, /ô nhập file/, "thiếu ở ô nhập file là chuyện KHÁC HẲN thiếu chip; câu báo phải phân biệt");
      return true;
    }
  );
}

/* ---- mép 7: hai lối thoát khẩn phải sống sót qua lượt viết lại ---------- */
{
  const dung = moiTruong({ chips: [], files: [], abort: true });
  await assert.rejects(() => dung.waitForReferenceImagesReady(dung.fileInput, anh("a.png"), 200), /stopped by user/, "nút Dừng của Đức phải cắt được vòng chờ");
  const chan = moiTruong({ chips: [], files: [], blocker: "cần xác minh con người" });
  await assert.rejects(() => chan.waitForReferenceImagesReady(chan.fileInput, anh("a.png"), 200), /HARD_STOP/, "chặn an ninh phải ném HARD_STOP, không được chờ hết giờ rồi báo là thiếu ảnh");
}

/* ---- mép 8: không ảnh mẫu nào thì không có gì để chờ -------------------- */
{
  const m = moiTruong({ chips: [], files: [] });
  await m.waitForReferenceImagesReady(m.fileInput, [], 300);
}

console.log("attach gate by filename (B-49): PASS");
