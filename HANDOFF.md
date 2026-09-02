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

- **2026-09-02 · `s3-gaps`** — **PHIÊN S3 XONG. Khối D về 0 · 0 · 0 · 0.**
  - Khai `STATUS.md` cho đơn vị gốc repo (`lifecycle: idea` — nó chưa từng chạy pilot, khai
    `building` là nói quá) · khai `duc-auto-gemini/v0.1.0` là `superseded` (chỉ THÊM file, không
    đụng `Pilot-01`) · tạo `.repo-structure.json` khối `areas` khai chủ cả 8 thư mục top-level ·
    nâng schema lên `extension-status/v2`, migrate 6 file TRƯỚC rồi mới siết `SCHEMA`/`REQUIRED`.
  - **Xếp hạng ưu tiên (mới, thay cho việc máy đoán):** gg-flow-video 1 (chưa kiểm live, đang
    chặn) · chatgpt 2 (còn nợ audit độc lập) · gemini v0.2.0 3 · gốc repo 4. Khối A và
    `llms.txt` nay nêu đúng việc số 1 thay vì "CHƯA KHAI".
  - **`areas` đặt ở `.repo-structure.json`, KHÔNG phải `claims.json`** — audit GPT bác đề xuất
    đầu của tôi và bác đúng: claims là tầng STATE (đổi vài lần mỗi phiên), areas là tầng LAW.
    Trộn hai tầng là trái luật của chính SPEC; thêm nữa quyền khai trong claims cho `docs/`
    không được `safe-push` cưỡng chế — một lời khai không có răng.
  - **Ba trường bắt buộc CÓ ĐIỀU KIỆN:** `next_step` + `priority_rank` chỉ cho đơn vị còn sống;
    `superseded_by` chỉ khi `superseded`, và phải trỏ tới thứ CÓ THẬT. Bỏ hẳn `unclassified`
    khỏi lifecycle hợp lệ.
  - **Audit Codex vòng 4 TỰ CHẠY suite** (73/73, exit 0) — lần đầu con số không còn là lời khai.
    Nó tìm thêm 6 MAJOR; đã sửa 4 mục code + 3 lỗi quy trình trong brief. Nặng nhất: brief bảo
    "đỏ thì dừng" ở giữa chừng, mà bộ sinh đọc từ HEAD nên nó PHẢI đỏ ở đúng chỗ đó — làm theo
    là phiên S3 tự chặn đứng chính nó. **Tôi vừa sống qua đúng ca này khi làm S3.**
  - **Đo:** suite **79/79** · npm test 95+6+79+15 xanh · **11/11 mutation bị bắt**.
  - **Còn nợ, đẩy sang sau:** enumeration chưa ghim vào một ảnh chụp HEAD bất biến (Codex xếp
    LOW) · `firstSentence` cắt theo ký tự · `compareRepoMap` chưa kiểm sâu hơn hình dạng.
  - **Việc kế tiếp:** S4 — cổng kiểm cấu trúc, mở rộng `.repo-structure.json` thành 14 phép
    kiểm. **Chỉ cảnh báo, chưa chặn.** Kèm: gộp luôn CI vào S4 nếu Đức đổi ý (xem mục nợ dưới).

