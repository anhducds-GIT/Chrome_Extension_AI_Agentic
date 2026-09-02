/* The adapter is only worth having if content.js actually stops knowing which
   product it drives. This test is the guard: it fails the build if a
   provider-specific selector creeps back into content.js.

   Written 2026-08-26 after a live trial burned six image generations while
   detection reported NO_NEW_IMAGE six times -- the inherited
   `[data-message-author-role="assistant"]` selector matched nothing on the
   real page. Selectors that can rot must live in ONE file, be reportable by
   diagnostics.dom_probe, and be replaceable without touching run logic. */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const read = (name) => fs.readFileSync(new URL(name, root), "utf8");
const content = read("content.js");
const manifest = JSON.parse(read("manifest.json"));
const html = read("sidepanel.html");

// `URL` phải có mặt trong hộp cát: luật surface phân tích đường dẫn bằng `new URL()`, và
// `vm.runInNewContext` với một object trần KHÔNG có sẵn global đó. Thiếu nó thì `surface()`
// ném, rơi vào nhánh bắt lỗi, và trả WRONG cho MỌI url — phép kiểm sẽ đỏ vì lý do sai hoàn
// toàn (đã mất vài phút vì đúng chuyện này 2026-09-02).
const context = { window: null, URL };
context.window = context;
vm.runInNewContext(read("provider-adapter.js"), context);
const adapter = context.DacProviderAdapter;

// --- the adapter is loaded before anything that consumes it ------------
const scripts = manifest.content_scripts[0].js;
assert.equal(scripts[0], "provider-adapter.js", "the adapter must load first in the content world");
assert.ok(html.includes('src="provider-adapter.js"'), "the side panel loads the adapter too");

// --- shape matches the Gemini worker so the two converge ---------------
for (const key of ["provider", "SELECTORS", "TIMING", "ORIGIN", "SURFACE", "isProviderUrl", "surface", "surfaceAllowed", "securityBlockerPattern", "matchesGenerationLimit"]) {
  assert.ok(key in adapter, `adapter exposes ${key}`);
}
assert.equal(adapter.provider, "chatgpt");
assert.ok(Object.isFrozen(adapter), "the adapter cannot be mutated at runtime");
assert.ok(Object.isFrozen(adapter.SELECTORS));

// --- every selector is a selector Chrome will accept -------------------
// A typo here would silently match nothing, which is exactly the failure
// mode this whole file exists to prevent.
const flat = Object.values(adapter.SELECTORS).flatMap((value) => Array.isArray(value) ? value : [value]);
assert.ok(flat.length >= 10, "the adapter carries the real selector set");
for (const selector of flat) {
  assert.equal(typeof selector, "string");
  assert.doesNotThrow(() => new Set([selector]), selector);
  assert.ok(selector.trim().length > 0, "no empty selector");
}

// --- origin rules ------------------------------------------------------
assert.equal(adapter.isProviderUrl("https://chatgpt.com/c/abc"), true);
assert.equal(adapter.isProviderUrl("https://chat.openai.com/c/abc"), true);
assert.equal(adapter.isProviderUrl("https://gemini.google.com/app"), false);
assert.equal(adapter.isProviderUrl("https://chatgpt.com.evil.test/c/abc"), false);
assert.equal(adapter.isProviderUrl(""), false);
assert.equal(adapter.surface("https://chatgpt.com/c/abc"), adapter.SURFACE.CONVERSATION);
assert.equal(adapter.surface("https://example.com"), adapter.SURFACE.WRONG);
// SỬA 2026-09-02. Dòng này TRƯỚC ĐÂY khẳng định trang chủ `https://chatgpt.com/` là bề mặt
// HỢP LỆ — tức suite đang ghim đúng cái lỗi đã làm mất một lượt sinh, và ghim nó từ trước khi
// ai kịp nghi ngờ. Đây là lý do lỗi sống lâu: không phải vì không ai kiểm, mà vì phép kiểm
// khẳng định hành vi sai. Bộ luật surface đầy đủ nằm ở khối cuối file.
assert.equal(adapter.surfaceAllowed("https://chatgpt.com/"), false, "trang chủ KHÔNG phải hội thoại");

