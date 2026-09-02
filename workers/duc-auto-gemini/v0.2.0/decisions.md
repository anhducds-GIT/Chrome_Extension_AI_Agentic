# Decisions — Duc Auto Gemini

> **NỘI DUNG ĐÃ CHUYỂN SANG ADR.** 67 quyết định trong file này đã được
> tách thành 67 file ADR riêng trong `docs/adr/` (phiên S5, 2026-09-02).
> File này KHÔNG bị xoá — nó là bản ghi có thật — nhưng từ nay nó là **mục lục**.
>
> **Vì sao chuyển:** một dòng trong bảng thì sửa được mà không ai biết, và "SUPERSEDES dòng
> bên dưới" là lời trỏ theo vị trí vật lý — thêm một dòng ở giữa là nó sai. Luật đầy đủ:
> [docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md](../../../docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md).
>
> **Nội dung gốc vẫn đọc được nguyên vẹn** trong lịch sử git:
> `git show 181c06e:workers/duc-auto-gemini/v0.2.0/decisions.md`. Việc tách chỉ đổi HÌNH DẠNG — mọi ô của bảng cũ đã được
> máy đối chiếu là xuất hiện nguyên văn trong ADR tương ứng, 0 sai lệch.

## Thêm một quyết định mới

Chép `docs/_TEMPLATE-adr.md` thành `docs/adr/NNNN-mo-ta-ngan-khong-dau.md`, đánh số tiếp
từ `0068`. **Đừng thêm dòng vào file này nữa** — nó là mục lục máy đọc được.

## Kiến trúc & Agent Bridge

| ADR | Quyết định | Ai chốt | Ngày |
|---|---|---|---|
| [0001](docs/adr/0001-bridge-dung-loopback-host-127-0-0-1-co-token-32.md) | Bridge dùng loopback host 127.0.0.1 có token 32-byte, không dùng Native Messaging | Claude (coordinator), sau 2 vòng nghiên cứu với Codex | không ghi lại |
| [0002](docs/adr/0002-supersedes-dong-ai-ngoai-chi-duoc-propose-ben-duoi.md) | SUPERSEDES dòng "AI ngoài chỉ được propose" bên dưới, chỉ trong phạm vi Setup | Đức | 2026-08-24 |
| [0003](docs/adr/0003-ai-khong-the-tu-mo-file-xlsx-tu-o-dia-hay-tu-bind.md) | AI không thể tự mở file .xlsx từ ổ đĩa hay tự bind folder output MỚI | Claude (coordinator), xác nhận kỹ thuật khi thiết kế Tầng 1 | không ghi lại |
| [0004](docs/adr/0004-queue-propose-duyet-tay-cua-duc-khong-bi-xoa-khi.md) | queue.propose + duyệt tay của Đức KHÔNG bị xoá khi thêm các method Tầng 1 mới | Đức (ngầm định qua yêu cầu Tầng 1, xác nhận bởi Claude khi lên kế hoạch) | không ghi lại |
| [0005](docs/adr/0005-side-panel-la-executor-duy-nhat.md) | Side panel là executor duy nhất | Claude (coordinator) | không ghi lại |
| [0006](docs/adr/0006-run-start-run-pause-run-resume-khong-co-trong.md) | run.start / run.pause / run.resume không có trong Bridge v1, trả METHOD_NOT_FOUND | Claude (coordinator), theo yêu cầu an toàn của Đức | không ghi lại |
| [0007](docs/adr/0007-ai-ngoai-chi-duoc-propose-de-xuat-vao-vung-cach-ly.md) | AI ngoài chỉ được propose (đề xuất vào vùng cách ly) | Claude (coordinator) | không ghi lại |
| [0008](docs/adr/0008-host-la-node-esm-thuan-khong-phu-thuoc-npm.md) | Host là Node ESM thuần, không phụ thuộc npm | Claude (coordinator), đảo ngược đề xuất .NET ban đầu của Codex | không ghi lại |
| [0009](docs/adr/0009-api-externally-connectable-localhost-cu-bi-go-hoan.md) | API externally_connectable localhost cũ bị gỡ hoàn toàn ở WP-4, không giữ song song | Claude (coordinator) | không ghi lại |
| [0010](docs/adr/0010-installer-dung-icacls-thay-vi-powershell-set-acl-de.md) | Installer dùng icacls thay vì PowerShell Set-Acl để khoá quyền thư mục cài đặt | Claude, xác nhận bằng test thật trên máy Đức | không ghi lại |

