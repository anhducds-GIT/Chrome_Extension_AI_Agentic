---
status: Accepted
adr: 0033
decides: [0033]
date: 2026-09-09
deciders: Đức (đặt trần có biên + uỷ quyền tái tổ chức kiến trúc luật) · claude-nen-luat (thi hành) · Codex (audit độc lập, bác bỏ kết luận sai)
nhom: pham-vi-va-ky-luat
---

# ADR-0033 — Trần CÓ BIÊN, và bảy chỗ mâu thuẫn trong bản hiệu lực

## Bối cảnh

Hai việc xảy ra cùng lúc ngày 09/09.

**⑴ Đức đổi cách đặt trần.** Nguyên văn: *"mục tiêu không phải đạt ngưỡng, mà phải **nhỏ hơn ngưỡng
margin là 30–40%**, vì sau này sẽ tiếp tục phình ra."* Và ông mở rộng uỷ quyền: *"tôi uỷ quyền cho
bạn duy trì tự động cơ chế nén rules, **tái tổ chức và cấu tạo lại kiến trúc** cho phù hợp."*

**⑵ Tôi đã kết luận SAI, và một lượt audit độc lập bác bỏ nó.** Sau khi rút hết chuyện kể khỏi mục 1
và mục 4 mà chỉ giảm 6%, tôi viết vào `ROADMAP.md` rằng *"phần thừa là chính các câu luật, đi tiếp là
bỏ bớt luật"*. Codex đọc lại toàn văn và trả lời thẳng: **sai** — tôi mới chạm trần của việc *xoá
chuyện kể*, chưa chạm trần của việc *nén mà không mất lớp bảo vệ nào*. Cửa còn lại là **chuyển thủ
tục xuống Tầng 2 kèm một cò nạp bắt buộc**, giữ nguyên câu bất biến ở Tầng 1. Chuyển một thủ tục mà
vẫn giữ bất biến của nó **không phải là xoá luật**.

Lượt audit đó còn tìm ra **bảy chỗ mâu thuẫn** đang nằm sẵn trong bản hiệu lực. Chúng nguy hiểm hơn
độ dài: một lượt nén sau này sẽ "dọn" đúng những chỗ đó mà không biết mình đang xoá gì.

## Quyết định

### ⑴ Trần có BIÊN: đích là 60–70% của trần, không phải bằng trần

`luat.nap` khai **ba** con số cho mỗi thước, không phải hai:

- **`tran_*`** — số HÔM NAY. Máy canh cái này (cơ chế cũ, [ADR-0027](0027-bo-bien-dich-luat.md) ⑶).
- **`dich_*`** — **8.000**, chỗ phải tới. Nay đọc là **TRẦN TUYỆT ĐỐI**, không phải đích.
- **`bien_*`** — **5.200** (65% của 8.000, giữa dải 30–40% Đức nêu). Đây mới là **ĐÍCH thật**.

Lý lẽ của Đức, và nó khớp với lịch sử đo được của chính repo này: **một ngân sách không có chỗ thở
là một ngân sách bị phá bởi commit kế tiếp.** File chạm trần rồi được cắt về đúng trần thì vài ngày
sau lại vượt, vì mỗi phiên thêm một dòng. Cắt tới 5.200 là mua sẵn chỗ cho phần phình đã biết chắc
sẽ tới.

### ⑵ Đo cái một phiên THẬT SỰ nạp — theo BÓ, không theo file

[ADR-0031](0031-tran-do-bang-ky-tu.md) ⑴ sửa được nửa vấn đề: nó đo `CLAUDE.md + AGENTS.md` thay vì
đo tổng kho luật. Nửa còn lại vẫn sai: `tran_ky_tu_mot_goi` đo **một mình** file `AGENTS.md` của gói,
trong khi phiên đụng gói đó nạp **cả ba** file.

Nên thước gói đo **bó**: `CLAUDE.md + AGENTS.md gốc + AGENTS.md của gói`. Hệ quả cố ý và khó chịu:
**chuyển một luật từ Tầng 1 xuống một sổ tay mà MỌI phiên sửa mã đều phải mở thì không tiết kiệm
được gì thật** — nó chỉ đổi chỗ hoá đơn. Thước theo bó làm lượt nén sau không khai gian được khoản
đó.

**Con số của bó phải CỘNG, không dùng lại con số của một nửa.** Bó gồm hai nửa — phần gốc và phần
gói — nên mỗi nửa được **8.000 trần / 5.200 đích**, và cả bó là **16.000 trần / 10.400 đích**. Đặt
trần bó bằng 8.000 là đòi phần gốc co xuống 3.000 để nhường chỗ, tức là hai thước cùng tranh một
ngân sách. Một ngân sách một thước.

### ⑶ Chuyển xuống Tầng 2 chỉ hợp lệ khi kèm một CÒ NẠP BẮT BUỘC

Bảng mục 7 đổi từ *"mở khi cần"* sang **"đọc TRƯỚC KHI làm việc X"**. Không có cò, việc chuyển đúng
là mất lớp bảo vệ: một phiên không biết sổ tay tồn tại sẽ không mở nó.

