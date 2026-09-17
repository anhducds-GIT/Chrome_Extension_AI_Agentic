---
status: Accepted
adr: 0038
decides: [0038]
date: 2026-09-17
deciders: Đức (uỷ quyền ngân sách bên trong) · claude-scouter-udine (đo và chốt)
chu_de: pham-vi-va-tran
nhom: pham-vi-va-tran
---

# ADR-0038 — Repo này khai ngân sách tài liệu của CHÍNH NÓ, thay cho con số mặc định của bộ khung

## Bối cảnh

`npm run can-nang` báo **`Tổng tài liệu 9.958 / 2.200 dòng`** — quá **4,5 lần** — và đã báo như
thế nhiều ngày. Lộ trình `A4` (17/09) đặt đúng câu hỏi phải hỏi trước: *"đo trước khi động, và
BỚT trước khi nới"*.

Đo ra thì con số 2.200 **không phải của repo này**. Nó là `NGAN_SACH_MAC_DINH.tongTaiLieu` của bộ
khung, và chính `can-nang.mjs` viết sẵn cửa ra ngay cạnh nó:

> *"NGÂN SÁCH KHAI ĐƯỢC, vì repo khác có kích thước khác. Repo nhỏ mà bắt theo ngân sách của một
> bộ khung 3000 dòng là bắt nó im lặng chịu đỏ… Khai `budget` trong `.repo-structure.json`; không
> khai thì dùng mặc định trên."*

**Repo này chưa bao giờ khai khối `budget`.** Nên suốt thời gian ấy nó bị đo bằng thước của một
repo khác.

Nặng hơn: repo này **đã có** một trần cho gần đúng cùng một đại lượng, và trần đó **được đo**, có
lịch sử ghi lại từng lượt nâng — `docs.tran_dong_khong_ke_adr = 9.830`, mà cổng đóng phiên báo
**9.830/9.830**, tức đang khít. Hai thước cho một đại lượng, một cái đo được và đang khít, một
cái đi mượn và quá 4,5 lần.

## Quyết định

⑴ **Khai `budget.tongTaiLieu` trong `.repo-structure.json`**, đặt ở **con số của hôm nay**
(9.958). Nó là một **bánh cóc**, đúng cơ chế mà `docs.tran_dong_khong_ke_adr` đang dùng và đã
ghi rõ: *"Đặt ở đúng con số của HÔM NAY: nó không đợi ai dọn, nó chỉ chặn PHÌNH. Mỗi lượt xoá thì
HẠ con số này xuống — chỗ đã hạ không quay lại được."*

⑵ **Đây KHÔNG phải nới trần để đi tiếp.** Con số cũ sai vì nó chưa bao giờ là con số của repo
này, không phải vì nó đang vướng. Vế "bớt" vẫn nợ nguyên, và nó có tên có số ở ⑶.

⑶ **Phần bớt thật nằm ở `docs/studies/` — 5.516 dòng, 10 file, 55% của cả kho chữ.** Việc đó
**CHƯA làm và KHÔNG được tự làm**: `docs/README.md` mục *"`docs/studies/` — nghiên cứu còn sống"*
đang khai chúng là còn sống, và xoá file là việc phải hỏi Đức (luật gốc). Có tiền lệ đúng đường:
08/09 Đức chốt xoá 14 file `EXP-*` (8.310 dòng) — **chúng rời cây làm việc, KHÔNG rời git**, kèm
sẵn lệnh đọc lại. Câu hỏi cho Đức là *"còn ai đọc mười file này không"*, và câu trả lời là của
Đức.

## Hệ quả

- `can-nang` thôi báo một màu đỏ mà **không có đường nào hợp lệ để làm nó xanh** — thứ đỏ ấy dạy
  người đọc bỏ qua cả bảng.
- Trần mới **chặn phình từ hôm nay**: thêm một dòng vào `docs/` là đỏ, y như cổng.
- Nợ thật (⑶) nằm ở chỗ đọc được, kèm số, chờ đúng một câu của Đức.

## Vế đã chết

*(chưa có)*
