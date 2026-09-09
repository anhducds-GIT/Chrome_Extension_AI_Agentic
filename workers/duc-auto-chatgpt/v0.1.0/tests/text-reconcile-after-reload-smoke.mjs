/**
 * GHIM B-43 vòng ba — F5 RỒI ĐỌC LẠI, và thứ tự của nó là phần chịu tải.
 *
 * ĐO LIVE 2026-09-09, đường cong đầy đủ với tab để nguyên bị che:
 *   giây 12    8 ký tự
 *   giây 25   25 ký tự
 *   giây 25 → 185   ĐỨNG YÊN ở 25, suốt 160 giây
 *   giây 197  run hết hạn 180 giây, bỏ cuộc, báo `TAB_HIDDEN_NO_STREAM`
 * Rồi F5 qua Bridge: **25 → 1.611 ký tự**, tab vẫn bị che, KHÔNG có lượt sinh mới.
 *
 * Cơ chế: Chrome không cấp khung hình cho tab bị che, nên trang ChatGPT không VẼ chữ vào DOM.
 * Chữ về tới trình duyệt đủ — câu trả lời nằm nguyên trên máy chủ suốt từ đầu. Đức để tab bị
 * che **99% thời gian** (*"tôi thường reload, F5 rồi sang Claude làm việc"*), nên đây là đường
 * CHÍNH, không phải ca ngoại lệ. Thói quen F5 của Đức chính là thuật toán đúng.
 *
 * **Phép đo bác bỏ hai giả thuyết, ghi ra để đừng ai thử lại:**
 *   ⑴ *"GPT viết lâu, cứ nới hạn giờ"* — SAI. Chữ đứng yên 160 giây; nếu đang viết thì con số
 *     phải nhích. Nới hạn giờ chỉ làm mọi job chậm thêm mà vẫn ghi hụt.
 *   ⑵ *"gói đọc bằng `innerText` nên mù trên tab bị che, đổi sang `textContent` là xong"* —
 *     SAI. Đo trực tiếp trên tab đang bị che: `chat.read` qua `innerText` trả về `status OK`
 *     với 1.659 ký tự. Đường đọc không mù; DOM mới là chỗ thiếu chữ.
 *
 * THỨ TỰ LÀ TOÀN BỘ PHẦN AN TOÀN, và nó CỐ Ý ngược với đường ảnh: ĐỌC trước để khẳng định lượt
 * hỏi của job đã nằm trong hội thoại, RỒI mới F5. Đảo hai bước đó thì mọi phép kiểm khác vẫn
 * xanh trong khi luật exact-once mất — F5 lúc còn lấp lửng "đã gửi hay chưa" là đúng cái
 * `chat.reload` từ chối làm. Mép ⑹ và ⑺ canh riêng chỗ đó.
 *
 * File này CẮT `answerAfterPrompt()` đã ship và chạy nó thật. Mỏ neo được ĐẾM — ra 0 là công
 * cụ hỏng, không phải "không có gì phải sửa".
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const doc = (ten) => fs.readFileSync(path.join(here, "..", ten), "utf8").split("\r\n").join("\n");

/* ---- ⓐ HÀM THUẦN: cắt từ mã đã ship, chạy thật ------------------------------------- */

const nguon = doc("reconciliation-core.js");
const START = "\n  const PROMPT_MATCH_CHARS = ";
assert.equal(nguon.split(START).length - 1, 1, "cắt được ĐÚNG một khối đối soát chữ — 0 nghĩa là mỏ neo hỏng");
const from = nguon.indexOf(START) + 1;
const END = "\n  }\n";
// promptKey() rồi answerAfterPrompt(): lấy tới chỗ đóng của hàm THỨ HAI.
const to = nguon.indexOf(END, nguon.indexOf("function answerAfterPrompt", from));
assert.ok(to > from, "không tìm thấy chỗ đóng answerAfterPrompt()");
const khoi = nguon.slice(from, to + END.length);
assert.ok(khoi.includes("PROMPT_NOT_IN_CONVERSATION"), "cắt nhầm khối: phải có nhánh không thấy lượt hỏi");

const san = {};
vm.createContext(san);
vm.runInContext(`${khoi}\nglobalThis.tim = answerAfterPrompt; globalThis.NAP = PROMPT_MATCH_CHARS;`, san);
const tim = san.tim;

const PROMPT = "Bối cảnh: một extension Chrome MV3. Hãy phân tích theo ba mục, mỗi mục ít nhất bốn câu: (1) PHÂN TÍCH; (2) RỦI RO CÒN LẠI; (3) KẾT LUẬN VÀ HÀNH ĐỘNG - ba việc cụ thể.";
const DU = "[MODE: Audit | BUDGET: 100 w] KẾT LUẬN: ba việc, theo thứ tự. Xong.";
const HUT = "[MODE: Audit | BUDGET: 100 w";

