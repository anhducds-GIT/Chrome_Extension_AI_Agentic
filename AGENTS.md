# AGENTS.md — Hiến pháp repo (đọc đầu tiên, mọi AI)

> Đây là **Tầng 1**: luật chung, cố tình giữ ngắn 1 trang. Đọc hết trước khi gõ dòng đầu tiên.
> Chi tiết kỹ thuật KHÔNG nằm ở đây — xem mục "Sổ tay mở khi cần" bên dưới.
> Chủ dự án là **Đức** (non-tech, tiếng Việt, câu ngắn). Đức là người chốt duy nhất.

## 0. Ba việc phải làm, theo đúng thứ tự

1. **Mở phiên:** đọc file này → đọc `AGENTS.md` của package mình sắp đụng → đọc `HANDOFF.md`
   của package đó (phần cuối = trạng thái mới nhất).
2. **Làm việc:** một việc một lúc. Phát sinh việc ngoài phạm vi → ghi vào `BACKLOG.md`, không tự làm.
3. **Đóng phiên:** chạy cổng kiểm dưới đây. Đỏ thì chưa xong.

```bash
node scripts/session-check.mjs --as <tên-phiên-của-bạn>
```

Không được báo "xong" khi cổng kiểm chưa xanh. Không được tự sửa cổng kiểm cho nó xanh.

**Push thì KHÔNG dùng `git push`** — dùng:

```bash
node scripts/safe-push.mjs --as <tên-phiên-của-bạn>
```

Lý do: nhiều phiên AI dùng chung một thư mục git, nên `git push` của bạn **cuốn theo commit của
mọi phiên khác**. Ngày 26/08 chuyện này đã xảy ra thật — một phiên push và kéo theo 2 commit chưa
được Đức duyệt của phiên khác. `safe-push` liệt kê rõ sắp đẩy gì của ai, và từ chối nếu bạn đang
cuốn theo việc người khác. Vẫn phải hỏi Đức trước khi push (mục 2).

## 1. Ai giữ package nào — chống hai AI giẫm chân

Bảng chủ sở hữu là `.agents/claims.json`. **Một package chỉ có MỘT phiên AI được ghi tại một thời điểm.**

- Package đang có chủ, mà chủ không phải bạn → **chỉ được đọc, tuyệt đối không sửa**.
- Package trống chủ → ghi tên mình vào `claims.json` rồi làm.
- Muốn giành package người khác đang giữ → **hỏi Đức**, không tự lấy.

Đây không phải hình thức. Ngày 25–26/08 đã suýt hỏng vì hai phiên AI cùng làm trên một repo.

## 2. Bốn việc PHẢI hỏi Đức trước

1. `git push` / merge vào `main`
2. Thêm quyền (permission) mới cho extension
3. Chạy pilot live mới trên trang thật
4. Đổi luật an toàn (retry, halt, attribution, persistence, exact-once)

Ngoài ra, luật gốc của Đức: không gửi gì ra ngoài, không xoá file, không sửa dữ liệu gốc,
không tạo automation tự chạy — nếu chưa hỏi.

Commit thì được tự làm (đã có tiền lệ Đức duyệt). Push thì không.

## 3. Năm luật vàng

1. **Không đoán selector.** Mọi selector phải có bằng chứng DOM thật. Cần bằng chứng mới →
   gọi `diagnostics.dom_probe` qua Bridge, đừng mượn mắt Đức.
2. **Mỗi fix một test ghim.** Suite không chạm DOM thật, nên fixture bằng chứng là vàng.
3. **Không làm yếu lớp bảo vệ đã có** để cho test xanh. Sửa bug được; gỡ bảo vệ thì không.
4. **Kiểm chứng độc lập mọi báo cáo của AI khác.** Tự chạy lại test, tự đọc lại diff.
   Agent phụ báo "xong" không phải bằng chứng.
