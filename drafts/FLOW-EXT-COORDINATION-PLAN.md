# FLOW-EXT — Kế hoạch điều phối Extension Google Flow (video)

> Viết 2026-08-27 bởi Claude (phiên `claude-flow-plan`).
> **Trạng thái: CHỜ ĐỨC CHỐT 3 ĐIỀU ở mục 6 — chưa được code.**
> Mục tiêu: extension thứ 3 của repo, chạy kế hoạch XLSX tạo **video** trên Google Flow,
> giao diện và cách vận hành gần giống nhánh Gemini, phát triển bằng Bridge + developer mode
> (AI tự triển khai, tự debug).

## 1. Kiểm tra nền tảng — kết luận: SẴN SÀNG

Đã kiểm ngày 27/08, tất cả đã push lên `origin/main`:

| Món chuẩn hóa | Trạng thái | Ý nghĩa cho Flow |
|---|---|---|
| Quy trình thêm extension mới | ✅ `PLATFORM.md` §6, 6 bước | Không phải nghĩ lại từ đầu, làm theo là xong |
| `STATUS.md` + `DASHBOARD.md` máy sinh | ✅ V0.1 | Flow sẽ tự hiện lên bảng điều hành |
| Cổng kiểm `session-check` (7 phép) + `safe-push` | ✅ V0.2 | Chặn push ẩu, chặn cuốn commit người khác |
| Bảng chủ sở hữu `claims.json` | ✅ đang trống toàn bộ | Không ai giẫm chân ai |
| Kiến trúc tách `provider-adapter.js` (Gemini v0.2.0) | ✅ | **Điều kiện then chốt**: mọi selector nằm 1 file, `content.js`/`sidepanel.js` trung lập → Flow chủ yếu là viết adapter mới |
| Bridge + `diagnostics.dom_probe` + `run.trial` (dev mode) | ✅ đã kiểm chứng live 26/08 | Đúng flow phát triển Đức muốn: AI tự soi DOM, tự chạy thử có trần |

Việc mở còn lại của repo **không chặn** Flow:
- **G-01** (luật dừng nhánh Gemini) — chờ Đức chốt riêng, khác package.
- `version_source` khác hoa/thường trên Windows — mức LOW.

## 2. Flow khác Gemini chỗ nào — phải ĐO, không đoán

Gemini làm **ảnh trong khung chat**. Flow làm **video trong giao diện project**. Bốn khác biệt
đã thấy trước, nhưng theo Luật vàng 1 (*không đoán selector*), tất cả phải có bằng chứng DOM
thật trước khi viết code:

1. **Thời gian sinh**: video mất vài phút, không phải vài chục giây → timeout, polling,
   trần thời gian job phải đặt lại từ số đo thật.
2. **Nhận biết "xong"**: không còn là `<img>` + alt "AI generated" — phải soi xem Flow báo
   xong bằng gì (thẻ `<video>`? progress bar biến mất? nút download hiện ra?).
3. **Bằng chứng kết quả**: `image-evidence-core.js` phải có bản video tương đương
   (URL video, poster, độ dài). File video nặng → **chốt chính sách: chỉ ghi URL + metadata,
   không tự tải file** (đề xuất, Đức có thể đổi).
4. **Tiền thật**: Flow trừ **credits** mỗi lần sinh. Luật an toàn phải chặt hơn nhánh ảnh:
   trần trial thấp (đề xuất ≤2 job), không retry tự động khi nghi ngờ đã trừ credits.

## 3. Cách dựng: fork nhánh Gemini v0.2.0

- Chép `workers/duc-auto-gemini/v0.2.0/` → `workers/duc-auto-flow/v0.1.0/` (tên chờ chốt).
- **Không mang theo**: thư mục pilot/evidence/Batch của Gemini (bằng chứng của nhánh khác),
  `HANDOFF.md`/`decisions.md`/`BACKLOG.md` cũ (mở sổ mới, dãy số mới `F-xx`).
- Viết lại `provider-adapter.js` cho Flow từ bằng chứng DOM (bước FLOW-01).
- Thay `image-evidence-core.js` → `video-evidence-core.js`; rà `runner-core.js` về timeout.
- `manifest.json`: đổi host permission sang trang Flow — **đây là quyền mới, phải Đức duyệt**
  (luật `AGENTS.md` §2).
- Tránh lặp lỗi G-03 của Gemini: sửa tiêu đề `README.md` ngay khi fork, đừng để "bản chép
  còn nguyên tên cũ".

## 4. Lộ trình — 5 checkpoint, mỗi phiên đóng 1 cái

