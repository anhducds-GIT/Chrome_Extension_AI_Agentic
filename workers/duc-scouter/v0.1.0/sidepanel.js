/* sidepanel.js — bảng bên của Scouter.
 *
 * HAI VAI, KHÔNG PHẢI MỘT (07/09). Đức đặt bài là "để cả AI và người dùng cùng nắm được tình
 * hình". Nhưng AI ở đầu dây KHÔNG đọc được bảng này — nó không nhìn pixel, nó hỏi
 * `system.capabilities` qua Bridge và nhận JSON. Nên bảng này là:
 *   ⑴ cửa sổ để NGƯỜI nhìn vào việc AI đang làm, và
 *   ⑵ bảng điều khiển của NGƯỜI (công tắc, ghép cặp).
 * Không có vai thứ ba. Thiết kế cho một độc giả không bao giờ đọc là cách làm bảng phình ra.
 *
 * LUẬT CỦA FILE NÀY:
 *   · Không `innerHTML`/`outerHTML`/`insertAdjacentHTML` — luật repo, và bảng này hiện tên
 *     trang do người khác đặt, tức là hiện chữ không tin được.
 *   · Không con số nào gõ tay. Số method đếm từ bảng lệnh thật; tiến độ tính từ sổ công việc.
 *     Bản vẽ v1 ghi 14 method (thật là 15) và ghi `6/8` trên một danh sách có 4 dấu tích — cả
 *     hai vì con số được gõ chứ không được đọc.
 *   · Chữ Đức nhìn thấy: tiếng Việt. Mã lỗi (CODE): tiếng Anh.
 */

import { ObserverEngine } from "./observer-engine.js";
import { capabilities } from "./scripts/scouter-bridge-core.mjs";
import { JOURNAL_CONSTANTS, nanSo, tenMien, tinhTienDo } from "./scripts/scouter-journal-core.mjs";
import { validatePairing, TRANSPORT_CONSTANTS } from "./scripts/scouter-transport-loopback.mjs";
import { setWriteGate, readWriteGateState, SEED_CONSTANTS } from "./scripts/scouter-seed-core.mjs";

const engine = new ObserverEngine();
const $ = (chon) => document.querySelector(chon);

/* Đổi tab. `hidden` chứ không `style.display`, để phím Tab không lạc vào khối đang ẩn. */
const TABS = ["tiendo", "hoatdong", "hethong"];
for (const ten of TABS) {
  $(`#tab-${ten}`).addEventListener("click", () => {
    for (const khac of TABS) {
      const chon = khac === ten;
      $(`#tab-${khac}`).setAttribute("aria-selected", String(chon));
      $(`#panel-${khac}`).hidden = !chon;
    }
  });
}

