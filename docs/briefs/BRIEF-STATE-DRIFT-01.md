---
kind: brief
status: active
ttl_days: 90
---

# BRIEF `STATE-DRIFT-01` — cổng nhất quán trạng thái trước khi báo cáo

> **Cho executor.** Đề bài đã chốt. Phạm vi cố ý HẸP — xem mục 3 trước khi thấy ý tưởng hay.
> Người chốt: Đức, 2026-09-04. Người viết brief: phiên `claude-dieu-phoi` (vai điều phối).
> Phiên điều phối **đứng ngoài** phần triển khai — đó là luật `ROLE-DRIFT-01`, đã có hiệu lực.

## 1. Defect — hai ca thật trong một ngày, cùng một họ

Ngày 04/09, Đức phải tự bắt **hai** sai lệch mà hệ lẽ ra phải tự thấy:

1. **Khoá.** Phiên điều phối báo "đã trả ba khoá `_root` `_docs` `_code`". Trên máy đúng là
   trống. Nhưng lượt trả **chưa được push**, nên trên `origin/main` cả ba vẫn ghi là đang bị
   giữ — và GitHub mới là chỗ GPT audit và là chỗ phiên khác nhìn vào để biết mình có bị chặn.
   Đức là người phát hiện, không phải hệ.
2. **Báo cáo cũ.** `STATUS.md` của gói ưu tiên #1 ghi F-14 "nửa sau chưa chứng minh" và F-26
   "cần Đức chốt", trong khi Log của chính gói đó (lượt 18, 02/09) nói **F-14 đóng hoàn toàn**
   và **F-26 xong**. Bản đồ việc ở gốc repo đọc `STATUS.md` nên hiển thị sai theo.

Một họ duy nhất: **trạng thái được BÁO ≠ trạng thái có THẨM QUYỀN.** `ROLE-DRIFT-01` đã đóng
loại lỗi "trượt vai". Loại này — "trượt trạng thái" — hiện chỉ được chặn bằng một câu văn xuôi
trong mục 6 của `docs/protocols/ORCHESTRATOR.md` bảo phiên điều phối *nhớ tự đối chiếu*. Một
luật dựa vào việc AI nhớ làm là luật sẽ bị bỏ qua đúng lúc bận nhất.

> Luật nào không kiểm được bằng máy thì sớm muộn cũng bị bỏ qua. Đó là lý do repo này có cổng
> kiểm — và là lý do có brief này.

## 2. Phải làm gì

### 2.1 Một lệnh CHỈ ĐỌC — đề xuất `scripts/state-check.mjs`

Chạy được không cần khoá nào, giống `what-next.mjs`. Nó **đối chiếu**, không sửa gì.

**Đây KHÔNG phải `session-check.mjs`.** Hai thứ khác nhau, và lẫn chúng sẽ hỏng cả hai:

| | `session-check.mjs` | `state-check.mjs` (mới) |
|---|---|---|
| Ai chạy | executor | phiên điều phối |
| Chạy lúc nào | trước khi **đóng phiên** | trước khi **báo cáo** cho Đức |
| Hỏi gì | "việc tôi làm có đủ điều kiện push chưa?" | "điều tôi sắp nói có đúng với nguồn thẩm quyền không?" |
| Đỏ thì sao | không được push | không được phát biểu trạng thái chắc chắn |

**Ba cặp đối chiếu — đủ, và đừng thêm cặp thứ tư:**

| Cặp | Nguồn thẩm quyền | Bắt được ca nào |
|---|---|---|
| `.agents/claims.json` trên máy ↔ trên `origin/main` | `origin/main` | ca số 1 ở mục 1 |
| Artifact máy sinh ↔ HEAD | HEAD | bảng nói sai về chính nhánh vừa đẩy |
| Có commit chưa push không | `origin/main` | "đã xong" trong khi chưa ai ngoài máy này thấy |

Cặp thứ hai **đã có sẵn phép đo** — `--check-head` của các bộ sinh. Gọi lại nó, đừng viết lại.
Đọc kỹ `scripts/session-check.mjs` xem nó gọi thế nào; **tái dùng, không nhân bản.** Hai bản sao
của một luật đã trả hai câu khác nhau cho cùng một file ngày 02/09.

`git fetch` trước khi so — nếu không thì bạn đang so với một `origin/main` cũ và cổng sẽ nói
dối theo hướng trấn an. Nhưng **fetch hỏng thì phải nói ra là KHÔNG BIẾT**, không được coi là
"khớp": mất mạng mà báo "mọi thứ khớp" là đúng kiểu hỏng fail-open mà repo này cấm.

### 2.2 Đầu ra — ba trạng thái, không phải hai

- `STATE OK` — ba cặp đều khớp.
- `STATE MISMATCH` — có mâu thuẫn. **Liệt kê từng chỗ lệch, nói rõ bên nào nói gì.** Không tóm
  tắt thành "có 3 chỗ lệch" — con số không cho ai hành động được.
- `STATE UNKNOWN` — không đối chiếu được (fetch hỏng, không có remote, git lỗi). **Đây là
  trạng thái riêng, không được gộp vào `OK`.**

Mã thoát: `0` cho OK, khác 0 cho hai trạng thái kia — để một phiên có thể dùng nó trong lệnh
ghép mà không phải đọc chữ.

### 2.3 KHÔNG TỰ SỬA — điều này quan trọng hơn cả việc phát hiện

