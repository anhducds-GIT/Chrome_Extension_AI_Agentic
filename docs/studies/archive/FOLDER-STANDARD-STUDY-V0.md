# FOLDER-STANDARD-STUDY-V0

> **Trạng thái:** bản nháp nghiên cứu. Chưa phải luật.
> **Đích đến:** sau khi Đức duyệt, tách thành `docs/FOLDER-STANDARD.md` (luật) +
> `.repo-structure.json` (máy đọc) + `scripts/check-structure.mjs` (cổng kiểm).
> **Ngày đo:** 2026-08-31, tree tại commit `b5430f9`, branch `main`.

---

## 1. Vì sao có tài liệu này

Markdown và thư mục trong repo mọc rải rác. Không phải do lười ghi chép — do thiếu đúng ba thứ:

1. **Không có allowlist ở root.** Mỗi phiên AI cần ghi gì thì đẻ file mới ngay gốc repo.
2. **Không phân biệt vòng đời file.** File nháp (sống vài ngày) nằm chung với file luật (sống vài tháng).
3. **Không có cổng máy kiểm.** Không ai chặn, nên sai lệch tích lũy im lặng.

Đây đúng là bệnh mà `PLATFORM.md` đã ghi lại: tài liệu gõ tay hỏng hai lần trong đúng một ngày (26/08).
Chữa bằng cách viết thêm tài liệu thì sẽ hỏng lần ba. Phải chữa bằng **cổng máy**.

---

## 2. Hiện trạng đo được `[ĐO]`

Đo bằng `GITHUB_GET_A_TREE` recursive, `truncated: false`.

| Chỉ số | Giá trị |
|---|---:|
| Tổng file | 920 |
| Tổng thư mục | 94 |
| File `.md` | 148 |
| File `.mjs` | 320 |
| File `.js` | 117 |

### 2.1 Bảy vấn đề tìm thấy

**V1 — Root lẫn hai loại việc.**
Root chứa `manifest.json`, `popup.js`, `popup.html`, `popup.css`, `observer-engine.js`.
Kiểm ra: đây là extension thứ tư, tên **"Extension Observer V0"** v0.1.0, permission `debugger`,
có 4 file test thật. Ba extension kia nằm trong `workers/`. Riêng nó ở root, và **chưa khai `STATUS.md`**.

**V2 — `drafts/` ở root là bãi rác: 29 file `.md`.**
Chứa `EXP-02` → `EXP-15`, các `*-BRIEF.md`, `*-ONBOARDING-PROMPT.md`, `PHASE-1-SYNTHESIS-*`.
Không có quy tắc *khi nào một draft hết hạn* → thư mục chỉ tăng, không bao giờ giảm.

**V3 — Gốc mỗi package có 9–11 file `.md`.**
`AGENTS · AI-OPERATOR-GUIDE · AUDIT · BACKLOG · DAC_XLSX_RUN_PLAN_V1 · HANDOFF ·
NEXT-SESSION-BRIEF · README · STATUS · TEST_REPORT · decisions`.
Quá nhiều để mắt người quét trong 5 giây.

**V4 — 4 file bị nhân bản giữa hai package.**

| File | Có mặt ở |
|---|---|
| `AGENT-BRIDGE-DESIGN-V1.md` | `duc-auto-chatgpt/v0.1.0/drafts/` **và** `duc-auto-gemini/v0.2.0/drafts/` |
| `AGENT-BRIDGE-HANDOFF.md` | (như trên) |
| `AGENT-BRIDGE-ROADMAP-AND-GUIDE-V1.md` | (như trên) |
| `AGENT-BRIDGE-TIER1-HANDOFF.md` | (như trên) |

Đây đúng cái bẫy `PLATFORM.md` cảnh báo: *hai chỗ nói cùng một điều thì sớm muộn nói khác nhau.*

**V5 — Tên thư mục pilot/evidence có 6 kiểu, tổng 29 thư mục.**

```
Pilot-08                                   ← số, kebab
Pilot-13_References                        ← số + underscore + mô tả
pilot-04                                   ← chữ thường
Pilot-REF-01                               ← mã chữ
Batch-SX-01                                ← từ khác hẳn
evidence-transport-liveness-5s-20260828    ← mô tả + ngày, không có số pilot
```