// --- blockers still classify the way the safety tests expect -----------
assert.equal(adapter.securityBlockerPattern.test("please complete the captcha"), true);
assert.equal(adapter.securityBlockerPattern.test("here is your image"), false);
assert.equal(adapter.matchesGenerationLimit("You've reached your daily limit"), true);
assert.equal(adapter.matchesGenerationLimit("a duck on a white background"), false);
assert.equal(adapter.matchesGenerationLimit(""), false);

// --- content.js no longer hardcodes provider knowledge -----------------
// The DOM probe is exempt: it is diagnostics, and naming an attribute in
// order to REPORT its values is the opposite of depending on it. Everything
// outside the probe must go through the adapter.
const probeStart = content.indexOf('if (message.type === "DAC_DOM_PROBE")');
const probeEnd = content.indexOf('if (message.type === "DAC_ABORT")');
assert.ok(probeStart > 0 && probeEnd > probeStart, "the probe block is where this test thinks it is");
const body = content.slice(content.indexOf('"use strict"'), probeStart) + content.slice(probeEnd);
const forbidden = [
  ["data-message-author-role", "message-role selectors belong to the adapter"],
  ["prompt-textarea", "composer selectors belong to the adapter"],
  ["send-button", "send selectors belong to the adapter"],
  ["stop-button", "stop selectors belong to the adapter"],
  ["conversation-turns", "conversation-root selectors belong to the adapter"],
  ["upload-preview", "attachment selectors belong to the adapter"],
];
for (const [needle, why] of forbidden) {
  assert.ok(!body.includes(needle), `content.js must not contain '${needle}': ${why}`);
}
assert.ok(!/captcha|unusual activity/i.test(body), "blocker phrases belong to the adapter");

// --- content.js reads them from the adapter instead ---------------------
assert.match(content, /const ADAPTER = window\.DacProviderAdapter;/);
assert.match(content, /const SEL = ADAPTER\.SELECTORS;/);
assert.match(content, /firstVisible\(SEL\.composer\)/);
assert.match(content, /firstVisible\(SEL\.send\)/);
assert.match(content, /firstVisible\(SEL\.stop\)/);
assert.match(content, /document\.querySelectorAll\(assistantSelector\(\)\)/);

// --- turn markers are resolved to ONE selector at a time ----------------
// ChatGPT kept data-message-author-role on user turns and dropped it from
// assistant turns (measured live 2026-08-26), so the adapter carries an
// ordered list per role. Matching both at once would count one turn twice if
// a page ever carried both markers on nested nodes, and attribution reads two
// matches as two separate turns.
for (const role of ["assistantMessage", "userMessage"]) {
  assert.ok(Array.isArray(adapter.SELECTORS[role]), `${role} is an ordered preference list`);
  assert.ok(adapter.SELECTORS[role].length >= 2, `${role} keeps a legacy fallback`);
}
assert.equal(adapter.SELECTORS.assistantMessage[0], '[data-turn="assistant"]', "the marker measured on the live page comes first");
assert.equal(adapter.SELECTORS.userMessage[0], '[data-turn="user"]');
assert.ok(adapter.SELECTORS.assistantMessage.includes('[data-message-author-role="assistant"]'), "the previous marker still works on an older page");
assert.match(content, /function resolveSelector\(candidates\)/);

