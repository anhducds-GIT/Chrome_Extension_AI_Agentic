/* Phép kiểm HÀNH VI cho bộ đặt tên download — không phải test tĩnh.
   B-36: 36 file tên-GUID nằm trong Downloads của Đức, rải từ 09/07 tới 04/09,
   gồm cả file 28/08 tức SAU khi B-13 được ghi "đã đóng". Nội dung file luôn
   đúng; chỉ cái tên bị Chrome đặt, và `verifyDownloadedFilename` chặn — nên MỌI
   mutation Bridge chết khi đích ghi rơi về Chrome Downloads.

   Vì sao ba phép kiểm cũ không bắt: cả ba là TĨNH. Chúng `assert.match` rằng mã
   CÓ CHỨA dòng đăng ký determiner, có khớp `expectedDownloadNames.get(item.url)`,
   có gọi `suggest({filename})`. Hình dạng còn nguyên vẹn mà GUID vẫn lọt. Đây là
   đúng bài học lỗi #5 của sổ tay: một trường quan trọng được canh bằng thứ không
   phân biệt được hai nhánh.

   Nên file này CẮT chính đoạn mã đã ship ra khỏi background.js và CHẠY nó, rồi
   gọi determiner bằng những hình dạng DownloadItem thật mà Chrome có thể đưa tới.

   Bất biến được ghim, phát biểu độc lập với việc Chrome cư xử ra sao:
   **một download do CHÍNH extension này khởi tạo không bao giờ được im lặng
   nhận cái tên mặc định của Chrome.** Mã cũ có HAI nhánh làm đúng điều đó, và
   cả hai đều dựng nổi ca hỏng ở dưới. Không cần biết Chrome đang kích nhánh nào
   mới gọi cả hai là lỗi: im lặng mất tên là lỗi ở cả hai. */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../background.js", import.meta.url), "utf8");
const start = source.indexOf("const DOWNLOAD_COMPLETE_TIMEOUT_MS");
const end = source.indexOf("chrome.runtime.onMessage.addListener");
assert.ok(start > 0 && end > start, "không cắt được khối đặt tên khỏi background.js — mốc cắt đã đổi, sửa mốc chứ đừng bỏ phép kiểm");
const block = source.slice(start, end);

const EXTENSION_ID = "efjihnbjlneiheacaehhjdbemoklkcka";

/* Dựng lại khối đó với một `chrome` giả, và trả về determiner đã đăng ký.
   Nếu khối không đăng ký nổi listener thì `determiner` là null và mọi ca dưới
   đỏ — đó cũng là một ca hỏng đáng bắt, không phải lỗi harness. */