5. **Viết cho mắt Đức đọc.** Đức đọc không hiểu = lỗi hệ thống, viết lại đơn giản hơn.
   Chữ operator nhìn thấy: tiếng Việt. Mã lỗi (CODE): tiếng Anh.

## 4. Vùng cấm sửa

- `pilot-*/`, `Pilot-*/`, `Batch-*/`, `evidence/` — **bằng chứng vận hành**. Chỉ được THÊM mới,
  không sửa, không xoá, không tạo lại.
- Không bao giờ để token / mật khẩu / file pairing vào repo.
- Không bao giờ gán `.innerHTML` / `.outerHTML` / `insertAdjacentHTML`.

## 5. Vai từng AI

| AI | Việc chính | Không được |
|---|---|---|
| **Đức** | Chốt mọi thứ | — |
| **Claude** | Kiến trúc, phản biện, audit độc lập, điều phối, vận hành Bridge | Push khi chưa hỏi |
| **Codex** | Code theo brief, audit độc lập | Tự mở rộng phạm vi ngoài brief |
| **Antigravity** | Dựng UI, tạo giao diện | Sửa lớp an toàn / runner / bridge |

Ba AI có thể cùng lúc trong repo, nhưng **khác package** (mục 1).

**Cửa vào của từng AI** — cách file này đến được tay bạn:

| AI | Cách nạp | Đức phải làm gì |
|---|---|---|
| Claude | Tự đọc `CLAUDE.md` gốc → trỏ sang file này | Không phải làm gì |
| Codex | Tự đọc `AGENTS.md` gốc | Không phải làm gì |
| Antigravity | Dán **một câu mở màn**: *"Đọc AGENTS.md ở gốc repo trước khi làm gì."* | Dán 1 dòng mỗi phiên |

Antigravity đã được thử live 26/08: nó đọc file này, tự lần ra `.agents/claims.json`, và tự
kết luận "package có chủ rồi nên tôi chỉ được đọc" — dù không ai hỏi câu đó. Luật dùng được.
Nhưng chưa chứng minh được nó **tự** nạp lúc mở phiên, nên câu mở màn là bắt buộc: 3 giây,
miễn nhiễm với mọi thay đổi phiên bản, và nếu nó vốn tự nạp thì câu đó chỉ thừa vô hại.

## 6. Sổ tay mở khi cần — Tầng 2

Không đọc trước. Tới việc nào thì mở sổ tay đó.

| Khi bạn sắp… | Mở file |
|---|---|
| Vận hành / debug extension Gemini qua Bridge | `workers/duc-auto-gemini/v0.2.0/AI-OPERATOR-GUIDE.md` |
| Sửa code worker Gemini | `workers/duc-auto-gemini/v0.2.0/AGENTS.md` |
| Sửa code worker ChatGPT | `workers/duc-auto-chatgpt/v0.1.0/AGENTS.md` |
| Xem lỗi thật đã gặp trên trang, đừng chẩn đoán lại từ đầu | bảng lỗi trong `AI-OPERATOR-GUIDE.md` |
| Hiểu schema workbook XLSX | `DAC_XLSX_RUN_PLAN_V1.md` của package |
| Biết Đức đã chốt gì | `decisions.md` của package (mới nhất ở cuối) |
| Biết phiên trước làm tới đâu | `HANDOFF.md` của package (cuối file) |

## 7. Đóng phiên — ghi lại 3 thứ

1. Một dòng Log vào `HANDOFF.md` của package: làm gì, kết quả số, còn gì mở.
2. Quyết định mới của Đức → `decisions.md`.
3. Gặp lỗi mới trên trang thật → thêm 1 dòng vào bảng lỗi của sổ tay, **và** cân nhắc thêm
   1 phép kiểm vào `scripts/session-check.mjs`.

> Luật nào không kiểm được bằng máy thì sớm muộn cũng bị bỏ qua. Đó là lý do có cổng kiểm.
