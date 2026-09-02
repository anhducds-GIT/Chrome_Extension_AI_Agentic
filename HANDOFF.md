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

- **2026-09-02 · `s2-fix` (vòng 3)** — **Audit vòng 2 của Codex và audit GPT, cả hai đều
  REJECTED/CONDITIONAL. Đã sửa gốc bệnh.** Ba vòng audit đều quay về đúng một chỗ: vòng 1 bắt
  việc LIỆT KÊ đọc từ đĩa (tôi vá); vòng 2 bắt tiếp việc ĐỌC NỘI DUNG vẫn từ đĩa — sửa một
  `STATUS.md` chưa commit là cả ba artifact đổi theo. Tôi tự dựng lại ca đó trên repo thật:
  đúng. **Vá gốc: bộ sinh nay đọc HOÀN TOÀN TỪ HEAD ở cả hai chế độ** (`createDefaultDeps`
  dựng trên `createHeadDeps`), đĩa chỉ còn dùng để GHI. Hai chế độ nay khác nhau đúng một
  điểm — ghi ra file hay đem đi so — nên không còn cách nào để chúng bất đồng.
  - Sửa kèm: `claims.json` thiếu hẳn file hoặc là mảng đều bị chặn · ngày commit hỏng
    (`2026-99-99` cho `NaN`, không phải `null`) nay tính là nợ · submodule tầng gốc nay vào
    được bảng chủ sở hữu (`ls-tree -r --name-only` trả tên trơn nên bị xếp nhầm là file) ·
    cổng kiểm từ chối tin chính nó khi bộ sinh chưa commit (`GENERATOR_DIRTY`).
  - **BÁC MỘT PHẦN audit, có lý do và có số:** Codex đề nghị "kind lạ thì tính nợ kể cả khi
    đã khai `ttl_days`". Tôi làm theo và `draft_debt` nhảy 0 → 2: hai file `kind: spec` vừa
    commit hôm qua, có `ttl_days` đàng hoàng, bị gọi là quá hạn. Đó là báo oan, và một bảng
    nợ báo oan thì người đọc học cách phớt lờ nó. Đã revert, ghi lý do ngay trong code lẫn
    test để phiên sau đừng "sửa" ngược lại. Việc "kind lạ có hợp lệ không" thuộc cổng kiểm
    schema ở S4.
  - **Một phép kiểm của chính tôi hoá ra là giả:** bản đầu ghim "đọc từ HEAD" bằng cách DÒ
    VĂN BẢN NGUỒN. Một mutation chỉ cần đổi tên tham số từ `(relPath)` thành `(r)` là lách
    qua — thử thì thoát thật. Đã thay bằng phép đo trên một repo git tạm: commit một file,
    sửa nó trên đĩa, và bắt `readFile` phải trả bản đã commit. **Dò văn bản nguồn ghim cách
    viết, không ghim hành vi.**
  - **Đo:** suite 59/59 · npm test 95+6+59+15 xanh · **8/8 mutation bị bắt**, gồm cả ba cái
    Codex vòng 2 tìm ra và hai cái GPT tìm ra.
  - **Còn nợ, cần Đức chốt (đều là quyết định, không phải lỗi):** `active_work` C1 quy định
    object mà code phát ra array · `compareRepoMap` xoá vô điều kiện hai trường xuất xứ ·
    `priorityFrom` lấy dòng đầu theo thứ tự path nên khi schema v2 bắt mọi unit có
    `next_step` thì "ưu tiên #1" thành ưu tiên theo bảng chữ cái · `firstSentence` cắt 160
    ký tự có thể cắt gãy link markdown.
  - **BRIEF-S3 vẫn là BLOCKER, chưa sửa:** nâng SCHEMA lên v2 mà không migrate 3 STATUS v1
    đang có thì `collectModel` từ chối toàn repo. Đã kiểm: cả 3 STATUS + template đều v1.
    Kèm theo: `areas` nên nằm ở `.repo-structure.json` chứ không phải `claims.json` (GPT
    bác đề xuất của tôi, và GPT đúng); roadmap canonical còn tự mâu thuẫn.

