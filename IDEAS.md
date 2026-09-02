# Sổ ý tưởng — phòng chờ của cả repo

> **Đây KHÔNG phải roadmap thứ hai.** Sổ này là **phòng chờ**: chỗ một ý tưởng nằm khi nó
> *chưa có nhà*. Có nhà rồi thì nó rời sổ này.
>
> Vì sao cần: repo đang có 58 mục nợ trong các `BACKLOG.md`, nhưng đó là **sổ của kỹ sư** —
> mã lỗi, race condition, đồng hồ bị bóp. Ý tưởng của Đức không có chỗ nào để nằm, nên nó
> chỉ tồn tại trong đầu và trong chat. Bảng trạng thái vì thế có một ô trống không lấp được.

## Luật của sổ — đọc hết trước khi ghi

1. **Ghi vào đây khi ý tưởng chưa có nhà.** Đã có nhà thì **đừng chép lại** — chép là đẻ ra
   nguồn sự thật thứ hai, đúng cái bệnh cả repo này chữa.

2. **Bốn cửa ra.** Một ý tưởng rời phòng chờ theo **một** trong bốn đường:
   - thành một đơn vị có `STATUS.md` riêng · thành một phiên trong roadmap · thành một mục nợ
     trong `BACKLOG.md` của gói → điền `nhà:` trỏ tới đó, và nó **biến khỏi bảng** (nếu còn
     hiện thì bảng đếm hai lần một việc);
   - **hoặc làm xong luôn tại đây** → đổi `bậc` thành `đã chứng minh` và **để nguyên trong
     sổ**. Nó vẫn hiện trên bảng ở bậc cuối, để Đức thấy việc đã chạy tới đâu.

   > Cửa thứ tư này thiếu ở bản đầu của luật, và Y-04 là ca đầu tiên không lọt vào cửa nào —
   > nó không đi đâu cả, nó **xong**. Vá luật thay vì nhét bừa nó vào một cửa sai.

3. **Hai trường bắt buộc: `bậc` và `việc kế`.** Còn lại tuỳ. **Đức cứ viết một câu** — AI
   chuẩn hoá lại. Đừng để cái sổ này thành thủ tục, vì thủ tục thì Đức sẽ không ghi.

4. **Đang xây thì PHẢI khai `chủ` và `phạm vi`.** Đây chính là thứ cho phép chạy nhiều việc
   song song mà không giẫm chân: `phạm vi` nói được đụng gì và **cấm đụng gì**. Không khai
   thì hai phiên AI sẽ cùng sửa một chỗ — chuyện đã xảy ra thật ngày 25–26/08.

5. **Ý tưởng chết thì KHÔNG xoá** — đổi `bậc` thành `nghỉ` và ghi một câu vì sao. Xoá là mất
   lý do, rồi sáu tháng sau có người đề xuất lại đúng cái đã bị bác.

## Bậc — dùng đúng bốn giá trị này

`ý tưởng` · `đang xây` · `đã chứng minh` · `nghỉ`

Bốn bậc khớp với thanh bậc trên bảng trạng thái. **Đừng tự thêm bậc mới** — thêm là bảng
hiển thị sai.

---

## Y-01 · MVP: dùng Claude Code điều phối GPT

- **bậc:** ý tưởng
- **nguồn:** Đức nêu 2026-09-02
- **việc kế:** Đức mô tả rõ hơn phạm vi thử — xem ba câu chưa rõ ở dưới
- **vì sao:** Hiện GPT làm việc qua GitHub connector và Đức phải tự chuyển tiếp giữa hai bên.
  Nếu Claude Code điều phối được GPT thì bớt được Đức khỏi vòng lặp.
- **chưa rõ, cần Đức nói:** ① thử trên việc gì · ② Claude Code "điều phối" nghĩa là gọi GPT
  qua đâu (Đức dán tay, hay có kênh khác) · ③ đo thế nào là MVP đạt

> Tôi cố ý **không tự bịa chi tiết** cho ý tưởng này. Đức mới nêu một dòng, và ba câu trên là
> ba thứ quyết định nó là việc một ngày hay việc một tuần.

## Y-02 · Protocol làm nhiều việc song song

- **bậc:** ý tưởng
- **nguồn:** Đức nêu 2026-09-02
- **việc kế:** Chốt hình dạng — mỗi việc song song là một mục trong sổ này, có `chủ` và
  `phạm vi`; `claims.json` khoá thật; bảng trạng thái hiện ai đang làm gì
- **vì sao:** Đức có nhiều ý tưởng và **không đủ thời gian làm lần lượt**. Mỗi phiên AI phải
  tự biết: làm gì · cập nhật gì · **cấm đụng gì**.
