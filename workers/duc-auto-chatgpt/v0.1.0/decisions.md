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

## Kiến trúc & Agent Bridge

| ADR | Quyết định | Ai chốt | Ngày |
|---|---|---|---|
| [0001](docs/adr/0001-bridge-dung-loopback-host-127-0-0-1-co-token-32.md) | Bridge dùng loopback host 127.0.0.1 có token 32-byte, không dùng Native Messaging | Claude (coordinator), sau 2 vòng nghiên cứu với Codex | không ghi lại |
| [0002](docs/adr/0002-supersedes-dong-ai-ngoai-chi-duoc-propose-ben-duoi.md) | SUPERSEDES dòng "AI ngoài chỉ được propose" bên dưới, chỉ trong phạm vi Setup | Đức | 2026-08-24 |
| [0003](docs/adr/0003-ai-khong-the-tu-mo-file-xlsx-tu-o-dia-hay-tu-bind.md) | AI không thể tự mở file .xlsx từ ổ đĩa hay tự bind folder output MỚI | Claude (coordinator), xác nhận kỹ thuật khi thiết kế Tầng 1 | không ghi lại |
| [0004](docs/adr/0004-bo-sung-dong-tren-phat-hien-tu-phien-gemini.md) | BỔ SUNG dòng trên (phát hiện từ phiên Gemini) | Đức (chỉ đạo trực tiếp, dẫn phát hiện từ phiên Gemini) | 2026-08-25 |
| [0005](docs/adr/0005-queue-propose-duyet-tay-cua-duc-khong-bi-xoa-khi.md) | queue.propose + duyệt tay của Đức KHÔNG bị xoá khi thêm các method Tầng 1 mới | Đức (ngầm định qua yêu cầu Tầng 1, xác nhận bởi Claude khi lên kế hoạch) | không ghi lại |
| [0006](docs/adr/0006-side-panel-la-executor-duy-nhat.md) | Side panel là executor duy nhất | Claude (coordinator) | không ghi lại |
| [0007](docs/adr/0007-run-start-run-pause-run-resume-khong-co-trong.md) | run.start / run.pause / run.resume không có trong Bridge v1, trả METHOD_NOT_FOUND | Claude (coordinator), theo yêu cầu an toàn của Đức | không ghi lại |
| [0008](docs/adr/0008-ai-ngoai-chi-duoc-propose-de-xuat-vao-vung-cach-ly.md) | AI ngoài chỉ được propose (đề xuất vào vùng cách ly) | Claude (coordinator) | không ghi lại |
| [0009](docs/adr/0009-host-la-node-esm-thuan-khong-phu-thuoc-npm.md) | Host là Node ESM thuần, không phụ thuộc npm | Claude (coordinator), đảo ngược đề xuất .NET ban đầu của Codex | không ghi lại |
| [0010](docs/adr/0010-api-externally-connectable-localhost-cu-bi-go-hoan.md) | API externally_connectable localhost cũ bị gỡ hoàn toàn ở WP-4, không giữ song song | Claude (coordinator) | không ghi lại |
| [0011](docs/adr/0011-installer-dung-icacls-thay-vi-powershell-set-acl-de.md) | Installer dùng icacls thay vì PowerShell Set-Acl để khoá quyền thư mục cài đặt | Claude, xác nhận bằng test thật trên máy Đức | không ghi lại |

## Quy ước dữ liệu / workbook