Máy không parse được. Người không đoán được. Không sắp xếp được theo thứ tự thời gian.

**V6 — 52 đường dẫn có dấu cách hoặc tiếng Việt có dấu.**

```
workers/duc-auto-gemini/v0.2.0/Pilot-07-Tạo Ảnh tô màu/
workers/duc-auto-chatgpt/v0.1.0/Pilot-08/Input content/
.../Duc-Auto-ChatGPT-Pilot-06__results__v002 (1).xlsx
```

Rủi ro cho script shell, CI, và máy Windows. Repo đã phải viết riêng
`tests/session-check-utf8-paths.mjs` để bù — nghĩa là chi phí này đã trả rồi.

**V7 — Trộn ngôn ngữ và trộn kiểu viết trong tên file.**

- Ngôn ngữ: `KET-QUA` · `RESULT` · `TEST_REPORT` · `KET-LUAN` · `BANG-DOI-CHIEU`
- Kiểu viết: `SCREAMING-KEBAB` · `snake_case` · `Duc-Auto-Gemini.DOTTED.md` · `decisions.md`

### 2.2 Hai câu hỏi đã giải bằng bằng chứng

| Câu hỏi | Kết luận `[ĐO]` | Bằng chứng |
|---|---|---|
| Code ở root là gì? | Extension thứ 4, đang sống, chưa khai STATUS | `manifest.json` name = "Extension Observer V0"; `DASHBOARD.md` đã liệt kê; 4 file test |
| `duc-auto-gemini/v0.1.0` còn dùng? | Đã bị v0.2.0 thay thế. 0 Bridge method, chưa khai kiểm chứng, README tự khai `LIVE_RUNTIME_UNVERIFIED` | `DASHBOARD.md` + `v0.1.0/README.md` |

**Lưu ý quan trọng:** `v0.1.0` chứa `evidence/Pilot-01` và 5 snapshot DOM.
Đó là vùng bất biến. **Không xoá, không di chuyển.** Chỉ gắn nhãn `lifecycle: superseded`
trong registry — nhãn là dữ liệu, không phải vị trí file.

---

## 3. Chuẩn đề xuất

### 3.1 Nguyên tắc: phân loại theo vòng đời, không theo chủ đề

| Tầng | Bản chất | Ai ghi | Nhịp đổi | Được xoá? |
|---|---|---|---|---|
| **LAW** | Luật, vai, kiến trúc, hướng dẫn | Người | Vài tháng | Có (qua PR) |
| **STATE** | Trạng thái, backlog, handoff | Người | Mỗi phiên | Có |
| **GENERATED** | Số đo, dashboard, parity | **Máy** | Mỗi build | Máy tự ghi đè |
| **EVIDENCE** | Pilot, log, snapshot, fixture | Bất biến | Chỉ thêm | **Không bao giờ** |

Hai luật con:

- Không trộn hai tầng vào một file.
- Không để hai file cùng tầng nói cùng một điều.

### 3.2 Cấu trúc đích

```
repo/
├─ AGENTS.md              LAW      hiến pháp
├─ PLATFORM.md            LAW      vận hành nhiều extension
├─ README.md              LAW      cửa vào
├─ DASHBOARD.md           GEN      máy sinh
├─ FEATURE-PARITY.md      GEN      máy sinh
├─ CLAUDE.md              LAW      nạp ngữ cảnh cho Claude Code
│                                  ── root dừng ở 6 file .md ──
├─ docs/
│  ├─ FOLDER-STANDARD.md          chuẩn này
│  ├─ STATUS.template.md          khuôn mẫu (chuyển từ root xuống)
│  ├─ studies/                    EXP-*, nghiên cứu dài hạn
│  ├─ briefs/                     brief giao việc cho agent
│  └─ archive/                    draft đã hết hạn, giữ để tra
├─ .agents/                       claims.json, state máy đọc
├─ .repo-structure.json           schema cho cổng kiểm
├─ scripts/
├─ tests/
└─ workers/<ten-ext>/<version>/
   ├─ AGENTS.md           LAW      luật cục bộ
   ├─ README.md           LAW      kiến trúc + cách dùng
   ├─ STATUS.md           STATE    trạng thái vận hành
   │                               ── gốc package dừng ở 3 file .md ──
   ├─ docs/                        AI-OPERATOR-GUIDE, HANDOFF, AUDIT,
   │                               BACKLOG, decisions, TEST_REPORT, RUN-PLAN
   ├─ src/  tests/
   └─ evidence/                    EVIDENCE — chỉ thêm
      └─ <YYYYMMDD>-<slug>-<rNN>/
```