- **ghi chú:** Luật khoá đã có (`claims.json`, một gói một chủ). Thiếu là **chỗ nhìn** — không
  ai biết cả năm phiên đang làm gì. Sổ này cộng bảng trạng thái lấp đúng chỗ đó.

## Y-03 · Trường "Đức cần làm" trong hồ sơ trạng thái

- **bậc:** đang xây
- **nguồn:** phát hiện khi dựng bảng trạng thái 2026-09-02
- **chủ:** `claude-y03`
- **phạm vi:** hồ sơ trạng thái, bộ sinh, bản mẫu, phép kiểm. **Cấm** đụng gói
  `duc-auto-gg-flow-video` — phiên khác đang giữ.
- **việc kế:** GIAI ĐOẠN 2 — chuyển `human_action` thành **bắt buộc** cho đơn vị còn sống, khi
  mọi đơn vị đã khai. **Hai gói còn thiếu, và cả hai đang do phiên khác giữ** nên chủ của
  chúng phải tự điền: `duc-auto-gg-flow-video` (`claude-f18-evidence`) và `duc-auto-chatgpt`
  (`claude-surface-fix`, Đức giao 02/09)
- **vì sao:** Ba việc đang chờ Đức nhưng chữ đó nằm lẫn trong câu mô tả. Bảng không được đoán
  từ chữ (luật vàng 1), nên ô "Đức cần làm" bỏ trống — trong khi nó đúng là ô Đức cần nhất.
- **đã xong giai đoạn 1:** trường `human_action` có trong lược đồ và bản mẫu, ba đơn vị đã
  khai, bảng hiện đủ việc **và** thừa nhận số đơn vị chưa khai. Không thể bắt buộc ngay vì
  **không đòi hỏi được một trường mà người khai khác chưa có** — luật chung của mọi lần đổi
  lược đồ.
- **ghi minh bạch một va chạm quyền:** lúc tôi điền, `duc-auto-chatgpt` đang trống chủ (đã
  kiểm trước khi nhận). Giữa phiên, Đức giao gói đó cho `claude-surface-fix`. Nên commit của
  tôi có **một dòng** trong `STATUS.md` của gói họ. Tôi **cố ý không gỡ lại**: gỡ là đụng gói
  của họ lần thứ hai, cho một dòng dữ liệu vốn đúng. Ghi ra đây để phiên sau không tưởng là
  tôi lách luật.

## Y-04 · Bảng trạng thái sinh ngay trong repo

- **bậc:** đã chứng minh
- **nguồn:** Đức nêu 2026-09-02
- **việc kế:** Không còn gì. Bộ sinh đã nằm trong repo, có lệnh chạy riêng và 6 phép kiểm
- **kết quả:** Bản ra cố ý KHÔNG commit — nó để publish, và trang tự in ngày sinh rồi bật cờ
  đỏ sau 7 ngày, nên cũ thì nhìn thấy là cũ
- **vì sao:** Bản đầu đã chạy được và đang là artifact, nhưng bộ sinh **nằm ngoài repo** nên
  không đi theo template và không ai cưỡng chế được độ tươi.

## Y-05 · Viết lại chữ trong hồ sơ cho mắt Đức đọc

- **bậc:** đang xây
- **nguồn:** phát hiện khi dựng bảng trạng thái 2026-09-02
- **chủ:** `claude-y05`
- **phạm vi:** hồ sơ trạng thái của `_root` và `duc-auto-gemini`, cộng cổng kiểm cấu trúc.
  **Cấm** đụng `duc-auto-chatgpt` và `duc-auto-gg-flow-video` — phiên khác đang giữ.
- **việc kế:** **3 chỗ còn lại thuộc hai gói do phiên khác giữ** — chủ của chúng phải tự viết
  lại. B15 giờ tự nhắc mỗi lần họ chạy cổng, không cần ai đi dặn
- **đã xong:** thêm phép kiểm **B15** (mức cảnh báo) cưỡng chế luật vàng 5, và viết lại chữ
  của gemini v0.2.0. B15 tìm ra 4 chỗ vi phạm; còn 3
- **vì sao:** Đức mở bảng thấy *"CAN DUC RELOAD EXTENSION roi chay mot chuoi de do pacing_ms"*.
  Bảng chỉ hiện lại nguyên văn nguồn. **Luật vàng 5 đã quy định "chữ operator nhìn thấy:
  tiếng Việt"** — nên đây không phải yêu cầu mới, mà là một luật đang bị vi phạm. Bảng vừa
  làm nó lộ ra, vì trước giờ chưa ai đọc mấy trường đó bằng mắt người.