function gioPhut(luc) {
  if (!luc) return "";
  const d = new Date(luc);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function dat(the, lop, chu) {
  const el = document.createElement(the);
  if (lop) el.className = lop;
  if (chu !== undefined) el.textContent = chu;
  return el;
}

function doLop(el, lop, bat) { el.classList.toggle(lop, Boolean(bat)); }

/* ---- CỬA BRIDGE ----------------------------------------------------------
 * Bảng bên KHÔNG tự nối socket. Nó ghi tệp ghép cặp ĐÃ KIỂM vào kho lưu; service worker theo
 * dõi kho lưu và nối. Lý do vẫn đúng nguyên sau khi đổi vỏ: bảng bên đóng lại là chết, còn
 * service worker thì sống tiếp — một kết nối mở từ tầng giao diện sẽ đứt khi Đức đóng bảng.
 * Kiểm ngay tại đây bằng CHÍNH hàm mà transport dùng, nên kho lưu không bao giờ chứa tệp hỏng. */
const BRIDGE_CHU = {
  connected:    { badge: "Đã kết nối",   lop: "luc",  dai: "Đã nối máy chủ Bridge trên máy này." },
  disconnected: { badge: "Mất kết nối",  lop: "do",   dai: "Chưa nối được máy chủ Bridge. Bật máy chủ rồi chờ một nhịp." },
  unpaired:     { badge: "Chưa ghép cặp", lop: "",    dai: "Chưa ghép cặp. Chọn tệp ghép cặp bên dưới." }
};

let bridgeStatus = "unpaired";

async function copyBridgePairingPath(button) {
  const pairingPath = button?.dataset.bridgePairingPath || "";
  if (!pairingPath) return;
  const originalLabel = button.textContent;
  try {
    await navigator.clipboard.writeText(pairingPath);
    button.textContent = "Đã sao chép";
  } catch (_loi) {
    button.textContent = "Không thể sao chép";
  }
  window.setTimeout(() => { button.textContent = originalLabel; }, 1800);
}

async function veBridge() {
  const kho = await chrome.storage.local.get([TRANSPORT_CONSTANTS.STATUS_STORAGE_KEY]);
  bridgeStatus = kho?.[TRANSPORT_CONSTANTS.STATUS_STORAGE_KEY]?.status ?? "unpaired";
  const chu = BRIDGE_CHU[bridgeStatus] || BRIDGE_CHU.unpaired;
  const badge = $("#bridge-badge");
  badge.textContent = chu.badge;
  badge.className = `huy-hieu ${chu.lop}`;
  $("#bridge-state").textContent = chu.dai;
}

$("#pairing-file").addEventListener("change", async (su_kien) => {
  const tep = su_kien.target.files?.[0];
  if (!tep) return;
  let ghep;
  try {
    ghep = validatePairing(JSON.parse(await tep.text()));
  } catch (loi) {
    $("#bridge-state").textContent = `Tệp ghép cặp không dùng được (${String(loi?.message || loi).split(":")[0]}).`;
    return;
  }
  await chrome.storage.local.set({ [TRANSPORT_CONSTANTS.PAIRING_STORAGE_KEY]: ghep });
  $("#bridge-state").textContent = `Đã lưu ghép cặp cho 127.0.0.1:${ghep.port}. Đang nối…`;
  window.setTimeout(veBridge, 1500);
});
$("#bridge-pairing-path-copy").addEventListener("click", () => copyBridgePairingPath($("#bridge-pairing-path-copy")));

/* ---- CÔNG TẮC ĐƯỜNG GHI (S-05) -------------------------------------------
 * Bảng bên là chỗ DUY NHẤT bật được công tắc này, và đó là cả ý nghĩa của nó: không method
 * Bridge nào bật được nó, nên một AI ở đầu dây không tự mở khoá cho chính mình được. Trạng
 * thái đọc bằng CHÍNH hàm mà đường ghi dùng, nên cái bảng hiện không bao giờ lệch với cái
 * đường ghi làm.
 *
 * VÌ SAO LÀ BẢNG BÊN, KHÔNG PHẢI POPUP: popup CHẾT khi mất tiêu điểm. Bấm vào trang một cái là
 * nó đóng — mà đúng lúc đó mới là lúc cần nhìn bộ đếm ngân sách tụt. */
const gateInput = $("#write-gate");

gateInput.addEventListener("change", async () => {
  gateInput.disabled = true;
  try {
    await setWriteGate(chrome, gateInput.checked);
  } catch (loi) {
    $("#gate-note").textContent = `Không đổi được công tắc (${String(loi?.message || loi).split(":")[0]}).`;
  } finally {
    gateInput.disabled = false;
    await veCongTac();
  }
});

async function veCongTac() {
  const gate = await readWriteGateState(chrome);
  const badge = $("#gate-badge");
  gateInput.checked = gate.enabled;
  doLop($("#gate-card"), "bat", gate.enabled);

  if (gate.enabled) {
    const het = gate.remaining <= 0;
    badge.textContent = het ? "HẾT LƯỢT" : `CÒN ${gate.remaining}/${gate.cap_per_unlock}`;
    badge.className = "huy-hieu do";
    $("#gate-note").textContent = het
      ? `Đã dùng hết ${gate.cap_per_unlock} lượt của lần bật này. Tắt công tắc rồi bật lại để cấp thêm.`
      : "Scouter được phép bấm và gõ trên trang đang mở. Tắt khi làm xong.";
  } else {
    badge.textContent = "ĐANG TẮT";
    badge.className = "huy-hieu";
    $("#gate-note").textContent = `Scouter chỉ NHÌN được. Mọi lệnh bấm và gõ bị từ chối. Bật một lần được ${SEED_CONSTANTS.WRITE_CAP_PER_UNLOCK} lượt.`;
  }
}

/* ---- NĂNG LỰC ------------------------------------------------------------
 * Đếm từ `capabilities()` — CÙNG một hàm mà `system.capabilities` trả cho AI, nên bảng bên và
 * AI không thể khai hai con số khác nhau. Nhóm suy từ tên method và cờ `read_only`, không có
 * bảng nhóm gõ tay: thêm một `scout.*` chỉ đọc là nó tự vào đúng nhóm. */
function nhomCua(m) {
  if (m.name.startsWith("session.") || m.name.startsWith("system.")) return "Bắt tay và tự khai";
  if (m.read_only) return "Quan sát (chỉ đọc)";
  if (m.name === "scout.fetch" || m.name === "scout.reload") return "Mạng và tự nạp lại";
  return "Hành động (bấm, gõ)";
}

function veNangLuc() {
  const ds = capabilities().methods;
  const nhom = new Map();
  for (const m of ds) {
    const ten = nhomCua(m);
    if (!nhom.has(ten)) nhom.set(ten, []);
    nhom.get(ten).push(m.name);
  }
  $("#nangluc-tong").textContent = `${ds.length} lệnh`;

  const list = $("#nangluc-list");
  list.replaceChildren();
  for (const [ten, tenLenh] of nhom) {
    const li = document.createElement("li");
    const giua = dat("div", "moc-noi-dung");
    giua.append(dat("div", "nangluc-ten", ten), dat("code", null, tenLenh.join(" · ")));
    li.append(giua, dat("span", "nangluc-dem", `${tenLenh.length}`));
    list.append(li);
  }
  /* Nhóm lệnh file nằm ở MÁY CHỦ Bridge, không ở extension — bảng bên không nhìn thấy nó, nên
   * KHÔNG đếm. Gõ một con số vào đây là dựng đúng cái bẫy mà cả file này tránh. */
  list.append(dat("li", "trong", "Máy chủ Bridge còn tự làm thêm nhóm lệnh về file (ghi · nối thêm · đọc · liệt kê). Nhóm đó không đi qua extension nên bảng bên không kiểm được, và không đếm."));
}

/* ---- SỔ CÔNG VIỆC: tiến độ · hoạt động · trang AI đang chạm --------------- */
let so = { trang: {}, hoatDong: [] };
let mienDangXem = null;      /* null = để hệ tự chọn trang mới chạm nhất */
let mienNguoiChon = false;   /* Đức đã tự chọn thì đừng giật đi khi AI chạm trang khác */
let urlTheoTarget = new Map();

async function docSo() {
  const kho = await chrome.storage.local.get([JOURNAL_CONSTANTS.JOURNAL_STORAGE_KEY]);
  so = nanSo(kho?.[JOURNAL_CONSTANTS.JOURNAL_STORAGE_KEY]);
}

function mienMoiNhat() {
  const ds = Object.entries(so.trang).sort((a, b) => b[1].chamCuoi - a[1].chamCuoi);
  return ds[0]?.[0] ?? null;
}

function veChonMien() {
  const chon = $("#chon-mien");
  /* Danh sách trang = trang đã có tiến độ ∪ trang đang mở. Trang đang mở mà chưa làm gì vẫn
   * hiện, ở mức 0/8 — đó là câu trả lời cho "trang này đã thuần hoá tới đâu" khi câu trả lời
   * là "chưa bắt đầu", và im lặng không phải một câu trả lời. */
  const mien = new Set(Object.keys(so.trang));
  for (const url of urlTheoTarget.values()) {
    const m = tenMien(url);
    if (m) mien.add(m);
  }
  const ds = [...mien].sort();

  if (!mienNguoiChon || !mien.has(mienDangXem)) mienDangXem = mienMoiNhat() ?? ds[0] ?? null;

  chon.replaceChildren();
  if (ds.length === 0) {
    const o = dat("option", null, "Chưa có trang nào");
    o.value = "";
    chon.append(o);
    chon.disabled = true;
    return;
  }
  chon.disabled = false;
  for (const m of ds) {
    const o = dat("option", null, m.replace(/^https?:\/\//, ""));
    o.value = m;
    o.selected = m === mienDangXem;
    chon.append(o);
  }
}

$("#chon-mien").addEventListener("change", (su_kien) => {
  mienDangXem = su_kien.target.value || null;
  mienNguoiChon = true;
  veTienDo();
});

function veTienDo() {
  const td = tinhTienDo(so, mienDangXem);
  $("#tiendo-dem").textContent = `${td.xong} / ${td.tong}`;
  $("#tiendo-pct").textContent = mienDangXem ? `${td.phanTram}%` : "chưa có trang nào";
  $("#tiendo-bar").style.width = `${td.phanTram}%`;

  const list = $("#tiendo-list");
  list.replaceChildren();
  for (const moc of td.moc) {
    const li = document.createElement("li");
    const dauCham = dat("span", `dau ${moc.xong ? "xong" : "chua"}`, moc.xong ? "✓" : "");
    const giua = dat("div", "moc-noi-dung");
    giua.append(
      dat("div", `moc-ten${moc.xong ? "" : " chua"}`, moc.ten),
      dat("div", "mo", moc.mota)
    );
    li.append(dauCham, giua, dat("span", "moc-luc", moc.xong ? gioPhut(moc.cuoi) : "Chưa thử"));
    list.append(li);
  }
}

function veHoatDong() {
  const ds = so.hoatDong;
  const dem = $("#hoat-dong-dem");
  const list = $("#hoat-dong-list");
  dem.textContent = ds.length ? `${ds.length} dòng gần nhất` : "";

  const badge = $("#dang-lam-badge");
  const gan = ds[0];
  /* "Đang chạy" đoán từ dấu vết mới nhất, và nói rõ là đoán: sổ chỉ ghi lúc lệnh XONG, nên
   * bảng bên không có cách nào biết một lệnh đang chạy dở. Vờ như biết là loại nói dối tệ nhất
   * ở đây — nó làm Đức tin bảng lúc bảng mù. */
  if (bridgeStatus !== "connected") {
    badge.textContent = "Không nối";
    badge.className = "huy-hieu do";
    $("#dang-lam").textContent = "Chưa nối Bridge nên AI không gửi được lệnh nào xuống.";
  } else if (!gan) {
    badge.textContent = "Sẵn sàng";
    badge.className = "huy-hieu luc";
    $("#dang-lam").textContent = "Đã nối, chưa nhận lệnh nào. Mở trang web rồi để AI bắt đầu.";
  } else {
    const truoc = Date.now() - gan.luc;
    const nong = truoc < 15000;
    badge.textContent = nong ? "Đang làm việc" : "Sẵn sàng";
    badge.className = `huy-hieu ${nong ? "xanh" : "luc"}`;
    $("#dang-lam").textContent = nong
      ? `Vừa chạy ${gan.method} lúc ${gioPhut(gan.luc)}.`
      : `Lệnh gần nhất: ${gan.method} lúc ${gioPhut(gan.luc)}.`;
  }

  /* Trang AI ĐANG CHẠM — lấy từ lệnh gần nhất có `target_id`, KHÔNG phải tab Đức đang xem. */
  const nhamVao = ds.find((d) => d.target_id);
  const url = nhamVao ? urlTheoTarget.get(nhamVao.target_id) : null;
  if (!nhamVao) {
    $("#muc-tieu-ten").textContent = "—";
    $("#muc-tieu-url").textContent = "Chưa có lệnh nào nhắm vào một tab.";
  } else if (url) {
    $("#muc-tieu-ten").textContent = tenMien(url) ?? url;
    $("#muc-tieu-url").textContent = url;
  } else {
    $("#muc-tieu-ten").textContent = nhamVao.target_id;
    $("#muc-tieu-url").textContent = "Tab này đã đóng, hoặc chưa quét lại danh sách tab.";
  }

  list.replaceChildren();
  if (ds.length === 0) {
    list.append(dat("li", "trong", "Chưa có hoạt động nào."));
    return;
  }
  for (const d of ds) {
    const li = document.createElement("li");
    li.append(dat("span", `dau ${d.ok ? "xong" : "hong"}`, d.ok ? "✓" : "!"));
    const giua = dat("div", "viec-noi-dung");
    giua.append(dat("div", `viec-ma${d.ok ? "" : " hong"}`, d.method));
    if (!d.ok) giua.append(dat("div", "mo", d.ma));
    giua.append(dat("div", "mo", d.target_id ? (urlTheoTarget.get(d.target_id) ?? d.target_id) : "—"));
    li.append(giua, dat("span", "moc-luc", gioPhut(d.luc)));
    list.append(li);
  }
}

async function veSo() {
  await docSo();
  veChonMien();
  veTienDo();
  veHoatDong();
}

/* ---- QUÉT TAB + QUAN SÁT ------------------------------------------------- */
let targetsById = new Map();
let baoCaoCuoi = null;

$("#scan").addEventListener("click", quet);
$("#copy-report").addEventListener("click", chepBaoCao);

async function quet() {
  ban(true, "Đang quét các tab Chrome mở…");
  try {
    const ds = await engine.scanTargets();
    targetsById = new Map(ds.map((t) => [t.targetId, t]));
    urlTheoTarget = new Map(ds.filter((t) => t.url).map((t) => [t.targetId, t.url]));
    veTargets(ds);
    ban(false, `Thấy ${ds.length} tab.`);
    veChonMien();
    veTienDo();
    veHoatDong();
  } catch (loi) {
    ban(false, `Quét hỏng: ${loi.message || loi}`);
  }
}

function veTargets(ds) {
  const hop = $("#target-list");
  hop.replaceChildren();
  if (ds.length === 0) {
    hop.append(dat("p", "trong", "Chrome không mở tab nào có thể quan sát."));
    return;
  }
  for (const t of ds) {
    const the = dat("article", `target${t.extensionRelated ? " extension" : ""}`);
    the.append(
      dat("div", "target-ten", t.title || "(tab không tên)"),
      dat("div", "url mo", t.url || "(không có địa chỉ)")
    );
    const hang = dat("div", "target-hang");
    hang.append(dat("code", null, t.targetId));
    const nut = dat("button", null, "Quan sát");
    nut.type = "button";
    nut.disabled = t.attached;
    nut.title = t.attached ? "Đã có phiên gỡ lỗi khác gắn vào tab này." : "Gắn tạm và chạy phép dò chỉ-đọc.";
    nut.addEventListener("click", () => quanSat(t.targetId, nut));
    hang.append(nut);
    the.append(hang);
    hop.append(the);
  }
}

async function quanSat(targetId, nut) {
  const t = targetsById.get(targetId);
  if (!t) return;
  nut.disabled = true;
  ban(true, `Đang quan sát ${targetId}…`);
  try {
    baoCaoCuoi = await engine.observe(t);
    $("#report").textContent = JSON.stringify(baoCaoCuoi, null, 2);
    $("#copy-report").disabled = false;
    ban(false, `Quan sát xong: ${baoCaoCuoi.observabilityLevel}.`);
  } catch (loi) {
    ban(false, `Quan sát hỏng: ${loi.message || loi}`);
  } finally {
    nut.disabled = t.attached;
  }
}

async function chepBaoCao() {
  if (!baoCaoCuoi) return;
  try {
    await navigator.clipboard.writeText(JSON.stringify(baoCaoCuoi, null, 2));
    $("#status").textContent = "Đã chép JSON.";
  } catch (loi) {
    $("#status").textContent = `Chép hỏng: ${loi.message || loi}`;
  }
}

function ban(dangBan, chu) {
  $("#scan").disabled = dangBan;
  $("#status").textContent = chu;
}

/* ---- SỐNG THEO KHO LƯU ---------------------------------------------------
 * Bảng bên vẽ lại khi kho lưu đổi, KHÔNG hỏi vòng theo đồng hồ. Cái sổ do service worker ghi,
 * nên `storage.onChanged` là tín hiệu thật; một vòng `setInterval` sẽ chạy cả lúc không có gì
 * đổi và vẫn trễ đúng nửa nhịp lúc có. */
chrome.storage.onChanged.addListener((doi, vung) => {
  if (vung !== "local") return;
  if (doi[JOURNAL_CONSTANTS.JOURNAL_STORAGE_KEY]) veSo();
  if (doi[SEED_CONSTANTS.WRITE_GATE_STORAGE_KEY]) veCongTac();
  if (doi[TRANSPORT_CONSTANTS.STATUS_STORAGE_KEY]) veBridge().then(veHoatDong);
});

veNangLuc();
veBridge().then(veSo);
veCongTac();
quet();
