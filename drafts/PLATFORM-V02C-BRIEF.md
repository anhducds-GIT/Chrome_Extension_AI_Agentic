# Brief V0.2-C — `scripts/feature-parity.mjs`

> **Chốt bởi:** GPT + Claude, 2026-08-27. Phạm vi ĐÓNG.
> **Người giữ `_root`:** `opus-platform-2`. **Người code:** Codex.

## Vì sao

`FEATURE-PARITY.md` là file gõ tay, và nó **đã mục hai lần**: một lần nói Gemini thiếu
`run.stop`/`chat.reload` (đã port xong), một lần mục 4 nói ngược mục 2 về nhận dạng ảnh theo
byte. Tệ hơn: detector V0.2-B hiện **bắt `STATUS.md` trỏ sang file này** cho số parity — nên
nguồn được trỏ tới phải đáng tin trước đã.

## Ranh giới — đọc kỹ, đây là phần dễ làm hỏng nhất

| Mục | Xử lý | Vì sao |
|---|---|---|
| **Mục 1 — method Bridge** | **MÁY SINH 100%** | Dữ liệu cấu trúc. Đọc thẳng `registryEntry({ name: "..." })` |
| **Mục 3 — module** | **MÁY SINH 100%** | Số file, file một bên có, hash giống/khác — đều đo được |
| **Mục 2 — hành vi** | **TUYỆT ĐỐI KHÔNG ĐỤNG** | Xem cảnh báo dưới |
| **Mục 4 — tóm cho Đức** | nửa máy, nửa người | Nợ *method* máy suy ra được; nợ *hành vi* thì không |

### ⛔ Mục 2 — cấm máy hoá, cấm suy diễn

**Không được dùng grep tên hàm để kết luận một bên "có" hay "không có" tính năng.**
Repo này đã chứng minh điều đó sai **bốn lần trong một ngày**: `referencesAdd` báo "cả hai
đều thiếu" (pattern sai hoa thường) · `assertTrialDevMode` báo "Gemini thiếu" (Gemini có, tên
khác, nằm ở `dev-trial-core.js`) · `tryBeginRun` một dòng sai · nhận dạng ảnh theo byte thiếu
hẳn một dòng vì **không ai nghĩ ra để dò**.

Cái cuối là lý do quyết định: grep chỉ tìm được thứ bạn đã nghĩ ra để tìm. *"Không tìm thấy
tên"* ≠ *"không có tính năng"*. Mục 2 vẫn là **[ĐỌC]** — người mở code đọc và chịu trách
nhiệm. Nếu script chạm vào mục 2, patch này FAIL.

## Nguyên tắc marker — máy sở hữu đúng phần máy đo

**KHÔNG ghi đè cả file.** Chỉ thay phần nằm giữa hai marker:

```
<!-- AUTO:BRIDGE START -->
...máy sinh, đừng sửa tay...
<!-- AUTO:BRIDGE END -->
```

Hai khối: `AUTO:BRIDGE` (mục 1) và `AUTO:MODULES` (mục 3). Thêm `AUTO:DEBT-METHODS` trong mục 4
(xem dưới). Mọi thứ ngoài marker — lời dẫn, cảnh báo về dòng [DÒ], mục 2, mục 5, mục 6, các
đính chính có ghi ngày — **giữ nguyên từng byte**.

**Thiếu marker → báo lỗi rõ ràng và exit 1. Tuyệt đối không đoán chỗ chèn.** Ghi nhầm chỗ vào
một file đang chứa lập luận của người thì hỏng nặng hơn là không chạy.

## Đo cái gì

### Khối `AUTO:BRIDGE` (mục 1)

Trích **tên** method, không chỉ đếm: `registryEntry({ name: "<tên>"` trong `bridge-core.js`
hai bên. **Đã kiểm chứng: trích được 22/22 và 19/19 tên** — nên máy dựng được cả ma trận,
không chỉ con số tổng.

Sinh ra: tổng mỗi bên · bảng từng method với ✅/❌ hai cột · và **danh sách method chỉ một bên
có** (phép trừ tập hợp — đây là thứ hiện đang gõ tay và đã sai một lần). Sắp xếp theo tên,
deterministic.

### Khối `AUTO:MODULES` (mục 3)

- Số file `.js` mỗi bên.
- **File giống hệt từng byte** — **phải chuẩn hoá `\r\n` → `\n` trước khi băm.** GPT dùng LF,
  Gemini dùng CRLF; không chuẩn hoá thì 100% file báo lệch, và bảng thành vô nghĩa.
- File **chỉ một bên có** (chỉ tên file, **không có cột mô tả** — mô tả là việc của người).
- File có ở cả hai nhưng khác nhau, kèm số dòng mỗi bên, sắp theo chênh lệch giảm dần.