| ADR | Quyết định | Ai chốt | Ngày |
|---|---|---|---|
| [0012](docs/adr/0012-job-id-chuyen-tu-chu-cai-p06-a-p06-b-sang-so-thu-tu.md) | Job ID chuyển từ chữ cái (P06-A, P06-B...) sang số thứ tự (P08-...-01, P09-01...) | Đức | không ghi lại |
| [0013](docs/adr/0013-checkpoint-dat-ten-2-chu-so-v01-v02-thay-vi-3-chu.md) | Checkpoint đặt tên 2 chữ số (v01, v02...) thay vì 3 chữ số (v001) | Đức | không ghi lại |
| [0014](docs/adr/0014-pilot-03-pilot-05-pilot-06-pilot-06b-khong-bao-gio.md) | pilot-03/, pilot-05/, pilot-06/, pilot-06B/ không bao giờ bị sửa/regenerate | Claude, theo yêu cầu ngầm định của quy trình audit | không ghi lại |
| [0015](docs/adr/0015-id-prompt-la-2-cot-bat-buoc-duy-nhat-tren-sheet-jobs.md) | id/prompt là 2 cột bắt buộc duy nhất trên sheet jobs | Claude, sau khi Đức phản hồi workbook cũ "đòi hỏi quá nhiều field" | không ghi lại |
| [0016](docs/adr/0016-completed-job-safe-complete-khong-bao-gio-tu-chay.md) | Completed job (SAFE_COMPLETE) không bao giờ tự chạy lại khi Resume, kể cả khi… | Claude, xác nhận là chủ đích thiết kế, không phải bug | không ghi lại |
| [0017](docs/adr/0017-xu-ly-poll-a-b-cua-chatgpt-which-image-do-you-like.md) | Xử lý poll A/B của ChatGPT ("Which image do you like more?") | Đức (chính sách random 1/2) + bằng chứng sống 2026-08-25 | 2026-08-25 |
| [0018](docs/adr/0018-click-tra-loi-poll-o-readiness-gate-khong-click.md) | Click trả lời poll ở readiness gate, KHÔNG click trong lúc dò ảnh | Claude (khi implement), lệch có chủ đích so với brief | 2026-08-25 |
| [0019](docs/adr/0019-nhieu-anh-1-job-chi-chap-nhan-khi-cung-mot-luot.md) | Nhiều ảnh 1 job chỉ chấp nhận khi CÙNG MỘT lượt assistant | Claude (khi implement), theo khái niệm "1 job nhiều ảnh" của Đức | 2026-08-25 |
| [0020](docs/adr/0020-mot-run-khoa-dung-mot-tab-va-mot-hoi-thoai.md) | Một run khoá đúng MỘT tab và MỘT hội thoại | Claude, sau audit Antigravity 2 vòng (PASS) | 2026-08-26 |
| [0021](docs/adr/0021-dia-chi-chua-biet-thi-hoan-phan-xet-khong-dung-cung.md) | Địa chỉ chưa biết thì HOÃN phán xét, không dừng cứng | Claude, theo phát hiện của Antigravity | 2026-08-26 |
| [0022](docs/adr/0022-write-outcome-chi-noi-dieu-quan-sat-duoc-khong-noi.md) | write_outcome chỉ nói điều quan sát được, không nói điều được PHÉP làm | Claude, sau audit Codex 3 vòng (PASS) | 2026-08-26 |
| [0023](docs/adr/0023-tach-bi-doi-ten-va-vao-dung-cho-thanh-hai-truong.md) | Tách "bị đổi tên" và "vào đúng chỗ" thành HAI trường | Claude, theo phát hiện của Codex | 2026-08-26 |

## Vận hành / UI

| ADR | Quyết định | Ai chốt | Ngày |
|---|---|---|---|
| [0024](docs/adr/0024-retry-halt-chi-dung-toan-batch-khi-captcha-het.md) | Retry/Halt: chỉ dừng toàn batch khi CAPTCHA / hết quota / mất tab ChatGPT thật sự… | Đức | không ghi lại |
| [0025](docs/adr/0025-pause-chi-giu-hang-doi-o-ranh-gioi-an-toan-giua-2.md) | Pause chỉ giữ hàng đợi ở ranh giới an toàn giữa 2 job, không bao giờ ngắt 1 job… | Claude | không ghi lại |
| [0026](docs/adr/0026-operator-facing-text-tieng-viet.md) | Operator-facing text tiếng Việt | Đức | không ghi lại |
| [0027](docs/adr/0027-khong-tu-y-commit-luon-hoi-duc-truoc-ke-ca-khi-test.md) | Không tự ý commit — luôn hỏi Đức trước, kể cả khi test 100% pass | Đức (luật cố định) | không ghi lại |
| [0028](docs/adr/0028-supersedes-dong-khong-tu-y-commit-ngay-tren-trong.md) | SUPERSEDES dòng "Không tự ý commit" ngay trên, trong phạm vi project này | Đức | 2026-08-24 |

## Roadmap tự hành (chốt sau audit 2026-08-24)

