# HANDOFF lưu trữ — HANDOFF.md, 6 mục cũ

> **Đây là phần đuôi đã cắt của [`HANDOFF.md`](HANDOFF.md) cạnh file này.**
> Sinh bằng `node scripts/handoff.mjs --cat HANDOFF.md --giu 20` theo
> [ADR-0008](docs/adr/0008-nhat-ky-phien.md) — cắt ngày 2026-09-10.
>
> Cắt theo **vị trí trong file**, không theo ngày (bất biến ⑵ của ADR): file kia giữ **20
> mục cuối**, 6 mục trước đó nằm ở đây — **nguyên văn, không sửa một chữ**.
>
> **Dựng lại bản gốc:** thay khối con trỏ trong `HANDOFF.md` (phần giữa dòng `## Log` và
> tiêu đề `##` đầu tiên) bằng toàn bộ phần dưới dấu `ARCHIVE-BODY-START` ở đây — ra đúng bản
> gốc **từng byte**. SHA-256 bản gốc trước khi cắt: `8b31de9785d6e963e5afcc9036265f4f5c08b9efe81c074b853ec5752fe95da8`.
>
> **Chỉ đọc.** Ghi Log mới thì ghi vào `HANDOFF.md`, đừng ghi vào đây.

<!-- ARCHIVE-BODY-START -->

<!-- HANDOFF-THANG: 2026-09 -->

<!-- HANDOFF-CUT-POINTER: ADR-0008 -->
> **4 mục cũ hơn đã dời sang [`HANDOFF-ARCHIVE-04.md`](HANDOFF-ARCHIVE-04.md)** — cùng thư mục này,
> nguyên văn, không mất chữ nào. File này giữ **20 mục cuối** (ADR-0008). Cần đào lịch sử
> xa hơn thì mở file đó và đi tiếp theo con trỏ trong nó; ghi Log mới thì vẫn ghi vào cuối
> file này.
<!-- /HANDOFF-CUT-POINTER -->

## 2026-09-08 (tiếp) · `claude-gpt-mvp-3fix` — vá ba chỗ chặn vòng CC ↔ GPT, và tìm ra chỗ thứ tư

**Làm gì.** Đức chốt "làm A": vá ba chỗ hở tìm ra ở lượt nghiệm thu live cùng ngày. Chi tiết từng
mục, lý do các lựa chọn **cố ý không làm**, và ba đường chọn của `B-40`: `BACKLOG.md`.

**Kết quả số.**

- **`B-38` ĐÓNG, nghiệm thu LIVE.** Lượt GHI qua CLI nay bắt buộc khai `--request-id`, câu chặn
  kèm khoá gợi ý tiền định. Nửa còn lại của điều kiện đóng **đã có sẵn** —
  `tests/bridge-core-smoke.mjs:143` ghim `handlerCalls === 1` cho cùng khoá; lớp replay của host
  chưa bao giờ hỏng, thứ hỏng là CLI không cho nó cơ hội khớp.
- **`B-37` và `B-39` ĐÓNG ở mức suite.** Câu báo *"chưa có thư mục"* tách thành **bốn** câu theo
  bốn nguyên nhân, kèm số hồ sơ đếm được. `run.status` nay trả `last_failure`.
- **Suite 117 → 119. Thử phá 15/15 đỏ, 0 mỏ neo hỏng.** Vòng đầu chỉ **10/15**, và cả 5 con thoát
  đều là **lỗ thật trong phép ghim của tôi**: kiểm hàm lá mà không kiểm **dây nối**. Bịt cả năm
  rồi chạy lại.
- **Sổ nợ gói 16 → 13.**

**Còn mở, cần Đức.** `B-40` (P1, mới) mới là chỗ thật sự chặn vòng tự chạy, và **không phải lỗi
trong mã**: tool tạo ảnh của ChatGPT lỗi tạm, ChatGPT nói rõ cách chữa **bằng chữ**, extension xếp
`POST_SUBMIT_UNCERTAIN` đúng ADR-0047 — vòng lặp dead-end trong khi `chat.read` đọc được câu chữa.
Đức tự gõ `render lại` thì ra kết quả đúng. Mục này **chạm ADR-0047 nên tôi không tự vá**; đề xuất
đường ⒜ (chỉ BÁO, không đổi luật retry).

