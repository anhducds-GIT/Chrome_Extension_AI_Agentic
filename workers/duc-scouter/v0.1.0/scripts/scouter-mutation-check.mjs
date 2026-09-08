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
        tim: '      targetSocket.send(JSON.stringify({ type: "rpc_response", relay_id: message.relay_id, envelope: guiDuoc(response) }));',
        thay: '      targetSocket.send(JSON.stringify({ type: "rpc_response", relay_id: "relay-co-dinh", envelope: guiDuoc(response) }));',
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
      tim: '  "Target.getTargetInfo"' + NL + ']);',
      thay: '  "Target.getTargetInfo",' + NL + '  "Input.insertText"' + NL + ']);',
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

/* ---- MẺ NĂM: PHANH CỦA ĐƯỜNG GHI (S-05) --------------------------------
 * Mẻ HÀNH ĐỘNG ở trên hỏi "bấm có ĐÚNG chỗ không". Mẻ này hỏi câu đắt hơn: "có được bấm
 * KHÔNG". Bốn mẻ kia đều xanh trọn với một bản Scouter bấm bất cứ lúc nào nó muốn.
 *
 * Con nào ở đây sống sót cũng có nghĩa như nhau: cái phanh chỗ đó là văn bản, không phải chốt.
 * Và luật vàng 3 của repo áp đúng vào đây — con sống thì sửa PHÉP GHIM, đừng sửa con. */
const PIN_GATE = path.join(ROOT, "tests", "scouter-write-gate-smoke.mjs");

