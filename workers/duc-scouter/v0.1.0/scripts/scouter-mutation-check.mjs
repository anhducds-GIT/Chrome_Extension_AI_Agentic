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
 *   · NỐI DÂY GHI — đường ghi đi qua `chrome.debugger` (`scouter-engine.js`), S-01
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
const PIN_WIRING = path.join(ROOT, "tests", "scouter-engine-smoke.mjs");

const BATCHES = [
  {
    ten: "LUẬT — từ vựng method và phong bì",
    target: path.join(ROOT, "scripts", "scouter-bridge-core.mjs"),
    pin: PIN_BRIDGE,
    mutants: [
      /* ---- `S-16` — hạn chờ không được vượt ngưỡng máy chủ (12/09) ------
       * Hai con hoàn nguyên đúng bug cũ theo hai kiểu: một method GHI khai quá dài, và một
       * method MỚI lọt vào bảng với hạn chờ quá dài. Con thứ hai quan trọng hơn — mục này
       * tái phát không phải bằng cách ai đó sửa số cũ, mà bằng cách ai đó THÊM một dòng. */
      {
        ma: "S9",
        ten: "`S-16` — scout.type khai lại 60 giây, dài hơn ngưỡng 35 giây của máy chủ",
        tim: '    name: "scout.type", read_only: false, deadline_ms: 34000,',
        thay: '    name: "scout.type", read_only: false, deadline_ms: 60000,',
        soLan: 1
      },
      {
        ma: "S10",
        ten: "`S-16` — một method MỚI lọt vào bảng với hạn chờ vượt ngưỡng",
        tim: '    name: "scout.navigate", read_only: false, deadline_ms: 34000,',
        thay: '    name: "scout.navigate", read_only: false, deadline_ms: 90000,',
        soLan: 1
      },
      {
        ma: "S11",
        ten: "`S-16` — bảng lệnh mất hẳn trường hạn chờ",
        tim: '    name: "scout.key", read_only: false, deadline_ms: 30000,',
        thay: '    name: "scout.key", read_only: false, deadline_ms: null,',
        soLan: 1
      },
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
        tim: '  if (value.length > 1024) invalidParams(duong, "expected at most 1024 characters");',
        thay: '  if (value.length > 102400) invalidParams(duong, "expected at most 1024 characters");',
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
  ten: "HÀNH ĐỘNG — năm chốt của đường ghi",
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
      tim: '  "Page.navigateToHistoryEntry"' + NL + ']);',
      thay: '  "Page.navigateToHistoryEntry",' + NL + '  "Input.insertText"' + NL + ']);',
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
    /* ---- CHỐT ⑸ (`S-17`), mở 12/09 ---------------------------------------
     * Năm con dưới đây canh kiểu hỏng ĐẮT NHẤT của gói: lượt bấm NÓI DỐI. Mỗi con hoàn
     * nguyên một cách khác nhau về đúng hành vi trước 12/09 — bấm vào thứ đang chắn rồi
     * trả về `ok: true`. Con nào SỐNG SÓT nghĩa là phép ghim chỉ nhìn "có bấm không" chứ
     * không nhìn "bấm trúng ai". */
    /* ---- `S-19` — nạp lại cùng một URL, vá 12/09 -------------------------
     * Bốn con canh một bản vá mà bản CŨ vẫn "chạy được" ở mọi ca thường: chỉ ca F5 mới lộ ra.
     * `HN1` là con hoàn nguyên đúng bug cũ. */
    {
      ma: "HN1",
      ten: "`S-19` — chỉ chờ url đổi: nạp lại cùng một URL treo rồi báo sai nguyên nhân",
      tim: "      if (!doiUrl && !doiTaiLieu) continue;",
      thay: "      if (!doiUrl) continue;",
      soLan: 1
    },
    {
      ma: "HN2",
      ten: "`S-19` — bỏ vế url: điều hướng trong cùng tài liệu (#muc-2) treo oan",
      tim: "      if (!doiUrl && !doiTaiLieu) continue;",
      thay: "      if (!doiTaiLieu) continue;",
      soLan: 1
    },
    {
      ma: "HN3",
      ten: "`S-19` — so `nodeId` thay vì `backendNodeId`: hai con số luôn bằng nhau, phép kiểm không bao giờ báo gì",
      tim: '  return typeof goc.backendNodeId === "number" ? goc.backendNodeId : null;',
      thay: '  return typeof goc.nodeId === "number" ? goc.nodeId : null;',
      soLan: 1
    },
    {
      ma: "HN4",
      ten: "`S-19` — để nguyên `undefined` làm danh tính cũ: lượt đi nào cũng xong ngay nhịp đầu (cả `input.navigate` lẫn `input.history`)",
      tim: "    const taiLieuTruoc = (await danhTinhTaiLieu(send)) ?? null;",
      thay: "    const taiLieuTruoc = await danhTinhTaiLieu(send);",
      soLan: 2
    },
    {
      ma: "HB1",
      ten: "CHỐT ⑸ — gỡ hẳn lượt kiểm ở CẢ bấm lẫn rê chuột: có lớp phủ cũng kệ (đúng bug S-17)",
      tim: "    const hit = await kiemDiemBam(send, node.nodeId, point, await gocCuon(send, node.rootNodeId));",
      thay: '    const hit = { relation: "self", hitNodeId: node.nodeId };',
      soLan: 2
    },
    {
      ma: "HB2",
      ten: "CHỐT ⑸ — nới thành nhận MỌI phần tử: lớp phủ cũng tính là con cháu",
      tim: "  if ((con?.nodeIds || []).includes(nutTrungDiem)) {",
      thay: "  if (true) {",
      soLan: 1
    },
    {
      ma: "HB3",
      ten: "CHỐT ⑸ — hỏng thì MỞ: Chrome không trả lời được thì cứ bấm",
      tim: '  if (typeof nutTrungDiem !== "number") {',
      thay: "  if (false) {",
      soLan: 1
    },
    {
      ma: "HB4",
      ten: "CHỐT ⑸ — hỏi SAU khi bắn: câu trả lời chỉ còn là lời phân trần",
      tim: "    const hit = await kiemDiemBam(send, node.nodeId, point, await gocCuon(send, node.rootNodeId));" + NL + "    await clickAt(send, point, nut, soLan);",
      thay: "    await clickAt(send, point, nut, soLan);" + NL + "    const hit = await kiemDiemBam(send, node.nodeId, point, await gocCuon(send, node.rootNodeId));",
      soLan: 1
    },
    {
      ma: "HB6",
      ten: "CHỐT ⑸ — để lỗi CDP thô lọt ra ngoài dây thay vì nói ra nguyên nhân hay gặp",
      tim: "      x: Math.round(point.x + goc.x), y: Math.round(point.y + goc.y), includeUserAgentShadowDOM: false" + NL + "    });" + NL + "  } catch (error) {",
      thay: "      x: Math.round(point.x + goc.x), y: Math.round(point.y + goc.y), includeUserAgentShadowDOM: false" + NL + "    });" + NL + "  } catch (error) { throw error; } if (false) { const error = null;",
      soLan: 1
    },
    {
      ma: "HB5",
      ten: "CHỐT ⑸ — bỏ làm tròn: hỏi về một điểm rồi bấm vào một điểm khác",
      tim: "  return { x: Math.round(x), y: Math.round(y) };",
      thay: "  return { x, y };",
      soLan: 1
    },
    /* ---- `S-23`, 13/09: hai hệ toạ độ. Hỏi-điểm nói theo TRANG, chuột theo KHUNG NHÌN. */
    {
      ma: "CU1",
      ten: "`S-23` — quên cộng phần cuộn: trang cuộn là mọi nút bị từ chối No node found",
      tim: "      x: Math.round(point.x + goc.x), y: Math.round(point.y + goc.y), includeUserAgentShadowDOM: false",
      thay: "      x: point.x, y: point.y, includeUserAgentShadowDOM: false",
      soLan: 1
    },
    {
      ma: "CU2",
      ten: "`S-23` — không đọc được độ cuộn thì coi như 0 rồi cứ bấm (hỏng thì MỞ)",
      tim: '  throw new ActionError("CLICK_HIT_TEST_FAILED",' + NL + '    "Không đọc được trang đang cuộn tới đâu',
      thay: '  return { x: 0, y: 0 }; throw new ActionError("CLICK_HIT_TEST_FAILED",' + NL + '    "Không đọc được trang đang cuộn tới đâu',
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
  ten: "NỐI DÂY GHI — scouter-engine.js",
  target: path.join(ROOT, "scouter-engine.js"),
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
      ten: "Gỡ hẳn cái phanh khỏi CẢ BA đường vào: bấm, gọi mạng và lấy tệp thẳng tay",
      tim: "    const budget = await spendWriteBudget();",
      thay: "    const budget = { used: 0, cap_per_unlock: WRITE_CAP_PER_UNLOCK, remaining: WRITE_CAP_PER_UNLOCK };",
      /* 2 → 3 ngày 14/09: `scout.grab` là đường vào thứ BA (`S-24`). Con số này là một phép
       * đếm, không phải một hằng số cho đẹp: thêm một đường ghi mà quên cộng vào đây thì bộ đo
       * ĐỎ ngay — đúng như nó vừa làm. */
      soLan: 3
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
      /* Mỏ neo đổi 08/09 cùng bản vá S-15: lượt ghi nay liệt TỪNG TRƯỜNG thay vì trải
       * bản ghi cũ. Neo cũ khớp 0 chỗ — bộ đo báo ĐỎ, đúng như nó phải làm. */
      tim: "        [WRITE_GATE_STORAGE_KEY]: { enabled: true, enabled_at: gate.enabled_at ?? null, used }",
      thay: "        [WRITE_GATE_STORAGE_KEY]: { enabled: true, enabled_at: gate.enabled_at ?? null, used: gate.used }",
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
      tim: '    name: "scout.fetch", read_only: false, deadline_ms: 34000,',
      thay: '    name: "scout.fetch", read_only: true, deadline_ms: 34000,',
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
const PIN_PROBES = path.join(ROOT, "tests", "scouter-probes-smoke.mjs");
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
  target: path.join(ROOT, "scripts", "scouter-probes.mjs"),
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

/* ---- HAI CA ĐUA CỦA KHỐI PHANH (S-15, 08/09) ----------------------------
 * Hai con này hoàn nguyên đúng bản vá S-15. Cả hai chỉ nổ khi hai lượt chồng nhau, nên nếu
 * khối ⑳ của phép ghim mất cái kho lưu CHẬM (nhường lượt giữa `get` và `set`) thì cả hai con
 * này sống sót — đó là cách bộ đo nói rằng phép ghim đã hết răng. */
BATCHES.push({
  ten: "KHỐI PHANH — hai ca đua",
  target: path.join(ROOT, "scripts", "scouter-seed-core.mjs"),
  pin: path.join(ROOT, "tests", "scouter-write-gate-smoke.mjs"),
  mutants: [
    {
      ma: "PD1",
      ten: "Trải bản ghi cũ khi trừ ngân sách — phanh khẩn bị hồi sinh giữa lượt đọc và lượt ghi",
      tim: "        [WRITE_GATE_STORAGE_KEY]: { enabled: true, enabled_at: gate.enabled_at ?? null, used }",
      thay: "        ...{ [WRITE_GATE_STORAGE_KEY]: { ...gate, used } }",
      soLan: 1
    },
    {
      ma: "PD2",
      ten: "Bỏ hàng đợi: mỗi việc chạy ngay — hai lượt cùng đọc used:199 rồi cùng bấm",
      tim: "  const ket = hangCongTac.then(viec, viec);",
      thay: "  const ket = Promise.resolve().then(viec);",
      soLan: 1
    }
  ]
});

/* ---- S-13: LƯỢT TỪ CHỐI PHẢI GIỮ `request_id` (08/09) -------------------
 * Hoàn nguyên đúng bản vá. Con này chỉ chết nếu phép ghim thử một phong bì bị từ chối **ở tầng
 * phong bì** — thử một method lạ đúng hình dạng thì KHÔNG đủ, vì đường đó vẫn có `request`. */
BATCHES.push({
  ten: "PHONG BÌ — lượt từ chối phải giữ request_id",
  target: path.join(ROOT, "scripts", "scouter-bridge-core.mjs"),
  pin: path.join(ROOT, "tests", "scouter-bridge-smoke.mjs"),
  mutants: [
    {
      ma: "PB1",
      ten: "Bỏ phương án dự phòng: phong bì hỏng lại trả request_id null như trước",
      tim: "      const id = request?.request_id ?? idTho;",
      thay: "      const id = request?.request_id ?? null;",
      soLan: 1
    }
  ]
});

/* ---- TÊN GHẾ — bốn con canh khối danh tính (12/09) -----------------------
 * Khối này nhỏ nhưng hỏng thì hỏng CÂM: ghế vẫn nối, lệnh vẫn chạy, chỉ là gọi tên không
 * trúng — hoặc tệ hơn, trúng NHẦM ghế. Bốn con dưới đây nhắm vào bốn bất biến, không vào cú
 * pháp: số ghế bền, tên đọc lại mỗi lượt nối, thiếu tên không giết kết nối, và nhãn phải sạch
 * đúng cách máy chủ làm sạch. */
BATCHES.push({
  ten: "TÊN GHẾ — danh tính định tuyến",
  target: path.join(ROOT, "scripts", "scouter-transport-loopback.mjs"),
  pin: path.join(ROOT, "tests", "scouter-profile-id-smoke.mjs"),
  mutants: [
    {
      ma: "TG1",
      ten: "Đúc số ghế MỚI mỗi lượt nối — mọi lệnh đang nhắm vào ghế cũ lạc chỗ",
      tim: "      || !INSTANCE_ID_SHAPE.test(record.instance_id)) {",
      thay: "      || !INSTANCE_ID_SHAPE.test(record.instance_id) || true) {",
      soLan: 1
    },
    {
      ma: "TG2",
      ten: "Nhớ danh tính lần đầu rồi dùng mãi — Đức đổi tên xong không bao giờ ăn",
      tim: "      instanceForSocket = await loadInstance().catch(() => null);",
      thay: "      instanceForSocket = instanceForSocket || await loadInstance().catch(() => null);",
      soLan: 1
    },
    {
      ma: "TG3",
      ten: "Khai bừa một khối instance rỗng khi đọc danh tính hỏng — máy chủ đóng socket 1008",
      tim: "      if (instanceForSocket) khungAuth.instance = instanceForSocket;",
      thay: "      khungAuth.instance = instanceForSocket || { schema_version: 1 };",
      soLan: 1
    },
    {
      ma: "TG4",
      ten: "Bỏ lượt quét nửa cặp thay thế lạc — nhãn cắt ở 64 thành UTF-16 hỏng trên dây",
      tim: "  return value.slice(0, 256).replace(DIEU_KHIEN, \"\").trim().slice(0, 64).replace(NUA_CAP_LAC, \"\");",
      thay: "  return value.slice(0, 256).replace(DIEU_KHIEN, \"\").trim().slice(0, 64);",
      soLan: 1
    }
  ]
});

/* ---- CHỜ và NGHE MẠNG — sáu con canh hai năng lực mở 12/09 --------------
 * Con `NM1` là con quan trọng nhất của cả file này: nó hoàn nguyên lượt nhặt-theo-danh-sách-
 * trắng thành một lượt trải nguyên gói Chrome đưa sang. Bản đột biến đó vẫn trả về đúng số
 * dòng, đúng URL, đúng mã trạng thái — nó chỉ chở thêm `request.headers`. Nghĩa là mọi phép
 * ghim đếm-và-so sẽ XANH trọn, và công cụ quan sát lặng lẽ thành máy hút token. Con này chỉ
 * chết nếu phép ghim soi TOÀN BỘ chuỗi kết quả để tìm bí mật. */
BATCHES.push({
  ten: "CHỜ và NGHE MẠNG — hai năng lực mở 12/09",
  target: path.join(ROOT, "scripts", "scouter-probes.mjs"),
  pin: path.join(ROOT, "tests", "scouter-wait-net-smoke.mjs"),
  mutants: [
    {
      ma: "NM1",
      ten: "Trải nguyên gói Chrome đưa sang — header, cookie và token đi thẳng ra ngoài dây",
      tim: "        banGhi.method = typeof e.request?.method === \"string\" ? e.request.method.slice(0, 16) : null;",
      thay: "        Object.assign(banGhi, e.request);",
      soLan: 1
    },
    {
      ma: "NM2",
      ten: "Bỏ cắt query string — token nằm sau dấu ? đi ra nguyên vẹn",
      tim: "        banGhi.url = stripQuery(url);",
      thay: "        banGhi.url = url;",
      soLan: 1
    },
    {
      ma: "NM3",
      ten: "Bỏ maxPostDataSize:0 — Chrome gửi luôn nội dung người dùng gõ sang",
      tim: "      await send(\"Network.enable\", { maxPostDataSize: 0 });",
      thay: "      await send(\"Network.enable\", {});",
      soLan: 1
    },
    {
      ma: "NM4",
      ten: "Thiếu kênh sự kiện thì im lặng trả danh sách rỗng (trông y hệt 'trang không gọi gì')",
      tim: "      throw new ProbeError(\"DEPS_MISSING\", \"network.watch cần deps.subscribe — kênh sự kiện CDP chưa được nối.\");",
      thay: "      return { durationMs: 0, urlContains: null, total: 0, returned: 0, dropped: 0, hasMore: false, items: [], redaction: \"\" };",
      soLan: 1
    },
    {
      ma: "NM5",
      ten: "Giữ nodeId gốc từ lượt hỏi đầu — chờ mãi không thấy trên trang động",
      tim: "      const doc = await send(\"DOM.getDocument\", { depth: 0, pierce: false });",
      thay: "      const doc = docCache || (docCache = await send(\"DOM.getDocument\", { depth: 0, pierce: false }));",
      soLan: 1
    },
    {
      ma: "NM6",
      ten: "Ngủ trước rồi mới hỏi — tốn oan một nhịp mỗi lần điều kiện đã đúng sẵn",
      tim: "      if (satisfied) break;",
      thay: "      if (satisfied && polls > 1) break;",
      soLan: 1
    },
    /* ---- `usable` (`S-18`), mở 12/09 -------------------------------------
     * Bốn con dưới đây canh MỘT câu hỏi: `usable` có thật sự khác `present` không, hay nó chỉ
     * là một cái tên thứ hai cho cùng một phép đo. Con `NM7` là con đắt nhất — bản đột biến
     * của nó trả về đúng `satisfied: true` như mọi bản đúng trên mọi trang KHÔNG có tấm chắn,
     * nên chỉ một phép ghim DỰNG HẲN tấm chắn mới giết được nó. */
    {
      ma: "NM7",
      ten: "`usable` cư xử y hệt `present` — đếm khớp thay vì đếm thứ thật sự bấm được",
      tim: "        const dem = await demSoDungDuoc(send, nodeIds, minCount, root.nodeId);" + NL
        + "        usableCount = dem.dem;" + NL + "        usableBlockedBy = dem.vuong;" + NL
        + "        satisfied = usableCount >= minCount;",
      thay: "        usableCount = matchCount;" + NL + "        usableBlockedBy = null;" + NL
        + "        satisfied = matchCount >= minCount;",
      soLan: 1
    },
    {
      ma: "NM8",
      ten: "Nới phép đối chiếu: mọi thứ nằm ở điểm giữa đều tính là của phần tử đó",
      tim: '  return (con?.nodeIds || []).includes(trungDiem) ? "yes" : "covered";',
      thay: '  return "yes";',
      soLan: 1
    },
    {
      ma: "NM9",
      ten: "Báo số dùng được bằng số khớp — xoá đúng cái tin 'có đấy nhưng đang bị chắn'",
      tim: "      usableCount: state === \"usable\" ? usableCount : null,",
      thay: "      usableCount: matchCount,",
      soLan: 1
    },
    {
      ma: "NM11",
      ten: "Gộp 'Chrome không trả lời được' vào 'bị chắn' — đẩy người đọc đi tìm hộp thoại không có",
      tim: '  } catch { return "no_hit_test"; }',
      thay: '  } catch { return "covered"; }',
      soLan: 1
    },
    {
      ma: "CU3",
      ten: "`S-23` lõi đọc — quên cộng phần cuộn: phần tử phải cuộn tới bị báo no_hit_test",
      tim: "      x: Math.round(x + goc.x), y: Math.round(y + goc.y), includeUserAgentShadowDOM: false",
      thay: "      x: Math.round(x), y: Math.round(y), includeUserAgentShadowDOM: false",
      soLan: 1
    },
    {
      ma: "CU4",
      ten: "`S-23` lõi đọc — không đọc được độ cuộn thì coi như 0 và vẫn báo dùng được",
      tim: '    const lyDo = goc ? await dungDuoc(send, nodeId, goc) : "no_hit_test";',
      thay: "    const lyDo = await dungDuoc(send, nodeId, goc || { x: 0, y: 0 });",
      soLan: 1
    },
    {
      ma: "NM10",
      ten: "Đổi MẶC ĐỊNH sang usable — mọi lượt gọi đã viết lặng lẽ đổi nghĩa",
      tim: "    const state = params.state === undefined || params.state === null ? \"present\" : params.state;",
      thay: "    const state = params.state === undefined || params.state === null ? \"usable\" : params.state;",
      soLan: 1
    }
  ]
});

/* ---- LÕI DÙNG CHUNG — GHÉP MẢNH NỐI (`T24`, `S-25`) ----------------------
 * Lượt sửa 14/09 dạy bộ giải khung nghe được tin bị cắt mảnh. Bốn con dưới đây canh hai chiều,
 * và chiều thứ hai mới là chiều khó: `X8` không hỏi "ghép có đúng không" mà hỏi **"lượt thêm
 * tính năng có lỡ đổi hành vi của tin KHÔNG cắt mảnh không"** — câu duy nhất đáng sợ ở đây, vì
 * ba gói đóng băng đang chạy trên một bản sao y hệt của file này. */
BATCHES.push({
  ten: "LÕI DÙNG CHUNG — ghép tin WebSocket bị cắt mảnh",
  target: path.join(ROOT, "..", "..", "_shared", "bridge-host", "websocket-core.mjs"),
  pin: path.join(ROOT, "..", "..", "_shared", "bridge-host", "tests", "ghep-manh-noi.mjs"),
  mutants: [
    {
      ma: "X5",
      ten: "Nuốt khung điều khiển khi đang ghép dở — ping không được trả lời, phía kia tưởng chết",
      tim: "      if (opcode >= 0x8) {",
      thay: "      if (opcode >= 0x8 && !dangGhep) {",
      soLan: 1
    },
    {
      ma: "X6",
      ten: "Trần tính theo TỪNG MẢNH — mọi trần lách được bằng cách cắt nhỏ ra",
      tim: "      if (ghep.tong > maxPayloadBytes) {",
      thay: "      if (payload.length > maxPayloadBytes) {",
      soLan: 1
    },
    {
      ma: "X7",
      ten: "Tin ghép xong mang opcode của MẢNH CUỐI (0) chứ không của mảnh đầu",
      tim: "        opcode: ghep.opcode,",
      thay: "        opcode,",
      soLan: 1
    },
    {
      ma: "X8",
      ten: "CHIỀU NGƯỢC: khung điều khiển bỗng có `text` — tin không cắt mảnh đổi hành vi",
      tim: "        frames.push({ fin, opcode, masked, payload, text: null });",
      thay: "        frames.push({ fin, opcode, masked, payload, text: payload.toString(" + Q + "utf8" + Q + ") });",
      soLan: 1
    }
  ]
});

/* ---- NHÓM "NHÌN & ĐI LẠI" (`T25` `T26` `T27` `T28` `T30`) ----------------
 * Sáu dòng bảng năng lực đổi sang `CÓ` trong một lượt, và không dòng nào có lượt chạy thật.
 * Khi khoảng cách giữa "có mã" và "đã chứng minh" rộng như thế, bộ đo đột biến là thứ duy nhất
 * còn nói được câu nào về chất lượng — nên nó phải canh cả hai chiều, và chiều khó là `V5`:
 * *lượt bấm cũ có đổi hành vi không*. */
BATCHES.push({
  ten: "NHÌN — `page.view` và lượt chụp toàn cảnh",
  target: path.join(ROOT, "scripts", "scouter-probes.mjs"),
  pin: path.join(ROOT, "tests", "scouter-view-smoke.mjs"),
  mutants: [
    {
      ma: "V1",
      ten: "Đọc bộ số THIẾT BỊ thay vì bộ CSS — đúng trên màn thường, sai trên HiDPI",
      tim: "    const khung = m?.cssLayoutViewport || m?.layoutViewport;",
      thay: "    const khung = m?.layoutViewport || m?.cssLayoutViewport;",
      soLan: 1
    },
    {
      ma: "V2",
      ten: "`conLai` không kẹp ở 0 — trang ngắn hơn khung nhìn báo 'cuộn ngược lên được'",
      tim: "        x: Math.max(0, coTrang.width - khungNhin.width - cuon.x),",
      thay: "        x: coTrang.width - khungNhin.width - cuon.x,",
      soLan: 1
    },
    {
      ma: "V3",
      ten: "`full_page` quên `captureBeyondViewport` — vẫn chỉ chụp phần đang thấy",
      tim: "      ? { clip, captureBeyondViewport: toanTrang }",
      thay: "      ? { clip, captureBeyondViewport: false }",
      soLan: 1
    },
    {
      ma: "V4",
      ten: "Trần điểm ảnh chặn SAU khi Chrome đã dựng ảnh — chặn nhầm chỗ đã giết service worker",
      tim: "      if (diem > MAX_SHOT_PIXELS) {",
      thay: "      if (false) {",
      soLan: 1
    },
    {
      ma: "V11",
      ten: "`G-72` ở ĐƯỜNG ĐỌC — bỏ hạn cho mỗi lệnh CDP: một lượt chụp treo cũng khoá cả tab",
      tim: "  if (!(hanMs > 0)) return viec;",
      thay: "  return viec;",
      soLan: 1
    }
  ]
});

BATCHES.push({
  ten: "ĐI LẠI — cuộn · rê chuột · lùi/tiến · bấm phải-đúp",
  target: path.join(ROOT, "scripts", "scouter-actions-core.mjs"),
  pin: path.join(ROOT, "tests", "scouter-dilai-smoke.mjs"),
  mutants: [
    {
      ma: "V5",
      ten: "CHIỀU NGƯỢC: `clickCount` gõ cứng 1 — lượt bấm đúp im lặng thành hai lượt bấm đơn",
      tim: "clickCount: lan });",
      thay: "clickCount: 1 });",
      soLan: 2
    },
    {
      ma: "V6",
      ten: "Mặt nạ `buttons` gõ cứng 1 — bấm phải gửi đi một sự kiện tự mâu thuẫn",
      tim: "buttons: nut.mask, clickCount: lan });",
      thay: "buttons: 1, clickCount: lan });",
      soLan: 1
    },
    {
      ma: "V7",
      ten: "Rê chuột lỡ NHẤN luôn — một lượt bấm mà không ai gọi",
      tim: "      type: \"mouseMoved\", x: point.x, y: point.y, button: \"none\", buttons: 0",
      thay: "      type: \"mousePressed\", x: point.x, y: point.y, button: \"left\", buttons: 1, clickCount: 1",
      soLan: 1
    },
    {
      ma: "V8",
      ten: "Lùi/tiến bỏ kiểm biên — lùi ở trang đầu tiên trông y hệt một lượt lùi thành công",
      tim: "    if (dich < 0 || dich >= muc.length) {",
      thay: "    if (false) {",
      soLan: 1
    },
    {
      ma: "V9",
      ten: "Cuộn KHÔNG cuộn: báo thành công mà chưa bảo trình duyệt đưa phần tử vào tầm nhìn",
      tim: '    await send("DOM.scrollIntoViewIfNeeded", { nodeId: node.nodeId });' + NL + "    return { selector, matchCount: node.matchCount, method:",
      thay: '    await send("DOM.enable", {});' + NL + "    return { selector, matchCount: node.matchCount, method:",
      soLan: 1
    },
    {
      ma: "V10",
      ten: "`G-72` — bỏ hạn cho mỗi lệnh CDP: một lệnh treo giữ debugger, khoá cả tab cho mọi lệnh sau",
      tim: "  if (!(hanMs > 0)) return viec;",
      thay: "  return viec;",
      soLan: 1
    }
  ]
});

/* ---- `S1`/`S2`: ĐƯỜNG GHI TỰ KIỂM. Mẻ này canh đúng một thứ — **đường ghi thôi nói dối**.
   Trước 16/09 `scout.type` trả về số phím nó GỬI ĐI và báo đạt cho một việc có thể chưa xảy
   ra; con T1 dưới đây là chính cái đó, viết lại thành một dòng. ------------------------- */
const PIN_TU_KIEM = path.join(ROOT, "tests", "ghi-tu-kiem-smoke.mjs");

BATCHES.push({
  ten: "GHI TỰ KIỂM — phần phán (thuần logic)",
  target: path.join(ROOT, "scripts", "tu-kiem-ghi.mjs"),
  pin: PIN_TU_KIEM,
  mutants: [
    {
      ma: "TK1",
      ten: "Đếm thành 'lớn hơn hoặc bằng' — ô không đổi một chữ nào vẫn được báo ĐẠT",
      tim: "  if (sauLan > truocLan) {",
      thay: "  if (sauLan >= truocLan) {",
      soLan: 1
    },
    {
      ma: "TK2",
      ten: "Quay về phép 'có chứa' — chữ vốn nằm sẵn trong ô được tính là trang đã nhận",
      tim: "  const sauLan = demLan(s.gia, daGo);",
      thay: "  const sauLan = s.gia.includes(daGo) ? truocLan + 1 : truocLan;",
      soLan: 1
    },
    {
      ma: "TK3",
      ten: "Đếm CHỒNG LẤN — 'aaaa' hoá ra chứa 'aa' ba lần, con số tăng mà không ai gõ gì",
      tim: "    tu = thay + tim.length;",
      thay: "    tu = thay + 1;",
      soLan: 1
    },
    {
      ma: "TK4",
      ten: "Bỏ nhánh ô CHE nội dung — mọi lượt gõ vào ô mật khẩu thành một lời buộc tội sai",
      tim: "  if (laChe(s.gia)) {",
      thay: "  if (false && laChe(s.gia)) {",
      soLan: 1
    },
    {
      ma: "TK5",
      ten: "Bỏ nhánh bản đọc BỊ CẮT — một bản đọc cụt bị đem ra kết luận 'trang không nhận'",
      tim: "  if (t.cat || s.cat) {",
      thay: "  if (false) {",
      soLan: 1
    },
    {
      ma: "TK6",
      ten: "Bỏ nhánh KHÔNG ĐỌC ĐƯỢC — 'chưa có bằng chứng' bị đổi thành 'trang không nhận'",
      tim: "  if (!t.docDuoc || !s.docDuoc) {",
      thay: "  if (false) {",
      soLan: 1
    },
    {
      ma: "TK7",
      ten: "Chữ đã gõ đi ra trong câu giải thích — mật khẩu nằm trong nhật ký",
      tim: "    `Đã gõ ${daGo.length} ký tự, nhưng đọc lại bằng ${ten} thì chuỗi đó vẫn xuất hiện ` +",
      thay: "    `Đã gõ ${daGo} (${daGo.length} ký tự), nhưng đọc lại bằng ${ten} thì chuỗi đó vẫn xuất hiện ` +",
      soLan: 1
    }
  ]
});

/* ---- `T29`/`W8`: `scout.upload`. M\u1ebb n\u00e0y canh **c\u1eeda duy nh\u1ea5t \u0111i t\u1eeb \u0111\u0129a ra m\u1ed9t trang web**,
   n\u00ean n\u00f3 \u0111\u01b0\u1ee3c \u0111\u1ecdc k\u1ef9 h\u01a1n m\u1ecdi m\u1ebb kh\u00e1c. Hai n\u1eeda, hai t\u1ec7p, hai gi\u1ed1ng lo\u00e0i l\u1ed7i kh\u00e1c h\u1eb3n nhau:

     \u2460 **L\u00d5I GHI** (t\u1ec7p c\u1ee7a g\u00f3i n\u00e0y) \u2014 l\u00f9i v\u1ec1 `path`, b\u1ecf ph\u00e9p ki\u1ec3m \u00f4-ch\u1ecdn-t\u1ec7p, ch\u1edf \u0111\u01b0\u1eddng
       tuy\u1ec7t \u0111\u1ed1i ra ngo\u00e0i.
     \u2461 **M\u00c1Y CH\u1ee6 UDIN** (t\u1ec7p c\u1ee7a g\u00f3i kia) \u2014 \u0111\u1ec3 gi\u00e1 tr\u1ecb ng\u01b0\u1eddi g\u1ecdi t\u1ef1 \u0111i\u1ec1n s\u1ed1ng s\u00f3t. Con `U7` l\u00e0
       con \u0111\u1eaft nh\u1ea5t c\u1ea3 b\u1ed9 \u0111o: n\u00f3 \u0111\u1ed5i M\u1ed8T th\u1ee9 t\u1ef1 to\u00e1n t\u1eed tr\u1ea3i, v\u00e0 h\u1eadu qu\u1ea3 l\u00e0 m\u1ed9t l\u01b0\u1ee3t g\u1ecdi \u0111\u01b0a
       \u0111\u01b0\u1ee3c m\u1ed9t t\u1ec7p **ngo\u00e0i v\u00f9ng ghi** v\u00e0o trang, trong khi m\u1ecdi ph\u00e9p ki\u1ec3m kh\u00e1c v\u1eabn xanh.

   M\u1ebb \u2461 nh\u1eafm t\u1ec7p c\u1ee7a g\u00f3i `udin-optic`, c\u00f3 \u00fd: \u0111\u00e2y l\u00e0 b\u1ed9 \u0111o \u0111\u1ed9t bi\u1ebfn DUY NH\u1ea4T c\u1ee7a repo, v\u00e0 m\u1ed9t ch\u1ed1t
   an to\u00e0n kh\u00f4ng c\u00f3 con \u0111\u1ed9t bi\u1ebfn n\u00e0o canh th\u00ec kh\u00f4ng ph\u1ea3i m\u1ed9t ch\u1ed1t. ------------------------------ */
const PIN_TAI_LEN = path.join(ROOT, "tests", "tai-len-smoke.mjs");
const UDIN = path.join(ROOT, "..", "..", "udin-optic", "v0.1.0");

BATCHES.push({
  ten: "TAI LEN \u2014 l\u00f5i ghi",
  target: path.join(ROOT, "scripts", "scouter-actions-core.mjs"),
  pin: PIN_TAI_LEN,
  mutants: [
    {
      ma: "U1",
      ten: "L\u00f9i v\u1ec1 `path` khi thi\u1ebfu \u0111\u01b0\u1eddng m\u00e1y ch\u1ee7 \u0111\u1eb7t \u2014 extension t\u1ef1 gh\u00e9p \u0111\u01b0\u1eddng d\u1eabn",
      tim: "    const duong = params.path_tuyet_doi;",
      thay: "    const duong = params.path_tuyet_doi || params.path;",
      soLan: 1
    },
    {
      ma: "U2",
      ten: "B\u1ecf h\u1eb3n ph\u00e9p ki\u1ec3m thi\u1ebfu \u0111\u01b0\u1eddng \u2014 g\u1eafn m\u1ed9t `undefined` v\u00e0o \u00f4 ch\u1ecdn t\u1ec7p",
      tim: '    if (typeof duong !== "string" || duong.trim() === "") {',
      thay: "    if (false) {",
      soLan: 1
    },
    {
      ma: "U3",
      ten: "B\u1ecf ph\u00e9p ki\u1ec3m \u00f4-ch\u1ecdn-t\u1ec7p \u2014 g\u1eafn file v\u00e0o m\u1ed9t ph\u1ea7n t\u1eed b\u1ea5t k\u1ef3",
      tim: "  if (!oTep.includes(node.nodeId)) {",
      thay: "  if (false) {",
      soLan: 1
    },
    {
      ma: "U4",
      ten: "N\u1edbi th\u00e0nh *trang c\u00f3 \u00f4 ch\u1ecdn t\u1ec7p n\u00e0o \u0111\u00f3* \u2014 xanh c\u1ea3 khi selector tr\u1ecf ch\u1ed7 kh\u00e1c",
      tim: "  if (!oTep.includes(node.nodeId)) {",
      thay: "  if (oTep.length === 0) {",
      soLan: 1
    },
    {
      ma: "U5",
      ten: "G\u1eafn v\u00e0o \u00f4 ch\u1ecdn t\u1ec7p \u0110\u1ea6U TI\u00caN thay v\u00ec \u00f4 selector kh\u1edbp",
      tim: '  await send("DOM.setFileInputFiles", { nodeId: node.nodeId, files: [duong] });',
      thay: '  await send("DOM.setFileInputFiles", { nodeId: oTep[0], files: [duong] });',
      soLan: 1
    },
    {
      ma: "U10",
      ten: "BẤM TRƯỚC RỒI MỚI CHẶN — hộp thoại hệ điều hành dựng lên màn hình Đức",
      /* NEO PHẢI GỒM CẢ CÚ BẤM. Bản đầu chỉ dời dòng chặn xuống trong `try` — vẫn đứng TRƯỚC
       * `clickAt`, tức không đảo gì cả, và con đột biến sống sót vì CHÍNH NÓ viết sai chứ không
       * vì phép ghim yếu. Một con đột biến không làm đúng việc nó khai là một lỗ trong bộ đo. */
      tim: '  await send("Page.setInterceptFileChooserDialog", { enabled: true });' + NL + "  try {" + NL
        + "    await clickAt(send, diem, readNutChuot(undefined), 1);",
      thay: "  try {" + NL + "    await clickAt(send, diem, readNutChuot(undefined), 1);" + NL
        + '    await send("Page.setInterceptFileChooserDialog", { enabled: true });',
      soLan: 1
    },
    {
      ma: "U11",
      ten: "Để QUÊN CÁI CHẶN Ở TRẠNG THÁI BẬT — Chrome của Đức nuốt mọi hộp thoại chọn tệp",
      tim: "  } finally {" + NL
        + "    /* KHÔNG có `catch` ở đây: một lượt tắt hỏng phải nổi lên cho người gọi thấy, vì hậu quả của",
      thay: "  } finally { if (false) {" + NL
        + "    /* KHÔNG có `catch` ở đây: một lượt tắt hỏng phải nổi lên cho người gọi thấy, vì hậu quả của",
      soLan: 1
    },
    {
      ma: "U12",
      ten: "Đổ file vào ô ĐẦU TIÊN thay vì ô MỚI hiện ra sau cú bấm",
      tim: "      moi = nay.filter((id) => !truoc.includes(id));",
      thay: "      moi = nay.slice(0, 1);",
      soLan: 1
    },
    {
      ma: "U6",
      ten: "Ch\u1edf \u0111\u01b0\u1eddng TUY\u1ec6T \u0110\u1ed0I ra k\u1ebft qu\u1ea3 \u2014 v\u00f9ng ghi c\u1ee7a \u0110\u1ee9c v\u00e0o nh\u1eadt k\u00fd",
      tim: '    return { ...ketQua, path: typeof params.path === "string" ? params.path : null, files: 1 };',
      thay: "    return { ...ketQua, path: duong, files: 1 };",
      soLan: 1
    }
  ]
});

BATCHES.push({
  ten: "TAI LEN \u2014 m\u00e1y ch\u1ee7 gh\u00e9p \u0111\u01b0\u1eddng d\u1eabn (t\u1ec7p c\u1ee7a g\u00f3i udin-optic)",
  target: path.join(UDIN, "bridge", "udin-optic-host.mjs"),
  pin: path.join(UDIN, "tests", "tai-len-smoke.mjs"),
  mutants: [
    {
      ma: "U7",
      ten: "GI\u00c1 TR\u1eca NG\u01af\u1edcI G\u1eccI T\u1ef0 \u0110I\u1ec0N TH\u1eaeNG \u2014 m\u1ed9t t\u1ec7p ngo\u00e0i v\u00f9ng ghi v\u00e0o \u0111\u01b0\u1ee3c trang",
      tim: "  return { ...envelope, params: { ...p, path_tuyet_doi: tuyetDoi } };",
      thay: "  return { ...envelope, params: { path_tuyet_doi: tuyetDoi, ...p } };",
      soLan: 1
    },
    {
      ma: "U9",
      ten: "Bỏ chốt *tệp phải có thật* — Chrome gắn một tệp RỖNG vào trang và báo đạt",
      tim: "  try { thongTin = fs.statSync(tuyetDoi); }",
      thay: "  try { thongTin = { isDirectory: () => false }; }",
      soLan: 1
    },
    {
      ma: "U8",
      ten: "Kh\u00f4ng gh\u00e9p v\u00e0o v\u00f9ng ghi n\u1eefa \u2014 `path` \u0111i nguy\u00ean v\u0103n xu\u1ed1ng extension",
      tim: "  const tuyetDoi = trongGoc(root, p.path);",
      thay: "  const tuyetDoi = p.path;",
      soLan: 1
    }
  ]
});

/* ---- `S-27`: `scout.clear` VÀO ĐƯỜNG TỰ KIỂM. Tới sáng 16/09 đây là lệnh ghi CUỐI CÙNG
   còn fail-open: nó trả `steps: ["Ctrl+A","Delete"]`, và trả **y hệt** như thế khi ô vốn đã rỗng.
   Những con dưới đây canh ba chỗ khác nhau, và hai chỗ đầu mới là chỗ dễ viết sai:
   ① nhánh *"ô vốn đã rỗng"* phải nói MỘT CÂU KHÁC — trạng thái đạt, nhưng không chứng minh
     được hai phím đã tới trang;
   ② dấu che và bản đọc cụt ở đây là *CÒN CHỮ*, không phải *không đọc được* — ngược hẳn
     `xetDocLai`, và chép nhầm luật từ bên kia sang là mở lại đúng cửa fail-open vừa đóng. */
BATCHES.push({
  ten: "GHI TỰ KIỂM — lượt XOÁ (phần phán)",
  target: path.join(ROOT, "scripts", "tu-kiem-ghi.mjs"),
  pin: PIN_TU_KIEM,
  mutants: [
    {
      ma: "TK18",
      ten: "Ô còn chữ vẫn báo ĐẠT — đúng hành vi fail-open mà `S-27` sinh ra để đóng",
      tim: '  if (s.gia !== "") {',
      thay: "  if (false) {",
      soLan: 1
    },
    {
      ma: "TK19",
      ten: "Bản đọc CỤT bị xếp thành 'chưa kiểm được' — một ô RÕ RÀNG còn chữ thành một ô mù",
      tim: '  if (s.gia !== "") {',
      thay: '  if (s.gia !== "" && !s.cat) {',
      soLan: 1
    },
    {
      ma: "TK20",
      ten: "Hai nhánh nói chung một câu — 'ô vốn đã rỗng' đọc y như 'hai phím đã tới trang'",
      tim: '  if (t.docDuoc && t.gia !== "") {',
      thay: "  if (false) {",
      soLan: 1
    },
    {
      ma: "TK21",
      ten: "Bỏ nhánh KHÔNG ĐỌC ĐƯỢC — không có bằng chứng bị đổi thành đã xoá sạch",
      tim: "  if (!s.docDuoc) {",
      thay: "  if (false) {",
      soLan: 1
    },
    {
      ma: "TK22",
      ten: "Câu lỗi nín luôn việc ô đang che — người sửa tưởng đó là một ô không đọc được",
      tim: '${laChe(s.gia) ? " (ô che nội dung — dấu che nghĩa là CÒN chữ, không phải không đọc được)" : ""}',
      thay: "",
      soLan: 1
    }
  ]
});

BATCHES.push({
  ten: "GHI TỰ KIỂM — đường nối ở seed",
  target: path.join(ROOT, "scripts", "scouter-seed-core.mjs"),
  pin: PIN_TU_KIEM,
  mutants: [
    {
      ma: "TK8",
      ten: "Bỏ lượt đọc TRƯỚC khi gõ — chỉ còn phép 'có chứa', và phép ấy xanh giả",
      tim: "      const truoc = await docO(target, params.selector, cach, nut);" + NL + NL
        + '      const ra = await runAction("scout.type",',
      thay: "      const truoc = { docDuoc: false, gia: \"\", cat: false };" + NL + NL
        + '      const ra = await runAction("scout.type",',
      soLan: 1
    },
    {
      ma: "TK9",
      ten: "Bỏ lượt đọc SAU khi gõ — quay đúng về hành vi cũ: báo đạt cho việc chưa xảy ra",
      tim: "      const sau = await docO(target, params.selector, cach, nut);" + NL
        + "      /* `xetDocLai` NÉM ở nhánh lệch.",
      thay: "      const sau = { docDuoc: false, gia: \"\", cat: false };" + NL
        + "      /* `xetDocLai` NÉM ở nhánh lệch.",
      soLan: 1
    },
    {
      ma: "TK10",
      ten: "Chọn đường đọc bằng cách MÒ chứ không theo tên thẻ — `<input>` đọc mãi ra rỗng",
      tim: "      const cach = o && THE_GIU_CHU_RIENG.includes(o.the) ? \"a11y\" : \"dom.text\";" + NL
        + "      const nut = o ? o.backendNodeId : null;" + NL
        + "      const truoc = await docO(target, params.selector, cach, nut);" + NL + NL
        + '      const ra = await runAction("scout.type",',
      thay: "      const cach = \"dom.text\";" + NL
        + "      const nut = o ? o.backendNodeId : null;" + NL
        + "      const truoc = await docO(target, params.selector, cach, nut);" + NL + NL
        + '      const ra = await runAction("scout.type",',
      soLan: 1
    },
    {
      ma: "TK23",
      ten: "Lượt XOÁ bỏ bản đọc TRƯỚC — câu 'ô có N ký tự trước khi xoá' thành một câu bịa",
      tim: "      const truoc = await docO(target, params.selector, cach, nut);" + NL + NL
        + '      const ra = await runAction("scout.clear",',
      thay: "      const truoc = { docDuoc: false, gia: \"\", cat: false };" + NL + NL
        + '      const ra = await runAction("scout.clear",',
      soLan: 1
    },
    {
      ma: "TK24",
      ten: "Lượt XOÁ bỏ bản đọc SAU — quay đúng về lệnh chỉ kể việc mình làm",
      tim: "      const sau = await docO(target, params.selector, cach, nut);" + NL
        + "      let phan;" + NL
        + "      try {" + NL
        + "        phan = xetXoaSach({ truoc, sau, cach });",
      thay: "      const sau = { docDuoc: false, gia: \"\", cat: false };" + NL
        + "      let phan;" + NL
        + "      try {" + NL
        + "        phan = xetXoaSach({ truoc, sau, cach });",
      soLan: 1
    },
    {
      ma: "TK25",
      ten: "Lượt XOÁ chọn đường đọc bằng cách MÒ — `<input>` đọc mãi ra rỗng nên luôn 'rỗng sẵn'",
      tim: "      const cach = o && THE_GIU_CHU_RIENG.includes(o.the) ? \"a11y\" : \"dom.text\";" + NL
        + "      const nut = o ? o.backendNodeId : null;" + NL
        + "      const truoc = await docO(target, params.selector, cach, nut);" + NL + NL
        + '      const ra = await runAction("scout.clear",',
      thay: "      const cach = \"dom.text\";" + NL
        + "      const nut = o ? o.backendNodeId : null;" + NL
        + "      const truoc = await docO(target, params.selector, cach, nut);" + NL + NL
        + '      const ra = await runAction("scout.clear",',
      soLan: 1
    },
    {
      ma: "TK26",
      ten: "Ô chưa sạch mà không ném: bọc thành phong bì ĐẠT chở một cái cờ buồn",
      tim: "        if (error?.code === MA_XOA_KHONG_SACH) {",
      thay: "        if (false) {",
      soLan: 1
    },
    {
      ma: "TK11",
      ten: "Lệch mà không ném: bọc lại thành một phong bì ĐẠT chở một cái cờ buồn",
      tim: "        if (error?.code === MA_KHONG_QUAN_SAT) {",
      thay: "        if (false) {",
      soLan: 1
    },
    {
      ma: "TK12",
      ten: "Cú bấm trần tự khai là đã kiểm — đúng lời nói dối mà `S2` sinh ra để diệt",
      tim: "        return { ...ra, da_kiem: false, kiem_bang: null, kiem_noi: CAU_BAM_KHONG_KIEM };",
      thay: "        return { ...ra, da_kiem: true, kiem_bang: null, kiem_noi: CAU_BAM_KHONG_KIEM };",
      soLan: 1
    },
    {
      ma: "TK13",
      ten: "Đưa mốc mà mốc không tới cũng cho qua — tham số `wait_for` thành đồ trang trí",
      tim: "      if (cho.data?.satisfied !== true) {",
      thay: "      if (false) {",
      soLan: 1
    },
    {
      ma: "TK14",
      ten: "Lượt chờ sau khi bấm bỏ qua `wait_state` — chiều BIẾN MẤT thành chiều xuất hiện",
      tim: "        selector: params.wait_for, state: trangThai, timeoutMs: params.wait_timeout_ms",
      thay: "        selector: params.wait_for, state: \"present\", timeoutMs: params.wait_timeout_ms",
      soLan: 1
    }
  ]
});

BATCHES.push({
  ten: "GHI TỰ KIỂM — cổng tham số `wait_for`",
  target: path.join(ROOT, "scripts", "scouter-bridge-core.mjs"),
  pin: PIN_TU_KIEM,
  mutants: [
    {
      ma: "TK15",
      ten: "`S-16` lần nữa: trần chờ sau khi bấm nới lên 30 giây, vượt hạn của chính lệnh bấm",
      tim: "const MAX_CHO_SAU_BAM_MS = 20000;",
      thay: "const MAX_CHO_SAU_BAM_MS = 30000;",
      soLan: 1
    },
    {
      ma: "TK16",
      ten: "Nhận `wait_state: usable` — kiểm một thứ rồi tưởng mình đã kiểm thứ kia",
      tim: '        && params.wait_state !== "present" && params.wait_state !== "absent") {',
      thay: "        && false) {",
      soLan: 1
    },
    {
      ma: "TK17",
      ten: "`wait_state` không cần `wait_for` — khai một mốc rỗng rồi tưởng mình đã kiểm",
      tim: "        && (params.wait_for === undefined || params.wait_for === null)) {",
      thay: "        && false) {",
      soLan: 1
    }
  ]
});

process.exit(chayDotBien(BATCHES, ROOT));