/* ⑴ Ca đo được: lượt hỏi có trong hội thoại, lượt trả lời ngay sau nó là câu đầy đủ. */
{
  const r = tim([
    { role: "assistant", text: "câu cũ" },
    { role: "user", text: PROMPT },
    { role: "assistant", text: DU }
  ], PROMPT);
  assert.equal(r.found, true);
  assert.equal(r.reason, "OK");
  assert.equal(r.text, DU, "phải trả về câu trả lời NGAY SAU lượt hỏi của mình");
}

/* ⑵ KHÔNG thấy lượt hỏi của mình → `found: false`. Đây là vế chặn F5: chưa chứng minh được
   prompt đã tới thì tuyệt đối không F5, vì lúc lấp lửng F5 mới là chỗ đẻ ra lượt gửi thứ hai. */
{
  const r = tim([
    { role: "user", text: "một câu hỏi khác hẳn của người dùng" },
    { role: "assistant", text: DU }
  ], PROMPT);
  assert.equal(r.found, false);
  assert.equal(r.reason, "PROMPT_NOT_IN_CONVERSATION", "và phải nói RÕ vì sao, đừng gộp với 'chưa trả lời'");
  assert.equal(r.text, "", "không được trả về chữ của lượt nào khác");
}

/* ⑶ Thấy lượt hỏi nhưng CHƯA có lượt trả lời → `found: true` mà `NO_ANSWER_YET`. Hai trạng
   thái này phải phân biệt được: một cái nói "không chứng minh được", cái kia nói "đã chứng
   minh, chỉ chưa có câu trả lời" — và chỉ cái thứ hai mới được phép F5. */
{
  const r = tim([{ role: "user", text: PROMPT }], PROMPT);
  assert.equal(r.found, true);
  assert.equal(r.reason, "NO_ANSWER_YET");
}

/* ⑷ KHÔNG được lấy lượt trả lời ĐỨNG TRƯỚC lượt hỏi. Bản lấy "lượt trả lời cuối của trang"
   sẽ xanh với ⑴ và sai ở đây — nó gán câu trả lời của câu hỏi khác cho job này. */
{
  const r = tim([
    { role: "user", text: PROMPT },
    { role: "assistant", text: DU },
    { role: "user", text: "câu hỏi Đức gõ tay chen vào" },
    { role: "assistant", text: "TRẢ LỜI CHO CÂU CỦA ĐỨC, không phải của job" }
  ], PROMPT);
  assert.equal(r.text, DU, "neo vào lượt hỏi của mình, không phải lượt cuối của trang");
}

/* ⑸ Cùng một prompt gửi hai lần trong một hội thoại → lấy câu của lần GẦN NHẤT. */
{
  const r = tim([
    { role: "user", text: PROMPT },
    { role: "assistant", text: "câu trả lời lần một" },
    { role: "user", text: PROMPT },
    { role: "assistant", text: DU }
  ], PROMPT);
  /* ĐỔI LUẬT 09/09 sau audit Codex. Bản cũ lấy lượt hỏi khớp CUỐI và mép này ghim đúng điều
     đó. Codex chỉ ra hệ quả: nắp so khớp chỉ lấy 160 ký tự ĐẦU, nên hai job chung một đoạn mở
     đầu dài — đúng hình dạng workbook của Đức, nơi mọi job ảnh chia sẻ một đoạn tả phong cách —
     có CÙNG khoá. Phép "lấy lượt cuối" khi đó neo vào lượt hỏi của job KHÁC, và
     `finishTextOutput()` ghi câu trả lời của job khác vào sổ với dấu `persistence_verified`.
     Báo thành công giả, đúng loại lỗi mà B-43 vừa đóng.

     Nay trùng khoá là **KHÔNG kết luận được**. Đánh đổi đã nhận và nói ra: một NGƯỜI gửi lại
     cùng một prompt bằng tay trong cùng hội thoại cũng bị từ chối, nên job đó DỪNG thay vì tự
     lấy câu trả lời mới nhất. Chọn hướng này vì cái mất là một lượt người xem; hướng kia làm
     dữ liệu sai đi thẳng vào sổ mà không ai thấy. Muốn chính xác hơn thì phải neo vào
     `data-message-id` chứ không phải nới mép này. */
  assert.equal(r.found, false, "trùng khoá prompt thì PHẢI từ chối kết luận");
  assert.equal(r.reason, "AMBIGUOUS_PROMPT_MATCH");
  assert.equal(r.text, "", "và tuyệt đối không trả về chữ nào — chữ đó có thể của job khác");
  assert.notEqual(r.text, DU, "hồi quy: bản cũ trả về đây câu trả lời của lượt cuối");
}