// --- the scan root is derived from the turns, not from a name ----------
// ChatGPT names each TURN container with a data-testid containing the word
// "conversation", so a wildcard over that word collapsed the scan root onto
// one turn: the probe measured 3 of the page's 14 images. An incomplete root
// is not just a missed image -- the pre-submit baseline is built from it, so
// an image already on screen can read as brand new and be attributed to this
// job.
assert.ok(!adapter.SELECTORS.conversationRoot.includes('[data-testid*="conversation"]'), "no wildcard over a name the provider also uses per turn");
assert.match(content, /while \(node && node !== document\.body && !node\.contains\(last\)\) node = node\.parentElement;/, "the root is the common ancestor of the first and last turn");
assert.match(content, /let node = first\.parentElement;/, "the walk starts ABOVE the first turn so a single-turn page cannot return that turn as the whole conversation");
assert.match(content, /return list\[0\];/, "an unmatched list still yields a usable selector rather than undefined");
assert.doesNotMatch(content, /\$\{SEL\.assistantMessage\}, \$\{SEL\.userMessage\}/, "the two role lists are never concatenated raw");
assert.match(content, /ADAPTER\.securityBlockerPattern\.test/);
assert.match(content, /ADAPTER\.matchesGenerationLimit\(text\)/);

// --- dom_probe reports the adapter, and stays read-only -----------------
const probe = content.slice(content.indexOf('if (message.type === "DAC_DOM_PROBE")'), content.indexOf('if (message.type === "DAC_ABORT")'));
assert.ok(probe.length > 500, "the DOM probe handler is present");
assert.match(probe, /for \(const \[group, value\] of Object\.entries\(SEL\)\)/, "the probe reports the adapter's own selectors, not a copy");
assert.match(probe, /messageAttributes/, "the probe samples the attributes the page ACTUALLY uses, which is the whole question when attribution goes blind");
for (const mutation of [".click()", ".focus()", "setComposerValue", "dispatchEvent", "answerAbPoll", ".remove()"]) {
  assert.ok(!probe.includes(mutation), `the DOM probe must never ${mutation} -- it is strictly read-only`);
}

/* --- LUẬT SURFACE: trang chủ KHÔNG phải hội thoại (thêm 2026-09-02) ----------
   Bản trước trả CONVERSATION cho MỌI url chatgpt.com, kể cả trang chủ. Gửi từ trang chủ làm
   tab điều hướng sang /c/<id> và lượt sinh mất trắng kèm một lỗi hết-giờ không nói gì. Đo thật
   cùng ngày: probe trên trang chủ cho assistantCount 0 nhưng `ping` vẫn trả state READY.

   Ghim CẢ HAI chiều. Chỉ ghim "trang chủ bị chặn" là không đủ: một luật chặn sạch mọi thứ cũng
   qua được phép kiểm đó, và nó sẽ khoá luôn công việc thật. */
{
  const conversations = [
    "https://chatgpt.com/c/6a9803a5-b3c4-83ec-b0ad-9c67388926d7",  // [ĐO] live 2026-09-02, hồ sơ kaito
    "https://chatgpt.com/g/g-abc123/c/xyz-789",                     // GPT tuỳ chỉnh vẫn là hội thoại
    "https://chat.openai.com/c/older-id"                            // tên miền cũ vẫn phải chạy
  ];
  for (const url of conversations) {
    assert.equal(adapter.surface(url), adapter.SURFACE.CONVERSATION, `phải nhận ra hội thoại: ${url}`);
    assert.equal(adapter.surfaceAllowed(url), true, `phải CHO PHÉP: ${url}`);
  }

  const launchers = [
    "https://chatgpt.com/",            // [ĐO] chính là ca đã mất một lượt sinh
    "https://chatgpt.com/?model=gpt-5",
    "https://chatgpt.com/gpts",
    "https://chatgpt.com/g/g-abc123"   // trang giới thiệu GPT, chưa có hội thoại
  ];
  for (const url of launchers) {
    assert.equal(adapter.surface(url), adapter.SURFACE.LAUNCHER, `phải là trang phóng, không phải hội thoại: ${url}`);
    assert.equal(adapter.surfaceAllowed(url), false, `phải CHẶN: ${url}`);
  }

  for (const url of ["https://example.com/c/1", "http://chatgpt.com/c/1", "", null]) {
    assert.equal(adapter.surface(url), adapter.SURFACE.WRONG, `ngoài nhà cung cấp thì phải WRONG: ${url}`);
  }

  // `https://chatgpt.com` KHÔNG có gạch chéo cuối trả WRONG chứ không phải LAUNCHER, vì mẫu
  // nhận diện tên miền đòi dấu `/`. Trình duyệt luôn chuẩn hoá `location.href` thành có gạch
  // chéo nên ca này không xảy ra trên thực tế; cả hai giá trị đều bị chặn nên hành vi vẫn
  // đúng. Ghim ở mức "bị chặn" thay vì ghim giá trị, để không khoá cứng một chi tiết vô hại.
  assert.equal(adapter.surfaceAllowed("https://chatgpt.com"), false, "thiếu gạch chéo cuối vẫn phải bị chặn");
}

