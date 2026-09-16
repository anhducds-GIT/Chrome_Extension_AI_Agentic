/* Udin Optic — W6: thêm MỘT đối tượng vào canvas qua nút *Add to canvas*.
 *
 * ═══ ĐỌC KHỐI NÀY TRƯỚC: `W6` KHÔNG PHẢI THỨ BẢNG `W` ĐÃ VIẾT ═══
 * Bảng `W` ở `duc-scouter/v0.1.0/docs/CAPABILITIES.md` khai `W6` là *“đưa một ảnh KẾT QUẢ vào
 * canvas”*, dựa trên một quan sát 13/09: *“nút Add to canvas có trong DOM”*. Đo lại 16/09 trên
 * chính trang đó thì **tiền đề ấy sai**, và sai theo ba cách cùng lúc:
 *
 *   ⑴ **Ảnh kết quả ĐÃ nằm trên canvas rồi.** Một lượt sinh ra bốn ảnh, và chúng xuất hiện dưới
 *      dạng một lưới bốn ô — `.canvas-image-container.is-batch-grid` — tức là một đối tượng
 *      canvas. Không có thao tác *“đưa nó lên canvas”* vì nó chưa bao giờ ở ngoài canvas.
 *   ⑵ **Nút *Add to canvas* là nút mở MENU**, không phải nút đặt ảnh. Bấm nó thì hiện
 *      `.agent-add-dropdown` với **bốn** lựa chọn: `Frame` · `Image` · `Video` · `3D Model` —
 *      tức là thêm một đối tượng MỚI, RỖNG.
 *   ⑶ **Không có nút riêng trên từng ảnh kết quả.** Đếm trọn 54 nút của trang: thứ gần nhất là
 *      `Remove` và `Version history`, cả hai đều thao tác trên đối tượng đã có.
 *
 * Và **lý do `W6` từng bị hoãn cũng sai**: `CHUOI-VIEC.md` đoán nó sẽ hỏng vì `S-22` (cú bấm
 * không tới trang). Ngày 16/09 cú bấm tới trang **bốn lần liên tiếp** trên đúng ghế ấy. Thứ chặn
 * `W6` chưa bao giờ là đường sự kiện chuột; là **một thao tác không tồn tại**.
 *
 * ═══ NÊN `W6` LÀM GÌ, SAU KHI ĐO ═══
 * Thêm **một khung rỗng** vào canvas — nhánh DUY NHẤT của menu ấy chạy trọn mà không cần một
 * tệp nào. Nó không phải đồ trang trí: ở Optic, khung là chỗ một lượt sinh ảnh đổ kết quả vào.
 *
 * ═══ VÌ SAO BA LỰA CHỌN KIA BỊ TỪ CHỐI, VÀ VÌ SAO KHÔNG BẤM THỬ ═══
 * `Image` / `Video` / `3D Model` gần như chắc chắn mở **hộp thoại chọn tệp của hệ điều hành**.
 * Tôi **không đo bằng cách bấm thử**: nếu đúng, hộp thoại ấy **treo Chrome của Đức** cho tới khi
 * có người bấm tay, và cái ghế đang chạy việc thật thì đứng im theo. Một phép đo không được phép
 * đắt hơn thứ nó đo. Ba nhánh đó thuộc về `W8`/`T29` (`scout.upload`) — một method Bridge MỚI,
 * tức phải hỏi Đức. Đây là **từ chối theo rủi ro**, khai đúng như vậy, không giả vờ là đã đo.
 *
 * ═══ HỢP ĐỒNG ⟨trước · thao tác · thành công · thất bại⟩ ═══
 *   trước     tab Udin đã mở và qua màn chờ. KHÔNG cần một lượt sinh ảnh nào trước đó.
 *   thao tác  đếm khung TRƯỚC → mở menu (chờ menu hiện) → **hỏi lại trang từng mục để tìm mục
 *             mang đúng nhãn** → bấm mục đó (chờ menu biến mất) → đếm khung SAU.
 *   thành công số khung **tăng đúng 1**.
 *   thất bại  loại lạ · loại cần tệp · nút mở menu khớp ≠ 1 · không mục nào mang nhãn ấy ·
 *             menu không hiện · menu hiện rồi không tắt · **đếm xong mà số khung KHÔNG tăng**.
 *
 * ═══ VÌ SAO PHẢI ĐẾM, DÙ ĐÃ CÓ `wait_for` ═══
 * Chỗ này là cái bẫy của cả chặng. Menu tắt **không** chứng minh khung đã thêm: bấm lại chính
 * nút mở menu cũng làm nó tắt, bấm ra ngoài cũng thế. `wait_state: "absent"` trả lời câu *“menu
 * còn không”*, không trả lời câu *“có thêm khung không”*. Đúng bài học của `S1`: **đếm, đừng hỏi
 * “có phải nó trông như đã xong không”.**
 *
 * Số đo 16/09, để ai sửa biết hình dạng thật: `.canvas-image-container` **10 → 11**,
 * `.is-empty-frame` **7 → 8**, menu tắt sau **1 ms**.
 *
 *   UDIN_GHE=<id> node workers/udin-optic/tu-dong/them-khung.mjs [Frame]
 */
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { goi as goiThat, timTab as timTabThat } from "./goi-bridge.mjs";
import { URL_UDIN } from "./qua-man-cho.mjs";

