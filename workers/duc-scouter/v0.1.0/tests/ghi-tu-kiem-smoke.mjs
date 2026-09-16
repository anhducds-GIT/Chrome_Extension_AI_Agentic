/* Phép ghim cho ĐƯỜNG GHI TỰ KIỂM — `scripts/tu-kiem-ghi.mjs` + đường nối ở
 * `scripts/scouter-seed-core.mjs` (`S1` gõ rồi đọc lại · `S2` bấm rồi khai thật).
 *
 * ─── THỨ FILE NÀY CANH, nói trước để ai sửa biết mình đang phá gì ───────────
 * Trước 16/09 `scout.type` trả `typed: text.length` — **số phím nó gửi đi** — và báo ĐẠT cho
 * một việc có thể chưa xảy ra. Mọi khối dưới đây tồn tại để cái đó không quay lại.
 *
 * Ghim CẢ HAI CHIỀU, đúng luật ghim của repo: một bản "luôn báo đạt" phải ĐỎ, và một bản "luôn
 * báo lệch" cũng phải ĐỎ. Chỗ dễ làm sai nhất là khối ③: chữ vừa gõ CÓ MẶT trong ô, mà lượt
 * gõ chưa bao giờ tới trang — phép "có chứa" xanh, phép ĐẾM mới đỏ.
 */

import assert from "node:assert/strict";

const tk = await import("../scripts/tu-kiem-ghi.mjs");
const core = await import("../scripts/scouter-bridge-core.mjs");
const { createSeedHandlers } = await import("../scripts/scouter-seed-core.mjs");

const { demLan, laChe, xetDocLai, MA_KHONG_QUAN_SAT, CAU_BAM_KHONG_KIEM, TuKiemError } = tk;

const TARGET_ID = "TARGET-1";
const BI_MAT = "mat-khau-that-su";

/* ---- ① Hai hàm thuần ---------------------------------------------------- */
{
  assert.equal(demLan("abcabc", "abc"), 2);
  assert.equal(demLan("aaaa", "aa"), 2, "đếm KHÔNG chồng lấn: 'aaaa' chứa 'aa' hai lần, không phải ba");
  assert.equal(demLan("abc", ""), 0, "chuỗi rỗng đếm 0, không phải vô hạn");
  assert.equal(demLan(null, "a"), 0);
  assert.equal(demLan("abc", "z"), 0);

  assert.equal(laChe("••••"), true);
  assert.equal(laChe("●●"), true);
  assert.equal(laChe(""), false, "ô rỗng KHÔNG phải ô che — nó là ô rỗng, và đó là một câu trả lời khác");
  assert.equal(laChe("abc"), false);
  assert.equal(laChe("ab•"), false, "còn một chữ thật thì không phải che");
}

/* ---- ② KHỚP: đọc lại thấy chữ tăng thêm → đã kiểm ----------------------- */
{
  const ra = xetDocLai({
    daGo: "xin chao",
    truoc: { docDuoc: true, gia: "", cat: false },
    sau: { docDuoc: true, gia: "xin chao", cat: false },
    cach: "dom.text"
  });
  assert.equal(ra.da_kiem, true);
  assert.equal(ra.kiem_bang, "dom.text");
  assert.match(ra.kiem_noi, /0 lần trước/);
}

/* ---- ③ LỆCH: ném, và ném CẢ KHI ô đã sẵn chữ ấy ------------------------
 * Đây là khối quan trọng nhất của file. Một phép `sau.includes(daGo)` XANH ở cả hai ca dưới
 * đây, tức là nó không phân biệt được "trang đã nhận" với "chữ ấy vốn nằm sẵn đó". */
{
  /* ⒜ ô không đổi gì cả */
  assert.throws(() => xetDocLai({
    daGo: "xin chao",
    truoc: { docDuoc: true, gia: "", cat: false },
    sau: { docDuoc: true, gia: "", cat: false },
    cach: "dom.text"
  }), (e) => e instanceof TuKiemError && e.code === MA_KHONG_QUAN_SAT, "ô không đổi mà không ném");

  /* ⒝ MÀU XANH GIẢ: chữ vừa gõ ĐÃ nằm sẵn trong ô, lượt gõ không tới trang. Số lần KHÔNG tăng,
   *    nên nó phải ĐỎ — dù `includes` thì xanh. */
  const co = { docDuoc: true, gia: "xin chao", cat: false };
  assert.ok(co.gia.includes("xin chao"), "tiền đề của phép ghim: phép 'có chứa' sẽ xanh ở đây");
  assert.throws(() => xetDocLai({ daGo: "xin chao", truoc: co, sau: co, cach: "dom.text" }),
    (e) => e.code === MA_KHONG_QUAN_SAT,
    "chữ nằm sẵn trong ô mà vẫn báo đạt — đây đúng là màu xanh giả mà S1 sinh ra để diệt");

  /* ⒞ chiều ngược: gõ thêm một lần nữa vào ô đã có chữ ấy → 1 thành 2 → ĐẠT. */
  const ra = xetDocLai({
    daGo: "xin chao", truoc: co,
    sau: { docDuoc: true, gia: "xin chaoxin chao", cat: false }, cach: "dom.text"
  });
  assert.equal(ra.da_kiem, true, "gõ thêm thật mà vẫn báo lệch");
}

