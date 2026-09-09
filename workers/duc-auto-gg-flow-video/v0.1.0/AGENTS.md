# AGENTS — Duc Auto GG Flow Video

CORE của package này. Đọc cùng `README.md` (project là gì) và `HANDOFF.md`
(trạng thái, Log) trước khi làm bất cứ việc gì. Package là **fork từ
`workers/duc-auto-gemini/v0.2.0`** — luật nào không ghi khác ở đây thì áp dụng
y như `AGENTS.md` của package đó và `AGENTS.md` gốc repo.

**Sổ cái của gói: [`docs/adr/`](docs/adr/)**, mục lục ở [`decisions.md`](decisions.md).
Gói sinh ra bởi [ADR-0001](docs/adr/0001-ba-chot-khai-sinh-package-flow-00.md) (trang đích ·
quyền host · tên gói), quyền host về sau nới có kiểm soát cho URL mang mã ngôn ngữ ở
[ADR-0010](docs/adr/0010-mo-rong-host-match-cho-url-co-locale.md). Vòng chạy của gói do
[ADR-0006](docs/adr/0006-duc-giao-phien-claude-flow-1-tu-trien-khai.md) giao, và
[ADR-0005](docs/adr/0005-chat-reload-vao-allowlist-bootstrap.md) cho `chat.reload` để vòng
debug tự chạy khỏi mượn tay Đức.

## Luật vàng riêng của nhánh video

1. **Không đoán selector.** Mọi selector Flow phải có bằng chứng `dom_probe`
   trong `evidence/`. SELECTORS/TIMING đang là đồ thừa kế từ Gemini — KHÔNG
   được coi là đúng cho Flow.
2. **Video trừ credits thật.** Trần trial dev **suy từ chip cấu hình đang hiển thị**
   (F-22, 05/09): ngân sách một tài khoản free là 50 credit, chia cho đơn giá đọc
   được trên chip → 360p x1 được 7 job · 720p x1 chỉ 3 · 360p x3 chỉ 2. `MAX_TRIAL_JOBS = 7`
   là **trần tuyệt đối**, chip chỉ được HẠ trần xuống, không bao giờ nâng. Không đọc được
   chip thì lấy cấu hình đắt nhất đã đo. **Không retry tự động khi nghi ngờ đã trừ credits**
   ([ADR-0002](docs/adr/0002-luat-an-toan-nhanh-video.md) — vế còn sống duy nhất của quyết định
   đó; trần ≤2 và khoá bootstrap đều đã chết).
   **Nới trần tuyệt đối = đổi luật an toàn = hỏi Đức.** Con số cũ **3 job** (chốt 27/08) **đã
   chết 05/09** — cố ý không đặt liên kết tới quyết định đó ở đây, vì trích một vế đã chết là
   đúng thứ cổng kiểm chặn.
3. **Khoá bootstrap Bridge đã được gỡ ngày 2026-08-27**
   ([ADR-0007](docs/adr/0007-go-khoa-bootstrap-bridge-f-05.md)) sau khi provider adapter được dựng
   từ bằng chứng thật, có test ghim và audit đối kháng PASS. Full method surface khả dụng,
   nhưng mọi gate an toàn riêng vẫn giữ nguyên.
   `diagnostics.evidence_submit` ([ADR-0004](docs/adr/0004-diagnostics-evidence-submit-primitive-tuong-tac.md))
   được giữ làm
   công cụ debug với trần cứng 3 lượt/trang; `run.trial` chỉ chạy khi bật toggle **Chế độ phát
   triển (Dev Mode)** trong side panel, và trần của nó là **trần ở luật 2** — `MAX_TRIAL_JOBS`
   trong `dev-trial-core.js`, hôm nay là **7**, hạ theo chip cấu hình.
   > **Sửa 09/09.** Dòng này ghi *"`run.trial` có trần 3 job"* — con số 27/08, **chết từ 05/09**
   > khi F-22 đổi sang suy trần từ chip (luật 2 ngay trên). Mã nói 7, luật 2 nói 7, dòng này nói
   > 3: **hai con số an toàn khác nhau trong CÙNG một file**, và nó là con số về TIỀN. Trần thật
   > khai ở đúng một chỗ trong mã — đừng gõ lại nó vào văn bản lần nữa.
4. Các luật thừa kế nguyên văn từ nhánh Gemini/ChatGPT: không innerHTML;
   không làm yếu exact-once / attribution / readiness / persistence /
   checkpoint / security hard-stop; chữ operator tiếng Việt, CODE tiếng Anh;
   sửa `.js` → nhắc Đức reload extension; mỗi fix một test ghim.
