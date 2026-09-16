---
kind: independent-review
topic: context-compiler-v1
reviewer: claude-context-review (independent architecture challenger)
reviewed_sha: 364c69326437d66afcf64a4244bf0cad7dab0fb2
reviewed_file: CONTEXT-COMPILER-V1-PROPOSAL.md (850 dòng, đọc từ origin/main)
created: 2026-09-09
authority: none
note: "Review, không phải luật. Không implement gì. Mọi con số dưới đây do tôi ĐO lúc review — đo lại bằng lệnh kèm theo, đừng dẫn lại."
---

# REVIEW — Context Compiler V1

Đọc trước khi review: `AGENTS.md` · `docs/protocols/RULE-COMPILER.md` · `MULTIFLOW.md` 3a–3b ·
`ORCHESTRATOR.md` 0e/1b/2/3/4 · `docs/protocols/HANDOFF.md` · `workers/_shared/LUAT-CORE.md` ·
`workers/duc-scouter/v0.1.0/PHIEN.md` (PHIEN thật) · `.repo-structure.json` (`luat.*`, `areas`,
`generated`) · `scripts/rule-compile.mjs` (bộ sinh PHIEN) · `scripts/session-check.mjs` (thước bó) ·
`scripts/check-bootstrap.mjs` · `tests/role-firewall-smoke.mjs`. `draft.md` chỉ tra reasoning.

---

## A. VERDICT

**Chẩn đoán đúng. Phần cắt (read-only, không LLM, reuse PHIEN, không preload claims) đúng.
Nhưng V1 như đang khai thì LÀM NẶNG THÊM đúng cái nó định chữa, và nó không cần là một Router.**

Ba câu:

1. **Manifest V1 không đo và không chặn.** §11 cố ý bỏ token estimate; §22 đẩy đo sang Phase 2.
   Trong repo này, cơ chế duy nhất thật sự chặn phình là **trần CỨNG lúc SINH, từ chối ghi**
   (`PHIEN_QUA_TRAN`, `scripts/rule-compile.mjs:527`). Thước chỉ báo thì bị nâng — chính
   `.repo-structure.json` ghi lại lượt nâng `docs.tran_dong_khong_ke_adr` 9.185 → 9.340 hôm nay.
   Một cơ chế mới **sinh ra "thứ bắt buộc phải nạp"** mà không mang con số là một kênh phình mới
   không có máy canh.
2. **`projection: "full"` đi LÙI so với luật đang có.** `AGENTS.md` mục 8 và `LUAT-CORE.md` đã chỉ
   định **`MULTIFLOW.md` mục 3a–3b** (đo: 4.122 ký tự = 21% file). Proposal §9.3 khai `full`
   (20.042) và §20 đẩy section projection sang V1.1. Section projection **không phải tính năng
   mới — nó là hợp đồng hiện hành**, và bỏ nó là ×4,9 trên nguồn conditional nặng nhất.
3. **Phần thật sự thiếu và thật sự đáng làm không phải Router.** Đó là: PHIEN hôm nay
   **không có cổng nào canh stale**, và bảng "đọc gì trước khi làm gì" đang tồn tại **hai bản
   prose** (`AGENTS.md` mục 8 + `LUAT-CORE.md` mục cuối) — thêm `context-registry.json` là **bản
   thứ ba sẽ lệch**, đúng thứ `ROADMAP.md` cấm.

Khuyến nghị: **không build Context Router như §4/§10/§11.** Tách V1 thành ba việc rời, nhỏ hơn
nhiều, giữ nguyên safety — mục E.

Trả lời 7 câu §23: ①có failure mode, xem F3/F6 · ②sạch, và §12 là kết luận mạnh nhất của proposal
· ③thiếu 4 class, xem F8 · ④nguyên tắc đúng, chỗ đo sai — F9 · ⑤có, F3+F4+F7 · ⑥không phải quá
nhỏ mà **quá to** — cut đúng nhỏ hơn nữa · ⑦có, F5 là chỗ nặng nhất.

---

## B. FINDINGS

Mức: **CAO** = sai/chặn thật · **TRUNG** = sẽ lệch hoặc thiếu · **THẤP** = dọn · **BLOAT** = bỏ được.

