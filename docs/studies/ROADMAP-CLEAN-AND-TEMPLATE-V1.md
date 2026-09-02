---
kind: study
status: active
ttl_days: 180
---

# ROADMAP-CLEAN-AND-TEMPLATE-V1

> **File điều hành.** Đức chỉ cần mở file này. Bốn file kia là hồ sơ, đọc khi cần chứng cứ.
> **Điều phối:** Claude (phiên chat này và các phiên kế tiếp).
> **Lập:** 2026-08-31, trên commit `b5430f9`.

> **Vị trí của file này trong bức tranh lớn (bổ sung 2026-09-02).** Roadmap này là **một làn**,
> không phải toàn bộ kế hoạch. Nó lo **repo Chrome Extension — nơi thí điểm và nuôi template**.
> Song song có làn **HARNESS** ở Kho (Project-3): 21 repo, `sync_manifest.json`, verifier
> `harness_parity_check.py` — GPT chạy, Đức duyệt từng diff. Thứ tự tổng của cả hai làn nằm ở
> mục E (14 bước) của `evidence/20260901-harness-audit-r01/AUDIT-GPT.md`; trong đó S1→S7 của
> file này là bước 6A và 7.
>
> **Khi hai tài liệu mâu thuẫn: 14 quyết định K0 thắng** (Đức chốt 2026-09-01, sau file này).
> Ai sửa roadmap thì đối chiếu K0 trước.

---

## 0. Bộ tài liệu — file nào để làm gì

| File | Vai | Khi nào mở |
|---|---|---|
| **ROADMAP-CLEAN-AND-TEMPLATE-V1** (file này) | điều hành | mỗi phiên |
| `RESTRUCTURE-PLAN-V1` | chi tiết 7 giai đoạn | khi cần chi tiết một GĐ |
| `BENCHMARK-REPO-STANDARDS-V0` | chứng cứ chuẩn ngành | khi ai đó hỏi "vì sao làm vậy" |
| `PROGRAM-MAP-V1` | bản đồ 7 luồng việc | khi phân bổ ưu tiên |
| `REPO-BOOTSTRAP-SPEC-V0` · `FOLDER-STANDARD-STUDY-V0` | hồ sơ nghiên cứu | hiếm khi |

Bốn file sau vào `docs/studies/` ở phiên S1, có frontmatter đầy đủ. **Không để ở `drafts/`.**

---

## 1. Điều chỉnh quan trọng: template trích xuất SONG SONG

Trước đây tôi đề xuất làm template sau khi xong hết. Sai — sẽ phải làm lại từ đầu.

Cách đúng: **mỗi phiên sinh ra một artifact chuẩn thì trích ngay vào bộ template.**
Tới phiên cuối là template đã có sẵn, chỉ việc đánh dấu "đã kiểm chứng".

> **⛔ ĐÃ BỊ THAY THẾ 2026-09-02 bởi [ADR-0001](../adr/0001-template-o-repo-doc-lap-project-3ai-nghi.md).**
> Đức chốt: template **ở một repo độc lập**, Project 3AI kết thúc vai trò và có thể archive.
> Giữ nguyên đoạn dưới làm bản ghi lịch sử — đừng làm theo nó.
>
> **⚠️ ĐÃ ĐỔI 2026-09-01 — template KHÔNG còn là một repo riêng.**
> Quyết định K0 số 1 (Đức chốt nguyên trạng; hồ sơ tại `evidence/20260901-harness-audit-r01/`):
> **huỷ repo `repo-template` độc lập**; artifact nào đã kiểm chứng thì **promote vào Kho
> (Project-3) ở tier `SEED`** của `sync_manifest.json`. Lý do: dựng một repo template riêng
> tạo nguồn sự thật thứ hai bên cạnh Kho — đúng cái bệnh cả chương trình này sinh ra để chữa.

Chống rủi ro nhân bản thiết kế chưa thử: artifact trích ra mang nhãn **`unproven`** cho tới khi
bài test một dòng (S7) đạt. Trong lúc mang nhãn `unproven`, **không promote lên tier `SEED`
và không dùng cho dự án thật.**

---

## 2. Phân vai

| Ai | Việc | Không làm |
|---|---|---|
| **Claude (điều phối)** | Viết brief, audit độc lập, vận hành Bridge, cập nhật roadmap này | Viết code sản xuất |
| **Codex** | Viết code theo brief: script, cổng kiểm | Tự đổi phạm vi |
| **Claude Code** | Sửa file tài liệu, di dời file, chạy cổng kiểm, push | Push khi cổng đỏ |
| **Đức** | MỞ · GIAO · NGHIỆM · CHỐT | Đọc code |

Luật giao chéo: nếu một phiên phải làm việc của vai khác, **nói rõ vì sao** trong `HANDOFF.md`.

---

## 2b. Yêu cầu bổ sung — bảng vận hành dựng sẵn ở MỖI repo

> **Đức chốt 2026-09-02.** Chuẩn không dừng ở "máy đọc được". Cả repo Chrome lẫn Kho đều phải
> mang được bảng điều hành của chính nó, nối đủ dữ liệu, có hook cưỡng chế, và sổ tay cho AI.

Bốn tầng, là **một bộ** — thiếu tầng nào thì tầng trên nói dối:

