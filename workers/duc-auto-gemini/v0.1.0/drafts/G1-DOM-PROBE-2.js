/* G1 DOM PROBE v2 — READ-ONLY. For the states DURING generation and AFTER the result appears.
   Adds: all-size images with URL scheme, menu items, response-container discovery. */
(() => {
  const trim = (s, n = 90) => String(s || "").replace(/\s+/g, " ").trim().slice(0, n);
  const rectOf = (el) => { const r = el.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; };
  const visible = (el) => { const s = getComputedStyle(el), r = el.getBoundingClientRect(); return s.display !== "none" && s.visibility !== "hidden" && r.width > 0 && r.height > 0; };
  const chain = (el, depth = 7) => { const out = []; let p = el?.parentElement, i = 0;
    while (p && i < depth) { out.push(p.tagName.toLowerCase() + (p.getAttribute("data-test-id") ? `[${p.getAttribute("data-test-id")}]` : "") + (p.className && typeof p.className === "string" && p.className.trim() ? `(${trim(p.className, 40)})` : "")); p = p.parentElement; i++; }
    return out.join(" > "); };

  const scheme = (src) => (String(src || "").match(/^(blob:|data:|https:|http:)/) || ["none"])[0];
  const images = [...document.querySelectorAll("img")].filter(visible).map((i) => ({
    rect: rectOf(i), scheme: scheme(i.currentSrc || i.src), srcHead: trim(i.currentSrc || i.src, 70),
    testid: i.getAttribute("data-test-id") || "", alt: trim(i.alt, 40), cls: trim(i.className, 50), chain: chain(i)
  })).slice(0, 14);

  const buttons = [...document.querySelectorAll("button")].filter(visible).map((b) => ({
    aria: trim(b.getAttribute("aria-label"), 60), testid: b.getAttribute("data-test-id") || "", txt: trim(b.innerText, 40),
    disabled: b.disabled || b.getAttribute("aria-disabled") === "true"
  })).filter((b) => b.aria || b.testid || b.txt).slice(0, 50);

  const menuitems = [...document.querySelectorAll('[role="menuitem"], [role="option"], mat-menu button, .mat-mdc-menu-item')].filter(visible)
    .map((m) => ({ tag: m.tagName.toLowerCase(), aria: trim(m.getAttribute("aria-label"), 60), txt: trim(m.innerText, 50) })).slice(0, 20);

  const fileInputs = [...document.querySelectorAll('input[type="file"]')].map((i) => ({ accept: i.getAttribute("accept") || "", multiple: i.multiple, connected: i.isConnected, chain: chain(i) }));

  const respSelectors = ['model-response', 'message-content', 'response-container', '[class*="response" i]', '[class*="model" i]', 'user-query', '[id^="model-response"]', 'chat-window-content > *'];
  const responses = {};
  for (const sel of respSelectors) { try { responses[sel] = document.querySelectorAll(sel).length; } catch (e) { responses[sel] = "ERR"; } }
  const chatChildren = [...(document.querySelector("chat-window-content")?.querySelectorAll("*") || [])]
    .map((e) => e.tagName.toLowerCase()).filter((t) => t.includes("-"));
  const chatTags = [...new Set(chatChildren)].slice(0, 50);

  const stopish = [...document.querySelectorAll("button")].filter(visible).filter((b) => /stop|dừng|cancel|halt/i.test((b.getAttribute("aria-label") || "") + " " + b.innerText)).map((b) => ({ aria: trim(b.getAttribute("aria-label")), txt: trim(b.innerText, 30) }));
  const busyScoped = { inputContainer: !!document.querySelector('input-container [role="progressbar"], input-container [aria-busy="true"]'), chatWindow: !!document.querySelector('chat-window [role="progressbar"], chat-window [aria-busy="true"]') };
  const allTags = [...new Set([...document.querySelectorAll("*")].map((e) => e.tagName.toLowerCase()).filter((t) => t.includes("-")))];

  const result = { url: location.href, when: new Date().toISOString(), sendBtn: !!document.querySelector('button[aria-label="Send message"]'), stopish, busyScoped, responses, chatTags, fileInputs, menuitems, images, buttons, newTags: allTags.slice(0, 100) };
  const text = JSON.stringify(result, null, 1);
  try { copy(text); console.log("ĐÃ COPY VÀO CLIPBOARD — dán thẳng cho Claude."); } catch (e) {}
  console.log(text);
  return "PROBE2 DONE — " + text.length + " chars";
})();