## Quy ước dữ liệu / workbook

| ADR | Quyết định | Ai chốt | Ngày |
|---|---|---|---|
| [0011](docs/adr/0011-job-id-chuyen-tu-chu-cai-p06-a-p06-b-sang-so-thu-tu.md) | Job ID chuyển từ chữ cái (P06-A, P06-B...) sang số thứ tự (P08-...-01, P09-01...) | Đức | không ghi lại |
| [0012](docs/adr/0012-checkpoint-dat-ten-2-chu-so-v01-v02-thay-vi-3-chu.md) | Checkpoint đặt tên 2 chữ số (v01, v02...) thay vì 3 chữ số (v001) | Đức | không ghi lại |
| [0013](docs/adr/0013-pilot-03-pilot-05-pilot-06-pilot-06b-khong-bao-gio.md) | pilot-03/, pilot-05/, pilot-06/, pilot-06B/ không bao giờ bị sửa/regenerate | Claude, theo yêu cầu ngầm định của quy trình audit | không ghi lại |
| [0014](docs/adr/0014-id-prompt-la-2-cot-bat-buoc-duy-nhat-tren-sheet-jobs.md) | id/prompt là 2 cột bắt buộc duy nhất trên sheet jobs | Claude, sau khi Đức phản hồi workbook cũ "đòi hỏi quá nhiều field" | không ghi lại |
| [0015](docs/adr/0015-completed-job-safe-complete-khong-bao-gio-tu-chay.md) | Completed job (SAFE_COMPLETE) không bao giờ tự chạy lại khi Resume, kể cả khi… | Claude, xác nhận là chủ đích thiết kế, không phải bug | không ghi lại |

## Vận hành / UI

| ADR | Quyết định | Ai chốt | Ngày |
|---|---|---|---|
| [0016](docs/adr/0016-retry-halt-chi-dung-toan-batch-khi-captcha-het.md) | Retry/Halt: chỉ dừng toàn batch khi CAPTCHA / hết quota / mất tab ChatGPT thật sự… | Đức | không ghi lại |
| [0017](docs/adr/0017-pause-chi-giu-hang-doi-o-ranh-gioi-an-toan-giua-2.md) | Pause chỉ giữ hàng đợi ở ranh giới an toàn giữa 2 job, không bao giờ ngắt 1 job… | Claude | không ghi lại |
| [0018](docs/adr/0018-operator-facing-text-tieng-viet.md) | Operator-facing text tiếng Việt | Đức | không ghi lại |
| [0019](docs/adr/0019-khong-tu-y-commit-luon-hoi-duc-truoc-ke-ca-khi-test.md) | Không tự ý commit — luôn hỏi Đức trước, kể cả khi test 100% pass | Đức (luật cố định) | không ghi lại |
| [0020](docs/adr/0020-supersedes-dong-khong-tu-y-commit-ngay-tren-trong.md) | SUPERSEDES dòng "Không tự ý commit" ngay trên, trong phạm vi project này | Đức | 2026-08-24 |

## Roadmap tự hành (chốt sau audit 2026-08-24)

