/* Phép ghim cho `goi-bridge.mjs` — cái xưởng dựng lượt gọi Bridge từ dòng lệnh.
 *
 * Việc nặng nhất bộ này canh KHÔNG phải hàm chạy đúng: bản cũ đã chạy đúng suốt một tuần. Nó
 * canh **tên gói không được quay lại làm hằng số trong lớp dùng chung**. Bản cũ gõ cứng bốn thứ
 * riêng của Scouter (giao thức · đường tệp ghép cặp · hai biến môi trường); chép nguyên văn sang
 * gói thứ hai là để gói đó **tự khai sai tên mình trên dây**, và máy chủ từ chối mọi phong bì.
 *
 * Đó là `G9` lặp lại ở tầng khác: 12/09 một chuỗi `"duc-scouter"` trong `transport.mjs` đi theo
 * bản chép sang `hnx-fetch`, và phép ghim bên đó bắt được ngay lượt `npm test` đầu tiên. Khối ⓐ
 * ở đây là cùng một cái lưới, đặt trước khi có bản chép thứ hai thay vì sau.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { taoGoiBridge } from "../goi-bridge.mjs";

const day = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "goi-bridge.mjs");

/* Nuốt phong bì thay vì gửi đi. Trả về lượt gọi cuối cùng. */
function batFetch(traVe = { ok: true, result: { data: {} } }, trangThai = 200) {
  const that = globalThis.fetch;
  const bat = { lan: 0, than: null, url: null, dau: null };
  globalThis.fetch = async (url, o) => {
    bat.lan += 1; bat.url = url; bat.dau = o.headers; bat.than = JSON.parse(o.body);
    /* Chuỗi đi thẳng, không qua `JSON.stringify`: ca cần thử là ca máy chủ trả thứ KHÔNG
     * phải JSON, mà stringify thì biến nó thành JSON hợp lệ — phép ghim đo phải nhánh khác. */
    return { status: trangThai, text: async () => (typeof traVe === "string" ? traVe : JSON.stringify(traVe)) };
  };
  return { bat, thoi: () => { globalThis.fetch = that; } };
}
const CAP = { port: 31999, token: "T".repeat(43) };

// ⓐ LỚP DÙNG CHUNG KHÔNG ĐƯỢC BIẾT TÊN GÓI NÀO
{
  const ma = fs.readFileSync(day, "utf8");
  /* Chỉ soi phần MÃ. Văn xuôi giải thích được phép nhắc tên gói — và phải được phép, vì nếu
   * không thì lời giải thích *"vì sao không gõ cứng tên gói"* lại chính là thứ làm đỏ. Đây là
   * bài của `detectors-match-your-own-prose`: bộ dò khớp phải chính văn của mình. */
  const chiMa = ma.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  for (const ten of ["duc-scouter", "udin-optic", "hnx-fetch", "SCOUTER_GHEP", "SCOUTER_GHE", "Chrome Extension Bridge"]) {
    assert.ok(!chiMa.includes(ten),
      `lớp dùng chung đang gõ cứng "${ten}". Tên gói là hiểu biết RIÊNG — nó vào tham số, không vào đây (G9).`);
  }
}

// ⓑ không khai tên gói thì KHÔNG ĐOÁN — khai sai tên tệ hơn không khai
{
  for (const xau of [undefined, {}, { goi: "" }, { goi: "Duc-Scouter" }, { goi: "duc scouter" }]) {
    assert.throws(() => taoGoiBridge(xau), /thiếu `goi`/, `phải chặn ${JSON.stringify(xau)}`);
  }
}

// ⓒ HAI GÓI ⇒ HAI TÊN GIAO THỨC TRÊN DÂY. Đây là khối trả lời đúng câu hỏi của T21.
{
  const a = taoGoiBridge({ goi: "duc-scouter" });
  const b = taoGoiBridge({ goi: "udin-optic" });
  assert.equal(a.giaoThuc, "duc-scouter.bridge");
  assert.equal(b.giaoThuc, "udin-optic.bridge");
  const { bat, thoi } = batFetch();
  await a.goi("system.ping", {}, { capDat: CAP });
  const cuaA = bat.than.protocol;
  await b.goi("system.ping", {}, { capDat: CAP });
  thoi();
  assert.equal(cuaA, "duc-scouter.bridge");
  assert.equal(bat.than.protocol, "udin-optic.bridge",
    "hai gói dùng chung một chuỗi giao thức là mất một buổi — hnx-fetch đã trả giá đó 08/09");
}

// ⓓ phong bì đủ SÁU trường máy chủ+extension đòi, và `target` chỉ có khi thật sự nêu đích
{
  const x = taoGoiBridge({ goi: "goi-thu" });
  const { bat, thoi } = batFetch();
  await x.goi("scout.query", { selector: "body" }, { capDat: CAP });
  assert.equal(bat.than.target, undefined, "không nêu đích thì đừng bịa ra `target`");
  for (const t of ["protocol", "version", "kind", "request_id", "sent_at", "client", "method", "params"]) {
    assert.ok(bat.than[t] !== undefined, `phong bì thiếu \`${t}\` → extension trả INVALID_ENVELOPE`);
  }
  await x.goi("scout.query", {}, { capDat: CAP, ghe: "abc-123" });
  thoi();
  assert.equal(bat.than.target, "abc-123");
  assert.equal(bat.url, "http://127.0.0.1:31999/v1/rpc");
}

