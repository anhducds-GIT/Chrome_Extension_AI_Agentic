// Test ghim G-02: "Một run gõ vào ĐÚNG một tab và ĐÚNG một hội thoại, từ đầu
// tới cuối." Trước bản vá, `activeTab()` gọi
// `chrome.tabs.query({active:true, currentWindow:true})` MỖI LẦN gửi, và chỉ
// kiểm origin. Đổi tab hoặc đổi hội thoại giữa chừng là runner âm thầm gõ
// prompt của job sang chỗ khác rồi đọc ảnh của chỗ đó về làm output.
//
// File này có HAI NỬA, và nửa nào cũng cần:
//
//   NỬA HÀNH VI — nạp `tab-lock-core.js`, `provider-adapter.js` và
//   `runner-core.js` THẬT vào một sandbox vm rồi CHẠY `resolveBoundTab()` với
//   tab giả. Ba ca thật của việc này (đổi tab · đổi hội thoại · tab biến mất)
//   là ca hành vi, không phải ca chuỗi ký tự. Dùng `isProviderUrl` thật chứ
//   không phải bản giả: nếu luật mặt hợp lệ của Gemini đổi thì test này phải
//   biết. Và ca cuối chạy luôn `classifyFailure` THẬT trên thông điệp ném ra,
//   nên nó ghim cả dây chuyền: lỗi → nhãn RECEIVER_LOST → dừng cứng, không
//   thử lại. Ghim vào nhãn là ghim vào cái người vận hành thấy; ghim vào chuỗi
//   ký tự trong thông điệp thì đổi một chữ là vỡ mà chẳng bảo vệ được gì.
//
//   NỬA WIRING — soi mã nguồn, vì `sidepanel.js` không nạp nổi vào Node (cần
//   cả `chrome.*` lẫn DOM của side panel). Nửa này tồn tại vì phiên trước ĐÃ
//   viết đúng core mà quên nối: `tab-lock-core.js` không có trong
//   `sidepanel.html`, và `bindRunTab`/`releaseRunTab` được định nghĩa nhưng
//   KHÔNG AI GỌI. Core hoàn hảo mà không ai gọi thì bằng không có.
//
// Không dùng regex kiểu /mở[\s\S]*?đóng/ để kiểm "trong phạm vi": `[\s\S]*?`
// chạy tuột ra ngoài thân hàm và cho xanh giả (đã cắn 4 lần ở repo này). Mọi
// phép soi dưới đây cắt đúng thân hàm hoặc đúng một DÒNG trước khi khẳng định.

import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

let passed = 0;
const ok = (name) => { passed += 1; console.log(`  ok  ${name}`); };

/* ---- nạp core thật vào sandbox ------------------------------------------ */

