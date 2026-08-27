# AI OPERATOR GUIDE — Duc Auto Gemini (Platform v0.2.0)

> Đọc file này ĐẦU TIÊN nếu bạn là một AI được giao vận hành/debug extension này.
> Nó đúc từ các phiên chạy thật (Pilot G2-01 ngày 25/08/2026, Pilot 04 cùng ngày).
> Luật nền: `decisions.md` (cùng thư mục) là nguồn sự thật về quyền hạn — đọc nó trước khi hành động.

## 1. Bức tranh 30 giây

- Extension Chrome MV3 tự động hoá tạo ảnh trên gemini.google.com. Side panel là executor duy nhất.
- Bạn (AI) nói chuyện với extension qua **Agent Bridge**: host Node tại
  `C:\WORKING ZONE\Chrome Extension Bridge\duc-auto-gemini\` (cổng 32148, loopback, token trong
  `duc-auto-gemini-bridge-pairing-v1.json` cùng thư mục — KHÔNG commit file này).
- Workflow chuẩn (owner đã chốt): Đức đưa đường dẫn thư mục trong chat → AI đọc workbook/ảnh →
  AI bơm mọi thứ qua Bridge → Đức bấm Run (batch sản xuất) hoặc AI tự `run.trial` (dev, chuỗi liên tục ≤30 job).

## 2. Lệnh Bridge bạn được dùng

CLI có sẵn: `cd "C:\WORKING ZONE\Chrome Extension Bridge\duc-auto-gemini" && node bridge-cli.mjs <lệnh> --pairing duc-auto-gemini-bridge-pairing-v1.json`

| Lệnh CLI | Method | Dùng để |
|---|---|---|
| `ping` / `capabilities` | system.* | Kiểm tra kết nối + xem extension đang chạy bản code nào (method mới có mặt = code mới đã nạp) |
| `run-status` | run.status | Camera trực: counts/phase/stage/halt |
| `queue-list` | queue.list | Trạng thái + failure_type từng job |
| `ledger-read` | ledger.read | Sổ cái attempt |
| `run-trial --jobs A,B,... [--timeout 90] [--delay 25]` | run.trial | TỰ chạy một chuỗi liên tục ≤30 job (cần Dev Mode BẬT trong panel) |
| (raw POST) | jobs.add / jobs.update / jobs.remove / jobs.reorder | Dựng/sửa hàng đợi — jobs.add TỰ TẠO phiên nếu panel chưa có workbook |
| (raw POST) | references.add | Đẩy ảnh tham chiếu (data URL, ≤700KB/ảnh **và tổng gói ≤1 MB/lệnh** — xem bảng lỗi) |
| (raw POST) | run_settings.configure / output.configure | Cấu hình phiên |
| `run-stop` | run.stop | **Dừng** run đang chạy, đúng đường nút Stop của Đức. Đi VÒNG QUA khoá RUN_ACTIVE (dừng chỉ bớt việc). Gọi lại lần hai vô hại. Trả về `prompt_already_sent` — prompt đã gửi thì không thu hồi được, chỉ chặn được job sau |
| `chat-reload` | chat.reload | **F5** tab Gemini rồi đợi trang trả lời mới báo xong. BỊ khoá RUN_ACTIVE chặn — đang chạy thì phải `run-stop` trước. Thay cho việc nhờ Đức bấm F5 tay khi gặp `RECEIVER_LOST` |
| `bridge-rpc.mjs diagnostics.dom_probe` | diagnostics.dom_probe | MẮT TỪ XA: snapshot DOM chỉ-đọc của tab Gemini (selector counts, buttons, images, custom tags, file inputs) — hết cảnh mượn mắt owner |

Raw POST: dùng `node workers/duc-auto-gemini/v0.2.0/scripts/bridge-rpc.mjs <method> [--params-file x.json]`
(đã kiểm chứng thực chiến Batch-SX-01). Envelope thủ công nếu cần: `{protocol:"duc-auto-chatgpt.bridge",version:1,kind:"request",request_id,method,sent_at,client,params}`
gửi tới `http://127.0.0.1:32148/v1/rpc` với header `Authorization: Bearer <token>`.

