# F1 — Tổng kết bằng chứng DOM trang Flow (2026-08-27)

> Mọi kết luận dưới đây có file JSON probe làm gốc (cùng thư mục). Đây là nguồn
> sự thật cho F-02 (viết provider-adapter thật). KHÔNG sửa các file trong thư mục này.

## Vòng đời một lần tạo video (đo thật, không đoán)

| Bước | Tín hiệu DOM | Bằng chứng |
|---|---|---|
| Trang nghỉ | Ô prompt: `div[contenteditable="true"][role="textbox"]` (đúng 1, ~558px, class `sc-1c9f7009-0`); nút gửi: button text `arrow_forward Create`, **disabled khi ô trống** | `F1-snapshot-1-idle-20260827.json`, `F1-snapshot-3-textboxes-20260827.json` |
| Gõ prompt | Editor kiểu Lexical/React: **`beforeinput`+`input` InputEvent** (chiến thuật B) hoặc `execCommand insertText` khi editor đã "ấm" — nút Create sáng lên. **Ghi đè textContent làm chết state** (đo thật: chữ hiện, nút không sáng) | dry_run 15:07:17 (`typing_path: "input_events"`, `create_button: "enabled"`) |
| Bấm Create | `button.click()` trên nút `arrow_forward Create` đang enabled | submit 15:07:42 (`submitted: true, submit_index: 1`) |
| Đang sinh | KHÔNG có progressbar/aria-busy toàn trang, KHÔNG có nút Stop/% trong top-40 button; Create quay lại disabled (ô trống) → tín hiệu "đang sinh" yếu ở tầng DOM tĩnh | `F1-snapshot-5a/5b/5c-during-generation-20260827.json` |
| Xong (~70 giây cho 720p·10s) | **Số thẻ `<video>` tăng** (4→5), video MỚI đứng ĐẦU danh sách; src pattern `https://labs.google/fx/api/trpc/media.getMediaUrlRedirect?name=<hash>`; class `sc-7b689609-2 eibPpl`, nằm trong `button > a > div > span > div` | `F1-snapshot-4-after-video-20260827.json` (4 video nền), `F1-snapshot-6-after-new-video-20260827.json` (5 video, `name=7e084b0` mới) |

## Kết luận cho F-02 (adapter thật)

1. **Completion detection**: đếm `<video>` + so tập id (`name=` hash) trước/sau — không dựa
   progressbar. Video mới prepend đầu danh sách.
2. **Typing**: bắt buộc đường InputEvent/execCommand; cấm mọi ghi đè textContent (đã có
   pin trong `tests/evidence-submit-static.mjs`).
3. **Thời gian**: ~70s/video (720p·10s) — timeout runner nên đặt 180–300s, poll 5s.
4. **Cấu hình sinh video** nằm ở chip `Video · 720p · 10s crop_16_9 x1` (button, mở menu) —
   chưa thăm dò, việc của F-02/F-07.
5. **Ảnh tham chiếu**: `input[type=file][accept="image/*"][multiple]` luôn có mặt ở body —
   chưa thăm dò đường gắn, việc của F-02.
6. Trang là React/Next + styled-components (class `sc-*` DỄ ĐỔI theo build) → selector nên
   bám **text + cấu trúc + thuộc tính bền** (contenteditable/role, accept, src pattern),
   không bám class `sc-*`.

## Sự kiện vận hành đáng nhớ

- Lỗi `ERR_CONNECTION_REFUSED` ws://127.0.0.1:32149 trong Chrome error log = vết cũ lúc
  quy tập thư mục bridge (host chớp tắt); không phải lỗi sống.
- `METHOD_NOT_FOUND` xen kẽ ngay sau ⟳ extension = khe SW cũ/mới thay ca; đợi vài giây
  hoặc kiểm `session.hello` thấy extension_id ổn định là hết.