// ⓔ BIẾN MÔI TRƯỜNG LÀ CỦA RIÊNG TỪNG GÓI — gói này đặt biến không được kéo gói kia đi theo
{
  const cu = process.env.GHE_CUA_A;
  process.env.GHE_CUA_A = "ghe-cua-A";
  const a = taoGoiBridge({ goi: "goi-a", gheEnv: "GHE_CUA_A" });
  const b = taoGoiBridge({ goi: "goi-b", gheEnv: "GHE_CUA_B" });
  const { bat, thoi } = batFetch();
  await a.goi("system.ping", {}, { capDat: CAP });
  assert.equal(bat.than.target, "ghe-cua-A");
  await b.goi("system.ping", {}, { capDat: CAP });
  thoi();
  assert.equal(bat.than.target, undefined, "gói B không khai biến đó — kéo theo là định tuyến nhầm ghế");
  if (cu === undefined) delete process.env.GHE_CUA_A; else process.env.GHE_CUA_A = cu;
}

// ⓕ KHÔNG BAO GIỜ IN TOKEN — kể cả lúc hỏng. Repo này PUBLIC.
{
  const x = taoGoiBridge({ goi: "goi-thu" });
  const thu = async (tra, ma) => {
    const { thoi } = batFetch(tra, ma);
    const loi = await x.goi("m", {}, { capDat: CAP }).then(() => null, (e) => e);
    thoi();
    assert.ok(loi, "phải ném lỗi");
    assert.ok(!loi.message.includes(CAP.token), `token lọt vào lời báo lỗi: ${loi.message.slice(0, 80)}`);
    return loi.message;
  };
  assert.match(await thu({ ok: false, error: { code: "TARGET_AMBIGUOUS", message: "hai ghế" } }), /TARGET_AMBIGUOUS/);
  assert.match(await thu("khong-phai-json", 500), /không phải JSON/);
}

// ⓖ đường tệp ghép cặp ĐỌC TỪ BẢN ĐỒ THƯ MỤC, không gõ cứng ở hai nơi
{
  const { duongGhepCapChuan } = await import("../../bridge-host/tao-tep-ghep-cap.mjs");
  const x = taoGoiBridge({ goi: "goi-khong-ton-tai", ghepEnv: "GHEP_KHONG_DAT" });
  const loi = (() => { try { x.docGhepCap(); } catch (e) { return e.message; } })();
  assert.ok(loi.includes(duongGhepCapChuan("goi-khong-ton-tai")),
    "phải hỏi `duongGhepCapChuan`; gõ cứng là bản đồ thư mục có hai bản — chính `.repo-structure.json` đã cấm");
  assert.match(loi, /Bridge đã chạy chưa/, "lỗi phải nói việc phải làm, không chỉ nói hỏng");
}

// ⓗ HAI CÁCH HỎNG KHÁC NHAU PHẢI ĐỌC RA KHÁC NHAU
/* `fetch` hỏng tầng mạng thì Node ném đúng hai chữ "fetch failed" cho MỌI ca. Hai ca dưới đây
 * đòi hai việc trái ngược nhau — một cái bảo *bật máy chủ lên*, cái kia bảo *đừng bật, nó đang
 * chạy đấy* — nên trộn chúng vào một câu báo là bắt người đọc đoán, và 17/09 mỗi lượt đoán tốn
 * một lượt bật lại.
 *
 * Khối này KHÔNG chỉ đòi "có ném lỗi": nó đòi hai câu báo **phân biệt được nhau**. Thiếu vế ấy
 * thì một bản gộp hai nhánh về một câu vẫn xanh — đúng bài `assertion-must-distinguish-branches`. */
{
  const thuMang = async (code) => {
    const that = globalThis.fetch;
    globalThis.fetch = async () => { const e = new TypeError("fetch failed"); e.cause = { code }; throw e; };
    const x = taoGoiBridge({ goi: "goi-thu", ghepEnv: "GHEP_KHONG_DAT" });
    try { await x.goi("dom.query", {}, { capDat: CAP }); assert.fail("phải ném"); }
    catch (e) { return e.message; }
    finally { globalThis.fetch = that; }
  };

  const chuaBat = await thuMang("ECONNREFUSED");
  const dutGiua = await thuMang("ECONNRESET");

  assert.match(chuaBat, /KHÔNG CÓ AI NGHE/, "cổng trống phải nói thẳng là không ai nghe");
  assert.match(dutGiua, /CÓ NGƯỜI NGHE/, "đứt giữa chừng phải nói rõ máy chủ CÓ nghe — bật lại không chữa được");
  assert.notEqual(chuaBat, dutGiua, "hai ca đòi hai việc trái ngược nhau, không được ra cùng một câu");

  for (const [ten, m] of [["chưa bật", chuaBat], ["đứt giữa", dutGiua]]) {
    assert.ok(m.includes(String(CAP.port)), `${ten}: phải in CỔNG, nếu không người đọc không biết dò ở đâu`);
    assert.ok(!m.includes(CAP.token), `${ten}: token lọt vào lời báo lỗi`);
    assert.ok(!/^fetch failed$/.test(m), `${ten}: vẫn là câu trần của Node`);
  }
  /* Và câu "chưa bật" phải chỉ được CHỖ bật lại — một lời báo không nói việc phải làm thì người
   * đọc vẫn phải đi hỏi, y như lúc chưa có nó. Cùng đòi hỏi với khối ⓖ ở trên. */
  const { duongGhepCapChuan } = await import("../../bridge-host/tao-tep-ghep-cap.mjs");
  assert.ok(chuaBat.includes(path.dirname(duongGhepCapChuan("goi-thu"))),
    "câu 'chưa bật' phải trỏ tới thư mục có START-BRIDGE, và trỏ bằng bản đồ thư mục chứ không gõ cứng");
}

console.log("  · goi-bridge: 8 khối xanh");
