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

- **2026-09-02 · `claude-mp-gate`** — **Cổng tay multi-profile ĐÃ QUA trên cả ba nhánh; sinh lại
  bốn trang máy sinh; tìm ra một bất đồng thật giữa máy sinh và cổng kiểm.**
  - **Việc ưu tiên #1 đổi nội dung.** Đức đã reload extension từng profile + đặt tên xong.
    Phiên này làm nửa AI: `bridge.sessions` trên cả 3 host → chatgpt **3/0 legacy**, gemini
    **3/0 legacy**, flow-video **3 có tên + 1 legacy**. Ba tên `Bình`/`anhducds`/`kaito`.
    Kiểm thêm: `--target <tên>` route đúng, `served_by` khớp `instance_id`; không nêu target
    thì từ chối `TARGET_AMBIGUOUS`. Bằng chứng:
    [`evidence/20260902-multiprofile-naming-gate-r01/`](evidence/20260902-multiprofile-naming-gate-r01/README.md).
    `llms.txt` việc #1 nay là **trial video + live-check F-14**, không còn là chờ tay Đức.
  - **NỢ MỚI, chưa sửa, để lại cho phiên sau — `scripts/feature-parity.mjs` đo SAI NGUỒN.**
    Cổng kiểm (`session-check.mjs`) so `FEATURE-PARITY.md` với **HEAD**. Nhưng chính
    `feature-parity.mjs` (và cờ `--check` của nó) lại đếm dòng trên **CÂY LÀM VIỆC**. Hai bên
    bất đồng bất cứ khi nào có phiên khác đang sửa dở — và repo này thiết kế để nhiều phiên
    chạy song song, nên đây là chuyện thường ngày chứ không phải ca hiếm.
  - **Đã gặp thật hôm nay:** phiên `claude-stabilizing-bridge` đang sửa
    `workers/duc-auto-chatgpt/v0.1.0/bridge-transport-loopback.js` (HEAD 338 dòng, cây làm việc
    532). Sinh bằng lệnh chuẩn → cổng ĐỎ. Chạy `--check` → báo XANH. **Hai công cụ của cùng
    một repo nói ngược nhau về cùng một file** — đúng loại bẫy làm người ta mất niềm tin vào
    cổng rồi tìm cách đi vòng.
  - **Cách vá tạm đã dùng (ghi lại để phiên sau khỏi mò):** `git clone` HEAD ra **đường dẫn
    NGẮN** rồi chạy `feature-parity.mjs` ở đó, chép `FEATURE-PARITY.md` về. Không đụng file
    đang sửa dở của phiên khác. **Đường dẫn ngắn là bắt buộc** — clone vào thư mục scratchpad
    (dài) thì checkout hỏng im lặng vì chạm trần MAX_PATH của Windows, `git status` báo mọi
    file là `D` và máy sinh vẫn chạy ra kết quả rác. Mất một vòng mới thấy.
  - **Đề xuất sửa gốc (cần Đức chốt vì đụng luật cổng kiểm):** cho `feature-parity.mjs` đọc số
    đo từ HEAD (`git show HEAD:<path>`) thay vì đọc đĩa, để máy sinh và cổng kiểm dùng chung
    một nguồn sự thật. Cùng bài học B12 của S7: **một phép kiểm thuộc nhóm CHẶN phải đo cùng
    thứ mà công cụ sửa nó tạo ra**, nếu không thì đỏ mà không ai sửa nổi.
  - **Còn mở, cần Đức quyết:** ghế `legacy` thứ tư ở nhánh Flow Video (profile Chrome thứ tư) —
    reload + đặt tên, hoặc tắt extension ở profile đó.
  - **Không đụng gói `duc-auto-chatgpt`** (chủ `claude-stabilizing-bridge` đang làm dở); chỉ chạy
    lệnh đọc trên host của nó.

## 2026-09-02 — `claude-dieu-phoi`: Đức mở phạm vi Giai đoạn 2

**Đức chốt:** chuẩn hoá **không phải điểm kết thúc**, mà là điểm bắt đầu. Sau Giai đoạn 1 sẽ
là **migrate đa repo bằng AI multitask**, lấy repo này làm mẫu.

**Ba điều làm rõ, đã ghi vào `docs/studies/ROADMAP-CLEAN-AND-TEMPLATE-V1.md` mục 9:**

1. **Hai dashboard, không phải một.** Repo Chrome cần bảng *"dự án chạy tới đâu"* (extension ·
   guide · luật · thư mục · task đang mở). Template cần bảng *"bộ khung này gồm gì"* — toàn bộ
   cấu trúc/kiến trúc/cách vận hành ở **trạng thái null, sạch nhất**. Cái sau KHÔNG phải cái
   trước bị xoá dữ liệu.
2. **Template là sản phẩm có phiên bản**, cần chỗ ở cố định + một AI có bộ skill riêng để
   maintain và để đi migrate.
3. **Một câu chưa ai quyết (mục 9.3):** "1 repo riêng" nghĩa là *không nằm trong repo Chrome*
   (⇒ ở trong Kho, khớp K0 số 1) hay *một repo thứ ba tách khỏi cả Kho* (⇒ đảo K0 số 1, cần
   ADR thay thế). **Điều phối khuyến nghị cách 1.** Chưa chốt thì chưa mở S9.

**Cũng sửa:** mục 8 của roadmap lạc hậu lần thứ ba (bảo bắt đầu từ S3 khi S7 đã đóng) — bỏ
hẳn số phiên khỏi mục đó, vì trạng thái sống thuộc về `DASHBOARD.md`.

**Việc kế tiếp:** S8 và dashboard repo Chrome — cả hai không chờ ai.

## 2026-09-02 — `claude-dieu-phoi`: Kho (Project 3AI) đang ngủ — cảnh báo cho làn B

**Đức báo:** repo **Project 3AI**, gốc của Kho, *"đã lâu không còn được triển khai nữa"*.

**Vì sao đáng ghi ngay:** cả làn B (K-MIGRATE · K2 · K3) dựng trên giả định Kho đang sống và
`sync_manifest.json` là cơ chế phát hành thật. Nếu Kho ngủ thì K-MIGRATE là sửa manifest trong
repo không ai dùng. **Đã gắn cảnh báo vào điều kiện tiên quyết của S9** để không phiên nào
khởi công nhầm. Chi tiết + ba câu hỏi quyết định: mục **9.5**.

**Hệ quả tốt:** S9 bị chặn bởi K-MIGRATE. Cộng với việc Đức chốt template **độc lập**, template
không vào Kho nữa → **S9 hết bị chặn.**

**Việc rẻ nhất trên bàn, và là của GPT:** đọc Project 3AI, trả lời 3 câu ở 9.5. Claude Code
không đọc được repo khác. Ba câu đó quyết định ba mốc còn hay nghỉ.

**Cũng đính chính một dòng tôi tự ghi sai sáng nay** (mục 9.4): `claims.json` khoá theo repo là
ĐỦ cho multitask đa repo; thứ thiếu là *nhìn thấy*, và đó là radar S10 đã có kế hoạch.

**Chưa chốt:** Project 3AI làm **nhà của template** (khuyến nghị) hay **repo thử đầu tiên**.

## 2026-09-02 — `claude-dieu-phoi`: ADR-0001 — template độc lập, Project 3AI nghỉ

**Đức chốt:** template tách ra **nằm độc lập một nơi**; Project 3AI *"đã xong nhiệm vụ"*, sau
này archive cũng không ảnh hưởng. Hệ thống mới xoay quanh template.

**Đây là đảo ngược K0 số 1 (01/09)**, nên đã ghi thành **ADR-0001** ở `docs/adr/` — ADR đầu tiên
ở tầng gốc repo ngoài ADR-0000. Phát hiện kèm theo: **K0 chưa bao giờ được ghi thành ADR**, nó
chỉ sống dưới dạng văn xuôi trong roadmap. Đã gắn dấu "đã bị thay thế" vào đúng chỗ đó.

**Làn B nghỉ hẳn:** K-MIGRATE · K2 · K3 · K5 đều dựng trên giả định Kho đang sống. **Bốn mốc
rời khỏi lộ trình.** S9 viết lại: không promote vào Kho, mà dựng nhà độc lập cho template.

**Phát hiện quan trọng nhất — hai trong tám thứ template phải mang thì CHƯA TỒN TẠI:**

| Thành phần | Trạng thái |
|---|---|
| harness · rules · structure · folder | Có, đã chứng minh |
| dashboard | Có nền máy sinh, thiếu lớp hiển thị |
| **protocol audit** | **CHƯA CÓ** — chỉ có một prompt cho một phiên |
| **protocol migrate · khởi tạo mới** | **CHƯA CÓ** — không tài liệu, không script |

Đừng nhầm "trích ra" với "viết mới". Hai thứ cuối là phần đắt nhất của Giai đoạn 2.

**Đã ghi mục 10 vào roadmap:** tám thành phần · luật cái gì đi cái gì ở lại · cơ chế kéo-về
ghim-phiên-bản · bốn nấc migrate · bảy mốc M0–M6.

**Việc kế tiếp:** M0 (GPT thu hoạch Project 3AI) và M1 (tách template). **Cần Đức chỉ một repo
đang sống, khác loại** cho M4 — chưa có ứng viên.

