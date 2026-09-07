# Câu để dán cho GPT web — thiết kế bảng bên của Scouter

> Đức dán **toàn bộ phần trong khung** dưới đây vào GPT web. Không cần dán file nào kèm.
> Sinh 2026-09-07. Nếu Scouter đã đổi (thêm method, đổi phanh) thì sửa mục "Sự thật" trước khi dán.

---

Tôi cần bạn brainstorm và dựng thiết kế cho giao diện một Chrome extension. Đọc hết rồi hãy trả
lời — đừng bắt đầu thiết kế từ giữa chừng.

## Bạn đang thiết kế cho cái gì

**Scouter** là một Chrome extension đang phát triển. Việc của nó: **dò một trang web, báo cáo
cho một AI ở đầu dây kia, rồi AI viết code mới cho chính nó và nạp lại**. Nó không tự động hoá
một dịch vụ cụ thể nào — nó là bộ khung để *thuần hoá* một trang web bất kỳ.

Nó nối với một máy chủ nhỏ chạy trên máy người dùng (gọi là **Bridge**) qua WebSocket
`127.0.0.1`. AI ở đầu dây gửi lệnh xuống, Scouter chạy lệnh trên trang, trả kết quả về.

**Chủ dự án tên Đức: không phải dân kỹ thuật, đọc tiếng Việt, thích câu ngắn.** Đây là người sẽ
nhìn giao diện này mỗi ngày.

## Sự thật về Scouter — đừng bịa thêm năng lực nào ngoài đây

Bảng lệnh hiện có **15 lệnh**, chia bốn nhóm:

- **Bắt tay / tự khai:** `session.hello` · `system.capabilities` · `system.ping`
- **Quan sát (chỉ đọc):** liệt kê tab đang mở · chụp thông tin trang · đếm xem một selector khớp
  mấy phần tử · lấy cây DOM · **đọc trang theo vai trò và tên** (kiểu trình đọc màn hình: *"nút
  tên Gửi"* thay vì `div>div>button:nth-child(3)`) · **chụp cả cấu trúc trang trong một lượt** ·
  **chụp ảnh màn hình**
- **Hành động (ghi):** bấm chuột · gõ phím · nhấn một phím có tên (Enter, Tab…). Cả ba đi qua
  đường chuột/bàn phím thật của trình duyệt, nên trang thấy `isTrusted: true` — đã đo thật, đạt.
- **Mạng và tự nạp lại:** gọi một địa chỉ http(s) rồi trả nội dung về · nạp lại chính extension

Bridge còn tự làm **4 lệnh về file**: ghi · nối thêm · đọc · liệt kê — trong **một thư mục do
người bật máy chủ chọn**, lệnh trên dây không nới ra ngoài được. **Không có lệnh xoá file**, cố ý.

**Cái phanh — quan trọng, phải lên giao diện:**
- Extension có quyền chạm **mọi trang** người dùng đang mở, kể cả trang đang đăng nhập.
- Nên có một **công tắc "chế độ phát triển"**, mặc định **TẮT**. Tắt thì mọi lệnh ghi bị từ chối.
- Mỗi lần bật cho **50 lượt ghi**. Hết 50 phải tắt rồi bật lại.
- Có **phím tắt dừng khẩn `Ctrl+Shift+X`** tắt công tắc từ bất cứ đâu. Phím này **chỉ tắt được,
  không bật được**.

## Vấn đề thiết kế thật — đọc kỹ chỗ này

Giao diện là một **bảng bên** (side panel) của Chrome: **hẹp (~320–400px), cao, luôn nhìn thấy
trong khi người dùng vẫn thao tác trên trang**.

Chủ dự án nói: *"mục đích không phải để lấp đầy cho đủ, mà là để reasoning và mang UX/UI tương
tác tốt nhất để cả AI và người dùng cùng nắm được status công việc, mục đích công việc, năng lực
của Scouter"*.

**Một điều chỉnh bạn cần biết trước khi thiết kế: AI ở đầu dây KHÔNG đọc được bảng này.** Nó
không nhìn pixel; nó hỏi `system.capabilities` qua Bridge và nhận về JSON. Nên bảng bên có **hai
vai, không phải một**:

1. **Cửa sổ để con người nhìn vào việc AI đang làm** — AI vừa bấm gì, trên trang nào, còn bao
   nhiêu lượt ghi, đang kẹt ở đâu.
2. **Bảng điều khiển của con người** — bật/tắt phanh, dừng khẩn, ghép cặp với Bridge.

Nếu bạn thấy cách đọc này sai, **nói ra và lập luận**, đừng lặng lẽ thiết kế theo hướng khác.

**Ý tưởng chủ dự án đã nêu** (gợi ý, không phải yêu cầu — cắt bớt được, và nên cắt):
tên + mục đích · các chế độ hiện thời · **danh sách kiểm đã test sau khi AI tương tác, để biết
tiến độ "thuần hoá" một trang web** · hướng dẫn dùng · danh sách năng lực của extension và Bridge.

Riêng ý *"tiến độ thuần hoá một trang"* là ý mạnh nhất trong số đó — nó biến một bảng trạng thái
thành một thứ đo được sự tiến bộ. Hãy cân nhắc cho nó làm trung tâm, hoặc nói vì sao không nên.

## Ràng buộc kỹ thuật — vi phạm là thiết kế không dùng được

- **Không JavaScript nội tuyến.** Chrome MV3 chặn `<script>` trong trang extension; nó hỏng im
  lặng, trang vẫn tải mà code không chạy. Mọi mã phải nằm ở file `.js` riêng.
- **Cấm `innerHTML` / `outerHTML` / `insertAdjacentHTML`** — luật của dự án. Dựng DOM bằng
  `createElement` và `textContent`.
- **Không thư viện ngoài** (không React, không Tailwind CDN). HTML + CSS + JS thuần.
- **Chữ người dùng nhìn thấy: tiếng Việt có dấu.** Mã lỗi (CODE) giữ tiếng Anh.
  Giao diện hiện tại đang lẫn lộn (`Scan Targets`, `Observation Report`, `No observation yet.`) —
  cần dọn.
- Phải đọc được ở **cả nền sáng và nền tối**.
- Bảng có thể mở khi **chưa ghép cặp với Bridge**, khi **Bridge tắt**, và khi **đang chạy lệnh**.
  Ba trạng thái đó trông phải khác nhau rõ ràng.

## Giao diện hiện tại đang có gì (để bạn biết mình đang thay cái gì)

Năm khối xếp dọc, rất trống: tiêu đề · trạng thái cửa Bridge · công tắc chế độ phát triển · nút
"Scan Targets" + danh sách tab · ô báo cáo JSON kèm nút chép. Tổng cộng 54 dòng HTML.

Vấn đề: nó cho xem **dữ liệu thô**, không cho xem **tình hình**. Người đọc không trả lời được
"đang ổn hay đang hỏng" nếu không tự đọc JSON.

## Tôi cần bạn trả về gì

Theo đúng thứ tự sau. **Tổng cộng tối đa 1.200 từ** — vượt là tôi phải cắt, và tôi sẽ cắt phần
cuối.

1. **Lập luận trước, layout sau** (≤200 từ). Câu hỏi nào bảng này phải trả lời trong 3 giây đầu
   người dùng liếc vào? Xếp hạng. Cái gì **không** nên lên bảng, và vì sao.
2. **Ba phương án bố cục**, mỗi cái ≤150 từ: ý tưởng chủ đạo · cái được · **cái mất** (bắt buộc
   có, phương án nào cũng mất một thứ) · hợp với ai.
3. **Chọn một** và nói vì sao, có so với hai cái kia.
4. **Bản vẽ phương án đã chọn** bằng ASCII/text trong khung 360px, kèm nhãn tiếng Việt thật —
   không phải chữ giữ chỗ kiểu "Tiêu đề ở đây".
5. **Các trạng thái**: chưa ghép cặp · Bridge tắt · rảnh · đang chạy lệnh · bị phanh chặn · hết
   50 lượt · lỗi. Mỗi trạng thái: người dùng thấy gì, và **bấm gì tiếp theo**.
6. **Ba câu hỏi bạn cần tôi trả lời** trước khi thiết kế này thành thật được.

**Đừng** viết code HTML/CSS ở lượt này. Chốt xong bố cục rồi mới tới code.

**Đừng** đề xuất năng lực Scouter không có. Nếu bạn thấy thiếu một năng lực khiến giao diện tốt
không dựng được, **ghi riêng thành một mục cuối** và nói rõ đó là đề xuất mới.
