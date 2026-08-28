# FLOW-04 — Bổ sung kiểm tra live tài khoản hết credit (2026-08-28)

## Kết quả đo

Bản Extension mới đã nhận đúng selector thật `add_2 Create`. Runner chạy đúng một job qua
`jobs.add` → `run.trial`, bấm Create đúng một lần và ghi `PROMPT_SUBMITTED` đúng một lần.

Sau submit:

- 60 lần poll trong 300 giây không thấy video ID mới;
- số video giữ nguyên 7;
- không thấy lại nút `Upgrade` và `generationLimitBlocker` vẫn là `null`;
- không retry, không gửi job thứ hai, không đổi tài khoản;
- sau khi timeout chuyển sang reconcile mà vẫn chưa tự kết thúc, operator gọi `run.stop` để
  đóng fail-closed; checkpoint cuối là `v02`, job `FAILED / USER_STOP`, pha `SUBMITTED`.

## Ranh giới kết luận

Lần đo trước đã chứng minh trực tiếp biến thể hết credit: sau khi gõ, `Create` biến mất và
hai nút enabled có text chính xác `Upgrade` xuất hiện. Matcher mới được viết đúng theo bằng
chứng đó và có test ghim.

Lần retry này **không tái hiện biến thể `Upgrade`**. Nó cho thấy một hành vi khác: Flow nhận
Create nhưng không sinh video trong 300 giây và không để lại blocker quota nhìn thấy được.
Không được tự gán `NO_NEW_VIDEO` thành hết credit vì cùng triệu chứng có thể do high demand
hoặc lỗi provider. Luật đúng vẫn là: hậu-submit không chắc chắn thì dừng, không auto-retry.

## Bằng chứng

- `F4-credit-limit-final-live-outcome-20260828.json`
- `F4-credit-limit-behavior-20260828.md` — lần đo `Upgrade` trực tiếp trước đó
- `F4-credit-limit-final-live-verify-jobs-add-params-20260828.json`
- `F4-credit-limit-final-live-verify-run-trial-params-20260828.json`

