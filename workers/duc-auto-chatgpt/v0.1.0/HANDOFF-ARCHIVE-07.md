# HANDOFF lưu trữ — HANDOFF.md, 6 mục cũ

> **Đây là phần đuôi đã cắt của [`HANDOFF.md`](HANDOFF.md) cạnh file này.**
> Cắt tay ngày 2026-09-11 theo [ADR-0008](docs/adr/0008-nhat-ky-phien.md), bằng chính `tachThan`
> và `docMuc` của `scripts/handoff.mjs` — lệnh `--cat` mà `.repo-structure.json` khai là
> cửa ra thì **chưa tồn tại** trong script đó.
>
> Cắt theo **vị trí trong file**, không theo ngày (bất biến ⑵ của ADR): file kia giữ **20
> mục cuối**, 6 mục trước đó nằm ở đây — **nguyên văn, không sửa một chữ**.
>
> **Dựng lại bản gốc:** thay khối con trỏ trong `HANDOFF.md` (phần giữa dòng `## Log` và
> tiêu đề `##` đầu tiên) bằng toàn bộ phần dưới dấu `ARCHIVE-BODY-START` ở đây — ra đúng bản
> gốc **từng byte**. SHA-256 bản gốc trước khi cắt: `5d340d00b8d63474f623e0bb5dae9da83fa6640c7a807bc2243b7207c89eebb0`.
>
> **Chỉ đọc.** Ghi Log mới thì ghi vào `HANDOFF.md`, đừng ghi vào đây.

<!-- ARCHIVE-BODY-START -->

<!-- HANDOFF-THANG: 2026-09 -->

<!-- HANDOFF-CUT-POINTER: ADR-0008 -->
> **6 mục cũ hơn đã dời sang [`HANDOFF-ARCHIVE-06.md`](HANDOFF-ARCHIVE-06.md)** — cùng thư mục này,
> nguyên văn, không mất chữ nào. File này giữ **20 mục cuối** (ADR-0008). Cần đào lịch sử
> xa hơn thì mở file đó và đi tiếp theo con trỏ trong nó; ghi Log mới thì vẫn ghi vào cuối
> file này.
<!-- /HANDOFF-CUT-POINTER -->

## 2026-09-09 (tiếp) · `claude-gpt-chay-het-job` — ĐÓNG B-40 đường ⒝ và B-41 ⑶

Đức chốt: *"phương án 2. cần đảm bảo flow chạy từ đầu tới cuối cho đến hết, trừ khi bị captcha
hoặc báo hết credit."* → [ADR-0053](docs/adr/0053-loi-nha-cung-cap-la-mot-nguon-doi-soat-cau-chua-lay-tu-ma-cua-ta.md).

**Sổ nợ gọi ⒝ là *"cho gửi lại"* — cách gọi đó SAI.** Đức viết *"chỉ bằng đúng câu nó yêu cầu"*,
nên thứ máy gửi là **câu chữa**, không phải prompt gốc. Prompt gốc vẫn bay **đúng một lần**; câu
chữa tối đa **2 lần/job**. `submissionMayExist()` và `canRetry()` không bị sửa một dòng.

**Rủi ro lớn nhất, sổ nợ chưa nêu:** đọc câu *"nhắn X"* rồi gõ X nghĩa là **trang quyết định máy
gõ gì** — cửa tiêm lệnh, ở đúng chỗ tệ nhất là một cửa vừa được cấp quyền gõ. Câu chữa nằm trong
một **hằng của adapter**; chữ nhà cung cấp chỉ dùng để **nhận dạng**. Ba lớp, cố ý dư một lớp.

**Số đo.** Suite **124/124** · ghim 15 mép · thử phá **10/11 bắt, 0 thoát** · kiểm hồi quy live:
sổ **1.761** = máy chủ **1.761** (tôi vừa sửa thẳng vào cửa đối soát đang chạy tốt, nên phải đo).

**Hai con thoát ở vòng đầu, cả hai ở chỗ chịu tải:** không tăng bộ đếm nắp (nắp không bao giờ cắn
→ vòng lặp tiêu quota) và bỏ qua `run.stop`. Cả hai lọt vì mọi mép chỉ kiểm **cấu trúc** — cấu
trúc không với tới hành vi. Bịt bằng ba mép **cắt hàm đã ship ra chạy thật**.

