---
kind: guide
status: active
ttl_days: 365
---

# Mục lục tài liệu

> Năm tầng: **protocols** (cách làm việc, đọc khi sắp làm) · **studies** (nghiên cứu còn sống) ·
> **briefs** (đề bài từng phiên) · **archive** (hồ sơ đã nghỉ) · **adr** (quyết định bất biến —
> xem [0000-ghi-nhan-quyet-dinh-kien-truc.md](adr/0000-ghi-nhan-quyet-dinh-kien-truc.md)).
>
> `protocols/` đã tồn tại từ trước nhưng KHÔNG có trong mục lục này, nên mục lục tự nhận "bốn
> tầng" trong khi có năm — sửa 04/09. Không khai thì không tồn tại, kể cả với chính mục lục.

## Thư mục `drafts/` ở gốc repo đã BIẾN MẤT (2026-09-02, phiên S6)

Cả **33 file** đã chuyển vào đây bằng `git mv` — nội dung không đổi, lịch sử đi theo.
Tài liệu cũ (kể cả **ADR đã Accepted**, vốn bất biến nên KHÔNG được sửa) vẫn trỏ theo đường
dẫn `drafts/…`. Bảng dưới là chỗ tra đường dẫn cũ → mới.

| Đường dẫn cũ | Nay ở | Vì sao xếp vào đó |
|---|---|---|
| `drafts/BRIDGE-MULTIPROFILE-DESIGN-V1.md` | [docs/studies/BRIDGE-MULTIPROFILE-DESIGN-V1.md](studies/BRIDGE-MULTIPROFILE-DESIGN-V1.md) | hướng A Đức duyệt 28/08; gemini + chatgpt CHƯA port |
| `drafts/CHROME_BRIDGE_CAPABILITY_REACH_STUDY_V0.md` | [docs/studies/CHROME_BRIDGE_CAPABILITY_REACH_STUDY_V0.md](studies/CHROME_BRIDGE_CAPABILITY_REACH_STUDY_V0.md) | nghiên cứu tầm với của Bridge |
| `drafts/EXP-02…EXP-15` (14 file) | **ĐÃ XOÁ 2026-09-08** — xem dòng ngay dưới bảng thứ hai | 14 hồ sơ khảo sát giai đoạn 1 |
| `drafts/FLOW-EXT-COORDINATION-PLAN.md` | [docs/studies/FLOW-EXT-COORDINATION-PLAN.md](studies/FLOW-EXT-COORDINATION-PLAN.md) | kế hoạch 5 checkpoint, đang chạy |
| **`docs/archive/` — ĐÃ XOÁ 2026-09-08 (15 file, 2.967 dòng)** | — | Tầng "hồ sơ đã nghỉ": mọi file trong đó đều `status: superseded` và công việc của chúng đã xong từ lâu. **Chúng chỉ rời cây làm việc, KHÔNG rời git** — đọc lại một file: `git show a3b67a96a92e:docs/archive/<tên-file>`, liệt kê cả tầng: `git show --stat a3b67a96a92e -- docs/archive/`. Đức chốt xoá 08/09 |
| `drafts/PHASE-1-SYNTHESIS-CAPABILITY-MAP-V0.md` | [docs/studies/PHASE-1-SYNTHESIS-CAPABILITY-MAP-V0.md](studies/PHASE-1-SYNTHESIS-CAPABILITY-MAP-V0.md) | roadmap S6 xếp thẳng vào studies |
| **18 hồ sơ MỒ CÔI — ĐÃ XOÁ 2026-09-08 (2.538 dòng)** | — | Không gì trong repo trỏ tới chúng ngoài chính mục lục này: brief của việc đã ship, kế hoạch đã thi hành xong, bản đồ đã bị `llms.txt`/`DASHBOARD.md` thay. **Chỉ rời cây làm việc, KHÔNG rời git** — `git show --stat 522a22400fd3 -- docs/` liệt kê cả mẻ, `git show 522a22400fd3:docs/<đường-dẫn>` đọc lại một hồ sơ |
| `drafts/PLATFORM-AI-ORCHESTRATOR-STUDY-V3.md` | [docs/studies/PLATFORM-AI-ORCHESTRATOR-STUDY-V3.md](studies/PLATFORM-AI-ORCHESTRATOR-STUDY-V3.md) | bản mới nhất trong ba bản |