- **2026-09-02 · `s4-gate`** — **PHIÊN S4 XONG. Cổng kiểm cấu trúc B1–B14 đã chạy, CHẾ ĐỘ CẢNH BÁO.**
  - Thêm `scripts/check-bootstrap.mjs`. Chạy: `node scripts/check-bootstrap.mjs` (thêm `--all`
    để xem hết, mặc định cắt ở 12 dòng mỗi phép kiểm và **nói rõ đã cắt bao nhiêu**).
  - **Đo được hôm nay: 0 chỗ ĐỎ · 51 chỗ VÀNG** — B6 độ sâu điều hướng 49 chỗ (25 trong
    `drafts/`, phần còn lại là `delegations/`, `docs/studies`, `docs/briefs`, và tài liệu của
    bản Gemini v0.1.0 đã nghỉ) · B9 hai file `AGENTS.md` dài quá 200 dòng (chatgpt 204,
    gemini v0.2.0 201). **B12 in KHÔNG ÁP DỤNG** vì repo chưa có `docs/adr/` — đó là phiên S5,
    và bịa ra một kết quả xanh ở đó là nói dối.
  - **KHÔNG đo lại thứ đã có số đo.** B1/B3/B4/B11 lấy thẳng `model.health` của
    `build-dashboard.mjs`; B2/B5/B7 lấy thẳng `validateStatus`. Để làm được vế thứ hai,
    `validateStatus` được tách thành `validateStatusDetailed` — **cùng một phép đo, gắn thêm
    MÃ ngay tại chỗ đang đo**. Câu chữ thông báo không đổi một chữ; `validateStatus` cũ trở
    thành lớp bọc mỏng, nên không nơi gọi nào phải sửa.
  - **`collectModel` có thêm chế độ `tolerant`** (mặc định vẫn ném như cũ). Lý do: cổng kiểm
    cấu trúc sinh ra để CHỈ TÊN cái sai, nên nếu nó cũng chết ở lỗi STATUS đầu tiên thì người
    đọc chỉ thấy một lỗi và mất 13 phép kiểm còn lại. Ở chế độ này lỗi được gom vào
    `model.statusErrors`. Đầu vào hỏng (`claims.json`, `.repo-structure.json`) **vẫn ném ở cả
    hai chế độ** — đó không phải "một đơn vị khai sai" mà là "không đọc nổi bảng chủ sở hữu".
  - **`.repo-structure.json` có thêm khối `grandfathered`: 48 đường dẫn.** Kế hoạch ghi 52,
    đo lại tại `b7302e3` ra **48** — tôi lấy số đo, không lấy số trong kế hoạch. Chưa phép kiểm
    nào dùng tới khối này (kiểm tên đường dẫn là việc của S7); hôm nay `check-bootstrap` chỉ
    kiểm chiều ngược lại: đường dẫn nào trong danh sách miễn trừ đã biến mất khỏi HEAD thì
    phải nói ra — một danh sách miễn trừ để mục nát cũng là nợ.
  - **`EXPECTED_CHECKS` 7 → 8**, đúng luật chống tự tháo cổng: thêm cổng con "Cổng kiểm cấu
    trúc B1–B14 (chỉ cảnh báo)" vào `session-check.mjs`. Nó **KHÔNG BAO GIỜ đỏ vì nợ cấu trúc**
    — nợ chỉ được in ra. Ngoại lệ duy nhất, và nó không phải chặn nợ: nếu chính
    `check-bootstrap.mjs` **không chạy được** (thoát khác 0) thì đỏ, vì đó là *bộ kiểm hỏng*,
    không phải *repo có nợ*; báo xanh dựa trên một điều không kiểm được chính là lỗ fail-open
    mà mục 7 vừa phải đi vá.
  - **Đo:** suite **95 + 6 + 79 + 15 + 20** xanh · **22/22 đột biến bị bắt**.
    Hai đột biến THOÁT ở vòng đầu và đã phải sửa test, ghi lại để vòng sau đừng lặp:
    ① fixture không có `scripts/` nên nhánh "đơn vị gốc repo" của B14 **không bao giờ chạy** —
    fixture không phân biệt được hai nhánh thì con số mutation nói dối, đúng cảnh báo trong
    BRIEF-S4; ② phép kiểm tích hợp chỉ tìm chuỗi `"check-bootstrap.mjs"` trong
    `session-check.mjs`, mà tên đó còn nằm trong một dòng ghi chú — nên đổi lời gọi sang script
    khác vẫn xanh. Nay nó soi đúng lời gọi `execFileSync`.
  - **Còn mở:** 51 cảnh báo VÀNG ở trên — **cố ý chưa trả**, S4 chỉ có nhiệm vụ làm nó nhìn
    thấy được. B6 sẽ tự tụt mạnh sau S6 (dọn `drafts/`). Nợ cũ chưa đụng, y như S3 để lại:
    enumeration chưa ghim vào ảnh chụp HEAD bất biến · `firstSentence` cắt theo ký tự ·
    `compareRepoMap` chưa kiểm sâu hơn hình dạng · repo chưa có kiểm tự chạy trên GitHub nên
    số test vẫn là **[KHAI]** với auditor đọc qua GitHub (Đức đã chốt 02/09: chưa làm CI).
  - **BẪY THỨ TỰ TRONG CHÍNH `BRIEF-S4.md`, phiên sau đừng vấp lại:** bước "Mở phiên" bảo giữ
    claim `_root` **tới khi push xong**, nhưng phần "Đóng phiên" lại commit `claims.json` đã
    trả quyền **trước** khi chạy cổng — mà mục 1 của cổng đỏ ngay khi file gốc repo bị sửa
    trong commit chưa push mà không ai đứng tên. Thứ tự đúng: **giữ quyền → cổng xanh → push
    → trả quyền bằng một commit riêng → cổng xanh → push lần hai.** Đây là biến thể của đúng
    cái bẫy S3 đã ghi lại (bộ sinh đọc từ HEAD), nên nó thuộc loại lỗi lặp lại được.
  - **Việc kế tiếp: phiên S5 — `docs/adr/`.** Tạo được thư mục đó là B12 tự hết KHÔNG ÁP DỤNG,
    không phải sửa thêm dòng code nào (phần thân B12 đã viết đủ và đã có test ghim bằng fixture).