BATCHES.push({
  ten: "PHANH — công tắc và trần của đường ghi",
  target: path.join(ROOT, "scripts", "scouter-seed-core.mjs"),
  pin: PIN_GATE,
  mutants: [
    {
      /* `soLan: 2` từ 07/09, KHÔNG phải nới lỏng: `scout.fetch` (S-10) gọi cùng một hàm phanh,
       * nên chuỗi này nay có mặt ở HAI đường vào. Đột biến thay cả hai một lượt — tức nó gỡ
       * phanh khỏi CẢ hai, đúng thứ cần ghim. Để `soLan: 1` thì bộ đo ĐỎ (nó đã đỏ thật ở lượt
       * chạy 07/09), và đó là lý do trường này tồn tại. */
      ma: "P1",
      ten: "Gỡ hẳn cái phanh khỏi CẢ HAI đường vào: bấm và gọi mạng thẳng, không hỏi công tắc",
      tim: "    const budget = await spendWriteBudget();",
      thay: "    const budget = { used: 0, cap_per_unlock: WRITE_CAP_PER_UNLOCK, remaining: WRITE_CAP_PER_UNLOCK };",
      soLan: 2
    },
    {
      ma: "P2",
      ten: "HỎNG THÌ MỞ: đọc kho lưu lỗi thì coi như đã mở khoá",
      tim: "    } catch (error) {" + NL + '      throw new BridgeProtocolError("WRITE_BLOCKED",' + NL + '        "DEV_MODE_UNREADABLE: khong doc duoc trang thai cong tac, nen coi nhu DANG TAT.", {',
      thay: "    } catch (error) {" + NL + "      return { enabled: true, enabled_at: 0, used: 0 };" + NL + '      throw new BridgeProtocolError("WRITE_BLOCKED",' + NL + '        "DEV_MODE_UNREADABLE: khong doc duoc trang thai cong tac, nen coi nhu DANG TAT.", {',
      soLan: 1
    },
    {
      ma: "P3",
      ten: "Công tắc TẮT vẫn cho bấm (mặc định mở thay vì mặc định đóng)",
      tim: '    if (!gate || typeof gate !== "object" || gate.enabled !== true) {',
      thay: '    if (false && (!gate || typeof gate !== "object" || gate.enabled !== true)) {',
      soLan: 1
    },
    {
      ma: "P4",
      ten: "Bản ghi méo được đoán thành 0, tức là tặng thêm cả một ngân sách",
      tim: "    if (!Number.isInteger(gate.used) || gate.used < 0) {",
      thay: "    if (false && (!Number.isInteger(gate.used) || gate.used < 0)) { gate.used = 0;",
      soLan: 1
    },
    {
      ma: "P5",
      ten: "Bỏ trần: hết ngân sách vẫn bấm tiếp",
      tim: "    if (gate.used >= WRITE_CAP_PER_UNLOCK) {",
      thay: "    if (false && gate.used >= WRITE_CAP_PER_UNLOCK) {",
      soLan: 1
    },
    {
      ma: "P6",
      ten: "Nới trần lên 100000 — trần còn đó nhưng không còn chặn gì",
      tim: "const WRITE_CAP_PER_UNLOCK = 200;",
      thay: "const WRITE_CAP_PER_UNLOCK = 100000;",
      soLan: 1
    },
    {
      ma: "P7",
      ten: "Trần đọc từ chính bản ghi trong kho lưu — kẻ bị chặn tự đặt trần cho mình",
      tim: "    if (gate.used >= WRITE_CAP_PER_UNLOCK) {",
      thay: "    if (gate.used >= (gate.cap_per_unlock || WRITE_CAP_PER_UNLOCK)) {",
      soLan: 1
    },
    {
      ma: "P8",
      ten: "Không trừ ngân sách: trần đứng yên nên không bao giờ chạm tới",
      tim: "      await chromeApi.storage.local.set({ [WRITE_GATE_STORAGE_KEY]: { ...gate, used } });",
      thay: "      if (false) await chromeApi.storage.local.set({ [WRITE_GATE_STORAGE_KEY]: { ...gate, used } });",
      soLan: 1
    },
    {
      ma: "P9",
      ten: "Ghi hụt ngân sách vẫn bấm (nuốt lỗi thay vì đóng)",
      tim: "    } catch (error) {" + NL + "      /* Ghi hụt thì KHÔNG bấm. Bấm mà không trừ được là cái trần không tồn tại. */",
      thay: "    } catch (error) {" + NL + "      return { used, cap_per_unlock: WRITE_CAP_PER_UNLOCK, remaining: WRITE_CAP_PER_UNLOCK - used };",
      soLan: 1
    },
    {
      ma: "P10",
      ten: "Bật lại công tắc mà KHÔNG nạp lại ngân sách",
      tim: "    ? { enabled: true, enabled_at: at, used: 0 }",
      thay: "    ? { enabled: true, enabled_at: at, used: WRITE_CAP_PER_UNLOCK }",
      soLan: 1
    },
    {
      ma: "P11",
      ten: "Popup nói dối: kho lưu hỏng mà vẫn báo ĐANG BẬT",
      tim: "    if (!gate || gate.enabled !== true || !Number.isInteger(gate.used) || gate.used < 0) {",
      thay: "    if (false && (!gate || gate.enabled !== true || !Number.isInteger(gate.used) || gate.used < 0)) {",
      soLan: 1
    },
    {
      ma: "P12",
      ten: "Trừ SAU khi bấm: một lượt bấm hỏng không tốn gì, nên vòng lặp hỏng quay mãi",
      tim: "    const budget = await spendWriteBudget();" + NL + "    const result = await engine.runAction(target, name, params);",
      thay: "    const result = await engine.runAction(target, name, params);" + NL + "    const budget = await spendWriteBudget();",
      soLan: 1
    }
  ]
});

/* ---- MẺ SÁU: BỀ MẶT QUYỀN (S-02) ---------------------------------------
 * `manifest.json` và `scouter-background.js` không có lõi nào canh — cả hai cố ý mỏng. Nhưng
 * "mỏng" không có nghĩa là "không đáng canh": một dòng quyền thêm vào manifest là một dòng
 * không ai phải giải trình, và AGENTS.md luật 6 nói quyền đã duyệt là TRẦN chứ không phải sàn. */
