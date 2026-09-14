/* scouter-clear-smoke.mjs — phép ghim cho `scout.clear` / `input.clear` (`I4`, 14/09).
 *
 * Thứ method này bán là một THAO TÁC CÓ TÊN, không phải một cái máy gõ phím đa năng. Cái đắt
 * nhất cần canh không phải "nó có xoá được không" mà **không có đường nào để người gọi chọn
 * phím bổ trợ**: `Ctrl` + một phím tuỳ ý chạm tới lệnh của TRÌNH DUYỆT (`Ctrl+W` đóng tab,
 * `Ctrl+N` mở cửa sổ), chứ không chỉ của trang.
 */
import assert from "node:assert/strict";
import { runAction, ACTION_NAMES } from "../scripts/scouter-actions-core.mjs";

const O = "textarea.agent-textarea";

function lamTrang({ soKhop = 1 } = {}) {
  const goiCdp = [];
  return {
    goiCdp,
    sendRaw: async (method, params) => {
      goiCdp.push({ method, params });
      if (method === "DOM.enable" || method === "DOM.focus") return {};
      if (method === "DOM.getDocument") return { root: { nodeId: 1 } };
      if (method === "DOM.querySelectorAll") return { nodeIds: Array.from({ length: soKhop }, (_, i) => 20 + i) };
      if (method === "Input.dispatchKeyEvent") return {};
      throw new Error("method CDP không ngờ tới: " + method);
    }
  };
}
const chay = (trang, params) => runAction("input.clear", { sendRaw: trang.sendRaw }, params);
const phim = (trang) => trang.goiCdp.filter((g) => g.method === "Input.dispatchKeyEvent").map((g) => g.params);

// ⓐ đúng bốn khung phím, đúng thứ tự: Ctrl+A xuống/lên rồi Delete xuống/lên
{
  const trang = lamTrang();
  const k = await chay(trang, { selector: O });
  assert.equal(k.ok, true);
  assert.deepEqual(k.data.steps, ["Ctrl+A", "Delete"]);
  const ks = phim(trang);
  assert.equal(ks.length, 4, `phải đúng 4 khung, thấy ${ks.length}`);
  assert.deepEqual(ks.map((x) => x.type), ["keyDown", "keyUp", "keyDown", "keyUp"]);
  assert.deepEqual(ks.map((x) => x.code), ["KeyA", "KeyA", "Delete", "Delete"]);
}

// ⓑ CHỐT CHÍNH — `Ctrl` chỉ đi kèm phím `A`, và lượt `Delete` KHÔNG mang phím bổ trợ
{
  const ks = phim((await (async () => { const t = lamTrang(); await chay(t, { selector: O }); return t; })()));
  const cuaA = ks.filter((x) => x.code === "KeyA");
  const cuaDel = ks.filter((x) => x.code === "Delete");
  assert.ok(cuaA.every((x) => x.modifiers === 2), "Ctrl là mặt nạ 2 của CDP; thiếu nó thì gõ ra chữ 'a' chứ không chọn hết");
  assert.ok(cuaDel.every((x) => !x.modifiers), "Ctrl+Delete là một lệnh KHÁC (xoá cả từ) — không được dính sang");
  assert.ok(ks.every((x) => x.modifiers === undefined || x.modifiers === 2),
    "chỉ mặt nạ 2 được xuất hiện: thêm một mặt nạ nữa là bước đầu tiên để có tham số modifiers");
  assert.ok(!ks.some((x) => typeof x.text === "string"),
    "khung có `text` là khung CHÈN CHỮ — Ctrl+A mà kèm text thì nó gõ chữ 'a' đè lên ô");
}

// ⓒ phải ĐƯA TIÊU ĐIỂM vào ô trước, không thì phím đi vào bất kỳ đâu đang giữ tiêu điểm
{
  const trang = lamTrang();
  await chay(trang, { selector: O });
  const iFocus = trang.goiCdp.findIndex((g) => g.method === "DOM.focus");
  const iPhim = trang.goiCdp.findIndex((g) => g.method === "Input.dispatchKeyEvent");
  assert.ok(iFocus >= 0 && iFocus < iPhim, "DOM.focus phải đứng TRƯỚC khung phím đầu tiên");
}

// ⓓ selector khớp nhiều phần tử → từ chối, và KHÔNG gửi khung phím nào
{
  const trang = lamTrang({ soKhop: 3 });
  const k = await chay(trang, { selector: "textarea" });
  assert.equal(k.ok, false);
  assert.equal(k.code, "SELECTOR_AMBIGUOUS");
  assert.equal(phim(trang).length, 0, "chưa chắc là ô nào thì đừng xoá ô nào");
}

// ⓔ không khớp phần tử nào → từ chối, không gửi khung phím nào
{
  const trang = lamTrang({ soKhop: 0 });
  const k = await chay(trang, { selector: "textarea.khong-co" });
  assert.equal(k.ok, false);
  assert.equal(k.code, "SELECTOR_NO_MATCH");
  assert.equal(phim(trang).length, 0);
}

// ⓕ cửa TỪ VỰNG: người gọi KHÔNG nhét được `key` hay `modifiers` vào
{
  const { METHOD_REGISTRY } = await import("../scripts/scouter-bridge-core.mjs");
  const muc = METHOD_REGISTRY["scout.clear"];
  assert.ok(muc, "scout.clear phải có trong bảng từ vựng");
  assert.deepEqual(Object.keys(muc.params_schema).sort(), ["selector", "target_id"]);
  assert.throws(() => muc.params_validator({ target_id: "T", selector: O, modifiers: 2 }), /unknown field/,
    "một tham số `modifiers` là giao cả bộ phím tắt của trình duyệt cho người gọi");
  assert.throws(() => muc.params_validator({ target_id: "T", selector: O, key: "w" }), /unknown field/);
  assert.equal(muc.read_only, false, "xoá chữ trên trang của Đức là GHI: nó phải chui qua phanh và trần 200");
}

// ⓖ `scout.key` vẫn KHÔNG nhận phím bổ trợ — cửa cũ không được mở theo
{
  const { METHOD_REGISTRY } = await import("../scripts/scouter-bridge-core.mjs");
  const muc = METHOD_REGISTRY["scout.key"];
  assert.ok(!("modifiers" in muc.params_schema),
    "mở `modifiers` cho scout.key là đúng cái đường vòng mà input.clear sinh ra để khỏi phải mở");
  assert.throws(() => muc.params_validator({ target_id: "T", selector: O, key: "Enter", modifiers: 2 }), /unknown field/);
}

// ⓗ lõi ghi không mọc thêm method CDP nào cho việc này, và `Runtime.*` vẫn đóng
{
  const { WRITE_CDP_METHODS } = await import("../scripts/scouter-actions-core.mjs");
  assert.ok(!WRITE_CDP_METHODS.some((m) => m.startsWith("Runtime.")));
  assert.ok(WRITE_CDP_METHODS.includes("Input.dispatchKeyEvent"), "dùng lại đúng method mà input.type/input.key đã dùng");
  assert.ok(ACTION_NAMES.includes("input.clear"));
}

console.log("  · scouter clear: 8 khối xanh");
