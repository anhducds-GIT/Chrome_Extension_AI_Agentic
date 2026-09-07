# TRIALS — những trang Scouter đã thử, và học được gì

> **Đây là một cuốn SỔ, không phải hàng rào.** Đức chốt 07/09: *"nhiễm cũng được, chỉ là 1 list
> các trial mà ta đã thử thôi, ko quá khắt khe đâu, trừ khi nó ảnh hưởng quá."*
>
> Viết cho Đức đọc. Mỗi dòng trả lời đúng một câu: **trang này đã thử tới đâu, và nó dạy seed
> được gì.**

## Ba luật của cuốn sổ này

1. **Mỗi dòng phải trỏ về một lượt đã CHẠY THẬT.** Không ghi dự định. Chưa chạy thì chưa có dòng.
2. **Cột "dạy seed được gì" là lý do cuốn sổ tồn tại.** Một trang thử xong mà không dạy được gì
   thì ghi thẳng *"không"* — đó cũng là thông tin, và nó thật hơn một câu chữ nghĩa.
3. **Thứ nào không riêng của trang nào thì đẩy lên seed**, rồi ghi lại ở đây là đã đẩy.
   Luật gốc: [ADR-0009](../../../../docs/adr/0009-scouter-thay-observer-cua-tuong-tac.md) mục ⑵.

## Đã thử

| Trang | Ngày | Thử gì | Kết quả | Dạy seed được gì |
|---|---|---|---|---|
| Trang tự dựng (thư mục tạm) | 06/09 | Cú bấm của máy có được trang coi là thật không | **ĐẠT** — `isTrusted: true` qua `chrome.debugger`; `element.click()` thì không | Đóng luôn hướng `element.click()`. Ba worker cũ đang dùng cách đó |
| Trang tự dựng (thư mục tạm) | 07/09 | Chính lõi hành động của Scouter, bấm–gõ trên trang thật | **ĐẠT 11/11** trên Chrome 152, kể cả ca phải cuộn 1288px hai chiều | Hai hệ toạ độ không lệch. **Chưa đo:** trang có khung lồng · trang đổi tỉ lệ hiển thị |
| `hnx.vn` — hai trang phái sinh | 07/09 | Dữ liệu nằm ở đâu | **Đo xong, chưa lấy.** Không nằm trong trang: tới từ một `POST` trả JSON ~231KB/ngày | ⑴ Có trang **không cần bấm nút nào** → `scout.fetch` là năng lực chính, không phải bấm–gõ. ⑵ Sai tham số thì trả **200 OK kèm một trang HTML khác** — "thành công" không chứng minh "đúng dữ liệu" |

## Chưa thử, và biết là chưa

- **Trang thật của một nhà cung cấp AI** (ChatGPT · Gemini). Ba worker cũ chạy trên đó, Scouter
  thì chưa lần nào.
- **Trang có khung lồng (iframe)** — in ngay trong báo cáo của phép đo ② là chưa đo.
- **Trang đổi tỉ lệ hiển thị** — cùng chỗ.
- **Cả VÒNG tự cải tiến** (dò → AI viết adapter → nạp lại → adapter chạy): từng mảnh đã có, cả
  vòng thì chưa ai khép một lần nào. Đây là việc lớn nhất còn nợ.

## Cái file này KHÔNG làm

Không thay `BACKLOG.md` (nợ gì) · không thay `HANDOFF.md` (hôm đó làm gì) · không thay ADR (Đức
chốt gì). Nó chỉ giữ **một danh sách trang**, thứ ba quyển kia không có chỗ nào để.
