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

## 2026-08-26 — Ảnh mang "địa chỉ tạm" (blob): CHỜ đổi sang link thật, không nới lớp chấm attribution (owner: Đức)

| Quyết định | Vì sao | Ai chốt |
|---|---|---|
| Gặp ảnh mang địa chỉ tạm (`blob:`) thì **chờ** Gemini tự đổi sang link thật (`https://lh3...`), rồi mới kết luận. **Không** nới lớp chấm attribution để chấp nhận ảnh tạm. | Đức hỏi "blob tạm là gì?" trước khi chọn — sau khi hiểu, chọn phương án **không bỏ lớp bảo vệ nào**. Lớp đó tồn tại để chống job này lấy ảnh của job khác. Đánh đổi: có thể vẫn trượt (chưa có bằng chứng Gemini LUÔN đổi — probe thấy ảnh blob nằm rải rác giữa các ảnh https, không chỉ tấm mới nhất). | Đức |
| Phép chờ có **hạn mức 30 giây** (`blobSwapWaitMs`), hết hạn thì kết luận trung thực. | Chờ vô hạn trong trần 90s nghĩa là mỗi lần trượt đốt hết 90s × 3 lần thử = chậm gấp 3, mà kết quả vẫn thế. | Claude đề xuất, trong phạm vi quyết định trên |
| Mọi lần chờ đều ghi vào sổ cái: chờ bao lâu, có đổi được không, có hết hạn không. | Chính là bằng chứng để biết cách chờ này có ăn thật hay không — Đức chọn "chờ xem" thì phải đo được. | Claude |

## 2026-08-26 (vòng 2) — Đưa ảnh vào tầm mắt rồi mới đo, KHÔNG nới lớp kiểm (owner: Đức)

| Quyết định | Vì sao | Ai chốt |
|---|---|---|
| **Tháo** phép chờ "blob đổi sang lh3" đã chốt ở vòng 1 cùng ngày. | Đã ĐO và bác bỏ: chờ 31 giây / 68 lần dò, không đổi; `dom_probe` xác nhận **6/6 ảnh sinh ra vẫn giữ địa chỉ blob sau nhiều phút**. Gemini không đổi. Giữ lại chỉ đốt thêm 30 giây mỗi lần trượt mà kết quả không khác. Đây là ví dụ vì sao mọi phương án phải đo được: vòng 1 nghe rất hợp lý và sai. | Đức (vòng 1) → số liệu bác bỏ → Đức (vòng 2) |
| Nguyên nhân thật: ảnh của lượt trả lời mới nằm **dưới đáy hội thoại dài, ngoài viewport**, nên `getBoundingClientRect()` đo ra 0 → bị chấm "không hiện ra" → `NO_NEW_IMAGE`. Cách trị: **cuộn tịnh tiến tới đúng tấm ảnh đó rồi mới đo**. | Phép kiểm "ảnh phải hiện ra thật" **giữ nguyên**, không bỏ gì. Ảnh rỗng / ảnh giả / phần tử 0px thì cuộn tới cũng vẫn 0px — nên đây là **loại bỏ một phép đo sai**, không phải nới lỏng bảo vệ. Lớp khoan dung của Pilot-04 chỉ cứu ảnh `https://lh3`, mà Gemini nay trả toàn `blob:` nên nó không còn áp được lần nào. | Đức |
| Chỉ cuộn khi ảnh đang KHÔNG hiện ra, và chỉ khi đã hết trạng thái đang-sinh-ảnh. | Can thiệp trang ở mức tối thiểu. Test ghim: khối cuộn không được chứa click/gõ/dispatchEvent. | Claude |

## 2026-08-26 (vòng 3) — Hạ ngưỡng kích thước ảnh sinh ra: 200 → 150 (owner: Đức)

