# HANDOFF lưu trữ — HANDOFF.md, 4 mục cũ

> **Đây là phần đuôi đã cắt của [`HANDOFF.md`](HANDOFF.md) cạnh file này.**
> Sinh bằng `node scripts/handoff.mjs --cat HANDOFF.md --giu 20` theo
> [ADR-0008](docs/adr/0008-nhat-ky-phien.md) — cắt ngày 2026-09-09.
>
> Cắt theo **vị trí trong file**, không theo ngày (bất biến ⑵ của ADR): file kia giữ **20
> mục cuối**, 4 mục trước đó nằm ở đây — **nguyên văn, không sửa một chữ**.
>
> **Dựng lại bản gốc:** thay khối con trỏ trong `HANDOFF.md` (phần giữa dòng `## Log` và
> tiêu đề `##` đầu tiên) bằng toàn bộ phần dưới dấu `ARCHIVE-BODY-START` ở đây — ra đúng bản
> gốc **từng byte**. SHA-256 bản gốc trước khi cắt: `39642e74ba01e6e6f4bff6de7c5269ea6675deb9775369a5dd1c04543c6bdc26`.
>
> **Chỉ đọc.** Ghi Log mới thì ghi vào `HANDOFF.md`, đừng ghi vào đây.

<!-- ARCHIVE-BODY-START -->

<!-- HANDOFF-THANG: 2026-09 -->

<!-- HANDOFF-CUT-POINTER: ADR-0008 -->
> **5 mục cũ hơn đã dời sang [`HANDOFF-ARCHIVE-03.md`](HANDOFF-ARCHIVE-03.md)** — cùng thư mục này,
> nguyên văn, không mất chữ nào. File này giữ **20 mục cuối** (ADR-0008). Cần đào lịch sử
> xa hơn thì mở file đó và đi tiếp theo con trỏ trong nó; ghi Log mới thì vẫn ghi vào cuối
> file này.
<!-- /HANDOFF-CUT-POINTER -->

## 2026-09-06 — `claude-hang-doi`: B-36 đo dứt điểm sau 8 tuần, B-27 đóng, protocol dọn rác

**Làm gì.** Ba phép đo 0 credit trên máy Đức (Đức dán vào console, tôi đọc kết quả) đóng lại chẩn
đoán `B-36`. Đóng `B-27` theo câu chốt của Đức. Dựng protocol dọn rác theo yêu cầu của Đức.

**Kết quả số.**

- **`B-36` — đo trực tiếp, không còn suy.** Phép đo quyết định đi bằng đường thật của mã
  (`DAC_DOWNLOAD_ARTIFACT`, có trồng phiếu): xin `B36-probe-ticket__audit.jsonl`, Chrome đặt
  `d31c629e-…`, nội dung **đúng nguyên vẹn 22 byte**. Nên **Chrome Downloads không đặt tên nổi
  artifact của gói**. Kết luận 04/09 chỉ suy từ phiếu-đã-bị-tiêu.
- Hai phép đo trước **không phân biệt được** — một bất khả (service worker MV3 không có
  `URL.createObjectURL`), một bị nhiễu vì không trồng phiếu. Lý do đầy đủ trong mục `B-36`.
- Đức chốt **(D) kèm (A)** → [ADR-0049](docs/adr/0049-luu-ben-thu-muc-da-cap-quyen-thay-cho-mac-dinh-downloads.md), đã khai vào `decisions.md`.
- **`B-27` đóng**, **không viết một dòng code nào** — đóng vì chưa từng xảy ra (trần 32.767 ký tự,
  câu trả lời thật 177–180). Nợ gói **22 → 21**, đo bằng predicate của chính bộ đếm.
- **`B-09` có protocol:** `scripts/don-rac-tai-xuong.mjs` + phép ghim **36 khẳng định** (gồm 3 lượt
  chạy công cụ thật vào thư mục tạm). Đo thật **39 file tên GUID / 170**: ① 16 chứng minh được ·
  ② 21 không chứng minh được chủ · ③ **đúng 2 được bảo vệ** — một `.pdf` và một `.jpg` **là file
  THẬT của Đức**. Thử phá **7/9**; hai lượt thoát tương đương hành vi, **lượt gộp thì ĐỎ**.

**Còn gì mở.**