## Ngoài `docs/` — sổ và công cụ ở gốc repo

> Nhận về đây 09/09 khi `AGENTS.md` mục 8 rút xuống còn **cò nạp bắt buộc**
> ([ADR-0033](adr/0033-tran-co-bien-va-bay-cho-mau-thuan-trong-ban-hieu-luc.md) ⑶): thứ **tra khi
> cần** thì thuộc mục lục, không thuộc hiến pháp. Đây là chỗ tra đó.

| Cần gì | Mở |
|---|---|
| Ghi một chỗ hỏng · một ý tưởng của Đức | `BACKLOG.md` (nợ hạ tầng, trường `đóng khi:` **bắt buộc**) · `IDEAS.md` (phòng chờ, bắt buộc `bậc` + `việc kế`) |
| Biết repo đang nợ gì về **cấu trúc** | `node scripts/check-bootstrap.mjs [--all]` — B1…B15, mỗi dòng nói cả chỗ sai lẫn cách sửa |
| Biết nhánh mình thiếu tính năng gì | `FEATURE-PARITY.md` (chữ của người, giữ `_root`) + `FEATURE-PARITY-AUTO.md` (số của máy) — [ADR-0014](adr/0014-tach-khoi-may-sinh-cua-bang-doi-chieu.md). Dòng **[DÒ]** là máy đoán theo tên: **kiểm lại trước khi hành động** |
| Hiểu repo trong một lần đọc · xem có extension nào | `llms.txt` · `repo-map.json` · `DASHBOARD.md` — **đều máy sinh, đừng sửa tay** |
| Vận hành nhiều extension, hoặc thêm một cái | `PLATFORM.md`; khai cái mới bằng cách chép `STATUS.template.md` đặt cạnh `manifest.json` |
| Đức cần một câu để dán · muốn tự mở bảng | `PROMPTS.md` · `bang-trang-thai/` · `node scripts/build-overview.mjs <file-ra.html>` |
| Hiểu vì sao nhiều phiên hay va nhau | `docs/studies/PARALLEL-WORK-DESIGN-V0.md` |
| Trạng thái sống, không phải trạng thái đã gõ | `node scripts/what-next.mjs` |

## `docs/protocols/` — cách làm việc

Khác `studies/` ở chỗ: nghiên cứu để **hiểu**, protocol để **làm theo**. Mở khi sắp bắt tay,
không phải khi tò mò.

| Tài liệu | Đọc khi | Nói về gì |
|---|---|---|
| [MULTIFLOW.md](protocols/MULTIFLOW.md) | sắp làm cùng lúc với AI khác, hoặc sắp SỬA một trong bốn cơ chế đa phiên | Bốn cơ chế (bảng chủ sở hữu · nhãn `Lane:` · cổng đóng phiên · cổng xuất bản), một ngày làm việc 5 bước, **sáu bất biến kèm lý do**, quy trình đổi cơ chế có **đột biến kiểm bắt buộc**, bảng tra mã lỗi, mục "cố ý KHÔNG làm". Mục 1–3 viết cho Đức đọc |
| [ORCHESTRATOR.md](protocols/ORCHESTRATOR.md) | bạn là phiên điều phối | Đọc gì lúc mở phiên, luật song song, HARD ROLE FIREWALL, luật nạp báo cáo năm mục, lối ra bàn giao cho executor |
| [HANDOFF.md](protocols/HANDOFF.md) | sắp ghi một mục nhật ký, hoặc bị cổng chặn vì mục quá dài | Một mục `HANDOFF.md` chứa gì và KHÔNG chứa gì, **trần 2.600 byte/mục** (khai ở `.repo-structure.json`, cổng chỉ chặn mục VỪA THÊM), xoay file theo tháng bằng `node scripts/handoff.mjs --rotate`, ba bất biến của lược đồ lưu trữ, và vì sao bộ đếm sự cố phải đi hết chuỗi con trỏ |
| [ASSISTANT-V0.1.md](protocols/ASSISTANT-V0.1.md) | — | (khai để mục lục đủ; nội dung xem trong file) |

---

## `docs/studies/` — nghiên cứu còn sống

