# Audit độc lập — Hệ sinh thái Duc Auto (ChatGPT + Gemini)

- Ngày: 2026-08-24 · Người audit: Claude Code (vai trò: auditor độc lập, không sửa code trong phiên audit)
- Phạm vi: `workers/duc-auto-chatgpt/v0.1.0` (~10.000 dòng nguồn, 70 test) và `workers/duc-auto-gemini/v0.1.0` (~1.200 dòng nguồn, 19 test)
- Phương pháp: 2 agent đọc độc lập toàn bộ 2 package + auditor tự đọc lớp DOM của cả hai và bảng selector. Chỉ ghi nhận điều đã xác minh từ nguồn.

## 1. Kết luận nhanh

1. **Bản Gemini KHÔNG phải là bản port từ ChatGPT.** Nó được viết lại từ đầu, nhỏ hơn ~8 lần. Debug "lắt nhắt" hiện nay chính là đang trả lại từng món nợ mà bản ChatGPT đã trả xong qua 9 vòng pilot (bug đóng băng plan, bug so danh tính, bug tự đóng panel, bug đếm ảnh — tất cả đều có "người anh em" đã được giải ở bản ChatGPT).
2. **Câu hỏi của Đức — "port bản ChatGPT sang, chỉ thay phần nhập liệu Gemini" — câu trả lời là CÓ, và đó là hướng đúng.** Ước lượng ~85–90% bản ChatGPT dùng lại nguyên vẹn. Phần phải thay gói gọn trong 7 điểm (mục 3).
3. **Nhưng port không tự giải quyết nút thắt thật: "mù DOM".** Bản ChatGPT chạy tốt vì selector của nó được xác minh trên trang thật qua 9 pilot. Bản Gemini chưa ai từng nhìn thấy DOM thật — mọi selector là phỏng đoán. Việc "mở mắt" này rẻ (1 buổi) và phải làm một lần dứt điểm, bất kể chọn hướng nào.
4. **Tài sản quý nhất của hệ thống là tầng an toàn** (exact-once submit, lease, binding, fail-closed, least-privilege) — cả hai bản đều đạt mức hiếm thấy. Điểm yếu duy nhất tập trung ở "đôi mắt" (đọc DOM).

## 2. Hiện trạng hai package

| | duc-auto-chatgpt v0.1.0 | duc-auto-gemini v0.1.0 |
|---|---|---|
| Quy mô nguồn | ~10.000 dòng, 25+ module | ~1.200 dòng, 10 module |
| Test | 70 file, 70/70 PASS | 19 file, 19/19 PASS |
| Đã chạy thật | 9 pilot (03→09), nhiều vòng live PASS có bằng chứng | 1 pilot (Pilot-01) thất bại, chưa lần nào chạy thông |
| Selector DOM | Xác minh trên trang thật | 100% phỏng đoán, chưa xác minh |
| Điểm trội riêng | Bridge V1, resume/checkpoint/audit-chain trưởng thành, halt instructions tiếng Việt | Phase machine tường minh, durable submit lease, tab binding — có phần còn sạch hơn bản ChatGPT |
| Chia sẻ code | 0 dòng chung. `xlsx-codec.js` bị chép tay rồi rút gọn (363→61 dòng) — mỗi lần sửa phải sửa 2 nơi | |

Trạng thái đáng lo: **cả hai package đều có nhiều file chưa commit** (toàn bộ 4 bản vá bug của Gemini + công việc Bridge của ChatGPT). Sổ RUN-LEDGER của Gemini còn ghi "PASS / NO CODE CHANGE" trong khi cây làm việc đã có 4 bản vá — tài liệu và sự thật đang lệch nhau.

## 3. Trả lời câu hỏi port ChatGPT → Gemini

**Dùng lại nguyên vẹn (không đổi 1 dòng):** xlsx-codec, run-plan, checkpoint, audit-chain, approval-transaction, attempt-identity, resume, output-location/profile, run-state, recreate, toàn bộ Bridge V1 + host Node, operator glossary/messages (chỉ đổi chữ "ChatGPT").

**Phải thay — đúng 7 điểm, đều đã định vị đến từng dòng:**
1. `manifest.json` — host permission + content_scripts matches → gemini.google.com.
2. 2 regex origin trùng lặp trong `sidepanel.js` (dòng ~2136 và ~4366) — gom về 1 hàm trước khi port.
3. **Toàn bộ selector trong `content.js` (~50–247)** — phần việc thật. ChatGPT neo vào `data-message-author-role` (Gemini không có); cần "vật neo" tương đương cho Gemini — đây chính là Bug #3 đang mở.
4. Bộ câu chữ CAPTCHA/quota (Google nói khác OpenAI).
5. **Bẫy `blob:`** — content chấp nhận ảnh `blob:` nhưng `background.js:37` từ chối tải nó. Trên ChatGPT không sao (CDN trả https), trên Gemini rất có thể nổ. Bản Gemini đã có sẵn lời giải (đổi blob→dataURL) — mang theo.
6. Luồng đính ảnh: ChatGPT có sẵn `input[type=file]` ẩn trong form; Gemini phải bấm menu để lộ input — bản Gemini đã viết xong máy trạng thái `exposeFileInput` — mang theo.
7. Các hằng số thời gian (150ms/500ms/1.5s…) đang tinh chỉnh theo nhịp ChatGPT — cần đo lại trên Gemini.

**Khuyến nghị kiến trúc:** không "chép nguyên", mà tách bản ChatGPT thành **Nền tảng chung + Provider Adapter**. Mỗi provider chỉ còn là 1 file adapter (selector + luồng đính ảnh + câu chữ blocker + nhịp thời gian). Mang 3 ý tưởng trội của bản Gemini vào nền chung: durable submit lease, tab binding, persist-trước-khi-Send.