| # | Checkpoint | Ai làm | Xong nghĩa là gì |
|---|---|---|---|
| FLOW-00 | Đức chốt 3 điều (mục 6) | **Đức**, ~5 phút | Có URL đúng, quyền được duyệt, tên package |
| FLOW-01 | Bằng chứng DOM thật | Claude (phiên mới) vận hành Bridge, Đức mở tab Flow + load unpacked | 4 snapshot: trang nghỉ · đang sinh · có video kết quả · màn nhập prompt/tham chiếu. Lưu vào `evidence/` của package |
| FLOW-02 | Adapter + video core + test ghim | Codex code theo brief; Claude audit độc lập | Suite xanh, chưa chạm trang thật |
| FLOW-03 | Khai platform | Claude | `STATUS.md`, dòng `claims.json`, Bản đồ file, registry `PLATFORM.md` §3, dashboard sinh lại xanh |
| FLOW-04 | Trial dev-mode rồi pilot live | AI trial ≤2 job (ngoại lệ dev đã chốt); **pilot live phải Đức duyệt** (luật §2) | Video đầu tiên sinh ra từ kế hoạch XLSX, có bằng chứng |

Mỗi checkpoint kết thúc bằng: cổng kiểm xanh → commit → `safe-push` → 1 dòng Log.
Audit độc lập trước mọi lần báo "xong" (đúng nếp Pilot/Platform cũ).

## 5. Phân vai

| Ai | Việc |
|---|---|
| **Đức** | Chốt FLOW-00, duyệt quyền mới, duyệt pilot live, mở tab Flow khi cần mắt thật |
| **Claude** (phiên mới, nhãn riêng, giữ package Flow) | Điều phối, vận hành Bridge, viết brief cho Codex, audit |
| **Codex** | Code adapter + core theo brief, audit chéo |
| **Antigravity** | Chưa giao gì — headless đang hỏng (hook config cá nhân), và UI đã có sẵn từ fork |

## 6. Ba điều chờ Đức chốt (FLOW-00) — trả lời xong là chạy được

1. **Trang Flow chính xác là trang nào?** Dán URL Đức đang dùng (dạng
   `https://labs.google/fx/tools/flow` hay khác?). Tài khoản có đủ credits để dev không?
2. **Duyệt quyền mới**: extension Flow cần host permission cho trang đó. Đồng ý không?
3. **Tên package**: `workers/duc-auto-flow/v0.1.0` — được chưa, hay muốn tên khác?

Chốt xong 3 điều → dán prompt dưới đây vào một phiên Claude Code mới.

## 7. Prompt mở phiên triển khai — dán SAU khi chốt mục 6

```text
You are the implementation coordinator for the Google Flow video extension. Session label: `claude-flow-1`.

Read first, in this exact order:
1. `AGENTS.md` at repo root — the constitution. Everything in it binds you.
2. `drafts/FLOW-EXT-COORDINATION-PLAN.md` — the approved plan. Đức has confirmed the three
   items in section 6; ask him to restate them if they are not in your chat context.
3. `workers/duc-auto-gemini/v0.2.0/AGENTS.md` + `provider-adapter.js` — the architecture you
   will fork. Read the adapter header comment: every selector there is evidence-backed.
4. `workers/duc-auto-gemini/v0.2.0/AI-OPERATOR-GUIDE.md` — how to drive the Bridge.

Your first checkpoint is FLOW-01 (DOM evidence), not code:
- Claim `workers/duc-auto-flow` in `.agents/claims.json`.
- Fork gemini v0.2.0 as a bootstrap: change manifest host to the Flow origin Đức approved,
  keep only Bridge + diagnostics; do NOT enable any run/submit path yet.
- Ask Đức to load it unpacked (developer mode) and open the Flow tab.
- Capture 4 dom_probe snapshots: idle · during generation · after a finished video · the
  prompt/reference input surface. Store them under the new package's `evidence/` folder.
- No selector may be written into the adapter without a snapshot to cite. [DÒ] conclusions
  must be re-verified by reading code — this repo has been burned five times.

Hard rules you must not relax: no new permissions beyond the one Đức approved; no live pilot
without Đức's explicit go; trial cap ≤2 jobs while in dev mode (video costs real credits);
evidence folders are append-only; push only via `node scripts/safe-push.mjs --as claude-flow-1`
after `node scripts/session-check.mjs --as claude-flow-1` is fully green.

When FLOW-01 is done, report to Đức in simple Vietnamese: what evidence exists, what the
completion signal for a finished video actually is, and the single next step.
```

## Log

- 2026-08-27 · claude-flow-plan · Viết kế hoạch này. Chưa code gì. Chờ Đức chốt mục 6.
