# AGENTS.md — gói `udin-optic`

> Đọc `AGENTS.md` ở gốc repo trước. File này chỉ nói phần riêng của gói.
> Khoá của gói: `workers/udin-optic`.

## Gói này là gì

Extension Chrome cục bộ chạy việc sinh ảnh trên `vinfast.udinbv.com`: vượt màn chờ → gửi prompt
→ đợi ảnh mới → lấy ảnh về đĩa. Tách khỏi `duc-scouter` ngày 15/09 (`T21`).

## Luật riêng của gói — sáu điều, đừng đảo lại

**⑴ Từ vựng ĐÓNG ở mười hai lệnh.** `session.hello` · `system.capabilities` · `system.ping` ·
`scout.targets` · `scout.query` · `scout.text` · `scout.wait` · `scout.click` · `scout.type` ·
`scout.clear` · `scout.grab` · `scout.navigate`. Mười hai lệnh còn lại của Scouter phải là lệnh
**KHÔNG TỒN TẠI** (`METHOD_NOT_FOUND`), không phải lệnh tồn tại mà đang bị chặn — cái sau thì bật
lại được bằng một dòng cờ. Thêm một lệnh là **đổi luật an toàn** → phải hỏi Đức.

**⑵ Vùng đích là ĐÚNG MỘT TRANG, và đó là lời hứa lớn nhất của gói.**
`host_permissions` chỉ có `vinfast.udinbv.com` + `127.0.0.1`. Scouter mở `<all_urls>` vì nó dò
trang bất kỳ; gói này không. Nới dòng đó là xoá sạch chỗ hẹp hơn duy nhất khiến việc chép
~2.100 dòng máy bấm/gõ là đáng. `be-mat-hep-smoke.mjs` khối ⑵ canh nó.

**⑶ BẢY TỆP CHÉP PHẢI CÒN GIỐNG SCOUTER.** `scouter-engine.js` · `scouter-probes.mjs` ·
`scouter-actions-core.mjs` · `scouter-seed-core.mjs` · `scouter-transport-loopback.mjs` ·
`scouter-journal-core.mjs` · `bridge/file-core.mjs`. Đó là bộ máy gắn debugger, tổng hợp phím
chuột, và **cái phanh**. Khối ⑷ băm từng tệp và **đỏ khi lệch**. Muốn khác thật thì khai vào
`CO_Y_KHAC` kèm lý do — không có đường thứ ba. Tên tệp **giữ nguyên tiền tố `scouter-`** cố ý:
nó nói ra xuất xứ, và làm phép so byte không cần bảng đổi tên.

**⑷ Bốn tệp CỐ Ý khác và được phép đổi tự do:** `scripts/bridge-core.mjs` (chỗ gói hẹp lại) ·
`manifest.json` · `sidepanel.*` · `background.js`. Đức chốt 15/09 rằng **UI sẽ đổi theo usecase**
— đó là lý do gói này tồn tại, đừng ghim nó lại.

**⑸ Tệp ghép cặp RIÊNG, cổng RIÊNG, giao thức RIÊNG.** `udin-optic.bridge`, sinh bằng
`tao-tep-ghep-cap.mjs --goi udin-optic`. Dùng chung với Scouter thì mọi lượt gọi không nêu đích
trả `TARGET_AMBIGUOUS`; khai lệch tên hai đầu thì "im lặng" — `hnx-fetch` mất một buổi vì đúng
chuyện đó ngày 08/09.

**⑹ Cái phanh không được đụng.** Công tắc mặc định TẮT, trần 200 lượt mỗi lần bật, gõ cứng trong
mã, chỉ tay Đức mở lại được. Phím phanh là `Ctrl+Shift+U` — **khác Scouter cố ý**: hai extension
xin cùng một tổ hợp thì Chrome chỉ trao cho một, và cái mất phím là cái không còn phanh lúc bảng
bên đóng.

## Bản đồ file

| File | Vai trò |
|---|---|
| `v0.1.0/manifest.json` | **RIÊNG** — quyền hẹp về một trang, phím phanh `Ctrl+Shift+U` |
| `v0.1.0/background.js` | **RIÊNG** — lớp nối dây, khai `worker_id: "udin-optic"` |
| `v0.1.0/scripts/bridge-core.mjs` | **RIÊNG** — từ vựng 12 lệnh, giao thức `udin-optic.bridge` |
| `v0.1.0/sidepanel.{html,js,css}` | **RIÊNG** — bảng bên; chỗ Đức sẽ đổi theo usecase |
| `v0.1.0/scouter-engine.js` | chép NGUYÊN VĂN từ Scouter — bơm `chrome.debugger` vào hai lõi |
| `v0.1.0/scripts/scouter-probes.mjs` | chép NGUYÊN VĂN — bốn phép dò chỉ đọc |
| `v0.1.0/scripts/scouter-actions-core.mjs` | chép NGUYÊN VĂN — **hành động GHI**: bấm, gõ như tay người |
| `v0.1.0/scripts/scouter-seed-core.mjs` | chép NGUYÊN VĂN — handler + **CÁI PHANH** (trần 200/lần mở) |
| `v0.1.0/scripts/scouter-transport-loopback.mjs` | chép NGUYÊN VĂN — dây WebSocket, bắt tay hai chiều |
| `v0.1.0/scripts/scouter-journal-core.mjs` | chép NGUYÊN VĂN — sổ công việc |
| `v0.1.0/bridge/udin-optic-host.mjs` | **RIÊNG** — vỏ mỏng trên lõi `_shared/bridge-host/` |
| `v0.1.0/bridge/file-core.mjs` | chép NGUYÊN VĂN — `file.*` chạy ở máy chủ, không ở extension |
| `tu-dong/*.mjs` | **năm chặng việc** W1..W4 + e2e. Script Node gọi Bridge từ dòng lệnh |
| `tu-dong/goi-bridge.mjs` | vỏ năm dòng khai danh tính gói, thân ở `_shared/goi-bridge/` |
| `v0.1.0/tests/be-mat-hep-smoke.mjs` | **bề mặt hẹp**: từ vựng · quyền · giao thức hai đầu · bảy tệp chép |
| `v0.1.0/tests/run-all.mjs` | suite của gói; cổng đóng phiên TỰ TÌM tệp này |

## Chạy

```
node workers/_shared/bridge-host/tao-tep-ghep-cap.mjs --goi udin-optic
node workers/udin-optic/v0.1.0/bridge/udin-optic-host.mjs --pairing <tệp.json> --root <thư-mục-ghi>
UDIN_GHE=<instance_id> node workers/udin-optic/tu-dong/e2e.mjs "một prompt CHƯA DÙNG BAO GIỜ"
```

Mỗi lượt chạy thật tiêu credit của Đức, nên **prompt phải mới mỗi lượt** — luật repo, không có
ngoại lệ.
