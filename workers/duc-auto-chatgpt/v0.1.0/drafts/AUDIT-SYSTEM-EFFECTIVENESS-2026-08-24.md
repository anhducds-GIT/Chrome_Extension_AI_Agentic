# Audit độc lập toàn hệ thống — 2026-08-24

Viết bởi Claude (vai auditor độc lập), theo yêu cầu của Đức: đánh giá lại toàn
bộ cách triển khai — khả năng tương tác, đọc/xử lý/phát tín hiệu/control —
xem hệ thống **thực sự đã hiệu quả chưa**, tối ưu được gì, và lộ trình để
tiến tới **vận hành tự hành** (agent tự improve, tự validate, chỉ chốt với
Đức ở các điểm cần thiết).

Cách làm: 4 khảo sát độc lập chạy song song trên 4 mảng (transport Bridge,
run-loop/DOM, tầng dữ liệu evidence, hạ tầng test), mỗi phát hiện đều có dẫn
chứng file:dòng cụ thể. File này là bản tổng hợp; ai cần chi tiết kỹ thuật
từng dòng thì các mục đều ghi rõ file liên quan.

---

## 1. KẾT LUẬN NGẮN (đọc 1 phút)

**Hệ thống ĐÃ hiệu quả cho chế độ vận hành hiện tại — Đức là người bấm.**
Kiến trúc an toàn thuộc loại tốt: mọi ghi đều có bằng chứng, mọi nghi ngờ đều
fail-closed (thà dừng chứ không đoán), exact-once được giữ nghiêm, 70 test
chạy xanh. Đây là nền đáng giữ, không cần đập đi.

**Hệ thống CHƯA sẵn sàng cho chế độ Đức muốn tiến tới — agent tự hành.**
Tầng 1 vừa mở quyền ghi cho AI, nhưng phần móng bên dưới vẫn được thiết kế
cho một người bấm vài lần mỗi ngày, không phải cho một agent gọi hàng chục
lệnh mỗi phút. 4 nhóm thiếu:

1. **An toàn dữ liệu khi sự cố** — sập giữa run là mất trắng sổ cái + audit
   của cả run, và job đã gửi có thể bị gửi lại (phá vỡ chính exact-once).
2. **An toàn khi agent retry** — 6 method Tầng 1 không chống trùng lặp;
   agent retry sau timeout (đúng theo hướng dẫn của giao thức!) sẽ nhân đôi job.
3. **Tín hiệu** — Bridge chỉ cho hỏi-đáp, không có kênh báo sự kiện; agent
   muốn theo dõi run phải hỏi dồn dập, vừa chậm vừa tốn.
4. **Tự validate** — 2 file chạm thế giới thật (`content.js`, `sidepanel.js`)
   đang ở 0% coverage thực thi; 10 hạng mục vẫn chờ Đức test sống bằng tay.
   Chừng nào nghiệm thu còn phải qua mắt người, agent chưa thể tự hành.

**Lời khuyên chính:** đừng thêm tính năng mới vội. Làm 3 giai đoạn theo thứ
tự: (1) vá móng an toàn, (2) nâng Bridge lên chuẩn agent, (3) xây bộ test tự
động thay cho test-sống-bằng-tay. Xong 3 cái đó thì vòng tự hành
(agent đề xuất → code → tự validate → báo cáo) mới đứng vững được.

---

## 2. HIỆN TRẠNG — CÁI GÌ ĐANG TỐT (giữ nguyên, không đụng)

| Điểm mạnh | Bằng chứng |
|---|---|
| Gán kết quả cho đúng job dựa trên bằng chứng, không đoán. Mơ hồ → fail-closed với lý do riêng, không bao giờ lấy bừa ảnh | `image-evidence-core.js`, `content.js` (boundary snapshot trước khi gửi) |
| Exact-once: mỗi prompt gửi đúng 1 lần, chống re-entry, chống gửi đè khi đang generate | `content.js` (từ chối chạy khi Stop còn hiện), 2 lớp readiness gate |
| Lưu file xong phải đọc lại xác minh từng byte mới được báo "đã lưu" | `output-location-core.js` verifyPersistedFile |
| Checkpoint bất biến, đánh version, phát hiện được cả xung đột `v002`/`v02` | `checkpoint-core.js` + assertCheckpointVersionAvailable |
| Giao thức Bridge: default-deny, validate ở mọi chặng, chống prototype-pollution (lỗi cũ đã vá + có test khoá), token so sánh constant-time, khung WebSocket tự viết rất thận trọng | `bridge-core.js`, `bridge-host.mjs`, test registry |
| `run.start/pause/resume` thực sự không tồn tại — không có đường lách nào tới Run | registry + prohibited_methods + test |
| 24 module core nhỏ, thuần, test được bằng Node thật (không mock) | tests/ chạy module thật trong vm |

