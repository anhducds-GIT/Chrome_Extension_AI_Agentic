---
kind: brief
status: parked
ttl_days: 90
---

# BRIEF `ASSISTANT-PROMOTE-01` — đưa gói Assistant vào bộ khung

> ## ⛔ HOÃN — ĐỪNG THỰC HIỆN BRIEF NÀY (Đức chốt 2026-09-04, sau khi brief đã viết)
>
> Điều kiện mở đã **đổi**. Trước: "chạy ổn ở repo Extension trước". Nay chặt hơn: phải qua
> một **giai đoạn vận hành liền mạch** — mốc `ASSISTANT-V0.1 PILOT`, xem
> [`../protocols/ASSISTANT-V0.1.md`](../protocols/ASSISTANT-V0.1.md).
>
> Vì sao đổi: bốn năng lực lõi mới được chứng minh **từng cái một**. Chưa cái nào chạy qua
> nhiều vòng việc thật liên tiếp, nên chưa biết gói này có **trơn** hay không — mà trơn mới
> là thứ quyết định nó đáng nhân bản sang repo khác. Nhân bản một thứ chưa trơn là nhân bản
> cả chỗ vướng của nó, vào những repo mà không ai ở đó biết vì sao nó vướng.
>
> **Mở lại khi và chỉ khi** pilot đạt cả ba: không lần nào trượt vai · không sai lệch trạng
> thái nào **Đức** phải là người bắt · Assistant chạy ổn qua nhiều vòng liên tiếp.
>
> Nội dung kỹ thuật dưới đây **vẫn còn giá trị** — giữ nguyên, không viết lại. Riêng một chỗ
> đã biết là brief đoán sai, executor `claude-exec-promote` sửa đúng ngày 04/09: mục 2.1 bảo
> lấy tên vùng dự phòng từ `.repo-structure.json`, nhưng `stewardOf()` **không bao giờ trả
> rỗng** — nên `|| "_root"` là **mã chết**, không phải bug, và cách đúng là **xoá hai chỗ đó**
> chứ không thêm một trường cấu hình (thêm là đẻ ra nguồn sự thật thứ hai). Ai mở lại brief
> này thì đọc kỹ ghi chú đó trước.


> **Cho executor.** Việc này làm ở **repo KHÁC**: `C:\WORKING ZONE\Ark_Repo_Harness`.
> Đề bài đã chốt (Đức, 2026-09-04). Phiên điều phối đứng ngoài triển khai — luật `ROLE-DRIFT-01`.
> Brief nằm ở repo Extension vì đây là nơi gói Assistant được xây và chứng minh.

## 1. Bối cảnh — vì sao promote bây giờ

Trong ngày 04/09, repo Extension dựng xong bốn năng lực lõi của vai điều phối, và **cả bốn đều
đã chạy thật, không phải chỉ có test**:

| Năng lực | Ở đâu | Đã chứng minh bằng |
|---|---|---|
| Bản đồ việc (song song được gì · ai giữ gì · chờ Đức gì) | `scripts/what-next.mjs` | dùng thật để chia luồng; tự bắt được một mục đã đóng mà không gạch |
| Firewall chống trượt vai | `docs/protocols/ORCHESTRATOR.md` mục 4 + `tests/role-firewall-smoke.mjs` | defect `ROLE-DRIFT-01` có thật, Đức bắt được |
| Brief → executor → theo dõi | `ORCHESTRATOR.md` mục 4b + hai brief mẫu | đã giao hai việc thật, executor chạy độc lập |
| Cổng nhất quán trạng thái trước khi báo cáo | `scripts/state-check.mjs` + `tests/state-check-smoke.mjs` | tạo **sai lệch thật** rồi bắt được, không phải fixture |

Đức chốt điều kiện promote là "chạy ổn ở repo này trước". Điều kiện đã đạt.

## 2. Promote nghĩa là gì — và KHÔNG nghĩa là gì

> **Đây là portable freeze, KHÔNG phải copy nguyên repo Extension sang.**

Bộ khung `Ark_Repo_Harness` phát hành qua `template/` và có đánh số phiên bản
(`RELEASE-LEDGER.json`, `CHANGELOG.md`, `scripts/build-template.mjs`, `scripts/upgrade.mjs`).
**Đọc cách nó phát hành TRƯỚC KHI thêm gì** — bộ khung có luật riêng, và brief này cố ý không
đoán hộ chúng.

### 2.1 Phải bỏ khi port

- **Mọi mã việc riêng của Extension**: `F-25`, `B-14`, `G-01`, `Y-02`, `ROLE-DRIFT-01`… Chúng là
  ví dụ, không phải hợp đồng. Giữ **bài học**, bỏ **số hiệu**.
- **Mọi tên gói cụ thể**: `duc-auto-gemini`, `duc-auto-gg-flow-video`, `duc-auto-chatgpt`.
- **Mọi tên khoá đóng cứng.** Đã đo trong repo này: `state-check.mjs` có **0** chỗ đóng cứng
  (tốt), `what-next.mjs` có **2** chỗ — cùng một dòng `stewardOf(...) || "_root"`, tức `_root`
  đang làm **giá trị dự phòng**. Ở một repo khai vùng khác thì dự phòng đó trỏ vào hư không.
  Lấy tên vùng dự phòng từ `.repo-structure.json`, hoặc để nó là một tham số. **Đừng chỉ đổi
  tên chuỗi** — đổi tên là dời chỗ hỏng, không phải sửa.
- Số đo của riêng repo này (77% commit chạm gốc, 39 mục nợ, 22 phút…). Số **minh hoạ** cho một
  luật thì giữ được nếu ghi rõ nó đo ở đâu; số **làm ngưỡng** thì phải thành tham số.

