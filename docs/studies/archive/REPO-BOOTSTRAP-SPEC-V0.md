---
kind: study
status: superseded
ttl_days: 180
---

# REPO-BOOTSTRAP-SPEC-V0

> **Bài toán:** một phiên AI mới vào repo phải hiểu ngay chuyện gì đang xảy ra,
> **không quét toàn bộ cây thư mục, không hỏi Đức một câu nào.**
>
> Tài liệu này thay thế trọng tâm của `FOLDER-STANDARD-STUDY-V0`. Sắp xếp thư mục
> là **triệu chứng**. Thiếu cổng vào là **bệnh**. Chữa bệnh trước.

---

## 1. Bằng chứng: hệ thống hiện tại thất bại như thế nào

Đo trên chính phiên ngày 2026-08-31.

| Bước | AI phải làm | Chi phí |
|---|---|---|
| 1 | Gọi `GITHUB_GET_A_TREE` recursive | 1.014 mục trả về |
| 2 | Tự viết code phân tích cấu trúc | 2 lượt xử lý |
| 3 | Đọc 6 file để đoán ngữ cảnh | 6 lượt gọi |
| 4 | **Vẫn phải hỏi Đức 3 câu** | Chặn tiến độ |

Repo có 148 file `.md` — thừa thông tin. Nhưng không file nào trả lời được câu
**"tôi nên bắt đầu từ đâu và việc quan trọng nhất bây giờ là gì"**.

Thừa tài liệu, thiếu điều hướng. Thêm tài liệu nữa sẽ làm nặng thêm.

---

## 2. Nguyên tắc thiết kế

### 2.1 Nguyên tắc gốc

> **Mỗi câu AI phải hỏi Đức = một trường dữ liệu còn thiếu trong repo.**

Không sửa bằng cách dặn AI "chịu khó đọc kỹ hơn". Sửa bằng cách **bổ sung trường dữ liệu
và bắt cổng kiểm chặn khi trường đó trống.**

Kiểm chứng nguyên tắc trên 3 câu đã hỏi trong phiên 31/08:

| Câu đã hỏi | Trường thiếu | Cách chặn vĩnh viễn |
|---|---|---|
| Code ở root là extension gì? | Observer V0 thiếu `STATUS.md` | Cổng **B1**: thư mục có `manifest.json` mà không có `STATUS.md` → ĐỎ |
| `gemini/v0.1.0` còn dùng không? | Thiếu `superseded_by:` | Schema STATUS thêm field; cổng **B2** bắt buộc khi `lifecycle: superseded` |
| `pilots/v0-trial/` thuộc ai? | Thiếu `owner:` | Cổng **B3**: mọi thư mục top-level phải có mục trong `repo-map.json` |

Ba trường này được bổ sung → phiên sau không hỏi nữa. Đây là **bài test nghiệm thu** của spec này.

### 2.2 Bốn ràng buộc

| # | Ràng buộc | Vì sao |
|---|---|---|
| R1 | AI đọc đúng **1 file** để bắt đầu | Không có lựa chọn thì không đoán sai |
| R2 | Độ sâu điều hướng tối đa **3** | Đọc tới file thứ 4 mới hiểu = thiết kế hỏng |
| R3 | File cổng vào **máy sinh 100%** | Người gõ tay thì sẽ mục; đã hỏng 2 lần ngày 26/08 |
| R4 | Mọi liên kết trong file cổng vào phải **tồn tại thật** | Link chết còn tệ hơn không có link |

---

## 3. Chuỗi bootstrap

```
BƯỚC 1 ─ DASHBOARD.md            [máy sinh]
         Trả lời 6 câu:
         · repo có gì
         · cái nào đang sống, cái nào đã chết
         · kiểm chứng lần cuối bằng gì
         · việc đang mở, đã xếp ưu tiên
         · phiên trước làm gì
         · đọc tiếp ở đâu   ──────────────┐
                                          │
BƯỚC 2 ─ workers/<ext>/<ver>/STATUS.md  ←─┘  [người viết, schema cố định]
         Trạng thái vận hành + link đi tiếp ─┐
                                             │
BƯỚC 3 ─ HANDOFF.md · BACKLOG.md · evidence/ ←┘  [chi tiết]
```

