# Vòng 5 — route lease cho RPC đang bay (2026-09-03)

GPT (vòng 5) xác nhận 2 vá vòng 4 đúng, và bắt thêm 1 HIGH thật: RPC mang
SNAPSHOT `{workspace_id, tab_id}`; Đức gắn lại phiên sang tab khác khi RPC đang
bay → panel vẫn hành động lên tab CŨ (`run.trial` bind tab cũ, `chat.reload` F5
tab cũ). Cổng socket của transport chỉ chặn được RESPONSE cũ, không chặn được
side-effect.

## Vá (commit kèm file này)

- `bridge-workspace-core.js` · `leaseHolds(store, workspace_id, tab_id)` —
  liên kết phải CÒN ĐÚNG trong kho bền (`dac.bridge.workspaces.v1`).
- `sidepanel.js` · `resolveWorkspaceTab` đọc lại kho tại THỜI ĐIỂM HÀNH ĐỘNG,
  lease không còn → `RECEIVER_LOST`. Một chỗ nghẽn chặn cả 4 method chạm tab.
- Panel nạp `bridge-workspace-core.js` (pin thứ tự script).

## Kiểm

- 2 ca đua GPT yêu cầu, thể hiện ở predicate: `run.trial` snapshot tab 101 sau
  khi gắn sang 102 → từ chối; `chat.reload` trên liên kết đã vô hiệu → từ chối.
  Dây nối (4 handler đều qua resolver, resolver bắt buộc lease) ghim tĩnh.
- Mutation GPT yêu cầu: MD1 (lease luôn true) đỏ · MD2 (gỡ lease khỏi resolver)
  đỏ. Suite 101/101.
- Codex vòng 5: **CONDITIONAL PASS** — xác nhận: thứ tự ghi-kho-trước-cycle-ghế
  đúng; lease fail-closed khi storage hỏng; không còn đường side-effect nào né
  resolver; luật "run đã bind thì giữ tab" đúng tầng.

## Điều kiện đã chấp nhận (ghi cả vào comment code)

Cửa sổ check-to-act còn sót: giữa lần đọc lease và hành động vẫn có một
round-trip `chrome.tabs.get` + scheduling. Gắn-lại rơi đúng khe đó vẫn lọt.
Trước vá, cửa sổ là TOÀN BỘ deadline RPC (tới 30s); giờ là một khe API đơn lẻ.
Đóng hẳn cần compare-at-act nguyên tử mà tabs API không có — chấp nhận, không
tô vẽ thành "0".