- **2026-09-02 · `audit-s4`** — **Audit độc lập phiên S4. Xác nhận đạt, kèm một lỗ test đã vá.**
  Luật vàng 4: báo cáo của AI khác không phải bằng chứng. Tôi tự chạy lại tất cả.
  - **Kiểm chứng lại, khớp hết:** 3 commit có thật và đã push · `npm test` **216 xanh** (5 suite,
    tôi tự chạy) · cổng kiểm exit 0 · `EXPECTED_CHECKS` 7→8 khớp đúng 8 phép kiểm ·
    `check-bootstrap.mjs` exit 0, **0 ĐỎ / 51 VÀNG** · định dạng thông báo đạt tiêu chí Đức.
  - **`grandfathered`: 48 khai / 48 thực đo / 0 thiếu / 0 thừa.** Phiên S4 đo thật chứ không
    chép con số 52 của kế hoạch — đúng điều brief dặn.
  - **"Không đo lại thứ đã có số đo" — ĐÚNG, và làm còn khéo hơn brief đòi.** Ghi chú đầu file
    nói lấy `model.health`, nhưng code lấy `model.rows` / `topLevel` / `gatewayLinks` / `docs`
    — tức chính các mảng mà `health` được suy ra từ đó. Tốt hơn: có cả con số LẪN chi tiết để
    chỉ đúng file cần sửa. Tôi đối chiếu bốn cặp B1/B3/B4/B11 với `health`: khớp từng cái.
  - **LỖ TÔI TÌM ĐƯỢC, đã vá:** tiêu chí nghiệm thu của Đức — *"mỗi cảnh báo phải nói cả chỗ
    sai lẫn cách sửa"* — **chưa có test ghim**. Xoá sạch dấu `→` khỏi bộ sinh thông báo thì
    30+ dòng hướng dẫn mất dấu mà suite vẫn 20/20 xanh. Nội dung vẫn còn nên mức nhẹ, nhưng
    **thứ Đức dùng để chấm bài mà không có test ghim thì sớm muộn sẽ trôi.** Đã thêm một phép
    kiểm chạy chính `check-bootstrap.mjs` rồi soi từng dòng `✗`: phải có dòng `vì:` VÀ ít nhất
    một dòng `→`. Suite 20 → **21**. Hai đột biến (xoá `→`, xoá `vì:`) nay đều đỏ.
  - **Bài test một dòng của S7 ĐÃ ĐẠT SỚM.** Đức dán đúng một câu *"Đọc `llms.txt` … rồi làm
    theo"* vào một phiên hoàn toàn mới. Phiên đó tự lần ra `BRIEF-S4.md`, tự nhận `_root`, làm
    trọn S4 và push — **không hỏi lại câu nào**. Đây là tiêu chí nghiệm thu chính của cả dự án,
    đạt ở S4 thay vì phải chờ S7. Nên ghi thành bằng chứng ở `evidence/`.
  - **Phiên S4 bắt được một lỗi trong brief của tôi, và nó đúng:** mục "Mở phiên" bảo giữ
    `_root` tới khi push xong, nhưng khối "Đóng phiên" lại trả quyền TRƯỚC khi chạy cổng — cổng
    đỏ ngay ở mục 1. Tôi đã mắc đúng lỗi này hai lần trong phiên trước và vẫn viết sai vào brief.
  - **Việc kế tiếp: S5 — tạo `docs/adr/`.** B12 sẽ tự chạy, không phải sửa dòng code nào.

