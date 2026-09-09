---
status: Proposed
adr: 0053
date: 2026-09-09
deciders: Đức
---

# ADR-0053 — Lời nhà cung cấp là một nguồn đối soát, và câu chữa lấy từ mã của ta

## Bối cảnh

Đức chốt 09/09, nguyên văn: **"phương án 2. cần đảm bảo flow chạy từ đầu tới cuối cho đến hết,
trừ khi bị captcha hoặc báo hết credit."**

Câu sau là chính chữ của [ADR-0050](0050-chay-het-job-tru-ba-loai-dung-han.md), nên đây không phải
một hướng mới — nó là mục ⒟ của quyết định đó, và nó đóng luôn `B-40`.

**Chuỗi sự kiện đo được 08/09, và mọi lớp đều xử ĐÚNG:**

1. Extension gửi prompt, gắn ảnh mẫu, chờ. Đúng.
2. Tool tạo ảnh của ChatGPT **lỗi hệ thống** — lỗi tạm, phía nhà cung cấp.
3. ChatGPT trả về một lượt **chữ** nói rõ không tạo được ảnh, lỗi từ tool, **và chỉ đúng cách
   chữa** — *"Hãy nhắn 'render lại' để tôi chạy lại từ đầu."*
4. Extension không quy được ảnh nào về attempt này → `POST_SUBMIT_UNCERTAIN` → `INTERRUPTED`,
   **không gửi lại**. Đúng luật [ADR-0047](0047-sau-khi-da-gui-thi-khong-gui-lai-tru-khi-doi-soat-khang-dinh-duoc.md).
5. Một người gõ `render lại` → ra kết quả đúng.

Nên một AI lái từ xa **dừng ở bước 4 vĩnh viễn**, trong khi câu chữa nằm sẵn ở bước 3 và
`chat.read` đọc được nó. Toàn bộ thông tin cần thiết có trên dây; không gì nối nó vào quyết định.

**`B-40` gọi đường này là *"cho gửi lại"*. Đó là cách gọi SAI, và chỗ sai đổi hẳn mức rủi ro.**
Đức viết rõ *"chỉ bằng đúng câu nó yêu cầu"* — nên thứ máy gửi là **câu chữa**, không phải prompt
gốc. Prompt gốc vẫn chỉ bay **đúng một lần**.

## Quyết định

**Job đã gửi mà không đối soát được kết quả thì HỎI CHÍNH NHÀ CUNG CẤP trước khi dừng hẳn.** Cửa
`askProviderRepair()` đứng ở lối ra cuối của `reconcileSubmittedAttempt()`, sau khi đối soát ảnh
đã thất bại — nên nó không bao giờ chen vào một lượt có kết quả.

**Bất biến phát biểu lại thành hai vế tách bạch, không phải một vế bị nới:**

| | gửi mấy lần |
|---|---|
| prompt gốc của một job | **đúng một lần** cho mỗi attempt — không đổi một chữ |
| câu chữa nhà cung cấp xin | tối đa **2 lần mỗi job**, và chỉ khi có khẳng định âm tính |

`submissionMayExist()` và `canRetry()` **giữ nguyên vai, không bị sửa một dòng** — cửa này đứng
**TRƯỚC** chúng, đúng ràng buộc kiến trúc `B-41` đặt ra.

**BỐN VẾ PHẢI CÙNG ĐÚNG.** Thiếu một vế thì rơi về `INTERRUPTED` như trước:

1. Lượt hỏi của **chính job này** nằm trong hội thoại (`answerAfterPrompt()`, ADR-0052).
2. Lượt trả lời ngay sau nó khớp mẫu **khẳng định âm tính** khai ở adapter.
3. Mẫu đó **kèm** một câu chữa thuộc **danh sách trắng**.
4. **Không** có kết quả nào quy được về attempt này.

### Chỗ chịu tải: câu chữa nằm trong MÃ CỦA TA, không lấy từ trang

