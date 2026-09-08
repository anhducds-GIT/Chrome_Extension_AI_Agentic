---
schema: extension-status/v2
id: hnx-fetch
name: HNX Fetch
lifecycle: building
owner: claude-scouter-s06
priority_rank: 1
next_step: "Chạy MỘT lượt lấy dữ liệu thật qua chính extension HNX Fetch, thay vì qua Scouter. Toàn bộ mã đã tách xong và phép ghim xanh, nhưng chưa lượt nào đi qua nó."
human_action: "Nạp extension HNX Fetch vào Chrome bằng Load unpacked — README của gói ghi rõ chọn thư mục nào. Rồi bấm icon, chọn tệp ghép cặp, bật công tắc Cho phép lấy dữ liệu."
version_source: workers/hnx-fetch/v0.1.0/manifest.json
current_focus: "Tách khỏi Scouter xong, đã qua một lượt audit độc lập về cả mã lẫn tài liệu và vá hết. Việc còn lại lớn nhất là nạp vào Chrome rồi chạy thật một lượt qua chính nó."
ref_readme: workers/hnx-fetch/README.md
ref_handoff: workers/hnx-fetch/HANDOFF.md
lam_duoc: "Lấy dữ liệu phái sinh HNX theo ngày: kết quả giao dịch nối vào một tệp CSV duy nhất, và báo cáo PDF tải về thư mục Drive. Gọi mạng bằng chính trình duyệt, nên vào được trang mà Node gọi thẳng thì hỏng chứng chỉ."
khong_lam_duoc: "Không bấm, không gõ, không đọc nội dung trang, không chụp màn hình, không mở tab. Không phải chưa làm — mà là KHÔNG CÓ ĐƯỜNG: manifest không khai debugger, không khai content_scripts, không khai scripting. Cần bấm nút trên một trang thì đó là việc của Duc Scouter."
dung_the_nao: "Bật máy chủ Bridge CỦA GÓI NÀY (kéo thả tệp ghép cặp vào Chay-may-chu-HNX.cmd) — máy chủ của Scouter không dùng được. Mở bảng bên, chọn tệp ghép cặp, bật công tắc Cho phép lấy dữ liệu. Rồi chạy hai lệnh hằng ngày. Chi tiết ở sổ tay."
ref_runbook: workers/hnx-fetch/PROTOCOL.md
ref_backlog: workers/hnx-fetch/BACKLOG.md
---

# HNX Fetch

Extension Chrome cục bộ, lấy dữ liệu phái sinh của Sở Giao dịch Chứng khoán Hà Nội theo ngày.
Tách khỏi `duc-scouter` ngày 08/09 theo chốt của Đức.

## Ý tưởng ban đầu

Đức đã tự tay gom dữ liệu phái sinh HNX vào một thư mục trên Drive từ 07/2026 để làm cơ sở
phân tích. Việc đó lặp lại mỗi ngày và không có gì thú vị. Đức muốn một extension làm thay.

Bản đầu chạy nhờ Scouter — một bộ khung dò trang đa năng. Nhưng Scouter cần quyền `debugger`
để bấm và gõ, mà việc HNX **không bấm gì cả**: dữ liệu tới từ một lượt gọi mạng.

## Mục đích

Lấy hai trang phái sinh HNX (kết quả giao dịch · báo cáo thống kê PDF) về đúng thư mục dữ liệu
của Đức, không làm hỏng thứ đã có, và nói thật khi có gì không khớp. AI vận hành qua Bridge;
phần đối chiếu và kiểm tra tính toàn vẹn là lý do việc này giao cho AI chứ không thành một nút bấm.

## Đã kiểm chứng tới đâu

**Chưa nạp vào Chrome và chạy một lượt thật qua chính extension này** — nói thẳng ra, đừng để
ai suy ra từ chỗ khác. Mã lấy dữ liệu đã chạy thật ngày 08/09, nhưng lúc đó nó đi qua Scouter.

Sau khi tách, phần đã kiểm được:

- **cả sợi dây, qua socket thật**: máy chủ thật ↔ transport thật ↔ lõi thật — bắt tay hai chiều,
  lệnh đi trọn vòng, lệnh không tồn tại bị từ chối, cái phanh chặn thật qua dây, vùng ghi nhốt được
- **suite của gói ĐẠT toàn bộ**, gồm bộ soi tệp SSOT và phép ghim bề mặt hẹp
- **đột biến kiểm: 0 con sống sót** — mọi chốt an toàn đều có phép ghim đứng sau
- **audit độc lập** (Codex, 08/09): 6 lỗi mã + 11 chỗ tài liệu, đã vá hết, mỗi lỗi một phép ghim

Con số cụ thể thì chạy mà lấy, đừng tin dòng này: `node v0.1.0/tests/run-all.mjs` ·
`node v0.1.0/scripts/mutation-check.mjs`.

## Giới hạn đã biết

1. **Chưa nạp vào Chrome lần nào.** Phần Chrome đọc `manifest.json`, vẽ bảng bên, và phím tắt
   phanh khẩn — **không có cách nào đo từ Node**, nên chúng chưa được chứng minh. Đừng suy ra
   từ việc suite xanh.
2. **Không bấm, không gõ, không đọc DOM.** Cố ý. Trang nào cần bấm mới ra dữ liệu thì
   extension này không làm được — đó là việc của Scouter.
3. **Cần máy chủ Bridge đang chạy.** Không có nó thì không lệnh nào đi được.
4. **Công tắc phải do tay Đức bật**, mỗi lần 200 lượt. AI không tự mở khoá được, và đó là chốt
   an toàn cuối cùng chứ không phải phiền toái.
5. **Ghi tệp không đi qua extension** — extension chỉ tải, tiến trình Node mới đặt tệp xuống đĩa.

## Đọc sâu ở đâu

| Cần gì | Mở file |
|---|---|
| Vận hành hằng ngày, đối chiếu, kiểm toàn vẹn, bảng mã lỗi | [`PROTOCOL.md`](../PROTOCOL.md) |
| Cài đặt và chạy lần đầu | [`README.md`](../README.md) |
| Luật của gói, bản đồ file | [`AGENTS.md`](../AGENTS.md) |
| Phiên trước làm tới đâu | [`HANDOFF.md`](../HANDOFF.md) |
| Việc còn nợ | [`BACKLOG.md`](../BACKLOG.md) |
