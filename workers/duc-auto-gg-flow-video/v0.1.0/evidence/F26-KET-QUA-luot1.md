# F-26 lượt live đầu: hỏng, 0 credit — và nó chỉ ra đúng chỗ sai. 02/09 14:18

> Hồ sơ `Bình`, khởi đầu ở **chế độ Image**, chip **x3**. Một job.
> **Credit tiêu: 0.** Bằng chứng: `F26-ledger-after-trial-20260902.json`.

## Hai kết quả, một tốt một xấu

**TỐT — nửa sau của F-14 chứng minh được.** Sổ cái ghi
`output_chip.label_before: "Video · 360p · 8s crop_16_9 x3"` — nhãn **Video**. Nghĩa là:

1. Bản vá F-11 **nhận đúng** nhãn Image biến thể (`🍌 Nano Banana 2 Lite crop_16_9 x3`), thay vì
   trả `unknown` như bản cũ.
2. `pressFlowControl` bấm được tuỳ chọn `videocam Video` và **mode ĐÃ CHUYỂN** từ Image sang Video.

Đó là điều F-14 treo từ 28/08 và chưa ai chứng minh: **đường chuyển mode tự động được.**

**XẤU — F-26 không sửa được chip:** `count_before: 3` → `count_after: 3`, `fixed: false`.
Fail-closed đúng: chưa gõ (`typing_path: undefined`), không video, **0 credit**.

## Chẩn đoán, bằng hai phép đo chứ không bằng suy luận

Sổ cái lượt đó **không nói được** hỏng ở đâu — `fix_attempted: true` chỉ nghĩa "chip khác x1",
không nói tôi có tìm thấy nút hay không. Nên tôi chạy `diagnostics.mode_probe` (0 credit) ngay
sau đó:

```
opened: false        (lần trước, khi chip x1: opened: true)
appeared_labels: []  (lần trước: 17 nhãn)
```

Ghép hai phép đo lại thì rõ: **sau khi chuyển mode, bảng cấu hình VẪN ĐANG MỞ.**

Diễn biến thật của lượt hỏng:

1. `ensureFlowVideoMode`: mode Image → bấm chip → bảng **mở**
2. bấm `videocam Video` → mode chuyển; **bảng vẫn mở**
3. `trySetSingleOutput` giả định bảng đang đóng → bấm chip để "mở" → cú bấm đó **ĐÓNG** bảng
4. tìm `x1` → không thấy (bảng đã đóng) → `option_found` sai
5. bấm chip lần nữa để "đóng" → thực ra **MỞ** ra, và **để bảng mở** cho lệnh sau
6. đọc chip → vẫn x3 → `fixed: false`

`mode_probe` chạy sau đó bấm chip → **đóng** cái bảng đang mở → `opened: false`. Khớp hoàn toàn.

## Sai của tôi: giả định trạng thái thay vì đo nó

`pressFlowControl` trên chip là một **công tắc bật/tắt**, không phải "mở". Viết code bấm nó mà
không biết bảng đang ở trạng thái nào là tung xúc xắc.

**Đã vá:**

- Thêm `settingsPanelOpen(root)` — đo bằng sự có mặt của bốn nút `x1`…`x4`, thứ **chỉ tồn tại
  khi bảng mở** (bằng chứng: 17 nhãn trong `F14-mode-probe-vi-20260902.json`).
- `trySetSingleOutput` nay **đo trước, chỉ bấm khi cần**, và **trả bảng về đúng trạng thái ban
  đầu**: mở sẵn thì để mở, mình mở ra thì mình đóng.
- Sổ cái nay ghi thêm các bước trung gian: `panel_was_open`, `option_found`, `option_pressed`,
  `panel_restored`. Lượt hỏng đầu tiên không phân biệt được "không tìm thấy nút" với "bấm rồi
  mà không ăn" — một chẩn đoán không phân biệt được hai thứ đó thì không dẫn ai tới đâu.
- **Harness test cũng sai theo cùng một kiểu:** nó chỉ hiện nút `x{n}` khi kịch bản khai
  `offerOutputX1`, nên bộ dò trạng thái bị mù. Trang thật **luôn** lộ cả bốn nút khi bảng mở.
  Đã sửa harness cho giống thực tế.

**Đo:** suite 94/94 · mutation **5/5**, gồm một đột biến dựng lại **đúng lỗi vừa gặp**
(quay lại giả định bảng đang đóng).

## Còn lại

Cần reload rồi chạy lại một job y như lượt này. Nếu vẫn hỏng thì vẫn **0 credit**, và lần này
sổ cái sẽ nói ra hỏng ở bước nào.
