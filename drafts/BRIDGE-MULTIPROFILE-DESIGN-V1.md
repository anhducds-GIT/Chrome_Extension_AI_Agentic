# BRIDGE-MULTIPROFILE-DESIGN-V1 — Nhiều profile Chrome dùng chung một Bridge

> Phiên: `claude-bridge-multiprofile` · Ngày: 2026-08-28
> Trạng thái: **ĐỨC ĐÃ DUYỆT hướng A ngày 28/08.** Phase 2 (code) **CHỜ** hai task đang
> chạy xong: (1) Stabilizing Bridge trên Gemini Extension — **ĐÃ XONG 28/08, package đã
> trả** (commit 3514aa5); (2) ChatGPT extension — dọn rác + feature text reasoning —
> còn chạy. Xong nốt task 2 mới claim package và implement.
>
> File này trả lời một câu hỏi: làm sao để Đức chạy extension trong NHIỀU profile Chrome
> cùng lúc, mà không phải tắt bật extension ở từng profile trước mỗi lần chạy,
> và AI vận hành luôn biết chắc mình đang nói chuyện với profile nào.

---

## 1. Vấn đề — đã đo thật ngày 2026-08-28, không phải phỏng đoán

Đức nạp extension vào 3 profile Chrome cùng lúc: `Default` ("Your Chrome"),
`Profile 10` ("S,C&T01"), `Profile 4` ("kaito"). Cả ba nạp từ CÙNG một thư mục.

Ba sự thật trong code làm hệ thống hỏng:

1. **Host chỉ giữ MỘT kết nối.** `bridge-host.mjs:115` — `let extension = null;`.
   Chỉ có một chỗ ngồi.
2. **Ai đến sau thì đá người trước.** `bridge-host.mjs:187–190` — socket mới xác thực
   xong là host huỷ mọi việc đang bay (`failAll("TRANSPORT_DISCONNECTED")`) và đóng
   kết nối cũ với lời nhắn "Replaced by a fresh extension session."
3. **Ba profile trông giống hệt nhau.** Cùng thư mục → cùng `extension_id`
   (id của extension unpacked sinh từ ĐƯỜNG DẪN thư mục). Cùng file pairing → cùng token.
   Message `auth` chỉ có token, không có danh tính (`bridge-transport-loopback.js:134`).
   `session.hello` trả `extension_id` nên cũng không phân biệt được
   (`bridge-router-core.js:38–47`). Host mù. AI vận hành cũng mù.

Và một cái máy bơm làm mọi thứ tệ đều đặn: service worker MV3 ngủ rồi thức liên tục,
mỗi profile có báo thức nối lại mỗi 30 giây (`bridge-transport-loopback.js:231`).
Ba profile thay nhau giành ghế cả ngày. Đó là triệu chứng "Bridge chập chờn"
trong bảng lỗi (`workers/duc-auto-gg-flow-video/v0.1.0/AI-OPERATOR-GUIDE.md`, dòng 90 và 95).

## 2. Vì sao đây là lỗi AN TOÀN, không phải bất tiện

- Lệnh ĐỌC (`diagnostics.dom_probe`) có thể rơi vào profile A, lệnh GHI ngay sau đó
  (`jobs.add`, `run.trial`) rơi vào profile B — vì ghế đã đổi chủ ở giữa. Kiểm một nơi,
  chạy nơi khác.
- Mỗi cú bấm Create trên Google Flow tốn **15 credit thật** trong tài khoản Google thật.
- Ngày 28/08 đã trả giá: một bản vá đúng bị báo "chưa nạp" chỉ vì profile được reload
  không phải profile đang giữ ghế.
- Khi ghế đổi chủ, `failAll` giết luôn việc đang bay của profile khác
  (`bridge-host.mjs:188`) — việc vô tội bị vạ lây.
- Workaround hôm nay: Đức phải tắt extension ở mọi profile thừa trước mỗi lần chạy.
  Thủ công, dễ quên, và chính là thứ thiết kế này xoá bỏ.

