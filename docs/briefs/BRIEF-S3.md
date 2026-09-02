---
kind: brief
status: active
ttl_days: 30
---

# BRIEF — Phiên S3: bịt ba lỗ hổng, đưa Khối D về 0

> Dán vào một phiên Claude Code MỚI. Một phiên, một mục tiêu. Không làm gì ngoài brief này.
> **Viết lại 2026-09-02** sau hai vòng audit độc lập (Codex + GPT). Bản đầu của brief này là
> **blocker**: nó bảo nâng schema lên v2 mà không giao migrate ba STATUS `v1` đang có — làm
> thế là `collectModel()` từ chối **toàn bộ** repo và không sinh được gì. Chi tiết ở mục 4.

## Mở phiên

1. Đọc `AGENTS.md` gốc repo → `llms.txt` → `DASHBOARD.md` (Khối A và Khối D).
2. Ghi tên phiên vào `.agents/claims.json` cho `_root`. **Giữ quyền tới khi push xong** rồi mới
   trả về `null` bằng một commit riêng — cổng kiểm xét cả file trong commit, không chỉ working
   tree. (Phiên S2 vấp đúng chỗ này.)
3. **Kiểm nền:** `node scripts/session-check.mjs --as s3-gaps` — ĐỎ thì DỪNG, báo nguyên văn.

## Bối cảnh — số đo tại `6ef131c`

| Nợ ở Khối D | Đang là | S3 phải đưa về |
|---|---:|---|
| Đơn vị chưa khai STATUS | **2** | 0 |
| Link chết trong file cổng | 0 | giữ 0 |
| Thư mục top-level chưa khai chủ | **7** | 0 |
| Tài liệu quá hạn chưa rà | 0 | giữ 0 |

⚠️ Roadmap gốc giả định chỉ **1** thư mục chưa khai chủ (`pilots/`). Thực đo là **7**. Phiên S2
cố tình không bịa miễn trừ để con số về 0, nên S3 rộng hơn bản roadmap cũ mô tả.

## Việc cần làm — đúng năm món, làm theo thứ tự

### 1. Khai `STATUS.md` cho Extension Observer V0

Đơn vị `.` (gốc repo, `manifest.json` ở tầng ngoài cùng), id `extension-observer-v0`.
Chép từ `STATUS.template.md`, điền thật. `lifecycle` phải phản ánh đúng hiện trạng — nó chưa
từng chạy pilot nào, nên **không** khai `active`.

### 2. Khai `duc-auto-gemini/v0.1.0` là bản đã bị thay thế

Thêm `workers/duc-auto-gemini/v0.1.0/STATUS.md` với `lifecycle: superseded` +
`superseded_by: workers/duc-auto-gemini/v0.2.0`.

**Cấm tuyệt đối:** đụng `workers/duc-auto-gemini/v0.1.0/Pilot-01/` hay bất kỳ `evidence/` nào.
Chỉ THÊM file mới.

### 3. Khai chủ cho 7 thư mục top-level — đặt ở `.repo-structure.json`

Tạo `.repo-structure.json` ở gốc repo, **bản tối thiểu**, chỉ có khối `areas`:

```json
{
  "schema_version": 1,
  "profile": "P1",
  "areas": {
    "delegations/": { "steward": "_root", "mutability": "rw",       "ownership_mode": "root" },
    "docs/":        { "steward": "_root", "mutability": "rw",       "ownership_mode": "root" },
    "drafts/":      { "steward": "_root", "mutability": "rw",       "ownership_mode": "root" },
    "evidence/":    { "steward": "_root", "mutability": "append-only", "ownership_mode": "root" },
    "pilots/":      { "steward": "_root", "mutability": "append-only", "ownership_mode": "root" },
    "scripts/":     { "steward": "_root", "mutability": "rw",       "ownership_mode": "root" },
    "tests/":       { "steward": "_root", "mutability": "rw",       "ownership_mode": "root" },
    "workers/":     { "steward": null,    "mutability": "rw",       "ownership_mode": "per-package", "claim_prefix": "workers/" }
  }
}
```

Rồi sửa `topLevelOwnership()` trong `scripts/build-dashboard.mjs` đọc `areas` của file này
**thay cho** tập khoá của `.agents/claims.json`.