## 2026-09-02 — `claude-core-k1`: bộ máy thôi đóng cứng hình dạng repo Chrome

**Phát hiện mở đầu, và nó đổi thứ tự việc.** Trước khi trích template, tôi đo thử bộ máy có
di động không. **Bộ MÁY kém di động hơn bộ LUẬT nhiều:** luật đo được 91% sạch tên dự án,
nhưng `build-dashboard.mjs` đóng cứng **hai chuỗi định hình cả repo** — thư mục đơn vị là
`"workers"`, file đánh dấu là `"manifest.json"` — cộng một id dự phòng `"extension-observer-v0"`
nằm thẳng trong bộ máy. Repo có layout khác là **không chạy**.

Nếu trích trước rồi mới sửa thì sinh ra một template hỏng sẵn, và phải vá ở hai nơi. Nên đã
**tham số hoá trước, trích sau**.

**Làm gì:** thêm khối `units` vào `.repo-structure.json` (`root_dir` · `marker` · `depth`);
bộ sinh và cổng kiểm đọc từ đó. `root_dir: null` = repo không có đơn vị con — chính là ca của
một repo trống, tức nền cho phép thử repo rỗng sau này.

**Bằng chứng mạnh nhất — bảng sinh ra GIỐNG HỆT TỪNG BYTE.** Chạy bộ máy CŨ (lấy từ HEAD) và
bộ máy MỚI trên cùng một HEAD, so `DASHBOARD.md` + `llms.txt` + `repo-map.json`: **không khác
một byte nào**. Tham số hoá không đánh rơi gì. Đây chính là ý "audit ngược từ template về repo
Chrome" của Đức, ở dạng chặt nhất.

**Số:** suite 225 → **227** (2 phép kiểm mới). **6/6 đột biến bị bắt.**

**Một phép kiểm của tôi lúc đầu là GIẢ, đã sửa.** Đột biến "lùi `root_dir: null` về workers"
**thoát** ở vòng đầu — vì repo tạm trong fixture không có `workers/` nên lùi về đó cũng không
tìm thấy gì. Cùng lý do, assert "không được tìm trong workers/" khi ấy **rỗng nghĩa**. Đã thêm
mồi bẫy `workers/legacy/package.json` vào fixture; sau đó đột biến bị bắt. Đúng cái bẫy repo
này đã dính hai lần: mutation bị bắt giả vì fixture không dựng nổi ca hỏng.

**CHƯA làm — nói rõ để không ai tưởng đã xong:** **chưa trích** một dòng nào ra `template/`.
Phiên này chỉ làm bộ máy *có thể* đi được. Việc trích, cùng phép thử repo rỗng, là bước kế.

**Việc kế tiếp:** trích `template/` theo bản kê khai, rồi chạy cặp phép thử — repo rỗng phải
XANH, và repo Chrome phải KHÔNG tệ đi.

## 2026-09-02 — `claude-core-k1` (tiếp): gom hình dạng repo về MỘT nguồn

**Vấn đề còn lại sau lượt trước.** Lượt trước mới gỡ đóng cứng ở `build-dashboard` và
`check-bootstrap`. Nhưng `session-check.mjs` và `safe-push.mjs` vẫn mỗi bên giữ **một bản regex
`^workers/` chép tay**. Hai bản đó **đã lệch nhau một lần thật** — 26/08, đường dẫn tiếng Việt
bị quy nhầm chủ.

**Phát hiện dễ chịu:** `.repo-structure.json` **đã khai sẵn** `ownership_mode: "per-package"` kèm
`claim_prefix: "workers/"` cho `workers/` từ trước. Chỉ là chưa script nào đọc. Nên không cần
thêm khối cấu hình mới — thêm khối thứ hai nói cùng một điều chính là tự tạo nguồn sự thật thứ hai.

**Làm gì:** thêm `scripts/repo-structure.mjs` — nguồn sự thật duy nhất về hình dạng repo. Phần
SUY RA là hàm thuần (`unitsFrom` · `claimPrefixesFrom` · `areaOf`); phần ĐỌC để mỗi bên tự làm,
vì bộ sinh đọc từ HEAD còn cổng đóng phiên và safe-push phải đọc cây làm việc. Cả bốn script nay
dùng chung.

**Một bất đồng cũ nay đã hết:** file nằm THẲNG dưới `workers/` (không thuộc gói nào) — safe-push
coi là `_root`, session-check lại coi là *không phải file gốc*. Hai script trả lời khác nhau ở
cùng một câu hỏi. Một hàm thì chỉ có một câu trả lời.

**Số:** suite 227 → **230** (`tests/repo-structure-smoke.mjs`, 3 phép kiểm). Đột biến: 4 lượt,
**1 THOÁT rồi được vá**. Đột biến thoát là `slash <= 0` → `slash < 0` — hai bản chỉ khác nhau ở
đường dẫn dị dạng hai gạch chéo, mà fixture không có ca đó. Đã thêm ca; đột biến bị bắt.

**Cổng kiểm bắt đúng một lỗi thật của tôi giữa chừng:** `GENERATOR_DIRTY` — bộ sinh đang sửa dở
thì phép kiểm "sự thật máy sinh còn tươi" từ chối phán xử bằng chính script đó. Fail-closed chạy
đúng.

**Việc kế tiếp:** trích `template/`, rồi cặp phép thử nghiệm thu.

## 2026-09-02 — `claude-core-k1` (đóng K1): template đã tồn tại như một vật thể

**Trích bằng BỘ SINH, không chép tay.** `scripts/build-template.mjs` dựng `template/` từ chính
repo này; `--check` biến câu hỏi *"template còn khớp bản gốc không"* thành việc của máy. Chép
tay thì có hai bản, và hai bản thì trôi khỏi nhau — đúng cái bệnh chương trình này chữa.
`template/` đã khai vào `areas` và mang nhãn **sinh tự động, đừng sửa tay**.

**Kết quả: 18 file.** Bộ luật (cắt bản đồ địa phương) · 5 script · 4 bản mẫu · hạt giống cấu
hình, quyền, bàn giao, trạng thái · README. **Cố ý KHÔNG mang:** trang máy sinh
(`DASHBOARD.md` · `llms.txt` · `repo-map.json`), bằng chứng, và `feature-parity.mjs` — bộ sinh
thì đi theo, sản phẩm của nó thì ở lại.

### Phép thử repo rỗng — ĐẠT, và nó bắt được ba lỗi thật của chính tôi

Dựng repo git trống, thả bộ khung vào, chạy cổng. **Bản trích đầu tiên KHÔNG đạt:**

| Lượt | Kết quả | Lỗi lộ ra |
|---|---|---|
| 1 | **1 ĐỎ · 8 VÀNG** | Quên `STATUS.md` cho gốc repo → B1 đỏ. Template có `package.json` nên gốc LÀ một đơn vị |
| 2 | 0 ĐỎ · 4 VÀNG | Thứ tự trong README sai: phải chạy bộ sinh TRƯỚC khi đo điều hướng |
| 3 | 0 ĐỎ · 4 VÀNG | Để bản đồ (mục 6) rỗng thì **chính `README.md`** rơi ra ngoài đường điều hướng |
| **4** | **0 ĐỎ · 0 VÀNG** | Điền sẵn bản đồ bằng chính các file bộ khung mang theo |

**Không lỗi nào trong ba lỗi đó phát hiện được từ trong repo gốc** — ở đây mọi file đều có sẵn
nên cổng luôn xanh. Đó là toàn bộ lý do phép thử này tồn tại.

**Một bẫy tự gài, đã gỡ:** hạt giống ADR-0000 ban đầu mang `status: Accepted`. B12 khoá mọi ADR
đã `Accepted`, nên lần cập nhật bộ khung sau sẽ bị chính cổng kiểm chặn. Đổi sang `Proposed` —
vừa gỡ bẫy, vừa đúng bản chất: một ADR ghi `date: YYYY-MM-DD`, `deciders: <ai chốt>` thì chưa
ai chốt cả. Chủ repo mới lật sang `Accepted` — đó là **hành động nhận luật**.

**Số:** suite 230 → **233**. Đột biến: 6 lượt, **1 THOÁT rồi được vá**.

**Phép kiểm rỗng nghĩa thứ hai tôi tự bắt được.** Đột biến "xoá sạch danh sách mẫu dò tên dự
án" **thoát** — vì template đã sạch nên *"không thấy gì"* đúng ở cả hai chiều. Đã thêm **mẫu
đối chứng dương**: bộ dò phải bắt được một chuỗi cấm cắm sẵn. Đây là lần thứ ba trong hai phiên
tôi viết một phép kiểm không phân biệt được hai nhánh — nên nay mọi phép kiểm dạng "không có X"
đều phải kèm một ca có X.

**CHƯA làm:** template **chưa rời repo này**. `template/` là bãi tập kết theo ADR-0001; dời một
bản trích chưa được audit thì chỉ chuyển chỗ cho vấn đề.

**Việc kế tiếp:** gửi audit độc lập (gói đề bài ở `docs/briefs/AUDIT-PROMPT-K1.md`), rồi mới dời.

## 2026-09-02 — `claude-so-y-tuong`: sổ ý tưởng + bảng trạng thái vào repo

