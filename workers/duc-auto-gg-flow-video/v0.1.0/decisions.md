# decisions.md — Duc Auto GG Flow Video

> Quyết định đã chốt | vì sao | ai chốt. Mới nhất ở cuối. Chỉ thêm dòng.

## 2026-08-27 — FLOW-00: ba chốt khai sinh package (Đức chốt trong chat)

1. **Trang đích**: Google Flow, match pattern `https://labs.google/fx/tools/flow/*`
   (URL project thật của Đức: `.../flow/project/d7c07112-eb7f-4efe-b251-8aee4b2b6c4f`;
   extension match theo pattern tool, không khoá ID project).
2. **Quyền host mới được duyệt**: đúng pattern trên, không xin rộng hơn
   (không `labs.google/*`). Đây là lần duyệt quyền theo luật AGENTS.md gốc mục 2.
3. **Tên package**: `workers/duc-auto-gg-flow-video/v0.1.0`, tên hiển thị
   "Duc Auto GG Flow Video".

Nguồn: `drafts/FLOW-EXT-COORDINATION-PLAN.md` mục 6.

## 2026-08-27 — Luật an toàn nhánh video (từ kế hoạch FLOW đã duyệt)

- **Trần trial dev: ≤2 job một chuỗi** — video trừ credits thật, không dùng trần
  30 job của nhánh ảnh. Nới trần = đổi luật an toàn = hỏi Đức.
- **Không retry tự động** khi nghi ngờ lần sinh trước đã trừ credits.
- **Khoá bootstrap Bridge**: cho tới khi adapter dựng từ bằng chứng thật, Bridge chỉ
  phục vụ `session.hello`, `system.ping`, `system.capabilities`,
  `diagnostics.dom_probe`. Gỡ khoá phải ghi thêm một mục vào file này.

## 2026-08-27 — Đức chốt trần trial nhánh video: TỐI ĐA 3 VIDEO một lượt

Đức chốt trong chat (27/08): "trial chỉ tạo tối đa 3 Video 15 credit thôi nhé, tổng là
45 credit, đó là giới hạn free." → Trần cứng cho `run.trial` của nhánh này là **3 job/chuỗi**
(thay đề xuất ≤2 trong kế hoạch FLOW). 15 credit/video là số đo hiện tại của gói free —
con số credit có thể đổi theo Google, trần 3 video thì không tự đổi. Code hoá ở F-04
(`dev-trial-core.js`) trước khi gỡ khoá bootstrap.

## 2026-08-27 — `diagnostics.evidence_submit`: primitive tương tác duy nhất của bootstrap

Đức chốt trong chat: "bạn hãy tự động thử tất cả các tính năng" (việc cần tay người để
cuối). Claude-in-Chrome chưa cài nên extension phải tự có tay. Thêm method
`diagnostics.evidence_submit`: gõ 1 prompt vào composer (selector có bằng chứng
`evidence/F1-snapshot-1-idle-20260827.json`) + bấm nút "arrow_forward Create", một lần
mỗi call, **trần cứng 3 lượt mỗi lần nạp trang** khớp ngân sách free 3 video. Đếm
TRƯỚC khi click (click lỗi không hoàn lượt — thà mất lượt đếm còn hơn lố credits).
Là giàn giáo FLOW-01: gỡ hoặc gộp vào runner thật ở F-02.

## 2026-08-27 — `chat.reload` vào allowlist bootstrap (thứ 5)

Gặp thật ngay lần nối đầu: tab Flow mở trước khi load extension → content script chưa
tiêm → `RECEIVER_LOST`, và mỗi lần reload extension sau này cũng sẽ cần F5 tab.
`chat.reload` chỉ F5 tab đã bind — không gửi prompt, không tốn credits — nên cho vào
allowlist để vòng debug tự chạy, khỏi mượn tay Đức mỗi lần. Test ghim đã đổi theo.
(Cùng ngày, cùng phiên: Đức yêu cầu đổi tên hiển thị "Duc Auto Gemini" → "Duc Auto GG
Flow" và icon G xanh-tím → F teal, đã làm.)

## 2026-08-27 — Đức giao phiên `claude-flow-1` tự triển khai đến khi hoàn thiện

Đức chốt trong chat: phiên Claude này tự gọi Codex CLI / Antigravity để code, trial,
debug, hoàn thiện — theo flow Bridge + developer mode. Vẫn giữ nguyên các mốc phải hỏi:
quyền mới ngoài pattern đã duyệt, pilot live thật, đổi luật an toàn.

## 2026-08-27 — F-05: gỡ khoá bootstrap Bridge

Gỡ allowlist/bootstrap gate trong `bridge-router-core.js`, mở lại toàn bộ method surface theo
router chuẩn của Gemini HEAD. Lý do: provider adapter Flow đã được dựng từ bằng chứng DOM thật,
có test ghim; F-02 hoàn tất và audit đối kháng PASS, F-04 đã hạ trần trial còn 3 job. Các gate
an toàn riêng của từng method vẫn giữ nguyên. `diagnostics.evidence_submit` vẫn là công cụ debug
có trần cứng 3 lượt/trang; `run.trial` vẫn cần Đức bật **Chế độ phát triển (Dev Mode)** trong panel.
