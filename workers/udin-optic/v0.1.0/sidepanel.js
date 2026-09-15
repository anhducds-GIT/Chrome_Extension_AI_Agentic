/* sidepanel.js — bảng bên của Udin Optic. Chép từ bảng bên Scouter 15/09 — đây là chỗ Đức nói UI sẽ đổi theo usecase, nên nó CỐ Ý KHÔNG bị ghim so từng byte.
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

import { ScouterEngine } from "./scouter-engine.js";
import { capabilities } from "./scripts/bridge-core.mjs";
import { JOURNAL_CONSTANTS, nanSo, tenMien, tinhTienDo } from "./scripts/scouter-journal-core.mjs";
import { validatePairing, sanitizeInstanceLabel, TRANSPORT_CONSTANTS } from "./scripts/scouter-transport-loopback.mjs";
import { setWriteGate, readWriteGateState, SEED_CONSTANTS } from "./scripts/scouter-seed-core.mjs";
import { KHOA_ZOOM_UI, chuanHoaZoomUi, trungMuc, xetTabDangXem } from "./scripts/zoom-core.mjs";
import { kiemNhanh } from "./scripts/kiem-nhanh.mjs";

const engine = new ScouterEngine();
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

/* MỘT chỗ sao chép, dùng chung cho mọi nút sao chép của bảng bên. Hai bản của một luật thì
 * sớm muộn hai nút cư xử khác nhau ngay trước mắt người dùng — ở đây là một nút nháy "Đã sao
 * chép" còn nút kia đứng im, và người bấm không biết mình đã chép được hay chưa. */
async function chepVaoBangNho(button, chuoi) {
  if (!button || !chuoi) return;
  const nhanCu = button.textContent;
  try {
    await navigator.clipboard.writeText(chuoi);
    button.textContent = "Đã sao chép";
  } catch (_loi) {
    button.textContent = "Không thể sao chép";
  }
  window.setTimeout(() => { button.textContent = nhanCu; }, 1800);
}

async function copyBridgePairingPath(button) {
  await chepVaoBangNho(button, button?.dataset.bridgePairingPath || "");
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

/* ---- TÊN GHẾ (12/09) -----------------------------------------------------
 * Ô này ghi vào kho lưu và DỪNG ở đó. Nó không gửi gì qua dây, không gọi method Bridge nào:
 * `scouter-background.js` thấy khoá đổi thì cắt dây, và lượt nối lại khai tên mới trong khung
 * `auth`. Một đường, một chỗ xử — bảng bên không có bản sao nào của luật đó.
 *
 * Làm sạch bằng ĐÚNG hàm mà transport dùng lúc gửi, không viết lại: hai bản của một luật thì
 * sớm muộn trả hai câu khác nhau, và ở đây "khác nhau" nghĩa là ô hiện một tên còn máy chủ
 * ghi một tên khác. */
async function veTenGhe() {
  const kho = await chrome.storage.local.get([
    TRANSPORT_CONSTANTS.INSTANCE_STORAGE_KEY,
    TRANSPORT_CONSTANTS.INSTANCE_LABEL_STORAGE_KEY
  ]);
  const so = kho?.[TRANSPORT_CONSTANTS.INSTANCE_STORAGE_KEY]?.instance_id;
  /* Chưa có số ghế là chuyện BÌNH THƯỜNG chứ không phải hỏng: số chỉ được đúc ở lượt nối đầu
   * tiên. Nói ra đúng thế, đừng hiện một ô trống để người đọc tự đoán. */
  const oSo = $("#ten-ghe-so");
  oSo.textContent = so || "chưa có — đúc ở lượt nối Bridge đầu tiên";
  /* Giữ số THẬT riêng khỏi chữ đang hiện. Lúc chưa có số, ô đó đang chứa một câu giải thích,
   * và sao chép nguyên câu đó vào bảng nhớ rồi dán vào một lượt gọi là một lỗi im lặng. */
  oSo.dataset.soGhe = so || "";
  const o = $("#ten-ghe");
  if (document.activeElement !== o) o.value = kho?.[TRANSPORT_CONSTANTS.INSTANCE_LABEL_STORAGE_KEY] || "";
}

async function luuTenGhe() {
  const sach = sanitizeInstanceLabel($("#ten-ghe").value);
  const bao = $("#ten-ghe-bao");
  await chrome.storage.local.set({ [TRANSPORT_CONSTANTS.INSTANCE_LABEL_STORAGE_KEY]: sach });
  $("#ten-ghe").value = sach;
  /* Nói thẳng cái vừa xảy ra ở tầng dưới: lưu tên là CẮT DÂY. Người bấm nút thấy huy hiệu
   * Bridge nhấp nháy sang "mất kết nối" vài giây, và không báo trước thì đó là một lỗi. */
  bao.textContent = sach
    ? `Đã lưu “${sach}”. Đang nối lại để khai tên…`
    : "Đã xoá tên. Ghế này quay lại không tên.";
  window.setTimeout(veBridge, 1500);
}

$("#ten-ghe-so-chep").addEventListener("click", () => { chepVaoBangNho($("#ten-ghe-so-chep"), $("#ten-ghe-so").dataset.soGhe || ""); });
$("#ten-ghe-luu").addEventListener("click", () => { luuTenGhe().catch(() => { $("#ten-ghe-bao").textContent = "Không lưu được tên."; }); });
$("#ten-ghe").addEventListener("keydown", (su_kien) => {
  if (su_kien.key !== "Enter") return;
  su_kien.preventDefault();
  $("#ten-ghe-luu").click();
});

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
      : "Udin Optic được phép bấm và gõ trên trang đang mở. Tắt khi làm xong.";
  } else {
    badge.textContent = "ĐANG TẮT";
    badge.className = "huy-hieu";
    $("#gate-note").textContent = `Udin Optic chỉ NHÌN được. Mọi lệnh bấm và gõ bị từ chối. Bật một lần được ${SEED_CONSTANTS.WRITE_CAP_PER_UNLOCK} lượt.`;
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
  if (doi[TRANSPORT_CONSTANTS.INSTANCE_STORAGE_KEY] || doi[TRANSPORT_CONSTANTS.INSTANCE_LABEL_STORAGE_KEY]) veTenGhe();
});

