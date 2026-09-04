---
kind: brief
status: active
ttl_days: 90
---

# BRIEF `CONTENT-TRUTH-01` — Bảng nói "đã chứng minh" mà giấu mất việc code đã đổi

> **Cho executor. Đề bài đã chốt, không tự mở rộng phạm vi.**
> Người chốt: Đức, 2026-09-04. Người viết brief: phiên `claude-dashboard` (vai điều phối).
> Phiên điều phối **đứng ngoài** phần triển khai này — luật `ROLE-DRIFT-01`.

## 1. Defect — chuyện đã xảy ra thật, không phải giả định

`DASHBOARD.md` có một cột nói rõ code đã đổi bao nhiêu commit **kể từ lần kiểm chứng live cuối**.
Đo ngày 04/09 trên HEAD:

| Đơn vị | Kiểm chứng cuối | Code đã đổi kể từ đó |
|---|---|---|
| Duc Auto ChatGPT | 2026-08-26 | **23 commit** |
| Duc Auto Gemini (Platform) | 2026-08-28 | **10 commit** |

`DASHBOARD.html` — **trang Đức thật sự đọc** — có **0 chỗ** nhắc tới con số đó. Nó chỉ hiện
chip **"ĐÃ CHỨNG MINH"** kèm ngày kiểm chứng (`scripts/build-overview.mjs:803`, `<dt>Kiểm chứng
cuối</dt>`).

**Vì sao đây là lỗi an toàn chứ không phải lỗi chữ nghĩa:** Đức nhìn "ĐÃ CHỨNG MINH" và hợp lý
mà hiểu là *bản đang chạy đã được chứng minh*. Thực tế bằng chứng thuộc một bản code **cũ hơn
23 commit**. Đức là người chốt việc chạy pilot thật trên trang thật — một quyết định như thế
dựa trên niềm tin sai về độ tươi của bằng chứng là **rủi ro thật, không phải giả thuyết**.

Phát hiện bởi audit độc lập (GPT) vòng "Content Truth", 04/09. Đã kiểm chứng lại bằng cách đọc
model, không tin báo cáo.

## 2. Phải làm gì — Đức chốt 2026-09-04

Cho `DASHBOARD.html` **hiện rõ khoảng cách giữa mốc kiểm chứng và code hiện tại**, ở chỗ Đức
nhìn thấy cùng lúc với chip trạng thái — không giấu trong toggle.

**Dữ liệu đã có sẵn, không phải nối gì thêm.** Trường là `row.changedCount`, nằm ngay trên
các row mà `collectModel` trả về — cùng model `build-overview.mjs` đang dùng. Đo để bạn khỏi
phải tự dò:

```
Duc Auto ChatGPT           lastVerified=2026-08-26  changedCount=23
Duc Auto Gemini (Platform) lastVerified=2026-08-28  changedCount=10
ba đơn vị còn lại          lastVerified=(chưa khai) changedCount=0
```

`build-dashboard.mjs:930` đã dùng đúng trường này để in `CÓ (N commit)`. Bảng chỉ đơn giản
**không hiển thị nó**.

Chữ hiện ra phải là **tiếng Việt có dấu, cho mắt Đức đọc** (luật vàng 5) — nói được ý *"bằng
chứng thuộc bản cũ hơn N commit"*, không in tên trường, không in mã commit.

## 3. Ranh giới — KHÔNG được đụng

- **KHÔNG** sửa defect 5 (đổi tên "Đang tập trung") và defect 6 (đổi "4 việc" thành "4 đơn vị").
  Auditor muốn gộp cả ba; **Đức chốt chỉ defect 4**. Xem mục 7 — đã ghi sẵn, chờ Đức mở.
- **KHÔNG** đụng nội dung các phép kiểm hiện có của bảng. Bảng đã qua audit độc lập **PASS**
  ngày 04/09; sửa chúng là mở lại một cổng đã đóng.
