# decisions.md — Duc Auto GG Flow Video

> **NỘI DUNG ĐÃ CHUYỂN SANG ADR.** 10 quyết định trong file này đã được tách thành 10 file ADR
> riêng trong `docs/adr/` (N-55, 2026-09-09). File này KHÔNG bị xoá — nó là bản ghi có thật —
> nhưng từ nay nó là **mục lục**.
>
> **Vì sao chuyển:** phép kiểm B12 canh *"mọi số hiệu từng cấp còn nằm ở đúng một file"*. Mười
> quyết định không có số hiệu thì **B12 không nhìn thấy chúng** — xoá đi cũng không ai kêu. Hai
> gói kia đã chuyển từ 02/09; gói này là lỗ cuối cùng trong sổ định danh. Luật đầy đủ:
> [`docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md`](../../../docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md).
>
> **Nội dung gốc vẫn đọc được nguyên vẹn** trong lịch sử git:
> `git show eb86e499:workers/duc-auto-gg-flow-video/v0.1.0/decisions.md`.
> Việc tách chỉ đổi HÌNH DẠNG — không đổi một chữ nội dung quyết định nào.
>
> **Ghi chú giữ nguyên từ 2026-09-02 (phiên S6 đã xoá thư mục `drafts/`).** Các dòng
> "Nguồn: `drafts/…`" trong các ADR nay trỏ vào chỗ trống. **Không sửa chúng** — đây là bản ghi,
> và sửa trích nguồn trong một bản ghi là làm sai bản ghi. Tra đường dẫn mới ở
> [`docs/README.md`](../../../docs/README.md), mục bản đồ đường dẫn cũ → mới.

## Thêm một quyết định mới

Chép [`docs/_TEMPLATE-adr.md`](../../../docs/_TEMPLATE-adr.md) thành
`docs/adr/NNNN-mo-ta-ngan-khong-dau.md`, đánh số tiếp từ `0011`. **Đừng thêm mục vào file này
nữa** — nó là mục lục.

**Viết ở `Proposed`, đổi sang `Accepted` ở một lượt riêng.** B12 chốt mốc bất biến ở commit ĐẦU
TIÊN mà `status` thành `Accepted`; viết thẳng `Accepted` là mất luôn lượt sửa chữ.

## Mục lục

| ADR | Quyết định | Ai chốt | Ngày |
|---|---|---|---|
| [0001](docs/adr/0001-ba-chot-khai-sinh-package-flow-00.md) | Ba chốt khai sinh package: trang đích `labs.google/fx/tools/flow/*`, quyền host đúng pattern đó, tên gói | Đức | 2026-08-27 |
| [0002](docs/adr/0002-luat-an-toan-nhanh-video.md) | Luật an toàn nhánh video: trần trial ≤2 job, không retry tự động, khoá bootstrap Bridge — **hai trong ba vế đã chết** | Đức | 2026-08-27 |
| [0003](docs/adr/0003-tran-trial-toi-da-3-video-mot-luot.md) | Trần trial tối đa 3 video một lượt (45 credit, giới hạn free) — **con số đã chết 05/09, nay suy từ chip, trần tuyệt đối 7** | Đức | 2026-08-27 |
| [0004](docs/adr/0004-diagnostics-evidence-submit-primitive-tuong-tac.md) | `diagnostics.evidence_submit` là primitive tương tác duy nhất của bootstrap, trần cứng 3 lượt/trang | Đức | 2026-08-27 |
| [0005](docs/adr/0005-chat-reload-vao-allowlist-bootstrap.md) | `chat.reload` vào allowlist bootstrap — F5 tab đã bind, không gửi prompt, không tốn credits | không ghi lại | 2026-08-27 |
| [0006](docs/adr/0006-duc-giao-phien-claude-flow-1-tu-trien-khai.md) | Đức giao phiên `claude-flow-1` tự triển khai đến khi hoàn thiện; ba mốc phải hỏi giữ nguyên | Đức | 2026-08-27 |
| [0007](docs/adr/0007-go-khoa-bootstrap-bridge-f-05.md) | F-05: gỡ khoá bootstrap Bridge, mở lại toàn bộ method surface; gate an toàn từng method giữ nguyên | không ghi lại | 2026-08-27 |
| [0008](docs/adr/0008-multi-profile-bridge-duc-duyet-huong-a.md) | Multi-profile Bridge hướng A: khối `instance` trong auth, bỏ luật "một ghế", không thêm quyền Chrome | Đức | 2026-08-28 |
| [0009](docs/adr/0009-bo-audit-doc-lap-cho-fix-nho.md) | Bỏ audit độc lập cho fix nhỏ — **đá với `AGENTS.md` gốc mục 2, chờ Đức chốt câu chữ** | Đức | 2026-09-02 |
| [0010](docs/adr/0010-mo-rong-host-match-cho-url-co-locale.md) | Mở rộng host match cho URL có locale (`fx/*/tools/flow/*`); manifest rộng, adapter siết | Đức | 2026-09-02 |