| Tài liệu | Trạng thái | Nói về gì |
|---|---|---|
| [BRIDGE-MULTIPROFILE-DESIGN-V1.md](studies/BRIDGE-MULTIPROFILE-DESIGN-V1.md) | `active` | BRIDGE-MULTIPROFILE-DESIGN-V1 — Nhiều profile Chrome dùng chung một Bridge |
| [MULTI-SESSION-PER-PROFILE-DESIGN-V1.md](studies/MULTI-SESSION-PER-PROFILE-DESIGN-V1.md) | `active` | Nhiều phiên làm việc có tên trong MỘT profile Chrome — thiết kế V1, CHỜ ĐỨC DUYỆT 4 câu |
| [CHROME_BRIDGE_CAPABILITY_REACH_STUDY_V0.md](studies/CHROME_BRIDGE_CAPABILITY_REACH_STUDY_V0.md) | `active` | Chrome Extension + Native Bridge Capability Reach Study V0 |
| **EXP-02…EXP-15 — ĐÃ XOÁ 2026-09-08 (14 file, 8.310 dòng)** | — | Kết luận của cả loạt đã gộp vào [PHASE-1-SYNTHESIS-CAPABILITY-MAP-V0.md](studies/PHASE-1-SYNTHESIS-CAPABILITY-MAP-V0.md). **Chúng chỉ rời cây làm việc, KHÔNG rời git** — đọc lại một file: `git show 96a241ef743e:docs/studies/<tên-file>`, liệt kê cả loạt: `git show --stat 96a241ef743e -- docs/studies/`. Đức chốt xoá 08/09; lý do và ba lựa chọn đã cân ở `_run-qua-dem-20260907/DON-REPO--CHO-DUC-CHOT.md` |
| [FLOW-EXT-COORDINATION-PLAN.md](studies/FLOW-EXT-COORDINATION-PLAN.md) | `active` | FLOW-EXT — Kế hoạch điều phối Extension Google Flow (video) |
| [PHASE-1-SYNTHESIS-CAPABILITY-MAP-V0.md](studies/PHASE-1-SYNTHESIS-CAPABILITY-MAP-V0.md) | `active` | Phase 1 Synthesis — Browser Runtime Capability Map V0 |
| [PLATFORM-AI-ORCHESTRATOR-STUDY-V3.md](studies/PLATFORM-AI-ORCHESTRATOR-STUDY-V3.md) | `active` | AI-ORCHESTRATOR — Reasoning V3: Project Resume Protocol + Full AI Control |
| [REPO-STRUCTURE-SPEC-V1.md](studies/REPO-STRUCTURE-SPEC-V1.md) | `?` | REPO-STRUCTURE-SPEC-V1 |
| [ROADMAP-CLEAN-AND-TEMPLATE-V1.md](studies/ROADMAP-CLEAN-AND-TEMPLATE-V1.md) | `?` | ROADMAP-CLEAN-AND-TEMPLATE-V1 |
| [SCOUTER-CAPABILITY-INVENTORY-V1.md](studies/SCOUTER-CAPABILITY-INVENTORY-V1.md) | `active` | Kiểm kê năng lực hai trục trước khi xây Scouter — ba worker đang có gì · Chrome cho phép gì mà repo chưa dùng (ADR-0009 mục ⑺) |

## `docs/briefs/` — đề bài từng phiên

> ⚠️ **Ba bảng dưới đây là danh sách GÕ TAY, và nó mục.** Phiên S6 dựng file này; đúng một
> commit sau, `BRIEF-S7.md` ra đời và bảng đã thiếu — B6 bắt được ngay. Đã thêm tay lần này,
> nhưng cách sửa thật là **cho máy sinh mục lục này** (cùng lượt với `DASHBOARD.md`), vì luật
> của repo là số và danh sách phải máy đếm. Đã ghi vào việc mở của phiên S8.

| Tài liệu | Trạng thái | Nói về gì |
|---|---|---|
| [AUDIT-PROMPT-S2-GPT.md](briefs/AUDIT-PROMPT-S2-GPT.md) | `active` | PROMPT AUDIT S2 — dán cho GPT (đọc repo qua GitHub connector) |
| [BRIEF-S1-COMPLETE.md](briefs/BRIEF-S1-COMPLETE.md) | `?` | BRIEF — Phiên S1-HOÀN-TẤT |
| [BRIEF-S3.md](briefs/BRIEF-S3.md) | `active` | BRIEF — Phiên S3: bịt ba lỗ hổng, đưa Khối D về 0 |
| [BRIEF-S4.md](briefs/BRIEF-S4.md) | `active` | BRIEF — Phiên S4: cổng kiểm cấu trúc, **chỉ cảnh báo** |
| [BRIEF-S5.md](briefs/BRIEF-S5.md) | `active` | BRIEF — Phiên S5: quyết định thành bất biến (ADR) |
| [BRIEF-S7.md](briefs/BRIEF-S7.md) | `active` | BRIEF — Phiên S7: bật chặn + BÀI TEST NGHIỆM THU |