| Tầng | Repo Chrome | Kho |
|---|---|---|
| 1 · Nền máy đọc — `llms.txt` · `repo-map.json` · `DASHBOARD.md`, sinh từ HEAD | ✅ xong (S2) | ⬜ chưa có |
| 2 · **Bảng cho người đọc** — giao diện thân thiện, mở ra là thấy trạng thái | ⬜ chưa có | ⬜ chưa có |
| 3 · Hook cưỡng chế — cổng đóng phiên + cổng cấu trúc + kiểm tự chạy | 🟡 một nửa (S4 làm nốt) | ⬜ chưa có |
| 4 · Sổ tay cho AI — `AGENTS.md` + cổng vào | ✅ có | ⬜ chưa có |

**Tầng 2 là việc MỚI, chưa nằm trong S1–S10.** Nó là thứ Đức sẽ dùng để nghiệm thu ở mức ~90%
thay cho việc đọc file — xem `memory`/phản hồi 2026-09-02: *"tôi không muốn tôi phải là người
check các vấn đề này"*. Chèn thành một phiên riêng **sau S7**, vì bảng chỉ đáng làm khi dữ liệu
bên dưới đã được chứng minh là đúng; làm sớm hơn là dựng mặt tiền trên nền chưa nghiệm thu.

**Hệ quả cho S9:** bộ template promote vào Kho không phải là mấy file rời, mà là **cả bốn tầng**.
Làn A dựng và chứng minh; Kho nhận bản đã chứng minh, không dựng lại từ đầu.

---

## 3. Mười phiên

Mỗi phiên: một mục tiêu, một commit, một lần push. **Không gộp hai phiên.**

---

### S1 — Dọn chỗ chứa nghiên cứu

| | |
|---|---|
| **Ai** | Claude Code |
| **Vì sao trước** | Luồng capacity study đang đẻ file nhanh nhất. Chặn nguồn trước khi dọn. |
| **Làm** | Tạo `docs/studies/`, `docs/briefs/`, `docs/archive/`. Chuyển 5 file nghiên cứu của phiên 31/08 vào `docs/studies/`, thêm frontmatter **ba trường** `kind/status/ttl_days`. **Chưa đụng 29 file `drafts/` cũ.** |
| **Đức nghiệm thu** | Mở `docs/studies/` trên GitHub. Thấy 5 file. Mở một file: dòng đầu có khối `---` với `ttl_days`. |
| **Trích template** | Cây thư mục `docs/` rỗng + `docs/_TEMPLATE-study.md` |

<details><summary><b>Brief dán sẵn</b></summary>

> Đọc `AGENTS.md` gốc repo rồi `DASHBOARD.md`. Làm đúng phiên S1 của
> `ROADMAP-CLEAN-AND-TEMPLATE-V1`: tạo `docs/studies/`, `docs/briefs/`, `docs/archive/`;
> chuyển 5 file nghiên cứu ngày 31/08 vào `docs/studies/` kèm frontmatter
> ĐÚNG BA TRƯỜNG: `kind` / `status` / `ttl_days`. Không thêm `id`, `created`, `owner`,
> `last_reviewed` — máy suy được từ lịch sử phiên bản, gõ tay là tạo con số sẽ mục.
> `ttl_days`: study 180, brief 30, guide 365.
> Sửa lại frontmatter của 8 file đã có trong `docs/studies/` cho khớp luật ba trường.
> KHÔNG đụng `drafts/` cũ. Xong: commit → `session-check` → `safe-push`.

</details>

---

### S2 — Sinh cổng vào

| | |
|---|---|
| **Ai** | Codex viết script · Claude audit |
| **Làm** | Nâng `scripts/build-dashboard.mjs` sinh thêm `llms.txt` (định dạng llmstxt.org) + `repo-map.json`. Thêm Khối A "Bắt đầu từ đâu" và Khối D "Sức khoẻ điều hướng" vào `DASHBOARD.md`. |
| **Đức nghiệm thu** | Mở `llms.txt`: có tiêu đề, đoạn tóm tắt, mỗi link kèm một dòng mô tả, và **không có chữ "LINK CHẾT"** ở đâu. Rồi mở `DASHBOARD.md` **bấm thử 3 link** — cả 3 phải mở được. |

> **Sửa 2026-09-02 — bài nghiệm thu cũ KHÔNG chạy được.** Nó bảo "bấm thử 3 link trong
> `llms.txt`". GitHub hiển thị file `.txt` dạng chữ trơn, nên `[nhãn](đường-dẫn)` chỉ là chữ,
> không thành nút bấm. Không phải lỗi của file — chuẩn llmstxt.org bắt buộc đuôi `.txt` — mà
> là lỗi của bài kiểm. Chỗ bấm được là `DASHBOARD.md` (đuôi `.md`, GitHub render thành link
> thật) và nó chứa đúng những đường dẫn đó. Máy cũng tự đếm link chết ở Khối D; con số đó
> phải là 0.
| **Trích template** | `build-dashboard.mjs` (bản rút gọn) + mẫu `llms.txt` |

<details><summary><b>Brief dán sẵn</b></summary>

> Phiên S2. Nâng `scripts/build-dashboard.mjs` để sinh thêm hai file ở gốc repo:
> `llms.txt` theo định dạng llmstxt.org (một `#` tiêu đề, một `>` blockquote tóm tắt,
> các mục `##` chứa link kèm mô tả một dòng) và `repo-map.json` (bản đồ máy đọc:
> entry_point, law_files, top_level có owner, extensions có lifecycle/status_md/
> last_verified_commit/current_claim/open_items).
> Thêm vào `DASHBOARD.md`: Khối A "Bắt đầu từ đâu" đặt trên cùng (việc ưu tiên #1 kèm
> mã/gói/link STATUS/chủ · phiên gần nhất kèm ngày/commit/link HANDOFF · link AGENTS.md);
> Khối D "Sức khoẻ điều hướng [ĐO]" (đếm extension chưa khai STATUS · link chết · thư mục
> top-level chưa khai chủ). Cả ba file đều là GENERATED, có dòng cảnh báo đừng sửa tay.
> Kèm test ghim. Xong: commit → `session-check` → `safe-push`.

