/* scouter-actions-core.mjs — BA HÀNH ĐỘNG GHI của Scouter: bấm và gõ như tay người.
 *
 * Đề bài: `S-01` trong `BACKLOG.md` của gói — năng lực xếp hạng **số một** của bảng kiểm kê.
 * Quyết định: ADR-0009 (Scouter là kẻ hành động, không còn là người quan sát).
 *
 * ─── VÌ SAO ĐÂY LÀ FILE RIÊNG, KHÔNG PHẢI THÊM VÀO `scouter-probes.mjs` ────
 * Lõi phép dò read-only thi hành bất biến của ADR-0007 bằng BA chốt, và hai trong ba là
 * DANH SÁCH: `READ_ONLY_CDP_METHODS` cố ý không có `Input.*`, và `CODE_BEARING_PARAM_KEYS`
 * cấm đúng những khoá mà gõ phím cần (`text`, `key`, `value`). Thêm `Input.*` vào đó là
 * **làm yếu một lớp bảo vệ đang có** — luật vàng 3 của repo cấm, và hai con đột biến `M1`
 * `M2` sẽ ĐỎ đúng lúc đó, cố ý.
 *
 * Nên đường ghi ở đây là một lõi RIÊNG, với danh sách RIÊNG. Kết quả: sau lượt này,
 * `scouter-probes.mjs` vẫn chứng minh được là read-only — không phải vì ai đó hứa, mà vì
 * kênh ghi **không có mặt trong file đó**. Ai muốn biết Scouter ghi được gì thì đọc đúng
 * một file: file này.
 *
 * ─── NĂM CHỐT, VÀ CHÚNG KHÁC BA CHỐT CỦA LÕI ĐỌC ───────────────────────────
 *   ⑴ Tên hành động phải nằm trong `ACTION_NAMES`. Tên lạ → từ chối, không đoán.
 *   ⑵ Method CDP phải nằm trong `WRITE_CDP_METHODS`. Danh sách này CỐ Ý KHÔNG CÓ `Runtime.*`:
 *      bấm và gõ không cần chạy một dòng JS nào trên trang, nên cửa đó vẫn đóng.
 *   ⑶ **TOẠ ĐỘ DO TA TÍNH, KHÔNG BAO GIỜ NHẬN TỪ NGƯỜI GỌI.** Đây là chốt quan trọng nhất
 *      của cả file. Một tham số `x`/`y` từ ngoài dây biến `scout.click` thành "bấm vào bất kỳ
 *      điểm nào trên màn hình", và cổng selector ở trên thành đồ trang trí. Toạ độ luôn suy
 *      từ `DOM.getBoxModel` của đúng phần tử đã khớp.
 *   ⑷ **Selector phải khớp ĐÚNG MỘT phần tử.** Khớp 0 thì không có gì để bấm; khớp nhiều thì
 *      "bấm cái đầu tiên" là chỗ tự động hoá phá hỏng đồ thật. Cả hai đều TỪ CHỐI, không đoán.
 *   ⑸ **ĐIỂM SẮP BẤM PHẢI THUỘC VỀ PHẦN TỬ ĐÃ KHỚP** (mở 12/09, `S-17`). Chốt ⑶ bảo đảm toạ
 *      độ suy từ đúng phần tử; nó KHÔNG bảo đảm phần tử đó đang ở trên cùng tại điểm ấy. Một
 *      lớp phủ chắn ngang thì chuột trúng lớp phủ. Nên trước lượt bắn, hỏi Chrome *"điểm này
 *      là ai"* và so với phần tử đã khớp — chấp nhận cả con cháu của nó, vì nút thật thường
 *      là `<button><svg><path>` và tâm hộp rơi vào `<path>`.
 *
 * ─── CHUỖI LỆNH LẤY TỪ PHÉP ĐO, KHÔNG TỰ CHẾ ───────────────────────────────
 * Thứ tự ba khung chuột và hình dạng khung phím chép đúng từ
 * `scripts/scouter-input-trust-probe.mjs` (dòng 247–249 và 265–266) — bản đã chạy thật ngày
 * 06/09 và cho `isTrusted: true` kèm cổng hoạt động mở. Đừng "gọn lại" nó: bỏ `mouseMoved`
 * hay bỏ `unmodifiedText` là đổi một chuỗi ĐÃ ĐO thành một chuỗi CHƯA ĐO.
 *
 * MỘT CHỖ CỐ Ý KHÁC PHÉP ĐO: phép đo lấy toạ độ bằng `getBoundingClientRect` qua
 * `Runtime.evaluate`. Ở đây dùng `DOM.getBoxModel` — cùng con số, nhưng không phải mở cửa
 * chạy JS. Phép đo là script đo một lần; file này sống trong một extension có `debugger`.
 */

/* ---- Từ vựng cố định ---------------------------------------------------- */

export const ACTION_NAMES = Object.freeze([
  "input.click",
  /* MỞ 16/09 — Shift+click, để dựng THỨ TỰ tham chiếu (`@1` / `@2` của Udin). Đức chốt.
   * Không thêm method CDP nào — vẫn `Input.dispatchMouseEvent`, chỉ thêm mặt nạ `SHIFT` gõ cứng. */
  "input.chon",
  "input.type",
  "input.key",
  "input.clear",
  "input.navigate",
  /* MỞ 14/09 — Đức chốt `S-24` đường ⒜. KHÔNG có lệnh Bridge nào ánh xạ thẳng tới nó:
   * nó trả về URL ĐẦY ĐỦ (kể cả chữ ký trong query), nên nó chỉ được gọi TỪ TRONG máy,
   * bởi `scout.grab` — thứ tải file rồi trả BYTE, không trả URL. Ánh xạ nó ra dây là mở
   * đúng cái lỗ mà `S-24` sinh ra để bịt. Con `GR9` canh chỗ đó. */
  "input.grabUrl",
  /* ---- NHÓM "ĐI LẠI" MỞ 14/09 — Đức uỷ quyền, [ADR-0007] ------------------
   * Cả ba đi kèm MỘT luật, và luật đó viết ở ADR chứ không phải ở đây: `scout.view` (ĐỌC)
   * phải có TRƯỚC chúng. Ba lệnh này hứa *"đã bắn sự kiện"*, **không** hứa *"trang đã nhận"* —
   * cùng lời hứa hẹp của `scout.click`. Thứ kiểm được lời hứa ấy là một con số đọc lại từ
   * trang, và đó là việc của `scout.view`. */
  "input.scroll",
  "input.hover",
  "input.history",
  /* MỞ 16/09 — Đức chốt `D4`/`T29`. Xem khối giải trình ở chính `input.upload` bên dưới, và
   * đọc nó TRƯỚC khi sửa gì quanh đây: đây là hành động ghi DUY NHẤT đưa byte đi **từ đĩa ra
   * một trang web**, ngược chiều mọi thứ còn lại của gói. */
  "input.upload",
  /* MỞ 16/09 khuya — Đức chốt đường ⒝ sau khi đường ⒜ bật hộp thoại `Open` lên màn hình anh.
   * Nó KHÔNG mở thêm quyền đọc đĩa nào: tệp vẫn đi qua đúng cái cổng của `input.upload` —
   * `path_tuyet_doi` do MÁY CHỦ đặt, nhốt trong vùng ghi. Thứ nó bỏ đi là **hộp thoại**. */
  "input.tha"
]);

/* Method CDP được phép ở đường GHI. Ba lệnh `DOM.*` đầu chỉ để TÌM và ĐƯA VÀO TẦM NHÌN đúng
 * một phần tử; chúng không đổi gì trên trang. `DOM.focus` đổi tiêu điểm — đó là thao tác ghi
 * nhỏ nhất mà gõ phím bắt buộc phải có. CỐ Ý KHÔNG CÓ: `Runtime.*` (chạy mã), `DOM.setOuterHTML`
 * và `DOM.setAttributeValue` (sửa trang thẳng tay), `Network.*` (đụng dây), `Input.insertText` (CDP đánh dấu THỬ NGHIỆM — phép đo 06/09 ghi nhận
 * nó chạy được nhưng KHÔNG tính điểm, nên nó không vào seed).
 * Nới danh sách này = đổi luật an toàn = phải hỏi Đức (AGENTS.md gốc mục 2). */
