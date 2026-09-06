#!/usr/bin/env node
/* observer-mutation-check.mjs — ĐỘT BIẾN KIỂM cho bốn phép dò read-only của Observer.
 *
 * Bộ máy (kèm ba cái bẫy đã trả giá: regex · SKIP đọc như PASS · khôi phục bằng git checkout)
 * nằm ở `scripts/mutation-runner.mjs`. File này chỉ còn DANH SÁCH CON — mỗi con là một đường
 * GHI hoặc một chốt bị gỡ, và phép ghim phải ĐỎ vì nó.
 *
 * Chạy: node scripts/observer-mutation-check.mjs
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { chayDotBien } from "./mutation-runner.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TARGET = path.join(ROOT, "scripts", "observer-probes.mjs");
const PIN = path.join(ROOT, "tests", "observer-probes-smoke.mjs");

/* Mỗi con đột biến = một đường GHI hoặc một chốt bị gỡ. `tim` phải xuất hiện đúng `soLan` lần,
 * nếu không thì mỏ neo đã mục theo code — đó là lỗi của bộ đo, không phải kết quả. */
const MUTANTS = [
  {
    ma: "M1",
    ten: "Nới danh sách method: cho Runtime.evaluate vào",
    tim: '  "DOM.enable",\n  "DOM.getDocument",',
    thay: '  "Runtime.evaluate",\n  "DOM.enable",\n  "DOM.getDocument",',
    soLan: 1
  },
  {
    ma: "M2",
    ten: "Nới danh sách method: cho Input.dispatchKeyEvent (gửi phím) vào",
    tim: '  "DOM.querySelectorAll",\n  "DOM.describeNode",',
    thay: '  "DOM.querySelectorAll",\n  "Input.dispatchKeyEvent",\n  "DOM.describeNode",',
    soLan: 1
  },
  {
    ma: "M3",
    ten: "Gỡ hẳn chốt method: cổng cho mọi lệnh CDP đi qua",
    tim: "    if (!allowed.has(method)) {",
    thay: "    if (false && !allowed.has(method)) {",
    soLan: 1
  },
  {
    ma: "M4",
    ten: "Gỡ chốt tham số chở mã (expression / functionDeclaration / text …)",
    tim: "      if (banned.has(paramKey)) {",
    thay: "      if (false && banned.has(paramKey)) {",
    soLan: 1
  },
  {
    ma: "M5",
    ten: "NỐI CHUỖI: dựng biểu thức Runtime.evaluate từ selector của người gọi",
    tim: '      found = await send("DOM.querySelectorAll", { nodeId: root.nodeId, selector });',
    thay:
      '      const expr = "document.querySelectorAll(\'" + selector + "\').length";\n' +
      '      found = { nodeIds: [], evaluated: await send("Runtime.evaluate", { expression: expr }) };',
    soLan: 1
  },
  {
    ma: "M6",
    ten: "Thêm một đường GHI vào giữa page.snapshot (sửa thuộc tính DOM)",
    tim: '    const found = await send("DOM.querySelectorAll", { nodeId: root.nodeId, selector: INTERACTIVE_SELECTOR });',
    thay:
      '    await send("DOM.setAttributeValue", { nodeId: root.nodeId, name: "data-observer", value: "1" });\n' +
      '    const found = await send("DOM.querySelectorAll", { nodeId: root.nodeId, selector: INTERACTIVE_SELECTOR });',
    soLan: 1
  },
  {
    ma: "M7",
    ten: "Gỡ chốt từ vựng: chấp nhận mọi tên phép dò",
    tim: "  if (!PROBE_NAMES.includes(name)) {",
    thay: "  if (false && !PROBE_NAMES.includes(name)) {",
    soLan: 1
  },
  {
    ma: "M8",
    ten: "Gỡ che dữ liệu: trả nguyên giá trị mọi thuộc tính",
    tim: "    if (!safe.has(attrName)) {",
    thay: "    if (false && !safe.has(attrName)) {",
    soLan: 1
  },
  {
    ma: "M9",
    ten: "Bỏ phân trang: luôn trả về lát đầu, lờ offset của người gọi",
    tim: "    const slice = nodeIds.slice(offset, offset + limit);\n    const items = [];\n    for (const nodeId of slice) items.push(await describe(send, nodeId));\n\n    return {\n      metadata:",
    thay: "    const slice = nodeIds.slice(0, limit);\n    const items = [];\n    for (const nodeId of slice) items.push(await describe(send, nodeId));\n\n    return {\n      metadata:",
    soLan: 1
  },
  {
    ma: "M10",
    ten: "Quay lại depth:0 cho dom.tree (đúng khuyết tật của bản cũ)",
    tim: '    const doc = await send("DOM.getDocument", { depth, pierce: false });',
    thay: '    const doc = await send("DOM.getDocument", { depth: 0, pierce: false });',
    soLan: 1
  }
];

