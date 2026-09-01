# BENCHMARK-REPO-STANDARDS-V0

> **Mục đích:** đối chiếu thiết kế đề xuất (`REPO-BOOTSTRAP-SPEC-V0` +
> `FOLDER-STANDARD-STUDY-V0`) với chuẩn thật đang được dùng ngoài đời, trước khi triển khai.
> **Ngày đo:** 2026-08-31. Nguồn: xem mục 8.

---

## 1. Kết luận một dòng

Thiết kế đề xuất **đúng hướng ở 8/11 điểm**, **thiếu 4 thứ mà ngành đã có sẵn**, và
**repo của Đức đang đi trước ngành ở 3 điểm** mà tôi suýt bỏ sót khi đề xuất.

---

## 2. Bảng đối chiếu — đề xuất vs chuẩn ngành

| # | Đề xuất của tôi | Chuẩn ngành tương ứng | Phán quyết |
|---|---|---|---|
| 1 | `AGENTS.md` là hiến pháp, cascade root → package | **AGENTS.md** — chuẩn mở do Google, OpenAI, Factory, Sourcegraph, Cursor cùng công bố (8/2025). Cascade global → project → folder, file gần nhất thắng. | ✅ **Giữ.** Repo đã đúng chuẩn ngành. |
| 2 | Một file cổng vào cho AI | **llms.txt** (llmstxt.org, Jeremy Howard). Đặt ở gốc như `robots.txt`. Cursor, Windsurf, Claude Code, Copilot, Cline, Aider đều tự tìm file này. OpenAI, Anthropic, Gemini đều publish llms.txt cho docs của họ. | ⚠️ **Sửa.** Ý đúng nhưng nên mượn **định dạng** llms.txt thay vì tự chế. |
| 3 | Cổng máy chặn thay vì dặn AI | Anthropic/cộng đồng: *"nếu vi phạm luật đó sẽ chặn merge trong CI thì luật đó thuộc về CI, không thuộc về CLAUDE.md"* · *"Không dùng CLAUDE.md thay cho kiểm tra tự động."* | ✅ **Giữ.** Đây là chỗ mạnh nhất của thiết kế. |
| 4 | `superseded_by` cho bản cũ | **ADR / Nygard convention** — trạng thái đi qua `Proposed → Accepted → Deprecated → Superseded by ADR-NNNN`. `adr-tools` có cờ `-s` tự cập nhật hai chiều. Backstage, Microsoft Well-Architected, Martin Fowler đều dùng. | ✅ **Giữ.** Đúng tên, đúng nghĩa. |
| 5 | Độ sâu điều hướng tối đa 3 | Claude Code: memory import **tối đa 4 hop**. | ✅ **Giữ.** 3 nằm trong ngưỡng an toàn. |
| 6 | `entry_hint` — một câu "phiên sau làm gì trước" | Handoff pattern: LangChain/DeepAgents báo cáo thêm `session_intent` và `next_step` cải thiện rõ rệt. Matt Pocock's handoff skill có **luật không-lặp-lại**: chỉ ghi thứ *chỉ tồn tại trong hội thoại*, còn lại **trỏ bằng đường dẫn**. | ✅ **Giữ.** Đổi tên thành `session_intent` + `next_step` cho khớp thuật ngữ chung. |
| 7 | Frontmatter có `expires` | **TTL contract**: mỗi trang khai `ttl_days` trong YAML frontmatter. Giant Swarm chạy production với `frontmatter-validator`, gate theo `last_review_date`. Dosu chấm điểm freshness 0–100 trong CI. | ⚠️ **Sửa.** Dùng `ttl_days` (tương đối) thay vì `expires` (tuyệt đối). Tương đối không mục khi copy file. |
| 8 | `decisions.md` một file cho cả gói | ADR chuẩn: **một file một quyết định**, đánh số tăng dần, `docs/adr/0001-*.md`. **Không bao giờ sửa, không bao giờ xoá.** Đổi ý = viết ADR mới supersede cái cũ. | ❌ **Sửa hẳn.** File gộp sẽ bị sửa đè, mất dấu vết "vì sao ngày đó quyết vậy". |
| 9 | Phân 4 tầng LAW/STATE/GENERATED/EVIDENCE | Không có tên chuẩn. Gần nhất là docs-as-code + `linguist-generated`. | ✅ **Giữ.** Ghép riêng, hợp lý. |
| 10 | Dùng Diátaxis để xếp `docs/` | Diátaxis **tự nói rõ nó không dành cho** tài liệu quy trình nội bộ: runbook, quyết định kiến trúc, ghi chú họp. *"Ép nó vào chỗ không thuộc về là cách nhanh nhất làm méo nó."* | ❌ **Bỏ.** Repo của Đức chủ yếu là tài liệu vận hành. Diátaxis không hợp. |
| 11 | Root giữ cả `AGENTS.md` và `CLAUDE.md` | Chuẩn ngành: **AGENTS.md là bản chính**, các file riêng của từng hãng (`CLAUDE.md`, `.cursor/rules`, `copilot-instructions.md`) chỉ là **stub mỏng trỏ về AGENTS.md** hoặc symlink. | ⚠️ **Sửa.** Hai file đầy đủ = hai chỗ nói cùng một điều. |

