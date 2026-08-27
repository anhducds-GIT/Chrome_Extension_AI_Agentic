# PLATFORM AI-ORCHESTRATOR — Nghiên cứu kiến trúc V0.3 (CHƯA IMPLEMENT)

> Viết 2026-08-27 bởi Claude, phiên `claude-platform-orchestrator-study`.
> **Trạng thái: BẢN NGHIÊN CỨU, chờ Đức + GPT audit. Chưa được code gì theo file này.**
> Phạm vi: platform tiến từ "AI dựng extension, Đức tự chạy" sang "AI là người vận hành chính".
> File này nằm trong `drafts/` — vùng AI được tự ghi. Không file gốc nào khác bị sửa.

---

## 1. Kết luận cho Đức (đọc 2 phút)

**Điều quan trọng nhất nghiên cứu này tìm ra:** bài toán "hôm nay chạy 23 prompt, mai
resume từ prompt 24, không cần nhớ gì trong chat" **đã được giải ở mức MỘT LẦN CHẠY** —
extension đã có sổ cái Result XLSX với `run_id`, checkpoint đánh số bất biến, và bộ phân
loại resume fail-closed (`resume-core.js` [ĐỌC]: job nào xong-có-bằng-chứng thì bỏ qua,
job nào mập mờ thì CHẶN, job nào chưa gửi thì chạy tiếp). Không cần xây lại cái này.

**Cái đang THIẾU là tầng phía trên:** khi Đức giao một "Big Story" (60 prompt, ảnh + video,
nhiều extension), hiện không có chỗ nào ghi:

- Story này gồm những mảng việc nào, mỗi mảng chạy bằng extension nào, workbook nào;
- Chạy tới đâu rồi (theo checkpoint, không theo trí nhớ chat);
- Ai (phiên AI nào) đang cầm quyền chạy mảng nào;
- Đang kẹt gì, chờ Đức duyệt gì;
- Ngày mai phiên AI MỚI mở ra thì đọc file nào để tiếp tục.

**Đề xuất:** thêm MỘT lớp mỏng — gọi là **control plane** — gồm:

1. `stories/<id>/story.json` — trạng thái story, **máy ghi**, commit tại mốc checkpoint;
2. `.agents/runs.json` — ai đang cầm quyền CHẠY (tách khỏi quyền SỬA CODE ở `claims.json`);
3. `ORCHESTRATOR.md` ở gốc — **máy sinh**, trang duy nhất Đức mở để biết mọi thứ;
4. `WORKFLOWS.md` mỗi extension + `ROADMAP.md` gốc — người viết, máy kiểm link;
5. `scripts/sync-orchestrator.mjs` — sinh + kiểm, cùng kiểu `build-dashboard.mjs`.

**Không xây:** daemon, scheduler, workflow engine, hàng đợi cross-extension. Sổ cái của
extension vẫn là chân lý mức job — orchestrator chỉ TRỎ tới, không chép.

**V0.3 giữ nguyên một ranh giới an toàn:** AI chưa tự bấm "Run" cho lô thật. Đức vẫn bấm
Run một lần mỗi run (vài giây); AI làm mọi thứ còn lại: soạn kế hoạch, nạp workbook,
giám sát, checkpoint, resume, báo cáo. Cho AI tự bấm Run là quyết định riêng (mục 20).

---

## 2. Kiến trúc hiện tại — đã kiểm chứng bằng cách nào

Đọc thật ngày 27/08 (không tin tóm tắt): `AGENTS.md`, `PLATFORM.md`, `DASHBOARD.md`,
`FEATURE-PARITY.md`, `STATUS.template.md`, `.agents/claims.json`, `scripts/session-check.mjs`,
`scripts/build-dashboard.mjs`, `scripts/feature-parity.mjs`, STATUS/BACKLOG/HANDOFF của cả
3 worker, `resume-core.js` + `checkpoint-core.js` (Gemini), `DAC_XLSX_RUN_PLAN_V1.md`.

### Bản đồ sự thật đang có (giữ nguyên, không thay)

| Tầng | File | Ai ghi | Là chân lý của |
|---|---|---|---|
| Luật | `AGENTS.md` | người | governance, vai, vùng cấm |
| Platform | `PLATFORM.md` | người | cách vận hành nhiều extension |
| Trạng thái ext | `STATUS.md` mỗi package | người | lời khai vận hành + bằng chứng |
| Bảng tổng | `DASHBOARD.md` | **máy** | số đo committed (view, không phải nguồn) |
| So nhánh | `FEATURE-PARITY.md` | máy (khối AUTO) + người (hành vi) | lệch tính năng |
| Việc mở | `BACKLOG.md` mỗi package | người | việc chưa làm |
| Lịch sử | `HANDOFF.md` | người | diễn biến phiên (KHÔNG phải trạng thái hiện tại) |
| Quyết định | `decisions.md` | người | Đức đã chốt gì |
| Bằng chứng | `evidence/`, `Pilot-*/` | máy+người | bất biến, chỉ thêm |
| Quyền sửa code | `.agents/claims.json` | máy/AI | trạng thái SỐNG, không vào artifact commit |
| **Mức job/attempt** | **Result XLSX ledger** (ngoài repo, Downloads) | **extension** | job nào đã gửi/xong/mập mờ, exact-once, attempt identity |

