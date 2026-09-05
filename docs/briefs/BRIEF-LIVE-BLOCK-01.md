---
kind: brief
status: done
ttl_days: 90
---

# BRIEF `LIVE-BLOCK-01` — khối "đang làm gì" trên tab AI điều phối, và đặt tab đó làm mặc định

> **Cho executor.** Đức chốt 2026-09-05. Đây là phần hiện thực của
> [`ADR-0004`](../adr/0004-mot-cua-assistant-re-nhanh-va-giu-bao-cao-song.md) — đọc ADR đó trước,
> nó nói *vì sao*, brief này nói *làm gì*.
> Phiên điều phối đứng ngoài triển khai (luật `ROLE-DRIFT-01`).

## 1. Vì sao

Đức nói thẳng: *"tôi không phải hỏi bạn hay cố gắng hiểu các tác vụ bạn đang chạy ngầm, mà chỉ
cần vào dashboard là hiểu ngay."*

Hôm nay Đức phải hỏi **ba lần** *"đang có task gì chạy nền?"*. Mỗi lần tôi trả lời trong chat,
và chat thì trôi. Đây là **kênh giao tiếp chính** giữa Đức và vai điều phối, không phải một khối
trang trí.

## 2. Khối "đang làm gì" — nguồn dữ liệu ĐÃ CÓ, đừng tạo mới

Bảng quyền `.agents/claims.json` **đã chứa đủ**: khoá nào đang bận, **ai** giữ, **từ lúc nào**,
và **một câu việc đang làm** (trường `task`, do `claim.mjs --take` ghi vào).

Hôm nay tab chỉ hiện BẬN/MỞ và **cố ý giấu tên chủ**. `ADR-0004` **đảo lại điều đó**: tên lane
quay lại bảng. Lý do trước đây bỏ đi (bảng mục vì tên đổi liên tục) **đã được xử** bằng dấu lọc.
Đọc mục "Vùng 4" của [`BRIEF-DASHBOARD-ORCHESTRATOR-TAB-V2.md`](BRIEF-DASHBOARD-ORCHESTRATOR-TAB-V2.md)
để biết cơ chế đó, và **dùng lại nó**, đừng dựng cái thứ hai.

Mỗi luồng đang chạy một dòng: **tên lane · đang làm gì (câu `task`) · vùng nào · nhận từ lúc nào**.

Không luồng nào đang chạy → in một dòng nói rõ **"không có luồng nào đang chạy"**. Khối trống
**là** một thông tin; đừng ẩn nó đi, vì lúc đó Đức không phân biệt được "không có gì chạy" với
"khối này hỏng".

### Ba ràng buộc, cái thứ nhất từng suýt làm tê cả repo

1. **Mọi dòng của khối này PHẢI mang dấu lọc ở ĐẦU DÒNG**, y như khối khoá đang mang. Thiếu là
   **mỗi lượt nhận/trả khoá lại làm bảng lệch và chặn push của MỌI lane**. Đo trên lịch sử thật:
   146 trong 174 commit chạm bảng quyền làm đổi trạng thái bận/mở.
2. **KHÔNG tính khoảng thời gian lúc sinh trang.** "Giữ 20 phút" cần đồng hồ lúc sinh, mà bảng
   **cấm** phụ thuộc giờ đồng hồ — 03/09 một dòng như thế suýt chặn push của mọi phiên sang ngày
   mới. In **mốc thời gian đọc thẳng từ bảng quyền**; muốn hiện "bao lâu rồi" thì để **đoạn JS
   trong trang tự tính lúc Đức mở**, đúng cách phần còn lại của trang đang làm.
3. **Nói ra hai chỗ khối này KHÔNG thấy** — ngay trên trang, không giấu trong ghi chú:
   - **luồng ở repo khác** (bảng này chỉ thấy repo của nó);
   - **luồng chưa kịp nhận khoá** (vừa giao thì chưa có dấu vết nào trong repo).

   Không nói ra thì Đức nhìn khối trống và tin là không có gì chạy — mà đó có thể là hai
   executor đang chạy ở repo bộ khung. Sai kiểu đó **tệ hơn không có khối này**.

## 3. Đặt tab AI điều phối làm mặc định

Đức: *"đây là trang tôi sẽ truy cập hàng ngày nhiều nhất."*

Hôm nay tab mở sẵn là `Tổng quan` (thẻ của nó không mang thuộc tính ẩn, các tab khác thì có).
Đổi sang `AI điều phối`.