## 3. Ba hướng đã cân nhắc — so sánh trung thực

### Hướng A — Mỗi profile tự xưng danh, host giữ danh sách kết nối ← **ĐỨC ĐÃ CHỌN**

Extension sinh một mã định danh bền (lưu trong `chrome.storage.local` — kho này
RIÊNG cho từng profile), kèm một cái TÊN do Đức đặt. Gửi cả hai trong message `auth`.
Host giữ Map các kết nối sống thay vì một ghế. Thêm lệnh đọc `bridge.sessions` để
liệt kê ai đang nối. Lệnh nào cũng nhắm được đích.

- Được: giải đúng gốc bệnh. Đức không phải làm gì hàng ngày. Một cửa sổ host, một pairing
  như cũ. KHÔNG cần quyền Chrome mới (storage đã có sẵn trong manifest).
- Mất: đổi giao thức (bề mặt auth) → theo AGENTS.md §2 phải được Đức duyệt
  (**đã duyệt 28/08**). Sửa cả ba tầng: host, transport extension, script operator.
  Nhiều việc nhất trong ba hướng.

### Hướng B — Mỗi profile một host riêng, một cổng riêng — LOẠI

- Được: gần như không sửa code host.
- Mất, và mất nhiều: 3 profile × 3 worker = tới 9 cửa sổ đen + 9 file pairing Đức phải
  tự quản. Mỗi profile phải dán ĐÚNG file pairing của mình — dán nhầm là bệnh cũ quay lại
  mà KHÔNG máy nào phát hiện được. Ánh xạ "cổng nào = profile nào" chỉ tồn tại trong
  trí nhớ của Đức. Đánh giá thẳng: với người vận hành non-tech, hướng này TỆ HƠN hiện trạng.

### Hướng C — Mọi lệnh BẮT BUỘC nêu đích, không bao giờ có mặc định — LOẠI dạng thuần, GIỮ tinh thần

- Được: an toàn tuyệt đối, không bao giờ đoán.
- Mất: phá vỡ yêu cầu "một profile chạy y như cũ" — mọi script cũ hỏng, trả giá vĩnh viễn
  cho một rủi ro chỉ tồn tại khi có ≥2 kết nối.

### Phương án chốt: **A, ghép thêm luật fail-closed của C cho trường hợp ≥2 kết nối**

Một kết nối thì chạy như xưa, không ai phải đổi thói quen. Từ hai kết nối trở lên,
lệnh không nêu đích bị TỪ CHỐI kèm danh sách ứng viên — không bao giờ tự chọn.
Đây là tinh thần `OUTPUT_AMBIGUOUS` và luật composer-scope đã có trong codebase:
mơ hồ là từ chối, không phải đoán.

## 4. Thay đổi giao thức — viết chính xác từng byte

### 4.1. Message `auth` (extension → host) — THÊM một khối `instance`

```json
{
  "type": "auth",
  "role": "extension",
  "token": "<token như cũ>",
  "instance": {
    "schema_version": 1,
    "instance_id": "<UUID sinh lần đầu, lưu chrome.storage.local, bền qua restart>",
    "label": "<tên Đức đặt trong side panel, 1–64 ký tự, có thể tiếng Việt>",
    "worker": "duc-auto-gg-flow-video",
    "extension_version": "0.1.0"
  }
}
```

- Token vẫn là thứ duy nhất quyết định cho vào hay không. `instance` CHỈ để định tuyến,
  không tham gia xác thực. Không nới lỏng gì.
- Host CŨ nhận message này vẫn chạy: nó chỉ kiểm `type`/`role`/`token`
  (`bridge-host.mjs:181`), trường lạ bị bỏ qua. Tương thích ngược hai chiều.
- Extension CŨ nối vào host MỚI: thiếu `instance` → host coi là "phiên bản cũ, chưa có tên"
  (legacy), vẫn liệt kê được, vẫn nhắm đích được theo mã tạm của kết nối, nhưng
  KHÔNG có danh tính bền. Vẫn fail closed khi mơ hồ.

