# HANDOFF — gốc repo (`_root`)

> Nhật ký việc ở **gốc repo**: AGENTS.md, DASHBOARD, FEATURE-PARITY, `docs/`, `scripts/`.
> Việc trong `workers/*` ghi ở HANDOFF.md của package đó, không ghi vào đây.
> **Chỉ thêm dòng, mới nhất ở cuối.**

## Log

- **2026-09-02 · `s1-complete`** — S1 hoàn tất theo `docs/briefs/BRIEF-S1-COMPLETE.md`: ROADMAP
  thêm frontmatter 3 trường; SEND-TO-OTHER-REPOS xoá dòng `created` (còn đúng 3); `git mv
  docs/studies/archive` → `docs/archive` (2 file, git nhận là rename); tạo
  `docs/_TEMPLATE-study.md` (24 dòng). Kèm 2 việc ngoài 4 món, đã báo Đức: (a) sinh lại
  `DASHBOARD.md` — bảng lệch 1 commit vì phiên `claude-bridge-multiprofile` commit code
  `6c59266` rồi bỏ đi chưa sinh lại bảng, làm cổng kiểm ĐỎ và số trên GitHub sai; (b) khai
  `_TEMPLATE-study.md` vào Bản đồ file theo luật vàng 4. `_root` chuyển từ
  `claude-bridge-multiprofile` sang phiên này, Đức duyệt 2026-09-02. Còn mở: bước 2 K-MIGRATE
  và bước 3 `harness_parity_check.py` (của Codex) chưa động tới.

- **2026-09-02 · `s1-complete`** — Hai việc Đức giao sau S1. **(1) Nối roadmap khớp K0**
  (`f2e45f9`): `ROADMAP-CLEAN-AND-TEMPLATE-V1` vẫn bảo dựng repo `repo-template`, trong khi
  quyết định K0 số 1 ngày 01/09 đã huỷ nó và chuyển sang promote vào Kho tier `SEED`. Sửa 5
  chỗ + thêm ghi chú vị trí (roadmap chỉ là MỘT làn; mâu thuẫn thì K0 thắng). **(2) Phiên S2 —
  sinh cổng vào.** `build-dashboard.mjs` nay sinh thêm `llms.txt` (llmstxt.org, 30 dòng) và
  `repo-map.json` (hợp đồng cross-repo, `schema_version: 1`, profile P1); `DASHBOARD.md` thêm
  Khối A "Bắt đầu từ đâu" trên cùng và Khối D "Sức khoẻ điều hướng". Cổng `--check` nay so cả
  ba file. Suite 45/45 (thêm 12 phép kiểm S2), 10/10 đột biến bị bắt, npm test 95+6+45+15 xanh.
  - **Vai bị đổi, khai theo luật giao chéo (roadmap mục 2):** roadmap giao S2 cho Codex viết.
    Codex hỏng trên máy này từ 27/08, 7 lần thử không ra kết luận (chi tiết ở HANDOFF của
    `duc-auto-chatgpt`). Claude Code viết thay. **Audit độc lập vẫn còn nợ** — đề xuất giao GPT
    qua GitHub connector, vòng đó đã chạy được thật ở `evidence/20260901-harness-audit-r01/`.
  - **Một thiết kế bị sửa giữa chừng, đáng ghi lại:** bản đầu lấy claim đang mở trong
    `.agents/claims.json` làm "việc ưu tiên #1". Phép kiểm 22 (có từ trước) chặn đúng: claim là
    trạng thái sống, đổ vào artifact thì mỗi lần nhận/trả quyền là artifact cũ và cổng đỏ cho
    phiên sau. **Sửa thiết kế chứ không sửa phép kiểm.** Nay artifact chỉ dùng TẬP KHOÁ của
    claims.json, không dùng giá trị `owner`. Việc ưu tiên #1 sẽ lấy từ `next_step` của STATUS
    schema v2 — bộ sinh đã nối sẵn đường, S3 chỉ cần đổ dữ liệu vào STATUS.
  - **Ba con số nợ Khối D đang là: chưa khai STATUS 2 · link chết 0 · thư mục chưa khai chủ 7
    · tài liệu quá hạn 0.** Lưu ý cho người viết brief S3: S3 đặt mục tiêu "ba dòng đếm về 0"
    nhưng chỉ dự kiến khai `pilots/`. Thực đo có **7** thư mục chưa khai chủ (`delegations/`,
    `docs/`, `drafts/`, `evidence/`, `pilots/`, `scripts/`, `tests/`). Tôi cố tình KHÔNG bịa
    miễn trừ để con số về 0 — brief S3 cần mở rộng phạm vi hoặc Đức chốt danh sách miễn trừ.
  - Còn mở ở gốc repo: bước 2 K-MIGRATE và bước 3 `harness_parity_check.py` (làn HARNESS, GPT
    cầm). Phiên S3 của làn này chưa ai nhận.