- `B-36` **chưa vá**. Thứ tự: (A) trước, (D) sau, **đừng gộp**. (A) không được đọc thành đã sửa B-36.
- Phép đo còn nợ, 0 credit: đọc `expectedDownloadNames.size` sau một lượt tải → determiner **có nổ**
  hay **không nổ cho blob URL**. Không chặn việc; nếu "không nổ" thì cả cơ chế đó là mã chết.
- `B-09` chờ **tay Đức bấm xoá** — AI không tự xoá file. Công cụ mặc định chỉ xem.
- Ba bug bị bắt trước khi Đức chạy, cùng họ với bài học `B-36` (kiểm **tĩnh** không phân biệt được
  hai nhánh). Chi tiết ở mục `B-09`.

- 2026-09-07 · Claude (`claude-gpt-don-no`) · **Dọn 4 mục nợ: một phép kiểm không ghim gì, hai chỗ code chết, một câu lỗi sai ngôn ngữ.**
  - **N-14 (phần gói ChatGPT) — ĐÓNG.** Gói này có đúng cùng phép kiểm chết như gói Gemini: nửa hành vi của `tests/chatgpt-zoom-control-smoke.mjs` tự định nghĩa lại `isChatGPTUrl` / `simulateZoomSync` / `simulateSetZoom` ngay trong file test. Thay bằng `tests/zoom-control-smoke.mjs` — trích thân hàm thật từ `sidepanel.js` rồi chạy trong `node:vm`. **13/13 đột biến đỏ**, 0 mỏ neo hỏng. Cái bẫy N-14 dặn đã dính thật: 2 đột biến lọt lưới vòng đầu vì sân khấu thiếu ca "nút ĐANG BẬT rồi mới rời sang tab lạ". File chết **chưa xoá** — chờ Đức duyệt, đầu file đã ghi rõ.
  - **B-25 — ĐÓNG.** 9 câu lỗi trong `confirmRecreate()` + 5 câu `detail:` của `output-location-core.js` (đuôi của `OUTPUT_LOCATION:` nằm ở đó, dịch ở `sidepanel.js` là dịch hụt) nay tiếng Việt có dấu, mã lỗi giữ tiếng Anh.
  - **B-24 — ĐÓNG bằng đường thứ hai của chính mục đó** (chốt `RECONCILE_IMAGE_ONLY` đứng trước mọi tác dụng phụ), **không xoá hàm**: mục tự ghi xoá là quyền của Đức, và hàm đang bị hai phép ghim neo vào — `post-submit-no-resend-smoke.mjs` đếm cửa đối soát phải bằng đúng 1 (phép đo đứng sau ADR-0047) và `recreate-core-smoke.mjs` dùng tên hàm làm mỏ neo cắt đoạn.
  - **B-20 — ĐÓNG nửa "làm code nói thật", không gỡ nhánh alias.** Xác nhận alias chết bằng đọc code; sửa 3 dòng `README.md` + 1 dòng `DAC_XLSX_RUN_PLAN_V1.md`. Không gỡ vì logic khớp alias có **ba bản sao song song**, và gỡ cả ba là phải bỏ `DUPLICATE_ALIAS` — một trong sáu mã `bridge-plain-failure-classification-smoke.mjs` ghim cho B-16.
  - **B-21 — ĐÓNG.** Kiểm code trước khi sửa chữ: 0 nút cho Resolve Existing Output. Hợp đồng schema nay đánh dấu đường thứ hai là NOT WIRED.
  - **Số đo:** suite gói **114/114 xanh**. Ba phép ghim mới, **28/28 đột biến bị bắt** (13 + 7 + 8).
  - **Chờ Đức quyết:** ⑴ xoá `tests/chatgpt-zoom-control-smoke.mjs`; ⑵ xoá hẳn `resolveExistingOutput()` hay giữ kèm chốt; ⑶ alias — bỏ hẳn khỏi ba module hay nối thật một ô nhập.