### 4.2. Host: Map kết nối thay cho một ghế

- `let extension = null` → `const sessions = new Map()` (khoá = `instance_id`).
- Cùng `instance_id` nối lại (service worker thức dậy) → thay socket cũ CỦA CHÍNH NÓ,
  chỉ huỷ việc đang bay của chính nó. `instance_id` khác → ngồi ghế mới, KHÔNG đá ai.
- Socket đóng → chỉ huỷ việc đang bay đã gửi vào đúng kết nối đó, mã lỗi
  `TRANSPORT_DISCONNECTED` (retryable, giữ nguyên khế ước idempotency-key hiện có).
  Hết cảnh `failAll` giết oan việc của profile khác.
- Trần `MAX_INFLIGHT` giữ nguyên, tính chung toàn host.

### 4.3. Envelope request (operator → host) — THÊM trường `target`, không bắt buộc

```json
{
  "protocol": "duc-auto-chatgpt.bridge",
  "version": 1,
  "kind": "request",
  "request_id": "...",
  "method": "...",
  "sent_at": "...",
  "client": { "...": "như cũ" },
  "params": { "...": "như cũ" },
  "target": "<instance_id HOẶC label — không bắt buộc>"
}
```

- Host TIÊU THỤ và GỠ BỎ `target` trước khi chuyển tiếp cho extension — extension
  không bao giờ thấy trường này, router hiện tại không phải sửa.
  (Đã kiểm: validator envelope không từ chối trường lạ — `bridge-core.js:603–613`
  chỉ kiểm trường bắt buộc — nhưng gỡ bỏ vẫn sạch hơn là dựa vào sự khoan dung đó.)

### 4.4. Luật định tuyến — bảng đầy đủ, fail closed

| Số kết nối sống | `target` | Host làm gì |
|---|---|---|
| 0 | (bất kỳ) | `EXTENSION_OFFLINE` — như cũ |
| 1 | không có | Chuyển cho kết nối duy nhất — **hành vi cũ giữ nguyên 100%** |
| ≥2 | không có | **TỪ CHỐI**: lỗi mới `TARGET_AMBIGUOUS`, kèm danh sách ứng viên |
| bất kỳ | khớp đúng 1 | Chuyển cho kết nối đó |
| bất kỳ | khớp 0 | **TỪ CHỐI**: lỗi mới `TARGET_NOT_CONNECTED`, kèm danh sách ứng viên |
| bất kỳ | label khớp ≥2 (trùng tên) | **TỪ CHỐI**: `TARGET_AMBIGUOUS`, kèm `instance_id` từng ứng viên |

Hai mã lỗi mới, do HOST tự trả (không đi qua registry mã lỗi trong extension,
nên không phải nới registry đó):

- `TARGET_AMBIGUOUS` — `retryable: false`. `details.candidates` = danh sách
  `{instance_id, label}`. Người/AI phải chọn rồi gọi lại.
- `TARGET_NOT_CONNECTED` — `retryable: true`. Đích có tên nhưng đang offline
  (thường là service worker đang ngủ; báo thức 30 giây sẽ nối lại — chờ rồi thử lại).

### 4.5. Lệnh mới `bridge.sessions` — host tự trả lời, chỉ đọc

```json
{
  "sessions": [
    {
      "instance_id": "3f2a…",
      "label": "kaito",
      "legacy": false,
      "worker": "duc-auto-gg-flow-video",
      "extension_version": "0.1.0",
      "connected_at": "2026-08-28T09:00:00Z",
      "last_seen_at": "2026-08-28T09:04:40Z"
    }
  ],
  "count": 1
}
```

Trả lời yêu cầu số 2 của Đức: AI vận hành THẤY ai đang nối, bằng đúng cái tên Đức đặt.

### 4.6. Dấu vân tay trên MỌI phản hồi: `served_by`

Host đóng dấu vào mỗi phản hồi chuyển tiếp thành công:

```json
"served_by": { "instance_id": "3f2a…", "label": "kaito" }
```