/* ---- ④ KHÔNG ĐỌC ĐƯỢC: khai thật, KHÔNG ném và KHÔNG báo đạt ------------
 * Ba nguyên nhân, ba câu khác nhau. Gộp chúng thành một `false` là đúng kiểu hỏng im lặng mà
 * cả gói này chống. */
{
  const che = xetDocLai({
    daGo: BI_MAT,
    truoc: { docDuoc: true, gia: "", cat: false },
    sau: { docDuoc: true, gia: "••••••••••••••••", cat: false },
    cach: "a11y"
  });
  assert.equal(che.da_kiem, false, "ô mật khẩu phải khai là chưa kiểm");
  assert.equal(che.kiem_bang, null);
  assert.match(che.kiem_noi, /che nội dung/);

  const cut = xetDocLai({
    daGo: "xin chao",
    truoc: { docDuoc: true, gia: "aaa", cat: false },
    sau: { docDuoc: true, gia: "aaa", cat: true },
    cach: "a11y"
  });
  assert.equal(cut.da_kiem, false, "bản đọc bị cắt KHÔNG được dùng để kết luận lệch");
  assert.match(cut.kiem_noi, /cắt/);

  for (const [truoc, sau] of [
    [{ docDuoc: false }, { docDuoc: true, gia: "x", cat: false }],
    [{ docDuoc: true, gia: "", cat: false }, { docDuoc: false }]
  ]) {
    const ra = xetDocLai({ daGo: "xin chao", truoc, sau, cach: "dom.text" });
    assert.equal(ra.da_kiem, false);
    assert.match(ra.kiem_noi, /Không đọc lại được/);
  }
}

/* ---- ④b CHỮ ĐÃ GÕ KHÔNG ĐƯỢC ĐI RA — ở BẤT KỲ nhánh nào -----------------
 * Ô `type="password"` đi qua đúng đường này (đo 16/09), nên một câu giải thích chở nội dung ô
 * nhập là một mật khẩu nằm trong nhật ký. */
{
  const cauNoi = [];
  cauNoi.push(xetDocLai({ daGo: BI_MAT, truoc: { docDuoc: true, gia: "", cat: false },
    sau: { docDuoc: true, gia: BI_MAT, cat: false }, cach: "a11y" }).kiem_noi);
  cauNoi.push(xetDocLai({ daGo: BI_MAT, truoc: { docDuoc: true, gia: "", cat: false },
    sau: { docDuoc: true, gia: "••••", cat: false }, cach: "a11y" }).kiem_noi);
  cauNoi.push(xetDocLai({ daGo: BI_MAT, truoc: { docDuoc: false }, sau: { docDuoc: false }, cach: "a11y" }).kiem_noi);
  try {
    xetDocLai({ daGo: BI_MAT, truoc: { docDuoc: true, gia: "", cat: false },
      sau: { docDuoc: true, gia: "", cat: false }, cach: "a11y" });
    assert.fail("nhánh lệch phải ném");
  } catch (error) { cauNoi.push(error.message); }

  for (const cau of cauNoi) {
    assert.ok(!cau.includes(BI_MAT), `câu giải thích chở nguyên chữ đã gõ ra ngoài: ${cau}`);
  }
  assert.equal(cauNoi.length, 4, "bốn nhánh, bốn câu — thiếu một nhánh là thiếu một chỗ rò");
}