Đây là những bất biến đã ghi trong AGENTS.md — mọi improve bên dưới đều
**không được** làm yếu chúng.

---

## 3. HIỆN TRẠNG — CÁI GÌ ĐANG YẾU (xếp theo mức nghiêm trọng)

### Nhóm A — Có thể mất dữ liệu hoặc ra kết quả sai (vá trước tiên)

**A1. Sập giữa run = mất cả run.** Sổ cái và audit chỉ được ghi xuống đĩa
**sau khi run kết thúc** (trong khối `finally`). Đóng nhầm side panel giữa
một run 50 job → mất toàn bộ 50 dòng kết quả + toàn bộ audit của run đó (ảnh
thì còn, vì ảnh lưu ngay). Tệ hơn: các job đã gửi nhưng chưa kịp ghi
`submitted_at` sẽ bị phân loại "chưa gửi" khi resume → **bị gửi lại**, đúng
cái lỗi mà toàn bộ thiết kế exact-once sinh ra để chống.
*(sidepanel.js — audit() chỉ đẩy vào mảng bộ nhớ; saveAuditLog/saveLedger chỉ ở finally)*

**A2. Agent retry = nhân đôi job.** Giao thức khai `REQUEST_TIMEOUT` là
"retryable, hãy retry đúng request_id cũ", nhưng 6 method Tầng 1 đều khai
`idempotent: false` nên bộ nhớ chống-lặp không hoạt động với chúng. Agent
làm đúng hướng dẫn → `jobs.add` chạy 2 lần, ra job trùng với ID mới. Máy móc
chống-lặp **đã có sẵn** (replay store), chỉ chưa bật cho 6 method này.

**A3. Bộ phát hiện CAPTCHA quét cả prompt của chính mình.** Nó quét toàn
trang, mà sau khi gửi thì prompt của job đã hiện trên trang. Một prompt kiểu
"vẽ robot đang giải captcha" → halt oan **cả batch**, báo là bị chặn bảo mật.
Bộ phát hiện quota đã được sửa đúng cách (chỉ quét 1 message của assistant)
— vì chính lớp lỗi này — nhưng bộ CAPTCHA thì bị bỏ sót.

**A4. Mất tab ChatGPT bị báo nhầm thành CAPTCHA.** Do thứ tự phân loại lỗi:
nhánh `HARD_STOP` bắt trước nhánh `receiver`. Halt vẫn đúng (an toàn), nhưng
hướng dẫn hiện ra cho Đức là "hoàn thành CAPTCHA, đừng gửi lại" trong khi
việc đúng là "mở lại tab". Chẩn đoán sai → thao tác khắc phục sai.

**A5. Có thể lưu nhầm ảnh không liên quan.** Đường fallback nhận "ảnh mới
xuất hiện" quét **toàn trang**: một thumbnail sidebar, avatar, ảnh lazy-load
≥64px đều là ứng viên. Xác suất thấp nhưng hậu quả là **ảnh sai được ghi
nhận là output đã xác minh** — loại lỗi im lặng nguy hiểm nhất.

**A6. Hai cửa sổ race quanh lock.** `approveBridgeProposal` và `run()` đều
có đoạn `await` dài **trước khi** đặt cờ khoá — một mutation từ Bridge lọt
vào đúng cửa sổ đó có thể thay `state.workbook` trong khi run loop còn giữ
tham chiếu vào bản cũ → kết quả từng job ghi vào một document mồ côi.

