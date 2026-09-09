/* VẼ LƯU ĐỒ THÀNH SVG — lúc SINH TRANG, không nhờ thư viện nào.
 *
 * VÌ SAO CÓ FILE NÀY. Bảng đã in `<pre class="mermaid">` từ bản v0.3.0, kèm một chú thích trong
 * `md-mini.mjs` nói *"mermaid được giữ nguyên để trang tự vẽ, không cần thư viện"*. Trang **chưa
 * bao giờ vẽ** — không có thư viện nào được nạp, nên bảy lưu đồ hiện ra dưới dạng **mã nguồn**,
 * kể cả `<br/>` và `&lt;repo&gt;` cũng lòi ra chữ. Đức nhìn thấy và nói đúng một câu: *"flow
 * chart này toàn chữ, tôi cần hình ảnh trực quan"* (08/09).
 *
 * VÌ SAO KHÔNG NẠP MERMAID TỪ CDN — luật đã có sẵn trong `build-overview.mjs`, ngay trên khối
 * `.mh`: *"trang này là file tĩnh đem gửi cho người khác mở, nên nó không được phụ thuộc vào một
 * CDN còn sống hay không."* Một lưu đồ chỉ hiện khi có mạng thì đúng lúc cần nhất — máy người
 * khác, mạng công ty chặn, sáu tháng sau CDN đổi đường dẫn — nó lại là chữ. Nên vẽ ở đây, và thứ
 * đi ra là SVG **nội tuyến**: mở bằng trình duyệt nào, có mạng hay không, cũng ra hình.
 *
 * TẬP CON ĐƯỢC ĐỠ, cố ý hẹp — đúng những gì bảy lưu đồ của repo này đang dùng:
 *
 *   flowchart TD | TB | LR      (`graph` cũng nhận, mermaid coi hai từ này như nhau)
 *   A["nhãn"]                   hộp chữ nhật
 *   A{nhãn}                     hộp quyết định, vẽ hình thoi
 *   A --> B                     cạnh liền
 *   A -- nhãn --> B             cạnh có nhãn
 *   A -- "nhãn" --> B           nhãn có dấu cách hay ký tự lạ thì bọc nháy
 *   A -.-> B                    cạnh nét đứt (dùng cho vòng quay lại)
 *   A --> B --> C               chuỗi, tách thành từng cạnh
 *   A["nhãn"]                   khai nút một mình, không kèm cạnh
 *   A -.- B                     nối nét đứt, KHÔNG mũi tên — chỉ nói "có liên quan"
 *   A --- B                     nối nét liền, KHÔNG mũi tên
 *
 * KHÔNG ĐỠ THÌ TRẢ `null`, KHÔNG NÉM. Bộ vẽ này đi theo bản trích, tức nó sẽ chạy trên tài liệu
 * của repo người khác, và tài liệu đó có quyền chứa `sequenceDiagram` hay bất cứ thứ gì. Ném ở
 * đó là **cả trang không sinh ra được** vì một cái sơ đồ. Nên: trả `null`, và bên gọi in lại mã
 * nguồn KÈM MỘT DÒNG NÓI RÕ là chưa vẽ được — im lặng lùi về chữ chính là con đường đã dẫn tới
 * lỗi này, vì không ai biết trang đang thiếu hình.
 */

const NL = String.fromCharCode(10);

/* Chữ trong SVG không đo được lúc sinh — không có trình duyệt ở đây. Nên ước lượng, và ước
   lượng RỘNG HƠN thật: chữ tràn ra ngoài hộp thì người đọc thấy ngay là hỏng, còn hộp rộng hơn
   chữ vài pixel thì không ai nhận ra. Dấu tiếng Việt không làm đổi bề rộng con chữ. */
const CO_CHU = 12.5;
const RONG_MOI_KY_TU = 6.9;
const CAO_MOI_DONG = 17;
const DEM_NGANG = 13;
const DEM_DOC = 11;
const RONG_TOI_DA = 250;
const RONG_TOI_THIEU = 104;
const CACH_BAC = 56;   // khoảng giữa hai tầng — phải đủ chỗ cho nhãn cạnh
const CACH_NUT = 24;   // khoảng giữa hai nút cùng tầng
const LE = 12;
// Bề rộng một ký tự của nhãn cạnh (IBM Plex Mono 10.6px, advance 0.6em). Dùng ở HAI chỗ —
// nới khe và dồn chỗ — nên khai một lần.
const RONG_NHAN = 6.4;

