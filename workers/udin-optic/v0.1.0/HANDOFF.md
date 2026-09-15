# HANDOFF — `workers/udin-optic/`

> Nhật ký của gói. Luật của gói: `v0.1.0/AGENTS.md` cạnh file này.
> Ghi thêm ở CUỐI, không sửa mục cũ. Trần một mục: 2.600 byte.

## Log

## 2026-09-15 · `claude-scouter-udine` — gói ra đời, và cái giá của nó được đo TRƯỚC khi trả

**Việc.** `T21` tách Udin Optic khỏi `duc-scouter`. Trước hôm nay nó sống trong `pilots/` của
chính Scouter, nên câu *"Scouter là bộ đồ nghề chung"* chưa bao giờ bị bắt chứng minh.

**Phép đo đã suýt không được làm.** Lộ trình `T21` viết 14/09 nói *"chép theo kiểu `hnx-fetch`"*
và đếm hai tệp: `transport.mjs` (576) và `bridge-core.mjs` (844). Vào việc mới thấy con số thật:
Udin dùng **5 lệnh GHI**, nên gói mới phải mang theo `scouter-probes.mjs` (1.181) và
`scouter-actions-core.mjs` (938) — **~2.100 dòng máy gắn debugger, tổng hợp phím chuột, và CÁI
PHANH**. `hnx-fetch` chưa bao giờ phải trả giá đó vì nó **không khai quyền `debugger`**.

Con số đó được đưa cho Đức kèm đường thứ hai (gói script, 0 dòng chép, chạy trên extension
Scouter). Đức chốt đường extension riêng, với lý do không nằm trong phép đo:

> *"Vì sau này Scouter sẽ còn thay đổi nhiều, ngoài ra UI của Udin Extension cũng sẽ bị thay đổi
> cho phù hợp usecase, do đó tách riêng sẽ hợp lý hơn."*

Đó là lý lẽ **tách rời nhịp thay đổi**. Nó đúng, và nó đổi bản chất bản chép: một bản *được phép
trôi* không phải fork — fork là hai bản trôi **mà không ai biết**.

**Nên cái giá đi kèm một tấm lưới.** `tests/be-mat-hep-smoke.mjs` khối ⑷ băm **bảy tệp chép** và
đỏ khi lệch; muốn khác thật thì khai `CO_Y_KHAC` kèm lý do. Bốn tệp CỐ Ý khác — `bridge-core` ·
`manifest` · `sidepanel.*` · `background` — không bị ghim, vì đó đúng là chỗ Đức nói sẽ đổi.

**Gói hẹp hơn Scouter, đo được:** 12 lệnh (Scouter 24) · 5 lệnh ghi (11) · một trang thay vì
`<all_urls>` · `scout.fetch` và `scout.reload` **không tồn tại**. Quyền `debugger` thì giống —
đó là chiều duy nhất không hẹp lại được, và là lý do bảy tệp kia phải bị ghim.

**Đã xong:** 10 tệp logic sang `tu-dong/` · vỏ `goi-bridge` riêng · manifest · host vỏ mỏng ·
7 phép ghim xanh · suite Scouter còn **31 xanh và không còn Udin**.

**CHƯA làm:** chưa một lượt chạy thật nào từ extension này — chặng ④, cần Đức nạp extension.

<!-- HANDOFF-THANG: 2026-09 -->

## 2026-09-15b · `claude-scouter-udine` — máy chủ đã chạy thật, và nó tự xưng nhầm tên ngay lượt đầu

**Làm được gì không cần Đức.** Sinh tệp ghép cặp riêng (`--goi udin-optic`, cổng **32152**, tệp
nằm ngoài repo), tạo vùng ghi `…/udin-optic/anh-ra`, rồi **bật máy chủ Bridge thật**. Nó lên.
Nghĩa là vỏ host mỏng trên lõi `_shared` đã đúng dây — chứng minh được **trước khi** Đức phải
đụng vào Chrome.

**Và lượt chạy đầu tiên in ra:** `Scouter Bridge nghe ở 127.0.0.1:32152`. Đúng cổng của Udin,
đúng tệp ghép cặp của Udin, **tự xưng là Scouter**. Không hỏng chức năng — nhưng đó chính là
**cách một bản chép nói dối**: người bật máy chủ đọc đúng dòng đó để biết mình vừa bật cái gì.

Không phải chuyện mới: `duc-scouter` từng phải viết hẳn một dòng README để giải thích đúng triệu
chứng này (máy chủ của nó in tên `duc-auto-chatgpt`). Lần đó **giải thích**; lần này **chữa**.

Tìm thêm bốn chỗ cùng bệnh, và bốn chỗ đó đi ra **tận đầu dây bên kia** chứ không chỉ ra màn
hình: `INTERNAL_ERROR` nói *"The scouter could not complete the request"* · mã lỗi lạ ném
*"Unknown scouter bridge error code"* · và **ba dòng mô tả method** mà `system.capabilities` trả
về cho AI gọi tới (*"report the scouter session identity"* …). Một gói tự khai sai tên ở đúng
chỗ người ta nhìn để phân biệt các ghế thì `bridge.sessions` mất nghĩa.

**Ghim lại bằng khối ⑹** của `be-mat-hep-smoke.mjs`: soi phần **mã** của ba tệp riêng cộng
`manifest.json`, **đỏ khi thấy chữ `scouter`**. Miễn trừ có lý do: các dòng `from "…"` và tên
lớp `ScouterEngine` — đó là tên tệp và tên export THẬT của bản chép, đổi chúng là làm gãy phép so
byte để đẹp một chữ. Lượt đột biến tay (in lại `Scouter Bridge`) **chết** đúng như mong.

**Còn lại của chặng ④, và chỉ Đức làm được:** nạp `workers/udin-optic/v0.1.0` vào Chrome, chọn
tệp ghép cặp ở bảng bên, bật công tắc. Máy chủ và tệp ghép cặp **đã sẵn sàng**.