export const WRITE_CDP_METHODS = Object.freeze([
  "DOM.enable",
  "DOM.getDocument",
  "DOM.querySelectorAll",
  "DOM.scrollIntoViewIfNeeded",
  "DOM.getBoxModel",
  /* MỞ 14/09 — Đức chốt `S-24` đường ⒜. Method này CHỈ ĐỌC: nó trả về danh sách thuộc
   * tính của đúng một phần tử đã khớp, không đổi gì trên trang. Nó ở danh sách đường GHI
   * (không mượn của đường đọc) vì luật gói số 6: mỗi lõi khai lấy thứ nó dùng. Và nó cần
   * ở đây chứ không ở lõi đọc vì lõi đọc CỐ Ý cắt query khỏi `src`/`href` — cắt đúng chỗ
   * chữ ký của một URL ký sẵn nằm. */
  "DOM.getAttributes",
  /* MỞ 12/09 — Đức chốt D1 (`CHUOI-VIEC.md`). Method này KHÔNG sửa gì: nó hỏi Chrome
   * *"điểm (x, y) này là phần tử nào"*. Nó ở trong danh sách của đường GHI vì chỗ cần nó là
   * ngay TRƯỚC lượt bắn chuột, và luật gói số 6 cấm đường ghi mượn method của đường đọc —
   * mỗi lõi khai lấy thứ nó dùng, kể cả khi hai bên khai cùng một cái tên.
   *
   * Nó vá `S-17`: trước hôm nay `input.click` suy toạ độ từ hộp của đúng phần tử đã khớp rồi
   * bắn chuột vào đó, mà KHÔNG kiểm điểm ấy có thuộc về phần tử ấy không. Một lớp phủ chắn
   * ngang thì chuột trúng lớp phủ và Scouter trả về y hệt một lượt bấm thành công — đó là
   * kiểu hỏng đắt nhất, vì nó nói dối chứ không báo lỗi. */
  "DOM.getNodeForLocation",
  "DOM.focus",
  /* ---- MỞ 16/09 — Đức chốt `D4`. ĐÂY LÀ CỬA ĐẦU TIÊN ĐI TỪ ĐĨA RA MỘT TRANG WEB ----------
   * Mọi method khác trong danh sách này chỉ đụng tới thứ đã có sẵn trên trang. Cái này đưa
   * **nội dung một file trên máy Đức** vào tay một trang web, và trang web gửi nó đi đâu là
   * việc của nó. Nên bốn cái khoá, và cả bốn đều phải còn:
   *
   *   ⑴ **Extension KHÔNG BAO GIỜ tự ghép đường dẫn.** Nó chỉ nhận `path_tuyet_doi`, và
   *     trường đó do **MÁY CHỦ Bridge** đặt — máy chủ ghi đè nó ở mỗi lượt, kể cả khi người
   *     gọi cố tự điền. Chỉ máy chủ biết vùng ghi ở đâu, nên chỉ nó kiểm được đường dẫn có
   *     chui ra ngoài không (`trongGoc` ở `bridge/file-core.mjs`, đã ghim từ 07/09).
   *   ⑵ **Thiếu trường đó thì TỪ CHỐI**, không lùi về `path`. Chạy trên một máy chủ không có
   *     móc ghép đường dẫn thì lệnh này phải chết, chứ không được đoán lấy một đường dẫn.
   *   ⑶ **Phần tử phải là `<input type="file">` THẬT**, do chính Chrome khớp CSS xác nhận —
   *     không phải do ta đọc thuộc tính rồi tự suy. Một `<div type="file">` sẽ lọt phép suy ấy.
   *   ⑷ Vẫn qua **cái phanh**: đây là lệnh GHI, nên nó cần công tắc của Đức và tiêu trần 200.
   *
   * Cái này KHÔNG mở thêm gì về phía ĐỌC: `file.read` đã đọc được mọi file dưới vùng ghi từ
   * 07/09. Thứ mới là **hướng đi của byte**. */
  "DOM.setFileInputFiles",
  /* ---- MỞ 16/09 — Đức chốt, sau khi ĐO. Method này LÀM GIẢM rủi ro, không tăng -----------
   * Nó bảo Chrome **đừng dựng hộp thoại chọn tệp lên màn hình**; thay vào đó lượt chọn tệp
   * nằm lại trong tay giao thức. Nhờ nó, cú bấm mở hộp thoại — thứ đã hai lần bị từ chối vì
   * *"nó treo Chrome cho tới khi có người bấm tay"* — trở nên an toàn để máy tự bấm.
   *
   * **Nó KHÔNG mở thêm quyền đọc file nào.** File vẫn phải đi qua `DOM.setFileInputFiles`, vẫn
   * bị máy chủ nhốt trong vùng ghi. Thứ nó đổi là *hộp thoại có hiện lên màn hình Đức hay không*.
   *
   * **HIỂM THẬT của nó là ĐỂ QUÊN BẬT**, và chỗ ấy phải đọc kỹ: khi còn bật, hộp thoại mà
   * CHÍNH ĐỨC mở cũng im lặng không hiện — anh sẽ tưởng Chrome hỏng, và không có thông báo nào
   * chỉ về đây. Nên nó chỉ được bật trong LÒNG một lượt `input.upload`, và lượt tắt nằm trong
   * `finally` — kể cả khi mọi thứ ở giữa ném.
   *
   * Đo 16/09 (`npm run scouter:tai-len`, khối ⑤): nó chạy **không cần `Page.enable`**, và
   * **không cần kênh sự kiện** — ô nhận file nằm lại trong DOM chờ, nên hỏi lại là thấy. Ba thứ
   * đáng lẽ phải mở kèm mà hoá ra không cần. */
  "Page.setInterceptFileChooserDialog",
  /* ---- MỞ 16/09 khuya — Đức chốt đường ⒝, sau khi ĐO trên Chrome hồ sơ trống -------------
   * KÉO-THẢ MỘT TỆP vào trang, tức đúng thao tác Đức làm bằng tay khi lôi một ảnh từ Explorer
   * vào canvas. Nó **không bao giờ dựng hộp thoại chọn tệp** — theo cấu tạo, không phải nhờ
   * chặn: nó không đi qua hộp thoại nào cả.
   *
   * VÌ SAO MỞ: lời khai *"hộp thoại không hiện lên màn hình Đức"* của `W8` **SAI** (Đức gửi ảnh
   * chụp 16/09). Ba giả thuyết đã đo và đều trượt, nên đường `Page.setInterceptFileChooserDialog`
   * không sửa được bằng hiểu biết hiện có. Đường này bỏ hẳn cái hộp thoại thay vì đi chặn nó.
   *
   * **KHÔNG mở thêm quyền đọc đĩa nào.** `files` nhận đường dẫn TUYỆT ĐỐI, và đường ấy vẫn do
   * **máy chủ Bridge** đặt từ một `path` tương đối, vẫn nhốt trong vùng ghi, vẫn bắt tệp phải có
   * thật — đúng cái cổng `input.upload` đang đi qua. Extension không tự ghép đường dẫn bao giờ.
   *
   * **TOẠ ĐỘ VẪN DO TA TÍNH.** Method này nhận `x`/`y`, và đó chính là chỗ chốt ⑶ phải canh:
   * điểm thả suy từ `DOM.getBoxModel` của phần tử đã khớp, cộng một lượt kiểm điểm bấm — y hệt
   * `input.click`. Nhận toạ độ từ người gọi là biến nó thành "thả tệp vào bất kỳ đâu".
   *
   * Đo 16/09 (`do-keo-tha` trên Chrome hồ sơ trống): trang nhận `dragenter → dragover → drop`,
   * `files.length = 1`, tên đúng, **525119 byte khai VÀ đọc thật ra cũng 525119**, kiểu
   * `image/jpeg`, và **0 hộp thoại** trước lẫn sau. */
  "Input.dispatchDragEvent",
  "Input.dispatchMouseEvent",
  "Input.dispatchKeyEvent",
  /* MỞ 08/09 — Đức chốt. Trước đó dòng chú thích trên khai "CỐ Ý KHÔNG CÓ `Page.navigate`",
   * và câu đó đúng cho tới khi Scouter chỉ cần đọc một trang. Nay việc thật cần đi từ trang
   * này sang trang kia (danh mục → chi tiết), mà bấm vào link thì phụ thuộc trang có link đó
   * và có đúng một link đó — hai điều kiện Scouter không kiểm được trước khi bấm.
   *
   * Nó KHÔNG được coi là đọc: `scout.navigate` là method GHI, chui qua phanh và trả giá hạn
   * mức y như `scout.click`. Đổi trang là điều khiển trang, và mở nó ở đây không nới rộng
   * đường đọc — danh sách của `scouter-probes.mjs` vẫn không có `Page.navigate`.
   *
   * `Target.getTargetInfo` vào cùng vì đường điều hướng phải ĐỌC LẠI url sau khi đi, và một
   * lượt đi không kiểm được đích đến thì không nói được nó đã tới đâu. */
  "Page.navigate",
  "Target.getTargetInfo",
  /* MỞ 14/09 cho `input.history` (lùi / tiến) — Đức uỷ quyền nhóm "đi lại", [ADR-0007].
   *
   * `Page.getNavigationHistory` CHỈ ĐỌC. Nó ở danh sách đường GHI, không ở đường đọc, và đó là
   * cố ý: chỗ duy nhất cần nó là ngay TRƯỚC một lượt lùi/tiến, để biết **có gì ở phía sau
   * không** thay vì bắn một lệnh vào hư không rồi đoán. Luật gói số 6 — mỗi lõi khai lấy thứ
   * nó dùng, kể cả khi hai bên khai cùng một cái tên.
   *
   * Nó cũng là thứ giữ cho `input.history` KHÔNG nhận chỉ số từ người gọi: người gọi nói
   * "lùi" hay "tiến", còn chỉ số mục lịch sử tính ở TRONG từ danh sách vừa đọc. Cùng khuôn với
   * chốt ⑶ (toạ độ tính ở trong): một hướng có TÊN, không phải một con trỏ tự do vào lịch sử
   * duyệt web của Đức — `navigateToHistoryEntry` với một `entryId` bất kỳ nhảy được tới **bất
   * kỳ trang nào trong lịch sử của tab đó**. */
  "Page.getNavigationHistory",
  "Page.navigateToHistoryEntry"
]);

/* Khoá tham số CHỞ TOẠ ĐỘ. Chốt ⑶ chặn theo HÌNH DẠNG tham số của NGƯỜI GỌI, nên nó còn sống
 * sau khi ai đó nới danh sách hành động ở trên. */
const COORDINATE_PARAM_KEYS = Object.freeze([
  "x", "y", "coordinate", "coordinates", "point", "position", "clientX", "clientY", "nodeId"
]);

/* Phím có tên — BẢNG CỐ ĐỊNH. Người gọi chọn một TÊN trong bảng; họ không bao giờ đưa mã phím.
 * Nhận mã phím tự do là mở lại đúng cái cửa mà chốt ⑴ vừa đóng. */
const NAMED_KEYS = Object.freeze({
  Enter: { code: "Enter", vk: 13, text: "\r" },
  Tab: { code: "Tab", vk: 9 },
  Escape: { code: "Escape", vk: 27 },
  Backspace: { code: "Backspace", vk: 8 },
  Delete: { code: "Delete", vk: 46 },
  ArrowUp: { code: "ArrowUp", vk: 38 },
  ArrowDown: { code: "ArrowDown", vk: 40 },
  ArrowLeft: { code: "ArrowLeft", vk: 37 },
  ArrowRight: { code: "ArrowRight", vk: 39 },
  Home: { code: "Home", vk: 36 },
  End: { code: "End", vk: 35 }
});

export const NAMED_KEY_NAMES = Object.freeze(Object.keys(NAMED_KEYS));

/* Mặt nạ phím bổ trợ của CDP: Alt=1, **Ctrl=2**, Meta=4, Shift=8.
 *
 * Khối này từng viết *"chỉ `Ctrl` có mặt ở đây … thêm một hằng số nữa là bước đầu tiên để có một
 * tham số `modifiers`"*. Cảnh báo ấy đúng, và nó vẫn đứng — nên đọc kỹ chỗ nó chặn cái gì:
 * nó chặn **một tham số tự do**, không chặn **một thao tác có tên**.
 *
 * `SHIFT` mở 16/09 cho `input.chon`, và đi đúng khuôn `input.clear` đã đi với `CTRL`: phím bổ trợ
 * **gõ cứng trong thân hàm**, không một tham số nào của người gọi chạm tới nó, và nó gắn với MỘT
 * thao tác mang tên rõ ràng. Ngày nào có ai muốn `modifiers` thành tham số thì cảnh báo trên vẫn
 * là câu trả lời: **không**.
 *
 * GIÁ PHẢI NÓI RÕ: Shift+click lên một thẻ liên kết mở CỬA SỔ MỚI. Nên `input.chon` chỉ bắn sau
 * khi đã qua cổng selector (khớp đúng một) VÀ phép kiểm điểm bấm — y hệt `input.click`. */
