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

> **Mục này CỐ Ý gần giống `workers/duc-auto-chatgpt/v0.1.0/AGENTS.md` — đừng gộp.** Bộ biên dịch
> luật nêu ba cặp ở phép ③ `LUAT_TRUNG` (luật 3, 5, 9); đây là câu trả lời, ghi tại chỗ theo
> `docs/protocols/RULE-COMPILER.md` mục 4. **Lý do:** một phiên làm ở gói này đọc `AGENTS.md` gốc
> repo rồi đọc file này, **không bao giờ đọc file của gói kia**. Gộp vào một file dùng chung là
> bắt mọi phiên đọc thêm một file thứ ba, và tệ hơn: **hai bản PHẢI được phép lệch nhau** — luật 7
> và 8 dưới đây khác nhánh ChatGPT một cách đúng đắn, vì hai sản phẩm khác nhau.
>
> **Cái lệch mới là bệnh, không phải cái giống.** Ngày 09/09 phép ③ chính là thứ lôi ra được luật
> 8 đã chết từ 24/08 mà nằm đây 16 ngày, và luật 7 thiếu hẳn một method tiêu tiền. Phép ③ kêu ở
> đây là nó **đang chạy đúng**, không phải một món nợ.

1. **Không sửa/xoá/regenerate bất cứ gì trong `pilot-*/`, `Pilot-*/`, `Batch-*/`,
   `evidence*/`.** Đây là bằng chứng vận hành của các lỗi đã tìm ra và đã sửa —
   ghi đè lên là xoá mất bằng chứng. **Chỉ THÊM.** Cùng luật với `AGENTS.md`
   gốc mục 5 (*Không bao giờ*), và cố ý viết theo **hình dạng tên**, không theo
   danh sách.
   > **Sửa 09/09.** Dòng này từng liệt kê `pilot-03/`, `pilot-05/`, `pilot-06/`,
   > `pilot-06B/` — **ba trong bốn cái đó không tồn tại trong gói này**, chúng là
   > của nhánh ChatGPT, chép sang lúc fork. Cùng lúc, `pilot-04/`, `Batch-SX-01/`,
   > `Pilot-G2-01/`, `Pilot-REF-01/` có thật thì không được nêu. Một danh sách gõ
   > tay bảo vệ nhầm chỗ và bỏ sót chỗ thật; hình dạng tên thì không mục được.
2. **Không bao giờ gán `.innerHTML` / `.outerHTML` / `insertAdjacentHTML`.**
   Đây là yêu cầu bảo mật — nội dung ảnh/text từ gemini.google.com đi vào side panel
   có quyền cao, phải build DOM node, không được ghép chuỗi HTML.
   `tests/artifact-integrity-smoke.mjs` chặn build nếu có.
3. **Chữ operator nhìn thấy luôn tiếng Việt** (`operator-messages-core.js`,
   `halt-instructions-core.js`...); **mã lỗi (CODE) luôn tiếng Anh** vì nó là
   định danh trong audit JSONL, Result ledger, và test. Không bao giờ để một
   test bảo mật assert vào câu chữ hiển thị (caption/label) — chỉ assert vào
   logic/wiring.
4. **Commit: AI được tự commit (kể cả main) từ 2026-08-24** — quyết định của
   Đức, ghi trong `decisions.md`. Bốn điều kiện bắt buộc: test xanh trước khi
   commit; không bao giờ `push --force`/rewrite history; mỗi commit có 1 dòng
   Log trong `HANDOFF.md`; xoá file / sửa pilot evidence / thay đổi ranh giới
   Run vẫn phải hỏi Đức.