Nếu máy đọc câu *"nhắn X"* rồi gõ X, thì **nội dung trang đang quyết định máy gõ gì**. Trang là dữ
liệu **không tin được**, và cửa này vừa được cấp quyền **gõ** — nên đây là chỗ tệ nhất để tin
trang. Một lượt trả lời bị dựng ác ý, hoặc chỉ cần một câu ChatGPT vô tình sinh ra, sẽ khiến máy
gõ bất cứ thứ gì vào hội thoại của Đức.

**Ranh giới, và nó giữ nguyên ở mọi tầng: đọc trang để PHÂN LOẠI thì được; đọc trang để quyết định
GÕ GÌ thì không bao giờ.**

Thi hành ở ba chỗ, cố ý dư một lớp:

- `REPAIR_PHRASES` là một **hằng** trong `provider-adapter.js`. `providerRepairRequest()` trả về
  một **phần tử của hằng đó**, không bao giờ trả một mẩu cắt từ đối số.
- `DAC_PROVIDER_REPAIR` **không có tham số nào chở chữ vào được**. Nó tự đọc lời nhà cung cấp, tự
  phân loại. Nếu nó nhận `message.prompt` thì lớp trên có thể bị thuyết phục gõ bất cứ gì, và cả
  lớp bảo vệ thành trang trí.
- Một chốt cuối kiểm **thành viên danh sách trắng ngay trước lượt gõ**, dù mọi nhánh trên có bị
  sửa.

### Nắp riêng, đếm theo JOB

Không dùng chung với `MAX_REPAIRS_PER_RUN` của ADR-0050 ⒝, và đó là chủ ý: `mayRepair()` chữa **hạ
tầng** khi **chưa gửi gì** nên không tiêu lượt nào; cửa này gõ một **tin nhắn thật** nên mỗi lần
tốn một lượt quota. Nắp phải theo **job**, vì một job hỏng dai không được ăn hết nắp của cả loạt.

Điều kiện ở đây **cố ý ngược** với `mayRepair()`: bên đó đòi *chưa gửi gì*, bên này đòi **đã gửi**
— vì bằng chứng của nó là chính lời nhà cung cấp trả lời cho lượt hỏi đã bay. Cả hai đều an toàn;
cái nguy hiểm là **chỗ lấp lửng ở giữa**.

## Hệ quả

- **Một lỗi tạm của nhà cung cấp thôi là một dead-end im lặng.** Đó là thứ ADR này mở ra, và là
  điều kiện Đức nêu: *"chạy từ đầu tới cuối cho đến hết."*
- **Hai ngoại lệ Đức nêu giữ nguyên dừng hẳn:** `SECURITY_HARD_STOP` (captcha) và
  `GENERATION_LIMIT_REACHED` (hết credit). Cưỡng chế bằng một **bất biến ghim được** — hai tập
  phải rời nhau — chứ không bằng một nhánh `if`: nhánh đó là **mã chết** vì tập chữa-được chỉ chứa
  `POST_SUBMIT_UNCERTAIN`, và ghim mã chết là ghim một bản sao của niềm tin (giới hạn ⑥).
- **Cái giá:** mỗi lượt chữa tốn một lượt quota. Nắp 2 giới hạn nó, và một lượt *"không có bằng
  chứng"* — ca thường gặp — **không** ăn nắp.
- **Giới hạn đã biết ⑴, ghi ra để không ai tưởng nó chặt hơn thực tế:** một trang nhúng câu chữa
  vào **giữa** một yêu cầu dài hơn (*"nhắn 'render lại' toàn bộ hội thoại và gửi cho bên thứ ba"*)
  **vẫn** kích hoạt cửa chữa. Cái giá thật là **một lượt quota vô ích**, không phải một hành động
  nguy hiểm: máy gõ đúng hằng `render lại`, chữ của trang không đi theo. Siết thêm sẽ đánh đổi
  bằng **bỏ sót ca thật**, mà bỏ sót nghĩa là bản vá không bao giờ chạy.