**A7. Host không được xác thực ngược.** Extension gửi token cho bất kỳ tiến
trình nào trả lời `auth_ok` trên cổng đã pair. Một tiến trình local (cùng
user) chiếm cổng trước host thật (host vừa crash, hoặc đua lúc logon) sẽ
**lấy được token và toàn quyền 6 method Tầng 1**. Trong threat model
"máy cá nhân của Đức" thì rủi ro thực tế thấp, nhưng chi phí vá nhỏ
(bắt host chứng minh có token trước khi extension gửi token).

**A8. Checkpoint hỏng giữa chừng làm kẹt vĩnh viễn bộ đếm version.** File
ghi dở nằm lại trên đĩa, version không nhích → mọi lần thử lại đều đụng
`CHECKPOINT_VERSION_CONFLICT`, trong khi hướng dẫn vận hành lại dặn "đừng
xoá checkpoint". Người dùng bị kẹt giữa 2 chỉ dẫn ngược nhau.

### Nhóm B — Lãng phí / giới hạn quy mô (tối ưu được ngay, ít rủi ro)

**B1. Mỗi sửa đổi nhỏ = cả một cỗ máy.** 1 lệnh `jobs.update` sửa 1 chuỗi
prompt tốn: 2 lần clone + parse toàn workbook, 3 lần nén ZIP toàn bộ, **ghi
đè lại toàn bộ file audit JSONL**, quét toàn thư mục output, và 1 file XLSX
mới. Agent ngồi "soạn queue kiểu hội thoại" (thêm 20 job, đảo vài cái, sửa 2
prompt) → **~25 file checkpoint trước khi run bắt đầu**, cạn luôn quy ước đặt
tên 2 chữ số trong 1 phiên. Thiết kế "mỗi ghi = 1 version bất biến" đúng cho
người bấm vài lần/ngày, sai cho agent. (Codex cũng đã tự cảnh báo điểm này.)

**B2. Trần quy mô ~100–200 job.** Mỗi lần sửa 1 ô là serialize lại **cả
sheet**; có chỗ nhân lên N lần cho N job (snapshotOutputSettings). 100 job
còn thoải mái, 500 job đã rất chậm, 1000 job gần như không dùng được. ZIP
đang để chế độ STORED (không nén) nên file phình ~4.3× so với cần thiết.

**B3. Audit JSONL "append" thật ra là đọc-hết-rồi-ghi-đè.** Vừa chậm vừa
rủi ro: một lần verify fail sau khi close là lịch sử cũ đã bị thay bằng bản
cụt.

**B4. 45–60% thời gian run là ngồi chờ.** Mỗi job SUCCESS gánh ~25–43 giây
chờ cố định: cooldown 6–9s bị tính **2 lần** (sau lưu + trước gửi) cộng thêm
delay 12–24s giữa job — 3 lớp cùng phục vụ 1 mục đích "đừng giống bot".
Ngược đời: job **lỗi** thì lại bỏ qua delay hoàn toàn — đúng lúc dễ đang bị
rate-limit nhất thì lại đi nhanh nhất. Retry cũng không có backoff luỹ tiến.

**B5. Polling không có tín hiệu thay đổi.** `run.status` không có số revision
→ agent phải kéo full payload và tự so sánh mỗi lần hỏi. `queue.list` băm
SHA-256 lại từng dòng trên **mỗi** lần gọi.

### Nhóm C — Thiếu cho tự hành (phải xây mới)

**C1. Agent không tự kiểm chứng được việc mình vừa làm.** Không có method
đọc checkpoint/audit qua Bridge; `ledger_etag` đổi theo timestamp mỗi lần
ghi nên chỉ nói "có gì đó đổi" chứ không nói "đổi cái gì"; muốn xác minh 1
sửa đổi trong workbook 1000 job phải kéo 10 trang `ledger.read`. Không có
file tóm tắt machine-readable nào bên cạnh XLSX.

**C2. CLI chưa đạt chuẩn agent.** Thiếu subcommand cho cả 6 method Tầng 1
(phải tự đóng envelope thô), không có `--request-id` (nên không thể retry
đúng chuẩn), không có timeout, không phân biệt lỗi retry-được với lỗi chết.

**C3. Host không được trông nom.** Chỉ là shortcut trong Startup folder —
crash là chết đến lần logon sau (đã xảy ra thật: hôm nay tôi phát hiện host
đang tắt và phải tự khởi động lại). Không có endpoint health để phân biệt
"host chết" với "extension offline".