### Trạng thái vận hành 3 nhánh (đọc HANDOFF mới nhất, 27/08)

- **ChatGPT** (`active`): kiểm chứng live 26/08 Pilot-14. Việc mở B-14…B-22; **B-17 [ĐỌC]:
  việc thật KHÔNG chạy qua `run.trial` (trần 90s)** — tức là hôm nay lô thật vẫn do Đức bấm
  Run trên sidepanel. B-22: cùng race G-01, chưa vá.
- **Gemini** (`active`): G-01 vá TĨNH xong, push `a173507`, audit Codex vòng 2 PASS.
  **CHỜ trial live sau khi Đức reload extension** — chưa được coi là đóng. Chủ package:
  `opus-platform-3`.
- **GG Flow Video** (`building`): FLOW-01 ĐÓNG — video đầu tiên sinh bằng máy (~70s, bằng
  chứng `evidence/F1-EVIDENCE-NOTES.md`). F-02 code xong ở working tree (suite 82/82,
  chưa commit, chờ Đức reload để kiểm runtime). Chủ package + `_root`: `claude-flow-1`.

Ba dòng việc này **tiếp tục độc lập** — nghiên cứu này không chặn, không nhảy vào.

### Hai nguyên tắc đã trả giá mới có, phải bê nguyên sang orchestrator

1. **Thứ gì máy đếm được thì máy đếm** — bảng gõ tay sai 4 số sau đúng một ngày.
2. **Committed truth không được lẫn trạng thái sống** — bài học Gate #7: claims (đổi nhiều
   lần một buổi) bị GPT bỏ khỏi DASHBOARD 27/08. Lease chạy run cũng cùng bản chất.

---

## 3. AI thành người vận hành chính thì sinh ra vấn đề gì MỚI

Extension đã chống được trùng-gửi và mất-checkpoint **bên trong một run**. Vấn đề mới nằm
**giữa các run, giữa các phiên, giữa các ngày**:

1. **Chat đang là trạng thái.** Hôm nay mọi hiểu biết "story chạy tới đâu" sống trong đầu
   phiên chat đang mở. Đóng máy là mất. HANDOFF ghi lịch sử nhưng phải LỘI mới ra hiện trạng.
2. **Không có đơn vị "story".** Sổ cái biết run; không gì biết "run này thuộc câu chuyện
   lớn nào, còn mảng video chưa bắt đầu".
3. **Quyền chạy chưa có chủ.** `claims.json` giữ quyền SỬA CODE. Không gì cấm hai phiên
   cùng điều khiển một extension qua Bridge — hôm nay chưa xảy ra vì mới có 1 operator/lần,
   nhưng kịch bản 2 story song song thì xảy ra ngay.
4. **"Xong" chưa kiểm được bằng máy ở mức story.** Extension chứng minh job xong; không gì
   chứng minh story xong (đủ mọi workstream, 0 job mập mờ, bằng chứng đủ).
5. **Duyệt của Đức chưa bám vào story.** "Đức Go" đang nằm trong chat — phiên sau không
   chứng minh được là đã được duyệt.

---

## 4. Kiến trúc đề xuất — control plane tách khỏi execution plane

### Ranh giới sở hữu (câu trả lời cho câu hỏi mục 5 của đề bài)

| Plane | Sở hữu | Gồm |
|---|---|---|
| **Control** (mới, mỏng) | orchestrator (phiên AI cầm story) | story, workstream, checkpoint mức story, lease, duyệt, blocker, roadmap, view cho Đức |
| **Execution** (đã có, không đổi) | extension + Bridge | gửi prompt, quan sát DOM, retry/halt, sổ cái job/attempt, checkpoint XLSX, lưu artifact |

**Luật vàng của ranh giới: control plane KHÔNG BAO GIỜ chép trạng thái mà execution plane
đang là chân lý.** Nó chỉ ghi (a) con trỏ tới sổ cái, (b) một bản TÓM checkpoint có dấu
thời gian + bằng chứng, và (c) luật đối chiếu: **lệch nhau thì sổ cái thắng, orchestrator
phải đỏ**, không được im lặng tin bản tóm của mình.

