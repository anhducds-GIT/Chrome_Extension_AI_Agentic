# Decisions — Duc Auto ChatGPT

Companion file của `AGENTS.md`. Mỗi dòng: quyết định | vì sao | ai chốt |
nguồn. Chỉ ghi quyết định đã thực sự chốt (không phải ý tưởng đang bàn — ý
tưởng đang bàn thuộc về `drafts/`). Thêm dòng mới ở cuối bảng tương ứng, không
sửa dòng cũ.

## Kiến trúc & Agent Bridge

| Quyết định | Vì sao | Ai chốt | Nguồn |
|---|---|---|---|
| Bridge dùng loopback host `127.0.0.1` có token 32-byte, không dùng Native Messaging | Native Messaging: Chrome tự spawn host làm stdio child của Chrome, một CLI độc lập không gắn vào được, sẽ cần thêm 1 tầng IPC nữa | Claude (coordinator), sau 2 vòng nghiên cứu với Codex | `drafts/AGENT-BRIDGE-DESIGN-V1.md`, `drafts/AGENT-BRIDGE-HANDOFF.md` §1.1 |
| **2026-08-24 — SUPERSEDES dòng "AI ngoài chỉ được `propose`" bên dưới, chỉ trong phạm vi Setup.** Tầng 1: AI qua Bridge được toàn quyền như Đức trên mọi thao tác Setup (thêm/sửa/xoá/sắp xếp job, đổi output naming, đổi Run Settings) — **không cần duyệt từng job**. Ranh giới duy nhất còn lại là nút Run — chỉ Đức tự bấm được. Sau khi Run, AI chỉ đọc, không ghi. | Đức chủ động yêu cầu, để giảm ma sát trước khi mở rộng tiếp sang Tầng 2/3; ranh giới Run là điều duy nhất Đức giữ nguyên tuyệt đối | Đức | Phiên reasoning 2026-08-24, ngay sau khi test sống `queue.propose` lần đầu lộ 2 vấn đề (bug tên file audit, version conflict do debris) |
| AI không thể tự mở file .xlsx từ ổ đĩa hay tự bind folder output MỚI — đây là giới hạn bảo mật trình duyệt (`showOpenFilePicker`/`showDirectoryPicker` cần user gesture thật), không phải lựa chọn chính sách | Chrome từ chối gọi các API này từ script; không có cách nào vượt qua bằng code | Claude (coordinator), xác nhận kỹ thuật khi thiết kế Tầng 1 | Chrome File System Access API spec; `drafts/AGENT-BRIDGE-DESIGN-V1.md` (đã ghi nhận `output-profile-core.js` cần handle đã bind sẵn) |
| `queue.propose` + duyệt tay của Đức KHÔNG bị xoá khi thêm các method Tầng 1 mới | Giữ đường cũ song song, tránh phá vỡ cái đã test; quyết định có bỏ hẳn hay không để sau | Đức (ngầm định qua yêu cầu Tầng 1, xác nhận bởi Claude khi lên kế hoạch) | Kế hoạch Tầng 1, phiên 2026-08-24 |
| Side panel là executor duy nhất; service worker chỉ là router, không bao giờ tự sửa XLSX/chạy queue | Tránh 2 "sự thật" thực thi cùng lúc (side panel vs background); đóng panel phải trả `EXECUTOR_UNAVAILABLE`, không có runner nền thay thế | Claude (coordinator) | `drafts/AGENT-BRIDGE-HANDOFF.md` §1.2 |
| `run.start` / `run.pause` / `run.resume` không có trong Bridge v1, trả `METHOD_NOT_FOUND` | Bridge là ingress + observability, không phải remote execution — Đức luôn là người bấm Run | Claude (coordinator), theo yêu cầu an toàn của Đức | `drafts/AGENT-BRIDGE-HANDOFF.md` §1.4 |
| AI ngoài chỉ được `propose` (đề xuất vào vùng cách ly); Đức phải duyệt trong side panel mới được thêm vào Queue; duyệt không tự chạy Run | Giữ nguyên nguyên tắc "Đức là người quyết định duy nhất" khi mở kênh cho AI ngoài | Claude (coordinator) | `drafts/AGENT-BRIDGE-HANDOFF.md` §1.3, `README.md` §Agent Bridge V1 |
| Host là Node ESM thuần, không phụ thuộc npm — không dùng .NET | Máy không có .NET SDK; repo vốn chủ trương không phụ thuộc ngoài | Claude (coordinator), đảo ngược đề xuất .NET ban đầu của Codex | `drafts/AGENT-BRIDGE-HANDOFF.md` §1.5 |
| API `externally_connectable` localhost cũ bị gỡ hoàn toàn ở WP-4, không giữ song song | Giữ lại sẽ là một cổng vào không xác thực thứ hai, phá vỡ mô hình an toàn mới | Claude (coordinator) | `drafts/AGENT-BRIDGE-HANDOFF.md` §1.6 |
| Installer dùng `icacls` thay vì PowerShell `Set-Acl` để khoá quyền thư mục cài đặt | `Set-Acl` với `New-Object DirectorySecurity` (không bắt nguồn từ `Get-Acl`) gây lỗi `PrivilegeNotHeldException: SeSecurityPrivilege` với mọi tài khoản, kể cả tài khoản chạy trực tiếp của Đức — đã tái hiện lỗi thật, không phải giả thuyết | Claude, xác nhận bằng test thật trên máy Đức | 2026-08-24, phiên cài Bridge đầu tiên |

