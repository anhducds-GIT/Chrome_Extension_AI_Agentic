# Bài test một dòng — vòng 2, dạng CHÍNH THỨC, 2026-09-02

> **Bằng chứng vận hành. Chỉ thêm, không sửa, không xoá.**
> Phép thử quy định ở `docs/studies/ROADMAP-CLEAN-AND-TEMPLATE-V1.md` mục 4,
> chạy theo `docs/briefs/BRIEF-S7.md` PHẦN B.

## Kết luận

**ĐẠT.** Trả lời được cả ba câu, **không hỏi lại câu nào**.

Cùng với vòng r01 (dạng vận hành, đã đạt), **mục tiêu chính của chương trình tái cơ cấu
đóng lại.**

## Điều kiện

| | |
|---|---|
| **Ngày** | 2026-09-02 |
| **Ai chạy** | Đức, tự làm |
| **Phiên AI** | Claude Code, **chat hoàn toàn mới** |
| **Đầu vào** | đúng một dòng, không thêm gì |

Câu đã dán, nguyên văn:

```
Đọc llms.txt ở gốc repo anhducds-GIT/Chrome_Extension_AI_Agentic rồi cho tôi biết ba điều:
repo có những extension gì và cái nào đang sống, việc ưu tiên số 1 hiện tại là gì và thuộc
gói nào, tôi nên đọc file nào tiếp theo.
```

## Chấm theo đúng ba tiêu chí

| # | Tiêu chí | Kết quả |
|---|---|---|
| 1 | Repo có những extension gì, cái nào đang sống | **ĐẠT** — liệt kê 5 đơn vị kèm lifecycle, chốt "sống thật = 3" |
| 2 | Việc ưu tiên số 1 là gì, thuộc gói nào | **ĐẠT** — `workers/duc-auto-gg-flow-video/v0.1.0`, mô tả đúng ba bước và nêu được rằng cùng việc tay đó đang chặn cả ba gói |
| 3 | Nên đọc file nào tiếp theo | **ĐẠT** — trỏ `AI-OPERATOR-GUIDE.md` mục "Nhiều profile" nếu bắt tay vào việc, `HANDOFF.md` nếu muốn biết phiên trước bỏ dở gì |
| — | **Số câu hỏi ngược lại Đức** | **0** |

## Nó còn làm hơn đề bài — và cả hai cảnh báo đều được kiểm chứng

Phiên đó tự nêu hai điều không ai hỏi:

**① "`llms.txt` chậm 3 commit so với HEAD."**
→ **Đúng phần dấu, sai phần hàm ý.** Dòng dấu sinh trang có lag thật. Nhưng cổng kiểm dựng
lại toàn bộ artifact từ HEAD và so — nó XANH, nghĩa là **nội dung đang khớp**; chỉ dòng dấu
là cũ, và dòng đó **cố ý bị lọc khỏi phép so** (nếu không thì mỗi commit là artifact hoá cũ,
cổng đỏ vĩnh viễn). Nên "trang chậm 3 commit" đọc dễ hiểu thành "số liệu đã mục", mà không
phải vậy. Vẫn là một quan sát tốt: nó tự đối chiếu hai nguồn thay vì tin một.

**② "`npm test` có 1 phép kiểm đỏ (`bridge-mv3-reconnect-smoke.mjs`)."**
→ **Đúng lúc nó nhìn, nay đã hết.** Phiên `claude-bridge-multiprofile` đang port multi-profile
sang cả ba worker và đã commit bản vá (`b40cba3` — fixture cô lập về identity). Chạy lại lúc
kiểm chứng: `npm test` **exit 0**, 6 suite xanh.

Điều đáng ghi: nó **không giấu** một phép kiểm đỏ để báo cáo cho đẹp, và nói rõ đó là việc dở
của phiên khác chứ không đổ lỗi.

## Kiểm chứng độc lập (phiên `evidence-r02`)

Không tin báo cáo — tự chạy lại (luật vàng 4):

| Kiểm | Kết quả |
|---|---|
| `npm test` | **exit 0**, 6 suite xanh (97 · 6 · 79 · 15 · 27 · …) |
| `session-check.mjs` | **exit 0** |
| `check-bootstrap.mjs` | exit 0 · 0 ĐỎ |
| Cấu hình chặn | `blocking: ["B1","B2","B3","B4","B5","B7","B10","B12"]` |

**Và kiểm rằng chặn CHẠY ĐƯỢC, không chỉ được cấu hình.** Cố tình đổi `lifecycle` của
`duc-auto-chatgpt` thành chữ bậy rồi commit tạm:

```
[ĐỎ] Cổng kiểm cấu trúc B1–B14
     TỔNG: 1 chỗ ĐỎ (B7) · CHẶN: B7 (1 chỗ) — thuộc nhóm CHẶN nên KHÔNG được báo xong.
```

Cổng thoát **1**. Đã khôi phục nguyên trạng ngay; repo sạch, cổng xanh trở lại.

## Ý nghĩa

Roadmap gọi phép thử này là **cột mốc chính**: *"Đạt = mục tiêu chính của dự án đã xong."*

Hai vòng đã đạt, ở hai dạng khác nhau:

- **r01 (2026-09-02, dạng vận hành)** — phiên mới tự lần ra brief, làm trọn phiên S4, push,
  không hỏi câu nào.
- **r02 (2026-09-02, dạng ba câu hỏi)** — phiên mới trả lời đúng cả ba, không hỏi câu nào.

Nền điều hướng `llms.txt` → `DASHBOARD.md` → `HANDOFF.md` → brief đã đủ để một AI lạ **vừa
hiểu vừa làm được**. Việc còn lại (S8 trả nợ, S9 promote template, S10 radar) là mở rộng,
không phải dựng nền.