/* ---- CỠ CHỮ BẢNG BÊN -------------------------------------------------------
 * `zoom` của CSS, không phải `chrome.tabs.setZoom`: hai thứ khác hẳn nhau và hàng nút
 * này **không đụng tới trang web** — nó chỉ đổi cỡ chữ của chính bảng này, nên nó không
 * cần quyền gì, không cần tab nào đang mở, và không bao giờ xám. */
const nutZoomUi = () => Array.from(document.querySelectorAll(".zoom-nut[data-ui-zoom]"));

function apZoomUi(muc) {
  const chon = chuanHoaZoomUi(muc);
  document.documentElement.style.setProperty("--zoom-chu", String(chon));
  for (const nut of nutZoomUi()) doLop(nut, "chon", Number(nut.dataset.uiZoom) === chon);
  return chon;
}

/* Kho lưu hỏng thì về 100% — bảng bên vẫn dùng được. Một tính năng tiện nghi không
 * được phép làm chết cả bảng. */
async function khoiPhucZoomUi() {
  let luu = 1;
  try {
    const v = await chrome.storage.local.get(KHOA_ZOOM_UI);
    luu = v?.[KHOA_ZOOM_UI] ?? 1;
  } catch { /* kho lưu không đọc được thì mặc định vẫn chạy */ }
  return apZoomUi(luu);
}

for (const nut of nutZoomUi()) {
  nut.addEventListener("click", () => {
    const chon = apZoomUi(nut.dataset.uiZoom);
    /* Ghi SAU khi đã chuẩn hoá: kho lưu không bao giờ giữ một mức không có nút nào. */
    chrome.storage?.local?.set({ [KHOA_ZOOM_UI]: chon })?.catch?.(() => {});
  });
}

khoiPhucZoomUi();

/* ---- THU PHÓNG TRANG WEB ---------------------------------------------
 * Gọi THẬNG `chrome.tabs.setZoom`, **không đi qua Bridge**: nó không gửi gì, không gõ gì,
 * nên nó không phải một hành động GHI và không cần thêm một method nào vào từ vựng 12 lệnh.
 *
 * Đọc kỹ chỗ này trước khi "chữa" nó (`G-95`, đo 16/09): `setZoom` **KHÔNG** bị
 * `host_permissions` chặn — nó phóng to được cả một tab hoàn toàn ngoài quyền. Thứ duy
 * nhất ngăn Udin phóng nhầm tab của người khác là `tab.url` bị Chrome GIẤU ở tab ngoài
 * quyền. Nên lớp an toàn nằm trên đường ĐỌC: **không đọc được `url` thì KHOÁ NÚT.**
 * Ai "chữa lỗi nút xám" bằng cách cứ zoom tab đang xem là vừa gỡ mất lớp chặn duy nhất.
 *
 * GIỚI HẠN, nói thẳng: `getZoom` chứng minh **Chrome đã nhận lệnh thu phóng**, nó KHÔNG
 * chứng minh **trang đã vẽ lại**. Muốn chứng minh điều thứ hai thì phải đo trong trang, mà
 * `scout.view` không nằm trong 12 lệnh của gói này. Với một nút giao diện thì thế là đủ. */