**Cần Đức nạp lại tiện ích** để `B-37`/`B-39` được nghiệm thu live — lượt chạy 08/09 trả
`last_failure: null` vì tiện ích đang chạy mã cũ, đúng như phải vậy. `B-38` không cần: nó ở CLI,
đã chép sang thư mục Bridge và đã thử live.

**Hai lỗi của tôi trong buổi** (prompt gửi qua Bridge viết không dấu; ảnh mẫu là ảnh nhiễu
dựng để đo cửa sổ upload) khiến tôi **quy sai nguyên nhân hai lần** trước khi đo ra nguyên nhân
thật. Cả hai đã ghi đầy đủ ở `BACKLOG.md`, mục hai lượt đính chính.

## 2026-09-08 (tiếp) · `claude-gpt-chay-het-job` — ADR-0050 Accepted, thi hành mục ⒠

**Làm gì.** Đức đặt hướng: *"AI phải tương tác được mới là Assistant… phải chạy được đến hết Job,
trừ khi bị halt bởi Captcha"*, chốt hai case (loạt ảnh tự chủ · chat reasoning nhiều lượt), hạ nắp
chờ xuống 90 giây, và duyệt đường chat thẳng. Ghi thành
[ADR-0050](docs/adr/0050-chay-het-job-tru-ba-loai-dung-han.md), viết `Proposed` rồi đổi `Accepted`
ở lượt riêng (luật B12).

**Chỗ quan trọng nhất tìm ra khi đọc lại ADR-0047 — nó làm nhẹ hẳn phần việc.** Luật đó nguyên văn
là *"chỉ được gửi lại khi đối soát **khẳng định được** là lượt gửi đó không tạo ra kết quả nào"* —
**ngoại lệ đã nằm sẵn trong luật**, và nó thu về "chặn hẳn" chỉ vì lúc ấy đo ra **0 ca** khẳng định
được. Nên cho phép gửi lại khi nhà cung cấp TỰ nói nó không tạo được gì là **thi hành** ADR-0047,
không phải nới. Thứ thật sự cần quyết định mới chỉ là đổi nhóm năm hard stop.

**Một phát hiện làm bớt việc:** mục ⒜ của ADR-0050 **không cần làm gì** — `classifyFailure()` đã xếp
`captcha`, `unusual activity`, `security/interstitial` vào cùng `SECURITY_HARD_STOP`, và
`GENERATION_LIMIT_REACHED` vốn đã là hard stop. Ba loại Đức muốn dừng hẳn **đang dừng hẳn sẵn**.

**Kết quả số.** Thi hành **mục ⒠**: nắp chờ 5 phút → 90 giây. Suite **119 → 120**. Thử phá **5/5**.

**Bản ghim đầu của tôi chỉ TĨNH và cho 3/5** — hai con thoát là lỗ thật (gõ cứng số giây;
`if (false)` mở toang cửa chặn). Viết lại thành **hành vi**, chạy `bridgeRunTrial()` đã ship. Chi
tiết bảy mép ở dòng Bản đồ file của phép ghim.

**Còn mở, và đây là phần lớn nhất.** ADR-0050 mới thi hành **một trong năm mục**. Bốn mục còn
lại ghi thành `B-41` (P1, tự chữa để chạy hết job) và `B-42` (P1, đường chat thẳng cho case 2 —
**là quyền mới cho extension** nên phải hỏi Đức ở mức thiết kế trước khi viết mã). Ràng buộc kiến
trúc và điều kiện đóng của cả hai: `BACKLOG.md`.

**Sổ nợ gói 13 → 15.** Nợ tăng, và đúng: một quyết định đã chốt mà không ai ghi thành việc thì nó
nằm im.

## 2026-09-09 · `claude-gpt-chay-het-job` — B-41 ⑴: hai hard stop thành chữa được

**Làm gì.** Thi hành **mục ⒝** của [ADR-0050](docs/adr/0050-chay-het-job-tru-ba-loai-dung-han.md):
`RECEIVER_LOST` và `WRONG_SURFACE` thôi dừng hẳn, thành điều kiện chữa được. Chữa bằng **đúng một**
trong hai việc — F5 tab, hoặc đưa tab về hội thoại của chính run này — rồi trả về vòng chạy thử lại
từ cổng. Không mở tab mới, không tự chọn hội thoại.

