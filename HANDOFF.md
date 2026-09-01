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
