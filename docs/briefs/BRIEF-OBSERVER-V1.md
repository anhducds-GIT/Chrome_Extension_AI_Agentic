---
kind: brief
status: active
ttl_days: 90
---

# BRIEF `OBSERVER-V1` — Cửa bằng chứng cho AI

Đề bài đã chốt ở [ADR-0007](../adr/0007-observer-la-cua-bang-chung-cho-ai.md). **Đọc ADR trước.**
Chỗ đặt, mục đích và bất biến số một đã quyết — executor không quyết lại.

## 1. Đang có gì — đo thật, không phỏng đoán

`manifest.json` · `popup.html` · `popup.css` · `popup.js` · `observer-engine.js` ở **gốc repo**,
tổng ~13KB, **không ai sửa từ 18/08**. Một phép ghim: `tests/observer-engine-smoke.mjs`.
Quyền: `["debugger"]`, không có `host_permissions`.

`ObserverEngine` làm được bốn việc:

| Có sẵn | Chi tiết |
|---|---|
| `scanTargets()` | `chrome.debugger.getTargets()` rồi mô tả từng target |
| `classifyTarget()` | trang thường · trang extension · service worker · không rõ, kèm bằng chứng phân loại |
| `observe()` | gắn tạm → đọc runtime + DOM → **luôn tháo trong `finally`** |
| bốn mức quan sát | `FULL` · `PARTIAL` · `BLOCKED` · `METADATA_ONLY` |

**Kỷ luật read-only viết tốt, giữ nguyên tinh thần đó:** nó từ chối cướp phiên debug của người
khác, nó không bao giờ gửi input, và biểu thức `Runtime.evaluate` là **một chuỗi gõ cứng**.

## 2. Năm lỗ, xếp theo mức chặn

**⑴ Không có kênh nào cho AI.** Đường ra duy nhất là nút Copy trong popup. Đây là lỗ lớn nhất:
nó làm cho toàn bộ phần còn lại vô dụng với AI.

**⑵ `DOM.getDocument` gọi với `depth: 0`.** Nó trả về **đúng nút gốc** — `nodeName`, `nodeId`,
số con. Không có cấu trúc, không có thuộc tính, không có selector nào. Nghĩa là chức năng
được quảng cáo là "đọc DOM" hiện **không trả về gì dùng được cho việc tìm selector** — đúng
việc mà luật vàng số 1 cần.

**⑶ Không trả lời được câu hỏi thật của luật vàng số 1.** Câu đó là *"selector này có khớp
không, khớp mấy cái, chúng là gì"*. Hiện không có đường nào hỏi.

**⑷ Cắt cứng ở 100 phần tử, không có cách lấy tiếp.** `MAX_ELEMENTS = 100`, cắt xong chỉ ghi
một dòng `truncated`. Trang thật vượt 100 phần tử tương tác là chuyện thường.

**⑸ Chưa chạy lần nào.** Zero bằng chứng vận hành. Phép ghim duy nhất chạy trên `chrome` giả lập.

## 3. Phải xây gì

### 3a. Bộ từ vựng phép dò — bất biến số một của ADR

Observer nhận **một danh sách cố định** các phép dò. **Không bao giờ nhận biểu thức tự do.**

| Phép dò | Trả về |
|---|---|
| `targets.list` | như `scanTargets()` hôm nay |
| `page.snapshot` | metadata + kiểm kê phần tử tương tác, **có phân trang** (sửa lỗ ⑷) |
| `dom.query` | **selector khớp mấy phần tử, và chúng là gì** — trả lời luật vàng số 1 (lỗ ⑶) |
| `dom.tree` | cấu trúc cây tới độ sâu N kèm thuộc tính (sửa lỗ ⑵) |

Mỗi phép dò: **một phép ghim riêng, và một đột biến kiểm chứng minh nó read-only.**