Sơ đồ một câu: *Đức nói chuyện với AI → AI đọc/ghi `stories/` + `runs.json` → AI điều khiển
extension qua Bridge → extension ghi sổ cái XLSX → AI đọc sổ cái về, checkpoint vào
`stories/`, sinh `ORCHESTRATOR.md` cho Đức.*

---

## 5. Mô hình Story / Workstream / Run / Checkpoint — chọn cái nhỏ nhất đủ dùng

Đề bài gợi ý 7 khái niệm (BIG STORY → WORKSTREAM → RUN → JOB → ATTEMPT → CHECKPOINT →
OUTPUT). Soi từng cái xem đã có ai giữ chưa:

| Khái niệm | Đã có chân lý chưa? | Kết luận |
|---|---|---|
| JOB / ATTEMPT | ✅ ledger XLSX + attempt identity [ĐỌC] | **không xây lại** |
| CHECKPOINT (mức run) | ✅ `checkpoint-core.js`, version bất biến [ĐỌC] | **không xây lại** |
| OUTPUT / EVIDENCE | ✅ ledger + `evidence/` | **không xây lại** |
| RUN | ✅ `run_id` trong ledger [ĐỌC] | control plane chỉ GHI LẠI run_id |
| WORKSTREAM | ❌ | **mới** — một mảng việc = một extension + một workbook |
| STORY | ❌ | **mới** — đơn vị Đức giao việc |
| CHECKPOINT (mức story) | ❌ | **mới** — bản tóm có bằng chứng, ghi lúc dừng an toàn |

Vậy chỉ cần **2 khái niệm mới + 1 bản ghi tóm**. RUN không phải khái niệm mới — nó là con
trỏ. Không thêm ATTEMPT/STEP vào control plane: đó là việc của runner.

**Một workstream = một extension + một workbook + một dãy run.** 60 prompt ảnh trên ChatGPT
là 1 workstream dù chạy 3 ngày 3 run; mảng video Flow của cùng story là workstream khác.

---

## 6. + 7. Hệ SSOT và dạng dữ liệu — chốt từng file

### Bảng SSOT sau V0.3 (chỉ thêm, không thay cái cũ)

| Câu hỏi | Chân lý ở đâu | Dạng | Ai ghi |
|---|---|---|---|
| Job nào đã gửi/xong/mập mờ | Result XLSX ledger (ngoài repo) | XLSX | extension |
| Story X gồm gì, duyệt chưa, checkpoint gần nhất | `stories/<id>/story.json` | **JSON** | máy (AI orchestrator), commit ở mốc |
| Ai đang CẦM QUYỀN CHẠY workstream nào | `.agents/runs.json` | JSON | máy, trạng thái SỐNG |
| Ai đang giữ CODE package nào | `.agents/claims.json` | JSON | như cũ |
| Extension này có những flow nào, flow làm được gì | `WORKFLOWS.md` của package | MD người viết | người |
| Lộ trình NOW/NEXT/LATER | `ROADMAP.md` gốc | MD người viết | người |
| Đức nhìn toàn cảnh | `ORCHESTRATOR.md` gốc | MD **máy sinh** | máy — VIEW, không phải nguồn |

### Vì sao story state là JSON, không phải Markdown

Đề bài yêu cầu đúng: *trạng thái máy-đổi không được bắt người sửa Markdown*. Story state
đổi mỗi checkpoint, do máy ghi, máy đọc lại, máy validate — đúng hồ sơ của JSON một tầng
(cùng triết lý frontmatter STATUS: máy đọc phần máy, người đọc phần sinh ra cho người).
Phần "cho mắt Đức" không nằm trong JSON — nó là `ORCHESTRATOR.md` sinh ra.

### Schema `story/v1` — tối thiểu, một file một story

```json
{
  "schema": "story/v1",
  "id": "story-20260827-story-x",
  "title": "Bộ content Story X",
  "goal": "60 ảnh + 12 video theo kịch bản X",
  "status": "draft | approved | running | paused | blocked | done | archived",
  "owner_hint": "nhãn phiên đang cầm (tham khảo — chân lý sống ở runs.json)",
  "approvals": [
    { "what": "chạy lô thật 60 job trên ChatGPT", "by": "Đức", "date": "2026-08-28", "where": "chat/decisions.md" }
  ],
  "workstreams": [
    {
      "id": "ws-01-images",
      "extension": "workers/duc-auto-chatgpt/v0.1.0",
      "flow": "image-batch-xlsx",
      "workbook": "C:/Users/.../Downloads/Duc Auto ChatGPT/story-x/story-x.xlsx",
      "run_id": "20260828-0900-story-x",
      "status": "running | pending | paused | blocked | done",
      "checkpoint": {
        "recorded_at": "2026-08-28T17:05:00+07:00",
        "ledger_checkpoint_file": "story-x__results__v007.xlsx",
        "completed": 23,
        "next_job": "SX-24",
        "ambiguous": 0,
        "retries_note": "SX-11 dùng 2/3 lượt retry",
        "evidence_ref": "stories/story-20260827-story-x/evidence/cp-20260828.md"
      },
      "blockers": []
    }
  ],
  "decisions_pending": [ "Đức chọn 1 trong 2 phương án thumbnail" ],
  "log": [ "chỉ thêm dòng, mới nhất ở cuối" ]
}
```