**C4. Lỗi cấu hình bị khai là "retry được".** Mọi lý do khoá đều trả về
`RUN_ACTIVE (retryable)` — kể cả "chưa bật lưu audit", thứ chỉ người sửa
được. Agent ngoan ngoãn sẽ retry vô hạn.

**C5. Bộ test không đỡ được vòng tự hành.** Con số "70/70 pass" cần đọc
đúng: các module core được test **thật** (chạy code thật), nhưng ~30/70 test
chỉ là grep chuỗi trên source — đổi tên hàm, sửa caption tiếng Việt, format
lại code là đỏ build dù không có regression nào; ngược lại code sai vẫn xanh
miễn là chuỗi còn xuất hiện. `content.js` (589 dòng) và `sidepanel.js`
(4.365 dòng) — đúng 2 file chạm thế giới thật — **chưa từng được chạy trong
test**. Hàng chờ "Đức test sống" đã dồn 10 hạng mục qua nhiều phiên: đây
chính là nút thắt cổ chai thật sự của tốc độ dự án.

**C6. Evidence chưa chống được chỉnh sửa.** Audit JSONL không có số thứ tự,
không có hash móc xích; sửa/xoá 1 dòng, thay 1 ảnh, sửa 1 ô checkpoint —
không gì phát hiện được. Khi chỉ có Đức ghi thì chấp nhận được; khi nhiều
agent cùng có quyền ghi thì chuỗi bằng chứng cần tự bảo vệ mình.

**C7. Tài liệu đã trôi so với thực tế.** `AGENT-BRIDGE-ROADMAP-AND-GUIDE-V1.md`
vẫn viết "Bridge chỉ làm được 2 việc, chưa có tab BRIDGE" — sai từ hôm nay.
README thiếu `run-status` và cả 6 method Tầng 1. Với hệ thống lấy file làm
nguồn sự thật, tài liệu sai là bug ngang code sai.

---

## 4. ROADMAP ĐỀ XUẤT — 5 giai đoạn, mỗi giai đoạn nghiệm thu được

Nguyên tắc chung: **Codex implement theo brief, Claude audit độc lập từng
đợt, Đức chỉ chốt ở các cổng ghi rõ bên dưới.** Không giai đoạn nào làm yếu
các bất biến ở mục 2.

### Giai đoạn 0 — Chốt nền hiện tại (1 buổi, đang dở)
- Đức reload extension → tôi tự test sống 6 method Tầng 1 qua CLI → Đức
  nghiệm thu tab BRIDGE bằng mắt → **commit** (xin phép trước, như luật).
- Sửa luôn 2 việc 5 phút: cập nhật 2 tài liệu trôi (C7).
- *Điểm chốt của Đức: duyệt commit.*

### Giai đoạn 1 — Vá móng an toàn (ưu tiên cao nhất, ~1–2 đợt Codex)
Toàn bộ nhóm A. Cụ thể theo thứ tự giá trị:
1. Ghi audit + checkpoint **trong lúc run** (mỗi K job hoặc T giây) và ghi
   `submitted_at` xuống đĩa **trước khi** gửi prompt → sập giữa run không
   mất dữ liệu, không còn đường gửi-lại-job-đã-gửi. (A1)
2. Bật `idempotent: true` cho 6 method Tầng 1 (máy móc replay có sẵn). (A2)
3. Thu hẹp phạm vi quét của bộ CAPTCHA về đúng vùng interstitial/message —
   copy đúng pattern bộ quota đã làm. (A3)
4. Đảo thứ tự phân loại `RECEIVER_LOST` trước `HARD_STOP`, chuyển sang mã
   lỗi có cấu trúc thay vì đoán qua chuỗi. (A4)
5. Giới hạn ứng viên ảnh vào đúng cây hội thoại; bỏ ảnh `role:"unknown"`
   khỏi đường fallback. (A5)
6. Đặt cờ khoá **trước** mọi `await`; `run()` phải kiểm tra khoá mutation. (A6)
7. Xác thực 2 chiều trên handshake WebSocket (host phải chứng minh có token
   trước khi extension gửi token). (A7)