Đây là nửa còn thiếu của `runtime_contract`: contract nói content script có tươi không,
`served_by` nói RUNTIME NÀO vừa trả lời. Probe rồi chạy mà `served_by` đổi giữa chừng
= dừng ngay. (Validator phản hồi hiện không cấm trường lạ — `bridge-core.js:615–629` —
nhưng phải ghim bằng test, xem mục 8.)

### 4.7. Side panel — một ô nhập, tiếng Việt

Thêm vào phần Bridge của side panel một ô: **"Tên hồ sơ Chrome này"** (ví dụ: `kaito`).
Lưu `chrome.storage.local`. Có hiệu lực ở lần nối tiếp theo (panel ghi rõ điều đó).
Chưa đặt tên → hiển thị và báo danh là `(chưa đặt tên — 3f2a…)`. Không chặn kết nối —
tên là để con người đọc, mã định danh mới là thứ máy dùng.

### 4.8. Script operator

- `scripts/bridge-rpc.mjs`: thêm cờ `--target <tên|mã>`, đặt vào trường `target` của envelope.
- `bridge-cli.mjs`: thêm lệnh con `sessions`, và cờ `--target` cho mọi lệnh còn lại.
- Sổ tay operator thêm luật: **probe và run phải cùng một `--target`**, và khi có ≥2
  kết nối thì LUÔN nêu đích một cách tường minh.

## 5. Trả lời từng câu hỏi thiết kế đã đặt ra

1. **Operator nhắm đích thế nào?** `--target kaito` trên cả hai script (mục 4.8).
2. **Đích có tên nhưng rớt giữa chừng?** Việc đã gửi vào kết nối đó nhận
   `TRANSPORT_DISCONNECTED` (retryable, idempotency key như cũ). Việc chưa gửi nhận
   `TARGET_NOT_CONNECTED`. Không việc nào của profile khác bị vạ lây.
3. **In-flight khi một phiên rơi?** Chỉ huỷ việc của đúng phiên đó (mục 4.2) — sửa luôn
   cái sai hiện tại của `failAll`.
4. **`runtime_contract` theo từng phiên?** V1: `bridge.sessions` cho danh sách, rồi
   `dom_probe --target <x>` từng đích — hai lệnh, thấy độ tươi từng profile.
   Ghi vào backlog cho V2: panel gửi kèm chuỗi contract trong `auth` để một lệnh
   `bridge.sessions` thấy hết. Không làm ở V1 để giữ diff nhỏ.

## 6. Đường migrate cho ba worker

Hiện trạng đã xác minh 2026-08-28:

- Host của gemini và gg-flow-video **giống nhau từng byte**. Host của chatgpt KHÁC:
  có thêm bắt tay `auth_challenge`/`auth_proof` (extension thách thức host chứng minh
  token bằng HMAC). Thay đổi Map-kết-nối và khối `instance` KHÔNG đụng vào bắt tay đó —
  hai việc trực giao — nhưng phải diff trước khi port, không copy đè.