### 2.2 Phải giữ nguyên — hỏng hai điểm này là promotion THẤT BẠI

1. **`STATE UNKNOWN` là trạng thái riêng, không được gộp vào `OK`.** Fetch hỏng, git lỗi, hai
   bên cùng không đọc được → `UNKNOWN`, mã thoát riêng. Gộp vào `OK` là biến mất mạng thành tin
   tốt — fail-open.
2. **Cấm tự sửa (no self-heal).** Cổng thấy lệch thì **báo và in lệnh**, tuyệt đối không tự
   push, không `--restamp`, không sinh lại artifact rồi commit. Cách ghim hiện tại nằm ở **cấu
   trúc chứ không ở chữ**: mọi lệnh git đi qua một cửa duy nhất có danh sách trắng chỉ-đọc, và
   ngoài cửa đó cả file chỉ sinh **đúng một** tiến trình con. Phép đếm tiến trình con là thứ
   chặn được lối `claim.mjs --restamp` — danh sách trắng git **không** chặn được lối đó. Port
   cả hai lớp, đừng chỉ port lớp dễ.

Ngoài ra giữ: firewall không có ngoại lệ (không trần đếm vòng, không "chỉ một sửa nhỏ"), luật
không-ghi-đè-trong-phiên (chỉ đổi vai tường minh), luật nạp báo cáo năm mục, và **toàn bộ
regression test** — test là thứ làm luật cưỡng chế được, bỏ test là bỏ luật.

## 3. Chứng minh trên một repo KHÔNG giống Extension

Đây là điều kiện nghiệm thu quan trọng nhất, và cũng là chỗ dễ làm hời hợt nhất.

Dựng một **fixture repo** cố tình khác Extension: khai vùng khác (đừng dùng `_root`/`_docs`/
`_code`), **không có** thư mục `workers/`, **không có** `IDEAS.md`, tên đơn vị khác, chỉ một
đơn vị hoặc không đơn vị nào. Rồi chạy cả hai lệnh trên đó.

Hai lệnh phải **chạy được và nói đúng**, không ném lỗi vì thiếu file. Cụ thể cần chịu được:
vắng `IDEAS.md` · vắng `BACKLOG.md` · vắng `STATUS.md` · vắng remote (`origin`) — ca cuối phải
ra `UNKNOWN`, không phải `OK`.

> Nếu chỉ chạy được trên repo giống Extension thì bạn chưa port, bạn mới chép.

## 4. Sau khi PASS — đổi quan hệ hai repo

Extension trở thành **consumer / reference implementation**, không còn là nơi sở hữu bản chuẩn
của gói Assistant. Bộ khung mới là nơi phát hành.

Việc này cần một dòng trong `AGENTS.md` của Extension (bảng "Sổ tay mở khi cần" — chỗ đã ghi
ADR-0001 rằng bộ khung dọn ra nhà riêng) và một ADR ở bộ khung. **Làm phần ở bộ khung trước.**
Phần ở Extension để riêng, báo lại — nó cần khoá `_root` ở repo Extension và có thể có phiên
khác đang giữ.

## 5. Ranh giới

- **KHÔNG** promote `Y-08` (cặp đối chiếu `STATUS.md` ↔ Log). Đức chốt giữ ở `IDEAS.md`: nó là
  suy đoán theo văn xuôi, hạng `[DÒ]`, dễ báo oan — và một cổng hay báo oan sẽ bị phớt lờ, tức
  tệ hơn không có cổng.
- **KHÔNG** sửa `session-check.mjs`, `safe-push.mjs`, `claim.mjs`, `repo-structure.mjs` của bộ
  khung để cho gói mới vừa. Nếu gói mới đòi sửa chúng thì **DỪNG và báo** — đó là dấu hiệu
  thiết kế chưa portable, không phải lý do sửa bộ khung.
- **KHÔNG** đụng code extension ở repo Extension.
- **KHÔNG** tạo hook/cron/automation tự chạy.
- Ở **repo bộ khung** có luật khoá riêng và **có thể đang có phiên khác làm việc** — chạy
  `node scripts/claim.mjs --list` ở đó trước, tôn trọng chủ vùng y như ở đây.

## 6. Xong khi nào

1. Gói Assistant có trong `template/` của bộ khung, phát hành đúng cách bộ khung phát hành
   (phiên bản, ledger, changelog — theo luật của nó, không theo phỏng đoán).
2. Fixture repo ở mục 3 chạy được cả hai lệnh, và **ca vắng remote ra `UNKNOWN`**.
3. Regression test đi theo, chạy trong suite của bộ khung, **và bạn đã thử phá** — báo số thật
   kể cả số lượt thoát ban đầu.
4. Cổng đóng phiên của bộ khung XANH TOÀN BỘ.
5. Log + commit có nhãn lane + đẩy bằng `safe-push.mjs` của repo đó. Bị từ chối vì cuốn theo
   việc phiên khác → DỪNG và báo, đừng tự `--carry`.
6. Trả khoá — lượt push riêng.

**Phép thử cuối, và nó là phép thử thật sự:** tạo một repo mới từ bộ khung vừa phát hành
(`init-repo.mjs` hoặc cách bộ khung quy định), rồi ở repo mới đó chạy `state-check`. Nó phải
chạy được ngay, không cần sửa gì. Không đạt thì việc chưa xong, dù test xanh.

## 7. Câu hỏi thì hỏi Đức

Phiên điều phối cố ý đứng ngoài. Brief thiếu gì thì hỏi Đức một câu ngắn.