const CTRL = 2;
const SHIFT = 8;

/* ---- BA BẢNG CỐ ĐỊNH của nhóm "đi lại" (14/09, [ADR-0007]) ----------------
 * Cùng khuôn với `NAMED_KEYS`, và vì cùng một lý do: người gọi chọn một CÁI TÊN trong bảng, họ
 * không bao giờ đưa một giá trị thô. Nhận `button: "left"` thì `button` là dữ liệu có biên; nhận
 * một chuỗi bất kỳ rồi chuyển thẳng xuống CDP là mở lại đúng cái cửa chốt ⑴ vừa đóng.
 *
 * `mask` là mặt nạ `buttons` của CDP (trái=1, phải=2, giữa=4) — nó phải khớp với `name`, nếu
 * không thì trang nhận được một sự kiện tự mâu thuẫn và xử lý nó theo kiểu không ai đoán nổi. */
const MOUSE_BUTTONS = Object.freeze({
  left: { name: "left", mask: 1 },
  right: { name: "right", mask: 2 },
  middle: { name: "middle", mask: 4 }
});
export const MOUSE_BUTTON_NAMES = Object.freeze(Object.keys(MOUSE_BUTTONS));
const MAX_CLICK_COUNT = 3;

const HISTORY_DIRECTIONS = Object.freeze(["back", "forward"]);

/* ---- HẠN CHO MỖI LỆNH CDP (thêm 14/09 sau một lượt đo đau) ----------------
 * Đo được: `Input.dispatchMouseEvent` kiểu `mouseWheel` **không bao giờ trả lời** trên tab của
 * Đức. Hậu quả không dừng ở "lệnh đó hỏng": lượt gọi treo giữ `chrome.debugger` **cắm vào tab**,
 * nên `finally { detach }` không bao giờ chạy, và từ đó **mọi** lệnh khác trên tab ấy trả
 * `TARGET_ALREADY_ATTACHED`. Đo thật: kẹt suốt 120 giây, phải `scout.reload` mới gỡ được.
 *
 * Nên hạn này KHÔNG phải để chữa `mouseWheel` (cái đó chữa bằng cách không dùng nó nữa). Nó chữa
 * cái **lớp** bệnh: *một lệnh CDP không trả lời thì khoá cả tab*. Đặt ở đây, một chỗ, nên nó che
 * mọi lệnh — kể cả lệnh chưa ai viết.
 *
 * 20.000ms: dưới ngưỡng 35.000ms mà máy chủ Bridge bỏ cuộc, nên người gọi nhận một lỗi CÓ TÊN
 * thay vì một `REQUEST_TIMEOUT` không nói được gì. Lệnh CDP chậm nhất đo được tới nay là một lượt
 * chụp cả trang, tính bằng giây chứ không phải chục giây. */
export const CDP_HAN_MS = 20000;

function choTraLoi(viec, hanMs, tenMethod, Loi) {
  if (!(hanMs > 0)) return viec;
  return new Promise((xong, hong) => {
    const dong = setTimeout(() => hong(new Loi("CDP_TIMEOUT",
      `Chrome không trả lời lệnh CDP "${tenMethod}" sau ${hanMs}ms. Bỏ cuộc để NHẢ debugger ra — ` +
      "một lượt gọi treo mà không nhả thì khoá cả tab cho mọi lệnh sau.")), hanMs);
    viec.then(
      (v) => { clearTimeout(dong); xong(v); },
      (e) => { clearTimeout(dong); hong(e); }
    );
  });
}

const MAX_SELECTOR_LENGTH = 1024;
const MAX_TEXT_LENGTH = 2000;

/* ---- Lỗi ---------------------------------------------------------------- */

export class ActionError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "ActionError";
    this.code = code;
  }
}

/* ---- Chốt ⑵ + ⑶: người gửi lệnh CDP đường ghi --------------------------- */

export function createWriteSender(sendRaw, log, hanMs = CDP_HAN_MS) {
  const allowed = new Set(WRITE_CDP_METHODS);
  return async function send(method, params = {}) {
    if (!allowed.has(method)) {
      throw new ActionError("CDP_METHOD_NOT_ALLOWED", `Method CDP "${method}" không nằm trong bộ hành động.`);
    }
    if (log) log.push({ method, params });
    return await choTraLoi(Promise.resolve(sendRaw(method, params)), hanMs, method, ActionError);
  };
}

/* ---- Cửa vào duy nhất --------------------------------------------------- */

/**
 * @param {string} name    một trong ACTION_NAMES
 * @param {object} deps    { sendRaw?: (method, params) => Promise<any> }
 * @param {object} params  tham số của hành động (DỮ LIỆU, không bao giờ là toạ độ hay mã phím)
 */
export async function runAction(name, deps = {}, params = {}) {
  if (!ACTION_NAMES.includes(name)) {
    return fail(name, "ACTION_UNKNOWN", `Không có hành động tên "${name}". Từ vựng cố định: ${ACTION_NAMES.join(", ")}.`, []);
  }
  const log = [];
  try {
    /* Chốt ⑶ chạy TRƯỚC mọi thứ khác, kể cả trước khi đọc selector: một yêu cầu mang toạ độ là
     * một yêu cầu sai từ trong ý định, đừng làm gì cho nó cả. */
    rejectCoordinates(params);
    if (typeof deps.sendRaw !== "function") throw new ActionError("DEPS_MISSING", "Hành động này cần deps.sendRaw.");
    const send = createWriteSender(deps.sendRaw, log);
    /* `cho` và `now` tiêm được để phép ghim không phải chờ thật — cùng quy ước với transport. */
    const ctx = {
      cho: typeof deps.cho === "function" ? deps.cho : (ms) => new Promise((r) => setTimeout(r, ms)),
      now: typeof deps.now === "function" ? deps.now : () => Date.now()
    };
    const data = await ACTIONS[name](send, params, ctx);
    return { ok: true, action: name, data, cdp: log };
  } catch (error) {
    const code = error instanceof ActionError ? error.code : "ACTION_FAILED";
    return fail(name, code, error?.message || String(error), log);
  }
}

function fail(action, code, detail, cdp) {
  return { ok: false, action, code, detail, cdp };
}

function rejectCoordinates(params) {
  if (!params || typeof params !== "object") return;
  for (const key of Object.keys(params)) {
    if (COORDINATE_PARAM_KEYS.includes(key)) {
      throw new ActionError("COORDINATE_NOT_ACCEPTED",
        `Tham số "${key}" chở toạ độ hoặc danh tính nút. Scouter tự tính toạ độ từ phần tử đã khớp; ` +
        "nhận toạ độ từ ngoài là bấm được vào bất kỳ đâu trên màn hình.");
    }
  }
}

/* ---- Ba hành động -------------------------------------------------------- */