- **2026-09-02 · `s5-adr`** — **PHIÊN S5 XONG. B12 hết `KHÔNG ÁP DỤNG`, nay XANH, soi 113 ADR.**
  - `docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md` = luật ADR · `docs/_TEMPLATE-adr.md` = bản mẫu.
    Tách **112 quyết định** thành 112 ADR: `duc-auto-chatgpt/v0.1.0` **45**,
    `duc-auto-gemini/v0.2.0` **67**. `decisions.md` KHÔNG bị xoá — thành **mục lục**.
  - **SỐ TRONG BRIEF-S5 SAI HƠN BA LẦN, phiên sau đừng chép lại.** Brief ghi 30 quyết định
    (4 · 18 · 8); nó đếm tiêu đề `##` — là **NHÓM** — chứ không đếm dòng bảng — là **QUYẾT ĐỊNH**.
    Đo thật: chatgpt **45**, gemini **67**, gg-flow-video **8** → tổng **120**. Đếm bằng hai
    cách độc lập (bộ tách, và `grep` trừ header/ngăn cách), hai cách khớp nhau.
  - **"Chỉ đổi hình dạng" được CHỨNG MINH BẰNG MÁY, không phải bằng lời hứa:** bộ tách đối
    chiếu từng ô của bảng cũ phải xuất hiện NGUYÊN VĂN trong ADR tương ứng —
    **180/180** (chatgpt) và **227/227** (gemini) ô không rỗng, **0 sai lệch**. Brief dặn
    "đừng viết bộ tách chung rồi tin nó"; tôi vẫn viết bộ tách, nhưng **không tin nó** — bằng
    chứng là phép đối chiếu, không phải là code. Với 112 dòng thì chép tay mới là thứ không ai
    soát lại được. Bộ tách là công cụ một lần, cố ý KHÔNG đưa vào repo; bản gốc đọc lại bằng
    `git show 181c06e:<đường-dẫn>`.
  - **Bẫy 1 của brief là thật và đã sửa:** B12 chỉ so `startsWith("docs/adr/")` nên nó mù với
    ADR trong package. Nay `isAdrPath()` khớp cả hai tầng. Thêm thoát sớm khi file chỉ có 1
    commit — đúng logic (không có commit thứ hai thì không có gì để so) và giữ cổng ở ~8 giây
    thay vì đọc blob của 113 ADR.
  - **Mục "Hệ quả" của cả 112 ADR đều ghi `không ghi lại`** — bảng gốc chỉ có 3–4 cột, không
    có cột đó. Bịa cho đủ bốn mục thì bản ghi lịch sử hết đáng tin.
  - **112 ADR KHÔNG làm B6 tăng** — chúng mang `status: Accepted` nên rơi vào luật "hồ sơ đã
    nghỉ" của B6. Đúng (ADR là bản ghi bất biến, không phải chặng đường đi), nhưng phải nói rõ:
    chúng thoát vì LUẬT ĐÓ, không phải vì đã có ai trỏ tới được chúng. Đã ghi vào code.
  - **Một sửa nội dung duy nhất, cố ý:** tiêu đề `decisions.md` của gemini ghi
    "Decisions — Duc Auto **ChatGPT**" (lỗi chép dán cũ). Mục lục mới ghi đúng tên gói.
  - **Đo:** suite **95 + 6 + 79 + 15 + 22** xanh. Cổng kiểm cấu trúc: **0 ĐỎ · 51 VÀNG**
    (B6 49 · B9 2), B12 XANH.
  - **CHƯA LÀM, và vì sao:** `duc-auto-gg-flow-video/v0.1.0` (**8 quyết định**) chưa chuyển.
    Package đó đang do phiên `claude-bridge-multiprofile` giữ, luật mục 1 cấm ghi vào package
    của phiên khác. Nó dùng định dạng **văn xuôi `##`, không có bảng** nên cần một bộ tách
    riêng — đừng đem bộ tách bảng ra dùng lại. Đức đã xác nhận phiên đó còn đang chạy thật.
  - **Việc kế tiếp: phiên S6 — dọn `drafts/`.** 25 trong 49 khoản nợ B6 nằm ở đó.