8. Version bị kẹt do file ghi dở → tự cách ly file `.partial` và nhích
   version, ghi audit. (A8)
- *Điểm chốt của Đức: duyệt brief giai đoạn, duyệt commit cuối. Không có
  quyết định chính sách nào mới ở đây — toàn sửa cho đúng thiết kế đã có.*

### Giai đoạn 2 — Nâng Bridge lên chuẩn agent (~2 đợt Codex)
Mục tiêu: agent đọc được, ghi an toàn, thấy được tín hiệu, tự kiểm chứng được.
1. CLI: thêm 6 subcommand Tầng 1, `--request-id`, timeout, phân loại lỗi
   retry-được/không. (C2)
2. File sidecar `__results__vNN.json` cạnh mỗi checkpoint XLSX (dữ liệu đã
   sẵn trong bộ nhớ lúc ghi — chi phí ~0) kèm `self_sha256`/`prev_sha256`
   → agent diff được 1 phát, đồng thời khởi động chuỗi chống-chỉnh-sửa. (C1+C6)
3. Số revision đơn điệu trên `run.status` + `if_none_match` trên các lệnh
   đọc; method `run.watch` long-poll (trả về sớm khi có thay đổi) — nhỏ hơn
   nhiều so với xây event-stream đầy đủ. (B5, C1)
4. `if_ledger_etag` optional trên 5 method ghi → agent không đè nhầm sửa đổi
   tay của Đức. Tách `RUN_ACTIVE` khỏi lỗi cấu hình (non-retryable). (C4)
5. `jobs.reorder` nhận cả mảng `{order:[...]}` (brief gốc có, Codex chưa làm);
   dạng mảng cho update/remove — mỗi call 1 checkpoint thay vì N. (B1 một phần)
6. Host: chuyển sang Scheduled Task có restart-on-failure + `GET /v1/health`;
   method `bridge.activity.read` đọc lại lịch sử mutation. (C3)
- *Điểm chốt của Đức: duyệt brief + commit. Vẫn chưa đụng chính sách.*

### Giai đoạn 3 — Tự validate: bộ test thay mắt người (⚠ cần 1 quyết định)
Đây là khoản đầu tư đòn bẩy cao nhất toàn roadmap: chừng nào mọi thay đổi
còn chờ Đức test sống, agent chưa thể tự hành thật.
1. **Quyết định cần Đức chốt trước:** luật 8 AGENTS.md cấm "build
   preview/harness để tự xem UI" — nhưng lý do ghi kèm chỉ đúng cho Browser
   pane trong app (chặn script, bỏ stylesheet). Chrome **thật** chạy
   extension **thật** qua Playwright/CDP không dính giới hạn đó. Đề xuất:
   sửa luật 8 thành "không dùng in-app preview; harness Chrome thật thì
   được", ghi vào `decisions.md`.
2. Xây trang giả lập chatgpt.com (~100 dòng HTML đúng các selector thật) và
   phục vụ nó **dưới đúng origin chatgpt.com** qua CDP intercept → manifest
   không phải sửa. Bộ test E2E: exact-once, readiness, attribution, pause/
   resume, quick-prompt, hard-stop khi đóng tab, và 6 method Bridge chạy
   xuyên extension thật.
3. Kết quả kỳ vọng: **7/10 hạng mục test-sống hiện tại thành test tự động.**
   Còn lại của con người thật sự: chọn folder (OS picker không tự động hoá
   được), câu chữ quota thật (phải chờ đụng tường thật), và selector-trôi
   trên chatgpt.com thật (giảm nhẹ bằng snapshot DOM định kỳ + cảnh báo drift
   trong Check Plan — dữ liệu `sendButtonFound` đã có sẵn mà Check Plan chưa dùng).
4. Dọn nợ bộ test hiện có: guard chống test-rỗng (segment length > 0), bỏ
   assert vào caption tiếng Việt (vi phạm chính luật 4 của AGENTS.md), thêm
   timeout cho run-all.
- *Điểm chốt của Đức: (a) sửa luật 8; (b) duyệt commit harness.*

