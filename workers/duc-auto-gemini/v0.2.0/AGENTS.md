# AGENTS — Duc Auto Gemini (Platform)

> **SỬA 03/09.** File này từng mang tiêu đề "Duc Auto ChatGPT" — nó là bản chép từ gói ChatGPT lúc fork, và **đây là file AI đọc ĐẦU TIÊN mỗi phiên**, nên một AI mở ra có thể tưởng mình đang làm trên ChatGPT. Đã sửa những chỗ có bằng chứng.
> Hai khối prompt `#01` / `#02` ở cuối file **cố ý giữ nguyên chữ "ChatGPT"**: đó là prompt onboarding đã dùng thật của dự án ChatGPT, tức bản ghi lịch sử. Sửa chúng là viết lại lịch sử. **Đừng đọc chúng như luật của gói này.**

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
| AI ngoài qua Agent Bridge | Bất kỳ agent nào gọi qua Bridge (kể cả Claude/Codex khi chạy qua CLI) | Đọc trạng thái (`ping`, `capabilities`, `queue-list`, `run-status`, `ledger-read`), gửi 1 đề xuất (`propose`) vào vùng cách ly · **`run.trial` trong đúng bốn nắp cứng ở luật 7** | Không bao giờ tự chạy `run.start`/pause/resume; không bỏ qua bước Đức duyệt trong side panel |

Template lệnh chính thức cho vai Coordinator/Auditor nằm ở cuối file này
(mục "Template COUNCIL"), copy từ `HANDOFF.md`.

## Luật vàng của project này

> **Mục này CỐ Ý gần giống gói ChatGPT — đừng gộp.** Lý lẽ đầy đủ, kèm ba chỗ phép ③ đã bắt
> được ở chính nhánh này: [ADR-0032](../../../docs/adr/0032-ba-goi-giu-luat-rieng-gan-giong-nhau.md).

1. **Bốn luật ⑴–⑷ cũ nay nằm ở lõi dùng chung** (`workers/_shared/LUAT-CORE.md`): bằng chứng chỉ
   THÊM · cấm `.innerHTML`/`.outerHTML`/`insertAdjacentHTML` · chữ operator tiếng Việt, mã lỗi
   tiếng Anh · bốn điều kiện commit. **Đừng chép lại đây.** Phần riêng của gói này:
   `tests/artifact-integrity-smoke.mjs` chặn build nếu có HTML ghép chuỗi; chữ operator ở
   `operator-messages-core.js` và `halt-instructions-core.js`; **không phép kiểm bảo mật nào được
   assert vào câu chữ hiển thị** — chỉ assert vào logic/wiring.
2. **Agent Bridge: `run.start` / `run.pause` / `run.resume` không tồn tại và
   sẽ không bao giờ được thêm vào mà không có quyết định mới, ghi lại trong
   `decisions.md`.** Bridge là ingress + observability, không phải remote
   execution. Side panel luôn là executor duy nhất; đóng panel → mọi lệnh
   Bridge liên quan Queue/workbook trả `EXECUTOR_UNAVAILABLE`, không có runner
   nền nào thay thế. *Ngoại lệ DUY NHẤT, và nó **tiêu credit thật**:* method **`run.trial`**
   ([ADR-0027](docs/adr/0027-ai-duoc-tu-khoi-dong-trial-run-qua-bridge-trong.md)) với **bốn nắp
   cứng** — dev-toggle BẬT · ≤ 30 job một chuỗi
   ([ADR-0032](docs/adr/0032-tran-chuoi-trial-10-30-job-10-job-van-la-it.md)) · hai trial cách
   nhau ≥ 5 phút ([ADR-0028](docs/adr/0028-bo-tran-6-trial-gio-thay-bang-hai-trial-lien-tiep.md))
   · một trial là một chuỗi liên tục
   ([ADR-0031](docs/adr/0031-bo-tran-2-job-trial-mot-trial-chay-lien-tuc-ca.md)). Con số thật ở
   `MAX_TRIAL_JOBS` trong `dev-trial-core.js`. **`run.start` cấm vĩnh viễn.**
3. **Ba luật chung cho mọi extension ở [`workers/_shared/AGENTS.md`](../../_shared/AGENTS.md)** —
   *không làm yếu lớp bảo vệ đã có* · *sửa `.js` thì nhắc Đức reload* · *preview pane cấm, harness
   Chrome thật thì được*. **Đừng chép lại đây**: bản chép ở nhánh này từng dạy một luật đã chết 16 ngày.

## Core / Companion của project này

> **Bảy dòng dưới đây trùng nguyên văn với gói ChatGPT — CỐ Ý, cùng lý do ghi ở mục *Luật vàng*
> ngay trên.** Chúng tả **bộ khung chuẩn** mà `CLAUDE.md` gốc của Đức bắt mọi project phải có
> (`README` · `AGENTS` · `HANDOFF` · `decisions` · `drafts/`), nên hai gói giống nhau là **đúng
> thiết kế**. Thứ phải khác nhau là **con số và danh sách file riêng của từng gói** — kiểm hai
> con số ADR dưới đây mỗi lượt rà, chúng là chỗ đã sai ở gói kia.

**Bộ khung chuẩn** (`README` · `AGENTS` · `HANDOFF` · `decisions` · `drafts/`) tả một lần ở
`CLAUDE.md` gốc của Đức — **không chép lại đây**. Bảy dòng mô tả chúng bị cắt 09/09 vì trùng
nguyên văn với gói ChatGPT mà không nói thêm điều gì riêng của gói này.

Riêng của gói này: `DAC_XLSX_RUN_PLAN_V1.md` hợp đồng schema XLSX · `AUDIT.md` + `TEST_REPORT.md`
kết quả đã chạy · `NEXT-SESSION-BRIEF.md` (kiểm ngày trước khi tin) · `docs/adr/` sổ cái, xem mục
trên · `drafts/` là nơi DUY NHẤT agent được tự ghi.

