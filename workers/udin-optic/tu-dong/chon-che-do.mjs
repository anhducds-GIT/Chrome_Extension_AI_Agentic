/* Udin Optic — W5: chọn chế độ *Agent* / *Manual Gen*.
 *
 * ═══ MỘT DÒNG TRONG BẢNG `W` SAI, GẠCH TẠI CHỖ ═══
 * `duc-scouter/v0.1.0/docs/CAPABILITIES.md` khai `W5` cần **`O3` (`scout.a11y`)**, dựa trên một
 * câu ghi 12/09: *“cây trợ năng phân biệt Agent / Manual Gen mà class không phân biệt được”*.
 * Đo lại 16/09 trên chính trang đó thì hàng ấy sai **hai lần**:
 *
 *   ⑴ **`scout.a11y` KHÔNG có trên dây của gói này.** Udin khai 12 method, không có nó. Một hàng
 *      năng lực chỉ tới một lệnh gói không gọi được là một hàng không ai chạy được.
 *   ⑵ **Class CÓ phân biệt — chỉ là không phân biệt cái người ta tưởng.** Hai nút cùng mang
 *      `create-mode-btn`, nên class **không nói được cái nào là *Agent***; đó là phần đúng của
 *      lời khai cũ. Nhưng class `active` nói được **cái nào đang chọn**, và đó mới là thứ `W5`
 *      cần đọc. Tên lấy bằng `scout.text` (`O8`), trạng thái lấy bằng `scout.query` (`O4`).
 *
 * Nên `W5` thật sự cần **`O4` + `O8` + `I1`**, cả ba đều **ĐÃ CHỨNG MINH** từ lâu. Nó chưa bao
 * giờ bị chặn bởi một năng lực thiếu; nó chỉ chưa ai làm.
 *
 * Số đo 16/09: `button.create-mode-btn` khớp **2** · `:nth-of-type(1)` = `"Agent"` (đang
 * `active`) · `:nth-of-type(2)` = `"Manual Gen"` · `button.create-mode-btn.active` khớp **1**.
 *
 * ═══ HỢP ĐỒNG ⟨trước · thao tác · thành công · thất bại⟩ ═══
 *   trước     tab Udin đã mở và qua màn chờ.
 *   thao tác  đọc bảng nút (nhãn + cái nào đang `active`) → nếu đã đúng chế độ thì **KHÔNG bấm**
 *             → nếu chưa thì bấm nút mang đúng nhãn, chờ chính nó có `active` → đọc lại bảng.
 *   thành công `active` **chuyển từ nút cũ sang đúng nút xin**, và vẫn chỉ có MỘT nút `active`.
 *   thất bại  nhãn lạ · không nút nào mang nhãn ấy · số nút ngoài khoảng · **trước khi bấm mà
 *             không có đúng một nút `active`** · bấm xong `active` không sang · bấm xong có hai
 *             nút `active` · nhãn ở vị trí ấy đổi giữa chừng.
 *
 * ═══ VÌ SAO KHÔNG ĐẾM `.active`, MÀ ĐỌC *CÁI NÀO* ĐANG `active` ═══
 * Đây là chỗ chặng này khác `W6`, và là chỗ dễ viết ra một phép kiểm vô dụng nhất. Số nút mang
 * `.active` là **1 trước và 1 sau** — ở cả nhánh chạy đúng LẪN nhánh cú bấm không tới trang.
 * Một phép ghim đếm `.active` xanh ở cả hai nhánh, tức là nó **không phân biệt được gì**. Thứ
 * duy nhất phân biệt là **VỊ TRÍ** của nút đang `active`: nó phải rời chỗ cũ và sang đúng chỗ xin.
 *
 * Cùng bài học `S1`/`W6` — *đếm, đừng hỏi “trông như xong chưa”* — nhưng con số phải là con số
 * **đổi giá trị giữa hai nhánh**, không phải con số tiện đếm nhất.
 *
 * ═══ MỘT LƯỢT KHÔNG BẤM VẪN LÀ MỘT LƯỢT ĐẠT ═══
 * Xin đúng chế độ đang bật thì hàm trả `daBam: false` và không chạm một cú bấm nào. Đây là lệnh
 * đặt **TRẠNG THÁI**, không phải lệnh bấm: bấm lại một nút đang bật là thừa, và trên một toggle
 * lỡ viết kiểu bập bênh thì nó **tắt đúng cái mình vừa xin**. Đọc `daBam` nếu cần biết.
 *
 *   UDIN_GHE=<id> node workers/udin-optic/tu-dong/chon-che-do.mjs "Manual Gen"
 */
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { goi as goiThat, timTab as timTabThat } from "./goi-bridge.mjs";
import { URL_UDIN } from "./qua-man-cho.mjs";