BATCHES.push({
  ten: "QUYỀN — bề mặt manifest",
  target: path.join(ROOT, "manifest.json"),
  pin: PIN_GATE,
  mutants: [
    {
      ma: "Q1",
      ten: "Thêm một quyền ADR-0009 chưa duyệt (cookies) và không ai phải giải trình",
      tim: '  "permissions": ["debugger", "storage", "alarms", "sidePanel"],',
      thay: '  "permissions": ["debugger", "storage", "alarms", "sidePanel", "cookies"],',
      soLan: 1
    },
    {
      ma: "Q3",
      ten: "Trả lại default_popup — popup thắng, bảng bên không bao giờ mở",
      tim: '  "action": {' + NL + '    "default_title": "Duc Scouter",',
      thay: '  "action": {' + NL + '    "default_popup": "sidepanel.html",' + NL + '    "default_title": "Duc Scouter",',
      soLan: 1
    },
    {
      ma: "Q4",
      ten: "Gỡ khai side_panel — Chrome không biết mở trang nào",
      tim: '  "side_panel": {' + NL + '    "default_path": "sidepanel.html"' + NL + '  },' + NL,
      thay: "",
      soLan: 1
    },
    {
      /* Q2 ĐỔI Ý ĐỊNH 07/09. Bản cũ ghim "không được nới host_permissions ra cả Internet" —
       * Đức chốt nới thật, nên con đó không còn thứ gì để canh và mỏ neo của nó khớp 0 lần
       * (bộ đo đã ĐỎ đúng chỗ đó). Thay vì xoá, nó chuyển sang canh cái CÒN LẠI: cửa Bridge.
       * `<all_urls>` KHÔNG phủ `ws:`, nên bỏ dòng 127.0.0.1 là cắt đường về của cả gói — và
       * hỏng đó im lặng, nhìn ra ngoài giống hệt "máy chủ Bridge chưa bật". */
      ma: "Q2",
      ten: "Gộp host_permissions về mỗi <all_urls> — cửa Bridge (ws://127.0.0.1) mất đường",
      tim: '  "host_permissions": ["<all_urls>", "http://127.0.0.1/*"],',
      thay: '  "host_permissions": ["<all_urls>"],',
      soLan: 1
    }
  ]
});

/* ---- GỌI MẠNG — trạm gác của `scout.fetch` (S-10, 07/09) -----------------
 * Đức mở `<all_urls>` ngày 07/09, và lượt chốt đó xoá hàng rào theo từng TRANG. Cái còn lại là
 * bốn chốt hình dạng dưới đây — nên chúng KHÔNG phải chi tiết cài đặt: gỡ con nào cũng là gỡ
 * một lớp, không phải dọn code. Con `Q2` cũ từng canh "đừng nới quyền"; nó chết theo lượt chốt
 * đó, và bộ này là thứ thay chỗ nó. */
BATCHES.push({
  ten: "GỌI MẠNG — bốn chốt còn lại sau khi <all_urls> bỏ hàng rào theo trang",
  target: path.join(ROOT, "scripts", "scouter-bridge-core.mjs"),
  pin: PIN_BRIDGE,
  mutants: [
    {
      ma: "F1",
      ten: "Xếp scout.fetch thành read_only — nó thôi chui qua phanh, đúng lúc nguy nhất",
      tim: '    name: "scout.fetch", read_only: false, deadline_ms: 60000,',
      thay: '    name: "scout.fetch", read_only: true, deadline_ms: 60000,',
      soLan: 1
    },
    {
      ma: "F2",
      ten: "Bỏ kiểm lược đồ URL — một lệnh Bridge đọc được file trên đĩa của Đức qua file://",
      tim: '  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {',
      thay: "  if (false) {",
      soLan: 1
    },
    {
      ma: "F3",
      ten: "Cho người gọi tự gõ Cookie/Authorization — method thành công cụ mượn danh tính",
      tim: 'const FORBIDDEN_HEADERS = Object.freeze(["cookie", "authorization"]);',
      thay: "const FORBIDDEN_HEADERS = Object.freeze([]);",
      soLan: 1
    },
    {
      ma: "F4",
      ten: "Bỏ chặn GET kèm thân — đổi một câu tiếng người lấy một TypeError trần trong worker",
      tim: '      if (method === "GET" && body !== null) invalidParams("params.body", "a GET request takes no body");',
      thay: "      if (false) invalidParams(\"params.body\", \"a GET request takes no body\");",
      soLan: 1
    }
  ]
});