| Quyết định | Vì sao | Ai chốt |
|---|---|---|
| `generatedImageMinSize`: **200 → 150**. Phép kiểm giữ nguyên hình dạng (vẫn đòi cả hai chiều ≥ ngưỡng), chỉ đổi con số. | Số đo thật: ảnh Gemini sinh ra **330 × 180**; ảnh người dùng đính kèm **112 × 112**. Ngưỡng 200 đòi CẢ hai chiều ≥ 200 nên **180 < 200 loại sạch mọi ảnh sinh ra, vĩnh viễn**. 150 nằm giữa 112 và 180, cách rộng cả hai bên — vẫn loại được ảnh nhỏ/biểu tượng mà không sát mép. | Đức |
| Ghi nhận: bug này **đã nằm đó từ đầu**, bị che bởi `remoteVerifiedResult` (lớp khoan dung Pilot-04 bỏ qua hẳn phép kiểm kích thước cho ảnh `https://lh3`). Batch-SX-01 đạt 12/12 là nhờ lớp che đó, **không** phải nhờ phép kiểm kích thước đúng. Gemini chuyển sang render `blob:` → lớp che mất → bug lộ. | Để phiên sau hiểu vì sao một phép kiểm sai lại sống được nhiều ngày mà mọi thứ vẫn xanh. | Claude |
| Hai phương án đã thử và bị bằng chứng bác bỏ trong cùng ngày — **ghim vào test cấm dựng lại**: (1) chờ blob đổi sang lh3 (đo: 31s/68 lần dò, không đổi); (2) cuộn ảnh vào tầm mắt rồi đo (sai tiền đề: `getBoundingClientRect` trả kích thước layout, độc lập vị trí cuộn). | Cả hai nghe rất hợp lý. Không ghim thì phiên sau dựng lại y hệt. | Claude |

## 2026-08-26 (chiều) — Vá lỗi cổng kiểm đọc sai đường dẫn tiếng Việt (owner: Đức)

| Quyết định | Vì sao | Ai chốt |
|---|---|---|
| Cho sửa file gốc `scripts/session-check.mjs` + `scripts/safe-push.mjs`: gọi git kèm `-c core.quotepath=false`, và safe-push bỏ dấu nháy bao ngoài trước khi quy chủ sở hữu commit. | Git mặc định mã hoá ký tự không phải ASCII thành octal, nên thư mục `Pilot-07-Tạo Ảnh tô màu` **đã khai đủ vào Bản đồ file mà cổng vẫn báo đỏ**. Đây không phải trường hợp hiếm: Đức là người Việt và đặt tên thư mục bằng tiếng Việt, nên mọi pilot sau đều sẽ dính. | Đức |
| Ghim bằng test thật `tests/session-check-utf8-paths.mjs`, nối vào `npm test`. Test dựng repo git dùng một lần trong thư mục tạm, chứng minh cờ đó THẬT SỰ cần, rồi mới kiểm hai script có xin cờ không. | Luật vàng số 2: mỗi fix một test ghim. Đã phá thử cả hai chiều — gỡ cờ khỏi session-check thì đỏ, gỡ `.map(unquote)` khỏi safe-push thì đỏ, phục hồi thì xanh. Test tĩnh không thôi thì yếu, nên phần 1 kiểm hành vi git thật. | Claude |
| Ghi nhận loại lỗi: **đỏ oan nguy hiểm ngang đỏ thật.** Một cổng báo đỏ sai tạo động cơ cho phiên sau đi sửa cổng cho nó xanh — đúng thứ `AGENTS.md` mục 0 cấm. | Đây là lỗi thứ **năm** của bộ luật tìm được, và lại lộ ra lúc DÙNG chứ không phải lúc đọc code (giống `%20`, không trả được quyền gốc, quy chụp việc phiên khác, owner rỗng rơi qua ba rổ). | Claude |

## 2026-08-26 (chiều) — Port `run.stop` + `chat.reload` từ worker ChatGPT sang Gemini (owner: Đức)