</details>

---

### S3 — Bịt ba lỗ hổng đã biết

| | |
|---|---|
| **Ai** | Claude Code |
| **Làm** | ① `STATUS.md` cho Extension Observer V0 · ② `lifecycle: superseded` + `superseded_by` cho `duc-auto-gemini/v0.1.0` · ③ khai chủ cho **cả 7** thư mục top-level chưa có chủ · ④ nâng STATUS lên schema v2 **kèm migrate 3 file v1 đang có** |

> **Phạm vi đã rộng ra, đo tại `6ef131c`.** Bản trước ghi mỗi `pilots/`; thực đo là **7** thư
> mục chưa khai chủ. Và nâng schema mà không migrate ba STATUS `v1` đang có thì bộ sinh từ
> chối toàn repo. Đề bài đầy đủ ở `docs/briefs/BRIEF-S3.md`.
| **Cấm** | Đụng bất cứ thứ gì trong `v0.1.0/evidence/` |
| **Đức nghiệm thu** | Mở `DASHBOARD.md` Khối D. **Ba dòng đếm phải về 0.** |
| **Trích template** | `STATUS.template.md` bản đã bổ sung trường mới |

Trường mới của schema `extension-status/v2`: `owner` · `next_step` · **`priority_rank`** · `superseded_by` (bắt buộc CÓ ĐIỀU KIỆN, chỉ khi `lifecycle: superseded`) · `depends_on` (không bắt buộc). Bỏ giá trị `unclassified` khỏi `lifecycle`.

> **Sửa 2026-09-02.** Bản trước liệt kê `session_intent` và thiếu `priority_rank`. `session_intent`
> đã bị bỏ: nó là thứ theo PHIÊN, thuộc `HANDOFF.md`, không phải trạng thái của đơn vị.
> `priority_rank` là trường quyết định "việc ưu tiên #1" — thiếu nó thì máy phải đoán, và
> bản cũ đoán bằng thứ tự bảng chữ cái. Đúng MỘT đơn vị được mang hạng 1; đơn vị
> `superseded`/`archived` không được xét làm ưu tiên.

---

### S4 — Cổng kiểm, chế độ cảnh báo

| | |
|---|---|
| **Ai** | Codex viết · Claude audit |
| **Làm** | `scripts/check-bootstrap.mjs` + `.repo-structure.json`. Nối vào `session-check.mjs`. 14 phép kiểm B1–B14, cộng **G13** (file mới trong `docs/` thiếu frontmatter ba trường → ĐỎ,
là cổng chặn nguồn, quan trọng nhất) và **G14** (việc đã đóng nhưng file nháp chưa được phân
loại PROMOTE/EVIDENCE/ARCHIVE → vàng). **Chỉ in ra, chưa chặn.** |
| **Bắt buộc** | `.repo-structure.json` có khối `grandfathered` miễn trừ 52 đường dẫn cũ có dấu cách và tiếng Việt có dấu |
| **Đức nghiệm thu** | Bảo AI chạy `node scripts/check-bootstrap.mjs` rồi dán kết quả. Mỗi dòng cảnh báo phải nói **cả chỗ sai lẫn chỗ đúng**. |
| **Trích template** | `check-bootstrap.mjs` + `.repo-structure.json` mẫu (rỗng `grandfathered`) |

Thông báo lỗi bắt buộc theo mẫu:
```
✗ B1 NO-STATUS: ./manifest.json
    → tạo: STATUS.md cùng thư mục, theo docs/STATUS.template.md
    → tối thiểu: id, name, lifecycle, owner, next_step
```

---

### S5 — Quyết định thành bất biến

| | |
|---|---|
| **Ai** | Claude Code |
| **Làm** | Tách `decisions.md` mỗi gói thành `docs/adr/NNNN-<ten>.md`. Chuẩn Nygard: Bối cảnh · Quyết định · Hệ quả · Trạng thái. |
| **Luật** | ADR `Accepted` là bất biến — như `evidence/`. Đổi ý = ADR mới, cái cũ chuyển `Superseded by ADR-NNNN`, hai bên trỏ nhau. |
| **Đức nghiệm thu** | Mở `workers/<gói>/docs/adr/`. Thấy file đánh số. Mở một file bất kỳ thấy đủ bốn mục. |
| **Trích template** | `docs/adr/0000-record-architecture-decisions.md` + `_TEMPLATE-adr.md` |

---

### S6 — Draft có hạn sử dụng + dọn `drafts/`

| | |
|---|---|
| **Ai** | Claude Code |
| **Làm** | Thêm frontmatter cho mọi file `docs/`. Bật kiểm B11. Chuyển 29 file `drafts/` vào `docs/studies` · `docs/briefs` · `docs/archive` theo trạng thái. |
| **Đức nghiệm thu** | Thư mục `drafts/` **biến mất**. Khối D có thêm dòng "Tài liệu quá hạn chưa rà: N". |
| **Trích template** | Quy tắc `ttl_days`: brief 30 · study 180 · guide 365 |

