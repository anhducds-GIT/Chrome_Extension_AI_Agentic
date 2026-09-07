# HANDOFF — Duc Scouter

> Trạng thái mới nhất ở CUỐI file. Log chỉ thêm dòng.

## Trạng thái hiện tại (2026-09-06)

- Gói khai sinh theo [ADR-0013](../../../docs/adr/0013-scouter-ra-nha-rieng-co-khoa-rieng.md):
  Scouter dọn từ gốc repo + `scripts/` + `tests/` về đây, có khoá riêng `workers/duc-scouter`.
- Bản nền `SEED v0.1` làm được ba khả năng của [ADR-0009](../../../docs/adr/0009-scouter-thay-observer-cua-tuong-tac.md)
  mục ⑸: quan sát · báo cáo qua Bridge · tự nạp lại mình.
- Việc tiếp theo (1): `S-01` — cho Scouter bấm và gõ được như tay người.
- Rủi ro đang mở: bản nền này **chưa từng chạy trên một trang thật**. Mọi số đo tới giờ là trên
  trang thử tự tạo và máy chủ Bridge chạy tại chỗ.

## Log

<!-- HANDOFF-THANG: 2026-09 -->
### 2026-09-06 · `claude-scouter-seed` · Nhà riêng + khung seed v0.1 làm được ba việc

**Làm gì.** Hai bước trong một lượt. ① ADR-0013: dọn Scouter từ gốc repo + `scripts/` +
`tests/` về `workers/duc-scouter/v0.1.0/`, khoá riêng `workers/duc-scouter`, chuyển bằng
`git mv` nên `--follow` còn tra được lịch sử. ② `BRIEF-SCOUTER-SEED-01` việc ②: dựng khung
seed làm được ba việc của ADR-0009 mục ⑸ — quan sát (dùng lại bốn phép dò cũ, không dựng
đường thứ hai) · báo cáo qua Bridge · tự nạp lại mình.

**Kết quả số.** 5 phép ghim của gói XANH · đột biến kiểm mới **24/24 mỏ neo khớp, giết 24,
sống sót 0** · đột biến kiểm cũ (bốn phép dò) **14/14, giết 14, sống sót 0** · nối thử với
**máy chủ Bridge THẬT** (không phải bản giả) ĐẠT 5/5.

**Một quyết định đáng nhớ.** Brief bắt đọc cả ba worker rồi quyết từng file, và ở lớp dây nó
đổi ra khác biệt an toàn thật: **chỉ nhánh ChatGPT bắt tay hai chiều** — máy chủ phải chứng
minh nó biết token trước, rồi extension mới đưa token ra. Gemini và Flow đưa token ngay khi
socket mở, tức là đưa cho bất kỳ tiến trình nào chiếm cổng 32147 trước. Seed dùng bản ChatGPT.
Hệ quả cố ý: seed CHỈ nối được với máy chủ bản ChatGPT. Con đột biến `D1` canh đúng chỗ này.

**Còn gì mở.** `S-01` bấm/gõ như tay người (việc kế) · `S-02` nối lại Bridge đang dùng
`setTimeout` vì quyền `alarms` chưa được duyệt · `S-03` tên file còn chữ `observer` ·
`S-04` `scout.reload` chờ bằng độ trễ cố định chứ chưa có xác nhận đã gửi.

**Chưa từng chạy trên một trang thật.** Mọi số đo tới giờ là trên trang thử tự tạo và máy chủ
Bridge chạy tại chỗ.

### 2026-09-07 · `claude-scouter-s01` · S-01 xong: Scouter bấm và gõ như tay người

**Làm gì.** Mở đường GHI: ba method `scout.click` · `scout.type` · `scout.key`. Đây là năng lực
xếp hạng số một của bảng kiểm kê, và là mục lớn cuối của `SEED v0.1`.

**Kết quả số.** Đột biến kiểm **42/42 mỏ neo khớp, giết 42, sống sót 0** (trước lượt này 24/24)
· suite gói **6/6** · nối thật với máy chủ Bridge **ĐẠT 7/7** · 11 method trong từ vựng.

**Quyết định hình dạng, và nó là phần đáng đọc nhất.** Đường ghi là một **lõi riêng** với danh
sách method CDP riêng, KHÔNG phải thêm `Input.*` vào lõi đọc. Thêm vào lõi đọc là làm yếu một
lớp bảo vệ đang có (luật vàng 3), và hai con `M1` `M2` sẽ đỏ đúng lúc đó. Kết quả: sau lượt này
`observer-probes.mjs` **vẫn chứng minh được là read-only** — vì kênh ghi không có mặt trong file
đó, không phải vì ai hứa.

**Bốn chốt của đường ghi.** Từ vựng đóng · danh sách method CDP (cố ý không có `Runtime.*`:
bấm và gõ không cần chạy một dòng JS nào) · **toạ độ do ta tính, không bao giờ nhận từ người
gọi** · **selector phải khớp đúng một phần tử**. Hai chốt sau là đắt nhất: nhận toạ độ từ ngoài
biến `scout.click` thành "bấm bất kỳ đâu trên màn hình", và "bấm cái đầu tiên" khi khớp nhiều
là chỗ tự động hoá phá hỏng đồ thật.

**Chuỗi lệnh chép từ phép đo 06/09.** Một chỗ cố ý khác: phép đo lấy toạ độ qua
`Runtime.evaluate`; ở đây dùng `DOM.getBoxModel` — cùng con số, không phải mở cửa chạy JS.

**Hai chỗ đột biến kiểm bắt được mà tôi không tự thấy.** `K7` sống sót lượt đầu: không vế nào
ghim "hành động hỏng không được mặc vỏ thành công". `K1` mỏ neo mục theo code vì đường ghi có
một chốt cùng hình dạng. Cả hai đã vá.

**Còn gì mở.** `S-05` **chưa có phanh nào cho đường ghi** — ba gói kia có chế độ phát triển kèm
trần, Scouter thì chưa; lệnh cấm chạy trên trang thật là luật cho người, không phải chốt trong
code. `S-06` ba method mới **chưa từng chạm một nút thật**. `S-02` quyền hẹn giờ · `S-03` tên
file · `S-04` chờ xác nhận đã gửi.