/* TÊN MIỀN CỦA GÓI NÀY — đặt ở đây chứ không ở `zoom-core.mjs`, vì file đó bị so từng byte
 * với bản bên gói kia. Gói mở `<all_urls>` truyền `null` vào chỗ này.
 * KHÔNG suy ra từ `host_permissions`: danh sách đó còn có bucket ảnh và `127.0.0.1`, mà nút thu
 * phóng chỉ nói về **trang làm việc**. */
const MIEN_LAM_VIEC = "vinfast.udinbv.com";

const nutZoomWeb = () => Array.from(document.querySelectorAll(".zoom-nut[data-web-zoom]"));
const NHOM_ZOOM_WEB = "Thu phóng trang Udin";

/* Nút xám phải TỰ KHAI vì sao. Bốn nguyên nhân khác hẳn nhau mà cùng cho ra một nút xám câm
 * thì "nút zoom hỏng" là tất cả những gì Đức gõ được vào chat, và không ai chẩn đoán được từ
 * xa. Đặt tooltip lên CẢ cụm lẫn từng nút: nút `disabled` không phát sự kiện chuột ở mọi
 * trình duyệt, nên chỉ gắn lên cụm là có chỗ rê chuột vào mà không hiện gì. */
function khoaZoomWeb(vi) {
  const nhan = vi ? `Chưa dùng được — ${vi}` : NHOM_ZOOM_WEB;
  for (const nut of nutZoomWeb()) { nut.disabled = true; doLop(nut, "chon", false); nut.title = nhan; }
  const cum = document.getElementById("zoom-web-nhom");
  if (cum) cum.title = nhan;
}

function moZoomWeb() {
  for (const nut of nutZoomWeb()) { nut.disabled = false; nut.title = NHOM_ZOOM_WEB; }
  /* Dọn lý do CŨ trên cụm. Không dọn thì Đức thấy một câu cảnh báo đã hết hạn trong khi
     nút đang bấm được bình thường. */
  const cum = document.getElementById("zoom-web-nhom");
  if (cum) cum.title = NHOM_ZOOM_WEB;
}

async function tabUdinDangXem() {
  if (typeof chrome === "undefined" || !chrome.tabs?.query) {
    return { dung: false, vi: "chưa gọi được API tab của Chrome, thử nạp lại tiện ích", tab: null };
  }
  let tab = null;
  try { [tab] = await chrome.tabs.query({ active: true, currentWindow: true }); }
  catch (loi) { return { dung: false, vi: `không đọc được tab đang xem (${loi?.message || loi})`, tab: null }; }
  return { ...xetTabDangXem(tab, MIEN_LAM_VIEC), tab };
}

async function veZoomWeb() {
  if (!nutZoomWeb().length) return;
  const xet = await tabUdinDangXem();
  if (!xet.dung) { khoaZoomWeb(xet.vi); return; }
  try {
    const muc = await chrome.tabs.getZoom(xet.tab.id);
    moZoomWeb();
    for (const nut of nutZoomWeb()) doLop(nut, "chon", trungMuc(muc, Number(nut.dataset.webZoom)));
  } catch (loi) {
    khoaZoomWeb(`Chrome từ chối đọc mức thu phóng (${loi?.message || loi})`);
  }
}

for (const nut of nutZoomWeb()) {
  nut.addEventListener("click", async () => {
    /* HỬI LẠI tab ngay trước khi đặt, không dùng kết quả cũ: Đức đổi tab xong mới bấm thì
       kết quả cũ trỏ sang tab khác, và `setZoom` sẵn sàng phóng to tab đó (`G-95`). */
    const xet = await tabUdinDangXem();
    if (!xet.dung) { khoaZoomWeb(xet.vi); return; }
    try {
      await chrome.tabs.setZoom(xet.tab.id, Number(nut.dataset.webZoom));
      await veZoomWeb();
    } catch (loi) {
      khoaZoomWeb(`đặt mức thu phóng không thành (${loi?.message || loi})`);
    }
  });
}

/* Đức đổi tab thì hàng nút phải đổi theo. Bọc `try` vì đây là tiện nghi: thiếu nó thì
 * hàng nút chỉ cũ một nhịp cho đến lượt bấm sau, không phải một lỗi. */
try { chrome.tabs?.onActivated?.addListener(() => { veZoomWeb(); }); } catch { /* tiện nghi, bỏ qua */ }