export const SEL = Object.freeze({
  nut: "button.agent-add-button",
  menu: ".agent-add-dropdown",
  muc: ".agent-add-dropdown button.agent-add-option",
  khung: ".canvas-image-container.is-empty-frame",
});

/* Bốn nhãn đọc được từ trang ngày 16/09, giữ nguyên thứ tự trang bày ra. Bảng này CHỈ để nói
 * *“nhãn này có thật”* — việc chọn mục vẫn hỏi lại trang từng cái, vì thứ tự menu là thứ trang
 * đổi được bất cứ lúc nào. */
export const NHAN_DA_THAY = Object.freeze(["Frame", "Image", "Video", "3D Model"]);

/* Nhãn làm được TRỌN VẸN mà không cần một tệp nào. Xem khối giải trình ở đầu file trước khi
 * thêm một dòng vào đây: mở rộng danh sách này là mở một hộp thoại hệ điều hành lên màn hình
 * của Đức, không phải mở một tính năng. */
export const NHAN_LAM_DUOC = Object.freeze(["Frame"]);

const SO_MUC_TOI_DA = 12;

/**
 * @param {object} [tuyChon]
 * @param {string} [tuyChon.loai="Frame"]  nhãn của mục trong menu *Add to canvas*
 * @returns {Promise<{loai:string, truoc:number, sau:number, them:number, viTri:number, nhan:string[]}>}
 */
