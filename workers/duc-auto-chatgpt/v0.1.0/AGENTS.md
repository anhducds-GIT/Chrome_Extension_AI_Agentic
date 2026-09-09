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

> **Mục này CỐ Ý gần giống `workers/duc-auto-gemini/v0.2.0/AGENTS.md` — đừng gộp.** Bộ biên dịch
> luật nêu ba cặp ở phép ③ `LUAT_TRUNG` (luật 3, 5, 9); đây là câu trả lời, ghi tại chỗ theo
> `docs/protocols/RULE-COMPILER.md` mục 4. **Lý do:** một phiên làm ở gói này đọc `AGENTS.md` gốc
> repo rồi đọc file này, **không bao giờ đọc file của gói kia**. Gộp vào một file dùng chung là
> bắt mọi phiên đọc thêm một file thứ ba, và tệ hơn: **hai bản PHẢI được phép lệch nhau** — luật 7
> và 8 dưới đây khác nhánh Gemini một cách đúng đắn, vì hai sản phẩm khác nhau.
>
> **Cái lệch mới là bệnh, không phải cái giống.** Ngày 09/09 phép ③ chính là thứ lôi ra được ba
> vế đã chết ở nhánh Gemini — trong đó luật 8 nằm sai 16 ngày, đúng cái luật mà file NÀY đã sửa
> từ 24/08. Phép ③ kêu ở đây là nó **đang chạy đúng**, không phải một món nợ.

1. **Không sửa/xoá/regenerate bất cứ gì trong `pilot-03/`, `pilot-05/`,
   `pilot-06/`, `pilot-06B/`.** Đây là bằng chứng vận hành (evidence) của các
   lỗi đã tìm ra và đã sửa — ghi đè lên là xoá mất bằng chứng.
2. **Không bao giờ gán `.innerHTML` / `.outerHTML` / `insertAdjacentHTML`.**
   Đây là yêu cầu bảo mật — nội dung ảnh/text từ chatgpt.com đi vào side panel
   có quyền cao, phải build DOM node, không được ghép chuỗi HTML.
   `tests/artifact-integrity-smoke.mjs` chặn build nếu có.
3. **Không làm yếu bất kỳ cơ chế bảo vệ nào đã có:** exact-once submission,
   attribution, readiness gating, retry semantics, persistence verification,
   checkpoint protocol, security hard-stop. Sửa bug được, nhưng không được
   "sửa" bằng cách bỏ bớt một trong các lớp bảo vệ này.
4. **Chữ operator nhìn thấy luôn tiếng Việt** (`operator-messages-core.js`,
   `halt-instructions-core.js`...); **mã lỗi (CODE) luôn tiếng Anh** vì nó là
   định danh trong audit JSONL, Result ledger, và test. Không bao giờ để một
   test bảo mật assert vào câu chữ hiển thị (caption/label) — chỉ assert vào
   logic/wiring.
5. **Sửa bất kỳ file `.js` nào → phải nói Đức reload extension ở
   `chrome://extensions` trước khi test.** Không giả định thay đổi đã có hiệu
   lực.
6. **Commit: AI được tự commit (kể cả main) từ 2026-08-24** — quyết định của
   Đức, ghi trong `decisions.md`. Bốn điều kiện bắt buộc: test xanh trước khi
   commit; không bao giờ `push --force`/rewrite history; mỗi commit có 1 dòng
   Log trong `HANDOFF.md`; xoá file / sửa pilot evidence / thay đổi ranh giới
   Run vẫn phải hỏi Đức.
7. **Agent Bridge: `run.start` / `run.pause` / `run.resume` không tồn tại và
   sẽ không bao giờ được thêm vào mà không có quyết định mới, ghi lại trong
   `decisions.md`.** Bridge là ingress + observability, không phải remote
   execution. Side panel luôn là executor duy nhất; đóng panel → mọi lệnh
   Bridge liên quan Queue/workbook trả `EXECUTOR_UNAVAILABLE`, không có runner
   nền nào thay thế. *Exception duy nhất (Đức chốt 2026-08-25, xem
   `decisions.md`): một method **trial run** riêng, có nắp cứng (dev-toggle
   BẬT, ≤30 job, timeout ≤ `LIMITS.trial_timeout_cap_sec`, cách nhau ≥5–6
   phút, nhãn audit `bridge_dev`) — `run.start` thật vẫn cấm vĩnh viễn.*
   **Hai con số của nắp đã đổi, `run.start` thì KHÔNG:** số job 2 → 30 (Đức
   chốt 2026-08-25, việc thật là 20–30 ảnh) và trần timeout 90 → **900 giây**
   (Đức chốt 2026-09-07,
   [ADR-0015](../../../docs/adr/0015-nang-tran-duong-thu-len-900-giay.md) ở gốc
   repo). Trần khai ở **đúng một chỗ** — `LIMITS.trial_timeout_cap_sec` trong
   `bridge-core.js` — nên đừng gõ con số vào đâu khác. Nới đường thử cho khớp
   việc thật **không** phải trao cho AI khả năng tự tiêu credit: nếu bạn thấy
   mình đang gỡ `run.start` khỏi `POLICY.prohibited_methods` thì dừng lại.
8. **In-app preview pane vẫn cấm dùng để "xem" UI** (chặn script, bỏ
   stylesheet — xem `README.md`/`NEXT-SESSION-BRIEF.md`). **Nhưng từ
   2026-08-24, harness bằng Chrome THẬT được phép** (quyết định của Đức trong
   `decisions.md`): Playwright/CDP chạy extension thật với trang chatgpt.com
   giả lập là công cụ verify hợp lệ. Việc xem bằng mắt của Đức chỉ còn cần
   cho những gì harness không chạm được (OS folder picker, chatgpt.com thật).
9. **Một việc một lúc, không overbuild.** Không thêm tính năng/abstraction
   ngoài phạm vi được giao trong cùng 1 lượt sửa.

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
| `HANDOFF-ARCHIVE-01.md` · `HANDOFF-ARCHIVE-02.md` | Đuôi đã cắt của `HANDOFF.md`, nguyên văn, **chỉ đọc** — ghép lại dựng được bản gốc giống hệt **từng byte** (ADR-0008 gốc repo ⑴) |
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
