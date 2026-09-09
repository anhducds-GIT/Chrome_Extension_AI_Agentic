# Bảng điều hành Extension

> **SINH TỰ ĐỘNG — ĐỪNG SỬA TAY.** Sinh lại bằng `node scripts/build-dashboard.mjs`.

Trang được sinh tại commit `88e30805` (2026-09-09). Đây là lúc sinh trang, **KHÔNG phải lúc bất kỳ extension nào được kiểm chứng**.

## A · Bắt đầu từ đâu

1. **Việc ưu tiên #1** — **XUNG ĐỘT** — 2 đơn vị cùng khai `priority_rank: 1` (`workers/duc-auto-gg-flow-video/v0.1.0` · `workers/hnx-fetch/v0.1.0`). Chỉ một việc được là số 1; sửa STATUS rồi sinh lại.
2. **Phiên gần nhất** — 2026-09-09 @ `88e30805` · [HANDOFF.md](HANDOFF.md)
3. **Luật phải đọc trước khi sửa gì** — [AGENTS.md](AGENTS.md) · cổng vào cho AI: [llms.txt](llms.txt)
4. **Ai đang giữ package nào** — `.agents/claims.json` (trạng thái sống, cố tình KHÔNG chép vào trang này để trang không mục theo từng lần nhận/trả quyền)

## B · Có gì trong repo