Con số **6 ở root, 3 ở gốc package** là đề xuất, không phải chân lý. Điều quan trọng là
**có một con số cố định** để cổng kiểm chặn được.

### 3.3 Quy tắc đặt tên

| Đối tượng | Quy tắc | Ví dụ đúng | Ví dụ sai (đang có) |
|---|---|---|---|
| Thư mục evidence/pilot | `YYYYMMDD-<slug-ascii>-rNN` | `20260828-transport-liveness-5s-r01` | `Pilot-07-Tạo Ảnh tô màu` |
| File .md tầng LAW/STATE | `SCREAMING-KEBAB.md` | `AI-OPERATOR-GUIDE.md` | `DAC_XLSX_RUN_PLAN_V1.md` |
| File .md trong evidence | `<slug>.<LOAI>.md` | `20260828-liveness-r01.TEST-REPORT.md` | `KET-QUA-LAN-2.md` |
| Mọi đường dẫn | chỉ `a-z A-Z 0-9 . - _ /` | `input-content/` | `Input content/` |
| Ngôn ngữ trong **tên file** | tiếng Anh, không dấu | `RESULT` | `KET-QUA` |
| Ngôn ngữ trong **nội dung** | tiếng Việt (cho Đức đọc) | — | — |

Lý do tách ngôn ngữ: tên file là thứ **máy** đọc và **script** ghép chuỗi. Nội dung là thứ
**Đức** đọc. Hai đối tượng khác nhau, hai ngôn ngữ khác nhau.

### 3.4 Vòng đời của draft — thứ đang thiếu hoàn toàn

Mỗi file trong `docs/briefs/` và `docs/studies/` mở đầu bằng khối này:

```yaml
---
kind: brief          # brief | study | design
status: active       # active | done | superseded
created: 2026-08-31
expires: 2026-09-30  # bắt buộc với kind=brief
---
```

Cổng kiểm cảnh báo **vàng** khi `status: active` mà đã quá `expires`.
Không tự xoá — chỉ nhắc. Người quyết định chuyển sang `docs/archive/`.

Đây là thứ khiến `drafts/` 29 file không bao giờ xảy ra lần nữa.

---

## 4. Schema máy đọc — `.repo-structure.json`

Một nguồn sự thật. Tài liệu và cổng kiểm cùng đọc từ file này.

```json
{
  "version": 1,
  "root": {
    "allowed_md": [
      "AGENTS.md", "PLATFORM.md", "README.md",
      "DASHBOARD.md", "FEATURE-PARITY.md", "CLAUDE.md"
    ],
    "max_md": 6
  },
  "package_root": {
    "glob": "workers/*/v*",
    "allowed_md": ["AGENTS.md", "README.md", "STATUS.md"],
    "max_md": 3,
    "docs_dir": "docs"
  },
  "generated": [
    "DASHBOARD.md",
    "FEATURE-PARITY.md"
  ],
  "append_only": [
    "evidence/**",
    "workers/*/v*/evidence/**",
    "workers/*/v*/Pilot-*/**",
    "workers/*/v*/pilot-*/**",
    "workers/*/v*/Batch-*/**",
    "pilots/**"
  ],
  "path_charset": "^[A-Za-z0-9._\\-/]+$",
  "lifecycle_dirs": {
    "docs/briefs": { "require_frontmatter": true, "require_expires": true },
    "docs/studies": { "require_frontmatter": true, "require_expires": false }
  },
  "grandfathered": {
    "note": "Đường dẫn có trước 2026-08-31. Cổng bỏ qua. Chỉ áp luật cho cái MỚI.",
    "paths": [
      "workers/duc-auto-gemini/v0.2.0/Pilot-07-Tạo Ảnh tô màu/**",
      "workers/duc-auto-chatgpt/v0.1.0/Pilot-08/Input content/**"
    ]
  }
}
```

