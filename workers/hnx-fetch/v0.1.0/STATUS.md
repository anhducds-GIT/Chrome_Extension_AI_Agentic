---
schema: extension-status/v2
id: hnx-fetch
name: HNX Fetch
lifecycle: building
owner: claude-scouter-s06
priority_rank: 1
next_step: "Chạy MỘT lượt lấy dữ liệu thật qua chính extension HNX Fetch, thay vì qua Scouter. Toàn bộ mã đã tách xong và phép ghim xanh, nhưng chưa lượt nào đi qua nó."
human_action: "Nạp extension HNX Fetch vào Chrome bằng Load unpacked — README của gói ghi rõ chọn thư mục nào. Rồi bấm icon, chọn tệp ghép cặp, bật công tắc Cho phép lấy dữ liệu."
version_source: workers/hnx-fetch/v0.1.0/manifest.json
current_focus: "Tách khỏi Scouter xong: extension riêng, tên giao thức riêng, và bỏ hẳn quyền debugger. Việc còn lại lớn nhất là chạy thật một lượt qua chính nó."
ref_readme: workers/hnx-fetch/README.md
ref_handoff: workers/hnx-fetch/HANDOFF.md
ref_runbook: workers/hnx-fetch/PROTOCOL.md
ref_backlog: workers/hnx-fetch/BACKLOG.md
---

# HNX Fetch

Extension Chrome cục bộ, lấy dữ liệu phái sinh của Sở Giao dịch Chứng khoán Hà Nội theo ngày.
Tách khỏi `duc-scouter` ngày 08/09 theo chốt của Đức.

## Ý tưởng ban đầu

Đức đã tự tay gom dữ liệu phái sinh HNX vào một thư mục trên Drive từ 07/2026 để làm cơ sở
phân tích. Việc đó lặp lại mỗi ngày và không có gì thú vị. Đức muốn một extension làm thay.

Bản đầu chạy nhờ Scouter — một bộ khung dò trang đa năng. Nhưng Scouter cần quyền `debugger`
để bấm và gõ, mà việc HNX **không bấm gì cả**: dữ liệu tới từ một lượt gọi mạng.

## Mục đích

Lấy hai trang phái sinh HNX (kết quả giao dịch · báo cáo thống kê PDF) về đúng thư mục dữ liệu
của Đức, không làm hỏng thứ đã có, và nói thật khi có gì không khớp. AI vận hành qua Bridge;
phần đối chiếu và kiểm tra tính toàn vẹn là lý do việc này giao cho AI chứ không thành một nút bấm.

## Đã kiểm chứng tới đâu

**Chưa chạy thật qua chính extension này** — nói thẳng ra, đừng để ai suy ra từ chỗ khác.

Cái đã có: toàn bộ mã lấy dữ liệu đã chạy thật trong ngày 08/09, nhưng lúc đó nó đi qua
Scouter. Sau khi tách, phần được kiểm là:

- suite lấy dữ liệu: **5/5 khối ĐẠT** ở vị trí mới
- phép ghim bề mặt hẹp: **4/4 khối ĐẠT** — từ vựng đúng bốn lệnh, manifest không có `debugger`,
  cái phanh còn nguyên, hai tệp lõi chép từ Scouter còn khớp từng byte

## Giới hạn đã biết

1. **Chưa nạp vào Chrome lần nào.** Mọi thứ trên đây kiểm bằng đồ giả, không phải bằng
   trình duyệt thật.
2. **Không bấm, không gõ, không đọc DOM.** Cố ý. Trang nào cần bấm mới ra dữ liệu thì
   extension này không làm được — đó là việc của Scouter.
3. **Cần máy chủ Bridge đang chạy.** Không có nó thì không lệnh nào đi được.
4. **Công tắc phải do tay Đức bật**, mỗi lần 200 lượt. AI không tự mở khoá được, và đó là chốt
   an toàn cuối cùng chứ không phải phiền toái.
5. **Ghi tệp không đi qua extension** — extension chỉ tải, tiến trình Node mới đặt tệp xuống đĩa.

## Đọc sâu ở đâu

| Cần gì | Mở file |
|---|---|
| Vận hành hằng ngày, đối chiếu, kiểm toàn vẹn, bảng mã lỗi | [`PROTOCOL.md`](../PROTOCOL.md) |
| Cài đặt và chạy lần đầu | [`README.md`](../README.md) |
| Luật của gói, bản đồ file | [`AGENTS.md`](../AGENTS.md) |
| Phiên trước làm tới đâu | [`HANDOFF.md`](../HANDOFF.md) |
| Việc còn nợ | [`BACKLOG.md`](../BACKLOG.md) |
