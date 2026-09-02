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

2. **Ba cửa ra.** Một ý tưởng được nhận làm thì đi khỏi phòng chờ vào **một** trong ba chỗ:
   thành một đơn vị có `STATUS.md` riêng · thành một phiên trong roadmap · thành một mục nợ
   trong `BACKLOG.md` của gói. Ra cửa nào thì điền trường `nhà:` trỏ tới đó.

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

- **bậc:** ý tưởng
- **nguồn:** phát hiện khi dựng bảng trạng thái 2026-09-02
- **việc kế:** Thêm một trường khai vào hồ sơ trạng thái, rồi bảng đọc thẳng trường đó
- **vì sao:** Ba trong bốn việc đang mở **có chờ tay Đức**, nhưng chữ đó nằm lẫn trong câu mô
  tả. Bảng không được đoán từ chữ (luật vàng 1), nên ô "Đức cần làm" đang trống — trong khi
  nó đúng là ô Đức cần nhất.

## Y-04 · Bảng trạng thái sinh ngay trong repo

- **bậc:** đang xây
- **nguồn:** Đức nêu 2026-09-02
- **chủ:** `claude-so-y-tuong`
- **phạm vi:** được đụng `scripts/` và file gốc repo. **Cấm** đụng `workers/` (có chủ khác) và
  `evidence/`.
- **việc kế:** Chuyển bộ sinh đang nằm ngoài repo vào `scripts/`, nối vào cổng kiểm để nó
  không mục
- **vì sao:** Bản đầu đã chạy được và đang là artifact, nhưng bộ sinh **nằm ngoài repo** nên
  không đi theo template và không ai cưỡng chế được độ tươi.

## Y-05 · Viết lại chữ trong hồ sơ cho mắt Đức đọc

- **bậc:** ý tưởng
- **nguồn:** phát hiện khi dựng bảng trạng thái 2026-09-02
- **việc kế:** Rà `next_step` và `current_focus` của từng đơn vị, viết lại thành tiếng Việt
  có dấu, bỏ thuật ngữ
- **vì sao:** Đức mở bảng thấy *"CAN DUC RELOAD EXTENSION roi chay mot chuoi de do pacing_ms"*.
  Bảng chỉ hiện lại nguyên văn nguồn. **Luật vàng 5 đã quy định "chữ operator nhìn thấy:
  tiếng Việt"** — nên đây không phải yêu cầu mới, mà là một luật đang bị vi phạm. Bảng vừa
  làm nó lộ ra, vì trước giờ chưa ai đọc mấy trường đó bằng mắt người.
