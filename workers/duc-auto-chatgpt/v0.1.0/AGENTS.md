# AGENTS — Duc Auto ChatGPT

CORE của project này. Đọc file này cùng `README.md` (đóng vai design_brief —
project là gì, kiến trúc, phạm vi) và `HANDOFF.md` (trạng thái, việc tiếp
theo, Log) trước khi làm bất cứ việc gì. File này chỉ tổng hợp luật đã có sẵn
rải rác trong lịch sử — không đặt luật mới nào ngoài những gì đã được Đức
chốt.

## Vai từng bên

| Vai | Ai/gì | Được làm | Không được làm |
|---|---|---|---|
| Chủ dự án / chốt duy nhất | Đức | Duyệt mọi thay đổi, quyết định commit, chọn hướng roadmap | — |
| Coordinator / Architecture Reviewer | Claude | Đọc code, audit kiến trúc, đề xuất sửa, implement khi Đức giao · **tự commit và đẩy** khi đủ ba điều kiện ở `AGENTS.md` gốc mục 2 (*Commit và đẩy*) | Đẩy bằng `git push` trần — luôn `safe-push.mjs`; đẩy việc còn dở |
| Independent Code Auditor / Implementer | Codex | Audit độc lập, implement theo brief | Tự ý mở rộng phạm vi ngoài brief |
| Implementer gốc | GPT Web | Đã dựng V0 ban đầu | — |
| AI ngoài qua Agent Bridge | Bất kỳ agent nào gọi qua Bridge (kể cả Claude/Codex khi chạy qua CLI) | Đọc trạng thái (`ping`, `capabilities`, `queue-list`, `run-status`, `ledger-read`), gửi 1 đề xuất (`propose`) vào vùng cách ly · **`run.trial` trong đúng các nắp cứng ở luật 7** | Không bao giờ tự chạy `run.start`/pause/resume; không bỏ qua bước Đức duyệt trong side panel |

Hai bản mẫu lệnh review thời V0: `drafts/TEMPLATE-COUNCIL.md` — **đọc lại SCOPE LOCK trước khi
dùng lại**, phạm vi đã rộng ra nhiều kể từ đó.

## Luật vàng của project này

> **Mục này CỐ Ý gần giống gói Gemini — đừng gộp.** Lý lẽ đầy đủ, kèm ba chỗ phép ③ đã bắt được ở
> nhánh kia: [ADR-0032](../../../docs/adr/0032-ba-goi-giu-luat-rieng-gan-giong-nhau.md).

1. **Bốn luật ⑴–⑷ cũ nay nằm ở lõi dùng chung** (`workers/_shared/LUAT-CORE.md`, in ngay trên
   đây) — **đừng chép lại**. Phần riêng của gói này: `tests/artifact-integrity-smoke.mjs` chặn
   build nếu có HTML ghép chuỗi; chữ operator ở `operator-messages-core.js` và
   `halt-instructions-core.js`; **không phép kiểm bảo mật nào được assert vào câu chữ hiển thị**
   — chỉ assert vào logic/wiring.
2. **Agent Bridge: `run.start` / `run.pause` / `run.resume` không tồn tại** — thêm lại phải có
   quyết định mới ghi trong `decisions.md`. Bridge là ingress + observability, không phải remote
   execution. Side panel là executor DUY NHẤT; đóng panel → mọi lệnh Bridge liên quan
   Queue/workbook trả `EXECUTOR_UNAVAILABLE`, không có runner nền nào thay thế. *Ngoại lệ DUY
   NHẤT, và nó **tiêu credit thật**:* method **`run.trial`** (Đức chốt 25/08) với **bốn nắp cứng** — dev-toggle BẬT · ≤ 30 job · hai trial cách nhau ≥ 5–6 phút · nhãn audit
   `bridge_dev`; trần timeout **900 giây**
   ([ADR-0015](../../../docs/adr/0015-nang-tran-duong-thu-len-900-giay.md)). Trần khai ở **đúng
   một chỗ** — `LIMITS.trial_timeout_cap_sec` trong `bridge-core.js` — đừng gõ vào đâu khác.
   **Thấy mình đang gỡ `run.start` khỏi `POLICY.prohibited_methods` thì DỪNG LẠI.**
