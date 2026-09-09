# PHIÊN — duc-auto-chatgpt

<!-- PHIEN MAY SINH: rule-compile --sinh. DUNG SUA TAY. -->

> **File này do MÁY sinh** — `node scripts/rule-compile.mjs --sinh`. Đừng sửa tay: sửa lõi ở
> `workers/_shared/LUAT-CORE.md`, sửa luật gói ở `AGENTS.md` của gói, sửa trạng thái ở
> `STATUS.md`. Đây là **toàn bộ** thứ một phiên đụng gói cần nạp lúc mở
> ([ADR-0035](../../../docs/adr/0035-mot-file-cho-mot-phien-gap.md)).

## Hỏi Đức trước

Thêm quyền extension · pilot live mới trên trang thật · đổi luật an toàn (retry, halt, attribution,
persistence, exact-once) · **force-push, sửa lịch sử, merge vào `main`** · gửi gì ra ngoài · xoá hay
sửa dữ liệu nguồn · tạo automation tự chạy.

## Không bao giờ

- **Token, mật khẩu, tệp ghép cặp lọt vào repo. Repo này PUBLIC.**
- `pilot-*/` · `Pilot-*/` · `Batch-*/` · `evidence*/` là bằng chứng: **chỉ được THÊM.**
- Gán `.innerHTML` / `.outerHTML` / `insertAdjacentHTML`.
- **Đoán selector** — phải có bằng chứng DOM thật từ `diagnostics.dom_probe`.
- **Tin báo cáo của AI khác.** Tự chạy lại test, tự đọc lại diff.
- Giao bản vá **không kèm phép ghim**; **tự ký nghiệm thu bản sửa của chính mình**.
- **Nới một lớp bảo vệ để cổng xanh.** Sửa bug được, gỡ bảo vệ thì không.

## Bốn lệnh, đúng thứ tự

```bash
node scripts/claim.mjs --sua <đường-dẫn>… --as <phiên>   # TRƯỚC mỗi lượt ghi — đọc kết quả
node scripts/claim.mjs --soat --as <phiên>               # BẮT BUỘC trước git commit
node scripts/session-check.mjs --as <phiên>              # cổng; ĐỎ là chưa xong
node scripts/safe-push.mjs --as <phiên>                  # KHÔNG BAO GIỜ `git push` trần
```

- Nhận khoá bị **TỪ CHỐI** mà vẫn ghi là ghi vào vùng người khác. **Đừng nối `claim.mjs` vào ống.**
  Chỉ đọc thì không cần khoá.
- **Đừng nhả khoá của lane khác** — *"chưa thấy dấu vết trong repo"* không có nghĩa lane đó rảnh.
  Khoá **VÙNG** trả **sau khi đẩy**; đẩy không được thì **giữ khoá và báo lại**.
- **Mọi commit kết bằng `Lane: <tên-phiên>`.** Đẩy không phải hỏi khi đủ ba: việc hoàn tất trọn vẹn
  · cổng XANH TOÀN BỘ (code thì thêm **audit độc lập**) · đẩy bằng `safe-push`. Chỉ mở kênh git.
- **Suite là việc CUỐI CÙNG.** `--amend` chỉ cho commit của chính mình và **chưa đẩy**.

## Cần thêm thì mở — đừng mở sẵn

`AGENTS.md` gốc (luật đầy đủ) · `MULTIFLOW.md` 3a–3b (khoá, đóng phiên) · `RULE-COMPILER.md` (đổi
luật/trần) · `AGENTS.md` gói (bản đồ file) · `HANDOFF.md` gói (phiên trước vấp gì).
**Ba gói `duc-auto-*` là fork** — một lỗi thường có **ba** bản sao.

## Luật riêng của gói duc-auto-chatgpt