- 2026-09-07 · Claude (`claude-tran-900`) · **Trần `run.trial` lên 900 giây — Đức chốt (ADR-0015). `run.start` VẪN CẤM, không đổi một chữ. B-17 đóng.**
  - **Vì sao 900:** đó là `timeout` của chính workbook Pilot-08 Đức đang dùng thật, không phải số tròn chọn cho đẹp. Đo live 26/08: gửi → phát hiện ảnh mất 40s (1 ảnh) · 61s (2 ảnh) · **68s (4 ảnh)** với prompt *ngắn*; job thật là 4 ảnh + prompt 3.825 ký tự. Trần 90 giây không bảo vệ ai khỏi cái gì — nó chỉ đẩy đúng những job thật sang tay Đức.
  - **Vế thứ hai, quan trọng ngang vế thứ nhất:** `POLICY.prohibited_methods` nguyên vẹn. Công tắc Chế độ phát triển, nắp 30 job, cooldown 5 phút, sàn 15 giây: nguyên.
  - **Điều kiện ① — trần khai ở ĐÚNG MỘT CHỖ:** `LIMITS.trial_timeout_cap_sec` trong `bridge-core.js`. Trước lượt này con số 90 nằm rải ở **bốn** nơi (mặc định `capTrialTimeouts`, chỗ gọi ở `sidepanel.js`, trường audit, trường reservation). Nay cả bốn dẫn xuất; phép ghim **từ chối mọi chữ số** ở những chỗ đó.
  - **Điều kiện ② — ĐO TRƯỚC KHI XÂY: đường báo đã có sẵn.** `run.trial` vốn trả reservation ngay rồi chỉ sang `run.status`. Thiếu là **đồng hồ** — nó chỉ trả tên chặng, nên hai lần hỏi cách nhau 5 phút cùng trả "GENERATING" thì không phân biệt được đang-chạy với đã-treo. Vá bằng ba con số panel **vốn đã đếm** cho đồng hồ trên màn hình: `job_elapsed_sec` · `stage_elapsed_sec` · `stage_budget_sec`. Không cơ chế mới.
  - **Ghim:** `tests/trial-timeout-cap-adr0015-smoke.mjs` — canh **cả hai chiều** (900 nhận **và 901 từ chối**; thiếu vế sau là bỏ trần, không phải nới trần). Vế ② **không grep chữ**: cắt `elapsedSecSince` + `bridgeRunStatus` đã ship ra và **chạy** trong `node:vm`, đòi `stage_elapsed_sec` **bò lên**.
  - **Số đo:** suite gói **115/115 xanh**. **10/10 đột biến bị bắt**, gồm gỡ `run.start` khỏi danh sách cấm, đổi 900→200, gõ con số lại vào chỗ gọi, và "đồng hồ còn chữ mà số đứng yên".
  - **Trần tuyên bố: TĨNH + suite, CHƯA chạy live.** Nghiệm thu thật cần **Đức reload extension** ở `chrome://extensions` rồi chạy một trial với job dài hơn 90 giây.

- 2026-09-07 · Claude (`claude-b36-vaA`) · **B-36: vá cả (A) và (D) theo ADR-0049. Mục VẪN MỞ — chưa nghiệm thu live, và điều kiện đóng LÀ lượt live đó.**
  - **Một phép đo BÁC một câu trong bối cảnh ADR-0049.** ADR ghi *"không chỗ nào lưu handle vào IndexedDB"* — sai, `output-profile-core.js` lưu từ đầu. Nên **(D) nhỏ hơn ADR hình dung nhiều**: chỗ thiếu là `resolveOutputProfile()` cần `profile_id` từ config workbook, mà workbook bootstrap có config **rỗng**. ADR bất biến nên không sửa; đính chính + bài học ở mục `B-36` của `BACKLOG.md`.
  - **(A):** settings do máy dựng mang dấu `autoDefaulted`; đường ghi giữ sổ trong `state.auditEvents`. Luật quy trách nhiệm **không bị nới** — sổ vẫn ghi trước khi mutation có tác dụng, chỉ chậm ra file. Dây nhận `audit_durable: false` kèm câu tiếng Việt; luật vận hành ở `AI-OPERATOR-GUIDE.md`.
  - **(D):** nhận lại thư mục đã cấp quyền khi có **đúng MỘT** cái. Nhiều hơn một thì KHÔNG chọn hộ — chọn hộ là đem bằng chứng run này ghi vào hồ sơ run khác. Không nhận thì phiên vẫn chạy, vì (A) đỡ.
  - **Ghim:** `tests/b36-bootstrap-audit-held-smoke.mjs` — HÀNH VI, chạy `sidepanel.js` thật trong `node:vm`, stub download trả GUID **đúng như đã đo live**. Mười bất biến. `bridge-attention-static.mjs` phải viết lại **lần thứ hai** vì nó ghim cú pháp một dòng của chính chỗ phải sửa.
  - **Số đo:** suite **115/115** · thử phá **15/17**, hai con lọt đều tương đương hành vi và được ghi lại thay vì bày phép ghim giả. Thử phá còn lộ ra một dòng **mã chết** và một **lỗi thứ tự thật** — cả hai ở `BACKLOG.md`.
  - **KHÔNG sinh lại bảng:** cây làm việc đang mang việc chưa commit của lane Scouter, mà bộ sinh đọc STATUS ở cây làm việc. Để lane sau sinh.
  - **Trần tuyên bố: SUITE, CHƯA LIVE.** Đóng khi: Đức chọn một thư mục → đóng/mở panel → `jobs.add` qua Bridge → không có `audit_durable: false`, tên file đúng → **và số file tên-GUID trong `Downloads` KHÔNG TĂNG** (mốc 39). Bước cuối mới là bước chốt: 04/09 bốn bước trên đã xanh mà file rác vẫn tăng.
  - **Đẩy bằng `--carry`, và đây là tên hai lane bị cuốn theo** (ADR-0005 bắt kể tên): `claude-bang-vung-chac` (2 commit — `_code`, bộ sinh đối chiếu) và `claude-scouter-s06` (4 commit — gói Scouter). Tôi **không** thực hiện việc của họ và không biết họ đã xong chưa; commit của họ đã nằm sẵn trong nhánh lúc tôi đẩy.

