# Decisions — Duc Auto ChatGPT

> **NỘI DUNG ĐÃ CHUYỂN SANG ADR.** 45 quyết định trong file này đã được
> tách thành 45 file ADR riêng trong `docs/adr/` (phiên S5, 2026-09-02).
> File này KHÔNG bị xoá — nó là bản ghi có thật — nhưng từ nay nó là **mục lục**.
>
> **Vì sao chuyển:** một dòng trong bảng thì sửa được mà không ai biết, và "SUPERSEDES dòng
> bên dưới" là lời trỏ theo vị trí vật lý — thêm một dòng ở giữa là nó sai. Luật đầy đủ:
> [docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md](../../../docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md).
>
> **Nội dung gốc vẫn đọc được nguyên vẹn** trong lịch sử git:
> `git show 181c06e:workers/duc-auto-chatgpt/v0.1.0/decisions.md`. Việc tách chỉ đổi HÌNH DẠNG — mọi ô của bảng cũ đã được
> máy đối chiếu là xuất hiện nguyên văn trong ADR tương ứng, 0 sai lệch.

## Thêm một quyết định mới

Chép `docs/_TEMPLATE-adr.md` thành `docs/adr/NNNN-mo-ta-ngan-khong-dau.md`, đánh số tiếp
từ `0046`. **Đừng thêm dòng vào file này nữa** — nó là mục lục máy đọc được.

## Sổ cái — quyết định đang sống

> **Khối dưới đây do MÁY sinh** — `node scripts/rule-compile.mjs --sinh` đọc thẳng `docs/adr/`,
> nhóm theo `nhom:` ở frontmatter, chữ lấy từ **tiêu đề ADR**. Muốn đổi một dòng thì **sửa tiêu đề**
> của ADR đó, đừng sửa trong khối — lượt sinh sau nuốt mất.
> Bảng gõ tay cũ (kèm cột *Ai chốt* / *Ngày*) đọc được ở `git show HEAD~1:workers/duc-auto-chatgpt/v0.1.0/decisions.md`;
> hai cột ấy nay lấy từ `deciders:` và `date:` trong frontmatter của chính ADR. Chuyển sang máy sinh
> 09/09, [ADR-0030](../../../docs/adr/0030-rule-compiler-v1.md) — bảng tay đã mục một lần, nó dừng ở
> `0049` khi trên đĩa có 52.

<!-- KHOI MAY SINH: rule-compile --sinh. DUNG SUA TAY. -->
**an-toan-khi-chay**
- [ADR-0016](docs/adr/0016-completed-job-safe-complete-khong-bao-gio-tu-chay.md) Completed job (SAFE_COMPLETE) không bao giờ tự chạy lại khi Resume, kể cả khi…
- [ADR-0020](docs/adr/0020-mot-run-khoa-dung-mot-tab-va-mot-hoi-thoai.md) Một run khoá đúng MỘT tab và MỘT hội thoại
- [ADR-0021](docs/adr/0021-dia-chi-chua-biet-thi-hoan-phan-xet-khong-dung-cung.md) Địa chỉ chưa biết thì HOÃN phán xét, không dừng cứng
- [ADR-0024](docs/adr/0024-retry-halt-chi-dung-toan-batch-khi-captcha-het.md) Retry/Halt: chỉ dừng toàn batch khi CAPTCHA / hết quota / mất tab ChatGPT thật sự…
- [ADR-0025](docs/adr/0025-pause-chi-giu-hang-doi-o-ranh-gioi-an-toan-giua-2.md) Pause chỉ giữ hàng đợi ở ranh giới an toàn giữa 2 job, không bao giờ ngắt 1 job…
- [ADR-0034](docs/adr/0034-khong-doi-nhac-lai-run-la-cua-duc-ai-khong-tu-gui.md) Không đổi, nhắc lại: Run là của Đức; AI không tự gửi prompt tới ChatGPT; không làm…
- [ADR-0035](docs/adr/0035-exception-co-kiem-soat-cho-dong-run-la-cua-duc-o.md) EXCEPTION có kiểm soát cho dòng "Run là của Đức" ở trên, CHỈ trong phát triển
- [ADR-0037](docs/adr/0037-run-stop-di-vong-qua-khoa-run-active.md) run.stop ĐI VÒNG QUA khoá RUN_ACTIVE
- [ADR-0038](docs/adr/0038-co-stoprequested-duoc-xoa-tai-khoa-mo-run.md) Cờ stopRequested được xoá tại KHOÁ mở run (tryBeginRun), không phải giữa run() nữa
- [ADR-0042](docs/adr/0042-viec-that-khong-chay-qua-run-trial.md) Việc thật KHÔNG chạy qua run.trial
- [ADR-0047](docs/adr/0047-sau-khi-da-gui-thi-khong-gui-lai-tru-khi-doi-soat-khang-dinh-duoc.md) Sau khi đã gửi thì không gửi lại, trừ khi đối soát khẳng định được là lượt gửi đó không tạo ra kết quả nào
- [ADR-0050](docs/adr/0050-chay-het-job-tru-ba-loai-dung-han.md) Chạy hết job là mục tiêu; chỉ CAPTCHA, hết hạn mức và cảnh báo bất thường mới dừng hẳn
- [ADR-0052](docs/adr/0052-tab-bi-che-thi-doc-lai-sau-f5-thay-vi-dung-han.md) Tab bị che thì F5 rồi đọc lại, thay vì dừng hẳn

