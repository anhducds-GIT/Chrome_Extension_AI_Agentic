---
kind: brief
status: active
ttl_days: 90
---

# BRIEF `MOC-DA-XONG-01` — Đức muốn nhìn lại những việc lớn đã làm xong

## 1. Đức nói gì

> *"Trên dashboard, thêm phần công việc lớn đã hoàn thành nữa, để tôi có thể nhìn lại xem chúng
> ta đã làm qua những gì. Tôi chưa biết nên đặt ở đâu cho hợp lý... có thể đặt trong AI assistant
> luôn ko? có bị trùng thông tin ko? hay là đặt trong tổng quan..."*

Ba câu hỏi đó đã được trả lời ở mục 2. Executor **không** phải quyết lại chỗ đặt.

## 2. Đặt ở đâu — đã chốt, kèm lý do

**Danh sách đầy đủ đặt ở tab `Nhật ký`.** Đổi nhãn tab thành **"Nhật ký & mốc"**.

Vì sao không đặt ở `AI điều phối`: tab đó trả lời *"bây giờ tôi cần làm gì"*. Lịch sử trả lời
*"chúng ta đã đi qua đâu"* — hai câu hỏi khác nhau, và trộn vào nhau thì câu thứ nhất bị loãng.
Thêm nữa `BRIEF-DASHBOARD-ORCHESTRATOR-TAB-V2` đã **cấm vùng thứ năm** ở tab đó.

Vì sao không đặt ở `Tổng quan`: tab đó là trạng thái **từng extension**. Mốc ở đây phần lớn là
việc của hạ tầng và của chính Assistant — nhét vào sẽ thành hai loại thông tin đứng chung một
bảng mà không cái nào đọc trọn được.

Vì sao `Nhật ký` là đúng chỗ: tab đó đã là trục **nhìn lại**, và hiện chỉ có **một** thẻ
(quyết định đã chốt) nên còn trống.

**Có trùng không — không, nếu chia đúng như sau.** Đây là ràng buộc bắt buộc:

| Thẻ | Trả lời | Nguồn |
|---|---|---|
| Thẻ đã có: *Quyết định đã chốt* | **Đức đã chốt những gì** | ADR / `decisions.md` |
| Thẻ mới: *Việc lớn đã đóng* | **Đã làm xong những gì** | brief có `status: done` |

**Thẻ mới KHÔNG được đọc ADR.** Đọc ADR là chép lại đúng thứ thẻ bên cạnh đang hiện — và hai
bản của một danh sách thì sớm muộn sẽ đếm ra hai số khác nhau.

**Ngoài ra, ở tab `AI điều phối`, thêm ĐÚNG MỘT DÒNG** vào cuối vùng 2 (CÔNG VIỆC HIỆN TẠI):
số việc lớn đã đóng + tên việc gần nhất + câu trỏ sang tab Nhật ký. Một dòng, không phải một
vùng — Đức mở tab này hằng ngày nên phải thấy có lịch sử ở đâu đó, nhưng không được để nó
chiếm chỗ của việc đang chạy.

## 3. Dữ liệu lấy từ đâu

Nguồn: mọi file `docs/briefs/*.md` có `status: done` trong frontmatter.

Mỗi dòng cần ba thứ:

| Trường | Lấy từ đâu |
|---|---|
| **Mã việc** | phần trong dấu backtick ở dòng `# BRIEF ...` (đã có regex `DEFECT_H1` trong `build-overview.mjs`) |
| **Tên việc** | phần sau dấu gạch dài ở cùng dòng đó |
| **Ngày đóng** | commit gần nhất chạm file đó: `git log -1 --format=%ad --date=short -- <file>` |

**Ngày phải lấy từ git, không được lấy từ đồng hồ hệ thống.** Trang này nằm trong khối
`generators`, nên bất cứ thứ gì phụ thuộc giờ chạy sẽ làm **mọi luồng bị chặn push** khi sang
ngày mới. Git đọc từ HEAD nên nó tất định: cùng một HEAD luôn cho cùng một ngày.

Sắp xếp: ngày mới nhất lên đầu.

## 4. Hỏng thì phải nổ, không được im

Theo đúng cách `readMoc()` đang làm:

- Không có file brief nào `status: done` → **ném lỗi**, đừng vẽ thẻ rỗng. Một thẻ rỗng làm Đức
  tưởng chúng ta chưa làm được gì.
- Một brief `done` mà dòng `# BRIEF` không đúng dạng → **ném lỗi kèm tên file**. Đừng bỏ qua
  im lặng: bỏ qua một dòng là làm ngắn danh sách mà không ai biết.
- `git log` không trả về gì cho một file (file chưa commit) → **ném lỗi kèm tên file**. Đừng
  điền ngày hôm nay thay thế.

## 5. Nghiệm thu

Xanh khi cả năm điều sau đúng:

1. `node scripts/build-overview.mjs <ra.html>` chạy được, tab **Nhật ký & mốc** có thẻ mới,
   liệt kê **đúng** số brief `status: done` đang có trong `docs/briefs/`.
2. Thẻ mới **không** chứa dòng nào cũng đang có trong thẻ *Quyết định đã chốt*.
3. Tab `AI điều phối` có **đúng một** dòng mới, nằm trong vùng 2, **không** có vùng thứ năm.
4. Chạy bộ sinh hai lần liên tiếp trên cùng HEAD → **hai file giống hệt nhau từng byte**.
   Đây là phép chặn chính: nó bắt mọi chỗ lỡ dùng đồng hồ hệ thống.
5. Cổng đóng phiên XANH TOÀN BỘ, và có test ghim mới cho hàm đọc mốc.

**Đột biến kiểm bắt buộc** (luật `MULTIFLOW.md` — làm rồi mới được báo xong): sửa tạm một brief
`done` cho hỏng dòng `# BRIEF`, chạy lại, xác nhận nó **ném lỗi** chứ không im lặng bỏ dòng đó.
Khôi phục file sau khi đo.

## 6. Cấm

- Cấm tạo file dữ liệu mới. Toàn bộ thông tin đã nằm trong `docs/briefs/` và git.
- Cấm sửa tay `DASHBOARD-Chrome-Extension-AI-Agentic.html`.
- Cấm `git add -A`. Chỉ `git add` đúng những file mình sửa.
- Cấm đụng vào thẻ *Quyết định đã chốt* đang có.