3. **Hai luật chung cho mọi extension ở [`workers/_shared/AGENTS.md`](../../_shared/AGENTS.md)** —
   *sửa `.js` thì nhắc Đức reload trước khi test* · *preview pane cấm, harness Chrome THẬT thì
   được*. **Đừng chép lại đây** — cái giá của bản chép đã đo, ghi ở chính file đó.
4. **Một việc một lúc, không overbuild** — không thêm tính năng/abstraction ngoài phạm vi trong
   cùng một lượt sửa. Ba lớp bảo vệ riêng của gói này, ngoài danh sách ở lõi: *readiness gating* ·
   *checkpoint protocol* · *security hard-stop*.

## Core / Companion của project này

> **Bảy dòng dưới đây trùng nguyên văn với gói Gemini — CỐ Ý, cùng lý do ghi ở mục *Luật vàng*
> ngay trên.** Chúng tả **bộ khung chuẩn** mà `CLAUDE.md` gốc của Đức bắt mọi project phải có
> (`README` · `AGENTS` · `HANDOFF` · `decisions` · `drafts/`), nên hai gói giống nhau là **đúng
> thiết kế**. **Con số ADR gõ tay đã bị bỏ khỏi mục này 09/09** — nó từng nói 48, rồi 45, rồi 48
> trong khi trên đĩa có 51. Ba con số, cả ba sai, không ai thấy. Cần số thì đếm.

CORE (đọc mỗi lần):
- `README.md` — project là gì, kiến trúc, phạm vi (đóng vai design_brief).
- `AGENTS.md` — file này: vai, luật vàng, bản đồ file.
- `HANDOFF.md` — trạng thái hiện tại, việc tiếp theo, Log (chỉ thêm dòng, đọc
  đầu tiên trước khi bắt tay vào việc, ghi cuối cùng sau khi xong).

COMPANION (đọc khi cần):
- `decisions.md` — **nay là MỤC LỤC** trỏ sang các ADR trong `docs/adr/`.
- `docs/adr/` — quyết định của riêng gói này, mỗi cái một file **bất biến** (chuẩn Nygard, bốn mục).
  **HỒ SƠ sửa được — gộp, phân nhóm, rút gọn; QUYẾT ĐỊNH thì không** ([ADR-0026](../../../docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md) ⑵, thay luật bất biến từng byte 09/09).
  Đổi điều đã quyết thì phải có quyết định mới đứng sau; **bỏ hẳn một số hiệu khỏi sổ thì B12 CHẶN.** Luật: `docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md` ở gốc repo.
- `DAC_XLSX_RUN_PLAN_V1.md` — hợp đồng schema XLSX (jobs/config) cho mọi
  workbook mới.
- `NEXT-SESSION-BRIEF.md` — brief chi tiết cho phiên làm việc tiếp theo khi có
  (không phải lúc nào cũng còn hiệu lực — kiểm tra ngày trước khi dùng).
- `AUDIT.md`, `TEST_REPORT.md` — kết quả audit/test đã chạy.
- `drafts/` — nháp, spec thiết kế, roadmap chưa chốt. Agent chỉ được tự ghi
  vào đây (đúng luật CLAUDE.md gốc của Đức).

## Sổ cái của gói — đọc ở đâu