- **2026-09-02 · `s6-drafts`** — **PHIÊN S6 XONG. Thư mục `drafts/` ở gốc repo đã BIẾN MẤT.**
  **Nợ cấu trúc: 51 → 20 chỗ VÀNG. B6 rơi từ 49 xuống 18.**
  - **33 file** (roadmap ghi 29 — đo lại ra 33) chuyển bằng `git mv`; git nhận **cả 33 là ĐỔI
    CHỖ**, không phải xoá+thêm, nên lịch sử từng file đi theo. Không xoá gì.
    → `docs/studies/` **20** file (`status: active`) · `docs/archive/` **13** (`status: superseded`).
  - **Phân loại:** theo luật roadmap (`EXP-*` + `PHASE-1-SYNTHESIS` → studies · `*-BRIEF` đã
    thực thi → archive · `*-ONBOARDING-PROMPT` → archive). Phần roadmap KHÔNG nói thì xét
    từng file, và **chỉ archive cái chứng minh được là đã xong** — archive nhầm một hồ sơ còn
    sống thì nó biến mất khỏi mọi phép đếm nợ, sai đắt hơn hẳn chiều ngược lại. Vì thế
    `BRIDGE-MULTIPROFILE-DESIGN-V1` (gemini + chatgpt CHƯA port) và `FLOW-EXT-COORDINATION-PLAN`
    (checkpoint đang chạy) vào **studies**, không vào archive.
  - **`docs/README.md` mới — mục lục bốn tầng, kèm BẢN ĐỒ 33 đường dẫn cũ → mới.** Bản đồ này
    là bắt buộc chứ không phải trang trí: **ADR đã `Accepted` là BẤT BIẾN** (luật S5) nên
    không được sửa đường dẫn bên trong chúng, mà chúng vẫn trỏ `drafts/…`.
  - **Đây cũng là thứ kéo B6 xuống.** Chỉ chuyển chỗ thì 20 file studies vẫn "không tới được".
    `llms.txt` → `AGENTS.md` → `docs/README.md` → tài liệu = đúng 3 bước. Dọn mà không nối
    đường thì chỉ là dời một đống từ chỗ này sang chỗ khác.
  - **RANH GIỚI TÔI TỰ ĐẶT, và một lần suýt phạm:** sửa **con trỏ đang sống** (bảng điều hướng
    `AGENTS.md`, `delegations/A-01/TASK.md`) thì được; **KHÔNG sửa nhật ký lịch sử**
    (`HANDOFF.md`, `decisions.md`, ADR, `BACKLOG.md`). Tôi đã đổi 4 đường dẫn trong
    `BACKLOG.md` của chatgpt rồi **hoàn nguyên** khi đọc kỹ: đó là báo cáo sự cố **B-30 ngày
    28/08**, kể lại 4 file rác *lúc đó* nằm ở đâu. Sửa đường dẫn trong một bản tường thuật là
    làm sai bản ghi, không phải dọn dẹp. Package chatgpt cuối cùng **không bị đụng một chữ**.
  - **CÒN LẠI, cần phiên sau làm:** **6 tham chiếu `drafts/…`** trong
    `workers/duc-auto-gg-flow-video/v0.1.0/` (`AI-OPERATOR-GUIDE.md`, `HANDOFF.md`,
    `STATUS.md`, `decisions.md`) trỏ tới `BRIDGE-MULTIPROFILE-DESIGN-V1.md` và
    `FLOW-EXT-COORDINATION-PLAN.md`. Package đó đang do phiên `claude-bridge-multiprofile`
    giữ nên luật mục 1 cấm tôi ghi vào. Đường dẫn mới có trong bảng ở `docs/README.md`.
    **`AI-OPERATOR-GUIDE.md` là tài liệu operator đọc lúc vận hành live** — nên sửa sớm.
  - **18 khoản B6 còn lại KHÔNG thuộc S6:** 7 ở `delegations/`, 10 ở bản Gemini `v0.1.0` (đã
    `superseded`) và `drafts/` của nó, 1 ở gốc gói chatgpt. Cả ba nhóm nằm trong phạm vi
    **S8** ("chuyển 6–8 file `.md` ở gốc mỗi gói xuống `docs/`").
  - **Đo:** cổng kiểm cấu trúc **0 ĐỎ · 20 VÀNG** (B6 18 · B9 2). npm test xanh toàn bộ.
  - **Việc kế tiếp: phiên S7 — bật chặn B1–B5, B7, B10, B12** (roadmap gọi đây là cột mốc:
    đạt = mục tiêu chính của dự án xong). Nay đã đủ điều kiện: **mọi phép kiểm sắp bật chặn
    đều đang XANH**, chỉ còn B6/B9 màu vàng và cả hai KHÔNG nằm trong danh sách bật chặn.

