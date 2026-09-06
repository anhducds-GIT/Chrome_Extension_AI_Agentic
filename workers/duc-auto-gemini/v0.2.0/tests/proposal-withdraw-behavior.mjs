// Test ghim cho `queue.proposal.withdraw` — lệnh Bridge cho phép một agent RÚT
// LẠI đề xuất do chính nó gửi, khi Đức chưa bấm duyệt.
//
// Vì sao lệnh này cần canh kỹ hơn vẻ ngoài: một đề xuất đang chờ là một việc
// nằm trên bàn của Đức. Rút nó đi là XOÁ một việc khỏi bàn đó. Nên câu hỏi
// đáng sợ không phải "rút có chạy không" mà là "AI được rút" và "rút được ở
// trạng thái nào".
//
// File có HAI NỬA:
//
//   NỬA LÕI — nạp `bridge-proposal-core.js` THẬT rồi chạy `transition()`.
//   NỬA XỬ LÝ — TRÍCH ĐÚNG THÂN HÀM `bridgeProposalWithdraw` ra khỏi
//   `sidepanel.js` rồi chạy nó với kho giả. Hàm đó nằm sâu trong một IIFE và
//   đóng gói sáu thứ bên ngoài, nên nó được trích ra và tiêm phụ thuộc vào —
//   chép logic sang test thì phép kiểm sẽ xanh cả khi bản thật đã hỏng, đúng
//   cái bệnh của phép kiểm zoom cũ đã bị xoá ngày 06/09.

import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const sidepanelSource = fs.readFileSync(new URL("sidepanel.js", root), "utf8");

/* ---- NỬA LÕI ------------------------------------------------------------- */

const coreContext = vm.createContext({ console });
vm.runInContext(fs.readFileSync(new URL("bridge-proposal-core.js", root), "utf8"), coreContext);
const core = coreContext.DacBridgeProposalCore;

assert.ok(core.WITHDRAWABLE_STATUSES, "lõi khai một tập trạng thái RÚT ĐƯỢC");
assert.deepEqual(
  [...core.WITHDRAWABLE_STATUSES].sort(),
  ["APPROVAL_FAILED", "AWAITING_OWNER_APPROVAL", "NEEDS_REVIEW"],
  "rút được = đề xuất CHƯA được định đoạt"
);
// "APPROVING" cố ý ở ngoài: lúc đó một lượt ghi checkpoint đang bay, và rút giữa
// chừng để lại bản ghi nói "đã rút" trong khi công việc vẫn đi tiếp.
assert.equal(core.WITHDRAWABLE_STATUSES.has("APPROVING"), false, "đang ghi checkpoint thì KHÔNG rút được");
for (const status of core.WITHDRAWABLE_STATUSES) {
  assert.ok(core.PENDING_STATUSES.has(status), `${status} rút được thì nó phải đang là trạng thái CHỜ`);
}

// Thiếu "WITHDRAWN" trong tập trạng thái cuối thì `transition()` NÉM — nó từ chối
// mọi trạng thái không nằm trong hai tập. Đây là chỗ port dễ quên nhất.
assert.ok(core.TERMINAL_STATUSES.has("WITHDRAWN"), "WITHDRAWN là trạng thái CUỐI");

const banGhi = Object.freeze({
  proposal_id: "prop-001",
  status: "AWAITING_OWNER_APPROVAL",
  idempotency_key: "key-abc",
  client: { client_id: "agent-mot" },
  jobs: [{ id: "Q001", prompt: "một câu prompt thật của Đức" }],
  local_events: [],
});

const daRut = core.transition(banGhi, "WITHDRAWN", { withdrawn_at: "2026-09-06T10:00:00.000Z", withdrawn_by_client_id: "agent-mot" }, "2026-09-06T10:00:00.000Z");
assert.equal(daRut.status, "WITHDRAWN");
assert.equal(daRut.withdrawn_by_client_id, "agent-mot", "vết kiểm toán ghi AI nào đã rút");
assert.ok(
  (daRut.local_events || []).some((event) => event.event === "BRIDGE_PROPOSAL_WITHDRAWN"),
  "rút phải để lại MỘT SỰ KIỆN trong vết kiểm toán của chính bản ghi — đổi trạng thái mà không ghi sự kiện là rút không dấu vết"
);

/* ---- NỬA XỬ LÝ: trích thân hàm thật rồi chạy ----------------------------- */

const than = /async function bridgeProposalWithdraw\(params, call\) \{[\s\S]*?\n  \}/.exec(sidepanelSource);
assert.ok(than, "trích được thân hàm xử lý ra khỏi sidepanel.js — neo hỏng thì phép kiểm này vô nghĩa, nên nó phải nổ");

class BridgeProtocolError extends Error {
  constructor(code, message, detail) { super(message || code); this.code = code; this.detail = detail; }
}