**Vì sao có sổ này.** Repo có gần 60 mục nợ trong các `BACKLOG.md`, nhưng đó là **sổ của kỹ
sư** — mã lỗi, race condition. **Ý tưởng của Đức không có chỗ nào để nằm**, nên nó chỉ tồn tại
trong đầu và trong chat, và bảng trạng thái có một ô trống không lấp được.

**Làm gì:**
- `IDEAS.md` ở gốc repo — **phòng chờ**, KHÔNG phải roadmap thứ hai. Luật: ý tưởng có nhà thì
  rời sổ (điền `nhà:`), chép lại là đẻ nguồn sự thật thứ hai. Hai trường bắt buộc: `bậc` +
  `việc kế`. **Đang xây thì PHẢI khai `chủ` + `phạm vi`** — đó chính là thứ cho phép nhiều
  phiên chạy song song mà không giẫm chân.
- `scripts/build-overview.mjs` — sinh bảng trạng thái trực quan từ **cùng nguồn** với
  `DASHBOARD.md`, nên các trang không thể nói khác nhau. **Bản ra KHÔNG commit** (nó để
  publish); trang tự in ngày sinh và bật cờ đỏ khi quá 7 ngày.
- 5 ý tưởng đầu, trong đó Y-01 là MVP của Đức (dùng Claude Code điều phối GPT) với **ba câu
  chưa rõ ghi thẳng vào sổ** — tôi cố ý không bịa chi tiết.

**Số:** suite +5 phép kiểm (`test:overview`). **4/4 đột biến bị bắt.**

**Hai lỗi của tôi mà phép kiểm bắt được — đáng ghi vì cả hai đều là loại âm thầm:**
1. Một regex chứa **ký tự backspace 0x08** (Python dịch `\b` thành ký tự thật khi tôi vá file
   bằng script). Regex đòi một ký tự không bao giờ xuất hiện → **không bao giờ khớp**, và
   đường dẫn kèm tên file lọt lên bảng. `cat -A` mới thấy.
2. Một phép kiểm **GIẢ**: tôi tìm chuỗi `stalebanner` để xác nhận cờ cũ, nhưng chuỗi đó luôn
   có trong CSS nên phép kiểm đúng một cách vô nghĩa. Đã đổi sang tìm **thẻ được vẽ ra**.

**Phép kiểm đáng giá nhất là bất biến "bảng không lộ chi tiết kỹ thuật"** — đo trên repo THẬT,
vì cái hỏng ở đây đến từ nội dung hồ sơ trạng thái, không từ mã bộ sinh. Fixture giả không bao
giờ dựng lại được ca hỏng thật.

**Nợ mới phát hiện, đã ghi thành ý tưởng:** Y-03 (thiếu trường "Đức cần làm") · Y-05 (chữ
trong hồ sơ viết không dấu + thuật ngữ, **vi phạm luật vàng 5 của chính repo** — bảng vừa làm
nó lộ ra vì trước giờ chưa ai đọc mấy trường đó bằng mắt người).

**Chú ý cho phiên sau:** thêm `IDEAS.md` làm gốc repo có **10 file `.md`**. Chỉ tiêu của S8 là
6 — cần đổi thành 7, hoặc S8 hạ bớt file khác. Đừng xoá `IDEAS.md` để đạt chỉ tiêu.

**Ghi thêm cùng phiên:** cổng cấu trúc nhảy 19 → 28 chỗ VÀNG. **Không phải nợ của phiên này** —
cả 9 chỗ mới đến từ `template/` mà K1 vừa trích: thư mục đó chưa được trỏ tới từ cổng vào, nên
một AI lạ vào repo sẽ không tìm thấy bộ chuẩn. Đã khai `template/` vào Bản đồ file (phần thuộc
`_root`); **9 file bên trong cần liên kết từ `template/README.md`** — việc của phiên tiếp K1,
không phải việc của sổ ý tưởng.

## 2026-09-02 — `claude-y03`: trường `human_action` — việc chờ tay Đức thôi nằm lẫn trong mô tả

**Vấn đề.** Ba việc đang chờ Đức, nhưng chữ đó nằm **lẫn** trong `next_step`. Bảng không được
đoán từ chữ (luật vàng 1), nên ô "Đức cần làm" bỏ trống — đúng ô Đức cần nhất.

**Làm gì.** Thêm `human_action` vào lược đồ trạng thái. Ba trạng thái, và **gộp bất kỳ hai cái
là bảng nói dối**: chuỗi thật = có việc chờ · `không` = đã trả lời, không có gì · rỗng = **chưa
ai trả lời**. Lược đồ **từ chối khai rỗng**, vì rỗng làm bảng không phân biệt được hai cái cuối.

**GIAI ĐOẠN 1 là tuỳ chọn, có chủ đích.** Không đòi hỏi được một trường mà người khai khác chưa
có — hai gói đang do phiên khác giữ. Đây là luật chung của mọi lần đổi lược đồ, không phải thoả
hiệp riêng lần này. Giai đoạn 2 ghi ở Y-03.

**Số:** bảng-trạng-thái 5 → **6** phép kiểm · dashboard 81 → **82** · **4/4 đột biến bị bắt.**

**Hai lỗi của tôi mà phép kiểm bắt được:**
1. `human_action` khai **toàn dấu cách** bị đếm CẢ là việc thật CẢ là chưa khai — cùng một đơn
   vị nằm ở hai nhóm loại trừ nhau. Do lọc trên chuỗi thô trước khi cắt khoảng trắng.
2. Bất biến "bảng không lộ chi tiết kỹ thuật" **đỏ** vì chính `IDEAS.md` của tôi: một tên thư
   mục trơ có gạch chéo ở CUỐI lọt cả hai luật cắt (chỉ một gạch chéo, không đuôi file). Đã
   thêm luật thứ ba, và kiểm để không cắt oan `và/hoặc` hay `3/4`.

**Luật của sổ ý tưởng có lỗ, đã vá.** Ba cửa ra không có cửa nào cho ý tưởng *làm xong luôn tại
đây*; Y-04 là ca đầu tiên không lọt cửa nào. Thêm cửa thứ tư: đổi bậc thành `đã chứng minh` và
**để nguyên trong sổ** để Đức thấy việc đã chạy tới đâu.

**VA CHẠM QUYỀN — ghi minh bạch.** Lúc điền, `duc-auto-chatgpt` đang trống chủ (đã kiểm trước
khi nhận). Giữa phiên, **Đức giao gói đó cho `claude-surface-fix`**. Nên commit của tôi có một
dòng trong `STATUS.md` của gói họ. **Cố ý không gỡ lại** — gỡ là đụng gói của họ lần thứ hai cho
một dòng dữ liệu vốn đúng. Cổng kiểm phạm vi vẫn XANH.

**Việc kế:** Y-05 (viết lại chữ trong hồ sơ cho mắt Đức đọc) — nó sẽ làm mọi dòng trên bảng
đọc được, không chỉ ô "Đức cần làm".

## 2026-09-02 — `claude-y05`: luật vàng 5 giờ có răng — phép kiểm B15

**Vấn đề.** Luật vàng 5 quy định *"chữ operator nhìn thấy: tiếng Việt"* từ đầu. Ba trường
`current_focus` · `next_step` · `human_action` là chữ Đức đọc trên bảng — nên chúng thuộc diện
đó. Nhưng **trước khi có bảng, chưa ai đọc mấy trường này bằng mắt người**, nên luật bị vi phạm
âm thầm suốt: Đức mở bảng thấy *"CAN DUC RELOAD EXTENSION roi chay mot chuoi de do pacing_ms"*.

**Vì sao không chỉ sửa chữ.** Đơn vị ưu tiên #1 — thứ hiện ở ô "Đang tập trung" — thuộc phiên
khác, tôi không sửa được. Sửa tay phần của mình thì lấp được một nửa bảng, và **tái phát ngay
lần khai sau**. Luật không kiểm được bằng máy thì sớm muộn cũng bị bỏ qua.

**Làm gì.** Thêm **B15** — mức CẢNH BÁO, không chặn. Chặn là cổng đỏ vì chữ của gói mình không
sở hữu. Heuristic **cố tình bảo thủ**: chỉ báo khi ≥40 chữ cái mà **không có lấy một dấu tiếng
Việt nào**; mã, đường dẫn, tên định danh được bỏ ra trước khi đo vì chúng ĐƯỢC PHÉP tiếng Anh.
Hệ quả nhận có chủ đích: một câu dài chỉ có đúng một chữ có dấu thì lọt — vì **một phép kiểm
báo oan một lần là từ đó không ai nhìn nó nữa**.

**B15 tìm ra 4 chỗ vi phạm thật**, mỗi chỗ nêu tên trường và trích nguyên văn. Tôi sửa được 1
(gemini v0.2.0); 3 chỗ còn lại thuộc hai gói do phiên khác giữ — B15 giờ tự nhắc chủ của chúng.

**Sửa kèm một chuyện đúng hơn về ranh giới trường:** `next_step` cũ của gemini **trộn cả việc
của Đức lẫn việc của AI**. Nay việc của Đức đã có trường riêng (Y-03), nên tách hẳn:
`next_step` chỉ còn việc của phiên AI kế tiếp.