## Quy ước dữ liệu / workbook

| Quyết định | Vì sao | Ai chốt | Nguồn |
|---|---|---|---|
| Job ID chuyển từ chữ cái (`P06-A`, `P06-B`...) sang số thứ tự (`P08-...-01`, `P09-01`...) | Đức yêu cầu; thứ tự chạy thật vốn đã theo row trong sheet, không theo giá trị `id` — số thứ tự khớp trực giác hơn | Đức | `HANDOFF.md` dòng 159-160; xác nhận lại 2026-08-24 khi tạo Pilot-09, cập nhật vào `DAC_XLSX_RUN_PLAN_V1.md` |
| Checkpoint đặt tên 2 chữ số (`v01`, `v02`...) thay vì 3 chữ số (`v001`) | Đức yêu cầu quy ước ngắn hơn; checkpoint cũ 3 chữ số vẫn đọc/resume được (`legacy`) | Đức | `HANDOFF.md` dòng 91 |
| `pilot-03/`, `pilot-05/`, `pilot-06/`, `pilot-06B/` không bao giờ bị sửa/regenerate | Đây là bằng chứng vận hành của các lỗi đã tìm và sửa | Claude, theo yêu cầu ngầm định của quy trình audit | `NEXT-SESSION-BRIEF.md` §1, lặp lại nhiều lần trong Log `HANDOFF.md` |
| `id`/`prompt` là 2 cột bắt buộc duy nhất trên sheet `jobs`; `config` luôn optional với default hợp lý | Giữ workbook mới đơn giản nhất có thể cho Đức — chỉ cần dán `id + prompt` | Claude, sau khi Đức phản hồi workbook cũ "đòi hỏi quá nhiều field" | `HANDOFF.md` dòng 145-150, `DAC_XLSX_RUN_PLAN_V1.md` |
| Completed job (`SAFE_COMPLETE`) không bao giờ tự chạy lại khi Resume, kể cả khi `rerun_done=true` trong config | Bảo vệ output đã xác minh khỏi bị ghi đè âm thầm; re-run chỉ được làm qua cơ chế duyệt thủ công per-job | Claude, xác nhận là chủ đích thiết kế, không phải bug | `HANDOFF.md` dòng 113 |

## Vận hành / UI

