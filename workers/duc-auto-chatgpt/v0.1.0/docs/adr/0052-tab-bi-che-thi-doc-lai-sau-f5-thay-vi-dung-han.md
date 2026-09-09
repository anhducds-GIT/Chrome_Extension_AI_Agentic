---
status: Accepted
adr: 0052
date: 2026-09-09
deciders: Đức
---

# ADR-0052 — Tab bị che thì F5 rồi đọc lại, thay vì dừng hẳn

## Bối cảnh

Đức nêu điều kiện vận hành thật, nguyên văn 09/09: **"99% thời gian cửa sổ GPT bị che, tôi
thường reload, F5 rồi sang Claude làm việc."** Nên tab bị che không phải ca ngoại lệ phải chịu
đựng — nó là **đường chính**.

`B-43` vòng một và hai chặn được báo-thành-công-giả: máy thôi ghi một mẩu chữ bị cắt vào sổ. Nhưng
nó đổi một lần nói dối thành một lần **dừng hẳn**, và với điều kiện vận hành trên thì dừng hẳn
nghĩa là vòng chat 0-cú-bấm **không bao giờ hoàn tất**.

Đức chặn đúng hai câu tôi nói ẩu, và cả hai đều đổi hướng chẩn đoán:

- **"Chrome hãm chữ đi vào trang"** — SAI cách nói. Đức: *"tốc độ gửi thông tin ra là của GPT,
  Chrome đâu có phanh được?"* Đúng: Chrome **không hãm đường mạng**. Nó không cấp **khung hình**
  cho tab bị che, nên trang ChatGPT **không VẼ** chữ vào DOM. Hai chuyện khác nhau, và chỉ cái
  thứ hai đo được.
- **"Đường đọc của gói bị mù"** — SAI, đo trực tiếp trên tab đang bị che: `chat.read` qua
  `innerText` trả về `status OK` với 1.659 ký tự. Đổi sang `textContent` không cứu được gì.

Đường cong đo được, tab để nguyên bị che suốt:

| mốc | chữ trong DOM |
|---|---|
| giây 12 | 8 ký tự |
| giây 25 | 25 ký tự |
| giây 25 → 185 | **25 ký tự, đứng yên 160 giây** |
| giây 197 | run hết hạn 180 giây, báo `TAB_HIDDEN_NO_STREAM` |
| **sau một cú F5** | **1.611 ký tự** |

Chữ **không mọc đều** → bác bỏ *"GPT viết lâu, cứ nới hạn giờ"*. Và F5 lấy ra bản đầy đủ **không
sinh lại, không gửi lại** → câu trả lời nằm nguyên trên máy chủ suốt từ đầu.

Hai lỗi thật trong bản vá vòng một, do Đức bắt được:

1. **Nó chẩn đoán bằng một sự trùng hợp.** `hiddenPolls > pollCount / 2` chỉ đo *tab CÓ bị che*,
   không đo *tab GÂY RA* chuyện này — tab bị che thì hiển nhiên nó bị che quá nửa số vòng dò.
2. **Nó khuyên sai, và cái này tệ hơn.** Mã lỗi viết *"mở tab ra rồi **chạy lại**"*. Chạy lại là
   gửi prompt lần hai để lấy một câu trả lời đã có sẵn — tiêu thêm một lượt quota của Đức.

## Quyết định

Câu Đức chốt, nguyên văn sau khi tôi nêu rõ nó nới luật exact-once: **"đã reload, F5, bạn làm
tiếp đi."**

**Job chữ đã gửi mà không đọc được câu trả lời thì ĐỐI SOÁT trước, dừng hẳn sau.** Cửa rẽ
`dispatchOutcome()` đổi từ `TEXT_HALT_NO_RESEND` sang `TEXT_RECONCILE`; dừng hẳn **còn nguyên**
và là chỗ rơi vào khi đối soát không chứng minh được gì.

