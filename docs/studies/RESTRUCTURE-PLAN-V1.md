# RESTRUCTURE-PLAN-V1

> **Đây là bản chốt.** Thay thế `FOLDER-STANDARD-STUDY-V0` và `REPO-BOOTSTRAP-SPEC-V0`;
> hai file đó giữ lại làm hồ sơ nghiên cứu, không phải kế hoạch.
> **Đo tại:** 2026-08-31, commit `b5430f9`, branch `main`.

---

## PHẦN A — ĐỨC ĐIỀU KHIỂN THẾ NÀO

Phần này viết cho Đức. Phần B viết cho AI thực thi.

### A1. Bốn động tác, không có động tác thứ năm

Đức không cần đọc code. Đức cần làm đúng bốn việc, lặp lại:

| Động tác | Đức làm gì | Mất bao lâu |
|---|---|---|
| **MỞ** | Dán câu mở phiên (mục A3) vào chat AI mới | 10 giây |
| **GIAO** | Dán đúng **một** brief giai đoạn. Không gộp hai. | 10 giây |
| **NGHIỆM** | Mở GitHub, nhìn đúng thứ ghi ở cột "Đức nhìn thấy gì" | 2 phút |
| **CHỐT** | Thấy đúng → nói "push". Thấy sai → nói "chưa đúng, xem lại mục X" | 10 giây |

Không có động tác "đọc code". Nếu một giai đoạn buộc Đức phải đọc code để nghiệm thu,
**giai đoạn đó thiết kế sai** — bảo AI viết lại tiêu chí nghiệm thu.

### A2. Ba luật kỷ luật của Đức

**Luật 1 — Một phiên một giai đoạn.**
Không bao giờ giao hai giai đoạn cho một phiên. AI sẽ nhận, sẽ làm, và sẽ làm ẩu ở cái thứ hai.
Giai đoạn xong, push xong, mới mở phiên mới.

**Luật 2 — Không nghiệm thu bằng lời AI nói.**
AI báo "xong" không phải bằng chứng. Đức phải **tự mở GitHub nhìn thấy**.
Cột "Đức nhìn thấy gì" ở phần B là hợp đồng. AI không đưa được thứ đó = chưa xong.

**Luật 3 — Mỗi lần Đức phải hỏi lại AI là một lỗi của repo.**
Ghi lại câu hỏi đó. Cuối giai đoạn, mở một mục backlog để bổ sung trường dữ liệu tương ứng.
Đừng tự trách mình không hiểu, cũng đừng trách AI. Sửa dữ liệu.

### A3. Câu mở phiên — dán nguyên văn

Trong lúc đang triển khai (GĐ 1–7):

> Đọc `AGENTS.md` ở gốc repo `anhducds-GIT/Chrome_Extension_AI_Agentic`, rồi `DASHBOARD.md`.
> Sau đó tôi giao một giai đoạn của `RESTRUCTURE-PLAN-V1`. Chỉ làm đúng giai đoạn đó,
> không làm sang giai đoạn khác. Việc phát sinh ngoài phạm vi thì ghi `BACKLOG.md`.

Sau khi xong GĐ 6, câu mở phiên rút còn:

> Đọc `llms.txt` ở gốc repo `anhducds-GIT/Chrome_Extension_AI_Agentic` rồi làm theo.

Đó là đích đến. Một dòng.

### A4. Khi Đức thấy có gì đó sai

Ba câu dùng được, không cần biết code:

- *"Chỗ này tôi đọc không hiểu. Viết lại đơn giản hơn."* — luật của repo: Đức không hiểu là lỗi hệ thống.
- *"Cho tôi bằng chứng. Tôi nhìn thấy ở đâu?"* — buộc AI đưa link, không cho khai suông.
- *"Cái này là `[ĐO]` hay `[DÒ]`?"* — buộc AI phân biệt máy đếm và grep đoán.

---

## PHẦN B — BẢY GIAI ĐOẠN

Mỗi giai đoạn: một phiên, một commit, một lần push.

### GĐ 1 — Sinh cổng vào

| | |
|---|---|
| **Mục tiêu** | AI mới vào repo tự tìm được đường, không quét cây thư mục |
| **Sửa file** | `scripts/build-dashboard.mjs` |
| **Sinh mới** | `llms.txt` (gốc repo), `repo-map.json` (gốc repo) |
| **Sửa nội dung** | `DASHBOARD.md` thêm Khối A và Khối D |
| **Đức nhìn thấy gì** | Mở `llms.txt` trên GitHub. Thấy tên repo, một đoạn tóm tắt, và danh sách link — mỗi link một dòng mô tả. Bấm thử 3 link bất kỳ, cả 3 phải mở được. |

`llms.txt` theo đúng định dạng chuẩn llmstxt.org: một `#` tiêu đề, một `>` blockquote tóm tắt,
các mục `##` chứa danh sách link kèm mô tả một dòng.