**Ba lỗi của tôi trong lượt này** — mép chống tiêm đòi sai chỗ · bộ lọc chú thích để văn của
chính tôi khớp vào phép kiểm · sân khấu giả truyền sai đối số nên một mép đỏ vì lý do sai: ghi đủ
kèm lý do từng chỗ ở mục **Trạng thái** của [ADR-0053](docs/adr/0053-loi-nha-cung-cap-la-mot-nguon-doi-soat-cau-chua-lay-tu-ma-cua-ta.md).

**Một lỗ hạ tầng nổ thật, đã gộp vào `N-59` của lane khác thay vì mở mục thứ hai** — cùng một
lỗi, nó cắn hai chiều trong một ngày. Số đo và cách dọn ở `BACKLOG.md` gốc, mục N-59.

**Còn mở:** B-41 ⑵ (`DETECTION_BLIND`) · B-42 (cần brief Đức duyệt) · vế live của ADR-0053 cần
một lỗi thật của nhà cung cấp, **tôi không giả lập**.

## 2026-09-09 (tệp đẩy ⒊) · `claude-gpt-chay-het-job` — có cuốn theo lane khác

Lượt đẩy đóng B-40 dùng `--carry` và **cuốn theo 8 commit của lane `claude-nen-luat`** (đợt nén Bản
đồ file và ADR-0034 *mở phiên đọc STATUS.md, không đọc HANDOFF.md*). Ghi ra vì
[ADR-0005](../../../docs/adr/0005-lam-viec-song-song.md) ⑶ bỏ cửa hỏi Đức cho `--carry`, nên tên
lane bị cuốn theo là dấu vết duy nhất còn lại.

**Cổng đóng phiên còn MỘT mục đỏ, và nó KHÔNG phải của phiên này:** `NAP_MOI_PHIEN_PHINH` lệch
**2 ký tự** (6.710 so với thước 6.708) vì commit của lane `claude-nen-luat` chạm `AGENTS.md` — họ
nâng thước lên 6.708 rồi chính bản sửa sau đó vượt thêm 2. Tôi **không sửa chữ luật đang dở của
lane khác**, và cũng không nâng thước hộ họ: nâng thước là một quyết định phải kèm lý do trong
nhật ký của người nâng. Mọi phép kiểm còn lại XANH; suite gói **124/124**.

## 2026-09-09 (lượt 5) · `claude-gpt-chay-het-job` — B-41 ⑵ và B-42

**B-41 ⑵ đóng.** `DETECTION_BLIND` nay đối soát trước; gửi lại là lối ra **cuối**. Thứ tự là
phần an toàn: đọc trước (chưa F5) → không thấy lượt hỏi của mình thì **dừng hẳn và KHÔNG F5** →
thấy rồi mới F5 → dò lại có nắp → mới tự kiểm. Phép khẳng định đòi **ba vế**; vế chịu tải là
*"có ≥ 1 lượt trả lời ở đâu đó trong hội thoại"* — thiếu nó thì một selector trợ lý bị mục sẽ
**khẳng định SAI** là máy chủ không tạo gì rồi gửi lại một prompt **đã có** kết quả.
`DETECTION_BLIND` **giữ nguyên** trong `HARD_STOP_FAILURE_TYPES`; `canRetry()` và
`submissionMayExist()` không đổi một chữ. Số nguồn khẳng định **âm tính 1 → 2**, đổi bằng tay.

**Một vế của ADR-0050 ⒞ KHÔNG thi hành được** — F5 xoá bằng chứng quy thuộc ảnh, nên hôm nay một
job mà ảnh **đã có sẵn** vẫn phải người xem. Đã ghi vào **chính ADR-0050** và tách thành
**`B-45`**; nó cần Đức chốt vì là một luật **quy thuộc** mới.

**B-42 đã ship** (Đức: *"bạn chủ động làm tôi approve"*). `chat.say` — một lượt nhắn thẳng,
không job, không dòng Excel. Hai số đo **ngược với chính chữ của B-42**: nó **không phải quyền
mới**, và nó **không chờ câu trả lời** (CLI bỏ ngang ở 40 giây, nên chờ lâu là bị cắt **sau khi**
tin nhắn đã bay). Đã **tách** nắp chờ 90 giây ra một hàm **dùng chung** với `run.trial`: hai
bản sao là **hai ngân sách**, tức nới phanh mà không ai thấy trong diff.

