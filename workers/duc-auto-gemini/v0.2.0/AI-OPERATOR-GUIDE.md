# AI OPERATOR GUIDE — Duc Auto Gemini (Platform v0.2.0)

> Đọc file này ĐẦU TIÊN nếu bạn là một AI được giao vận hành/debug extension này.
> Nó đúc từ các phiên chạy thật (Pilot G2-01 ngày 25/08/2026, Pilot 04 cùng ngày).
> Luật nền: `decisions.md` (cùng thư mục) là nguồn sự thật về quyền hạn — đọc nó trước khi hành động.

## 1. Bức tranh 30 giây

- Extension Chrome MV3 tự động hoá tạo ảnh trên gemini.google.com. Side panel là executor duy nhất.
- Bạn (AI) nói chuyện với extension qua **Agent Bridge**: host Node tại
  `C:\WORKING ZONE\Duc-Auto-Gemini-Bridge\` (cổng 32148, loopback, token trong
  `duc-auto-gemini-bridge-pairing-v1.json` cùng thư mục — KHÔNG commit file này).
- Workflow chuẩn (owner đã chốt): Đức đưa đường dẫn thư mục trong chat → AI đọc workbook/ảnh →
  AI bơm mọi thứ qua Bridge → Đức bấm Run (batch sản xuất) hoặc AI tự `run.trial` (dev, chuỗi liên tục ≤10 job).

## 2. Lệnh Bridge bạn được dùng

CLI có sẵn: `cd "C:\WORKING ZONE\Duc-Auto-Gemini-Bridge" && node bridge-cli.mjs <lệnh> --pairing duc-auto-gemini-bridge-pairing-v1.json`

| Lệnh CLI | Method | Dùng để |
|---|---|---|
| `ping` / `capabilities` | system.* | Kiểm tra kết nối + xem extension đang chạy bản code nào (method mới có mặt = code mới đã nạp) |
| `run-status` | run.status | Camera trực: counts/phase/stage/halt |
| `queue-list` | queue.list | Trạng thái + failure_type từng job |
| `ledger-read` | ledger.read | Sổ cái attempt |
| `run-trial --jobs A,B,... [--timeout 90] [--delay 25]` | run.trial | TỰ chạy một chuỗi liên tục ≤10 job (cần Dev Mode BẬT trong panel) |
| (raw POST) | jobs.add / jobs.update / jobs.remove / jobs.reorder | Dựng/sửa hàng đợi — jobs.add TỰ TẠO phiên nếu panel chưa có workbook |
| (raw POST) | references.add | Đẩy ảnh tham chiếu (data URL, ≤5/lần, ≤700KB/ảnh) |
| (raw POST) | run_settings.configure / output.configure | Cấu hình phiên |

Raw POST mẫu (Node): envelope `{protocol:"duc-auto-chatgpt.bridge",version:1,kind:"request",request_id,method,sent_at,client,params}`
gửi tới `http://127.0.0.1:32148/v1/rpc` với header `Authorization: Bearer <token>`.

## 3. Ranh giới quyền — KHÔNG thương lượng

- `run.start/pause/resume` KHÔNG tồn tại trong giao thức. Batch sản xuất (>10 job) = Đức bấm.
- `run.trial`: chỉ khi công tắc "Chế độ phát triển" BẬT; MỘT CHUỖI LIÊN TỤC ≤10 job (không xé lẻ
  2 job/lần — owner đã chỉnh ngày 25/08); timeout 15–90s/job; delay 20–30s giữa job;
  hai trial cách nhau ≥300s (bị từ chối sẽ báo còn phải chờ bao nhiêu giây).
- git push / thêm quyền extension / đổi luật an toàn / pilot live mới → hỏi Đức.

## 4. Playbook vận hành

### Dựng phiên từ thư mục Đức đưa
1. Đọc thư mục: workbook xlsx (cột `id`,`prompt`,`reference_images`) hoặc mô tả prompt.
2. `jobs.add` (id tự cấp Q001…), `references.add` nếu có ảnh, `run_settings/output.configure` nếu cần.
3. `queue-list` xác nhận → báo Đức "sẵn sàng" → Đức bấm Run, hoặc bạn `run-trial` từng cặp (dev).

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
| ARTIFACT PERSISTENCE FAILED nhưng file có tải về | Môi trường Chrome của Đức đổi tên mọi download (UUID/tên server) | ĐÃ VÁ (khoan dung đổi tên, ghi tên thật). Thủ phạm gốc chưa xác định |
| INTERNAL_ERROR trống | Executor nuốt thông điệp lỗi | ĐÃ VÁ (details.message) |
| Job SUBMITTED, ảnh CÓ trên trang nhưng detection timeout → job sau bị khoá RECONCILING → halt "Timed out waiting for an idle Gemini composer" | Trang Gemini lỗi render preview (ảnh tồn tại nhưng không vẽ inline) — detection đòi ảnh hiển thị ≥200px | Pilot-04 Trial 1. MỞ: nới điều kiện nhận diện cho ảnh có URL hợp lệ trong generated-image dù chưa render; cân nhắc lệnh chẩn đoán DOM qua Bridge |
| TIMEOUT_PRE_SUBMIT "waiting for idle composer" hàng loạt sau 1 job kẹt | Hệ quả dây chuyền của dòng trên (outputVerified=false chặn readiness) | Xử lý gốc ở dòng trên |
| Chạy trên /images: sau khi gửi tab nhảy sang /app/<id> | Hành vi chuẩn của Gemini | ĐÃ THIẾT KẾ ĐÚNG (surfaceAllowed). Chat thường /app với prompt "Generate an image: …" chạy ổn (Trial 2 Pilot-04: 2/2) |
| Host không phản hồi (ECONNREFUSED) | Host Node chết | Bảo Đức đúp chuột `START-BRIDGE.cmd` trong thư mục Bridge; extension tự nối lại ≤30s |
| METHOD_NOT_FOUND cho method mới | Extension chưa reload sau khi code đổi | Nhờ Đức bấm ⟳ |

## 6. Nguyên tắc làm việc (đúc từ các phiên trước)

1. **Không đoán selector.** Mọi selector phải có bằng chứng DOM thật (xem
   `../v0.1.0/evidence/G1-live-dom-20260825/`). Cần bằng chứng mới → probe chỉ-đọc qua Console
   của Đức hoặc (tương lai) lệnh chẩn đoán Bridge.
2. **Kiểm chứng độc lập mọi báo cáo của agent phụ** — tự chạy lại test, tự grep điểm sống còn.
3. **Mỗi fix một test ghim.** Suite không chạm DOM thật, nên fixture bằng chứng là vàng.
4. **Prompt trên chat thường phải nói rõ "Generate an image:"** — nếu không Gemini có thể trả lời text.
5. Ghi mọi quyết định owner vào `decisions.md`; ghi tiến trình vào handoff; cập nhật guide này khi
   gặp lỗi mới hoặc thêm năng lực Bridge mới.