Khối A của DASHBOARD tên là **"Bắt đầu từ đâu"**, đặt trên cùng, gồm ba dòng:
việc ưu tiên #1 (mã, gói, link STATUS, chủ hiện tại) · phiên gần nhất làm gì (ngày, commit, link HANDOFF) · link `AGENTS.md`.

Khối D tên là **"Sức khoẻ điều hướng [ĐO]"**: đếm extension chưa khai STATUS · link chết trong file cổng · thư mục top-level chưa khai chủ.

---

### GĐ 2 — Bịt ba lỗ hổng đã biết

| | |
|---|---|
| **Mục tiêu** | Ba câu AI đã phải hỏi Đức ngày 31/08 biến mất vĩnh viễn |
| **Việc** | ① Khai `STATUS.md` cho Extension Observer V0 · ② thêm `lifecycle: superseded` + `superseded_by` cho `duc-auto-gemini/v0.1.0` · ③ khai chủ cho `pilots/` trong `repo-map.json` |
| **Không được** | Di chuyển hoặc sửa bất cứ thứ gì trong `v0.1.0/evidence/` |
| **Đức nhìn thấy gì** | Mở `DASHBOARD.md`, Khối D. Ba dòng đếm phải về **0**. |

Đây là giai đoạn kiểm chứng nguyên tắc gốc: *mỗi câu hỏi = một trường dữ liệu thiếu.*
Bổ sung trường → câu hỏi không quay lại.

---

### GĐ 3 — Cổng kiểm, chế độ cảnh báo

| | |
|---|---|
| **Mục tiêu** | Nợ điều hướng hiện ra bằng số, chưa chặn ai |
| **Sinh mới** | `scripts/check-bootstrap.mjs`, `.repo-structure.json` |
| **Sửa** | `scripts/session-check.mjs` gọi thêm cổng con này |
| **Đức nhìn thấy gì** | Bảo AI chạy `node scripts/check-bootstrap.mjs` rồi dán kết quả. Thấy danh sách cảnh báo có số. Mỗi dòng phải nói **cả chỗ sai lẫn chỗ đúng**. |

14 phép kiểm B1–B14, chi tiết ở `BENCHMARK-REPO-STANDARDS-V0` mục 5.3.
Giai đoạn này chỉ **in ra**, không chặn.

`.repo-structure.json` phải có khối `grandfathered` liệt kê 52 đường dẫn cũ có dấu cách và
tiếng Việt có dấu — chúng được miễn trừ vĩnh viễn.

---

### GĐ 4 — Quyết định thành bất biến

| | |
|---|---|
| **Mục tiêu** | Không ai sửa đè được quyết định cũ của Đức |
| **Việc** | Tách `decisions.md` mỗi gói thành `docs/adr/0001-*.md`, `0002-*.md`… Mỗi file một quyết định. Thêm trạng thái `Accepted` / `Superseded by ADR-NNNN`. |
| **Đức nhìn thấy gì** | Mở `workers/<gói>/docs/adr/`. Thấy danh sách file đánh số. Mở một file bất kỳ: thấy đủ **Bối cảnh · Quyết định · Hệ quả**. |

Theo chuẩn Nygard. Quy tắc: ADR đã `Accepted` thì **không bao giờ sửa, không bao giờ xoá**.
Đổi ý = viết ADR mới, ADR cũ chuyển `Superseded by`, hai bên trỏ nhau.

Cùng nguyên tắc với `evidence/` — chỉ khác là áp cho **quyết định** thay vì **bằng chứng**.

---

### GĐ 5 — Draft có hạn sử dụng

| | |
|---|---|
| **Mục tiêu** | `drafts/` không bao giờ phình tới 29 file lần nữa |
| **Việc** | Thêm frontmatter `kind` / `status` / `created` / `ttl_days` / `last_reviewed` cho mọi file trong `docs/`. Cổng B11 cảnh báo khi quá hạn. |
| **Đức nhìn thấy gì** | Khối D của DASHBOARD có thêm dòng: *"Tài liệu quá hạn chưa rà: N"*. |

`ttl_days` gợi ý: brief 30 · study 180 · guide 365.

---

### GĐ 6 — Bật chặn, rút câu mở phiên

| | |
|---|---|
| **Mục tiêu** | Không thể tạo nợ mới |
| **Việc** | Bật chặn cho B1–B5, B7, B10, B12. Cập nhật mục 9 Project Instructions còn một dòng. |
| **Đức nhìn thấy gì** | **Bài test một dòng.** Mở chat AI hoàn toàn mới. Dán đúng: *"Đọc `llms.txt` ở gốc repo `anhducds-GIT/Chrome_Extension_AI_Agentic` rồi làm theo."* AI phải nói được: repo có gì · việc ưu tiên #1 là gì · nên đọc file nào tiếp — **không hỏi lại câu nào**. |