**Số đo:** suite **126/126** · hai ghim mới **cắt hàm đã ship ra chạy thật** · thử phá **0 thoát**.

**Bốn phép ghim cũ đỏ, MỘT trong bốn là lỗi thật** (`ReferenceError` từ sân khấu `vm` sau
khi tách hàm), cộng **ba lỗi trong đồ nghề của tôi** và **một mũi thử phá quá tù**. Nguyên văn cả
tám chỗ ở `BACKLOG.md`, mục tiến độ B-41 ⑵ và B-42 — ở đó vì mục nhật ký này chạm trần.

**Còn mở, và cả bốn đều cần Đức:** `B-45` · `B-36` (nút cấp lại quyền) · vế **audit độc
lập** của B-42 · vế **live** của ADR-0053. Tôi không tự ký nghiệm thu bản sửa của chính mình, và
không giả lập một lỗi nhà cung cấp.

## 2026-09-09 (lượt 6) · `claude-gpt-chay-het-job` — AUDIT ĐẢO LẠI HAI BẢN VÁ CỦA LƯỢT 5

**`chat.say` chạy live, PASS:** 349 ký tự, xác nhận **0,9 giây**, `17 × 23 = 391` đúng,
**0** dòng Excel. Đọc lần đầu (cửa sổ bị che) **17 ký tự** đứng yên; **135** sau khi tôi tự F5 —
cơ chế B-43 y nguyên, ở đường mới.

**AUDIT CODEX (Đức yêu cầu): hai vòng, CẢ HAI FAIL, cả hai bắt lỗi THẬT.** Tôi dựng lại từng ca
trên chính hàm đã ship trước khi nhận. Hai điều một phiên sau **không được undo**:

⑴ **Phép neo lượt hỏi phải DUY NHẤT.** Bản cũ so 160 ký tự đầu rồi lấy lượt khớp cuối; workbook
ảnh của Đức có đoạn mở đầu chung 173 ký tự → hai job **cùng khoá** → ghi **câu trả lời của job
khác** vào sổ với dấu `persistence_verified`. Nay: khoá **đầu+đuôi**, trùng khoá là
**không kết luận được**.

⑵ **Không có cửa gửi lại nào sau đối soát mù.** Không thể khẳng định *"máy chủ không tạo gì"* từ
DOM — "chưa vẽ", "không có" và "selector mục một phần" trông y hệt nhau. Vế đó của ADR-0050 ⒞ là
**không thi hành được**; số nguồn khẳng định **trở lại 0**.

Cộng ba mục HIGH của `chat.say`: *"đã gửi"* nay là **bằng chứng** chứ không phải *"đã bấm
nút"* · lỗi lấp lửng **không thử lại được** · sổ ghi **trước** lượt gửi.

**Số đo:** suite **126/126** · thử phá **8/8** và **9/9**, **0 thoát**.

**Chỗ tôi sai, và nó là bài học lớn hơn con bug:** sáng cùng ngày tôi đã **ghim chính ca ⑴ thành
"giới hạn đã biết"** rồi cho là chấp nhận được. Tôi ghi ra cái giới hạn mà **không ghi ra cái
giá**. Một "giới hạn đã biết" không thành an toàn chỉ vì đã được ghi ra.

**Đức chốt lượt này:** `B-45` để tôi chọn → **đóng, sẽ không làm**, mở `B-46` hẹp hơn ·
`B-36` **tạm chưa cần** · audit **giao Codex** (đã chạy) · **ADR-0053 hạ mức** — Đức chỉ ra
rằng có AI đang nhìn thì `chat.read`+`chat.say` là đủ, và Đức đúng.

Số đo đầy đủ, cả hai chuỗi sự kiện, và hai lỗi trong đồ nghề của tôi: `BACKLOG.md` khối
**AUDIT ĐỘC LẬP 09/09** — ở đó vì mục nhật ký này chạm trần.

## 2026-09-09 · `claude-nen-luat` — gói này nay mở phiên bằng `PHIEN.md`

**Mở phiên ở gói này: đọc `PHIEN.md`, một file, xong** (ADR-0035). Máy sinh, tự chứa: lõi luật
chung + `## Luật vàng` của gói + bản chắt trạng thái từ `STATUS.md`. **2.463 token** — trước hôm
nay là 29.826. Đừng nạp `AGENTS.md` hay file nhật ký này lúc mở; chúng là **nguồn** của `PHIEN.md`,
mở khi cần đào sâu.