veZoomWeb();

/* ---- KIỂM TRA KẾT NỐI -----------------------------------------------------
 * Năm phép dò THẬT bơm vào `kiemNhanh`. Bản thân `kiemNhanh` không biết `chrome` là gì,
 * nên phép ghim gọi được hàm thật thay vì dò chữ trong file này.
 *
 * Bước ④ dùng ĐÚNG đường dò mà AI dùng (`engine.runProbe("query")`), không phải một
 * đường tắt riêng cho nút này: một bộ chẩn đoán đi đường khác với việc thật thì nó xanh
 * trong khi việc thật đang hỏng. */
const PHEP_DO_KIEM = {
  day: async () => {
    const kho = await chrome.storage.local.get([TRANSPORT_CONSTANTS.STATUS_STORAGE_KEY]);
    return kho?.[TRANSPORT_CONSTANTS.STATUS_STORAGE_KEY]?.status ?? "unpaired";
  },
  nangLuc: async () => capabilities(),
  quetTab: async () => engine.scanTargets(),
  doTrang: async (t) => {
    /* DỰNG target ĐÚNG NHƯ `resolveTarget` của `scouter-seed-core.mjs`: `runProbe` đọc
       `target.id ?? target.targetId` và `target.attached`. Bản đầu của chỗ này gọi
       `runProbe("query", {...})` — sai cả chữ ký (target đứng TRƯỚC) lẫn tên phép dò
       (`dom.query`, không phải `query`), và nó sẽ lặng lẽ trả `PROBE_UNKNOWN`. */
    const target = { id: t.targetId, targetId: t.targetId, attached: Boolean(t.attached) };
    const kq = await engine.runProbe(target, "dom.query", { selector: "body", limit: 1 });
    /* Phép dò thất bại trả về `{ ok:false, code, detail }` chứ KHÔNG ném. Ném ra ở đây để
       bước ④ bắt được và hiện đúng lý do, thay vì đọc `undefined` thành "không đọc được". */
    if (!kq || kq.ok !== true) throw new Error(`${kq?.code || "PROBE_FAILED"}: ${kq?.detail || "phép dò không chạy"}`);
    return kq.data?.matchCount;
  },
  congTac: async () => readWriteGateState(chrome)
};

function veKiem(ket) {
  const hop = $("#kiem-list");
  hop.replaceChildren();
  for (const b of ket.buoc) {
    const muc = document.createElement("li");
    const dong = dat("div", "kiem-dong");
    dong.append(
      dat("span", `kiem-dau ${b.dat ? "dat" : "hong"}`, b.dat ? "ĐẠT" : "HỎNG"),
      dat("span", "kiem-ten", b.ten)
    );
    muc.append(dong, dat("div", "kiem-noi", b.noi));
    /* Dòng "làm gì tiếp" chỉ hiện khi có việc phải làm. Hiện luôn thì nó thành nền,
       và lúc thật sự cần đọc thì mắt đã học được cách bỏ qua nó. */
    if (b.lamGi) muc.append(dat("div", "kiem-lamgi", b.lamGi));
    hop.append(muc);
  }
  $("#kiem-ket").textContent = ket.dat
    ? "BẢN CÀI CHẠY ĐƯỢC."
    : "CÓ BƯỚC HỎNG — làm theo dòng đóng khung rồi bấm lại.";
}

$("#kiem-chay").addEventListener("click", async () => {
  const nut = $("#kiem-chay");
  nut.disabled = true;
  $("#kiem-ket").textContent = "Đang kiểm…";
  $("#kiem-list").replaceChildren();
  try {
    veKiem(await kiemNhanh(PHEP_DO_KIEM, {
      mien: MIEN_LAM_VIEC,
      /* Số lệnh đếm từ bảng lệnh THẬT, không gõ tay — hai con số gõ ở hai chỗ thì sớm muộn lệch. */
      soMethod: capabilities().methods.length,
      tenGoi: "udin-optic",
      cachBatMayChu: "Chạy `START-BRIDGE_Udin-Optic.cmd` trong thư mục ghép cặp"
    }));
  } catch (loi) {
    /* KHÔNG CHẠY ĐƯỢC khác hẳn KHÔNG ĐẠT — gộp hai cái là báo sai cho Đức. */
    $("#kiem-ket").textContent = `KHÔNG CHẠY ĐƯỢC: ${loi?.message || loi}`;
  } finally {
    nut.disabled = false;
  }
});

veNangLuc();
veBridge().then(veSo);
veTenGhe();
veCongTac();
quet();
