// Test ghim G-10 — ba guard LỚP HAI của `bridge-transport-loopback.js`.
//
// Vì sao phải ghim ở MỨC NGUỒN chứ không phải mức hành vi: phá thử 39 chiều
// (28/08) bắt được 36, thoát đúng ba cái này — không phải vì phép đo yếu, mà
// vì sau khi guard LỚP MỘT được vá thì **không còn đường nào tới được chúng**:
// `connectHost` gỡ MỌI timer của socket bị thay, và ghi trạng thái đã được xếp
// thứ tự. Một test hành vi qua mặt công khai là bất khả — nó sẽ xanh dù guard
// còn hay mất. Nên ở đây ghim đúng cái ghim được: guard PHẢI CÒN TRONG MÃ.
//
// Ba guard, mỗi cái đỡ một ca chỉ xuất hiện lại khi lớp một bị gỡ:
//   (a) `reconnectTimer` trong `scheduleReconnect` — hai hẹn nối lại cùng bay,
//       thang lùi thành vô nghĩa và host bị nện hai lần một nhịp.
//   (b) `socket !== targetSocket` trong callback hạn chờ ACK — hạn chờ của
//       socket CŨ nổ và giết socket MỚI vừa thay vào chỗ nó.
//   (c) "đã bị bản mới hơn vượt qua" trong `publishStatus` — API storage không
//       hứa thứ tự ghi, nên một lượt ghi cũ hạ cánh sau cùng và panel treo ở
//       trạng thái sai vĩnh viễn.
//
// LUẬT CỦA CHÍNH FILE NÀY, đã trả giá ở repo này:
//   · Chỉ dùng `indexOf` với chuỗi nguyên văn. KHÔNG regex — `\b` không khớp
//     cạnh chữ tiếng Việt, và neo `^`/`$` gặp file CRLF (file này CRLF thật)
//     báo "không khớp" trông y hệt "không có gì để sửa".
//   · Mọi phép soi phải khẳng định TÌM THẤY trước đã, và cuối file ĐẾM lại số
//     neo. Neo trượt mục tiêu mà vẫn xanh là xanh giả.
//   · Bỏ dòng chú thích trước khi soi — test đọc chú thích là test văn xuôi.

import assert from "node:assert/strict";
import fs from "node:fs";

const raw = fs.readFileSync(new URL("../bridge-transport-loopback.js", import.meta.url), "utf8");
// Bỏ chú thích một dòng. Tách bằng /\r?\n/ chứ không phải "\n": file này CRLF.
const source = raw.split(/\r?\n/).filter((line) => !line.trim().startsWith("//")).join("\n");

let passed = 0;
const ok = (name) => { passed += 1; console.log(`  ok  ${name}`); };

// Đếm neo. Nếu con số này về 0 — hoặc lệch khỏi số đã chốt — thì phép ghim đã
// trượt khỏi mục tiêu, và một bộ đo đột biến sẽ báo SKIP đọc gần y hệt lượt xanh.
let anchors = 0;
function at(haystack, needle, why) {
  const i = haystack.indexOf(needle);
  assert.notEqual(i, -1, `NEO TRƯỢT — không tìm thấy ${JSON.stringify(needle)}: ${why}`);
  anchors += 1;
  return i;
}

// Cắt thân hàm bằng đếm ngoặc, không bằng "hàm kế tiếp": thứ tự khai báo đổi
// được, còn cặp ngoặc thì không.
function body(declaration) {
  const start = at(source, declaration, `hàm ${declaration.trim()} phải còn tồn tại`);
  const open = source.indexOf("{", start);
  assert.notEqual(open, -1, `không tìm thấy thân hàm của ${declaration}`);
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === "{") depth += 1;
    else if (source[i] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(open, i + 1);
    }
  }
  throw new Error(`ngoặc không đóng ở ${declaration}`);
}

