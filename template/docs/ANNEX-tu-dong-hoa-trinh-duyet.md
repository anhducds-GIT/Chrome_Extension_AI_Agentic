---
kind: annex
nghe: tự động hoá trình duyệt
status: optional
---

# PHỤ LỤC NGHỀ — tự động hoá trình duyệt

> **Tuỳ chọn.** Repo bạn không lái trình duyệt thì **xoá file này** và xoá dòng trỏ tới nó ở
> mục 6 của `AGENTS.md`. Giữ một phụ lục sai nghề còn tệ hơn không có phụ lục: nó dạy phiên AI
> sau tuân luật cho một việc repo này không làm.

Chín luật dưới đây từng nằm trong luật chung của repo sinh ra bộ khung. Chúng **đúng** — mỗi
dòng là một lần trả giá thật — nhưng chỉ đúng với repo lái trình duyệt. Để lẫn vào luật chung
là ép một repo tài liệu tuân luật về selector DOM.

## Phải hỏi chủ repo trước

1. **Thêm quyền (permission) mới cho extension.** Quyền là thứ người dùng cuối nhìn thấy và
   phải đồng ý; thêm âm thầm là đổi hợp đồng với họ.
2. **Chạy pilot live mới trên trang thật.** Chạy thật thì tốn lượt thật và để lại dấu vết thật.

## Luật vàng, bản của nghề này

3. **Không đoán selector.** Mọi selector phải có bằng chứng DOM thật. Cần bằng chứng mới →
   gọi `diagnostics.dom_probe` qua Bridge, đừng mượn mắt chủ repo.
4. **Suite không chạm DOM thật**, nên fixture bằng chứng là vàng: một bản chụp DOM có thật
   đáng giá hơn mười phép kiểm dựng trên DOM tưởng tượng.

## Vùng cấm sửa

5. **`pilot-*/` · `Pilot-*/` · `Batch-*/` · `evidence/`** — bằng chứng vận hành. Chỉ được
   THÊM mới, không sửa, không xoá, không tạo lại.
6. **Không bao giờ gán `.innerHTML` / `.outerHTML` / `insertAdjacentHTML`.** Trang đích là
   nội dung không tin được; gán thẳng HTML là mở cửa cho nó chạy code trong ngữ cảnh của bạn.

## Vai

7. **Vận hành Bridge** thuộc về phiên làm kiến trúc/điều phối, không phải phiên dựng UI.

## Đóng phiên

8. **Gặp lỗi mới trên trang thật** → thêm một dòng vào bảng lỗi của sổ tay vận hành. Trang thật
   đổi mà không báo trước; bảng lỗi là bộ nhớ duy nhất giữa các phiên.
9. **Mỗi lỗi mới trên trang thật cũng là ứng viên cho một phép kiểm máy** — cân nhắc thêm vào
   cổng đóng phiên. Luật nào không kiểm được bằng máy thì sớm muộn cũng bị bỏ qua.
