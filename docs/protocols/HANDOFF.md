---
kind: protocol
status: active
ttl_days: 365
---

# HANDOFF — luật ghi nhật ký phiên

> Mở file này khi bạn **sắp ghi một mục nhật ký**, hoặc khi cổng đóng phiên chặn bạn vì mục quá
> dài. Quyết định gốc: [ADR-0011](../adr/0011-handoff-chan-o-dau-vao-va-xoay-theo-thang.md) ·
> cơ chế lưu trữ: [ADR-0008](../adr/0008-cat-duoi-handoff-giu-hai-muoi-luot.md).

## 1. `HANDOFF.md` dùng để làm gì — và không dùng để làm gì

**Mục tiêu, một câu:** để phiên sau mở lên và **nắm trạng thái gần nhất trong một lần đọc**.

| Thuộc về `HANDOFF.md` | Thuộc về nơi khác |
|---|---|
| Làm gì · kết quả bằng số · còn gì mở | **Vì sao quyết như vậy** → ADR |
| Trạng thái vùng, khoá, việc dở | **Việc còn nợ** → `BACKLOG.md` |
| Một dòng cho mỗi sự cố gặp thật | **Cách làm một việc** → brief trong `docs/briefs/` |
| | **Thay đổi mã** → thông điệp commit |

Đây không phải luật mới: `AGENTS.md` mục 7 đã ghi *"làm gì, kết quả số, còn gì mở"* từ đầu. Cái
mới là **có trần và có máy kiểm**.

**Viết một mục dài không phải chăm chỉ — nó là đẩy chi phí sang mọi phiên sau.** Mọi phiên mở
`HANDOFF.md` đều trả tiền cho chữ bạn viết, kể cả phiên chỉ cần biết một câu.

## 2. Trần độ dài một mục — **2.600 byte**

Trần khai ở `.repo-structure.json` (`handoff.tran_byte_moi_muc`), **không gõ cứng trong script**.
Đổi số ở đó thì hành vi đổi theo. Cổng đóng phiên chặn khi vượt.

**Cổng chỉ chặn mục bạn VỪA THÊM trong phiên này.** Mục cũ không bị chặn — chặn cả file là mọi
lane đỏ ngay lập tức vì chữ của người khác.

Vượt trần thì **không phải cắt bớt chữ cho vừa** — phải hỏi: phần thừa đó **thuộc về file nào**?
Gần như luôn là ADR, sổ nợ, hoặc brief. Chuyển nó sang đó rồi để lại một con trỏ.

Tự đo lại bất cứ lúc nào:

```bash
node scripts/handoff.mjs --check HANDOFF.md workers/*/*/HANDOFF.md
```

**Vì sao 2.600.** Đo ngày 06/09 trên 42 mục đang có trong bốn `HANDOFF.md`: ngắn nhất **872**,
trung vị **3.284**, dài nhất **41.879**, trung bình **4.303** byte. 2.600 nằm ngay trên mục
**đầy đủ mà gọn nhất** đang có (2.593 byte — một mục điều phối đẩy 12 commit của bốn lane), và
nó rơi vào một **khoảng trống** của phân bố: không mục nào nằm giữa 2.593 và 2.831, nên xê dịch
±200 byte không đổi kết quả. Áp ngược lại thì nó chặn **26/42 = 62%** mục hiện có — và không mục
nào trong số đó bị chặn thật.

> **HAI CON SỐ TRONG `ADR-0011` LÀ BYTE CHIA CHO SỐ TIÊU ĐỀ, KHÔNG PHẢI BYTE MỖI MỤC NHẬT KÝ.**
> Đo lại theo mục `##` ngày 06/09: gói Flow Video **3.785 byte/mục** — **cao nhất** trong ba gói,
> không phải thấp nhất; gói gọn nhất thật sự là Gemini (**2.679**). Con số 1.158 thấp vì gói đó
> chẻ một mục ra nhiều tiêu đề `###` con, tức ngược hẳn với "viết gọn". ADR đã `Accepted` nên
> bất biến — đừng sửa nó, và cũng **đừng đem 1.158 / 5.193 ra biện luận** cho một lần đổi trần.


## 3. Xoay file theo tháng

`HANDOFF.md` chỉ chứa **tháng hiện tại**.

- Ghi mục mới → luôn ghi vào cuối `HANDOFF.md`. Không phải nghĩ.
- Sang tháng mới → nội dung tháng cũ thành file lưu trữ của tháng đó, `HANDOFF.md` bắt đầu lại
  với một **con trỏ** sang file vừa sinh.

**Vì sao xoay lúc GHI chứ không cắt lúc quét:** các mục Log **không xếp theo thứ tự thời gian**
(đo được ở gói ChatGPT: `22/08` rồi `24/08` rồi `22/08` lại). Nên "cắt phần cũ hơn N ngày" là
câu **máy không xác định được**, và ADR-0008 bất biến ⑵ cấm. Xoay lúc ghi thì không cần thứ tự
nào cả.

