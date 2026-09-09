# Pilot-17 — nghiệm thu ADR-0050 ⒝ và ADR-0051

> Chuyển từ hàng `Bản đồ file` của `AGENTS.md` xuống đây 09/09
> ([ADR-0031](../../../../docs/adr/0031-tran-do-bang-ky-tu.md) ⑷): chuyện của một thư mục bằng chứng
> thuộc về chính thư mục đó, không thuộc file mọi phiên đều nạp.

**Dựng gì.** Workbook 2 job hỏi–đáp **bằng chữ**, cố ý không dùng ảnh — bản vá cần nghiệm thu nằm ở
cổng **TRƯỚC** lúc gửi, nên hạn mức tạo ảnh không liên quan. `delay_min_sec = delay_max_sec = 40`
để có một cửa sổ 40 giây cho người thật đổi hội thoại giữa hai job.
Sinh lại: `node scripts/create-pilot-17.mjs`.

**Kết quả thật — ghi ra để phiên sau không chạy lại.**

1. Lượt này **KHÔNG** kích hoạt được đường tự chữa. Run gắn theo **id của tab**, nên đổi tab Chrome
   không làm nó trôi; muốn kích hoạt thì phải đổi **địa chỉ của chính tab đã gắn**.
2. Lộ ra hai thứ khác: hội thoại thuộc Project bị đọc thành *"không phải hội thoại"* (đã vá cùng
   ngày), và **`B-43`** — job chữ ghi lại một mẩu câu trả lời rồi báo thành công (`BACKLOG.md`).

**Chỉ THÊM.** Không sửa, không xoá, không sinh lại đè lên.
