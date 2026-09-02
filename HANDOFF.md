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

- **2026-09-02 · `s2-fix`** — **Audit độc lập BÁC BỎ S2, đã sửa.** Codex (khởi động lại được,
  đọc trọn 112KB file đầy đủ) trả về REJECTED và bác cả ba lời tuyên bố trong commit `829d644`.
  Tôi tự kiểm chứng lại từng cái — **nó đúng cả**:
  - **Phát hiện 1 (NẶNG, đã đo):** bộ sinh liệt kê thư mục/file từ ĐĨA. Tạo một thư mục rác chưa
    track rồi sinh lại thì `undeclared_dirs` nhảy 7 → 8. Commit số đó lên là cổng ĐỎ OAN cho
    phiên sau. **Vá:** thêm `git.trackedPaths()` (một lệnh `ls-tree` duy nhất, dùng chung cho cả
    chế độ đĩa lẫn chế độ HEAD) và rút toàn bộ việc liệt kê về đó — thư mục top-level, tài liệu
    `docs/`, phát hiện package, và cả cột "File test [ĐO]". Bộ sinh nay **không đọc thư mục từ
    đĩa ở bất kỳ đâu** (`grep deps.listDirs` chỉ còn khớp một dòng ghi chú).
  - **Phát hiện 2 (NẶNG):** phép kiểm 11 không kiểm thứ nó tự nhận. Tham số `dirty` của fixture
    chỉ giả lập `git.dirtyFiles()` — hàm mà `buildDashboard` không hề gọi. Nên nó so hai model y
    hệt nhau và luôn xanh. **Tôi đã dựa vào đúng cái test rỗng này để tự trấn an ở phiên trước.**
    **Vá:** `dirty` nay hiện ra như trên đĩa thật (có trong `listDirs`/`listFiles`, không có
    trong `trackedPaths`), và gỡ chỗ hardcode thư mục gốc trong fixture — chính chỗ hardcode đó
    làm một mutation "quay về đọc từ đĩa" thoát được ở vòng kiểm đầu.
  - **Phát hiện 4 + 5 (fail-open):** `claims.json` hỏng thì nuốt lỗi trả `{}` (mọi thư mục thành
    chưa-khai-chủ, không ai biết vì sao); `ttl_days: ba-muoi` cho `NaN` nên tài liệu đó lặng lẽ
    thoát mọi phép đếm nợ. **Vá:** claims hỏng → ném `CLAIMS_HONG`/`CLAIMS_THIEU_KHOI`; hạn dùng
    không đọc được → **tính là nợ**, không tha.
  - **Ba mutation Codex nói sẽ thoát — tôi chạy thử, thoát thật cả ba.** Nặng nhất: gỡ
    `validateStatus` ra khỏi đường chạy mà toàn suite vẫn xanh (đúng loại "xoá chỗ gọi" repo này
    đã trả giá một lần). Nay có 6 phép kiểm ghim mới; chạy lại **6/6 mutation đều đỏ**.
  - **Đo:** suite build-dashboard **51/51** (33 cũ + 12 của S2 + 6 sau audit), npm test
    95+6+51+15 xanh. Con số Khối D không đổi (2 · 0 · 7 · 0) — vá đúng cách thì số phải giữ nguyên.
  - **CHƯA SỬA, đẩy sang việc sau:** (a) `compareRepoMap` xoá hai trường dấu commit vô điều kiện
    nên một `repo-map.json` thiếu hẳn hai trường đó vẫn được coi là khớp; (b) `firstSentence` cắt
    ở 160 ký tự không nhìn cú pháp, có thể cắt gãy một link markdown giữa chừng. Cả hai là LOW,
    Đức đã chốt để lại. **Gốc repo chưa có `BACKLOG.md`** — cân nhắc thêm ở S3 hoặc S8.
  - **Còn nợ:** audit vòng hai cho chính bản vá này, và audit GPT (prompt đã sẵn ở
    `docs/briefs/AUDIT-PROMPT-S2-GPT.md`).