5. `evidence/` chỉ THÊM, không sửa, không xoá.
6. **Fix nhỏ không cần audit độc lập** — Đức chốt 02/09
   ([ADR-0009](docs/adr/0009-bo-audit-doc-lap-cho-fix-nho.md)): làm thẳng, gặp bug sửa thẳng.
   **VẪN audit** khi đụng lớp an toàn (`AGENTS.md` gốc mục 3), đường tiêu credit, hay bắt tay
   Bridge. Không đổi: suite xanh · cổng xanh · mỗi fix một test ghim · đẩy bằng `safe-push.mjs`.
   > **Vế này đá với `AGENTS.md` gốc mục 2** (*"với code thì đã qua audit độc lập"*), và ranh
   > giới *"fix nhỏ"* chưa ai chốt câu chữ. **Chờ Đức** — xem mục Hệ quả của ADR-0009.

## Bản đồ file

| File / thư mục | Vai trò |
|---|---|
| `tests/bridge-transport-liveness-smoke.mjs` | Ghim lớp ổn định kết nối Bridge (port từ Gemini qua ChatGPT, 02/09): keepalive **chờ ACK có hạn**; buông socket ngay khi phán nó chết chứ không đợi sự kiện `close` mà socket `CLOSING` có thể không bao giờ phát; reconnect **thang trần 5 giây**, bỏ cuộc sau cửa sổ rồi nhường alarm 30 giây; **hạn bắt tay** phủ cả socket không bao giờ mở lẫn socket mở mà host không trả lời. Ghim riêng cho nhánh này: **cờ đang-nối** — nhánh này đọc identity TRƯỚC khi tạo socket nên không giữ socket trước `await` được như hai nhánh kia, và cờ này là thứ chặn hai lượt nối chồng nhau. Fake socket có trạng thái `CLOSING` thật |
| `manifest.json` | MV3, match `https://labs.google/fx/tools/flow/*` |
| `README.md` | Tổng quan, trạng thái Bridge, cài đặt |
| `AGENTS.md` | File này |
| `STATUS.md` | Trạng thái vận hành 1 trang (máy đọc frontmatter sinh DASHBOARD) |
| `HANDOFF.md` | Trạng thái + **20 lượt Log gần nhất** (chỉ thêm dòng). Cắt đuôi 2026-09-06 theo ADR-0008 của gốc repo; lịch sử cũ hơn ở `HANDOFF-ARCHIVE-01.md` |
| `HANDOFF-ARCHIVE-01.md` | **Đuôi đã cắt của `HANDOFF.md`** — 183 lượt Log cũ, nguyên văn, không sửa một chữ. Chỉ đọc; ghi Log mới thì ghi vào `HANDOFF.md`. Ghép lại dựng được bản gốc giống hệt từng byte (bất biến ⑴ của ADR-0008) |
| `BACKLOG.md` | Việc còn mở, đánh số `F-xx` |
| `decisions.md` | **Nay là MỤC LỤC** trỏ sang `docs/adr/` (N-55, 09/09). Đừng thêm mục vào đây nữa |
| `docs/adr/` | ADR bất biến — quyết định của riêng gói này. Đã `Accepted` thì KHÔNG sửa; đổi ý thì viết ADR mới, trỏ hai chiều. B12 cưỡng chế. **Đếm, đừng tin một con số gõ tay:** `ls docs/adr/*.md \| wc -l` |
| `AI-OPERATOR-GUIDE.md` | Vận hành/debug qua Bridge (trỏ về guide Gemini + khác biệt Flow) |
| `NEXT-SESSION-BRIEF.md` | Brief bàn giao phiên kế tiếp (kiểm ngày trước khi tin; HANDOFF mới hơn thì HANDOFF thắng) |
| `DAC_XLSX_RUN_PLAN_V1.md` | Hợp đồng schema workbook (thừa kế, sẽ mở rộng cho video) |
| `provider-adapter.js` | Nơi DUY NHẤT biết về trang Flow (ORIGIN đã đổi; SELECTORS/TIMING còn là của Gemini, chờ bằng chứng) |
| `background.js`, `content.js`, `sidepanel.js`, `sidepanel.html`, `sidepanel.css`, `sidepanel-ui-semantics.js` | Runtime thừa kế nguyên trạng từ Gemini v0.2.0 |
| `bridge-core.js`, `bridge-router-core.js`, `bridge-pairing-core.js`, `bridge-proposal-core.js`, `bridge-transport-loopback.js` | Agent Bridge (full method surface; gate riêng của từng method vẫn áp dụng) |
| `run-liveness-core.js` + `tests/run-liveness-core-smoke.mjs` | **F-25 bước ②**: phân biệt "đang chờ nhịp" với "vòng chạy đã chết âm thầm". Hàm THUẦN (`now` là tham số, nên ca "đã 22 phút" dựng được bằng test). Nhịp tim do CHÍNH vòng lặp chạy job đập ra — không phải `setInterval`, vì panel vẫn sống lúc gãy. Mỗi giai đoạn tự khai trần chờ; `WAITING_JOB` lấy trần từ timeout thật của job |
| `*-core.js` còn lại (`runner-core.js`, `image-evidence-core.js`, `attempt-identity-core.js`, `attempt-telemetry-core.js`, `approval-persistence-core.js`, `audit-chain-core.js`, `chat-readiness-core.js`, `checkpoint-core.js`, `content-decision-core.js`, `dev-trial-core.js`, `halt-instructions-core.js`, `operator-glossary-core.js`, `operator-messages-core.js`, `orchestrator-review-core.js`, `output-location-core.js`, `output-profile-core.js`, `plan-diagnostics-core.js`, `reconciliation-core.js`, `recreate-core.js`, `resume-core.js`, `run-state-core.js`, `xlsx-codec.js`, `xlsx-run-plan-core.js`) | Core thuần thừa kế — sửa món nào ghi món đó vào Log |
| `tests/flow-video-timeout-budget.mjs` | **F-08**: trần chờ sinh video phải suy từ SỐ ĐO, không kế thừa nhánh ảnh. Ca xấu nhất **175 giây** (9 job live 02/09, đo khoảng `GENERATING`→`FINALIZING`); khẳng định `perJobTimeoutMs` và `DEFAULTS.timeout_sec` đều ≥ 3× số đó và ≤ trần 900s mà `whole()` chấp nhận. Trần này áp lên giai đoạn SAU khi credit đã tiêu, nên hết trần sớm là vứt một video đã trả tiền và dừng cả mẻ — chật ở đây là rủi ro TIỀN |
| `tests/flow-zoom-control-reason.mjs` | Nút **CHAT ZOOM** xám phải NÓI ĐƯỢC vì sao. Tới 06/09 bốn nguyên nhân khác hẳn nhau (chưa có API tab · đọc tab lỗi · tab đang xem không phải trang Flow · Chrome từ chối đọc mức phóng to) cùng cho ra một kết quả câm, nên một báo lỗi "nút zoom hỏng" không chẩn đoán được từ code. Phép kiểm **trích hàm thật** ra khỏi `sidepanel.js` rồi chạy — chép lại logic sang test thì đột biến vào code không làm nó đỏ |
| `tests/zoom-control-smoke.mjs` | **N-13 + N-14**: cổng của nút **CHAT ZOOM** hỏi `isProviderOrigin` chứ không `isProviderUrl`. Hai câu hỏi khác nhau — `isProviderUrl` là cổng của **runner** (*"một run có được phép gõ vào tab này không"*) nên nó đòi đúng mặt trang công cụ; nút phóng to chỉ gọi `chrome.tabs.setZoom`, không gửi gì, không gõ gì. Phép kiểm nạp **adapter thật** vào `vm` rồi trích **thân hàm thật** ra khỏi `sidepanel.js` và chạy — khác `flow-zoom-control-reason.mjs`, file kia tiêm một `isChatGPTUrl` **giả** dựng lại từ regex trong chính nó nên không canh được cổng này. Hai bẫy đã trả giá: sân khấu giả phải cho nút khởi đầu **TẮT** (đúng như `sidepanel.html` ship), và phải có **một ca đi từ trạng thái ĐANG BẬT** — thiếu nó thì đột biến xoá lệnh tắt nút trong `lockZoomButtons` vẫn xanh. Đột biến **16/16** |
| `tests/flow-video-detection-new-home.mjs` | **F-31 bước ③**: nhận diện video trên nhà mới. Nhà mới KHÔNG còn thẻ `<video>`; video hiện bằng ảnh đại diện `<img>` trong `<flow-video-tile>`. **Ảnh Đức TẢI LÊN dùng cùng dạng địa chỉ và cũng nằm trong tile**, chỉ khác thẻ bọc `<flow-image-tile>` — nhận theo địa chỉ là ghi nhầm ảnh đầu vào thành video đầu ra. Phép kiểm đọc THẲNG file bằng chứng để tự chứng minh cái bẫy còn đó, và tự báo hết-lý-do-tồn-tại nếu Google tách hai dạng địa chỉ |
| `tests/security-blocker-evidence.mjs` | **F-34**: lớp dò cảnh báo an toàn phải NÓI ĐƯỢC nó thấy chữ gì. Nó quét TOÀN BỘ chữ trên trang bằng một biểu thức rồi chỉ trả `"có"` — một lớp an toàn câm để lại đúng hai lựa chọn, cả hai đều tồi: tin mù, hoặc gỡ lớp chặn. Phép kiểm giữ cửa thứ ba, và ghim **ranh giới**: phần thêm CHỈ để chẩn đoán, lớp quyết định chặn không được đụng. Đoạn trích bị chặn trần độ dài — chẩn đoán không được biến thành đường rò nội dung trang |
| `tests/provider-overload-gate.mjs` | **F-35**: Flow báo quá tải — **loại trạng thái thứ BA**, khác hẳn bảo mật và hết hạn mức, và là loại **duy nhất mà "cứ thử đi" tốn tiền thật** (hai loại kia đều dừng trước khi gõ). Ghim: bộ dò khớp câu đã đo và **từ chối** câu gần giống · **cả hai nhánh** của biểu thức đều được canh riêng · cổng chặn nằm ở chỗ credit CHƯA tiêu · luật F-20 (câu ném cho ra đúng loại) · và **chốt của Đức 2026-09-07**: dừng hẳn cả mẻ, `canRetry` phải trả `false` |
| `tests/` | Suite deterministic (`node tests/run-all.mjs` phải xanh 100%) |
| `scripts/` | bridge-rpc.mjs, installer/uninstaller host, tiện ích pilot |
| `templates/` | Workbook XLSX mẫu (thừa kế, sẽ thay bản video) |
| `icons/` | Icon extension |
| `duc-auto-chatgpt-loopback-bridge-host-v1/` | Mã nguồn host Bridge (generic, dùng chung giao thức) |
| `evidence/` | Bằng chứng DOM/vận hành của nhánh Flow — chỉ THÊM |
| `pilot-04/`, `pilot-05/` | CHỈ fixture XLSX cho test thừa kế (không phải bằng chứng vận hành của nhánh này) |