Ghi chú thiết kế:

- **`checkpoint` là BẢN TÓM CÓ BẰNG CHỨNG, không phải chân lý.** `evidence_ref` bắt buộc
  trỏ tới một FILE thật trong `stories/<id>/evidence/` (bản chụp tóm tắt do máy xuất từ
  ledger lúc checkpoint — vài dòng: run_id, version, đếm theo phân loại resume). Validator
  từ chối checkpoint không bằng chứng — đúng luật `evidence_ref` của STATUS.
- **`workbook` là đường dẫn NGOÀI repo** — khai để phiên sau tìm được, kèm luật: không bao
  giờ tin `completed` trong story.json để quyết định gửi hay không; quyết định gửi luôn đi
  qua Continue Existing Run + `resume-core.plan()` của extension đọc ledger thật.
- **`status: done` không được khai tay tự do** — validator chỉ nhận `done` khi mọi
  workstream `done` và checkpoint cuối có `ambiguous: 0` (mục 14, kiểu nói dối #3).
- `stories/<id>/evidence/` theo luật vùng bằng chứng hiện hành: chỉ thêm, không sửa.

### `.agents/runs.json` — lease chạy, tách khỏi claim code

```json
{
  "_doc": "Quyền CHẠY runtime. Một workstream một operator. Một extension runtime một run đang sống.",
  "runs": {
    "story-20260827-story-x/ws-01-images": {
      "operator": "claude-op-1",
      "extension": "workers/duc-auto-chatgpt",
      "claimed_at": "2026-08-28T09:00:00+07:00",
      "released_at": null
    }
  }
}
```

Hai luật, phỏng đúng nếp claims:

1. **Một workstream chỉ một operator.** Lease có chủ mà chủ không phải bạn → chỉ đọc
   (`run.status`, `ledger.read`), tuyệt đối không gửi lệnh đổi trạng thái. Muốn giành → hỏi Đức.
2. **Một extension runtime chỉ phục vụ một lease sống.** Hai story không được chen nhau
   trên cùng một extension — Bridge/side panel/tab là tài nguyên đơn chiếm. Story B muốn
   chạy ảnh khi story A đang chạy ChatGPT → xếp hàng hoặc dùng extension khác.

**Quyền code ≠ quyền chạy — cho phép tách, kèm một ràng buộc:** phiên giữ code một extension
đang có lease chạy sống KHÔNG được reload extension / đổi file runtime của nó cho tới khi
lease trả. (Đúng vụ 27/08: `opus-platform-2` sửa docs của package `claude-flow-1` đang giữ —
phải hỏi Đức. Nay thành luật máy đọc được.)

---

## 8. `ORCHESTRATOR.md` — artifact duy nhất cho Đức

Máy sinh 100%, header "SINH TỰ ĐỘNG — ĐỪNG SỬA TAY" + dấu commit như DASHBOARD. Bảy mục,
đúng thứ tự đề bài, đọc trong 1–2 phút:

```markdown
# Bảng điều hành Orchestrator
> SINH TỰ ĐỘNG. Sinh lại: node scripts/sync-orchestrator.mjs
Trang sinh tại commit `xxxxxxx` (ngày). KHÔNG phải lúc story được kiểm chứng.

## A. Đang ở đâu
- 1 dòng/extension (lấy từ model DASHBOARD, không đo lại): tên · lifecycle · kiểm chứng cuối
- 1 dòng/story: tên · status · số workstream chạy/kẹt/xong [ĐO từ story.json]

## B. Đang chạy gì (mỗi story một khối)
Story X — mục tiêu 1 câu
| Workstream | Extension | Checkpoint gần nhất [KHAI+bằng chứng] | Việc kế tiếp | Kẹt gì | Chờ Đức? |
| ws-01 ảnh | ChatGPT | 23 xong · 0 mập mờ · cp v007 @ 28/08 (link bằng chứng) | SX-24 | — | không |
LƯU Ý IN SẴN: "Đây là checkpoint ĐÃ COMMIT. Đang chạy live hay không → hỏi phiên operator
hoặc chạy sync với --live (in ra màn hình, không ghi vào trang này)."

## C. Flow & tính năng
Mỗi flow 1 dòng: tên · làm gì · maturity · kiểm chứng chưa (link evidence) · resume được
không · executor · link WORKFLOWS.md. Máy chỉ KIỂM LINK TỒN TẠI, nội dung là lời khai người.

## D. Muốn biết X → mở Y
Bảng con trỏ: luật→AGENTS · số đo→DASHBOARD · lệch nhánh→FEATURE-PARITY · việc mở→BACKLOG
từng nhánh · ai giữ code→claims.json · ai đang chạy→runs.json (sống, không có ở đây)

## E. Roadmap — ba bảng TÁCH RIÊNG, không trộn
1. Platform (từ ROADMAP.md) · 2. Extension (từ ROADMAP.md, trỏ BACKLOG) · 3. Story đang
sản xuất (ĐO từ story.json — không gõ tay tiến độ)

## F. Chờ Đức quyết
Gộp máy từ: story.json `decisions_pending` + `approvals` còn thiếu + workstream `blocked`.

## G. MỘT việc tiếp theo
1 dòng, chọn theo luật tất định (ưu tiên: blocker của story running → approval thiếu →
next_job của workstream running lâu chưa checkpoint → việc platform NOW).
```

Số đếm được (bao nhiêu workstream, bao nhiêu blocker) — máy đếm từ story.json, không hardcode.

---

## 9. `WORKFLOWS.md` mỗi extension — danh mục flow

Người viết (như STATUS), một khối/flow, đúng các trường đề bài:

```markdown
## FLOW: image-batch-xlsx
- Mục đích: chạy kế hoạch XLSX tạo ảnh hàng loạt
- Input: workbook theo DAC_XLSX_RUN_PLAN_V1.md
- Executor: sidepanel runner + content script
- Bridge methods: (KHÔNG gõ số/danh sách tay — trỏ DASHBOARD/FEATURE-PARITY, máy đếm)
- Tính năng: khoá tab+hội thoại · exact-once · nhiều ảnh/job · resume fail-closed …
- Cổng an toàn: DETECTION_BLIND dừng cứng · trần trial 90s · dev-mode gate
- Checkpoint: Result XLSX v{NN} bất biến, cadence checkpoint_interval_jobs
- Resume: Continue Existing Run, phân loại SAFE_*/AMBIGUOUS (link resume-core)
- Bằng chứng: link evidence mới nhất
- Maturity: verified-live | static-only | building
- Giới hạn đã biết: (link BACKLOG mã việc)
```

Luật số 0 của STATUS áp nguyên: số máy đếm được thì không gõ tay vào đây. V0.3 máy chỉ kiểm
**link tồn tại**; đối chiếu tên method flow khai ↔ registry đo là việc V0.4 (tránh
over-build — bài học [DÒ] 4 lần sai).

## 10. `ROADMAP.md` gốc — của người, ba bảng tách

NOW / NEXT / LATER, ba bảng riêng: **platform** (V0.3 orchestrator, V0.2 còn lại…),
**extension** (mốc lớn mỗi nhánh — chi tiết vẫn ở BACKLOG, roadmap chỉ trỏ, không chép —
tránh đúng vết B-07 backlog lạc hậu), **story** (KHÔNG có bảng tay — mục E của
ORCHESTRATOR.md đo từ story.json). Sửa ROADMAP.md = sửa file gốc = cần `_root`.

---

## 11. Mô hình đa phiên / chạy song song

Tối thiểu đủ dùng — không thêm vai trò mới, chỉ thêm lease:

- **Một orchestrator một story.** Phiên cầm story giữ lease các workstream nó đang chạy.
- **Hai story song song = hai phiên, hai lease, hai extension khác nhau.** Cùng extension
  thì luật 2 của runs.json chặn (mục 6.7).
- **Worker agent (Codex/AGY) không cầm lease.** Chúng làm việc code dưới claim của
  orchestrator như hiện nay. Vận hành Bridge = việc của phiên cầm lease.
- **Mai đổi AI khác cầm tiếp:** phiên cũ trả lease lúc checkpoint (released_at); phiên mới
  đọc story.json → nhận lease → resume qua ledger. Không cần "bàn giao trí nhớ".
- Chống giẫm chân đã có sẵn hai lớp dưới: safe-push (không cuốn commit người khác) và
  exact-once của ledger (kể cả hai phiên cùng gửi, attempt identity + reservation trước
  ranh giới gửi làm trùng-gửi bị chặn ở extension). Lease là lớp CHỦ ĐÍCH, hai lớp kia là
  lưới đỡ.

Kịch bản xấu đã nghĩ tới: phiên cầm lease chết giữa chừng (mất điện) mà chưa trả lease.
→ KHÔNG làm heartbeat/expiry tự động (đó là dấu hiệu over-build). Lease mồ côi = Đức hoặc
phiên sau hỏi Đức rồi ghi đè, y như luật giành claim hiện nay. Tần suất thấp, chi phí người
xử lý rẻ hơn chi phí nuôi cơ chế tự động.

---

## 12. Kịch bản bắt buộc: Big Story 60 prompt, chạy 2 ngày

**Ngày 1:**
1. Đức: "Chạy bộ content Story X". AI soạn `stories/story-x/story.json` (draft) + workbook
   XLSX 60 job; Đức duyệt → `approvals` ghi vào story.json, status `approved`, commit.
2. AI nhận lease ws-01 trong runs.json. Đức bấm Run trên sidepanel (V0.3 — một cú bấm).
3. AI giám sát qua `run.status` + `ledger.read` (hai method có thật ở cả hai nhánh [ĐO]),
   không ngồi nhìn — poll theo nhịp.
4. 17:00, job 23 xong, job 24 chưa gửi (SAFE_PENDING — ranh giới dừng an toàn = ranh giới
   trước-khi-gửi mà ledger đã định nghĩa sẵn). AI: (a) để runner dừng/Đức bấm Stop;
   (b) xuất bản tóm ledger → `stories/story-x/evidence/cp-20260828.md`; (c) ghi khối
   `checkpoint` (completed 23, next SX-24, ambiguous 0); (d) sync-orchestrator → commit
   story.json + ORCHESTRATOR.md + evidence; (e) trả lease. Đức tắt máy.

**Ngày 2 — phiên AI hoàn toàn mới, không có trí nhớ chat:**
1. Mở `ORCHESTRATOR.md`: Story X running, ws-01 checkpoint 23 xong, next SX-24.
2. Đọc `stories/story-x/story.json` — biết workbook ở đâu, run_id nào, retries đã tiêu.
3. Nhận lease. Mở Continue Existing Run trên ledger thật → `resume-core.plan()` trả:
   23 SAFE_COMPLETE (bỏ qua) · SX-24 là next_eligible · 0 AMBIGUOUS. **Đây là phép kiểm
   chéo bắt buộc: story.json nói 23, ledger nói khác → ĐỎ, dừng hỏi Đức, ledger thắng.**
4. Đức bấm Run → chạy tiếp từ SX-24. Không prompt nào gửi hai lần — lớp exact-once của
   extension đảm nhiệm, orchestrator không tự chế lại.

**Cùng lúc Story B chạy video trên Flow:** phiên khác, lease khác, extension khác, story.json
khác — không đụng file nhau, safe-push không cuốn của nhau.

---

## 13. Quy trình đồng bộ — `scripts/sync-orchestrator.mjs` (thiết kế, CHƯA code)

Phỏng đúng khuôn `build-dashboard.mjs` vì khuôn đó đã qua 4 vòng audit:

- **Input:** `stories/*/story.json` · model của build-dashboard (tái dùng `collectModel`,
  không đo lại) · `WORKFLOWS.md` các package · `ROADMAP.md`. **KHÔNG đọc `runs.json` khi
  sinh bản commit** (trạng thái sống không vào committed truth — luật Gate #7).
- **Output:** `ORCHESTRATOR.md` (ghi đè, deterministic).
- **Validate, fail-closed — đỏ thì không sinh:** schema story/v1 · `extension` trỏ package
  có thật · `evidence_ref` là FILE có thật · checkpoint thiếu bằng chứng → đỏ ·
  `done` khai tay khi điều kiện máy chưa đủ → đỏ · link WORKFLOWS/ROADMAP chết → đỏ ·
  detector số machine-owned trong phần chữ (tái dùng `detectStatusMachineOwnedFacts`).
- **`--check` / `--check-head`:** y hệt dashboard — `--check-head` dựng từ HEAD, so với
  `ORCHESTRATOR.md` đã commit, bỏ qua dòng dấu commit; miễn nhiễm working tree của phiên
  khác. Nếu Đức duyệt nâng cổng, thành phép kiểm #8 của session-check (EXPECTED_CHECKS 7→8).
- **`--live` (tuỳ chọn):** in thêm lease từ runs.json ra **màn hình**, không bao giờ ghi
  vào file. Đây là đường trả lời "đang chạy live không?" mà không nhiễm committed truth.
- **Concurrency:** chỉ đọc story.json + file người viết; hai phiên hai story không chặn
  nhau; regen ORCHESTRATOR.md là việc của phiên giữ `_root` hoặc phiên checkpoint story
  (cùng nếp "regen DASHBOARD sau commit code" hiện hành).

## 14. Orchestrator có thể NÓI DỐI Đức kiểu gì — và chặn thế nào

Tự phản biện theo yêu cầu đề bài, ≥3 kiểu:

| # | Kiểu nói dối | Vì sao xảy ra được | Chặn bằng |
|---|---|---|---|
| 1 | **Trang tươi giả** — ORCHESTRATOR.md cũ hơn story.json | quên regen sau checkpoint | `--check-head` trong cổng #8: HEAD so HEAD, lệch → đỏ, không push được |
| 2 | **Checkpoint phịa** — story.json khai "23 xong" mà ledger nói khác | AI tóm sai / tin trí nhớ chat | evidence_ref bắt buộc (file xuất từ ledger) + **luật đối chiếu lúc resume: ledger thắng, lệch → chặn** — phiên resume PHẢI chạy resume-plan trước khi gửi bất kỳ job nào |
| 3 | **"Done" giả** — story khai done khi còn job mập mờ | khai tay status | validator: `done` chỉ hợp lệ khi máy suy ra được (mọi ws done + ambiguous 0 ở checkpoint có bằng chứng); khai vượt → đỏ |
| 4 | **"Đang chạy" giả** — trang commit nói running mà thực tế không ai chạy | committed truth không biết live | trang IN SẴN lời nhắc "đây là checkpoint đã commit"; live chỉ có qua `--live`/hỏi operator — không hứa điều nó không đo được |
| 5 | **Bằng chứng thư mục rỗng / bằng chứng bị sửa** | vết đã gặp ở STATUS | tái dùng luật isFile + vùng `stories/*/evidence/` vào regex vùng bằng chứng của cổng #2 |

Kiểu 2 là nguy nhất — nó đúng bản chất "chat trở thành state". Vì thế luật đối chiếu
ledger-thắng không phải khuyến nghị mà là **điều kiện hợp lệ của một lần resume**; sẽ ghi
thành mục trong AGENTS của package orchestrator khi implement.

## 15. Ranh giới duyệt của Đức — không nới lỏng gì

Giữ nguyên toàn bộ AGENTS §2. Bổ sung cách ÁP cho story:

- Story mới chạy lô thật = **pilot live mới** → cần duyệt, ghi vào `approvals` (máy kiểm
  được thay vì nằm trong chat). Trial dev giữ ngoại lệ đã chốt (≤2-3 job tuỳ nhánh).
- V0.3 **AI không tự bấm Run lô thật** — Đức bấm. AI tự: soạn, nạp, giám sát, checkpoint,
  resume-plan, báo cáo. (Nới ranh này là mục 20.)
- **Automatic orchestration ≠ background automation:** mọi bước đều do một phiên AI đang
  sống thực hiện tuần tự, dừng ở checkpoint. KHÔNG daemon, KHÔNG scheduler, KHÔNG retry
  ngoài chính sách retry sẵn có của runner. Autonomous dài hạn → FUTURE OPTIONS (mục 18).

## 16. Đường di trú từ repo hiện tại

Toàn bộ là THÊM, không sửa extension nào: thêm `stories/` (trống tới khi có story thật),
`.agents/runs.json`, `WORKFLOWS.md` cho 2 nhánh active, `ROADMAP.md`, script sync + test,
`ORCHESTRATOR.md` sinh ra. Sửa nhỏ có kiểm soát: AGENTS.md gốc thêm 2 dòng sổ tay + luật
lease (cần `_root` + Đức duyệt vì là đổi luật); session-check thêm phép #8 (nâng
EXPECTED_CHECKS — đúng thủ tục chống tự tháo cổng). DASHBOARD/FEATURE-PARITY/STATUS:
**không đổi gì**. Ba dòng việc đang chạy (G-01 trial live, Flow F-02 runtime, ChatGPT B-22)
đi tiếp độc lập — orchestrator chỉ bắt đầu QUẢN story mới, không ép việc cũ vào khuôn mới.

## 17. Phạm vi V0.3 — tối thiểu

1. Schema `story/v1` + validator + test ghim (khuôn test dashboard).
2. `.agents/runs.json` + luật lease (2 luật, 1 ràng buộc code-vs-run).
3. `scripts/sync-orchestrator.mjs` + `ORCHESTRATOR.md` + `--check-head` + test.
4. `WORKFLOWS.md` × 2 nhánh active + `ROADMAP.md` (người viết, máy kiểm link).
5. **Một story pilot thật, cỡ nhỏ (10–15 job, không phải 60)** chạy trọn vòng đời 2 ngày:
   approve → run → checkpoint → tắt máy → phiên mới resume → done. Đây là bằng chứng sống
   của V0.3, như Pilot-14 với ChatGPT.
6. Cổng #8 nếu Đức duyệt.

## 18. KHÔNG nằm trong V0.3 (nói rõ để khỏi bò phạm vi)

- AI tự bấm Run lô thật (method `run.start` không trần) — FUTURE, quyết định riêng.
- Daemon / scheduler / chạy nền không giám sát / hàng đợi cross-extension.
- Máy đối chiếu WORKFLOWS.md với registry (V0.4). — Tự sinh workbook XLSX từ "Big Story"
  bằng LLM (AI soạn tay như nay, kiểm bằng Check Plan). — Web dashboard sống (Đức đã nói
  không cần). — Sửa bất kỳ luật an toàn runner nào (retry/halt giữ nguyên). — Gỡ trần 90s
  của run.trial (B-17 là việc của nhánh ChatGPT, không phải của orchestrator).

## 19. Checkpoint triển khai đề xuất (mỗi phiên đóng 1, nếp FLOW-xx)

| # | Checkpoint | Xong nghĩa là |
|---|---|---|
| ORCH-00 | Đức + GPT audit file này, chốt mục 20 | có "Go" ghi vào decisions |
| ORCH-01 | Schema + validator + test; WORKFLOWS×2 + ROADMAP | cổng xanh, chưa có story nào |
| ORCH-02 | sync-orchestrator + ORCHESTRATOR.md + --check-head + test; cổng #8 nếu duyệt | trang sinh được từ story mẫu fixture |
| ORCH-03 | runs.json + luật lease vào AGENTS (cần `_root`) | luật máy đọc được |
| ORCH-04 | Story pilot nhỏ chạy 2 ngày thật, resume bởi phiên mới | bằng chứng sống trong `stories/*/evidence/` |

Mỗi checkpoint: audit độc lập → cổng xanh → commit → safe-push, đúng nếp cũ.

## 20. Việc thật sự cần Đức quyết (kèm đề xuất)

1. **AI có được tự bấm Run lô thật không?** Đề xuất V0.3: **CHƯA** — Đức bấm Run, AI làm
   mọi thứ còn lại. Xét lại sau khi ORCH-04 chứng minh vòng resume sạch.
2. **story.json commit vào repo?** Đề xuất: **CÓ**, commit ở mốc checkpoint (GPT audit
   được qua GitHub; live giữa hai mốc thì ledger vẫn là chân lý).
3. **Thêm phép kiểm #8 vào session-check?** Đề xuất: **CÓ** ở ORCH-02 (không có nó thì
   ORCHESTRATOR.md sẽ mục đúng như mọi bảng không cổng).
