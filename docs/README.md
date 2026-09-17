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
| `drafts/BRIDGE-MULTIPROFILE-DESIGN-V1.md` | [docs/archive/BRIDGE-MULTIPROFILE-DESIGN-V1.md](archive/BRIDGE-MULTIPROFILE-DESIGN-V1.md) | hướng A Đức duyệt 28/08; gemini + chatgpt CHƯA port |
| `drafts/CHROME_BRIDGE_CAPABILITY_REACH_STUDY_V0.md` | [docs/studies/CHROME_BRIDGE_CAPABILITY_REACH_STUDY_V0.md](studies/CHROME_BRIDGE_CAPABILITY_REACH_STUDY_V0.md) | nghiên cứu tầm với của Bridge |
| `drafts/EXP-02…EXP-15` (14 file) | **ĐÃ XOÁ 2026-09-08** — xem dòng ngay dưới bảng thứ hai | 14 hồ sơ khảo sát giai đoạn 1 |
| `drafts/FLOW-EXT-COORDINATION-PLAN.md` | [docs/archive/FLOW-EXT-COORDINATION-PLAN.md](archive/FLOW-EXT-COORDINATION-PLAN.md) | kế hoạch 5 checkpoint, đang chạy |
| **`docs/archive/`** | *(không phải đường `drafts/`)* | Xoá 08/09, **sống lại 17/09 với việc khác** — mục [`docs/archive/`](#docsarchive--xoá-0809-sống-lại-1709-với-một-việc-khác) bên dưới. *(Hàng này khai **"ĐÃ XOÁ"** tới 17/09, là chỗ THỨ HAI trong cùng file nói thế.)* |
| `drafts/PHASE-1-SYNTHESIS-CAPABILITY-MAP-V0.md` | [docs/studies/PHASE-1-SYNTHESIS-CAPABILITY-MAP-V0.md](studies/PHASE-1-SYNTHESIS-CAPABILITY-MAP-V0.md) | roadmap S6 xếp thẳng vào studies |
| **18 hồ sơ MỒ CÔI — ĐÃ XOÁ 2026-09-08 (2.538 dòng)** | — | Không gì trong repo trỏ tới chúng ngoài chính mục lục này: brief của việc đã ship, kế hoạch đã thi hành xong, bản đồ đã bị `llms.txt`/`DASHBOARD.md` thay. **Chỉ rời cây làm việc, KHÔNG rời git** — `git show --stat 522a22400fd3 -- docs/` liệt kê cả mẻ, `git show 522a22400fd3:docs/<đường-dẫn>` đọc lại một hồ sơ |
| `drafts/PLATFORM-AI-ORCHESTRATOR-STUDY-V3.md` | [docs/archive/PLATFORM-AI-ORCHESTRATOR-STUDY-V3.md](archive/PLATFORM-AI-ORCHESTRATOR-STUDY-V3.md) | bản mới nhất trong ba bản |

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
| Hiểu vì sao nhiều phiên hay va nhau | `docs/archive/PARALLEL-WORK-DESIGN-V0.md` |
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
| [RULE-COMPILER.md](protocols/RULE-COMPILER.md) | sắp thêm/sửa/xoá một nơi chứa luật, hoặc `npm run luat` báo đỏ | Sáu phép của bộ biên dịch luật, ba cửa ra khi hai nơi nói khác nhau, bản đăng ký `luat.*` |

> Hàng cuối **thiếu ở bảng này 8 ngày** (09→17/09) — đúng bệnh khối mở đầu file đã gọi tên, tái
> phát ở chính file dựng ra để chữa nó. `ls docs/protocols/*.md | wc -l` phải bằng số hàng trên.

---

## `docs/studies/` — nghiên cứu CÒN SỐNG (hai file)

| Tài liệu | Trạng thái | Nói về gì |
|---|---|---|
| [CHROME_BRIDGE_CAPABILITY_REACH_STUDY_V0.md](studies/CHROME_BRIDGE_CAPABILITY_REACH_STUDY_V0.md) | `active` | Một extension + Bridge **với tới đâu** về mặt kỹ thuật |
| [PHASE-1-SYNTHESIS-CAPABILITY-MAP-V0.md](studies/PHASE-1-SYNTHESIS-CAPABILITY-MAP-V0.md) | `active` | Bản tổng hợp — **thứ duy nhất còn lại** của 14 hồ sơ `EXP-*` đã xoá 08/09 |

> **EXP-02…EXP-15 — ĐÃ XOÁ 2026-09-08 (14 file, 8.310 dòng), Đức chốt.** Kết luận gộp vào bản
> synthesis ở trên. **Chúng chỉ rời cây làm việc, KHÔNG rời git** — đọc lại một file:
> `git show 96a241ef743e:docs/studies/<tên-file>`; cả loạt: `git show --stat 96a241ef743e -- docs/studies/`.

### Tám bản thiết kế ĐÃ DỜI sang `docs/archive/` — Đức chốt 2026-09-17

Không xoá một chữ nào: **dời chỗ**, vẫn trong git, vẫn mở đọc được, chỉ thôi bị tính vào cân nặng
kho chữ. Lý do gọn: **cả tám mô tả những thứ NAY ĐÃ TỒN TẠI và đang chạy** — chúng là phần *nghĩ
trước khi xây*, còn phần *ràng buộc* đã rút thành ADR từ lâu. Giữ chúng ở `studies/` là bắt mọi
lượt đo kho chữ trả tiền cho 2.553 dòng kế hoạch đã thành sản phẩm.

| Đã dời | Nay đang là cái gì |
|---|---|
| [BRIDGE-MULTIPROFILE-DESIGN-V1.md](archive/BRIDGE-MULTIPROFILE-DESIGN-V1.md) | Đức duyệt hướng A 28/08; **đã ship cả ba worker** |
| [MULTI-SESSION-PER-PROFILE-DESIGN-V1.md](archive/MULTI-SESSION-PER-PROFILE-DESIGN-V1.md) | Đức duyệt 03/09; **thành code** (`54160a2`) |
| [FLOW-EXT-COORDINATION-PLAN.md](archive/FLOW-EXT-COORDINATION-PLAN.md) | Gói `duc-auto-gg-flow-video` **đã tồn tại** |
| [SCOUTER-CAPABILITY-INVENTORY-V1.md](archive/SCOUTER-CAPABILITY-INVENTORY-V1.md) | Kiểm kê TRƯỚC khi xây Scouter; **Scouter v1 đã ký** |
| [REPO-STRUCTURE-SPEC-V1.md](archive/REPO-STRUCTURE-SPEC-V1.md) | RFC gửi repo khác review; `.repo-structure.json` **nay là xương sống** |
| [PARALLEL-WORK-DESIGN-V0.md](archive/PARALLEL-WORK-DESIGN-V0.md) | Khảo sát vì sao các phiên va nhau; **thành hệ khoá/lane đang chạy** |
| [ROADMAP-CLEAN-AND-TEMPLATE-V1.md](archive/ROADMAP-CLEAN-AND-TEMPLATE-V1.md) | Lộ trình S1–S10; §8 của chính nó ghi *"S1→S7 đã đóng và đã push"* |
| [PLATFORM-AI-ORCHESTRATOR-STUDY-V3.md](archive/PLATFORM-AI-ORCHESTRATOR-STUDY-V3.md) | Tự khai **"REASONING ONLY"**; không ADR nào trích |

> **Bản ghi thì KHÔNG sửa theo.** `HANDOFF-ARCHIVE-*`, `evidence/*`, `decisions.md` và các ADR vẫn
> trỏ đường dẫn `docs/studies/…` cũ — **cố ý**. Sửa trích nguồn trong một bản ghi là làm sai bản
> ghi; cùng lý lẽ đã áp ngày 02/09 cho các dòng `Nguồn: drafts/…`.

## `docs/briefs/` — đề bài từng phiên

> ⚠️ **BẢNG GÕ TAY GỠ 17/09, vì nó mục đúng như chính nó dự báo** (*"đúng một commit sau,
> `BRIEF-S7.md` ra đời và bảng đã thiếu"*). Đo `A5`: bảng khai **6**, thư mục có **16**. Thêm tay
> lần nữa là lặp lại vòng đó — nên bảng đi, lệnh ở lại:
>
> ```bash
> ls docs/briefs/*.md ; grep -l "^status: active" docs/briefs/*.md
> ```
>
> Cách sửa thật vẫn là **cho máy sinh** mục lục này cùng lượt với `DASHBOARD.md`; chưa ai làm.

## `docs/archive/` — XOÁ 08/09, **SỐNG LẠI 17/09 với một việc KHÁC**

**Lần một (chết 08/09).** 15 hồ sơ `status: superseded` (2.967 dòng). Lý lẽ *"chúng là bản ghi có
thật"* vẫn đúng, nhưng **git đã là chỗ giữ bản ghi có thật**. Rời cây làm việc, còn trong lịch sử:
`git show --stat a3b67a96a92e -- docs/archive/` · `git show a3b67a96a92e:docs/archive/<tên-file>`.

**Lần hai (17/09, lộ trình `A4`).** Nay giữ **nhật ký xoay theo tháng** (`HANDOFF-<năm>-<tháng>.md`,
sinh bằng `node scripts/handoff.mjs --rotate`). Lý lẽ 08/09 **không bị lật** — nó cấm dựng chỗ thứ
hai để giữ bản ghi git đã giữ; lượt xoay là để `HANDOFF.md` đang sống nằm trong trần.
Đếm: `ls docs/archive/`. *(Hai chỗ trong file này khai **"ĐÃ XOÁ"** suốt 9 ngày — `A5` bắt được.)*

## `docs/adr/` — sổ quyết định, gộp theo CHỦ ĐỀ từ 2026-09-09

Trước 09/09 là **27 file xếp theo thứ tự thời gian**, và không chỗ nào nói cái nào đang có hiệu
lực. Nay **một chủ đề, một file, một câu trả lời** — lý lẽ đầy đủ ở
[ADR-0000](adr/0000-ghi-nhan-quyet-dinh-kien-truc.md).

**BẢNG TRA GỠ 17/09 — mục giống hệt hai bảng trên.** Đo `A5`: bảng khai **9** file (cao nhất
`0021`), thư mục có **21** — **12 file vô hình**, gồm cả quyết định đang cưỡng chế hằng ngày
(`0035` bó mở phiên · `0037` nạp đọc đốm · `0038` ngân sách tài liệu). Cột *"mang quyết định"*
chẳng qua là trường `decides:` chép tay ra chỗ thứ hai, nên bản gốc luôn rẻ hơn:

```bash
grep -H "^decides:" docs/adr/*.md ; node scripts/rule-compile.mjs
```

**Trích dẫn theo SỐ HIỆU, đừng trích theo tên file.** Số hiệu (`ADR-0025`) vĩnh viễn; tên file đổi
được ở lượt rà hằng tuần. Tra một số hiệu nay ở file nào: cột giữa bảng trên, hoặc
`grep decides docs/adr/*.md`. Hai tên cố ý giữ nguyên — `0000-…` và `0015-…` — vì các gói đang trỏ
tới chúng ở 124 chỗ mà lượt rà không sửa được.

Bản cũ vẫn đọc được: `git show <sha trước 09/09>:docs/adr/<tên-file-cũ>`. File `HANDOFF-ARCHIVE-*`
**cố ý không được vá liên kết** — chúng kể chuyện quá khứ, lúc đó tên file đúng là tên đó.
