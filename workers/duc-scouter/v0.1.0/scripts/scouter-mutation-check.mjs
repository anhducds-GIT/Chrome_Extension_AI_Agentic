#!/usr/bin/env node
/* scouter-mutation-check.mjs — ĐỘT BIẾN KIỂM cho khung Scouter seed.
 *
 * Nghiệm thu mục 5 ③ của BRIEF-SCOUTER-SEED-01: "thêm một đường ghi nào đó → phép ghim phải
 * ĐỎ. Con nào không đỏ thì phép ghim đó chưa ghim gì cả."
 *
 * Bộ máy (kèm ba cái bẫy đã trả giá) ở `scripts/mutation-runner.mjs`. File này chỉ có danh
 * sách con. Mỏ neo viết MỘT DÒNG bất cứ khi nào được — mỏ neo nhiều dòng đã im lặng khớp 0
 * chỗ trên file CRLF một lần rồi.
 *
 * BA MẺ, và mẻ ba là mẻ không thể bỏ:
 *   · LUẬT     — từ vựng method và phong bì (`scouter-bridge-core.mjs`)
 *   · BA KHẢ NĂNG — quan sát · nạp lại (`scouter-seed-core.mjs`)
 *   · HÀNH ĐỘNG — bốn chốt của đường GHI (`scouter-actions-core.mjs`), S-01
 *   · NỐI DÂY GHI — đường ghi đi qua `chrome.debugger` (`observer-engine.js`), S-01
 *   · DÂY      — bắt tay và khung trên socket (`scouter-transport-loopback.mjs`).
 *     Hai mẻ đầu chỉ bảo vệ thứ ĐI QUA lõi. Một lớp dây đưa token ra trước khi máy chủ chứng
 *     minh nó biết token — đúng cách hai bản worker cũ đang làm — đi vòng qua cả hai mà chúng
 *     vẫn xanh trọn.
 *
 * Chạy: node scripts/scouter-mutation-check.mjs
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { chayDotBien } from "./mutation-runner.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PIN_BRIDGE = path.join(ROOT, "tests", "scouter-bridge-smoke.mjs");
const PIN_TRANSPORT = path.join(ROOT, "tests", "scouter-transport-smoke.mjs");
const PIN_ACTIONS = path.join(ROOT, "tests", "scouter-actions-smoke.mjs");
const PIN_WIRING = path.join(ROOT, "tests", "observer-engine-smoke.mjs");

const BATCHES = [
  {
    ten: "LUẬT — từ vựng method và phong bì",
    target: path.join(ROOT, "scripts", "scouter-bridge-core.mjs"),
    pin: PIN_BRIDGE,
    mutants: [
      {
        ma: "S1",
        ten: "Nói dối cờ read_only: một phép dò tự khai là lệnh ghi",
        tim: '    name: "scout.query", read_only: true, deadline_ms: 30000,',
        thay: '    name: "scout.query", read_only: false, deadline_ms: 30000,',
        soLan: 1
      },
      {
        ma: "S2",
        ten: "Lờ trường lạ trong params thay vì từ chối (tham số gõ sai chạy im lặng)",
        tim: '  if (unknown.length) invalidParams("params", `unknown field \'${unknown[0]}\'`);',
        thay: '  if (false && unknown.length) invalidParams("params", `unknown field \'${unknown[0]}\'`);',
        soLan: 1
      },
      {
        ma: "S3",
        ten: "Gỡ chốt từ vựng: chấp nhận mọi tên method từ ngoài dây",
        tim: "  if (!Object.hasOwn(METHOD_REGISTRY, method)) {",
        thay: "  if (false && !Object.hasOwn(METHOD_REGISTRY, method)) {",
        soLan: 1
      },
      {
        ma: "S4",
        ten: "Bỏ kiểm hằng số protocol trên phong bì vào",
        tim: "  if (envelope.protocol !== PROTOCOL) invalidEnvelope(`protocol must equal '${PROTOCOL}'.`, { field: \"protocol\" });",
        thay: "  if (false) invalidEnvelope(`protocol must equal '${PROTOCOL}'.`, { field: \"protocol\" });",
        soLan: 1
      },
      {
        ma: "S5",
        ten: "Method khai trong bảng mà không ai nối tay: để nó nổ lúc có người gọi",
        tim: "  if (missing.length) throw new TypeError(`Scouter dispatcher is missing handlers for: ${missing.join(\", \")}.`);",
        thay: "  if (false && missing.length) throw new TypeError(`Scouter dispatcher is missing handlers for: ${missing.join(\", \")}.`);",
        soLan: 1
      },
      {
        ma: "S6",
        ten: "target_id thành tuỳ chọn (mở lại đường 'tab đang mở' mà nhánh Flow đã trả giá)",
        tim: "  if (typeof value !== \"string\" || !/^[A-Za-z0-9._:-]{1,128}$/.test(value)) {",
        thay: "  if (false) {",
        soLan: 1
      },
      {
        ma: "S7",
        ten: "Nới trần độ dài selector lên gấp trăm lần",
        tim: '  if (value.length > 1024) invalidParams("params.selector", "expected at most 1024 characters");',
        thay: '  if (value.length > 102400) invalidParams("params.selector", "expected at most 1024 characters");',
        soLan: 1
      },
      {
        ma: "S8",
        ten: "Phong bì thất bại tự khai là thành công (ok:true chở một lỗi)",
        tim: "    ok: false,",
        thay: "    ok: true,",
        soLan: 1
      }
    ]
  },
  {
    ten: "BA KHẢ NĂNG — quan sát và tự nạp lại",
    target: path.join(ROOT, "scripts", "scouter-seed-core.mjs"),
    pin: PIN_BRIDGE,
    mutants: [
      {
        ma: "K1",
        ten: "Phép dò hỏng được mặc vỏ thành công và trả ra ngoài dây",
        /* Mỏ neo phải kèm MÃ LỖI: từ S-01 đường ghi có một chốt cùng hình dạng, và mỏ neo một
         * dòng khớp cả hai chỗ. Khớp hai chỗ thì bộ đo báo hỏng — đúng thế, và đó là lý do
         * trường `soLan` tồn tại. */
        tim: '    if (!result || result.ok !== true) {' + String.fromCharCode(10) + '      throw new BridgeProtocolError("PROBE_FAILED"',
        thay: '    if (false) {' + String.fromCharCode(10) + '      throw new BridgeProtocolError("PROBE_FAILED"',
        soLan: 1
      },
      {
        ma: "K7",
        ten: "S-01: HÀNH ĐỘNG hỏng được mặc vỏ thành công (tưởng đã bấm trong khi chưa bấm gì)",
        tim: '    if (!result || result.ok !== true) {' + String.fromCharCode(10) + '      throw new BridgeProtocolError("ACTION_FAILED"',
        thay: '    if (false) {' + String.fromCharCode(10) + '      throw new BridgeProtocolError("ACTION_FAILED"',
        soLan: 1
      },
      {
        ma: "K2",
        ten: "Gỡ trần chống bão nạp lại (vòng tự cải tiến quay tít)",
        tim: "      if (previous && since < RELOAD_MIN_GAP_MS) {",
        thay: "      if (false) {",
        soLan: 1
      },
      {
        ma: "K3",
        ten: "Nạp lại NGAY trong handler: phản hồi chết trước khi rời socket",
        tim: "      timers.setTimeout(() => chromeApi.runtime.reload(), RELOAD_DELAY_MS);",
        thay: "      chromeApi.runtime.reload();",
        soLan: 1
      },
      {
        ma: "K4",
        ten: "Target không có mà vẫn dò bừa thay vì nói thẳng",
        tim: "    if (!found) {",
        thay: "    if (false) {",
        soLan: 1
      },
      {
        ma: "K5",
        ten: "Nới bảng ánh xạ: thêm một tên phép dò thứ năm không có trong lõi",
        tim: '  "scout.tree": "dom.tree"',
        thay: '  "scout.tree": "dom.tree",\n  "scout.evaluate": "runtime.evaluate"',
        soLan: 1
      },
      {
        ma: "K6",
        ten: "Ghi mốc nạp lại SAU khi hẹn giờ (mốc không kịp ghi = trần không tồn tại)",
        tim: "      await chromeApi.storage.local.set({ [RELOAD_STORAGE_KEY]: at });",
        thay: "      Promise.resolve().then(() => chromeApi.storage.local.set({ [RELOAD_STORAGE_KEY]: at }));",
        soLan: 1
      }
    ]
  },
  {
    ten: "DÂY — bắt tay và khung trên socket",
    target: path.join(ROOT, "scripts", "scouter-transport-loopback.mjs"),
    pin: PIN_TRANSPORT,
    mutants: [
      {
        ma: "D1",
        ten: "QUAY VỀ BẢN GEMINI/FLOW: đưa token ra ngay khi socket mở, không đòi máy chủ chứng minh",
        tim: '        candidate.send(JSON.stringify({ type: "auth_challenge", role: "extension", nonce: handshakeNonce }));',
        thay: '        candidate.send(JSON.stringify({ type: "auth", role: "extension", token: pairing.token }));',
        soLan: 1
      },
      {
        ma: "D2",
        ten: "Nhận bằng chứng của máy chủ mà không kiểm HMAC",
        tim: "      if (socket !== targetSocket || !verified || pairing !== pairingAtProof || targetSocket.readyState !== WebSocketApi.OPEN) {",
        thay: "      if (socket !== targetSocket || pairing !== pairingAtProof || targetSocket.readyState !== WebSocketApi.OPEN) {",
        soLan: 1
      },
      {
        ma: "D3",
        ten: "Coi auth_ok trần là đã xác thực (không cần bắt tay đứng sau)",
        tim: "      if (!hostProofVerified || !authSent || targetSocket.readyState !== WebSocketApi.OPEN || settledSockets.has(targetSocket)) {",
        thay: "      if (false) {",
        soLan: 1
      },
      {
        ma: "D4",
        ten: "Bỏ chốt một-socket-xác-thực-một-lần (auth_ok lặp lại làm sống lại socket đã chết)",
        tim: "      if (!hostProofVerified || !authSent || targetSocket.readyState !== WebSocketApi.OPEN || settledSockets.has(targetSocket)) {",
        thay: "      if (!hostProofVerified || !authSent || targetSocket.readyState !== WebSocketApi.OPEN) {",
        soLan: 1
      },
      {
        ma: "D5",
        ten: "Cho khung rpc chạy khi CHƯA xác thực",
        tim: "    if (!authenticated) {\n      abandonSocket(targetSocket, 1008, \"Host authentication is not complete.\");",
        thay: "    if (false) {\n      abandonSocket(targetSocket, 1008, \"Host authentication is not complete.\");",
        soLan: 1
      },
      {
        ma: "D6",
        ten: "Bỏ chốt host 127.0.0.1 trong ghép cặp (nối ra máy khác)",
        tim: '  if (input.host !== "127.0.0.1") throw new Error("PAIRING_ENDPOINT_INVALID: host phải là 127.0.0.1.");',
        thay: '  if (false) throw new Error("PAIRING_ENDPOINT_INVALID: host phải là 127.0.0.1.");',
        soLan: 1
      },
      {
        ma: "D7",
        ten: "Bỏ chốt đường dẫn cố định của endpoint Bridge",
        tim: "  if (input.http_url !== httpUrl || input.websocket_url !== websocketUrl) throw new Error(\"PAIRING_ENDPOINT_INVALID: endpoint không khớp đường dẫn cố định Bridge V1.\");",
        thay: "  if (false) throw new Error(\"PAIRING_ENDPOINT_INVALID: endpoint không khớp đường dẫn cố định Bridge V1.\");",
        soLan: 1
      },
      {
        ma: "D8",
        ten: "Không lên hạn chót ACK: socket nửa mở vẫn được báo là 'connected'",
        tim: "      armKeepaliveDeadline(targetSocket);",
        thay: "      if (false) armKeepaliveDeadline(targetSocket);",
        soLan: 1
      },
      {
        ma: "D9",
        ten: "Trả về relay_id cố định (máy chủ không đối chiếu được phản hồi với yêu cầu)",
        tim: '      targetSocket.send(JSON.stringify({ type: "rpc_response", relay_id: message.relay_id, envelope: response }));',
        thay: '      targetSocket.send(JSON.stringify({ type: "rpc_response", relay_id: "relay-co-dinh", envelope: response }));',
        soLan: 1
      },
      {
        ma: "D10",
        ten: "Khung loại lạ bị LỜ ĐI thay vì làm đứt",
        tim: '    if (message?.type !== "rpc" || typeof message.relay_id !== "string" || !message.envelope) {',
        thay: '    if (false) {',
        soLan: 1
      }
    ]
  }
];