BATCHES.push({
  ten: "GỌI MẠNG — hai chốt nằm ở lõi seed",
  target: path.join(ROOT, "scripts", "scouter-seed-core.mjs"),
  pin: PIN_GATE,
  mutants: [
    {
      ma: "F5",
      ten: "Luôn kèm danh tính — một lượt gọi bất kỳ đọc được trang sau đăng nhập bất kỳ",
      tim: '          credentials: params.with_credentials ? "include" : "omit",',
      thay: '          credentials: "include",',
      soLan: 1
    },
    {
      ma: "F6",
      ten: "Cắt thân cho vừa trần thay vì báo đỏ — người gọi nhận nửa file mà tưởng đủ",
      tim: "      if (trenDay > FETCH_MAX_BODY_BYTES) {",
      thay: "      if (false) {",
      soLan: 1
    }
  ]
});

const BS = String.fromCharCode(92);   // dau gach nguoc, viet bang ma de khong phai thoat ba tang
const Q = String.fromCharCode(34);    // dau nhay kep
const PIN_PROBES = path.join(ROOT, "tests", "observer-probes-smoke.mjs");
const PIN_FILE = path.join(ROOT, "tests", "scouter-file-core-smoke.mjs");
const PIN_HOST = path.join(ROOT, "tests", "scouter-bridge-host-smoke.mjs");

/* ---- VÙNG GHI — chốt đắt nhất của Bridge mới (07/09) ---------------------
 * Đức chốt dựng Bridge riêng cho Scouter, "mở thông luồng cho tất cả các tính năng". Cái đi
 * kèm là một chương trình nghe trên socket và GHI LÊN ĐĨA của Đức. Sáu con dưới đây canh đúng
 * một câu hỏi — *"đường nào ra được khỏi vùng ghi?"* — và mỗi con là một lối vào khác nhau,
 * vì bịt lối này mà hở lối kia thì vùng ghi vẫn thủng y như chưa bịt gì. */
BATCHES.push({
  ten: "VÙNG GHI — sáu lối ra khỏi gốc",
  target: path.join(ROOT, "bridge", "file-core.mjs"),
  pin: PIN_FILE,
  mutants: [
    {
      ma: "G1",
      ten: "Bỏ chốt liên kết mềm — một liên kết trong gốc trỏ ra ngoài là ghi lọt ra ngoài",
      tim: "  if (raNgoaiGoc(gocThat, neoThat)) {",
      thay: "  if (false) {",
      soLan: 1
    },
    {
      ma: "G2",
      ten: "So bằng startsWith thay vì relative — thư mục anh em /goc-khac lọt vì chỉ so chuỗi",
      tim: "  const buoc = path.relative(gocThat, diem);",
      thay: "  const buoc = diem.startsWith(gocThat) ? " + Q + Q + " : " + Q + ".." + Q + ";",
      soLan: 1
    },
    {
      ma: "G3",
      ten: "Bỏ chặn đường theo ổ đĩa (C:x.txt) — path.isAbsolute trả false nên nó lọt",
      tim: '  if (/^[A-Za-z]:/.test(rel)) loi("PATH_OUTSIDE_ROOT", "Đường dẫn theo ổ đĩa không phải đường tương đối.", { path: rel });',
      thay: "  /* da bo */",
      soLan: 1
    },
    {
      ma: "G5",
      ten: "Đo trần bằng số KÝ TỰ thay vì BYTE — tiếng Việt có dấu vượt trần thật 50%",
      tim: "  if (bytes.length > MAX_FILE_BYTES) {",
      thay: "  if (noiDung.length > MAX_FILE_BYTES) {",
      soLan: 1
    },
    {
      ma: "G6",
      ten: "Nhận gốc TƯƠNG ĐỐI — vùng ghi trôi theo thư mục hiện tại của tiến trình",
      tim: '  if (typeof root !== "string" || !path.isAbsolute(root)) {',
      thay: '  if (typeof root !== "string" && false) {',
      soLan: 1
    }
  ]
});

/* ---- LỚP ĐỨNG TRƯỚC — ba chốt của tầng HTTP ------------------------------
 * `file-core.mjs` đã được canh ở trên. Bộ này canh thứ CHỈ tồn tại ở tầng HTTP, tức thứ mà một
 * phép ghim gọi thẳng hàm sẽ không bao giờ chạm tới. */