**Cửa `mayRepair()` đứng TRƯỚC `canRetry()`, và không sửa vào trong nó.** `canRetry()` cùng
`submissionMayExist()` giữ nguyên từng chữ — chúng vẫn là chỗ duy nhất trả lời *"lượt gửi này có
thể đã bay chưa"*, và đảo-mặc-định của ADR-0047 còn nguyên. Nắp **3 lần theo TỪNG loại trong một
run**; hết nắp thì rơi về `INTERRUPTED` như trước.

**Hai chỗ đã ghi đầy đủ ở `BACKLOG.md`, đọc trước khi làm ⑵⑶.** ⑴ Tôi cố ý **lệch** khỏi chữ của
ADR-0050 ⒝ theo hướng chặt hơn: ADR viết hai loại này *"xảy ra trước khi gửi"*, nhưng `activeTab()`
ném `RECEIVER_LOST` ở **bất kỳ** đâu, kể cả sau khi prompt đã bay — chữa lúc đó là F5 đè lên một
lượt đang chạy, đúng cái `chat.reload` từ chối làm. ⑵ Một số đo **ngược với kỳ vọng**:
`WRONG_SURFACE` phần lớn **vẫn dừng hẳn**, vì ca nó tới được cổng là ca run chưa gắn hội thoại nào,
và lúc đó không có đích để về.

**Kết quả số.** Suite gói **120 → 121**. Thử phá **12/12**, 0 con thoát, trên cả hai file nguồn.

**Vòng chờ tách ra thành `waitTabComposer()` dùng chung** — giới hạn ② cấm hai bản sao của một
vòng chờ; lý do ở dòng bản đồ file của phép ghim.

**Còn mở.** B-41 mới xong **1 trong 3 phần**: ⑵ `DETECTION_BLIND` (đối soát trước, không gửi lại)
và ⑶ lời nhà cung cấp tự khẳng định là nguồn đối soát vẫn còn. Con số *"0 nguồn khẳng định"* trong
`post-submit-no-resend-smoke.mjs` **vẫn đúng** — phần ⑴ không nối thêm nguồn nào. Chi tiết và điều
kiện đóng: `BACKLOG.md`.

**Việc Đức.** Nạp lại tiện ích để bản này có hiệu lực, rồi chạy một loạt job và thử đóng tab ChatGPT
giữa chừng — đúng ca `RECEIVER_LOST` mà bản vá này nhắm tới.

## 2026-09-09 (tiếp) · `claude-gpt-chay-het-job` — ADR-0051: vòng chat 0 cú bấm chạy được

**Đức đặt lại hướng giữa phiên:** *"tôi ko muốn chọn thư mục, cũng ko muốn mở workbook… tôi muốn
UX đơn giản nhất với người dùng phải vận hành được trước."* Đọc lại luồng thì **hai trong ba yêu
cầu đã chạy được sẵn**: `jobs.add` là cửa mồi tự dựng phiên trong bộ nhớ, và Downloads là đích
mặc định. Chỗ tắc chỉ có một — Chrome bỏ qua tên tệp, `verifyDownloadedFilename()` so tên rồi ném.

**[ADR-0051](docs/adr/0051-nhan-ten-chrome-dat-thay-vi-doi-ten-phai-khop.md)** (Đức chốt sau khi
đọc cả cái giá): nhận tên Chrome đặt. Nó **lật một điểm** của ADR-0049 — ADR đó đã cân đúng
phương án này và **loại** nó; lý do vẫn đúng, Đức đổi ưu tiên. Ghi thẳng ra trong ADR mới.

**Chỗ làm quyết định rẻ hơn nó trông, đầy đủ ở ADR:** `verifyCompletedDownload()` đã kiểm ba thứ
độc lập với tên, và cả ba còn nguyên. Ca `ket-qua (1).xlsx` **vẫn bị chặn**.

**Nghiệm thu live: vòng lặp Đức mô tả chạy được, 0 cú bấm, 2 lượt qua lại.** Không workbook,
không chọn thư mục, prompt giữ nguyên dấu (235 ký tự), đọc câu trả lời về, phân tích, gửi tiếp.

**Nhưng lượt live đó bắt được `B-43`, và nó nặng hơn thứ vừa vá.** Máy ghi **6 ký tự** vào sổ
trong khi trang giữ **237**, và báo `SUCCESS`. Báo-thành-công-giả, vô hiệu hoá case 2. **Cố ý
chưa vá:** hai giả thuyết đòi hai bản vá khác hẳn, cần một phép đo `dom_probe` tách chúng. Số đo
và điều kiện đóng ở `BACKLOG.md`.