Thấy lệch thì **báo**, tuyệt đối không tự làm cho khớp. Có ba cám dỗ cụ thể, và cả ba đều bị
cấm: tự `git push` cho hết lệch · tự chạy `claim.mjs --restamp` cho dấu khớp lại · tự sinh lại
artifact rồi commit.

Repo này đã ghi rõ vì sao trong `AGENTS.md` mục 6 (đoạn `DAU_VO`): *"đừng restamp cho xong việc
— làm thế là đóng dấu hợp lệ cho vụ sửa tay và xoá luôn tang chứng."* Cùng một lý lẽ ở đây: một
cổng tự dọn bằng chứng của chính thứ nó phải phát hiện là cổng vô dụng, và tệ hơn — nó tạo cảm
giác an toàn.

Lệnh chỉ được **in ra lệnh sửa** cho người chạy tự quyết.

### 2.4 Nối vào sổ tay

Mục 6 của `ORCHESTRATOR.md` hiện nói phiên điều phối phải "tự soi sai lệch trạng thái" bằng chữ.
Thay bằng lệnh này. Giữ nguyên tinh thần đã viết ở đó: *"Sai lệch nào thấy được bằng một lệnh
thì Đức không phải là người tìm ra nó."*

Và thêm vào `PROMPTS.md`: một câu để Đức dán khi nghi ngờ trạng thái đang lệch.

### 2.5 Test + thử phá — bắt buộc

Một phép ghim trong suite gốc repo. Yêu cầu về chất lượng, đọc kỹ vì repo này đã trả giá:

- **Hàm thuần**: phần so sánh nhận dữ liệu làm tham số, không tự chạy git. Nếu nó tự chạy git
  thì bạn không dựng được ca "khoá lệch" bằng test, và phép kiểm sẽ chỉ chứng minh *hôm nay*
  đang khớp — vô nghĩa ngày mai. Bài học F-25: `danhGia` nhận `now` làm tham số nên mới ghim
  được ca "đã 22 phút".
- **Dựng được cả ba trạng thái** `OK` · `MISMATCH` · `UNKNOWN`, và ghim rằng `UNKNOWN` **không**
  bị coi là `OK`.
- **Ghim luật không-tự-sửa**: phải có một khẳng định chứng minh lệnh không gọi `push`,
  `--restamp`, hay ghi file. Đừng chỉ dò tên hàm — ghim vào cấu trúc.
- **Thử phá mọi khẳng định.** Sửa cho sai, chạy, phải ĐỎ. Báo số thật kể cả số lượt thoát ban
  đầu. Đừng dùng regex kiểu `/mở[\s\S]*?đóng/` để kiểm trong một phạm vi — nó chạy ra ngoài
  phạm vi và cho xanh giả (đã cắn ba lần trong phiên F-25, một lần nữa trong `ROLE-DRIFT-01`).
- Đừng dùng `\b` trong regex khớp chữ tiếng Việt — `\b` dựa trên `[A-Za-z0-9_]` nên không tạo
  được biên cạnh `Đ`/`ế`, và regex khớp **không gì cả** một cách im lặng.

## 3. Ranh giới — phần dễ làm hỏng nhất của brief này

Đức chốt phạm vi **hẹp**. Cụ thể là **KHÔNG**:

- **Không** biến nó thành siêu-auditor. Ba cặp ở 2.1, hết. Thấy cặp thứ tư đáng thêm → ghi vào
  `BACKLOG.md`, đừng làm.
- **Không** đụng `session-check.mjs`, `safe-push.mjs`, `claim.mjs`, `what-next.mjs`. Tái dùng
  hàm export sẵn thì được; sửa chúng thì không.
- **Không** đụng code extension, bộ sinh, runner, bridge.
- **Không** promote sang `Ark_Repo_Harness`. Đức chốt: chạy ổn ở repo này trước, rồi mới
  promote **cả gói Assistant một lượt** — không promote từng luật rời.
- **Không** cho nó chạy tự động ở đâu cả. Nó là lệnh người/AI gọi, không phải hook, không phải
  cron. Tạo automation tự chạy là việc phải hỏi Đức.

Khoá cần: `_code` (lệnh + test) · `_docs` (sổ tay) · `_root` (`PROMPTS.md`, `package.json`).
Nhận bằng `claim.mjs`, đừng sửa bảng bằng tay.

## 4. Xong khi nào

1. `node scripts/state-check.mjs` chạy được, **không đòi khoá nào**, và ba trạng thái đều ra
   được trong thực tế.
2. Cổng đóng phiên `node scripts/session-check.mjs --as <tên-phiên>` **XANH TOÀN BỘ**.
3. Test mới trong suite; **mọi mutation bạn thử đều bị bắt** — báo số thật.
4. Log vào `HANDOFF.md` gốc (chỉ thêm ở cuối).
5. Commit có `Lane: <tên-phiên>`, đẩy bằng `safe-push.mjs`. Từ chối vì cuốn theo việc phiên
   khác → **DỪNG và báo**, đừng tự `--carry`.
6. Trả khoá — nhớ đó là **lượt push riêng** (trả trước commit cuối thì cổng ĐỎ).

**Một phép thử cuối, và nó là phép thử thật sự của việc này:** sau khi xong, tự tạo một sai
lệch thật (ví dụ: trả một khoá rồi **chưa** push) và chạy `state-check`. Nó phải bắt được. Nếu
không bắt được thì việc này chưa xong, dù test có xanh.

## 5. Câu hỏi thì hỏi Đức

Phiên điều phối cố ý đứng ngoài. Brief thiếu gì thì hỏi Đức một câu ngắn.