**Hết. Không có bước 4.**

AI cũng có thể đọc `repo-map.json` (máy sinh cùng lúc) để lấy toàn bộ bản đồ trong **một
lần gọi** thay vì quét cây thư mục 1.014 mục.

### 3.1 Câu lệnh mở phiên rút gọn còn một dòng

Hiện tại (mục 9 của Project Instructions) yêu cầu Đức dán 4 đường dẫn.
Sau khi có spec này:

> Đọc `DASHBOARD.md` của repo `anhducds-GIT/Chrome_Extension_AI_Agentic`. Làm theo mục "Bắt đầu từ đâu".

Nếu AI vẫn phải hỏi thêm sau khi đọc DASHBOARD → đó là **lỗi của repo**, ghi vào backlog,
sửa bằng cách bổ sung trường. Không phải lỗi của Đức, cũng không phải lỗi của AI.

---

## 4. `DASHBOARD.md` — nâng cấp thành cổng vào

Hiện tại DASHBOARD chỉ có bảng số. Bổ sung 3 khối, tất cả máy sinh.

### Khối A — "Bắt đầu từ đâu" (đặt trên cùng)

```markdown
## Bắt đầu từ đâu

Bạn là phiên AI mới. Đọc theo đúng thứ tự này, không cần quét cây thư mục.

1. Bảng dưới — biết repo có gì, cái nào đang sống.
2. Việc ưu tiên #1 hiện tại: **B-17** — việc thật không chạy qua trần 90s của run.trial
   → gói: `workers/duc-auto-chatgpt/v0.1.0/`
   → đọc: [STATUS](workers/duc-auto-chatgpt/v0.1.0/STATUS.md)
   → chủ hiện tại: `codex-2026-08-30` (xem `.agents/claims.json`)
3. Phiên gần nhất: 2026-08-28 @ `4789754` — hạ trần chờ Bridge xuống 5 giây, đã kiểm live.
   → [HANDOFF](workers/duc-auto-gemini/v0.2.0/HANDOFF.md)

Luật bắt buộc đọc trước khi gõ dòng đầu tiên: [AGENTS.md](AGENTS.md)
```

### Khối B — bảng registry hiện có

Giữ nguyên. Thêm 2 cột: **Chủ hiện tại** (từ `claims.json`) và **Thay thế bởi**
(từ `superseded_by`).

### Khối C — "Việc đang mở, xếp ưu tiên"

Máy gom từ mọi `BACKLOG.md`, sắp theo `priority` khai trong từng mục.

```markdown
## Việc đang mở — 5 việc đầu

| # | Mã | Gói | Mô tả ngắn | Chủ |
|---|---|---|---|---|
| 1 | B-17 | duc-auto-chatgpt | Trần 90s của run.trial | codex-… |
| 2 | G-01 | duc-auto-gemini | Chờ trial live riêng | (trống) |
```

### Khối D — "Sức khoẻ điều hướng"

```markdown
## Sức khoẻ điều hướng [ĐO]

· Extension chưa khai STATUS: 2 (Extension Observer V0, Duc Auto Gemini v0.1.0)
· Link chết trong các file cổng: 0
· Thư mục top-level chưa khai chủ: 1 (pilots/)
· Brief quá hạn còn active: 3
```

Khối D làm cho **nợ điều hướng trở nên nhìn thấy được**. Không nhìn thấy thì không ai trả.

---

## 5. `repo-map.json` — bản đồ máy đọc

Máy sinh cùng lúc với DASHBOARD, từ cùng một lần quét.

