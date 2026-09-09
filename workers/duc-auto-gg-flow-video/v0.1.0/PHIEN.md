# PHIÊN — duc-auto-gg-flow-video

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

## Luật riêng của gói duc-auto-gg-flow-video

1. **Không đoán selector.** Mọi selector Flow phải có bằng chứng `dom_probe`
   trong `evidence/`. SELECTORS/TIMING đang là đồ thừa kế từ Gemini — KHÔNG
   được coi là đúng cho Flow.
2. **Video trừ credits thật.** Trần trial dev **suy từ chip cấu hình đang hiển thị**
   (F-22, 05/09): ngân sách một tài khoản free là 50 credit, chia cho đơn giá đọc
   được trên chip → 360p x1 được 7 job · 720p x1 chỉ 3 · 360p x3 chỉ 2. `MAX_TRIAL_JOBS = 7`
   là **trần tuyệt đối**, chip chỉ được HẠ trần xuống, không bao giờ nâng. Không đọc được
   chip thì lấy cấu hình đắt nhất đã đo. **Không retry tự động khi nghi ngờ đã trừ credits**
   ([ADR-0002](docs/adr/0002-luat-an-toan-nhanh-video.md) — vế còn sống duy nhất của quyết định
   đó; trần ≤2 và khoá bootstrap đều đã chết).
   **Nới trần tuyệt đối = đổi luật an toàn = hỏi Đức.** Con số cũ **3 job** (chốt 27/08) **đã
   chết 05/09** — cố ý không đặt liên kết tới quyết định đó ở đây, vì trích một vế đã chết là
   đúng thứ cổng kiểm chặn.
3. **Khoá bootstrap Bridge đã được gỡ ngày 2026-08-27**
   ([ADR-0007](docs/adr/0007-go-khoa-bootstrap-bridge-f-05.md)) sau khi provider adapter được dựng
   từ bằng chứng thật, có test ghim và audit đối kháng PASS. Full method surface khả dụng,
   nhưng mọi gate an toàn riêng vẫn giữ nguyên.
   `diagnostics.evidence_submit` ([ADR-0004](docs/adr/0004-diagnostics-evidence-submit-primitive-tuong-tac.md))
   được giữ làm
   công cụ debug với trần cứng 3 lượt/trang; `run.trial` chỉ chạy khi bật toggle **Chế độ phát
   triển (Dev Mode)** trong side panel, và trần của nó là **trần ở luật 2** — `MAX_TRIAL_JOBS`
   trong `dev-trial-core.js`, hôm nay là **7**, hạ theo chip cấu hình.
   > **Sửa 09/09.** Dòng này ghi *"`run.trial` có trần 3 job"* — con số 27/08, **chết từ 05/09**
   > khi F-22 đổi sang suy trần từ chip (luật 2 ngay trên). Mã nói 7, luật 2 nói 7, dòng này nói
   > 3: **hai con số an toàn khác nhau trong CÙNG một file**, và nó là con số về TIỀN. Trần thật
   > khai ở đúng một chỗ trong mã — đừng gõ lại nó vào văn bản lần nữa.
4. Các luật thừa kế nguyên văn từ nhánh Gemini/ChatGPT: không innerHTML;
   không làm yếu exact-once / attribution / readiness / persistence /
   checkpoint / security hard-stop; chữ operator tiếng Việt, CODE tiếng Anh;
   sửa `.js` → nhắc Đức reload extension; mỗi fix một test ghim.
5. `evidence/` chỉ THÊM, không sửa, không xoá.
6. **Fix nhỏ không cần audit độc lập** — Đức chốt 02/09
   ([ADR-0009](docs/adr/0009-bo-audit-doc-lap-cho-fix-nho.md)): làm thẳng, gặp bug sửa thẳng.
   **VẪN audit** khi đụng lớp an toàn (`AGENTS.md` gốc mục 3), đường tiêu credit, hay bắt tay
   Bridge. Không đổi: suite xanh · cổng xanh · mỗi fix một test ghim · đẩy bằng `safe-push.mjs`.
   > **Vế này đá với `AGENTS.md` gốc mục 2** (*"với code thì đã qua audit độc lập"*), và ranh
   > giới *"fix nhỏ"* chưa ai chốt câu chữ. **Chờ Đức** — xem mục Hệ quả của ADR-0009.

## Trạng thái mới nhất

- lifecycle: building
- next_step: "Chờ Flow hết quá tải rồi chạy MỘT job — kiểm chứng đầu tiên, và là thứ đưa gói lên active. Job Q001 đã nằm sẵn trong hàng đợi, chưa bấm chạy. Lưu ý tiền: chip đang để x2 mà trang tự khai mỗi video 6 credit, nên nếu runner không tự hạ về x1 thì một job là 12 credit chứ không phải 6."
- human_action: "Mở tab Flow xem thông báo quá tải còn không. Hết rồi thì báo tôi, tôi chạy một job. Còn thì chờ — máy sẽ tự dừng trước khi gõ nên không mất credit, nhưng cũng không chạy được gì. @Đức:bấm"