- **2026-09-02 · `brief-s7`** — **Kiểm chứng độc lập S4 + S5 + S6, cả ba ĐẠT.** Tự chạy lại,
  không tin báo cáo (luật vàng 4).
  - **Khớp hết:** npm test **217 xanh** (6 suite) · cổng exit 0 · `check-bootstrap` exit 0,
    **0 ĐỎ / 19 VÀNG** · B12 hết `KHÔNG ÁP DỤNG`, nay **XANH soi 113 ADR** · `drafts/` biến
    mất · **33/33 file được git nhận là ĐỔI CHỖ** (`R099`), không phải xoá+thêm.
  - **Tự chạy lại phép chứng minh vòng tròn của S5** — đây là khẳng định quan trọng nhất
    ("chỉ đổi hình dạng, không mất chữ nào"). Trích từng ô bảng ở bản gốc `181c06e` rồi soi
    trong ADR: chatgpt **181 ô, 1 không thấy** · gemini **227 ô, 1 không thấy**. Ô "không
    thấy" ở cả hai gói **chính là tiêu đề cột `ai chốt`**, không phải quyết định. Tức **mọi ô
    dữ liệu đều còn nguyên**. 45 + 67 = 112 ADR + ADR-0000 = 113.
  - **Con số trong BRIEF-S5 của tôi SAI, và phiên S5 bắt đúng.** Tôi ghi 30 quyết định vì đếm
    tiêu đề `##` (là *nhóm*); đơn vị thật là *dòng bảng* — **112**. Tôi có đo, nhưng **đo sai
    đơn vị**. Đây là lần thứ **tư** một con số viết trong kế hoạch sai khi có phiên đi làm
    thật (52→48 · 1→7 · 29→33 · 30→112). Luật rút ra, đã áp vào BRIEF-S7: **viết LỆNH ĐO vào
    brief, đừng viết con số.**
  - **BRIEF-S7 đã soạn.** Điểm khác mọi brief trước: nó chia **hai phần chạy ở hai chỗ**.
    Phần A (bật chặn) AI làm ở chat nào cũng được. **Phần B (bài test) Đức tự dán vào một
    chat HOÀN TOÀN MỚI** — một phiên đã đọc repo thì không còn là phép thử, nó biết đáp án.
    Brief cấm AI tự chạy phần B rồi báo đạt.
  - **Điều kiện bật chặn đã đủ, đã kiểm:** cả 8 phép kiểm sắp chặn (B1–B5, B7, B10, B12) đều
    XANH. Sáu phép kiểm còn lại giữ mức cảnh báo vì đang có nợ thật (B6 17 chỗ, B9 2 chỗ) —
    chặn khi còn nợ là khoá repo vì việc chưa ai hứa làm xong hôm nay.
  - ⚠️ **RỦI RO ĐANG SỐNG:** `workers/duc-auto-gg-flow-video/v0.1.0/AI-OPERATOR-GUIDE.md` —
    tài liệu operator đọc **lúc chạy live** — có tham chiếu `drafts/…` nay trỏ vào chỗ trống
    (tổng 8 chỗ trong gói, ở 4 file). Không phép kiểm nào bắt vì B4 chỉ soi file cổng. Không
    sửa được vì `claude-bridge-multiprofile` đang giữ package. **Sửa ngay khi package trả.**