export async function themKhung(tuyChon = {}) {
  const loai = tuyChon.loai === undefined || tuyChon.loai === null ? "Frame" : tuyChon.loai;

  /* HAI LỜI TỪ CHỐI NÀY ĐỨNG TRƯỚC KHI CHẠM DÂY, cố ý: một yêu cầu sai từ trong ý định thì
   * đừng mở menu cho nó, và nhất là đừng bấm một mục có thể dựng hộp thoại hệ điều hành. */
  if (typeof loai !== "string" || loai.trim() === "") {
    throw new Error("`loai` phải là một chuỗi nhãn, ví dụ \"Frame\".");
  }
  if (!NHAN_LAM_DUOC.includes(loai)) {
    const biet = NHAN_DA_THAY.includes(loai);
    throw new Error(
      biet
        ? `'${loai}' có trong menu nhưng chặng này KHÔNG bấm nó: nó gần như chắc chắn mở hộp ` +
          "thoại chọn tệp của hệ điều hành, và hộp thoại đó treo Chrome cho tới khi có người " +
          `bấm tay. Đường đúng là W8/T29 (scout.upload). Làm được: ${NHAN_LAM_DUOC.join(", ")}.`
        : `Không có nhãn '${loai}' trong menu Add to canvas. Đã thấy: ${NHAN_DA_THAY.join(", ")}.`,
    );
  }

  const goi = tuyChon.goi || goiThat;
  const tab = tuyChon.tab || (await (tuyChon.timTab || timTabThat)(URL_UDIN, tuyChon));
  const dem = async (selector) =>
    (await goi("scout.query", { target_id: tab, selector, limit: 1 }, tuyChon)).data.matchCount;

  const nut = await dem(SEL.nut);
  if (nut !== 1) {
    throw new Error(
      `Cần đúng MỘT nút '${SEL.nut}', thấy ${nut}. Khớp 0 nghĩa là trang chưa dựng xong hoặc đã ` +
      "đổi hình dạng; khớp nhiều nghĩa là selector đã hết hẹp — sửa `SEL`, đừng lấy cái đầu tiên.",
    );
  }

  /* ĐẾM TRƯỚC. Không có con số này thì mọi thứ sau đó chỉ là *“trông như đã xong”*. */
  const truoc = await dem(SEL.khung);

  /* Menu có thể đang mở sẵn (lượt trước ngã giữa chừng, hoặc Đức vừa bấm tay). Mở lại một cái
   * đang mở thì cú bấm ĐÓNG nó, và mọi bước sau tìm mục trong hư không. */
  if ((await dem(SEL.menu)) === 0) {
    await goi("scout.click", {
      target_id: tab, selector: SEL.nut, wait_for: SEL.menu, wait_timeout_ms: 5000,
    }, tuyChon);
  }

  /* HỎI LẠI TRANG TỪNG MỤC. Thứ tự menu là thứ trang đổi được, nên `nth-of-type(2)` hôm nay là
   * `Image`, ngày mai có thể là `Video` — và một cú bấm nhầm ở đây mở hộp thoại hệ điều hành.
   * Cùng cơ chế đã cứu `W3` (`G-54`) và `W4` (`G-76`), và ở đây nó còn đắt hơn. */
  const nhan = [];
  let viTri = 0;
  for (let i = 1; i <= SO_MUC_TOI_DA; i += 1) {
    const selector = `${SEL.muc}:nth-of-type(${i})`;
    if ((await dem(selector)) !== 1) break;
    const chu = (await goi("scout.text", { target_id: tab, selector }, tuyChon)).data.text;
    const sach = typeof chu === "string" ? chu.trim() : "";
    nhan.push(sach);
    if (sach === loai) { viTri = i; break; }
  }
  if (viTri === 0) {
    throw new Error(
      `Không mục nào trong menu mang nhãn '${loai}'. Đã đọc: ${nhan.map((x) => JSON.stringify(x)).join(" · ") || "(không mục nào)"}. ` +
      "Trang đã đổi nhãn — sửa `NHAN_DA_THAY`/`NHAN_LAM_DUOC` sau khi đo lại, đừng bấm theo số thứ tự.",
    );
  }

  await goi("scout.click", {
    target_id: tab, selector: `${SEL.muc}:nth-of-type(${viTri})`,
    wait_for: SEL.menu, wait_state: "absent", wait_timeout_ms: 5000,
  }, tuyChon);

  /* CHỜ KHUNG XUẤT HIỆN, rồi mới đếm. Đợi bằng chính trang chứ không bằng một lượt ngủ đoán
   * chừng: `dom.wait` hỏi lại mỗi nhịp và trả lời ngay khi đủ, nên nó vừa nhanh hơn vừa không
   * phải một con số ai đó chỉnh dần cho vừa máy mình. */
  await goi("scout.wait", {
    target_id: tab, selector: SEL.khung, state: "present",
    min_count: truoc + 1, timeout_ms: 8000,
  }, tuyChon);

  const sau = await dem(SEL.khung);
  /* ĐÂY LÀ CHỐT CỦA CẢ CHẶNG. Menu tắt KHÔNG chứng minh gì — bấm lại nút mở menu cũng làm nó
   * tắt. Chỉ con số này phân biệt *“đã thêm một khung”* với *“menu vừa đóng lại”*. */
  if (sau !== truoc + 1) {
    throw new Error(
      `Menu đã tắt nhưng số khung KHÔNG tăng đúng một: trước ${truoc}, sau ${sau}. Menu tắt chỉ ` +
      "nói *menu đã đóng*, không nói *khung đã thêm* — bấm lại chính nút mở menu cũng làm nó tắt. " +
      "Đừng nới phép kiểm này thành `sau >= truoc`; nó là thứ duy nhất phân biệt hai chuyện đó.",
    );
  }

  return { loai, truoc, sau, them: sau - truoc, viTri, nhan };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const loai = process.argv.slice(2).find((a) => !a.startsWith("--"));
  themKhung(loai ? { loai } : {})
    .then((k) => console.log(JSON.stringify(k, null, 2)))
    .catch((e) => {
      console.error(e.message);
      process.exitCode = 1;
    });
}