## Sổ cái của gói — đọc ở đâu

> **Danh sách đầy đủ, do MÁY sinh:** [`decisions.md`](decisions.md) — nhóm theo chủ đề, một dòng
> một quyết định, sinh lại bằng `node scripts/rule-compile.mjs --sinh`
> ([ADR-0030](../../../docs/adr/0030-rule-compiler-v1.md)). **Đừng chép nó xuống đây:** khối ấy dài
> ~5.700 ký tự và mọi phiên đụng gói này phải nạp, trong khi hầu hết phiên chỉ cần **một** quyết
> định. Chuyển xuống 09/09, [ADR-0031](../../../docs/adr/0031-tran-do-bang-ky-tu.md) ⑷.
>
> **Trích theo SỐ HIỆU, đừng trích theo tên file.** Số hiệu đánh **theo từng thư mục**: `ADR-0005`
> ở đây khác `ADR-0005` của gói khác và khác của gốc repo.

**Ba chỗ dễ vấp nhất, đọc trước khi làm:** `ADR-0046` ghim **CẤM dựng lại** hai ngõ cụt đã bị bằng
chứng bác bỏ · `ADR-0051` bất đối xứng **cố ý** giữa `run.stop` và `chat.reload` · `ADR-0026`
*Run là của Đức*, và `ADR-0027`+ là ngoại lệ **có nắp cứng** của nó.

## Bản đồ file

> **Chỉ khai thứ CẤP CAO, mỗi hàng MỘT mệnh đề.** Đó đúng là thứ luật vàng 4 đòi và đúng thứ cổng
> đọc — `session-check.mjs` phép *File mới đã khai vào Bản đồ file* so **tên cấp cao**, không so
> từng file con. **Chuyện dài nằm ở chính nơi người đọc sẽ tới:** docblock đầu mỗi file mã,
> `README.md` trong mỗi thư mục bằng chứng. Rút gọn 09/09,
> [ADR-0031](../../../docs/adr/0031-tran-do-bang-ky-tu.md) ⑷ — cùng lượt đã áp cho gói ChatGPT.

| File | Vai trò |
|---|---|
| `PHIEN.md` | **MÁY SINH — đừng sửa tay.** Bó mở phiên: lõi luật + luật riêng của gói + trạng thái mới nhất. Sinh lại: `node scripts/rule-compile.mjs --sinh` (phải giữ khoá vùng). Trần CỨNG ~3.000 token, vượt là bộ sinh từ chối — [ADR-0035](../../../docs/adr/0035-mot-file-cho-mot-phien-gap.md) |
| `README.md` | Tổng quan, kiến trúc, cài đặt, Agent Bridge (kỹ thuật) — đóng vai design_brief |
| `AGENTS.md` | File này |
| `STATUS.md` | Trạng thái vận hành một trang cho mắt Đức; frontmatter sinh `DASHBOARD.md` ở gốc. Chỉ TRỎ, không chép. Schema: `STATUS.template.md` ở gốc repo |
| `HANDOFF.md` | Trạng thái + **20 lượt Log gần nhất**. Ghi vào **cuối** |
| `HANDOFF-ARCHIVE-01.md` · `HANDOFF-ARCHIVE-02.md` | Đuôi đã cắt, nguyên văn, **chỉ đọc** — ghép lại dựng được bản gốc giống hệt **từng byte** (ADR-0008 gốc repo ⑴) |
| `BACKLOG.md` | Việc còn mở của nhánh này, đánh số `G-xx`, P1/P2/P3 |
| `decisions.md` | **Sổ cái máy sinh** — mục lục quyết định đang sống, `rule-compile.mjs --sinh` |
| `docs/adr/` | ADR của riêng gói. **Đếm, đừng tin số gõ tay:** `ls docs/adr/*.md \| wc -l` |
| `DAC_XLSX_RUN_PLAN_V1.md` | Hợp đồng schema workbook XLSX |
| `NEXT-SESSION-BRIEF.md` · `AUDIT.md` · `TEST_REPORT.md` | Brief phiên sau (**kiểm ngày**) · kết quả audit · kết quả test |
| `drafts/` | Nháp, spec, brief giao Codex, bản mẫu lệnh review — **chỗ DUY NHẤT agent tự ghi** |
| `tests/` | Các phép ghim. **Mỗi phép tự khai ở docblock đầu file nó** — tra bằng `grep -l "G-02" tests/*.mjs`, đừng tra ở bảng này |
| `scripts/` | `create-pilot-NN.mjs` tạo workbook · `bridge-rpc.mjs` gọi RPC thô tới Bridge |
| `templates/` | Workbook trống chuẩn để mở pilot mới |
| `tab-lock-core.js` | Khoá tab + khoá hội thoại cho một run (G-02) — một run bám **đúng một** tab và **một** hội thoại |
| `dev-trial-core.js` | Gate thuần cho `run.trial`: công tắc Chế độ phát triển, nắp số job, nắp thời gian |
| `pilot-*/` · `Pilot-*/` · `Batch-*/` · `evidence-*/` | **Bằng chứng vận hành — chỉ THÊM.** Khai theo **hình dạng tên**, đừng liệt kê từng cái: danh sách gõ tay ở đây đã mục một lần bên gói ChatGPT. Mỗi thư mục tự nói kết quả trong `README.md` / `ket-qua/` của nó — **đọc trước khi trích số** |

Thêm file/thư mục mới **cấp cao** → thêm 1 dòng vào bảng này. Không khai = không tồn tại
(luật `CLAUDE.md` gốc). **Một mệnh đề thôi** — chuyện dài viết vào chính file đó.
