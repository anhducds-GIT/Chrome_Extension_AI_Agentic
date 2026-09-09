---
status: Accepted
adr: 0008
date: 2026-08-28
deciders: Đức
source_section: "2026-08-28 — Multi-profile Bridge: Đức duyệt hướng A"
migrated_from: workers/duc-auto-gg-flow-video/v0.1.0/decisions.md
nhom: bridge-va-thuc-thi
---

# ADR-0008 — Multi-profile Bridge: Đức duyệt hướng A

## Bối cảnh

Đức chốt trong chat (phiên `claude-bridge-multiprofile`), thiết kế đầy đủ ở
`drafts/BRIDGE-MULTIPROFILE-DESIGN-V1.md` gốc repo.

## Quyết định

1. **Duyệt đổi bề mặt auth**: message `auth` mang thêm khối `instance`
   (`instance_id` bền trong `chrome.storage.local` + tên Đức đặt trong panel).
   Token vẫn là thứ duy nhất quyết định cho vào — instance chỉ để định tuyến.
2. **Bỏ luật "một ghế"** ở host: nhiều profile nối cùng lúc; từ 2 kết nối trở lên,
   lệnh không nêu `target` bị TỪ CHỐI (`TARGET_AMBIGUOUS`) kèm danh sách — không bao
   giờ tự chọn. Một kết nối thì chạy y như cũ.
3. **Không thêm quyền Chrome nào.**
4. Thứ tự triển khai: gg-flow-video → gemini → chatgpt (chờ phiên ChatGPT đóng).

## Hệ quả

không ghi lại — bản ghi gốc không có mục Hệ quả.

Đã giao đủ cả ba gói ngày 02/09. Bằng chứng nghiệm thu lớp nhiều hồ sơ:
`workers/duc-auto-gemini/v0.2.0/evidence-multiprofile-nghiem-thu-20260907/`.

## Trạng thái

Accepted.

> Tách ra từ `workers/duc-auto-gg-flow-video/v0.1.0/decisions.md` ngày 2026-09-09 (N-55).
> Chỉ đổi HÌNH DẠNG, không đổi một chữ nội dung quyết định.