**Thứ tự trong `reconcileSubmittedText()` là toàn bộ phần an toàn, và nó CỐ Ý ngược với đường ảnh:**

1. **ĐỌC TRƯỚC, chưa F5** — tìm lượt hỏi của chính job này trong hội thoại
   (`answerAfterPrompt()`).
2. **Không thấy → DỪNG HẲN, và KHÔNG F5.** Không thấy nghĩa là *"chưa chứng minh được prompt đã
   tới"*, mà F5 lúc còn lấp lửng là đúng cái `chat.reload` từ chối làm.
3. **Thấy rồi → F5 → đọc lại.** Lúc này prompt **đã là một lượt trong hội thoại**, khung gõ
   trống, nên F5 không có gì để gửi.
4. Đủ và không bị cắt → chốt `SUCCESS` qua **đúng đường `finishTextOutput()` cũ**, không đẻ ra
   cửa chốt thứ hai. Chưa đủ → dừng hẳn như trước.

Một lần mỗi job. F5 không lấy được thì F5 lần hai cũng không.

**Đối soát ở đây KHÔNG cùng loại với đối soát trong [ADR-0047](0047-sau-khi-da-gui-thi-khong-gui-lai-tru-khi-doi-soat-khang-dinh-duoc.md).**
Bên đó trả lời *"có được gửi lại không?"*. Bên này trả lời *"câu trả lời đã về chưa?"* và **không
bao giờ mở cửa gửi lại** — nó chỉ đọc. Vì thế nó không đụng tới vế nào của ADR-0047.

**Neo vào lượt hỏi, không phải "lượt trả lời cuối của trang."** Trang có thể đã trôi sang hội
thoại khác, hoặc có lượt Đức gõ tay chen vào. Neo vào chính prompt của job là thứ duy nhất buộc
câu trả lời **với** câu hỏi — cùng luật attribution mà đường ảnh đã theo.

**Hạn giờ giữ 180 giây, KHÔNG nới.** Đức nhờ *"giãn thời gian chờ đọc dài hơn"*, và tôi đã nới
sai núm một lần (ngưỡng chữ-đứng-yên 1,5 → 6 giây). Núm đúng là hạn giờ 180 giây, **nhưng đối
soát làm việc nới đó thành không cần thiết**: hết giờ nay không còn là mất kết quả, nên nới hạn
giờ chỉ làm mọi job chậm thêm mà không thêm một câu trả lời nào.

## Hệ quả

- **Vòng chat 0-cú-bấm hoàn tất được với tab bị che** — tức với 99% thời gian vận hành thật của
  Đức. Đây là thứ ADR này mở ra; hai vòng trước chỉ chặn được cái sai.
- **Thói quen F5 của Đức thành hành vi của máy.** Việc Đức vẫn làm bằng tay nay máy làm, và làm
  đúng chỗ: chỉ khi đã khẳng định prompt nằm trong hội thoại.
- **Cái giá:** một job hết giờ nay tốn thêm một cú F5 và một lượt đọc (~10 giây). Đổi lại là một
  câu trả lời thật thay vì một lượt dừng hẳn.
- **Giới hạn đã biết, ghi ra để không ai tưởng nó chặt hơn thực tế:** phép so khớp prompt dùng
  **160 ký tự đầu** sau khi bóp khoảng trắng. Hai prompt trùng 160 ký tự đầu sẽ bị coi là một.
  Có một mép ghim đúng cho ca đó.
- **Mã lỗi `TAB_HIDDEN_NO_STREAM` thôi tuyên nguyên nhân**, chỉ nêu số đo, và **thôi khuyên
  "chạy lại"**. Nó nay chỉ hiện sau khi đối soát cũng thất bại.
- **Rủi ro còn lại:** F5 xoá bộ nhớ của content script, nên mã attempt mất. Đó là vì sao cửa đối
  soát **không** đòi mã attempt — bằng chứng của nó mạnh hơn: chính câu hỏi của job nằm trong
  hội thoại. Đường ảnh vẫn đòi mã attempt và **không bị đụng tới**.