**Số:** cổng cấu trúc 14 → **15 phép kiểm** · test 28/28 · **5/5 đột biến bị bắt.**

**Một đột biến THOÁT ở vòng đầu, và lý do đáng ghi.** Đột biến "xoá luật bỏ mã trước khi đo"
thoát vì fixture của tôi chỉ có 5 mã một-chữ = 5 chữ cái, dưới ngưỡng 40 — bỏ mã hay không cũng
ra cùng kết quả. Đổi sang 14 mã ba-chữ (42 chữ cái) thì nó bị bắt. **Lần thứ ba trong ngày một
phép kiểm của tôi không dựng nổi ca hỏng** — và cả ba lần đều chỉ lộ ra khi chạy đột biến thật.

## 2026-09-02 — `claude-surface-fix`: sửa 7 phát hiện của audit độc lập (K1 bị REJECT)

Codex audit K1 tại `bae0483` → **REJECT, 20 phát hiện**. Tôi kiểm chứng độc lập bảy cái nặng
nhất trước khi sửa (luật vàng 4) — **cả bảy đều thật**. Đức cho mượn `_root` để sửa.

### Hai lỗi nặng, và cả hai đều là *phép thử của tôi quá nông*

**① Phép thử repo rỗng chưa bao giờ chạy cổng đóng phiên** — chỉ chạy cổng cấu trúc. Mà cổng
đóng phiên đòi `feature-parity.mjs`, thứ bộ trích **cố ý không mang theo**. Repo dựng từ bộ
khung sẽ hỏng ngay ở cổng của chính nó, và phép thử mù hoàn toàn.
→ Danh sách bộ sinh nay đọc từ `.repo-structure.json` (`generators`); bộ khung khai đúng thứ nó
mang theo. **Ba** chỗ đóng cứng phải sửa, không phải một: danh sách, câu gợi ý cách sửa, và câu
báo thành công — hai câu sau vẫn kể tên `FEATURE-PARITY.md` cho một repo không hề có nó.

**② Bộ sinh đóng cứng tên repo gốc** trong trang cổng vào. Mọi repo dùng bộ khung sẽ sinh ra
một trang **tự nhận là repo Chrome** — đúng cái bệnh luật cấm-chép-tầng-GENERATED sinh ra để
tránh, và luật đó không chặn nổi vì nó chỉ soi DANH SÁCH file mang theo, không soi NỘI DUNG.
→ Danh tính đọc từ khối `repo`, và **giá trị mặc định nay TRUNG TÍNH**. Để mặc định là tên repo
gốc mới chính là cái bẫy: repo nào quên khai sẽ lặng lẽ nói dối.

### Năm cái còn lại

| | Sửa gì |
|---|---|
| Bản đồ máy đọc luôn khai `P1` | đọc `profile` từ cấu hình, kiểm hợp lệ P1…P5 |
| Cổng đóng phiên đóng cứng `workers/<gói>/<phiên-bản>` ở **2** chỗ | thêm `unitDirOf` / `unitDirsUnder`, đi xuống đúng số tầng đã khai |
| `--check` so chuỗi thô | chuẩn hoá xuống dòng — bản clone sạch trên Windows từng báo 9 file "lệch" |
| Khuôn trạng thái tự mâu thuẫn `v1`/`v2` | sửa về `v2`, và nói rõ đường dẫn ví dụ là của repo NÀY |
| Mẫu dò `"0 chỗ ĐỎ"` không chặn biên số | **đọc số**, không dò chuỗi — mẫu cũ khớp cả `"40 chỗ ĐỎ"` |

### Phép thử nghiệm thu nay sâu hơn hẳn

Repo rỗng giờ phải qua **ba** cửa, không phải một: cổng cấu trúc 0/0 · **cổng đóng phiên chạy
được** · **nội dung trang sinh ra không mang tên repo gốc**.

### Bộ tự kiểm bắt được một rò rỉ của phiên khác

Trong lúc sửa, phép kiểm tên-dự-án chặn commit `74593d2` (phiên `claude-y03`): một chú thích
trong `build-dashboard.mjs` — script **portable** — nhắc tên một gói cụ thể. Đã viết lại trung
tính. Phép kiểm làm đúng việc của nó, trên thay đổi của người khác.

### Số

Suite **233 → 243**. Đột biến: 8 lượt, **2 THOÁT rồi được vá**. Cả hai thoát vì cùng một lý do:
phép kiểm đi **đường vòng** qua phép thử tích hợp thay vì **ghim thẳng luật**. Bộ khung luôn
khai tên riêng nên giá trị mặc định không bao giờ chạy tới; và không ca nào chạm đúng ranh giới
của `unitDirOf`. Nay ghim thẳng: mặc định không được chứa danh tính repo gốc, và ranh giới
"chính là thư mục đơn vị" ≠ "file bên trong nó".

**Bài học lặp lại lần thứ năm trong hai phiên** — và nay đã đủ để thành luật:
*một phép kiểm chỉ thật khi fixture của nó dựng được ca hỏng; kiểm qua đường vòng thì đường vòng
mới là thứ được ghim.*

### Vòng 2 — sáu phát hiện fail-open còn lại, trong đó một cái làm cổng mất răng

**Lỗ nặng nhất, và nặng hơn mô tả của Codex.** `mine()` chỉ khớp package, nên một phiên chỉ giữ
`_root` — **mọi phiên sửa `scripts/`, `tests/`, hay cả bộ khung** — có `mine()` luôn false. Hậu
quả đo thật: phép kiểm *"Test xanh"* báo *"không package nào của bạn có suite bị ảnh hưởng"* và
**suite gốc 243 test không hề chạy**. Suốt cả phiên hôm nay sửa `build-dashboard`,
`session-check`, `repo-structure`, cổng chưa từng chạy một test nào — tôi chạy tay `npm test`
nên không có gì lọt, nhưng **cổng thì không bảo vệ gì**. Và trong repo dựng từ bộ khung
(`root_dir: null`) thì không có package nào cả, nên cổng mất răng **vĩnh viễn**.

Nay `_root` là một vùng thật: `mine()` nhận file gốc khi phiên giữ `_root`; suite gốc được chạy
qua `npm test`; và phép kiểm bản đồ file đối chiếu `AGENTS.md` GỐC cho file gốc (trước đây
`continue` bỏ qua, nên thêm một thư mục top-level mới mà không khai thì không ai bắt).

**Hai chi tiết kỹ thuật đáng ghi, vì cả hai đều làm hỏng bản đầu:**
- Node 24 trên Windows **không spawn được file `.cmd`** (`EINVAL`) — phải chạy qua shell.
  Thêm nữa `scripts.test` là chuỗi lệnh nối bằng `&&`, thứ chỉ shell hiểu.
- Viết code bằng script thì **dấu thoát bị nuốt một tầng**: `"\n"` thành ngắt dòng thật và làm
  vỡ chuỗi. Dính ba lần hôm nay; cách chắc ăn là `String.fromCharCode(10)`.

**Bốn phát hiện fail-open trong bộ đọc cấu hình:**

| Trước | Sau |
|---|---|
| Thiếu `areas` hoặc `areas: null` → lặng lẽ lùi về `workers/` | **NÉM.** Gõ nhầm `areass` từng quy chủ sai cho mọi commit |
| `ownership_mode` gõ sai → im lặng bỏ qua | **NÉM.** `per-pacakge` từng làm danh sách tiền tố rỗng và mọi package rơi về `_root` |
| `root_dir`/`marker` chỉ cấm `/` | cấm cả `..`, `.`, và dấu gạch ngược |
| Hai vùng chia-theo-gói lồng nhau | **NÉM.** `areaOf` lấy tiền tố khớp đầu tiên, nên quyền sở hữu đổi theo thứ tự khoá trong JSON |

**Số:** suite **243**, exit 0. Phép kiểm lệch template bắt được chính tôi quên sinh lại `template/`
sau khi sửa script portable — đúng việc của nó.

**CÒN LẠI, chưa làm:** một phát hiện là câu hỏi thiết kế chứ không phải bản vá — *bộ trích chỉ
thay mục 6 rồi giữ nguyên mọi luật còn lại của repo Chrome*, nên repo khác loại vẫn nhận luật
về quyền extension, pilot live, selector DOM và vai của Bridge. Cần bàn với Đức trước, không tự
quyết. Ba phát hiện nhỏ khác (đối chứng dương hẹp, cấm bằng chứng chỉ soi `evidence/`,
`safe-push` nuốt lỗi remote) để lượt sau.

## 2026-09-02 — `claude-y02`: lệnh nhận/trả quyền (A1). Hoãn A2 có chủ đích.

**Vì sao có A1.** Nhận quyền vốn là `node -e "…"` thủ công, tức đọc → sửa → ghi. Hai phiên cùng
đọc thấy "trống" rồi cùng ghi tên mình thì **người ghi sau thắng, người ghi trước không hề
biết**. Hôm nay tôi là người bị ghi đè. Nghịch lý: `claims.json` sinh ra để chống tranh chấp,
mà chính nó là tài nguyên bị tranh chấp và không được bảo vệ — 63 lần ghi trong một ngày.

