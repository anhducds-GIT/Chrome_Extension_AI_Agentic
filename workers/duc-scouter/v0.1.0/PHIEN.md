# PHIÊN — duc-scouter

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

## Luật riêng của gói duc-scouter

> Luật chung ở lõi (in ngay trên) và [`_shared/AGENTS.md`](../../_shared/AGENTS.md) —
> **đừng chép lại đây.**

1. **Selector KHÔNG BAO GIỜ được gõ vào seed.** Thấy mình đang gõ một selector vào một file
   trong gói này thì dừng lại — đó là chỗ ranh giới seed/adapter chết. Năng lực vào seed, hiểu
   biết về một trang cụ thể vào adapter.
2. **Đừng clone seed rồi sửa bản clone** ([ADR-0006](../../../docs/adr/0001-ranh-gioi-bo-khung.md)).
   Adapter sửa ra thứ **không riêng của trang nào** thì thứ đó phải được đưa lên seed.
3. **ĐƯỢC ghi ghi chép xuống đĩa** — [ADR-0016](../../../docs/adr/0007-scouter.md), Đức chốt 07/09:
   Scouter là **bộ đồ nghề dựng extension**, không phải extension chạy sản xuất. Nó gỡ chặn về
   *ghi*, **không** gỡ chặn về *chạy ở đâu* — trang thật vẫn phải hỏi Đức (trang thử tự tạo thì
   được), và ba giới hạn ở lõi vẫn nguyên.
4. **Từ vựng cố định.** Cửa Bridge nhận một bộ tên method đóng, không bao giờ nhận biểu thức tự
   do từ ngoài dây. Thêm một method là **đổi luật an toàn** → hỏi Đức.
5. **Quyền đã duyệt là TRẦN, không phải sàn** ([ADR-0001](docs/adr/0001-phanh-cho-duong-ghi-va-quyen-alarms.md)
   · [ADR-0002](docs/adr/0002-vo-giao-dien-la-bang-ben-khong-phai-popup.md)). Khai trong
   `manifest.json` **đúng thứ đang dùng**, đừng khai trước; **`downloads` thì KHÔNG** — file đi qua
   Bridge. Xin ra ngoài danh sách đã duyệt thì **hỏi Đức**. Con `Q1` `Q2` canh dòng đó.
6. **Đọc và GHI đi qua hai lõi khác nhau, và đừng gộp chúng.** `scripts/observer-probes.mjs`
   chứng minh được là read-only vì kênh ghi **không có mặt trong file đó** — không phải vì ai
   hứa. Muốn Scouter làm được một việc mới có tính GHI thì thêm vào `scouter-actions-core.mjs`
   với danh sách method riêng của nó. Thêm `Input.*` vào lõi đọc là làm yếu một lớp bảo vệ
   đang có (luật vàng 3 của repo), và hai con `M1` `M2` sẽ ĐỎ đúng lúc đó.
7. **Toạ độ không bao giờ nhận từ ngoài dây.** Mọi lượt bấm suy toạ độ từ hộp của đúng phần tử
   đã khớp, và selector phải khớp **đúng một**. Đây là chốt đắt nhất của gói; con `H4` và `H5`
   canh nó.
8. **Đường ghi ĐÓNG MẶC ĐỊNH; phanh chỉ mở được bằng tay người.** Công tắc ở bảng bên và **không
   method Bridge nào bật được nó**. Trần 200 lượt mỗi lần mở khoá, gõ cứng trong mã. Hai chỗ
   **đừng đảo lại** dù trông thừa: **hỏng thì ĐÓNG** (đọc không ra công tắc ≠ được bấm) và **trừ
   trước, bấm sau** (lượt bấm hỏng vẫn tốn ngân sách). `P1..P12` canh khối này; lý do đầy đủ ở
   [ADR-0001](docs/adr/0001-phanh-cho-duong-ghi-va-quyen-alarms.md).

## Trạng thái mới nhất

- lifecycle: building
- next_step: "Mo CHUOI-VIEC.md, doc khoi Luat cua chuoi roi nhay THANG toi T11 — dung doc ca file. T11 chen len dau vi luot chay T7 do duoc: scout.type tra typed:8 ma o nhap van RONG, scout.click tra hit:descendant ma tay nghe cua trang KHONG chay (S-22). Duong ghi bao DAT cho viec chua xay ra, va moi viec con lai deu dung tren no. Ban do da dung san o pilots/trang-thu-cham/ — chay lai bang mot lenh, dung dung lai tu dau."
- human_action: "@Duc:bam T11 ton 10 giay — dua cua so Chrome cua ghe Udin_Scout ra TRUOC man hinh roi bao mot tieng. Do la phep thu re nhat de biet duong ghi hong co phai vi cua so dang khuat. @Duc:bam D2 con mot nua — The He thong, khoi Ho so ghe, go cho ghe THU HAI mot ten khac Udin_Scout."