Và mỗi lượt chuyển phải ghi được: **chỗ cũ → câu bất biến còn ở Tầng 1 → sổ tay đích → cò nạp.**
Thiếu một trong bốn thì lượt chuyển đó chưa xong.

### ⑷ Bảng mục 7 KHÔNG phải bảng chỉ đường thuần — nó có luật lẫn trong

Lời tự mô tả cũ (*"bảng này là BẢNG CHỈ ĐƯỜNG, không phải nội dung"*) là **sai sự thật**, và cái sai
này nguy hiểm: ai làm lượt "dọn bảng chỉ đường" tiếp theo sẽ xoá mất luật thật. Ít nhất ba hàng mang
luật, không mang đường: hàng `DAU_VO` (**đừng restamp cho xong việc** — restamp là đóng dấu hợp lệ
cho một vụ sửa tay và xoá luôn tang chứng), hàng Scouter (**selector không bao giờ gõ vào seed**),
hàng ba gói fork (**một lỗi thường có ba bản sao**).

**Luật lẫn trong bảng phải được kéo lên mục luật.** Bảng chỉ giữ đường đi.

### ⑸ Bảy chỗ mâu thuẫn, và cách đọc đúng của từng chỗ

Đây là **ghi lại cách đọc đã có hiệu lực trên thực tế**, không phải luật mới:

- **⒜ Khoá file trả lúc nào.** Hai câu đá nhau: *"trả ngay sau khi ghi"* và *"trả lúc HẾT PHIÊN"*.
  Đọc đúng: **trả ngay sau lượt ghi; hết phiên là HẠN CHÓT, không phải khuyến nghị** (cổng đỏ nếu
  còn treo). Cần ghi tiếp thì **nhận lại**.
- **⒝ Thứ tự bộ sinh.** Đọc đúng: **suite là việc CUỐI CÙNG**. Mọi bộ sinh chạy **trước** lượt commit
  cuối. Bộ sinh ghi vào sổ CÓ RÀNG BUỘC (`handoff.mjs --cat`, `rule-compile --sinh`) chạy **đúng một
  lần** — chạy lại nhiều lượt là cắt/nối chồng lên nhau.
- **⒞ "Đúng MỘT lượt" là tối ưu, không phải cấm.** Suite hỏng dấu sau một lượt ghi thì **chạy lại**.
  Bất biến là *"trạng thái cuối cùng đã được kiểm"*, không phải *"chỉ được chạy một lần"*.
- **⒟ `git commit --amend` với luật "sửa lịch sử phải hỏi Đức".** Đọc đúng: được `--amend` **commit
  của chính lane mình, CHƯA ĐẨY**. Đã đẩy thì là sửa lịch sử, phải hỏi.
- **⒠ "Không xoá file" với các luật bảo xoá.** Luật gốc của Đức che **dữ liệu nguồn, bằng chứng vận
  hành, và mọi thứ ngoài bộ máy của repo**. Xoá một phép kiểm bắt 0 đột biến, hay một hồ sơ đã nghỉ,
  là **bộ máy tự dọn mình** — nằm trong giới hạn ⑥ và `docs/README.md`, không phải trong luật gốc.
  *Đây là cách đọc do AI ghi lại theo thực tế đang chạy; Đức bác thì sửa.*
- **⒡ Hai vai với hàng rào điều phối.** Điều phối là một **CHẾ ĐỘ của phiên**, không phải vai thứ ba.
  Một phiên nhận việc điều phối thì hàng rào *không code, không debug, không đề xuất bản vá* có hiệu
  lực với nó, bất kể nó mang vai nào ở
  [ADR-0029](0029-hai-vai-o-repo-extension.md).
- **⒢ Uỷ quyền đẩy với luật "không gửi gì ra ngoài".** Đọc đúng: **đẩy git đủ ba điều kiện đã có uỷ
  quyền thường trực** (Đức chốt 26/08). Luật "không gửi ra ngoài" che mọi kênh **khác**.

### ⑹ Hai cửa thoát KHÔNG được gỡ ở lượt nén sau

Audit nêu tên chúng vì chúng trông giống chỗ thừa: **`git commit --no-verify` khi chốt kẹt** (kèm
nghĩa vụ nói ra trong nhật ký), và **được sửa dòng cũ của một file miễn-khoá khi đang giữ khoá đúng
file đó**. Lời giải thích của chúng co lại được; **bản thân ngoại lệ thì không.**

## Hệ quả

**Được.** Đích 5.200 có đường tới mà không mất một lớp bảo vệ nào — audit độc lập kết luận
`REACHABLE`. Bảy chỗ mâu thuẫn được ghi ra trước khi một lượt nén nữa đi qua chúng.

**Mất, và biết trước.** Bảng mục 7 đổi nghĩa: *"mở khi cần"* → *"đọc trước khi làm X"*. Đọc nhiều
hơn cho một phiên làm đúng việc X, đổi lấy việc không ai bỏ sót sổ tay bắt buộc.

**Chỗ chưa với tới.** ⑶ đòi ghi được chuỗi *chỗ cũ → bất biến → đích → cò*, nhưng **chưa có phép
kiểm máy nào** canh chuỗi đó. Hôm nay nó là kỷ luật của người viết. Đó là món nợ, ghi ở `BACKLOG.md`.

## Trạng thái

Accepted.
