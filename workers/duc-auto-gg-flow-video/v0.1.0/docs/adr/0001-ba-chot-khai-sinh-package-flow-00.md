---
status: Accepted
adr: 0001
date: 2026-08-27
deciders: Đức
source_section: "2026-08-27 — FLOW-00: ba chốt khai sinh package (Đức chốt trong chat)"
migrated_from: workers/duc-auto-gg-flow-video/v0.1.0/decisions.md
---

# ADR-0001 — Ba chốt khai sinh package: trang đích, quyền host, tên gói

## Bối cảnh

Mở một nhánh extension mới cho Google Flow. Ba thứ phải chốt trước khi gõ dòng đầu: gói chạy
trên trang nào, xin quyền rộng đến đâu, và tên gói là gì. Đức chốt cả ba trong chat 27/08.

## Quyết định

1. **Trang đích**: Google Flow, match pattern `https://labs.google/fx/tools/flow/*`
   (URL project thật của Đức: `.../flow/project/d7c07112-eb7f-4efe-b251-8aee4b2b6c4f`;
   extension match theo pattern tool, không khoá ID project).
2. **Quyền host mới được duyệt**: đúng pattern trên, không xin rộng hơn
   (không `labs.google/*`). Đây là lần duyệt quyền theo luật `AGENTS.md` gốc mục 2.
3. **Tên package**: `workers/duc-auto-gg-flow-video/v0.1.0`, tên hiển thị
   "Duc Auto GG Flow Video".

Nguồn: `drafts/FLOW-EXT-COORDINATION-PLAN.md` mục 6.

## Hệ quả

không ghi lại — bản ghi gốc trong `decisions.md` không có mục Hệ quả. Không bịa thêm: đây là
bản ghi lịch sử, không phải bài viết lại.

Vế ⑵ (không xin rộng hơn) về sau được [ADR-0010](0010-mo-rong-host-match-cho-url-co-locale.md)
nới có kiểm soát cho URL mang mã ngôn ngữ — vẫn dưới `labs.google`, vẫn kết thúc `/tools/flow/*`.

## Trạng thái

Accepted.

> Tách ra từ `workers/duc-auto-gg-flow-video/v0.1.0/decisions.md` ngày 2026-09-09 (N-55).
> Chỉ đổi HÌNH DẠNG, không đổi một chữ nội dung quyết định.
