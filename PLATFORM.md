# PLATFORM.md — Extension Operation Platform V0.1

> **Đọc file này khi:** muốn biết repo có những extension nào, cái nào dùng được, và thêm
> cái mới thì làm sao. Luật chung của repo nằm ở [`AGENTS.md`](AGENTS.md) — file này không
> chép lại luật, chỉ nói về **vận hành nhiều extension trong một repo**.

## 1. Vì sao có platform này

Repo có 3 extension. Trước V0.1, không có chỗ nào trả lời nhanh cho Đức sáu câu:

> *Có gì? · Trạng thái ra sao? · Đã kiểm chứng chưa? · Dùng làm gì? · Tiếp theo làm gì? · Đọc sâu ở đâu?*

Thử trả lời bằng tài liệu gõ tay thì **hỏng hai lần trong đúng một ngày (26/08)**:

- `BACKLOG.md` ghi Gemini còn thiếu `run.stop` / `chat.reload` — thực tế đã port xong.
  Không ai cố ghi sai; chỉ là không có gì buộc sổ phải cập nhật theo code.
- Trang dashboard gõ tay sai **bốn con số** sau đúng một ngày (tổng test, số lệnh Bridge,
  số việc còn mở, số món nợ port).

Kết luận rút ra, và là nguyên tắc số 1 của platform: **thứ gì máy đếm được thì máy đếm.**

## 2. Platform V0.1 gồm đúng hai thứ

| Thứ | Ai viết | Là gì |
|---|---|---|
| `STATUS.md` trong mỗi extension | **người** | Lời khai trạng thái vận hành: đang sống hay ngủ, kiểm chứng lần cuối bằng gì, việc đang mở, đọc sâu ở đâu. |
| [`DASHBOARD.md`](DASHBOARD.md) ở gốc repo | **máy** | Bảng tổng, sinh ra từ các `STATUS.md` + đo thẳng từ repo. **Không bao giờ gõ tay.** |

Sinh lại dashboard:

```bash
node scripts/build-dashboard.mjs
```

Khuôn mẫu để khai extension mới: [`STATUS.template.md`](STATUS.template.md).

### Ranh giới, đọc kỹ chỗ này

`STATUS.md` là nguồn sự thật của **trạng thái vận hành** — KHÔNG phải của toàn bộ kiến thức.
Kiến trúc, cách dùng, bảng lỗi, hướng dẫn dài vẫn ở `README.md` / `HANDOFF.md` /
`AI-OPERATOR-GUIDE.md`; STATUS **chỉ trỏ link tới**.

Lý do không phải thẩm mỹ: hai chỗ nói cùng một điều thì sớm muộn nói khác nhau — đúng cái
bệnh platform này sinh ra để chữa. Một STATUS phình thành README thứ hai là đã hỏng.

## 3. Registry — repo có gì

Bảng **có số liệu đo được** nằm ở [`DASHBOARD.md`](DASHBOARD.md) và luôn tươi hơn bảng dưới.
Bảng dưới chỉ để biết *tồn tại những gì*.

| # | Extension | Ở đâu | Khai STATUS chưa |
|---|---|---|---|
| 001 | **Duc Auto ChatGPT** — chạy kế hoạch XLSX tạo ảnh trên ChatGPT | `workers/duc-auto-chatgpt/v0.1.0/` | ✅ [STATUS](workers/duc-auto-chatgpt/v0.1.0/STATUS.md) |
| 002 | **Duc Auto Gemini (Platform)** — cùng bài toán, trên Gemini | `workers/duc-auto-gemini/v0.2.0/` | ✅ [STATUS](workers/duc-auto-gemini/v0.2.0/STATUS.md) |
| — | Duc Auto Gemini bản cũ | `workers/duc-auto-gemini/v0.1.0/` | ❌ chưa — bản cũ, giữ để tra cứu |
| — | **Extension Observer V0** — quan sát debug target, chỉ đọc | gốc repo | ❌ chưa — **việc mở** |

Hai dòng ❌ vẫn hiện trên dashboard với nhãn **"CHƯA KHAI STATUS"**. Cố ý: tài sản trong repo
không được phép biến mất khỏi registry chỉ vì chưa ai khai nó.

## 4. Luồng chuẩn — mở phiên, làm, đóng phiên

Ba bước của [`AGENTS.md`](AGENTS.md) mục 0, thêm đúng một bước cho platform:

1. **Mở phiên** — đọc `AGENTS.md` gốc → `AGENTS.md` của package → **`STATUS.md` của package**
   → `HANDOFF.md` (phần cuối). STATUS cho biết *đứng ở đâu*; HANDOFF cho biết *phiên trước
   làm gì*. Đọc STATUS trước thì đỡ phải lội hết HANDOFF.
2. **Làm việc** — một việc một lúc. Việc ngoài phạm vi → `BACKLOG.md`, không tự làm.
3. **Đóng phiên** —
   a. cập nhật `STATUS.md` nếu trạng thái đổi (kiểm chứng mới → sửa `last_verified` +
      `last_verified_commit` + `evidence_ref`; việc mở đổi → sửa `current_focus`);
   b. `node scripts/build-dashboard.mjs` → commit `DASHBOARD.md` sinh ra;
   c. `node scripts/session-check.mjs --as <nhãn-của-bạn>` → **xanh toàn bộ** mới được nói xong.

## 5. Hai vai — checklist, không phải chức danh

Đây **không** phải hai người mới, cũng không phải cơ chế mới. Chỉ là gọi tên hai bó việc mà
`AGENTS.md` đã bắt làm, để không ai quên nửa nào.

### Vai Orchestrator — người điều phối một phiên

- [ ] Đọc `AGENTS.md` gốc + `AGENTS.md` package + `STATUS.md` + `HANDOFF.md` trước khi gõ dòng đầu.
- [ ] Ghi tên mình vào [`.agents/claims.json`](.agents/claims.json) cho **mọi** package sắp đụng.
      Package có chủ khác → **chỉ đọc**. Muốn giành → hỏi Đức.
- [ ] Chia việc đúng vai (`AGENTS.md` mục 5): Codex viết code, Antigravity dựng UI,
      Claude kiến trúc + audit. Giao chéo vai thì phải nói rõ vì sao.
- [ ] **Kiểm chứng độc lập mọi báo cáo của AI khác** — tự chạy lại test, tự đọc lại diff.
      "Xong" của agent phụ không phải bằng chứng.
- [ ] Đóng phiên: 1 dòng Log vào `HANDOFF.md` mỗi package đã đụng · quyết định mới của Đức
      vào `decisions.md` · lỗi mới gặp trên trang thật vào bảng lỗi của sổ tay.
- [ ] Trả `owner` về `null` trong `claims.json` khi buông package.

### Vai Maintainer — người giữ sức khoẻ một extension

- [ ] `STATUS.md` khớp sự thật. Đặc biệt: `current_focus` có đúng là việc đang mở lớn nhất không.
- [ ] Khai "đã kiểm chứng" thì **kèm bằng chứng có thật**. Generator từ chối lời khai không
      bằng chứng — nó **đỏ**, không phải cảnh báo cho qua.
- [ ] Cột "Code đổi sau kiểm chứng?" trên dashboard hiện `CÓ` → hoặc kiểm chứng lại và cập
      nhật mốc, hoặc nói rõ trong `current_focus` rằng lời khai đã cũ.
- [ ] Mọi file/thư mục mới → khai một dòng vào **Bản đồ file** trong `AGENTS.md` của package.
- [ ] Mỗi fix một test ghim. Không làm yếu lớp bảo vệ đã có để cho test xanh.

## 6. Thêm Extension #003

1. Dựng thư mục có `manifest.json`. Đặt trong `workers/<tên>/<vX.Y.Z>/` nếu là worker.
2. Chép [`STATUS.template.md`](STATUS.template.md) → `STATUS.md` đặt **cạnh `manifest.json`**, điền.
3. Khai `STATUS.md` vào **Bản đồ file** trong `AGENTS.md` của package.
4. Thêm một dòng chủ sở hữu vào [`.agents/claims.json`](.agents/claims.json).
5. `node scripts/build-dashboard.mjs` → nó **đỏ và nói rõ sai gì** nếu khai thiếu hoặc khai
   vào file ma. Xanh thì commit `DASHBOARD.md` sinh ra.
6. Thêm một dòng vào bảng registry mục 3 của file này, và vào bảng "Sổ tay mở khi cần"
   của [`AGENTS.md`](AGENTS.md) gốc nếu extension có sổ tay riêng.

