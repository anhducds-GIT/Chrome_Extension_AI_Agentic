# AGENTS — Duc Auto GG Flow Video

CORE của package này. Đọc cùng `README.md` (project là gì) và `HANDOFF.md`
(trạng thái, Log) trước khi làm bất cứ việc gì. Package là **fork từ
`workers/duc-auto-gemini/v0.2.0`** — luật nào không ghi khác ở đây thì áp dụng
y như `AGENTS.md` của package đó và `AGENTS.md` gốc repo.

## Luật vàng riêng của nhánh video

1. **Không đoán selector.** Mọi selector Flow phải có bằng chứng `dom_probe`
   trong `evidence/`. SELECTORS/TIMING đang là đồ thừa kế từ Gemini — KHÔNG
   được coi là đúng cho Flow.
2. **Video trừ credits thật.** Trần trial dev: **≤3 video một chuỗi** (Đức chốt
   27/08: 3 × 15 credits = ngân sách free — KHÔNG dùng trần 30 của nhánh ảnh). Không retry tự động
   khi nghi ngờ đã trừ credits. Nới trần = đổi luật an toàn = hỏi Đức.
3. **Khoá bootstrap Bridge đã được gỡ ngày 2026-08-27** sau khi provider adapter được dựng
   từ bằng chứng thật, có test ghim và audit đối kháng PASS. Full method surface khả dụng,
   nhưng mọi gate an toàn riêng vẫn giữ nguyên. `diagnostics.evidence_submit` được giữ làm
   công cụ debug với trần cứng 3 lượt/trang; `run.trial` có trần 3 job và chỉ chạy khi bật
   toggle **Chế độ phát triển (Dev Mode)** trong side panel.
4. Các luật thừa kế nguyên văn từ nhánh Gemini/ChatGPT: không innerHTML;
   không làm yếu exact-once / attribution / readiness / persistence /
   checkpoint / security hard-stop; chữ operator tiếng Việt, CODE tiếng Anh;
   sửa `.js` → nhắc Đức reload extension; mỗi fix một test ghim.
5. `evidence/` chỉ THÊM, không sửa, không xoá.

## Bản đồ file

| File / thư mục | Vai trò |
|---|---|
| `tests/bridge-transport-liveness-smoke.mjs` | Ghim lớp ổn định kết nối Bridge (port từ Gemini qua ChatGPT, 02/09): keepalive **chờ ACK có hạn**; buông socket ngay khi phán nó chết chứ không đợi sự kiện `close` mà socket `CLOSING` có thể không bao giờ phát; reconnect **thang trần 5 giây**, bỏ cuộc sau cửa sổ rồi nhường alarm 30 giây; **hạn bắt tay** phủ cả socket không bao giờ mở lẫn socket mở mà host không trả lời. Ghim riêng cho nhánh này: **cờ đang-nối** — nhánh này đọc identity TRƯỚC khi tạo socket nên không giữ socket trước `await` được như hai nhánh kia, và cờ này là thứ chặn hai lượt nối chồng nhau. Fake socket có trạng thái `CLOSING` thật |
| `manifest.json` | MV3, match `https://labs.google/fx/tools/flow/*` |
| `README.md` | Tổng quan, trạng thái Bridge, cài đặt |
| `AGENTS.md` | File này |
| `STATUS.md` | Trạng thái vận hành 1 trang (máy đọc frontmatter sinh DASHBOARD) |
| `HANDOFF.md` | Trạng thái + Log (chỉ thêm dòng) |
| `BACKLOG.md` | Việc còn mở, đánh số `F-xx` |
| `decisions.md` | Quyết định Đức đã chốt cho nhánh này |
| `AI-OPERATOR-GUIDE.md` | Vận hành/debug qua Bridge (trỏ về guide Gemini + khác biệt Flow) |
| `NEXT-SESSION-BRIEF.md` | Brief bàn giao phiên kế tiếp (kiểm ngày trước khi tin; HANDOFF mới hơn thì HANDOFF thắng) |
| `DAC_XLSX_RUN_PLAN_V1.md` | Hợp đồng schema workbook (thừa kế, sẽ mở rộng cho video) |
| `provider-adapter.js` | Nơi DUY NHẤT biết về trang Flow (ORIGIN đã đổi; SELECTORS/TIMING còn là của Gemini, chờ bằng chứng) |
| `background.js`, `content.js`, `sidepanel.js`, `sidepanel.html`, `sidepanel.css`, `sidepanel-ui-semantics.js` | Runtime thừa kế nguyên trạng từ Gemini v0.2.0 |
| `bridge-core.js`, `bridge-router-core.js`, `bridge-pairing-core.js`, `bridge-proposal-core.js`, `bridge-transport-loopback.js` | Agent Bridge (full method surface; gate riêng của từng method vẫn áp dụng) |
| `*-core.js` còn lại (`runner-core.js`, `image-evidence-core.js`, `attempt-identity-core.js`, `attempt-telemetry-core.js`, `approval-persistence-core.js`, `audit-chain-core.js`, `chat-readiness-core.js`, `checkpoint-core.js`, `content-decision-core.js`, `dev-trial-core.js`, `halt-instructions-core.js`, `operator-glossary-core.js`, `operator-messages-core.js`, `orchestrator-review-core.js`, `output-location-core.js`, `output-profile-core.js`, `plan-diagnostics-core.js`, `reconciliation-core.js`, `recreate-core.js`, `resume-core.js`, `run-state-core.js`, `xlsx-codec.js`, `xlsx-run-plan-core.js`) | Core thuần thừa kế — sửa món nào ghi món đó vào Log |
| `tests/` | Suite deterministic (`node tests/run-all.mjs` phải xanh 100%) |
| `scripts/` | bridge-rpc.mjs, installer/uninstaller host, tiện ích pilot |
| `templates/` | Workbook XLSX mẫu (thừa kế, sẽ thay bản video) |
| `icons/` | Icon extension |
| `duc-auto-chatgpt-loopback-bridge-host-v1/` | Mã nguồn host Bridge (generic, dùng chung giao thức) |
| `evidence/` | Bằng chứng DOM/vận hành của nhánh Flow — chỉ THÊM |
| `pilot-04/`, `pilot-05/` | CHỈ fixture XLSX cho test thừa kế (không phải bằng chứng vận hành của nhánh này) |

Thêm file/thư mục top-level mới → thêm 1 dòng vào bảng này. Không khai = không tồn tại.
