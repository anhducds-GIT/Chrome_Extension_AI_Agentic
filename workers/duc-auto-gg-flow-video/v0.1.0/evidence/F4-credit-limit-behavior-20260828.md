# FLOW-04 — Hành vi hết credit của Google Flow (2026-08-28)

## Sự thật đo trực tiếp

Một job duy nhất được chạy qua đúng đường `jobs.add` → `run.trial`, với
`max_retries=0`. Trước khi gõ, Flow có nút `Create`. Sau khi runner gõ prompt trên tài
khoản hết credit:

- `Create` biến mất;
- xuất hiện **2 nút hiển thị, enabled, text chính xác `Upgrade`**;
- không có `PROMPT_SUBMITTED` trong audit log;
- ledger ghi `attempt_count=1`, `retry_count=0`, pha `PRE_SUBMIT`;
- không đổi tài khoản, không bypass, không gửi lại job.

Bản runtime cũ chưa biết mẫu này nên báo sai thành lỗi DOM chung
`Send button did not become ready`. Probe cũ cũng trả `generationLimitBlocker=null`.

## Hành vi runner đã ghim sau sửa

Provider Flow nhận `Upgrade` là tường hết credit chỉ khi nút đó hiển thị, enabled và
nút `Create` không sẵn sàng. Khi đó runner trả `LIMIT_STOP`, được phân loại thành
`GENERATION_LIMIT_REACHED`, dừng trước click và không retry.

Test còn ghim hai lá chắn chống nhận nhầm:

- prompt do người dùng viết có chữ `Upgrade` không được coi là hết credit;
- nếu không có cả `Create` lẫn `Upgrade`, runner vẫn báo lỗi DOM fail-closed, không giả
  thành lỗi credit.

Live verification của matcher mới cần Đức reload Extension; file này không tuyên bố matcher
mới đã chạy live trước bước reload đó.

## Bằng chứng kèm theo

- `F4-credit-limit-live-responses-20260828.json`
- `F4-credit-limit-audit-extract-20260828.json`
- `F4-credit-limit-verify-jobs-add-params-20260828.json`
- `F4-credit-limit-verify-run-trial-params-20260828.json`