/* ⑹ `innerText` gói lại dòng theo bề rộng khung, nên chữ đọc về KHÔNG trùng khoảng trắng với
   prompt đã gõ. So nguyên văn là so hai thứ khác nhau, và cửa đối soát sẽ luôn nói "không
   thấy" — tức bản vá im lặng không bao giờ chạy. */
{
  const goiDong = PROMPT.replace(/ /g, "\n   ");
  const r = tim([{ role: "user", text: goiDong }, { role: "assistant", text: DU }], PROMPT);
  assert.equal(r.found, true, "khoảng trắng phải được bóp lại trước khi so");
  assert.equal(r.text, DU);
}

/* ⑺ Prompt rỗng → KHÔNG khớp bất cứ gì. Thiếu mép này thì một bản so chuỗi rỗng sẽ khớp lượt
   người dùng ĐẦU TIÊN nó gặp và gán bừa một câu trả lời cho job. */
{
  for (const xau of ["", "   ", null, undefined]) {
    const r = tim([{ role: "user", text: PROMPT }, { role: "assistant", text: DU }], xau);
    assert.equal(r.found, false, `prompt rỗng (${JSON.stringify(xau)}) không được khớp gì`);
    assert.equal(r.reason, "NO_PROMPT");
  }
}

/* ⑻ HAI PROMPT CHỈ KHÁC NHAU Ở ĐUÔI — mép này ĐÃ BỊ ĐẢO, 09/09, và lý do đáng đọc.

   Bản sáng 09/09 ghim chính ca này thành `found: true` và gọi nó là *"giới hạn đã biết, ghi ra
   để không ai tưởng nó chặt hơn thực tế"*. **Tôi đã tự viết cái đó xuống và tự cho là chấp nhận
   được. Nó không phải.** Audit Codex chiều cùng ngày chỉ ra hệ quả đầy đủ: khớp nhầm ở đây
   không dừng lại ở "khớp nhầm" — `finishTextOutput()` ghi **câu trả lời của job khác** vào sổ
   với dấu `persistence_verified`. Đó là **báo thành công giả**, đúng loại lỗi mà cả B-43 tồn tại
   để đóng. Và nó không hiếm: mọi job ảnh của Đức chia sẻ một đoạn tả phong cách dài hơn 160 ký
   tự, nên với một loạt job theo mẫu thì ca này là ca THƯỜNG.

   Hai việc sửa: khoá lấy **ĐẦU + ĐUÔI** (nên hai prompt khác đuôi nay khác khoá), và phép neo
   đòi **DUY NHẤT** (nên trùng khoá là "không kết luận được", không phải "lấy lượt cuối").

   Bài học, và nó lớn hơn con bug: **một "giới hạn đã biết" không thành an toàn chỉ vì đã được
   ghi ra.** Phải nói cả CÁI GIÁ của nó. Cái giá ở đây là dữ liệu sai đóng dấu đã-xác-minh, và
   nếu tôi viết ra chữ đó thì đã không ai để nó qua. */
{
  assert.equal(san.NAP, 160, "nắp so khớp đọc từ mã đã ship");
  const dauChung = "x".repeat(200);
  const r = tim([{ role: "user", text: `${dauChung} ĐUÔI A` }, { role: "assistant", text: DU }], `${dauChung} ĐUÔI B`);
  assert.equal(r.found, false, "hai prompt khác ĐUÔI phải là hai prompt KHÁC — khoá đầu+đuôi giữ đúng phần phân biệt");
  assert.equal(r.reason, "PROMPT_NOT_IN_CONVERSATION");
  assert.notEqual(r.text, DU, "hồi quy: bản cũ trả về đây câu trả lời của prompt KHÁC");

  // Giới hạn CÒN LẠI, nói cả cái giá lần này: trùng cả 160 đầu VÀ 160 cuối thì vẫn cùng khoá.
  // Cái giá lúc đó KHÔNG còn là dữ liệu sai — phép neo duy-nhất biến nó thành một lượt DỪNG
  // (`AMBIGUOUS_PROMPT_MATCH`), tức người xem. Đổi được hẳn thì phải neo `data-message-id`.
  const r2 = tim(
    [{ role: "user", text: `${dauChung} CUNG DUOI` }, { role: "assistant", text: DU }, { role: "user", text: `${dauChung} CUNG DUOI` }],
    `${dauChung} CUNG DUOI`
  );
  assert.equal(r2.found, false, "trùng cả đầu lẫn đuôi → DỪNG, không đoán");
  assert.equal(r2.reason, "AMBIGUOUS_PROMPT_MATCH");
}