---

## 3. Bốn thứ ngành đã có mà tôi thiếu

### 3.1 Định dạng `llms.txt` cho bản đồ repo

Tôi đề xuất tự chế `repo-map.json`. Ngành đã có định dạng chuẩn, và **các agent tự tìm nó**.

Cấu trúc llms.txt: một H1 tên dự án · một blockquote tóm tắt · các mục H2 chứa danh sách link,
mỗi link kèm **một dòng mô tả**. Ngắn, phẳng, tiết kiệm token.

Đề xuất sửa: giữ `repo-map.json` cho script đọc, **thêm `llms.txt` ở gốc repo** theo đúng
định dạng chuẩn cho AI đọc. Hai file, cùng một lần sinh, cùng một nguồn dữ liệu.

Lợi ích cụ thể: khi Đức trỏ Claude Code / Cursor / Codex vào repo, chúng **tự tìm `llms.txt`
mà không cần Đức dán đường dẫn**. Đúng cái Đức muốn — "hook tự động, không phải hỏi".

### 3.2 ADR một file một quyết định, bất biến

`decisions.md` gộp có một lỗi chết người: **file gộp thì sẽ bị sửa đè.**
Sáu tháng sau không ai biết ngày đó Đức quyết gì và vì sao.

Chuyển sang `docs/adr/0001-<ten-quyet-dinh>.md`:
- Đánh số tăng dần, đọc thư mục là thấy dòng thời gian
- Đã `Accepted` thì **bất biến** — đúng cùng nguyên tắc với `evidence/` của Đức
- Đổi ý = ADR mới, ADR cũ đổi trạng thái `Superseded by ADR-NNNN`, hai bên trỏ nhau

Repo đã có văn hoá bằng chứng bất biến. ADR chỉ là áp cùng nguyên tắc đó cho **quyết định**.

### 3.3 `ttl_days` + điểm freshness đo bằng git

Ngoài `ttl_days` trong frontmatter, ngành còn dùng **git age delta**: so ngày sửa cuối của
tài liệu với ngày sửa cuối của code mà nó mô tả. Chênh càng lớn, điểm freshness càng thấp.
Chấm điểm 0–100, gate trong CI ở mỗi PR.

Một nghiên cứu 2024 trên các repo GitHub phổ biến: **28,9% tài liệu đang mô tả hàm/file/class
không còn tồn tại**. Đây là bệnh phổ thông, không phải bệnh riêng của Đức.

### 3.4 Giới hạn độ dài file luật

Đồng thuận cộng đồng và tài liệu Anthropic: `CLAUDE.md` nên **dưới 200–300 dòng**.
HumanLayer để file gốc dưới 60 dòng. Lý do: file này nạp vào **mọi phiên**, mỗi dòng thừa là
một dòng cạnh tranh sự chú ý với việc không liên quan.

Nghiên cứu Gloaguen và cộng sự (2026): **file ngữ cảnh do LLM sinh ra làm giảm hiệu năng agent
và tăng chi phí** — agent làm theo hướng dẫn thừa một cách trung thành, mở rộng phạm vi tìm
kiếm mà không cải thiện kết quả.

Hệ quả trực tiếp cho repo này: **148 file `.md` không phải tài sản, là chi phí.**
Mục tiêu không phải viết thêm tài liệu — là tăng **mật độ tín hiệu**.

