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

> **Luật thừa kế nay ở lõi dùng chung** (in ngay trên đây) và
> [`workers/_shared/AGENTS.md`](../../_shared/AGENTS.md) — cấm `.innerHTML`, `evidence/` chỉ
> THÊM, không đoán selector, chữ operator tiếng Việt, nhắc Đức reload, mỗi fix một phép ghim.
> **Đừng chép lại đây.** Riêng nhánh này: `SELECTORS`/`TIMING` là **đồ thừa kế từ Gemini**, KHÔNG
> được coi là đúng cho Flow; và lớp bảo vệ phải giữ có thêm *readiness* · *checkpoint* ·
> *security hard-stop*.

1. **Video trừ credit THẬT.** Trần trial dev **suy từ chip cấu hình đang hiển thị** (F-22,
   05/09): ngân sách một tài khoản free là 50 credit, chia cho đơn giá đọc trên chip → 360p ×1
   được 7 job · 720p ×1 chỉ 3 · 360p ×3 chỉ 2. `MAX_TRIAL_JOBS = 7` là **trần tuyệt đối**; chip
   chỉ được HẠ, không bao giờ nâng. Không đọc được chip thì lấy cấu hình đắt nhất đã đo. **Không
   retry tự động khi nghi ngờ đã trừ credit**
   ([ADR-0002](docs/adr/0002-luat-an-toan-nhanh-video.md) — vế còn sống duy nhất của quyết định
   đó). **Nới trần tuyệt đối = đổi luật an toàn = hỏi Đức.**
2. **Trần thật khai ở ĐÚNG MỘT CHỖ:** `MAX_TRIAL_JOBS` trong `dev-trial-core.js`. Đừng gõ lại con
   số vào văn bản: ngày 09/09 file này mang **hai con số an toàn khác nhau** (3 và 7) vì một dòng
   văn không được sửa theo mã — và đó là con số về TIỀN.
3. **Khoá bootstrap Bridge đã gỡ 27/08**
   ([ADR-0007](docs/adr/0007-go-khoa-bootstrap-bridge-f-05.md)): full method surface khả dụng,
   mọi gate an toàn riêng **giữ nguyên**. `diagnostics.evidence_submit`
   ([ADR-0004](docs/adr/0004-diagnostics-evidence-submit-primitive-tuong-tac.md)) là công cụ
   debug, trần cứng 3 lượt/trang. `run.trial` chỉ chạy khi bật **Dev Mode** ở bảng bên, trần theo
   luật 1.
4. **Fix nhỏ không cần audit độc lập** — Đức chốt 02/09
   ([ADR-0009](docs/adr/0009-bo-audit-doc-lap-cho-fix-nho.md)). **VẪN audit** khi đụng lớp an
   toàn, đường tiêu credit, hay bắt tay Bridge. Không đổi: suite xanh · cổng xanh · mỗi fix một
   phép ghim. **Ranh giới *"fix nhỏ"* chưa ai chốt câu chữ và vế này đá với `AGENTS.md` gốc —
   CHỜ ĐỨC** (Hệ quả của ADR-0009).

## Bản đồ file

