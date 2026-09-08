---
kind: brief
status: active
ttl_days: 60
---

# BRIEF `HANDOFF-TRAN-01` — Trần độ dài mục nhật ký, và xoay file theo tháng

Quyết định gốc: [ADR-0011](../adr/0008-nhat-ky-phien.md).
Luật vận hành: [`docs/protocols/HANDOFF.md`](../protocols/HANDOFF.md). **Đọc cả hai trước.**

## 1. Việc ① — ĐO rồi mới chốt trần

`ADR-0011` cố ý **không** chốt con số. Việc đầu tiên của bạn là đo, không phải chọn.

Số đo ngày 06/09 làm điểm tựa, **tự chạy lại đừng chép**: gói Flow Video trung bình **1.158
byte mỗi mục**, gói ChatGPT **5.193** — cùng loại việc, chênh 4,5 lần. Mức thấp **đã có người
làm được**.

Đo phân bố thật: mục ngắn nhất · dài nhất · trung vị · bao nhiêu phần trăm mục vượt các mức
thử. Rồi **đề xuất một con số kèm lý do**, và nói rõ nó chặn bao nhiêu mục hiện có.

Trần khai ở `.repo-structure.json`. **Cấm gõ cứng trong script** — hai bản sao của một luật đã
trả hai câu khác nhau cho cùng một file ngày 02/09.

## 2. Việc ② — cổng chặn

Vượt trần thì cổng đóng phiên **ĐỎ**, kèm câu chỉ đường: *phần thừa thuộc về ADR, sổ nợ, hay
brief?* Không có ⑵ thì ⑴ chỉ là lời khuyên — `AGENTS.md` mục 7.

**Chặn đúng mục vừa thêm trong phiên này, đừng chặn mục cũ.** Mục cũ là việc của lượt Codex ở
mục 4; chặn cả file là mọi lane đỏ ngay lập tức vì chữ của người khác.

## 3. Việc ③ — xoay file theo tháng

`HANDOFF.md` chỉ chứa tháng hiện tại. Sang tháng mới, nội dung tháng cũ thành file lưu trữ của
tháng đó, `HANDOFF.md` bắt đầu lại với một con trỏ.

**Xoay quyết định ở LÚC GHI, không phải lúc quét.** Các mục Log không xếp theo thứ tự thời gian
(đo được ở gói ChatGPT), nên mọi phép "quét rồi cắt theo ngày" đều không xác định được —
`ADR-0008` bất biến ⑵ cấm.

Ba bất biến (protocol mục 3): **không mất một byte** · **chuỗi con trỏ đi được bằng máy, cấm gõ
cứng tên file lưu trữ** · **khai vào Bản đồ file**.

**Hôm nay đã có một file lưu trữ** (`HANDOFF-ARCHIVE-01.md`, sinh sáng 06/09). Lược đồ theo
tháng phải **nối tiếp được với nó**, không bỏ nó lại thành mồ côi.

## 4. Việc ④ — Codex CLI rà và viết ngắn các mục hiện có

**Đức duyệt việc này ở `ADR-0011` mục ⑶** — đây là câu duyệt cho việc viết lại chữ cũ của phiên
khác, thứ luật mục 1 không miễn.

Gọi Codex CLI rà từng mục và viết lại theo hình dạng ở protocol mục 1. **Bản dài phải còn đọc
được ở file lưu trữ** — viết ngắn là **đổi chỗ chi tiết, không phải xoá**.

**Chỗ dễ hỏng nhất của cả brief này, đọc kỹ:** phần lý do bị cắt ra **phải sang ADR / sổ nợ /
brief kèm con trỏ**, không được bốc hơi. Các bản báo cáo dài ngày 06/09 đã cho thông tin thật —
chính chúng giúp bắt được nhiều kết luận sai. Cắt mà làm mất thứ người sau cần là **lỗ, không
phải lãi**.

Sau mỗi lượt Codex: **tự đọc lại bản rút gọn và tự hỏi "phiên sau mở lên có nắm được trạng thái
không"**. Codex báo xong không phải bằng chứng (luật vàng 4).

Việc ④ chạm `HANDOFF.md` của ba gói worker → **ba khoá worker**. Nếu lượt này quá tải thì làm
①②③ rồi dừng, ④ để lượt sau — nói rõ trong báo cáo.

## 5. Đừng làm cỗ máy đọc gộp bị mù

Bộ đếm sự cố của bảng đọc **mọi mục**, không chỉ mục cuối. Ngày 06/09 một lượt cắt làm bốn dòng
sự cố biến mất, số đếm về **0**, cổng đỏ với mọi lane.

**Kiểm lại sau mỗi thay đổi:** bộ đếm còn đi được qua chuỗi con trỏ không. *"0 sự cố" đọc y hệt
"sạch sẽ", trong khi thật ra là "mù".*

## 6. Nghiệm thu

1. Trần khai trong `.repo-structure.json`, đổi số thì hành vi đổi theo.
2. Mục vượt trần → cổng ĐỎ. Mục vừa trần → XANH. Mục **cũ** vượt trần → **không** chặn.
3. Xoay tháng: giả lập sang tháng mới → file lưu trữ sinh ra, con trỏ nối được, **dựng lại được
   giống hệt từng byte**.
4. Bộ đếm sự cố vẫn ra đúng số sau khi xoay.
5. **Đột biến kiểm:** gỡ phép chặn → phép ghim ĐỎ · đảo điều kiện → ĐỎ · bỏ con trỏ → bộ đếm
   phải ĐỎ chứ không âm thầm về 0.
6. **Đếm số chỗ mỏ neo của bạn khớp. Ra 0 thì DỪNG** — công cụ đo hỏng, không phải "không có gì
   phải sửa". Ngày 06/09 chuyện này xảy ra với **năm lane khác nhau** trong repo này.
7. Cổng đóng phiên XANH TOÀN BỘ.

## 7. Khoá và đóng phiên

`_code` (script + phép ghim) và `_root` (`.repo-structure.json`, `HANDOFF.md` gốc). Việc ④ cần
thêm ba khoá worker.

Commit có dòng cuối `Lane: <tên-phiên>` · `git commit -o <đường-dẫn>` — **nhưng biết giới hạn
của nó**: mục `N-05` trong `BACKLOG.md` gốc ghi rằng `-o` **không** chặn được việc cuốn sửa đổi
của lane khác trên **cùng** file, và `HANDOFF.md` đúng là file nhiều lane cùng ghi hợp lệ. Kiểm
cây làm việc trước khi commit.

Cổng XANH TOÀN BỘ · sinh lại artifact rồi commit trước khi đẩy · đẩy bằng `safe-push.mjs` ·
**trả khoá SAU khi đẩy**.

## 8. Cấm

- Cấm gõ cứng trần trong script.
- Cấm chặn mục cũ trong lượt ②.
- Cấm cắt theo ngày tháng.
- Cấm để phần lý do bốc hơi khi viết ngắn.
- Cấm nới trần để cho mục của chính mình lọt.