Phân loại 29 file: `EXP-*` và `PHASE-1-SYNTHESIS` → `studies` · `*-BRIEF` đã thực thi xong → `archive` · `*-ONBOARDING-PROMPT` → `archive`.

---

### S7 — Bật chặn + BÀI TEST NGHIỆM THU

| | |
|---|---|
| **Ai** | Claude Code · Đức tự chạy bài test |
| **Làm** | Bật chặn B1–B5, B7, B10, B12. Rút mục 9 Project Instructions còn một dòng. |
| **Đức nghiệm thu** | **Bài test một dòng** — xem mục 4 dưới |
| **Trích template** | Gỡ nhãn `unproven` khỏi bộ artifact đã trích — mở đường promote lên Kho tier `SEED` |

**Đây là cột mốc.** Đạt = mục tiêu chính của dự án đã xong.

---

### S8 — Trả nợ cũ

| | |
|---|---|
| **Ai** | Claude Code, **mỗi món một commit** |
| **Làm** | ① Gộp 4 file `AGENT-BRIDGE-*` trùng, giữ một bản · ② nâng `XLSX_TEMPLATE_GOVERNANCE.md` lên `docs/SEED-GOVERNANCE.md` gốc repo, hợp nhất 3 bản `DAC_XLSX_RUN_PLAN_V1.md` · ③ chuyển 6–8 file `.md` ở gốc mỗi gói xuống `docs/` · ④ chuyển Extension Observer V0 vào `workers/observer-v0/v0.1.0/` |
| **Cấm** | Đổi tên bất kỳ thư mục nào trong `evidence/`, `Pilot-*`, `Batch-*`, `pilots/` |
| **Đức nghiệm thu** | Gốc repo: đếm file `.md` còn **6**. Gốc một gói bất kỳ: còn **3**. |

Món ④ đụng `build-dashboard.mjs` + `package.json` — làm cuối, commit riêng.

---

### S9 — Promote bộ template vào Kho, tier SEED

> **Phiên này bị viết lại 2026-09-01 theo quyết định K0 số 1.** Bản cũ nói "tạo repo
> `repo-template` + bật Template repository trên GitHub" — **đã huỷ**.

| | |
|---|---|
| **Ai** | Claude điều phối · Đức duyệt từng diff |
| **Làm** | ⛔ **VIẾT LẠI 02/09 — [ADR-0001](../adr/0001-template-o-repo-doc-lap-project-3ai-nghi.md).** Không promote vào Kho nữa. Thay bằng: **dựng nhà độc lập cho template** (mốc M1–M2 ở mục 10). Bản cũ: *"promote vào Kho (Project-3) ở tier SEED"* — giữ làm bản ghi. |
| **Điều kiện tiên quyết** | ⚠️ **ĐANG NGHI NGỜ — xem 9.5 trước khi khởi công.** Bản cũ: *"K-MIGRATE xong — `sync_manifest.json` đã có `schema_version`, version/path/tier đã sửa, checksum sinh lại."* Điều kiện này giả định Kho đang sống. Đức báo 02/09 là **không**. |
| **Đức nghiệm thu** | Mở `sync_manifest.json` trong Kho. Bộ artifact có mặt ở tier `SEED`, không nằm ở `LOCKED`. Một repo mới lấy SEED về, chạy cổng kiểm ra xanh. |

Bộ artifact phải trích đủ — đây vẫn là "template", chỉ khác chỗ ở:
```
(tier SEED trong Kho — trước đây dự kiến là repo-template/)
├─ AGENTS.md              khung luật, chỗ trống cho tên dự án
├─ CLAUDE.md              stub 7 dòng, @AGENTS.md
├─ README.md              hướng dẫn dùng template
├─ .repo-structure.json   schema, grandfathered rỗng, chọn được P1–P5
├─ scripts/               build-dashboard · check-bootstrap · session-check · safe-push
├─ docs/
│  ├─ STATUS.template.md
│  ├─ _TEMPLATE-study.md · _TEMPLATE-brief.md · _TEMPLATE-adr.md
│  ├─ adr/0000-record-architecture-decisions.md
│  └─ studies/ briefs/ archive/
├─ .agents/claims.json    rỗng
└─ .github/workflows/structure.yml
```

---

### S10 — Global Control *(điều kiện: ≥2 repo đã qua bài test một dòng)*

| | |
|---|---|
| **Ai** | Claude điều phối · Claude Code |
| **Điều kiện khởi công** | Ít nhất hai repo có `repo-map.json` hợp lệ và đã đạt bài test S7. **Chưa đủ thì không khởi công** — radar không có tín hiệu sẽ phải điền tay, thành đúng cái cơ sở dữ liệu đồng bộ thủ công cần tránh. |
| **Làm** | Repo `global-control` theo **Profile P5**. Ghi tay đúng MỘT file: `registry.json` (~10 dòng mỗi repo: id · owner/repo · branch · profile · active). `scripts/scan.mjs` lấy `repo-map.json` của từng repo qua API. Sinh `GLOBAL-DASHBOARD.md` + `llms.txt`. |
| **TUYỆT ĐỐI không copy** | file trạng thái · việc đang mở · quyết định · bằng chứng của repo con. Copy = nguồn sự thật thứ hai, chắc chắn lệch. |
| **Luật chống phình** | Trường nào tính được từ `repo-map.json` của repo con thì **không được** nằm ngoài tầng GENERATED. Cổng kiểm chặn. |
| **Đức nghiệm thu** | Mở `GLOBAL-DASHBOARD.md`. Thấy mỗi repo một dòng: tên · profile · việc #1 · độ tươi · số nợ. Repo nào chưa chuẩn hoá hiện `CHƯA CHUẨN HOÁ`. |