**Vì sao KHÔNG nhét `areas` vào `claims.json`** — đề xuất đầu của tôi là thế, và audit GPT bác
đúng: `claims.json` là **STATE** (khoá phiên, đổi vài lần mỗi phiên), `areas` là **LAW** (bản đồ
tĩnh, đổi khi thêm thư mục). Trộn hai tầng vào một file là trái đúng luật `REPO-STRUCTURE-SPEC`
mục 1 đặt ra. Thêm nữa, một quyền khai trong `claims.json` cho `docs/` sẽ **không được
`safe-push.mjs` cưỡng chế** (nó gom mọi thứ ngoài `workers/` về `_root`) — tức là một lời khai
không có răng.

**Giá trị phải máy đọc được.** Không dùng `"BẤT BIẾN"` hay `"theo từng package"` — đó là câu
tiếng Việt cho người, không phải dữ liệu. Dùng đúng bốn trường trên; `mutability: append-only`
là thứ cổng kiểm S4 sẽ cưỡng chế được.

`.repo-structure.json` là file S4 sẽ mở rộng thành 14 phép kiểm. S3 chỉ dựng phần tối thiểu.

### 4. Nâng STATUS lên schema v2 — **migrate trước, siết sau**

Đây là chỗ bản brief đầu sai. Làm **đúng thứ tự này**, không đảo:

1. **Migrate ba file `v1` đang có TRƯỚC:** `duc-auto-chatgpt/v0.1.0`, `duc-auto-gemini/v0.2.0`,
   `duc-auto-gg-flow-video/v0.1.0`, cộng hai file mới ở món 1 và 2, cộng `STATUS.template.md`.
   Tất cả đổi sang `schema: extension-status/v2` và thêm các trường mới.
2. **Chỉ SAU khi cả sáu file đã v2**, mới sửa `SCHEMA` và `REQUIRED` trong
   `scripts/build-dashboard.mjs`.
3. **Bộ sinh SẼ báo đỏ ở giữa chừng, và đó là đúng.** Nó đọc từ HEAD: khi bạn đã đổi `SCHEMA`
   sang v2 trong working tree mà HEAD vẫn còn STATUS `v1`, nó *phải* kêu "schema phải là v2".
   **Đừng dừng ở đó** — commit nguồn đi rồi chạy lại. Chỉ dừng nếu nó vẫn đỏ SAU khi đã commit.
   Audit Codex vòng 4 xếp câu "đỏ thì dừng" của bản trước là lỗi CRITICAL: nó chặn đứng chính
   phiên S3 ngay giữa chừng.

**Trường nào bắt buộc, trường nào không** — audit GPT chốt, và tôi đồng ý:

| Trường | Bắt buộc? | Ghi chú |
|---|---|---|
| `owner` | **có** | ai chịu trách nhiệm đơn vị này |
| `next_step` | **có** | việc kế tiếp, một câu |
| `priority_rank` | **có** | số nhỏ = ưu tiên cao. **Đúng MỘT đơn vị mang hạng 1** |
| `superseded_by` | có điều kiện | chỉ khi `lifecycle: superseded` |
| `depends_on` | không | để trống được |
| `session_intent` | **KHÔNG thêm** | nó là thứ theo phiên, không phải trạng thái của đơn vị — thuộc `HANDOFF.md` |

Bỏ giá trị `unclassified` khỏi danh sách `lifecycle` hợp lệ (sau khi món 1 và 2 xong, không
còn đơn vị nào dùng nó).

**Bộ sinh đã nối sẵn đường cho `next_step` và `priority_rank`** — `collectModel` đã đọc, Khối A
đã biết nói "CHƯA XẾP HẠNG" và "XUNG ĐỘT", `repo-map.json` đã giữ sẵn khoá. Khai vào STATUS là
xong; **không phải sửa bộ sinh cho phần này**. Chỉ `SCHEMA` và `REQUIRED` là phải đụng.

### 5. Thêm test ghim cho mỗi trường mới bắt buộc

