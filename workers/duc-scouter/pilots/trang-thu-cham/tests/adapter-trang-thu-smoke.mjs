/* PHÉP GHIM cho adapter của trang thử chậm — chạy KHÔNG cần trình duyệt.
 *
 * Vì sao có file này: một adapter chỉ kiểm được khi có Chrome thật, một ghế thật
 * và một máy chủ thật là một adapter sẽ không ai kiểm. Ở đây `goi` là hàng giả,
 * nên mọi ca hỏng dựng được theo ý — kể cả ca không dựng lại được ngoài đời.
 */
import assert from "node:assert/strict";
import { chay, SELECTOR } from "../scripts/adapter.mjs";

const TRA_LOI_MAC_DINH = {
  query: { matchCount: 1, items: [{ attributes: {} }] },
  waitUsable: { satisfied: true, usableBlockedBy: null },
  waitHien: { satisfied: true, ms: 1234 },
  click: { hit: { relation: "descendant", hitNodeId: 21 }, matchCount: 1 },
};

/* Một trang giả đủ để adapter chạy hết đường. `dat` chồng lên từng mảnh để dựng ca hỏng. */
function lamGoi(dat = {}) {
  const nhatKy = [];
  const goi = async (method, params) => {
    nhatKy.push({ method, params });
    if (dat[method]) {
      const ra = dat[method](params, nhatKy);
      if (ra !== undefined) return { data: ra };
    }
    switch (method) {
      case "scout.query":
        return { data: { ...TRA_LOI_MAC_DINH.query, selector: params.selector } };
      case "scout.wait":
        return { data: params.state === "usable" ? TRA_LOI_MAC_DINH.waitUsable : TRA_LOI_MAC_DINH.waitHien };
      case "scout.type":
        return { data: { typed: params.text.length } };
      case "scout.click":
        return { data: TRA_LOI_MAC_DINH.click };
      case "scout.a11y":
        return { data: { nodes: [{ role: "StaticText", name: `Đã vọng lại: ${nhatKy.find((g) => g.method === "scout.type").params.text}` }] } };
      default:
        throw new Error(`phép dò giả chưa biết method ${method}`);
    }
  };
  return { goi, nhatKy, timTab: async () => "TAB-GIA" };
}

function goiDau(nhatKy, method) {
  return nhatKy.findIndex((g) => g.method === method);
}

/* ⓐ Đường trơn: trang vọng lại đúng câu đã gõ, và lượt bấm rơi vào CON CHÁU của
 *   nút — nút này là `<button><span>▶</span><span>Gửi</span></button>` nên đó là
 *   kết quả đúng, không phải hụt. */
{
  const { goi, nhatKy, timTab } = lamGoi();
  const ket = await chay("xin chao", { goi, timTab });
  assert.equal(ket.vong, "xin chao");
  assert.equal(ket.trungVao.relation, "descendant");
  assert.ok(nhatKy.length > 0);
}

/* ⓑ Gõ TRƯỚC, bấm SAU. Đảo lại là gửi đi câu của lượt trước — một lỗi im lặng,
 *   trang vẫn trả về một kết quả trông hợp lệ. */
{
  const { goi, timTab, nhatKy } = lamGoi();
  await chay("thu tu", { goi, timTab });
  assert.ok(goiDau(nhatKy, "scout.type") < goiDau(nhatKy, "scout.click"));
}

/* ⓒ Selector khớp 0 hoặc 2 → DỪNG trước khi chạm vào trang. Không một lượt ghi
 *   nào được đi ra: trang đã đổi thì gõ vào đó là gõ nhầm chỗ. */
for (const dem of [0, 2]) {
  const { goi, timTab, nhatKy } = lamGoi({
    "scout.query": (p) => (p.selector === SELECTOR.nut ? { matchCount: dem, items: [] } : undefined),
  });
  await assert.rejects(() => chay("khong duoc cham", { goi, timTab }), /khớp \d+ phần tử/);
  assert.equal(goiDau(nhatKy, "scout.type"), -1, "đã gõ vào một trang chưa soát xong");
  assert.equal(goiDau(nhatKy, "scout.click"), -1, "đã bấm vào một trang chưa soát xong");
}