**Làm gì.** `node scripts/claim.mjs --take|--release <khoá> --as <phiên> --task "…"`. Nó **từ
chối** nhận gói người khác đang giữ (và in ghi chú của họ để biết họ đang làm gì), **từ chối**
trả quyền hộ người khác, bắt buộc `--task`, và **ghi rồi đọc lại để kiểm** — không chặn được
đua tuyệt đối, nhưng không để nó âm thầm. **Từ nay đừng sửa `claims.json` bằng tay.**

**Số:** suite 233 → **248**. 5 phép kiểm mới, trong đó một phép **chạy thật** và xác nhận điều
quan trọng nhất: *lần cướp quyền KHÔNG ghi một chữ nào vào bảng.*

**HOÃN A2 (tách `_root` thành nhiều khoá) — có chủ đích, không phải quên.** A2 viết lại chính
hàm phân vùng trong `session-check.mjs` + `repo-structure.mjs`, mà phiên `claude-surface-fix`
**đang lặp audit K1 trên đúng hai file đó** (vòng 2: `c1c92f3`, 20:00). Sửa cùng lúc là bảo đảm
xung đột — và tệ hơn, hai bản vá cùng đụng lớp phân quyền thì không ai đọc nổi cái nào đúng.

**ĐÍNH CHÍNH BÁO CÁO CỦA TÔI HÔM NAY.** Audit K1 vòng 2 phát hiện `mine()` chỉ khớp package,
nên **một phiên chỉ giữ `_root` thì `mine()` luôn false** → phép kiểm "Test xanh" báo *"không
package nào của bạn có suite bị ảnh hưởng"* và **suite gốc không hề chạy**. Đó là chính các
phiên K1 · Y-03 · Y-05 của tôi. Tôi có chạy `npm test` bằng tay mỗi lần và báo số thật
(227 · 232 · 233), nên không có gì lọt — nhưng khi tôi nói "cổng XANH TOÀN BỘ" thì **một trong
tám phép kiểm đang rỗng** với việc của tôi. Câu đó mang nhiều bảo đảm hơn nó đáng có. Nay họ đã
vá, và lượt này cổng chạy suite gốc thật.

**Ghi minh bạch về quyền:** hồ sơ còn ghi `claude-surface-fix` giữ `_root`; Đức bảo đã trống lúc
20:06. Tôi nhận theo lời Đức và **giữ nguyên bản ghi việc của họ** trong ghi chú, không xoá.

**Việc kế:** A2, khi audit K1 lắng. Đường đi và giá từng phương án:
`docs/studies/PARALLEL-WORK-DESIGN-V0.md`.

## 2026-09-02 — `claude-y02-a2`: gốc repo không còn là MỘT vùng (A2)

**Số đo đặt ra bài toán:** 98/127 commit trong ngày (**77%**) chạm gốc repo — vì cổng đóng phiên
bắt sinh lại bốn trang máy sinh ở đó. Nên một phiên chỉ sửa code trong một gói **vẫn buộc phải
nhận `_root`** ở cuối. Và ca thật cùng ngày: một phiên mượn `_root` để sửa audit K1 (chỉ cần
`scripts/`), tôi chỉ cần `docs/` — **hai việc không chồng nhau mà một khoá chặn cả hai.**

**Làm gì.** Khối `areas` **đã có sẵn** trường `steward` cho từng thư mục; cả bảy đều khai `_root`
nên chưa ai tách. Nay: `_docs` (docs/) · `_code` (scripts/ + tests/) · `_template` (template/) ·
`_root` (phần còn lại + file tầng ngoài). Cổng đóng phiên xét **theo từng khoá** — thiếu khoá
nào thì nó gọi tên khoá đó ra, kèm nguyên lệnh để nhận.

**Miễn trừ có điều kiện cho `HANDOFF.md`, và đây là mảnh khiến A2 thật sự mở khoá.** Luật mục 7
bắt MỌI phiên ghi Log vào `HANDOFF.md` ở gốc. Bắt phải nhận thêm một khoá chỉ để tuân luật là
**tự chặn luật của mình**. Nên nó được miễn như `claims.json` — nhưng **chỉ khi chỉ thêm dòng**:
sửa hay xoá dòng cũ là viết lại lịch sử của phiên khác, và cái đó không được miễn. Quyết định
tách thành hàm thuần `appendOnlyFromNumstat`, **fail closed**: git trả `-` cho file nhị phân thì
KHÔNG miễn, không đoán là 0.

**A2 tự chứng minh ngay trong lượt làm nó.** Cổng lần lượt bắt tôi nhận `_code`, rồi `_template`
(vì sinh lại bộ khung), và tôi trả `_docs` ngay khi không còn cần. Trước A2, cả ba việc đó dùng
chung một khoá và **không ai thấy gì**.

**Số:** suite 248 → **250**. Hai phép kiểm mới trong `tests/repo-structure-smoke.mjs`.
**3/3 đột biến bị bắt**, trong đó cái đáng nhất: *"miễn oan khi đọc không ra số dòng xoá"*.

**Giới hạn tôi tự nhận:** phần **quyết định** miễn trừ được kiểm kỹ mọi nhánh, nhưng phần **nối
dây** trong `session-check.mjs` thì không có test riêng — dựng cổng đầy đủ trong repo tạm quá
nặng. Bù lại nó được chạy thật mỗi phiên, vì gần như phiên nào cũng chạm `HANDOFF.md`.

**Còn mở:** **vấn đề 2** — push cuốn theo commit người khác. A2 KHÔNG chữa cái đó (commit vẫn
trên một nhánh). Bảng giá bốn cách: `docs/studies/PARALLEL-WORK-DESIGN-V0.md` mục 5. Cần Đức chọn.

**Cũng làm:** xoá file rác `nul` 19KB ở gốc (Đức duyệt), giữ dòng `.gitignore` để mọi phiên sau
khỏi tạo lại.

## 2026-09-02 — `claude-y02-a2`: ghi VẤN ĐỀ 3 — cuộc đua do phép kiểm độ tươi artifact

**Không phải tranh chấp quyền.** Tôi mất **bốn lượt** mới đóng nổi cổng cho A2, trong khi đã giữ
đủ cả ba khoá cần. Nguyên nhân: phép kiểm *"sự thật máy sinh còn tươi"* so bốn trang máy sinh với
**toàn bộ repo**, nên **bất kỳ phiên nào commit** cũng làm artifact của tôi cũ. Ba phiên khác
commit lúc 20:40 · 20:42 · 20:45 · 20:45.

**Và nó vừa tệ hơn vì một lý do TỐT.** Bản vá audit K1 khiến cổng thật sự chạy suite gốc — trước
đó suite không hề chạy với phiên chỉ giữ gốc repo. Đúng và cần thiết. Hệ quả: cổng từ vài giây
thành vài phút, và cửa sổ đua rộng ra đúng bằng đó. **Sửa cổng cho chặt hơn đã làm cuộc đua này
lộ ra** — nó vốn đã tồn tại.

**A1 và A2 KHÔNG chữa cái này.** Ghi rõ để không ai tưởng đã xong.

**Bốn phương án kèm giá đã ghi vào `docs/studies/PARALLEL-WORK-DESIGN-V0.md` mục 5b.**
Khuyến nghị **C3**: cho `safe-push` tự sinh lại artifact rồi đẩy ngay trong cùng một thao tác —
cửa sổ đua co về mili-giây vì không còn lượt chạy cổng nào chen giữa, và **không bỏ lớp bảo vệ
nào**. Ba cách kia đều đổi bảo đảm để lấy tiện lợi: C1 cho artifact nói sai, C4 làm GPT mù khi
audit qua GitHub, C2 chỉ dời cơn đau.

**Cần Đức gật** vì C3 khiến `safe-push` tạo commit — hôm nay nó chỉ đọc và đẩy.

## 2026-09-02 — `claude-y02-c3`: A2 của tôi có lỗi nối dây. Phiên khác tìm ra và đã vá.

**Lỗi.** Tôi nối `stewardOf` vào `session-check.mjs` nhưng **không nối vào `safe-push.mjs`**.
Hai công cụ quy cùng một file về hai vùng khác nhau: `docs/…` là `_docs` với cổng kiểm nhưng
`_root` với safe-push. **Hậu quả đo được:** một phiên làm trong `docs/` bị safe-push **từ chối
đẩy việc của chính nó**, vì safe-push đòi `_root` mà phiên đó không giữ.

Đúng lớp lỗi repo này đã trả giá một lần (26/08: hai bản regex riêng ở hai file, lệch nhau ở
đường dẫn tiếng Việt) — và luật đã ghi *"một hàm thì không lệch được"*. Tôi thêm hàm thứ hai
thay vì gom về một.

**Phiên `claude-k2-design` tìm ra và vá** (`88c176c`, 20:51): cả hai đi qua `ownershipKeys` dùng
chung. Tôi đã kiểm chứng lại độc lập, không tin báo cáo suông — `areaOf` và `stewardOf` thật sự
trả hai kết quả khác nhau cho cùng một đường dẫn.

**VÌ SAO TEST CỦA TÔI KHÔNG BẮT ĐƯỢC — bài học đắt nhất phiên này.**
Lúc chạy A2 tôi giữ **cả ba khoá** `_root` + `_code` + `_template`. Nên `areaOf → _root` tình cờ
khớp một khoá tôi đang giữ, và safe-push không hề từ chối. **Phiên của tôi không thể tái hiện
lỗi vì tôi giữ hết mọi khoá.**