/* ---- ⑤ Đường nối ở seed-core: TRANG GIẢ CÓ TRẠNG THÁI ------------------
 * Engine giả dưới đây KHÔNG vọng lại tham số như engine giả của `scouter-bridge-smoke.mjs`:
 * nó giữ một trang có ba ô nhập và lượt gõ THẬT SỰ đổi nội dung ô. Không có trạng thái thì
 * không có cách nào phân biệt "đọc trước" với "đọc sau", mà đó chính là thứ cần ghim. */
function makeTrang({ nhanChu = true, nhanBam = true } = {}) {
  const o = {
    "#txt": { the: "INPUT", backendNodeId: 11, gia: "" },
    "#vung": { the: "TEXTAREA", backendNodeId: 12, gia: "" },
    "#giau": { the: "DIV", backendNodeId: 13, gia: "" },
    "#mk": { the: "INPUT", backendNodeId: 14, gia: "", che: true }
  };
  const calls = [];
  let hienSauBam = false;
  const engine = {
    calls,
    async scanTargets() {
      return [{ targetId: TARGET_ID, attached: false, type: "page", title: "t", url: "https://example.test/" }];
    },
    async runProbe(target, name, params) {
      calls.push({ name, params });
      const mot = o[params?.selector];
      if (name === "dom.query") {
        if (!mot) return { ok: true, probe: name, data: { selector: params.selector, matchCount: 0, items: [] }, cdp: [] };
        return { ok: true, probe: name, cdp: [], data: {
          selector: params.selector, matchCount: 1,
          items: [{ nodeId: 1, backendNodeId: mot.backendNodeId, nodeName: mot.the }]
        } };
      }
      if (name === "dom.text") {
        if (!mot) return { ok: false, probe: name, code: "SELECTOR_NO_MATCH", detail: "không khớp", cdp: [] };
        /* ĐÚNG NHƯ CHROME: `<input>`/`<textarea>` giữ chữ ở thuộc tính đối tượng, nên cây DOM
         * không có nút chữ nào. Đo 16/09. Trang giả nói dối chỗ này là phép ghim vô dụng. */
        const chu = mot.the === "DIV" ? mot.gia : "";
        return { ok: true, probe: name, cdp: [], data: { selector: params.selector, text: chu, truncated: false } };
      }
      if (name === "a11y.tree") {
        return { ok: true, probe: name, cdp: [], data: {
          truncated: false,
          nodes: Object.values(o).map((f) => ({
            role: "textbox", name: "", value: f.che ? "•".repeat(f.gia.length) : f.gia,
            backend_node_id: f.backendNodeId
          }))
        } };
      }
      if (name === "dom.wait") {
        const co = params.selector === "#ket-qua" ? hienSauBam : true;
        const dat = params.state === "absent" ? !co : co;
        return { ok: true, probe: name, cdp: [], data: {
          selector: params.selector, state: params.state, satisfied: dat,
          matchCount: co ? 1 : 0, waitedMs: 120
        } };
      }
      return { ok: true, probe: name, data: {}, cdp: [] };
    },
    async runAction(target, name, params) {
      calls.push({ name, params, ghi: true });
      if (name === "input.type") {
        const mot = o[params.selector];
        if (mot && nhanChu) mot.gia += params.text;
      }
      if (name === "input.click" && nhanBam) hienSauBam = true;
      return { ok: true, action: name, data: { selector: params.selector, typed: params.text?.length ?? 0 }, cdp: [] };
    }
  };
  return { engine, o };
}

function makeChrome() {
  const store = { "scouter.write.gate.v1": { enabled: true, enabled_at: 1, used: 0 } };
  return {
    runtime: { id: "abcdefghijklmnopabcdefghijklmnop", reload() {} },
    storage: { local: {
      async get(keys) { const out = {}; for (const k of [].concat(keys)) if (k in store) out[k] = store[k]; return out; },
      async set(patch) { Object.assign(store, patch); }
    } }
  };
}

let dem = 0;
function goi(dispatch, method, params) {
  dem += 1;
  return dispatch({
    protocol: core.PROTOCOL, version: 1, kind: "request",
    request_id: `req-${String(dem).padStart(6, "0")}`, method,
    sent_at: "2026-09-16T10:00:00Z", client: { client_id: "pin", name: "pin", version: "1" },
    params: params ?? {}
  });
}