/* ---- S-01: đường GHI. Mẻ này canh thứ đắt nhất của cả gói — ranh giới giữa "bấm đúng một
   nút đã chỉ đích danh" và "bấm bất kỳ đâu trên màn hình". ------------------------------ */
const NL = String.fromCharCode(10);

BATCHES.push({
  ten: "HÀNH ĐỘNG — bốn chốt của đường ghi",
  target: path.join(ROOT, "scripts", "scouter-actions-core.mjs"),
  pin: PIN_ACTIONS,
  mutants: [
    {
      ma: "H1",
      ten: "Nới danh sách method ghi: cho Runtime.evaluate vào (mở cửa chạy JS trên trang)",
      tim: '  "DOM.enable",' + NL + '  "DOM.getDocument",',
      thay: '  "Runtime.evaluate",' + NL + '  "DOM.enable",' + NL + '  "DOM.getDocument",',
      soLan: 1
    },
    {
      ma: "H2",
      ten: "Nới danh sách: cho Input.insertText (lệnh THỬ NGHIỆM) vào seed",
      tim: '  "Input.dispatchKeyEvent"' + NL + ']);',
      thay: '  "Input.dispatchKeyEvent",' + NL + '  "Input.insertText"' + NL + ']);',
      soLan: 1
    },
    {
      ma: "H3",
      ten: "Gỡ hẳn cổng method: mọi lệnh CDP đi qua được đường ghi",
      tim: "    if (!allowed.has(method)) {",
      thay: "    if (false && !allowed.has(method)) {",
      soLan: 1
    },
    {
      ma: "H4",
      ten: "CHỐT ⑶ — nhận toạ độ từ người gọi (bấm được vào bất kỳ đâu trên màn hình)",
      tim: "    rejectCoordinates(params);",
      thay: "    if (false) rejectCoordinates(params);",
      soLan: 1
    },
    {
      ma: "H5",
      ten: "CHỐT ⑷ — selector khớp nhiều thì bấm cái ĐẦU TIÊN",
      tim: "  if (nodeIds.length > 1) {",
      thay: "  if (false) {",
      soLan: 1
    },
    {
      ma: "H6",
      ten: "CHỐT ⑷ — selector khớp 0 mà vẫn đi tiếp",
      tim: "  if (nodeIds.length === 0) {",
      thay: "  if (false) {",
      soLan: 1
    },
    {
      ma: "H7",
      ten: "Bỏ khung mouseMoved: đổi một chuỗi ĐÃ ĐO thành một chuỗi CHƯA ĐO",
      tim: '  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: point.x, y: point.y, button: "none", buttons: 0 });' + NL,
      thay: "",
      soLan: 1
    },
    {
      ma: "H8",
      ten: "Bấm vào GÓC hộp thay vì tâm (trúng phần tử bên cạnh ở mọi bố cục chật)",
      tim: "  const x = (Math.min(...xs) + Math.max(...xs)) / 2;",
      thay: "  const x = Math.min(...xs);",
      soLan: 1
    },
    {
      ma: "H9",
      ten: "Bấm cả vào phần tử KHÔNG có hộp hiển thị",
      tim: "  if (!Array.isArray(quad) || quad.length !== 8) {",
      thay: "  if (false) {",
      soLan: 1
    },
    {
      ma: "H10",
      ten: "Cho ký tự điều khiển vào input.type (một xuống dòng giữa chuỗi = một lượt gửi biểu mẫu)",
      tim: "    if (point < 0x20 || point === 0x7f) {",
      thay: "    if (false) {",
      soLan: 1
    },
    {
      ma: "H11",
      ten: "Nhận mọi tên phím, không cần có trong bảng cố định",
      tim: '  if (typeof value !== "string" || !Object.hasOwn(NAMED_KEYS, value)) {',
      thay: "  if (false) {",
      soLan: 1
    },
    {
      ma: "H12",
      ten: "Bỏ `text` khỏi khung keyDown (gõ xong mà ô nhập không dài thêm)",
      tim: "    text: character," + NL + "    unmodifiedText: character,",
      thay: "    unmodifiedText: character,",
      soLan: 1
    },
    {
      ma: "H13",
      ten: "Gỡ chốt từ vựng: chấp nhận mọi tên hành động",
      tim: "  if (!ACTION_NAMES.includes(name)) {",
      thay: "  if (false && !ACTION_NAMES.includes(name)) {",
      soLan: 1
    }
  ]
});