> Cả mục đích của A2 là để một phiên giữ ÍT khoá hơn — mà tôi kiểm nó trong điều kiện giữ HẾT.
> **Điều kiện thử nghiệm đi ngược mục đích của chính tính năng.**

Đây là họ hàng của bài học "fixture phải dựng được ca hỏng", nhưng ở tầng cao hơn: không chỉ
fixture, mà **cả trạng thái quyền của phiên đang thử** cũng là một phần của fixture. Phiên sau
sửa lớp phân quyền thì hãy thử với **đúng một khoá**, không phải với tất cả.

**C3 (Đức đã duyệt) PHẢI CHỜ.** Nó sửa `safe-push.mjs` + `session-check.mjs` — cả hai là `_code`,
đang do `claude-k2-design` giữ để làm đúng cái refactor mà C3 dựa lên. Làm bây giờ là viết trên
nền đang bị dời.

---

## Log — 2026-09-02, `claude-dashboard` · HAI CON SỐ TRÊN BẢNG CỦA ĐỨC ĐANG SAI

Đi kiểm xem bảng trực quan (`build-overview.mjs`) có cần lịch cập nhật định kỳ không.
Kết luận: **không cần lịch** — nhưng phát hiện hai lỗi trong chính con số bảng đang hiện.

**Đo được:** 6 commit mới của các phiên khác (21:05 → 21:25) làm bảng đổi **0 byte**.
Bảng đọc *trạng thái được khai* (STATUS, `IDEAS.md`, số ADR, số nợ), không đọc nhịp commit.
Nên lịch theo thời gian là công cụ sai: nó chạy khi không có gì đổi, và vẫn trễ khi có.

**Lỗi 1 — số nợ kỹ thuật sai 6 đơn vị.** Bảng hiện **63**, thật khoảng **57**.
`debtByUnit` nhận việc đã đóng qua ba cụm chữ `ĐÃ ĐÓNG|ĐÃ XONG|ĐÃ VÁ XONG` hoặc `~~gạch~~`.
BACKLOG của gg-flow-video viết `**XONG 02/09**` — không khớp cụm nào, nên 6 việc đã đóng
(F-11, F-15, F-21, F-23, F-24, F-26) vẫn bị đếm là nợ.

**ĐỪNG vá bằng cách nới thêm chữ vào biểu thức.** Tôi đã thử đọc 8 dòng có chữ "xong":
hai trong số đó **vẫn đang mở** — `F-05` chỉ chứa chữ "xong" trong một điều kiện
("sau khi F-02+F-04 xong"), và `F-19` ghi "XONG **một phần**". Nới chữ là đóng oan hai việc.
Gốc bệnh: **bảng đang suy ra trạng thái từ văn xuôi của người.** Cách chữa đúng là một dấu
máy đọc được ở vị trí cố định (`~~gạch~~` đã có sẵn và không nhập nhằng), rồi cấm dò văn xuôi.
Việc này đổi một con số Đức đọc → cần Đức gật, và cần một phép kiểm ghim dựng đúng hai ca
F-05 / F-19 (fixture không dựng được hai ca đó thì phép kiểm vô nghĩa).

**Lỗi 2 — dòng tuổi bảng làm tròn sai.** `ageDays` lấy `Date.now()` (có giờ, phút) trừ
`Date.parse("2026-09-02")` (nửa đêm UTC) rồi `Math.round`. Sinh bảng sau trưa là ra
"1 ngày trước" **ngay trong ngày sinh**. Cùng cơ chế đó có thể bật cờ đỏ 7 ngày sớm nửa ngày.
Chữa: so hai mốc **ngày**, không so mốc thời điểm, và dùng `Math.floor`.

**Cả hai nằm trong `scripts/` = `_code`, do `claude-k2-design` giữ.** Tôi không sửa, chỉ đọc.
Lúc ghi dòng này tôi **không giữ khoá nào** — cả 7 khoá đang có chủ khác. C3 vẫn chờ `_code`.

## 2026-09-02 — `claude-k2-design`: K2-2b · một bộ phân giải quyền, mọi công cụ đi qua nó

**Chuyện đã xảy ra.** A2 tách gốc repo thành `_root` · `_docs` · `_code` · `_template` bằng hàm
mới `stewardOf`, nối dây cho `session-check.mjs` mà **không** nối cho `safe-push.mjs`. Đo được:
`docs/studies/X.md` thì cổng quy `_docs`, safe-push quy `_root`. Nghĩa là một phiên giữ `_docs`
đúng luật, làm xong, **cổng XANH**, rồi **bị chính safe-push từ chối đẩy việc của mình** — và
đường thoát duy nhất là `--carry`, thứ phải hỏi Đức.

**Đây là lần lệch THỨ HAI ở đúng hai file của lần thứ nhất.** 26/08 hai bản regex `^workers/`
lệch nhau, chữa bằng cách tách ra `areaOf` dùng chung. Lần này lệch lại vì **thêm một hàm thứ
hai rồi chỉ nối dây một bên**. Bài học đắt hơn bản vá: *tách hàm dùng chung không chặn được
lệch — người sau vẫn thêm được hàm thứ hai.* Thứ chặn được là **một cửa duy nhất**, cộng một
phép kiểm ghim **dây nối**, không ghim cái hàm.

### Làm gì

| | |
|---|---|
| `ownershipKeys()` | cửa DUY NHẤT trả lời "file này thuộc vùng nào". Cả cổng và safe-push đi qua nó |
| `ownershipInvariant()` | bất biến LAW `steward` ↔ STATE khoá quyền. Thành **phép kiểm #9**, `EXPECTED_CHECKS` 8 → 9 |
| `appendOnlyAtEof()` | siết miễn trừ `HANDOFF.md`: đòi ĐÚNG MỘT hunk và nó bắt đầu ngay sau dòng cuối bản cũ |
| safe-push fail-open | ref `origin/main` không tồn tại → bản cũ in "không có gì để push" rồi thoát 0. Nay **CHẶN** |

**Số:** suite 251 → **257**. Cổng 8 → **9** phép kiểm.

### Hai vòng audit độc lập (Codex), cả hai đều BÁC — và cả hai đều đúng

