---
kind: brief
status: active
ttl_days: 60
---

# BRIEF `RETRY-LAW-01` — Luật gửi lại sau khi đã gửi (`B-19`), và `B-11`

Hai mục trong `BACKLOG.md` của gói `duc-auto-chatgpt`. Cả hai **đã chờ Đức chốt**, và
**Đức đã chốt ngày 06/09**. Brief này chép lại câu chốt để bạn không phải hỏi lại.

## 1. `B-19` — luật Đức chốt, nguyên văn

> **Sau khi đã gửi, chỉ được gửi lại khi đối soát khẳng định được là lượt gửi đó không tạo ra
> kết quả nào. Không khẳng định được thì DỪNG và hỏi người.**

Đọc `B-19` trong `BACKLOG.md` của gói (khoảng dòng 297) để có bối cảnh đầy đủ.

**Điểm cốt lõi của luật, đừng đọc lướt qua:** cái mặc định khi **không biết** là **DỪNG**.
Hôm nay đang ngược lại — không biết thì nó cứ gửi lại. Đó là chỗ phải đảo.

Đức đã bác cả hai phương án cũ trong sổ ("giữ nguyên" và "chặn hẳn") vì cả hai đều **hành động
mà không cần biết sự thật**. Đừng quay lại hai phương án đó.

## 2. Việc, theo đúng thứ tự

### Bước 1 — ĐO TRƯỚC, đừng vá trước

`B-19` ghi rõ một chỗ chưa ai truy: *lớp đối soát có chặn phần lớn ca sau-khi-gửi trước khi
tới đường thử lại hay không.* **Chưa có câu trả lời đó thì chưa vá được**, vì luật của Đức
xoay quanh đúng chữ "khẳng định được".

Đo và ghi ra: hôm nay lớp đối soát khẳng định được **những ca nào**, và **những ca nào nó
không khẳng định được**. Số, không phải cảm giác.

**Nếu đo ra là nó không khẳng định được ca nào**, thì luật của Đức **tự động thu về "chặn
hẳn"** — và bạn cứ thế mà làm, **không cần hỏi lại Đức**. Đức đã tính trước tình huống này.

### Bước 2 — vá theo luật

Áp luật ở mục 1. Mỗi thay đổi **một phép ghim**, đó là luật vàng số 2 của repo.

### Bước 3 — `B-11`, Đức chốt: **CHO thử lại**

Câu Đức chốt: gọi `run.trial` khi chưa nạp workbook thì agent **được phép thử lại**
(`retryable: true`, giống `run.status` đang làm). Đọc `B-11` trong `BACKLOG.md` (khoảng dòng
577) — mục đó đã ghi sẵn chỗ phải sửa và vì sao nó không cùng gốc hoàn toàn với `B-16`.

Lý do Đức chốt như vậy: đây là lỗi **người sửa được trong năm giây** (mở workbook), nên bắt
agent chết hẳn là vô lý.

## 3. Đừng làm yếu lớp bảo vệ

Luật vàng số 3: **sửa bug được, gỡ bảo vệ thì không.** Đường thử lại sau khi gửi tồn tại một
phần để chặn thứ khác — chính comment trong `runner-core.js` nói rằng có một loại lỗi phải
tách ra thành "dừng hẳn" **đúng vì** nếu xếp nó là timeout thì nó rơi lại vào đường thử lại.
Vá của bạn không được làm hỏng chỗ đó. Chứng minh bằng phép ghim, không bằng lời.

## 4. Kiểm chứng — hai chiều, không chỉ một

Phép ghim mới phải **ĐỎ trên code trước khi vá** và **XANH sau khi vá**. Chỉ chạy chiều xanh
là chưa chứng minh gì: một phép ghim không ghim gì cả cũng xanh.

Và **đếm số chỗ mỏ neo của bạn khớp**. Ra 0 thì DỪNG — đó là công cụ hỏng, không phải "không
có gì phải sửa". Repo này đã bị cắn nhiều lần đúng kiểu đó, gần nhất là sáng 06/09.

## 5. Khoá và đóng phiên

```
node scripts/claim.mjs --take workers/duc-auto-chatgpt --as <tên-phiên> --task "B-19 luat gui lai + B-11 cho thu lai"
```

Commit phải có dòng cuối `Lane: <tên-phiên>`. Dùng `git commit -o <đường-dẫn>`, không dùng
`git commit` trần. `node scripts/session-check.mjs --as <tên-phiên>` phải XANH TOÀN BỘ. Đẩy
bằng `node scripts/safe-push.mjs --as <tên-phiên>`. **Trả khoá SAU khi đẩy** — đẩy không được
thì giữ khoá và báo lại. Ghi Log vào `HANDOFF.md` của gói.

Đóng được mục nào thì gạch mục đó trong `BACKLOG.md` của gói — nhưng chỉ gạch cái **đã đóng
trọn**. Đóng một nửa thì ghi rõ nửa nào còn mở, đừng gạch.

## 6. Cấm

- Cấm chạy live trên trang thật (`AGENTS.md` mục 2).
- Cấm đổi luật an toàn nào khác ngoài đúng hai mục này.
- Cấm nới hay gỡ phép ghim đang có để test xanh.
- Cấm báo xong khi cổng đóng phiên chưa XANH TOÀN BỘ.