### F1 · CAO · `projection: "full"` mandate ×4 ngân sách bó mở phiên

Đo lúc review:

| | ký tự |
|---|---:|
| `CLAUDE.md` (định tuyến) | 565 |
| PHIEN nặng nhất (`duc-scouter`) | 5.965 |
| **bó mở phiên hiện tại** | **6.530** |
| trần CỨNG `luat.phien_goi.tran_ky_tu` | 6.600 |
| biên (đích thật) `bien_ky_tu_mot_goi` | 4.400 |
| `MULTIFLOW.md` full | 20.042 |
| `MULTIFLOW.md` **mục 3a–3b** (thứ luật đang bắt đọc) | **4.122** |
| manifest `commit.prepare` theo §9.3 (`full`) | **26.572** |
| manifest `orchestration=true` theo §8 (`full`) | **37.568** (~17.000 token) |

Bó mở phiên đang **đúng sát trần** và **48% trên biên**. Router V1 với `full` phát ra manifest
gấp **4×** (commit) và **5,8×** (điều phối) trần đó, rồi gọi nó `READY`.

Bằng chứng: `AGENTS.md` mục 8 hàng *"Nhận khoá · commit · đóng phiên"* → ghi rõ `mục 3a–3b` ·
`workers/_shared/LUAT-CORE.md` mục *"Cần thêm thì mở"* → `MULTIFLOW.md 3a–3b` ·
proposal §9.3 `"projection": "full"`, §14, §20.

Đo lại: `node scripts/session-check.mjs` (in số sống) và `node -e` đọc `.length` từng file —
**ký tự, không byte**: tiếng Việt có dấu là multi-byte, `wc -c` thổi phồng ~25%.

### F2 · CAO · Manifest không mang con số, không có cửa BLOCKED vì ngân sách

§11 loại token estimate khỏi first slice; §13 danh sách hard-stop **không có** mục "vượt trần
nạp". Repo thì ngược lại: `luat.nap` có **ba** con số cho mỗi thước (trần/đích/biên, ADR-0033 ⑴),
và `--sinh` **từ chối ghi** khi vượt.

Hệ quả: Router thành nơi duy nhất trong repo được phép nói "bắt buộc nạp X" mà không phải trả
giá — và `AGENTS.md` mục 7 luật 3 (*một luật vào thì một luật ra*) không áp được vào nó.

Bằng chứng: `scripts/rule-compile.mjs:517–535` (`PHIEN_QUA_TRAN`) · `.repo-structure.json`
`luat.nap` + `luat.phien_goi.tran_ky_tu` + `docs._vi_sao_nang_0909` · proposal §11, §13, §22.

### F3 · CAO · `product` + PHIEN missing → `BLOCKED` chặn hai đường ghi hợp pháp

`luat.phien_goi.goi` chỉ có **4** gói. Thực tế trên đĩa:

| vùng | STATUS.md | AGENTS.md | PHIEN.md |
|---|---|---|---|
| `workers/duc-scouter/v0.1.0` | Y | Y | Y |
| `workers/duc-auto-gemini/v0.2.0` | Y | Y | Y |
| `workers/duc-auto-gg-flow-video/v0.1.0` | Y | Y | Y |
| `workers/duc-auto-chatgpt/v0.1.0` | Y | Y | Y (**chưa commit**) |
| `workers/hnx-fetch/v0.1.0` | Y | **N** (nằm ở `workers/hnx-fetch/`) | **N** |
| `workers/_shared/` | **N** | Y | **N** |

`AGENTS.md` mục 7 luật 1 **BẮT BUỘC** đi qua `workers/_shared/` khi một tính năng cần ở hai gói.
Proposal §8 (*PHIEN missing → BLOCKED, không fallback*) chặn đúng con đường mà hiến pháp bắt đi.
`hnx-fetch` còn lệch một cấp: unit là `v0.1.0` (`units.depth: 2`) nhưng `AGENTS.md`/`PROTOCOL.md`
của nó ở cấp trên — nên "resolve PHIEN từ topology/unit mapping" (§8) không well-defined.

Bằng chứng: `.repo-structure.json` `luat.phien_goi.goi`, `units`, `luat.ra_soat` (khai
`workers/hnx-fetch/AGENTS.md`, không phải `.../v0.1.0/AGENTS.md`) · `AGENTS.md` mục 7 luật 1 ·
`AGENTS.md` mục 8 hàng HNX.

