# AGENTS.md — gói `udin-optic`

> Đọc `AGENTS.md` ở gốc repo trước. File này chỉ nói phần riêng của gói.
> Khoá của gói: `workers/udin-optic`.

## Gói này là gì

Extension Chrome cục bộ chạy việc sinh ảnh trên `vinfast.udinbv.com`: vượt màn chờ → gửi prompt
→ đợi ảnh mới → lấy ảnh về đĩa. Tách khỏi `duc-scouter` ngày 15/09 (`T21`).

## Luật vàng — tám điều riêng của gói này, đừng đảo lại

**⑴ Từ vựng ĐÓNG ở mười hai lệnh.** `session.hello` · `system.capabilities` · `system.ping` ·
`scout.targets` · `scout.query` · `scout.text` · `scout.wait` · `scout.click` · `scout.type` ·
`scout.clear` · `scout.grab` · `scout.navigate`. Mười hai lệnh còn lại của Scouter phải là lệnh
**KHÔNG TỒN TẠI** (`METHOD_NOT_FOUND`), không phải lệnh tồn tại mà đang bị chặn — cái sau thì bật
lại được bằng một dòng cờ. Thêm một lệnh là **đổi luật an toàn** → phải hỏi Đức.

**⑵ Vùng đích là ĐÚNG MỘT TRANG, và đó là lời hứa lớn nhất của gói.**
`host_permissions` chỉ có `vinfast.udinbv.com` + `127.0.0.1`. Scouter mở `<all_urls>` vì nó dò
trang bất kỳ; gói này không. Nới dòng đó là xoá sạch chỗ hẹp hơn duy nhất khiến việc chép
~2.100 dòng máy bấm/gõ là đáng. `be-mat-hep-smoke.mjs` khối ⑵ canh nó.

**⑶ BẢY TỆP CHÉP PHẢI CÒN GIỐNG SCOUTER** (bảng `CẶP` ở khối ⑷ của `be-mat-hep-smoke.mjs` liệt
kê đủ). Đó là bộ máy gắn debugger, tổng hợp phím chuột, và **cái phanh**. Khối ⑷ băm từng tệp và
**đỏ khi lệch**; muốn khác thật thì khai `CO_Y_KHAC` kèm lý do — không có đường thứ ba. Tên tệp
giữ tiền tố `scouter-` cố ý: nó nói ra xuất xứ, và phép so byte khỏi cần bảng đổi tên.

**⑷ Năm tệp CỐ Ý khác và được phép đổi tự do:** `scripts/bridge-core.mjs` (chỗ gói hẹp lại) ·
`manifest.json` · `sidepanel.*` · `background.js` · `scripts/make-icons.mjs`. Đức chốt 15/09 rằng
**UI sẽ đổi theo usecase** — đó là lý do gói này tồn tại, đừng ghim nó lại.

Icon là chữ **U** mận sẫm trên nền **hồng pastel** (`#FFD1DC`), Đức chốt 15/09. Nó sinh bằng `make-icons.mjs` chứ không dán bốn
tệp PNG vào: PNG là nhị phân, `git diff` không đọc được, và ba tháng nữa không ai biết nó vẽ bằng
gì. Sửa icon = sửa hằng số rồi chạy lại, **đừng sửa tay tệp PNG**.

**⑸ Tệp ghép cặp RIÊNG, cổng RIÊNG, giao thức RIÊNG** (`udin-optic.bridge`). Dùng chung với
Scouter thì mọi lượt gọi không nêu đích trả `TARGET_AMBIGUOUS`; khai lệch tên hai đầu thì "im
lặng" — `hnx-fetch` mất một buổi vì đúng chuyện đó ngày 08/09.

**⑹ Gói TỰ KHAI TÊN MÌNH ở lớp nối dây, không ở tệp chép.** `scouter-seed-core.mjs` gõ cứng
`"scouter-seed-v0.1"` vào `session.hello` và `system.ping`, nên `background.js` **đè** hai handler
đó. Đừng sửa tệp chép cho gọn — mất phép so byte trên đúng tệp chứa cái phanh. Khối ⑺ canh cái đè
và canh hai chỗ khai tên phải KHỚP nhau.

**⑻ Ảnh gốc `.webp` KHÔNG BAO GIỜ bị xoá.** Lượt đổi sang JPG chỉ **thêm** tệp. Xoá dữ liệu gốc
là việc phải hỏi Đức (luật gốc), và chính máy chủ Bridge cũng cố ý không có `file.delete` vì đúng
lý do đó. Và đừng tin lời khai của bộ đổi: mỗi tệp ra phải được đọc lại và kiểm **ba byte đầu
`FF D8 FF`** — "xong" mà không kiểm đĩa là một xanh giả.

**⑺ Cái phanh không được đụng.** Công tắc mặc định TẮT, trần 200 lượt mỗi lần bật, chỉ tay Đức
mở lại được. Phím phanh `Ctrl+Shift+U` — **khác Scouter cố ý**: hai extension xin cùng một tổ hợp
thì Chrome chỉ trao cho một, và cái mất phím là cái không còn phanh lúc bảng bên đóng.

## Bản đồ file

Đường dẫn tính từ thư mục chứa file này (`workers/udin-optic/v0.1.0/`).