| Extension | Version [ĐO] | Lifecycle [KHAI] | Method Bridge [ĐO] | File test [ĐO] | Kiểm chứng cuối (ngày @ commit 7 ký tự, cách kiểm) [KHAI + bằng chứng] | Code đã commit đổi sau kiểm chứng? [ĐO] | Việc đang mở | Đọc sâu (link STATUS) |
|---|---:|---|---:|---:|---|---|---|---|
| Duc Auto ChatGPT | 0.3.0 | active | 23 | 126 | 2026-08-26 @ `00d1f99` — Pilot-14 live 3/3 job ảnh tham chiếu đầu-cuối + xác minh live idempotency 5/5 phép đo ([bằng chứng](workers/duc-auto-chatgpt/v0.1.0/Pilot-14_RefFeatureTest/evidence/idempotency-fix-live-proof.md)) | CÓ (60 commit) | **Vòng chat 0 cú bấm đã chạy trọn, nghiệm thu live 09/09.** Máy tự gửi prompt vào ChatGPT, đọc câu trả lời về, phân tích, gửi tiếp — không mở workbook, không chọn thư mục. Số ký tự ghi vào sổ **bằng** số đọc lại được từ máy chủ (**2.228 = 2.228**), với cửa sổ ChatGPT **để nguyên bị che** — tức đúng cách Đức vận hành 99% thời gian. **MVP KHÔNG còn bị chặn ở B-36:** [ADR-0051](workers/duc-auto-chatgpt/v0.1.0/docs/adr/0051-nhan-ten-chrome-dat-thay-vi-doi-ten-phai-khop.md) bỏ hẳn nhu cầu chọn thư mục, nên chuyện panel bắt chọn lại chỉ còn là bất tiện, không còn là cửa chặn. Con bug nặng nhất trong ngày là **báo-thành-công-giả**: job ghi 27 ký tự vào sổ rồi đóng dấu *đã xác minh*, trong khi câu trả lời thật dài 1.917 ký tự — Chrome không cấp khung hình cho tab bị che nên trang ChatGPT không **vẽ** chữ vào DOM. [ADR-0052](workers/duc-auto-chatgpt/v0.1.0/docs/adr/0052-tab-bi-che-thi-doc-lai-sau-f5-thay-vi-dung-han.md) chữa bằng đúng thói quen của Đức: hết giờ thì **F5 rồi đọc lại từ máy chủ**, và chỉ F5 sau khi đã thấy lượt hỏi của chính job nằm trong hội thoại — nên nó không bao giờ gửi lại prompt. Công cụ dọn rác nay **chỉ ra** thư mục con Chrome thật sự ghi vào (`Downloads/Phai sinh`) mà không nới bán kính xoá; đã xoá **81 tệp** chứng minh được là của gói, giữ nguyên 105 tệp chưa chứng minh được chủ. Suite **123/123**. **Còn nợ Đức một hành động:** mở một chat trong Project rồi để tab ở đó, để chạy nốt vế cuối của điều kiện đóng B-43. | [STATUS](workers/duc-auto-chatgpt/v0.1.0/STATUS.md) |
| Duc Auto Gemini | 0.1.0 | superseded | 0 | 21 | CHƯA KHAI KIỂM CHỨNG | KHÔNG ÁP DỤNG (chưa khai mốc commit) | Bản đã nghỉ. Mọi việc tiếp tục ở v0.2.0. Giữ lại vì Pilot-01 là bằng chứng vận hành, không được xoá. | [STATUS](workers/duc-auto-gemini/v0.1.0/STATUS.md) |
| Duc Auto Gemini (Platform) | 0.2.0 | active | 23 | 97 | 2026-09-07 @ `aa2c0b8` — Lớp nối nhiều hồ sơ Chrome, nghiệm thu CHỈ ĐỌC qua Bridge thật với 2 hồ sơ thật, 0 credit: đạt cả bốn bảo đảm (kể đúng hồ sơ kèm tên Đức đặt · quên --target thì TARGET_AMBIGUOUS chứ không tự chọn · đích lạ thì TARGET_NOT_CONNECTED chứ không rơi sang hồ sơ khác · served_by đúng đích ở mọi lượt). LƯU Ý phạm vi: đây KHÔNG phải nghiệm thu G-01 — lượt live bấm dừng vẫn CHƯA chạy, xem giới hạn 1 và 2 ([bằng chứng](workers/duc-auto-gemini/v0.2.0/evidence-multiprofile-nghiem-thu-20260907/README.md)) | CÓ (2 commit) | Nợ gói 9 -> 3 trong ngày 06/09. Đóng xong: dừng cứng khi extension bị mù (nhánh kia thêm lớp này sau khi một lượt live đốt sáu lượt tạo ảnh; gói này chưa có) - sổ cái thôi khai sai là đã ghi đè lên bằng chứng cũ (phép so đường dẫn cũ không bao giờ đúng được một lần nào) - nút CHAT ZOOM hỏi nhầm câu hỏi của runner nên tự xám trên 6/10 trang Gemini, Đức đã nghiệm thu - bốn lệnh Bridge còn nợ nay đủ cả bốn, gồm cả CLI - soát README bằng cách đối chiếu từng con số với code. Hai việc lớn nhất (nhiều ảnh một job, poll A/B) NGỦ ĐÔNG theo chốt của Đức vì Gemini chưa bao giờ làm thế; đã đặt bẫy để lúc nó xảy ra thì sổ cái tự khai. Suite 88 -> 94, thử phá 61/61 đều bị bắt. | [STATUS](workers/duc-auto-gemini/v0.2.0/STATUS.md) |
| Duc Auto GG Flow Video | 0.1.0 | building | 21 | 103 | CHƯA KHAI KIỂM CHỨNG | KHÔNG ÁP DỤNG (chưa khai mốc commit) | Đã đi hết đường trên trang Flow mới: ô nhập prompt, cụm nút, nút tạo, nhận diện video vừa sinh — tất cả đều đo được trên trang thật. Thêm một lớp chặn mới: Flow báo quá tải. Đây là loại trạng thái thứ ba, khác hẳn hai loại cũ, và là loại DUY NHẤT mà cứ thử đi thì tốn tiền thật, vì hai loại kia đều dừng trước khi gõ. Đức chốt dừng hẳn cả mẻ, không tự thử lại. Suite 101/101, thử phá 10/10. | [STATUS](workers/duc-auto-gg-flow-video/v0.1.0/STATUS.md) |
| Duc Scouter (seed v0.1) | 0.1.0 | paused | 0 | 15 | CHƯA KHAI KIỂM CHỨNG | KHÔNG ÁP DỤNG (chưa khai mốc commit) | TẠM DỪNG 08/09 — Đức chuyển sang ba gói duc-auto-*. Gói dừng ở chỗ SẠCH: sổ nợ còn đúng hai mục nhỏ, suite xanh, đột biến 0 sống sót, không việc gì dở dang. Ba lệnh bấm và gõ đã chạy trên một trang THẬT và đúng: ĐẠT 11/11 trên Chrome 152, kể cả ca phải cuộn hai chiều và ca hai nút chữ giống hệt nhau. Đường ghi có phanh (công tắc trong bảng bên, mặc định tắt, trần 200 lượt — Đức nâng từ 50 ngày 08/09). Khối phanh vừa được vá 08/09 theo chốt của Đức: hai lỗi chỉ nổ khi nhiều lượt chồng nhau — phanh khẩn bị bật lại, và trần 200 bị vượt — nay đã đóng, có phép ghim tái hiện được và đột biến giết được. Hai việc lớn còn lại: chọn trang thử THỨ HAI, và cả VÒNG tự cải tiến chưa ai chạy trọn một lần. | [STATUS](workers/duc-scouter/v0.1.0/STATUS.md) |
| HNX Fetch | 0.1.0 | active | 0 | 4 | 2026-09-08 @ `7cb9f76` — Chạy thật trọn vòng qua chính extension trong Chrome: ping trả đúng tên gói, bảng năng lực nhìn từ ngoài dây đúng bốn lệnh, scout.fetch lấy trang thật status 200, ngân sách trừ đúng, một lượt tai-ket-qua.mjs đầy đủ 0 hỏng ([bằng chứng](workers/hnx-fetch/v0.1.0/evidence/2026-09-08-chay-that-lan-dau.md)) | CÓ (6 commit) | Gói đã đứng vững: chạy thật trọn vòng trong Chrome, phanh khẩn bấm tay ăn thật, và từ 08/09 có tệp ghép cặp cùng máy chủ RIÊNG nên không còn phải chỉ đích danh extension nữa. Sổ nợ RỖNG. Việc còn lại chỉ là chạy mỗi ngày một lượt. | [STATUS](workers/hnx-fetch/v0.1.0/STATUS.md) |