/** Dựng kho giả + tiêm phụ thuộc, rồi trả về đúng hàm thật. */
function dungHam(records) {
  const kho = { records: records.map((r) => ({ ...r })), replays: { "key-abc": { da: "luu" } } };
  const daVe = { ghi: 0, ve: 0, log: [] };
  const deps = {
    serializeBridgeProposalStore: (fn) => fn(),
    readBridgeProposalStoreUnlocked: async () => kho,
    writeBridgeProposalStoreUnlocked: async () => { daVe.ghi += 1; },
    renderBridgeProposals: () => { daVe.ve += 1; },
    log: (message) => daVe.log.push(message),
    window: { DacBridgeCore: { BridgeProtocolError }, DacBridgeProposalCore: core },
  };
  const ten = Object.keys(deps);
  const fn = new Function(...ten, `${than[0]}\nreturn bridgeProposalWithdraw;`)(...ten.map((k) => deps[k]));
  return { fn, kho, daVe };
}

const goi = (clientId) => ({ request: { client: { client_id: clientId } } });

/* --- Đường tốt ------------------------------------------------------------ */
{
  const { fn, kho, daVe } = dungHam([banGhi]);
  const ketQua = await fn({ proposal_id: "prop-001" }, goi("agent-mot"));
  assert.equal(ketQua.status, "WITHDRAWN");
  assert.equal(kho.records[0].status, "WITHDRAWN", "kho được ghi đè bằng bản ghi mới");
  // Người XỬ LÝ phải tự điền hai trường này. Nửa lõi ở trên chứng minh
  // `transition()` GIỮ chúng, nhưng nó giữ đúng thứ được đưa vào — nên nếu chỗ
  // này quên đưa, lõi vẫn xanh và vết kiểm toán vẫn rỗng. Đã đo: bỏ
  // `withdrawn_by_client_id` khỏi lời gọi làm cả file này XANH cho tới khi có
  // hai dòng dưới đây.
  assert.equal(kho.records[0].withdrawn_by_client_id, "agent-mot", "bản ghi nói RÕ agent nào đã rút");
  assert.ok(kho.records[0].withdrawn_at, "bản ghi nói rõ rút lúc nào");
  assert.ok(
    (kho.records[0].local_events || []).some((event) => event.event === "BRIDGE_PROPOSAL_WITHDRAWN"),
    "vết kiểm toán của bản ghi ĐÃ LƯU có sự kiện rút"
  );
  assert.equal(daVe.ghi, 1, "có ghi xuống kho");
  assert.equal(daVe.ve, 1, "có vẽ lại màn hình cho Đức thấy");
  assert.equal(
    Object.hasOwn(kho.replays, "key-abc"), false,
    "khoá chống-gửi-trùng bị xoá NGAY, không đợi lượt dọn định kỳ — giữ lại thì một lượt gửi lại cùng khoá nhận về bản ghi ĐÃ RÚT như thể vừa tạo mới"
  );
}

/* --- CHỐT AN TOÀN: agent khác KHÔNG được rút hộ -------------------------- */
{
  const { fn, kho, daVe } = dungHam([banGhi]);
  await assert.rejects(
    () => fn({ proposal_id: "prop-001" }, goi("agent-hai")),
    (error) => error.code === "FORBIDDEN" && /OWNER_MISMATCH/.test(error.message),
    "agent khác rút hộ phải bị TỪ CHỐI — đề xuất đang chờ là một việc trên bàn Đức, rút hộ là xoá việc đó mà không ai biết"
  );
  assert.equal(kho.records[0].status, "AWAITING_OWNER_APPROVAL", "bị từ chối thì kho KHÔNG đổi");
  assert.equal(daVe.ghi, 0, "bị từ chối thì KHÔNG ghi xuống kho");
}

/* --- Trạng thái không rút được ------------------------------------------- */
for (const status of ["APPROVING", "APPROVED_CHECKPOINTED", "REJECTED", "EXPIRED", "WITHDRAWN"]) {
  const { fn, kho } = dungHam([{ ...banGhi, status }]);
  await assert.rejects(
    () => fn({ proposal_id: "prop-001" }, goi("agent-mot")),
    (error) => error.code === "VALIDATION_FAILED" && /NOT_PENDING/.test(error.message),
    `trạng thái ${status} thì KHÔNG rút được`
  );
  assert.equal(kho.records[0].status, status, `${status} phải giữ nguyên`);
}

/* --- Không có đề xuất đó -------------------------------------------------- */
{
  const { fn } = dungHam([banGhi]);
  await assert.rejects(
    () => fn({ proposal_id: "prop-khong-co" }, goi("agent-mot")),
    (error) => error.code === "PROPOSAL_NOT_FOUND",
    "không tìm thấy thì báo đúng mã, không im lặng trả rỗng"
  );
}

/* --- Thứ tự hai chốt: KHÔNG được lộ trạng thái cho người ngoài ------------ */
//
// Nếu chốt trạng thái chạy TRƯỚC chốt chủ sở hữu thì một agent lạ dò được đề
// xuất của agent khác đang ở trạng thái nào, chỉ bằng cách đọc mã lỗi khác nhau.
{
  const { fn } = dungHam([{ ...banGhi, status: "REJECTED" }]);
  await assert.rejects(
    () => fn({ proposal_id: "prop-001" }, goi("agent-hai")),
    (error) => error.code === "FORBIDDEN",
    "người ngoài phải nhận FORBIDDEN, KHÔNG phải NOT_PENDING — mã lỗi khác nhau là một khe rò trạng thái"
  );
}

console.log("proposal withdraw behavior: PASS");