**Cái bẫy ở đây, đọc trước khi gõ:** bug `DASH-TAB-01` từng làm **cả 8 tab không đổi được** và
sống ẩn từ commit dựng tab đầu tiên — nguyên nhân là một dòng CSS đè lên hành vi ẩn mặc định của
trình duyệt. Dòng `[role="tabpanel"][hidden]{display:none}` là thứ đang giữ cho tab đổi được.
**Đừng thêm bất kỳ `display` mới cho `[role="tabpanel"]`.**

Đổi tab mặc định thì **cả nút tab lẫn thẻ nội dung** phải khớp — nút được tô sáng và thẻ được mở
phải là cùng một tab. Ghim cả hai.

## 4. KHÔNG làm

- **KHÔNG** thêm file dữ liệu mới. Bảng quyền đã đủ.
- **KHÔNG** thêm vùng thứ năm vào tab. Khối này nằm **trong** vùng đã có, ở trên cùng vì nó là
  thứ Đức mở ra để xem.
- **KHÔNG** gọi `what-next.mjs` / `state-check.mjs` / `claim.mjs` từ bộ sinh. Bảng suy từ HEAD;
  đọc thẳng file.
- **KHÔNG** sửa `session-check.mjs`, `safe-push.mjs`, `claim.mjs`, `what-next.mjs`,
  `state-check.mjs`, `build-dashboard.mjs`.
- **KHÔNG** sửa bảng HTML bằng tay. Nó là artifact máy sinh.
- Luật trang: **không SHA · không đường dẫn · không phần trăm · không lời máy tự khen**. Chữ Đức
  thấy là tiếng Việt có dấu; mã lỗi giữ tiếng Anh.

## 5. Xong khi nào

1. Mở bảng bằng trình duyệt: tab **AI điều phối** mở sẵn, khối "đang làm gì" ở trên cùng, và
   nội dung khớp với bảng quyền lúc sinh.
2. **Sinh hai lần liên tiếp ra kết quả y hệt** (tất định).
3. Phép ghim + **thử phá** (sửa cho sai → phải ĐỎ, và **đỏ đúng khẳng định đó**). Tối thiểu:
   - khối đọc từ bảng quyền, **không đóng cứng** danh sách lane;
   - **không luồng nào chạy → vẫn in một dòng**, không ẩn khối;
   - **mọi dòng của khối mang dấu lọc ở đầu dòng** — đây là phép ghim quan trọng nhất, vì sai
     chỗ này không ai thấy cho tới lúc bị `safe-push` từ chối;
   - tab mặc định là AI điều phối, **và nút tab khớp với thẻ nội dung**;
   - **không** có chỗ nào tính khoảng thời gian lúc sinh trang.
   Báo số thật, **kể cả số lượt thoát ở vòng đầu**.
4. Cổng đóng phiên XANH TOÀN BỘ. Sinh lại bảng.
5. Log vào `HANDOFF.md` gốc (chỉ thêm ở cuối). Commit có dòng cuối `Lane: <tên-phiên>`.
   Đẩy bằng `safe-push.mjs`. Bị từ chối vì cuốn theo việc phiên khác → **DỪNG và báo**, đừng tự
   `--carry`.
6. Trả khoá — **lượt push riêng**.

**Phép thử cuối:** nhận một khoá bằng `claim.mjs --take` với một câu việc dễ nhận ra, sinh lại
bảng, mở ra xem — dòng đó phải hiện đúng tên lane và đúng câu việc. Nhớ trả khoá sau khi thử.

## 6. Khoá cần giữ

`_code` (`scripts/` + `tests/`). Bảng HTML là artifact miễn khoá; `HANDOFF.md` gốc miễn khi chỉ
thêm dòng ở cuối. **Không nhận `_root`, không nhận khoá gói nào.**

## 7. Hai cái bẫy đã cắn nhiều lần

- **`\b` trong regex JS không dùng được với tiếng Việt** — `\b` dựa trên `[A-Za-z0-9_]` nên cạnh
  `Đ`/`ế` không có biên nào, regex khớp rỗng **mà im lặng**.
- **Ký tự vô hình / CRLF.** Neo bản vá sai kiểu xuống dòng thì báo *"không có gì khớp"* — trông
  y hệt *"không có gì phải sửa"*. Cùng họ với một defect vừa phải vá ở repo bộ khung.

## 8. Câu hỏi thì hỏi Đức

Phiên điều phối cố ý đứng ngoài. Brief thiếu gì thì hỏi Đức một câu ngắn.