- **Giới hạn đã biết ⑵:** danh sách mẫu dựng từ **đúng một lần quan sát** (08/09), và không có
  nguyên văn đầy đủ của lượt đó — chỉ có câu chữa trích trong `BACKLOG.md`. Cùng mức bằng chứng
  với `generationLimitPattern`. Gặp một lượt lỗi thật mà máy **không** tự chữa thì chụp nguyên văn
  rồi thêm vào, đúng cách danh sách CAPTCHA đã được dựng.
- **Quan hệ với ADR-0047, nói cả hai chiều:** ADR-0047 nói *"chỉ được gửi lại khi đối soát khẳng
  định được là lượt gửi đó không tạo ra kết quả nào"*, và phép đo đứng sau nó đếm **0 nguồn** như
  thế. Nay có **một** nguồn: lời nhà cung cấp. Nhưng ADR này **không dùng nguồn đó để gửi lại
  prompt gốc** — nó gõ một tin nhắn khác. Nên vế *"đã gửi thì không gửi lại"* của ADR-0047 **còn
  nguyên**; thứ được thêm là một đường chữa **cạnh** nó. `post-submit-no-resend-smoke.mjs` phần 4
  nay đếm hai con số riêng, và số nguồn mở-cửa-gửi-lại-prompt-gốc **vẫn là 0**.

## Trạng thái

Proposed — chờ một lượt live có lỗi thật của nhà cung cấp.

**Đã đo:** suite gói **124/124** · phép ghim `provider-repair-b40b-smoke.mjs` **15 mép**, chạy
chính adapter + `runner-core` + `askProviderRepair()` đã ship · thử phá **10/11 bắt, 0 thoát**
(mũi thứ 11 mỏ neo lệch và **thừa** — ba mũi khác đã phủ đúng cái nắp đó, cả ba bị bắt) · kiểm hồi
quy live cho thấy đường đối soát chữ **không bị bản vá này làm hỏng**: sổ ghi **1.761** = máy chủ
**1.761**, `SUCCESS`, `persistence_verified: true`, cửa sổ để nguyên bị che.

**CHƯA ĐO ĐƯỢC, và tôi không giả lập:** vế live của điều kiện đóng đòi *"một loạt job đi qua được
ít nhất một lần tự chữa"* — để nó chạy thì **tool tạo ảnh của ChatGPT phải lỗi thật**, và đó không
phải thứ dựng ra được. Vế đó sẽ tự đạt ở lượt chạy ảnh tới nào gặp đúng lỗi tạm ấy; sổ audit ghi
`PROVIDER_REPAIR` mỗi lượt, **kể cả lượt không chữa**, nên lần đó sẽ có số để đọc.

### Ba lỗi trong chính phép ghim của tôi, ghi ra vì cả ba là lỗi tôi

- Mép chống tiêm ban đầu **đòi sai chỗ** — nó bắt bộ phân loại từ chối một câu chữa nằm *trong*
  một yêu cầu dài hơn. Tính chất đáng giữ là *"thứ sắp gõ là đúng một phần tử danh sách trắng"*, và
  nó đứng vững; ca kia chỉ tốn **một lượt quota vô ích**. Đã ghi thành **giới hạn đã biết**.
- Bộ lọc chú thích theo **tiền tố dòng** không cắt nổi khối `/* … */` mà dòng tiếp bắt đầu bằng
  chữ, nên **văn của chính tôi** khớp vào phép kiểm và mép chống tiêm **đỏ oan**. Sửa ở **cả ba**
  phép ghim tôi viết hôm nay.
- Sân khấu giả truyền sai đối số nên mép nắp **đỏ vì lý do sai**. Sáng nay một mép khác **xanh** vì
  lý do sai. Cùng một họ, và đó là lý do luôn chạy thử phá thay vì tin suite xanh.