### Giai đoạn 4 — Tối ưu quy mô & thông lượng (⚠ cần 2 quyết định)
Làm **sau** khi có harness ở Giai đoạn 3, vì đây là chỗ dễ vỡ hành vi nhất.
1. Serialize sheet 1 lần lúc ghi file thay vì mỗi lần sửa ô (O(N²)→O(N));
   bỏ nhân bản 17 cột config vào từng dòng job; bật nén DEFLATE. (B2)
2. Audit JSONL append thật + chuỗi hash `seq`/`prev_sha256`. (B3, C6)
3. **Quyết định cần Đức chốt:** gộp checkpoint — `session.checkpoint` hoặc
   transaction `queue.begin/commit` để 20 sửa đổi của agent = 1 version thay
   vì 20. Điều này **thay đổi** triết lý "mỗi ghi = 1 version bất biến" nên
   phải ghi `decisions.md` trước, đúng như brief Tầng 1 đã dặn. (B1)
4. **Quyết định cần Đức chốt:** chính sách dọn checkpoint cũ (giữ v01 + K
   bản cuối, phần còn lại chuyển vào thư mục `superseded/`, không xoá).
5. Thông lượng run: gộp 2 lần cooldown thành 1 ngân sách; áp delay cả sau
   job lỗi; backoff luỹ tiến khi retry. Ước tính lấy lại 10–15% thời gian
   chạy mà không giảm lớp chống-bot nào. (B4)

### Giai đoạn 5 — Vòng tự hành (mục tiêu cuối của Đức)
Khi 1–4 xong, vòng lặp này mới an toàn:
```
Agent (Claude điều phối, Codex implement)
  → đề xuất improve (ghi brief vào drafts/)
  → code trên nhánh riêng, KHÔNG đụng main
  → tự validate: npm test + harness E2E + tự diff sidecar JSON
  → báo cáo kết quả kèm bằng chứng
Đức chỉ chốt ở 3 cổng: duyệt brief lớn · merge vào main · mọi thay đổi
chính sách/bất biến (danh sách mục 2 + ranh giới Run)
```
- *Điểm chốt của Đức (một lần, ghi decisions.md): cho phép agent tự commit
  vào **nhánh làm việc** (không phải main) — hiện luật đang cấm mọi commit.
  Không có điều này thì "tự hành" chỉ tự được nửa vòng.*

---

## 5. TÓM TẮT CÁC ĐIỂM CẦN ĐỨC CHỐT (toàn roadmap chỉ có 5)

| # | Quyết định | Ở giai đoạn | Mặc định đề xuất |
|---|---|---|---|
| 1 | Duyệt commit Tầng 1 sau nghiệm thu sống | 0 | Commit sau khi tôi test CLI + anh xem tab BRIDGE |
| 2 | Sửa luật 8: cho phép harness Chrome thật (không phải in-app preview) | 3 | Đồng ý — lý do gốc của luật không áp vào Chrome thật |
| 3 | Gộp checkpoint cho phiên sửa của agent (đổi triết lý 1-ghi-1-version) | 4 | Đồng ý với điều kiện: audit JSONL vẫn ghi từng mutation |
| 4 | Chính sách dọn checkpoint cũ (chuyển `superseded/`, không xoá) | 4 | Giữ v01 + 5 bản cuối |
| 5 | Agent được commit vào nhánh làm việc; main vẫn chỉ Đức merge | 5 | Đồng ý — main được bảo vệ tuyệt đối như cũ |

Ranh giới **không bao giờ** nằm trên bàn: Run là của Đức; AI không tự gửi
prompt tới ChatGPT; không làm yếu exact-once/attribution/persistence
verification; không đụng pilot bảo vệ.

---

## 6. GHI CHÚ NGUỒN

4 báo cáo khảo sát gốc (đầy đủ file:dòng cho từng phát hiện) nằm trong
transcript phiên 2026-08-24; các phát hiện chính đã được tôi đối chiếu chéo
giữa các báo cáo trước khi đưa vào đây (ví dụ: lỗi idempotency được cả 2
khảo sát transport và evidence tìm ra độc lập — độ tin cậy cao). Con số đo
thật: checkpoint 3 job = 26.868 bytes (4,3× file nguồn); `detection_diagnostics`
= 1.775 bytes/job; ~30 selector chia 9 nhóm trong content.js; hàng chờ
test-sống = 10 hạng mục.