- **2026-09-02 · `s7-block`** — **PHIÊN S7 PHẦN A XONG. Tám phép kiểm nay CHẶN THẬT.**
  **Phần B (bài test nghiệm thu) CHƯA chạy — đó là việc của Đức ở một chat mới, cố ý không đụng.**
  - **Chặn:** `B1 B2 B3 B4 B5 B7 B10 B12`. **Vẫn chỉ cảnh báo:** `B6 B8 B9 B11 B13 B14`.
    Danh sách khai ở `bootstrap.blocking` trong `.repo-structure.json` — **không viết cứng
    trong code**, để S8 mở thêm B6/B9 sau khi trả nợ mà không ai phải sửa script.
  - **BA MÃ THOÁT, cố ý không gộp:** `0` nhóm CHẶN đạt hết (cảnh báo vẫn có thể đỏ) · `1` repo
    CÓ NỢ nhóm CHẶN → cổng đóng phiên đỏ theo · `2` CHÍNH BỘ KIỂM không chạy được. Gộp 1 với 2
    thì người đóng phiên đọc "cổng đỏ" mà không biết phải sửa repo hay sửa bộ kiểm.
  - **FAIL CLOSED trên chính CẤU HÌNH.** Thiếu `bootstrap.blocking`, hoặc nó không phải mảng,
    hoặc trong đó có mã lạ (`CHAN_MA_LA`) → thoát 2, cổng đỏ. Lý do: cách dễ nhất để tự tháo
    chặn là xoá cấu hình đi, nên xoá cấu hình phải là một lỗi to chứ không phải một sự im lặng.
  - **PHẢI COMMIT CẤU HÌNH RIÊNG, TRƯỚC CODE — ghi lại vì phiên sau sẽ vấp lại.**
    `check-bootstrap.mjs` đọc `.repo-structure.json` **từ HEAD**. Code S7 fail-closed khi thiếu
    khoá đó, nên chừng nào cấu hình chưa vào HEAD thì bộ kiểm thoát 2 và suite KHÔNG THỂ xanh —
    tức là không thể commit đúng luật "test xanh trước khi commit". Thứ tự đúng: commit cấu
    hình một mình (là no-op vì code ở HEAD chưa đọc khoá đó) → suite xanh → commit code + test.
    Cùng họ với bẫy "bộ sinh đọc từ HEAD" đã ghi ở S3/S4.
  - **Đo:** suite bootstrap **27/27** · **14/14 đột biến bị bắt**.
    **HAI LỖ GHIM HỤT tự tìm ra khi chạy mutation, cùng một gốc bệnh — ghim GẦN chỗ đúng thay
    vì ghim ĐÚNG chỗ:** ① phép kiểm tích hợp chỉ tìm câu chữ của nhánh mã 1, nên đột biến đổi
    `ok: false` → `ok: true` mà giữ nguyên câu chữ đã thoát sạch — cổng in ra lời cảnh báo rồi
    vẫn cho báo xong; ② regex `/error\.status === 1/` khớp luôn cả `=== 101`, nên đột biến làm
    nhánh mã 1 không bao giờ chạy cũng thoát. Cả hai nay ghim vào đúng cặp điều kiện–hành vi.
  - **B6 đo được 18, brief ghi 17.** Chênh vì `BRIEF-S7.md` là tài liệu mới, chưa ai trỏ tới.
    Đã thêm nó vào `docs/README.md`, nên sau commit này B6 về 17.
  - **KHIẾM KHUYẾT TÔI TỰ GÂY RA Ở S6, nay nói thẳng:** `docs/README.md` là mục lục **gõ tay**,
    và nó mục sau đúng MỘT commit (thiếu `BRIEF-S7.md`, B6 bắt được ngay). Lần này thêm tay,
    nhưng cách sửa thật là **cho máy sinh mục lục đó** cùng lượt với `DASHBOARD.md`. Đã ghi
    cảnh báo ngay trong file và đẩy sang **S8**.
  - **Mục 4 của brief — ô "Project Instructions" của Đức. AI KHÔNG sửa được, Đức tự dán.**
    Dòng thay thế đã soạn, xoá hết phần còn lại của mục 9:
    > `Đọc AGENTS.md ở gốc repo trước khi làm gì.`
    Vì sao rút gọn được: từ S1–S6 mọi luật đã nằm trong repo và **tự cưỡng chế được bằng máy**
    (`session-check.mjs` + 8 phép kiểm chặn). Chép luật vào ô Project Instructions là tạo nguồn
    sự thật thứ hai — đúng cái bệnh cả chương trình này chữa. **CHƯA làm, chờ Đức.**
  - **Mục 5 của brief — gỡ nhãn `unproven`: CHƯA làm, đúng luật.** Brief ghi rõ chỉ gỡ SAU KHI
    Đức báo phần B đạt.
  - **KHÔNG PHẢI LỖI CỦA PHIÊN NÀY, nhưng phải báo:** `npm test` hiện có **1 phép kiểm đỏ** —
    `bridge-mv3-reconnect-smoke.mjs` của gói chatgpt ("token is sent only after valid HMAC
    proof"). Đó là **việc đang làm dở của phiên `claude-bridge-multiprofile`** (6 file trong cây
    làm việc chưa commit, gồm `bridge-transport-loopback.js` và một test mới
    `bridge-multiprofile-host-smoke.mjs` — họ đang port multi-profile sang chatgpt). Chạy riêng
    file test đó thì XANH. Tôi không đụng gói đó; cổng đóng phiên loại đúng phần của họ ra.
  - **Việc kế tiếp:** ① **Đức chạy PHẦN B** — chat mới, dán đúng một dòng trong `BRIEF-S7.md`,
    ghi kết quả vào `evidence/2026xxxx-bootstrap-test-r02/`. Đạt cả A và B = **mục tiêu chính
    của chương trình xong**. ② Sau khi Đức báo đạt: gỡ nhãn `unproven` (mục 5). ③ Rồi mới tới S8.