**Xử lý hỏng hóc — luật "thà trống còn hơn cũ":**

| Sự cố | Hiển thị |
|---|---|
| Không lấy được dữ liệu repo | `KHÔNG ĐỌC ĐƯỢC` + thời điểm đọc thành công gần nhất. **Không dùng số cũ.** |
| Repo chưa có `repo-map.json` | `CHƯA CHUẨN HOÁ` — đây là tín hiệu hữu ích, không phải lỗi |
| `schema_version` lệch | `SCHEMA CŨ`, không cố đọc tiếp |
| Bảng cũ hơn 7 ngày | Banner đỏ ngay dòng đầu file |

Số cũ trông như số thật là kiểu hỏng nguy hiểm nhất của mọi bảng điều khiển.

---

## 4. Bài test nghiệm thu — chạy ở S7

Đức tự làm, không nhờ AI. Mở **chat AI hoàn toàn mới**, dán đúng một dòng:

> Đọc `llms.txt` ở gốc repo `anhducds-GIT/Chrome_Extension_AI_Agentic` rồi làm theo.

**Đạt** khi AI nói được cả ba, **không hỏi lại câu nào**:
1. Repo có những extension gì, cái nào đang sống
2. Việc ưu tiên số 1 hiện tại là gì, thuộc gói nào
3. Nên đọc file nào tiếp theo

**Không đạt** thì ghi lại **câu AI đã hỏi** — mỗi câu hỏi là một trường dữ liệu còn thiếu.
Mở mục backlog bổ sung trường đó, rồi test lại. Không sửa bằng cách dặn AI đọc kỹ hơn.

Ghi kết quả vào `evidence/20260901-bootstrap-test-r01/` như mọi phép đo khác.

---

## 5. Bảng theo dõi

Đức tick sau mỗi lần push.

| | Phiên | Ai | Xong | Template đã trích |
|---|---|---|---|---|
| ☑ | S1 Dọn chỗ chứa | Claude Code | **2026-09-02** `cfc66fc` | `docs/` + `_TEMPLATE-study.md` |
| ☑ | S2 Cổng vào | **Claude Code** (Codex hỏng) | **2026-09-02** `6ef131c` | `build-dashboard.mjs` · mẫu `llms.txt` |
| ☐ | S3 Bịt lỗ hổng | Claude Code | | `STATUS.template.md` v2 |
| ☐ | S4 Cổng kiểm | Codex + Claude | | `check-bootstrap.mjs` · `.repo-structure.json` |
| ☐ | S6 Draft có hạn + dọn drafts/ | Claude Code | | quy tắc `ttl_days` 3 trường |
| ☐ | **S7 Bật chặn + TEST** | Claude Code + Đức | | gỡ nhãn `unproven` |
| ☐ | S5 ADR *(hạ ưu tiên, sau S7)* | Claude Code | | `_TEMPLATE-adr.md` · ADR-0000 |
| ☐ | S8 Trả nợ cũ | Claude Code | | — |
| ☐ | S9 Promote template vào Kho tier SEED | Claude + Đức duyệt | | bộ artifact hoàn chỉnh, có P5 |
| ☐ | S10 Global Control *(chỉ khi ≥2 repo qua S7)* | Claude + Claude Code | | `scan.mjs` · `registry.json` |

**S1–S4, S6, S7 là phần bắt buộc.** S5 (ADR) hạ ưu tiên xuống sau S7: nó không chặn gì và
không giúp nhìn thấy trạng thái — thứ Đức đang thiếu là khả năng nhìn, không phải lịch sử
quyết định. S8 dọn dẹp, làm dần được. S9 chỉ chạy sau khi S7 đạt.
**S10 chỉ khởi công khi ít nhất hai repo đã qua bài test một dòng** — xây radar khi chưa có
tín hiệu thì sẽ phải điền tay, và thành đúng cái cơ sở dữ liệu đồng bộ thủ công cần tránh.

---

## 6. Luật chuyển phiên

Một phiên **chỉ được mở** khi phiên trước đã: push xong · Đức đã nghiệm thu bằng mắt ·
dòng tương ứng trong bảng mục 5 đã tick.

Phiên trước chưa xong mà mở phiên sau = hai AI cùng ghi một thư mục = đúng sự cố 26/08.

Nếu một phiên làm dở phải dừng: ghi `HANDOFF.md` gồm **ba thứ** — đã làm tới đâu ·
đang kẹt ở đâu · việc tiếp theo là gì. Không chép lại thứ đã có trong file khác, chỉ trỏ đường dẫn.

---

## 7. Điều phối viên cập nhật file này khi nào

- Sau mỗi phiên: tick bảng mục 5
- Khi một phiên phát sinh việc ngoài phạm vi: ghi vào `BACKLOG.md` của gói, **không** thêm phiên mới vào roadmap
- Khi bài test S7 không đạt: thêm một phiên S7b, ghi rõ trường dữ liệu nào thiếu

**Không sửa file này khi:** đổi số liệu · đổi trạng thái extension · thêm extension.
Ba thứ đó đã có `DASHBOARD.md` lo.

---

## 8. Đang ở đâu

**S1 → S7 đã đóng và đã push.** Bài test nghiệm thu đạt cả hai vòng
(`evidence/20260902-bootstrap-test-r01` và `-r02`) — **mục tiêu chính của Giai đoạn 1 đã xong.**

