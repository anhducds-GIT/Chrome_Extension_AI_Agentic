---
status: Accepted
adr: 0002
date: 2026-09-07
deciders: Đức
---

# ADR-0002 — Vỏ giao diện của Scouter là BẢNG BÊN, không phải popup

## Bối cảnh

Đức hỏi ngày 07/09: *"Vì sao Scouter không phải là dạng side panel? Vì sao không giống cấu trúc
của các extension hiện tại?"*

Đi tìm quyết định gốc thì **không có**. Chú thích ở `scripts/scouter-transport-loopback.mjs`
viết *"Cổng executor: seed không có bảng bên. **ADR-0009 ⑷**"* — nhưng ADR-0009 ⑷ nói về *"Một
Scouter một URL"*, không một chữ nào về bảng bên. Đó là một **mặc định được mặc áo quyết định**,
và nó nguy hơn một quyết định sai: quyết định sai thì có người phản biện, còn cái này thì mọi
phiên đọc vào đều tưởng đã có người cân rồi.

Đo ngày 07/09, cả bốn extension trong repo:

| Gói | Vỏ | `sidePanel` | `downloads` |
|---|---|---|---|
| `duc-auto-chatgpt` | bảng bên | có | có |
| `duc-auto-gemini` | bảng bên | có | có |
| `duc-auto-gg-flow-video` | bảng bên | có | có |
| **`duc-scouter`** | **popup** | **không** | **không** |

Scouter lệch cả hai cột, và không cột nào có lý do được ghi lại.

**Popup có một khuyết tật chức năng, không phải khuyết tật thẩm mỹ: nó CHẾT khi mất tiêu điểm.**
Bấm vào trang một cái là nó đóng. Mà việc của Scouter là *nhìn một trang trong lúc có người
tương tác với nó* — nên vỏ popup chống lại chính công dụng của gói.

Cụ thể hơn, và đây là chỗ đắt nhất: từ [ADR-0001](0001-phanh-cho-duong-ghi-va-quyen-alarms.md),
**công tắc chế độ phát triển và bộ đếm "còn N/50 lượt ghi" nằm trong popup**. Không xem được
ngân sách tụt trong lúc nó đang tụt thì cái phanh chỉ còn một nửa công dụng.

## Quyết định

**Đức chốt 07/09:** *"tôi muốn extension cần được dock thành side panel, trừ khi dạng pop up
hiệu quả và ưu việt hơn."* Popup **không** ưu việt hơn — nó thua ở đúng chỗ gói này cần.

Vỏ giao diện là **bảng bên**. Ba file `popup.*` đổi tên thành `sidepanel.*` bằng `git mv` (giữ
lịch sử, luật của ADR-0013). `manifest.json` khai `side_panel.default_path`, **bỏ**
`action.default_popup`, và thêm quyền **`sidePanel`** — quyền này nằm ngoài danh sách ADR-0009
duyệt, nên chính câu chốt trên là lượt duyệt nó.

**Điều chỉnh một suy luận đã đi quá tay.** ADR-0009 cố ý làm Scouter *không phải* một
`duc-auto-*`: không hàng đợi job, không workbook, không tự động hoá nhà cung cấp nào. Phần đó
giữ nguyên. Nhưng *"không phải worker tự động hoá"* **không kéo theo** *"phải khác vỏ giao
diện"*: bảng bên là cái **vỏ**, không phải cái **máy**. Gộp hai thứ đó là chỗ suy luận trượt.

## Hệ quả

**Được.** Bảng bên sống qua thao tác trên trang, nên xem được bộ đếm ngân sách trong lúc Scouter
đang bấm — thứ popup không cho. Và Đức có **một mô hình dùng chung cho cả bốn extension** thay
vì ba cái một kiểu, một cái một kiểu.

**Mất — nói thẳng.** Thêm một quyền (`sidePanel`), và bảng bên chiếm chỗ trên màn hình lâu hơn
popup. Với một gói mà việc chính là *nhìn* thì đó là cái giá đúng, nhưng nó vẫn là cái giá.

**Chỗ dễ làm sai, và nó hỏng IM LẶNG.** Bỏ `default_popup` là bỏ luôn hành vi mặc định của nút
icon: thiếu `chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })` trong
`scouter-background.js` thì **bấm icon không mở gì cả** — không lỗi, không thông báo, nhìn ra
ngoài giống hệt "extension chết". Khối ⑯ của `tests/scouter-write-gate-smoke.mjs` ghim cả ba
mảnh (khai `side_panel` · có `setPanelBehavior` · **không** còn `default_popup`), và ba con
`Q3` `Q4` `R3` canh chúng.

**Một bài học về phép ghim, ghi ra vì nó tổng quát hơn lượt này.** Con `R3` sống sót lượt đầu:
nó không xoá lời gọi mà **bọc `if (false)` quanh lời gọi**, nên một phép ghim soi "chuỗi có mặt
không" thì mù. Đây là kiểu sửa THẬT — người ta tắt một đường lúc gỡ lỗi rồi quên bật lại. Cách
vá không phải là chữa con đột biến mà là đổi luật ghim: **dây thật không có nhánh chết**, và
phép ghim nay từ chối mọi `if (false)` / `if (0)` / `&& false` trong `scouter-background.js`.

**Ai phải làm gì khác đi.** Đức **nạp lại extension** — manifest đổi. Từ nay bấm icon mở bảng
bên ở cạnh phải, không còn popup.

## Trạng thái

Accepted
