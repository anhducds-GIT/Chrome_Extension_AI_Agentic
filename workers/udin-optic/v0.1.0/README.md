# Udin Optic

Extension Chrome cục bộ chạy việc sinh ảnh trên `vinfast.udinbv.com`: **vượt màn chờ → gửi
prompt → đợi ảnh mới → lấy ảnh về đĩa.**

Tách khỏi `duc-scouter` ngày 15/09. Luật của gói: [`AGENTS.md`](AGENTS.md).

## Cài và chạy — ba lệnh

**① Sinh tệp ghép cặp RIÊNG cho gói này.** Tệp chứa token nên nó nằm **ngoài kho mã**; lệnh dưới
đặt nó đúng nhà chung và tự tạo thư mục.

```bash
node workers/_shared/bridge-host/tao-tep-ghep-cap.mjs --goi udin-optic
```

Đừng dùng chung tệp với Scouter: hai extension nối vào một máy chủ thì mọi lượt gọi không nêu
đích trả `TARGET_AMBIGUOUS`.

**② Bật máy chủ Bridge của gói này.** `--root` là **vùng ghi** — nơi ảnh rơi xuống. Nó phải là
một thư mục CON, không được là thư mục đang giữ tệp ghép cặp: `file.read` đọc được mọi tệp dưới
vùng ghi, nên trỏ trùng chỗ nghĩa là đưa token ra dây. Máy chủ **từ chối khởi động** nếu trỏ sai.

```bash
node workers/udin-optic/v0.1.0/bridge/udin-optic-host.mjs --pairing "C:/WORKING ZONE/Chrome Extension Bridge/udin-optic/udin-optic-bridge-pairing-v1.json" --root "C:/WORKING ZONE/Chrome Extension Bridge/udin-optic/anh-ra"
```

**③ Nạp extension vào Chrome.** `chrome://extensions` → *Load unpacked* → chọn thư mục
`workers/udin-optic/v0.1.0`. Mở bảng bên, mục **Cửa Bridge**, chọn tệp ghép cặp. Dòng trạng thái
phải đổi thành *"Đã nối Bridge."*

**Rồi chạy một lượt:**

```bash
UDIN_GHE=<instance_id> node workers/udin-optic/tu-dong/e2e.mjs "một prompt chưa dùng bao giờ"
```

`<instance_id>` lấy ở bảng bên (mục **Tên ghế**) hoặc bằng `bridge.sessions`. Chỉ có một ghế nối
thì bỏ `UDIN_GHE` cũng được.

## Muốn nó bấm và gõ thì phải BẬT TAY

Công tắc **Cho phép bấm và gõ** ở đầu bảng bên, mặc định **TẮT**. Mỗi lần bật cho **200 lượt**
rồi tự đóng. Không lệnh Bridge nào bật được nó — chỉ tay Đức.

**Phanh khẩn: `Ctrl+Shift+U`.** Khác Scouter (`Ctrl+Shift+X`) cố ý — hai extension xin cùng một
tổ hợp thì Chrome chỉ trao cho một, và cái mất phím là cái không còn phanh lúc bảng bên đóng.
Nếu phím bị gói khác chiếm, đặt lại ở `chrome://extensions/shortcuts`.

## Ảnh lưu ra dạng gì

Udin trả ảnh **WebP** và không có tham số nào đổi được ở đầu kia, nên E2E tự đổi sang **JPG** ở
chặng cuối — bằng **WIC của Windows**, không cài thêm gì. **Ảnh `.webp` gốc giữ nguyên**, lượt đổi
chỉ thêm tệp; muốn chỉ còn JPG thì xoá tay.

Chỉ muốn `.webp`: thêm `--khong-jpg`. Đổi lại một thư mục đã tải về trước đó:

```bash
node workers/udin-optic/tu-dong/doi-sang-jpg.mjs "udin-optic/<thư-mục-lượt-chạy>"
```

**Chỉ chạy trên Windows** — repo đã Windows-only ở nhiều chỗ, nhưng chỗ này khai ra chứ không giấu.

## Gói này KHÔNG làm được gì

Không dò trang lạ — `scout.page`, `scout.tree`, `scout.a11y`, `scout.shot`, `scout.network`
**không tồn tại** ở đây. Không gọi mạng tuỳ ý (`scout.fetch` bị cắt). Không tự nạp lại chính nó
(`scout.reload` bị cắt — đó là việc của seed Scouter). Manifest chỉ khai **một trang**.

Cần bấm nút trên một trang khác? Đó là việc của [Duc Scouter](../duc-scouter/v0.1.0/README.md).

## Phép ghim

```bash
node workers/udin-optic/v0.1.0/tests/run-all.mjs
```