/* ---- LÕI DÙNG CHUNG — ba chốt đã CHUYỂN NHÀ 07/09 -------------------------
 * Ba con này trước nhắm vào `bridge/scouter-bridge-host.mjs` hồi nó còn là một lớp đứng
 * trước. Đức chốt Scouter phải có host riêng, chốt chuyển sang `workers/_shared/`, và bộ đo
 * lập tức báo BA MỎ NEO HỎNG — nó từ chối bỏ qua im lặng, đúng việc của nó.
 *
 * Lượt sửa mỏ neo lộ ra một lỗ thật: cái BẮT TAY HAI CHIỀU — 11 dòng mà hai gói kia không
 * có, lý do chính khiến lõi được tách ra — **không có phép ghim hành vi nào**. Con `X3` sinh
 * ra để canh nó, và `bat-tay-hai-chieu.mjs` sinh ra để giết `X3`. */
BATCHES.push({
  ten: "LÕI DÙNG CHUNG — hai cổng vào của tầng HTTP",
  target: path.join(ROOT, "..", "..", "_shared", "bridge-host", "bridge-host-core.mjs"),
  pin: path.join(ROOT, "tests", "scouter-bridge-host-smoke.mjs"),
  mutants: [
    {
      ma: "X1",
      ten: "Bỏ chặn Origin — một TRANG WEB sai khiến được máy chủ ghi đĩa",
      tim: "    if (request.headers.origin !== undefined) {",
      thay: "    if (false) {",
      soLan: 1
    },
    {
      ma: "X2",
      ten: "Bỏ kiểm token ghép cặp — ai gõ đúng cổng cũng ghi được",
      tim: "    if (!authorization.startsWith(" + Q + "Bearer " + Q + ") || !sameToken(pairing.token, authorization.slice(7))) {",
      thay: "    if (false) {",
      soLan: 1
    }
  ]
});

BATCHES.push({
  ten: "LÕI DÙNG CHUNG — bắt tay hai chiều",
  target: path.join(ROOT, "..", "..", "_shared", "bridge-host", "bridge-host-core.mjs"),
  pin: path.join(ROOT, "..", "..", "_shared", "bridge-host", "tests", "bat-tay-hai-chieu.mjs"),
  mutants: [
    {
      ma: "X3",
      ten: "QUAY VỀ BẢN GEMINI/FLOW: nhận token mà KHÔNG đòi máy chủ chứng minh trước",
      tim: "        if (!challengeAccepted || message?.type !== " + Q + "auth" + Q + " || message?.role !== " + Q + "extension" + Q + " || !sameToken(pairing.token, message?.token)) {",
      thay: "        if (message?.type !== " + Q + "auth" + Q + " || message?.role !== " + Q + "extension" + Q + " || !sameToken(pairing.token, message?.token)) {",
      soLan: 1
    },
    {
      ma: "X4",
      ten: "Nhận nonce hình gì cũng được — rác cũng thành một lượt bắt tay",
      tim: "          && /^[A-Za-z0-9_-]{43}$/.test(String(message?.nonce || " + Q + Q + "))) {",
      thay: "          && String(message?.nonce) !== undefined) {",
      soLan: 1
    }
  ]
});
BATCHES.push({
  ten: "NHÌN RÕ HƠN — ba phép dò quan sát",
  target: path.join(ROOT, "scripts", "observer-probes.mjs"),
  pin: PIN_PROBES,
  mutants: [
    {
      ma: "N1",
      ten: "Cắt cây a11y mà báo truncated:false — người gọi tưởng đã có cả trang",
      tim: "      truncated: coIch.length > limit,",
      thay: "      truncated: false,",
      soLan: 1
    },
    {
      ma: "N2",
      ten: "Thôi lọc nút vô nghĩa — phong bì đầy rác rồi chạm trần vì rác",
      tim: "      if (n?.ignored === true) return false;",
      thay: "      if (false) return false;",
      soLan: 1
    },
    {
      ma: "N3",
      ten: "Mặc định ảnh thành PNG — vượt trần phong bì ở đúng ca hay gặp nhất",
      tim: "    const format = params.format === " + Q + "png" + Q + " ? " + Q + "png" + Q + " : " + Q + "jpeg" + Q + ";",
      thay: "    const format = " + Q + "png" + Q + ";",
      soLan: 1
    },
    {
      ma: "N4",
      ten: "Ảnh quá trần thì cắt thay vì đỏ — người nhận có một file ảnh hỏng",
      tim: "    if (bytes > MAX_SHOT_BYTES) {",
      thay: "    if (false) {",
      soLan: 1
    }
  ]
});

