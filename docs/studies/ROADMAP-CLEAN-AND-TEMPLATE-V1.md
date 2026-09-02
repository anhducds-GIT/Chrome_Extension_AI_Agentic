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

Trường mới của schema `extension-status/v2`: `owner` · `superseded_by` · `session_intent` · `next_step` · `depends_on`. Bỏ giá trị `unclassified` khỏi `lifecycle`.

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
| **Làm** | Gom bộ artifact đã trích ở S1–S7, promote vào **Kho (Project-3)** ở tier `SEED` của `sync_manifest.json`. Không tạo repo mới, không tạo manifest thứ hai. |
| **Điều kiện tiên quyết** | **K-MIGRATE xong** — `sync_manifest.json` đã có `schema_version`, version/path/tier đã sửa, checksum sinh lại. Chưa xong mà promote = đổ vào một manifest đang mâu thuẫn. |
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

## 8. Bắt đầu

Phiên **S3**. S1 và S2 đã đóng và đã push. Đức mở chat Claude Code mới, dán
`docs/briefs/BRIEF-S3.md`.

> Cập nhật 2026-09-02. Mục này trước đây vẫn bảo bắt đầu từ S1 dù S1 đã xong — một dòng
> lạc hậu ở đúng chỗ người ta đọc để biết làm gì tiếp.

Xong S1 báo tôi, tôi viết brief S2.