function dungSeed(tuyChon = {}) {
  const { engine, o } = makeTrang(tuyChon);
  const handlers = createSeedHandlers({
    engine, chromeApi: makeChrome(), timers: { setTimeout() {}, clearTimeout() {} },
    now: () => new Date("2026-09-16T10:00:00Z"),
    BridgeProtocolError: core.BridgeProtocolError,
    negotiateVersion: core.negotiateVersion, capabilities: core.capabilities
  });
  return { engine, o, dispatch: core.createDispatcher({ handlers, now: () => new Date("2026-09-16T10:00:00Z") }) };
}

/* ---- ⑥ `scout.type` đi ĐÚNG ĐƯỜNG ĐỌC theo LOẠI Ô ----------------------- */
{
  /* ⒜ ô giàu (contenteditable) → `dom.text`, và KHÔNG kéo cây trợ năng lần nào.
   *    Đây là ca của Udin, và nó phải rẻ. */
  const a = dungSeed();
  const ra = await goi(a.dispatch, "scout.type", { target_id: TARGET_ID, selector: "#giau", text: "xin chao" });
  assert.equal(ra.ok, true, JSON.stringify(ra.error || {}));
  assert.equal(ra.result.da_kiem, true, "ô giàu đọc lại được mà vẫn khai chưa kiểm");
  assert.equal(ra.result.kiem_bang, "dom.text");
  assert.equal(a.engine.calls.filter((c) => c.name === "a11y.tree").length, 0,
    "ô giàu KHÔNG được kéo cả cây trợ năng — đó là đường đắt, để dành cho ô nhập thường");

  /* ⒝ ô nhập thường → `dom.text` đọc ra rỗng, nên phải đi đường trợ năng. */
  const b = dungSeed();
  const rb = await goi(b.dispatch, "scout.type", { target_id: TARGET_ID, selector: "#txt", text: "xin chao" });
  assert.equal(rb.ok, true, JSON.stringify(rb.error || {}));
  assert.equal(rb.result.da_kiem, true, "`<input>` phải đọc lại được bằng đường trợ năng");
  assert.equal(rb.result.kiem_bang, "a11y");
  assert.equal(b.engine.calls.filter((c) => c.name === "dom.text").length, 0,
    "đã biết `<input>` không trả chữ qua dom.text thì đừng hỏi nó — chọn đường theo TÊN THẺ, không thử mò");
}

/* ---- ⑦ THỨ TỰ: bản đọc TRƯỚC phải lấy TRƯỚC lượt gõ ---------------------
 * Không có nó thì chỉ còn phép "có chứa", và khối ③⒝ đã cho thấy phép ấy xanh giả. */
{
  const { engine, dispatch } = dungSeed();
  await goi(dispatch, "scout.type", { target_id: TARGET_ID, selector: "#giau", text: "xin chao" });
  const ten = engine.calls.map((c) => (c.ghi ? `GHI:${c.name}` : c.name));
  const iGhi = ten.indexOf("GHI:input.type");
  const docTruoc = ten.slice(0, iGhi).filter((t) => t === "dom.text").length;
  const docSau = ten.slice(iGhi).filter((t) => t === "dom.text").length;
  assert.equal(docTruoc, 1, `phải có ĐÚNG MỘT lượt đọc TRƯỚC khi gõ — thấy: ${ten.join(" → ")}`);
  assert.equal(docSau, 1, `phải có ĐÚNG MỘT lượt đọc SAU khi gõ — thấy: ${ten.join(" → ")}`);
}

/* ---- ⑧ TRANG KHÔNG NHẬN CHỮ → ĐỎ, không phải "đạt kèm cờ buồn" ---------- */
{
  const { dispatch } = dungSeed({ nhanChu: false });
  for (const selector of ["#giau", "#txt"]) {
    const ra = await goi(dispatch, "scout.type", { target_id: TARGET_ID, selector, text: "xin chao" });
    assert.equal(ra.ok, false, `${selector}: trang không nhận chữ mà phong bì vẫn ok:true`);
    assert.equal(ra.error.code, MA_KHONG_QUAN_SAT);
    assert.equal(ra.error.retryable, false,
      "gõ lại mù quáng vào ô KHÔNG tự xoá chữ cũ nghĩa là gõ hai lần — mã này không được khai thử-lại-được");
  }
}

