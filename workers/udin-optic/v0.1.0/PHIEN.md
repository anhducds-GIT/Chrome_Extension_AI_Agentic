# PHIÊN — udin-optic

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

## Luật riêng của gói udin-optic

**⑴ Từ vựng ĐÓNG ở mười hai lệnh.** `session.hello` · `system.capabilities` · `system.ping` ·
`scout.targets` · `scout.query` · `scout.text` · `scout.wait` · `scout.click` · `scout.type` ·
`scout.clear` · `scout.grab` · `scout.navigate`. Mười hai lệnh còn lại của Scouter phải là lệnh
**KHÔNG TỒN TẠI** (`METHOD_NOT_FOUND`), không phải lệnh tồn tại mà đang bị chặn — cái sau thì bật
lại được bằng một dòng cờ. Thêm một lệnh là **đổi luật an toàn** → phải hỏi Đức.

**⑵ Vùng đích là ĐÚNG MỘT TRANG, và đó là lời hứa lớn nhất của gói.**
`host_permissions` chỉ có `vinfast.udinbv.com` + `127.0.0.1`. Scouter mở `<all_urls>` vì nó dò
trang bất kỳ; gói này không. Nới dòng đó là xoá sạch chỗ hẹp hơn duy nhất khiến việc chép
~2.100 dòng máy bấm/gõ là đáng. `be-mat-hep-smoke.mjs` khối ⑵ canh nó.

**⑶ BẢY TỆP CHÉP PHẢI CÒN GIỐNG SCOUTER.** `scouter-engine.js` · `scouter-probes.mjs` ·
`scouter-actions-core.mjs` · `scouter-seed-core.mjs` · `scouter-transport-loopback.mjs` ·
`scouter-journal-core.mjs` · `bridge/file-core.mjs`. Đó là bộ máy gắn debugger, tổng hợp phím
chuột, và **cái phanh**. Khối ⑷ băm từng tệp và **đỏ khi lệch**. Muốn khác thật thì khai vào
`CO_Y_KHAC` kèm lý do — không có đường thứ ba. Tên tệp **giữ nguyên tiền tố `scouter-`** cố ý:
nó nói ra xuất xứ, và làm phép so byte không cần bảng đổi tên.

**⑷ Bốn tệp CỐ Ý khác và được phép đổi tự do:** `scripts/bridge-core.mjs` (chỗ gói hẹp lại) ·
`manifest.json` · `sidepanel.*` · `background.js`. Đức chốt 15/09 rằng **UI sẽ đổi theo usecase**
— đó là lý do gói này tồn tại, đừng ghim nó lại.

**⑸ Tệp ghép cặp RIÊNG, cổng RIÊNG, giao thức RIÊNG.** `udin-optic.bridge`, sinh bằng
`tao-tep-ghep-cap.mjs --goi udin-optic`. Dùng chung với Scouter thì mọi lượt gọi không nêu đích
trả `TARGET_AMBIGUOUS`; khai lệch tên hai đầu thì "im lặng" — `hnx-fetch` mất một buổi vì đúng
chuyện đó ngày 08/09.

**⑹ Cái phanh không được đụng.** Công tắc mặc định TẮT, trần 200 lượt mỗi lần bật, gõ cứng trong
mã, chỉ tay Đức mở lại được. Phím phanh là `Ctrl+Shift+U` — **khác Scouter cố ý**: hai extension
xin cùng một tổ hợp thì Chrome chỉ trao cho một, và cái mất phím là cái không còn phanh lúc bảng
bên đóng.

## Trạng thái mới nhất

- lifecycle: building
- next_step: "T21 chang (4) — PHEP KIEM THAT: sinh tep ghep cap rieng (node workers/_shared/bridge-host/tao-tep-ghep-cap.mjs --goi udin-optic), bat may chu Bridge cua goi nay, nap workers/udin-optic/v0.1.0 vao Chrome bang Load unpacked, roi chay e2e that voi mot prompt CHUA DUNG BAO GIO. Dong khi 4 chang DAT va `git status workers/duc-scouter` SACH."
- human_action: "Chang (4) can Duc: nap extension moi vao Chrome va bat cong tac Cho phep bam va go o bang ben cua Udin Optic. Chua toi luc — AI se bao khi may chu va tep ghep cap da san sang. @Đức:bấm"
