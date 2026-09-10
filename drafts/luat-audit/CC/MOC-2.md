---
kind: moc-2
topic: luat-audit
theo: drafts/luat-audit/CC/HOP-DONG.md
ket_qua: FAIL
chot_boi: CC (claude-gpt-chay-het-job) · 2026-09-10
---

# Mốc ② — nghiệm thu pha inventory (Vòng 1–6)

> **FAIL.** Một file nguồn nằm trong phạm vi nhưng chưa được inventory.
> Theo HOP-DONG mục 6, **không mở pha trùng lặp/mâu thuẫn** khi Mốc ② chưa PASS.

## ① Phán quyết bất nhất "5 gói" — GPT hỏi đúng, HOP-DONG sai

GPT báo: HOP-DONG viết `(5 gói)` nhưng phép đếm ra `13 file` chỉ khớp **4** gói. GPT **không
tự đoán** — đúng luật `khong_biet_thi_sao`.

Đếm lại trên cây nguồn tại `1ea8b429`, không đoán tên:

```
git ls-tree -r --name-only 1ea8b429 | grep -E '^workers/[^/]+/(v[^/]+/)?AGENTS\.md$'
```

Glob `workers/*/AGENTS.md · workers/*/v*/AGENTS.md` khớp **6 dòng**, trong đó
`workers/_shared/AGENTS.md` đã được kể riêng ở dòng trên nó. Còn lại đúng **5 gói**:

| # | file | dòng | đã inventory? |
|---|---|---|---|
| 1 | `workers/duc-auto-chatgpt/v0.1.0/AGENTS.md` | 132 | có |
| 2 | `workers/duc-auto-gemini/v0.2.0/AGENTS.md` | 114 | có |
| 3 | `workers/duc-auto-gg-flow-video/v0.1.0/AGENTS.md` | 88 | có |
| 4 | `workers/duc-scouter/v0.1.0/AGENTS.md` | 115 | có |
| 5 | **`workers/hnx-fetch/AGENTS.md`** | **125** | **KHÔNG** |

**`(5 gói)` đúng. `13 file` sai.** Phạm vi thật là **14 file, 2153 dòng**.

`hnx-fetch` lọt lưới vì nó là gói **không có thư mục phiên bản** — khớp `workers/*/AGENTS.md`
chứ không khớp `workers/*/v*/AGENTS.md`. Bốn gói kia đều có `v*/`.

**Path phải bổ sung, chính xác một file:** `workers/hnx-fetch/AGENTS.md` (125 dòng).

## ② Hai con số trong HOP-DONG đều sai, và sai vì cùng một chỗ

Tôi viết `13 file, 2281 dòng`. Cả hai đều không đúng:

- **Số dòng:** tổng thật 14 file = **2153**. `2281 − 2153 = 128` = đúng bằng số dòng của
  `workers/_shared/AGENTS.md`. Tức lúc đo tôi để glob `workers/*/AGENTS.md` **quét trúng
  `_shared/AGENTS.md` lần thứ hai** và cộng nó hai lần.
- **Số file:** cùng lúc đó lại đếm ra 13, tức một file bị **rơi** — chính là `hnx-fetch`.

Một phép đo, hai lỗi ngược chiều, và chúng che nhau: 13 file "trông hợp lý" nên không ai đếm lại.

**Sửa phạm vi tại Mốc ②** — hợp lệ theo HOP-DONG (*"nếu cần mốc mới thì CC ra mốc mới ở lần
chốt hướng"*). **`moc_nguon` `1ea8b429` KHÔNG đổi.**

## ③ Chưa kiểm — nói rõ để không ai tưởng đã kiểm

Mục 2 của Mốc ② (dãy ID · schema 13 cột · `file:dòng` · Luật ≤25 từ) **mới kiểm ở mức tổng**,
chưa soát từng dòng trong 747 dòng Sheet.

Lý do: Sheet là nguồn duy nhất chứa các dòng đó — mirror `VONG-01…06.md` chỉ là bản tóm
(464–877 byte), không chở dòng. Đọc 747 dòng qua Drive nạp ~60k token vào CC, đúng thứ mà
thiết kế này sinh ra để tránh.

**Đường rẻ:** Đức tải Sheet ra CSV vào đĩa → CC soát bằng `node` tại chỗ, gần như không tốn
token. Chưa làm bước đó thì **không được ghi là đã nghiệm thu schema**.

Đã xác nhận được (từ mirror Vòng 6, mức tổng): `R-001…R-747` liên tục · `Cưỡng chế` và
`Đức duyệt` của `R-380…R-747` để trống · 5/5 file `docs/protocols/` đã xử lý.

## ④ Việc của Vòng 7 — bổ sung, không phải dedup

1. Inventory `workers/hnx-fetch/AGENTS.md` tại `1ea8b429`, bắt đầu từ `R-748`.
2. Giữ nguyên `R-001…R-747`.
3. `Cưỡng chế` và `Đức duyệt` của vùng mới để trống.
4. Không quay lại 13 file đã khoá. Không mở ADR/`PHIEN.md`.
5. Mirror `drafts/luat-audit/GPT/VONG-07.md`, commit `main` kèm `Lane: gpt-web`.

Xong Vòng 7 thì Mốc ② được chấm lại. **PASS rồi mới sang pha trùng lặp/mâu thuẫn.**

## ⑤ Vì sao chuỗi tự động dừng ở đây — dừng ĐÚNG

Khối nối vòng mà GPT phát ra cuối Vòng 6 ghi `NGƯỜI NHẬN/THỰC THI: Claude Code (CC)`. Bộ chạy
chuyển tiếp khối đó **về lại GPT**, và GPT từ chối:

> *"Prompt này được giao cho Claude Code (CC), không phải GPT Web. Tôi sẽ không tự thực thi
> Mốc ② thay CC, vì như vậy sẽ phá đúng vai trò kiểm tra độc lập đã thiết kế."*

Đây là luật chống tự-nghiệm-thu trong protocol V1 chạy đúng. Bộ chạy dừng với lý do
`HET_CHUOI` — **kết luận dừng đúng, nhưng nhãn sai**: "hết chuỗi" và "tới lượt CC" là hai
việc khác nhau. Xem `B-62`.
