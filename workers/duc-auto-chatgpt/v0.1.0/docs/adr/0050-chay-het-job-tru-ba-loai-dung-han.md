---
status: Proposed
adr: 0050
date: 2026-09-08
deciders: Đức
---

# ADR-0050 — Chạy hết job là mục tiêu; chỉ CAPTCHA, hết hạn mức và cảnh báo bất thường mới dừng hẳn

## Bối cảnh

Đức nêu 08/09, nguyên văn: **"AI phải tương tác được mới là Assistant chứ? tôi cần 1 Assistant
chạy và giao tiếp, chứ ko máy móc dừng lại. Mục đích của ta là phải chạy được đến hết Job, trừ
khi bị halt bởi Captcha."**

Chuyện làm câu đó bật ra, đo được cùng ngày trong lượt chạy live đầu tiên qua Bridge (`B-40`):
tool tạo ảnh của ChatGPT lỗi hệ thống tạm thời; ChatGPT trả về một lượt **chữ** nói rõ nó không
tạo được ảnh **và** nói đúng cách chữa (*"nhắn render lại"*); extension không quy được ảnh nào
nên xếp `POST_SUBMIT_UNCERTAIN` → `INTERRUPTED` và dừng. Đức gõ `render lại` bằng tay thì ra kết
quả đúng. Toàn bộ thông tin cần thiết nằm trên dây, và không gì nối nó vào quyết định.

**Ràng buộc thật, và nó chia bài toán làm hai phần khác hẳn nhau:**

⑴ **[ĐỌC]** [ADR-0047](0047-sau-khi-da-gui-thi-khong-gui-lai-tru-khi-doi-soat-khang-dinh-duoc.md)
ghi lời Đức nguyên văn: *"Sau khi đã gửi, chỉ được gửi lại khi đối soát khẳng định được là lượt
gửi đó không tạo ra kết quả nào. Không khẳng định được thì DỪNG và hỏi người."* Luật ấy **đã có
sẵn ngoại lệ**; nó thu về "chặn hẳn" chỉ vì lúc đó **đo ra 0 ca** khẳng định được. Chính phép
ghim của nó dặn: *"hôm nào có người nối một nguồn khẳng định vào vòng chạy thì test đỏ và phép
đo phải làm lại trước khi nới luật."*

⑵ **[ĐỌC]** Cũng ADR-0047 ghi: *"Năm hard stop (`SECURITY_HARD_STOP`, `GENERATION_LIMIT_REACHED`,
`RECEIVER_LOST`, `DETECTION_BLIND`, `WRONG_SURFACE`) giữ nguyên hình. Bản vá chỉ siết, không
nới."* Nên đổi nhóm năm cái đó là việc **ngoài** ADR-0047, cần một quyết định mới.

⑶ **[ĐO]** `classifyFailure()` trong `runner-core.js` đã xếp `captcha`, `unusual activity` và
`security/interstitial` vào cùng `SECURITY_HARD_STOP`. Nên yêu cầu *"cảnh báo nghi ngờ hoạt động
bất thường cũng dừng"* của Đức **vốn đã được bảo vệ**, không phải làm mới.

⑷ **[ĐO]** `BRIDGE_TRIAL_MIN_INTERVAL_MS = 5 * 60 * 1000` — hai lượt gửi qua Bridge cách nhau 5
phút. Một lượt chạy được tới 30 job liên tiếp nên loạt ảnh không vướng, nhưng **hội thoại nhiều
lượt qua lại thì mỗi câu tốn 5 phút**.

## Quyết định

**⒜ Ba loại dừng hẳn, không tự chữa:** `SECURITY_HARD_STOP` (CAPTCHA và cảnh báo hoạt động bất
thường) · `GENERATION_LIMIT_REACHED` (hết hạn mức) · và bất kỳ mã nào mang nghĩa nhà cung cấp
đang nghi ngờ tài khoản. Đây là câu Đức chốt: *"Hết credit/hạn mức tạo hình ảnh, thông tin, hoặc
các thông báo nghi ngờ hoạt động bất thường cũng dừng."* Với ba loại này, tự chữa là đâm vào
tường hoặc là làm tình hình xấu đi.

