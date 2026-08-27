# NEXT SESSION BRIEF — Duc Auto Gemini Platform (viết 2026-08-26, cuối phiên "Ảnh tham chiếu")

> Dành cho phiên AI mới tiếp quản. **ĐỌC THEO THỨ TỰ:**
> `AGENTS.md` ở GỐC REPO (hiến pháp, mới có từ 26/08) → file này → `AI-OPERATOR-GUIDE.md` (bảng
> lệnh Bridge + bảng lỗi thật) → `decisions.md` (quyết định owner, mới nhất ở cuối).
> Chủ dự án là **Đức** — non-tech, tiếng Việt, câu ngắn, báo cáo kiểu bảng + "1 việc tiếp theo".

## 0. Ba thứ MỚI từ 26/08 mà phiên trước chưa có

1. **`AGENTS.md` ở gốc repo** — hiến pháp chung cho cả Claude + Codex + Antigravity. Đọc nó TRƯỚC.
2. **Cổng kiểm đóng phiên.** Không được báo "xong" khi nó chưa xanh:
   ```bash
   node scripts/session-check.mjs --as <nhãn-phiên-của-bạn>
   ```
3. **KHÔNG dùng `git push`.** Dùng:
   ```bash
   node scripts/safe-push.mjs --as <nhãn-phiên-của-bạn>
   ```
   Lý do: nhiều phiên AI dùng chung một thư mục git nên `git push` cuốn theo commit của phiên khác.
   Đã xảy ra thật 2 lần trong ngày 26/08.

Ghi tên phiên của bạn vào `.agents/claims.json` trước khi sửa gì.

## 1. Trạng thái khi bàn giao

- Test: `node workers/duc-auto-gemini/v0.2.0/tests/run-all.mjs` → **78/78**.
- **Batch Sản Xuất 01 ĐẠT 12/12** (`Batch-SX-01/BATCH-SX-01-KET-QUA.md`) — chuỗi dài liên tục.
- **Pilot ảnh tham chiếu ĐẠT** (`Pilot-REF-01/PILOT-REF-01-KET-QUA.md`) rồi sau đó lộ ra một lỗi
  nền sâu hơn, đã sửa; lần chạy cuối 2/2 với ảnh tham chiếu bám đúng phong cách ảnh mẫu.
- Công cụ mới: `scripts/bridge-rpc.mjs` (gọi RPC thô — `jobs.add`, `references.add`,
  `diagnostics.dom_probe`… những method `bridge-cli.mjs` không có subcommand).
- Bridge host: `C:\WORKING ZONE\Chrome Extension Bridge\duc-auto-gemini\` (cổng 32148; chết thì bảo Đức đúp
  `START-BRIDGE_Gemini_Extension.cmd`). Dev Mode ON lúc bàn giao.

## 2. Bài học lớn nhất của phiên này — đọc kỹ, nó sẽ tiết kiệm cho bạn nhiều giờ

Một lỗi mất **3 vòng chẩn đoán**. Hai vòng đầu SAI, dù cả hai nghe rất hợp lý:

| Vòng | Giả thuyết | Kết quả |
|---|---|---|
| 1 | Nhãn MIME của ảnh blob bị sai | **SAI** — sổ cái ghi nhãn là `image/jpeg`, đúng từ đầu |
| 2 | Ảnh ngoài viewport nên đo ra 0 | **SAI** — `getBoundingClientRect()` trả kích thước layout, độc lập vị trí cuộn |
| 3 | Ngưỡng 200 > chiều cao thật 180 | **ĐÚNG** |

Thứ phá được vụ án **không phải suy luận giỏi hơn**, mà là bắt hệ thống nói ra con số: thông điệp
lỗi in URL đã nhận, phép đo chứng minh địa chỉ blob không bao giờ đổi, và `dom_probe` đo được
330×180 để đem so với ngưỡng.

> **Đừng vá theo giả thuyết. Bắt hệ thống nói ra con số trước, rồi mới sửa.**

Và: khi một giả thuyết bị bác bỏ, **phải sửa lại lời giải thích đã ghi trong code/test**. Một hiểu
biết sai nằm trong codebase sẽ khiến phiên sau tin và suy tiếp từ nền sai.

## 3. Hai đường cụt ĐÃ BỊ GHIM — đừng dựng lại

Test sẽ đỏ nếu bạn làm lại. Cả hai đều nghe rất hợp lý nên rất dễ nghĩ ra lần nữa:

- **Chờ ảnh `blob:` đổi sang link `lh3`.** Đo thật: 31 giây / 68 lần dò, không đổi. `dom_probe`
  xác nhận 6/6 ảnh giữ `blob:` sau nhiều phút. Gemini **không** đổi.
- **Cuộn ảnh vào tầm mắt rồi mới đo.** Sai từ tiền đề (xem bảng trên).

## 4. Vì sao Batch-SX-01 đạt 12/12 mà vẫn có lỗi nền — hiểu chỗ này rất quan trọng

Ngưỡng `generatedImageMinSize` đặt 200, đòi **cả** rộng lẫn cao ≥ 200. Gemini render preview
**330 × 180** → 180 < 200 → mọi ảnh bị chấm "không hiện ra".

Lỗi này **đã có từ lâu** nhưng bị che kín: ảnh `https://lh3` lọt qua nhờ `remoteVerifiedResult`
(lớp khoan dung Pilot-04) **bỏ qua hẳn phép kiểm kích thước** — không phải nhờ kích thước đạt.
Gemini chuyển sang render `blob:` → lớp che mất → lỗi lộ ra.

