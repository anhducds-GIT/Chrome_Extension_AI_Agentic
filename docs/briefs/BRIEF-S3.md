---
kind: brief
status: active
ttl_days: 30
---

# BRIEF — Phiên S3: bịt ba lỗ hổng, đưa Khối D về 0

> Dán vào một phiên Claude Code MỚI. Một phiên, một mục tiêu. Không làm gì ngoài brief này.
> **Điều kiện mở phiên:** S2 (`829d644`) đã có ít nhất một audit độc lập PASS hoặc CONDITIONAL.
> Chưa có thì DỪNG, báo Đức — luật chuyển phiên, roadmap mục 6.

## Mở phiên

1. Đọc `AGENTS.md` gốc repo → `llms.txt` → `DASHBOARD.md` (Khối A và Khối D).
2. Ghi tên phiên vào `.agents/claims.json` cho `_root`. Trống chủ thì cứ lấy; có chủ thì hỏi Đức.
3. **Kiểm nền:** `node scripts/session-check.mjs --as s3-gaps`
   - ĐỎ → DỪNG, báo nguyên văn, không sửa gì.
   - XANH → làm tiếp.

## Bối cảnh — đo tại `a909db7`

Khối D của `DASHBOARD.md` đang hiện bốn con số nợ:

| Nợ | Số | S3 phải đưa về |
|---|---:|---|
| Đơn vị chưa khai STATUS | **2** | 0 |
| Link chết trong file cổng | 0 | giữ 0 |
| Thư mục top-level chưa khai chủ | **7** | 0 |
| Tài liệu quá hạn chưa rà | 0 | giữ 0 |

⚠️ **Roadmap gốc giả định chỉ có 1 thư mục chưa khai chủ (`pilots/`). Thực đo là 7.** Phiên S2
cố tình không bịa miễn trừ để con số về 0. Vì vậy S3 rộng hơn brief cũ mô tả — mục 3 dưới đây
là phần đã được mở rộng.

## Việc cần làm — đúng bốn món

### 1. Khai `STATUS.md` cho Extension Observer V0

Đơn vị `.` (gốc repo, `manifest.json` ở tầng ngoài cùng), id `extension-observer-v0`.
Chép từ `STATUS.template.md`, điền thật. Không đoán: `lifecycle` phải phản ánh đúng hiện trạng
(nó chưa từng chạy pilot nào → **không** khai `active`).

### 2. Khai `duc-auto-gemini/v0.1.0` là bản đã bị thay thế

`workers/duc-auto-gemini/v0.1.0/STATUS.md`: `lifecycle: superseded` +
`superseded_by: workers/duc-auto-gemini/v0.2.0`.

**Cấm tuyệt đối:** đụng bất cứ thứ gì trong `workers/duc-auto-gemini/v0.1.0/Pilot-01/` hay bất
kỳ thư mục `evidence/` nào. Chỉ THÊM file `STATUS.md`.

### 3. Khai chủ cho 7 thư mục top-level

**Đề xuất thiết kế (cần Đức gật trước khi code — nó đổi hình dạng một file luật):**

Thêm khối `areas` MỚI vào `.agents/claims.json`, **tách hẳn** khỏi khối `claims` đang có:

```json
{
  "claims":  { ... giữ nguyên, đây là KHOÁ PHIÊN, đổi liên tục ... },
  "areas": {
    "delegations/": { "steward": "_root", "note": "giao thức uỷ thác MVP" },
    "docs/":        { "steward": "_root", "note": "tài liệu 4 tầng" },
    "drafts/":      { "steward": "_root", "note": "nháp — S6 sẽ dọn hết" },
    "evidence/":    { "steward": "BẤT BIẾN", "note": "chỉ thêm, không sửa không xoá" },
    "pilots/":      { "steward": "BẤT BIẾN", "note": "bằng chứng vận hành" },
    "scripts/":     { "steward": "_root", "note": "cổng kiểm + bộ sinh" },
    "tests/":       { "steward": "_root", "note": "suite gốc repo" },
    "workers/":     { "steward": "theo từng package trong claims" }
  }
}
```

Rồi sửa `topLevelOwnership()` trong `scripts/build-dashboard.mjs` đọc `areas` **thay vì** tập
khoá của `claims`.

**Vì sao tách hai khối, đây là điểm chính của món này:** `claims` là ổ khoá phiên — đổi vài lần
mỗi phiên. `areas` là bản đồ tĩnh — đổi khi thêm thư mục, tức là hiếm. Hiện bộ sinh đang đọc
tập khoá của `claims`; nó ổn định *đủ dùng*, nhưng vẫn là một sợi dây nối artifact với một file
trạng thái sống. Tách ra thì sợi dây đó **đứt hẳn** — và đó chính là điều phiên S2 khẳng định
mà chưa làm được trọn vẹn.

Nếu Đức không duyệt khối `areas`: phương án lùi là thêm 7 khoá vào `claims` với `owner: null`.
Đạt cùng con số, nhưng giữ nguyên sợi dây kia và khai một quyền mà `safe-push.mjs` không hề
cưỡng chế (nó gom mọi thứ ngoài `workers/` về `_root`) — tức là một lời khai không có răng.

### 4. Nâng `STATUS.template.md` lên schema v2

Thêm năm trường: `owner` · `superseded_by` · `session_intent` · `next_step` · `depends_on`.
Bỏ giá trị `unclassified` khỏi danh sách `lifecycle` hợp lệ.

**Bộ sinh đã nối sẵn đường** — `collectModel` đã đọc `owner` / `next_step` / `superseded_by` từ
frontmatter, và `repo-map.json` đã giữ sẵn ba khoá đó với giá trị `null`. Khai vào STATUS là
Khối A tự có "Việc ưu tiên #1" và `active_work` tự đầy. **Không phải sửa bộ sinh cho món này.**

Nhớ nâng `SCHEMA` và `REQUIRED` trong `build-dashboard.mjs` cho khớp, và **thêm test ghim** cho
mỗi trường mới bắt buộc.

## Cấm

- KHÔNG đụng `drafts/` cũ (đó là S6) · KHÔNG đụng `evidence/`, `Pilot-*`, `Batch-*`, `pilots/`
- KHÔNG bịa miễn trừ để một con số nợ về 0. Số không về được thì báo Đức, đừng làm đẹp nó.
- KHÔNG bật chặn cổng kiểm nào (đó là S4/S7). S3 chỉ khai dữ liệu.

## Đóng phiên — đúng thứ tự

```bash
node scripts/build-dashboard.mjs
git add -A && git commit -m "S3: khai STATUS con thieu, superseded, areas, schema v2"
node scripts/session-check.mjs --as s3-gaps
node scripts/safe-push.mjs --as s3-gaps
```

Giữ `_root` tới khi push xong rồi mới trả về `null` bằng một commit riêng — cổng kiểm xét cả
file trong commit, không chỉ working tree. (Phiên S2 vấp đúng chỗ này.)

Ghi 1 dòng Log vào `HANDOFF.md` gốc.

## Đức nghiệm thu

Mở `DASHBOARD.md`, xem **Khối D**. Ba dòng đầu phải đọc là **0 · 0 · 0**.
Rồi mở `llms.txt`: mục "Việc ưu tiên #1" phải hết chữ CHƯA KHAI và nêu được một việc thật.
