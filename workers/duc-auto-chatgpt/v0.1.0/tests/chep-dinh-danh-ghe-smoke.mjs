/* NÚT CHÉP ĐỊNH DANH GHẾ — Đức nêu 17/09, nguyên văn:
 *   *"khi tôi ấn copy thì nó sẽ copy được tên của block, tên của profile và tên của phiên làm
 *     việc, ví dụ như 01 hiện tại. Khi trao đổi với AI tôi sẽ one click copy nhanh gọn nhẹ."*
 *
 * VẾ CHỊU TẢI LÀ `--target`, và nó KHÔNG phải ý thích: đo thật cùng buổi, khi tôi định gọi ghế
 * `01` của hồ sơ `kaito`, host trả
 *     TARGET_AMBIGUOUS · candidates: [ {label:"01"}, {label:"01"} ]
 * vì hồ sơ `anhducds` CŨNG có một phiên tên `01`. Tên phiên do NGƯỜI đặt nên trùng được;
 * `workspace_id` thì không. Chép mỗi cái tên là chép một thứ vừa mới chứng minh là không gọi
 * được — nên phép ghim này canh đúng chỗ đó.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
await import(pathToFileURL(path.join(here, "..", "bridge-workspace-core.js")));
const core = globalThis.DacBridgeWorkspaceCore;

const GHE = { name: "01", tab_id: 2096832290, workspace_id: "5cc3f867-6f8e-4913-9f86-2fa5cc9142bf" };
const chu = core.seatHandle(GHE, "kaito");

/* ⑴ Đủ BA thứ Đức kể, trong MỘT dòng — dán một lần là xong, không ghép tay. */
assert.ok(chu.includes("kaito"), "phải có tên hồ sơ Chrome");
assert.ok(/\b01\b/.test(chu), "phải có tên phiên làm việc");
assert.ok(chu.includes("2096832290"), "phải có tab, để đối chiếu với cái đang mở");
assert.equal(chu.split("\n").length, 1, "MỘT dòng — nhiều dòng là quay lại 'nhiều bước'");

/* ⑵ VÀ PHẢI GỌI ĐƯỢC. Đây là vế mua bằng một lần `TARGET_AMBIGUOUS` thật. */
assert.ok(chu.includes(`--target ${GHE.workspace_id}`),
  "phải kèm `--target <workspace_id>`: hai hồ sơ cùng có phiên tên `01`, gọi bằng tên là TARGET_AMBIGUOUS");
const khac = core.seatHandle({ ...GHE, workspace_id: "2b114490-ae50-4763-b23d-e60b5f517d6c" }, "anhducds");
assert.notEqual(chu, khac, "hai ghế TRÙNG TÊN ở hai hồ sơ phải chép ra hai dòng KHÁC NHAU — nếu giống thì cả nút này vô dụng");

/* ⑶ Ba ca thiếu dữ liệu, mỗi ca nói ra chỗ thiếu thay vì im lặng ghép chuỗi rỗng. */
assert.match(core.seatHandle(GHE, ""), /hồ sơ chưa đặt tên/, "chưa đặt tên hồ sơ thì phải NÓI RA");
assert.match(core.seatHandle({ ...GHE, name: "" }, "kaito"), /phiên chưa đặt tên/, "chưa đặt tên phiên thì phải NÓI RA");
assert.match(core.seatHandle({ ...GHE, tab_id: null }, "kaito"), /chưa gắn tab/, "chưa gắn tab thì phải NÓI RA — dán một dòng khoe tab ma là tệ hơn không dán");

/* ⑷ Panel phải THẬT SỰ gọi hàm này, và chép đúng thứ nó trả về. Một hàm đúng mà không ai gọi
   thì nút vẫn chép ra thứ khác. */
const panel = fs.readFileSync(new URL("../sidepanel.js", import.meta.url), "utf8");
const boChuThich = (ma) => ma.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
const ma = boChuThich(panel);
assert.ok(/DacBridgeWorkspaceCore\.seatHandle\(seat,/.test(ma),
  "panel phải gọi `seatHandle` — không được ghép lại chuỗi ấy ở chỗ thứ hai");
const iHam = ma.indexOf("async function copyBridgeSeatHandle");
assert.ok(iHam > 0, "vẫn phải có hàm chép");
const than = ma.slice(iHam, ma.indexOf("async function refreshBridgeWorkspaces", iHam));
assert.ok(/clipboard\.writeText\(chu\)/.test(than), "phải chép ĐÚNG chuỗi seatHandle trả về, không phải một biến khác");
assert.ok(/bridgeProfileLabelInput/.test(than), "tên hồ sơ phải lấy từ ô đang hiện — bản nhớ thứ hai là chỗ để hai bên nói khác nhau");

/* ⑸ Và nút phải có mặt trong mỗi hàng ghế, nếu không thì không ai bấm được. */
const iVe = ma.indexOf("function renderBridgeWorkspaces");
const thanVe = ma.slice(iVe, ma.indexOf("async function refreshBridgeWorkspaces", iVe));
assert.ok(/copyBridgeSeatHandle\(seat,/.test(thanVe), "mỗi hàng ghế phải gắn nút chép của chính hàng đó");
assert.ok(/item\.append\([^)]*copyBtn/.test(thanVe), "nút chép phải được ĐƯA VÀO hàng — dựng mà không append là nút vô hình");

console.log("Nút chép định danh ghế (Đức 17/09): PASS");