| ADR | Quyết định | Ai chốt | Ngày |
|---|---|---|---|
| [0029](docs/adr/0029-commit-tang-1-sau-khi-claude-test-song-6-method-qua.md) | Commit Tầng 1 sau khi Claude test sống 6 method qua CLI (nghiệm thu bằng mắt của… | Đức | 2026-08-24 |
| [0030](docs/adr/0030-sua-luat-8-agents-md-cho-phep-xay-harness-test-bang.md) | Sửa luật 8 AGENTS.md: cho phép xây harness test bằng Chrome THẬT (Playwright/CDP,… | Đức | 2026-08-24 |
| [0031](docs/adr/0031-cho-phep-gop-checkpoint-cho-phien-sua-cua-agent.md) | Cho phép gộp checkpoint cho phiên sửa của agent (transaction / session.checkpoint) | Đức | 2026-08-24 |
| [0032](docs/adr/0032-chinh-sach-don-checkpoint.md) | Chính sách dọn checkpoint | Đức | 2026-08-24 |
| [0033](docs/adr/0033-ai-duoc-commit-ke-ca-main-chi-tiet-4-dieu-kien.md) | AI được commit kể cả main (chi tiết + 4 điều kiện | Đức | 2026-08-24 |
| [0034](docs/adr/0034-khong-doi-nhac-lai-run-la-cua-duc-ai-khong-tu-gui.md) | Không đổi, nhắc lại: Run là của Đức; AI không tự gửi prompt tới ChatGPT; không làm… | Đức (tái xác nhận) | 2026-08-24 |
| [0035](docs/adr/0035-exception-co-kiem-soat-cho-dong-run-la-cua-duc-o.md) | EXCEPTION có kiểm soát cho dòng "Run là của Đức" ở trên, CHỈ trong phát triển | Đức (chốt trong phiên Gemini, mở rộng sang package này cùng ngày) | 2026-08-25 |
| [0036](docs/adr/0036-quy-trinh-bat-buoc-cross-check-doc-lap-truoc-khi.md) | Quy trình bắt buộc: cross-check độc lập trước khi đưa Đức thao tác. Sau mỗi đợt… | Đức | 2026-08-24 |
| [0037](docs/adr/0037-run-stop-di-vong-qua-khoa-run-active.md) | run.stop ĐI VÒNG QUA khoá RUN_ACTIVE | Claude (theo gói việc drafts/RUN-STOP-CHAT-RELOAD-HANDOFF.md, Đức chốt hướng 2026-08-26) | 2026-08-26 |
| [0038](docs/adr/0038-co-stoprequested-duoc-xoa-tai-khoa-mo-run.md) | Cờ stopRequested được xoá tại KHOÁ mở run (tryBeginRun), không phải giữa run() nữa | Claude | 2026-08-26 |
| [0039](docs/adr/0039-nguyen-tac-thiet-ke-bridge.md) | Nguyên tắc thiết kế Bridge | Đức | 2026-08-24 |
| [0040](docs/adr/0040-pilot-kiem-tinh-nang-thi-tu-tao-khong-dem-viec-that.md) | Pilot kiểm tính năng thì TỰ TẠO, không đem việc thật ra đo | Đức | 2026-08-26 |
| [0041](docs/adr/0041-references-add-cho-gpt-hien-thuc-hoa-nguyen-tac-ai.md) | references.add cho GPT: hiện thực hoá nguyên tắc "AI là bộ não, người dùng là cánh… | Đức | 2026-08-26 |
| [0042](docs/adr/0042-viec-that-khong-chay-qua-run-trial.md) | Việc thật KHÔNG chạy qua run.trial | Đức quyết sau | 2026-08-26 |
| [0043](docs/adr/0043-supersedes-dong-chinh-sach-don-checkpoint.md) | SUPERSEDES dòng "Chính sách dọn checkpoint | Đức | 2026-08-28 |
| [0044](docs/adr/0044-quick-prompt-mac-dinh-la-reasoning-bang-text-khong.md) | Quick Prompt mặc định là "Reasoning bằng text", KHÔNG phải "Tạo ảnh" | Đức | 2026-08-28 |
| [0045](docs/adr/0045-cau-tra-loi-text-dai-qua-32-767-ky-tu-thi-dung-va.md) | Câu trả lời text dài quá 32.767 ký tự thì DỪNG và KHÔNG lưu gì cả | Đức | 2026-08-28 |
| [0046](docs/adr/0046-nhieu-phien-lam-viec-co-ten-trong-mot-profile-huong-a.md) | Nhiều phiên làm việc có tên trong một profile: hướng A, trần 3, cả hai chiều, ChatGPT trước | Đức | 2026-09-03 |

## 2026-09-02 — Port multi-profile Bridge (Đức chỉ thị trong chat)

Đức chốt 02/09: "triển khai áp dụng cho GPT và Gemini" theo thiết kế đã duyệt 28/08
(`drafts/BRIDGE-MULTIPROFILE-DESIGN-V1.md`, hướng A). Khối `instance` gắn vào message `auth`
CUỐI của bắt tay challenge — bắt tay `auth_challenge`/`auth_proof` GIỮ NGUYÊN, không nới gì.
WORKER_ID `duc-auto-chatgpt`. Không quyền Chrome mới.
