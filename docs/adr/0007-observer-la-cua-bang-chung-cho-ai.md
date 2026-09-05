---
status: Accepted
adr: 0007
date: 2026-09-06
deciders: Đức
---

# ADR-0007 — Extension Observer V0 là cửa bằng chứng cho AI, không phải công cụ cho người nhìn

## Bối cảnh

Extension Observer V0 nằm ở gốc repo từ 18/08 và **không ai đụng tới trong ba tuần**. Nó khai
`lifecycle: idea`, chưa chạy pilot lần nào, chưa có một mẩu bằng chứng vận hành nào.

`STATUS.md` của nó treo đúng một câu hỏi, và câu đó ghi rõ chỉ Đức trả lời được:

> *"Quyết định Extension Observer V0: nuôi tiếp hay cho nghỉ."*

Câu hỏi đó đứng yên vì **không ai biết nó dùng để làm gì**. Mã hiện có bọc `chrome.debugger`
để quét và mô tả các debug target, nhưng đường ra duy nhất của báo cáo là **nút Copy trong
popup** — tức chỉ phục vụ mắt người. Hai cách hiểu dẫn tới hai sản phẩm khác hẳn nhau, và
không thể xây trước khi chọn.

## Quyết định

**Observer V0 là cửa để MỌI AI nhìn vào bên trong một trang web.** Đức chốt 06/09:

> *"Observer là công cụ cho AI lấy bằng chứng... đó chính là cửa để tất cả AI nhìn vào trong
> một trang web."*

Nuôi tiếp, xây đầy đủ chức năng, **hoàn thiện hẳn trước khi chạy thử thật**.

Từ đây, "hoàn thiện" đo bằng **AI dùng được**, không đo bằng popup đẹp. Popup vẫn giữ, nhưng
nó tụt xuống hàng thứ hai: nó là chỗ Đức nhìn khi cần, không phải sản phẩm chính.

## Hệ quả

**Được — và đây là lý do nó đáng làm.** Luật vàng số 1 của repo cấm đoán selector: mọi selector
phải có bằng chứng DOM thật. Hôm nay bằng chứng đó chỉ lấy được qua `diagnostics.dom_probe` của
worker, nên nó **chỉ thấy trang mà worker đã cắm vào**. Observer đi qua `chrome.debugger` nên
thấy được cả những bề mặt worker không với tới — trang của extension khác, side panel, service
worker. Nó là nguồn bằng chứng **độc lập với worker đang cần bằng chứng**, và độc lập là thứ
làm cho bằng chứng có giá trị.

**Mất — nói thẳng ra đây vì nó sẽ đến.** Quyền `debugger` là quyền mạnh nhất một extension xin
được: nó gắn vào **bất kỳ** target nào, đọc được DOM của **bất kỳ** trang nào đang mở, kể cả
trang Đức đang đăng nhập. Mã hiện tại read-only vì **đúng một biểu thức được gõ cứng** trong
`Runtime.evaluate`. Mở kênh cho AI truyền biểu thức vào là read-only chết ngay lập tức, trong
một dòng code.

Nên bất biến số một, ghi ở đây để mọi phiên sau đọc trước khi thêm chức năng:

> **Observer nhận một BỘ TỪ VỰNG CỐ ĐỊNH các phép dò read-only. Nó KHÔNG BAO GIỜ nhận biểu
> thức tự do từ bên ngoài.** Thêm chức năng nghĩa là thêm một mục vào từ vựng, mỗi mục có phép
> ghim riêng — không bao giờ nghĩa là nới kênh cho linh hoạt hơn.

**Ba chỗ chưa quyết, biết trước để không tưởng đã xong:**

- **Cần quyền mới.** Cửa cho AI nghĩa là Bridge, mà Bridge nối `ws://127.0.0.1` nên cần
  `host_permissions: ["http://127.0.0.1/*"]`. Observer hiện **không có** quyền đó. Thêm quyền
  là việc phải hỏi Đức (`AGENTS.md` mục 2) — hỏi riêng, không gộp vào lượt duyệt này.
- **Báo cáo có thể chứa bí mật.** DOM của một trang đang đăng nhập là dữ liệu riêng tư. Chưa có
  chính sách che, mà repo thì cấm để bí mật lọt vào file. Phải quyết trước khi ghi báo cáo
  xuống đĩa.
- **Chưa quyết nó ở đâu.** Nó đang nằm ở gốc repo, ngoài cấu trúc `workers/`. Phiên S8 định
  chuyển vào `workers/observer-v0/v0.1.0/`, chưa làm.

## Trạng thái

Accepted
