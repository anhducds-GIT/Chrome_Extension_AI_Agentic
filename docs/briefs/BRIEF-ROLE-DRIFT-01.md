---
kind: brief
status: active
ttl_days: 90
---

# BRIEF `ROLE-DRIFT-01` — Hard Role Firewall cho vai điều phối

> **Cho executor.** Đề bài đã chốt. Không tự mở rộng phạm vi.
> Người chốt: Đức, 2026-09-04. Người viết brief: phiên `claude-dieu-phoi` (vai điều phối).
> Phiên điều phối **đứng ngoài** phần triển khai này — đó là một phần của chính bản vá.

## 1. Defect — chuyện đã xảy ra thật, không phải giả định

Ngày 04/09, Đức chốt vai của phiên trợ lý là **Project Orchestrator, không phải Git Operator**.
Cùng ngày, chính phiên đó đi code `run-liveness-core.js` cho F-25, qua **ba** vòng sửa
test–thử phá–sửa test. Đức phát hiện và hỏi: *"chúng ta đang làm Assistant AI? sao bạn lại
thành debug Extension?"*

**Nguyên nhân cơ học, đã xác minh — hai cửa, và cả hai đang mở trong luật:**

1. **Mục 4 của `docs/protocols/ORCHESTRATOR.md` cho phép "sửa nhỏ"** với bốn điều kiện, trong
   đó có "không quá hai vòng sửa–chạy–sửa". Một trần đếm vòng **không chặn được** việc bước
   qua cửa; nó chỉ đo sau khi đã bước qua. Và người đang debug là người tệ nhất trong việc
   đếm xem mình đã debug mấy vòng.
2. **Không có LỐI RA.** Mục 4 nói "giao cho một phiên khác" nhưng **không nói giao bằng cách
   nào** — không mẫu brief, không quy trình bàn giao, không cách theo dõi. Protocol có lối
   vào mà không có lối ra, nên khi tới lúc phải giao thì đường duy nhất còn lại là tự làm.

Cửa 2 là cửa quan trọng hơn. Đóng cửa 1 mà không mở cửa 2 thì lần sau vẫn trượt, chỉ là trượt
trong im lặng.

## 2. Phải làm gì — Đức đã chốt, không bàn lại

### 2.1 `docs/protocols/ORCHESTRATOR.md`

- **XOÁ TOÀN BỘ mục 4 hiện tại** (mọi ngoại lệ "sửa nhỏ"). Thay bằng **Hard Role Firewall**:
  vai điều phối **không code, không debug product, không đề xuất patch kỹ thuật** — kể cả
  "chỉ một sửa nhỏ", kể cả khi đã có sẵn bối cảnh, kể cả khi Đức bảo làm (lúc đó phải nói ra
  rằng việc này thuộc executor, rồi giao).
- **Ranh giới dashboard:** được duy trì trạng thái dự án và trạng thái bảng
  (`STATUS.md` · `IDEAS.md` · Log · sinh lại artifact). **Sửa bộ sinh, runner, hay code
  extension = executor.** Ranh giới này phải viết thành một bảng "được / không được", không
  viết thành văn xuôi.
- **Luật nạp báo cáo (status-ingestion).** Khi Đức dán một báo cáo kỹ thuật (log, `run.status`,
  sổ cái), phiên điều phối **chỉ trích ra năm mục** và dừng:

  ```
  DONE → STATE CHANGE → BLOCKER → HUMAN DECISION → NEXT WORK
  ```

  Không tiếp tục chuỗi suy luận kỹ thuật, không chẩn đoán nguyên nhân, không đề xuất bản vá.
  Cần chẩn đoán → viết brief, giao executor.
- **Tự kiểm trước mỗi lượt trả lời:** *"Tôi đang quản lý công việc hay đang giải bài kỹ
  thuật?"* Vế sau → DỪNG → chuyển thành điều phối hoặc bàn giao.
- **Hợp đồng máy đọc được**, đặt trong frontmatter của chính file đó:

  ```yaml
  role_scope: control-plane
  product_debug: forbidden
  product_code: forbidden
  ```

### 2.2 LỐI RA — mục mới, và đây là phần dễ làm hời hợt nhất