| ADR | Quyết định | Ai chốt | Ngày |
|---|---|---|---|
| [0021](docs/adr/0021-commit-tang-1-sau-khi-claude-test-song-6-method-qua.md) | Commit Tầng 1 sau khi Claude test sống 6 method qua CLI (nghiệm thu bằng mắt của… | Đức | 2026-08-24 |
| [0022](docs/adr/0022-sua-luat-8-agents-md-cho-phep-xay-harness-test-bang.md) | Sửa luật 8 AGENTS.md: cho phép xây harness test bằng Chrome THẬT (Playwright/CDP,… | Đức | 2026-08-24 |
| [0023](docs/adr/0023-cho-phep-gop-checkpoint-cho-phien-sua-cua-agent.md) | Cho phép gộp checkpoint cho phiên sửa của agent (transaction / session.checkpoint) | Đức | 2026-08-24 |
| [0024](docs/adr/0024-chinh-sach-don-checkpoint.md) | Chính sách dọn checkpoint | Đức | 2026-08-24 |
| [0025](docs/adr/0025-ai-duoc-commit-ke-ca-main-chi-tiet-4-dieu-kien.md) | AI được commit kể cả main (chi tiết + 4 điều kiện | Đức | 2026-08-24 |
| [0026](docs/adr/0026-khong-doi-nhac-lai-run-la-cua-duc-ai-khong-tu-gui.md) | Không đổi, nhắc lại: Run là của Đức; AI không tự gửi prompt tới ChatGPT; không làm… | Đức (tái xác nhận) | 2026-08-24 |

## 2026-08-25 — Development trial-run exception (owner: Đức)

| ADR | Quyết định | Ai chốt | Ngày |
|---|---|---|---|
| [0027](docs/adr/0027-ai-duoc-tu-khoi-dong-trial-run-qua-bridge-trong.md) | AI được TỰ khởi động "trial run" qua Bridge trong giai đoạn phát triển, qua một… | Đức (đề xuất) + Claude (phân tích, đồng thuận với 4 hàng rào) | 2026-08-25 |

## 2026-08-25 — Điều chỉnh trần tần suất trial (owner: Đức)

| ADR | Quyết định | Ai chốt | Ngày |
|---|---|---|---|
| [0028](docs/adr/0028-bo-tran-6-trial-gio-thay-bang-hai-trial-lien-tiep.md) | Bỏ trần "≤6 trial/giờ"; thay bằng: hai trial liên tiếp phải cách nhau tối thiểu 5… | Đức | 2026-08-25 |

## 2026-08-25 — Cho phép bắt đầu run từ trang hội thoại /app (owner: Đức)

| ADR | Quyết định | Ai chốt | Ngày |
|---|---|---|---|
| [0029](docs/adr/0029-run-duoc-phep-bat-dau-tu-ca-gemini-google-com.md) | Run được phép BẮT ĐẦU từ cả gemini.google.com/images lẫn… | Đức | 2026-08-25 |

## 2026-08-25 — Workflow điều khiển từ chat: owner chỉ còn "tạo thư mục" và "bấm Run" (owner: Đức)

| ADR | Quyết định | Ai chốt | Ngày |
|---|---|---|---|
| [0030](docs/adr/0030-toan-bo-khau-chuan-bi-phien-chay-chuyen-sang-chat.md) | Toàn bộ khâu chuẩn bị phiên chạy chuyển sang chat | Đức | 2026-08-25 |

## 2026-08-25 — Điều chỉnh trần trial: một trial = một chuỗi liên tục ≤10 job (owner: Đức)

| ADR | Quyết định | Ai chốt | Ngày |
|---|---|---|---|
| [0031](docs/adr/0031-bo-tran-2-job-trial-mot-trial-chay-lien-tuc-ca.md) | Bỏ trần "≤2 job/trial"; một trial chạy LIÊN TỤC cả chuỗi ảnh (trần cứng mới: 10… | Đức | 2026-08-25 |

## 2026-08-25 (chiều) — Nâng trần chuỗi trial lên 30 job + AI chạy batch sản xuất thay owner (owner: Đức)

| ADR | Quyết định | Ai chốt | Ngày |
|---|---|---|---|
| [0032](docs/adr/0032-tran-chuoi-trial-10-30-job-10-job-van-la-it.md) | Trần chuỗi trial 10 → 30 job ("10 job vẫn là ít") | Đức | 2026-08-25 |

## 2026-08-26 — Bộ luật đa-AI: luật tự nạp, quy trình mở khi cần (owner: Đức)

| ADR | Quyết định | Ai chốt | Ngày |
|---|---|---|---|
| [0033](docs/adr/0033-dung-bo-luat-chung-cho-ca-claude-codex-antigravity.md) | Dựng bộ luật chung cho cả Claude + Codex + Antigravity trước, rồi mới làm tiếp… | Đức | 2026-08-26 |
| [0034](docs/adr/0034-kien-truc-3-tang-luat-thi-tu-nap-agents-md-goc-mot.md) | Kiến trúc 3 tầng: luật thì tự nạp (AGENTS.md gốc — một bản, ba cửa vào), quy trình… | Đức | 2026-08-26 |
| [0035](docs/adr/0035-luat-nao-khong-kiem-duoc-bang-may-thi-coi-nhu-khong.md) | Luật nào không kiểm được bằng máy thì coi như không có | Đức | 2026-08-26 |
| [0036](docs/adr/0036-antigravity-luon-dan-cau-mo-man-mot-dong-doc-agents.md) | Antigravity: luôn dán câu mở màn một dòng — *"Đọc AGENTS.md ở gốc repo trước khi… | Đức + Claude đề xuất | 2026-08-26 |
| [0037](docs/adr/0037-codex-khong-can-cau-mo-man-doc-agents-md-tu-dong-la.md) | Codex: không cần câu mở màn (đọc AGENTS.md tự động là chắc chắn). Claude: đọc qua… | Claude | 2026-08-26 |

## 2026-08-26 — Ảnh mang "địa chỉ tạm" (blob): CHỜ đổi sang link thật, không nới lớp chấm attribution (owner: Đức)

| ADR | Quyết định | Ai chốt | Ngày |
|---|---|---|---|
| [0038](docs/adr/0038-gap-anh-mang-dia-chi-tam-blob-thi-cho-gemini-tu-doi.md) | Gặp ảnh mang địa chỉ tạm (blob:) thì chờ Gemini tự đổi sang link thật… | Đức | 2026-08-26 |
| [0039](docs/adr/0039-phep-cho-co-han-muc-30-giay-blobswapwaitms-het-han.md) | Phép chờ có hạn mức 30 giây (blobSwapWaitMs), hết hạn thì kết luận trung thực. | Claude đề xuất, trong phạm vi quyết định trên | 2026-08-26 |
| [0040](docs/adr/0040-moi-lan-cho-deu-ghi-vao-so-cai.md) | Mọi lần chờ đều ghi vào sổ cái | Claude | 2026-08-26 |

## 2026-08-26 (vòng 2) — Đưa ảnh vào tầm mắt rồi mới đo, KHÔNG nới lớp kiểm (owner: Đức)

| ADR | Quyết định | Ai chốt | Ngày |
|---|---|---|---|
| [0041](docs/adr/0041-thao-phep-cho-blob-doi-sang-lh3-da-chot-o-vong-1.md) | Tháo phép chờ "blob đổi sang lh3" đã chốt ở vòng 1 cùng ngày. | Đức (vòng 1) → số liệu bác bỏ → Đức (vòng 2) | 2026-08-26 |
| [0042](docs/adr/0042-nguyen-nhan-that-anh-cua-luot-tra-loi-moi-nam-duoi.md) | Nguyên nhân thật: ảnh của lượt trả lời mới nằm dưới đáy hội thoại dài, ngoài… | Đức | 2026-08-26 |
| [0043](docs/adr/0043-chi-cuon-khi-anh-dang-khong-hien-ra-va-chi-khi-da.md) | Chỉ cuộn khi ảnh đang KHÔNG hiện ra, và chỉ khi đã hết trạng thái đang-sinh-ảnh. | Claude | 2026-08-26 |

## 2026-08-26 (vòng 3) — Hạ ngưỡng kích thước ảnh sinh ra: 200 → 150 (owner: Đức)

| ADR | Quyết định | Ai chốt | Ngày |
|---|---|---|---|
| [0044](docs/adr/0044-generatedimageminsize-200-150-phep-kiem-giu-nguyen.md) | generatedImageMinSize: 200 → 150. Phép kiểm giữ nguyên hình dạng (vẫn đòi cả hai… | Đức | 2026-08-26 |
| [0045](docs/adr/0045-ghi-nhan-bug-nay-da-nam-do-tu-dau-bi-che-boi.md) | Ghi nhận: bug này đã nằm đó từ đầu, bị che bởi remoteVerifiedResult (lớp khoan… | Claude | 2026-08-26 |
| [0046](docs/adr/0046-hai-phuong-an-da-thu-va-bi-bang-chung-bac-bo-trong.md) | Hai phương án đã thử và bị bằng chứng bác bỏ trong cùng ngày | Claude | 2026-08-26 |

## 2026-08-26 (chiều) — Vá lỗi cổng kiểm đọc sai đường dẫn tiếng Việt (owner: Đức)

| ADR | Quyết định | Ai chốt | Ngày |
|---|---|---|---|
| [0047](docs/adr/0047-cho-sua-file-goc-scripts-session-check-mjs-scripts.md) | Cho sửa file gốc scripts/session-check.mjs + scripts/safe-push.mjs | Đức | 2026-08-26 |
| [0048](docs/adr/0048-ghim-bang-test-that-tests-session-check-utf8-paths.md) | Ghim bằng test thật tests/session-check-utf8-paths.mjs, nối vào npm test | Claude | 2026-08-26 |
| [0049](docs/adr/0049-ghi-nhan-loai-loi-do-oan-nguy-hiem-ngang-do-that.md) | Ghi nhận loại lỗi: đỏ oan nguy hiểm ngang đỏ thật. Một cổng báo đỏ sai tạo động cơ… | Claude | 2026-08-26 |

## 2026-08-26 (chiều) — Port `run.stop` + `chat.reload` từ worker ChatGPT sang Gemini (owner: Đức)

| ADR | Quyết định | Ai chốt | Ngày |
|---|---|---|---|
| [0050](docs/adr/0050-dua-hai-lenh-dieu-khien-cua-extension-chatgpt-sang.md) | Đưa hai lệnh điều khiển của extension ChatGPT sang extension Gemini | Đức | 2026-08-26 |
| [0051](docs/adr/0051-giu-nguyen-bat-doi-xung-co-y-cua-thiet-ke-goc.md) | Giữ nguyên bất đối xứng cố ý của thiết kế gốc | Claude, theo thiết kế gốc | 2026-08-26 |
| [0052](docs/adr/0052-khong-chep-nguyen-xi-worker-gemini-khong-co.md) | KHÔNG chép nguyên xi. Worker Gemini không có createQueueRunLock như ChatGPT, nên… | Claude | 2026-08-26 |
| [0053](docs/adr/0053-va-them-mot-lo-gemini-co-ma-chatgpt-khong-co.md) | Vá thêm một lỗ Gemini có mà ChatGPT không có | Claude | 2026-08-26 |
| [0054](docs/adr/0054-gemini-co-san-dung-cai-bay-phien-chatgpt-da-sap.md) | Gemini có sẵn đúng cái bẫy phiên ChatGPT đã sập | Claude | 2026-08-26 |
| [0055](docs/adr/0055-ghim-bang-tests-bridge-run-stop-chat-reload-smoke.md) | Ghim bằng tests/bridge-run-stop-chat-reload-smoke.mjs (16 phép kiểm), đã phá thử 4… | Claude | 2026-08-26 |

## 2026-08-26 (tối) — Trial live cặp stop/reload: bắt được một lời nhắn nói dối (owner: Đức yêu cầu chạy trial)

| ADR | Quyết định | Ai chốt | Ngày |
|---|---|---|---|
| [0056](docs/adr/0056-chay-trial-live-ngay-sau-khi-code-xong-thay-vi-tin.md) | Chạy trial live ngay sau khi code xong, thay vì tin suite xanh là đủ. | Đức | 2026-08-26 |
| [0057](docs/adr/0057-sua-loi-nhan-cua-run-stop-luc-pre-submit.md) | Sửa lời nhắn của run.stop lúc PRE_SUBMIT | Claude | 2026-08-26 |
| [0058](docs/adr/0058-khong-doi-thoi-diem-co-dung-an-de-job-dang-chay.md) | KHÔNG đổi thời điểm cờ dừng ăn (để job đang chạy không kịp gửi). | Claude | 2026-08-26 |
| [0059](docs/adr/0059-loi-nay-co-o-ca-worker-chatgpt-toi-port-nguyen-van.md) | Lỗi này có ở CẢ worker ChatGPT (tôi port nguyên văn lời nhắn từ đó sang) | Claude | 2026-08-26 |

## 2026-08-27 — G-01: sửa hành vi "dừng nhận trước lúc gửi ⇒ không gửi" (owner: Đức, Go trong chat)

| ADR | Quyết định | Ai chốt | Ngày |
|---|---|---|---|
| [0060](docs/adr/0060-duyet-hop-dong-g-01-stop-nhan-truoc-thoi-diem-gui.md) | Duyệt hợp đồng G-01: Stop nhận trước thời điểm gửi thật → attempt đó không được… | Đức (Go trong chat 27/08, sau khi GPT + brief đã duyệt trước đó) | 2026-08-27 |
| [0061](docs/adr/0061-huong-b-refined-huy-theo-attempt-khong-phai-a-round.md) | Hướng B-refined — huỷ theo attempt, không phải A (round-trip hỏi ngược) hay B… | Đức duyệt hướng; Claude thiết kế chi tiết | 2026-08-27 |
| [0062](docs/adr/0062-root-cause-phai-chung-minh-bang-test-tai-hien-truoc.md) | Root cause phải chứng minh bằng test tái hiện trước khi vá | Claude, theo brief | 2026-08-27 |
| [0063](docs/adr/0063-va-them-phia-runner-run-kiem-lai-state.md) | Vá thêm phía runner: run() kiểm lại state.stopRequested ngay sau await gateNextJob… | Claude | 2026-08-27 |
| [0064](docs/adr/0064-bai-hoc-mutation-moi-ghi-de-khong-lap.md) | Bài học mutation mới, ghi để không lặp | Claude | 2026-08-27 |
| [0065](docs/adr/0065-g-01-chua-dong-chi-dong-sau-trial-live-duc-da-duyet.md) | G-01 chưa đóng: chỉ đóng sau trial live (Đức đã duyệt, điều kiện test tĩnh PASS —… | Đức (điều kiện trial đặt từ brief) | 2026-08-27 |
| [0066](docs/adr/0066-cung-loi-ben-nhanh-chatgpt-ghi-thanh-b-22-doc.md) | Cùng lỗi bên nhánh ChatGPT ghi thành B-22 ([ĐỌC] content.js:703), KHÔNG sửa hộ… | Claude, theo brief §5 | 2026-08-27 |
| [0067](docs/adr/0067-audit-codex-vong-1-fail-3-phat-hien-1-high-huy-lech.md) | Audit Codex vòng 1: FAIL, 3 phát hiện. (1) HIGH "huỷ lệch danh tính giết attempt… | Claude xử lý; hành vi fail-closed giữ theo hợp đồng mục 6 | 2026-08-27 |

## 2026-09-02 — Port multi-profile Bridge (Đức chỉ thị trong chat)

Đức chốt 02/09: "triển khai áp dụng cho GPT và Gemini" theo đúng thiết kế đã duyệt 28/08
(`drafts/BRIDGE-MULTIPROFILE-DESIGN-V1.md`, hướng A — đổi bề mặt auth đã được duyệt từ 28/08).
Khối `instance` trong `auth` (WORKER_ID `duc-auto-gemini`), host giữ nhiều kết nối fail-closed,
`bridge.sessions` + `--target` + `served_by`, ô tên hồ sơ trong panel. Không quyền Chrome mới.