```json
{
  "generated_at": "2026-08-31T00:00:00Z",
  "generated_commit": "b5430f9",
  "entry_point": "DASHBOARD.md",
  "law_files": ["AGENTS.md", "PLATFORM.md"],
  "top_level": [
    {
      "path": "workers/",
      "kind": "packages",
      "owner": "platform"
    },
    {
      "path": "pilots/",
      "kind": "evidence",
      "owner": "UNDECLARED",
      "note": "cổng B3 đang báo đỏ"
    },
    {
      "path": "drafts/",
      "kind": "docs",
      "owner": "platform"
    }
  ],
  "extensions": [
    {
      "id": "duc-auto-gemini",
      "path": "workers/duc-auto-gemini/v0.2.0",
      "version": "0.2.0",
      "lifecycle": "active",
      "status_md": "workers/duc-auto-gemini/v0.2.0/STATUS.md",
      "bridge_methods": 19,
      "test_files": 84,
      "last_verified": "2026-08-28",
      "last_verified_commit": "4789754",
      "evidence_ref": "workers/duc-auto-gemini/v0.2.0/evidence-transport-liveness-5s-20260828/README.md",
      "current_claim": null,
      "open_items": ["G-01"]
    },
    {
      "id": "duc-auto-gemini-v01",
      "path": "workers/duc-auto-gemini/v0.1.0",
      "version": "0.1.0",
      "lifecycle": "superseded",
      "superseded_by": "workers/duc-auto-gemini/v0.2.0",
      "status_md": null,
      "note": "code chết; evidence/ bất biến, không di chuyển"
    },
    {
      "id": "observer-v0",
      "path": ".",
      "version": "0.1.0",
      "lifecycle": "UNDECLARED",
      "status_md": null,
      "note": "cổng B1 đang báo đỏ — có manifest.json, thiếu STATUS.md"
    }
  ]
}
```

Lợi ích đo được: AI lấy toàn bộ ngữ cảnh bằng **1 lần đọc file** thay vì
1 lần quét tree (1.014 mục) + 6 lần đọc file + 3 câu hỏi.

---

## 6. Schema `STATUS.md` — bổ sung trường bắt buộc

Repo đã có `schema: extension-status/v1`. Nâng lên **v2**, thêm 4 trường:

| Trường | Bắt buộc khi | Giải quyết |
|---|---|---|
| `owner` | luôn luôn | "thư mục này của ai" |
| `superseded_by` | `lifecycle: superseded` | "bản cũ hay bản mới" |
| `entry_hint` | luôn luôn | một câu: phiên tiếp theo nên làm gì trước |
| `depends_on` | khi có phụ thuộc | biết đụng gói này thì ảnh hưởng gói nào |

Giá trị hợp lệ của `lifecycle`: `active` · `building` · `paused` · `superseded` · `archived`.
Bỏ `unclassified` — nó chính là chỗ thông tin rò rỉ ra ngoài thành câu hỏi cho Đức.

---

## 7. Cổng kiểm điều hướng — `scripts/check-bootstrap.mjs`

| # | Kiểm | Mức | Chặn câu hỏi nào |
|---|---|---|---|
| **B1** | Thư mục có `manifest.json` mà không có `STATUS.md` | ĐỎ | "code này là gì" |
| **B2** | `lifecycle: superseded` mà thiếu `superseded_by` | ĐỎ | "bản nào còn dùng" |
| **B3** | Thư mục top-level không có mục trong `repo-map.json` | ĐỎ | "thư mục này của ai" |
| **B4** | Link trong `DASHBOARD.md` trỏ tới file không tồn tại | ĐỎ | "link chết" |
| **B5** | `STATUS.md` thiếu trường bắt buộc của schema v2 | ĐỎ | nhiều câu |
| **B6** | Độ sâu điều hướng > 3 để tới bất kỳ file chi tiết nào | 🟡 | "đọc mãi không hiểu" |
| **B7** | `lifecycle` không thuộc danh sách hợp lệ | ĐỎ | "sống hay chết" |
| **B8** | `DASHBOARD.md` cũ hơn commit gần nhất của bất kỳ `STATUS.md` nào | 🟡 | "số liệu có tươi không" |