const ACTIONS = {
  /* ① input.click — bấm vào ĐÚNG MỘT phần tử, bằng chuột thật của trình duyệt. */
  /* `button` và `click_count` MỞ 14/09 (`I7` — bấm phải / bấm đúp, [ADR-0007]). Thêm THAM SỐ
   * chứ không thêm method, cố ý: một lượt bấm phải khác một lượt bấm trái đúng hai trường trên
   * dây, và mọi thứ đắt giá của lượt bấm — khớp đúng một, đưa vào tầm nhìn, hỏi-điểm trước khi
   * bắn — thì y hệt. Tách thành `scout.rightclick` là chép ba cái chốt ấy sang chỗ thứ hai, và
   * chỗ thứ hai là chỗ người ta quên cập nhật.
   *
   * Không khai gì thì cư xử Y HỆT như trước: trái, một lượt. */
  /* ③c input.chon — SHIFT+CLICK, tức "thêm phần tử này vào tập đang chọn" (`R2-chon`, 16/09).
   *
   * Vì sao cần một thao tác RIÊNG chứ không phải một cờ của `input.click`: trên Udin, Shift+click
   * là cách người dùng dựng **thứ tự tham chiếu** — ảnh bấm trước mang huy hiệu `1`, ảnh sau mang
   * `2`, và prompt gọi chúng bằng `@1` / `@2` (*"APPLY STYLE OF @1 TO @2"*, Đức đo 16/09). Một cú
   * bấm THƯỜNG và một cú bấm GIỮ SHIFT là hai ý định khác nhau tới mức phải mang hai cái tên:
   * nhầm cái nào cũng ra một tập chọn khác, và prompt trỏ nhầm ảnh mà **không báo lỗi gì cả**.
   *
   * HỨA GÌ: *đã bắn một cú bấm trái có giữ Shift vào đúng phần tử đã khớp.* KHÔNG hứa *"phần tử
   * ấy nay đang được chọn"* — cùng lời hứa hẹp của `input.click` (`S-22`). Ai gọi thì tự kiểm
   * bằng trang; với Udin, dấu kiểm là con số đọc được trên `.selection-order-badge`. */
  async "input.chon"(send, params) {
    const selector = readSelector(params.selector);
    const node = await locateOne(send, selector);
    const point = await centreOf(send, node.nodeId);
    const hit = await kiemDiemBam(send, node.nodeId, point, await gocCuon(send, node.rootNodeId));
    await clickAt(send, point, MOUSE_BUTTONS.left, 1, SHIFT);
    return {
      selector, matchCount: node.matchCount, clickedAt: point, hit,
      phimBoTro: "Shift", method: "Input.dispatchMouseEvent"
    };
  },

  async "input.click"(send, params) {
    const selector = readSelector(params.selector);
    const nut = readNutChuot(params.button);
    const soLan = readSoLanBam(params.click_count);
    const node = await locateOne(send, selector);
    const point = await centreOf(send, node.nodeId);
    /* Chốt ⑸ đứng ĐÚNG Ở ĐÂY, giữa "đã có toạ độ" và "đã bắn": sớm hơn thì chưa có điểm để
     * hỏi, muộn hơn thì chuột đã đi rồi và câu trả lời chỉ còn là lời phân trần. */
    const hit = await kiemDiemBam(send, node.nodeId, point, await gocCuon(send, node.rootNodeId));
    await clickAt(send, point, nut, soLan);
    return {
      selector, matchCount: node.matchCount, clickedAt: point, hit,
      button: nut.name, clickCount: soLan, method: "Input.dispatchMouseEvent"
    };
  },

  /* input.hover — ĐƯA CHUỘT TỚI một phần tử mà KHÔNG bấm (`I6`).
   *
   * Vì sao cần: một phần menu chỉ tồn tại khi có chuột rê lên. Không rê được thì Scouter không
   * bao giờ nhìn thấy chúng, và mọi selector trỏ vào chúng đều báo `SELECTOR_NO_MATCH` — một
   * câu trả lời đúng cho một câu hỏi sai.
   *
   * NÓ VẪN HỎI-ĐIỂM TRƯỚC (chốt ⑸), y như lượt bấm, và đó không phải thừa: rê chuột lên một
   * phần tử đang bị che thì sự kiện tới CÁI CHE, còn Scouter thì báo thành công. Đúng kiểu nói
   * dối mà `S-17` mô tả, chỉ đổi loại sự kiện.
   *
   * HỨA GÌ: *đã đưa chuột tới đúng phần tử đã khớp.* KHÔNG hứa *"menu đã hiện"* — muốn biết
   * menu đã hiện thì hỏi trang bằng `scout.wait`. */
  async "input.hover"(send, params) {
    const selector = readSelector(params.selector);
    const node = await locateOne(send, selector);
    const point = await centreOf(send, node.nodeId);
    const hit = await kiemDiemBam(send, node.nodeId, point, await gocCuon(send, node.rootNodeId));
    await send("Input.dispatchMouseEvent", {
      type: "mouseMoved", x: point.x, y: point.y, button: "none", buttons: 0
    });
    return { selector, matchCount: node.matchCount, hoveredAt: point, hit, method: "Input.dispatchMouseEvent" };
  },

  /* input.scroll — ĐƯA MỘT PHẦN TỬ VÀO TẦM NHÌN (`I5`).
   *
   * Vì sao cần, dù `input.click` đã tự cuộn tới phần tử: nhiều lúc ta cần thứ đó **hiện ra** mà
   * KHÔNG bấm vào nó — để chụp nó, hoặc để một danh sách tải-thêm-khi-cuộn sinh ra phần tiếp
   * theo. Cuộn tới phần tử CUỐI đang có rồi lặp lại chính là cách kéo một danh sách vô hạn.
   *
   * ══ VÌ SAO KHÔNG PHẢI BÁNH XE CHUỘT, dù đó là bản viết đầu tiên ══
   * Bản đầu bắn `Input.dispatchMouseEvent` kiểu `mouseWheel` với hướng + số điểm ảnh. Nó **treo**
   * trên trang thật: 35 giây không một lời đáp, và lượt treo đó **giữ debugger cắm vào tab** nên
   * khoá luôn mọi lệnh sau — đo được, kẹt 120 giây, phải `scout.reload` mới gỡ (`G-72`).
   *
   * Phép đối chứng làm cho kết luận này chắc: `input.hover` chạy được trên **đúng cái tab ấy**,
   * cùng `Input.dispatchMouseEvent`, cùng lúc. Nên chỗ hỏng là riêng `mouseWheel` — không phải
   * tab ẩn, không phải method, không phải đường ống. Bánh xe chờ compositor báo đã nhận; các kiểu
   * sự kiện khác thì không.
   *
   * `DOM.scrollIntoViewIfNeeded` không đi qua compositor, và nó đã chạy hàng trăm lượt trong
   * `input.click` từ 06/09. Đổi sang nó là bỏ một cơ chế chưa chứng minh để lấy một cơ chế đã
   * chứng minh — mất khả năng "cuộn 600 điểm ảnh", giữ được khả năng THẬT SỰ cần.
   *
   * HỨA GÌ: *đã bảo trình duyệt đưa phần tử này vào tầm nhìn.* KHÔNG hứa *"nó đang hiện"* — một
   * phần tử trong khung không cuộn được thì lệnh này không làm gì cả mà cũng không lỗi. Thứ kiểm
   * được vẫn là `scout.view`: đọc `scroll` trước và sau. */
  async "input.scroll"(send, params) {
    const selector = readSelector(params.selector);
    const node = await locateOne(send, selector);
    await send("DOM.scrollIntoViewIfNeeded", { nodeId: node.nodeId });
    return { selector, matchCount: node.matchCount, method: "DOM.scrollIntoViewIfNeeded" };
  },

  /* input.history — LÙI / TIẾN trong lịch sử của đúng tab đó (`N5`).
   *
   * Vì sao cần: nhiều luồng việc là "vào xem chi tiết rồi quay lại danh sách". Làm việc đó bằng
   * `scout.navigate` tới url cũ là một trang KHÁC — mất vị trí cuộn, mất bộ lọc, mất trạng thái
   * mà trang giữ trong lịch sử. Lùi thật thì không mất.
   *
   * CHỐT AN TOÀN, và nó là lý do khối này dài hơn vẻ ngoài của nó: `Page.navigateToHistoryEntry`
   * nhận một `entryId` và nhảy tới **bất kỳ mục nào** trong lịch sử của tab. Người gọi ở đây
   * KHÔNG chạm tới `entryId`: họ nói `"back"` hoặc `"forward"`, còn chỉ số tính ở trong từ danh
   * sách vừa đọc, và chỉ đi được MỘT bước. Mở một tham số `entry_id` (hay `delta`) là biến một
   * lệnh lùi thành một con trỏ tự do vào lịch sử duyệt web của Đức.
   *
   * HẾT ĐƯỜNG THÌ TỪ CHỐI, không im lặng: `Page.navigateToHistoryEntry` với chỉ số ngoài khoảng
   * không báo lỗi ở nhiều phiên bản Chrome, nên một lượt "lùi" ở trang đầu tiên sẽ trông y hệt
   * một lượt lùi thành công. Đó là chỗ phải đỏ. */
  async "input.history"(send, params, ctx) {
    const huong = readHuongDi(params.direction);
    const hanMs = readHanCho(params.timeout_ms);

    const lichSu = await send("Page.getNavigationHistory", {});
    const muc = Array.isArray(lichSu?.entries) ? lichSu.entries : [];
    const viTri = Number(lichSu?.currentIndex);
    if (muc.length === 0 || !Number.isInteger(viTri) || viTri < 0 || viTri >= muc.length) {
      throw new ActionError("HISTORY_UNREADABLE",
        "Không đọc được lịch sử của tab này, nên không biết lùi/tiến sẽ đi đâu. Không biết thì không đi.");
    }
    const dich = viTri + (huong === "back" ? -1 : 1);
    if (dich < 0 || dich >= muc.length) {
      throw new ActionError("HISTORY_AT_END",
        `Không còn trang nào ở phía '${huong}': đang ở mục ${viTri + 1}/${muc.length} của lịch sử tab này.`);
    }

    const urlTruoc = muc[viTri]?.url ?? null;
    const taiLieuTruoc = (await danhTinhTaiLieu(send)) ?? null;
    await send("Page.navigateToHistoryEntry", { entryId: muc[dich].id });

    const batDau = ctx.now();
    let urlSau = urlTruoc;
    while (ctx.now() - batDau < hanMs) {
      await ctx.cho(250);
      const tin = await send("Target.getTargetInfo", {});
      urlSau = tin?.targetInfo?.url ?? null;
      const taiLieuSau = await danhTinhTaiLieu(send);
      if (taiLieuSau === undefined) continue;
      const doiTaiLieu = taiLieuTruoc !== null && taiLieuSau !== null && taiLieuSau !== taiLieuTruoc;
      if (!(urlSau && urlSau !== urlTruoc) && !doiTaiLieu) continue;
      return {
        direction: huong, from: urlTruoc, url: urlSau,
        entry: dich + 1, entries: muc.length, ms: ctx.now() - batDau,
        arrivedBy: doiTaiLieu ? "new_document" : "url_change"
      };
    }
    throw new ActionError("HISTORY_TIMEOUT",
      `Quá ${hanMs}ms mà chưa thấy trang đổi. Xin '${huong}' tới mục ${dich + 1}/${muc.length}, ` +
      `đang ở '${urlSau ?? "không đọc được"}'.`);
  },

  /* ② input.type — gõ một chuỗi vào ĐÚNG MỘT phần tử, từng phím một.
   * Không xoá nội dung cũ, cố ý: xoá hộ là đoán ý người gọi. Muốn xoá thì gõ `input.key`. */
  async "input.type"(send, params) {
    const selector = readSelector(params.selector);
    const text = readText(params.text);
    const node = await locateOne(send, selector);
    await send("DOM.focus", { nodeId: node.nodeId });
    for (const character of [...text]) await typeCharacter(send, character);
    return { selector, matchCount: node.matchCount, typed: text.length, method: "Input.dispatchKeyEvent" };
  },

  /* ③b input.clear — XOÁ SẠCH một ô nhập bằng bàn phím thật (`I4`).
   *
   * Vì sao cần: `scout.type` **không xoá chữ cũ**, nên `gui-prompt.mjs` phải từ chối khi ô đã
   * có chữ — tức là một phiên làm việc thật (nhiều lượt prompt trên cùng một ô) không chạy được.
   *
   * VÌ SAO KHÔNG MỞ "PHÍM BỔ TRỢ TỰ DO" cho `input.key`, dù đó là đường ngắn hơn: `Ctrl` + một
   * phím bất kỳ chạm tới **lệnh của trình duyệt**, không chỉ của trang — `Ctrl+W` đóng tab,
   * `Ctrl+N` mở cửa sổ, `Ctrl+Shift+N` mở ẩn danh. Mở một tham số `modifiers` là giao cả bộ đó
   * cho người gọi. Nên ở đây **phím `A` và phím bổ trợ `Ctrl` gõ cứng trong mã**: không tham số
   * nào của người gọi chạm tới chúng. Cùng khuôn với chốt ⑶ (toạ độ tính ở trong, không nhận
   * từ ngoài) — một thao tác có TÊN, không phải một cái máy gõ phím đa năng.
   *
   * HỨA GÌ: *đã gửi Ctrl+A rồi Delete vào đúng phần tử đã khớp.* KHÔNG hứa *"ô đã rỗng"* —
   * cùng lời hứa hẹp của `scout.click`/`scout.type` (`README`, `S-22`). Adapter tự kiểm bằng
   * trang: với Udin, ô rỗng thì nút Send khoá lại.
   *
   * GIỚI HẠN ĐÃ BIẾT, ghi ra thay vì giả vờ không có: trên macOS phím chọn-tất-cả là `Cmd+A`,
   * không phải `Ctrl+A`, nên thao tác này **không xoá được trên máy Mac**. Gói chạy trên Windows
   * của Đức. Ai chạy trên Mac thì đây là chỗ sửa, và dấu kiểm của adapter sẽ bắt được. */
  async "input.clear"(send, params) {
    const selector = readSelector(params.selector);
    const node = await locateOne(send, selector);
    await send("DOM.focus", { nodeId: node.nodeId });
    for (const type of ["keyDown", "keyUp"]) {
      await send("Input.dispatchKeyEvent", {
        type, key: "a", code: "KeyA", windowsVirtualKeyCode: 65, modifiers: CTRL
      });
    }
    const xoa = NAMED_KEYS.Delete;
    for (const type of ["keyDown", "keyUp"]) {
      await send("Input.dispatchKeyEvent", { type, key: "Delete", code: xoa.code, windowsVirtualKeyCode: xoa.vk });
    }
    return { selector, matchCount: node.matchCount, steps: ["Ctrl+A", "Delete"], method: "Input.dispatchKeyEvent" };
  },

  /* ⑸ input.upload — ĐƯA MỘT FILE TỪ VÙNG GHI VÀO MỘT Ô CHỌN TỆP (`T29`/`W8`, 16/09).
   *
   * Đọc khối `DOM.setFileInputFiles` ở `WRITE_CDP_METHODS` trước. Hai chốt sống ở ĐÂY:
   *
   * **`path_tuyet_doi` do MÁY CHỦ đặt, không phải người gọi.** Máy chủ ghi đè trường này ở mỗi
   * lượt chuyển tiếp, nên một người gọi tự điền vào đó chỉ tốn công. Ở đây ta không kiểm nó có
   * nằm trong vùng ghi không — **cố ý**: extension không biết vùng ghi ở đâu, và một phép kiểm
   * đoán chừng ở đây sẽ thành bản thứ hai của một luật, rồi lệch với bản thật. Ta chỉ kiểm nó
   * CÓ MẶT, và từ chối nếu thiếu.
   *
   * **Phần tử phải là `<input type="file">`, hỏi CHROME chứ không tự suy.** Ta chạy thêm một
   * lượt `DOM.querySelectorAll` với `input[type="file"]` rồi đòi nút của mình nằm trong đó.
   * Cách rẻ hơn — đọc `DOM.getAttributes` rồi tìm `type=file` — sai ở chỗ một `<div type="file">`
   * cũng lọt, và `DOM.setFileInputFiles` lên một phần tử không phải ô chọn tệp thì báo lỗi
   * của Chrome, đọc không ra nguyên nhân. Một lượt dò thêm rẻ hơn một câu lỗi khó hiểu. */
  /* ⑹ input.tha — KÉO-THẢ MỘT TỆP VÀO MỘT PHẦN TỬ (đường ⒝, 16/09 khuya).
   *
   * Cùng việc với `input.upload`, khác đúng một chỗ và chỗ ấy là lý do nó tồn tại: **nó không
   * đi qua hộp thoại chọn tệp nào cả.** `input.upload` phải bấm một nút để trang dựng ô nhận
   * file ra, và cú bấm ấy — đo trên máy Đức 16/09 — **bật hộp thoại `Open` của Windows lên màn
   * hình anh**, mỗi lượt một cú Cancel. Đường này bỏ hẳn cái hộp thoại thay vì đi chặn nó.
   *
   * Ba khoá giữ nguyên, không nới một cái nào: `path_tuyet_doi` do MÁY CHỦ đặt · selector khớp
   * ĐÚNG MỘT · toạ độ suy từ hộp phần tử rồi kiểm điểm bấm. Method CDP nhận `x`/`y`, nên chốt ⑶
   * phải canh đúng ở đây — nhận toạ độ từ ngoài là biến nó thành *"thả tệp vào bất kỳ đâu"*.
   *
   * HỨA GÌ: *đã bắn đủ chuỗi `dragEnter → dragOver → drop` mang đúng tệp ấy vào đúng phần tử đã
   * khớp.* KHÔNG hứa *"trang đã nhận ảnh"* — trang có thể bỏ qua sự kiện thả, hoặc nhận rồi tải
   * lên máy chủ của nó mà hỏng. Người gọi đếm lại trên trang. */
  async "input.tha"(send, params) {
    const duong = params.path_tuyet_doi;
    if (typeof duong !== "string" || duong.trim() === "") {
      throw new ActionError("UPLOAD_PATH_MISSING",
        "Thiếu `path_tuyet_doi`. Trường đó do MÁY CHỦ Bridge đặt từ `path` tương đối — extension " +
        "không tự ghép đường dẫn bao giờ.");
    }
    const selector = readSelector(params.selector);
    const node = await locateOne(send, selector);
    const point = await centreOf(send, node.nodeId);
    const hit = await kiemDiemBam(send, node.nodeId, point, await gocCuon(send, node.rootNodeId));

    /* `dragOperationsMask: 1` = "copy" — đúng thứ Explorer gửi khi kéo một tệp vào trình duyệt. */
    const duLieu = { items: [], files: [duong], dragOperationsMask: 1 };
    for (const type of ["dragEnter", "dragOver", "drop"]) {
      await send("Input.dispatchDragEvent", { type, x: point.x, y: point.y, data: duLieu });
    }
    return {
      selector, matchCount: node.matchCount, thaTai: point, hit,
      path: typeof params.path === "string" ? params.path : null, files: 1,
      method: "Input.dispatchDragEvent"
    };
  },

  async "input.upload"(send, params) {
    const duong = params.path_tuyet_doi;
    if (typeof duong !== "string" || duong.trim() === "") {
      throw new ActionError("UPLOAD_PATH_MISSING",
        "Thiếu `path_tuyet_doi`. Trường đó do MÁY CHỦ Bridge đặt từ `path` tương đối — extension " +
        "không tự ghép đường dẫn bao giờ. Lệnh này chạy trên một máy chủ không có móc ấy thì " +
        "phải chết, chứ không được đoán lấy một đường dẫn.");
    }
    /* HAI ĐƯỜNG, và người gọi phải chọn ĐÚNG MỘT. Không có mặc định, cố ý: hai đường này nhìn
     * giống nhau mà rủi ro khác hẳn, nên bắt khai ra thay vì đoán hộ. */
    const coSel = params.selector !== undefined && params.selector !== null;
    const coMo = params.mo_bang !== undefined && params.mo_bang !== null;
    if (coSel === coMo) {
      throw new ActionError("UPLOAD_MODE_UNCLEAR",
        "Chọn ĐÚNG MỘT: `selector` (ô chọn tệp đã có sẵn trên trang) hoặc `mo_bang` (selector của " +
        "nút phải bấm để trang dựng ô ấy ra). Khai cả hai, hoặc không khai gì, đều là chưa quyết.");
    }

    const ketQua = coMo
      ? await taiLenQuaNutMo(send, readSelector(params.mo_bang), duong)
      : await taiLenVaoOSan(send, readSelector(params.selector), duong);

    /* Trả về `path` TƯƠNG ĐỐI mà người gọi đưa, không trả đường tuyệt đối: nhật ký không cần
     * chở cả đường dẫn ổ đĩa, và người gọi vốn đã biết thứ mình xin. */
    return { ...ketQua, path: typeof params.path === "string" ? params.path : null, files: 1 };
  },

  /* ③ input.key — gõ MỘT phím có tên, chọn từ bảng cố định. */
  /* ④ input.navigate — ĐI SANG TRANG KHÁC, rồi đợi tới nơi.
   *
   * Vì sao là một thao tác TRỌN GÓI chứ không phải một máy trạng thái sáu bước: "đi" và "làm
   * tiếp" là hai lượt gọi riêng, và `target_id` là thứ nối chúng lại. Không có trạng thái nào
   * cần sống xuyên qua lần đổi trang, nên đừng dựng chỗ chứa nó.
   *
   * KHÔNG khẳng định đã tới ĐÚNG url đã xin. Chuyển hướng là chuyện bình thường, và một phép
   * so bằng sẽ báo hỏng cho một lượt đi hoàn toàn thành công. Thay vào đó nó TRẢ VỀ url thật
   * đã tới, và người gọi tự đối chiếu — đó là sự thật, không phải lời hứa.
   *
   * "Tới nơi" = đọc được tài liệu, VÀ có một trong hai dấu hiệu đã đi: url đổi, HOẶC tài liệu
   * được thay mới. Thiếu vế "đọc được" thì một trang mới bắt đầu tải cũng tính là xong, và
   * lượt `scout.page` ngay sau đó đọc phải trang rỗng.
   *
   * VÌ SAO HAI DẤU HIỆU CHỨ KHÔNG MỘT (`S-19`, vá 12/09). Bản cũ chỉ chờ url đổi, và nó có
   * đúng một lỗ: **đi tới đúng url đang đứng thì url không bao giờ đổi.** Lượt đó treo hết
   * 15 giây rồi trả `NAVIGATE_TIMEOUT` — một câu SAI NGUYÊN NHÂN, trong khi trang đã tải lại
   * thật. Nạp lại trang là việc cơ bản của mọi vòng thuần hoá (thử lại từ trạng thái sạch),
   * nên khuyết tật này gặp ở mọi trang. Đo 12/09 trên Udin, tái hiện lần hai trên trang tự
   * dựng — nguyên văn: *"Xin đi 'http://127.0.0.1:38411/', đang ở 'http://127.0.0.1:38411/'
   * (url chưa đổi)."* Hai vế cùng một url, in cạnh nhau.
   *
   * Nhưng dấu hiệu "tài liệu mới" MỘT MÌNH cũng không đủ: đi tới `#muc-2` trên chính trang
   * đang mở là một lượt điều hướng **trong cùng tài liệu** — url đổi, tài liệu thì không.
   * Hai ca đó loại trừ nhau, nên nhận CẢ HAI dấu hiệu là câu trả lời duy nhất phủ hết. */
  async "input.navigate"(send, params, ctx) {
    const url = readUrlDi(params.url);
    const hanMs = readHanCho(params.timeout_ms);

    const truoc = await send("Target.getTargetInfo", {});
    const urlTruoc = truoc?.targetInfo?.url ?? null;
    /* `?? null` KHÔNG phải thói quen gõ máy: `danhTinhTaiLieu` trả `undefined` khi chưa đọc
     * được tài liệu, và để nguyên `undefined` thì phép so bên dưới thấy "khác con số nào cũng
     * khác" — tức là lượt điều hướng nào cũng xong ngay nhịp đầu. Không đọc được tài liệu
     * TRƯỚC khi đi thì ta KHÔNG BIẾT danh tính cũ, và "không biết" là `null`. */
    const taiLieuTruoc = (await danhTinhTaiLieu(send)) ?? null;

    const ket = await send("Page.navigate", { url });
    /* `Page.navigate` trả 200 kèm `errorText` khi Chrome từ chối đi — im lặng bỏ qua trường
     * đó là báo thành công cho một lượt chưa bao giờ rời trang cũ. */
    if (ket && typeof ket.errorText === "string" && ket.errorText !== "") {
      throw new ActionError("NAVIGATE_REFUSED", `Chrome từ chối đi tới '${url}': ${ket.errorText}`);
    }

    const batDau = ctx.now();
    let urlSau = urlTruoc;
    let doiUrl = false;
    let docDuoc = false;
    while (ctx.now() - batDau < hanMs) {
      await ctx.cho(250);
      const tin = await send("Target.getTargetInfo", {});
      urlSau = tin?.targetInfo?.url ?? null;
      doiUrl = Boolean(urlSau && urlSau !== urlTruoc);

      /* Đọc tài liệu LUÔN, không chỉ khi url đã đổi: chính lượt đọc này vừa là phép kiểm
       * "trang đã sẵn sàng chưa" vừa là phép kiểm "đây có phải một tài liệu KHÁC không". */
      const taiLieuSau = await danhTinhTaiLieu(send);
      if (taiLieuSau === undefined) continue;   // chưa đọc được tài liệu → chưa tới nơi
      docDuoc = true;
      const doiTaiLieu = taiLieuTruoc !== null && taiLieuSau !== null && taiLieuSau !== taiLieuTruoc;
      if (!doiUrl && !doiTaiLieu) continue;

      return {
        requested: url, url: urlSau, from: urlTruoc,
        ms: ctx.now() - batDau, redirected: urlSau !== url,
        /* Nói ra ĐÃ BIẾT BẰNG CÁCH NÀO. Hai dấu hiệu nghĩa là hai chuyện khác nhau đã xảy ra,
         * và người gọi một lượt nạp lại cần phân biệt được "trang đã dựng lại" với "mới chỉ
         * nhảy tới một mục khác trong cùng trang". */
        arrivedBy: doiTaiLieu ? "new_document" : "url_change",
        reloaded: urlSau === urlTruoc
      };
    }
    /* Câu lỗi phải nói ĐÚNG cái đã quan sát được, theo cả hai trục. Bản cũ chỉ có một trục
     * nên nó nói "(url chưa đổi)" cho một lượt nạp lại hoàn toàn thành công — và đó chính là
     * `S-19`: không phải treo mới đắt, mà là treo RỒI NÓI SAI NGUYÊN NHÂN. */
    throw new ActionError("NAVIGATE_TIMEOUT",
      `Quá ${hanMs}ms mà chưa tới nơi. Xin đi '${url}', đang ở '${urlSau ?? "không đọc được"}'. ` +
      (doiUrl ? "url đã đổi" : "url KHÔNG đổi") + "; " +
      (docDuoc ? "tài liệu đọc được nhưng KHÔNG phải một tài liệu mới" : "tài liệu chưa đọc được") +
      (taiLieuTruoc === null
        ? ". (Chrome không cho biết danh tính tài liệu ở lượt này, nên chỉ còn dấu hiệu url.)"
        : "."));
  },

  async "input.key"(send, params) {
    const selector = readSelector(params.selector);
    const keyName = readKeyName(params.key);
    const descriptor = NAMED_KEYS[keyName];
    const node = await locateOne(send, selector);
    await send("DOM.focus", { nodeId: node.nodeId });
    const down = { type: "keyDown", key: keyName, code: descriptor.code, windowsVirtualKeyCode: descriptor.vk };
    if (descriptor.text) {
      down.text = descriptor.text;
      down.unmodifiedText = descriptor.text;
    }
    await send("Input.dispatchKeyEvent", down);
    await send("Input.dispatchKeyEvent", { type: "keyUp", key: keyName, code: descriptor.code, windowsVirtualKeyCode: descriptor.vk });
    return { selector, matchCount: node.matchCount, key: keyName, method: "Input.dispatchKeyEvent" };
  },

  /* ⑤ input.grabUrl — đọc URL ĐẦY ĐỦ của đúng một phần tử, cho `scout.grab` dùng TRONG MÁY.
   *
   * Vì sao nó tồn tại (`S-24`, Đức chốt 14/09 đường ⒜): ảnh của một trang thật thường nằm sau
   * một **URL ký sẵn** — chữ ký và hạn giờ nằm trong query. Lõi ĐỌC cắt query khỏi mọi
   * `src`/`href`, và cắt đúng như thế là ĐÚNG: query là chỗ token hay nằm. Nên đường lấy file
   * không phải nới lõi đọc, mà là: **đọc URL ở trong, dùng ở trong, không bao giờ phát ra dây.**
   * Cùng khuôn với chốt ⑶ của file này — toạ độ cũng được tính ở trong và không nhận từ ngoài.
   *
   * HAI CHỖ ĐỪNG ĐẢO LẠI:
   *   · **Không lệnh Bridge nào ánh xạ tới hành động này.** Nó trả `url` đầy đủ; ai nối nó ra
   *     dây là phát chữ ký ra ngoài. `scout.grab` gọi nó, tải file, rồi trả BYTE.
   *   · **Lời báo lỗi không được chở lại giá trị thuộc tính.** Một `URL_INVALID` in kèm chuỗi
   *     gốc là đúng cái rò rỉ đó, chỉ mặc áo thông báo lỗi. */
  async "input.grabUrl"(send, params) {
    const selector = readSelector(params.selector);
    const attribute = readAttrName(params.attribute);
    const node = await locateOne(send, selector);

    const got = await send("DOM.getAttributes", { nodeId: node.nodeId });
    /* CDP trả mảng phẳng [tên, giá_trị, tên, giá_trị, …]. */
    const flat = Array.isArray(got?.attributes) ? got.attributes : [];
    let raw = null;
    for (let i = 0; i + 1 < flat.length; i += 2) {
      if (String(flat[i]) === attribute) { raw = String(flat[i + 1] ?? ""); break; }
    }
    if (raw === null || raw.trim() === "") {
      throw new ActionError("ATTRIBUTE_MISSING",
        `Phần tử khớp selector không có thuộc tính '${attribute}' hoặc thuộc tính rỗng.`);
    }

    let url;
    try { url = new URL(raw, node.baseURL || undefined); }
    catch {
      throw new ActionError("URL_INVALID",
        `Thuộc tính '${attribute}' không phải một URL đọc được (${raw.length} ký tự).`);
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      /* `blob:` và `data:` thuộc về TAB, máy phục vụ nền không với tới; `file:` là đĩa của Đức. */
      throw new ActionError("URL_INVALID",
        `Thuộc tính '${attribute}' trỏ tới '${url.protocol}', chỉ lấy được http hoặc https.`);
    }

    /* `masked` là thứ DUY NHẤT của URL được phép đi ra dây: gốc + đường dẫn, không query,
     * không fragment — đúng bằng thứ lõi đọc vẫn cho phép, nên nó không mở thêm gì. */
    return {
      url: url.href,
      masked: `${url.origin}${url.pathname}`,
      attribute,
      selector,
      matchCount: node.matchCount
    };
  }
};