/* ---- Hai mẻ: LUẬT (lõi) và NỐI DÂY (đường chạy thật) --------------------
 * Mẻ hai tồn tại vì mẻ một không đo được nó. Ba chốt read-only nằm trong lõi, nên chúng chỉ
 * bảo vệ những gì ĐI QUA lõi: một lớp nối dây gọi thẳng `chrome.debugger.sendCommand` đi vòng
 * qua cả ba mà cả 10 con ở mẻ một vẫn chết đủ. Đây là bài học đã trả giá — một lượt audit
 * xanh sạch vì mọi đột biến chỉ phá RUỘT validator, còn xoá đúng dòng NỐI validator vào đường
 * chạy thì cả suite vẫn xanh. */
const BATCHES = [
  { ten: "LUẬT — bốn phép dò", target: TARGET, pin: PIN, mutants: MUTANTS },
  {
    ten: "NỐI DÂY — observer-engine.js",
    target: path.join(ROOT, "observer-engine.js"),
    pin: path.join(ROOT, "tests", "observer-engine-smoke.mjs"),
    mutants: [
      {
        ma: "W1",
        ten: "Đi vòng qua lõi: lớp nối dây gọi thẳng chrome.debugger.sendCommand",
        tim: "      return await runProbeCore(name, { targetId: debuggee.targetId, sendRaw }, params);",
        thay: '      return { ok: true, probe: name, cdp: [], data: await chrome.debugger.sendCommand(debuggee, "Runtime.evaluate", { expression: "document.title" }) };',
        soLan: 1
      },
      {
        ma: "W2",
        ten: "sendRaw không còn CHỈ chuyển tiếp: tự thêm một lệnh CDP của riêng nó",
        tim: "      const sendRaw = (method, cdpParams) => chrome.debugger.sendCommand(debuggee, method, cdpParams);",
        thay: '      const sendRaw = async (method, cdpParams) => { await chrome.debugger.sendCommand(debuggee, "Runtime.enable", {}); return chrome.debugger.sendCommand(debuggee, method, cdpParams); };',
        soLan: 1
      },
      {
        ma: "W3",
        ten: "Không tháo debugger nữa (dải băng cảnh báo ở lại, phiên debug bị giữ)",
        tim: "      if (attachedHere) await detachQuietly(debuggee);",
        thay: "      if (false && attachedHere) await detachQuietly(debuggee);",
        soLan: 1
      },
      {
        ma: "W4",
        ten: "Gắn debugger vào trang cho cả một tên phép dò không có thật",
        tim: "    if (!PROBE_NAMES.includes(name)) return await runProbeCore(name, {}, params);",
        thay: "    if (false && !PROBE_NAMES.includes(name)) return await runProbeCore(name, {}, params);",
        soLan: 1
      }
    ]
  }
];

process.exit(chayDotBien(BATCHES, ROOT));