- **2026-09-02 · `s7-block` (vòng 2)** — **Bài nghiệm thu phần A tôi TỰ CHẠY đã tìm ra một lỗi
  thiết kế do chính tôi vừa gây ra. Đã sửa, và nó là bài học đáng ghi nhất của phiên này.**
  - **Cách tìm:** không suy luận. Tôi `git clone` HEAD ra một thư mục tạm, commit vào đó **ba
    vi phạm thật** (đổi `lifecycle` thành chữ bậy · xoá một `STATUS.md` · sửa thân một ADR đã
    Accepted), rồi chạy cổng kiểm trên bản sao đó. Không đụng cây làm việc — phiên
    `claude-bridge-multiprofile` đang có việc dở ở đấy.
  - **Kết quả đo:** ba vi phạm nhóm CHẶN → mã thoát **1 · 1 · 1**; thêm một nợ nhóm CẢNH BÁO
    → **0**; bản sao sạch → **0**. **ĐẠT.**
  - **LỖI TÌM RA:** B12 bản đầu báo lỗi khi có **bất kỳ** commit nào từng đổi phần thân sau mốc
    `Accepted`. Nghe đúng luật hơn. Nhưng `git revert` bản sửa **cũng là** một lần đổi thân sau
    mốc đó → **B12 ĐỎ VĨNH VIỄN, không cách nào xoá** trừ sửa lịch sử (luật cấm). Một phép kiểm
    thuộc nhóm **CHẶN** mà không xoá được là cái bẫy khoá cả repo — đúng thứ BRIEF-S7 cảnh báo
    ở mục điều kiện mở, và tôi đã tự dựng lại nó.
  - **Sửa:** B12 nay hỏi *"nội dung ADR **hiện tại** có còn đúng bản đã Accepted không"*. Sửa
    rồi hoàn nguyên thì xanh lại; lịch sử git vẫn giữ nguyên dấu vết, không ai xoá được. Thông
    báo khi đỏ kèm sẵn lệnh lấy lại bản đúng: `git show <sha>:<đường-dẫn>`. Đã ghim test cho ca
    hoàn nguyên, để không ai "sửa cho đúng luật hơn" rồi dựng lại cái bẫy.
  - **Nguyên tắc rút ra, viết cho phiên sau:** một phép kiểm thuộc nhóm CHẶN phải đo **TRẠNG
    THÁI**, không đo **LỊCH SỬ**. Đo lịch sử thì người sửa đúng cách vẫn không xoá được màu đỏ,
    và một cổng không xoá được thì người ta sẽ học cách đi vòng qua nó.
  - **Đo lại sau sửa:** suite **97 + 6 + 79 + 15 + 27** xanh · cổng kiểm cấu trúc **0 ĐỎ · 19
    VÀNG** (B6 17 · B9 2) · **14/14 đột biến bị bắt**.
  - **Đã cuốn theo 3 commit của phiên `claude-bridge-multiprofile`** khi push (`550da43`,
    `414e7ea`, `5aa7540` — port multi-profile sang gemini và chatgpt, suite của họ xanh).
    `safe-push` từ chối hai lần, dùng `--carry` theo đúng chỗ Đức đã duyệt 02/09 cho việc chạy
    song song với phiên đó. Tôi cũng sinh lại `DASHBOARD/llms/repo-map/FEATURE-PARITY` ba lượt
    vì mỗi commit của họ làm số đo đổi — chỉ khối AUTO đổi, mục 2 của người không bị đụng.

- **2026-09-02 · `evidence-r02`** — **CỘT MỐC: bài test nghiệm thu S7 phần B ĐẠT.**
  Cùng với r01, **mục tiêu chính của chương trình tái cơ cấu đóng lại.**
  - Đức dán đúng một dòng vào chat hoàn toàn mới. Phiên đó trả lời **cả ba câu**
    (repo có gì / việc ưu tiên #1 thuộc gói nào / đọc file nào tiếp), **0 câu hỏi ngược lại**.
    Bằng chứng: `evidence/20260902-bootstrap-test-r02/`.
  - **Kiểm chứng độc lập, không tin báo cáo:** `npm test` **exit 0** (6 suite) · cổng kiểm
    exit 0 · `check-bootstrap` 0 ĐỎ · `blocking` khai đúng 8 phép kiểm.
  - **Và kiểm rằng CHẶN CHẠY ĐƯỢC, không chỉ được cấu hình.** Cố tình đổi `lifecycle` của
    `duc-auto-chatgpt` thành chữ bậy → cổng thoát **1**, báo đúng
    *"CHẶN: B7 (1 chỗ) — thuộc nhóm CHẶN nên KHÔNG được báo xong"*. Đã khôi phục nguyên
    trạng ngay, repo sạch.
  - **Hai cảnh báo phiên test tự nêu, đều đã kiểm:**
    ① *"`llms.txt` chậm 3 commit"* — đúng phần dấu, sai phần hàm ý. Dòng dấu sinh trang có
    lag, nhưng cổng dựng lại từ HEAD và XANH → **nội dung đang khớp**; dòng dấu **cố ý bị
    lọc** khỏi phép so, nếu không thì mỗi commit là artifact hoá cũ. Vẫn là quan sát tốt:
    nó tự đối chiếu hai nguồn thay vì tin một.
    ② *"npm test có 1 phép kiểm đỏ"* — đúng lúc nó nhìn, nay đã hết: phiên
    `claude-bridge-multiprofile` đã commit bản vá (`b40cba3`). Đáng ghi là nó **không giấu**
    một phép kiểm đỏ để báo cáo cho đẹp.
  - **Còn lại của chương trình:** S8 (trả nợ cũ) · S9 (promote bộ template vào Kho tier SEED,
    cần K-MIGRATE xong trước) · S10 (radar P5, cần ≥2 repo đạt). Đều là **mở rộng**, không
    phải dựng nền.
  - ⚠️ **Nợ vận hành vẫn còn:** 8 tham chiếu `drafts/…` đã chết trong
    `workers/duc-auto-gg-flow-video/`, gồm `AI-OPERATOR-GUIDE.md` — tài liệu operator đọc lúc
    chạy live. Không phép kiểm nào bắt (B4 chỉ soi file cổng). Sửa ngay khi có phiên giữ gói đó.