/* --- NỐI DÂY: có luật mà không ai gọi thì suite vẫn xanh --------------------
   Đây là lỗi thật, không phải giả định. Trước 2026-09-02 `surfaceAllowed` chỉ được gọi ĐÚNG
   MỘT chỗ trong cả nhánh: dòng in ra của dom_probe. Nó không chặn gì cả, nên `ping` vẫn nói
   READY trên trang chủ và runner vẫn gửi. Ghim từng điểm nối, không ghim chỉ sự tồn tại. */
{
  assert.match(content, /function surfaceAllowedNow\(\)/, "content.js phải có surfaceAllowedNow()");

  const guard = /if \(!surfaceAllowedNow\(\)\) \{[\s\S]{0,400}?WRONG_SURFACE/;
  assert.match(content, guard, "phải CHẶN TRƯỚC KHI GỬI bằng WRONG_SURFACE");

  // Chặn phải đứng trước TÁC DỤNG PHỤ ĐẦU TIÊN, không chỉ trước lúc bấm gửi. Trang chủ có đủ
  // composer và nút gửi nên mọi phép kiểm phía sau đều xanh; chặn muộn là chặn sau khi đã tiêu.
  // Mốc là `attachReferenceImages` — thao tác đầu tiên chạm vào trang (đính ảnh tham chiếu),
  // đứng trước cả lúc gõ chữ. Ghim theo mốc này thì mọi cách dời lớp chặn xuống dưới đều đỏ.
  const guardAt = content.search(guard);
  for (const [marker, why] of [
    // Mốc phải là LỜI GỌI, không phải tên hàm trần: định nghĩa hàm nằm sớm hơn trong file nên
    // `indexOf("attachReferenceImages(...)")` bắt trúng chỗ khai báo và phép kiểm đỏ oan.
    ["await attachReferenceImages(referenceImages)", "đính ảnh tham chiếu — tác dụng phụ đầu tiên"],
    ["setComposerValue(composer, prompt)", "gõ chữ vào ô soạn"],
    ["= captureBoundary(inputEvidence)", "chốt mốc gán kết quả"]
  ]) {
    const at = content.indexOf(marker);
    assert.ok(at > 0, `không tìm thấy mốc ${marker} — nếu đã đổi tên thì sửa phép kiểm này cho khớp`);
    assert.ok(guardAt > 0 && guardAt < at, `WRONG_SURFACE phải đứng TRƯỚC ${why} (${marker})`);
  }

  // readiness phải hỏi surface, nếu không `ping` lại nói READY trên trang chủ.
  const readiness = content.match(/DacChatReadiness\.evaluate\(\{[^}]*composerFound:[^,]*/g) || [];
  assert.ok(readiness.length >= 2, "phải có ít nhất hai chỗ tính readiness");
  for (const call of readiness) {
    assert.match(call, /surfaceAllowedNow\(\)/, `readiness phải hỏi surface: ${call.slice(0, 90)}`);
  }
}

console.log("provider adapter static checks: PASS");