/* ---- 1. ĐỌC ------------------------------------------------------------- */

/** Đổi thực thể HTML về ký tự thật. Nguồn markdown đã escape sẵn (`&lt;repo&gt;`), mà SVG cần
 *  escape LẠI theo luật của nó — escape chồng lên escape là ra `&amp;lt;` trên màn hình. */
const goEscape = (s) => String(s)
  .replaceAll("&lt;", "<").replaceAll("&gt;", ">")
  .replaceAll("&quot;", '"').replaceAll("&#39;", "'")
  .replaceAll("&amp;", "&");

const escXML = (s) => String(s)
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

/* Số ký tự tối đa một dòng chữ trong hộp. Suy ra từ bề rộng tối đa, không gõ một con số thứ hai —
   hai con số cho cùng một giới hạn thì có ngày chúng lệch nhau. */
const KY_TU_MOI_DONG = Math.floor((RONG_TOI_DA - DEM_NGANG * 2) / RONG_MOI_KY_TU);

/** Nhãn → các dòng. `<br/>` là ngắt dòng do người viết chọn; tôn trọng nó, không tự gộp lại.
 *
 *  DÒNG QUÁ DÀI THÌ NGẮT THÊM. Không ngắt thì hộp bị kẹp về bề rộng tối đa mà chữ thì không —
 *  đo thật trong trình duyệt: nhãn *"Đọc AGENTS.md → mục 6 → HANDOFF cuối file"* rộng 265px
 *  trong một hộp 250px, tức chữ thò ra hai bên. Trông như lỗi vẽ, mà nguyên nhân là kẹp một
 *  chiều. */
function tachDong(nhan) {
  const tho = goEscape(nhan).split(/<br\s*\/?>/i).map((d) => d.trim()).filter((d) => d !== "");
  const ra = [];
  for (const d of tho) {
    if (d.length <= KY_TU_MOI_DONG) { ra.push(d); continue; }
    let dong = "";
    for (const tu of d.split(" ")) {
      if (dong === "") { dong = tu; continue; }
      if ((dong + " " + tu).length <= KY_TU_MOI_DONG) { dong += " " + tu; continue; }
      ra.push(dong);
      dong = tu;
    }
    if (dong !== "") ra.push(dong);
  }
  return ra;
}

/** Đọc một nút ở vị trí `i`. Trả `null` nếu chỗ đó không phải nút. */
function docNut(s, i) {
  let bo = i;
  while (bo < s.length && s[bo] === " ") bo += 1;
  const m = /^([A-Za-z_][A-Za-z0-9_]*)/.exec(s.slice(bo));
  if (!m) return null;
  const id = m[1];
  let j = bo + m[0].length;
  let nhan = null;
  let hinh = "hop";
  const mo = s[j];
  if (mo === "[" || mo === "{") {
    const dong = mo === "[" ? "]" : "}";
    const k = s.indexOf(dong, j + 1);
    if (k < 0) return null;
    nhan = s.slice(j + 1, k).trim();
    if (nhan.startsWith('"') && nhan.endsWith('"')) nhan = nhan.slice(1, -1);
    hinh = mo === "{" ? "thoi" : "hop";
    j = k + 1;
  }
  return { id, nhan, hinh, ket: j };
}

/** Đọc một mũi tên ở vị trí `i`. Trả `null` nếu chỗ đó không phải mũi tên.
 *
 *  THỨ TỰ THỬ QUAN TRỌNG: `-->` và `-- nhãn -->` cùng bắt đầu bằng `--`. Thử dạng có nhãn trước
 *  thì `-->` bị nuốt mất phần đầu; nên thử `-->` và `-.->` (dạng cố định) TRƯỚC. */
function docCanh(s, i) {
  const t = s.slice(i).replace(/^\s+/, "");
  const bo = s.length - s.slice(i).length + (s.slice(i).length - t.length);
  if (t.startsWith("-->")) return { kieu: "lien", mui: true, nhan: null, ket: bo + 3 };
  if (t.startsWith("-.->")) return { kieu: "cham", mui: true, nhan: null, ket: bo + 4 };
  // Nối KHÔNG mũi tên: `-.-` nét đứt, `---` nét liền. Dùng để nói "hai thứ này liên quan",
  // không nói "cái này chạy sang cái kia" — khối bốn tầng trong bảng dùng `L -.- E`.
  if (t.startsWith("-.-")) return { kieu: "cham", mui: false, nhan: null, ket: bo + 3 };
  if (t.startsWith("---")) return { kieu: "lien", mui: false, nhan: null, ket: bo + 3 };
  const m = /^--\s*(?:"([^"]*)"|([^"][^-]*?))\s*-->/.exec(t);
  if (m) return { kieu: "lien", mui: true, nhan: (m[1] ?? m[2]).trim(), ket: bo + m[0].length };
  return null;
}