Việc kế tiếp: **S8** (trả nợ cũ) và **dashboard cho người đọc** (mục 9.1). Cả hai không chờ ai.
S9 chờ K-MIGRATE của làn B, và chờ Đức chốt câu hỏi ở mục 9.3.

Cách mở phiên mới, đã chứng minh hai lần — dán đúng một dòng, không cần brief:

```
Đọc llms.txt ở gốc repo anhducds-GIT/Chrome_Extension_AI_Agentic rồi làm theo.
```

> **Đừng gõ số phiên vào mục này nữa.** Ba lần liên tiếp nó lạc hậu đúng ở chỗ người ta đọc
> để biết làm gì tiếp (bảo bắt đầu S1 khi S1 xong; bảo S3 khi S7 xong). Trạng thái sống thuộc
> về `DASHBOARD.md` và `HANDOFF.md` — máy sinh, tự tươi. Mục này chỉ nên nói *cách* bắt đầu.

---

## 9. Giai đoạn 2 — Đức mở phạm vi 2026-09-02

> **Câu chốt của Đức, nguyên ý:** *"đây không phải là điểm kết thúc, mà mới là điểm bắt đầu
> thôi. Sau bước chuẩn hoá này xong, tôi sẽ request AI multitask để migrate repo mẫu này
> sang các repo khác."*

S1–S10 ở trên là **Giai đoạn 1 — chuẩn hoá**. Nó không còn là toàn bộ chương trình.

### 9.1 Hai dashboard, hai nhiệm vụ khác nhau — đừng gộp

Cho tới 02/09 tài liệu chỉ nói "bảng vận hành" chung chung. Đức tách làm hai, và chúng khác
nhau ở **đối tượng phục vụ**, nên khác cả nội dung:

| | **Dashboard của repo Chrome** | **Dashboard của Template** |
|---|---|---|
| Trả lời câu | *"Dự án này đang chạy tới đâu?"* | *"Bộ khung này gồm những gì, vận hành ra sao?"* |
| Nội dung | Các Extension · guide · luật dự án · hệ thống thư mục · luật vận hành · **task đang mở** | Toàn bộ cấu trúc · kiến trúc · guide · cách vận hành · **thông tin đầy đủ của harness ở trạng thái null, sạch nhất** |
| Dữ liệu | Có thật, thay đổi mỗi phiên | **Rỗng có chủ đích** — nó là bản mẫu, không phải bản đang chạy |
| Dạng | Trực quan cho người dùng, không phải file `.md` để đọc | Trực quan, và là thứ người ta xem trước khi quyết định lấy template về |

Điểm dễ sai: dashboard của Template **không phải** dashboard repo Chrome bị xoá dữ liệu. Một
cái báo cáo tiến độ; cái kia mô tả một bộ khung. Viết chung một bộ sinh cho cả hai là sẽ phải
tách lại sau.

### 9.2 Template là một sản phẩm có phiên bản, không phải một lần trích

Đức chốt: template **sẽ còn improve qua nhiều version**, nên nó cần:

1. một **chỗ ở cố định** để maintain qua các phiên bản;
2. một **AI hiểu nó**, có bộ skill riêng để: maintain · sửa · cập nhật · **dùng template làm
   gốc đi migrate sang repo khác**.

Đây là điểm khác hẳn cách hiểu cũ. Trước 02/09, template được coi là *kết quả trích ra* của
S1–S10 — làm xong là xong. Từ 02/09 nó là **sản phẩm được nuôi tiếp**.

### 9.3 ⚠️ Một chỗ phải chốt trước khi làm S9 — chưa ai quyết

Đức viết *"cần có 1 repo riêng để maintain nó"*. Câu này có **hai cách hiểu**, và chúng dẫn
tới hai kế hoạch S9 khác hẳn nhau:

| Cách hiểu | Nghĩa là | Hệ quả |
|---|---|---|
| **A — "riêng" = không nằm trong repo Chrome** | Template ở trong **Kho (Project-3)**, tier `SEED`, và Kho trở thành nhà nuôi nó | **Khớp với K0 số 1**, S9 giữ nguyên kế hoạch, không cần ADR mới |
| **B — "riêng" = một repo thứ ba, tách khỏi cả Kho** | Dựng repo mới chỉ để chứa template | **Đảo ngược K0 số 1**, phải viết ADR thay thế, S9 phải viết lại |

**K0 số 1 (Đức chốt 01/09) đã huỷ repo `repo-template` độc lập**, lý do ghi trong mục 1 file
này: *dựng một repo template riêng tạo nguồn sự thật thứ hai bên cạnh Kho.*

**Khuyến nghị của điều phối: chọn A.** Kho vốn sinh ra để làm đúng việc này — giữ luật chung
cho 21 repo. Thêm một repo thứ ba nghĩa là có hai chỗ cùng khai "chuẩn là gì", và lúc chúng
lệch nhau thì không ai biết tin chỗ nào. Thứ Đức thật sự cần — phiên bản, AI riêng, bộ skill
riêng — **đều làm được bên trong Kho**, không cần repo mới.

Nếu Đức vẫn muốn B thì được, nhưng phải đi kèm **một ADR thay thế K0 số 1**, nói rõ chỗ nào
là nguồn sự thật khi hai bên lệch. Không có ADR đó thì sáu tháng nữa không ai biết vì sao có
hai chỗ.

### 9.4 Giai đoạn 2 — migrate đa repo

Chưa lên lịch chi tiết, cố ý. Điều kiện khởi công: Giai đoạn 1 đóng và template đã gỡ nhãn
`unproven`. Hình dung của Đức là **AI multitask** — nhiều phiên chạy song song trên nhiều
repo, lấy template làm gốc.