/* ---- Phụ trợ ------------------------------------------------------------ */

/* Danh tính của TÀI LIỆU đang mở — `S-19`.
 *
 * Trả về `undefined` nghĩa là *chưa đọc được* (đang tải dở), `null` nghĩa là *đọc được nhưng
 * Chrome không cho biết danh tính*, và một con số là danh tính thật. Ba trạng thái, không hai:
 * gộp "chưa đọc được" với "không biết" lại thì một trang đang tải dở bị tính là một trang có
 * danh tính không đổi, và lượt chờ thoát sớm.
 *
 * DÙNG `backendNodeId`, KHÔNG DÙNG `nodeId`. `nodeId` là số thứ tự trong bảng tra của phiên
 * debug và nó ĐƯỢC CẤP LẠI mỗi lượt `DOM.getDocument` — nút gốc gần như luôn là `1`, nên so
 * `nodeId` là so hai con số luôn bằng nhau: một phép kiểm không bao giờ báo gì.
 * `backendNodeId` là danh tính Chrome cấp cho một nút THẬT trong trình duyệt, và một lượt tải
 * mới dựng một tài liệu mới, nên con số đó đổi.
 *
 * Chrome không trả `backendNodeId` thì hàm này trả `null` và lượt điều hướng **tự động lùi về
 * đúng hành vi cũ** — chỉ còn dấu hiệu url. Thoái lui êm, không nổ. */