Firewall mà không có lối ra thì chỉ đổi "trượt vai" thành "tắc". Phải viết một mục **Bàn giao
cho executor**, gồm: brief đặt ở đâu (`docs/briefs/BRIEF-<mã>.md`), tối thiểu phải có những
mục nào, giao bằng cách nào, và theo dõi bằng cách nào (khoá vùng + Log là hai thứ đã có —
đừng phát minh cơ chế thứ ba). File brief bạn đang đọc **chính là bản mẫu**; nếu nó thiếu gì
thì bổ sung vào mục mới đó.

### 2.3 `PROMPTS.md`

Câu mở phiên điều phối (mục 0) hiện chỉ nói "không phải phiên đi code". **Chưa đủ** — nó không
nói phiên đó phải xử lý thế nào khi Đức dán một đống log kỹ thuật vào. Thêm luật năm mục ở
2.1 vào chính câu dán.

### 2.4 `AGENTS.md` gốc — con trỏ đang quảng bá luật sai

Dòng trỏ sang `ORCHESTRATOR.md` trong bảng "Sổ tay mở khi cần" hiện quảng cáo
**"trần chống sa đà (quá hai vòng sửa–chạy–sửa thì dừng và giao đi)"** — tức đang giới thiệu
đúng cái rule vừa bị bác. Sửa thành Hard Role Firewall. Cần khoá `_root`.

### 2.5 Regression smoke — bắt buộc

Một phép kiểm chạy trong suite gốc repo, để **không ai vô tình mở lại quyền debug**. Tối thiểu:

- frontmatter của `ORCHESTRATOR.md` có đủ ba trường ở 2.1, đúng giá trị;
- file **không** còn chứa ngoại lệ sửa code (đừng chỉ dò chữ "sửa nhỏ" — dò được một cách viết
  thì cách viết thứ hai lọt; hãy ghim vào cấu trúc: sự tồn tại của ba trường + vắng mặt của
  một mục cho phép);
- `AGENTS.md` gốc **không** còn quảng bá "hai vòng sửa–chạy–sửa";
- `PROMPTS.md` có luật năm mục.

**Và phải thử phá phép kiểm đó.** Mỗi khẳng định phải dựng được ca hỏng thật: sửa file cho
sai rồi chạy, phải ĐỎ. Trong repo này đã có ba phép kiểm xanh một cách vô nghĩa, và trong
chính phiên viết F-25 có **ba lượt thử phá thoát** vì regex `[\s\S]*?` chạy ra ngoài thân
hàm. Đừng lặp lại: cắt đúng phạm vi rồi mới khẳng định.

## 3. Ranh giới — đừng làm quá

- **KHÔNG** đụng code extension, bộ sinh, runner, bridge. Việc này thuần tài liệu + một test.
- **KHÔNG** promote sang template (`Ark_Repo_Harness`). Đức chốt: chạy và chứng minh firewall
  ở repo này trước.
- **KHÔNG** đụng `scripts/what-next.mjs` — nó đang đúng, và nó là công cụ chỉ-đọc.
- Cần khoá `_docs` (sổ tay, brief) · `_root` (`AGENTS.md`, `PROMPTS.md`) · `_code` (test).
  Nhận bằng `claim.mjs`, đừng sửa bảng bằng tay.

## 4. Xong khi nào

1. Cổng đóng phiên `node scripts/session-check.mjs --as <tên-phiên>` **XANH TOÀN BỘ**.
2. Regression smoke mới chạy trong suite, và **mọi mutation bạn thử đều bị bắt** — báo cáo số
   thật, kể cả số lượt thoát ban đầu.
3. Một dòng Log vào `HANDOFF.md` gốc: làm gì, kết quả số, còn gì mở.
4. Đẩy bằng `safe-push.mjs`, commit có `Lane: <tên-phiên>`.
5. Trả lại mọi khoá đã nhận, và nhớ: **trả khoá là một lượt push riêng** — trả trước commit
   cuối thì cổng ĐỎ vì vùng có commit chưa push mà không ai đứng tên (đo thật 04/09).

## 5. Câu hỏi thì hỏi Đức, đừng hỏi phiên điều phối

Phiên điều phối cố ý đứng ngoài việc này. Nếu brief thiếu, hỏi Đức một câu ngắn.