Thông báo lỗi phải nói chỗ đúng, ví dụ:

```
✗ B1 NO-STATUS: ./manifest.json (Extension Observer V0)
    → tạo: STATUS.md ở cùng thư mục, theo mẫu docs/STATUS.template.md
    → tối thiểu cần: id, name, lifecycle, owner, entry_hint

✗ B3 UNDECLARED-DIR: pilots/
    → thêm mục vào repo-map.json > top_level, kèm owner
```

Nối vào `session-check.mjs` như một cổng con, chạy trước `safe-push`.

---

## 8. Bài test nghiệm thu

Spec này coi là **đạt** khi thoả cả ba:

1. **Test một dòng.** Mở phiên AI mới, chỉ đưa đúng câu:
   *"Đọc DASHBOARD.md của repo X. Làm theo mục Bắt đầu từ đâu."*
   AI phải nói được: repo có gì · việc ưu tiên #1 là gì · nên đọc file nào tiếp
   — **không hỏi lại câu nào.**

2. **Test không quét.** AI không cần gọi `GET_A_TREE` để hiểu ngữ cảnh.
   Chỉ đọc `DASHBOARD.md` + tối đa 2 file được trỏ tới.

3. **Test số câu hỏi.** Đếm số câu AI phải hỏi Đức trong 3 phiên liên tiếp.
   Mục tiêu: **0**. Mỗi câu hỏi phát sinh → mở một mục backlog để bổ sung trường tương ứng.

Ghi kết quả 3 test này vào `evidence/` như mọi phép đo khác.

---

## 9. Thứ tự triển khai

| GĐ | Việc | Kết quả đo được |
|---|---|---|
| **1** | Nâng `build-dashboard.mjs`: sinh thêm Khối A + Khối D, sinh `repo-map.json` | AI có cổng vào |
| **2** | Khai `STATUS.md` cho Extension Observer V0; gắn `superseded_by` cho gemini v0.1.0; khai chủ cho `pilots/` | 3 câu hỏi biến mất vĩnh viễn |
| **3** | Viết `check-bootstrap.mjs`, chạy chế độ cảnh báo | Nợ điều hướng hiện ra bằng số |
| **4** | Nâng schema STATUS lên v2, bổ sung `entry_hint` cho mọi gói | Khối C có nội dung thật |
| **5** | Bật chặn B1–B5, B7. Sửa mục 9 Project Instructions còn 1 dòng | Không thể tạo nợ mới |
| **6** | Sinh thêm Khối C từ các `BACKLOG.md` | Roadmap tự cập nhật |

Giai đoạn 1–2 giải quyết phần lớn vấn đề. Giai đoạn 3–6 giữ cho nó không tái phát.

---

## 10. Quan hệ với `FOLDER-STANDARD-STUDY-V0`

Hai tài liệu, hai bệnh khác nhau, làm theo thứ tự này:

| | Bệnh | Triệu chứng | Ưu tiên |
|---|---|---|---|
| **Bootstrap spec** (file này) | AI không biết đường vào | Phải quét lại repo, phải hỏi Đức | **Làm trước** |
| Folder standard | File rải rác | 148 md, 29 thư mục pilot 6 kiểu tên | Làm sau |

Lý do thứ tự: cổng vào tốt thì file rải rác chỉ gây khó chịu.
Cổng vào hỏng thì thư mục gọn tới mấy AI vẫn phải quét và vẫn phải hỏi.

Hai phần dùng chung một hạ tầng: cùng `session-check`, cùng kiểu thông báo lỗi
"sai ở đâu — đúng ở đâu", cùng nguyên tắc **thứ gì máy đếm được thì máy đếm**.