export const SEL = Object.freeze({
  nut: "button.create-mode-btn",
  dangChon: "button.create-mode-btn.active",
});

/* Hai nhãn đọc được từ trang ngày 16/09, giữ nguyên thứ tự trang bày ra. Bảng này CHỈ để nói
 * *“nhãn này có thật”* và để lời từ chối kể được đã biết những gì — việc chọn nút vẫn hỏi lại
 * trang từng cái, vì thứ tự là thứ trang đổi được bất cứ lúc nào. */
export const CHE_DO_DA_THAY = Object.freeze(["Agent", "Manual Gen"]);

const SO_NUT_TOI_DA = 8;

/** Selector của nút thứ `i`, và của chính nó khi đang được chọn. */
const nutThu = (i) => `${SEL.nut}:nth-of-type(${i})`;
const nutThuDangChon = (i) => `${SEL.nut}:nth-of-type(${i}).active`;

/**
 * Đọc bảng nút: nhãn của từng nút và nút nào đang mang `active`.
 * @returns {Promise<{nhan:string[], dangChon:number}>} `dangChon` là số thứ tự 1-based, 0 = không có
 */
async function docBang(dem, chu) {
  const nhan = [];
  let dangChon = 0;
  let soDangChon = 0;
  for (let i = 1; i <= SO_NUT_TOI_DA; i += 1) {
    if ((await dem(nutThu(i))) !== 1) break;
    nhan.push(await chu(nutThu(i)));
    if ((await dem(nutThuDangChon(i))) === 1) {
      soDangChon += 1;
      dangChon = i;
    }
  }
  /* Hai nút cùng `active` là một trạng thái trang KHÔNG được phép ở trong, và nếu ta im lặng lấy
   * cái cuối thì lượt sau sẽ so với một con số bịa. Khai 0 để chỗ gọi đỏ đúng chỗ. */
  if (soDangChon > 1) dangChon = -soDangChon;
  return { nhan, dangChon };
}

/**
 * @param {object} tuyChon
 * @param {string} tuyChon.che  nhãn chế độ, ví dụ `"Agent"` hoặc `"Manual Gen"`
 * @returns {Promise<{che:string, viTri:number, truoc:number, sau:number, daBam:boolean, nhan:string[]}>}
 */