/** Đọc cả khối nguồn. Trả `null` khi gặp bất cứ thứ gì ngoài tập con — xem đầu file. */
export function docLuuDo(nguon) {
  const dong = String(nguon).split(NL).map((l) => l.trim())
    .filter((l) => l !== "" && !l.startsWith("%%") && !l.startsWith("```"));
  if (dong.length === 0) return null;
  const dau = /^(?:flowchart|graph)\s+(TD|TB|LR)$/.exec(dong[0]);
  if (!dau) return null;
  const huong = dau[1] === "LR" ? "LR" : "TD";

  const nut = new Map();
  const canh = [];
  const ghiNut = (n) => {
    const co = nut.get(n.id);
    if (!co) { nut.set(n.id, { id: n.id, dong: tachDong(n.nhan ?? n.id), hinh: n.hinh, thuTu: nut.size }); return; }
    // Khai nhãn ở lần sau thì lấy nhãn đó — mermaid cũng xử như vậy.
    if (n.nhan !== null) { co.dong = tachDong(n.nhan); co.hinh = n.hinh; }
  };

  for (const d of dong.slice(1)) {
    let i = 0;
    const dauTien = docNut(d, i);
    if (!dauTien) return null;
    ghiNut(dauTien);
    i = dauTien.ket;
    let truoc = dauTien.id;
    while (i < d.length) {
      const c = docCanh(d, i);
      if (!c) return null;
      const sau = docNut(d, c.ket);
      if (!sau) return null;
      ghiNut(sau);
      canh.push({ tu: truoc, den: sau.id, kieu: c.kieu, mui: c.mui, nhan: c.nhan });
      truoc = sau.id;
      i = sau.ket;
      while (i < d.length && d[i] === " ") i += 1;
    }
  }
  if (nut.size === 0) return null;
  return { huong, nut, canh };
}

/* ---- 2. XẾP TẦNG -------------------------------------------------------- */

/** Xếp nút thành tầng. CHỊU ĐƯỢC VÒNG LẶP, và đó không phải chuyện lý thuyết:
 *  `docs/BAO-TRI-DINH-KY.md` có `C -.-> A` quay ngược về đầu. Duyệt sâu bỏ qua cạnh quay lại,
 *  nên vòng lặp thành một cạnh vẽ vòng ra ngoài chứ không làm treo bộ xếp. */
function xepTang(nut, canh) {
  const ra = new Map([...nut.keys()].map((k) => [k, []]));
  for (const c of canh) ra.get(c.tu).push(c.den);

  const mau = new Map([...nut.keys()].map((k) => [k, 0])); // 0 chưa thăm · 1 đang thăm · 2 xong
  const thuTuNguoc = [];
  const quayLai = new Set();
  const tham = (v) => {
    mau.set(v, 1);
    for (const w of ra.get(v)) {
      if (mau.get(w) === 1) { quayLai.add(`${v}>${w}`); continue; }
      if (mau.get(w) === 0) tham(w);
    }
    mau.set(v, 2);
    thuTuNguoc.push(v);
  };
  for (const v of nut.keys()) if (mau.get(v) === 0) tham(v);
  const thuTu = thuTuNguoc.reverse();

  const bac = new Map(thuTu.map((v) => [v, 0]));
  for (const v of thuTu) {
    for (const w of ra.get(v)) {
      if (quayLai.has(`${v}>${w}`)) continue;
      bac.set(w, Math.max(bac.get(w), bac.get(v) + 1));
    }
  }
  return { bac, quayLai };
}

/* ---- 3. VẼ -------------------------------------------------------------- */