**bridge-va-thuc-thi**
- [ADR-0001](docs/adr/0001-bridge-dung-loopback-host-127-0-0-1-co-token-32.md) Bridge dùng loopback host 127.0.0.1 có token 32-byte, không dùng Native Messaging
- [ADR-0002](docs/adr/0002-supersedes-dong-ai-ngoai-chi-duoc-propose-ben-duoi.md) SUPERSEDES dòng "AI ngoài chỉ được propose" bên dưới, chỉ trong phạm vi Setup
- [ADR-0005](docs/adr/0005-queue-propose-duyet-tay-cua-duc-khong-bi-xoa-khi.md) queue.propose + duyệt tay của Đức KHÔNG bị xoá khi thêm các method Tầng 1 mới
- [ADR-0006](docs/adr/0006-side-panel-la-executor-duy-nhat.md) Side panel là executor duy nhất
- [ADR-0007](docs/adr/0007-run-start-run-pause-run-resume-khong-co-trong.md) run.start / run.pause / run.resume không có trong Bridge v1, trả METHOD_NOT_FOUND
- [ADR-0008](docs/adr/0008-ai-ngoai-chi-duoc-propose-de-xuat-vao-vung-cach-ly.md) AI ngoài chỉ được propose (đề xuất vào vùng cách ly)
- [ADR-0009](docs/adr/0009-host-la-node-esm-thuan-khong-phu-thuoc-npm.md) Host là Node ESM thuần, không phụ thuộc npm
- [ADR-0011](docs/adr/0011-installer-dung-icacls-thay-vi-powershell-set-acl-de.md) Installer dùng icacls thay vì PowerShell Set-Acl để khoá quyền thư mục cài đặt
- [ADR-0039](docs/adr/0039-nguyen-tac-thiet-ke-bridge.md) Nguyên tắc thiết kế Bridge
- [ADR-0041](docs/adr/0041-references-add-cho-gpt-hien-thuc-hoa-nguyen-tac-ai.md) references.add cho GPT: hiện thực hoá nguyên tắc "AI là bộ não, người dùng là cánh…
- [ADR-0046](docs/adr/0046-nhieu-phien-lam-viec-co-ten-trong-mot-profile-huong-a.md) Nhiều phiên làm việc có tên trong MỘT profile Chrome: hướng A, trần 3, cả hai chiều, ChatGPT trước
- [ADR-0048](docs/adr/0048-run-trial-thieu-workbook-la-loi-thu-lai-duoc.md) `run.trial` gọi khi chưa nạp workbook là lỗi agent ĐƯỢC thử lại

**chu-va-commit**
- [ADR-0026](docs/adr/0026-operator-facing-text-tieng-viet.md) Operator-facing text tiếng Việt
- [ADR-0044](docs/adr/0044-quick-prompt-mac-dinh-la-reasoning-bang-text-khong.md) Quick Prompt mặc định là "Reasoning bằng text", KHÔNG phải "Tạo ảnh"