Nghĩa là **12/12 hôm 25/08 chạy trên nền sai mà mọi chỉ số vẫn xanh.** Đó là loại lỗi khó nhất:
không có gì báo đỏ cho tới khi điều kiện bên ngoài đổi. Đức đã chốt hạ ngưỡng 200 → **150**
(giữa 112 của ảnh đính kèm và 180 của ảnh sinh ra).

## 5. Việc mở — theo thứ tự tôi khuyến nghị

1. **(khuyên làm trước) Batch Sản Xuất 02: 20–30 tấm CÓ ảnh tham chiếu.** Vừa là việc thật Đức
   cần (workload thật là 20–30 ảnh/lượt), vừa tự sinh số liệu cho việc số 2 mà không phải làm
   thêm vòng đo riêng. Quy trình: `references.add` → `jobs.add` → `run.trial` một chuỗi (trần 30,
   cần Dev Mode ON, cách trial trước ≥300s) → theo dõi `run.status` theo **delta** (counts tích
   luỹ cả phiên) → đối chiếu ảnh → ghi kết quả → commit.
2. **Ảnh về SAU khi phần chữ đã ổn định → job phải thử lại 1 lần.** Q001 lần chạy cuối trượt lần 1
   ("No attributable generated image was found") rồi đạt lần 2; Q002 đạt ngay. Giả thuyết: nhánh
   "kết quả là chữ" kết luận sau 1.5s chữ ổn định, trước khi ảnh kịp render. **ĐỪNG SỬA THEO GIẢ
   THUYẾT** — đo trước: bao lâu sau khi chữ ổn định thì ảnh mới xuất hiện. Batch 02 sẽ cho số liệu.
3. **Đường gắn ảnh suy yếu khi thử lại liên tiếp.** Có lần thử thứ 3 rơi sang `synthetic_drop` và
   `added: 0`. Giả thuyết: menu upload Gemini không kịp về trạng thái sạch. Chưa đủ bằng chứng.
4. **`inspectPersistedImage()` (đối chiếu THỦ CÔNG) chưa tải được ảnh `blob:`** — cần đổi message
   handler sang bất đồng bộ. Hiện đã cho nó báo `RECONCILE_BLOB_UNSUPPORTED` rõ ràng thay vì chết
   bí ẩn.
5. **`npm test` ở gốc repo không chạy suite Gemini** (chỉ ChatGPT + observer). Cổng kiểm có phủ,
   nhưng `npm test` vẫn mù. Sửa là đụng file gốc → hỏi Đức.
6. Gộp 2 provider về một extension "Duc Auto Studio"; trả seam adapter về worker ChatGPT.

## 6. Kỷ luật (vi phạm là hỏng nếp đã xây)

Không đoán selector — cần bằng chứng thì gọi `diagnostics.dom_probe`, đừng mượn mắt Đức.
Mỗi fix một test ghim, **và phá thử test đó xem nó có thật sự đỏ** (26/08 đã bắt được một
assertion giả canh đúng luật quan trọng nhất). Không làm yếu lớp bảo vệ để test xanh. Kiểm chứng
độc lập mọi báo cáo của AI khác. **Sửa `.js` là phải nhờ Đức reload extension (⟳) VÀ F5 tab Gemini
— reload extension mà không F5 tab thì content script cũ vẫn còn, báo `RECEIVER_LOST`.**

4 việc phải hỏi Đức: push/merge · thêm permission extension · pilot live mới · đổi luật an toàn
(retry, halt, attribution, persistence, exact-once — **ngưỡng kích thước ảnh cũng thuộc nhóm này**).

## 7. Câu mở màn gợi ý cho Đức dán vào chat mới

"Đọc AGENTS.md ở gốc repo, rồi đọc workers/duc-auto-gemini/v0.2.0/NEXT-SESSION-BRIEF.md, rồi tiếp tục theo brief nhé."
