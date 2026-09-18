/* GIẢI TARGET THEO DANH TÍNH — Gap 3 của `duc-scouter/v0.1.0/docs/UNIVERSAL-SCOUTER.md`.
 *
 * ─── VÌ SAO FILE NÀY TỒN TẠI, ĐO ĐƯỢC CHỨ KHÔNG PHỎNG ĐOÁN ──────────────────
 * `timTab()` ở `goi-bridge.mjs` khớp bằng TIỀN TỐ URL rồi trả luôn. Ba phép đo 17–18/09 cho
 * thấy từng ấy là không đủ, và mỗi phép hỏng một kiểu khác nhau:
 *
 *   ⑴ Lượt gọi Bridge ĐẦU TIÊN của phiên trả `TARGET_AMBIGUOUS — More than one extension
 *      session is connected`. Tức chọn GHẾ là một chặng thật, không phải chi tiết cấu hình.
 *   ⑵ `https://chatgpt.com/` khớp **5** target ở một ghế, `docs.google.com` khớp **2**.
 *      Ambiguity là MẶC ĐỊNH trong trình duyệt của người thật, không phải ngoại lệ.
 *   ⑶ Ba tài khoản Vizcom dùng **cùng một origin và cùng một hình dạng URL**. Không một phép
 *      lọc URL nào phân biệt được chúng. Chỉ trang tự khai nó là ai.
 *
 * Nên chuỗi ở đây là: ghế → loại → lược đồ → URL → DANH TÍNH → đúng một, hoặc từ chối.
 *
 * ─── HAI ĐIỀU FILE NÀY CỐ Ý KHÔNG BIẾT ──────────────────────────────────────
 * Nó không biết trang nào cả. `danh_tinh` — cặp `{ selector, chua }` chứng minh *"đúng trang,
 * đúng tài khoản"* — **đến từ adapter**, luôn luôn. Gõ một selector vào file này là dựng lại
 * đúng cái ranh giới mà cả nghiên cứu đi chứng minh là phải giữ.
 *
 * Nó cũng không mở `chrome.*`, không chạm CDP. Nó chỉ tiêu thụ từ vựng chung `scout.*`.
 */

/** Mã lỗi. Mỗi mã phải dẫn tới một HÀNH ĐỘNG KHÁC NHAU của người đọc — hai mã cùng một cách
 *  xử là một mã thừa, và một mã gộp hai cách xử là một mã nói dối. */
export const MA = {
  GHE_CHUA_KHAI: "GHE_CHUA_KHAI",
  TARGET_NOT_FOUND: "TARGET_NOT_FOUND",
  DANH_TINH_LECH: "DANH_TINH_LECH",
  TARGET_AMBIGUOUS: "TARGET_AMBIGUOUS",
  /* Chỉ `khoaDanhTinh` trả hai mã này, và chúng KHÁC `TARGET_NOT_FOUND`/`DANH_TINH_LECH` vì
   * dẫn tới hành động khác: ở đây target ĐÃ từng được chứng minh đúng rồi mới trượt. */
  TARGET_BIEN_MAT: "TARGET_BIEN_MAT",
  DANH_TINH_MAT: "DANH_TINH_MAT"
};

/* Hai lược đồ này KHÔNG BAO GIỜ là target của một trang web, và đo được là chúng từ chối ở
 * 6–20ms với một lỗi khác hẳn lỗi treo. Lọc chúng ở đây là tiết kiệm thật, không phải dọn dẹp:
 * bảng bên của chính extension nằm trong `chrome-extension://`, và nó khớp mọi phép lọc lỏng. */
const LUOC_DO_BO = ["chrome://", "chrome-extension://", "devtools://", "chrome-untrusted://"];

/**
 * @param {{ goi: Function, soGhe?: Record<string, {tai_khoan?: string, nhan?: string}> }} dat
 *   `goi` — hàm gọi Bridge của `taoGoiBridge`. `soGhe` — SỔ GHẾ: bản đồ
 *   `instance_id → { tai_khoan }` do người điền, nằm NGOÀI repo. Thiếu sổ thì resolver vẫn
 *   chạy, nhưng nó **nói ra** rằng danh tính chỉ đến từ trang.
 */