## `docs/archive/` — ĐÃ XOÁ 2026-09-08

Tầng này từng giữ 15 hồ sơ đã nghỉ (2.967 dòng), tất cả `status: superseded`. Lý lẽ giữ chúng
là *"chúng là bản ghi có thật"* — vẫn đúng, nhưng **git đã là chỗ giữ bản ghi có thật**, nên
một thư mục thứ hai chỉ cộng vào con số mà mọi phiên phải đọc. Xoá khỏi cây làm việc, giữ
nguyên trong lịch sử:

```bash
git show --stat a3b67a96a92e -- docs/archive/          # xem cả tầng
git show a3b67a96a92e:docs/archive/<tên-file>          # đọc lại một hồ sơ
```

| Tài liệu | Trạng thái | Nói về gì |
|---|---|---|

## `docs/adr/` — sổ quyết định, gộp theo CHỦ ĐỀ từ 2026-09-09

Trước 09/09 là **27 file xếp theo thứ tự thời gian**, và không chỗ nào nói cái nào đang có hiệu
lực. Nay **một chủ đề, một file, một câu trả lời** — lý lẽ đầy đủ ở
[ADR-0000](adr/0000-ghi-nhan-quyet-dinh-kien-truc.md).

| File | Mang quyết định | Chủ đề |
|---|---|---|
| [`0000-ghi-nhan-quyet-dinh-kien-truc.md`](adr/0000-ghi-nhan-quyet-dinh-kien-truc.md) | 0000 · 0026 | cách ghi một quyết định |
| [`0001-ranh-gioi-bo-khung.md`](adr/0001-ranh-gioi-bo-khung.md) | 0001 · 0002 · 0003 · 0006 | ranh giới bộ khung |
| [`0004-hai-vai-assistant.md`](adr/0004-hai-vai-assistant.md) | 0004 · 0017 | mấy phiên Assistant, chia việc thế nào |
| [`0005-lam-viec-song-song.md`](adr/0005-lam-viec-song-song.md) | 0005 · 0018 · 0019 · 0023 · 0025 | khoá, quyền, và đẩy |
| [`0007-scouter.md`](adr/0007-scouter.md) | 0007 · 0009 · 0010 · 0013 · 0016 · 0020 | Scouter |
| [`0008-nhat-ky-phien.md`](adr/0008-nhat-ky-phien.md) | 0008 · 0011 · 0012 | nhật ký phiên |
| [`0014-tach-khoi-may-sinh-cua-bang-doi-chieu.md`](adr/0014-tach-khoi-may-sinh-cua-bang-doi-chieu.md) | 0014 | bảng đối chiếu: chữ người / số máy |
| [`0015-nang-tran-duong-thu-len-900-giay.md`](adr/0015-nang-tran-duong-thu-len-900-giay.md) | 0015 | trần đường thử |
| [`0021-goi-extension.md`](adr/0021-goi-extension.md) | 0021 · 0022 · 0024 | các gói extension |

**Trích dẫn theo SỐ HIỆU, đừng trích theo tên file.** Số hiệu (`ADR-0025`) vĩnh viễn; tên file đổi
được ở lượt rà hằng tuần. Tra một số hiệu nay ở file nào: cột giữa bảng trên, hoặc
`grep decides docs/adr/*.md`. Hai tên cố ý giữ nguyên — `0000-…` và `0015-…` — vì các gói đang trỏ
tới chúng ở 124 chỗ mà lượt rà không sửa được.

Bản cũ vẫn đọc được: `git show <sha trước 09/09>:docs/adr/<tên-file-cũ>`. File `HANDOFF-ARCHIVE-*`
**cố ý không được vá liên kết** — chúng kể chuyện quá khứ, lúc đó tên file đúng là tên đó.