4. **Bản tóm checkpoint chép vào `stories/<id>/evidence/` (file nhỏ .md/.json)?** Đề xuất:
   **CÓ** — không có nó thì kiểu-nói-dối #2 không chặn được bằng máy.
5. **Ai được cầm lease chạy?** Đề xuất: chỉ phiên Claude được Đức giao trong chat/story;
   Codex/AGY không vận hành Bridge ở V0.3.
6. **Story pilot ORCH-04 chạy trên nhánh nào?** Đề xuất: ChatGPT (active, kiểm chứng live
   mới nhất, resume đã tôi luyện qua Pilot). Gemini chờ đóng G-01; Flow chờ F-02 runtime.

---

## Tự phản biện đã làm trước khi nộp (yêu cầu mục 16 của đề bài)

- **Soát SSOT trùng:** duyệt lại bảng mục 6 — mỗi câu hỏi đúng một chân lý; điểm trùng dễ
  nhất là `checkpoint` trong story.json với ledger → đã hạ nó xuống "bản tóm có bằng chứng
  + ledger thắng khi lệch", và ép resume đi qua resume-plan chứ không qua story.json.
- **Resume không cần chat:** kịch bản mục 12 chỉ dùng 4 nguồn: ORCHESTRATOR.md, story.json,
  runs.json, ledger — không dòng nào cần lịch sử chat.