/* TÀI KHOẢN SUY TỪ NHÃN GHẾ — Đức chốt 18/09: *"từ sau tôi sẽ đặt tên là được, để identify."*
 *
 * ─── NÓ MUA GÌ, VÀ ĐẶC BIỆT LÀ NÓ KHÔNG MUA GÌ ─────────────────────────────
 * MUA: **địa chỉ**. Trước bản này, sổ ghế (`soGhe`) là đường DUY NHẤT để nói *"ghế nào là tài
 * khoản nào"*, mà sổ ấy là một tệp thứ hai nằm ngoài repo và chưa ai điền — nên câu `tai_khoan`
 * của adapter thực tế không chọn được ghế nào cả. Nhãn thì Đức gõ ngay trong bảng bên, một chỗ,
 * và máy chủ đã chở sẵn nó về trong `bridge.sessions`.
 *
 * KHÔNG MUA: **danh tính**. Nhãn là thứ NGƯỜI GÕ; danh tính phải là thứ TRANG KHAI. Đó là luật
 * của chính Đức, chốt 18/09 khi ông bỏ tên workspace để lấy email làm `danh_tinh`: *"một cái tên
 * workspace là thứ người ta đặt được... không ai được thêm vào một địa chỉ email."* Một nhãn ghế
 * còn yếu hơn một tên workspace — nó là lời khai CỦA TA VỀ GHẾ, không phải lời khai CỦA GHẾ.
 * Nên hàm này chỉ được dùng để **thu hẹp xem hỏi ghế nào**; chặng `danh_tinh` vẫn quyết, và
 * `DANH_TINH_LECH` vẫn chặn y nguyên. Ai nối nó thẳng vào đường ghi là đã đổi luật an toàn.
 *
 * ─── TỪ CHỐI, KHÔNG ĐOÁN ───────────────────────────────────────────────────
 * Quy ước: `"<site> <tài-khoản>"`, đúng HAI phần. Đo 18/09 trên năm ghế thật:
 *     "Vizcom Anhducds"  → site khớp, đúng hai phần → `anhducds`
 *     "Vizcom Ducna10"   → site khớp, đúng hai phần → `ducna10`
 *     "Scouter_blank"    → site KHÔNG khớp          → null
 *     ""                 → rỗng                     → null
 * Ba phần trở lên cũng trả `null`: `"Vizcom Anh Duc"` không đọc được thành một tài khoản, và
 * đoán bừa phần nào là tên thì có ngày đoán trúng một tài khoản KHÁC đang mở cạnh đó. Một nhãn
 * sai chính tả phải **im lặng không khớp ghế nào** rồi để chặng sau kêu, chứ không được khớp
 * nhầm — đó là khác biệt giữa "không chạy" và "ghi nhầm tài khoản".
 *
 * @param {string} nhan  nhãn ghế do máy chủ trả (`bridge.sessions[].label`)
 * @param {string} site  `id` của adapter — `"vizcom"`, `"udin"`, …
 * @returns {string|null} tài khoản viết thường, hoặc `null` nếu nhãn không theo quy ước.
 */
export function taiKhoanTuNhan(nhan, site) {
  if (typeof nhan !== "string" || typeof site !== "string" || !site) return null;
  const phan = nhan.trim().split(/\s+/).filter(Boolean);
  if (phan.length !== 2) return null;
  if (phan[0].toLowerCase() !== site.toLowerCase()) return null;
  return phan[1].toLowerCase();
}