**⒝ Hai loại thôi dừng hẳn, chuyển thành ĐIỀU KIỆN CHỮA ĐƯỢC:** `RECEIVER_LOST` và
`WRONG_SURFACE`. Cả hai đều có cách chữa xác định và đã có sẵn công cụ (`chat.reload` cho cái
thứ nhất; quay về một hội thoại cho cái thứ hai), và cả hai đều xảy ra **trước khi gửi** nên
chữa xong chạy tiếp không tốn thêm lượt nào.

**⒞ `DETECTION_BLIND` chuyển thành điều kiện chữa được, nhưng KHÔNG được gửi lại sau khi chữa.**
Chữa xong thì **đối soát trước**: bộ dò vừa mù nay nhìn lại được, nên việc đầu tiên là hỏi *"kết
quả có sẵn trên trang không"*. Thấy thì quy về job và xong; khẳng định được là không có thì mới
gửi lại; vẫn không chắc thì `INTERRUPTED` như hôm nay. Lý do tách riêng: một bộ dò mù **sau khi
gửi** rất có thể đang mù trước một kết quả ĐÃ CÓ, và gửi lại lúc đó là đốt lượt thứ hai cho một
việc đã xong — đúng cái ADR-0047 sinh ra để chặn.

**⒟ Lời nhà cung cấp tự khẳng định là một nguồn ĐỐI SOÁT hợp lệ.** Khi ChatGPT nói bằng chữ rằng
nó không tạo được kết quả, đó là *"đối soát khẳng định được"* theo đúng chữ của ADR-0047 — nên
gửi lại ở ca này là **thi hành** ADR-0047, không phải nới nó. Con số **0 ca** trong phép đo của
ADR-0047 **không còn đúng**, và phép đo phải được làm lại kèm bản vá, đúng như phép ghim đòi.

**⒠ Hạ nắp chờ giữa hai lượt gửi Bridge từ 5 phút xuống 90 giây.** Đức chốt: *"Tôi mở khoá bridge
trial Min xuống còn 90 giây."*

## Hệ quả

- Một loạt job chạy hết được qua những lỗi hạ tầng vặt trước đây bắt người can thiệp. Đây là
  điều Đức nhắm tới, và nó là điều kiện cần để gọi cái này là Assistant.
- **Mặt xấu thứ nhất, và nó có thật:** mỗi lần tự chữa là một lần máy tự hành động trên trình
  duyệt của Đức — nạp lại tab, điều hướng về hội thoại. Trước đây mọi hành động loại đó đều do
  tay Đức. Cái mất là **tính đoán trước được**: Đức rời máy mười phút rồi quay lại có thể thấy
  tab đã khác. Đổi lại là loạt job chạy xong.
- **Mặt xấu thứ hai:** một điều kiện chữa được mà chữa mãi không khỏi sẽ thành vòng lặp. Nên mỗi
  loại phải có **nắp số lần chữa trong một run**, và hết nắp thì rơi về `INTERRUPTED` như cũ.
  Không có nắp thì ⒝ biến một lần dừng thành một vòng lặp vô hạn, tệ hơn hẳn.
- **Mặt xấu thứ ba:** hạ nắp chờ xuống 90 giây làm AI tiêu credit nhanh hơn gấp hơn ba lần trong
  cùng một khoảng thời gian. Nắp đó vốn là lớp chắn cuối chống một vòng lặp hỏng đốt sạch hạn
  mức. Sau lượt này, lớp chắn còn lại chỉ là công tắc Chế độ phát triển và nắp 30 job mỗi lượt.
- `submissionMayExist()` và `canRetry()` **giữ nguyên vai**: chúng vẫn là chỗ duy nhất trả lời
  *"lượt gửi này có thể đã bay chưa"*. ⒞ và ⒟ không sửa hai hàm đó mà **thêm một cửa đối soát**
  đứng trước chúng. Sửa thẳng vào chúng là bỏ mất cái đảo-mặc-định mà ADR-0047 dựng.
- Phép ghim `tests/post-submit-no-resend-smoke.mjs` **phải được viết lại**, không phải nới: nó
  đang đếm con số 0 và khẳng định "chặn hẳn". Sau ADR này nó phải đếm **số nguồn khẳng định** và
  ghim rằng mỗi nguồn đều đi qua đúng một cửa đối soát.
- ADR-0047 **không bị thay thế**. Câu Đức chốt ở đó còn nguyên; ADR này chỉ ⑴ ghi rằng số đo đứng
  sau nó đã đổi, và ⑵ đổi nhóm năm hard stop mà nó khai là giữ nguyên.

## Trạng thái

Proposed