| Quyết định | Vì sao | Ai chốt | Nguồn |
|---|---|---|---|
| Retry/Halt: chỉ dừng toàn batch khi CAPTCHA / hết quota / mất tab ChatGPT thật sự (3 loại hard-stop); mọi lỗi khác retry rồi bỏ qua job đó, chạy tiếp | Đức: "cost is not a concern — đừng dừng, retry, chạy hết queue, job nào vẫn lỗi thì bỏ qua job đó" | Đức | `HANDOFF.md` dòng 188 |
| Pause chỉ giữ hàng đợi ở ranh giới an toàn giữa 2 job, không bao giờ ngắt 1 job đang generate giữa chừng | Exact-once submission — job đã gửi không thể an toàn tạm ngưng giữa chừng | Claude | `HANDOFF.md` dòng 132, `sidepanel.js` dòng 3887-3894 |
| Operator-facing text tiếng Việt; App terminology (SETUP/RUN/OUTPUT/Timeout/Retries...) giữ tiếng Anh trong glossary | Đức muốn học thuật ngữ tiếng Anh của app trong lúc dùng, nhưng phần giải thích vẫn tiếng Việt | Đức | `HANDOFF.md` dòng 115, 193 |
| Không tự ý commit — luôn hỏi Đức trước, kể cả khi test 100% pass | Đức là người chốt duy nhất theo CLAUDE.md gốc | Đức (luật cố định) | `NEXT-SESSION-BRIEF.md` dòng 15-16, lặp lại mọi entry "Next" trong `HANDOFF.md` |
| **2026-08-24 — SUPERSEDES dòng "Không tự ý commit" ngay trên, trong phạm vi project này.** AI (Claude/Codex) được toàn quyền `git commit`, kể cả vào `main`, với 4 điều kiện an toàn: (1) toàn bộ test phải xanh trước khi commit; (2) không bao giờ `push --force` / rewrite history — lịch sử git là đường lùi duy nhất của Đức; (3) mỗi commit phải có 1 dòng Log trong `HANDOFF.md` nói rõ commit gì, vì sao; (4) xoá file, sửa pilot evidence, và mọi thay đổi ranh giới Run vẫn phải hỏi Đức như cũ | Đức không code, muốn AI chủ động thay vì chờ duyệt từng commit; git revert luôn khôi phục được nên rủi ro chấp nhận được | Đức | Phiên audit 2026-08-24, chốt 5 điểm roadmap (điểm 5, Đức nới rộng hơn đề xuất gốc "chỉ nhánh làm việc") |

## Roadmap tự hành (chốt sau audit 2026-08-24)

Nguồn: `drafts/AUDIT-SYSTEM-EFFECTIVENESS-2026-08-24.md`. Đức chốt cả 5 điểm ngày 2026-08-24.

| Quyết định | Vì sao | Ai chốt | Nguồn |
|---|---|---|---|
| Commit Tầng 1 sau khi Claude test sống 6 method qua CLI (nghiệm thu bằng mắt của Đức là tuỳ chọn, không bắt buộc) | Đức muốn AI chủ động; test CLI + audit độc lập đã đủ bằng chứng | Đức | Audit 2026-08-24, điểm chốt #1 |
| **Sửa luật 8 AGENTS.md:** cho phép xây harness test bằng Chrome THẬT (Playwright/CDP, extension thật, trang chatgpt.com giả lập). Vẫn cấm dùng in-app preview pane để "xem" UI — lý do gốc của luật chỉ áp vào preview pane | 7/10 hạng mục test-sống tự động hoá được; nút thắt tốc độ dự án là chờ Đức test tay | Đức | Audit 2026-08-24, điểm chốt #2 |
| Cho phép gộp checkpoint cho phiên sửa của agent (transaction / `session.checkpoint`) — thay triết lý "mỗi ghi = 1 version". Điều kiện: audit JSONL vẫn ghi đủ TỪNG mutation riêng lẻ | Agent sửa 20 lần = 20 file XLSX là không dùng được; audit chi tiết giữ lại đủ dấu vết | Đức | Audit 2026-08-24, điểm chốt #3 |
| Chính sách dọn checkpoint: giữ `v01` + 5 bản cuối; phần còn lại CHUYỂN vào thư mục `superseded/`, không bao giờ xoá | Chống phình thư mục vô hạn mà không mất bằng chứng | Đức | Audit 2026-08-24, điểm chốt #4 |
| AI được commit kể cả main (chi tiết + 4 điều kiện: xem dòng SUPERSEDES ở bảng Vận hành/UI phía trên) | — | Đức | Audit 2026-08-24, điểm chốt #5 (Đức nới rộng) |
| **Không đổi, nhắc lại:** Run là của Đức; AI không tự gửi prompt tới ChatGPT; không làm yếu exact-once / attribution / persistence verification; pilot evidence bất khả xâm phạm | Ranh giới an toàn gốc của toàn hệ thống | Đức (tái xác nhận) | Audit 2026-08-24 §5 |

