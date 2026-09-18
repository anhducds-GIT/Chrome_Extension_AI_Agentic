/* CÂN CHI PHÍ CONTEXT — bọc quanh `goi`, đo mỗi lượt gọi Bridge tốn bao nhiêu.
 *
 * ─── VÌ SAO CẦN CÂN TRƯỚC KHI TỐI ƯU ───────────────────────────────────────
 * Pilot Vizcom 18/09 gọi `scout.a11y` nhiều lượt, mỗi lượt trả hàng trăm node, chỉ để trả
 * lời một câu rất hẹp — *"trang có chuỗi email này không"*. Nghi là đắt thì dễ; biết đắt bao
 * nhiêu, ở method nào, thì phải đo. File này là cái cân, và nó **không** tự tối ưu gì cả:
 * một bộ vừa đo vừa sửa thì không ai biết con số nào là trước, con số nào là sau.
 *
 * ─── HAI CON SỐ, VÀ ĐỪNG GỘP CHÚNG ─────────────────────────────────────────
 * `bytes_tho`  — payload trình duyệt trả về Node. Tốn dây, tốn RAM, **không** tốn context.
 * `chu_cho_ai` — chữ THỰC SỰ đi vào context của AI. Đây mới là thứ đắt.
 *
 * Gộp hai cái là bỏ mất chỗ tiết kiệm lớn nhất: cùng một lượt gọi, cùng một `bytes_tho`, mà
 * `chu_cho_ai` có thể chênh nhau hai bậc — tuỳ Node **rút gọn trước** hay **đổ nguyên** cho AI.
 * Nên cái cân đo `bytes_tho` tự động, còn `chu_cho_ai` thì người gọi phải **khai**: nó là
 * chuỗi mà mode ấy quyết định đưa cho AI. Không khai thì tính 0 và ghi rõ là chưa khai.
 *
 * ─── KHÔNG QUY CHỮ RA TOKEN ────────────────────────────────────────────────
 * Cái cân này không biết bộ tách token của model, nên nó **không** nhân một hệ số rồi gọi đó
 * là usage. Trường `token_that` luôn là `null` — chỗ nào cần token thật thì đọc từ runtime,
 * không đọc từ đây. Một con số ước lượng mặc áo con số đo được là thứ khó bóc ra nhất về sau.
 */

/** Đếm node trả về, theo hình dạng của từng phép dò. Không có thì `null` — đừng đoán 0, vì
 *  "0 node" và "phép dò này không có khái niệm node" là hai chuyện khác nhau. */
function demNode(data) {
  if (!data || typeof data !== "object") return null;
  if (Array.isArray(data.nodes)) return data.nodes.length;
  if (Array.isArray(data.targets)) return data.targets.length;
  if (Array.isArray(data.matches)) return data.matches.length;
  if (data.elements && typeof data.elements.total === "number") return data.elements.total;
  if (typeof data.matchCount === "number") return data.matchCount;
  return null;
}

/**
 * @param {Function} goi  hàm gọi Bridge thật.
 * @param {{viec?: string}} dat  `viec` — tên task/lượt, để tách sổ khi chạy nhiều ca.
 * @returns {{goi: Function, so: object[], khaiChoAi: Function, tomTat: Function}}
 */
export function taoCanChiPhi(goi, { viec = "khong-ten" } = {}) {
  const so = [];
  let choAi = 0;

  const goiCoCan = async (method, params = {}, tuyChon = {}) => {
    const batDau = Date.now();
    let ket = null, loi = null;
    try {
      ket = await goi(method, params, tuyChon);
    } catch (e) {
      loi = String(e?.message ?? e);
    }
    const tho = ket === null ? 0 : Buffer.byteLength(JSON.stringify(ket), "utf8");
    const d = ket?.data ?? null;
    so.push({
      luc: new Date().toISOString(),
      viec,
      method,
      target_id: params.target_id ?? null,
      so_node: demNode(d),
      truncated: d && typeof d.truncated === "boolean" ? d.truncated : null,
      ms: Date.now() - batDau,
      bytes_tho: tho,
      loi
    });
    if (loi) throw new Error(loi);
    return ket;
  };

  /** Khai chuỗi mà mode này ĐƯA CHO AI. Gọi bao nhiêu lần cũng được, cộng dồn. */
  const khaiChoAi = (chu) => { choAi += String(chu ?? "").length; return chu; };

  const tomTat = () => {
    const theoMethod = {};
    for (const x of so) {
      const m = (theoMethod[x.method] ??= { luot: 0, bytes_tho: 0, ms: 0, node: 0 });
      m.luot += 1; m.bytes_tho += x.bytes_tho; m.ms += x.ms; m.node += x.so_node ?? 0;
    }
    return {
      viec,
      luot_goi: so.length,
      bcb_tho: so.reduce((t, x) => t + x.bytes_tho, 0),
      bcb_model: choAi,
      ms_tong: so.reduce((t, x) => t + x.ms, 0),
      token_that: null,   /* xem khối đầu file: cái cân này KHÔNG bịa token */
      theo_method: theoMethod
    };
  };

  return { goi: goiCoCan, so, khaiChoAi, tomTat };
}

/** Tỉ lệ bằng chứng hữu ích: bao nhiêu chữ đưa cho AI thực sự dùng để ra kết luận.
 *  Trả nhãn thô CAO/TRUNG/THẤP kèm con số — Đức đòi đúng thế, và một tỉ số ba chữ số thập
 *  phân ở đây sẽ giả vờ chính xác hơn thứ nó đo được. */
export function tiLeHuuIch(chuDung, chuDuaVao) {
  if (!chuDuaVao) return { ti_le: null, nhan: "KHONG_DO_DUOC" };
  const t = chuDung / chuDuaVao;
  return { ti_le: t, nhan: t >= 0.25 ? "CAO" : t >= 0.02 ? "TRUNG" : "THAP" };
}