/* ---- ⓑ ĐƯỜNG ĐI: cửa `dispatchOutcome` phải rẽ sang đối soát, không dừng hẳn ---------- */

const tOut = {};
vm.createContext(tOut);
vm.runInContext(`var window = {};\n${doc("text-output-core.js")}\nglobalThis.API = window.DacTextOutputCore;`, tOut);
const API = tOut.API;

/* ⑼ Job chữ, đã gửi, không có câu trả lời → phải rẽ sang ĐỐI SOÁT. Bản cũ dừng hẳn ở đây với
   lý lẽ "đối soát chỉ có bằng chứng cho ảnh"; câu đó đúng tới 09/09 và nay sai. */
{
  const d = API.dispatchOutcome({ task: "text_reasoning", ok: false, result: null, postSubmit: true });
  assert.equal(d.action, API.DISPATCH_ACTIONS.TEXT_RECONCILE, "job chữ đã gửi mà chưa có câu trả lời thì ĐỐI SOÁT, đừng dừng hẳn ngay");
  assert.equal(d.completed, null, "kết cục do phép đối soát quyết, không phải do cửa rẽ");
}

/* ⑽ MÉP NGƯỢC: `run.stop` của người vẫn thắng đối soát. Đảo hai vế này thì bấm Dừng xong máy
   vẫn đi F5 — người bấm Dừng để nó DỪNG. */
{
  const d = API.dispatchOutcome({ task: "text_reasoning", ok: false, result: null, postSubmit: true, stopRequested: true });
  assert.equal(d.action, API.DISPATCH_ACTIONS.USER_STOP, "người bấm Dừng thì dừng, không đối soát");
}

/* ⑾ MÉP NGƯỢC: có câu trả lời rồi thì chốt thẳng, KHÔNG đi qua đối soát. Thiếu mép này thì một
   bản đẩy MỌI job chữ qua F5 cũng xanh — và nó F5 sau mỗi job, tự tay xoá bộ nhớ attempt. */
{
  const d = API.dispatchOutcome({ task: "text_reasoning", ok: true, result: { type: "text", text: DU }, postSubmit: true });
  assert.equal(d.action, API.DISPATCH_ACTIONS.TEXT_OUTPUT, "đọc được ngay thì chốt ngay, đừng F5 thêm một lượt");
}

/* ⑿ MÉP NGƯỢC: đường ẢNH không bị đụng — nó có bằng chứng riêng và luật attribution riêng. */
{
  const d = API.dispatchOutcome({ task: "image_generation", ok: false, result: null, postSubmit: true });
  assert.equal(d.action, API.DISPATCH_ACTIONS.IMAGE_RECONCILE, "đường ảnh giữ nguyên cửa đối soát của nó");
}

/* ⒀ Dừng hẳn KHÔNG bị xoá — nó là chỗ rơi vào khi đối soát không chứng minh được gì. Xoá nó
   là bỏ mất đường an toàn cuối. */
{
  assert.equal(API.DISPATCH_ACTIONS.TEXT_HALT_NO_RESEND, "text_halt_no_resend", "đường dừng hẳn phải còn");
}

/* ---- ⓒ THỨ TỰ TRONG SIDEPANEL: đọc TRƯỚC, F5 SAU ------------------------------------ */