## 2026-08-25 — Development trial-run exception (owner: Đức)

| Quyết định | Vì sao | Ai chốt |
|---|---|---|
| AI được TỰ khởi động "trial run" qua Bridge trong giai đoạn phát triển, qua một phương thức riêng (không phải run.start), với trần cứng trong code: công tắc "Chế độ phát triển" trong panel phải BẬT; ≤2 job/trial; timeout ≤90s; delay 20–30s giữa job; ≤6 trial/giờ; audit gắn nhãn nguồn bridge_dev; hard-stop security/quota giữ nguyên. Run sản xuất (batch dài, >2 job, hoặc công tắc TẮT) vĩnh viễn chỉ do người bấm; `run.start` vẫn bị cấm trong giao thức. | Bridge đã cho AI đọc toàn bộ trạng thái; mảnh thiếu duy nhất của vòng self-develop là quyền chạy thử nhỏ. Vòng debug thực tế (lỗi quota giả 25/08) mất ~1 giờ chờ phối hợp cho 5 phút chẩn đoán. Trial 1–2 ảnh nhịp chậm: rủi ro thực tế không đáng kể; rủi ro thật là vòng lặp mất kiểm soát nên chặn bằng trần cứng + công tắc trong tay owner. | Đức (đề xuất) + Claude (phân tích, đồng thuận với 4 hàng rào) |

## 2026-08-25 — Điều chỉnh trần tần suất trial (owner: Đức)

| Quyết định | Vì sao | Ai chốt |
|---|---|---|
| Bỏ trần "≤6 trial/giờ"; thay bằng: hai trial liên tiếp phải cách nhau tối thiểu 5 phút. | Quota tạo ảnh của owner rất dồi dào — cái cần kiểm soát là nhịp độ (tránh hành vi máy móc dồn dập), không phải tổng số lượng. | Đức |

## 2026-08-25 — Cho phép bắt đầu run từ trang hội thoại /app (owner: Đức)

| Quyết định | Vì sao | Ai chốt |
|---|---|---|
| Run được phép BẮT ĐẦU từ cả gemini.google.com/images lẫn gemini.google.com/app/<id> (trước đó /app chỉ hợp lệ sau khi chính tab đó đã gửi). | Bằng chứng G1 (bản chụp 2–4) xác minh đầy đủ ô soạn thảo, menu upload, nút Gửi, khung trả lời và ảnh kết quả ngay trên /app; owner cũng thao tác thường xuyên ở đó. Lưu ý vận hành: chạy từ /app thì prompt gõ vào đúng hội thoại đang mở — owner chịu trách nhiệm trỏ tab đúng chỗ; audit ghi lại URL. | Đức |

## 2026-08-25 — Workflow điều khiển từ chat: owner chỉ còn "tạo thư mục" và "bấm Run" (owner: Đức)

| Quyết định | Vì sao | Ai chốt |
|---|---|---|
| Toàn bộ khâu chuẩn bị phiên chạy chuyển sang chat: Đức tạo thư mục và gửi đường dẫn; AI tự đọc workbook + ảnh, tự bơm qua Bridge (jobs.add + references.add mới + run_settings.configure + output.configure). Giao diện extension không còn là nơi làm việc chính. Hai thao tác còn lại của owner: đưa đường dẫn thư mục, và bấm Run cho batch sản xuất (trial ≤2 job theo exception dev đã chốt). | Extension không đọc được thư mục máy (giới hạn Chrome) nhưng AI đọc được — nên khâu "chọn file" qua giao diện là thừa. Giảm thao tác thủ công của owner xuống tối thiểu đúng theo nguyên tắc "AI là bộ não, người là cánh tay". | Đức |

## 2026-08-25 — Điều chỉnh trần trial: một trial = một chuỗi liên tục ≤10 job (owner: Đức)

| Quyết định | Vì sao | Ai chốt |
|---|---|---|
| Bỏ trần "≤2 job/trial"; một trial chạy LIÊN TỤC cả chuỗi ảnh (trần cứng mới: 10 job/trial). Giãn cách ≥5 phút chỉ áp dụng giữa hai trial khác nhau. Batch >10 job vẫn là nút Run của owner. | Mục đích của trial là kiểm chứng cả flow chạy chuỗi — xé lẻ 2 job/lần vừa chậm (chờ 5 phút giữa các lát) vừa không phản ánh hành vi chuỗi thật. | Đức |

