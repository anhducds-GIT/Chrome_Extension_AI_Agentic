---
status: Accepted
adr: 0049
date: 2026-09-06
deciders: Đức
nhom: du-lieu-va-bang-chung
---

# ADR-0049 — Lưu bền thư mục đã cấp quyền, thay cho mặc định Chrome Downloads

## Bối cảnh

`B-36`: mọi mutation Bridge chết khi đích ghi rơi về Chrome Downloads. Ba phép đo ngày 06/09,
tất cả 0 credit:

1. Console service worker: `URL.createObjectURL is not a function`. Service worker của MV3 không
   tạo được blob URL, nên hướng "tạo blob trong service worker" là **bất khả**.
2. Console side panel, không trồng phiếu giữ tên: tên xin `B36-probe-panel__audit.jsonl`, Chrome
   đặt `05a491ce-…`. Phép đo này **bị nhiễu** — nó rơi vào nhánh `suggest()` trần đã biết từ
   04/09; đóng góp duy nhất là mẫu GUID thứ ba.
3. **Phép đo quyết định** — đi bằng `DAC_DOWNLOAD_ARTIFACT`, đúng đường mọi mutation Bridge đi,
   có trồng phiếu: `requested_filename: "B36-probe-ticket__audit.jsonl"` ·
   `filename: "…\Downloads\d31c629e-39e1-4a96-ae61-dde336b91792"` · `persisted_bytes: 22` ·
   `ok: true`. Nội dung file **đúng nguyên vẹn**; chỉ cái tên bị Chrome đặt.

Nên: **Chrome Downloads không đặt tên nổi artifact của gói này**, đo trực tiếp chứ không suy
(kết luận 04/09 suy từ phiếu-đã-bị-tiêu). Ảnh hưởng cả ba loại đầu ra — `.png`, checkpoint
`.xlsx`, sổ audit — 36 file tên-GUID trong máy Đức, rải từ 09/07.

Ràng buộc thứ hai, đo được cùng ngày và nó mới là chỗ quyết định: **thư mục đã cấp quyền KHÔNG
được lưu bền.** `showDirectoryPicker` gọi ở `sidepanel.js:4207/4231/4335`, không chỗ nào lưu
handle vào IndexedDB. Đóng panel là mất quyền, Đức phải chọn lại. **Đó chính là lý do mặc định
Downloads tồn tại** (quyết định của Đức 25/08, ADR cũ) — nó không phải sự lơ là, nó là cách duy
nhất để AI tự dựng được phiên khi không có thư mục nào sống sót qua lần mở panel trước.

Bốn phương án đã trình Đức kèm được/mất từng cái: (A) bootstrap chưa ghi ra file cho tới khi có
thư mục thật · (B) bootstrap từ chối, bắt chọn thư mục trước · (C) thôi kiểm tên, chấp nhận GUID
· (D) lưu bền handle thư mục.

## Quyết định

Làm **(D)**: lưu bền handle thư mục đã cấp quyền, và kèm **(A)** làm miếng nhỏ cho ca chưa có
thư mục nào.

Tiêu chí Đức nêu, nguyên văn: *"phương án nào thì có thể làm cho AI prompt code làm việc smoothly
và xuyên suốt với ChatGPT thì tôi sẽ làm phương án đó."* Đức uỷ quyền chọn theo đúng tiêu chí đó.

Chiếu tiêu chí lên bốn phương án:

- **(B) trái tiêu chí** — AI mất quyền tự dựng phiên, Đức bấm mỗi lần mở panel.
- **(C) bị loại** — bằng chứng vận hành mất tên là bằng chứng không tra được; 36 file GUID là
  hậu quả của đúng cái đó.
- **(A) một mình là trơn GIẢ** — nó mở cửa bootstrap, nhưng AI vẫn ghi vào chỗ không đặt tên nổi,
  nên nó chỉ đẩy chỗ vấp ra xa hơn: vấp lại ở ảnh, ở checkpoint, ở lần xả sổ đầu tiên.
- **(D) là đường duy nhất** cho AI làm việc xuyên suốt: đường ghi đặt tên đúng **đã có và đã đo
  là chạy** (`checkpoint.verified: true`, 04/09); cái thiếu chỉ là giữ được quyền qua các lần mở
  panel.

## Hệ quả

**Được:** Đức bấm một lần chọn thư mục, từ đó AI dựng phiên · thêm job · chạy · lưu kết quả với
tên đúng, không cần tay Đức. Chrome Downloads thôi cần thiết cho artifact, nên `B-36` không còn
chỗ để xảy ra — chữa gốc, không phải chặn triệu chứng.

**Mất, ghi thẳng:**

1. **Không phải "một cú bấm mãi mãi".** Sau khi khởi động lại máy, Chrome có thể xin xác nhận
   lại quyền (`requestPermission` cần cử chỉ người dùng). Chính xác là *một cú bấm mỗi lần khởi
   động lại máy*, và đó là **trần cứng của trình duyệt**, không nới được bằng mã. Ai hứa hơn thế
   là hứa quá.
2. **Mặc định bootstrap của Đức 25/08 bị thay.** Nó không bị xoá — (A) giữ lại tinh thần "phiên
   mới vẫn dựng được", chỉ bỏ phần "mặc định về Downloads".
3. **Thêm một lớp lưu trữ** (IndexedDB giữ handle) — thêm chỗ có thể hỏng, và thêm một trạng thái
   sống ngoài repo. Cần phép ghim cho ca handle còn đó mà quyền đã mất.
4. **(A) có cái giá riêng phải nói cho AI vận hành:** sổ audit chưa xả ra file thì không sống qua
   việc đóng panel. Không được im chuyện này — luật "ghi sổ trước khi có tác dụng" vẫn giữ (sổ
   VẪN được ghi, chỉ chậm ra *file*), nhưng độ bền thì thấp hơn cho tới lần xả đầu tiên.
5. **(D) là việc thật, cần brief riêng và audit riêng.** Làm (A) trước để mở đường thì hợp lý;
   nhưng (A) **không được đọc thành đã sửa B-36**.

## Trạng thái

Accepted