Bỏ bước 2 vẫn chạy được — extension sẽ hiện trên dashboard với nhãn **"CHƯA KHAI STATUS"**.
Đó là cố ý: quên khai thì lộ ra, không im lặng biến mất.

## 7. Roadmap

**V0.1 — xong** (nội dung file này): schema `extension-status/v1` · 2 STATUS pilot ·
generator deterministic · `DASHBOARD.md` sinh tự động · test ghim.

**V0.2 — đã chốt phạm vi, chờ Đức duyệt từng món:**

| Món | Vì sao chưa làm ở V0.1 |
|---|---|
| Gắn `--check` vào `session-check.mjs` (so bản sinh với bản commit) | Đổi cổng kiểm = Đức duyệt riêng |
| `scripts/feature-parity.mjs` — biến `FEATURE-PARITY.md` mục 1 + 3 thành số máy đếm | Là B-06 bước 1–2, việc riêng |
| `BACKLOG.md` cho nhánh Gemini | Nhánh đó chưa có sổ; cần phiên giữ package đó dựng |
| `STATUS.md` cho Observer V0 | Chưa ai giữ package đó |
| Đóng protocol lặp lại (tạo extension / đóng phiên) thành skill | Chưa đủ lần lặp để biết hình dạng đúng |

**Ngoài phạm vi, đã chốt là KHÔNG làm:** agent daemon, automation engine tự chạy.
Luật gốc của Đức: không tạo automation tự chạy nếu chưa hỏi.

## 8. Câu hỏi còn treo — chờ Đức

1. **Artifact dashboard cũ** (bản `claude-gemini-4`, đang kẹt force-publish): nay đã có
   `DASHBOARD.md` sinh tự động — trang artifact nên **sinh lại từ nó**, hay **cho nghỉ**?
2. **`core.autocrlf=true` và không có `.gitattributes`.** Generator ghi LF; git lưu LF; máy
   khác checkout ra CRLF; chạy lại sinh LF → **diff giả**. Chưa cắn ở V0.1 (chưa có `--check`),
   sẽ cắn đúng lúc V0.2 bật `--check`. Chữa bằng đúng một dòng `.gitattributes`
   (`DASHBOARD.md text eol=lf`) — nằm ngoài 7 deliverables của V0.1 nên **chưa tự thêm**.

3. **Dấu commit trên dashboard tự tham chiếu — phải giải trước khi V0.2 bật `--check`.**
   Trang ghi "sinh tại commit X". Nhưng commit chính `DASHBOARD.md` sinh ra sẽ tạo commit Y,
   nên file nằm trong repo **luôn** trỏ về commit ngay trước nó. Hệ quả: `--check` (so bản
   sinh với bản commit) sẽ **luôn báo lệch**, kể cả khi không ai đụng gì.

   Đây **không phải bug của người code** — brief V0.1 mục 2 nguyên tắc 4 chốt đúng thiết kế
   này ("dấu thời gian duy nhất = SHA của HEAD"), và tính chất nó hứa vẫn đúng: *chạy hai
   lần trên cùng một cây thì ra hai file giống hệt*. Nhưng nó **không** đủ mạnh cho `--check`.
   Auditor độc lập (Codex) dựng lại được ca này trong repo thật.

   Ba đường đi, Đức chọn: (a) bỏ dấu commit khỏi trang, chỉ giữ dấu bên trong git; (b) `--check`
   chỉ so **phần bảng**, bỏ qua dòng dấu; (c) sinh dashboard trong hook trước commit. Ý kiến
   của tôi: **(b) rẻ nhất và không đổi thiết kế đã chốt.**

## Log

> Chỉ thêm dòng, không sửa dòng cũ. Mới nhất ở cuối.

- **2026-08-26** · Claude (`claude-platform-2`) điều phối · **V0.1 dựng xong.** Phân vai:
  Claude viết `PLATFORM.md` + `STATUS.template.md` + 2 `STATUS.md`; Codex viết
  `scripts/build-dashboard.mjs` + `tests/build-dashboard-smoke.mjs`; Antigravity review độc
  lập generator (V0.1 không có UI nên AGY không có việc dựng). Số liệu 2 STATUS pilot đã đối
  chiếu lại với repo trước khi dùng: 2 SHA resolve được, 2 file bằng chứng tồn tại, method
  Bridge 22/19, file test 94/81 — khớp brief.
