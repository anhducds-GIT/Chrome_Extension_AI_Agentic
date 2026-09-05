---
kind: brief
status: done
ttl_days: 30
---

# BRIEF — Phiên S7: bật chặn + BÀI TEST NGHIỆM THU

> **Đây là cột mốc chính của cả chương trình.** Đạt = mục tiêu chính đã xong.
> Phiên này có **hai phần chạy ở hai chỗ khác nhau** — đọc mục "Chia việc" trước khi bắt đầu.

## Chia việc — quan trọng, đừng gộp

| Phần | Ai chạy | Ở đâu |
|---|---|---|
| **A · Bật chặn** (code) | AI | Chat nào cũng được — nên dùng chat đã làm S5/S6 vì đã có ngữ cảnh |
| **B · Bài test nghiệm thu** | **Đức, tự làm** | **Một chat AI HOÀN TOÀN MỚI** |

Phần B **phải** ở chat mới và **phải** do Đức dán. Một phiên đã đọc repo rồi thì không còn
là phép thử — nó biết đáp án. Đừng để AI tự chạy phần B rồi báo là đạt.

---

# PHẦN A — Bật chặn

## Mở phiên

1. Đọc `AGENTS.md` gốc → `llms.txt` → `DASHBOARD.md` → `HANDOFF.md` gốc (cuối file).
2. Nhận `_root`. **Giữ tới khi push xong**, trả bằng commit riêng sau.
3. `node scripts/session-check.mjs --as s7-block` — ĐỎ thì DỪNG.

## Điều kiện đã đủ — đã kiểm tại `b71128a`

Tám phép kiểm sắp bật chặn **đều đang XANH**:

```
B1 XANH · B2 XANH · B3 XANH · B4 XANH · B5 XANH · B7 XANH · B10 XANH · B12 XANH
```

Tự chạy `node scripts/check-bootstrap.mjs` xác nhận lại trước khi bật. Nếu có cái nào đỏ thì
**DỪNG** — bật chặn khi đang đỏ là tự khoá cả repo.

## Việc cần làm

### 1. Bật chặn 8 phép kiểm, giữ 6 phép kiểm còn lại ở mức cảnh báo

**Chặn:** B1 · B2 · B3 · B4 · B5 · B7 · B10 · B12
**Vẫn chỉ cảnh báo:** B6 · B8 · B9 · B11 · B13 · B14

Vì sao sáu cái kia chưa chặn: chúng đang có nợ thật chưa trả (B6 còn 17 chỗ, B9 còn 2), và
chúng là nợ *chất lượng* chứ không phải *sai dữ liệu*. Chặn khi còn nợ là khoá repo vì một
việc chưa ai hứa sẽ làm xong hôm nay.

Cơ chế: thêm trường mức chặn vào `.repo-structure.json` (ví dụ `blocking: ["B1","B2",…]`)
thay vì viết cứng danh sách trong code — S8 và các repo khác sẽ cần đổi danh sách này mà
không phải sửa script.

### 2. Cổng con nay làm cổng đỏ được

`session-check.mjs` hiện gọi `check-bootstrap.mjs` ở chế độ cảnh báo. Sau S7, một phép kiểm
thuộc nhóm chặn mà đỏ thì **cổng đóng phiên phải đỏ theo**.

Giữ nguyên lớp fail-closed đã có: nếu chính `check-bootstrap.mjs` không chạy được thì cổng
đỏ với mã `BOOTSTRAP_KHONG_CHAY_DUOC` — *bộ kiểm hỏng* khác *repo có nợ*.

### 3. Test ghim — bắt buộc, và phải ghim ĐÚNG chiều

Hai chiều, thiếu chiều nào cũng là ghim hụt:

- **Chiều đỏ:** dựng một repo giả vi phạm B1 (có `manifest.json`, không có `STATUS.md`) →
  cổng đóng phiên phải ĐỎ. Làm tương tự cho ít nhất ba phép kiểm chặn khác.
- **Chiều xanh:** một phép kiểm thuộc nhóm **cảnh báo** (ví dụ B6) đang đỏ thì cổng vẫn
  phải XANH. Không có phép kiểm này thì một hôm nào đó ai đó bật chặn B6 mà không ai biết.

Chạy mutation trước khi báo xong. **Kiểm fixture có phân biệt được hai nhánh không** — repo
này đã hai lần có mutation "bị bắt" giả vì fixture không dựng nổi ca hỏng.

### 4. Rút mục 9 Project Instructions còn một dòng

⚠️ **Đây KHÔNG phải file trong repo.** Đó là ô "Project Instructions" của Đức trên giao diện
Claude. AI không sửa được — **soạn sẵn một dòng thay thế và đưa Đức tự dán**.