**`grandfathered` là mấu chốt.** Nó cho phép áp chuẩn **ngay hôm nay** mà không phải
đụng một byte nào của 29 thư mục evidence cũ. Chuẩn chỉ chặn cái mới. Cái cũ đóng băng.

---

## 5. Cổng kiểm — `scripts/check-structure.mjs`

### 5.1 Các phép kiểm

| # | Kiểm | Mức | Vì sao |
|---|---|---|---|
| S1 | Root `.md` ngoài allowlist | **ĐỎ** | Chặn V1, V2 |
| S2 | Gốc package quá `max_md` | **ĐỎ** | Chặn V3 |
| S3 | Cùng một tên `.md` ở hai package khác nhau | **ĐỎ** | Chặn V4 (nhân bản) |
| S4 | Thư mục evidence mới sai định dạng tên | **ĐỎ** | Chặn V5 |
| S5 | Đường dẫn mới có space / non-ASCII | **ĐỎ** | Chặn V6 |
| S6 | File trong `append_only` bị sửa hoặc xoá | **ĐỎ** | Bảo vệ bằng chứng |
| S7 | File `generated` bị sửa tay | **ĐỎ** | Bảo vệ nguyên tắc số 1 |
| S8 | Brief quá hạn mà vẫn `status: active` | 🟡 VÀNG | Chặn bãi rác draft |
| S9 | `STATE` file quá 14 ngày không đổi | 🟡 VÀNG | Phát hiện sổ chết |

S3 và S6 loại trừ mọi thứ nằm trong `grandfathered`.

### 5.2 Thông báo lỗi phải nói chỗ đúng

Đây là chi tiết quyết định thành bại. Cổng không chỉ nói *sai*, phải nói *đúng ở đâu*:

```
✗ S1 ROOT-EXTRA: REPORT-2026-08-30.md
    → chuyển tới: docs/briefs/REPORT-2026-08-30.md
    → hoặc thêm vào .repo-structure.json > root.allowed_md nếu đây là file luật lâu dài

✗ S5 PATH-CHARSET: workers/x/v1/evidence/Kết quả cuối/
    → dùng ASCII: workers/x/v1/evidence/20260831-ket-qua-cuoi-r01/

✗ S3 DUPLICATE: AGENT-BRIDGE-DESIGN-V1.md tồn tại ở 2 nơi
    → giữ một bản ở docs/studies/, hai bên trỏ link tới
```

Agent đọc thông báo này là tự sửa được, không cần Đức nhắc. Đây là vòng phản hồi tự động.

### 5.3 Nối vào quy trình

```bash
# đóng phiên, sau khi commit
node scripts/session-check.mjs --as <nhãn-phiên>
#   └─ gọi check-structure.mjs như một cổng con
node scripts/safe-push.mjs --as <nhãn-phiên>
```

Thêm một lớp nữa ở GitHub Actions để bắt trường hợp ai đó lách cổng local.

---

## 6. Kế hoạch di dời — 4 giai đoạn, không phá gì

| GĐ | Việc | Chạm evidence? | Rủi ro |
|---|---|---|---|
| **1** | Thêm `.repo-structure.json` + `check-structure.mjs` + `docs/FOLDER-STANDARD.md`. Cổng chạy ở chế độ **cảnh báo**, chưa chặn. | Không | Rất thấp |
| **2** | Chạy cảnh báo 1 tuần. Đếm xem cổng bắt nhầm bao nhiêu lần. Chỉnh schema. | Không | Rất thấp |
| **3** | Bật chế độ **chặn** cho S1–S5, S7. Từ đây file mới phải đúng chuẩn. | Không | Thấp |
| **4** | Dọn nợ cũ, từng món một, mỗi món một commit: gộp 4 file `AGENT-BRIDGE-*` trùng · chuyển `drafts/` 29 file vào `docs/studies` + `docs/archive` · chuyển 6–8 file `.md` ở gốc package xuống `docs/` · khai `STATUS.md` cho Extension Observer V0 · gắn `superseded` cho gemini v0.1.0 | Không | Trung bình |