**du-lieu-va-bang-chung**
- [ADR-0012](docs/adr/0012-job-id-chuyen-tu-chu-cai-p06-a-p06-b-sang-so-thu-tu.md) Job ID chuyển từ chữ cái (P06-A, P06-B...) sang số thứ tự (P08-...-01, P09-01...)
- [ADR-0013](docs/adr/0013-checkpoint-dat-ten-2-chu-so-v01-v02-thay-vi-3-chu.md) Checkpoint đặt tên 2 chữ số (v01, v02...) thay vì 3 chữ số (v001)
- [ADR-0014](docs/adr/0014-pilot-03-pilot-05-pilot-06-pilot-06b-khong-bao-gio.md) pilot-03/, pilot-05/, pilot-06/, pilot-06B/ không bao giờ bị sửa/regenerate
- [ADR-0015](docs/adr/0015-id-prompt-la-2-cot-bat-buoc-duy-nhat-tren-sheet-jobs.md) id/prompt là 2 cột bắt buộc duy nhất trên sheet jobs
- [ADR-0022](docs/adr/0022-write-outcome-chi-noi-dieu-quan-sat-duoc-khong-noi.md) write_outcome chỉ nói điều quan sát được, không nói điều được PHÉP làm
- [ADR-0023](docs/adr/0023-tach-bi-doi-ten-va-vao-dung-cho-thanh-hai-truong.md) Tách "bị đổi tên" và "vào đúng chỗ" thành HAI trường
- [ADR-0031](docs/adr/0031-cho-phep-gop-checkpoint-cho-phien-sua-cua-agent.md) Cho phép gộp checkpoint cho phiên sửa của agent (transaction / session.checkpoint)
- [ADR-0040](docs/adr/0040-pilot-kiem-tinh-nang-thi-tu-tao-khong-dem-viec-that.md) Pilot kiểm tính năng thì TỰ TẠO, không đem việc thật ra đo
- [ADR-0043](docs/adr/0043-supersedes-dong-chinh-sach-don-checkpoint.md) SUPERSEDES dòng "Chính sách dọn checkpoint
- [ADR-0045](docs/adr/0045-cau-tra-loi-text-dai-qua-32-767-ky-tu-thi-dung-va.md) Câu trả lời text dài quá 32.767 ký tự thì DỪNG và KHÔNG lưu gì cả
- [ADR-0049](docs/adr/0049-luu-ben-thu-muc-da-cap-quyen-thay-cho-mac-dinh-downloads.md) Lưu bền thư mục đã cấp quyền, thay cho mặc định Chrome Downloads
- [ADR-0051](docs/adr/0051-nhan-ten-chrome-dat-thay-vi-doi-ten-phai-khop.md) Nhận cái tên Chrome đặt, thay vì đòi tên phải khớp

**nhan-dien-anh**
- [ADR-0017](docs/adr/0017-xu-ly-poll-a-b-cua-chatgpt-which-image-do-you-like.md) Xử lý poll A/B của ChatGPT ("Which image do you like more?")
- [ADR-0018](docs/adr/0018-click-tra-loi-poll-o-readiness-gate-khong-click.md) Click trả lời poll ở readiness gate, KHÔNG click trong lúc dò ảnh
- [ADR-0019](docs/adr/0019-nhieu-anh-1-job-chi-chap-nhan-khi-cung-mot-luot.md) Nhiều ảnh 1 job chỉ chấp nhận khi CÙNG MỘT lượt assistant