export async function chonCheDo(tuyChon = {}) {
  const che = tuyChon.che;

  /* KHÔNG có mặc định, cố ý. `W6` mặc định `"Frame"` vì ở đó chỉ một nhánh chạy được; ở đây cả
   * hai nhánh đều chạy được và chúng đổi hẳn thứ trang sắp làm — một lệnh đặt trạng thái mà đoán
   * hộ người gọi trạng thái nào là chỗ để sinh ra một lượt chạy sai mà không ai kịp thấy. */
  if (typeof che !== "string" || che.trim() === "") {
    throw new Error(
      `\`che\` phải là một chuỗi nhãn chế độ, ví dụ "Agent". Đã thấy trên trang: ${CHE_DO_DA_THAY.join(" · ")}.`,
    );
  }

  const goi = tuyChon.goi || goiThat;
  const tab = tuyChon.tab || (await (tuyChon.timTab || timTabThat)(URL_UDIN, tuyChon));
  const dem = async (selector) =>
    (await goi("scout.query", { target_id: tab, selector, limit: 1 }, tuyChon)).data.matchCount;
  const chu = async (selector) => {
    const ra = (await goi("scout.text", { target_id: tab, selector }, tuyChon)).data.text;
    return typeof ra === "string" ? ra.trim() : "";
  };

  const soNut = await dem(SEL.nut);
  if (soNut < 2 || soNut > SO_NUT_TOI_DA) {
    throw new Error(
      `Cần từ 2 đến ${SO_NUT_TOI_DA} nút '${SEL.nut}', thấy ${soNut}. Khớp 0 hoặc 1 nghĩa là trang ` +
      "chưa dựng xong hoặc đã đổi hình dạng — đừng bấm gì khi chưa biết mình đang nhìn cái gì.",
    );
  }

  /* ĐỌC TRƯỚC. Không có con số này thì lượt sau không so được với cái gì, và cả chặng tụt về
   * đúng chỗ `S1` đã gỡ: báo ĐẠT cho một việc có thể chưa xảy ra. */
  const { nhan, dangChon: truoc } = await docBang(dem, chu);
  if (truoc < 0) {
    throw new Error(
      `Trang đang có ${-truoc} nút cùng mang '.active' (${nhan.join(" · ")}). Chỉ MỘT chế độ được ` +
      "bật cùng lúc, nên đây là trạng thái không đọc được — bấm tiếp là bấm mù.",
    );
  }
  if (truoc === 0) {
    throw new Error(
      `Không nút nào mang '.active' (đã đọc: ${nhan.join(" · ")}). Chưa biết đang ở chế độ nào thì ` +
      "không kiểm được cú bấm có đổi gì không — đó là cả phép kiểm của chặng này.",
    );
  }

  const viTri = nhan.indexOf(che) + 1;
  if (viTri === 0) {
    throw new Error(
      `Không nút chế độ nào mang nhãn '${che}'. Đã đọc: ${nhan.map((x) => JSON.stringify(x)).join(" · ")}. ` +
      `Đã thấy ngày 16/09: ${CHE_DO_DA_THAY.join(" · ")}. Trang đổi nhãn thì đo lại rồi sửa, ` +
      "đừng bấm theo số thứ tự.",
    );
  }

  /* XIN ĐÚNG CÁI ĐANG BẬT THÌ KHÔNG BẤM. Xem khối giải trình ở đầu file. */
  if (viTri === truoc) {
    return { che, viTri, truoc, sau: truoc, daBam: false, nhan };
  }

  await goi("scout.click", {
    target_id: tab, selector: nutThu(viTri),
    wait_for: nutThuDangChon(viTri), wait_state: "present", wait_timeout_ms: 5000,
  }, tuyChon);

  const { nhan: nhanSau, dangChon: sau } = await docBang(dem, chu);

  /* ĐÂY LÀ CHỐT CỦA CẢ CHẶNG, và nó CỐ Ý không phải phép đếm `.active`: con số ấy là 1 ở cả
   * nhánh đúng lẫn nhánh cú bấm không tới trang. Chỉ VỊ TRÍ của nút đang bật mới phân biệt được. */
  if (sau !== viTri) {
    throw new Error(
      `Bấm xong mà chế độ KHÔNG sang '${che}': trước ở nút ${truoc}, sau ở nút ${sau === 0 ? "không nút nào" : sau}, ` +
      `xin nút ${viTri}. Đừng nới phép kiểm này thành "vẫn có đúng một nút active" — con số đó là 1 ` +
      "ở cả lượt chạy đúng lẫn lượt cú bấm không tới trang, nên nó không phân biệt được gì.",
    );
  }
  if (nhanSau[viTri - 1] !== che) {
    throw new Error(
      `Nút ${viTri} đang bật nhưng nhãn của nó đã đổi thành '${nhanSau[viTri - 1]}' (lúc bấm là '${che}'). ` +
      "Trang xếp lại menu giữa chừng — lượt này không kết luận được, chạy lại sau khi trang đứng yên.",
    );
  }

  return { che, viTri, truoc, sau, daBam: true, nhan: nhanSau };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const che = process.argv.slice(2).find((a) => !a.startsWith("--"));
  chonCheDo({ che })
    .then((k) => console.log(JSON.stringify(k, null, 2)))
    .catch((e) => {
      console.error(e.message);
      process.exitCode = 1;
    });
}