/* ---- ⑨ Ô CHE NỘI DUNG: khai thật, KHÔNG đỏ ------------------------------
 * Ném ở đây thì mọi lượt gõ mật khẩu đều đỏ — một lời buộc tội sai. */
{
  const { dispatch } = dungSeed();
  const ra = await goi(dispatch, "scout.type", { target_id: TARGET_ID, selector: "#mk", text: BI_MAT });
  assert.equal(ra.ok, true, "ô che nội dung bị coi là lệch — sai, đó là 'không kiểm được'");
  assert.equal(ra.result.da_kiem, false);
  assert.match(ra.result.kiem_noi, /che nội dung/);
  assert.ok(!JSON.stringify(ra).includes(BI_MAT), "mật khẩu lọt ra trong phong bì trả về");
}

/* ---- ⑩ `scout.click` KHAI THẬT khi không có mốc ------------------------- */
{
  const { engine, dispatch } = dungSeed();
  const ra = await goi(dispatch, "scout.click", { target_id: TARGET_ID, selector: "#nut" });
  assert.equal(ra.ok, true);
  assert.equal(ra.result.da_kiem, false, "một cú bấm trần KHÔNG được tự khai là đã kiểm");
  assert.equal(ra.result.kiem_noi, CAU_BAM_KHONG_KIEM);
  assert.equal(engine.calls.filter((c) => c.name === "dom.wait").length, 0,
    "không đưa mốc thì đừng tự chờ — người gọi không xin, và mỗi lượt chờ là thời gian của họ");
}

/* ---- ⑪ `scout.click` có mốc: xảy ra → đã kiểm · không xảy ra → ĐỎ ------- */
{
  const a = dungSeed();
  const ra = await goi(a.dispatch, "scout.click", {
    target_id: TARGET_ID, selector: "#nut", wait_for: "#ket-qua"
  });
  assert.equal(ra.ok, true, JSON.stringify(ra.error || {}));
  assert.equal(ra.result.da_kiem, true);
  assert.equal(ra.result.kiem_bang, "dom.wait");

  /* Chiều ngược: trang KHÔNG phản ứng. */
  const b = dungSeed({ nhanBam: false });
  const rb = await goi(b.dispatch, "scout.click", {
    target_id: TARGET_ID, selector: "#nut", wait_for: "#ket-qua"
  });
  assert.equal(rb.ok, false, "đưa mốc mà mốc không tới thì phải ĐỎ");
  assert.equal(rb.error.code, "CLICK_NOT_OBSERVED");

  /* `absent`: cái đang có phải biến mất. Trang giả để `#nut` luôn còn đó → chưa đạt → ĐỎ. */
  const c = dungSeed();
  const rc = await goi(c.dispatch, "scout.click", {
    target_id: TARGET_ID, selector: "#nut", wait_for: "#nut", wait_state: "absent"
  });
  assert.equal(rc.ok, false, "`absent` phải kiểm chiều biến mất, không chỉ chiều xuất hiện");
  assert.equal(rc.error.code, "CLICK_NOT_OBSERVED");
}

/* ---- ⑫ Cổng tham số của `wait_for` -------------------------------------- */
{
  const { dispatch } = dungSeed();
  const xau = [
    [{ target_id: TARGET_ID, selector: "#nut", wait_state: "present" }, "wait_state mà không có wait_for"],
    [{ target_id: TARGET_ID, selector: "#nut", wait_timeout_ms: 500 }, "wait_timeout_ms mà không có wait_for"],
    [{ target_id: TARGET_ID, selector: "#nut", wait_for: "#x", wait_state: "usable" }, "`usable` trả lời câu hỏi KHÁC"],
    [{ target_id: TARGET_ID, selector: "#nut", wait_for: "" }, "wait_for rỗng"],
    [{ target_id: TARGET_ID, selector: "#nut", wait_for: "#x", wait_timeout_ms: 30000 }, "quá trần chờ 20000"]
  ];
  for (const [params, vi] of xau) {
    const ra = await goi(dispatch, "scout.click", params);
    assert.equal(ra.ok, false, `phải từ chối: ${vi}`);
    assert.equal(ra.error.code, "INVALID_PARAMS", vi);
  }
  /* Câu lỗi phải trỏ vào ĐÚNG trường sai, không phải vào `params.selector` lúc nào cũng đúng. */
  const sai = await goi(dispatch, "scout.click", { target_id: TARGET_ID, selector: "#nut", wait_for: "  " });
  assert.match(sai.error.message, /params\.wait_for/, "câu lỗi trỏ nhầm trường — người gọi sẽ đi sửa chỗ đang đúng");
}

console.log("ghi-tu-kiem smoke tests: PASS");
