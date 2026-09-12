# Đo trang Optic (Udin) — phép đo ①, ngày 12/09

**Đây là NHÁP.** Không phải bằng chứng, không phải spec đã chốt. Nó ghi lại một lượt đo có
thật, bằng Scouter, qua Bridge, trên trang thật — để lượt sau không phải đo lại từ đầu.

- Trang: `https://vinfast.udinbv.com/optic/` · tiêu đề `Udin - Creative Design Tools`
- Ghế Scouter đã đo: `f3f7264e-0b31-4417-8c65-06e6b1b47535`
- Lệnh đã chạy: `scout.targets` · `scout.page` · `scout.a11y` · `scout.tree` · `scout.shot`
- **Toàn bộ là lệnh CHỈ ĐỌC.** Chưa bấm, chưa gõ, chưa chạm gì vào trang. Công tắc đường ghi
  vẫn đang tắt.

Đây là **trang thử THỨ HAI** mà `ROADMAP.md` mục ① đòi. Trước hôm nay seed mới chạy đúng một
trang (`hnx.vn`), nên câu "năng lực chung" vẫn là lời khai chưa đo. Nay đã đo: cùng một seed,
không sửa một dòng nào, đọc được một SPA React hoàn toàn khác.

## Trang này là cái gì

Một ứng dụng một-trang (React) gồm **hai nửa**:

- **Khung vẽ vô hạn** (`.faucet-canvas`) — chỗ ảnh hiện ra và được sắp xếp. Có lưới, có chế độ
  chọn, có cọ vẽ kèm hai thanh trượt (cỡ cọ, màu).
- **Bảng trò chuyện bên trái** (`.faucet-agent-chat-panel`) — chỗ ra lệnh. Ba thẻ:
  `FILES` · `CREATE` · `SETTINGS`. Đang mở thẻ `CREATE`.

Trong thẻ `CREATE` có **hai chế độ**, và đây là chỗ đáng chú ý nhất với dự định của Đức:

| Nút | Lớp CSS | Ý nghĩa đọc được |
|---|---|---|
| **Agent** | `.create-mode-btn.active` | Đang bật. Mô tả bằng lời, máy tự dựng từng bước |
| **Manual Gen** | `.create-mode-btn` | Chưa bật. Dựng bằng tay, nhiều tham số hơn |

Chữ trang tự viết: *"Bring references into the scene, describe what you want to do, and I'll
help you generate, design and refine it step by step."* — nghĩa là **chuỗi thiết kế** mà Đức
mô tả (một ảnh → nhiều ý tưởng) là việc trang này vốn đã làm được, không phải việc mình phải
dựng thêm.

## Mười lăm phần tử bấm/gõ được — đo từ `scout.page`, không đoán

```
a.logo-link                        href=/optic
button.icon-button                 aria-label="Toggle dark mode"
button.account-button              aria-label="Account options"
button.agent-minimize-btn          title="Minimize"
button.create-mode-btn.active      → "Agent"
button.create-mode-btn             → "Manual Gen"
div[tabindex="-1"]                 vùng cuộn của khung trò chuyện
button.agent-add-button            title="Add to canvas"   ← đường đưa ẢNH THAM CHIẾU vào
textarea.agent-textarea            placeholder="Describe what you want to do..."  ← chỗ gõ PROMPT
button.agent-send-button           title="Send"  (đang `disabled` vì ô prompt trống)
button.mobile-quick-action-btn     aria-label="Undo"  (đang `disabled`)
button.mobile-quick-action-btn     aria-label="Enter select mode"
button.faucet-brush-button         title="Enable Brush Mode"
input[type=range]                  cỡ cọ (đang 30px)
input[type=range].brush-hue-slider màu cọ (đang 166°)
```

Ba tên trong bảng trên là **ba tác vụ Đức nêu**, và chúng nằm sẵn ở đó:

- *generate ảnh từ prompt* → gõ vào `textarea.agent-textarea`, bấm `button.agent-send-button`
- *generate ảnh từ ảnh* → `button.agent-add-button` đưa ảnh vào khung vẽ trước, rồi mô tả
- *nhiều ý tưởng từ một ảnh* → chính là vòng "refine step by step" của chế độ Agent

## Ba chỗ trang này KHÁC `hnx.vn`, và cả ba đều đắt

1. **Nút `Send` mặc định `disabled`.** Nó chỉ sống lại khi ô prompt có chữ — mà chữ phải vào
   bằng bàn phím THẬT (React nghe sự kiện, không đọc `value`). Scouter có `scout.type` đi qua
   bàn phím thật của trình duyệt nên làm được; nhưng một adapter ngây thơ sẽ bấm `Send` lúc nó
   còn đang chết và báo "đã gửi".
2. **Hai nút `.create-mode-btn` không có `aria-label`, không có `id`.** Phân biệt chúng phải
   dựa vào chữ bên trong hoặc lớp `.active`. Đây đúng là ca "hai nút chữ giống hệt nhau" mà
   `H4` `H5` của gói canh — selector phải khớp **đúng một**.
3. **Chưa đo được kết quả về bằng đường nào.** Ảnh hiện ra sau một lượt gọi mạng hay chỉ vẽ
   lên canvas sau một cú bấm — câu này **chưa có câu trả lời**, vì trả lời nó cần bấm thật, mà
   bấm thật cần Đức bật công tắc. Đừng viết adapter trước khi biết câu này: chờ ảnh bằng cách
   ngó DOM và chờ bằng cách ngó mạng là hai đoạn mã khác hẳn nhau.

## Việc tiếp theo, đúng MỘT việc

Bật công tắc **Cho phép bấm và gõ** trong bảng bên của ghế `f3f7264e…`, rồi chạy **một** lượt
sinh ảnh thật từ prompt, vừa chạy vừa dò, để trả lời câu số 3 ở trên. Có câu trả lời đó mới
tới lượt viết adapter `udine-optic` trong `workers/duc-scouter/pilots/`.

Chưa được viết adapter trước. Luật gói số 1: hiểu biết về một trang cụ thể vào adapter, và
adapter phải dựng trên bằng chứng DOM thật — chứ không phải trên một bản đoán về cách trang
chạy.