/* ---- PHANH KHẨN — mục 9 của hồ sơ năng lực, nay là nghĩa vụ --------------
 * Từ khi Đức mở `<all_urls>` (ADR-0003), công tắc trong bảng bên là cái phanh DUY NHẤT —
 * và bảng đóng thì không với tới được. Hai con này canh đúng chỗ đó. */
BATCHES.push({
  ten: "PHANH KHẨN — phím tắt tắt được đường ghi",
  target: path.join(ROOT, "scouter-background.js"),
  pin: PIN_GATE,
  mutants: [
    {
      ma: "N5",
      ten: "Gỡ người nghe phím tắt — khai phím trong manifest mà không ai nghe",
      tim: "chrome.commands.onCommand.addListener((lenh) => {",
      thay: "const unusedCommandListener = ((lenh) => {",
      soLan: 1
    },
    {
      ma: "N6",
      ten: "Phanh khẩn BẬT công tắc thay vì tắt — bấm phanh hoá ra đạp ga",
      tim: "  setWriteGate(chrome, false)",
      thay: "  setWriteGate(chrome, true)",
      soLan: 1
    }
  ]
});

BATCHES.push({
  ten: "LƯỚI ĐỠ — nối lại bằng alarms",
  target: path.join(ROOT, "scouter-background.js"),
  pin: PIN_GATE,
  mutants: [
    {
      ma: "R1",
      ten: "Quyền alarms khai rồi nhưng không ai nghe — quyền thừa, lưới không rơi",
      tim: "chrome.alarms.onAlarm.addListener((alarm) => {",
      thay: "const unusedAlarmListener = ((alarm) => {",
      soLan: 1
    },
    {
      ma: "R3",
      ten: "Gỡ setPanelBehavior — bấm icon KHÔNG mở gì cả, và không lỗi nào hiện ra",
      tim: '  try { await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }); }',
      thay: '  try { if (false) await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }); }',
      soLan: 1
    },
    {
      ma: "R2",
      ten: "Tạo alarm mù mỗi lần worker tỉnh — đồng hồ bị đặt lại mãi nên lưới không bao giờ rơi",
      tim: "chrome.alarms.get(RECONNECT_ALARM, (existing) => {" + NL + "  if (!existing) chrome.alarms.create(RECONNECT_ALARM, { periodInMinutes: 1 });" + NL + "});",
      thay: "chrome.alarms.create(RECONNECT_ALARM, { periodInMinutes: 1 });",
      soLan: 1
    }
  ]
});

/* ---- SỔ CÔNG VIỆC — mười con canh nguồn sự thật của bảng bên (07/09) -----
 * Sổ này là thứ DUY NHẤT khối "tiến độ thuần hoá" đọc. Một cuốn sổ sai tệ hơn không có sổ, vì
 * nó sai một cách có thẩm quyền — Đức sẽ tin con số trên bảng hơn tin mắt mình. Mười con dưới
 * đây nhắm vào ba bất biến ở đầu `scouter-journal-core.mjs`, chứ không nhắm vào cú pháp. */
const PIN_JOURNAL = path.join(ROOT, "tests", "scouter-journal-smoke.mjs");

