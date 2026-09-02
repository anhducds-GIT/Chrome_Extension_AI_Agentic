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