## 3. Ranh giới quyền — KHÔNG thương lượng

- `run.start/pause/resume` KHÔNG tồn tại trong giao thức. Batch sản xuất (>30 job) = Đức bấm.
- `run.trial`: chỉ khi công tắc "Chế độ phát triển" BẬT; MỘT CHUỖI LIÊN TỤC ≤30 job (không xé lẻ — owner chỉnh 2 lần ngày 25/08: 2→10→30, khớp workload thật 20–30 ảnh); timeout 15–90s/job; delay 20–30s giữa job;
  hai trial cách nhau ≥300s (bị từ chối sẽ báo còn phải chờ bao nhiêu giây).
- git push / thêm quyền extension / đổi luật an toàn / pilot live mới → hỏi Đức.

## 4. Playbook vận hành

### Dựng phiên từ thư mục Đức đưa
1. Đọc thư mục: workbook xlsx (cột `id`,`prompt`,`reference_images`) hoặc mô tả prompt.
2. `jobs.add` (id tự cấp Q001…), `references.add` nếu có ảnh, `run_settings/output.configure` nếu cần.
   **LUÔN đặt `output_downloads_subfolder` riêng cho từng pilot** (ví dụ `Duc Auto Gemini/Pilot-07`).
   Lý do đã gặp thật 26/08: id job luôn bắt đầu lại từ Q001, nên Pilot-07 đổ vào cùng thư mục với
   Batch-SX-01 và Chrome phải tự đổi tên thành `Q001 (3).jpg`. Nhìn tên file KHÔNG còn biết ảnh
   thuộc pilot nào — suýt nữa tôi đọc nhầm poster Bali cũ thành kết quả của Pilot-07. Đối chiếu
   kết quả thì tin **thời gian sửa file**, đừng tin tên file.
3. `queue-list` xác nhận → báo Đức "sẵn sàng" → Đức bấm Run, hoặc bạn `run-trial` cả chuỗi ≤30 job (dev).

### Theo dõi một lần chạy
Vòng poll `run-status` mỗi 10s (chạy nền). LƯU Ý baseline: counts là TÍCH LŨY cả phiên —
đặt điều kiện dừng theo delta (success hiện tại + số job của lượt này), không theo số tuyệt đối.

### Khi có lỗi
1. `run-status` → halt + failure_type; `queue-list` → failure_type từng job; lỗi executor giờ mang
   `details.message` (300 ký tự).
2. Đối chiếu bảng lỗi đã gặp (mục 5). Chỉ hỏi mắt Đức khi cần nhìn TRANG (preview, popup lạ).
3. Sửa code → chạy `node workers/duc-auto-gemini/v0.2.0/tests/run-all.mjs` (phải xanh 100%,
   thêm test ghim cho mọi fix) → commit → nhờ Đức reload extension (⟳) → kiểm chứng bản mới đã nạp
   bằng `capabilities` → thử lại.

## 5. Bảng lỗi đã gặp trên trang thật (đừng chẩn đoán lại từ đầu)