**Ba bất biến của lược đồ lưu trữ:**

1. **Không mất một byte.** Dời, không xoá. Nối lại phải ra bản gốc **giống hệt từng byte**.
2. **Chuỗi con trỏ phải đi được bằng máy.** File hiện tại trỏ sang file trước, file trước trỏ
   sang file trước nữa. **Đừng gõ cứng tên file lưu trữ ở bất kỳ đâu.**
3. **File lưu trữ khai vào Bản đồ file** (`AGENTS.md` mục 4). Không khai = không tồn tại.

**Làm thế nào — một lệnh:**

```bash
node scripts/handoff.mjs --rotate HANDOFF.md
```

Nó đọc mốc `<!-- HANDOFF-THANG: YYYY-MM -->` trong file. Cùng tháng thì không làm gì. Khác tháng
thì dời **toàn bộ phần sau dòng `## Log`** sang `HANDOFF-ARCHIVE-NN.md` (`NN` = số lớn nhất đang
có trong thư mục, cộng một) và mở lại file với mốc tháng mới + một con trỏ. File chưa từng khai
tháng thì lượt đầu **chỉ khai, không xoay** — cố ý: đoán tháng từ ngày trong tiêu đề là câu máy
không xác định được.

**Vì sao đánh SỐ chứ không đặt tên theo tháng** (`HANDOFF-ARCHIVE-2026-09.md`): bộ đếm sự cố ở
`build-overview.mjs` dò đúng hình dạng `HANDOFF-ARCHIVE-\d+\.md`. Đặt tên theo tháng là bộ đếm
**mù ngay lượt xoay đầu tiên** — xem mục 4. Đánh số cũng là cái nối tiếp được với
`HANDOFF-ARCHIVE-01.md` sinh sáng 06/09 theo ADR-0008.

**Cổng đóng phiên nhắc ai:** chỉ lane đang **giữ khoá** của file đó, và chỉ khi lane đó chạm file
trong phiên này. Xoay là viết lại đầu file, tức không còn là "chỉ thêm ở cuối" nên miễn trừ hành
chính không che nó — bắt một lane không giữ `_root` phải xoay là bắt họ làm việc luật cấm họ làm.

## 4. Cỗ máy đọc GỘP — đừng làm nó mù

Người và AI đọc `HANDOFF.md` theo kiểu **đọc đuôi**. Nhưng **bộ đếm sự cố** của bảng trạng thái
đọc **mọi mục**, không chỉ mục cuối.

Ngày 06/09 một lượt cắt làm bốn dòng sự cố biến mất khỏi file hiện tại. Số đếm về **0**, và cổng
đỏ với **mọi lane**. Đã vá bằng cách cho bộ đếm **đi theo con trỏ lưu trữ**.

> **"0 sự cố" đọc y hệt "sạch sẽ", trong khi thật ra là "mù".**

Mọi thay đổi về lưu trữ phải kiểm lại: bộ đếm còn đọc được qua chuỗi con trỏ không.

**Vá lần hai, 06/09 (ADR-0011):** bản vá đầu chỉ đi được **một bước** (`HANDOFF.md` → `-01`). Xoay
theo tháng thì chuỗi dài ra mãi (`HANDOFF.md` → `-02` → `-01` → …) và con trỏ sang `-01` nằm
**trong** `-02`, nên đi một bước là mọi sự cố cũ hơn một tháng âm thầm biến mất — đúng lại con bug
cũ, chỉ chậm hơn 30 ngày. Nay bộ đếm đi **hết** chuỗi. Phép ghim: `tests/build-overview-smoke.mjs`
khối (d2).

> **Muốn thử phá bộ đếm thì phải COMMIT đột biến, sửa file trên đĩa là vô ích.** Bộ sinh đọc
> `git show HEAD:<file>`, không đọc đĩa — cố ý, để bảng chỉ nói thứ đã commit. Nên xoá con trỏ
> trong cây làm việc rồi chạy suite sẽ ra **XANH**, và cái xanh đó **không** chứng minh gì cả.
> Ngày 06/09 nó báo "sống sót" hai lần trước khi lộ ra là bẫy của bộ đo. Cách đúng: commit đột
> biến trong một **bản sao** repo rồi chạy — làm thế thì số đếm về 0 ngay và phép ghim (a) đỏ.

## 5. Cấm

- Cấm xoá mục cũ. Dời thì được, xoá thì không.
- Cấm cắt theo ngày tháng (ADR-0008 bất biến ⑵).
- Cấm gõ cứng tên file lưu trữ trong script — đi theo con trỏ.
- Cấm nới trần để cho mục của mình lọt.
- Cấm để phần lý do **bốc hơi** khi viết ngắn: nó phải sang ADR / sổ nợ / brief, kèm con trỏ.
  Cắt để tiết kiệm token mà làm mất một thứ người sau cần là **lỗ, không phải lãi**.
