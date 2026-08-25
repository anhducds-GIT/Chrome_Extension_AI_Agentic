# NEXT SESSION BRIEF — Duc Auto Gemini Platform (viết 2026-08-25, cuối phiên "Pilot 04")

> Dành cho phiên AI mới tiếp quản. ĐỌC THEO THỨ TỰ: file này → `AI-OPERATOR-GUIDE.md` (bảng lệnh
> Bridge + ranh giới quyền + bảng 9 lỗi thật) → `decisions.md` (mọi quyết định owner, mới nhất ở cuối).
> Memory dùng chung tự nạp đầu phiên đã tóm các quyết định lớn. Owner là Đức — non-tech, giao tiếp
> tiếng Việt, câu ngắn, báo cáo kiểu bảng + "1 việc tiếp theo".

## 1. Trạng thái khi bàn giao

- Package này (`workers/duc-auto-gemini/v0.2.0`) là **nền tảng hợp nhất**: thân máy ChatGPT đã thực chiến
  + GeminiAdapter từ bằng chứng DOM thật (`../v0.1.0/evidence/G1-live-dom-20260825/`). Bản
  `duc-auto-chatgpt/v0.1.0` là của MỘT PHIÊN AI KHÁC đang làm song song — KHÔNG đụng vào.
- Test: `node workers/duc-auto-gemini/v0.2.0/tests/run-all.mjs` → **74/74** tại thời điểm bàn giao.
- Đã push lên GitHub (origin/main) đến commit "trial chain cap raised to 30". Owner đã duyệt push.
- **Pilot 04 ĐẠT**: vòng tự hành khép kín chứng minh trên trang thật — chuỗi chung kết 4/4 SUCCESS,
  AI tự jobs.add + run.trial + theo dõi, không chạm giao diện. Chi tiết: `pilot-04/PILOT-04-KET-LUAN.md`.
- Bridge: host tại `C:\WORKING ZONE\Duc-Auto-Gemini-Bridge\` (cổng 32148; chết thì bảo Đức đúp
  `START-BRIDGE.cmd`). Extension pairing sẵn; Dev Mode toggle ở tab ④ BRIDGE (đang ON lúc bàn giao).

## 2. VIỆC ĐANG LƠ LỬNG — kiểm tra ĐẦU TIÊN

Cuối phiên trước, một agent nền đang thi công 2 nâng cấp trong v0.2.0 (có thể xong hoặc không khi
phiên đó đóng). **Chạy `git status` ngay:**
- CÓ thay đổi chưa commit trong v0.2.0 (background.js / bridge-core.js / content.js / sidepanel.js /
  tests) → agent đã xong: tự chạy suite, tự review các điểm sống còn (xem mục 3), rồi commit.
- KHÔNG có thay đổi → 2 nâng cấp chưa thành hình, tự làm lại theo spec rút gọn ở mục 3.

## 3. Spec 2 nâng cấp (đã được owner duyệt)

1. **Own-download filename determiner** — port từ worker ChatGPT (xem `git show b587246`):
   listener `chrome.downloads.onDeterminingFilename` trong service worker, CHỈ áp cho download do
   chính extension khởi tạo, tái khẳng định tên file mong muốn (folder "Duc Auto Gemini") để thắng
   "kẻ đổi tên UUID" trong Chrome của owner. GIỮ lớp khoan-dung-đổi-tên hiện có trong sidepanel
   (verifyArtifactDownload) làm lưới dự phòng. Không thêm permission.
2. **`diagnostics.dom_probe`** — method Bridge read-only: sidepanel chuyển DAC_DOM_PROBE tới content
   script, trả snapshot DOM (selector counts theo ADAPTER.SELECTORS, buttons, images kèm scheme,
   custom tags, file inputs; cap ~64KB; tuyệt đối không click/type/focus). Mục đích: hết cảnh mượn
   mắt owner khi debug.
   Cả hai: test ghim đầy đủ, suite xanh, rồi nhờ Đức reload extension (⟳) một lần.

## 4. Sau đó: Batch Sản Xuất 01 (owner đã ủy quyền AI tự chạy)

Kế hoạch + 12 prompt sẵn tại `Batch-SX-01/BATCH-SX-01-PLAN.md`. Quy trình: jobs.add 12 job →
`run-trial` MỘT chuỗi 12 job (trần hiện tại 30; cần Dev Mode ON; cách trial trước ≥300s) → theo dõi
run-status nền (LƯU Ý: counts tích luỹ cả phiên — đặt điều kiện dừng theo DELTA) → đối chiếu 12 ảnh
(kiểm luôn tên file đã đẹp nhờ nâng cấp 1) → ghi `BATCH-SX-01-KET-QUA.md` → commit + push.

## 5. Việc mở còn lại sau batch

- Gộp về một extension chung 2 provider ("Duc Auto Studio") — bước 2 của Hướng A.
- Trả seam adapter ngược về worker ChatGPT (phối hợp với phiên AI bên đó qua handoff của họ).
- Thủ phạm đổi tên download trong Chrome của owner vẫn chưa xác định danh tính (đã miễn nhiễm).
- Danh sách câu quota EN/VN chưa kiểm chứng với quota wall thật.

## 6. Kỷ luật làm việc (tóm từ guide — vi phạm là hỏng nếp đã xây)

Không đoán selector (chỉ dùng bằng chứng). Kiểm chứng độc lập mọi báo cáo agent phụ. Mỗi fix một
test ghim. Mỗi quyết định owner → `decisions.md` + memory. Commit thường xuyên, push khi owner duyệt
(đã có tiền lệ duyệt). 4 điểm chốt với owner: push/merge (đã duyệt dạng tiền lệ), pilot live mới,
thêm permission extension, đổi luật an toàn.

## 7. Câu mở màn gợi ý cho Đức dán vào chat mới

"Bạn đọc workers/duc-auto-gemini/v0.2.0/NEXT-SESSION-BRIEF.md rồi tiếp tục công việc theo đúng brief nhé."