> **Mục này CỐ Ý gần giống gói Gemini — đừng gộp.** Lý lẽ đầy đủ, kèm ba chỗ phép ③ đã bắt được ở
> nhánh kia: [ADR-0032](../../../docs/adr/0032-ba-goi-giu-luat-rieng-gan-giong-nhau.md).

1. **Bốn luật ⑴–⑷ cũ nay nằm ở lõi dùng chung** (`workers/_shared/LUAT-CORE.md`, in ngay trên
   đây) — **đừng chép lại**. Phần riêng của gói này: `tests/artifact-integrity-smoke.mjs` chặn
   build nếu có HTML ghép chuỗi; chữ operator ở `operator-messages-core.js` và
   `halt-instructions-core.js`; **không phép kiểm bảo mật nào được assert vào câu chữ hiển thị**
   — chỉ assert vào logic/wiring.
2. **Agent Bridge: `run.start` / `run.pause` / `run.resume` không tồn tại** — thêm lại phải có
   quyết định mới ghi trong `decisions.md`. Bridge là ingress + observability, không phải remote
   execution. Side panel là executor DUY NHẤT; đóng panel → mọi lệnh Bridge liên quan
   Queue/workbook trả `EXECUTOR_UNAVAILABLE`, không có runner nền nào thay thế. *Ngoại lệ DUY
   NHẤT, và nó **tiêu credit thật**:* method **`run.trial`** (Đức chốt 25/08) với **bốn nắp cứng** — dev-toggle BẬT · ≤ 30 job · hai trial cách nhau ≥ 5–6 phút · nhãn audit
   `bridge_dev`; trần timeout **900 giây**
   ([ADR-0015](../../../docs/adr/0015-nang-tran-duong-thu-len-900-giay.md)). Trần khai ở **đúng
   một chỗ** — `LIMITS.trial_timeout_cap_sec` trong `bridge-core.js` — đừng gõ vào đâu khác.
   **Thấy mình đang gỡ `run.start` khỏi `POLICY.prohibited_methods` thì DỪNG LẠI.**
3. **Hai luật chung cho mọi extension ở [`workers/_shared/AGENTS.md`](../../_shared/AGENTS.md)** —
   *sửa `.js` thì nhắc Đức reload trước khi test* · *preview pane cấm, harness Chrome THẬT thì
   được*. **Đừng chép lại đây** — cái giá của bản chép đã đo, ghi ở chính file đó.
4. **Một việc một lúc, không overbuild** — không thêm tính năng/abstraction ngoài phạm vi trong
   cùng một lượt sửa. Ba lớp bảo vệ riêng của gói này, ngoài danh sách ở lõi: *readiness gating* ·
   *checkpoint protocol* · *security hard-stop*.

## Trạng thái mới nhất

- lifecycle: active
- last_verified: 2026-08-26
- next_step: "**Không còn mục nào chặn, và không còn mục nào làm được mà không cần Đức.** `B-40` `B-41` `B-42` `B-43` `B-44` đóng; `B-45` đóng là **sẽ không làm** và `B-46` đóng là **đã đo, tiền đề sai** — cả hai đo mất **0 credit**. Còn `B-36` (nút cấp lại quyền, Đức nói tạm chưa cần) và vế live của ADR-0053 (đã hạ mức, không chặn). Việc kế đáng làm nhất là **một loạt chạy ảnh thật**: nó vừa dùng được tính năng, vừa tự trả lời câu duy nhất còn để mở — tab bị che có vẽ xong một `<img>` sinh ra hay không (probe đã ghi sẵn `imageCandidateCount` và `generatedChains`, không cần thêm phép đo riêng)."
- human_action: "Không có việc nào đang chặn. Đức đã nạp lại tiện ích và F5 sau bản audit; `chat.say` chạy live PASS. Khi nào muốn thì **chạy một loạt ảnh thật** — nó sẽ tự trả lời câu cuối còn để mở của `B-46` (tab bị che có vẽ xong ảnh sinh hay không), không cần thêm phép đo riêng nào."
