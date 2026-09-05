---
kind: brief
status: done
ttl_days: 30
---

# BRIEF — Phiên S5: quyết định thành bất biến (ADR)

> Dán vào phiên Claude Code. Một phiên, một mục tiêu.
> **Điều kiện mở:** S4 đã đóng và đã push, cổng kiểm XANH, các claim trống.

## Mở phiên

1. Đọc `AGENTS.md` gốc → `llms.txt` → `DASHBOARD.md` → `HANDOFF.md` gốc (phần cuối).
2. Nhận `_root` trong `.agents/claims.json`, **và** nhận cả ba package `workers/duc-auto-*`
   (S5 đụng `decisions.md` của cả ba). **Giữ tới khi push xong**, trả bằng commit riêng.
3. `node scripts/session-check.mjs --as s5-adr` — ĐỎ thì DỪNG, báo nguyên văn.

## Mục tiêu

Quyết định đã chốt trở thành **bất biến và tra được**, thay vì nằm lẫn trong một file dài
chỉ-thêm-dòng. Sau S5, phép kiểm **B12** (ADR `Accepted` bị sửa) tự bật — nó đang in
`KHÔNG ÁP DỤNG` vì repo chưa có thư mục ADR.

## ⚠️ Hai cái bẫy đã tìm ra trước — đọc kỹ

### Bẫy 1 — B12 và roadmap đang trỏ hai chỗ khác nhau

`scripts/check-bootstrap.mjs` khai `ADR_DIR = "docs/adr/"` — **gốc repo**.
Roadmap mục nghiệm thu S5 lại nói mở `workers/<gói>/docs/adr/` — **trong package**.

Làm theo roadmap mà không sửa B12 thì B12 **vẫn in KHÔNG ÁP DỤNG** sau khi S5 xong — tức
phiên S5 không đạt được mục tiêu của chính nó.

**Cách giải đã chốt:** ADR sống ở **cả hai tầng**, vì có hai loại quyết định khác nhau:

| Loại | Ở đâu | Ví dụ |
|---|---|---|
| Quyết định của **một package** | `workers/<gói>/<phiên-bản>/docs/adr/NNNN-*.md` | "trần trial dev ≤2 job cho video" |
| Quyết định của **cả repo** | `docs/adr/NNNN-*.md` ở gốc | "ADR là bất biến", "claims tách khỏi areas" |

Và **phải sửa B12 để nó quét MỌI đường dẫn chứa `docs/adr/`**, không chỉ gốc. Một dòng
`startsWith(ADR_DIR)` đổi thành khớp cả `workers/*/*/docs/adr/`.

### Bẫy 2 — ba file `decisions.md` không cùng một định dạng

Đo tại `4f68158`: **30 quyết định** cần tách.

| Gói | Số mục `##` | Dòng |
|---|---:|---:|
| `duc-auto-chatgpt/v0.1.0` | 4 | 76 |
| `duc-auto-gemini/v0.2.0` | 18 | 165 |
| `duc-auto-gg-flow-video/v0.1.0` | 8 | 79 |

Một số file dùng bảng, một số dùng tiêu đề `##`, một số trộn cả hai. **Đọc từng file, đừng
viết một bộ tách chung rồi tin nó.** Tách sai một quyết định là làm hỏng một bản ghi bất biến.

## Việc cần làm

### 1. `docs/_TEMPLATE-adr.md` + ADR-0000 ở gốc

Chuẩn Nygard, đúng bốn mục: **Bối cảnh · Quyết định · Hệ quả · Trạng thái**.

`docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md` — ADR đầu tiên, nội dung là chính luật ADR:
- ADR ở trạng thái `Accepted` là **bất biến**, ngang `evidence/`.
- Đổi ý = **ADR mới**; cái cũ chuyển `Superseded by ADR-NNNN`; **hai bên trỏ nhau**.
- Không bao giờ sửa nội dung một ADR đã `Accepted` — kể cả sửa lỗi chính tả.

### 2. Tách 30 quyết định thành ADR

Đánh số **liên tục trong phạm vi từng thư mục ADR**, bắt đầu từ `0001`.
Tên file: `NNNN-mo-ta-ngan-khong-dau.md`.

Mỗi ADR phải có đủ bốn mục và **giữ nguyên ngày + người chốt gốc** — đây là bản ghi lịch sử,
không phải bài viết lại. Không có thông tin cho một mục thì ghi thẳng *"không ghi lại"*,
đừng bịa.

