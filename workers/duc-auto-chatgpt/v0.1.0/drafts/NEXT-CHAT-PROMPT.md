# Prompt mở chat mới — Duc Auto ChatGPT

Cập nhật 2026-08-28. Đức chỉ cần **copy nguyên khối trong ô dưới** và dán vào chat mới.

---

## Prompt để dán

```text
Đọc AGENTS.md ở gốc repo trước. Sau đó đọc workers/duc-auto-chatgpt/v0.1.0/AGENTS.md,
AI-OPERATOR-GUIDE.md, và phần CUỐI HANDOFF.md của package đó.

Claim package workers/duc-auto-chatgpt bằng một nhãn phiên mới trước khi sửa gì.

VIỆC CỦA PHIÊN NÀY — một checkpoint, đóng được:
Khoảng nghỉ giữa hai job bị Chrome bóp. Cấu hình đặt 12–24 giây, đo thật ngày 28/08
mất khoảng 11 phút. Nghi ngờ chính: side panel không ở tiền cảnh nên setTimeout bị
throttle. Với batch 30 job, 20 phút biến thành 5 tiếng rưỡi — đây là thứ đang chặn
Đức chạy batch thật.

Làm theo đúng thứ tự:
1. ĐO trước, đừng vá theo giả thuyết. Xác định thật sự có phải throttling không
   (so panel ở tiền cảnh với panel bị che). Nếu nguyên nhân khác thì dừng và báo Đức.
2. Vá: chuyển đồng hồ chờ giữa job sang chrome.alarms — quyền "alarms" ĐÃ CÓ trong
   manifest, KHÔNG được xin quyền mới.
3. Ghim test cho phần thuần tuý tách được, rồi mutation-test: phá lại bản vá và
   chứng minh test bắt được. Suite xanh không phải bằng chứng.
4. Audit độc lập trước khi báo xong.
5. Chạy lại một pilot nhỏ đo lại con số. Chưa chạy live thì chưa được nói là xong.

KHÔNG làm trong phiên này: B-02, B-14..B-21, B-23, B-24, B-25, B-27. Ghi phát sinh
vào BACKLOG.md, đừng mở rộng phạm vi.

Không thêm permission. Không đổi luật retry/halt/attribution/persistence/exact-once
nếu Đức chưa duyệt. Không commit/push trước khi cổng kiểm xanh và audit độc lập PASS.
Push bằng scripts/safe-push.mjs, tuyệt đối không git push trần.

Trước khi chạy live: tab ChatGPT phải ở sẵn MỘT CUỘC HỘI THOẠI (/c/<id>), không phải
trang chủ — xem lỗi #2 trong AI-OPERATOR-GUIDE.md. Vừa reload extension thì phải nạp
lại content script (chat.reload) — lỗi #1.
```

---

## Bối cảnh ngắn cho Đức (không cần dán)

**Extension đang ở đâu:** dùng được cho việc thật. Chạy prompt text và tự dọn rác
checkpoint đều **đã kiểm chứng trên máy thật**, không chỉ trên giấy.

**Vì sao chọn việc này trước:** nó là thứ duy nhất đang chặn Đức chạy batch dài.
Không phải lỗi logic, không mất dữ liệu — chỉ là chờ. Nhưng 30 job × 11 phút là
5 tiếng rưỡi ngồi không.

**Việc thứ hai, xếp ngay sau:** B-22 — nút Dừng chưa chắc dừng được. Có khe hẹp:
lệnh dừng tới ngay trước khi job bắt đầu sẽ bị xoá và prompt vẫn bay. Bên Gemini đã
vá. Nên làm TRƯỚC khi chạy batch dài thật, vì bấm Dừng không ăn thì tốn lượt và ra
kết quả không mong muốn.

**Chưa nên làm:** pilot 66 job. Chạy bây giờ là ngồi chờ 5 tiếng rồi mới biết.