<!-- HANDOFF-THANG: 2026-09 -->

## 2026-09-08 · `claude-ext-mobang` — gạch ba mã đã đóng mà chưa gạch

**Làm gì:** `B-29` · `B-16` · `B-18` tự khai `**ĐÃ ĐÓNG**` trong tiêu đề nhưng không gạch
`~~mã~~`, nên bản đồ việc ở gốc repo phải đoán và nó báo *"đã đóng nhưng KHÔNG gạch ngang"*
mỗi lượt chạy. Chỉ sửa **hình dạng tiêu đề**, không đổi một chữ nội dung nào.

**Vì sao tới hôm nay mới làm được:** gói này đang đóng băng, tức file cấm sửa. Đức mở băng
chiều 08/09 ([ADR-0024] ở gốc repo) nên cửa đã mở.

**Kết quả:** cảnh báo của bản đồ việc **4 mã → 1 mã**. Còn lại `G-14` ở gói `gemini` — lane
`claude-gemini-crlf` đang giữ khoá, không đụng. Suite gói xanh 115/115.

## 2026-09-08 · `claude-gpt-no-ky-thuat` — dọn nợ kỹ thuật: 22 → 12 mục mở, hai bản vá thật

**Làm gì.** Đức chốt "đóng hết nợ kỹ thuật trước". Ba việc mở băng trong bản giao việc **đã xong
từ trước** (ADR-0024 có thật, khối `frozen` rỗng, giới hạn ① đã ghi năm gói) — kiểm rồi bỏ qua.

**Kết quả số**, đo bằng chính `parseBacklog()`, không tin lời sổ:

- **Sổ nợ 22 → 12 mục mở.** Tám mục là sổ **nói thật trở lại**, không phải việc mới xong: mục
  `## Đã đóng` viết `- **2026-09-07** (B-25) — **ĐÓNG.**` mà bộ đếm chỉ nhận `- **ĐÓNG <mã>**`.
  Từng mục kiểm lại **bằng đọc mã**, không tin tiêu đề. Lý do đầy đủ của cả tám: `BACKLOG.md`,
  mục "Đóng bằng dòng ở cuối sổ".
- **`B-10` ĐÓNG bằng bản vá thật** — `run.status` thôi khai job của run trước khi đang rảnh.
  8/8 đột biến đỏ.
- **`B-28` ĐÓNG sau BA vòng audit độc lập** — nút "Tiếp tục" ăn ngay; cooldown thử lại thôi trôi.
  **Vòng 1 của tôi có một lỗi thật** (bell dùng chung rò rỉ ~240 reaction mỗi phút tạm dừng) **mà
  phép ghim vẫn xanh** vì nó so *danh tính* promise. 10/11 đỏ. Ba vòng ghi ở `BACKLOG.md`.
