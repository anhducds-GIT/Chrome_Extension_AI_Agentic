---
status: Accepted
adr: 0043
date: 2026-08-28
deciders: Đức
source_section: Roadmap tự hành (chốt sau audit 2026-08-24)
migrated_from: workers/duc-auto-chatgpt/v0.1.0/decisions.md
---

# ADR-0043 — SUPERSEDES dòng "Chính sách dọn checkpoint

## Bối cảnh

10 file cho 3 job; pilot 66 job sẽ là ~200 file. Ba checkpoint mỗi job đều mang trạng thái khác nhau nên không được ghi ít đi — chỉ được giữ ít đi

Nhóm trong bản ghi gốc: Roadmap tự hành (chốt sau audit 2026-08-24).

## Quyết định

**2026-08-28 — SUPERSEDES dòng "Chính sách dọn checkpoint: giữ `v01` + 5 bản cuối; CHUYỂN vào `superseded/`, không bao giờ xoá" (2026-08-24, điểm chốt #4). Luật mới: giữ N bản MỚI NHẤT (mặc định 2), phần còn lại XOÁ THẬT, máy tự làm.** Đức chốt sau khi chạy trial live 28/08 và thấy 3 job text đẻ ra 10 file Result: *"ta cần control rác, để nó không nhân không giới hạn, out of control. và việc này phải là AI làm."* Đức đã được trình bày cả phương án `superseded/` (không xoá) và tự bác nó: *"nếu bạn recommend giữ thì cần cơ cấu vào thư mục con và sẽ vẫn cần protocol xóa"* — tức chuyển chỗ chỉ dời rác chứ không chặn rác. **`v01` không còn được giữ riêng**, vì ledger tích luỹ: bản mới nhất chứa mọi thứ bản đầu có, còn `v01` chỉ là reservation trước khi gửi job đầu tiên nên gần như rỗng kết quả. Hàng rào cứng nằm trong code, không phải quy ước: bản version cao nhất KHÔNG BAO GIỜ nằm trong danh sách xoá; không xoá gì khi số bản còn ≤ N; `keep` bị kẹp tối thiểu 1; và khi thư mục có hai file cùng một version (`v02` với `v002`) thì **từ chối xoá toàn bộ** vì lúc đó "bản nào mới nhất" là nhập nhằng và xoá nhầm là không cứu được. Chỉ đụng checkpoint của ĐÚNG workbook đang chạy — regex tìm kiếm dựng từ chính tên workbook, nên không với tới audit JSONL (không có token `{version}`), file nguồn của Đức, file `.partial-` bị cách ly, hay run khác.

## Hệ quả

không ghi lại — bảng gốc trong `workers/duc-auto-chatgpt/v0.1.0/decisions.md` chỉ có bốn cột (Quyết định · Vì sao · Ai chốt · Nguồn), không có mục Hệ quả.
Không bịa thêm: đây là bản ghi lịch sử, không phải bài viết lại.

## Trạng thái

Accepted — chốt ngày 2026-08-28. Người chốt: Đức.

Nguồn gốc: Phiên 2026-08-28; `checkpoint-core.js` `prunable()`/`filenameRegex()`; 30 phép kiểm trong `tests/checkpoint-protocol-smoke.mjs`

> ADR này được TÁCH RA từ `workers/duc-auto-chatgpt/v0.1.0/decisions.md` trong phiên S5 (2026-09-02). Chỉ đổi HÌNH DẠNG, không
> đổi một chữ nội dung. Đã Accepted nên **bất biến** — đổi ý thì viết ADR mới và trỏ hai
> chiều, xem `docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md`.