### F4 · CAO · `rule.change` không phải single-scope — nó là write ĐA VÙNG, và taxonomy che mất

`node scripts/rule-compile.mjs --sinh` ghi vào **7 file thuộc 5 vùng khoá khác nhau**:
3 × `decisions.md` (`luat.khoi_sinh`) + **4 × `PHIEN.md`** trong 4 gói.

`PHIEN.md` **không** nằm trong khối `generated` của `.repo-structure.json`
(`DASHBOARD.md`, `llms.txt`, `repo-map.json`, `DASHBOARD-*.html`, `FEATURE-PARITY-AUTO.md`) và
**không** có trong `GENERATED_FILES` của `scripts/check-bootstrap.mjs:50`. Theo `MULTIFLOW.md`
mục 3a, miễn khoá **chỉ** áp cho khối `generated` → chạy `--sinh` đòi khoá **4 vùng gói**.

Đây là **một lỗ đang sống của repo, không chỉ của proposal**: hôm nay một lane đổi luật là ghi
vào bốn gói của người khác mà không có gì kêu. Với proposal, nó là bằng chứng rằng §6 trình bày
`rule.change` như operation nhắm vào "file luật" trong khi actual scope là toàn repo. §7 (evidence
precedence) đúng về nguyên tắc, nhưng §17 test corpus không có case này.

