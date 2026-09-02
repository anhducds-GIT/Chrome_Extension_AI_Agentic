---
kind: guide
status: active
ttl_days: 365
---

# Bản mẫu đề bài một phiên

> Chép phần trong khối bên dưới thành `docs/briefs/BRIEF-<tên>.md`.
> Một đề bài = **một phiên = một mục tiêu đóng được**. Đề bài cần hai phiên mới xong là đề bài
> chưa chia xong.

**Vì sao có bản mẫu này:** bảy phiên đầu của repo này chạy trơn tru **chỉ vì mỗi phiên đều có
một đề bài tự chứa** — AI đọc là làm được, không phải hỏi lại. Nhưng suốt bảy lần đó, đề bài
được viết lại từ đầu mỗi lần, nên lần nào cũng sót một mục. Lần sót đắt nhất: một đề bài bảo
"giữ quyền tới khi push xong" ở đầu file, còn khối lệnh cuối file lại trả quyền trước khi chạy
cổng — phiên đó vấp thật.

---

```markdown
---
kind: brief
status: active
ttl_days: 30
---

# BRIEF — Phiên <tên>: <mục tiêu trong một câu>

> Dán vào phiên AI. Một phiên, một mục tiêu.
> **Điều kiện mở:** <phiên trước đã đóng và đã push? cổng kiểm xanh? claim trống?>

## Mở phiên

1. Đọc luật gốc repo → cổng vào máy đọc → bảng điều hành → bàn giao (phần cuối).
2. Nhận quyền vùng mình sắp sửa. **Giữ tới khi push xong**, trả bằng commit riêng.
3. Chạy cổng kiểm. **ĐỎ thì DỪNG**, báo nguyên văn, đừng tự sửa cho nó xanh.

## Mục tiêu

<Một đoạn. Xong phiên này thì điều gì ĐÚNG mà trước đó chưa đúng?>

## Cạm bẫy đã biết trước — đọc kỹ

<Mỗi cái bẫy đã làm hỏng một phiên trước đó. Không có bẫy nào thì ghi thẳng "chưa biết bẫy nào".
Đừng bịa cho đủ mục.>

## Việc cần làm

### 1. <việc>
### 2. <việc>
### 3. Test ghim — bắt buộc, và phải ghim ĐÚNG chiều

<Ghim hành vi, không ghim cách viết. Dò văn bản nguồn là phép kiểm giả: đổi tên một tham số là
lách qua.>

**Chạy đột biến trước khi báo xong**, và kiểm **fixture có phân biệt được hai nhánh không** —
một đột biến "bị bắt" trên fixture không dựng nổi ca hỏng là bị bắt giả.

## Cấm

- KHÔNG <việc thuộc phiên sau>
- KHÔNG đụng vùng bằng chứng · KHÔNG dùng `git add -A`

## Đóng phiên — thứ tự này quan trọng

> Bộ sinh đọc **hoàn toàn từ HEAD**. Chạy nó trước khi commit là dựng lại từ HEAD cũ.
> **Giữ quyền qua cổng kiểm, trả SAU khi push** — trả sớm là cổng đỏ ngay ở mục phạm vi.

1. `git add <đúng các file của mình>` → đọc lại `git status --short`: có file của ai khác không?
2. commit nguồn
3. chạy bộ sinh (giờ HEAD đã có dữ liệu mới)
4. commit artifact bằng **một commit riêng**
5. chạy cổng kiểm — **PHẢI xanh**
6. đẩy bằng công cụ đẩy an toàn
7. **CHỈ SAU KHI PUSH** mới trả quyền, bằng một commit riêng

⚠️ Đừng nối cổng kiểm và lệnh đẩy bằng `&&` sau một `| tail` — ống dẫn trả mã thoát của `tail`,
nên đẩy vẫn chạy dù cổng đỏ. Lỗi này đã xảy ra thật, **hai lần**.

## Nghiệm thu

<Một phép đo bằng máy mà chủ dự án tự chạy được, hoặc tự nhìn thấy được. Không phải "AI báo xong".>
```

## Ba mục hay bị sót nhất

| Mục | Sót nó thì sao |
|---|---|
| **Điều kiện mở** | Phiên khởi động trên một nền chưa sạch, hỏng giữa chừng, không ai biết vì sao |
| **Cạm bẫy đã biết** | Phiên sau vấp đúng chỗ phiên trước đã vấp |
| **Thứ tự đóng phiên** | Artifact dựng từ HEAD cũ, hoặc trả quyền sớm rồi cổng đỏ |