async function danhTinhTaiLieu(send) {
  let doc;
  try { doc = await send("DOM.getDocument", { depth: 0 }); }
  catch { return undefined; }
  const goc = doc?.root;
  if (!goc) return undefined;
  return typeof goc.backendNodeId === "number" ? goc.backendNodeId : null;
}

/* Chỉ http(s). `javascript:` chạy mã, `file:` đọc đĩa, `chrome-extension:` vào ruột
 * extension — cả ba là ba lối thoát khác nhau ra khỏi "đi tới một trang web". */
function readUrlDi(value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new ActionError("URL_INVALID", "Tham số url phải là một chuỗi không rỗng.");
  }
  if (value.length > 2048) throw new ActionError("URL_INVALID", "url dài quá 2048 ký tự.");
  let phanTich;
  try { phanTich = new URL(value); }
  catch { throw new ActionError("URL_INVALID", `Không phải một url hợp lệ: '${value}'.`); }
  if (phanTich.protocol !== "http:" && phanTich.protocol !== "https:") {
    throw new ActionError("URL_INVALID",
      `Chỉ đi tới http hoặc https. Nhận được '${phanTich.protocol}'.`);
  }
  return phanTich.href;
}

/* Trần 30000 (hạ từ 60000 ngày 12/09, `S-16`). Không phải vì 60 giây là quá lâu để chờ một
 * trang, mà vì **máy chủ Bridge cắt lượt chuyển tiếp ở 35 giây**: xin chờ 60 thì tới giây thứ
 * 35 người gọi đã nhận `REQUEST_TIMEOUT` trong khi extension vẫn đang chờ tiếp. Hai đầu tin
 * hai chuyện khác nhau, và đó là chỗ hỏng đắt hơn hẳn một hạn chờ ngắn.
 *
 * Số này phải dưới `deadline_ms` của `scout.navigate` (34000) một quãng đủ cho lượt trả lời
 * đi về. Đổi một trong hai thì phải đổi cùng nhau — con `B9` canh cặp đó. */
function readHanCho(value) {
  if (value === undefined || value === null) return 15000;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1000 || value > 30000) {
    throw new ActionError("TIMEOUT_INVALID", "timeout_ms phải là số nguyên trong 1000..30000.");
  }
  return value;
}

function readSelector(value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new ActionError("SELECTOR_REQUIRED", "Hành động cần tham số `selector` là chuỗi không rỗng.");
  }
  if (value.length > MAX_SELECTOR_LENGTH) {
    throw new ActionError("SELECTOR_TOO_LONG", `Selector dài quá ${MAX_SELECTOR_LENGTH} ký tự.`);
  }
  return value;
}

