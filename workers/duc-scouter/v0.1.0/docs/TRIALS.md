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
   Luật gốc: [ADR-0009](../../../../docs/adr/0007-scouter.md) mục ⑵.

## Đã thử

| Trang | Ngày | Thử gì | Kết quả | Dạy seed được gì |
|---|---|---|---|---|
| Trang tự dựng (thư mục tạm) | 06/09 | Cú bấm của máy có được trang coi là thật không | **ĐẠT** — `isTrusted: true` qua `chrome.debugger`; `element.click()` thì không | Đóng luôn hướng `element.click()`. Ba worker cũ đang dùng cách đó |
| Trang tự dựng (thư mục tạm) | 07/09 | Chính lõi hành động của Scouter, bấm–gõ trên trang thật | **ĐẠT 11/11** trên Chrome 152, kể cả ca phải cuộn 1288px hai chiều | Hai hệ toạ độ không lệch. **Chưa đo:** trang có khung lồng · trang đổi tỉ lệ hiển thị |
| `hnx.vn` — kết quả giao dịch phái sinh | 07/09 | Dữ liệu nằm ở đâu, gọi bằng tham số nào | **Đo xong hợp đồng trang.** Bảy tham số đọc thẳng từ mã trang; một ngày ~46 KB (KHÔNG phải 231 KB như ghi lần trước) | ⑴ Có trang **không cần bấm nút nào** → `scout.fetch` là năng lực chính, không phải bấm–gõ. ⑵ **200 OK không chứng minh gì**: ngày nghỉ cũng 200 + JSON hợp lệ, chỉ khác ở chỗ 0 ô dữ liệu (đo: 192 với 0). ⑶ Sai tham số ra **một trang HTML**, không ra lỗi |
| `hnx.vn` — tầng vận chuyển | 07/09 | Vì sao Node không với tới được | Máy chủ gửi **thiếu mắt xích chứng chỉ** (chỉ leaf). Chrome tự lấy qua AIA, Node ném `UNABLE_TO_VERIFY_LEAF_SIGNATURE` | Một lý do nữa để pilot chạy **qua Scouter chứ không qua script Node**. Và đừng bao giờ vá bằng cách tắt kiểm chứng chỉ — lấy đúng mắt xích thiếu thì kiểm vẫn tử tế |
| `hnx.vn` — điều hướng | 07/09 | Bộ tải tĩnh có tìm ra trang không | **Không.** Menu dựng bằng JavaScript; `cau-truc-website.html` trả 16 liên kết, không có cái nào dẫn tới trang kết quả | **Tìm ra trang** cần Chrome; **lấy dữ liệu** thì không. Hai bài toán khác nhau, và lẫn chúng là chọn sai công cụ |

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