> **Danh sách đầy đủ, do MÁY sinh:** [`decisions.md`](decisions.md) — nhóm theo chủ đề, một dòng
> một quyết định, sinh lại bằng `node scripts/rule-compile.mjs --sinh`
> ([ADR-0030](../../../docs/adr/0030-rule-compiler-v1.md)). **Đừng chép nó xuống đây:** khối ấy dài
> ~7.500 ký tự và mọi phiên đụng gói này sẽ trả tiền cho nó, trong khi hầu hết phiên chỉ cần **một**
> quyết định. Rút gọn 09/09, [ADR-0031](../../../docs/adr/0031-tran-do-bang-ky-tu.md) ⑷.
>
> **Trích theo SỐ HIỆU, đừng trích theo tên file.** Số hiệu đánh **theo từng thư mục**: `ADR-0006`
> ở đây khác `ADR-0006` của gói khác và khác của gốc repo.

Chín luật vàng ngay trên là phần **phải thuộc trước khi gõ**; sổ cái là phần tra khi cần. Còn đúng
một vế đang mở và nó chặn thật:
[ADR-0036](docs/adr/0036-quy-trinh-bat-buoc-cross-check-doc-lap-truoc-khi.md) buộc cross-check độc
lập trước khi đưa Đức thao tác — **đã hẹp lại 02/09**, Đức bỏ audit độc lập cho *fix nhỏ*
(`duc-auto-gg-flow-video` ADR-0009), nhưng ranh giới *"fix nhỏ"* thì **chưa ai chốt câu chữ**.
Gặp ca xám thì **hỏi Đức**, đừng tự định nghĩa.

## Bản đồ file

> **Chỉ khai thứ CẤP CAO, mỗi hàng MỘT mệnh đề.** Đó đúng là thứ luật vàng 4 đòi *(“thêm file/thư
> mục mới cấp cao → thêm 1 dòng”)* và đúng thứ cổng kiểm đọc — `session-check.mjs` phép *File mới
> đã khai vào Bản đồ file* so **tên cấp cao**, không so từng file con.
> **Chuyện dài nằm ở chính nơi người đọc sẽ tới:** docblock đầu mỗi file mã, `README.md` trong mỗi
> thư mục bằng chứng. Chép xuống đây là bắt **mọi phiên** trả tiền cho một câu chuyện họ không mở
> — hàng `tests/` từng nuốt **19.371 ký tự**, 44% cả file, và không hàng nào nói thêm được điều mà
> docblock của chính phép kiểm đó chưa nói. Rút gọn 09/09,
> [ADR-0031](../../../docs/adr/0031-tran-do-bang-ky-tu.md) ⑷.

