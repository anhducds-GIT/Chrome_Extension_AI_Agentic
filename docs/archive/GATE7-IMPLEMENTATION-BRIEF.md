---
kind: study
status: superseded
ttl_days: 180
---

# Brief V0.2-D — Gate #7, và ranh giới "committed truth"

> **Chốt bởi:** GPT + Claude, 2026-08-27. Audit nền: `drafts/GATE7-CONCURRENCY-AUDIT.md`.
> **Người giữ `_root`:** `opus-platform-2`. **Người code:** Codex.
> **Đây là patch ĐỔI HIẾN PHÁP CỔNG.** `AGENTS.md` mục 0 cấm tự sửa cổng kiểm — patch này
> được phép **chỉ vì Đức/GPT đã duyệt riêng**. Không mở rộng thêm một dòng nào.

## Nguyên tắc khoá toàn bộ patch

> **`DASHBOARD.md` chỉ chứa sự thật ĐÃ COMMIT. Trạng thái sống của workspace không bao giờ
> được ghi vào artifact đã commit.**

Mọi quyết định dưới đây suy ra từ đúng câu đó. Gặp ca không rõ → quay lại câu đó, đừng tự chế.

Ranh giới mới, sạch: **Gate 1–6 = phiên / workspace · Gate 7 = committed truth.**

## Ba quyết định đã chốt

### QĐ 1 — Tín hiệu dirty ra khỏi artifact

Cột hiện tại ghi được `CÓ (N file đang sửa dở, CHƯA commit)` **vào file được commit**. Câu đó
đúng đúng một khoảnh khắc: ngay khi commit, những file ấy **đã commit**, và nó thành sai —
nằm lại trong repo tới lần sinh sau. Bốn vòng audit không bắt được vì lúc đó chỉ có `.md` bẩn.

**Phải làm:**
- **Đổi tên cột** thành `Code đã commit đổi sau kiểm chứng? [ĐO]`.
- Cột chỉ so `last_verified_commit → HEAD`. **Không đọc working tree.** Giá trị: `KHÔNG` ·
  `CÓ (N commit)` · `KHÔNG ÁP DỤNG (chưa khai mốc commit)`.
- **Gỡ `dirtyCount` khỏi model và khỏi mọi ô render.**
- Tín hiệu dirty **không biến mất** — nó chuyển thành **cảnh báo in ra màn hình** khi chạy
  `node scripts/build-dashboard.mjs` (mode sinh, KHÔNG phải mode kiểm). Ví dụ:
  `CẢNH BÁO: workers/duc-auto-gemini/v0.2.0 đang có 2 file .js sửa dở chưa commit — số trên
  trang là số ĐÃ COMMIT, chưa tính phần đang sửa.`
  Hữu ích y hệt, và không bao giờ mục vì không được lưu.

### QĐ 2 — Bỏ cột "Đang giữ (claims)" khỏi dashboard

`claims.json` là **trạng thái điều phối sống**, cùng họ với dirty state: một phiên claim rồi
release nhiều lần. Để nó trong artifact thì sinh ra churn **do thiết kế**:
`claim → dashboard cũ → sinh lại → commit → release → dashboard lại cũ`.

Tôi đã va vào đúng vòng này ba lần trong ngày 27/08.

**Phải làm:** bỏ hẳn cột. `collectModel` không cần đọc `.agents/claims.json` nữa — **gỡ luôn
lượt đọc đó**, đừng để lại code chết.

**Nguồn đúng để biết "ai đang giữ" vẫn là `.agents/claims.json` và output của
`session-check.mjs`.** Ghi một dòng vào `PLATFORM.md` mục 4 trỏ tới đó, để người đọc mất cột
này không bị hụt.

### QĐ 3 — `EXPECTED_CHECKS` 6 → 7

Thêm **một** phép kiểm, tên: **"Sự thật máy sinh còn tươi"**.

## Ngữ nghĩa Gate #7 — bảy luật, không được bớt luật nào

| # | Luật | Vì sao |
|---|---|---|
| 1 | **Dựng từ HEAD, không đọc working tree** | Mấu chốt. Foreign dirty work **không tồn tại** dưới góc nhìn HEAD, nên không cần logic phân vùng trách nhiệm riêng |
| 2 | **Chạy cả `build-dashboard` lẫn `feature-parity`** | Hai artifact, một câu hỏi |
| 3 | **Chỉ đọc tuyệt đối** — không ghi, không stash, không `checkout` | Cổng mà sửa cây thì nó phá đúng thứ nó đang canh |
| 4 | **Việc làm dở của phiên khác KHÔNG được làm đỏ** | Chính lý do `session-check` phân vùng trách nhiệm ngay từ đầu |
| 5 | **Việc làm dở của CHÍNH mình cũng không làm đỏ** | Suy ra từ luật 1; nếu không thì cổng đỏ suốt lúc đang làm |
| 6 | **`--quick` KHÔNG bỏ qua** | `--quick` sinh ra để bỏ **test** (chậm). Phép kiểm này chỉ đọc vài blob git — rẻ |
| 7 | **Đỏ khi khối máy sinh đã commit bị cũ**, kèm lệnh sửa | Đó là toàn bộ lý do nó tồn tại |

### Cách dựng từ HEAD

Cả hai script đã có **deps tiêm được** — dùng đúng cơ chế đó, đừng viết đường đọc file thứ hai.
Thêm `createHeadDeps()` bên cạnh `createDefaultDeps()`:

- `readFile(p)` → `git show HEAD:<p>`
- `fileExists(p)` / `isFile(p)` → tra `git cat-file -e HEAD:<p>` hoặc `git ls-tree`
- `listFiles(p)` / `listDirs(p)` → `git ls-tree --name-only HEAD <p>/`
- so với `git show HEAD:DASHBOARD.md` và `git show HEAD:FEATURE-PARITY.md`

**Thêm mode `--check-head` cho cả hai script.** Giữ nguyên `--check` cũ (đọc working tree) —
nó trả lời câu khác và vẫn hữu ích lúc đang làm. Hai mode, hai câu hỏi, tên khác nhau:

| Lệnh | Câu hỏi |
|---|---|
| `--check` | *cây làm việc của tôi lúc này có khớp không?* |
| `--check-head` | *bản đã commit có khớp với repo đã commit không?* — gate #7 dùng cái này |

Git gọi kèm `-c core.quotepath=false` như mọi chỗ khác.

### Chỗ đặt trong `session-check.mjs`

Sau các phép kiểm hiện có, **trước** khi in tổng kết. Đúng thứ tự vận hành: chạy **sau commit,
trước `safe-push`** — trước commit thì HEAD chưa có việc mới, cổng vô nghĩa. Ghi rõ điều này
vào chú thích của phép kiểm và vào `PLATFORM.md` mục 4.

## Deliverables — đúng 6 file

| # | File | Việc |
|---|---|---|
| 1 | `scripts/build-dashboard.mjs` | gỡ `dirtyCount` + cột claims · đổi tên cột · cảnh báo dirty ra stdout · `createHeadDeps` + `--check-head` |
| 2 | `scripts/feature-parity.mjs` | `createHeadDeps` + `--check-head` |
| 3 | `scripts/session-check.mjs` | thêm phép kiểm #7 · `EXPECTED_CHECKS` 6 → 7 |
| 4 | `tests/build-dashboard-smoke.mjs` | ca ghim |
| 5 | `tests/feature-parity-smoke.mjs` | ca ghim |
| 6 | `DASHBOARD.md` | **sinh lại**, không gõ tay |

Cập nhật `PLATFORM.md` mục 4 (một dòng về thứ tự chạy + chỗ tra claims) là việc của Claude,
**không phải của bạn**. Không đụng `safe-push.mjs`, `*.js` của extension, `STATUS.md`,
`FEATURE-PARITY.md` (ngoài khối AUTO do script tự sinh), vùng bằng chứng.

## Test bắt buộc

**Ca 1 là ca quan trọng nhất của cả patch. Thiếu nó thì patch chưa xong.**

1. **Foreign dirty → KHÔNG chặn oan.** File `.js` chưa commit trong package **không** thuộc
   phiên hiện tại → gate #7 vẫn **XANH**.
2. **Own dirty → cũng không chặn.** Cùng cách, trong package của chính phiên → vẫn xanh.
3. **Artifact đã commit bị cũ thật → ĐỎ**, thông báo nêu lệnh sửa.
4. **Chỉ đọc:** chạy gate #7 hai lần → `git status --porcelain` và HEAD **không đổi**.
5. **`--quick` vẫn chạy phép kiểm này** — assert nó không rơi vào nhánh `skipped`.
6. **`EXPECTED_CHECKS` = 7**, và cơ chế tự-tố-khi-cổng-bị-sửa còn nguyên.
7. **Dashboard không còn chữ "CHƯA commit" và không còn cột claims** — assert trên chuỗi sinh ra.
8. **Cảnh báo dirty vẫn in ra ở mode sinh** — assert nó ở stdout, **không** ở nội dung file.
9. **Đổi `claims.json` KHÔNG làm dashboard đổi** — ca này chứng minh QĐ 2 đã cắt đúng vòng lặp.

## Luật cũ vẫn áp

Node thuần, không thêm gói. Deterministic — không `Date.now()`, không `new Date()`, không
locale. `buildDashboard` vẫn phải **thuần**. Resolve đường dẫn bằng `fileURLToPath`. Chữ
operator: tiếng Việt; mã lỗi: tiếng Anh.

**KHÔNG được làm yếu bất kỳ phép kiểm 1–6 nào để #7 dễ xanh.** Sửa bug thì được; gỡ bảo vệ thì
không. Đây là patch đụng vào chính cổng kiểm, nên luật này là quan trọng nhất.

## Xong thì

`npm test` xanh · `session-check --as <nhãn>` xanh **toàn bộ 7 mục** · cả bốn mode
(`--check` và `--check-head` của hai script) đúng exit code.

**Mutation test, mỗi phép tự assert chuỗi cần phá có thật trước khi sửa.** Bắt buộc phá đủ:
cho gate #7 đọc working tree thay vì HEAD (ca 1 phải đỏ) · cho gate #7 luôn trả xanh (ca 3
phải đỏ) · cho `--quick` bỏ qua nó (ca 5 phải đỏ) · để `EXPECTED_CHECKS` ở 6 (cổng phải tự tố).

> **Và phá đúng CƠ CHẾ, đừng phá tên biến.** Ngày 27/08 một phép phá của Claude chỉ đổi tên
> một hằng chuỗi lỗi chứ không vô hiệu `throw`, nên "xanh" là đúng chứ không phải test giả.
> Mutation test sai cũng nói dối y như test sai.
