/* sidepanel.js — BẢNG BÊN của HNX Fetch. Ba việc, hết: công tắc · cửa Bridge · sổ hoạt động.
 *
 * Bản Scouter có thêm tab "Thuần hoá trang web" và tab "Tab đang mở". Cả hai đi ra ngoài qua
 * `chrome.debugger`, mà extension này KHÔNG khai quyền đó — nên chúng không có ở đây. Vẽ một
 * khối luôn trống là dạy người đọc bỏ qua khối đó.
 *
 * KHÔNG `.innerHTML` ở bất kỳ đâu (luật gốc mục 4). Mọi nút DOM dựng bằng `createElement` +
 * `textContent`, kể cả với chữ do chính file này viết ra: một ngoại lệ "chỗ này an toàn mà" là
 * chỗ ngoại lệ thứ hai sẽ bám vào.
 */
import { capabilities } from "./scripts/bridge-core.mjs";
import { TRANSPORT_CONSTANTS, validatePairing } from "./scripts/transport.mjs";
import { JOURNAL_CONSTANTS, nanSo } from "./scripts/journal-core.mjs";
import { setWriteGate, readWriteGateState, SEED_CONSTANTS } from "./scripts/fetch-core.mjs";

const $ = (chon) => document.querySelector(chon);

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
 * dõi kho lưu và nối. Lý do: bảng bên đóng lại là chết, còn service worker thì sống tiếp — một
 * kết nối mở từ tầng giao diện sẽ đứt ngay khi Đức đóng bảng. Kiểm ngay tại đây bằng CHÍNH hàm
 * mà transport dùng, nên kho lưu không bao giờ chứa một tệp hỏng. */
const BRIDGE_CHU = {
  connected:    { badge: "Đã kết nối",    lop: "luc", dai: "Đã nối máy chủ Bridge trên máy này." },
  disconnected: { badge: "Mất kết nối",   lop: "do",  dai: "Chưa nối được máy chủ Bridge. Bật máy chủ rồi chờ một nhịp." },
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

/* ---- CÔNG TẮC ------------------------------------------------------------
 * Bảng bên là chỗ DUY NHẤT bật được công tắc này, và đó là cả ý nghĩa của nó: không method
 * Bridge nào bật được nó, nên AI ở đầu dây không tự mở khoá cho chính mình. Trạng thái đọc
 * bằng CHÍNH hàm mà đường ghi dùng, nên bảng không bao giờ lệch với thứ đang thật sự xảy ra. */
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
      : "AI được phép gọi mạng lấy dữ liệu. Tắt khi làm xong.";
  } else {
    badge.textContent = "ĐANG TẮT";
    badge.className = "huy-hieu";
    $("#gate-note").textContent = `Mọi lệnh lấy dữ liệu bị từ chối. Bật một lần được ${SEED_CONSTANTS.WRITE_CAP_PER_UNLOCK} lượt.`;
  }
}

/* ---- NĂNG LỰC ------------------------------------------------------------
 * Đọc từ `capabilities()` — CÙNG hàm mà `system.capabilities` trả cho AI, nên bảng bên và AI
 * không thể khai hai con số khác nhau. Đây là chỗ Đức kiểm được lời hứa "extension này không
 * bấm được": nếu một ngày danh sách mọc thêm một lệnh ghi, nó hiện ra ngay ở đây. */
function veNangLuc() {
  const ds = capabilities().methods;
  $("#nangluc-tong").textContent = `${ds.length} lệnh`;

  const list = $("#nangluc-list");
  list.replaceChildren();
  for (const m of ds) {
    const li = document.createElement("li");
    const giua = dat("div", "moc-noi-dung");
    giua.append(
      dat("div", "nangluc-ten", m.name),
      dat("div", "mo", m.read_only ? "chỉ đọc, không tốn lượt" : "tốn một lượt của công tắc")
    );
    li.append(giua, dat("span", "nangluc-dem", m.read_only ? "—" : "1"));
    list.append(li);
  }
  list.append(dat("li", "trong", "Máy chủ Bridge còn tự làm thêm nhóm lệnh về file (ghi · nối thêm · đọc · liệt kê). Nhóm đó KHÔNG đi qua extension nên bảng bên không kiểm được, và không đếm."));
}

/* ---- SỔ HOẠT ĐỘNG --------------------------------------------------------
 * Chỉ vòng hoạt động, không có phần "mốc thuần hoá trang". Phần mốc buộc vào tám phép dò của
 * Scouter mà extension này không có; vẽ nó ra để nó đứng yên mãi mãi là nói dối bằng bố cục.
 *
 * Cột "trang" cũng không có: `scout.fetch` không nhắm vào tab nào, nên không có tab để kể tên. */
let so = { trang: {}, hoatDong: [] };

async function docSo() {
  try {
    const kho = await chrome.storage.local.get([JOURNAL_CONSTANTS.JOURNAL_STORAGE_KEY]);
    so = nanSo(kho?.[JOURNAL_CONSTANTS.JOURNAL_STORAGE_KEY]);
  } catch (_loi) {
    so = { trang: {}, hoatDong: [] };
  }
}

function veHoatDong() {
  const ds = so.hoatDong;
  const list = $("#hoat-dong-list");
  $("#hoat-dong-dem").textContent = ds.length ? `${ds.length} dòng gần nhất` : "";

  list.replaceChildren();
  if (ds.length === 0) {
    list.append(dat("li", "trong", bridgeStatus === "connected"
      ? "Đã nối, chưa nhận lệnh nào."
      : "Chưa nối Bridge nên AI chưa gửi được lệnh nào xuống."));
    return;
  }
  for (const d of ds) {
    const li = document.createElement("li");
    li.append(dat("span", `dau ${d.ok ? "xong" : "hong"}`, d.ok ? "✓" : "!"));
    const giua = dat("div", "viec-noi-dung");
    giua.append(dat("div", `viec-ma${d.ok ? "" : " hong"}`, d.method));
    if (!d.ok) giua.append(dat("div", "mo", d.ma));
    li.append(giua, dat("span", "moc-luc", gioPhut(d.luc)));
    list.append(li);
  }
}

/* Kho lưu đổi thì vẽ lại — công tắc bị phím tắt PHANH KHẨN tắt từ ngoài cũng phải hiện ra ở
 * đây, nếu không thì bảng nói một đằng và đường ghi làm một nẻo. */
chrome.storage.onChanged.addListener((doi, vung) => {
  if (vung !== "local") return;
  if (doi[JOURNAL_CONSTANTS.JOURNAL_STORAGE_KEY]) docSo().then(veHoatDong);
  if (doi[SEED_CONSTANTS.WRITE_GATE_STORAGE_KEY]) veCongTac();
  if (doi[TRANSPORT_CONSTANTS.STATUS_STORAGE_KEY]) veBridge().then(veHoatDong);
});

veNangLuc();
veBridge().then(() => docSo()).then(veHoatDong);
veCongTac();