> **Cột "Là gì" hiện có trong mục 3 là văn của người** (`ab-poll-core.js` → "chính sách trả
> lời poll A/B"). Nó **không được nằm trong khối AUTO** — máy sinh lại sẽ xoá mất. Chuyển nó
> xuống một đoạn ghi chú của người **bên dưới marker END**, và nói rõ trong brief này rằng
> phần đó do người giữ.

### Khối `AUTO:DEBT-METHODS` (mục 4)

Chỉ nợ **method**, suy ra bằng phép trừ tập hợp từ khối BRIDGE. Nợ **hành vi** ở mục 4 vẫn là
đoạn văn của người, gắn nhãn **[KHAI]**, và mỗi món nên trỏ tới dòng bằng chứng ở mục 2.

Đây chính là chỗ đã tự mâu thuẫn ngày 27/08: mục 4 viết "GPT nợ Gemini: không còn gì" trong
khi mục 2 ghi rõ GPT thiếu nhận dạng ảnh theo byte. Tách hai nửa ra thì lỗi đó không tái diễn
được — nửa máy không thể sai, nửa người thì đứng cạnh nhãn [KHAI] nên đọc là biết phải kiểm.

## Hai mode, giống hệt dashboard

```bash
node scripts/feature-parity.mjs           # sinh, ghi vào các khối AUTO
node scripts/feature-parity.mjs --check    # chỉ đọc, KHÔNG ghi file
```

`--check`: khớp → exit 0; lệch → exit 1 kèm **số dòng thật**, nội dung hai bên, và câu lệnh
sửa. **Không bao giờ ghi file ở mode `--check`** — lỡ ghi thì nó tự làm mình luôn xanh.

## Deliverables — đúng 4 file

| # | File | Việc |
|---|---|---|
| 1 | `scripts/feature-parity.mjs` (mới) | generator + `--check` |
| 2 | `tests/feature-parity-smoke.mjs` (mới) | ca ghim |
| 3 | `FEATURE-PARITY.md` | **chỉ** chèn marker + dời cột mô tả người ra ngoài marker |
| 4 | `package.json` | thêm `parity`, `test:parity`, nối vào chuỗi `test` |

**KHÔNG đụng** `session-check.mjs`, `safe-push.mjs`, `build-dashboard.mjs`, `*.js` của
extension, `STATUS.md`, `DASHBOARD.md`. Nâng cổng kiểm là việc riêng, audit riêng.

## Test ghim — tối thiểu 8 ca

1. Trích tên method từ chuỗi `registryEntry({ name: "..." })` — cả ca có xuống dòng bất thường.
2. Phép trừ tập hợp ra đúng danh sách method chỉ một bên có, **cả hai chiều**.
3. **Chuẩn hoá CRLF/LF trước khi băm:** hai file cùng nội dung khác kiểu xuống dòng → **giống
   hệt**. Đây là ca dễ mất nhất và làm hỏng cả bảng.
4. Chỉ phần giữa marker bị thay; **văn bản ngoài marker giống hệt từng byte** trước và sau.
5. Thiếu marker → exit 1, thông báo nêu tên marker thiếu, **không ghi gì cả**.
6. `--check` khớp → exit 0; lệch → exit 1 nêu dòng + lệnh sửa.
7. `--check` **không ghi file** ở cả hai kết cục (chứng minh bằng hash).
8. Deterministic: sinh hai lần trên cùng cây → giống hệt từng byte.
9. **Ca hồi quy trên repo thật:** chạy generator trên repo hiện tại, đối chiếu tổng method với
   `22` và `19` **đo lại tại chỗ**, không hard-code từ tài liệu.

## Luật cũ vẫn áp

Node thuần, không thêm gói. Deterministic — không `Date.now()`, không `new Date()`, không
format theo locale. Git gọi kèm `-c core.quotepath=false`. Resolve đường dẫn bằng
`fileURLToPath`. Chữ operator: tiếng Việt; mã lỗi: tiếng Anh.

## Xong thì

`npm test` xanh · `session-check --as <nhãn>` xanh toàn bộ · `build-dashboard.mjs --check`
vẫn exit 0 · `feature-parity.mjs --check` exit 0.

**Mutation test, mỗi phép tự assert chuỗi cần phá có thật trước khi sửa** (27/08 đã có một
phép báo "xanh" chỉ vì lệnh sửa chưa hề áp dụng). Bắt buộc phá đủ: bỏ chuẩn hoá xuống dòng ·
làm hỏng phép trừ tập hợp · cho `--check` ghi file · cho ghi đè ngoài marker · bỏ kiểm marker
thiếu. Mỗi phép, ca tương ứng phải đỏ.