`## Luật vàng` 4.265 → 2.187 ký tự. **Không luật nào bị xoá:** khối biện minh ADR-0032 còn một
dòng + một liên kết · bốn luật trùng lõi trỏ về lõi · bản kể tên lại bốn luật đó bỏ hẳn, vì trong
`PHIEN.md` chúng in ngay phía trên. Nắp `run.trial` và bảy lớp bảo vệ **giữ nguyên**.

**Sửa `AGENTS.md` hay `STATUS.md` của gói thì PHẢI chạy `node scripts/rule-compile.mjs --sinh`** —
cổng nay có phép kiểm canh (`PHIEN_CU`), và vượt trần 6.600 ký tự thì bộ sinh **từ chối ghi**.

*(Bản nén `AGENTS.md` nằm trong commit `1702ae5d` mang nhãn `claude-gpt-chay-het-job`: một lượt
`git add` không giới hạn đường dẫn trên cây làm việc dùng chung đã cuốn theo. Nội dung đúng, chỉ
nhãn nguồn gốc sai — không sửa vì sửa nhãn là viết lại lịch sử.)*

## 2026-09-09 (lượt 7) · `claude-gpt-chay-het-job` — B-46 đo xong, và MỘT LƯỢT GHI SỔ CỦA TÔI ĐÃ TRƯỢT

**B-46 đóng: ĐÃ ĐO, TIỀN ĐỀ SAI, 0 credit.** Đức chốt *"chạy B-46 đi"*; tôi chạy bằng
`diagnostics.dom_probe` — chỉ đọc. Trên tab **đang bị che thật** (`visibility: hidden`,
`docFocused: false`): `assistantCount` = **3**. Và `assistantCount` **chính là**
`assistantMessages().length` — cùng hàm, cùng adapter selector mà điều kiện mù dùng. Nên
`blind = (3 === 0)` = **false**: **che cửa sổ KHÔNG làm bộ dò mù.** `DETECTION_BLIND` cần
selector **mục thật** hoặc tab **không ở trên hội thoại** — hai ca mà đọc-lại-sớm không giúp gì.
Che cửa sổ chỉ làm **chữ** không vẽ xong — B-43 đã xử. Số đo đủ ở BACKLOG.md, mục B-46.

**LỖI CỦA TÔI, và nó tệ hơn con bug:** lượt ghi sổ ở lượt 6 **trượt lặng lẽ**. Một dòng trong
script của tôi hoá ra là `s.replace(tieuDeMoi, "")` — nó **xoá đúng tiêu đề vừa đặt**, nên hai
lệnh `.replace()` sau đó thành **no-op**. Kết quả: thân `B-45` **mồ côi** (bị gán lặng lẽ
vào mục B-41 phía trên), khối chốt B-45 **không vào**, `B-46` **không vào**. Script vẫn in
"xong" vì dòng in là **vô điều kiện**, và `backlog-check` vẫn xanh (34 mục, 0 mục vô hình).
**Và tôi đã báo cả ba việc đó là đã xong với Đức, kèm trong thông điệp commit `a7a218c4`.**

**Cách chặn, đã áp từ lượt này:** mọi script ghi sổ phải **đọc LẠI TỪ ĐĨA rồi `assert`** từng
khối vừa ghi. Một dòng in "xong" không chứng minh gì. Đã dùng cho cả `BACKLOG.md` lẫn
`STATUS.md` lượt này, cộng một phép kiểm rằng frontmatter STATUS **còn parse được** (17
trường, 0 lỗi) chứ không tin mắt thường.

**Hai mục cổng đỏ của lượt 6 nay đã đóng — bởi lane `claude-nen-luat`, không phải tôi:**
`PHIEN.md` đã track, và `drafts/` đã sửa quy thuộc (N-64). Tôi đã không sửa hộ, và đó là
quyết định đúng.

**Còn để mở, tự trả lời miễn phí:** tab bị che có vẽ xong một `<img>` **sinh ra** hay không.
Hội thoại lúc đo không có ảnh sinh nào. Lượt chạy ảnh thật tới nào cũng trả lời; probe đã ghi sẵn
`imageCandidateCount` và `generatedChains`. **Tôi không đốt một credit chỉ để hỏi.**