| File / thư mục | Vai trò |
|---|---|
| `PHIEN.md` | **MÁY SINH — đừng sửa tay.** Bó mở phiên: lõi luật + luật riêng của gói + trạng thái mới nhất. Sinh lại: `node scripts/rule-compile.mjs --sinh` (phải giữ khoá vùng). Trần CỨNG ~3.000 token, vượt là bộ sinh từ chối — [ADR-0035](../../../docs/adr/0035-mot-file-cho-mot-phien-gap.md) |
| `manifest.json` | MV3, match `https://labs.google/fx/tools/flow/*` |
| `README.md` | Tổng quan, trạng thái Bridge, cài đặt |
| `AGENTS.md` | File này |
| `STATUS.md` | Trạng thái vận hành 1 trang (máy đọc frontmatter sinh DASHBOARD) |
| `HANDOFF.md` | Trạng thái + **20 lượt Log gần nhất** (chỉ thêm dòng). Cắt đuôi 2026-09-06 theo ADR-0008 của gốc repo; lịch sử cũ hơn ở `HANDOFF-ARCHIVE-01.md` |
| `HANDOFF-ARCHIVE-01.md` | **Đuôi đã cắt của `HANDOFF.md`** — 183 lượt Log cũ, nguyên văn, không sửa một chữ. Chỉ đọc; ghi Log mới thì ghi vào `HANDOFF.md`. Ghép lại dựng được bản gốc giống hệt từng byte (bất biến ⑴ của ADR-0008) |
| `BACKLOG.md` | Việc còn mở, đánh số `F-xx` |
| `decisions.md` | **Nay là MỤC LỤC** trỏ sang `docs/adr/` (N-55, 09/09). Đừng thêm mục vào đây nữa |
| `docs/adr/` | Quyết định của riêng gói này. **HỒ SƠ sửa được, QUYẾT ĐỊNH thì không** ([ADR-0026](../../../docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md) ⑵) — bỏ hẳn một số hiệu khỏi sổ thì B12 CHẶN. **Đếm, đừng tin một con số gõ tay:** `ls docs/adr/*.md \| wc -l` |
| `AI-OPERATOR-GUIDE.md` | Vận hành/debug qua Bridge (trỏ về guide Gemini + khác biệt Flow) |
| `NEXT-SESSION-BRIEF.md` | Brief bàn giao phiên kế tiếp (kiểm ngày trước khi tin; HANDOFF mới hơn thì HANDOFF thắng) |
| `DAC_XLSX_RUN_PLAN_V1.md` | Hợp đồng schema workbook (thừa kế, sẽ mở rộng cho video) |
| `provider-adapter.js` | Nơi DUY NHẤT biết về trang Flow (ORIGIN đã đổi; SELECTORS/TIMING còn là của Gemini, chờ bằng chứng) |
| `background.js`, `content.js`, `sidepanel.js`, `sidepanel.html`, `sidepanel.css`, `sidepanel-ui-semantics.js` | Runtime thừa kế nguyên trạng từ Gemini v0.2.0 |
| `bridge-core.js`, `bridge-router-core.js`, `bridge-pairing-core.js`, `bridge-proposal-core.js`, `bridge-transport-loopback.js` | Agent Bridge (full method surface; gate riêng của từng method vẫn áp dụng) |
| `run-liveness-core.js` | **F-25 bước ②** — phân biệt *đang chờ nhịp* với *vòng chạy đã chết âm thầm*. Hàm THUẦN (`now` là tham số). **Nhịp tim do CHÍNH vòng lặp job đập ra**, không phải `setInterval`: panel vẫn sống lúc gãy |
| `*-core.js` còn lại | Core thuần thừa kế từ nhánh ảnh — `ls *-core.js` liệt kê đủ. Sửa món nào thì ghi món đó vào Log |
| `tests/` | Suite deterministic (`node tests/run-all.mjs` phải xanh 100%). **Mỗi phép ghim tự khai ở docblock đầu file nó** — tra bằng `grep -l "F-08" tests/*.mjs`, đừng tra ở bảng này |
| `scripts/` | bridge-rpc.mjs, installer/uninstaller host, tiện ích pilot |
| `templates/` | Workbook XLSX mẫu (thừa kế, sẽ thay bản video) |
| `icons/` | Icon extension |
| `duc-auto-chatgpt-loopback-bridge-host-v1/` | Mã nguồn host Bridge (generic, dùng chung giao thức) |
| `evidence/` | Bằng chứng DOM/vận hành của nhánh Flow — chỉ THÊM |
| `pilot-04/`, `pilot-05/` | CHỈ fixture XLSX cho test thừa kế (không phải bằng chứng vận hành của nhánh này) |

Thêm file/thư mục top-level mới → thêm 1 dòng vào bảng này. Không khai = không tồn tại.

## Chọn nhãn cấu hình trên trang

**Đã lên tầng repo 09/09: [ADR-0028](../../../docs/adr/0028-chon-nhan-cau-hinh-tren-trang.md).**
Đức chốt 02/09 rằng chọn nhãn cấu hình là việc AI nên tự làm được, **và không riêng gói này** —
nên đường đã chứng minh chạy được cùng bốn luật (**nhãn phải có bằng chứng DOM** · **mờ là từ
chối** · **cú bấm không phải bằng chứng, nhãn tóm tắt mới là** · **đóng bảng và ghi vào sổ cái**) nay
ở đó. Bằng chứng của nhánh này: `evidence/F14-mode-probe-vi-20260902.json`.

> Món nợ cũ ở chỗ này — *"cần một ADR ở tầng repo… vì `_root` phiên khác đang giữ"* — **đã trả**.
> Nó là một món nợ tự khai đúng cách: nói cả việc còn thiếu lẫn điều kiện để làm.