- **2026-09-02 · `s2-fix` (patch tài liệu)** — Đóng nốt phần còn nợ của hai vòng audit. Đức
  chốt: **Đức không còn là người đi bắt lỗi kỹ thuật** — vòng AI phải tự đóng, Đức chỉ review
  khi có dashboard thân thiện ở mức ~90%. Vòng này tôi tự chạy audit + mutation, không giao
  việc kiểm cho Đức.
  - **Bốn quyết định kỹ thuật, đã chốt và đã code:**
    ① `active_work` là **MẢNG** — sửa SPEC cho khớp code, không phải ngược lại. Object đơn
    không diễn tả được "không có việc nào" và "nhiều việc song song".
    ② `compareRepoMap` bỏ qua **giá trị** hai trường xuất xứ nhưng **đòi khoá có mặt, đúng
    kiểu** — trước đây một `repo-map.json` mất khả năng truy nguồn vẫn lọt cổng.
    ③ **`priority_rank`** thay cho "lấy dòng đầu theo thứ tự đường dẫn". Không ai khai thì hệ
    nói **CHƯA XẾP HẠNG**; hai đơn vị cùng hạng nhỏ nhất thì nói **XUNG ĐỘT**. Máy không đoán
    hộ — bản cũ khiến "việc ưu tiên #1" thầm lặng thành "việc của package đầu bảng chữ cái".
    ④ `safeTruncate` — cắt câu không còn cắt gãy link markdown hay backtick. Đây là chỗ Đức
    nhìn thấy `(...` trong `llms.txt`.
  - **Bốn tài liệu điều hành đã hết mâu thuẫn:** roadmap "Chín phiên" → "Mười phiên"; S2 đã
    tick (`6ef131c`, ghi rõ Claude Code viết thay Codex); mục 8 "Bắt đầu" trỏ S3 thay vì vẫn
    bảo bắt đầu S1; phạm vi S3 sửa từ "mỗi `pilots/`" thành 7 thư mục + migrate schema;
    `RESTRUCTURE-PLAN` bỏ đòi frontmatter 5 trường (`created`/`last_reviewed` là ngày gõ tay,
    máy suy được từ git) về đúng luật 3 trường; `REPO-STRUCTURE-SPEC` C1 cập nhật hợp đồng.
  - **Bài nghiệm thu cũ KHÔNG chạy được, đã sửa:** nó bảo "bấm thử 3 link trong `llms.txt`".
    GitHub hiển thị `.txt` dạng chữ trơn nên link không bấm được. Không phải lỗi của file
    (chuẩn llmstxt.org bắt buộc đuôi `.txt`) mà là lỗi của bài kiểm. Nay: nhìn cấu trúc ở
    `llms.txt`, bấm link ở `DASHBOARD.md`.
  - **BRIEF-S3 viết lại từ đầu.** Bản cũ là blocker: bảo nâng schema lên v2 mà không giao
    migrate ba STATUS `v1` đang có → `collectModel` từ chối toàn repo. Bản mới bắt làm đúng
    thứ tự **migrate trước, siết sau**, và đặt `areas` vào `.repo-structure.json` chứ không
    phải `claims.json` (audit GPT bác đề xuất đầu của tôi, và bác đúng: `claims` là STATE,
    `areas` là LAW, trộn hai tầng là trái luật của chính SPEC). Bỏ `session_intent` khỏi nhóm
    bắt buộc — nó là thứ theo phiên, thuộc HANDOFF.
  - **Đo:** suite **63/63** · npm test 95+6+63+15 xanh · **9/9 mutation bị bắt** (5 cái mới
    cho 4 quyết định trên, 4 cái cũ kiểm lại). Khối D vẫn 2 · 0 · 7 · 0.
  - **Còn mở:** S3 sẵn sàng mở. Trước khi mở nên cho Codex audit một lượt bản patch này.

- **2026-09-02 · `s2-fix` (patch r4)** — Đóng nốt audit Codex vòng 3 + audit GPT S3. Đối chiếu
  trước khi làm: **4/5 mục GPT nêu đã được sửa** trong vòng Codex 3 (GPT audit một commit cũ
  hơn) — không làm lại. Còn 5 chỗ thật, cộng 6 chỗ Codex vòng 3.
  - **Nặng nhất:** ① `priority_rank:` bỏ trống cho `Number("") === 0`, và 0 nhỏ nhất nên nó
    **thắng mọi đơn vị khai đàng hoàng, lặng lẽ**. ② `realPath` là thứ **duy nhất** còn kéo
    hệ thống file vào đường đọc — xoá `manifest.json` khỏi working tree trong khi HEAD vẫn có
    thì bộ sinh chết, kèm thông báo dẫn sai hướng hoàn toàn. ③ Đơn vị gốc repo không đọc được
    `STATUS.md`, nên S3 có tạo file đó thì nợ vẫn không giảm — **đề bài không thể đạt mục tiêu
    của chính nó**. ④ `BRIEF-S3` có bẫy thứ tự: chạy bộ sinh trước commit thì nó dựng lại từ
    HEAD **cũ**, rồi commit dữ liệu mới cạnh artifact cũ → cổng đỏ.
  - **Ba lỗ fail-open:** ma commit trong `repo-map.json` nhận cả rác như `khac123` · cổng kiểm
    trả "ổn" khi không hỏi được git (nay `VERIFIER_UNKNOWN` — không biết thì nói là không
    biết) · bản `superseded`/`archived` vẫn có thể thành ưu tiên số 1.
  - **Bộ sinh nay tự in CẢNH BÁO THỨ TỰ** khi thấy file đầu vào sửa dở chưa commit — cái bẫy
    ở mục ④ không im lặng nữa.
  - **Tài liệu:** ROADMAP bỏ `session_intent` (nó là thứ theo phiên, thuộc HANDOFF), thêm
    `priority_rank`, dòng cuối "Xong S1 báo tôi" → "Xong S3 báo tôi";
    `RESTRUCTURE-PLAN` GĐ2 sửa "khai `pilots/` trong `repo-map.json`" — sai hai chỗ:
    `repo-map.json` là file MÁY SINH không khai tay vào được, và thực đo là **7** thư mục
    chứ không phải 1.
  - **Một đột biến "thoát" hoá ra là equivalent mutant** — bỏ `if (text === "")` không đổi
    hành vi vì phép kiểm `>= 1` đã chặn sẵn. Ghi lại để vòng sau không đuổi theo.
  - **Đo:** suite **73/73** · npm test 95+6+73+15 xanh · **8/8 mutation bị bắt** · cổng
    fail-closed đã kiểm thực tế (giả lập git hỏng → `VERIFIER_UNKNOWN`).
  - **CÒN NỢ, GPT nói đúng:** mọi con số trên đây vẫn là **[KHAI]** — repo không có CI, nên
    auditor đọc qua GitHub không tự kiểm lại được. Thêm một workflow chạy `npm test` mỗi lần
    push sẽ biến chúng thành **[ĐO]**. Đó là **tạo automation tự chạy — luật gốc bắt phải hỏi
    Đức trước.** Chưa làm.