- **2 story × 2 phiên:** file tách theo story; lease chặn cùng-workstream; luật "một
  extension runtime một lease" chặn chen hàng; exact-once là lưới đỡ cuối.
- **≥3 kiểu nói dối + chặn:** mục 14, năm kiểu.
- **CHƯA ĐỦ EVIDENCE (khai thật):** (a) payload thật của `ledger.read` qua Bridge tôi mới
  xác nhận TỒN TẠI [ĐO], chưa đọc handler để chắc nó trả đủ trường cho bản tóm checkpoint —
  ORCH-01 phải đọc trước khi thiết kế bản tóm; (b) nhánh Flow: resume theo ledger mới thừa
  kế từ Gemini, chưa có bằng chứng chạy với video (F-02/F-03 đang mở); (c) "Đức bấm Run
  một cú" trên Gemini/Flow tôi suy từ kiến trúc chung [DÒ] — cần xác nhận UI thật khi làm
  ORCH-04 nếu chọn nhánh khác ChatGPT.

## Log

- 2026-08-27 · `claude-platform-orchestrator-study` · Viết bản nghiên cứu này. Chỉ tạo đúng
  file này trong `drafts/`. Không sửa file gốc, không sửa package nào, không commit/push
  (chưa giữ `_root` — đang thuộc `claude-flow-1`; push chờ Đức/GPT audit xong và `_root` rảnh).