---

## 4. Ba thứ repo của Đức đang đi trước ngành

Tìm không thấy chuẩn ngành nào tương đương ba thứ này. Chúng là tài sản, phải giữ.

### 4.1 `last_verified_commit` + cột "code đã đổi sau kiểm chứng chưa"

`DASHBOARD.md` hiện có cột **"Code đã commit đổi sau kiểm chứng? [ĐO]"**.
Đây chính là **git age delta** mà Dosu vừa công bố như một sáng kiến 2026 — nhưng Đức áp cho
**bằng chứng vận hành**, không chỉ cho tài liệu. Chặt hơn.

Ít đội làm được. Giữ nguyên, và nên nhân rộng sang mọi file STATE.

### 4.2 Nhãn độ tin cậy `[ĐO] [ĐỌC] [DÒ] [KHAI]`

Không tìm thấy tương đương trong bất kỳ chuẩn nào. Gần nhất là "confidence level" của
Microsoft Well-Architected cho ADR, nhưng đó là mức độ tự tin về *quyết định*, không phải về
*cách thu thập thông tin*.

Nhãn của Đức giải đúng một bệnh cụ thể của agent: **grep ra kết quả rỗng bị hiểu nhầm thành
"tính năng không tồn tại"**. Repo đã dính bẫy đó 4 lần trong một ngày.

Đây là đóng góp gốc. Giữ, và đưa vào `AGENTS.md` như luật bắt buộc khi báo cáo.

### 4.3 `.agents/claims.json` — khoá ghi cho nhiều agent

`CODEOWNERS` của GitHub là để **duyệt PR**, không phải để **khoá quyền ghi**.
Không có chuẩn nào cho tình huống ba hệ AI cùng ghi vào một thư mục git.

Giữ. Và nên đưa trường `current_claim` vào `llms.txt` để agent mới biết ngay gói nào đang
có chủ, không phải mở file thứ hai.

---

## 5. Thiết kế đã sửa sau benchmark

### 5.1 Chuỗi bootstrap — bản cuối

```
BƯỚC 0  llms.txt              [máy sinh] agent tự tìm, không cần Đức dán đường dẫn
        └─ 1 H1 + 1 blockquote + danh sách link có mô tả 1 dòng
        └─ trỏ tới: AGENTS.md · DASHBOARD.md · STATUS.md của gói đang nóng

BƯỚC 1  DASHBOARD.md          [máy sinh] số đo + việc ưu tiên + sức khoẻ điều hướng
BƯỚC 2  workers/<ext>/<ver>/STATUS.md   [người] trạng thái + session_intent + next_step
BƯỚC 3  HANDOFF · BACKLOG · adr/ · evidence/   [chi tiết]
```

Kèm `repo-map.json` cho script. `llms.txt` và `repo-map.json` sinh cùng lúc, cùng nguồn.

### 5.2 Bảng file gốc repo — bản cuối

| File | Tầng | Ai ghi | Giới hạn |
|---|---|---|---|
| `llms.txt` | GENERATED | máy | ~40 dòng |
| `AGENTS.md` | LAW | người | **< 200 dòng** |
| `CLAUDE.md` | LAW | người | **< 10 dòng — chỉ stub trỏ về AGENTS.md** |
| `DASHBOARD.md` | GENERATED | máy | không giới hạn |
| `FEATURE-PARITY.md` | GENERATED | máy | không giới hạn |
| `PLATFORM.md` | LAW | người | — |
| `README.md` | LAW | người | cho người, không cho agent |

Việc đầu tiên phải làm: **đo số dòng `AGENTS.md` và `CLAUDE.md` hiện tại.**
Nếu vượt 200 dòng thì cắt trước khi làm gì khác — đây là chi phí trả ở **mọi** phiên.

### 5.3 Cổng kiểm — bổ sung sau benchmark

Giữ B1–B8 của spec cũ, thêm:

| # | Kiểm | Mức |
|---|---|---|
| **B9** | `AGENTS.md` hoặc `CLAUDE.md` vượt giới hạn dòng | 🟡 |
| **B10** | `CLAUDE.md` chứa nội dung không có trong `AGENTS.md` (trùng lặp/mâu thuẫn) | ĐỎ |
| **B11** | File trong `docs/` quá `ttl_days` kể từ `last_reviewed` | 🟡 |
| **B12** | ADR đã `Accepted` bị sửa nội dung | ĐỎ |
| **B13** | `llms.txt` cũ hơn commit gần nhất của bất kỳ `STATUS.md` nào | 🟡 |
| **B14** | Điểm freshness: tài liệu mô tả code đã đổi > 30 ngày mà chưa đụng | 🟡 |

---

## 6. Thứ tự triển khai — bản cuối

| GĐ | Việc | Vì sao trước |
|---|---|---|
| **0** | Đo số dòng `AGENTS.md` + `CLAUDE.md`. Cắt xuống dưới 200. Biến `CLAUDE.md` thành stub. | Chi phí trả ở mọi phiên. Rẻ nhất, lợi ngay. |
| **1** | Sinh `llms.txt` + `repo-map.json` từ `build-dashboard.mjs`. Thêm Khối A + D vào DASHBOARD. | Agent có cổng vào tự tìm được |
| **2** | Khai `STATUS.md` cho Extension Observer V0 · `superseded_by` cho gemini v0.1.0 · chủ cho `pilots/` | 3 câu hỏi biến mất vĩnh viễn |
| **3** | `check-bootstrap.mjs` chạy chế độ cảnh báo, gồm B1–B14 | Nợ hiện ra bằng số |
| **4** | Chuyển `decisions.md` → `docs/adr/NNNN-*.md`, gắn trạng thái | Quyết định thành bất biến |
| **5** | Thêm `ttl_days` + `last_reviewed` cho file trong `docs/` | Chặn bãi rác draft |
| **6** | Bật chặn. Rút câu mở phiên còn một dòng. | Không thể tạo nợ mới |
| **7** | Dọn nợ cũ: 4 file `AGENT-BRIDGE-*` trùng · 29 file `drafts/` · 6–8 file `.md` ở gốc package | Sau khi cổng đã đứng vững |

Giai đoạn 0 làm được trong một phiên ngắn, và nó rẻ nhất trong toàn bộ danh sách.

---

## 7. Ba việc vẫn cần Đức chốt

Benchmark không giải được ba việc này vì chúng là quyết định sản phẩm, không phải kỹ thuật.

1. **Extension Observer V0** — chuyển vào `workers/observer-v0/v0.1.0/`?
   Chuyển thì phải sửa `build-dashboard.mjs` + `package.json`. Đề xuất: chuyển, ở GĐ 7, một commit riêng.
2. **`pilots/v0-trial/`** thuộc extension nào?
3. **Ngưỡng dòng cho `AGENTS.md`**: 200 (đồng thuận cộng đồng) hay 300 (nới)? Đề xuất 200.

---

## 8. Nguồn tham chiếu

| Chủ đề | Nguồn |
|---|---|
| AGENTS.md | agents.md · agentsstandard.com · asdlc.io/practices/agents-md-spec |
| llms.txt | llmstxt.org · github.com/AnswerDotAI/llms-txt |
| CLAUDE.md | code.claude.com/docs/en/memory · anthropic.com/engineering/claude-code-best-practices · humanlayer.dev |
| ADR | martinfowler.com/bliki/ArchitectureDecisionRecord.html · backstage.io/docs/architecture-decisions · adr-tools (Nat Pryce) |
| Docs freshness | dosu.dev/blog/score-documentation-freshness-in-ci · Giant Swarm frontmatter-validator |
| Diátaxis | diataxis.fr |
| Agent handoff | agentpatterns.ai/agent-design/handoff-skill-context-transfer |

---

## 9. Điều rút ra quan trọng nhất

Ngành đã hội tụ về đúng một kết luận, lặp lại ở cả ba nguồn độc lập:

> **Tài liệu hướng dẫn agent nên ngắn. Luật nào cần cưỡng chế thì đưa vào cổng kiểm,
> đừng viết dài hơn.**

Repo hiện có 148 file `.md` và một agent vào vẫn không biết bắt đầu từ đâu. Đó không phải
vì thiếu tài liệu. Đúng chiều ngược lại.

Cách chữa không phải viết thêm — là **sinh một file cổng vào ngắn bằng máy, và cưỡng chế phần
còn lại bằng cổng kiểm.**