**Không có giai đoạn nào đổi tên thư mục evidence cũ.** Chúng nằm trong `grandfathered` vĩnh viễn.

### 6.1 Ba việc phải hỏi Đức trước khi làm

1. **Extension Observer V0 có chuyển vào `workers/observer-v0/v0.1.0/` không?**
   Chuyển thì phải sửa `build-dashboard.mjs`, `package.json`, và đường dẫn load unpacked.
   Không chuyển thì root vĩnh viễn lẫn hai loại việc. **Đề xuất: chuyển, ở giai đoạn 4, làm riêng một commit.**

2. **`CLAUDE.md` và `AGENTS.md` có chồng nội dung không?**
   Chưa kiểm. Nếu chồng thì phạm luật "hai chỗ nói cùng một điều".

3. **`pilots/v0-trial/` ở root — thuộc extension nào?**
   Đang đứng một mình ngoài `workers/`. Cần biết chủ để xếp đúng chỗ.

---

## 7. Dùng lại cho repo tương lai

Hook chạy **theo từng repo** — không có công tắc toàn cục. Script nằm trong repo, repo khác
không có script thì không có cổng.

Hai cách dùng lại:

| Cách | Khi nào | Cơ chế |
|---|---|---|
| **A — Template repo** | Bây giờ → khi có 2–3 repo | Tạo repo `repo-template` chứa sẵn `AGENTS.md` + `.repo-structure.json` + `scripts/*` + workflow. Repo mới bấm nút **"Use this template"**. |
| **B — Package dùng chung** | Khi có ≥3 repo | Đóng `check-structure.mjs` thành npm package. Sửa một chỗ, `npm update` là mọi repo có bản mới. |

**Đừng làm template trước khi cổng chứng minh được nó hữu ích ở một repo.** Nhân bản một
thiết kế chưa thử nghiệm nghĩa là sai ở cả 5 repo cùng lúc.

Điểm thiết kế cho phép dùng lại: **schema (JSON) tách khỏi cổng (script)**. Repo extension
khác repo web app khác repo tài liệu — `.repo-structure.json` mỗi nơi mỗi khác, nhưng
`check-structure.mjs` giống hệt nhau. Script đọc cấu hình, không hard-code tên file.

---

## 8. Đây có phải chuẩn ngành không

Nói thẳng: **khoảng 70% là chuẩn ngành, 30% ghép riêng cho tình huống của Đức.**

| Thứ đề xuất | Tên chuẩn ngành đã có |
|---|---|
| `decisions.md` | ADR — Architecture Decision Records |
| `.agents/claims.json` | CODEOWNERS (GitHub có sẵn) |
| `docs/` tách khỏi root | Diátaxis · docs-as-code |
| Package có `docs/` riêng | Chuẩn monorepo (Nx, Turborepo) |
| File máy sinh không sửa tay | Phổ biến; thường đánh dấu `linguist-generated` |
| Cổng chặn khi sai cấu trúc | CI lint · pre-commit hook |
| Frontmatter có `expires` | Docs-rot detection (thực hành phổ biến) |

Phần ghép riêng: **cách phân bốn tầng LAW / STATE / GENERATED / EVIDENCE.**

Vì sao phải ghép? Repo bình thường có *người* viết. Repo này có *ba hệ AI* cùng ghi vào một
thư mục, mỗi phiên mất trí nhớ. Chuẩn ngành không thiết kế cho ca đó. `evidence/` bất biến
và `claims.json` là để bù chỗ thiếu.

---

## 9. Việc tiếp theo

Ba việc, theo thứ tự:

1. **Đức trả lời 3 câu ở mục 6.1.**
2. Chốt con số: root **6** file `.md`, gốc package **3** file `.md`. Đổi được nếu Đức thấy chật.
3. Giao cho phiên có quyền ghi (Claude Code hoặc Codex) tạo 3 file của giai đoạn 1, chạy
   `session-check` → `safe-push` theo đúng quy trình đóng phiên.

Tài liệu này chỉ đọc repo, **chưa ghi gì vào repo**. Không có commit nào được tạo.