## C · Từng extension làm được gì

Số lệnh và số file kiểm KHÔNG lặp lại ở đây — chúng là **máy đo**, xem bảng B.

### Duc Scouter (seed v0.1)

- **Làm được** — Bộ dò trang đa năng, không gắn với trang nào: đọc trang (cây DOM, cây trợ năng, ảnh chụp), bấm và gõ bằng chuột/bàn phím THẬT của trình duyệt (trang thấy isTrusted true), đi sang trang khác, gọi mạng, và tự nạp lại chính nó sau khi AI ghi mã mới.
- **KHÔNG làm được** — Không tự chạy. Mọi lệnh bấm và gõ đóng mặc định, chỉ tay Đức mở được, và mỗi lần mở có trần lượt. Không ghi tệp — việc đó ở máy chủ Bridge. Không biết trang nào cả: hiểu biết về một trang cụ thể phải nằm ở tầng adapter bên ngoài.
- **Dùng thế nào** — Nạp thư mục v0.1.0 vào Chrome, bật máy chủ Bridge của Scouter, chọn tệp ghép cặp trong bảng bên. Muốn nó bấm hay gõ thì bật công tắc Cho phép bấm và gõ — Chrome sẽ hiện dải băng đang gỡ lỗi trình duyệt trên tab nó cắm vào. Phanh khẩn: Ctrl+Shift+X.
- **Sổ tay vận hành** — [mở](workers/duc-scouter/v0.1.0/AGENTS.md)

### HNX Fetch

- **Làm được** — Lấy dữ liệu phái sinh HNX theo ngày: kết quả giao dịch nối vào một tệp CSV duy nhất, và báo cáo PDF tải về thư mục Drive. Gọi mạng bằng chính trình duyệt, nên vào được trang mà Node gọi thẳng thì hỏng chứng chỉ.
- **KHÔNG làm được** — Không bấm, không gõ, không đọc nội dung trang, không chụp màn hình, không mở tab. Không phải chưa làm — mà là KHÔNG CÓ ĐƯỜNG: manifest không khai debugger, không khai content_scripts, không khai scripting. Cần bấm nút trên một trang thì đó là việc của Duc Scouter.
- **Dùng thế nào** — Bật máy chủ Bridge CỦA GÓI NÀY (kéo thả tệp ghép cặp vào Chay-may-chu-HNX.cmd). Tệp ghép cặp dùng chung với Scouter được — chỉ MÁY CHỦ là phải đúng bản HNX, và đừng chạy hai máy chủ cùng một cổng. Mở bảng bên, chọn tệp, bật công tắc Cho phép lấy dữ liệu, rồi chạy hai lệnh hằng ngày. Chi tiết ở sổ tay.
- **Sổ tay vận hành** — [mở](workers/hnx-fetch/PROTOCOL.md)

## D · Sức khoẻ điều hướng [ĐO]

| Nợ | Số | Nghĩa là gì |
|---|---:|---|
| Đơn vị chưa khai STATUS | 0 | mỗi dòng là một câu hỏi AI sẽ phải hỏi Đức |
| Link chết trong file cổng | 0 | kiểm 10 link ở llms.txt và bảng B |
| Thư mục top-level chưa khai chủ | 0 | chưa khai trong khối `areas` của `.repo-structure.json` |
| Tài liệu quá hạn chưa rà | 1 | `status: active` mà quá `ttl_days` tính từ commit cuối chạm vào |

## Chú giải

- **[ĐO]**: Máy đếm trực tiếp từ repo, không qua tay người; đây là mức chắc chắn.
- **[KHAI]**: Do con người khai trong STATUS; lời khai kiểm chứng chỉ hợp lệ khi có liên kết bằng chứng.