Bằng chứng: `scripts/rule-compile.mjs:496–545` · `.repo-structure.json` `generated`, `luat.khoi_sinh`,
`luat.phien_goi.goi` · `MULTIFLOW.md` mục 3a (*"Artifact máy sinh KHÔNG đòi khoá nào — khai ở khối
`generated`"*) · `RULE-COMPILER.md` mục 2 bước 6 (*"Phải đang giữ khoá vùng"*).

### F5 · TRUNG-CAO · Registry §9.2 là **bản thứ ba** của một bảng đã có hai bản, một bản đã bị máy ghim

`workers/_shared/LUAT-CORE.md`, mục cuối — **và `rule-compile --sinh` chép nó vào MỌI `PHIEN.md`**:

> `AGENTS.md` gốc (luật đầy đủ) · `MULTIFLOW.md` 3a–3b (khoá, đóng phiên) · `RULE-COMPILER.md`
> (đổi luật/trần) · `AGENTS.md` gói (bản đồ file) · `HANDOFF.md` gói (phiên trước vấp gì).

Đó **chính là** `operation → mandatory conditional source` mà §9.2 định khai lại. `AGENTS.md`
mục 8 là bản thứ hai, rộng hơn (thêm ORCHESTRATOR, PLATFORM, hnx PROTOCOL, ROADMAP/what-next,
docs/README) — và hàng ORCHESTRATOR của nó **đã được `tests/role-firewall-smoke.mjs:255–269`
ghim** (bắt buộc còn con trỏ, bắt buộc nói `HARD ROLE FIREWALL`, bắt buộc nêu luật năm mục).

`ROADMAP.md` dòng 139: *"Đừng chép chúng xuống đây — chép là đẻ ra bản thứ hai sẽ lệch."*

→ Registry chỉ đáng tồn tại nếu nó là **nguồn**, và hai bảng prose được **SINH RA** từ nó
(đúng mô hình `--sinh` đã chạy cho `decisions.md`/`PHIEN.md`). Registry thứ ba song song = lệch.

### F6 · TRUNG · Open question #2 không phải open — 15 dòng, và tôi đã chạy nó

`sinhPhienGoi()` là **pure và đã export** (`scripts/rule-compile.mjs:413`). Staleness check
deterministic, read-only, không cần fingerprint thứ hai: sinh lại trong bộ nhớ, so với đĩa.
Chạy lúc review — cả 4: **CURRENT**.

Nhưng đây mới là chỗ đáng làm: **`rule-compile.mjs` không có trong `generators`, `PHIEN.md` không
có trong `generated`** → phép kiểm "artifact máy sinh còn tươi" của cổng đóng phiên
(`checkGeneratedFreshness`, B8/B13) **không phủ PHIEN**. Cộng hai failure mode thật của bộ sinh:
`THIEU_LUAT_VANG` và `PHIEN_QUA_TRAN` đều `continue` — **PHIEN cũ nằm lại trên đĩa** và phiên sau
mở nó như bootstrap hiện hành. Và `workers/duc-auto-chatgpt/v0.1.0/PHIEN.md` **đang untracked**.

→ Fix đúng chỗ là **thêm PHIEN vào phép kiểm tươi**, không cần Router.

Bằng chứng: `scripts/rule-compile.mjs:413`, `:505`, `:527` (cả hai `continue`) ·
`scripts/check-bootstrap.mjs:50`, `:717` · `.repo-structure.json` `generators`/`generated` ·
`git status` (PHIEN chatgpt = `??`).

### F7 · TRUNG · Orchestration bootstrap thiếu 3 nguồn bắt buộc thật

`ORCHESTRATOR.md` mục 1b bắt **hai lệnh** rồi mới đọc luật:

```bash
node scripts/what-next.mjs        # bản đồ việc — chỉ đọc, không đòi khoá
node scripts/claim.mjs --list     # bảng quyền, trạng thái sống
```

…rồi `AGENTS.md` **và phần cuối** `HANDOFF.md` gốc. Proposal §8 chỉ khai `root AGENTS +
ORCHESTRATOR.md`. Hai lệnh kia đúng là loại evidence mà chính §7 xếp **cao nhất** (*actual
repo/tool state*), và mục 1b nói rõ **đừng dựng lại bản đồ đó bằng mắt**. Bỏ chúng khỏi manifest
là làm rơi phần duy nhất orchestrator không được suy diễn.

### F8 · TRUNG · Taxonomy thiếu 4 operation class thật

1. **`handoff.write` / đóng phiên.** `MULTIFLOW.md` 3b là thứ tự hỏng nhiều nhất
   (*sinh artifact → commit → suite CUỐI CÙNG*), và nó có trần riêng
   (`handoff.tran_so_muc` = 25 mục, 2.600 byte/mục) + cổng đếm thật `HANDOFF_QUA_DAY`.
   `commit.prepare` không phủ được nó.
2. **`generate.artifact`.** `MULTIFLOW.md` 3b: **hai lớp bộ sinh chạy khác nhau** — lớp tự do
   (`build-dashboard`, `feature-parity`, `build-overview`) chạy lại tuỳ ý; lớp ghi vào **sổ CÓ
   RÀNG BUỘC** (`handoff.mjs --cat`, `rule-compile --sinh`) chạy **ĐÚNG MỘT LẦN**. Đó là một
   operation class riêng với luật riêng, và `rule.change` của §6 nuốt lẫn nó (xem F4).
3. **`audit.independent`.** `AGENTS.md` mục 5: *cấm tự ký nghiệm thu bản sửa của chính mình*;
   mục 3: code thì đẩy phải có **audit độc lập**. Đó là operation có luật riêng, không phải
   `verify.run`.
4. **`backlog.write` / gửi yêu cầu hạ tầng.** `AGENTS.md` mục 6: sản phẩm cần sửa hạ tầng thì
   **GỬI YÊU CẦU** (một dòng `BACKLOG.md` kèm `đóng khi:`), **không tự lấy vùng** —
   `npm run test:backlog` kiểm được. Đây đúng là loại thứ Router nên chặn.

`live.run` và `permission.change` trong enum thì đúng và khớp `AGENTS.md` mục 4.

### F9 · TRUNG · `effective_action_scopes`: nguyên tắc đúng, chỗ đo sai

§7 đúng (actual git scope thắng `focus_scope`). Nhưng repo **suy vùng từ ĐƯỜNG DẪN**
(`ORCHESTRATOR.md` mục 2: *"Vùng của một việc suy từ đường dẫn, không ai khai tay"*) và
`claim.mjs --soat` **đã là cổng bắt buộc trước `git commit`** — nó đã tính effective scope từ
staged paths, và nó là bản **chặn được**. Router tính lại lần hai sinh ra hai bản có thể lệch,
và bản của Router không chặn gì.

→ `effective_action_scopes` phải là **output của `--soat`**, hoặc bỏ khỏi manifest.

### F10 · THẤP · `context-registry.json` ở root đội thêm một file tầng LAW

`.repo-structure.json` đã là tầng LAW và đã mang `luat.nap`, `luat.phien_goi`, `luat.khoi_sinh`,
`areas`, `handoff`, `bootstrap`, `generated`. Lý lẽ §9.1 (vendor-neutral · không chiếm `.agents/`
· không biến `docs/` thành config store · chỉ cần một file canonical nhỏ) **đã thoả hết** bởi
file đang có. `REPO-STRUCTURE-SPEC-V1` mục 1 cấm trộn **LAW với STATE**, không cấm LAW + LAW.

→ `luat.context` trong `.repo-structure.json`: dùng lại luôn `_fail_closed` của `bootstrap`
(thiếu khối → thoát mã 2, cổng ĐỎ), B3, và cả bộ validator đang có.

### F11 · THẤP · Conflict detection dựng cơ chế thứ hai, mức ngược với cơ chế đang có

§13 để *"canonical authority conflict"* ở **hard-stop (ĐỎ)**. Repo đã có phép đo cho đúng việc
đó — `LUAT_TRUNG` (hai dòng luật cùng vân tay) — và nó **cố ý để VÀNG**, lý do viết rõ:
ADR-0027 ⑶, *"một cổng đỏ vì mùi là một cổng sẽ bị tắt"*. `RULE-COMPILER.md` mục 2.4 đã có thứ
tự ưu tiên và đã bắt **DỪNG, hỏi Đức** khi đá với bất biến cứng.

→ Bỏ conflict detection khỏi V1. Nếu vẫn muốn: nó thuộc `rule-compile.mjs`, không thuộc Router.

### F12 · BLOAT · Chưa có evidence, bỏ được ngay

| Bỏ | Vì |
|---|---|
| `schema_version` (cả descriptor và manifest) | chưa có V2, chưa có consumer ngoài quá trình |
| `route_evidence[]` | không ai đọc; log là chỗ của nó |
| `retain: "while_operation"` | V1 read-only không có runtime nào để retain |
| `warnings[]` + `conflicts[]` tách hai mảng | một mảng có `level` là đủ — đúng mẫu ĐỎ/VÀNG đang dùng |
| `risk` derived class | đã có: `bootstrap.blocking` + `RED`/`WARN` của `check-bootstrap` |
| `label` | §5 nói rõ *không tham gia routing* → bỏ khỏi contract, để trong log |
| `status: READY/WARN/BLOCKED` | enum ba mức chỉ có nghĩa khi có **máy** tiêu thụ. V1 không có — xem E |
| Phase 3 (4 adapter) · Phase 5 | chưa có số đo, và §16 tự nhận capability của 3/4 runtime là phỏng đoán |
| `authority: "canonical"` field | mọi entry trong registry mandatory đều canonical → field hằng số |

---

## C. KEEP — giữ nguyên, đừng bàn lại

1. **A1 — reuse `PHIEN.md`, không build startup compiler lần hai.** Đúng, và đúng hơn proposal
   tưởng: hợp đồng bó mở phiên **đã là config + cổng**, không phải chỉ prose —
   `luat.nap.mo_phien_goi` được ghim với `AGENTS.md` mục 1 và được đo trong
   `scripts/session-check.mjs:1070–1105`.
2. **A2 + §12 — không preload `.agents/claims.json`, ownership xác minh ở action boundary.**
   Đây là kết luận **mạnh nhất** của cả proposal. Bất biến tổng quát ở §12 (*"sự thật chỉ cần để
   máy quyết action có được phép hay không → deterministic enforcement, không preload"*) đáng lên
   ADR **độc lập với việc có build Router hay không**.
3. **A5 — caller không được tự khai `risk`/`required_context`/`scopes`.** Đúng, và khớp
   `AGENTS.md` mục 5 (*"Tin báo cáo của AI khác"* — cấm).
4. **A6 — không NLP/LLM trong đường routing.** Giữ tuyệt đối.
5. **A9 — summary là cache, canonical source là authority.** Khớp ADR-0034/0035 và khớp
   `ORCHESTRATOR.md` mục 3 (*"Đừng kể lại `HANDOFF.md` — đó là lịch sử, không phải trạng thái"*).
6. **§19 rejected list.** Mọi mục trong đó đáng bị loại. Đặc biệt: `source_ref`/`rule://`,
   `claims.scope_current` projection, LLM semantic compression, giant catalog.
7. **§15 — compact bắt đầu bằng durable checkpoint, không bằng summary.** Đúng, và đây là phần
   nên làm **trước** Router nếu phải chọn một (xem E).
8. **§7 thứ tự evidence precedence.** Đúng nguyên tắc (chỉ sửa chỗ ĐO — F9).

---

## D. CHANGE / REMOVE

### Đổi

| # | Đổi gì | Thành |
|---|---|---|
| D1 | §9.3 `projection: "full"` | `source#section` là **mặc định**, `full` là ngoại lệ phải nói lý do. Section projection **không phải V1.1** — nó là hợp đồng `AGENTS.md` mục 8 đang có (F1) |
| D2 | §11 manifest không có token estimate | Mỗi entry mang `chars`; manifest mang **tổng**; vượt trần khai ở `luat.nap` là **BLOCKED**, không WARN. Đo bằng `.length` (ký tự), không `wc -c` (F2) |
| D3 | §8 `PHIEN missing → BLOCKED` | Khai tường minh **non-PHIEN scope hợp lệ** (`workers/_shared/`, `workers/hnx-fetch/`) trong config, hoặc thêm chúng vào `luat.phien_goi.goi`. BLOCKED chỉ khi scope **có** khai PHIEN mà PHIEN thiếu/stale (F3) |
| D4 | §6 `rule.change` | Tách `generate.artifact` (lớp có ràng buộc, chạy đúng một lần, đa vùng) khỏi `rule.change`; thêm `handoff.write`, `audit.independent`, `backlog.write` (F4, F8) |
| D5 | §9.1 `context-registry.json` ở root | `luat.context` trong `.repo-structure.json`, thừa hưởng `_fail_closed` + validator + B3 đang có (F10) |
| D6 | §9.2 registry là bảng mới | Registry là **NGUỒN**; `LUAT-CORE.md` mục cuối và `AGENTS.md` mục 8 **sinh ra từ nó** qua `--sinh` (F5) |
| D7 | §8 orchestration bootstrap | Thêm `what-next.mjs` + `claim.mjs --list` + phần cuối `HANDOFF.md` gốc (F7) |
| D8 | §11 `effective_action_scopes` | Lấy từ `claim.mjs --soat`, không tính lần hai (F9) |

### Bỏ

- **Conflict/authority detection** (§13 hard-stop, `authority` field) — F11.
- **Toàn bộ F12.**
- **`status` enum ba mức + Task Descriptor JSON + Context Manifest JSON** — không có consumer
  trong V1 (mục E).
- **§16 Runtime adapter strategy + §22 Phase 3/Phase 5** — chưa có số đo; §16 tự nhận capability
  của 3/4 runtime là phỏng đoán.

---

## E. REVISED ARCHITECTURE

Cần, và nó **nhỏ hơn** proposal. Nguyên tắc: **V1 không phải một Router. V1 là ba việc rời, mỗi
việc đóng một lỗ đo được.** Router chỉ đáng sinh ra khi có một **máy** tiêu thụ manifest — V1
không có, nên `READY/WARN/BLOCKED` và hai schema JSON là contract cho một consumer chưa tồn tại.

```text
V1a — VÁ LỖ ĐANG CHẢY  (nửa ngày, không kiến trúc mới)
  PHIEN vào phép kiểm "artifact máy sinh còn tươi"
    · rule-compile.mjs -> generators ; PHIEN.md -> generated
    · staleness = sinhPhienGoi() trong bộ nhớ, so đĩa   (đã export, pure, đã chạy được)
    · THIEU_LUAT_VANG / PHIEN_QUA_TRAN không được `continue` im lặng
    · trả lời luôn: PHIEN có được miễn khoá không  -> BLOCKER 3
  Đóng: F6, một nửa F4

V1b — MỘT BẢNG, KHÔNG BA  (một ngày)
  luat.context trong .repo-structure.json:  operation -> [source#section] + chars
    · LUAT-CORE.md mục cuối  } SINH RA từ nó, đúng mô hình --sinh đang chạy
    · AGENTS.md mục 8        }
    · trần cho tổng conditional; vượt là bộ sinh TỪ CHỐI GHI, không cảnh báo
  Đóng: F1, F2, F5

V1c — MỘT LỆNH CHỈ ĐỌC, IN RA CHỮ  (một ngày)
  node scripts/context.mjs --viec commit.prepare --nhu <lane> [--vung <path>...]
    -> in: bootstrap file (đo) · required-now source#section (đo) · TỔNG · thiếu gì
    -> exit 0 / 1                      (không JSON, không enum ba mức, không descriptor)
  Người/AI đọc trực tiếp. Có máy tiêu thụ rồi mới đẻ manifest.
  Đóng: F3, F7, F8 (taxonomy sống trong bảng V1b, không trong code)

SAU V1 — theo đúng §15, KHÔNG theo §16
  durable checkpoint -> canonical source ngay khi việc xảy ra
  (đây là phần proposal đúng nhất mà lại xếp sau, trong khi nó không phụ thuộc Router)

KHÔNG LÀM: adapter cho 4 runtime · projector framework · Context Delta · conflict engine
```

Vì sao lazier mà vẫn giữ safety: mọi authorization/safety vẫn nằm nguyên ở `claim.mjs` ·
`--soat` · `session-check` · `safe-push` · suite (§12/A2 giữ nguyên). Ba việc trên **không** chạm
tới chúng — chúng chỉ (a) làm PHIEN không stale được nữa, (b) làm bảng "đọc gì trước" có **một**
bản có máy canh, (c) trả lời câu hỏi của §0 bằng một lệnh in ra chữ. Và khác proposal ở đúng
chỗ quan trọng: **mọi thứ V1 phát ra đều mang con số và đều đi qua một trần chặn lúc sinh.**

---

## BLOCKER — cần Đức quyết, không ai quyết thay

1. **`N-51` vẫn đang chờ Đức** (`BACKLOG.md`, mục `N-51`) — *"đổi giới hạn ③ từ `docs/ ≤ 8.000`
   sang `nhóm luôn-nạp ≤ 1.500 dòng`"*. Proposal **không nhắc N-51 một lần nào**. Không chốt
   N-51 thì Router không có trần để chặn, và F2 không đóng được. **Đây là blocker thật, đứng
   trước cả V1a.**
2. **Trần cho phần conditional (`REQUIRED-NOW`) là bao nhiêu?** Bó mở phiên đã có trần cứng
   6.600. Phần "đọc thêm theo việc" hiện **không có trần nào**, và `MULTIFLOW` mục 3a–3b (4.122)
   đã bằng 62% cả bó.
3. **`PHIEN.md` có vào khối `generated` (⇒ miễn khoá, mọi lane sinh lại được) hay giữ ngoài
   (⇒ phải giữ khoá 4 gói mới chạy được `--sinh`)?** Một dòng, và nó chặn F4 + V1a.
4. **`workers/_shared/` và `workers/hnx-fetch/` có PHIEN không?** Thêm vào `luat.phien_goi.goi`,
   hay khai chúng là non-PHIEN scope hợp lệ (F3).
5. **Có build Router như một contract JSON (proposal §5/§11), hay chỉ một lệnh chỉ đọc in ra chữ
   (mục E)?** Tôi khuyến nghị mục E: JSON contract cho một consumer chưa tồn tại là thứ sẽ phải
   viết lại khi consumer thật xuất hiện.

---

## Ghi chú kỹ thuật cho lane GPT

- Proposal đọc từ `origin/main` **không merge** — `main` local đang sau `origin/main` **3 commit**
  (`364c6932`, `9729fd31`, `ffc7b56a`) và trong cây làm việc có **8 file chưa commit của lane
  `duc-auto-chatgpt`** + `.agents/claims.json` đang sửa. Không `git checkout`/`stash`/`pull` gì.
- **Đo bằng ký tự (`.length`), không bằng byte (`wc -c`).** Bộ sinh và cổng đều dùng `.length`;
  tiếng Việt có dấu là multi-byte nên `wc -c` thổi phồng ~25%. Con số trong review này là ký tự.
- Đừng dẫn lại con số ở đây sau hôm nay — `node scripts/session-check.mjs` in số sống
  (`AGENTS.md` mục 7 luật 2: *"Con số hôm nay do cổng in ra, đừng gõ vào đây"*).