## 2026-08-25 (chiều) — Nâng trần chuỗi trial lên 30 job + AI chạy batch sản xuất thay owner (owner: Đức)

| Quyết định | Vì sao | Ai chốt |
|---|---|---|
| Trần chuỗi trial 10 → 30 job ("10 job vẫn là ít"); owner ủy quyền cho AI tự triển khai batch sản xuất kiểm chứng (>10 job) thay vì owner bấm Run; đồng thời duyệt: port kỹ thuật đặt-tên-download từ worker ChatGPT, xây lệnh chẩn đoán DOM qua Bridge, và PUSH repo lên remote. | Workload thật của owner là 20–30 ảnh/lượt; quota dồi dào; các hàng rào còn lại giữ nguyên (Dev Mode toggle, ≥5 phút giữa trial, timeout/delay, audit bridge_dev). | Đức |

## 2026-08-26 — Bộ luật đa-AI: luật tự nạp, quy trình mở khi cần (owner: Đức)

| Quyết định | Vì sao | Ai chốt |
|---|---|---|
| Dựng bộ luật chung cho cả Claude + Codex + Antigravity trước, rồi mới làm tiếp pilot use case mới và UI/UX. | Đợt việc sắp tới huy động cả 3 AI cùng lúc; dựng luật sau khi 3 AI đã giẫm chân nhau thì đắt hơn nhiều. Ngày 25–26/08 đã suýt hỏng vì hai phiên AI cùng repo, khoá lúc đó chỉ là một câu viết tay trong brief. | Đức |
| Kiến trúc 3 tầng: **luật thì tự nạp** (`AGENTS.md` gốc — một bản, ba cửa vào), **quy trình thì mở khi cần** (các guide package đã có), **cổng máy kiểm** (`scripts/session-check.mjs`) là tầng cưỡng chế. Không làm "bộ skill phải đi check" như ý tưởng ban đầu của Đức. | Đức lo "mỗi lần triển khai phải check skill thì tốn thời gian" — lo đúng, nhưng gốc rễ khác: repo không hề có `AGENTS.md`/`CLAUDE.md` ở gốc, nên Codex và Antigravity mở phiên được nạp con số không. Nguyên tắc: **thứ AI phải đi tìm là thứ AI sẽ quên** — nên luật không được phép nằm trong skill. | Đức |
| Luật nào không kiểm được bằng máy thì coi như không có: mỗi lỗi thật mới gặp → thêm 1 dòng vào bảng lỗi **và** cân nhắc 1 phép kiểm vào cổng. | Tài liệu không điều khiển được AI; một script chạy đỏ thì có. Cổng hiện có 6 phép kiểm, mỗi phép ứng với một lỗi ĐÃ thật sự xảy ra trong project, không phép nào tưởng tượng. | Đức |
| **Antigravity: luôn dán câu mở màn một dòng** — *"Đọc AGENTS.md ở gốc repo trước khi làm gì."* — bất kể nó có tự nạp hay không. | Thử live 26/08: Antigravity đọc `AGENTS.md`, tự lần ra `.agents/claims.json`, trả lời đúng chủ sở hữu, và **tự suy ra hệ quả không ai hỏi**: "package này đang có chủ nên tôi chỉ có quyền đọc". Luật không chỉ đọc được mà dùng được. Nhưng câu hỏi thử có nhắc tên file, nên **chưa chứng minh được nó TỰ nạp lúc mở phiên**. Không xây hệ thống mà tính đúng đắn phụ thuộc vào một hành vi chưa kiểm chứng của công cụ bên thứ ba — hành vi đó còn có thể đổi giữa các bản. Câu mở màn tốn 3 giây, miễn nhiễm với mọi thay đổi phiên bản, và nếu nó vốn đã tự nạp thì câu đó chỉ là thừa vô hại. | Đức + Claude đề xuất |
| Codex: không cần câu mở màn (đọc `AGENTS.md` tự động là chắc chắn). Claude: đọc qua `CLAUDE.md` gốc. | — | Claude |