BATCHES.push({
  ten: "SỔ CÔNG VIỆC — tiến độ phải là bằng chứng",
  target: path.join(ROOT, "scripts", "scouter-journal-core.mjs"),
  pin: PIN_JOURNAL,
  mutants: [
    {
      ma: "J1",
      ten: "Lệnh HỎNG cũng tích mốc — bảng khoe một năng lực Scouter không có",
      tim: "    if (ok && METHOD_CUA_MOC.has(method) && targetId) {",
      thay: "    if (METHOD_CUA_MOC.has(method) && targetId) {",
      soLan: 1
    },
    {
      ma: "J2",
      ten: "Sổ hỏng thì ném ra ngoài — cuốn sổ của Đức giết lượt gọi của AI",
      tim: "    return xepHang(() => ghiThat(method, targetId, ok, maLoi)).then((so) => so, () => null);",
      thay: "    return xepHang(() => ghiThat(method, targetId, ok, maLoi));",
      soLan: 1
    },
    {
      ma: "J3",
      ten: "Lọc quá tay: giấu luôn session.hello — việc AI làm mà Đức không thấy",
      tim: "const KHONG_GHI = new Set([" + Q + "system.ping" + Q + "]);",
      thay: "const KHONG_GHI = new Set([" + Q + "system.ping" + Q + ", " + Q + "session.hello" + Q + "]);",
      soLan: 1
    },
    {
      ma: "J4",
      ten: "Bỏ lọc ping — nhật ký 100% là nhịp tim, 0% là việc thật",
      tim: "const KHONG_GHI = new Set([" + Q + "system.ping" + Q + "]);",
      thay: "const KHONG_GHI = new Set([]);",
      soLan: 1
    },
    {
      ma: "J5",
      ten: "Bỏ trần dòng nhật ký — kho lưu extension phình vô hạn",
      tim: "    if (so.hoatDong.length > RING_TOI_DA) so.hoatDong.length = RING_TOI_DA;",
      thay: "    if (false) so.hoatDong.length = RING_TOI_DA;",
      soLan: 1
    },
    {
      ma: "J6",
      ten: "Bỏ hàng đợi — hai lượt ghi cùng lúc nuốt nhau, im lặng",
      tim: "    const ket = hangDoi.then(viec, viec);",
      thay: "    const ket = viec();",
      soLan: 1
    },
    {
      ma: "J7",
      ten: "Khoá tiến độ theo cả địa chỉ — mỗi cuộc trò chuyện mới là một trang lạ",
      tim: "    return u.origin;",
      thay: "    return u.href;",
      soLan: 1
    },
    {
      ma: "J8",
      ten: "Nhận cả method lạ từ sổ cũ — một mốc đã bỏ vẫn tích được",
      tim: "      if (!METHOD_CUA_MOC.has(ten) || !o || typeof o !== " + Q + "object" + Q + ") continue;",
      thay: "      if (!o || typeof o !== " + Q + "object" + Q + ") continue;",
      soLan: 1
    },
    {
      ma: "J9",
      ten: "Sổ chép lại phong bì — AI nhận một bản sao, không phải vật gốc",
      tim: "        return phongBi;",
      thay: "        return { ...phongBi };",
      soLan: 1
    },
    {
      ma: "J10",
      ten: "Hết chỗ thì bỏ trang MỚI thay vì trang cũ — xoá đúng thứ Đức đang nhìn",
      tim: "        if (theoTuoi.length > TRANG_TOI_DA) so.trang = Object.fromEntries(theoTuoi.slice(0, TRANG_TOI_DA));",
      thay: "        if (theoTuoi.length > TRANG_TOI_DA) so.trang = Object.fromEntries(theoTuoi.slice(-TRANG_TOI_DA));",
      soLan: 1
    }
  ]
});

/* ---- TOKEN KHÔNG ĐƯỢC NẰM TRONG VÙNG ĐỌC (07/09) ------------------------
 * Đức hỏi ngày 07/09: đặt vùng ghi của Scouter cạnh ba Bridge kia được không? Được — nhưng
 * ngăn của mỗi Bridge CHỨA tệp ghép cặp, và `file.read` đọc được mọi file dưới `--root`. */
BATCHES.push({
  ten: "VÙNG GHI — không được chứa tệp ghép cặp",
  target: path.join(ROOT, "bridge", "scouter-bridge-host.mjs"),
  pin: path.join(ROOT, "tests", "scouter-bridge-host-smoke.mjs"),
  mutants: [
    {
      ma: "T1",
      ten: "Gỡ cái chặn — token đọc được qua dây bằng một lệnh file.read",
      tim: ".test(ten)) continue;",
      thay: ".test(ten)) { /* chan da bi go */ } continue;",
      soLan: 1
    }
  ]
});

process.exit(chayDotBien(BATCHES, ROOT));