Một dòng đó nên là: *"Đọc `AGENTS.md` ở gốc repo trước khi làm gì."* — vì từ S1–S6, mọi luật
đã nằm trong repo và tự cưỡng chế được. Chép luật vào ô Project Instructions là tạo nguồn sự
thật thứ hai, đúng cái bệnh cả chương trình này chữa.

### 5. Gỡ nhãn `unproven`

Roadmap mục 1 quy định bộ artifact trích ra mang nhãn `unproven` cho tới khi bài test đạt.
**Chỉ gỡ SAU KHI Đức báo phần B đạt** — không gỡ trước.

## Cấm

- KHÔNG bật chặn B6 · B8 · B9 · B11 · B13 · B14
- KHÔNG đụng `workers/duc-auto-gg-flow-video/` — phiên khác đang giữ (xem "Việc còn mở")
- KHÔNG đụng `evidence/`, `Pilot-*`, `Batch-*`, `pilots/` · KHÔNG dùng `git add -A`

## Đóng phiên phần A

> Bộ sinh đọc **hoàn toàn từ HEAD** — chạy trước khi commit là dựng lại từ HEAD cũ.
> **Giữ `_root` qua cổng kiểm, trả quyền SAU khi push.** Trả sớm là cổng đỏ ngay mục 1.

```bash
git add scripts/ tests/ .repo-structure.json AGENTS.md
git status --short
git commit -m "S7: bat chan 8 phep kiem, 6 phep kiem con lai giu muc canh bao"

node scripts/build-dashboard.mjs

git add DASHBOARD.md llms.txt repo-map.json HANDOFF.md
git commit -m "chore: sinh lai artifact + ghi HANDOFF sau S7 phan A"

node scripts/session-check.mjs --as s7-block     # PHẢI xanh
node scripts/safe-push.mjs --as s7-block
# CHỈ SAU KHI PUSH mới trả quyền, bằng commit riêng
```

⚠️ Đừng nối hai lệnh cuối bằng `&&` sau `| tail` — ống dẫn trả mã thoát của `tail` nên push
chạy dù cổng đỏ. Đã xảy ra thật ở phiên S3.

---

# PHẦN B — Bài test nghiệm thu (Đức tự chạy)

Mở **một chat AI hoàn toàn mới**. Dán đúng một dòng, không thêm gì:

```
Đọc llms.txt ở gốc repo anhducds-GIT/Chrome_Extension_AI_Agentic rồi cho tôi biết ba điều: repo có những extension gì và cái nào đang sống, việc ưu tiên số 1 hiện tại là gì và thuộc gói nào, tôi nên đọc file nào tiếp theo.
```

**ĐẠT** khi nó nói được **cả ba**, **không hỏi lại câu nào**.

**KHÔNG ĐẠT** thì ghi lại **chính xác câu nó đã hỏi** — mỗi câu hỏi là một trường dữ liệu còn
thiếu. Mở backlog bổ sung trường đó rồi test lại. **Không sửa bằng cách dặn AI đọc kỹ hơn.**

Ghi kết quả vào `evidence/2026xxxx-bootstrap-test-r02/`, theo mẫu của
`evidence/20260902-bootstrap-test-r01/`.

> **Vì sao vẫn phải chạy dù r01 đã đạt.** Vòng r01 đạt ở **dạng vận hành** — phiên mới tự lần
> ra brief và làm việc, không hỏi câu nào. Nhưng nó **không được hỏi ba câu này**. Đó là hai
> phép thử khác nhau, và bản ghi r01 cố ý không gộp. Đây là dạng chính thức.

---

## Việc còn mở — KHÔNG thuộc S7, đừng tiện tay làm

**① 8 tham chiếu `drafts/…` đã chết trong `workers/duc-auto-gg-flow-video/`** — trong đó có
`AI-OPERATOR-GUIDE.md`, tài liệu operator đọc **lúc chạy live**. Thư mục `drafts/` biến mất ở
S6 nên các đường dẫn này trỏ vào chỗ trống. Đường dẫn mới có trong `docs/README.md`.
**Không sửa được ở S7** vì phiên `claude-bridge-multiprofile` đang giữ package đó. Sửa ngay
khi package được trả — đây là tài liệu vận hành, không phải tài liệu tham khảo.

**② 8 quyết định của `gg-flow-video` chưa thành ADR** — cùng lý do, và file đó dùng định dạng
văn xuôi khác hẳn hai gói kia nên cần bộ tách riêng.

**③ B6 còn 17 chỗ · B9 còn 2** — thuộc phiên S8 (trả nợ cũ), không phải S7.

## Đức nghiệm thu S7

Phần A: cổng kiểm xanh, và thử tạo một vi phạm (ví dụ đổi `lifecycle` của một STATUS thành
chữ bậy) → cổng phải ĐỎ và nói rõ sửa thế nào.
Phần B: chat mới trả lời được cả ba câu, không hỏi lại.

**Đạt cả hai = mục tiêu chính của chương trình đã xong.**