- Bản deploy tại `C:\WORKING ZONE\Chrome Extension Bridge\<worker>\` giống byte với repo
  (đã đối chiếu cho gg-flow-video) → sửa trong repo, copy ra, Đức khởi động lại host.

Thứ tự triển khai — mỗi bước là một claim package riêng, có test ghim + mutation test
+ audit Codex độc lập:

1. **gg-flow-video** trước (nơi đang đau, trần trial 3 job, môi trường thử an toàn nhất).
2. **gemini** (host giống hệt; phiên `claude-gemini-bridge-stability` đã đóng và trả
   package 28/08 — commit 3514aa5 có đổi `bridge-transport-loopback.js`, khối `instance`
   phải đắp LÊN bản đó, không đắp lên bản cũ).
3. **chatgpt** cuối (host khác biệt, diff thủ công từng đoạn; package đang có việc của
   phiên `claude-chatgpt-text-reasoning-passb` — chờ phiên đó đóng).

Trong lúc chuyển tiếp: host mới + extension cũ vẫn chạy (legacy, mục 4.1). Extension mới +
host cũ vẫn chạy (trường lạ bị bỏ qua, một ghế như cũ). Không có "big bang", không có
thời điểm nào cả hệ chết.

## 7. Quyết định của Đức — chốt 2026-08-28

1. **Duyệt hướng A** (kèm luật fail-closed mục 4.4). Đổi bề mặt auth được phép:
   thêm khối `instance` vào message `auth`. Token, pairing, cổng giữ nguyên tuyệt đối.
2. **Không có quyền Chrome mới nào** trong thiết kế này — `storage` đã có trong manifest.
3. **`_root` chuyển cho phiên này** (task của `claude-platform-orchestrator-study`
   độc lập, không xung đột) để đặt file thiết kế và khai bản đồ file.
4. **Phase 2 CHỜ hai task đang chạy đóng xong**: (1) Stabilizing Bridge — Gemini
   Extension; (2) ChatGPT extension — dọn rác + text reasoning. Xong mới claim
   package theo thứ tự mục 6.

## 8. Rủi ro còn lại — nói trước, không giấu

| Rủi ro | Mức | Đỡ bằng gì |
|---|---|---|
| Đức đặt hai profile trùng tên | Thấp | Fail closed: `TARGET_AMBIGUOUS` kèm mã định danh; panel gợi ý đổi tên |
| Copy nguyên thư mục profile Chrome → hai profile trùng `instance_id` | Thấp nhưng thật | Hai kết nối sẽ thay nhau chiếm chỗ CỦA NHAU (như bệnh cũ, nhưng khoanh trong một cặp). Panel cần nút "Tạo danh tính mới". Dấu hiệu nhận biết cho operator: `bridge.sessions` thấy một entry có `connected_at` nhảy liên tục |
| Service worker ngủ → phiên biến mất khỏi danh sách vài chục giây | Chắc chắn xảy ra | Đó là sự thật, không phải bug: danh sách nói đúng hiện trạng. `TARGET_NOT_CONNECTED` retryable + báo thức 30s nối lại |
| Trường lạ (`target`, `served_by`, `instance`) làm vỡ một validator chưa lường tới | Trung bình | Test ghim ở CẢ ba tầng trước khi chạy thật; mutation test từng chốt định tuyến (xoá dòng chặn ambiguous → suite phải đỏ) |
| Operator quên `--target` khi có 2 kết nối | Chắc chắn có ngày | Chính là ca `TARGET_AMBIGUOUS` — hệ thống từ chối thay vì đoán. Tính năng, không phải lỗi |
| Tưởng sửa host xong là hết bệnh, quên rằng profile "thừa" vẫn nhận job nếu bị NHẮM ĐÍCH nhầm | Trung bình | `served_by` trên mọi phản hồi + luật sổ tay "probe và run cùng target" + `runtime_contract` per-tab đã có sẵn |

## 9. Ngoài phạm vi — cố ý không làm

- Không tự phát hiện TÊN profile Chrome từ hệ điều hành (không có API extension nào cho
  việc đó; con đường gần nhất cần quyền `identity` mới → không đáng đổi một quyền lấy một
  tiện ích mà ô nhập tên làm được).
- Không đổi pairing, token, số cổng. Một host một worker như cũ.
- Không thêm cơ chế tự chọn "profile tốt nhất". Mơ hồ là từ chối — vĩnh viễn.
- Không gộp ba host thành một process. Khác bài toán, khác ngày.
- Không đổi trần trial, exact-once, attribution, quota/CAPTCHA halt — mọi lớp an toàn
  hiện có giữ nguyên.

---

*Nguồn bằng chứng: `bridge-host.mjs` (gg-flow-video, dòng 115, 181, 187–190, 210–215),
`bridge-transport-loopback.js` (dòng 23, 134, 231), `bridge-router-core.js` (38–47),
`bridge-core.js` (603–629), `AI-OPERATOR-GUIDE.md` gg-flow-video (dòng 33–82, 90, 95),
`.agents/claims.json`, diff host chatgpt ↔ gg-flow-video chạy 2026-08-28.*
