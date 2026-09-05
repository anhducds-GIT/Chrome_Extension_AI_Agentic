---
kind: brief
status: done
ttl_days: 30
---

# BRIEF — Phiên S4: cổng kiểm cấu trúc, **chỉ cảnh báo**

> Dán vào một phiên Claude Code MỚI. Một phiên, một mục tiêu.
> **Điều kiện mở:** S3 đã đóng và đã push (`9c4250e`), Khối D đang là `0 · 0 · 0 · 0`.

## Mở phiên

1. Đọc `AGENTS.md` gốc repo → `llms.txt` → `DASHBOARD.md` (Khối A, Khối D) → `HANDOFF.md` gốc
   (phần cuối).
2. Ghi tên phiên vào `.agents/claims.json` cho `_root`. **Giữ tới khi push xong.**
3. `node scripts/session-check.mjs --as s4-gate` — ĐỎ thì DỪNG, báo nguyên văn.

## Mục tiêu

Nợ điều hướng hiện ra **bằng số có tên**, và **chưa chặn ai**. Giai đoạn này chỉ in ra.
Bật chặn là việc của S7.

## Việc cần làm

### 1. `scripts/check-bootstrap.mjs` — 14 phép kiểm

| # | Kiểm | Mức | Chặn câu hỏi nào |
|---|---|---|---|
| **B1** | Thư mục có `manifest.json` mà không có `STATUS.md` | ĐỎ | "code này là gì" |
| **B2** | `lifecycle: superseded` mà thiếu `superseded_by` | ĐỎ | "bản nào còn dùng" |
| **B3** | Thư mục top-level không có mục trong `areas` | ĐỎ | "thư mục này của ai" |
| **B4** | Link trong `DASHBOARD.md` trỏ tới file không tồn tại | ĐỎ | "link chết" |
| **B5** | `STATUS.md` thiếu trường bắt buộc của schema v2 | ĐỎ | nhiều câu |
| **B6** | Độ sâu điều hướng > 3 để tới bất kỳ file chi tiết nào | 🟡 | "đọc mãi không hiểu" |
| **B7** | `lifecycle` không thuộc danh sách hợp lệ | ĐỎ | "sống hay chết" |
| **B8** | `DASHBOARD.md` cũ hơn commit gần nhất của bất kỳ `STATUS.md` nào | 🟡 | "số có tươi không" |
| **B9** | `AGENTS.md` hoặc `CLAUDE.md` vượt giới hạn dòng (200) | 🟡 | — |
| **B10** | `CLAUDE.md` chứa nội dung không có trong `AGENTS.md` | ĐỎ | "luật nào thật" |
| **B11** | File trong `docs/` quá `ttl_days` | 🟡 | — |
| **B12** | ADR đã `Accepted` bị sửa nội dung | ĐỎ | — |
| **B13** | `llms.txt` cũ hơn commit gần nhất của bất kỳ `STATUS.md` nào | 🟡 | — |
| **B14** | Tài liệu mô tả code đã đổi > 30 ngày mà chưa đụng | 🟡 | — |

**Năm phép kiểm đã có sẵn số đo — ĐỪNG viết lại phép đo, hãy dùng lại.**
`build-dashboard.mjs` đã xuất `health` gồm `units_without_status` (B1), `dead_links` (B4),
`undeclared_dirs` (B3), `draft_debt` (B11); và `validateStatus` đã cưỡng chế B2, B5, B7.
Việc của S4 với nhóm này là **đặt tên B-x và in ra**, không đo lại lần thứ hai — hai phép đo
cùng một thứ thì sớm muộn sẽ nói hai con số khác nhau.

**Thật sự mới:** B6, B8, B9, B10, B12, B13, B14.
**B12 chưa áp dụng được** — repo chưa có `docs/adr/` (đó là phiên S5). Cho nó in
`KHÔNG ÁP DỤNG`, đừng bịa ra kết quả xanh.

### 2. Mở rộng `.repo-structure.json` — khối `grandfathered`

Đường dẫn cũ có dấu cách và tiếng Việt có dấu được **miễn trừ vĩnh viễn**.

⚠️ **Kế hoạch viết 52. Đo lại tại `9c4250e` ra 48.** Đừng chép con số; tự đo:

```bash
git ls-files | grep -P '[ ]|[À-ỹ]'
```

Rồi liệt kê **đúng những đường dẫn đo được** vào `grandfathered`. Nếu số khác 48 thì ghi số
thật vào HANDOFF — con số trong kế hoạch đã sai một lần rồi.

### 3. Nối vào `session-check.mjs`

Thêm một cổng con gọi `check-bootstrap.mjs`. **Ở S4 nó KHÔNG được làm cổng đỏ** — chỉ in kết
quả. Nhớ cập nhật `EXPECTED_CHECKS` nếu thêm phép kiểm, và ghi một dòng vào `HANDOFF.md` nói
vì sao — cổng có lớp chống tự tháo.

### 4. Thông báo lỗi phải nói **cả chỗ sai lẫn chỗ đúng**

Đây là tiêu chí nghiệm thu của Đức, không phải trang trí:

```
✗ B1 NO-STATUS: ./manifest.json (Extension Observer V0)
    → tạo: STATUS.md ở cùng thư mục, theo STATUS.template.md
    → tối thiểu cần: id, name, lifecycle, owner, next_step, priority_rank
```

Một dòng chỉ nói "sai" mà không nói "sửa thế nào" là **chưa đạt**.

### 5. Test ghim + mutation

Mỗi phép kiểm một test làm ĐỎ khi luật bị gỡ. **Ghim ở tầng tích hợp**, không chỉ gọi thẳng
hàm — repo này đã trả giá: gỡ chỗ gọi `validateStatus` ra khỏi đường chạy mà cả suite vẫn xanh.
Chạy mutation trước khi báo xong; **kiểm fixture có phân biệt được hai nhánh không**, nếu không
thì kết quả mutation nói dối (đã xảy ra hai lần).

## Cấm

- KHÔNG bật chặn bất kỳ phép kiểm nào. S4 chỉ in ra.
- KHÔNG đụng `drafts/` (S6) · `evidence/`, `Pilot-*`, `Batch-*`, `pilots/`.
- KHÔNG bịa miễn trừ để số về 0. Không về được thì báo.
- KHÔNG dùng `git add -A` — repo này nhiều phiên AI dùng chung, liệt kê từng file.

## Đóng phiên — thứ tự này quan trọng

> **Bộ sinh đọc HOÀN TOÀN từ HEAD.** Chạy nó trước khi commit là nó dựng lại từ HEAD **cũ**.

```bash
git add scripts/ tests/ .repo-structure.json      # liệt kê, không -A
git status --short                                 # đọc lại: có file của ai khác không?
git commit -m "S4: cong kiem cau truc B1-B14, che do canh bao"

node scripts/build-dashboard.mjs                   # giờ HEAD đã có dữ liệu mới

git add DASHBOARD.md llms.txt repo-map.json HANDOFF.md .agents/claims.json
git commit -m "chore: sinh lai artifact + ghi HANDOFF + tra _root sau S4"

node scripts/session-check.mjs --as s4-gate        # PHẢI xanh trước khi push
node scripts/safe-push.mjs --as s4-gate
```

⚠️ **Đừng nối hai lệnh cuối bằng `&&` sau một `| tail`** — ống dẫn trả mã thoát của `tail`,
nên push sẽ chạy dù cổng đỏ. Tôi mắc đúng lỗi này ở phiên S3.

## Đức nghiệm thu

Bảo AI chạy `node scripts/check-bootstrap.mjs` rồi dán kết quả. Mỗi dòng cảnh báo phải nói
**cả chỗ sai lẫn cách sửa**. Không cần Đức đi kiểm gì khác.

## Nợ đang mở, KHÔNG thuộc S4 — đừng tiện tay làm

Đọc `HANDOFF.md` gốc để biết đủ. Tóm tắt: enumeration chưa ghim vào một ảnh chụp HEAD bất biến
(Codex xếp LOW) · `firstSentence` cắt theo ký tự · repo chưa có kiểm tự chạy trên GitHub nên
mọi con số test vẫn là **[KHAI]** với auditor đọc qua GitHub — Đức đã chốt 02/09 là **chưa làm
CI**, ưu tiên tốc độ triển khai vì đã có hai auditor độc lập.