Đây là bài nghiệm thu của cả dự án. Ghi kết quả vào `evidence/` như mọi phép đo khác.

---

### GĐ 7 — Dọn nợ cũ

| | |
|---|---|
| **Mục tiêu** | Trả nợ tồn, từng món một |
| **Việc, mỗi món một commit** | ① Gộp 4 file `AGENT-BRIDGE-*` trùng ở hai gói, giữ một bản, hai bên trỏ link · ② chuyển 29 file `drafts/` vào `docs/studies` + `docs/briefs` + `docs/archive` · ③ chuyển 6–8 file `.md` ở gốc mỗi gói xuống `docs/` · ④ chuyển Extension Observer V0 vào `workers/observer-v0/v0.1.0/` |
| **Không được** | Đổi tên bất kỳ thư mục nào trong `evidence/`, `Pilot-*`, `Batch-*`, `pilots/` |
| **Đức nhìn thấy gì** | Mở gốc repo trên GitHub. Đếm file `.md` ở tầng ngoài cùng: phải còn **7** (6 + `llms.txt` không tính vì là .txt). Mở gốc một gói bất kỳ: còn **3** file `.md`. |

Món ④ đụng `build-dashboard.mjs` và `package.json` — làm riêng, cuối cùng, một commit.

---

## PHẦN C — CẤU TRÚC ĐÍCH

```
repo/
├─ llms.txt                GEN   cổng vào, agent tự tìm
├─ repo-map.json           GEN   bản đồ cho script
├─ .repo-structure.json    LAW   schema cho cổng kiểm
├─ AGENTS.md               LAW   hiến pháp · 157 dòng · đạt
├─ CLAUDE.md               LAW   stub 7 dòng · đạt
├─ PLATFORM.md             LAW
├─ README.md               LAW   cho người
├─ DASHBOARD.md            GEN
├─ FEATURE-PARITY.md       GEN
│                                ── root: 6 file .md ──
├─ docs/
│  ├─ FOLDER-STANDARD.md
│  ├─ STATUS.template.md
│  ├─ studies/  briefs/  archive/
├─ .agents/claims.json
├─ scripts/  tests/
└─ workers/<ext>/<ver>/
   ├─ AGENTS.md · README.md · STATUS.md      ── gói: 3 file .md ──
   ├─ docs/     HANDOFF · BACKLOG · AI-OPERATOR-GUIDE · TEST_REPORT · adr/
   ├─ src/  tests/
   └─ evidence/                              chỉ thêm, không sửa
```

### Bốn tầng — luật phân loại

| Tầng | Ai ghi | Được xoá? | Ví dụ |
|---|---|---|---|
| **LAW** | người | có, qua PR | `AGENTS.md`, `README.md` |
| **STATE** | người | có | `STATUS.md`, `BACKLOG.md`, `HANDOFF.md` |
| **GENERATED** | máy | máy ghi đè | `llms.txt`, `DASHBOARD.md` |
| **EVIDENCE** | bất biến | **không bao giờ** | `evidence/`, `Pilot-*`, `docs/adr/` đã Accepted |

Hai luật con: không trộn hai tầng vào một file · không để hai file cùng tầng nói cùng một điều.

---

## PHẦN D — GIỮ NGUYÊN, KHÔNG ĐỘNG VÀO

Ba thứ này repo đang làm tốt hơn chuẩn ngành. Benchmark xác nhận. **Không sửa.**

1. **`last_verified_commit` + cột "code đã đổi sau kiểm chứng chưa"** — đây là tín hiệu
   git-age-delta mà ngành mới công bố năm 2026, Đức áp cho bằng chứng vận hành, chặt hơn.
2. **Nhãn `[ĐO] [ĐỌC] [DÒ] [KHAI]`** — không có tương đương trong bất kỳ chuẩn nào. Đóng góp gốc.
3. **`.agents/claims.json`** — CODEOWNERS chỉ để duyệt PR, không khoá quyền ghi.
   Không có chuẩn nào cho ba hệ AI cùng ghi một thư mục git.

---

## PHẦN E — TIẾN ĐỘ

Đức tick vào đây sau mỗi lần push.

- [ ] GĐ 1 — Sinh cổng vào
- [ ] GĐ 2 — Bịt ba lỗ hổng
- [ ] GĐ 3 — Cổng kiểm cảnh báo
- [ ] GĐ 4 — ADR bất biến
- [ ] GĐ 5 — Draft có hạn
- [ ] GĐ 6 — Bật chặn + bài test một dòng
- [ ] GĐ 7 — Dọn nợ cũ

Xong GĐ 6 thì mục tiêu chính đã đạt. GĐ 7 là dọn dẹp, làm dần được.

Sau GĐ 7: xây template repo dùng lại cho dự án sau.