Thêm file/thư mục top-level mới → thêm 1 dòng vào bảng này. Không khai = không tồn tại.

## Chọn nhãn cấu hình trên trang: việc của AI, và luật cho nó

Đức chốt 2026-09-02: **chọn nhãn cấu hình là việc AI nên tự làm được**, và không riêng gói này —
mọi extension trong repo. Trước đó Đức phải tự đặt Video mode và tự sửa chip `x{n}` mỗi phiên.

**Đường đã chứng minh chạy được** (F-14/F-26, bằng chứng `evidence/F14-mode-probe-vi-20260902.json`):

1. `pressFlowControl(chip)` — bắn chuỗi `pointerdown` → `mousedown` → `pointerup` → `mouseup` →
   `click`. **`element.click()` trần KHÔNG mở được bảng cấu hình của Flow.**
2. Bảng mở ra thì **liệt kê được** toàn bộ nút cấu hình rời (`360p` `720p` · `4s`…`10s` ·
   `16:9` `9:16` · `x1`…`x4`).
3. Bấm nút cần, rồi **ĐỌC LẠI nhãn tóm tắt** để kết luận.

**Bốn luật, rút ra từ chỗ đã trả giá:**

1. **Nhãn phải có bằng chứng DOM, không dịch tay.** `arrow_forward Create` bị dịch thành
   `arrow_forward Tạo`; nhưng `videocam Video` thì KHÔNG bị dịch. Suy từ ca này sang ca kia đã
   sai một lần (F-24 là báo động giả của chính AI). Đo trước, ghi probe vào `evidence/`, rồi mới
   thêm nhãn kèm trích nguồn.
2. **Mờ là từ chối.** Đòi **đúng một** ứng viên khớp **chính xác** nhãn. Bảng cấu hình nằm cạnh
   những nút đổi đơn giá (720p tốn gấp đôi 360p) — mờ ở đó là mờ về tiền.
3. **Cú bấm không phải bằng chứng; nhãn tóm tắt mới là bằng chứng.** Bấm xong phải đọc lại. Một
   hàm trả về phán quyết mà nó không tự đọc được là code nói dối.
4. **Mở bảng thì phải đóng lại, và phải GHI LẠI vào sổ cái.** Một thay đổi cấu hình do AI tự làm
   mà không để dấu vết thì Đức không còn cách nào biết. Xem trường `output_chip`.

> **NỢ: cần một ADR ở tầng repo.** Luật này áp cho **mọi** extension nhưng hiện chỉ được viết
> trong gói này, vì `docs/adr/` ở gốc repo cần quyền `_root` mà phiên khác đang giữ. Phiên nào
> giữ được `_root` thì chuyển mục này thành ADR và để đây một dòng trỏ sang.