## 4. Chấm điểm 4 năng lực (thang 5)

| Năng lực | ChatGPT | Gemini | Ghi chú |
|---|---|---|---|
| Đọc trang (sensing) | 4 | 1.5 | ChatGPT xác minh live; danh sách câu quota tự nhận là chưa kiểm chứng. Gemini: toàn bộ là đoán. **Đây là điểm hỏng duy nhất của cả hệ.** |
| Xử lý (logic/state) | 5 | 4 | Cả hai chặt chẽ; Gemini vừa lộ 4 bug do viết lại từ đầu, đã vá 3. |
| Phát tín hiệu (audit/evidence) | 5 | 4 | Audit JSONL ~25 trường, không bao giờ ghi prompt (chỉ hash); Gemini vừa thêm "vân tay DOM" tự chẩn đoán. |
| Control (an toàn/quyền) | 5 | 5 | Exact-once, lease, binding, fail-closed, least-privilege, Run-button chỉ dành cho người. Tài sản quý nhất. |

**Test suite — một cảnh báo chung:** toàn bộ 89 test của cả hai bên là test logic thuần hoặc soi chuỗi ký tự trong nguồn. **Không một test nào chạm DOM thật hay chrome API thật.** Tầng rủi ro cao nhất (selector) được kiểm tra ít nhất. Cách chữa: sau khi "mở mắt DOM" (G1), lưu ảnh chụp DOM thật làm fixture và test selector trên đó.

## 5. Sổ phát hiện (ưu tiên)

- **P1-1** Mù DOM Gemini (Bug #3 mở). Mọi thất bại live đều quy về đây.
- **P1-2** Hai codebase song song, 0 dòng chung — mỗi fix tốn 2 lần công, và sẽ tốn 3 lần khi thêm provider thứ ba.
- **P1-3** ~30 file chưa commit trên cả 2 worker; tài liệu ledger lệch với cây làm việc. Rủi ro mất việc thật.
- **P2-1** Bẫy scheme `blob:` (content nhận, background từ chối) — tiềm ẩn, sẽ nổ khi sang Gemini.
- **P2-2** `sidepanel.js` bản ChatGPT 4.624 dòng — nguyên khối, khó port, khó review.
- **P2-3** Test không chạm DOM (xem mục 4).
- **P2-4** Regex origin trùng lặp 2 nơi.
- **P3** manifest ghi version 0.3.0 nhưng folder tên v0.1.0; `AUDIT.md`/`TEST_REPORT.md` của ChatGPT đã lỗi thời so với hiện thực; `resolveExistingOutput()` là code chết; danh sách câu quota chưa kiểm chứng live.

## 6. Roadmap 5 giai đoạn

- **G0 — Chốt & đóng băng** (1 buổi, cần Đức): chọn hướng A/B; duyệt commit toàn bộ trạng thái hiện tại; sửa ledger cho khớp sự thật.
- **G1 — Mở mắt DOM Gemini** (1 buổi, cần Đức, làm được song song với G0): 
  - Cách 1: Đức chạy lại DAG-1 — "vân tay DOM" đã cài sẵn sẽ tự ghi chẩn đoán vào file kết quả.
  - Cách 2 (nhanh và dứt điểm hơn): Đức cho phép 1 phiên **chỉ-đọc** DOM Gemini có giám sát qua Claude in Chrome trên đúng tab đã đăng nhập — không gõ, không gửi gì. 
  - Sản phẩm: bảng selector đã xác minh + ảnh chụp DOM làm fixture test.
- **G2 — Hợp nhất nền tảng** (tôi tự hành phần lớn): tách Provider Adapter khỏi bản ChatGPT; viết GeminiAdapter bằng selector đã xác minh; đưa lease/binding/persist-trước-Send vào nền chung; dùng chung xlsx-codec; test hợp nhất + fixture DOM. Chốt với Đức trước khi đụng bất kỳ luật an toàn nào.
- **G3 — Pilot Gemini end-to-end** (Đức chạy, tôi đọc audit): DAG-0 (không ảnh) → DAG-1 (1 ảnh) → batch nhỏ.
- **G4 — Tự hành hoá**: vòng lặp orchestrator: audit → sửa → test → cross-review (Codex, dán code inline — cách duy nhất đã chứng minh chạy được) → báo cáo. Điểm chốt cố định với Đức: (1) git push/merge, (2) chạy pilot live, (3) thêm quyền extension, (4) đổi luật an toàn. Antigravity headless: không dùng (cổng duyệt quyền chặn); chỉ dùng dạng prompt Đức dán vào IDE.

## 7. Lời khuyên thẳng

1. Ngừng vá lắt nhắt bản Gemini. Mỗi bug vá được lại lộ bug sau, vì nền của nó chưa từng chạy thật.
2. Chọn bản ChatGPT làm gốc — không phải vì code nhiều hơn, mà vì **nó là bản duy nhất đã được thực tế xác nhận**.
3. Giải "mù DOM" một lần bằng bằng chứng thật, không đoán selector thêm bất kỳ lần nào nữa.
4. Commit trước khi làm gì tiếp — đang có quá nhiều việc tốt chưa được bảo vệ.
5. Tự hành hoá là khả thi ngay sau G2, với 4 điểm chốt cố định ở trên.

---
**1 việc tiếp theo:** Đức trả lời 1 câu — chọn **Hướng A** (nền tảng chung tách từ bản ChatGPT — khuyến nghị của tôi) hay **Hướng B** (tiếp tục vá bản Gemini độc lập)?
