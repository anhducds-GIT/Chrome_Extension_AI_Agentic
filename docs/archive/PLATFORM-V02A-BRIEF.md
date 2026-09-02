---
kind: study
status: superseded
ttl_days: 180
---

# Brief V0.2-A — freshness gate cho DASHBOARD.md

> **Chốt bởi:** GPT + Claude, 2026-08-27. Phạm vi ĐÓNG. Thiếu gì → hỏi, đừng tự mở rộng.
> **Người giữ `_root`:** `opus-platform-2`. **Người code:** Codex.

## Vì sao

`DASHBOARD.md` được commit kèm repo. Không có gì bắt nó phải khớp với repo tại thời điểm
commit — nên nó có thể mục đúng như mọi tài liệu gõ tay khác, chỉ chậm hơn. `--check` là
phép so máy: *bản đang nằm trong repo có bằng bản sinh lại từ repo hôm nay không?*

## Đúng 3 deliverable

| # | File | Việc |
|---|---|---|
| 1 | `.gitattributes` (gốc, mới) | đúng một dòng: `DASHBOARD.md text eol=lf` |
| 2 | `scripts/build-dashboard.mjs` | thêm cờ `--check` |
| 3 | `tests/build-dashboard-smoke.mjs` | thêm ca ghim cho `--check` |

**KHÔNG đụng `scripts/session-check.mjs`.** Nâng cổng kiểm 6 → 7 là đổi governance, sẽ audit
riêng ở patch sau. Ai sửa file đó trong patch này là ra ngoài phạm vi.

## Hợp đồng `--check`

```bash
node scripts/build-dashboard.mjs --check
```

- **Không ghi file.** Dù đúng hay sai, `DASHBOARD.md` trên đĩa phải nguyên vẹn từng byte.
  Đây là điểm dễ sai nhất: `--check` mà lỡ ghi đè thì nó tự làm mình luôn xanh.
- **Khớp → exit 0**, in một dòng tiếng Việt xác nhận.
- **Lệch → exit khác 0**, in tiếng Việt: lệch ở đâu (dòng/hàng nào), và **câu lệnh sửa**
  (`node scripts/build-dashboard.mjs`). Đức đọc phải biết ngay phải gõ gì.
- **Thiếu `DASHBOARD.md` → cũng lệch**, không phải crash.
- STATUS sai schema → vẫn đỏ theo luật validate cũ, thông báo giữ nguyên như hiện tại.

### So cái gì, và bỏ qua cái gì

Bỏ **đúng một dòng**: dòng dấu commit (`scripts/build-dashboard.mjs:291`, bắt đầu bằng
`Trang được sinh tại commit`). Lý do nó phải bị bỏ: commit chính `DASHBOARD.md` sẽ tạo ra
một commit mới, nên file nằm trong repo **luôn** trỏ về commit ngay trước nó — so cả dòng đó
thì `--check` sẽ luôn báo lệch kể cả khi không ai đụng gì.

**Đừng nhận diện dòng đó bằng cách dò chuỗi tiếng Việt.** Cho `buildDashboard` gắn một mốc
ổn định (ví dụ một hằng số `STAMP_PREFIX` mà cả hàm sinh lẫn hàm `--check` cùng dùng), rồi
lọc theo mốc. Dò theo chữ thì đổi lời văn một chữ là hỏng thầm lặng.

**Chuẩn hoá xuống dòng trước khi so:** đọc file trên đĩa, đổi mọi `\r\n` về `\n`, rồi mới so.
Máy Đức bật `core.autocrlf=true`, nên cùng một nội dung vẫn có thể là CRLF trên đĩa và LF
trong index. `.gitattributes` chữa phía git; chuẩn hoá lúc so chữa phía đọc file. **Cần cả
hai** — `.gitattributes` chỉ ăn với bản checkout mới.

## Test ghim — tối thiểu 5 ca, đủ cả hai chiều

1. **PASS:** dashboard khớp → exit 0.
2. **FAIL:** dashboard lệch một ô → exit khác 0, thông báo nêu chỗ lệch.
3. **Chỉ khác dòng dấu commit** (SHA/ngày khác, mọi thứ còn lại y hệt) → **PASS**.
   Đây là ca quan trọng nhất; thiếu nó thì `--check` vô dụng ngay commit đầu tiên.
4. **CRLF ↔ LF:** cùng nội dung, khác kiểu xuống dòng → **PASS**.
5. **Không sửa file:** chạy `--check` ở cả hai kết cục, `DASHBOARD.md` giữ nguyên từng byte.
6. **Thiếu file** → lệch, không crash.

## Luật cũ vẫn áp

Node thuần, không thêm gói. Deterministic — không `Date.now()`, không `new Date()`, không
format theo locale. Git gọi kèm `-c core.quotepath=false`. Đường dẫn resolve bằng
`fileURLToPath`, không phải `URL.pathname` (đường dẫn của Đức có dấu cách). Chữ operator đọc:
tiếng Việt; mã lỗi: tiếng Anh.

## Xong thì

`npm test` xanh · `node scripts/session-check.mjs --as <nhãn>` xanh toàn bộ · mutation test:
phá từng luật mới, ca tương ứng phải đỏ (test xanh khi luật đã bị phá = test giả).

## Sau V0.2-A, theo thứ tự đã chốt

`STATUS anti-drift` → `feature-parity automation` → `gate integration (6→7)` → `skills`.