Mỗi trường bắt buộc phải có một phép kiểm làm ĐỎ khi nó thiếu — ở tầng `collectModel`, không
chỉ gọi thẳng `validateStatus`. Repo này đã có bài học: gỡ chỗ gọi `validateStatus` ra khỏi
đường chạy mà cả suite vẫn xanh.

## Cấm

- KHÔNG đụng `drafts/` cũ (đó là S6) · KHÔNG đụng `evidence/`, `Pilot-*`, `Batch-*`, `pilots/`
- KHÔNG bịa miễn trừ để một con số nợ về 0. Không về được thì báo, đừng làm đẹp nó.
- KHÔNG bật chặn cổng kiểm nào (đó là S4/S7). S3 chỉ khai dữ liệu và đọc dữ liệu đó.

## Đóng phiên — **thứ tự này quan trọng, đừng đảo**

> **Bộ sinh đọc HOÀN TOÀN từ HEAD.** Chạy nó trước khi commit thì nó dựng lại từ HEAD **CŨ** —
> mọi STATUS và `.repo-structure.json` bạn vừa sửa đều không có trong đó. Rồi bạn commit dữ
> liệu mới nằm cạnh artifact cũ, và cổng kiểm đỏ. Bản đầu của brief này ghi sai đúng chỗ đó;
> audit GPT và Codex cùng bắt được. Bộ sinh nay tự in **CẢNH BÁO THỨ TỰ** nếu bạn làm sai —
> thấy dòng đó thì dừng lại, đừng commit tiếp.

```bash
# 1. Commit NGUON truoc — LIET KE TUNG FILE, khong dung `git add -A`.
#    Repo nay nhieu phien AI dung chung mot thu muc; `-A` gom ca viec dang do cua
#    phien khac vao commit cua ban. Audit Codex vong 4, muc 5.
git add STATUS.md .repo-structure.json STATUS.template.md
git add workers/duc-auto-gemini/v0.1.0/STATUS.md workers/duc-auto-chatgpt/v0.1.0/STATUS.md
git add workers/duc-auto-gemini/v0.2.0/STATUS.md workers/duc-auto-gg-flow-video/v0.1.0/STATUS.md
git add scripts/build-dashboard.mjs tests/build-dashboard-smoke.mjs
git status --short          # doc lai: co file nao khong phai cua ban khong?
git commit -m "S3: khai STATUS con thieu, areas, schema v2"

# 2. Gio HEAD da co du lieu moi, sinh lai artifact tu chinh no
node scripts/build-dashboard.mjs

# 3. HANDOFF + tra quyen _root vao CUNG mot commit voi artifact — de moi thu deu
#    di qua cong kiem VA duoc push. Dat sau safe-push la nam ngoai ca hai.
#    Audit Codex vong 4, muc 6.
git add DASHBOARD.md llms.txt repo-map.json HANDOFF.md .agents/claims.json
git commit -m "chore: sinh lai artifact + ghi HANDOFF + tra _root sau S3"

# 4. Cong kiem chay SAU cung, khi cay lam viec da sach
node scripts/session-check.mjs --as s3-gaps
node scripts/safe-push.mjs --as s3-gaps
```

> **DUNG HOANG khi buoc 1 chua chay ma bo sinh bao do.** Ban vua doi `SCHEMA` sang v2
> trong working tree, nhung HEAD van con STATUS `v1` — bo sinh doc tu HEAD nen no PHAI
> bao "schema phai la v2". **Do la dung, khong phai hong.** Commit nguon di roi chay lai.
> Chi dung lai neu no van do SAU khi da commit. Audit Codex vong 4, muc 1.


**Bộ sinh đã hỗ trợ sẵn ba thứ S3 cần — không phải tự code:**
`STATUS.md` ở gốc repo đã được đọc như mọi đơn vị khác · `lifecycle: superseded` đã hợp lệ và
`superseded_by` đã bắt buộc có điều kiện · `priority_rank` đã được đọc, và đơn vị
`superseded`/`archived` tự động không được xét làm ưu tiên #1.

## Đức nghiệm thu

Mở `DASHBOARD.md`, xem **Khối D**: ba dòng đầu phải là **0 · 0 · 0**.
Xem **Khối A** dòng 1: phải nêu được một việc thật, hết chữ CHƯA KHAI và CHƯA XẾP HẠNG.