- **KHÔNG** đụng `changedCount` hay cách `build-dashboard.mjs` tính nó. Nó đúng rồi.
- **KHÔNG** đụng `DASHBOARD.md`. Nó đã nói đúng.
- **KHÔNG** in đường dẫn / tên file / mã commit ra trang — có phép kiểm bất biến chặn, và
  ngoại lệ duy nhất là khối bản đồ ở tab Cấu trúc.

## 4. Khoá cần

`_code` — cho `scripts/build-overview.mjs` và `tests/build-overview-smoke.mjs`.
Lúc viết brief, `_code` do `claude-k2-bootstrap` giữ. Tự kiểm bằng `node scripts/claim.mjs --list`.

## 5. Xong khi nào — điều kiện máy kiểm được

1. `DASHBOARD.html` hiện được khoảng cách đó cho **cả hai** đơn vị có `changedCount > 0`, và
   **không** bịa ra cảnh báo cho ba đơn vị có `changedCount = 0`.
2. **Một phép ghim dựng được ca hỏng thật:** đơn vị có `lastVerified` và `changedCount > 0`
   mà trang **không** cảnh báo → phép kiểm phải ĐỎ. Ghim **quan hệ**, đừng ghim con số 23 —
   con số đó đổi mỗi ngày.
3. **Thử phá bắt được:** bỏ phần hiển thị cảnh báo → suite phải đỏ, và đỏ **đúng khẳng định
   đó**, không phải đỏ vì lý do khác.
4. `node scripts/session-check.mjs` xanh toàn bộ.
5. Sinh lại bảng, commit. **Thứ tự: commit nguồn → sinh → commit bảng.** Sinh trước là sinh
   từ HEAD cũ; phiên viết brief đã dính đúng lỗi này ngày 04/09.
6. Một dòng Log vào `HANDOFF.md`.

## 6. Hỏi ai

**Đức.** Không hỏi phiên điều phối — nó đứng ngoài phần triển khai này.

## 7. Đã ghi sẵn, CHƯA được duyệt — đừng tự làm

Auditor lập luận rằng dừng ở defect 4 thì cổng Content Truth **vẫn REVISE**, và sẽ phải quay
lại thêm một vòng. Lập luận đó có lý; Đức vẫn chốt chỉ defect 4. Ghi hai việc còn lại ở đây để
vòng sau không phải dựng lại từ đầu — **mở được chỉ khi Đức nói**:

- **Defect 5** — nhãn "Đang tập trung" thật ra là *đơn vị có `priority_rank` cao nhất*, hiện là
  Flow. Tên hiện tại khiến nó trông như việc Đức/nhóm đang làm lúc này. Đề xuất: "Ưu tiên sản
  phẩm #1".
- **Defect 6** — "4 việc đang chờ Đức" thật ra là **4 đơn vị**; riêng `human_action` của Flow
  chứa ít nhất hai việc khác loại (chạy live test, và một quyết định kiến trúc). Hoặc đổi nhãn
  thành "4 đơn vị", hoặc đếm việc thật.

Cả hai cùng một bệnh với defect 4: **nhãn nói sai thứ nó đang đo.**

## 8. Hai cái bẫy đã cắn trong ngày, tránh giúp

- **Ký tự vô hình.** Bốn lần ngày 04/09: heredoc ăn backslash · `\|` bị nuốt · neo nhiều dòng
  gặp CRLF. Lần nào cũng báo *"0 lần khớp"*, trông y hệt "không có gì để sửa". Neo bằng **một
  dòng**; chuỗi có backslash thì dựng bằng `String.fromCharCode(92)`.
- **Phép kiểm xanh vì lý do khác.** Hai lần trong một phiên: một phép kiểm xanh mà tôi tưởng nó
  đang canh thứ A, thật ra nó xanh vì thứ B. Cách kiểm rẻ nhất: **đổi ngược bản vá; suite vẫn
  xanh nghĩa là phép ghim đó chưa tồn tại.** Và "không dựng được ca hỏng" là **chưa kiểm chứng**,
  không phải "đã qua".