function readText(value) {
  if (typeof value !== "string" || value === "") {
    throw new ActionError("TEXT_REQUIRED", "`input.type` cần tham số `text` là chuỗi không rỗng.");
  }
  if (value.length > MAX_TEXT_LENGTH) {
    throw new ActionError("TEXT_TOO_LONG", `Chuỗi dài quá ${MAX_TEXT_LENGTH} ký tự.`);
  }
  /* Ký tự điều khiển đi đường `input.key`, không đi đường này: một `\n` lọt vào giữa chuỗi là
   * một lượt gửi biểu mẫu mà người gọi không hề yêu cầu. */
  for (const character of value) {
    const point = character.codePointAt(0);
    if (point < 0x20 || point === 0x7f) {
      throw new ActionError("TEXT_HAS_CONTROL_CHAR",
        "Chuỗi chứa ký tự điều khiển. Enter/Tab/Backspace đi qua `input.key`, không đi qua `input.type`.");
    }
  }
  return value;
}

function readNutChuot(value) {
  if (value === undefined || value === null) return MOUSE_BUTTONS.left;
  if (typeof value !== "string" || !Object.hasOwn(MOUSE_BUTTONS, value)) {
    throw new ActionError("BUTTON_NOT_ALLOWED",
      `Nút chuột "${value}" không có trong bảng. Bảng cố định: ${MOUSE_BUTTON_NAMES.join(", ")}.`);
  }
  return MOUSE_BUTTONS[value];
}

function readSoLanBam(value) {
  if (value === undefined || value === null) return 1;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > MAX_CLICK_COUNT) {
    throw new ActionError("CLICK_COUNT_INVALID", `\`click_count\` phải là số nguyên trong 1..${MAX_CLICK_COUNT}.`);
  }
  return value;
}

function readHuongDi(value) {
  if (typeof value !== "string" || !HISTORY_DIRECTIONS.includes(value)) {
    throw new ActionError("DIRECTION_NOT_ALLOWED",
      `Hướng "${value}" không có trong bảng. Bảng cố định: ${HISTORY_DIRECTIONS.join(", ")}.`);
  }
  return value;
}

function readKeyName(value) {
  if (typeof value !== "string" || !Object.hasOwn(NAMED_KEYS, value)) {
    throw new ActionError("KEY_NOT_ALLOWED",
      `Phím "${value}" không có trong bảng. Bảng cố định: ${NAMED_KEY_NAMES.join(", ")}.`);
  }
  return value;
}

/* Chốt ⑷ sống ở đây. `DOM.querySelectorAll` trả về TOÀN BỘ khớp, nên ta biết con số thật —
 * và từ chối khi nó không phải 1. */
/* Trần chờ ô nhận file hiện ra sau cú bấm, và nhịp hỏi lại. Nhỏ: trang dựng ô ấy ngay trong
 * chính lượt xử lý cú bấm, nên nó có mặt gần như tức thì — đo 16/09 thấy nó đã ở đó sau 700ms.
 * Trần rộng hơn chỉ kéo dài thời gian cái chặn hộp thoại còn BẬT, mà đó là thứ phải ngắn. */
const UPLOAD_CHO_MS = 4000;
const UPLOAD_NHIP_MS = 150;

/** Hỏi trang xem có đúng những nút nào là `<input type="file">`. */
async function timOTep(send) {
  const doc = await send("DOM.getDocument", { depth: 0, pierce: false });
  const root = doc?.root;
  if (!root?.nodeId) throw new ActionError("NO_DOCUMENT", "Target không trả về document nào.");
  const found = await send("DOM.querySelectorAll", { nodeId: root.nodeId, selector: "input[type=\"file\"]" });
  return found?.nodeIds || [];
}

/** Đường ⒜ — ô chọn tệp ĐÃ CÓ SẴN trên trang. */
async function taiLenVaoOSan(send, selector, duong) {
  const node = await locateOne(send, selector);
  const oTep = await timOTep(send);
  if (!oTep.includes(node.nodeId)) {
    throw new ActionError("NOT_A_FILE_INPUT",
      `Selector '${selector}' khớp một phần tử KHÔNG phải <input type="file">. Trang có ` +
      `${oTep.length} ô chọn tệp. Hỏi Chrome khớp CSS, không đọc thuộc tính rồi suy: ` +
      "một `<div type=\"file\">` lọt qua phép suy ấy.");
  }
  await send("DOM.setFileInputFiles", { nodeId: node.nodeId, files: [duong] });
  return { selector, matchCount: node.matchCount, method: "DOM.setFileInputFiles", mo_bang: null };
}

/* Đường ⒝ — trang KHÔNG có sẵn ô nào; phải bấm một nút để nó dựng ô ra. Đo trên trang Udin
 * 16/09: bấm `Image` thì một `<input type="file">` hiện ra, và trang XOÁ nó đi ngay sau khi
 * người dùng chọn xong. Cửa sổ sống của nó ≈ khoảng thời gian hộp thoại đang mở.
 *
 * Nên trình tự bắt buộc là: **CHẶN hộp thoại TRƯỚC, rồi mới bấm.** Bấm trước thì hộp thoại của
 * hệ điều hành dựng lên màn hình Đức và đứng đó tới khi có người bấm tay — đúng cái đã hai lần
 * bị từ chối.
 *
 * Và lượt TẮT chặn nằm trong `finally`, không có ngoại lệ: để quên nó bật thì hộp thoại mà chính
 * Đức mở cũng im lặng không hiện, và không có thông báo nào chỉ về đây. */
async function taiLenQuaNutMo(send, moBang, duong) {
  const truoc = await timOTep(send);
  const nut = await locateOne(send, moBang);
  const diem = await centreOf(send, nut.nodeId);
  const hit = await kiemDiemBam(send, nut.nodeId, diem, await gocCuon(send, nut.rootNodeId));

  await send("Page.setInterceptFileChooserDialog", { enabled: true });
  try {
    await clickAt(send, diem, readNutChuot(undefined), 1);

    let moi = [];
    for (let i = 0; i * UPLOAD_NHIP_MS < UPLOAD_CHO_MS; i += 1) {
      const nay = await timOTep(send);
      moi = nay.filter((id) => !truoc.includes(id));
      if (moi.length) break;
      await new Promise((r) => setTimeout(r, UPLOAD_NHIP_MS));
    }

    if (moi.length === 0) {
      throw new ActionError("NO_FILE_CHOOSER",
        `Bấm '${moBang}' xong mà trang KHÔNG dựng thêm ô chọn tệp nào trong ${UPLOAD_CHO_MS}ms. ` +
        `Trước cú bấm đã có ${truoc.length} ô. Có thể nút ấy không mở cửa chọn tệp, hoặc nó mở ` +
        "một cửa khác (kéo-thả, dán) mà đường này không với tới.");
    }
    if (moi.length > 1) {
      throw new ActionError("SELECTOR_AMBIGUOUS",
        `Cú bấm dựng ra ${moi.length} ô chọn tệp mới. Đổ file vào "cái đầu tiên" là chỗ tự động ` +
        "hoá phá hỏng đồ thật — từ chối, và đưa `selector` trỏ đích danh nếu bạn biết cái nào.");
    }
    await send("DOM.setFileInputFiles", { nodeId: moi[0], files: [duong] });
    return { selector: null, mo_bang: moBang, matchCount: nut.matchCount, hit, method: "DOM.setFileInputFiles" };
  } finally {
    /* KHÔNG có `catch` ở đây: một lượt tắt hỏng phải nổi lên cho người gọi thấy, vì hậu quả của
     * nó là Chrome của Đức im lặng nuốt mọi hộp thoại chọn tệp. */
    await send("Page.setInterceptFileChooserDialog", { enabled: false });
  }
}

async function locateOne(send, selector) {
  await send("DOM.enable", {});
  const doc = await send("DOM.getDocument", { depth: 0, pierce: false });
  const root = doc?.root;
  if (!root?.nodeId) throw new ActionError("NO_DOCUMENT", "Target không trả về document nào.");

  let found;
  try {
    found = await send("DOM.querySelectorAll", { nodeId: root.nodeId, selector });
  } catch (error) {
    if (error instanceof ActionError) throw error;
    throw new ActionError("SELECTOR_INVALID", `Chrome từ chối selector: ${error?.message || String(error)}`);
  }
  const nodeIds = found?.nodeIds || [];
  if (nodeIds.length === 0) {
    throw new ActionError("SELECTOR_NO_MATCH", `Selector không khớp phần tử nào: ${selector}`);
  }
  if (nodeIds.length > 1) {
    throw new ActionError("SELECTOR_AMBIGUOUS",
      `Selector khớp ${nodeIds.length} phần tử. Hành động chỉ chạy khi khớp đúng một — ` +
      "bấm vào 'cái đầu tiên' là chỗ tự động hoá phá hỏng đồ thật.");
  }
  /* `baseURL` để `input.grabUrl` giải được một `src` tương đối. Trường THÊM, không đổi thứ
   * ba hành động cũ đang đọc. */
  return {
    nodeId: nodeIds[0],
    matchCount: nodeIds.length,
    rootNodeId: root.nodeId,
    baseURL: typeof root.baseURL === "string" ? root.baseURL : (typeof root.documentURL === "string" ? root.documentURL : null)
  };
}

/* Chỉ HAI thuộc tính lấy được, và cả hai đều là thuộc tính URL mà lõi đọc đang cắt query.
 * Danh sách TRẮNG, không phải danh sách đen: mở theo nhu cầu thật, không mở trước. */
export const GRAB_ATTRIBUTES = Object.freeze(["src", "href"]);

function readAttrName(value) {
  if (value === undefined || value === null) return "src";
  if (typeof value !== "string" || !GRAB_ATTRIBUTES.includes(value)) {
    throw new ActionError("ATTRIBUTE_NOT_ALLOWED",
      `Chỉ lấy được thuộc tính ${GRAB_ATTRIBUTES.join(" hoặc ")}. Nhận được: ${JSON.stringify(value)}.`);
  }
  return value;
}

