# Kế hoạch Hướng A — Nền tảng chung + Provider Adapter

- Ngày: 2026-08-25 · Quyết định bởi: Đức · Thực thi: Claude Code (điều phối), Codex (cross-review, dán code inline)
- Trạng thái: G0 XONG (commit e73e220 + 0a3498c, cây sạch) · G1 ĐANG CHỜ ĐỨC · G2 chuẩn bị

## Nguyên tắc chọn đường đi (quan trọng — đọc trước khi code)

**Không đập bản ChatGPT đang chạy tốt.** Lộ trình staged, rủi ro thấp:

1. **Bước 1 (v0.2.0):** tạo `workers/duc-auto-gemini/v0.2.0/` = BẢN SAO của `duc-auto-chatgpt/v0.1.0`, rồi:
   - Tách mọi điểm chạm ChatGPT ra một file `provider-adapter.js` theo giao diện bên dưới.
   - Viết `GeminiAdapter` bằng selector ĐÃ XÁC MINH từ G1 (tuyệt đối không đoán).
   - Bỏ tạm phần Bridge V1 khỏi v0.2.0 (thêm lại sau khi pilot thông — giảm diện tích rủi ro).
   - Mang 3 món trội của gemini v0.1.0 vào: durable submit lease, tab binding, persist-trước-Send.
   - Bản duc-auto-chatgpt v0.1.0 GIỮ NGUYÊN, Đức dùng bình thường trong suốt quá trình.
2. **Bước 2 (sau khi Gemini pilot thông):** trả seam adapter ngược về bản ChatGPT → một codebase duy nhất, hai adapter, tiến tới MỘT extension "Duc Auto Studio" chạy cả hai trang.

Lý do không làm "một extension chung" ngay từ đầu: extension ChatGPT đang là công cụ sản xuất duy nhất đã được thực tế xác nhận — không đặt nó vào vùng thi công.

## Giao diện Provider Adapter (rút từ audit 24-08, mọi điểm chạm đã định vị)

```js
ProviderAdapter = {
  id, hostPatterns,                    // manifest + 2 regex origin (gom về 1)
  surface(url),                        // IMAGES / CONVERSATION / WRONG
  findComposer(), findSendButton(), findStopButton(),
  setComposerText(el, text),           // textarea vs contenteditable
  attach: { exposeFileInput(), stage(refs), confirm(staged) },  // ChatGPT: input ẩn sẵn; Gemini: bấm menu
  attachmentScope(), attachmentPreviewNodes(scope),
  responseContainers(), containerKey(node),  // ChatGPT: data-message-author-role; Gemini: chờ G1
  imageCandidates(boundary),
  blockers: { security(text), quota(scopedText) },  // câu chữ theo từng hãng
  timing: { afterType, afterClick, pollOutput, stableTextDwell, ... }  // đo lại theo từng trang
}
```

Phần "động cơ" dùng chung (không đổi): runner/batch policy, attempt identity, boundary + attribution
algebra, lease, binding, checkpoint/resume/audit-chain, xlsx-codec, output-location, sidepanel UI,
approval transaction.

## Hai cái bẫy phải xử ngay trong Bước 1

1. **Bẫy `blob:`** — `background.js:37` (bản ChatGPT) từ chối URL blob mà content chấp nhận. Gemini nhiều
   khả năng trả blob. Giải: dùng lời giải sẵn của gemini v0.1.0 (blob → dataURL trước khi chuyển download).
2. **Regex origin trùng lặp** — `sidepanel.js` ~2136 và ~4366: gom về `Adapter.hostPatterns` trước khi port.

## G1 — Mở mắt DOM (việc của Đức, 1 buổi, làm được ngay)

Cách khuyến nghị (Cách 2 — chỉ-đọc, có giám sát):
1. Đức mở Chrome có gắn extension Claude, vào `gemini.google.com/images`, đăng nhập sẵn.
2. Đức TỰ TAY đính 1 ảnh tham chiếu vào ô soạn thảo (không gửi).
3. Báo Claude: Claude chỉ ĐỌC DOM (không gõ, không bấm) → chụp trạng thái "đã đính ảnh".
4. Đức TỰ TAY gõ 1 prompt ngắn và bấm Gửi → Claude chụp trạng thái "đang tạo" và "đã có ảnh kết quả".
5. Sản phẩm: bảng selector xác minh cho mọi mục của GeminiAdapter + ảnh chụp DOM lưu làm fixture test.

Cách dự phòng (Cách 1): Đức reload extension gemini v0.1.0, chạy DAG-1 — "vân tay DOM" tự ghi chẩn đoán
vào cột last_error của file kết quả tải về; gửi file đó cho Claude.

## Kiểm soát chất lượng của Bước 1 (G2)

- Mọi thay đổi có test đi kèm; suite hợp nhất phải xanh 100% trước mỗi lần nhờ Đức thao tác.
- Fixture DOM thật từ G1 trở thành test selector — chấm dứt kỷ nguyên test-không-chạm-DOM cho tầng adapter.
- Cross-review bằng Codex: dán code inline (cách duy nhất đã chứng minh chạy được trên máy này).
  Antigravity: chỉ dùng dạng prompt Đức tự dán vào IDE.
- 4 điểm chốt cố định với Đức: push/merge · pilot live · thêm quyền extension · đổi luật an toàn.