BATCHES.push({
  ten: "NỐI DÂY GHI — observer-engine.js",
  target: path.join(ROOT, "observer-engine.js"),
  pin: PIN_WIRING,
  mutants: [
    {
      ma: "A1",
      ten: "Đi vòng qua lõi: lớp nối dây tự bấm thẳng qua chrome.debugger.sendCommand",
      tim: "      return await runActionCore(name, { sendRaw }, params);",
      thay: '      await chrome.debugger.sendCommand(debuggee, "Input.dispatchMouseEvent", { type: "mousePressed", x: 5, y: 5, button: "left", clickCount: 1 });' + NL + '      return { ok: true, action: name, cdp: [], data: { clickedAt: { x: 5, y: 5 } } };',
      soLan: 1
    },
    {
      ma: "A2",
      ten: "sendRaw cua duong ghi khong con CHI chuyen tiep: tu them mot lenh cua rieng no",
      tim: "      const sendRaw = (method, cdpParams) => chrome.debugger.sendCommand(debuggee, method, cdpParams);" + NL + "      return await runActionCore(name, { sendRaw }, params);",
      thay: '      const sendRaw = async (method, cdpParams) => { await chrome.debugger.sendCommand(debuggee, "Runtime.enable", {}); return chrome.debugger.sendCommand(debuggee, method, cdpParams); };' + NL + "      return await runActionCore(name, { sendRaw }, params);",
      soLan: 1
    },
    {
      ma: "A4",
      ten: "Gắn debugger vào trang cho cả một tên hành động không có thật",
      tim: "    if (!ACTION_NAMES.includes(name)) return await runActionCore(name, {}, params);",
      thay: "    if (false && !ACTION_NAMES.includes(name)) return await runActionCore(name, {}, params);",
      soLan: 1
    },
    {
      ma: "A5",
      ten: "Cướp phiên debug của người khác ở đường GHI",
      tim: '      return { ok: false, action: name, code: "TARGET_ALREADY_ATTACHED", cdp: [],',
      thay: '      if (false) return { ok: false, action: name, code: "TARGET_ALREADY_ATTACHED", cdp: [],',
      soLan: 1
    }
  ]
});

process.exit(chayDotBien(BATCHES, ROOT));