| File | Vai trò |
|---|---|
| `manifest.json` | **RIÊNG** — quyền hẹp về một trang, phím phanh `Ctrl+Shift+U` |
| `background.js` | **RIÊNG** — lớp nối dây, khai `worker_id: "udin-optic"` |
| `scripts/bridge-core.mjs` | **RIÊNG** — từ vựng 12 lệnh, giao thức `udin-optic.bridge` |
| `sidepanel.html` · `sidepanel.js` · `sidepanel.css` | **RIÊNG** — bảng bên; chỗ Đức sẽ đổi theo usecase |
| `bridge/udin-optic-host.mjs` | **RIÊNG** — vỏ mỏng trên lõi `../../_shared/bridge-host/` |
| `bridge/Chay-may-chu-Udin.cmd` | **RIÊNG** — kéo-thả tệp ghép cặp vào đây là máy chủ chạy |
| `scouter-engine.js` | chép NGUYÊN VĂN từ Scouter — bơm `chrome.debugger` vào hai lõi |
| `scripts/scouter-probes.mjs` | chép NGUYÊN VĂN — bốn phép dò chỉ đọc |
| `scripts/scouter-actions-core.mjs` | chép NGUYÊN VĂN — **hành động GHI**: bấm, gõ như tay người |
| `scripts/scouter-seed-core.mjs` | chép NGUYÊN VĂN — handler + **CÁI PHANH** (trần 200 lượt mỗi lần mở) |
| `scripts/scouter-transport-loopback.mjs` | chép NGUYÊN VĂN — dây WebSocket, bắt tay hai chiều |
| `scripts/scouter-journal-core.mjs` | chép NGUYÊN VĂN — sổ công việc |
| `bridge/file-core.mjs` | chép NGUYÊN VĂN — `file.*` chạy ở máy chủ, không ở extension |
| `scripts/make-icons.mjs` | **RIÊNG** — sinh bộ icon chữ **U**. Icon là MÃ NGUỒN, không phải cục nhị phân mồ côi |
| `scripts/do-quyen-zoom.mjs` | **RIÊNG** — phép đo `U0`: `setZoom` có đòi quyền `tabs` không. Chrome sạch, không đụng ghế Đức (`G-95`) |
| `icons/icon-16.png` | biểu tượng, **máy sinh** — đừng sửa tay, chạy lại `make-icons.mjs` |
| `icons/icon-32.png` | biểu tượng, máy sinh |
| `icons/icon-48.png` | biểu tượng, máy sinh |
| `icons/icon-128.png` | biểu tượng, máy sinh |
| `tests/be-mat-hep-smoke.mjs` | **bề mặt hẹp**: từ vựng · quyền · giao thức hai đầu · bảy tệp chép |
| `tests/bridge-pairing-path-static.mjs` | bảng bên hiện ĐÚNG đường tệp ghép cặp của gói này |
| `tests/run-all.mjs` | suite của gói; cổng đóng phiên TỰ TÌM tệp này theo hình dạng |
| `CHUOI-VIEC.md` | **việc kế tiếp là gì** — chuỗi `U0..U5` (UI) và đường ranh Udin↔Scouter |
| `STATUS.md` | trạng thái một trang — máy đọc, `DASHBOARD` lấy số từ đây |
| `PHIEN.md` | **cửa vào MỘT FILE** cho phiên sau. Máy sinh, đừng gõ tay (`rule-compile --sinh`) |
| `AGENTS.md` | file này — luật riêng của gói |
| `README.md` | đường cài đặt cho người ngoài: ba lệnh, rồi một lượt chạy |
| `HANDOFF.md` | nhật ký gói. Ghi thêm ở CUỐI, trần một mục 2.600 byte |
| `../tu-dong/*.mjs` | **năm chặng việc** W1..W4 + e2e. Script Node gọi Bridge từ dòng lệnh |
| `../tu-dong/doi-sang-jpg.mjs` | đổi ảnh vừa tải sang **JPG** (chặng cuối của E2E). Đức chốt 15/09 |
| `../tu-dong/doi-sang-jpg.ps1` | bộ đổi thật, chạy bằng **WIC của Windows** — không thêm dependency nào |
| `../tu-dong/goi-bridge.mjs` | vỏ năm dòng khai danh tính gói; thân ở `../../_shared/goi-bridge/` |
| `../tu-dong/tests/*.mjs` | năm phép ghim của tầng chạy việc |
| `../../_shared/bridge-host/` | **LÕI DÙNG CHUNG** — máy chủ Bridge. Luật của vùng: `workers/_shared/AGENTS.md` |
| `../../_shared/goi-bridge/` | **LÕI DÙNG CHUNG** — bên gọi Bridge từ dòng lệnh |

## Chạy

```
node workers/_shared/bridge-host/tao-tep-ghep-cap.mjs --goi udin-optic
node workers/udin-optic/v0.1.0/bridge/udin-optic-host.mjs --pairing <tệp.json> --root <thư-mục-ghi>
UDIN_GHE=<instance_id> node workers/udin-optic/tu-dong/e2e.mjs "một prompt CHƯA DÙNG BAO GIỜ"
```

Mỗi lượt chạy thật tiêu credit của Đức, nên **prompt phải mới mỗi lượt** — luật repo, không có
ngoại lệ.