/* ⓓ Nút phải chờ bằng `usable`, KHÔNG phải `present`. Đây là bài học đo được
 *   12/09: `present` trả "có" sau 36ms trong khi một tấm chắn phủ kín trang. */
{
  const { goi, timTab, nhatKy } = lamGoi();
  await chay("chon dung trang thai", { goi, timTab });
  const choNut = nhatKy.find((g) => g.method === "scout.wait" && g.params.selector === SELECTOR.nut);
  assert.ok(choNut, "không hề chờ cái nút");
  assert.equal(choNut.params.state, "usable");
}

/* ⓔ Nút bị chắn → dừng, và câu báo mang theo LÝ DO chắn, không phải "hết giờ" trống. */
{
  const { goi, timTab } = lamGoi({
    "scout.wait": (p) => (p.state === "usable" ? { satisfied: false, usableBlockedBy: "covered" } : undefined),
  });
  await assert.rejects(() => chay("bi chan", { goi, timTab }), /covered/);
}

/* ⓕ Chờ kết quả phải hỏi ":not([hidden])", không hỏi `#ket-qua` trần. Ô kết quả
 *   nằm sẵn trong DOM từ lúc tải, nên chờ nó "có mặt" là thoả NGAY LẬP TỨC —
 *   adapter sẽ đọc một ô rỗng và tưởng mình đã chờ. */
{
  const { goi, timTab, nhatKy } = lamGoi();
  await chay("cho cho dung", { goi, timTab });
  const choKetQua = nhatKy.filter((g) => g.method === "scout.wait" && g.params.selector.startsWith(SELECTOR.ketQua));
  assert.equal(choKetQua.length, 1);
  assert.ok(
    choKetQua[0].params.selector.includes(":not([hidden])"),
    `chờ bằng ${choKetQua[0].params.selector} — thoả ngay cả khi kết quả chưa hiện`,
  );
}

/* ⓖ `S-22`: `scout.click` báo TRÚNG nhưng tay nghe của trang không chạy.
 *   Không có phép kiểm này thì adapter đứng chờ 8 giây rồi đổ tội cho độ trễ —
 *   sai nguyên nhân, và đó là thứ đắt nhất một lượt gỡ lỗi có thể nhận. */
{
  const { goi, timTab } = lamGoi({
    "scout.query": (p) => (p.selector.includes("[data-bam]") ? { matchCount: 0, items: [] } : undefined),
  });
  await assert.rejects(() => chay("bam khong toi noi", { goi, timTab }), /LUOT_BAM_KHONG_TOI_NOI/);
}

/* ⓗ Kết quả hiện ra nhưng cây trợ năng không có dòng nào → nói thẳng là KHÔNG
 *   ĐỌC ĐƯỢC, đừng trả về chuỗi rỗng như thể trang vọng lại một câu trống. */
{
  const { goi, timTab } = lamGoi({ "scout.a11y": () => ({ nodes: [{ role: "StaticText", name: "chuyện khác" }] }) });
  await assert.rejects(() => chay("khong doc duoc", { goi, timTab }), /không đọc được/);
}

/* ⓘ Chờ kết quả HẾT GIỜ mà vẫn đọc tiếp là ca hỏng nguy hiểm nhất của adapter này:
 *   cây trợ năng vẫn còn dòng của LƯỢT TRƯỚC, nên nó trả về một câu trả lời trông
 *   hoàn toàn hợp lệ — của câu hỏi cũ. Lượt audit độc lập 12/09 bắt được đúng chỗ
 *   này: bỏ phép kiểm `satisfied` đi thì bảy khối trên vẫn xanh. */
{
  const { goi, timTab } = lamGoi({
    "scout.wait": (p) => (p.state === "usable" ? undefined : { satisfied: false, ms: 8000 }),
  });
  await assert.rejects(() => chay("het gio", { goi, timTab }), /kết quả không hiện/);
}

console.log("  · adapter trang thử chậm: 9 khối xanh");