/** Vẽ một khối mermaid thành SVG nội tuyến. Trả `null` nếu không đọc nổi — bên gọi lo phần lùi. */
export function veLuuDo(nguon) {
  const doc = docLuuDo(nguon);
  if (!doc) return null;
  const { huong, nut, canh } = doc;
  const { bac, quayLai } = xepTang(nut, canh);
  const ngang = huong === "LR";

  // Kích thước từng hộp. Hình thoi cần thêm chỗ: chữ nằm trong phần hẹp ở giữa.
  for (const n of nut.values()) {
    const rongChu = Math.max(...n.dong.map((d) => d.length)) * RONG_MOI_KY_TU;
    const heSo = n.hinh === "thoi" ? 1.5 : 1;
    n.rong = Math.min(RONG_TOI_DA, Math.max(RONG_TOI_THIEU, Math.round(rongChu * heSo) + DEM_NGANG * 2));
    n.cao = Math.round(n.dong.length * CAO_MOI_DONG + DEM_DOC * 2) * (n.hinh === "thoi" ? 1.35 : 1);
  }

  // Gom theo tầng, rồi xếp thứ tự trong tầng theo VỊ TRÍ CHA — không theo thứ tự gõ. Xếp theo
  // thứ tự gõ thì các cạnh bắt chéo nhau nhiều hơn hẳn, và một lưu đồ rối là một lưu đồ không ai đọc.
  const tang = new Map();
  for (const n of nut.values()) {
    const b = bac.get(n.id);
    if (!tang.has(b)) tang.set(b, []);
    tang.get(b).push(n);
  }
  const cha = new Map([...nut.keys()].map((k) => [k, []]));
  for (const c of canh) if (!quayLai.has(`${c.tu}>${c.den}`)) cha.get(c.den).push(c.tu);
  const viTri = new Map();
  for (const b of [...tang.keys()].sort((x, y) => x - y)) {
    const ds = tang.get(b);
    ds.sort((p, q) => {
      const tb = (n) => {
        const ps = cha.get(n.id).map((x) => viTri.get(x)).filter((x) => x !== undefined);
        return ps.length ? ps.reduce((a, x) => a + x, 0) / ps.length : n.thuTu;
      };
      return (tb(p) - tb(q)) || (p.thuTu - q.thuTu);
    });
    ds.forEach((n, k) => viTri.set(n.id, k));
  }

  /* KHE của một nút rộng hơn HỘP của nó khi cạnh đi vào có nhãn.
   *
   * Bốn nhánh của một nút quyết định mang bốn nhãn dài hơn hộp; xếp theo bề rộng hộp thì nhãn
   * của nhánh này thò sang nhánh kia, và lượt dồn chỗ phải đẩy chúng lên thành bậc thang. Nới
   * khe ngay từ đầu rẻ hơn: nhãn nằm đúng trên nhánh của nó, một hàng, đọc được. */
  for (const n of nut.values()) {
    const nhanVao = canh.filter((c) => c.den === n.id && c.nhan).map((c) => goEscape(c.nhan).length * RONG_NHAN);
    n.khe = Math.max(ngang ? n.cao : n.rong, nhanVao.length ? Math.max(...nhanVao) + 10 : 0);
  }

  // Toạ độ. Trục "dọc" là trục đi từ tầng này sang tầng sau; với LR thì nó là trục X.
  const bacs = [...tang.keys()].sort((x, y) => x - y);
  const dayTang = new Map();  // bề dày mỗi tầng theo trục tầng
  const dai = new Map();      // chiều dài mỗi tầng theo trục ngang của tầng
  for (const b of bacs) {
    const ds = tang.get(b);
    dayTang.set(b, Math.max(...ds.map((n) => (ngang ? n.rong : n.cao))));
    dai.set(b, ds.reduce((a, n) => a + n.khe, 0) + CACH_NUT * (ds.length - 1));
  }
  const daiToiDa = Math.max(...dai.values());
  let truc = LE;
  for (const b of bacs) {
    const ds = tang.get(b);
    let ke = LE + (daiToiDa - dai.get(b)) / 2;
    for (const n of ds) {
      // hộp căn giữa trong KHE của nó, và khe căn giữa trong bề dày của tầng
      const trongKhe = (n.khe - (ngang ? n.cao : n.rong)) / 2;
      if (ngang) { n.x = truc; n.y = ke + trongKhe; } else { n.x = ke + trongKhe; n.y = truc; }
      if (ngang) n.x += (dayTang.get(b) - n.rong) / 2; else n.y += (dayTang.get(b) - n.cao) / 2;
      ke += n.khe + CACH_NUT;
    }
    truc += dayTang.get(b) + CACH_BAC;
  }
  const W = ngang ? truc - CACH_BAC + LE : daiToiDa + LE * 2;
  const H = ngang ? daiToiDa + LE * 2 : truc - CACH_BAC + LE;

  const giua = (n) => ({ x: n.x + n.rong / 2, y: n.y + n.cao / 2 });
  const ra = [];

  /* Nhãn cạnh gom lại rồi mới xếp — KHÔNG vẽ ngay tại chỗ tính.
   *
   * Bản đầu đặt nhãn ở giữa đoạn ngang chung của cả chùm, và bốn nhánh của một nút quyết định
   * ra **cùng một toạ độ**: bốn nhãn chồng khít lên nhau thành một vệt chữ không đọc được. Thấy
   * ngay lượt chụp màn hình đầu tiên. Nên nhãn neo vào **nhánh của nó** (đoạn đi vào nút đích),
   * rồi một lượt dồn chỗ đẩy những nhãn còn đè nhau lên tầng trên. */
  /* Nút HỘI TỤ — nhiều cạnh có nhãn cùng đổ về một chỗ. Neo nhãn ở đầu ĐÍCH thì bốn nhãn xếp
     thành một cột trên đúng một nút, và không ai đọc ra nhãn nào của nhánh nào. Ca thật:
     `docs/TINH-NANG.md`, bốn nhánh không/có/không/có cùng đổ vào "CHẶN". Với những cạnh đó,
     neo nhãn ở đầu NGUỒN — nguồn thì mỗi cạnh một cái, nên nhãn tự tách. */
  const soNhanVao = new Map();
  for (const c of canh) if (c.nhan) soNhanVao.set(c.den, (soNhanVao.get(c.den) || 0) + 1);

  const nhanCanh = [];
  const leNgoai = ngang ? H - 6 : W - 6;
  for (const c of canh) {
    const a = nut.get(c.tu);
    const b = nut.get(c.den);
    const ga = giua(a);
    const gb = giua(b);
    const lui = quayLai.has(`${c.tu}>${c.den}`) || bac.get(c.den) <= bac.get(c.tu);
    let d;
    let nhanX;
    let nhanY;
    if (lui) {
      // Cạnh quay lại: đi vòng ra mép ngoài rồi trở về, để không cắt ngang thân lưu đồ.
      if (ngang) {
        const y = leNgoai;
        d = `M ${ga.x} ${a.y + a.cao} L ${ga.x} ${y} L ${gb.x} ${y} L ${gb.x} ${b.y + b.cao}`;
        nhanX = (ga.x + gb.x) / 2; nhanY = y - 5;
      } else {
        const x = leNgoai;
        d = `M ${a.x + a.rong} ${ga.y} L ${x} ${ga.y} L ${x} ${gb.y} L ${b.x + b.rong} ${gb.y}`;
        nhanX = x - 5; nhanY = (ga.y + gb.y) / 2;
      }
    } else if (ngang) {
      const x1 = a.x + a.rong;
      const x2 = b.x;
      const gx = (x1 + x2) / 2;
      d = Math.abs(ga.y - gb.y) < 2 ? `M ${x1} ${ga.y} L ${x2} ${gb.y}`
        : `M ${x1} ${ga.y} L ${gx} ${ga.y} L ${gx} ${gb.y} L ${x2} ${gb.y}`;
      // Neo vào nhánh riêng: đoạn ngang cuối, ngay trước khi vào nút đích.
      if ((soNhanVao.get(c.den) || 0) > 1) { nhanX = x1 + 26; nhanY = ga.y - 6; }
      else { nhanX = (gx + x2) / 2; nhanY = gb.y - 6; }
    } else {
      const y1 = a.y + a.cao;
      const y2 = b.y;
      const gy = (y1 + y2) / 2;
      d = Math.abs(ga.x - gb.x) < 2 ? `M ${ga.x} ${y1} L ${gb.x} ${y2}`
        : `M ${ga.x} ${y1} L ${ga.x} ${gy} L ${gb.x} ${gy} L ${gb.x} ${y2}`;
      if ((soNhanVao.get(c.den) || 0) > 1) { nhanX = ga.x + Math.sign(gb.x - ga.x) * 26; nhanY = y1 + 13; }
      else { nhanX = gb.x; nhanY = y2 - 7; }
    }
    ra.push(`<path d="${d}" class="ld-canh${c.kieu === "cham" ? " ld-dut" : ""}"${c.mui ? ` marker-end="url(#ld-mui)"` : ""}/>`);
    if (c.nhan) {
      const chu = goEscape(c.nhan);
      nhanCanh.push({ x: nhanX, y: nhanY, chu, rong: chu.length * RONG_NHAN });
    }
  }

  /* Dồn chỗ cho nhãn: hai nhãn cùng cao mà khoảng ngang giao nhau thì đẩy cái sau lên một tầng.
     Lặp tới khi hết đè — số nhãn một lưu đồ luôn nhỏ nên vòng lặp thô là đủ. */
  const daDat = [];
  for (const n of nhanCanh.sort((p, q) => p.y - q.y || p.x - q.x)) {
    let de = true;
    while (de) {
      de = daDat.some((m) => Math.abs(m.y - n.y) < 15
        && Math.abs(m.x - n.x) < (m.rong + n.rong) / 2 + 6);
      if (de) n.y -= 15;
    }
    daDat.push(n);
    ra.push(`<text x="${Math.round(n.x)}" y="${Math.round(n.y)}" class="ld-nhan-canh">${escXML(n.chu)}</text>`);
  }

  for (const n of nut.values()) {
    const g = giua(n);
    if (n.hinh === "thoi") {
      const p = [`${g.x},${n.y}`, `${n.x + n.rong},${g.y}`, `${g.x},${n.y + n.cao}`, `${n.x},${g.y}`].join(" ");
      ra.push(`<polygon points="${p}" class="ld-hop ld-thoi"/>`);
    } else {
      ra.push(`<rect x="${n.x}" y="${n.y}" width="${n.rong}" height="${n.cao}" rx="8" class="ld-hop"/>`);
    }
    const dauY = g.y - ((n.dong.length - 1) * CAO_MOI_DONG) / 2 + 4;
    n.dong.forEach((d, k) => {
      ra.push(`<text x="${Math.round(g.x)}" y="${Math.round(dauY + k * CAO_MOI_DONG)}" class="ld-chu">${escXML(d)}</text>`);
    });
  }

  return `<svg class="luu-do" viewBox="0 0 ${Math.round(W)} ${Math.round(H)}" `
    + `style="max-width:${Math.round(W)}px" role="img" xmlns="http://www.w3.org/2000/svg">`
    + `<defs><marker id="ld-mui" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" `
    + `orient="auto-start-reverse"><path d="M0,1 L7,4 L0,7 z" class="ld-mui"/></marker></defs>`
    + ra.join("") + `</svg>`;
}