**Hai phát hiện khác của cùng lượt chạy, cả hai đã ghi lại:**
- Hội thoại thuộc **Project** (`/g/g-p-…/c/<id>`) bị `conversationIdOf` đọc thành `null` trong
  khi adapter nói đó LÀ hội thoại → `boundConversationId` rỗng → cửa chống trôi-hội-thoại **tắt
  lặng lẽ** trên mọi phiên Project, tức mọi phiên Đức thật sự dùng. Đã vá tận gốc: một luật, một
  bản, ở adapter.
- Chrome bỏ qua **cả thư mục**, không chỉ tên, và công cụ dọn rác không nhìn vào đó → `B-44`.

**Kết quả số.** Suite **121/121**. Thử phá: ADR-0051 **9/9** · hội thoại Project **5/5** ·
ADR-0050 ⒝ **12/12**. Sổ nợ gói thêm `B-43` (P0).

## 2026-09-09 (tệp đẩy) · `claude-gpt-chay-het-job` — có cuốn theo lane khác

Lượt đẩy này dùng `--carry` và **cuốn theo 3 commit của lane `claude-adr-gop`** (đợt gộp và đọc
lại số hiệu ADR ở `docs/adr/`). Ghi ra vì [ADR-0005](../../../docs/adr/0005-duyet-thuong-truc-cho-push-va-carry.md)
bỏ cửa hỏi Đức cho `--carry`, và tên lane bị cuốn theo là **thứ duy nhất còn lại để truy**.
Cổng đóng phiên XANH TOÀN BỘ trước khi đẩy, và suịte 26/26 chạy trên cây có cả việc của hai lane.

## 2026-09-09 · `claude-gpt-chay-het-job` — B-43 vòng hai: chờ lâu hơn, và đọc lại khi câu bị cắt

Đức nêu hai việc sau khi vòng một đã chặn được báo-thành-công-giả: *"giãn thời gian chờ đọc dài
hơn"* và *"đọc mà thấy bị ngắt thì cần đọc lại"*. Nắp chờ chữ-đứng-yên **1,5 → 6 giây**, và chốt
chỉ được đóng khi chữ **không trông như bị cắt** (`looksTruncated`: ngoặc lệch · kết bằng một dấu
nối treo). Hết giờ mà còn dở thì báo `TEXT_INCOMPLETE` kèm 60 ký tự cuối, thôi một câu "hết giờ"
trơn.

**Vùng `workers/duc-auto-chatgpt` đổi tay theo chốt của Đức 09/09** (*"bạn lấy khoá đi"*). Vùng
đang do `claude-luat-rasoat` giữ — nó lấy hợp lệ bằng một chốt khác của Đức cùng ngày và tự khoanh
"CHỈ TÀI LIỆU"; phần tài liệu của nó đã commit ở `cc470037`. Hai vùng `gemini` và `gg-flow-video`
**giữ nguyên cho nó**. Câu chốt ghi **vào bảng quyền**, không chỉ nói trong chat.

**Thử phá 16 mũi → 14 bắt, 2 thoát, và hai con thoát cho ra hai cách xử khác nhau:**
- **Lỗ ghim thật:** bỏ nhánh "kết bằng dấu nối treo" vẫn xanh với cả 10 mép — ba nhánh luật mà
  chỉ ghim một. Thêm mép ⑴f (đứt ngay sau một tiêu đề mục: ngoặc đóng đủ, chữ trông tròn trịa,
  chỉ nhánh thứ ba thấy). **10 → 11 mép.**
- **Mã chết, không phải lỗ ghim:** `if (!value.trim()) return true;` không đường nào tới được vì
  `assistantMessageText()` đã `.trim()`. Thêm phép kiểm cho nó thì ghim **niềm tin**, không phải
  hành vi — đúng cái giới hạn ⑹ cấm. **Xoá**, kèm lý do tại chỗ.

Chạy lại **15/15 bắt, 0 thoát**. Vòng một cũng được xác nhận lại: mũi "nới sang cả đường ảnh"
trước đây đi lọt vì sân khấu giả thiếu `window.DacImageEvidence` — mép ⑹ ném `window is not
defined` và **xanh vì lý do sai**. Sau khi thêm stub, mũi đó bị bắt.

**Kết quả số.** Suite **122/122**. Thử phá B-43 **15/15**. **Còn mở:** nghiệm thu live — hai lượt
chat với tab để ở NỀN, số ký tự ghi vào sổ phải **bằng** số trên trang.

