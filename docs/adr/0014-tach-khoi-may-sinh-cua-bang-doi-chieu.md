---
status: Accepted
adr: 0014
decides: [0014]
last_reviewed: 2026-09-09
date: 2026-09-07
deciders: Đức
---

# ADR-0014 — Tách khối máy sinh của `FEATURE-PARITY.md` ra file riêng, miễn khoá

## Bối cảnh

Ngày 05/09 hai lane độc lập — `claude-gpt-no` và `claude-flow-no` — cùng làm xong, cổng đóng
phiên gần xanh, và **cả hai bị cổng xuất bản từ chối** vì `FEATURE-PARITY.md` lạc hậu so với
HEAD. Cả hai **không tự sửa được**: file đó nằm ở gốc repo nên cần `_root`, mà `_root` đang do
một lane **thứ ba** giữ. Hai lane không hề chạm gốc repo vẫn bị chặn bởi một lane không liên
quan.

Đây là khoá chéo, không phải xui. Ba điều kiện đúng riêng lẻ, ghép lại thành một cửa mà người
bị chặn không có đường tự mở:

1. Cổng xuất bản đòi **mọi** artifact máy sinh phải tươi.
2. `FEATURE-PARITY.md` **cố ý KHÔNG** nằm trong danh sách miễn khoá — vì mục 2 của nó là chữ
   của người, viết tay, có bằng chứng, và một lượt sinh máy đè lên đó là mất chữ thật.
3. Artifact đó lạc hậu **do commit của lane khác**, không phải do lane bị chặn.

Bốn artifact kia (`DASHBOARD.md` · `llms.txt` · `repo-map.json` · bảng HTML) đã được miễn khoá
từ 03/09 **đúng vì lý do này**. `FEATURE-PARITY.md` bị bỏ lại vì nó **trộn** chữ người và số máy
trong cùng một file.

Đêm 06–07/09 điều kiện ⑶ thành chuyện thường trực: bốn lane chạy song song, mỗi lane sửa code
trong một gói, và **sửa code trong bất kỳ gói nào cũng làm bảng đối chiếu lệch**. Mục `N-18` ghi
lại đúng vòng lặp đó.

Đức chốt 07/09: tách.

## Quyết định

**Khối máy sinh của `FEATURE-PARITY.md` ra một file riêng, và file đó vào danh sách miễn khoá.
Mục 2 — chữ của người — ở lại `FEATURE-PARITY.md` và vẫn đòi `_root`.**

- Ranh giới đã có sẵn và không phải phát minh: hai mốc `<!-- AUTO:X START -->` /
  `<!-- AUTO:X END -->` đang đánh dấu đúng phần máy sinh (mục 1 · mục 3 · nợ *method* ở mục 4).
- File mới khai vào khối `generated` của `.repo-structure.json`, cùng chỗ với bốn artifact kia.
  **Khai ở đó, đừng gõ cứng tên file vào script** — luật này đã trả giá một lần: trước 04/09
  danh sách miễn trừ bị gõ cứng ở hai chỗ và hai bản sao trả hai câu khác nhau cho cùng một file.
- `FEATURE-PARITY.md` giữ một **con trỏ** sang file mới, ngay chỗ khối AUTO từng nằm. Không có
  con trỏ thì người đọc mục 2 tưởng số liệu biến mất.
- Luật cũ **không đổi một chữ**: máy vẫn bị cấm đụng mục 2, và dòng nào cũng vẫn phải khai được
  xác lập bằng cách nào (**[ĐO]** · **[ĐỌC]** · **[DÒ]**).

## Hệ quả

**Được.** Một lane sửa code trong gói của mình **tự sinh lại được** phần máy sinh và đẩy, không
cần xin `_root`, không cần chờ lane thứ ba. Đây là thứ mở khoá cho mô hình nhiều lane chạy song
song — và đo được: đêm 06–07/09 có **bốn** lane cùng chạy, mỗi lane đều chạm ít nhất một gói.

**Mất — nói thẳng, vì nó là cái giá thật.** Thêm một file, và người đọc phải nhìn **hai chỗ**.
Với Đức đó là một bước nữa. Con trỏ ở mục trên là để trả cái giá đó, không phải để xoá nó.

**Chỗ dễ làm sai, ghi ra để lượt sau đừng vấp:**

- **Đừng chép khối AUTO sang file mới rồi để bản cũ nằm lại.** Hai bản của cùng một số là hai
  nguồn sự thật, và repo này đã có ca một luật nằm ở hai chỗ trả hai câu khác nhau. Bản trong
  `FEATURE-PARITY.md` phải **biến mất**, chỉ còn con trỏ.
- **Bộ sinh phải deterministic.** Hai lượt chạy trên cùng HEAD ra **giống hệt từng byte**, và
  **không phụ thuộc đồng hồ hệ thống** — nếu không thì sang ngày mới là mọi lane bị chặn đẩy dù
  không dữ liệu nào đổi. Mục `N-10` của `claude-flow-active` đã bắt đúng bệnh đó ở một artifact
  khác.
- **Phép ghim phải canh cả hai chiều:** file mới lạc hậu thì cổng ĐỎ · máy ghi vào mục 2 thì ĐỎ.
  Vế thứ hai mới là vế bảo vệ chữ của người, và nó là lý do duy nhất khiến việc tách này khác
  với "miễn khoá cả file".

## Trạng thái

Accepted
