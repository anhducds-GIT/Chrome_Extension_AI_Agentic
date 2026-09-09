# PHIÊN — duc-auto-gemini

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

## Luật riêng của gói duc-auto-gemini

> **Mục này CỐ Ý gần giống gói ChatGPT — đừng gộp.** Lý lẽ đầy đủ, kèm ba chỗ phép ③ đã bắt
> được ở chính nhánh này: [ADR-0032](../../../docs/adr/0032-ba-goi-giu-luat-rieng-gan-giong-nhau.md).

1. **Bốn luật ⑴–⑷ cũ nay nằm ở lõi dùng chung** (`workers/_shared/LUAT-CORE.md`): bằng chứng chỉ
   THÊM · cấm `.innerHTML`/`.outerHTML`/`insertAdjacentHTML` · chữ operator tiếng Việt, mã lỗi
   tiếng Anh · bốn điều kiện commit. **Đừng chép lại đây.** Phần riêng của gói này:
   `tests/artifact-integrity-smoke.mjs` chặn build nếu có HTML ghép chuỗi; chữ operator ở
   `operator-messages-core.js` và `halt-instructions-core.js`; **không phép kiểm bảo mật nào được
   assert vào câu chữ hiển thị** — chỉ assert vào logic/wiring.
2. **Agent Bridge: `run.start` / `run.pause` / `run.resume` không tồn tại và
   sẽ không bao giờ được thêm vào mà không có quyết định mới, ghi lại trong
   `decisions.md`.** Bridge là ingress + observability, không phải remote
   execution. Side panel luôn là executor duy nhất; đóng panel → mọi lệnh
   Bridge liên quan Queue/workbook trả `EXECUTOR_UNAVAILABLE`, không có runner
   nền nào thay thế. *Ngoại lệ DUY NHẤT, và nó **tiêu credit thật**:* method **`run.trial`**
   ([ADR-0027](docs/adr/0027-ai-duoc-tu-khoi-dong-trial-run-qua-bridge-trong.md)) với **bốn nắp
   cứng** — dev-toggle BẬT · ≤ 30 job một chuỗi
   ([ADR-0032](docs/adr/0032-tran-chuoi-trial-10-30-job-10-job-van-la-it.md)) · hai trial cách
   nhau ≥ 5 phút ([ADR-0028](docs/adr/0028-bo-tran-6-trial-gio-thay-bang-hai-trial-lien-tiep.md))
   · một trial là một chuỗi liên tục
   ([ADR-0031](docs/adr/0031-bo-tran-2-job-trial-mot-trial-chay-lien-tuc-ca.md)). Con số thật ở
   `MAX_TRIAL_JOBS` trong `dev-trial-core.js`. **`run.start` cấm vĩnh viễn.**
3. **Ba luật chung cho mọi extension ở [`workers/_shared/AGENTS.md`](../../_shared/AGENTS.md)** —
   *không làm yếu lớp bảo vệ đã có* · *sửa `.js` thì nhắc Đức reload* · *preview pane cấm, harness
   Chrome thật thì được*. **Đừng chép lại đây**: bản chép ở nhánh này từng dạy một luật đã chết 16 ngày.

## Trạng thái mới nhất

- lifecycle: active
- last_verified: 2026-09-07
- next_step: "Gói này chỉ còn BA việc mở, và không việc nào AI làm tiếp được. Hai việc chờ Đức bấm — và gộp được vào MỘT lượt chạy: bấm dừng giữa chừng (sau lệnh dừng không prompt nào được bay đi nữa), rồi bấm sang tab khác giữa chừng (prompt phải vẫn vào tab đã khoá). Cả hai đã vá tĩnh và có phép kiểm tái hiện, chỉ thiếu một lượt nghiệm thu thật. Việc thứ ba (gộp BẢY module còn giống hệt nhau sang thư mục chung — đo lại 07/09, không phải tám: cái thứ tám đã trôi dạt 28/08) cần khoá gốc repo nên không thuộc gói này. Trôi dạt tiếp thì nay có chuông: phép ghim `tests/shared-modules-no-drift-static.mjs`."
- human_action: "Trên MỘT hồ sơ Chrome, cần đủ BỐN thứ — đo 07/09 thấy chưa hồ sơ nào đủ, nên lượt nghiệm thu chưa chạy được: ⑴ nạp lại tiện ích ở chrome://extensions ⑵ mở tab gemini.google.com/app và để nó là tab đang hoạt động ⑶ mở side panel ⑷ bật công tắc Chế độ phát triển. Xong bốn cái đó thì chạy MỘT lượt thật và làm hai việc giữa chừng: bấm Dừng, và bấm sang tab khác — một lượt đó nghiệm thu cả hai mục P1 còn lại của gói."