| File | Vai trò |
|---|---|
| `README.md` | Tổng quan, kiến trúc, cài đặt, Agent Bridge (kỹ thuật) — đóng vai design_brief |
| `AGENTS.md` | File này |
| `AI-OPERATOR-GUIDE.md` | Sổ tay vận hành + bảng lỗi **ĐÃ GẶP THẬT** trên trang. **Mở TRƯỚC khi chạy live**, đừng chẩn đoán lại từ đầu |
| `STATUS.md` | Trạng thái vận hành một trang cho mắt Đức; frontmatter sinh `DASHBOARD.md` ở gốc. Chỉ TRỎ, không chép. Schema: `STATUS.template.md` ở gốc repo |
| `HANDOFF.md` | Trạng thái + **20 lượt Log gần nhất**. Ghi vào **cuối** |
| `HANDOFF-ARCHIVE-01.md` · `HANDOFF-ARCHIVE-02.md` · `HANDOFF-ARCHIVE-03.md` · `HANDOFF-ARCHIVE-04.md` | Đuôi đã cắt của `HANDOFF.md`, nguyên văn, **chỉ đọc** — ghép lại dựng được bản gốc giống hệt **từng byte** (ADR-0008 gốc repo ⑴) |
| `decisions.md` | Mục lục trỏ sang `docs/adr/` |
| `docs/adr/` | ADR của riêng gói này. **Đếm, đừng tin một con số gõ tay:** `ls docs/adr/*.md \| wc -l` |
| `DAC_XLSX_RUN_PLAN_V1.md` | Hợp đồng schema workbook XLSX (jobs/config) cho mọi workbook mới |
| `BACKLOG.md` | Việc phát sinh ngoài checkpoint — P1/P2/P3 + câu hỏi còn treo. Ý tưởng làm phình phạm vi ghi vào đây thay vì mở rộng phiên |
| `NEXT-SESSION-BRIEF.md` · `AUDIT.md` · `TEST_REPORT.md` | Brief phiên sau (**kiểm ngày trước khi dùng**) · kết quả audit kiến trúc · kết quả test |
| `drafts/` | Nháp, spec, brief giao Codex, bản mẫu lệnh review (`TEMPLATE-COUNCIL.md`) — **chỗ DUY NHẤT agent được tự ghi** (luật `CLAUDE.md` gốc) |
| `tests/` | Các phép ghim. **Mỗi phép tự khai ở docblock đầu file nó** — tra bằng `grep -l "B-28" tests/*.mjs`, đừng tra ở bảng này: bảng chưa bao giờ liệt kê đủ |
| `scripts/` | `create-pilot-NN.mjs` tạo workbook từng pilot · `don-rac-tai-xuong.mjs` dọn rác tên-GUID (B-36), **mặc định CHỈ XEM** — protocol ở mục cùng tên trong `AI-OPERATOR-GUIDE.md` |
| `templates/` | Workbook trống chuẩn để mở pilot mới |
| `.gitignore` | Chặn **đầu ra lúc chạy** khỏi git (`*__audit.jsonl`, `*__results__v*.xlsx`) — rác lúc chạy không phải tài sản của gói, nên chặn mới đúng chỗ, không phải khai vào bảng này. Hai mẫu tên định nghĩa ở `../XLSX_TEMPLATE_GOVERNANCE.md` (**trên một tầng**) luật 6 & 7 |
| `ab-poll-core.js` | Chính sách trả lời poll A/B (`ab_poll_action`) — lõi thuần, dùng chung content script và side panel |
| `text-output-core.js` | Hợp đồng thuần cho `text_reasoning`: enum loại job, giới hạn ô XLSX, trường ledger và audit |
| `interjob-delay-core.js` | Đồng hồ chờ giữa hai job — **MỐC thời gian thật là thẩm quyền**, `chrome.alarms` chỉ đánh thức để hỏi lại, nên một alarm sớm không rút ngắn được khoảng nghỉ |
| `bridge-workspace-core.js` | Phiên làm việc theo tab (ADR-0046): store `dac.bridge.workspaces.v1` — trần 3 phiên/profile, chống trùng tên và trùng tab, một socket riêng mỗi phiên |
| `provider-adapter.js` | Mọi thứ riêng của ChatGPT: selector DOM, hằng số thời gian, luật origin, mẫu chặn bảo mật. `content.js` đọc từ đây và không biết nó đang lái sản phẩm nào |
| `pilot-*/` · `Pilot-*/` · `evidence-*/` | **Bằng chứng vận hành — chỉ THÊM.** Khai theo **hình dạng tên**: danh sách gõ tay ở đây đã mục một lần, dừng ở `Pilot-09` khi trên đĩa đã có 17. Mỗi thư mục tự nói kết quả trong `README.md` / `KET-QUA.md` / `RESULT-*.md` của nó — **đọc trước khi trích số** |
| `Pilot-13_References/` | **TẠM HOÃN, không chạy** — lý do và cái còn dùng được ghi trong `README.md` của chính nó |
| ~~`FEATURE-PARITY.md`~~ | **Đã dời về gốc repo** 26/08 theo Đức chốt — nó nói về cả hai nhánh nên không thuộc gói nào |

Thêm file/thư mục mới **cấp cao** → thêm 1 dòng vào bảng này. Không khai = không tồn tại
(luật `CLAUDE.md` gốc). **Một mệnh đề thôi** — chuyện dài viết vào chính file đó.