| Triệu chứng | Nguyên nhân thật | Xử lý |
|---|---|---|
| GENERATION_LIMIT_REACHED ngay sau khi gửi, quota còn nhiều | Thẻ quota của Google tồn tại dạng khuôn rỗng vô hình trong /app | ĐÃ VÁ (kiểm tra visible+text). Nếu tái phát: xem quotaAnchorPresent |
| ATTEMPT_ID_MISMATCH mọi response | So danh tính thiếu run_id (bug lịch sử v0.1.0) | ĐÃ VÁ (expectedIdentity) |
| Panel tự đóng khi chạy xong | Tải file bằng thẻ <a> trong panel | ĐÃ VÁ (chrome.downloads) |
| ARTIFACT PERSISTENCE FAILED nhưng file có tải về | Chrome máy owner bỏ qua filename cho blob download (GUID/tên server) | ĐÃ VÁ KÉP: filename determiner trong background giành lại quyền đặt tên cho download CỦA MÌNH (port từ chatgpt b587246) + lớp khoan dung ghi tên thật làm lưới dự phòng. **Kiểm chứng thực chiến Batch-SX-01 (26/08): 12/12 file ra đúng Q001…Q012, không còn UUID nào** |
| INTERNAL_ERROR trống | Executor nuốt thông điệp lỗi | ĐÃ VÁ (details.message) |
| Job SUBMITTED, ảnh CÓ trên trang nhưng detection timeout → job sau bị khoá RECONCILING → halt "Timed out waiting for an idle Gemini composer" | Gemini có lúc tạo ảnh nhưng KHÔNG render preview inline — detection cũ đòi ảnh hiển thị ≥200px | ĐÃ VÁ (`remoteVerifiedResult` trong content.js — ảnh trong generated-image với URL lh3 thật = tồn tại; xác nhận bằng chuỗi chung kết Pilot-04 4/4) |
| TIMEOUT_PRE_SUBMIT "waiting for idle composer" hàng loạt sau 1 job kẹt | Hệ quả dây chuyền của dòng trên (outputVerified=false chặn readiness) | Xử lý gốc ở dòng trên |
| Chạy trên /images: sau khi gửi tab nhảy sang /app/<id> | Hành vi chuẩn của Gemini | ĐÃ THIẾT KẾ ĐÚNG (surfaceAllowed). Chat thường /app với prompt "Generate an image: …" chạy ổn (Trial 2 Pilot-04: 2/2) |
| Host không phản hồi (ECONNREFUSED) | Host Node chết | Bảo Đức đúp chuột `START-BRIDGE.cmd` trong thư mục Bridge; extension tự nối lại ≤30s |
| METHOD_NOT_FOUND cho method mới | Extension chưa reload sau khi code đổi | Nhờ Đức bấm ⟳ |
| RECEIVER_LOST ngay sau khi reload extension | Tab Gemini đang mở vẫn ôm content script cũ đã bị vô hiệu | **Tự F5 được rồi**: gọi `chat-reload` (thêm 26/08). Đang chạy thì `run-stop` trước. Chỉ nhờ Đức khi Bridge cũng chết. **Reload extension thì LUÔN phải F5 tab kèm theo** (Batch-SX-01, 26/08) |
| `POST_SUBMIT_UNCERTAIN` + "Generated image URL was not usable", ảnh CÓ trên trang | Gemini render ảnh sinh ra có lúc là `blob:` (không phải `lh3`). Blob đó mang nhãn MIME không phải ảnh, nên data URL tạo ra thành `application/octet-stream` và background từ chối đúng luật | ĐÃ VÁ 26/08: nhận dạng theo BYTE rồi mới đóng nhãn (`sniffImageType`). Thông điệp từ chối giờ in 40 ký tự đầu của URL, và sổ cái ghi `blob_conversion` |
| Gắn ảnh tham chiếu: chạy thành công nhưng không biết đường nào đã dùng | Dấu vết `attachmentFingerprint` chỉ ghi khi THẤT BẠI | Đã biết, chưa sửa. Rủi ro: đường chính hỏng thì hệ thống âm thầm rơi sang đường dự phòng, không ai hay (Pilot-REF-01, 26/08) |
| Ảnh lưu ra `.jpg` dù mẫu tên ghi `.png` | Gemini trả JPEG; Chrome sửa đuôi cho khớp nội dung thật | Không phải lỗi — đuôi mới đúng hơn. Lớp khoan dung ghi tên thật vào sổ cái |
| Cổng kiểm báo **"chưa khai vào Bản đồ file"** cho một thư mục mà bạn ĐÃ khai, tên thư mục in ra trông như `Táº¡o áº¢nh` | Git mặc định mã hoá ký tự không phải ASCII thành octal. Cổng đem chuỗi mã hoá đó so với tên thật trong `AGENTS.md` nên không bao giờ khớp — **mọi thư mục đặt tên tiếng Việt đều đỏ oan** | ĐÃ VÁ 26/08 (Đức duyệt): `scripts/session-check.mjs` và `scripts/safe-push.mjs` gọi git kèm `-c core.quotepath=false`; safe-push bỏ thêm dấu nháy bao ngoài trước khi quy chủ sở hữu commit. Ghim bằng `tests/session-check-utf8-paths.mjs` (nằm trong `npm test`). **Thấy đỏ oan thì đừng sửa cổng cho nó xanh — tìm xem cổng đọc sai cái gì** |
| `run.stop` trả `prompt_already_sent: false` nhưng prompt VẪN được gửi ngay sau đó | Cờ dừng chỉ được đọc ở các **mốc ngắt** của runner. Job đã bắt đầu đi tới chỗ gửi thì đi nốt. `prompt_already_sent` mô tả đúng KHOẢNH KHẮC bạn gọi, không phải lời hứa cho tương lai. Đo thật 26/08: `BRIDGE_RUN_STOPPED` 14:20:36 → `PROMPT_SUBMITTED` 14:20:37, cách nhau 1 giây | Không phải bug của lớp dừng — chỉ lời nhắn là sai, ĐÃ VÁ cho nói đúng sự thật. Thứ `run.stop` bảo đảm được là **các job SAU không chạy**; job đang chạy thì phải coi như có thể tốn 1 lượt quota. Muốn chắc chắn: gọi `run-stop` rồi `queue-list` xem job đó có `PROMPT_SUBMITTED` không |
| `INVALID_ENVELOPE` khi `references.add` nhiều ảnh cùng lúc | **Trần thân gói RPC là 1 MB** (`MAX_ENVELOPE_BYTES` trong `bridge-host.mjs`), không phải trần theo SỐ ảnh. 5 ảnh × ~390 KB data URL = vượt ngay | Chia lô theo BYTE, không theo số lượng: cộng dồn độ dài data URL, cắt lô ở ~800 KB. Đo thật Pilot-07 (26/08): 15 ảnh 127–294 KB → 6 lô, 2–3 ảnh/lô |
| Job trượt `POST_SUBMIT_UNCERTAIN`, sổ cái ghi `decision_reason: AMBIGUOUS_NEW_IMAGE`, thử lại thì đạt | Lúc chấm có **HAI** ảnh mới cùng lúc: một ảnh gán được cho lượt này, một ảnh nữa "mới hiện" không thuộc lượt này. Luật từ chối đoán bừa → trượt. Đo thật Pilot-07 Q001 lần 1: `post_turn` 1 ảnh (`6c89e72a`), `fresh` 2 ảnh (thêm `2bcc3eb9`, vai assistant, KHÔNG phải ảnh đính kèm) | Chưa rõ ảnh thứ hai là gì — sổ cái chỉ ghi mã băm, không ghi URL. **Đừng nới luật attribution** (đó là lớp chống job này lấy ảnh job khác). Việc cần làm trước: thêm URL rút gọn vào `fresh_ids` để lần sau nhận mặt được nó |

## 6. Nguyên tắc làm việc (đúc từ các phiên trước)

1. **Không đoán selector.** Mọi selector phải có bằng chứng DOM thật (xem
   `../v0.1.0/evidence/G1-live-dom-20260825/`). Cần bằng chứng mới → gọi `diagnostics.dom_probe` qua Bridge (mắt từ xa, đã có); Console của Đức chỉ là đường dự phòng.
2. **Kiểm chứng độc lập mọi báo cáo của agent phụ** — tự chạy lại test, tự grep điểm sống còn.
3. **Mỗi fix một test ghim.** Suite không chạm DOM thật, nên fixture bằng chứng là vàng.
4. **Prompt trên chat thường phải nói rõ "Generate an image:"** — nếu không Gemini có thể trả lời text.
5. Ghi mọi quyết định owner vào `decisions.md`; ghi tiến trình vào handoff; cập nhật guide này khi
   gặp lỗi mới hoặc thêm năng lực Bridge mới.