export function taoGiaiTarget({ goi, soGhe = null, site = null }) {
  if (typeof goi !== "function") throw new Error("taoGiaiTarget: thiếu `goi`.");

  /** Kiểm kê ghế. Máy chủ đã trả `instance_id` + nhãn sẵn, nên Gap 1 KHÔNG cần đổi extension.
   *
   * `dia_chi` LUÔN là `instance_id`, không bao giờ là nhãn — và đó không phải chuyện phong cách.
   * Đo 18/09: Đức cài Scouter lên hai profile mới, cả hai ghế lên dây với **nhãn RỖNG**. Gọi
   * bằng nhãn thì `target` thành chuỗi rỗng, máy chủ không thấy đích nào và trả
   * `TARGET_AMBIGUOUS` — tức một ghế chưa đặt tên là một ghế **không gọi tới được**. `instance_id`
   * thì máy sinh, luôn có, và không trùng. Nhãn để người đọc, `instance_id` để máy gọi.
   *
   * Cùng lý do đó, KẾT QUẢ trả về đặt `ghe` = **địa chỉ**, còn nhãn đi dưới tên `ghe_nhan`.
   * Bản đầu làm ngược lại và tôi tự vấp ngay lượt chạy E2E đầu tiên: người gọi cầm `r.ghe`
   * ném thẳng vào lượt gọi tiếp theo — đó là việc hiển nhiên phải làm — và nhận
   * `TARGET_NOT_CONNECTED` vì cầm phải cái nhãn. Trường nào tên tự nhiên nhất thì phải là
   * trường dùng được. */
  const lietKeGhe = async () => {
    const ket = await goi("bridge.sessions", {});
    return (ket.sessions || []).map((s) => ({
      nhan: s.label || "",
      instance_id: s.instance_id,
      dia_chi: s.instance_id,
      /* HAI NGUỒN, THỨ TỰ CÓ CHỦ Ý: sổ ghế thắng nhãn. Sổ là thứ người ta ngồi xuống điền có
       * chủ đích; nhãn là thứ gõ nhanh trong bảng bên và dễ để nguyên từ profile trước. Và
       * `nguon_tai_khoan` đi kèm chứ không bị nuốt — người đọc kết quả phải biết cái tên ấy
       * đến từ đâu, vì hai nguồn KHÔNG cùng độ tin. */
      tai_khoan: soGhe?.[s.instance_id]?.tai_khoan ?? taiKhoanTuNhan(s.label || "", site) ?? null,
      nguon_tai_khoan: soGhe?.[s.instance_id]?.tai_khoan ? "so-ghe"
        : (taiKhoanTuNhan(s.label || "", site) ? "nhan" : null),
      noi_luc: s.connected_at
    }));
  };

  /* HAI ĐƯỜNG ĐỌC DANH TÍNH, và đường thứ hai không phải cho tiện.
   *
   * `{ selector, chua }` đi qua `scout.text` — hợp khi dấu hiệu nằm trong một phần tử có
   * selector lấy được từ bằng chứng DOM thật.
   *
   * `{ a11y_chua }` đi qua `scout.a11y` — và nó tồn tại vì một ca đo được: dấu hiệu phân biệt
   * ba tài khoản Vizcom là chuỗi `…@gmail.com` nằm trong một `StaticText`. `scout.page` chỉ
   * liệt kê phần tử TƯƠNG TÁC nên không với tới nó, còn `scout.tree` che thuộc tính (ADR-0006).
   * Không có đường này thì lối duy nhất còn lại là **đoán một selector** — thứ luật gói cấm
   * thẳng, và cấm có lý do: một selector đoán sai vẫn khớp, chỉ khớp nhầm tài khoản.
   *
   * Cả hai đều là chuỗi do ADAPTER khai. File này không biết chuỗi nào có nghĩa gì. */
  const docDanhTinh = async (uv, dt) => {
    if (dt.a11y_chua !== undefined) {
      const r = await goi("scout.a11y", { target_id: uv.target_id }, { ghe: uv.ghe });
      const ten = (r.data.nodes || []).map((n) => n.name || "");
      const hit = ten.filter((t) => t.includes(dt.a11y_chua));
      return { khop: hit.length > 0, doc_duoc: hit[0] ?? `(${ten.length} node có tên, không cái nào chứa dấu hiệu)` };
    }
    const r = await goi("scout.text", { selector: dt.selector, target_id: uv.target_id }, { ghe: uv.ghe });
    const chu = String(r.data.text ?? "");
    return { khop: chu.includes(dt.chua), doc_duoc: chu };
  };

  /* DANH TÍNH PHỤ — đọc để IN RA, không bao giờ để quyết định.
   *
   * Đức chốt 18/09: *"identity chính ưu tiên email/account marker; workspace/plan chỉ
   * supplementary"*. Nên hàm này không trả `ok`, và không người gọi nào trong file này rẽ
   * nhánh theo nó — nó chỉ gắn thêm `{ chua, doc_duoc, khop }` vào kết quả. Một trường phụ
   * lệch được IN, không được CHẶN: cho nó quyền chặn là lặng lẽ nâng nó lên thành cổng chính,
   * đúng cái Đức vừa bỏ.
   *
   * Chỉ chạy trên ứng viên ĐÃ THẮNG. Đọc phụ trên các ứng viên bị loại là tiêu thêm lượt gọi
   * lên hai tài khoản kia mà không đổi được kết luận nào. */
  const docPhu = async (uv, phu) => {
    if (!phu) return null;
    try {
      const kq = await docDanhTinh(uv, phu);
      return { chua: phu.chua ?? phu.a11y_chua, doc_duoc: String(kq.doc_duoc).slice(0, 120), khop: kq.khop };
    } catch (loi) {
      return { chua: phu.chua ?? phu.a11y_chua, doc_duoc: null, khop: null, loi: String(loi.message).slice(0, 120) };
    }
  };

  /**
   * discover → ghế → loại → lược đồ → URL → DANH TÍNH → đúng một hoặc từ chối.
   *
   * @param {{ origin: string,
   *           danh_tinh: { selector?: string, chua?: string, a11y_chua?: string },
   *           ghe?: string|string[],
   *           tai_khoan?: string }} khai  — tất cả đến từ adapter.
   */
  const giai = async (khai) => {
    const { origin, danh_tinh, ghe, tai_khoan } = khai || {};
    if (typeof origin !== "string" || !origin) throw new Error("giai: thiếu `origin`.");
    const coA11y = typeof danh_tinh?.a11y_chua === "string" && danh_tinh.a11y_chua.length > 0;
    const coSel = Boolean(danh_tinh?.selector) && typeof danh_tinh?.chua === "string";
    if (!coA11y && !coSel) {
      /* Ném chứ không trả mã lỗi: thiếu `danh_tinh` không phải một kết quả giải target, nó là
       * một adapter viết sai. Trả mã lỗi ở đây là mời người gọi bắt rồi bỏ qua. */
      throw new Error("giai: adapter phải khai `danh_tinh` — `{ selector, chua }` hoặc `{ a11y_chua }`. Đó là thứ DUY NHẤT phân biệt hai trang cùng URL.");
    }

    const moiGhe = await lietKeGhe();
    if (!moiGhe.length) return { ok: false, ma: MA.GHE_CHUA_KHAI, da_hoi: [], ly_do: "không ghế Scouter nào đang nối." };

    /* Chọn ghế. KHÔNG có đường "ghế mặc định": không khai thì hỏi HẾT, rồi để chặng danh tính
     * quyết — chứ không phải để chặng này đoán. */
    let ghePhaiHoi = moiGhe;
    if (ghe) {
      const muon = Array.isArray(ghe) ? ghe : [ghe];
      ghePhaiHoi = moiGhe.filter((g) => muon.includes(g.nhan) || muon.includes(g.instance_id));
      if (!ghePhaiHoi.length) {
        return { ok: false, ma: MA.GHE_CHUA_KHAI, da_hoi: moiGhe.map((g) => g.nhan || g.instance_id),
          ly_do: `adapter đòi ghế ${JSON.stringify(muon)}, không ghế nào đang nối mang tên đó.` };
      }
    } else if (tai_khoan) {
      /* BỎ ĐIỀU KIỆN `&& soGhe` (18/09). Trước bản này nhánh này chỉ chạy khi có sổ ghế, mà sổ
       * ghế chưa ai điền — nên `tai_khoan` của adapter là một trường CHẾT: khai nó ra không thu
       * hẹp được ghế nào. Nay `lietKeGhe` điền `tai_khoan` từ nhãn nữa, nên nhánh này sống.
       * Nó vẫn chỉ THU HẸP; chặng `danh_tinh` bên dưới vẫn là chặng quyết. */
      const hop = moiGhe.filter((g) => g.tai_khoan === tai_khoan);
      if (!hop.length) {
        return { ok: false, ma: MA.GHE_CHUA_KHAI, da_hoi: moiGhe.map((g) => g.nhan || g.instance_id),
          ly_do: `sổ ghế không có ghế nào khai tài khoản "${tai_khoan}".` };
      }
      ghePhaiHoi = hop;
    }

    /* Gom ứng viên từ MỌI ghế phải hỏi trước khi xét bất cứ cái nào. Xét-rồi-dừng là
     * first-match đội lốt vòng lặp. */
    const ungVien = [];
    const daHoi = [];
    for (const g of ghePhaiHoi) {
      const tg = await goi("scout.targets", {}, { ghe: g.dia_chi });
      const trang = tg.data.targets.filter((t) => t.type === "page");
      const hop = trang.filter((t) => t.url.startsWith(origin) && !LUOC_DO_BO.some((l) => t.url.startsWith(l)));
      daHoi.push({ ghe: g.dia_chi, ghe_nhan: g.nhan || "(không nhãn)", tong: tg.data.targets.length, trang: trang.length, hop: hop.length });
      for (const t of hop) ungVien.push({ ghe: g.dia_chi, ghe_nhan: g.nhan || "(không nhãn)", target_id: t.targetId, url: t.url, tieu_de: t.title });
    }

    if (!ungVien.length) {
      return { ok: false, ma: MA.TARGET_NOT_FOUND, da_hoi: daHoi,
        ly_do: `không target nào ở ${origin}. Đã hỏi ${daHoi.length} ghế — nếu trang đang mở ở một profile KHÔNG có Scouter thì ghế nào cũng trả 0.` };
    }

    /* DANH TÍNH. Đây là chặng duy nhất phân biệt được ba tài khoản cùng origin.
     * Ứng viên đọc không ra **được ghi lại chứ không bị giấu**: một ứng viên im lặng biến mất
     * là cách một ca ambiguous hoá trang thành một UNIQUE giả. */
    const khop = [];
    const lech = [];
    const khongDocDuoc = [];
    for (const uv of ungVien) {
      try {
        const kq = await docDanhTinh(uv, danh_tinh);
        const ghiNhan = { ...uv, doc_duoc: String(kq.doc_duoc).slice(0, 120) };
        if (kq.khop) khop.push(ghiNhan); else lech.push(ghiNhan);
      } catch (loi) {
        khongDocDuoc.push({ ...uv, loi: String(loi.message).slice(0, 120) });
      }
    }

    const nen = { da_hoi: daHoi, ung_vien: ungVien.length, khop: khop.length, lech, khong_doc_duoc: khongDocDuoc };

    if (khop.length === 1) return { ok: true, ...khop[0], ...nen, phu: await docPhu(khop[0], khai.danh_tinh_phu) };
    if (khop.length === 0) {
      return { ok: false, ma: MA.DANH_TINH_LECH, ...nen,
        ly_do: `${ungVien.length} target đúng origin, không cái nào đọc ra "${danh_tinh.chua}" qua \`${danh_tinh.selector}\`. Đúng URL không có nghĩa đúng trang — và với nhiều tài khoản cùng một site, đúng URL còn không có nghĩa đúng người.` };
    }
    return { ok: false, ma: MA.TARGET_AMBIGUOUS, ...nen, trung: khop,
      ly_do: `${khop.length} target cùng thoả danh tính. DỪNG — người chọn, máy không chọn hộ.` };
  };

  /**
   * KHOÁ DANH TÍNH — chạy NGAY TRƯỚC mỗi lượt GHI, và NGAY SAU mỗi lần điều hướng.
   *
   * ─── VÌ SAO MỘT LƯỢT GIẢI TARGET KHÔNG ĐỦ CHO CẢ PHIÊN ────────────────────
   * `G-102` đo được: `target_id` **sống qua điều hướng SPA cùng nguồn** — URL đổi mà id giữ
   * nguyên. Nên câu *"vẫn đúng target"* KHÔNG kéo theo *"vẫn đúng tài khoản"*: một cú bấm sang
   * workspace khác, hay một lượt đăng xuất rồi đăng nhập tài khoản kia, giữ nguyên id. Kết quả
   * của `giai()` là một phép đo tại MỘT thời điểm; dùng lại nó cho một lượt ghi xảy ra sau đó
   * là đọc một điểm thành một đường thẳng.
   *
   * ─── BA CÁCH TRƯỢT, BA MÃ KHÁC NHAU ───────────────────────────────────────
   *   target không còn trong danh sách ghế ấy   → TARGET_BIEN_MAT
   *   URL rời khỏi `origin` đã khai             → TARGET_BIEN_MAT (kèm `url`)
   *   đọc danh tính không khớp, hoặc đọc không ra → DANH_TINH_MAT
   *
   * ĐỌC KHÔNG RA CŨNG LÀ TRƯỢT. Một bộ khoá coi "không đọc được" là "chắc vẫn đúng" thì nó
   * mở đúng vào lúc trang đang ở trạng thái nó không hiểu — tức đúng lúc nguy hiểm nhất.
   *
   * @param {{ghe: string, target_id: string, origin: string,
   *           danh_tinh: object, danh_tinh_phu?: object}} khai
   * @returns {Promise<{ok: boolean, ma?: string, url?: string, bang_chung?: string,
   *                    phu?: object|null, ly_do?: string}>}  KHÔNG ném — người gọi phải in
   *          được bằng chứng của lượt từ chối, chứ không bắt một exception rồi mất nó.
   */
  const khoaDanhTinh = async ({ ghe, target_id, origin, danh_tinh, danh_tinh_phu = null }) => {
    if (!ghe || !target_id) throw new Error("khoaDanhTinh: thiếu `ghe` hoặc `target_id`.");
    if (!danh_tinh) throw new Error("khoaDanhTinh: thiếu `danh_tinh` — không có gì để khoá.");

    let tg;
    try {
      tg = await goi("scout.targets", {}, { ghe });
    } catch (loi) {
      return { ok: false, ma: MA.TARGET_BIEN_MAT, ly_do: `không hỏi được ghế ${ghe}: ${String(loi.message).slice(0, 120)}` };
    }
    const con = (tg.data.targets || []).find((t) => t.targetId === target_id);
    if (!con) {
      return { ok: false, ma: MA.TARGET_BIEN_MAT, ly_do: `target ${target_id} không còn ở ghế ${ghe} — cửa sổ đã đóng, hoặc đã sang ghế khác.` };
    }
    if (origin && !con.url.startsWith(origin)) {
      return { ok: false, ma: MA.TARGET_BIEN_MAT, url: con.url,
        ly_do: `target còn sống nhưng đã rời ${origin} sang ${con.url}. Cùng một id, khác một trang.` };
    }

    const uv = { ghe, target_id };
    let kq;
    try {
      kq = await docDanhTinh(uv, danh_tinh);
    } catch (loi) {
      return { ok: false, ma: MA.DANH_TINH_MAT, url: con.url,
        ly_do: `đọc danh tính không ra: ${String(loi.message).slice(0, 120)}. Không đọc được KHÔNG phải là vẫn đúng.` };
    }
    const bangChung = String(kq.doc_duoc).slice(0, 120);
    if (!kq.khop) {
      return { ok: false, ma: MA.DANH_TINH_MAT, url: con.url, bang_chung: bangChung,
        ly_do: `dấu hiệu danh tính không còn đọc ra được trên target này. DỪNG.` };
    }
    return { ok: true, url: con.url, bang_chung: bangChung, phu: await docPhu(uv, danh_tinh_phu) };
  };

  return { lietKeGhe, giai, khoaDanhTinh, MA };
}
