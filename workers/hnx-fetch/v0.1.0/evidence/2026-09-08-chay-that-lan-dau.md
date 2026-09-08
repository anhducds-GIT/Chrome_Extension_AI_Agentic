# Bằng chứng · 2026-09-08 · lượt chạy THẬT đầu tiên qua chính HNX Fetch

> Bằng chứng vận hành. **Chỉ thêm, không sửa, không xoá** (luật gốc mục 4).

**Phiên:** `claude-scouter-s06` · **commit:** `7cb9f766e2c2b1aa659fbe4911564fd8d0e1b1ea`

## Bối cảnh

Đức nạp extension vào Chrome và ghép cặp bằng **tệp ghép cặp của Scouter**. Dùng chung tệp là
được — tệp chỉ chở cổng và token; cái quyết định là **máy chủ nào đang chạy**. Cổng 32151 lúc đó
trống, nên bật máy chủ HNX (`bridge/hnx-fetch-host.mjs`) với chính tệp đó.

## Đo được, trọn vòng qua Chrome thật

| Việc | Kết quả |
|---|---|
| `system.ping` | `seed: hnx-fetch-v0.1` — đúng gói này trả lời, không phải Scouter |
| `system.capabilities` **nhìn từ ngoài dây** | đúng bốn lệnh: `session.hello` · `system.capabilities` · `system.ping` · `scout.fetch`. Không lệnh bấm nào |
| `scout.fetch` trang thật `hnx.vn/vi-vn/phai-sinh/thong-ke.html` | status **200** · **61.797** byte |
| ngân sách ghi | trừ đúng **199/200** — công tắc bật, trần sống |
| `tai-ket-qua.mjs` một lượt đầy đủ | đi trọn vòng, **0 hỏng** |
| `tai-pdf.mjs --thu-xem` | liệt kê được danh mục tháng 09 |
| tệp SSOT sau lượt chạy | 368 hàng · 0 dòng lệch cột · 0 khoá trùng |

## Chỗ vấp, và vì sao nó đáng ghi

Cả Scouter lẫn HNX Fetch cùng ghép cặp bằng một tệp → **cả hai cùng cắm** vào máy chủ → mọi
lượt gọi trả `TARGET_AMBIGUOUS`.

**Tên giao thức KHÔNG chặn được chuyện này.** Nó gác ở tầng **phong bì**; **cắm dây** xảy ra
TRƯỚC đó. Một extension nói `duc-scouter.bridge` vẫn cắm được vào máy chủ nói
`hnx-fetch.bridge` — nó chỉ hỏng khi có phong bì thật đi qua.

Vá bằng cờ `--target` (ba lệnh, có phép ghim `du-lieu/tests/dich-danh-smoke.mjs`). Đó là **đi
vòng**; cách đúng là tệp ghép cặp riêng — `H-06`.

## Chưa chứng minh được trong lượt này

Phím tắt phanh khẩn `Ctrl+Shift+H` — cần tay người bấm. Ghi thành `H-07`.

## Dữ liệu ngày 08/09

**HNX chưa công bố.** Hai đường độc lập cùng nói vậy: bảng kết quả báo *không có phiên*, và danh
mục PDF tháng 09 mới nhất cũng chỉ tới **07/09**. Theo mục 4.3 ⑶ của `PROTOCOL.md`, hai đường
trùng nhau **loại được lỗi phía ta**, chưa loại được *công bố muộn*.