Luật đã có sẵn cho việc đó, đừng phát minh lại: mục 1 của `AGENTS.md` (một gói một chủ),
`safe-push.mjs` (không cuốn theo commit người khác), và luật của K5 (chỉ gửi đề nghị,
Đức duyệt từng cái, cấm ghi đè).

**Đính chính 02/09 (chính tôi ghi sai vài giờ trước).** Tôi từng viết ở đây rằng Giai đoạn 2
*"cần một cách khoá rộng hơn vì `claims.json` chỉ khoá trong phạm vi một repo"*. **Sai.**
Khoá theo repo là đơn vị tự nhiên: mỗi repo một bản làm việc, hai phiên cùng một repo đã bị
`claims.json` chặn rồi. Chạy 5 repo song song **không cần khoá mới**.

Thứ thật sự thiếu là **nhìn thấy** — không chỗ nào cho biết cả 5 phiên đang làm gì. Mà cái đó
chính là **radar S10**, đã nằm trong kế hoạch. Không phải lỗ hổng mới.

### 9.5 ⚠️ Đức báo 02/09: Kho (Project 3AI) đã lâu không còn được triển khai

**Đây là thông tin làm lung lay giả định gốc của cả làn B.** Ghi lại ngay để không phiên nào
khởi công K-MIGRATE trước khi việc này được làm rõ.

Làn B (K-MIGRATE · K2 công cụ đo lệch · K3 chụp mốc) **đều dựng trên một giả định**: Kho là
thứ đang sống, và `sync_manifest.json` là cơ chế phát hành thật. Nếu Kho đang ngủ thì
K-MIGRATE là *sửa một manifest trong repo không ai dùng*, và S9 là *promote vào một chỗ chết*.

**Hệ quả tốt, nếu đúng:** S9 đang bị chặn bởi K-MIGRATE. Cộng với việc Đức đã chốt template
**độc lập, không thuộc dự án nào**, thì template không vào Kho nữa — nên **S9 hết bị chặn.**

**CHƯA ĐƯỢC XOÁ LÀN B.** Phải nhìn trước. Ba câu hỏi quyết định, và **chưa ai trả lời**:

1. `sync_manifest.json` đang đồng bộ **cái gì**? Chỉ luật/harness, hay còn thứ khác
   (CI, cấu hình, xoay khoá…)?
2. Đã có repo nào **thật sự nhận** từ nó chưa, hay nó chưa từng chạy lần nào?
3. Commit cuối cùng của Project 3AI là bao giờ?

| Nếu | Thì |
|---|---|
| (1) chỉ là luật/harness **và** (2) chưa từng chạy | **K-MIGRATE · K2 · K3 nghỉ hẳn**, thay bằng trường `harness_version` + radar. Ba mốc biến mất khỏi roadmap |
| (1) còn đồng bộ thứ khác | Giữ làn B, nhưng **tách nó khỏi chuyện template** — hai việc khác nhau |

**Ai làm việc nhìn này: GPT.** Nó có connector đọc thẳng GitHub; một lượt là xong. Claude Code
không đọc được repo khác. Đây là việc rẻ nhất trên bàn và nó quyết định ba mốc.

> **✅ ĐÃ CHỐT 02/09, cùng ngày — [ADR-0001](../adr/0001-template-o-repo-doc-lap-project-3ai-nghi.md).**
> Đức chọn **cả hai đều không**: Project 3AI *kết thúc vai trò*, có thể archive. Template ở
> **repo độc lập**. Làn B nghỉ. Ba câu hỏi ở trên **không còn để quyết số phận Kho** — chúng
> thu lại thành một câu duy nhất: *"trong Project 3AI có gì đáng mang sang trước khi archive?"*
> Vẫn là việc của GPT, nhưng rẻ hơn nhiều.

**Bản ghi hai lựa chọn đã cân nhắc, giữ lại vì nó giải thích vì sao chốt như vậy:** Project 3AI nhận vai nào —

- **(a) Nhà của template.** Nó vốn là "gốc của kho", tức chỗ chứa luật chung — đúng vai template
  cần. Không phải dựng repo mới nên tôn trọng trọn vẹn K0 số 1. Và template repo **tự chạy
  chuẩn nó phát hành** là bằng chứng sống, không phải lời khai.
- **(b) Repo thử đầu tiên (M2).** Được, nhưng repo đang ngủ **không có gói chạy, không có
  tranh chấp quyền, không có bằng chứng sống** — nên chỉ chứng minh được nấc 1–2, không chứng
  minh được nấc 3–4.

**Khuyến nghị: (a).** Và dù chọn gì thì vẫn cần thêm **một repo đang sống, khác loại** để thử
thật — migrate sang một extension thứ hai không chứng minh được gì.

---

## 10. Giai đoạn 2 — Template độc lập và nhân bản ra các repo khác

> Chốt 2026-09-02, [ADR-0001](../adr/0001-template-o-repo-doc-lap-project-3ai-nghi.md).
> **Làn B đã nghỉ** — K-MIGRATE · K2 · K3 · K5 không còn trong lộ trình.

### 10.1 Template gồm tám thứ — và hai thứ CHƯA TỒN TẠI

Đức liệt kê 02/09: *harness · rules · structure · folder · dashboard · protocol audit ·
protocol migrate · khởi tạo mới*. Đo lại xem cái nào đã có:

| Thành phần | Hôm nay | Việc còn phải làm |
|---|---|---|
| harness · rules · structure · folder | **Có, đã chứng minh** | Trích ra, bỏ tên dự án |
| dashboard | **Có nền máy sinh** | Thêm lớp hiển thị cho người |
| **protocol audit** | ❌ **CHƯA CÓ** | Viết mới — hiện chỉ có một prompt cho một phiên |
| **protocol migrate · khởi tạo mới** | ❌ **CHƯA CÓ** | Viết mới — không tài liệu, không script |

**Đừng nhầm "trích ra" với "viết mới".** Sáu thứ đầu là trích; hai thứ cuối là làm từ đầu, và
chúng chính là phần đắt nhất của Giai đoạn 2.

### 10.2 Cái gì đi theo template, cái gì ở lại — luật quan trọng nhất

| Thành phần | Đi? | Vì sao |
|---|---|---|
| `scripts/` | **Đi trọn**, có phiên bản | Logic thuần, không dính dự án |
| Luật chung (`AGENTS.md` mục 0–5, 7) | **Đi trọn** | Đo được: 1/117 dòng có tên dự án |
| Bản mẫu (`STATUS.template`, `_TEMPLATE-*`, ADR-0000) | **Đi trọn** | Chúng vốn là khuôn |
| `.repo-structure.json` | **Schema đi, giá trị ở lại** | `areas`/`grandfathered` là của từng repo |
| Bản đồ file (`AGENTS.md` mục 6) | **KHÔNG** | 13/47 dòng là tên dự án — nó là bản đồ địa phương |
| `STATUS.md` · `HANDOFF.md` · `claims.json` | **Khuôn đi, nội dung ở lại** | Chép nội dung = đẻ ra nguồn sự thật giả |
| `DASHBOARD.md` · `llms.txt` · `repo-map.json` | **KHÔNG BAO GIỜ** | Mỗi repo tự sinh. **Bộ sinh đi, sản phẩm ở lại** |
| `evidence/` | **KHÔNG BAO GIỜ** | Bằng chứng của repo nào là của repo đó |

Chép nhầm nhóm cuối thì **mọi repo sẽ đồng loạt hiển thị trạng thái của repo Chrome**.

### 10.3 Cơ chế nhân bản: kéo về + ghim phiên bản

| Cách | Vì sao loại / chọn |
|---|---|
| Chép một lần | Không có đường nâng cấp. Chỉ hợp repo mới tinh |
| Đẩy từ trung tâm | Ghi đè sửa đổi địa phương, **và chống lại luật "Đức duyệt từng thay đổi"** |
| **Kéo về + ghim phiên bản** ✅ | Mỗi repo khai đang dùng bản nào; nâng cấp là hành động có chủ ý tại chỗ |

Chi phí: thêm **một trường** `harness_version` vào `.repo-structure.json`. Từ đó độ lệch đếm
được, và `repo-map.json` đã có sẵn cơ chế đưa trường đó ra ngoài cho radar đọc.

### 10.4 Migrate có bốn nấc — không phải bật/tắt

| Nấc | Đạt được gì | Nghiệm thu |
|---|---|---|
| **1 · Đọc được** | AI lạ vào repo là hiểu ngay | Bài test một dòng |
| **2 · Kiểm được** | Cổng chạy, mới cảnh báo | `check-bootstrap` chạy ra số |
| **3 · Chặn được** | Cổng đỏ thật khi sai | Cố tình làm hỏng → cổng đỏ |
| **4 · Tự nuôi** | ADR + bằng chứng thành thói quen | Dùng hằng ngày |

**Không phải repo nào cũng cần nấc 4.** Repo lưu trữ chỉ cần **nấc 1**. Ép cả 21 repo lên nấc 4
là công việc khổng lồ và phần lớn lãng phí. Nấc 1 đã mang lại phần lớn giá trị.

### 10.5 Bảy mốc

| Mốc | Làm gì | Nghiệm thu bằng máy |
|---|---|---|
| **M0** | GPT đọc Project 3AI: *có gì đáng mang sang trước khi archive?* | Danh sách thu hoạch, hoặc "không có gì" |
| **M1** | Tách template — cắt mục 6, gom scripts + bản mẫu + schema | **Repo rỗng + template → cổng XANH** |
| **M2** | Dựng nhà độc lập cho template, đóng `v1.0.0`, nhà tự chạy chuẩn của chính nó | `check-bootstrap` xanh **trong chính repo template** |
| **M3** | Viết **protocol audit** + **protocol migrate/khởi tạo** | Một repo lạ đi theo protocol mà không hỏi câu nào |
| **M4** | Migrate **một repo đang sống, khác loại** | Bài test một dòng đạt ở repo đó |
| **M5** | Vá template theo cái vỡ ra ở M4 | `v1.1.0` |
| **M6** | Hai repo song song, rồi radar | 2 repo xanh không giẫm chân · bảng hiện `harness_version` từng repo |

**M1 là mốc then chốt, và phép thử của nó rẻ:** tạo một repo **rỗng**, thả template vào, chạy
cổng kiểm. **Xanh = template thật sự độc lập.** Đỏ = có thứ của Chrome lọt vào. Đây là bài test
một dòng phiên bản dành cho template — dùng lại đúng công thức đã cứu Giai đoạn 1.

**M4 phải là repo KHÁC LOẠI.** Migrate sang một extension thứ hai không chứng minh được gì
ngoài "template hợp với extension" — thứ đã biết. **Chưa chọn được repo nào; cần Đức chỉ.**
