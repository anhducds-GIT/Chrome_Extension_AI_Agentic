---
status: Accepted
adr: 0048
date: 2026-09-06
deciders: Đức
nhom: bridge-va-thuc-thi
---

# ADR-0048 — `run.trial` gọi khi chưa nạp workbook là lỗi agent ĐƯỢC thử lại

## Bối cảnh

`B-11`, đo 2026-08-26 và đo lại 2026-09-06. Gọi `run.trial` khi chưa nạp workbook thì
`authoritativeValidate()` ném `"Open an XLSX workbook first."` dưới dạng `Error` **trần**.
`bridgeError()` giặt nó thành `INTERNAL_ERROR` / `retryable: false`, và nguyên nhân thật chỉ
hiện trong `details.debug` — mà `details.debug` chỉ có khi Chế độ phát triển đang BẬT.

Cùng gốc với `B-16` một nửa (cùng chỗ giặt trắng), nhưng không đóng được bằng cùng một dòng
bảng: câu của `B-11` **không mang tiền tố mã** nào để `PREPARE_VALIDATION_GUIDANCE` nhận ra,
và thứ `B-11` cần là đổi `retryable` — thứ `B-16` cố ý không đụng tới. Đổi `retryable` là
chạm luật retry, mà `AGENTS.md` gốc mục 2 bắt hỏi Đức trước.

## Quyết định

Đức chốt 2026-09-06: gọi `run.trial` khi chưa nạp workbook thì agent **được phép thử lại** —
`WORKBOOK_NOT_LOADED` / `retryable: true`, đúng như `run.status` đang làm.

Lý do Đức chốt vậy: đây là điều kiện **người sửa được trong năm giây** (mở workbook), nên
bắt agent chết hẳn là vô lý.

Hiện thực: một lời gọi `requireBridgeWorkbook()` — helper đã có sẵn trong panel — đặt ngay
**trước** `authoritativeValidate()` trong `bridgeRunTrial()`. `WORKBOOK_NOT_LOADED` vốn đã
khai `retryable: true` trong `ERROR_DEFINITIONS`, nên không có mã mới và không có luật mới.

## Hệ quả

- Agent qua Bridge nhận đúng mã và tự biết là thử lại được, không cần Chế độ phát triển và
  không cần đoán.
- Câu chữ người vận hành thấy ở nút Chạy của panel **không đổi**: `authoritativeValidate()`
  vẫn ném nguyên câu tiếng Anh cũ. Cố ý vá ở chỗ gọi của Bridge chứ không ở chỗ ném, để
  không gắn mã máy vào câu người đọc.
- Đặt **sau** `bindRunTab(await resolveWorkspaceTab(call))`, không phải trước: cửa lease của
  phiên-theo-tab (ADR-0046) phải được trả lời trước, vì một lời gọi trên tab đã đổi chủ thì
  câu đúng là câu về lease. Cái giá: một lời gọi thiếu workbook vẫn chiếm khoá run rồi nhả
  ngay trong `finally`. Không có tác dụng phụ còn lại.
- Ghim: `tests/run-trial-workbook-not-loaded-smoke.mjs`, chạy chính hàm `bridgeRunTrial()` đã
  ship trong `node:vm`. Nó ghim cả mép ngược (có workbook thì không được chặn oan) và bắt
  được cả bản vá "còn nguyên chữ mà dời xuống sau `authoritativeValidate()`". 2/2 đột biến đỏ.

## Trạng thái

Accepted