function boot() {
  let determiner = null;
  // Đồng hồ do harness cầm. Phiếu giữ tên có HẠN, và hạn chỉ kiểm được nếu
  // thời gian đẩy được về sau — không có chỗ này thì "phiếu quá hạn" là một
  // câu chữ, và đúng như thế: đột biến `return direct` (bỏ kiểm hạn) đã lọt
  // lưới ở vòng thử phá đầu tiên.
  const clock = { now: 1_000_000 };
  const ctx = {
    console,
    Date: { now: () => clock.now },
    chrome: {
      runtime: { id: EXTENSION_ID },
      downloads: {
        onDeterminingFilename: { addListener: (fn) => { determiner = fn; } }
      }
    }
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(block, ctx);
  return { determiner, remember: ctx.rememberExpectedDownloadName, clock };
}

/* Gọi determiner một lần và cho biết nó đã ĐỀ XUẤT tên, hay BỎ QUA.
   Bỏ qua = `suggest()` trần = "tôi không có ý kiến" = Chrome dùng tên mặc định,
   mà với blob URL thì tên mặc định LÀ cái GUID. Đó chính là ca hỏng. */
function ask(determiner, item) {
  let outcome = { called: false, suggestion: undefined };
  determiner(item, (suggestion) => { outcome = { called: true, suggestion }; });
  return outcome;
}

const OUR_BLOB = `blob:chrome-extension://${EXTENSION_ID}/bd00d527-e43a-4806-bb1b-df5c59f6aa19`;
const WANTED = "Bridge-2026-09-03T12-46__audit.jsonl";

/* ---- ca đối chứng: mọi thứ khớp hoàn hảo thì phải đặt được tên ---------- */
{
  const { determiner, remember } = boot();
  assert.ok(typeof determiner === "function", "khối phải đăng ký được determiner");
  assert.equal(remember(OUR_BLOB, WANTED, "overwrite"), true);
  const out = ask(determiner, { url: OUR_BLOB, byExtensionId: EXTENSION_ID, filename: "bd00d527-e43a-4806-bb1b-df5c59f6aa19" });
  assert.equal(out.suggestion?.filename, WANTED, "ca đối chứng phải đặt đúng tên — nếu ca này đỏ thì harness sai, không phải mã sai");
  assert.equal(out.suggestion?.conflictAction, "overwrite");
}

/* ---- HỎNG 1 · Chrome không điền byExtensionId --------------------------- */
/* Có phiếu giữ tên cho ĐÚNG blob URL của chính mình — mà chỉ vì một trường
   metadata trống, mã cũ trả về sớm và bỏ luôn cái tên. Phiếu giữ tên khớp URL
   là bằng chứng sở hữu MẠNH HƠN `byExtensionId`: chỉ extension này tạo nổi một
   blob URL trên origin của nó. */
{
  const { determiner, remember } = boot();
  remember(OUR_BLOB, WANTED, "overwrite");
  const out = ask(determiner, { url: OUR_BLOB, filename: "bd00d527-e43a-4806-bb1b-df5c59f6aa19" });
  assert.equal(out.suggestion?.filename, WANTED,
    "byExtensionId trống KHÔNG được làm mất tên: có phiếu giữ tên cho đúng blob URL của mình là đủ chứng minh sở hữu");
}
{
  const { determiner, remember } = boot();
  remember(OUR_BLOB, WANTED, "overwrite");
  const out = ask(determiner, { url: OUR_BLOB, byExtensionId: null, filename: "bd00d527" });
  assert.equal(out.suggestion?.filename, WANTED, "byExtensionId = null cũng vậy");
}

/* ---- HỎNG 2 · khoá URL lệch -------------------------------------------- */
/* Chrome báo lại URL khác chuỗi ta dùng làm khoá (thêm/bớt phần đuôi). Phiếu
   giữ tên vẫn còn sống, vẫn của ta, vẫn đúng blob origin của ta — nhưng `get`
   trượt và tên bị bỏ. Ca này để mở CÓ CHỦ Ý: xem ghi chú cuối file. */
{
  const { determiner, remember } = boot();
  remember(OUR_BLOB, WANTED, "overwrite");
  const out = ask(determiner, { url: `${OUR_BLOB}#`, byExtensionId: EXTENSION_ID, filename: "bd00d527" });
  assert.equal(out.suggestion?.filename, WANTED,
    "khoá URL lệch KHÔNG được làm mất tên khi vẫn còn đúng MỘT phiếu giữ tên trên blob origin của chính mình");
}

/* ---- vẫn phải NHƯỜNG download của người khác --------------------------- */
/* Nới lỏng bằng chứng sở hữu mà nới quá tay thì extension này sẽ đi đặt tên cho
   download của extension khác, hoặc của chính người dùng. Ba ca dưới ghim mép. */
{
  const { determiner, remember } = boot();
  remember(OUR_BLOB, WANTED, "overwrite");
  for (const [item, why] of [
    [{ url: "https://example.com/report.pdf", byExtensionId: undefined, filename: "report.pdf" }, "download thường của người dùng"],
    [{ url: "blob:chrome-extension://aaaabbbbccccddddeeeeffffgggghhhh/1234", byExtensionId: "aaaabbbbccccddddeeeeffffgggghhhh", filename: "1234" }, "blob của extension KHÁC"],
    [{ url: "blob:https://chatgpt.com/9999", byExtensionId: undefined, filename: "9999" }, "blob của trang web"]
  ]) {
    const out = ask(determiner, item);
    assert.equal(out.called, true, `phải gọi suggest cho ${why} — không gọi là treo cả cái download`);
    assert.equal(out.suggestion, undefined, `phải NHƯỜNG ${why}: đặt tên hộ người khác là vượt quyền`);
  }
}

/* ---- phiếu giữ tên HẾT HẠN thì phải nhường ----------------------------- */
/* Không được dùng phiếu quá hạn: một phiếu cũ đem đặt tên cho một download
   không liên quan là đặt sai tên, tệ hơn là để Chrome đặt GUID. */
{
  const { determiner, remember } = boot();
  remember(OUR_BLOB, WANTED, "overwrite");
  const out = ask(determiner, { url: OUR_BLOB, byExtensionId: EXTENSION_ID, filename: "x" });
  assert.equal(out.suggestion?.filename, WANTED);
  const again = ask(determiner, { url: OUR_BLOB, byExtensionId: EXTENSION_ID, filename: "x" });
  assert.equal(again.suggestion, undefined, "phiếu dùng một lần: gọi lần hai phải nhường, không được đặt lại tên cũ");
}

/* ---- conflictAction phải là giá trị Chrome hiểu ------------------------ */
/* "fail" là chính sách NỘI BỘ, kiểm trước khi tải; Chrome không có giá trị đó.
   Truyền thẳng vào là Chrome bỏ qua cả object đề xuất. */
{
  const { determiner, remember } = boot();
  remember(OUR_BLOB, WANTED, "fail");
  const out = ask(determiner, { url: OUR_BLOB, byExtensionId: EXTENSION_ID, filename: "x" });
  assert.ok(["uniquify", "overwrite", "prompt"].includes(out.suggestion?.conflictAction),
    "conflictAction phải nằm trong enum của Chrome, không phải chính sách nội bộ");
}

/* ---- phiếu QUÁ HẠN thật, đo bằng đồng hồ đẩy tay -------------------- */
/* Ca "gọi lần hai" ở trên chỉ ghim việc TIÊU phiếu, không ghim HẠN — bỏ hẳn
   phép kiểm hạn vẫn xanh. Đây là ca dựng nổi ca hỏng đó. */
{
  const { determiner, remember, clock } = boot();
  remember(OUR_BLOB, WANTED, "overwrite");
  clock.now += 120_000 + 1;
  const out = ask(determiner, { url: OUR_BLOB, byExtensionId: EXTENSION_ID, filename: "bd00d527" });
  assert.equal(out.called, true, "vẫn phải gọi suggest, không được treo download");
  assert.equal(out.suggestion, undefined,
    "phiếu quá hạn phải bị NHƯỜNG: đem một phiếu cũ đặt tên cho download không liên quan là đặt SAI tên, tệ hơn để Chrome đặt GUID");
}
/* Và nhánh đi vòng theo blob origin cũng không được nhận phiếu quá hạn. */
{
  const { determiner, remember, clock } = boot();
  remember(OUR_BLOB, WANTED, "overwrite");
  clock.now += 120_000 + 1;
  const out = ask(determiner, { url: `${OUR_BLOB}#`, byExtensionId: EXTENSION_ID, filename: "x" });
  assert.equal(out.suggestion, undefined, "nhánh URL-lệch cũng phải tôn trọng hạn");
}

/* ---- NHIỀU phiếu còn hạn thì KHÔNG được đoán ------------------------- */
/* Nhánh đi vòng chỉ hợp lệ khi còn đúng MỘT phiếu. Hai phiếu mà vẫn nhận là
   gán tên của download này cho download kia — hỏng âm thầm, và file trên đĩa
   mang tên của một thứ khác. */
{
  const { determiner, remember } = boot();
  const OTHER_BLOB = `blob:chrome-extension://${EXTENSION_ID}/11111111-2222-3333-4444-555555555555`;
  remember(OUR_BLOB, WANTED, "overwrite");
  remember(OTHER_BLOB, "Quick-2026-09-03__results__v01.xlsx", "overwrite");
  const out = ask(determiner, { url: `${OUR_BLOB}#lech`, byExtensionId: EXTENSION_ID, filename: "x" });
  assert.equal(out.called, true);
  assert.equal(out.suggestion, undefined,
    "hai phiếu còn hạn thì phải NHƯỜNG: đoán một trong hai là có lúc đặt tên của job này cho file của job kia");
}
/* Nhưng khớp URL CHÍNH XÁC thì nhiều phiếu vẫn phải chạy được — nếu không, một
   run có hai file đầu ra sẽ tự chặn chính nó. */
{
  const { determiner, remember } = boot();
  const OTHER_BLOB = `blob:chrome-extension://${EXTENSION_ID}/11111111-2222-3333-4444-555555555555`;
  remember(OUR_BLOB, WANTED, "overwrite");
  remember(OTHER_BLOB, "Quick__results__v01.xlsx", "uniquify");
  assert.equal(ask(determiner, { url: OTHER_BLOB, byExtensionId: EXTENSION_ID, filename: "x" }).suggestion?.filename, "Quick__results__v01.xlsx");
  assert.equal(ask(determiner, { url: OUR_BLOB, byExtensionId: EXTENSION_ID, filename: "x" }).suggestion?.filename, WANTED);
}

/* ---- nhánh đi vòng cũng phải TIÊU phiếu ------------------------------ */
/* Không tiêu thì cùng một cái tên được đem gán cho download thứ hai, thứ ba…
   Trên đĩa sẽ là hai file khác nội dung tranh nhau một cái tên, và với
   conflictAction "overwrite" thì file trước bị ghi đè MẤT. */
{
  const { determiner, remember } = boot();
  remember(OUR_BLOB, WANTED, "overwrite");
  const first = ask(determiner, { url: `${OUR_BLOB}#lan1`, byExtensionId: EXTENSION_ID, filename: "x" });
  assert.equal(first.suggestion?.filename, WANTED, "lần đầu đi vòng phải nhận được tên");
  const second = ask(determiner, { url: `${OUR_BLOB}#lan2`, byExtensionId: EXTENSION_ID, filename: "y" });
  assert.equal(second.called, true);
  assert.equal(second.suggestion, undefined,
    "phiếu phải bị TIÊU ở nhánh đi vòng: dùng lại là gán một tên cho hai download, và với overwrite thì file trước MẤT");
}

console.log("download name determiner behaviour tests: PASS");
