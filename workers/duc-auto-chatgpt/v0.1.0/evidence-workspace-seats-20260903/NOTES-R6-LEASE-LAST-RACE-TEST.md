# Vòng 6 — lease xuống CUỐI resolver + race test thật (2026-09-03)

GPT REVISE vòng 5 với 2 yêu cầu, cả hai đã làm đúng nguyên văn:

## 1. Thu hẹp khe check-to-act

Vòng 5 đặt lease TRƯỚC `tabs.get` → cả round-trip `tabs.get` là khe hở
(chính Codex vòng 5 đã chỉ ra). Vòng 6 dời lease xuống SAU MỌI await của
resolver: `tabs.get` + kiểm origin trước, lease đọc CUỐI, trả về đồng bộ
vào hành động. Khe còn lại chỉ là lát cắt cross-process giữa lúc lần đọc
storage resolve và hành động dispatch — không còn await nào của chính
extension nằm trong đó. Không claim "0": ranh giới process vẫn tồn tại.

## 2. Race test thật trên call-chain thật

`tests/bridge-workspace-lease-race-smoke.mjs` — harness vm đầu tiên THỰC
THI sidepanel.js (DOM stub + chrome stub, nạp đúng thứ tự script của
sidepanel.html, dùng cửa `DacBridgeExecutorTestHooks`). Kịch bản đúng như
GPT ra đề: treo `chrome.tabs.get(101)` giữa resolver → ghi kho gắn phiên
sang tab 102 (đúng thao tác persist của service worker) → nhả:

- `chat.reload` snapshot 101 → BỊ TỪ CHỐI bởi lease, `chrome.tabs.reload`
  không hề được gọi;
- `run.trial` snapshot 101 → BỊ TỪ CHỐI bởi lease (dev-mode bật thật,
  qua đủ latch + cooldown), không một message nào tới tab 101;
- `diagnostics.dom_probe` cùng race → từ chối, tab 101 không bị probe;
- ca đối chứng: không race thì cùng chuỗi đó chạy xuyên suốt và probe
  đúng tab của phiên.

## Mutation

- ME1 (lease luôn true) → cả 3 ca race đỏ.
- ME2 (**dời lease ngược về TRƯỚC `tabs.get`** — đúng layout vòng 5) → đỏ:
  race test bắt được chính interleaving "rebind rơi vào lúc tabs.get đang
  chờ" mà GPT yêu cầu chứng minh.

Suite 102/102. Vòng này không chạy thêm Codex: thay đổi là dời 4 dòng +
test, GPT là auditor độc lập đang cầm vòng và sẽ soi bản push này trên
GitHub; nói rõ để không ai tưởng có vòng Codex thứ 6.