/** CSS đi kèm. Để cạnh bộ vẽ chứ không nằm trong `build-overview.mjs`: hình và màu của nó là
 *  một thứ, sửa một chỗ. Toàn bộ màu lấy từ biến của trang nên lưu đồ tự đổi theo nền sáng/tối. */
export const CSS_LUU_DO = `
svg.luu-do{display:block;width:100%;height:auto;margin:14px auto 6px}
svg.luu-do .ld-hop{fill:var(--mat);stroke:var(--vien);stroke-width:1.2}
svg.luu-do .ld-thoi{fill:var(--nhan-nen);stroke:var(--nhan);stroke-width:1.3}
svg.luu-do .ld-chu{fill:var(--chu);font-family:var(--sans);font-size:${CO_CHU}px;text-anchor:middle;dominant-baseline:middle}
svg.luu-do .ld-canh{fill:none;stroke:var(--vien2);stroke-width:1.5}
svg.luu-do .ld-dut{stroke-dasharray:5 4}
svg.luu-do .ld-mui{fill:var(--vien2)}
svg.luu-do .ld-nhan-canh{fill:var(--mo);font-family:var(--mono);font-size:10.6px;text-anchor:middle;
  paint-order:stroke;stroke:var(--nen);stroke-width:4px;stroke-linejoin:round}
/* Đường LÙI: vẽ không được thì in mã nguồn. Kiểu dáng để cạnh bộ vẽ, không để trong CSS chung —
   ai xoá bộ vẽ thì xoá luôn kiểu dáng của nó, không để lại luật mồ côi. */
pre.mermaid{background:var(--mat);border:1px solid var(--vien);border-radius:10px;padding:16px;
  overflow-x:auto;margin:14px 0 0;text-align:left;font-size:12.4px}
p.luu-do-hong{margin:6px 0 12px;font-family:var(--mono);font-size:11px;color:var(--mo)}
`;