/* ⒁ Đây là vế mà một phép kiểm hành vi không với tới: thứ tự hai lời gọi bên trong
   `reconcileSubmittedText()`. Đảo chúng thì mọi mép trên vẫn xanh mà luật exact-once mất.
   Nên chỗ này đọc THẲNG mã đã ship, sau khi cắt bỏ chú thích để không khớp vào văn của
   chính mình — đúng cái bẫy đã sập một lần ở phép ghim ADR-0050 ⒝. */
{
  const sp = doc("sidepanel.js");
  const dau = sp.indexOf("async function reconcileSubmittedText(");
  assert.ok(dau > 0, "mỏ neo hỏng: không thấy reconcileSubmittedText()");
  const cuoi = sp.indexOf("\n  async function reconcileSubmittedAttempt(", dau);
  assert.ok(cuoi > dau, "không tìm thấy chỗ đóng reconcileSubmittedText()");
  // Cắt HẲN khối /* … */ rồi cắt // đến hết dòng. Bộ lọc theo TIỀN TỐ DÒNG không đủ: dòng
  // tiếp của một khối /* … */ bắt đầu bằng chữ thì sống sót, và văn của chính phép ghim khớp
  // vào phép kiểm. Đã sập thật 09/09 ở ghim B-40 ⒝ — chữ "message.prompt" trong một chú thích
  // làm mép chống-tiêm đỏ oan.
  const than = sp.slice(dau, cuoi)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\/\/.*$/gm, " ");

  const viTriDoc = than.indexOf("await doc()");
  const viTriF5 = than.indexOf("repairWorkspaceSurface()");
  assert.ok(viTriDoc > 0, "phải có lượt ĐỌC trong thân hàm");
  assert.ok(viTriF5 > 0, "phải có lượt F5 trong thân hàm");
  assert.ok(viTriDoc < viTriF5, "ĐỌC phải đứng TRƯỚC F5 — đảo lại là F5 lúc chưa biết prompt đã tới hay chưa");

  const viTriChan = than.indexOf("reconcile?.found");
  assert.ok(viTriChan > 0 && viTriChan < viTriF5, "cửa chặn 'không thấy lượt hỏi' phải đứng TRƯỚC F5");
  assert.ok(/dungHan\(/.test(than.slice(viTriChan, viTriF5)), "và không thấy lượt hỏi thì DỪNG HẲN, không đi tiếp tới F5");
  assert.ok(!/DAC_RUN_TEXT_JOB|setContentEditableValue|submitPrompt/.test(than), "đường đối soát KHÔNG được gọi bất cứ thứ gì gửi prompt");

  /* ⒂ KHÔNG CÓ CỬA TẮT "đọc thẳng đã đủ thì khỏi F5". Bản đầu CÓ, và nó để lọt đúng con bug
     này trong lượt nghiệm thu live 09/09: hết giờ 180 giây → đối soát → cửa tắt đọc được 27
     ký tự, `looksTruncated` bảo trông trọn vẹn, chốt SUCCESS với `persistence_verified: true`.
     Câu trả lời thật sau một cú F5: 1.917 ký tự.

     Mép này canh bằng THỨ TỰ, không bằng chữ: lượt chốt (`finishTextOutput`) đầu tiên trong
     thân hàm phải nằm SAU lượt F5. Đảo lại là mở lại đúng cửa tắt đã để lọt 27 ký tự. */
  const viTriChot = than.indexOf("finishTextOutput(");
  assert.ok(viTriChot > 0, "phải có lượt chốt trong thân hàm");
  assert.ok(viTriChot > viTriF5, "mọi lượt chốt phải nằm SAU F5 — không có cửa tắt tin DOM trước khi F5");
  assert.equal(than.split("finishTextOutput(").length - 1, 1, "ĐÚNG MỘT lượt chốt: hai lượt nghĩa là cửa tắt quay lại");

  /* ⒃ SAU F5 PHẢI DÒ, KHÔNG ĐỌC MỘT LẦN. Nghiệm thu live 09/09 vấp đúng đây: `waitTabComposer()`
     trả về ngay khi KHUNG GÕ hiện, mà ChatGPT dựng khung gõ TRƯỚC các lượt hội thoại — nên lượt
     đọc một-nhát ngay sau F5 được **0 ký tự** và job dừng hẳn, trong khi mười giây sau trang giữ
     **2.117 ký tự**. Một lượt đọc đơn ở đây là một bản vá xanh mọi phép kiểm mà không bao giờ
     cứu được job nào.

     Canh bằng CẤU TRÚC: giữa lượt F5 và lượt chốt phải có một vòng lặp, và nó phải có nắp thời
     gian — dò không nắp là treo cả hàng đợi vào một trang không bao giờ trả lời. */
  const giua = than.slice(viTriF5, viTriChot);
  assert.match(giua, /while\s*\(|for\s*\(/, "sau F5 phải DÒ tới khi câu trả lời hiện, đừng đọc một lần rồi kết luận");
  assert.match(giua, /RECONCILE_READ_TIMEOUT_MS/, "và vòng dò phải có NẮP thời gian, đừng dò vô hạn");
  assert.match(than, /await sleep\(/, "vòng dò phải nghỉ giữa hai lượt đọc, đừng quay nóng");

  const nap = doc("sidepanel.js").match(/const RECONCILE_READ_TIMEOUT_MS = (\d+);/);
  assert.ok(nap, "mỏ neo hỏng: không thấy nắp thời gian dò sau F5");
  assert.ok(Number(nap[1]) >= 30000, `nắp dò sau F5 phải đủ rộng cho một câu trả lời dài — đang là ${Number(nap[1]) / 1000} giây`);
}

console.log("B-43 F5 rồi đọc lại, chạy thật (16 mép): PASS");