- **`B-14`/`B-15` xong nửa tài liệu, VẪN MỞ** — `provider-adapter.js` nay ghi `CHƯA TỪNG KHỚP`
  cạnh 7 selector chưa từng khớp trên trang thật. Phần nặng là phép đo DOM → cần Đức.

**Suite 117/117.** Lượt đầu báo 2 đỏ ở `bridge-multiprofile-transport-async` +
`bridge-profile-label-save`; chạy riêng hai lần đều xanh — con flake dưới tải đã ghi, lúc đó có
lane khác cùng ghi vào một cây git.

**Còn mở.** `B-08` là mục cuối AI làm được không cần Đức; chưa làm vì nó chạm 4 chỗ gọi trong
`content.js` và tôi không rút gọn một refactor ở cuối phiên. Chờ Đức: `B-36` (chặn MVP, cần lượt
live) · `B-09` · `B-15` · `B-20`. Cần brief riêng: `B-06` `B-07` `B-31` `B-33` `B-34` `B-35`.

**Trần tuyên bố cho cả hai bản vá: SUITE, CHƯA LIVE.** Ba phép nghiệm thu 0 credit ở `STATUS.md`.
Lượt commit đầu của phiên bị lane khác cuốn theo — ghi ở `BACKLOG.md` gốc repo, mục `N-40`.

## 2026-09-08 (tiếp) · `claude-gpt-no-ky-thuat` — nghiệm thu LIVE qua Bridge: (A) đạt, (D) hỏng

**Làm gì.** Đức nạp lại tiện ích và mở Bridge; tôi lái qua `bridge-cli`. Lượt chạy thật đầu tiên
của gói sau khi mở băng. Bảng số đầy đủ, bằng chứng từng dòng, và `đóng khi:` của mọi mục mới:
`BACKLOG.md`, mục "Nghiệm thu live 2026-09-08".

**Kết quả số.**

- **Sáu nợ nghiệm thu CŨ nay có bằng chứng live**, không phải việc hôm nay: chặn chạy từ trang chủ
  cả hai chiều (02/09) · trần `run.trial` 900 giây và đồng hồ tiến độ **bò lên** (07/09) ·
  `run.start` vẫn không có trong 23 lệnh · **B-10** (hôm nay) · **B-16** (06/09).
- **B-36: nửa (A) ĐẠT ở đúng chỗ 04/09 đã hỏng, nửa (D) HỎNG — mục VẪN MỞ.** Tệp tên-GUID trong
  `Downloads` **39 trước, 39 sau**, đo bốn lần, kể cả sau một lượt chạy đã tới cửa lưu rồi chết.
  Sau khi Đức chọn thư mục: `checkpoint.verified: true`, tên tệp đúng, `audit_durable` biến mất.
  (D) **không nhận lại** thư mục đã cấp quyền sau khi đóng/mở panel — Đức phải bấm lần hai.
- **Sổ nợ gói 12 → 15.** Ba mục mới đều sinh từ lượt chạy này: `B-37` (P1) · `B-38` (P1) ·
  `B-39` (P2). Nợ tăng, và đúng: việc của một lượt chạy thật là tìm ra chỗ hỏng.

**Còn mở.** `B-14`/`B-15` **chưa đo được lần thứ hai** — cửa sổ gắn ảnh quá sớm so với 1–2 giây bắt
tay CLI; **đừng đọc các con `0` trong `attachmentPreview` thành "selector chết"**, không có ảnh đang
gắn thì `0` là câu trả lời đúng. Đầu mối mới và một trần cứng (ảnh 2MB **không** qua Bridge được,
nắp 700KB mỗi ảnh) đều ghi ở `BACKLOG.md`.

**Tôi làm sai một chỗ, ghi ra để lượt sau không lặp.** `Q003` tiêu một lượt sinh mà không thu được
gì, và **lỗi là của tôi, không phải của mã**: tôi chạy job tạo ảnh trong hội thoại Đức đang mở, mà
hội thoại đó có chỉ thị riêng buộc trả lời ngắn — nên ChatGPT không tạo ảnh nào. Extension xử đúng
mọi bước và **không gửi lại**. Luật lượt sau: job ảnh chạy trong hội thoại **TRỐNG**, và đọc
`chat.read` **trước** khi chạy.