**Cấm tuyệt đối:** một phép dò nhận chuỗi biểu thức, chuỗi mã, hay bất cứ thứ gì được nối vào
`Runtime.evaluate`. Selector là **dữ liệu truyền vào `querySelectorAll`**, không phải mã. Nếu
bạn thấy mình đang nối chuỗi để dựng biểu thức — **dừng lại, đó là chỗ read-only chết.**

### 3b. Kênh cho AI

Dùng lại đúng cơ chế Bridge của ba worker kia: `ws://127.0.0.1:<port>/v1/extension` kèm token
ghép cặp. **Đọc `workers/duc-auto-gemini/v0.2.0/bridge-*.js` trước, đừng phát minh lại.**

> **CHẶN — chưa được làm phần này.** Nó cần `host_permissions: ["http://127.0.0.1/*"]`, tức
> **thêm quyền mới**, mà `AGENTS.md` mục 2 bắt hỏi Đức trước. **Chưa có câu chốt của Đức thì
> KHÔNG đụng vào `manifest.json`.** Làm mục 3a trước — nó không cần quyền nào mới.

### 3c. Ghi bằng chứng xuống đĩa

Báo cáo phải thành file để AI đọc lại được. **Nhưng chưa quyết chính sách che dữ liệu**, và
DOM của một trang đang đăng nhập là dữ liệu riêng tư — repo cấm để bí mật lọt vào file.

**Việc của bạn ở mục này: ĐỀ XUẤT chính sách che, đừng tự chốt.** Đề xuất rồi báo lại.
Câu hỏi phải trả lời: cái gì bị che mặc định (giá trị `input`? `value`? text node?), ai bật
được che ít hơn, và làm sao chứng minh bằng phép ghim rằng nó thật sự che.

## 4. Ba rủi ro tôi thấy — **[ĐỌC] mã, chưa kiểm chứng bằng chạy thật**

Ghi ra để executor kiểm, không phải để tin:

1. **`debugger` gắn được vào BẤT KỲ target nào**, kể cả trang ngân hàng Đức đang mở. Hiện không
   có danh sách trắng, không có bước xác nhận từng target. Cần chặn ở đâu?
2. **Chrome hiện một dải băng cảnh báo** *"… đang gỡ lỗi trình duyệt này"* khi có debugger gắn
   vào. Đức phải biết trước, đây là thực tế vận hành không giấu được.
3. **`observe()` gắn rồi tháo cho từng lượt.** Quan sát một trang đang đổi trạng thái thì gắn
   lại nhiều lần — chưa đo xem có tốn kém hay có bỏ sót gì không.

## 5. Nghiệm thu

Xanh khi cả sáu điều sau đúng:

1. Bốn phép dò ở 3a chạy được, mỗi phép có phép ghim riêng.
2. `dom.query` trả lời được *"selector khớp mấy phần tử"* trên một trang thật.
3. **Không một đường nào** nhận biểu thức từ bên ngoài. Chứng minh bằng phép ghim, không bằng lời.
4. **Đột biến kiểm:** thêm một đường ghi (gửi phím, sửa DOM, đổi storage) → phép ghim read-only
   phải ĐỎ. Con nào không đỏ thì phép ghim đó chưa ghim gì cả.
5. Suite gốc repo XANH, cổng đóng phiên XANH TOÀN BỘ.
6. **Chưa chạy live** — chạy thật trên trang phải hỏi Đức (`AGENTS.md` mục 2).

## 6. Cấm

- Cấm đụng `manifest.json` cho tới khi Đức chốt quyền mới (mục 3b).
- Cấm nối chuỗi để dựng biểu thức `Runtime.evaluate`.
- Cấm gỡ hay nới bất kỳ lớp bảo vệ read-only nào đang có để test xanh.
- Cấm chạy live trên trang thật.
- Cấm chuyển thư mục Observer trong lượt này — chỗ đặt chưa quyết, và chuyển chỗ giữa lúc đang
  xây làm mọi diff sau đó không đọc được.