/* ---- (a) scheduleReconnect: một hẹn nối lại tại một thời điểm ------------ */
{
  const fn = body("function scheduleReconnect()");
  const iGuard = at(fn, "if (!pairing || authenticated", "scheduleReconnect phải mở đầu bằng guard sớm");
  const guard = fn.slice(iGuard, fn.indexOf(";", iGuard) + 1);
  assert.ok(
    guard.includes("reconnectTimer"),
    "guard sớm của scheduleReconnect PHẢI kể tên reconnectTimer. Thiếu nó thì hai hẹn nối lại cùng bay: thang lùi mất tác dụng và host bị gọi hai lần một nhịp. Đây là lớp hai — lớp một (connectHost gỡ mọi timer của socket bị thay) đang che nó, nên KHÔNG có test hành vi nào bắt được chỗ này.",
  );
  const iArm = at(fn, "reconnectTimer = armTimer(", "scheduleReconnect phải đặt hẹn qua armTimer");
  assert.ok(iGuard < iArm, "guard phải đứng TRƯỚC chỗ đặt hẹn — kiểm sau khi đã đặt thì hẹn cũ đã bị bỏ rơi");
  ok("(a) scheduleReconnect còn guard reconnectTimer, và guard đứng trước chỗ đặt hẹn");
}

/* ---- (b) hạn chờ ACK: chỉ giết ĐÚNG socket đã đặt hẹn -------------------- */
{
  const fn = body("function armKeepaliveDeadline(targetSocket)");
  const iCallback = at(fn, "keepaliveDeadlineTimer = armTimer(", "armKeepaliveDeadline phải đặt hạn chờ qua armTimer");
  const cb = fn.slice(iCallback);
  const iIdentity = at(cb, "if (socket !== targetSocket) return;", "callback hạn chờ ACK phải kiểm lại danh tính socket");
  const iAbandon = at(cb, "abandonSocket(targetSocket,", "callback hạn chờ ACK phải buông socket khi quá hạn");
  assert.ok(
    iIdentity < iAbandon,
    "phép kiểm danh tính PHẢI đứng trước abandonSocket. Đứng sau (hoặc mất hẳn) thì hạn chờ của socket CŨ nổ và giết socket MỚI vừa thay vào chỗ nó — lớp một (connectHost gỡ mọi timer của socket bị thay) đang che, nên không đường hành vi nào chạm tới.",
  );
  ok("(b) callback hạn chờ ACK còn phép kiểm socket !== targetSocket, và nó đứng trước abandonSocket");
}

/* ---- (c) publishStatus: bản cũ không được hạ cánh sau bản mới ------------ */
{
  const fn = body("async function publishStatus(state, errorCode = null)");
  const iSeq = at(fn, "const sequence = ++statusSequence;", "publishStatus phải cấp số thứ tự cho mỗi lượt ghi");
  const iQueue = at(fn, "statusWrites = statusWrites.then(", "publishStatus phải nối tiếp các lượt ghi vào một chuỗi");
  const iStale = at(fn, "if (sequence !== statusSequence) return;", "publishStatus phải bỏ lượt ghi đã bị bản mới hơn vượt qua");
  const iSet = at(fn, "chromeApi.storage.local.set(", "publishStatus phải ghi trạng thái vào storage");
  assert.ok(iSeq < iQueue, "phải cấp số thứ tự TRƯỚC khi xếp hàng — cấp sau thì mọi lượt đọc cùng một số");
  assert.ok(iQueue < iStale, "phép kiểm phải nằm BÊN TRONG lượt xếp hàng, không phải trước nó — kiểm ở ngoài là đọc số cũ tại thời điểm sai");
  assert.ok(
    iStale < iSet,
    "phép kiểm PHẢI đứng trước lượt ghi storage. API storage không hứa thứ tự, nên mất phép kiểm này thì một lượt ghi cũ hạ cánh sau cùng và panel treo ở trạng thái sai — lớp một (ghi đã được xếp thứ tự) che nó, nên không test hành vi nào bắt được.",
  );
  ok("(c) publishStatus còn phép kiểm 'đã bị bản mới hơn vượt qua', đúng chỗ: trong hàng đợi, trước lượt ghi");
}

/* ---- Đếm neo: 0 neo = phép ghim đã trượt, không phải 'không có gì để sửa' -- */
{
  const EXPECTED_ANCHORS = 12;
  assert.notEqual(anchors, 0, "KHÔNG MỘT NEO NÀO KHỚP — phép ghim đã trượt khỏi mã nguồn, đừng đọc lượt này là xanh");
  assert.equal(anchors, EXPECTED_ANCHORS, `số neo khớp phải đúng ${EXPECTED_ANCHORS}; đo được ${anchors}. Lệch là có phép soi đã bị gỡ hoặc thêm mà không cập nhật con số này.`);
  ok(`đếm neo: ${anchors}/${EXPECTED_ANCHORS} chuỗi nguyên văn khớp thật trong mã nguồn`);
}

console.log(`\n${passed} passed`);