### 3. `decisions.md` cũ trở thành mục lục

**Không xoá** — nó là bản ghi có thật. Thay nội dung bằng một bảng trỏ sang từng ADR, kèm
một dòng đầu file nói rõ nội dung đã chuyển đi đâu và vì sao.

### 4. Sửa B12 để nó quét được cả hai tầng, rồi ghim test

Sau khi sửa, chạy `node scripts/check-bootstrap.mjs` — B12 phải **hết `KHÔNG ÁP DỤNG`** và
báo XANH (chưa ADR nào bị sửa).

Thêm test ghim ở **tầng tích hợp**: dựng một ADR `Accepted` giả rồi sửa nội dung nó, B12 phải
ĐỎ. Không có test này thì B12 chỉ là một dòng chữ.

### 5. Khai file mới vào Bản đồ file

`AGENTS.md` mục "Sổ tay mở khi cần" thêm một dòng cho `docs/adr/`. Luật vàng 4: không khai =
không tồn tại. Cổng kiểm có phép kiểm này.

## Cấm

- KHÔNG xoá `decisions.md` · KHÔNG sửa nội dung một quyết định khi tách (chỉ đổi hình dạng)
- KHÔNG đụng `drafts/` (S6) · `evidence/`, `Pilot-*`, `Batch-*`, `pilots/`
- KHÔNG bật chặn phép kiểm nào (S7) · KHÔNG dùng `git add -A`

## Đóng phiên — thứ tự này quan trọng

> Bộ sinh đọc **hoàn toàn từ HEAD**. Chạy nó trước khi commit là dựng lại từ HEAD cũ.
> **Giữ `_root` và các claim qua cổng kiểm, trả quyền SAU khi push** — trả sớm là cổng đỏ
> ngay ở mục "Phạm vi trách nhiệm". Brief S4 ghi sai đúng chỗ này và phiên S4 đã vấp.

```bash
git add docs/ workers/duc-auto-chatgpt/v0.1.0/docs workers/duc-auto-chatgpt/v0.1.0/decisions.md
git add workers/duc-auto-gemini/v0.2.0/docs workers/duc-auto-gemini/v0.2.0/decisions.md
git add workers/duc-auto-gg-flow-video/v0.1.0/docs workers/duc-auto-gg-flow-video/v0.1.0/decisions.md
git add AGENTS.md scripts/check-bootstrap.mjs tests/check-bootstrap-smoke.mjs
git status --short                       # đọc lại: có file của ai khác không?
git commit -m "S5: tach quyet dinh thanh ADR bat bien, bat B12"

node scripts/build-dashboard.mjs         # giờ HEAD đã có dữ liệu mới

git add DASHBOARD.md llms.txt repo-map.json HANDOFF.md
git commit -m "chore: sinh lai artifact + ghi HANDOFF sau S5"

node scripts/session-check.mjs --as s5-adr    # PHẢI xanh
node scripts/safe-push.mjs --as s5-adr

# CHỈ SAU KHI PUSH mới trả quyền, bằng một commit riêng
```

⚠️ Đừng nối cổng kiểm và `safe-push` bằng `&&` sau một `| tail` — ống dẫn trả mã thoát của
`tail` nên push chạy dù cổng đỏ. Lỗi này đã xảy ra thật ở phiên S3.

## Đức nghiệm thu

Mở `workers/duc-auto-gemini/v0.2.0/docs/adr/` trên GitHub — thấy file đánh số. Mở một file
bất kỳ: đủ bốn mục Bối cảnh · Quyết định · Hệ quả · Trạng thái.
Rồi chạy `node scripts/check-bootstrap.mjs`: B12 hết `KHÔNG ÁP DỤNG`.

## Xong S5 thì làm tiếp S6 ngay trong phiên này

S6 = dọn sạch `drafts/` (29 file), làm thư mục đó biến mất. Nó sẽ kéo **B6 từ 49 xuống còn
khoảng 24** vì 25 chỗ đang đếm nằm trong `drafts/`. Đề bài ở `ROADMAP-CLEAN-AND-TEMPLATE-V1`
phiên S6. Đóng S5 trọn vẹn (commit + push + trả quyền) **trước khi** mở S6, đừng gộp hai
phiên vào một commit.