| Quyết định | Vì sao | Ai chốt |
|---|---|---|
| Đưa hai lệnh điều khiển của extension ChatGPT sang extension Gemini: `run.stop` (dừng) và `chat.reload` (F5 trang). | Đức yêu cầu hai extension có cùng năng lực. `chat.reload` còn gỡ được một phụ thuộc vào tay Đức: trước đây gặp `RECEIVER_LOST` là phải nhờ Đức bấm F5. | Đức |
| Giữ nguyên bất đối xứng cố ý của thiết kế gốc: **`run.stop` đi VÒNG QUA khoá `RUN_ACTIVE`, `chat.reload` thì BỊ khoá đó chặn.** | Dừng chỉ BỚT việc, không thêm việc — một lệnh dừng bị từ chối vì "đang chạy" là vô dụng đúng lúc cần nó nhất. Ngược lại F5 giữa chừng giết content script và attempt đang bay, làm mất quota đã tiêu và có nguy cơ gửi lại đúng prompt đó lần thứ hai (vỡ exact-once). | Claude, theo thiết kế gốc |
| **KHÔNG chép nguyên xi.** Worker Gemini không có `createQueueRunLock` như ChatGPT, nên chốt khởi động run được dựng thẳng trong `run()`, và `chat.reload` giành khoá qua `state.queueMutationRunning`. | Chép mù một khoá không tồn tại thì code chạy nhưng không khoá gì cả — nguy hiểm hơn là không port. | Claude |
| Vá thêm một lỗ Gemini có mà ChatGPT không có: **`run()` trước đây không có chốt nào.** Nút Run bị `controls()` làm mờ, nhưng `run.trial` qua Bridge gọi thẳng `run()` và chỉ kiểm `state.running` — nên một trial vẫn khởi động được ngay giữa lúc `chat.reload` đang F5 trang. | Đúng cái lỗ mà `chat.reload` sinh ra để bịt. Chốt đặt trong `run()` vì đó là chỗ duy nhất cả nút của người lẫn Bridge đều đi qua. | Claude |
| Gemini có sẵn **đúng cái bẫy** phiên ChatGPT đã sập: `state.stopRequested = false` nằm SAU `await authoritativeValidate`. Đã chuyển lên khoảnh khắc đồng bộ lúc run bắt đầu. | `run.stop` cố ý đi vòng qua khoá nên nó gọi được đúng vào khoảng await đó → cờ dừng bị xoá âm thầm, run vẫn gửi prompt, trong khi người gọi đã được báo "đã dừng". | Claude |
| Ghim bằng `tests/bridge-run-stop-chat-reload-smoke.mjs` (16 phép kiểm), đã phá thử 4 chiều. | Luật vàng số 2. Ba phép kiểm quan trọng nhất là về **thứ tự**, thứ mà đọc code bằng mắt rất dễ bỏ qua. | Claude |

## 2026-08-26 (tối) — Trial live cặp stop/reload: bắt được một lời nhắn nói dối (owner: Đức yêu cầu chạy trial)

| Quyết định | Vì sao | Ai chốt |
|---|---|---|
| Chạy trial live ngay sau khi code xong, thay vì tin suite xanh là đủ. | Đức đề xuất. Đúng: suite 79/79 xanh mà trial vẫn lòi ra một lỗi mà không test tĩnh nào bắt được. | Đức |
| Sửa lời nhắn của `run.stop` lúc PRE_SUBMIT: bỏ câu *"Không job nào bị gửi thêm"*, thay bằng câu nói rõ job đang chạy VẪN có thể kịp gửi. | Sổ cái live: `BRIDGE_RUN_STOPPED` 14:20:36 (`STOP_REQUESTED_BEFORE_SUBMIT`) → `PROMPT_SUBMITTED` 14:20:37. Câu trấn an kia sai đúng 1 giây sau khi được nói ra. Đây là loại nói dối dự án này từ chối: hệ thống nói với người vận hành một điều dễ chịu mà không đúng. | Claude |
| KHÔNG đổi thời điểm cờ dừng ăn (để job đang chạy không kịp gửi). | Đó là đổi luật an toàn (`AGENTS.md` mục 2.4) và cần đo trước. Bản vá lời nhắn là bản vá TRUNG THỰC với chi phí bằng không; đổi hành vi dừng là việc khác, phải hỏi Đức riêng. | Claude |
| Lỗi này có ở CẢ worker ChatGPT (tôi port nguyên văn lời nhắn từ đó sang). Trial của họ chỉ tình cờ thử nhánh "dừng sau khi đã gửi" nên nhánh này chưa từng bị soi. | Package đó có chủ là phiên khác, tôi chỉ được đọc — báo Đức để chuyển lời. | Claude |
