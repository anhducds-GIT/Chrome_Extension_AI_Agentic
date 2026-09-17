/* Udin Optic — LIỆT KÊ GHẾ đang nối, và chỉ đích danh những ghế TRÙNG TÊN.
 *
 * ─── VÌ SAO FILE NÀY TỒN TẠI ───────────────────────────────────────────────
 * Đức mở hai cửa sổ Chrome, tách ra, cả hai cùng cắm extension Udin, rồi nói thẳng cái sắp
 * xảy ra: *"bạn sẽ có thể gặp một tình trạng là trùng tên gọi và trùng tên profile."*
 *
 * Anh đúng, và chỗ hỏng nằm ở một khoảng mù CÓ THẬT: **bảng bên chỉ thấy ghế của chính nó.**
 * Đo 16/09 (`G-96`): extension chỉ TRẢ LỜI, nó không phát đi được yêu cầu nào ra dây, nên nó
 * không có cách nào hỏi *"còn ghế nào khác đang mang tên này không"*. Bảng bên cảnh báo được
 * bằng chữ, nhưng **không kiểm được**. Phép kiểm ấy phải đứng ở đây — phía gọi, nơi hỏi được
 * máy chủ bằng `bridge.sessions`.
 *
 * ─── HỎNG THẾ NÀO KHI TRÙNG ────────────────────────────────────────────────
 * `target` đi thẳng xuống máy chủ, và máy chủ phân giải nhãn → ghế. Hai ghế cùng nhãn thì nó
 * trả `TARGET_AMBIGUOUS` — tức **quay lại đúng chỗ hỏng lúc chưa ai có tên**, chỉ khác là lần
 * này có danh sách ứng viên. File này làm cái danh sách ấy hiện ra TRƯỚC khi hỏng.
 *
 *   node workers/udin-optic/tu-dong/chon-ghe.mjs
 *   node workers/udin-optic/tu-dong/chon-ghe.mjs --json
 */
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { goi as goiThat } from "./goi-bridge.mjs";

/** Bao lâu rồi không thấy ghế này — đọc ra tuổi, không đọc ra một mốc ISO. */
export function tuoi(lucCuoi, bayGio = Date.now()) {
  const giay = Math.max(0, Math.round((bayGio - new Date(lucCuoi).getTime()) / 1000));
  if (!Number.isFinite(giay)) return "?";
  if (giay < 60) return `${giay}s trước`;
  if (giay < 3600) return `${Math.round(giay / 60)} phút trước`;
  return `${Math.round(giay / 3600)} giờ trước`;
}

/**
 * Xếp ghế thành bảng, và **đánh dấu ghế trùng tên**.
 *
 * Ghế KHÔNG TÊN không bị tính là trùng nhau, và đó là một phân biệt thật chứ không phải chi
 * tiết: hai ghế cùng chưa đặt tên thì không ai gọi chúng bằng tên cả, nên chưa có gì hỏng —
 * thứ hỏng là hai ghế cùng mang MỘT cái tên, vì lúc đó gọi tên ấy không trúng ghế nào.
 */
export function xepGhe(sessions, bayGio = Date.now()) {
  const ds = Array.isArray(sessions) ? sessions : [];
  const dem = new Map();
  for (const s of ds) {
    const n = String(s?.label ?? "").trim();
    if (n) dem.set(n, (dem.get(n) || 0) + 1);
  }
  return ds.map((s, i) => {
    const nhan = String(s?.label ?? "").trim();
    return {
      so: i + 1,
      id: String(s?.instance_id ?? ""),
      nhan: nhan || null,
      /* MỘT lớp canh, không hai. `dem` đã bỏ qua ghế không tên ở vòng trên, nên hỏi lại
       * `nhan ? … : false` ở đây là lớp thứ hai canh cùng một thứ — và một con đột biến gỡ
       * lớp trên vẫn sống sót vì lớp dưới che mất. Chốt thừa không phải chốt chắc hơn: nó
       * làm bộ đo mù đúng chỗ nó tưởng mình đang canh. */
      trung: (dem.get(nhan) || 0) > 1,
      tuoi: tuoi(s?.last_seen_at, bayGio),
    };
  });
}

/** Tên riêng gợi ý cho một ghế, suy từ chính Profile ID của nó. Hai ghế khác id thì khác tên. */
export function tenGoiY(id) {
  const s = String(id ?? "").replace(/[^A-Za-z0-9]/g, "");
  if (s.length < 4) return null;
  return `udin-${s.slice(0, 6).toLowerCase()}`;
}

export async function lietKe(tuyChon = {}) {
  const goi = tuyChon.goi || goiThat;
  const r = await goi("bridge.sessions", {}, tuyChon);
  /* `r?.` giữ lại, `|| []` bỏ đi: `xepGhe` đã tự canh mảng rỗng, nên `|| []` là lớp thứ hai.
   * Thứ `r?.` canh thì KHÁC hẳn — máy chủ trả thẳng `null` thì `r.sessions` ném, và đó là ca
   * duy nhất phân biệt được hai bản. */
  return xepGhe(r?.sessions, tuyChon.bayGio);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  lietKe()
    .then((ds) => {
      if (process.argv.includes("--json")) { console.log(JSON.stringify(ds, null, 2)); return; }
      if (ds.length === 0) {
        console.log("Không có ghế nào đang nối. Mở bảng bên Udin, chọn tệp ghép cặp, rồi chạy lại.");
        return;
      }
      console.log(`${ds.length} ghế đang nối:\n`);
      for (const g of ds) {
        const ten = g.nhan ? (g.trung ? `${g.nhan}  ← TRÙNG TÊN` : g.nhan) : "(chưa đặt tên)";
        console.log(`  ${g.so}) ${ten}`);
        console.log(`     ${g.id}   ·   ${g.tuoi}`);
        console.log(`     UDIN_GHE=${g.id}`);
        if (!g.nhan || g.trung) console.log(`     đặt tên riêng: ${tenGoiY(g.id)}`);
        console.log("");
      }
      const trung = ds.filter((g) => g.trung);
      if (trung.length) {
        console.log(
          `CẢNH BÁO: ${trung.length} ghế đang dùng chung tên. Gọi bằng tên ấy sẽ trả TARGET_AMBIGUOUS —\n` +
          "đúng chỗ hỏng lúc chưa ai có tên. Đổi tên ở bảng bên (thẻ Hệ thống → Hồ sơ ghế), hoặc gọi\n" +
          "bằng dòng UDIN_GHE ở trên.");
      }
    })
    .catch((e) => { console.error(e.message); process.exitCode = 1; });
}