const sandbox = vm.createContext({ URL, Error, console });
sandbox.window = sandbox;
for (const file of ["provider-adapter.js", "runner-core.js", "tab-lock-core.js"]) {
  vm.runInContext(fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8"), sandbox, { filename: file });
}
const { conversationIdOf, resolveBoundTab } = sandbox.DacTabLockCore;
const { isProviderUrl } = sandbox.DacProviderAdapter;
const { classifyFailure, HARD_STOP_FAILURE_TYPES, canRetry } = sandbox.DacRunnerCore;

const APP_A = "https://gemini.google.com/app/aaaa1111";
const APP_B = "https://gemini.google.com/app/bbbb2222";

// Bộ giải mặc định: một tab duy nhất, id 7, ở địa chỉ cho trước.
function world(url, { tabId = 7, missing = false, throws = false } = {}) {
  const calls = { getTab: 0, pickActiveTab: 0 };
  return {
    calls,
    getTab: async (id) => {
      calls.getTab += 1;
      assert.equal(id, tabId, "phải hỏi ĐÚNG tab đã khoá, không phải tab nào khác");
      if (throws) throw new Error("No tab with id: 7.");
      return missing ? null : { id: tabId, url };
    },
    pickActiveTab: async () => { calls.pickActiveTab += 1; return { id: 99, url: APP_B }; },
    isProviderUrl
  };
}

async function refuses(options) {
  let thrown = null;
  try { await resolveBoundTab(options); }
  catch (error) { thrown = error; }
  assert.ok(thrown, "phải ném lỗi, không được lặng lẽ trả về một tab");
  return thrown;
}

/* ---- 1. ĐỐI CHỨNG: đúng tab, đúng hội thoại → đi tiếp bình thường -------
   Không có ca này thì mọi ca đỏ bên dưới có thể "xanh oan" chỉ vì harness
   không bao giờ đi tới được nhánh cần kiểm. */
{
  const w = world(APP_A);
  const out = await resolveBoundTab({ boundTabId: 7, boundConversationId: "aaaa1111", ...w });
  assert.equal(out.tab.id, 7, "phải trả về đúng tab đã khoá");
  assert.equal(out.adoptConversationId, null, "hội thoại đã khoá rồi thì không nhận lại lần nữa");
  assert.equal(w.calls.pickActiveTab, 0, "đã khoá tab thì TUYỆT ĐỐI không được hỏi lại 'tab nào đang hoạt động' — đó chính là cái bug");
  ok("đối chứng: đúng tab + đúng hội thoại → trả tab đã khoá, không hỏi lại tab đang hoạt động");
}

/* ---- 2. CHƯA KHOÁ → đường cũ, vẫn dùng được ------------------------------
   Check Plan và system.ping chạy lúc chưa có run nào. Bản vá không được làm
   chết chúng. */
{
  const w = world(APP_A);
  const out = await resolveBoundTab({ boundTabId: null, boundConversationId: null, ...w });
  assert.equal(out.tab.id, 99, "chưa khoá thì phải lấy tab đang hoạt động (đường cũ, cho Check Plan / ping)");
  assert.equal(w.calls.getTab, 0, "chưa khoá thì không có id nào để tra");
  ok("chưa khoá: rơi về tab đang hoạt động — Check Plan và ping lúc rảnh vẫn chạy");
}

/* ---- 3. ĐỔI TAB giữa chừng ----------------------------------------------
   Người vận hành bấm sang tab khác. Tab đã khoá vẫn còn, vẫn đúng hội thoại,
   nên KHÔNG được coi là lỗi — phải gửi vào đúng tab đã khoá, kệ tab nào đang
   hoạt động. Đây là ca chính của G-02 và nó là ca THÀNH CÔNG, không phải ca
   lỗi: bản vá đúng là gửi đúng chỗ, không phải dừng run. */
{
  const w = world(APP_A); // pickActiveTab trả tab 99 ở hội thoại B — tab người dùng vừa nhảy sang
  const out = await resolveBoundTab({ boundTabId: 7, boundConversationId: "aaaa1111", ...w });
  assert.equal(out.tab.id, 7, "đổi tab giữa chừng: prompt vẫn phải đi vào tab 7 đã khoá, không phải tab 99 đang hoạt động");
  assert.notEqual(out.tab.id, 99, "gửi sang tab đang hoạt động là đúng cái lỗi G-02 sinh ra để bịt");
  assert.equal(w.calls.pickActiveTab, 0, "không được hỏi tab đang hoạt động lần nào nữa sau khi đã khoá");
  ok("đổi tab giữa chừng: vẫn gõ vào tab đã khoá, không trôi theo tab đang hoạt động");
}

/* ---- 4. ĐỔI HỘI THOẠI giữa chừng ----------------------------------------
   Cùng tab id, nhưng người bấm vào một hội thoại khác ở thanh bên (hoặc bấm
   Back). Chỉ kiểm origin thì lọt — và prompt của job này đi vào cuộc chat của
   người khác, rồi ảnh của cuộc đó bị đọc về làm output của job này. */
{
  const w = world(APP_B);
  const error = await refuses({ boundTabId: 7, boundConversationId: "aaaa1111", ...w });
  assert.equal(classifyFailure(error), "RECEIVER_LOST", "đổi hội thoại phải quy về RECEIVER_LOST qua classifyFailure THẬT");
  assert.ok(error.message.includes("aaaa1111") && error.message.includes("bbbb2222"), "thông điệp phải nói rõ trước là hội thoại nào, nay là hội thoại nào — Đức cần biết nó trôi đi đâu");
  ok("đổi hội thoại giữa chừng (cùng tab, khác /app/<id>) → RECEIVER_LOST");
}

/* ---- 5. TAB BIẾN MẤT — ca dễ quên nhất ----------------------------------
   Hai kiểu biến mất, Chrome báo khác nhau: `tabs.get` NÉM (tab đã đóng), và
   `tabs.get` trả về thứ không có id. Cả hai phải chặn được. */
for (const [name, opts] of [["tabs.get ném lỗi", { throws: true }], ["tabs.get trả null", { missing: true }]]) {
  const w = world(APP_A, opts);
  const error = await refuses({ boundTabId: 7, boundConversationId: "aaaa1111", ...w });
  assert.equal(classifyFailure(error), "RECEIVER_LOST", `tab biến mất (${name}) phải quy về RECEIVER_LOST`);
  assert.equal(w.calls.pickActiveTab, 0, "tab đã khoá biến mất thì DỪNG, tuyệt đối không âm thầm rơi về tab đang hoạt động — rơi về là gõ prompt vào tab bất kỳ người dùng đang mở");
  ok(`tab biến mất (${name}) → RECEIVER_LOST, không rơi về tab đang hoạt động`);
}

/* ---- 6. TAB TRÔI KHỎI MẶT DÙNG ĐƯỢC -------------------------------------
   Khác nhánh ChatGPT: ChatGPT chỉ kiểm origin. Gemini có HAI mặt hợp lệ
   (`/images`, `/app`) nên phải dùng `isProviderUrl` thật — cùng origin
   gemini.google.com mà sang `/settings` thì vẫn là mất receiver. */
{
  const w = world("https://gemini.google.com/settings");
  const error = await refuses({ boundTabId: 7, boundConversationId: "aaaa1111", ...w });
  assert.equal(classifyFailure(error), "RECEIVER_LOST", "cùng origin nhưng sai mặt vẫn phải là RECEIVER_LOST");

  // Ca trên MỘT MÌNH nó không chứng minh được luật mặt: hội thoại đã khoá là
  // 'aaaa1111' còn /settings không có hội thoại nào, nên phép kiểm hội thoại ở
  // dưới cũng chặn được — thay isProviderUrl bằng phép kiểm origin trần vẫn
  // xanh (đột biến M10 đã THOÁT đúng bằng đường đó). Ca dưới đây tách riêng
  // luật mặt: run bắt đầu ở /images nên CHƯA có hội thoại nào để so, và khi đó
  // isProviderUrl là lớp DUY NHẤT còn lại. Đây là tình huống thật: tab trôi
  // sang /settings trước lần gửi đầu tiên.
  const naked = world("https://gemini.google.com/settings");
  const nakedError = await refuses({ boundTabId: 7, boundConversationId: null, ...naked });
  assert.equal(classifyFailure(nakedError), "RECEIVER_LOST", "chưa khoá hội thoại thì luật mặt (isProviderUrl) là lớp duy nhất còn lại — kiểm origin trần sẽ cho gõ prompt vào /settings");
  ok("tab trôi sang gemini.google.com/settings (đúng origin, sai mặt) → RECEIVER_LOST, kể cả khi chưa khoá hội thoại");
}

/* ---- 7. THÔNG ĐIỆP KHÔNG ĐƯỢC NHÚNG ĐƯỜNG DẪN LẠ ------------------------
   `classifyFailure` phân loại bằng cách DÒ CHỮ, và nó thử `/timeout/` TRƯỚC
   `/receiver/`. Nên một địa chỉ lạ chứa chữ "timeout" nhúng vào thông điệp sẽ
   lái lỗi này sang nhãn TIMEOUT — mà TIMEOUT thì ĐƯỢC THỬ LẠI. Nghĩa là mất
   tab sẽ biến thành "gửi lại prompt vào một tab không biết ở đâu".
   Nhánh ChatGPT nhúng 80 ký tự đầu của địa chỉ nên nó DÍNH ca này; bản Gemini
   cố ý chỉ nhúng origin. Đây là chỗ hai nhánh khác nhau, và nó có hậu quả. */
{
  const w = world("https://lure.example.com/timeout/captcha?q=ambiguous");
  const error = await refuses({ boundTabId: 7, boundConversationId: "aaaa1111", ...w });
  assert.equal(classifyFailure(error), "RECEIVER_LOST", "địa chỉ lạ chứa 'timeout'/'captcha' KHÔNG được lái nhãn lỗi đi chỗ khác");
  assert.ok(!/timeout|captcha|ambiguous/i.test(error.message), "thông điệp chỉ được nhúng origin, không nhúng đường dẫn/query của địa chỉ lạ");
  assert.ok(error.message.includes("https://lure.example.com"), "vẫn phải nói cho Đức biết tab trôi sang origin nào");
  ok("địa chỉ lạ chứa chữ bẫy: nhãn vẫn RECEIVER_LOST, thông điệp chỉ mang origin");
}

/* ---- 8. RECEIVER_LOST phải DỪNG CỨNG, không thử lại ---------------------- */
{
  const w = world(APP_B);
  const error = await refuses({ boundTabId: 7, boundConversationId: "aaaa1111", ...w });
  const failureType = classifyFailure(error);
  assert.ok(HARD_STOP_FAILURE_TYPES.has(failureType), "RECEIVER_LOST phải nằm trong nhóm dừng cứng");
  assert.equal(canRetry({ retry_count: 0, settings: { max_retries: 3 } }, failureType), false, "mất tab / trôi hội thoại thì KHÔNG được thử lại — thử lại nghĩa là đoán xem nên gõ vào đâu");
  ok("RECEIVER_LOST → dừng cứng, canRetry() thật trả false dù còn quota thử lại");
}

/* ---- 9. NHẬN hội thoại do chính run này tạo ra ---------------------------
   Snapshot 3: gửi từ `/images` sẽ ĐIỀU HƯỚNG tab sang `/app/<id>`. Nên run bắt
   đầu ở `/images` có boundConversationId = null, và lần giải đầu tiên sau khi
   trang nhảy phải NHẬN id đó làm của mình — chứ không phải coi là trôi. */
{
  const w = world(APP_A);
  const out = await resolveBoundTab({ boundTabId: 7, boundConversationId: null, ...w });
  assert.equal(out.adoptConversationId, "aaaa1111", "run bắt đầu ở /images phải nhận hội thoại do chính nó tạo ra");
  assert.equal(out.tab.id, 7, "nhận hội thoại không được đổi tab");
  ok("bắt đầu ở /images: nhận hội thoại /app/<id> do chính run tạo ra, không coi là trôi");
}

/* ---- 10. ĐANG CHUYỂN TRANG: hoãn phán xét, đừng báo động giả -------------
   Giữa lúc commit, Chrome trả `url` rỗng và để đích ở `pendingUrl`; có lúc
   chưa có cái nào. Phán xét trên chuỗi rỗng là dừng cứng đúng vào lúc gửi
   prompt ĐẦU TIÊN (chính là lúc /images nhảy sang /app). */
{
  const blank = { getTab: async () => ({ id: 7, url: "", pendingUrl: "" }), pickActiveTab: async () => { throw new Error("không được gọi"); }, isProviderUrl };
  const out = await resolveBoundTab({ boundTabId: 7, boundConversationId: "aaaa1111", ...blank });
  assert.equal(out.tab.id, 7, "chưa biết địa chỉ thì hoãn phán xét, để ping của content script quyết");
  assert.equal(out.adoptConversationId, null, "chưa biết địa chỉ thì cũng chưa nhận hội thoại nào");

  const pending = { getTab: async () => ({ id: 7, url: "", pendingUrl: APP_B }), pickActiveTab: async () => { throw new Error("không được gọi"); }, isProviderUrl };
  const error = await refuses({ boundTabId: 7, boundConversationId: "aaaa1111", ...pending });
  assert.equal(classifyFailure(error), "RECEIVER_LOST", "biết đích qua pendingUrl thì phải phán xét trên đích đó, không bỏ qua");
  ok("đang chuyển trang: url rỗng → hoãn phán xét; có pendingUrl → phán xét trên pendingUrl");
}

/* ---- 11. conversationIdOf: tiền tố tài khoản /u/<n> ---------------------- */
{
  assert.equal(conversationIdOf("https://gemini.google.com/u/2/app/zzz9"), "zzz9", "tiền tố /u/<n> phải bị bỏ trước khi đọc id — cùng hội thoại mà báo khác nhau là dừng cứng oan");
  assert.equal(conversationIdOf("https://gemini.google.com/app/zzz9?hl=vi"), "zzz9", "query không được dính vào id");
  assert.equal(conversationIdOf("https://gemini.google.com/images"), null, "mặt /images chưa có hội thoại nào");
  assert.equal(conversationIdOf("https://gemini.google.com/app"), null, "/app trần chưa có hội thoại nào");
  assert.equal(conversationIdOf("không-phải-địa-chỉ"), null, "địa chỉ hỏng thì trả null, không được ném");
  ok("conversationIdOf: bỏ /u/<n>, bỏ query, /images và /app trần → null, địa chỉ hỏng → null");
}

/* ======================================================================== */
/* NỬA WIRING — core đúng mà không ai gọi thì bằng không có                  */
/* ======================================================================== */

const sidepanel = fs.readFileSync(new URL("../sidepanel.js", import.meta.url), "utf8");
const html = fs.readFileSync(new URL("../sidepanel.html", import.meta.url), "utf8");

// Cắt ĐÚNG thân một hàm ở tầng ngoài cùng của IIFE (thụt 2 dấu cách). Hàm lồng
// bên trong thụt sâu hơn nên không cắt nhầm.
function body(name) {
  const start = sidepanel.indexOf(`async function ${name}(`);
  assert.notEqual(start, -1, `không tìm thấy ${name}()`);
  const ends = [sidepanel.indexOf("\n  async function ", start + 1), sidepanel.indexOf("\n  function ", start + 1)].filter((i) => i > 0);
  assert.ok(ends.length, `không cắt được thân ${name}()`);
  return sidepanel.slice(start, Math.min(...ends)).split("\n").filter((line) => !line.trim().startsWith("//")).join("\n");
}

/* ---- 12. sidepanel.html phải NẠP tab-lock-core.js -----------------------
   Phiên trước viết xong core mà quên dòng này. Hậu quả không phải "khoá tab
   không chạy" — mà là `window.DacTabLockCore` undefined, nên `activeTab()` ném
   TypeError ở MỌI lần gửi: extension chết hẳn, không gửi được job nào. */
{
  const iCore = html.indexOf('<script src="tab-lock-core.js"></script>');
  const iPanel = html.indexOf('<script src="sidepanel.js"></script>');
  assert.notEqual(iCore, -1, "sidepanel.html phải nạp tab-lock-core.js — thiếu nó thì window.DacTabLockCore undefined và activeTab() ném ở mọi lần gửi");
  assert.notEqual(iPanel, -1, "không tìm thấy thẻ script của sidepanel.js");
  assert.ok(iCore < iPanel, "tab-lock-core.js phải nạp TRƯỚC sidepanel.js");
  ok("sidepanel.html nạp tab-lock-core.js, và nạp trước sidepanel.js");
}

/* ---- 13. activeTab() đi qua core, KHÔNG còn tự query tab đang hoạt động -- */
{
  const activeBody = body("activeTab");
  assert.match(activeBody, /window\.DacTabLockCore\.resolveBoundTab\(/, "activeTab() phải giải qua resolveBoundTab của core");
  assert.ok(!activeBody.includes("chrome.tabs.query"), "activeTab() KHÔNG được tự gọi chrome.tabs.query nữa — đó đúng là dòng gây ra G-02");
  assert.match(activeBody, /boundTabId:\s*state\.boundTabId/, "phải truyền tab đã khoá vào core, không truyền hằng số");
  assert.match(activeBody, /boundConversationId:\s*state\.boundConversationId/, "phải truyền hội thoại đã khoá vào core");
  assert.match(activeBody, /getTab:\s*\(id\)\s*=>\s*chrome\.tabs\.get\(id\)/, "phải tra tab THEO ID đã khoá");
  assert.match(activeBody, /state\.boundConversationId\s*=\s*resolved\.adoptConversationId/, "phải GHI LẠI hội thoại vừa nhận — không ghi thì lần sau lại nhận tiếp và khoá hội thoại thành vô dụng");
  ok("activeTab() giải qua core, không còn chrome.tabs.query, và ghi lại hội thoại vừa nhận");
}

/* ---- 14. run() KHOÁ tab, và khoá TRƯỚC authoritativeValidate -------------
   Trước bản vá, bindRunTab/releaseRunTab tồn tại nhưng không chỗ nào gọi.
   Khoá phải đứng trước authoritativeValidate: validate có await (nó ping tab),
   và đó đúng là khoảng người vận hành hay đổi tab sau khi bấm Run. */
{
  const runBody = body("run");
  const iBind = runBody.indexOf("await bindRunTab()");
  const iValidate = runBody.indexOf("await authoritativeValidate(");
  const iRunning = runBody.indexOf("state.running = true");
  assert.notEqual(iBind, -1, "run() phải gọi bindRunTab() — core viết xong mà không ai gọi thì khoá không tồn tại");
  assert.notEqual(iValidate, -1, "không tìm thấy chỗ run() gọi authoritativeValidate");
  assert.ok(iBind < iValidate, "bindRunTab() phải đứng TRƯỚC authoritativeValidate — khoá sau validate là để hở lại đúng khoảng await cần bịt");
  assert.ok(iBind < iRunning, "phải khoá xong trước khi run chuyển sang trạng thái đang chạy");
  ok("run() gọi bindRunTab() trước authoritativeValidate và trước khi vào trạng thái chạy");
}

/* ---- 15. run() NHẢ tab trên CẢ BA đường thoát ----------------------------
   Không nhả thì run sau thừa kế khoá của run trước và gõ vào tab người vận
   hành đã bỏ đi từ lâu. Ba đường: validate hỏng · hàng đợi rỗng · finally.
   Soi theo DÒNG, không soi bằng [\s\S]*? — cái đó chạy tuột ra ngoài phạm vi. */
{
  const runBody = body("run");
  const lines = runBody.split("\n");
  const lineWith = (needle) => {
    const found = lines.filter((line) => line.includes(needle));
    assert.equal(found.length, 1, `phải có đúng một dòng chứa ${JSON.stringify(needle)} trong run()`);
    return found[0];
  };
  assert.ok(lineWith('setStatus("ERROR"); progress(reason)').includes("releaseRunTab()"), "đường thoát 'authoritativeValidate hỏng' phải nhả tab");
  assert.ok(lineWith("jobs are eligible.").includes("releaseRunTab()"), "đường thoát 'hàng đợi rỗng' phải nhả tab");

  const iFinally = runBody.lastIndexOf("} finally {");
  assert.notEqual(iFinally, -1, "không tìm thấy khối finally của run()");
  const finallyBlock = runBody.slice(iFinally);
  assert.ok(finallyBlock.includes("releaseRunTab()"), "finally của run() phải nhả tab — run chết theo đường nào cũng phải nhả");
  const iRelease = finallyBlock.indexOf("releaseRunTab()");
  const iRunningFalse = finallyBlock.indexOf("state.running = false");
  assert.ok(iRelease < iRunningFalse, "nhả tab trước khi hạ cờ running, để không có khoảnh khắc nào 'rảnh mà vẫn giữ khoá'");

  const total = (runBody.match(/releaseRunTab\(\)/g) || []).length;
  assert.equal(total, 3, `run() phải nhả tab trên đúng 3 đường thoát, đếm được ${total} — thiếu một đường là run sau thừa kế khoá của run trước`);
  ok("run() nhả tab trên cả ba đường thoát (validate hỏng · hàng đợi rỗng · finally), nhả trước khi hạ cờ running");
}

/* ---- 16. CHỈ MỘT chỗ khoá — khác nhánh ChatGPT --------------------------
   ChatGPT phải khoá ở cả run() lẫn bridgeRunTrial() vì trial của nó có runner
   riêng. bridgeRunTrial của Gemini gọi thẳng run("selected"), cùng một đường
   với nút của người vận hành, nên khoá ở hai chỗ là thừa — và thừa ở đây có
   giá: khoá hai lần thì đường nhả phải khớp hai lần. Ghim để không ai "port
   cho đủ" bằng cách dán thêm một lần khoá nữa. */
{
  const trialBody = body("bridgeRunTrial");
  assert.match(trialBody, /run\("selected"\)/, "bridgeRunTrial phải đi qua đúng run() của người vận hành, không có runner thứ hai");
  assert.ok(!trialBody.includes("bindRunTab"), "bridgeRunTrial KHÔNG được tự khoá tab — nó gọi run() và run() đã khoá rồi");
  const bindCalls = (sidepanel.match(/await bindRunTab\(\)/g) || []).length;
  assert.equal(bindCalls, 1, `cả gói chỉ được có ĐÚNG một chỗ gọi bindRunTab(), đếm được ${bindCalls}`);
  ok("chỉ một chỗ khoá: bridgeRunTrial đi qua run(), không tự khoá lần hai");
}

console.log(`\n${passed} khẳng định xanh`);
