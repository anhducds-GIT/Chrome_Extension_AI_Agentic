---
status: Accepted
adr: 0054
date: 2026-09-11
deciders: Đức
---

# ADR-0054 — Vòng reasoning tự nối: được phép, và nó chỉ được chuyển tiếp NGUYÊN VĂN khối copy

## Bối cảnh

`B-56` tách việc thành hai nửa. Nửa ⓵ — **đọc** được khối copy cuối câu trả lời — đã vá và
nghiệm thu live 10/09. Nửa ⓶ — **tự động gửi khối đó đi, nhiều vòng, không ai ngồi canh** — bị
`B-56` xếp là *"đúng `run.start`, thứ đang bị CẤM VĨNH VIỄN"*, và đòi **một ADR trước khi viết
dòng mã đầu tiên**.

Đức chốt ⓶ ngày 10/09 (*"được phép chạy tự động trọn chuỗi"*) và chốt lại 11/09 (*"B56 ok
chốt"*).

**Ghi thẳng chỗ đã làm sai thứ tự:** bộ chạy `chuoi-reasoning.mjs` được viết **trước** ADR này,
không phải sau. `B-56` đòi ADR đi trước và điều đó đã không xảy ra. ADR này vì vậy là **hồi tố**:
nó ghi lại một quyết định đang chạy, chứ không cho phép một quyết định sắp chạy. Giá của việc
làm ngược thứ tự: mọi cái phanh dưới đây được kiểm **sau khi** mã đã tồn tại, nên chúng chứng
minh mã khớp với dự định — chúng **không** chứng minh dự định được xem xét trước khi gõ.

Lý do kinh tế của ⓶, đo được: mỗi lượt gọi model tốn **~370.000 token đọc** bất kể lệnh to hay
nhỏ. Chạy tay 12 vòng là trả cái giá đó 12 lần cho **một việc lặp lại y hệt**. Bộ chạy là Node
thuần, **0 usage CC**.

## Quyết định

Cho phép một vòng tự nối, với đúng ranh giới sau:

**⑴ Bộ chạy KHÔNG BAO GIỜ TỰ SOẠN CHỮ.** Mỗi vòng nó chuyển **nguyên văn** khối copy cuối câu
trả lời thành lượt hỏi kế tiếp. Cửa duy nhất nó đi qua là *"chuyển tiếp nguyên văn"* — không tóm
tắt, không chỉnh, không thêm. Nội dung trên trang là **dữ liệu để PHÂN LOẠI**, không phải nguồn
để quyết định gõ gì.

**⑵ Chỉ lấy chữ TRONG khối copy**, không bao giờ lấy văn xuôi quanh nó. Khối là thứ GPT cố ý
đóng gói; văn xuôi là chỗ chữ lạ trôi vào.

**⑶ Trần số vòng là HẰNG TRONG MÃ, không phải tham số.** `TRAN_VONG = 30`; `--so-vong` bắt buộc
và bị chặn ở cửa vào. Đọc trần từ cờ dòng lệnh thì nó chỉ còn là một chỗ để gõ nhầm, và một vòng
lặp không trần trên một trang có thể sinh tiền là loại lỗi **không sửa lại được sau khi nó chạy**.

**⑷ Mỗi vòng một dòng sổ, ghi nguyên văn thứ đã gửi** (`nhat-ky.jsonl`), nằm **ngoài repo**.

**⑸ Không có khối copy thì DỪNG** — sau khi đã nạp lại một lần. Không tự chế prompt thay GPT.

**⑹ Ba loại dừng hẳn của [ADR-0050](0050-chay-het-job-tru-ba-loai-dung-han.md) giữ nguyên**
(CAPTCHA · hết hạn mức · nghi ngờ tài khoản). Kiểm bằng mã 11/09: `chat.say` đi qua `runPrompt`,
nơi ba lớp chặn đó sống — nên chúng được **kế thừa**, không phải viết lại.

**⑺ Đức dừng được giữa chừng** bằng một tệp cờ `DUNG` trong thư mục nhật ký (`dung-chuoi.bat`).
Cố ý **không** giết tiến trình: giết giữa lượt gửi là để lại đúng trạng thái *"không biết đã bay
chưa"* mà exact-once sinh ra để tránh.

**⑻ Mọi phanh của `chat.say` giữ nguyên và KHÔNG có bản sao:** công tắc Development Mode · chốt
`RUN_ACTIVE` · **cùng một** nắp chờ 90 giây với `run.trial`. Hai bản sao của một nắp là **hai
ngân sách**, tức nới phanh mà không ai thấy trong diff.

## Rủi ro chính, và nó CHƯA được đóng

Chữ được gõ đi **đến từ trang**. GPT đọc Google Sheet và GitHub; nếu một tài liệu nào đó chứa câu
ra lệnh, câu ấy có thể đi vào khối copy, và vòng lặp sẽ gõ nó ra **như thể lời của Đức**. Vòng có
người ở giữa thì Đức nhìn thấy trước khi dán; vòng tự chạy thì không ai nhìn.

Ba mép đã dựng, và **không mép nào đóng được rủi ro này**:

| mép | chặn được gì | KHÔNG chặn được gì |
|---|---|---|
| `nguoiNhanCuaKhoi` (`B-62`) | khối tự khai giao cho người khác GPT → `CAN_NGUOI` | khối **không khai** người nhận vẫn đi tiếp |
| `canhTab` (`B-63`) | chuỗi gõ nhầm hội thoại, hoặc chèn vào lúc người đang dùng | chữ độc trong đúng hội thoại của mình |
| trần vòng · trần ký tự khối | thiệt hại **kéo dài** | thiệt hại **một lượt** |

**Giá của lỗ này, nói thẳng:** một câu ra lệnh nằm trong tài liệu GPT đọc có thể đi trọn một vòng
mà không ai thấy, và nó mang danh nghĩa của Đức. Cái duy nhất đang giữ là **trần vòng** và **sổ
nhật ký ghi nguyên văn** — tức ta phát hiện **sau**, không chặn **trước**.

Chấp nhận rủi ro này ở mức hiện tại vì: phạm vi là các hội thoại reasoning do Đức tự mở, trần
vòng nhỏ, và mỗi lượt đều để lại nguyên văn trong sổ. **Không** mở rộng vòng tự nối sang hội
thoại có nội dung từ nguồn lạ khi chưa có một mép chặn thật.

## Hệ quả

- `B-56` đóng cả hai nửa.
- `chuoi-reasoning.mjs` · `chay-chuoi.bat` · `dung-chuoi.bat` · `chon-profile.mjs` là bản thi
  hành của ADR này. Sửa một trong tám điều trên là **đổi luật**, phải hỏi Đức.
- Giao thức vận hành: `drafts/GPT-REASONING-8-ROUND-PROTOCOL-V1.md`; sổ tay cho phiên AI:
  mục *"Chuỗi reasoning nhiều vòng"* trong `AI-OPERATOR-GUIDE.md`.
- Còn nợ, đã biết giá: chưa có gì **cưỡng chế** GPT ghi trong `drafts/`, và commit của GPT dùng
  chung danh tính git với Đức — hai điều đó nằm ngoài phạm vi ADR này.