5. **Agent Bridge: `run.start` / `run.pause` / `run.resume` không tồn tại và
   sẽ không bao giờ được thêm vào mà không có quyết định mới, ghi lại trong
   `decisions.md`.** Bridge là ingress + observability, không phải remote
   execution. Side panel luôn là executor duy nhất; đóng panel → mọi lệnh
   Bridge liên quan Queue/workbook trả `EXECUTOR_UNAVAILABLE`, không có runner
   nền nào thay thế. *Ngoại lệ DUY NHẤT, và nó tiêu credit thật:* method
   **`run.trial`** có thật trong gói này
   ([ADR-0027](docs/adr/0027-ai-duoc-tu-khoi-dong-trial-run-qua-bridge-trong.md)),
   với bốn nắp cứng — dev-toggle phải BẬT · **≤ 30 job một chuỗi**
   ([ADR-0032](docs/adr/0032-tran-chuoi-trial-10-30-job-10-job-van-la-it.md),
   nâng từ 10) · hai trial cách nhau ≥ 5 phút
   ([ADR-0028](docs/adr/0028-bo-tran-6-trial-gio-thay-bang-hai-trial-lien-tiep.md))
   · một trial là **một chuỗi liên tục**
   ([ADR-0031](docs/adr/0031-bo-tran-2-job-trial-mot-trial-chay-lien-tuc-ca.md)).
   Trần thật khai ở `MAX_TRIAL_JOBS` trong `dev-trial-core.js` — đừng gõ con số
   vào chỗ khác. **`run.start` thật vẫn cấm vĩnh viễn**: thấy mình đang gỡ nó
   khỏi danh sách cấm thì dừng lại.
   > **Dòng này thiếu cả ngoại lệ trên cho tới 09/09.** Bốn quyết định của Đức
   > (25/08) về một method tiêu tiền chưa bao giờ đi vào luật vàng của gói, nên
6. **Ba luật chung cho mọi extension nằm ở [`workers/_shared/AGENTS.md`](../../_shared/AGENTS.md)** —
   *không làm yếu một lớp bảo vệ đã có* (cũng là `AGENTS.md` gốc mục 5) · *sửa `.js` thì nhắc Đức
   reload* · *preview pane cấm, harness Chrome thật thì được*. Chép lại đây là quay lại đúng cái
   bệnh vừa chữa: bản chép ở nhánh này từng dạy một luật đã chết suốt 16 ngày.
   > ai chỉ đọc file này sẽ tin Bridge không chạy được gì. Nhánh ChatGPT có ghi.
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

## Sổ cái của gói — danh sách MÁY SINH

> **Đừng sửa tay trong khối dưới.** Nó được tái tạo từ `docs/adr/` bằng
> `node scripts/rule-compile.mjs --sinh` ([ADR-0030](../../../docs/adr/0030-rule-compiler-v1.md)).
> Sửa tay sẽ bị lượt sinh sau nuốt mất. Muốn đổi một dòng thì **sửa tiêu đề hoặc `nhom:` của
> chính ADR đó** — chữ ở đây là tiêu đề ADR, tức lời do người viết.
>
> **Trích theo SỐ HIỆU, đừng trích theo tên file.** Số hiệu đánh **theo từng thư mục**:
> `ADR-0005` ở đây khác `ADR-0005` của gói khác và khác của gốc repo.
>
> **Ba chỗ dễ vấp nhất trong danh sách này**, đọc trước khi làm: `ADR-0046` ghim **CẤM dựng lại**
> hai ngõ cụt đã bị bằng chứng bác bỏ · `ADR-0051` bất đối xứng **cố ý** giữa `run.stop` và
> `chat.reload` · `ADR-0026` *Run là của Đức*, và `ADR-0027`+ là ngoại lệ **có nắp cứng** của nó.

