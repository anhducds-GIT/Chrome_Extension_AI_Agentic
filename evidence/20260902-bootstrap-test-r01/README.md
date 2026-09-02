# Bài test một dòng — vòng 1, 2026-09-02

> **Bằng chứng vận hành. Chỉ thêm, không sửa, không xoá.**
> Phép thử quy định ở `docs/studies/ROADMAP-CLEAN-AND-TEMPLATE-V1.md` mục 4.

## Kết luận ngắn

**ĐẠT ở dạng VẬN HÀNH. CHƯA chạy ở dạng BA CÂU HỎI như roadmap quy định.**

Hai điều đó khác nhau, và bản ghi này cố tình không gộp làm một. Xem mục "Vì sao chưa
tính là đạt trọn vẹn" ở cuối.

## Điều kiện

| | |
|---|---|
| **Ngày** | 2026-09-02 |
| **Ai chạy** | Đức, tự làm |
| **Repo tại commit** | `8b459da` (trước khi phiên mới bắt đầu) |
| **Phiên AI** | Claude Code, **chat hoàn toàn mới**, không có ngữ cảnh trước đó |
| **Đầu vào** | đúng một dòng, không thêm gì |

Câu đã dán, nguyên văn:

```
Đọc llms.txt ở gốc repo anhducds-GIT/Chrome_Extension_AI_Agentic rồi làm theo.
```

## Quan sát được

Phiên mới, **không hỏi Đức câu nào**, đã tự làm được chuỗi sau:

1. Đọc `llms.txt` → lần ra `HANDOFF.md` → xác định việc kế tiếp là **phiên S4**
2. Tự tìm và đọc `docs/briefs/BRIEF-S4.md`
3. Kiểm cổng nền, thấy xanh, thấy các claim đều trống
4. Tự nhận quyền `_root` trong `.agents/claims.json` trước khi sửa gì
5. Làm trọn S4: viết `scripts/check-bootstrap.mjs`, mở rộng `.repo-structure.json`,
   nối vào `session-check.mjs`, viết test ghim, chạy mutation
6. Đóng phiên đúng thứ tự brief quy định, chạy cổng, `safe-push`
7. Trả quyền `_root` bằng commit riêng

**Số câu hỏi ngược lại Đức: 0.**

## Kết quả để lại

| | |
|---|---|
| Commit | `4f68158` · `90fe239` · `eea3d6f` |
| Suite | 216 test xanh, 5 suite |
| Cổng kiểm | exit 0 |
| Cổng cấu trúc mới | 0 ĐỎ · 51 VÀNG |

## Kiểm chứng độc lập

Phiên điều phối (`audit-s4`) tự chạy lại toàn bộ, không tin báo cáo — luật vàng 4.
Mọi con số khớp. Chi tiết ở `HANDOFF.md` gốc, mục ngày 2026-09-02 `audit-s4`.

Đáng ghi thêm: phiên mới **bắt được một lỗi trong chính `BRIEF-S4.md`** — mục "Mở phiên"
bảo giữ `_root` tới khi push xong, còn khối "Đóng phiên" lại trả quyền trước khi chạy cổng.
Nó vấp, tự nhận ra, tự sửa thứ tự, và ghi lại cho phiên sau. Không hỏi Đức.

## Vì sao CHƯA tính là đạt trọn vẹn

Roadmap mục 4 định nghĩa "đạt" là AI **nói được ba điều**:

1. Repo có những extension gì, cái nào đang sống
2. Việc ưu tiên số 1 hiện tại là gì, thuộc gói nào
3. Nên đọc file nào tiếp theo

Phiên này **không được hỏi ba câu đó**. Nó đi thẳng vào làm việc — hành vi mạnh hơn ở mặt
vận hành (điều hướng đúng *và* thực thi đúng), nhưng **không phải cùng một phép thử**.
Ghi nhận nó là "đạt ba câu hỏi" sẽ là nống lên, và bằng chứng nống lên thì vô giá trị.

**Việc còn lại:** ở phiên S7, chạy đúng dạng ba câu hỏi trong một chat mới nữa, ghi kết quả
vào `evidence/2026xxxx-bootstrap-test-r02/`. Nếu đạt cả hai dạng thì mục tiêu chính của dự án
đóng lại.

## Ý nghĩa

Phép thử này là **tiêu chí nghiệm thu chính của cả chương trình tái cơ cấu** — lý do tồn tại
của S1, S2 và S3. Nó được quy định chạy ở **S7**. Dạng vận hành của nó đã đạt ở **S4**, tức
sớm hơn ba phiên.

Điều đó nói rằng: nền điều hướng (`llms.txt` → `HANDOFF.md` → brief) đã đủ để một AI lạ
tự vào việc. Ba phiên còn lại (S5, S6, S7) là dọn nợ và bật chặn, không phải dựng nền.
