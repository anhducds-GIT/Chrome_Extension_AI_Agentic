/* G1 DOM PROBE — READ-ONLY. Paste into the Gemini tab's DevTools Console.
   Captures everything the GeminiAdapter needs. Does not type, click, or send anything. */
(() => {
  const trim = (s, n = 90) => String(s || "").replace(/\s+/g, " ").trim().slice(0, n);
  const rectOf = (el) => { const r = el.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; };
  const visible = (el) => { const s = getComputedStyle(el), r = el.getBoundingClientRect(); return s.display !== "none" && s.visibility !== "hidden" && r.width > 0 && r.height > 0; };
  const describe = (el) => el ? {
    tag: el.tagName.toLowerCase(),
    testid: el.getAttribute("data-test-id") || el.getAttribute("data-testid") || "",
    aria: trim(el.getAttribute("aria-label")),
    role: el.getAttribute("role") || "",
    cls: trim(el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className, 70),
    rect: rectOf(el),
    ancestors: (() => { const out = []; let p = el.parentElement, i = 0;
      while (p && i < 6) { out.push(p.tagName.toLowerCase() + (p.getAttribute("data-test-id") ? `[${p.getAttribute("data-test-id")}]` : "") + (p.getAttribute("aria-label") ? `{${trim(p.getAttribute("aria-label"), 40)}}` : "")); p = p.parentElement; i++; }
      return out.join(" > "); })()
  } : null;

  const SELECTORS = {
    composer: ['div[role="textbox"][contenteditable="true"][aria-label*="prompt" i]', '[data-test-id="textarea-wrapper"] [role="textbox"][contenteditable="true"]', 'rich-textarea [contenteditable="true"][role="textbox"]', '[contenteditable="true"][role="textbox"]'],
    upload: ['button[aria-label="Upload & tools"]', 'button[aria-label*="Upload" i][aria-haspopup="menu"]', 'button[aria-label*="Tải" i][aria-haspopup="menu"]', 'button[aria-haspopup="menu"]'],
    fileInput: ['input[type="file"][accept*="image"]', 'input[type="file"]'],
    send: ['button[aria-label="Send message"]', 'button[aria-label*="Send" i]', 'button[aria-label*="Gửi" i]', 'button[data-test-id*="send" i]'],
    stop: ['button[aria-label*="Stop" i]', 'button[aria-label*="Dừng" i]', 'button[data-test-id*="stop" i]'],
    attachmentPreview: ['[data-test-id*="attachment" i]', '[data-test-id*="upload" i] img', 'button[aria-label*="Remove" i] img', 'button[aria-label*="Xóa" i] img'],
    modelContainer: ['[data-message-author-role="model"]', '[data-message-author-role="assistant"]', 'model-response', '[data-test-id*="response" i]', '[class*="model-response"]'],
    busy: ['[aria-busy="true"]', '[role="progressbar"]', 'mat-spinner', '[class*="loading" i]']
  };
  const counts = {};
  for (const [group, list] of Object.entries(SELECTORS)) counts[group] = list.map((sel) => { try { return sel + " => " + document.querySelectorAll(sel).length; } catch (e) { return sel + " => ERR"; } });

  const editors = [...document.querySelectorAll('[contenteditable="true"]')].filter(visible).map(describe);
  const buttons = [...document.querySelectorAll("button")].filter(visible).map((b) => ({ aria: trim(b.getAttribute("aria-label"), 60), testid: b.getAttribute("data-test-id") || "", txt: trim(b.innerText, 40), disabled: b.disabled || b.getAttribute("aria-disabled") === "true", rect: rectOf(b) })).filter((b) => b.aria || b.testid || b.txt).slice(0, 60);
  const thumbs = [...document.querySelectorAll("img")].filter((i) => { const r = i.getBoundingClientRect(); return r.width > 0 && r.width <= 300 && r.height > 0 && r.height <= 300; }).slice(0, 10).map(describe);
  const fileInputs = [...document.querySelectorAll('input[type="file"]')].map((i) => ({ accept: i.getAttribute("accept") || "", multiple: i.multiple, files: i.files?.length ?? 0, connected: i.isConnected, ancestors: describe(i)?.ancestors }));
  const customTags = [...new Set([...document.querySelectorAll("*")].map((e) => e.tagName.toLowerCase()).filter((t) => t.includes("-")))].slice(0, 80);
  const result = { url: location.href, when: new Date().toISOString(), counts, editors, fileInputs, thumbs, buttons, customTags };
  const text = JSON.stringify(result, null, 1);
  try { copy(text); console.log("ĐÃ COPY VÀO CLIPBOARD — dán thẳng cho Claude."); } catch (e) {}
  console.log(text);
  return "PROBE DONE — " + text.length + " chars";
})();