/* Chốt ⑶ sống ở đây: toạ độ suy từ hộp của chính phần tử, không từ tham số nào. */
async function centreOf(send, nodeId) {
  /* Đưa vào tầm nhìn trước khi đo hộp: phần tử nằm ngoài màn hình có hộp, nhưng bấm vào toạ độ
   * đó là bấm vào chỗ khác đang hiển thị ở đấy. */
  try { await send("DOM.scrollIntoViewIfNeeded", { nodeId }); }
  catch { /* Một số nút không cuộn được; hộp bên dưới vẫn là trọng tài. */ }

  const box = await send("DOM.getBoxModel", { nodeId });
  const quad = box?.model?.content;
  if (!Array.isArray(quad) || quad.length !== 8) {
    throw new ActionError("ELEMENT_NOT_VISIBLE",
      "Phần tử không có hộp hiển thị (ẩn, rộng bằng 0, hoặc chưa dựng). Không bấm vào thứ không nhìn thấy.");
  }
  const xs = [quad[0], quad[2], quad[4], quad[6]];
  const ys = [quad[1], quad[3], quad[5], quad[7]];
  const x = (Math.min(...xs) + Math.max(...xs)) / 2;
  const y = (Math.min(...ys) + Math.max(...ys)) / 2;
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    throw new ActionError("ELEMENT_NOT_VISIBLE", "Hộp của phần tử không cho ra toạ độ hữu hạn.");
  }
  /* LÀM TRÒN NGAY TẠI ĐÂY, không làm tròn lúc hỏi. `DOM.getNodeForLocation` chỉ nhận số
   * nguyên, còn khung chuột nhận số lẻ — hai đầu làm tròn riêng là hỏi về một điểm rồi bấm
   * vào một điểm khác, và chốt ⑸ mất nghĩa đúng ở nửa pixel đó. Một chỗ làm tròn, một điểm. */
  return { x: Math.round(x), y: Math.round(y) };
}

/* Chốt ⑸ sống ở đây — `S-17`.
 *
 * Câu hỏi: *điểm sắp bấm thuộc về ai?* Ba câu trả lời, và cả ba đều phải nói thật:
 *   · chính phần tử đã khớp          → bấm
 *   · con cháu của nó                → bấm (nút có icon: `<button><svg><path>`)
 *   · thứ khác, hoặc không biết      → TỪ CHỐI, hai mã lỗi khác nhau
 *
 * Vì sao hai mã chứ không một: *"có thứ khác chắn"* và *"Chrome không trả lời được"* dẫn tới
 * hai cách sửa khác nhau. Gộp chúng lại là bắt người đọc log đoán mình đang gặp cái nào.
 *
 * Vì sao TỪ CHỐI khi không biết, thay vì cứ bấm: hỏng thì ĐÓNG, giống hệt công tắc đường ghi.
 * Một lượt bấm không kiểm được chính là trạng thái mà `S-17` mô tả — quay về nó lúc gặp khó
 * là bỏ luôn chốt này.
 *
 * Tìm con cháu bằng `DOM.querySelectorAll(nodeId của phần tử, "*")` — method đã có sẵn trong
 * danh sách, nên chốt này chỉ tốn ĐÚNG MỘT method mới. Hằng số `"*"` gõ cứng trong mã, không
 * ghép từ dữ liệu người gọi. */
async function kiemDiemBam(send, nodeId, point, goc) {
  let o;
  try {
    o = await send("DOM.getNodeForLocation", {
      x: Math.round(point.x + goc.x), y: Math.round(point.y + goc.y), includeUserAgentShadowDOM: false
    });
  } catch (error) {
    if (error instanceof ActionError) throw error;
    /* ĐO THẬT 12/09, và NGUYÊN NHÂN THÌ CHƯA BIẾT — nói đúng mức đó, đừng nói hơn.
     * Quan sát được: trên một target, Chrome trả `-32000 No node found at given location`
     * cho đúng toạ độ mà vài phút trước nó trả lời bình thường; `scout.shot` trên cùng
     * target ấy cũng hỏng cùng lúc; sau một lượt điều hướng thật thì cả hai trở lại bình
     * thường. Ba dấu hiệu đó khớp nhau, nhưng chúng KHÔNG chứng minh được vì sao — một
     * chẩn đoán sai mà nghe có thẩm quyền thì đắt hơn một ô trống. Ghi ở `S-21`.
     *
     * Đừng để câu tiếng Anh thô của CDP đi thẳng ra ngoài dây một mình: người đọc nó sẽ đi
     * sửa selector, và selector không phải chỗ hỏng. */
    throw new ActionError("CLICK_HIT_TEST_FAILED",
      `Chrome không trả lời được "điểm (${point.x}, ${point.y}) là phần tử nào": ` +
      `${error?.message || String(error)}. Không kiểm được thì không bấm. Đo được 12/09: ` +
      "target rơi vào trạng thái này thì `scout.shot` cũng hỏng cùng lúc, và một lượt " +
      "`scout.navigate` thật làm cả hai trở lại bình thường. Chưa biết vì sao — xem `S-21`.");
  }
  const nutTrungDiem = o?.nodeId;
  if (typeof nutTrungDiem !== "number") {
    throw new ActionError("CLICK_HIT_TEST_FAILED",
      `Chrome không nói được phần tử nào nằm ở (${point.x}, ${point.y}). Không kiểm được thì ` +
      "không bấm — một lượt bấm không kiểm được đúng là chỗ hỏng S-17 mô tả.");
  }
  if (nutTrungDiem === nodeId) return { relation: "self", hitNodeId: nutTrungDiem };

  let con;
  try {
    con = await send("DOM.querySelectorAll", { nodeId, selector: "*" });
  } catch (error) {
    if (error instanceof ActionError) throw error;
    throw new ActionError("CLICK_HIT_TEST_FAILED",
      `Không đọc được con cháu của phần tử để đối chiếu: ${error?.message || String(error)}`);
  }
  if ((con?.nodeIds || []).includes(nutTrungDiem)) {
    return { relation: "descendant", hitNodeId: nutTrungDiem };
  }

  throw new ActionError("CLICK_OBSCURED",
    `Điểm (${point.x}, ${point.y}) là tâm của phần tử đã khớp, nhưng thứ nằm trên cùng ở đó là ` +
    `một phần tử KHÁC (node ${nutTrungDiem}). Bấm bây giờ là bấm vào thứ đang chắn, và lượt bấm ` +
    "sẽ trông như thành công. Thường gặp: hộp thoại, lớp phủ tải, tấm chắn báo hết chỗ.");
}

/* `S-23` — HAI HỆ TOẠ ĐỘ. `DOM.getBoxModel` và `Input.dispatchMouseEvent` nói theo KHUNG NHÌN;
 * `DOM.getNodeForLocation` nói theo TRANG (đã cộng phần cuộn). Đo 13/09 (`docs/GIA-THUYET.md`
 * G-23): sau khi cuộn 1288px, hỏi (38, 772) ra `No node found`, hỏi (38, 2060) ra đúng nút.
 * Chưa cuộn thì hai hệ trùng nhau — vì thế T1 qua mọi phép thử lúc làm.
 *
 * Độ cuộn đọc bằng method SẴN CÓ, không xin thêm: hộp `margin` của `:root` bắt đầu ở
 * `(-scrollX, -scrollY)` (G-24). Không đọc được thì KHÔNG bấm — hỏng thì đóng. */
async function gocCuon(send, rootNodeId) {
  try {
    const goc = await send("DOM.querySelectorAll", { nodeId: rootNodeId, selector: ":root" });
    const hop = await send("DOM.getBoxModel", { nodeId: goc?.nodeIds?.[0] });
    const q = hop?.model?.margin;
    const x = -Math.min(q[0], q[2], q[4], q[6]);
    const y = -Math.min(q[1], q[3], q[5], q[7]);
    if (Number.isFinite(x) && Number.isFinite(y)) return { x, y };
  } catch (error) {
    if (error instanceof ActionError) throw error;
  }
  throw new ActionError("CLICK_HIT_TEST_FAILED",
    "Không đọc được trang đang cuộn tới đâu, nên không đổi được toạ độ sang hệ của phép hỏi-điểm. " +
    "Không kiểm được thì không bấm — xem `S-23`.");
}

/* Ba khung, đúng thứ tự đã đo. */
/* `clickCount` TĂNG DẦN qua từng cặp nhấn-nhả (1 rồi 2), không phải gửi thẳng số 2 một lần.
 * Đó là hình dạng trình duyệt thật sinh ra, và trang nào nghe `dblclick` thì nghe đúng cái
 * chuỗi đó — gửi một cặp mang `clickCount: 2` là một sự kiện không trình duyệt nào tạo ra. */
/* `modifiers` KHÔNG bao giờ tới từ người gọi — nó chỉ nhận hằng số gõ cứng của một thao tác có
 * tên (`SHIFT` của `input.chon`). Mặc định 0, tức `input.click` không đổi một byte hành vi. */
async function clickAt(send, point, nut = MOUSE_BUTTONS.left, soLan = 1, modifiers = 0) {
  /* Không phím bổ trợ thì KHÔNG gắn trường `modifiers` vào khung sự kiện. `modifiers: 0` là mặc
   * định của CDP nên hai cách chạy y hệt nhau — nhưng chuỗi ba khung này **chép từ một phép đo
   * thật** (`scouter-input-trust-probe`, 06/09), và con `dilai` canh nó từng byte. Thêm một
   * trường vào một chuỗi đã đo là biến nó thành một chuỗi CHƯA đo, dù trường ấy vô hại. */
  const bt = modifiers ? { modifiers } : {};
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: point.x, y: point.y, button: "none", buttons: 0, ...bt });
  for (let lan = 1; lan <= soLan; lan += 1) {
    await send("Input.dispatchMouseEvent", { type: "mousePressed", x: point.x, y: point.y, button: nut.name, buttons: nut.mask, clickCount: lan, ...bt });
    await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: point.x, y: point.y, button: nut.name, buttons: 0, clickCount: lan, ...bt });
  }
}

/* ponytail: chỉ chữ cái, chữ số và dấu cách có `code` + mã phím Windows ĐÚNG. Ký tự khác gửi
 * khung đủ hình dạng nhưng `code` rỗng và mã phím 0 — trường `text` là thứ làm nên việc chèn,
 * và phép đo 06/09 chứng minh khung có `text` thì ô nhập dài thêm thật. Nâng khi gặp một trang
 * đọc `event.code` cho ký tự ngoài ba nhóm trên. */
function keyDescriptorFor(character) {
  if (/^[a-zA-Z]$/.test(character)) {
    const upper = character.toUpperCase();
    return { code: `Key${upper}`, vk: upper.charCodeAt(0) };
  }
  if (/^[0-9]$/.test(character)) {
    return { code: `Digit${character}`, vk: character.charCodeAt(0) };
  }
  if (character === " ") return { code: "Space", vk: 32 };
  return { code: "", vk: 0 };
}

async function typeCharacter(send, character) {
  const descriptor = keyDescriptorFor(character);
  await send("Input.dispatchKeyEvent", {
    type: "keyDown",
    key: character,
    code: descriptor.code,
    text: character,
    unmodifiedText: character,
    windowsVirtualKeyCode: descriptor.vk
  });
  await send("Input.dispatchKeyEvent", {
    type: "keyUp",
    key: character,
    code: descriptor.code,
    windowsVirtualKeyCode: descriptor.vk
  });
}