**pham-vi-va-ky-luat**
- [ADR-0003](docs/adr/0003-ai-khong-the-tu-mo-file-xlsx-tu-o-dia-hay-tu-bind.md) AI không thể tự mở file .xlsx từ ổ đĩa hay tự bind folder output MỚI
- [ADR-0004](docs/adr/0004-bo-sung-dong-tren-phat-hien-tu-phien-gemini.md) BỔ SUNG dòng trên (phát hiện từ phiên Gemini)
- [ADR-0028](docs/adr/0028-supersedes-dong-khong-tu-y-commit-ngay-tren-trong.md) SUPERSEDES dòng "Không tự ý commit" ngay trên, trong phạm vi project này
- [ADR-0030](docs/adr/0030-sua-luat-8-agents-md-cho-phep-xay-harness-test-bang.md) Sửa luật 8 AGENTS.md: cho phép xây harness test bằng Chrome THẬT (Playwright/CDP,…
- [ADR-0033](docs/adr/0033-ai-duoc-commit-ke-ca-main-chi-tiet-4-dieu-kien.md) AI được commit kể cả main (chi tiết + 4 điều kiện
- [ADR-0036](docs/adr/0036-quy-trinh-bat-buoc-cross-check-doc-lap-truoc-khi.md) Quy trình bắt buộc: cross-check độc lập trước khi đưa Đức thao tác. Sau mỗi đợt…

**Chưa phân nhóm — khai `nhom:` ở frontmatter ADR**
- [ADR-0053](docs/adr/0053-loi-nha-cung-cap-la-mot-nguon-doi-soat-cau-chua-lay-tu-ma-cua-ta.md) Lời nhà cung cấp là một nguồn đối soát, và câu chữa lấy từ mã của ta
- [ADR-0054](docs/adr/0054-vong-reasoning-tu-noi-chi-chuyen-tiep-nguyen-van-khoi-copy.md) Vòng reasoning tự nối: được phép, và nó chỉ được chuyển tiếp NGUYÊN VĂN khối copy
<!-- HET KHOI MAY SINH -->

## 2026-09-02 — Port multi-profile Bridge (Đức chỉ thị trong chat)

Đức chốt 02/09: "triển khai áp dụng cho GPT và Gemini" theo thiết kế đã duyệt 28/08
(`drafts/BRIDGE-MULTIPROFILE-DESIGN-V1.md`, hướng A). Khối `instance` gắn vào message `auth`
CUỐI của bắt tay challenge — bắt tay `auth_challenge`/`auth_proof` GIỮ NGUYÊN, không nới gì.
WORKER_ID `duc-auto-chatgpt`. Không quyền Chrome mới.

## 2026-09-12 — ⛔ RANH GIỚI CỦA HỆ THỐNG: GỌI DÀY = BỊ CHẶN. Đức chốt.

**SỰ CỐ THẬT, đo được.** Profile `kaito`, sáng 12/09. Bộ chạy chuỗi gặp `RECEIVER_LOST` rồi
thử lại **đều 4 giây, không giãn, không trần**: ~**900 lượt gõ cửa trong 60 phút**. Ngay sau
đó ChatGPT trả `SECURITY_HARD_STOP` — *"yêu cầu CAPTCHA, xác minh con người, hoặc báo hoạt
động bất thường"*. Đức phải tự ngồi gõ CAPTCHA mới chạy lại được. Cả buổi chiều 12/09 mất vào
việc gỡ hậu quả, và chính lượt nện ấy còn che mất ba lỗi khác nằm dưới.

**Đức chốt, nguyên văn:** *"đọc vài trăm lần chỉ trong vài chục giây thì là spam rồi còn gì.
Hãy đọc và maintain từ tốn thôi."* Và: mọi lần dính CAPTCHA phải được **ghi lại và tô đậm như
một ranh giới của hệ thống**, để không bao giờ lặp lại.

**LUẬT.** Trang của nhà cung cấp là một hệ thống có **cơ chế phòng vệ chống bot**. Một chuỗi
gọi dày, đều, liên tục là tín hiệu bot — bất kể ta gọi nó là đọc, ping, hay nạp lại. Vượt
ngưỡng thì hậu quả **không nằm trong tay ta**: tài khoản bị thử thách, và không lệnh nào của
ta gỡ được. **Đây là ranh giới cứng, không phải một tham số hiệu năng để chỉnh cho nhanh.**

**BỐN THỨ ĐANG GIỮ RANH GIỚI — gỡ bất kỳ cái nào là mở lại đúng cửa đã làm hỏng:**

| # | cơ chế | ở đâu |
|---|---|---|
| ⑴ | **Sàn giữa hai lượt RPC** — không hai lượt nào sát nhau hơn `SAN_GIUA_HAI_LUOT_DOC_MS` (10s) | `goi()` — cửa duy nhất **mọi** lượt RPC đi qua: đọc · ping · nạp lại · gửi |
| ⑵ | **Giãn dần khi hỏng** — `nhipDocHong` 15s → trần 120s, **≤ ~34 lượt/giờ** (trước: ~900) | `nhipDocHong()` |
| ⑶ | **Nghe tiện ích khai dừng** — `state: HARD_STOP` thì DỪNG, không thử lại | `chanDung()` |
| ⑷ | **Trần vòng và trần phút** — vòng lặp không trần trên trang sinh tiền là lỗi không sửa lại được sau khi nó chạy | `TRAN_VONG` |

**VÌ SAO SÀN Ở `goi()` CHỨ KHÔNG Ở `doc()`:** `doc()` chỉ là một trong bốn đường RPC. Sàn ở đó
che được lượt đọc và để ping/nạp-lại/gửi bắn tự do — một vòng lặp lỗi ở đường ping dựng lại
đúng sự cố trên bằng một cửa khác. Chỗ hẹp phải là chỗ **tất cả** đi qua.

**KHI SỬA MÃ Ở GÓI NÀY, ĐỌC DÒNG NÀY TRƯỚC:** thấy một lượt chạy chậm và muốn hạ sàn, rút nhịp
giãn, hay bỏ một lượt chờ — **dừng lại**. Cái chậm ấy là giá của việc không bị chặn. Muốn nhanh
hơn thì tìm chỗ khác: nâng `deadline_ms` (đã làm 12/09: đọc 10s → 30s, cho tab nền trả lời kịp)
là nhanh hơn **mà không gọi dày hơn**. Hạ sàn thì không.

**Phép ghim canh:** `tests/chuoi-reasoning-smoke.mjs` khối ⓦ — đếm thật số lượt trong trần 60
phút và đỏ nếu vượt 60; đòi sàn nằm trong `goi()`; đòi chặn **đồng bộ** (`goi` có chỗ gọi không
`await`, nên `await ngu()` ở đó không chặn gì cả).