<!-- KHOI MAY SINH: rule-compile --sinh. DUNG SUA TAY. -->
**an-toan-khi-chay**
- [ADR-0015](docs/adr/0015-completed-job-safe-complete-khong-bao-gio-tu-chay.md) Completed job (SAFE_COMPLETE) không bao giờ tự chạy lại khi Resume, kể cả khi…
- [ADR-0016](docs/adr/0016-retry-halt-chi-dung-toan-batch-khi-captcha-het.md) Retry/Halt: chỉ dừng toàn batch khi CAPTCHA / hết quota / mất tab ChatGPT thật sự…
- [ADR-0017](docs/adr/0017-pause-chi-giu-hang-doi-o-ranh-gioi-an-toan-giua-2.md) Pause chỉ giữ hàng đợi ở ranh giới an toàn giữa 2 job, không bao giờ ngắt 1 job…
- [ADR-0026](docs/adr/0026-khong-doi-nhac-lai-run-la-cua-duc-ai-khong-tu-gui.md) Không đổi, nhắc lại: Run là của Đức; AI không tự gửi prompt tới ChatGPT; không làm…
- [ADR-0027](docs/adr/0027-ai-duoc-tu-khoi-dong-trial-run-qua-bridge-trong.md) AI được TỰ khởi động "trial run" qua Bridge trong giai đoạn phát triển, qua một…
- [ADR-0028](docs/adr/0028-bo-tran-6-trial-gio-thay-bang-hai-trial-lien-tiep.md) Bỏ trần "≤6 trial/giờ"; thay bằng: hai trial liên tiếp phải cách nhau tối thiểu 5…
- [ADR-0031](docs/adr/0031-bo-tran-2-job-trial-mot-trial-chay-lien-tuc-ca.md) Bỏ trần "≤2 job/trial"; một trial chạy LIÊN TỤC cả chuỗi ảnh (trần cứng mới: 10…
- [ADR-0032](docs/adr/0032-tran-chuoi-trial-10-30-job-10-job-van-la-it.md) Trần chuỗi trial 10 → 30 job ("10 job vẫn là ít")
- [ADR-0051](docs/adr/0051-giu-nguyen-bat-doi-xung-co-y-cua-thiet-ke-goc.md) Giữ nguyên bất đối xứng cố ý của thiết kế gốc
- [ADR-0058](docs/adr/0058-khong-doi-thoi-diem-co-dung-an-de-job-dang-chay.md) KHÔNG đổi thời điểm cờ dừng ăn (để job đang chạy không kịp gửi).
- [ADR-0060](docs/adr/0060-duyet-hop-dong-g-01-stop-nhan-truoc-thoi-diem-gui.md) Duyệt hợp đồng G-01: Stop nhận trước thời điểm gửi thật → attempt đó không được…
- [ADR-0061](docs/adr/0061-huong-b-refined-huy-theo-attempt-khong-phai-a-round.md) Hướng B-refined — huỷ theo attempt, không phải A (round-trip hỏi ngược) hay B…
- [ADR-0062](docs/adr/0062-root-cause-phai-chung-minh-bang-test-tai-hien-truoc.md) Root cause phải chứng minh bằng test tái hiện trước khi vá
- [ADR-0067](docs/adr/0067-audit-codex-vong-1-fail-3-phat-hien-1-high-huy-lech.md) Audit Codex vòng 1: FAIL, 3 phát hiện. (1) HIGH "huỷ lệch danh tính giết attempt…

**bridge-va-thuc-thi**
- [ADR-0001](docs/adr/0001-bridge-dung-loopback-host-127-0-0-1-co-token-32.md) Bridge dùng loopback host 127.0.0.1 có token 32-byte, không dùng Native Messaging
- [ADR-0002](docs/adr/0002-supersedes-dong-ai-ngoai-chi-duoc-propose-ben-duoi.md) SUPERSEDES dòng "AI ngoài chỉ được propose" bên dưới, chỉ trong phạm vi Setup
- [ADR-0003](docs/adr/0003-ai-khong-the-tu-mo-file-xlsx-tu-o-dia-hay-tu-bind.md) AI không thể tự mở file .xlsx từ ổ đĩa hay tự bind folder output MỚI
- [ADR-0004](docs/adr/0004-queue-propose-duyet-tay-cua-duc-khong-bi-xoa-khi.md) queue.propose + duyệt tay của Đức KHÔNG bị xoá khi thêm các method Tầng 1 mới
- [ADR-0005](docs/adr/0005-side-panel-la-executor-duy-nhat.md) Side panel là executor duy nhất
- [ADR-0006](docs/adr/0006-run-start-run-pause-run-resume-khong-co-trong.md) run.start / run.pause / run.resume không có trong Bridge v1, trả METHOD_NOT_FOUND
- [ADR-0007](docs/adr/0007-ai-ngoai-chi-duoc-propose-de-xuat-vao-vung-cach-ly.md) AI ngoài chỉ được propose (đề xuất vào vùng cách ly)
- [ADR-0008](docs/adr/0008-host-la-node-esm-thuan-khong-phu-thuoc-npm.md) Host là Node ESM thuần, không phụ thuộc npm

**chu-va-commit**
- [ADR-0018](docs/adr/0018-operator-facing-text-tieng-viet.md) Operator-facing text tiếng Việt
- [ADR-0020](docs/adr/0020-supersedes-dong-khong-tu-y-commit-ngay-tren-trong.md) SUPERSEDES dòng "Không tự ý commit" ngay trên, trong phạm vi project này
- [ADR-0025](docs/adr/0025-ai-duoc-commit-ke-ca-main-chi-tiet-4-dieu-kien.md) AI được commit kể cả main (chi tiết + 4 điều kiện

**du-lieu-va-bang-chung**
- [ADR-0011](docs/adr/0011-job-id-chuyen-tu-chu-cai-p06-a-p06-b-sang-so-thu-tu.md) Job ID chuyển từ chữ cái (P06-A, P06-B...) sang số thứ tự (P08-...-01, P09-01...)
- [ADR-0012](docs/adr/0012-checkpoint-dat-ten-2-chu-so-v01-v02-thay-vi-3-chu.md) Checkpoint đặt tên 2 chữ số (v01, v02...) thay vì 3 chữ số (v001)
- [ADR-0013](docs/adr/0013-pilot-03-pilot-05-pilot-06-pilot-06b-khong-bao-gio.md) pilot-03/, pilot-05/, pilot-06/, pilot-06B/ không bao giờ bị sửa/regenerate
- [ADR-0014](docs/adr/0014-id-prompt-la-2-cot-bat-buoc-duy-nhat-tren-sheet-jobs.md) id/prompt là 2 cột bắt buộc duy nhất trên sheet jobs
- [ADR-0023](docs/adr/0023-cho-phep-gop-checkpoint-cho-phien-sua-cua-agent.md) Cho phép gộp checkpoint cho phiên sửa của agent (transaction / session.checkpoint)
- [ADR-0024](docs/adr/0024-chinh-sach-don-checkpoint.md) Chính sách dọn checkpoint

**nhan-dien-anh**
- [ADR-0043](docs/adr/0043-chi-cuon-khi-anh-dang-khong-hien-ra-va-chi-khi-da.md) Chỉ cuộn khi ảnh đang KHÔNG hiện ra, và chỉ khi đã hết trạng thái đang-sinh-ảnh.
- [ADR-0044](docs/adr/0044-generatedimageminsize-200-150-phep-kiem-giu-nguyen.md) generatedImageMinSize: 200 → 150. Phép kiểm giữ nguyên hình dạng (vẫn đòi cả hai…
- [ADR-0046](docs/adr/0046-hai-phuong-an-da-thu-va-bi-bang-chung-bac-bo-trong.md) Hai phương án đã thử và bị bằng chứng bác bỏ trong cùng ngày

**pham-vi-va-ky-luat**
- [ADR-0022](docs/adr/0022-sua-luat-8-agents-md-cho-phep-xay-harness-test-bang.md) Sửa luật 8 AGENTS.md: cho phép xây harness test bằng Chrome THẬT (Playwright/CDP,…
- [ADR-0029](docs/adr/0029-run-duoc-phep-bat-dau-tu-ca-gemini-google-com.md) Run được phép BẮT ĐẦU từ cả gemini.google.com/images lẫn…
- [ADR-0035](docs/adr/0035-luat-nao-khong-kiem-duoc-bang-may-thi-coi-nhu-khong.md) Luật nào không kiểm được bằng máy thì coi như không có
- [ADR-0066](docs/adr/0066-cung-loi-ben-nhanh-chatgpt-ghi-thanh-b-22-doc.md) Cùng lỗi bên nhánh ChatGPT ghi thành B-22 ([ĐỌC] content.js:703), KHÔNG sửa hộ…
<!-- HET KHOI MAY SINH -->

## Bản đồ file

| File | Vai trò |
|---|---|
| `README.md` | Tổng quan project, kiến trúc, cài đặt, Agent Bridge (kỹ thuật) |
| `AGENTS.md` | File này |
| `STATUS.md` | **Trạng thái vận hành, một trang, cho mắt Đức** — lifecycle, kiểm chứng lần cuối + bằng chứng, việc đang mở, con trỏ đọc sâu. Máy đọc phần frontmatter để sinh `DASHBOARD.md` ở gốc repo. Chỉ TRỎ sang file khác, không chép nội dung. Schema: `STATUS.template.md` ở gốc repo |
| `HANDOFF.md` | Trạng thái + **20 lượt Log gần nhất**. Cắt đuôi 2026-09-06 theo ADR-0008 của gốc repo; lịch sử cũ hơn ở `HANDOFF-ARCHIVE-01.md`, con trỏ nằm ngay đầu mục `## Log` |
| `HANDOFF-ARCHIVE-01.md` | **Đuôi đã cắt của `HANDOFF.md`** — 113 lượt Log cũ, nguyên văn, không sửa một chữ. Chỉ đọc; ghi Log mới thì ghi vào `HANDOFF.md`. Ghép lại dựng được bản gốc giống hệt từng byte (bất biến ⑴ của ADR-0008) |
| `HANDOFF-ARCHIVE-02.md` | **Bản dài nguyên văn của 5 mục đã được viết ngắn trong `HANDOFF.md`** (2026-09-06, ADR-0011 mục ⑶ + ADR-0012). Viết ngắn là **đổi chỗ chi tiết, không phải xoá** — mọi số đo và mọi vòng audit ở đây. Chỉ đọc. Ghép lại dựng được bản gốc giống hệt từng byte, SHA-256 in ngay đầu file |
| `BACKLOG.md` | **Việc còn mở của nhánh này, đánh số `G-xx`** — P1/P2/P3. Lập 2026-08-27; trước đó nhánh Gemini không có nơi canonical giữ việc mở. Số `G-xx` cố ý khác `B-xx` của nhánh ChatGPT: hai sổ, hai nhánh, hai dãy số. Mỗi dòng gắn nhãn [ĐO]/[ĐỌC]/[DÒ] — **dòng [DÒ] phải kiểm lại trước khi hành động** |
| `decisions.md` | Mục lục trỏ sang 67 ADR (nội dung đã chuyển) |
| `docs/adr/` | 67 ADR bất biến — quyết định của riêng gói này |
| `DAC_XLSX_RUN_PLAN_V1.md` | Hợp đồng schema workbook XLSX |
| `NEXT-SESSION-BRIEF.md` | Brief phiên làm việc tiếp theo (khi còn hiệu lực) |
| `AUDIT.md` | Kết quả audit kiến trúc |
| `TEST_REPORT.md` | Kết quả test |
| `drafts/AGENT-BRIDGE-DESIGN-V1.md` | Thiết kế gốc của Agent Bridge (WP-0) |
| `drafts/AGENT-BRIDGE-HANDOFF.md` | Handoff kỹ thuật WP-1..WP-4 cho Codex |
| `drafts/AGENT-BRIDGE-ROADMAP-AND-GUIDE-V1.md` | Roadmap + use case Bridge cho Đức (không kỹ thuật) — **một phần đã lỗi thời sau Tầng 1, xem audit 2026-08-24** |
| `drafts/AGENT-BRIDGE-TIER1-HANDOFF.md` | Brief Tầng 1 (6 method ghi trực tiếp + tab BRIDGE) giao cho Codex |
| `drafts/AUDIT-SYSTEM-EFFECTIVENESS-2026-08-24.md` | Audit độc lập toàn hệ thống + roadmap 5 giai đoạn tiến tới tự hành (chờ Đức chốt 5 điểm) |
| `tab-lock-core.js` | **Khoá tab + khoá hội thoại cho một run (G-02, 04/09).** Giải ra tab mà run đã khoá thay vì hỏi lại "tab nào đang hoạt động" ở mỗi lần gửi. Là core riêng vì `sidepanel.js` không nạp nổi vào Node, mà ba ca thật (đổi tab · đổi hội thoại · tab biến mất) là ca HÀNH VI, phải chạy được mới ghim được. Tiền tố `RECEIVER_LOST:` trong thông điệp là CỐ Ý — `runner-core.classifyFailure()` dò chữ để quy nhãn, và `RECEIVER_LOST` là dừng cứng, không thử lại |
| `tests/tab-lock-behavior.mjs` | Ghim G-02, cả hai nửa: **hành vi** (nạp `tab-lock-core` + `provider-adapter` + `runner-core` thật vào vm, chạy `resolveBoundTab` với tab giả) và **wiring** (soi mã nguồn — phiên trước đã viết đúng core mà quên nối, nên core đúng mà không ai gọi vẫn phải bị bắt). 17 khẳng định, 15/15 đột biến bị bắt |
| `dev-trial-core.js` | Gate thuần cho `run.trial` (Chế độ phát triển): toggle owner, **≤30 job một chuỗi** (`MAX_TRIAL_JOBS`), khoảng cách ≥300s giữa 2 trial — quyết định 2026-08-25 (trần nâng 2→10→30 trong cùng ngày) |
| `tests/blob-image-conversion-static.mjs` | Ghim: ảnh `blob:` phải nhận dạng theo BYTE rồi chuyển thành data URL background chấp nhận (lỗi live 26/08) |
| `tests/attach-path-recorded-static.mjs` | Ghim: đường gắn ảnh tham chiếu phải được ghi lại kể cả khi THÀNH CÔNG (Pilot-REF-01) |
| `tests/bridge-run-stop-chat-reload-smoke.mjs` | Ghim cặp `run.stop` / `chat.reload` (port từ worker ChatGPT 26/08): hợp đồng registry, params rỗng nghiêm ngặt, và **thứ tự** — cờ dừng phải xoá TRƯỚC await đầu tiên của `run()`, `chat.reload` phải giành khoá TRƯỚC await đầu tiên |
| `tests/root-suite-covers-workers-static.mjs` | **Ghim G-09 (05/09): `npm test` ở gốc repo phải chạy suite của MỌI worker, không chỉ một.** Đọc hình dạng repo từ `.repo-structure.json` (dùng lại `unitsFrom`/`unitDirsUnder`, không tự chế `^workers/`) rồi đòi mọi `tests/run-all.mjs` phải có tên trong `scripts.test`. Nằm trong gói này là **tạm** — chỗ ở đúng là `tests/` gốc, xem nợ nhỏ ở mục G-09 của `BACKLOG.md` |
| `tests/shared-modules-no-drift-static.mjs` | **Ghim G-08 (07/09): bảy module còn giống hệt nhánh ChatGPT phải tiếp tục giống hệt.** So sau khi chuẩn hoá CRLF→LF, cùng cách `scripts/feature-parity.mjs` đo — so byte trần sẽ đỏ oan sau một lượt `git checkout` vì máy đặt `core.autocrlf=true`. Chỉ ĐỌC gói ChatGPT (vùng của lane khác), không ghi một byte nào sang đó. **Đếm mỏ neo:** không đủ bảy cặp file thì ĐỎ, vì một công cụ đo hỏng im lặng giống hệt một repo lành. Danh sách ghim cứng là cố ý — 24 file trùng tên khác nhau CÓ CHỦ ĐÍCH, ghim hết là đỏ vĩnh viễn mà đỏ vĩnh viễn thì người ta tắt. Lý do có nó: `xlsx-codec.js` từng nằm trong danh sách và trôi dạt 28/08 mà mười ngày không ai hay |
| `tests/bridge-run-trial-smoke.mjs` | Test cho `run.trial`: registry, validation, ma trận từ chối, audit `bridge_dev`, UI toggle/badge |
| `tests/content-abort-race-behavior.mjs` | Ghim G-01 (27/08), phía content: nạp `content.js` THẬT vào vm với DOM giả, bắn message đúng thứ tự race 26/08 và ĐẾM click. 6 ca: đối chứng · huỷ-trước-job = zero click · huỷ X không giết Y · huỷ trần vẫn dừng run đang bay · huỷ mồ côi không giết run mới · huỷ lệch danh tính vẫn dừng (fail-closed, chủ đích). Đỏ trên code trước bản vá — root cause có bằng chứng, không phải suy đoán |
| `tests/bridge-transport-liveness-smoke.mjs` | Ghim lớp vận chuyển Bridge (28/08): keepalive phải **chờ ACK có hạn** — quá hạn thì buông socket ngay, không đợi sự kiện `close` mà socket `CLOSING` có thể không bao giờ phát; reconnect theo **thang có trần 30 giây**, và thang chỉ reset khi có **một vòng đi-về hoàn chỉnh** (ACK), không phải khi vừa `auth_ok`; connect cũng có hạn riêng vì alarm 30 giây **không** cứu được socket kẹt ở `CONNECTING`; `auth_ok` chỉ nhận **một lần trên một socket đang OPEN**; gỡ pairing phải huỷ **mọi** timer. Dùng fake socket có trạng thái `CLOSING` thật — fake đóng-tức-thì che mất đúng cửa sổ lỗi này |
| `tests/bridge-transport-depth-guards-static.mjs` | **Ghim G-10 (06/09): ba guard LỚP HAI của `bridge-transport-loopback.js`** — `reconnectTimer` trong `scheduleReconnect` · `socket !== targetSocket` trong callback hạn chờ ACK · "đã bị bản mới hơn vượt qua" trong `publishStatus`. Ghim ở **mức nguồn**, không phải hành vi: đo được rằng cả ba đột biến đều để suite hành vi XANH, vì lớp một che hết đường tới. Cắt thân hàm bằng đếm ngoặc, chỉ dùng `indexOf` chuỗi nguyên văn (file CRLF — neo `^`/`$` sẽ trượt im lặng), và **đếm lại số neo ở cuối**: 0 neo là phép ghim đã trượt chứ không phải "không có gì để sửa". 3/3 đột biến bị bắt |
| `tests/sidepanel-stop-before-submit-static.mjs` | Ghim G-01, phía side panel (wiring): `stop()` gửi `DAC_ABORT` kèm `job_id`+`attempt_id` NGAY TRONG câu lệnh send (mutation "dựng danh tính mà không gửi" đã từng lọt bản đầu); `run()` kiểm lại cờ dừng ngay sau `await gateNextJob` và nhánh dừng phải SETTLE job thành `USER_STOP` (audit 27/08: break trần bỏ rơi dòng sổ ở RECONCILING); từ mốc RUNNING tới send không còn khe await nào |
| `templates/Duc-Auto-ChatGPT-Template.xlsx` | Workbook trống chuẩn để bắt đầu pilot mới |
| `scripts/create-pilot-NN.mjs` | Script tạo workbook cho từng pilot |
| `scripts/bridge-rpc.mjs` | Gọi RPC thô tới Agent Bridge (jobs.add, references.add, dom_probe… — những method CLI không có) |
| `Batch-SX-01/` | Batch sản xuất 01: kế hoạch + kết quả chuỗi 12 job chạy liên tục (26/08) — bằng chứng, không sửa |
| `Pilot-REF-01/` | Pilot ảnh tham chiếu, lần đầu chạy live (26/08) — bằng chứng, không sửa |
| `pilot-04/`, `pilot-05/` | Fixture XLSX + bằng chứng vận hành — **không sửa/xoá** |
| `Pilot-G2-01/`, `Pilot-REF-01/` | Pilot của chính nhánh này — bằng chứng, không sửa |
| `evidence-transport-liveness-5s-20260828/` | Bằng chứng live 28/08 (chiều): sau khi hạ trần chờ xuống 5 giây, nối lại sau **1,0 giây** — bản trần 30 giây đo 22,5s và 27,7s. Hoàn tất phần treo của thư mục bằng chứng buổi sáng. Bằng chứng, không sửa |
| `evidence-multiprofile-nghiem-thu-20260907/` | **Nghiệm thu lớp nhiều hồ sơ 07/09 — chỉ đọc, 0 credit.** Bốn bảo đảm ĐẠT (kể đúng hồ sơ · quên `--target` thì `TARGET_AMBIGUOUS` · đích lạ thì `TARGET_NOT_CONNECTED` · `served_by` không lệch lượt nào). Hai bài học đắt hơn kết quả: **`legacy: false` KHÔNG có nghĩa "code mới nhất"** (hai hồ sơ cùng `legacy:false` mà 19 vs 23 method — muốn biết thì ĐẾM METHOD), và một phép đo **suýt thành báo cáo sai** — `run.status` timeout 5/6 lượt nhìn như hỏng riêng, xen kẽ ba method mới thấy lỗi đóng theo THỜI GIAN (cửa sổ đánh thức service worker), không theo method. Bằng chứng, không sửa |
| `evidence-multiprofile-port-20260902/` | Bằng chứng port multi-profile 02/09: 2 vòng audit Codex (vòng 1 FAIL bắt đúng lỗi authSent, vòng 2 đóng), mutation 13/13 đỏ, host sống 32148 — bằng chứng, không sửa |
| `evidence-transport-liveness-20260828/` | Bằng chứng live 28/08: hai cú tắt/bật host sau bản vá lớp vận chuyển — panel báo **Mất kết nối** đúng cả hai lần, tự nối lại 22,5s và 27,7s, khớp dự đoán viết trước khi đo. Kèm log nguyên văn của hai máy đo và script đo. **Là của bản trần 30 giây** — bằng chứng, không sửa |
| `evidence-stop-reload-20260826/` | Sổ cái nguyên bản của trial live kiểm chứng `run.stop` / `chat.reload` (26/08), kèm 3 dòng chứng minh lời nhắn cũ nói sai — bằng chứng, không sửa |
| `Pilot-07-Tạo Ảnh tô màu/` | Pilot 07 (26/08): 18 ảnh màu gốc của Đức → 18 tranh nét cho trẻ 5 tuổi tô. Kế hoạch `PILOT-07-PLAN.md`, kết quả `PILOT-07-KET-QUA.md`. **Ảnh gốc `*.png` (44 MB) KHÔNG vào git** — xem `.gitignore` trong thư mục |
| `Pilot-07-Tạo Ảnh tô màu/ket-qua/` | 18 tranh nét thành phẩm `to-mau-01..18.jpg` + `BANG-DOI-CHIEU-KET-QUA.md` (tranh ↔ ảnh gốc ↔ job) — bằng chứng, không sửa |
| `Pilot-07-Tạo Ảnh tô màu/refs-thu-nho/` | Bản thu nhỏ JPEG 1024px của 18 ảnh gốc (127–294 KB) để lọt trần 700 KB của `references.add`. Ảnh gốc không bị đụng. Bảng đối chiếu: `BANG-DOI-CHIEU.md` |

Thêm file/thư mục mới cấp cao → phải thêm 1 dòng vào bảng này. Không khai báo
= không tồn tại (luật CLAUDE.md gốc).

## Template COUNCIL — ĐÃ DỜI RA KHỎI BẢN HIỆU LỰC 09/09

Hai khối prompt onboarding `#01` / `#02` (79 dòng) từng nằm ở đây. **Không nơi nào trong repo
tham chiếu chúng**, và chúng tả một lượt onboarding V0 đã xong từ lâu — một bản mẫu không nổ lần
nào vẫn thu thuế mọi phiên (giới hạn ⑥ của `AGENTS.md` gốc). Nguyên văn còn nguyên trong git:

```bash
git show ab066a00:workers/duc-auto-gemini/v0.2.0/AGENTS.md
```

Cần một câu để dán cho Đức thì mở `PROMPTS.md` ở gốc repo — đó mới là nhà của nó.