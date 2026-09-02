# Đọc kỹ trước khi dùng hai file F4R7 — một trong hai KHÔNG phải bằng chứng

**`F4R7-probe-BEFORE-trial-20260902.json` là một VỎ LỖI, không phải probe.**
Nội dung nó là `ok:false` + `INTERNAL_ERROR` *"Open the Google Flow project tab as the active
tab."* Tôi (`claude-f18-evidence`) commit nhầm nó dưới tên file probe ở commit `eb86e49`, rồi
ghi đè bằng probe thật — mà `evidence/` là **chỉ thêm**, nên tôi đã khôi phục nguyên trạng và
để nó nằm yên đó, kèm ghi chú này.

**Probe THẬT của lượt đó là `F4R7-probe-vi-locale-r02-20260902.json`.** Đây mới là bằng chứng
DOM của trang Flow giao diện tiếng Việt trên hồ sơ `Bình`, và là nguồn cho hai kết luận:

- URL có đoạn locale: `https://labs.google/fx/vi/tools/flow/project/<id>`
- Nhãn nút bị dịch: `arrow_forward Tạo`, `add_2 Tạo`, `Tác nhân` — trong khi chip cấu hình
  `Video · 360p · 8s crop_16_9 x1` thì **không** bị dịch.

**Bài học, đã có tiền lệ và tôi vẫn mắc lại:** sổ tay `AI-OPERATOR-GUIDE.md` đã cảnh báo đúng
chuyện này — `F1-snapshot-7-high-demand-banner-20260827.json` từng là một vỏ lỗi bị lưu nhầm
thành bằng chứng. **Kiểm `ok:true` TRƯỚC KHI ghi một phản hồi vào `evidence/`.** Vỏ lỗi thì
để ngoài, hoặc đặt tên nói rõ nó là vỏ lỗi.