**Vòng 1 giết một tính năng tôi đã viết xong.** Tôi có làm cả K2-2 (thu hẹp bán kính phép kiểm
#7, để nợ artifact của lane khác không chặn mọi người). Codex bác với hai lỗi chặn, tôi kiểm lại
thì **cả hai thật**: ① không có commit nào chưa push thì bản vá coi như "nợ không phải của tôi",
mà repo này push sớm theo chính sách, nên nợ CỦA TÔI vừa push xong sẽ tự được miễn; ② quy trách
nhiệm theo chủ HIỆN TẠI của vùng, nên trả quyền là thoát — và phiên nhận vùng SAU đó bị quy cho
nợ của người trước.

Cùng một gốc: **không có cách quy trách nhiệm cho một COMMIT.** Chủ sở hữu là trạng thái sống,
commit là chuyện đã qua. **Nên K2-2 PHỤ THUỘC K2-3 (nhãn `Lane:` trong commit), không phải
ngược lại như thứ tự tôi xếp ban đầu.** Đã gỡ sạch bản vá đó, để lại một khối ghi chú ở đúng chỗ
nó từng nằm. **Đừng làm lại nó trước khi có K2-3.**

**Vòng 2 giết bản vá của vòng 1.** Tôi làm hai công cụ dùng chung cả PHẠM VI đo; Codex bác đúng:
một bản sửa dở **chưa commit** có thể che một commit phá hoại **đã nằm trong HEAD**, và safe-push
sẽ đẩy nó đi. Nên phạm vi hai bên **cố ý khác nhau** — cổng phán "việc của phiên này"
(`origin/main` → cây làm việc), safe-push phán "thứ tôi sắp công bố" (`origin/main` → `HEAD`) —
và thứ dùng chung là **hàm quyết định**, không phải phạm vi.

Vòng 2 cũng bác việc tôi *ghi chú* một lỗ cấp quyền rồi mở rộng nó: `appendOnlyFromNumstat` chỉ
chứng minh "0 dòng bị xoá", nên chèn một dòng bịa vào GIỮA `HANDOFF.md` vẫn được miễn — ghi vào
file luật ở gốc mà không cần nhận khoá gốc. Ghi chú ra không làm nó hợp lệ. Đã vá thật bằng
`appendOnlyAtEof`.

**Hai dương tính giả, đã kiểm và bác lại:** Codex nói git probe có thể ném và giết cả cổng
(`git()` là wrapper try/catch, không ném được), và nói cổng bóc dấu nháy khác `unquote` của
safe-push (hai biểu thức **giống hệt từng ký tự**).

### Một lỗi của phiên khác, vá luôn vì tôi đang giữ đúng file

Phiên K1 báo `safe-push` fail-open, rồi **tự đính chính điều kiện kích hoạt sau khi chạy thử** —
mạng hỏng thì KHÔNG nổ (ref cũ vẫn phân giải); chỉ nổ khi ref `origin/main` **không tồn tại**
(clone mới, nhánh mặc định tên khác). Bản vá đi theo số đo đó: fetch hỏng thì **nói to rồi đi
tiếp**, ref không có thì **chặn**. Siết cả hai là chặn oan một phiên chỉ vì mạng chớp.

### Còn mở

- **K2-3 (nhãn `Lane:` trong commit)** — điều kiện của K2-2 và của mọi phép cưỡng chế phạm vi.
- **Bốn khoá một chủ = một khoá.** A2 tách gốc thành 4 khoá để lane khỏi chạm nhau, rồi việc đầu
  tiên xảy ra là một lane giữ cả bốn. Thiếu luật: **lane chỉ được giữ những khoá mà phạm vi của
  nó thật sự cần**, và trả từng khoá ngay khi xong phần đó.
- `ownershipInvariant` chỉ kiểm **tham chiếu**, không biết một đường dẫn *đáng ra* thuộc steward
  nào. Khai `docs/` thành `_root` là sai mà bất biến vẫn xanh.

## 2026-09-02 — `claude-k2-design`: đóng nốt ba lỗ phiên K1 chỉ ra (K2-2b vòng 2)

**Lỗ của chính tôi, K1 bắt được.** Tôi thêm guard `KHONG_CO_ORIGIN_MAIN` vào `safe-push.mjs`
mà **không ghim test**. K1 grep cả `tests/` và chỉ ra chuỗi đó không có trong phép kiểm nào; hai
fixture chạm `origin/main` đều `update-ref` — tức chỉ dựng ca CHẠY ĐƯỢC. Tôi kiểm bằng đột biến:
gỡ guard rồi **đồng bộ bản trích** thì suite **xanh sạch, exit 0**. (Lần chạy đầu tôi tưởng nó bị
bắt — nhưng cái bắt được chỉ là phép kiểm bản trích, thứ bắt mọi ký tự chứ không ghim hành vi.)
→ Nay có fixture dựng đúng ca hỏng: `git init` + 1 commit + **không remote nào** → khẳng định
`KHONG_CO_ORIGIN_MAIN`, thoát khác 0, và **không** in "Không có gì để push". Đột biến nay bị bắt.

**Lỗ NẶNG hơn, và nó là nửa chưa vá của lỗi nặng số 1 audit vòng một.** Vòng đó tìm ra "cổng chưa
từng chạy suite gốc". Bản vá làm vùng gốc thành vùng thật **trong repo này** — và báo là đã đóng.
Nhưng nguyên nhân ở bộ khung là **không có suite để mà chạy**: `template/` không mang `tests/`, và
`template/package.json` không khai `scripts.test`. Dây chuyền đã kiểm từng mắt: `hasRootTestScript()`
false vĩnh viễn → phép kiểm Test trả **XANH kèm "Không package nào của bạn có suite bị ảnh hưởng"**.
Repo gốc hết bệnh, bộ khung vẫn nguyên bệnh — mà bộ khung mới là thứ sắp nhân ra nhiều repo.

→ **Fail loud, đừng fail silent.** Giữ khoá gốc mà repo không khai `scripts.test` thì cổng in
`[BỎ  ]` kèm *"REPO CHƯA CÓ SUITE GỐC — cổng KHÔNG kiểm được một dòng code nào của bạn"*. Cố ý
**không** ĐỎ: repo vừa dựng chưa có test là chuyện thật và hợp lệ, đỏ ở đây là khoá repo ngay phiên
đầu. Nhưng "chưa kiểm" phải hiện ra là chưa kiểm, không được đội lốt XANH.

**Hai lỗ trong phép thử repo rỗng** (mục a, b của brief K1):
- Đối chứng dương chỉ trồng `duc-auto`; ba mẫu còn lại chưa từng được chứng minh là bắt được →
  nay trồng **cả bốn**, mỗi mẫu một chuỗi riêng. *Bản đầu của chính đối chứng này trồng
  `duc-auto-gg-flow-video` — khớp hai mẫu một lúc nên không chứng minh được mẫu nào.*
- Phép cấm bằng chứng chỉ soi `evidence/`, bỏ sót `pilot-*` · `Pilot-*` · `Batch-*` → nay soi cả
  ba, kèm đối chứng dương và một ca chống báo oan (`docs/pilot-ghi-chu.md` không phải bằng chứng).

**Số:** suite 257 → **258**.

### Còn mở — cùng họ, chưa vá

- **CỔNG cũng nuốt "không có origin/main".** Đo được ngay trong fixture repo rỗng:
  `git diff --name-only origin/main...HEAD` fail → `unpushed` rỗng → cổng chỉ còn thấy cây làm
  việc, tức **bỏ qua mọi commit chưa push** mà không nói gì. Cùng hình dạng lỗ vừa vá ở
  `safe-push`, chỉ khác chỗ. Chưa vá vì nó nằm ngoài phạm vi phiên này.
- **Bộ khung nên mang một `tests/` tối thiểu + khai `scripts.test`.** Fail-loud ở trên gỡ phần
  *im lặng* của lỗ, nhưng bộ khung vẫn chưa có răng. Đây là quyết định về **nội dung** bộ khung
  nên tôi không tự chốt — để K1 (chủ chương trình bộ trích) làm, tôi trả `_template`.
- Mục (d) brief K1: `scripts/build-template.mjs:183` mốc cắt `"\n## 6."` không kiểm là tiêu đề
  THẬT và DUY NHẤT. Nằm trong `_code`, chưa làm.

## 2026-09-02 — `claude-k2-design`: mục (d) brief K1 — mốc cắt bản trích

`scripts/build-template.mjs` cắt mục 6 của `AGENTS.md` bằng `indexOf("\n## 6.")`, tức lấy lần
khớp **đầu tiên** và không kiểm gì thêm. Một dòng văn hoặc khối trích dẫn nhắc `## 6.` nằm TRƯỚC
tiêu đề thật là cắt sai — và cắt sai **âm thầm**: bộ trích vẫn sinh ra `AGENTS.md`, chỉ là mất
một phần mục 5. Không ai thấy cho tới khi đọc kỹ bản trích.

→ `soleHeadingIndex()`: chỉ nhận dòng **bắt đầu** bằng mốc (nên nhắc trong trích dẫn không tính),
và đòi **đúng một** dòng như vậy. Hai mốc thật thì **NÉM** kèm số dòng từng mốc, chứ không âm
thầm chọn cái đầu. Ghim cả bốn nhánh, cộng một phép kiểm chạy trên `AGENTS.md` **thật** — nếu
repo này vi phạm thì bộ trích đỏ trước khi nó kịp sinh ra bản trích bị cắt sai.

**Số:** suite 258 → **259**.

**Đã trả `_template`.** Việc còn lại của bộ khung — mang theo một `tests/` tối thiểu và khai
`scripts.test` — là quyết định về **nội dung** bộ khung, thuộc chương trình bộ trích của K1,
không phải của tôi. Fail-loud đã gỡ phần *im lặng* của lỗ đó; phần *có răng* thì K1 chốt.

## 2026-09-02 — `claude-k2-design`: cổng thôi im lặng khi không so được với `origin/main`

Lỗ cùng họ với fail-open vừa vá ở `safe-push`, khác chỗ: `git()` nuốt lỗi, nên khi `origin/main`
không phân giải được thì `unpushed` **rỗng**, và cổng lặng lẽ **bỏ qua mọi commit chưa push** —
không đòi Log HANDOFF cho chúng, không quy chủ cho file trong chúng, không kích hoạt suite vì
chúng. Đo được ngay trong fixture repo rỗng: `fatal: bad revision 'origin/main'` in ra stderr rồi
mọi thứ vẫn xanh, và **không một dòng nào trên màn hình nói cho người đọc biết**.

→ Cổng nay in một khối cảnh báo ở đầu báo cáo, kèm lệnh tự kiểm. Đã ghim trong phép thử repo rỗng.

**CỐ Ý CHƯA CÓ TEETH, và nói thẳng vì sao:** chọn mốc so thay thế là một quyết định thật (gốc
lịch sử? commit đầu? bắt buộc phải có remote?). Đoán bừa một mốc thì sinh ra một cổng nói về một
phạm vi khác cái nó tưởng — tệ hơn im lặng. Việc kế cho ai làm tiếp: **chốt mốc so khi không có
`origin/main`**, rồi mới cho nó chặn.

**Số:** suite giữ **259** (phép ghim thêm vào một khối đã có).

## 2026-09-02 — `claude-k2-design`: K2-3 · nhãn `Lane:` trong commit

**Lỗi nó sửa, và nó sai theo CẢ HAI chiều.** `safe-push` quy một commit cho ai bằng cách xem
**chủ HIỆN TẠI** của vùng mà commit đó chạm. Chủ sở hữu là trạng thái **sống**; commit là chuyện
**đã qua**. Hệ quả:

- commit của **tôi** trong một vùng nay là của người khác → safe-push **từ chối việc của tôi**;
- commit của **người khác** trong một vùng nay là của tôi → safe-push coi là của tôi và
  **đẩy kèm việc của họ trong im lặng**.

Chiều thứ nhất gây chặn oan — ồn ào, ai cũng thấy. **Chiều thứ hai công bố việc chưa ai duyệt,
và không ai thấy.** Đó mới là chiều đáng sợ, và nó là ca ghim chính của phiên này.

Audit độc lập (Codex) chỉ ra đúng cặp này khi bác bản K2-2 đầu tiên. Vì thế **K2-3 đứng TRƯỚC
K2-2**, không phải sau — thứ tự tôi xếp trong bản thiết kế đầu là sai.

### Làm gì

- `laneFromMessage()` đọc trailer `Lane: <nhãn-phiên>`. **Nguồn gốc, KHÔNG phải quyền** — quyền
  vẫn ở `claims.json`, nếu không thì một phiên tự cấp phạm vi cho mình bằng cách gõ một dòng.
- Phân biệt **THIẾU** nhãn (ca thường: 509 commit lịch sử đều vậy) với nhãn **HỎNG** (rỗng, có
  khoảng trắng, hai nhãn khác nhau → không quy thuộc được, phải nói ra).
- `safe-push` quy theo nhãn khi có; **nhãn hỏng → coi là của phiên khác** (thà chặn oan mình còn
  hơn im lặng đẩy việc người khác); **thiếu nhãn → lùi về quy theo vùng, VÀ nói to là đang lùi**,
  kèm đúng dòng cần thêm. Mỗi dòng commit nay in cả **căn cứ** quy thuộc, không chỉ kết quả —
  đọc "vùng: _root [ai-đó]" mà không biết nó quy theo nhãn hay theo vùng thì không kiểm lại được.
- Cổng: phép kiểm **#10 "Nhãn lane trong commit"**. `EXPECTED_CHECKS` 9 → **10**.

### CHẾ ĐỘ CẢNH BÁO, có chủ ý

509 commit trong lịch sử không có nhãn nào, và các phiên khác đang có commit chưa push **ngay lúc
này**. Bật chặn ngay là làm đỏ cổng của người không liên quan — đúng kiểu chặn oan mà cả lớp phân
vùng này sinh ra để tránh. Nên: **nhãn hỏng thì ĐỎ** (chỉ phiên vừa gõ nó mới tạo ra được, không
có chuyện đổ oan), **thiếu nhãn thì chỉ nhắc**.

**Bật chặn là quyết định LUẬT.** Nó cần hai thứ tôi không có: một dòng trong `AGENTS.md` dạy
convention, và một cờ trong `.repo-structure.json` — **cả hai thuộc `_root`**. Việc kế cho phiên
giữ `_root`: viết convention vào mục 0 của `AGENTS.md`, rồi bật chặn khi phần lớn commit đã có
nhãn. Đừng bật khi chưa dạy.

**Số:** suite 259 → **261**. Cổng 9 → **10** phép kiểm.

## 2026-09-02 — `claude-delegation-a01`: MVP điều phối CC → GPT, Job A-01 đã nằm trong queue

**Việc:** chạy vòng delegation đầu tiên của `delegations/` (Job A-01 — nhờ GPT audit độc lập
`docs/archive/PLATFORM-AI-ORCHESTRATOR-STUDY.md`). Phạm vi phiên: CHỈ A-01.

**Kiểm chứng gốc của `delegations/` (Đức nhờ xác nhận).** 9 commit ngày 01/09 (`d8983ae` →
`12ff92a`, tác giả `J`, qua Composio) **không chạm một file nào ngoài `delegations/`** — đo bằng
`git show --numstat` từng commit. Bảy file scaffold là thêm thuần (`X 0`); ba commit sau là bản
v0.2 sửa chính file trong `delegations/`. Vậy "additive-only" đúng ở tầng repo.

**Nhưng cổng KHÔNG xanh toàn bộ, và tôi không được phép nói xanh.** `session-check --as
claude-delegation-a01`: **1 mục ĐỎ** — `DASHBOARD.md` lệch với HEAD tại dòng 18 (số phép kiểm
Observer 9 → 10). Nợ này **có trước phiên tôi**, không do `delegations/` sinh ra, và **thuộc
`_root`** — vùng tôi không giữ. Chín mục còn lại xanh; B1–B15 nhóm CHẶN đạt hết.

**Dispatch đã xong (bước 4).** Profile Chrome **kaito** (`instance 417f7af3`, extension 0.3.0,
một trong ba profile đang nối). Job `Q001`, `task_type: text_reasoning`, prompt **nguyên khối
506 ký tự** lấy máy móc từ `A-01/TASK.md` (đối chiếu lại qua `queue-list --include-prompt`:
khớp từng ký tự, `prompt_fingerprint sha256:ph1WwhRLA7lgk2sVCWQu9dcaE60P8j7LmOlh7wh41GA`).
Workbook in-memory `Bridge-2026-09-02T16-16__results__v01.xlsx`, checkpoint v1 `verified: true`,
run `20260902-1616-bridge-2026-09-02t16-16`. **Chưa gửi gì tới ChatGPT, chưa tốn lượt nào.**

Dùng `jobs.add` chứ không `queue.propose` **vì propose đòi `if_ledger_etag`, mà lúc đó chưa có
workbook nào** (`WORKBOOK_NOT_LOADED`) — `jobs.add` là lệnh duy nhất tự dựng được session. Ranh
giới HARD của PLAYBOOK vẫn nguyên: **Đức bấm Run**, không có `run.start` trong V1.

**Hai lỗi thật gặp trên đường, cả hai đã có trong bảng lỗi:** `ping` đầu tiên trả
`RECEIVER_LOST` (lỗi #1 — reload extension không nạp lại content script) → `chat.reload` chữa
xong trong 1,9 giây. Sau đó `WRONG_SURFACE` (lỗi #2) vì tab kaito đang ở `chatgpt.com/` trang
chủ. Phép kiểm 02/09 làm đúng việc của nó: **chặn trước khi chạm trang**, không tiêu lượt nào.

**CÒN MỞ — hai việc, cả hai cần tay Đức:**
1. Tab ChatGPT của profile **kaito** phải bấm vào một hội thoại thật (`chatgpt.com/c/...`) rồi
   bấm **Run**. Job đã sẵn trong Setup.
2. **`_root` đang bị giữ chết.** Chủ là `claude-bridge-multiprofile`, ghi chú của họ là "GIU DEN
   KHI PUSH XONG… Trả ngay sau push" — mà commit của họ (`fe3fbed`, `32a97cd`, `1e407e3`) **đã
   nằm trong `origin/main`**, tức đã push rồi mà chưa trả quyền. Tôi **không tự lấy** (luật mục 1)
   và `claim.mjs` cũng từ chối trả quyền hộ. Chưa có `_root` thì tôi không ghi được
   `A-01/TASK.md` (dấu Gate 0), `RESULT-DIGEST.md`, `RUN-LOG.json`, `LESSON-INBOX.md`, và không
   sinh lại được `DASHBOARD.md` để chữa mục đỏ.

### Phụ lục: khi nào trang máy sinh mới thật sự mục — đọc trước khi sinh lại hai lần

Phiên này tưởng phải sinh lại `DASHBOARD.md` **hai lần** (một lần cho phiên K1, một lần sau khi
tôi commit `RUN-LOG.json`). Đọc code thì sai: `isBehaviourFile()` trong `build-dashboard.mjs`
chỉ tính đuôi `.js .mjs .json .html .css` **và loại vùng bằng chứng ra**. Cột "File test [ĐO]"
thì đếm **số file test**, không đếm commit.

Rút ra, dùng được cho mọi phiên sau:

- Commit **toàn `.md`** không làm trang mục. Ghi HANDOFF, sửa ADR, viết study — sinh lại xong thì
  cứ commit tiếp, trang vẫn tươi.
- Trang mục khi có file `.js/.mjs/.json/.html/.css` **vào hay ra khỏi** HEAD, hoặc khi số file
  test đổi. **Sửa nội dung** một file test đã có thì cột đếm KHÔNG đổi.
- Nên thứ tự đúng vẫn là "commit nguồn trước, sinh artifact sau" — nhưng chỉ cần **một** lần
  sinh, đặt sau commit nguồn cuối cùng có đuôi thuộc danh sách trên.

Phiên K1 ban đầu đọc cột đó là "số commit" và đã báo con số ấy cho Đức; họ tự đọc diff, tự đính
chính, và sửa cả chỗ đã báo sai. Ghi lại vì cái bẫy nằm ở chỗ **tên cột đúng mà người đọc vẫn
hiểu sai** — `9 → 10` sau hai commit thì trông y như đếm commit.

**Và một lỗi của chính tôi trong cùng phiên, cùng hình dạng:** tôi khuyên phiên K1 ghi nợ vào
`BACKLOG.md` ở gốc repo, "thuộc `_code`". Sai cả hai vế — **`BACKLOG.md` ở gốc không tồn tại**
(chỉ có bản trong từng worker), và mọi file ở tầng ngoài cùng đều thuộc `_root`, không phải
`_code`. `stewardOf` là câu trả lời duy nhất đáng tin: `tests/` và `scripts/` mới là `_code`.
Bài học: **đừng khuyên phiên khác ghi vào một đường dẫn mình chưa `ls`**, và đừng suy quyền sở
hữu theo trực giác khi có một hàm trả lời được. Lưu ý khi tự kiểm: `stewardOf(relPath, parsed)`
cần truyền `.repo-structure.json` vào — gọi thiếu tham số thì nó trả `_root` cho mọi thứ, và
tôi đã tự lừa mình đúng một lượt vì thế.