## Trạng thái

Accepted. Thử phá **13/13** bắt được, 0 thoát — gồm hai mũi canh riêng luật exact-once (đảo thứ
tự F5-trước-khi-đọc, và bỏ cửa chặn *"không thấy lượt hỏi"*).

**Nghiệm thu live 09/09, ba lượt, cửa sổ ChatGPT để nguyên bị che (`visibility=hidden`,
`docFocused=false` — đo được, không suy):**

| lượt | ghi vào sổ | sau F5 (trọng tài) | kết |
|---|---|---|---|
| ⑴ | 27 | 1.917 | **trượt** — cửa tắt tin `looksTruncated` để phán DOM đáng tin |
| ⑵ | không ghi (`INTERRUPTED`) | 2.117 | **trượt**, nhưng trung thực — đọc một nhát sau F5 được 0 ký tự |
| ⑶ | **2.228** | **2.228** | **ĐẠT** — `SUCCESS`, `persistence_verified: true` |

Lượt ⑶ đọc lại ba lần liền đều ra 2.228 với `generating: false`; câu trả lời trọn vẹn (ngoặc cân,
kết bằng dấu chấm, có mục hành động ở cuối).

**Lượt ⒋ — trong một hội thoại thuộc PROJECT, và đây là vế đóng `B-43`.** URL
`chatgpt.com/g/g-p-6a6aa6fb…-sin/c/6aa03cbf-…`, cửa sổ để nguyên bị che suốt 18 lượt dò.
**Sổ ghi 1.867 · máy chủ giữ 1.867 · `SUCCESS`, `persistence_verified: true`**, đọc lại ba lần
đều ra 1.867 với `generating: false`. Phép đo phụ chứng minh
`conversationId('…/g/g-p-…/c/<id>')` trả về `6aa03cbf-…` chứ không phải `null`, tức **cửa chống
trôi-hội-thoại đang BẬT** trên phiên Project — chính chỗ đó từng tắt lặng lẽ trên mọi phiên Đức
thật sự dùng.

**Ba chỗ chỉ trang thật mới lộ ra, không phép kiểm nào trong 123 phép bắt được** — ghi ra vì đó là
bài học đáng hơn bản vá:

1. **Cửa tắt tin DOM.** Tôi thêm một đường tắt *"đọc thẳng đã đủ thì khỏi F5"* vào đúng bản vá có
   tiền đề *DOM không đáng tin*. Nó ghi 27 ký tự và đóng dấu `persistence_verified`.
2. **Đọc sớm hơn lúc trang được dựng.** `waitTabComposer()` trả về khi KHUNG GÕ hiện, mà ChatGPT
   dựng khung gõ TRƯỚC các lượt hội thoại → đọc được 0 ký tự. Phải DÒ, có nắp.
3. **Điều kiện nghiệm thu sai.** Bản đầu là *"sổ == trang"*; cả hai cùng đọc 27 nên nó báo ĐẠT.
   **Hai vế cùng sai thì bằng nhau.** Điều kiện đúng: **sổ == bản đọc SAU MỘT CÚ F5** — máy chủ
   làm trọng tài, không phải DOM lúc chốt.

**Một câu trong ADR này từng sai và đã bỏ:** *"`visibilityState` báo `visible` khi cửa sổ bị che,
nên cửa chặn theo nó là vô hiệu."* Đo thật: `hidden` / `docFocused=false`. Cửa chặn đó **vẫn
đúng**. Tôi suy sai vì thấy `failure_type` rỗng trong sổ rồi kết luận lỗi không nổ — trường đó
rỗng vì job kết thúc `SUCCESS`: lỗi **đã nổ** rồi bị đối soát ghi đè. Dấu vết của **hậu quả** bị
đọc thành **nguyên nhân**.
