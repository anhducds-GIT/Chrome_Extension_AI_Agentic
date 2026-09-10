# HANDOFF lưu trữ — HANDOFF.md, 6 mục cũ

> **Đây là phần đuôi đã cắt của [`HANDOFF.md`](HANDOFF.md) cạnh file này.**
> Cắt tay ngày 2026-09-10 theo [ADR-0008](docs/adr/0008-nhat-ky-phien.md), bằng chính `tachThan`
> và `docMuc` của `scripts/handoff.mjs` — lệnh `--cat` mà `.repo-structure.json` khai là
> cửa ra thì **chưa tồn tại** trong script đó.
>
> Cắt theo **vị trí trong file**, không theo ngày (bất biến ⑵ của ADR): file kia giữ **20
> mục cuối**, 6 mục trước đó nằm ở đây — **nguyên văn, không sửa một chữ**.
>
> **Dựng lại bản gốc:** thay khối con trỏ trong `HANDOFF.md` (phần giữa dòng `## Log` và
> tiêu đề `##` đầu tiên) bằng toàn bộ phần dưới dấu `ARCHIVE-BODY-START` ở đây — ra đúng bản
> gốc **từng byte**. SHA-256 bản gốc trước khi cắt: `8a55ef2897d97b8627c40d11b17ea3fd131b2ce08de0b553c9206527633a0464`.
>
> **Chỉ đọc.** Ghi Log mới thì ghi vào `HANDOFF.md`, đừng ghi vào đây.

<!-- ARCHIVE-BODY-START -->

<!-- HANDOFF-THANG: 2026-09 -->

<!-- HANDOFF-CUT-POINTER: ADR-0008 -->
> **6 mục cũ hơn đã dời sang [`HANDOFF-ARCHIVE-05.md`](HANDOFF-ARCHIVE-05.md)** — cùng thư mục này,
> nguyên văn, không mất chữ nào. File này giữ **20 mục cuối** (ADR-0008). Cần đào lịch sử
> xa hơn thì mở file đó và đi tiếp theo con trỏ trong nó; ghi Log mới thì vẫn ghi vào cuối
> file này.
<!-- /HANDOFF-CUT-POINTER -->

## 2026-09-09 (tệp đẩy) · `claude-gpt-chay-het-job` — có cuốn theo lane khác

Lượt đẩy này dùng `--carry` và **cuốn theo 8 commit của lane `claude-luat-rasoat`** — đợt rà luật
ba gói `duc-auto-*` (N-55 · N-56 · N-57: dựng `docs/adr/` cho gói video, sửa liên kết chết trên
bảng, gỡ các vế luật đã chết trong ba `AGENTS.md`). Ghi ra vì
[ADR-0005](../../../docs/adr/0005-lam-viec-song-song.md) ⑶ bỏ cửa hỏi Đức cho `--carry`, và **tên
lane bị cuốn theo là thứ duy nhất còn lại để truy**. Cổng đóng phiên XANH TOÀN BỘ trước khi đẩy.


## 2026-09-09 — `claude-luat-rasoat`: bản hiệu lực của gói nay MANG sổ cái của nó (N-58)

Không sửa một dòng mã nào — chỉ `AGENTS.md`. Đức chuyển khoá sau khi lane `claude-gpt-chay-het-job`
dừng.

**41/51 quyết định của gói là mồ côi** — `AGENTS.md` không trích số hiệu nào của sổ cái chính nó.
Nghĩa là ai chỉ đọc luật vàng sẽ không biết những thứ này tồn tại. Ba cái đáng kể nhất, đều là
luật **đang ràng buộc**:

- **ADR-0042 — việc thật KHÔNG chạy qua `run.trial`.** Đo được: phát hiện ảnh mất 40–68 giây.
- **ADR-0045 — câu trả lời text quá 32.767 ký tự thì DỪNG và KHÔNG lưu gì.** Không cắt, không
  tách file. Giới hạn cứng một ô Excel.
- **ADR-0004** — AI **được** tự nạp vị trí output khi đó là thư mục con dưới `Downloads`; nó là
  ngoại lệ có kiểm soát của ADR-0003, và thiếu nó thì luật đọc ra chặt hơn thực tế.

Nay `AGENTS.md` có mục **Sổ cái của gói** trỏ tới **37 luật đang sống**, nhóm theo chủ đề. Hai mục
còn lại (0010 gỡ API cũ ở WP-4 · 0029 mốc commit Tầng 1) là **bản ghi một lượt đổi đã xong** — khai
ở `.repo-structure.json` → `luat.mo_coi_co_y`, dạng nhóm, kèm lý do.

**Hai vế đánh dấu CHẾT** đúng khuôn máy đọc được: `0027` (*"không tự ý commit"*, bị 0028/0033 thay)
và `0032` (dọn checkpoint bản 24/08, bị **0043** thay — đừng trích 0032 nữa).

**Một chỗ ⚠ ghi ra chứ không giấu:** `ADR-0036` bắt cross-check độc lập trước khi đưa Đức thao tác.
Vế đó **đã hẹp lại 02/09** khi Đức bỏ audit độc lập cho *fix nhỏ*, nhưng **ranh giới "fix nhỏ" chưa
ai chốt câu chữ**. Đã ghi ngay tại dòng trích; gặp ca xám thì hỏi Đức, đừng suy diễn.

Cùng lượt: sửa dòng *"ADR đã Accepted thì KHÔNG sửa, B12 cưỡng chế"* — chết 09/09 bởi ADR-0026 ⑵.

Phép ② của cả repo: **100 → 0**. Suite gói không chạm.

## 2026-09-09 · `claude-gpt-chay-het-job` — B-43 ĐÓNG: vòng chat chạy trọn với cửa sổ bị che

Đức nêu điều kiện vận hành thật: *"99% thời gian cửa sổ GPT bị che, tôi thường reload, F5 rồi sang
Claude làm việc."* Nên hai vòng vá trước — chặn báo-thành-công-giả — chỉ đổi một lần nói dối thành
một lần **dừng hẳn**, tức vòng chat 0-cú-bấm không bao giờ hoàn tất. [ADR-0052](docs/adr/0052-tab-bi-che-thi-doc-lai-sau-f5-thay-vi-dung-han.md)
cài nửa còn lại Đức nhờ từ đầu: **đọc lại**. Hết giờ → đối soát → F5 → dò tới khi chữ hiện → chốt.

**Nghiệm thu live, ba lượt, cửa sổ để nguyên bị che** (`visibility=hidden`, `docFocused=false`):

| lượt | ghi vào sổ | sau F5 (trọng tài) | kết |
|---|---|---|---|
| ⑴ | 27 | 1.917 | trượt — cửa tắt tin `looksTruncated` để phán DOM đáng tin |
| ⑵ | không ghi | 2.117 | trượt nhưng trung thực — đọc một nhát sau F5 được 0 ký tự |
| ⑶ | **2.228** | **2.228** | **ĐẠT** — `SUCCESS`, `persistence_verified: true` |

**Ba câu tôi nói ẩu mà Đức chặn, cộng điều kiện nghiệm thu đầu của tôi cũng sai** (*"sổ ==
trang"* — cả hai cùng đọc 27 nên nó báo ĐẠT; hai vế cùng sai thì bằng nhau): ghi đủ kèm lý do
từng chỗ ở mục **Trạng thái** của [ADR-0052](docs/adr/0052-tab-bi-che-thi-doc-lai-sau-f5-thay-vi-dung-han.md).

**Khoá đổi tay hai lượt trong phiên**, cả hai theo chốt của Đức ghi **vào bảng quyền**: lấy lại
lần đầu (*"bạn lấy khoá đi"*), bị `claude-luat-rasoat` lấy với bản ghi *"bên kia đã dừng rồi"*
(sai — phiên này chưa dừng), rồi Đức định tuyến lại (*"bạn làm tiếp đi"*). Không tự giành lần nào.

**Kết quả số.** Suite **123/123**. Thử phá: B-43 vòng hai **15/15** · vòng ba **13/13**. Ghim mới
`text-reconcile-after-reload-smoke.mjs` 16 mép. **Còn mở:** `B-44` (dọn rác không thấy thư mục con
Chrome ghi vào) · `B-36` (điều kiện đóng cần đối chiếu lại sau lượt chạy hôm nay) · B-41 ⑵⑶.

## 2026-09-09 (tệp đẩy ⒉) · `claude-gpt-chay-het-job` — có cuốn theo lane khác

Lượt đẩy đóng B-43 dùng `--carry` và **cuốn theo 4 commit của lane `claude-luat-rasoat`** (đợt
N-58: gỡ các quyết định mồ côi khỏi sổ cái, và sửa một phép ghim đang cưỡng chế chính luật đã
chết). Ghi ra vì [ADR-0005](../../../docs/adr/0005-lam-viec-song-song.md) ⑶ bỏ cửa hỏi Đức cho
`--carry`, nên tên lane bị cuốn theo là dấu vết duy nhất còn lại. Cổng XANH TOÀN BỘ trước khi đẩy.

## 2026-09-09 (tiếp) · `claude-gpt-chay-het-job` — ĐÓNG B-44, đo lại B-36, dựng hàng rào cho B-41

**B-44 đóng.** Công cụ dọn rác nay **chỉ ra** chỗ Chrome thật sự ghi mà **không nới bán kính xoá**:
hàm mới không đọc nội dung, không phân loại, không xoá gì trong thư mục con — nó đếm rồi in ra câu
lệnh để người chạy. Tìm ra ngay `Downloads/Phai sinh` (132 tệp) mà trước đó nó chưa từng thấy.
Chạy thật: **81 tệp chứng minh được là của gói → đã xoá** · 51 tệp chưa chứng minh được chủ →
**giữ** · thư mục con `Manga concept Meo` (54 ảnh, việc thật của Đức) → **không đụng**.

Thử phá 10 mũi: 9 bắt được, 1 **không còn diễn đạt được**, 0 thoát. Hai con thoát ban đầu cho hai
cách xử khác nhau — một lỗ ghim thật (không mép nào đọc **con số**, nên đổi phép đếm thành
`trong.length` vẫn xanh), và một đột biến tương đương mà tôi **giết cả lớp bằng thiết kế**: một
`Map` đuôi → hàm chứng minh, thay cho một `Set` cộng mấy nhánh `if`, nên *khai một đuôi mà không
kèm cách chứng minh chủ* thành không khai được. Kiểm luôn dạng mới: nối `.pdf` vào cả ba phép
chứng minh đều **an toàn**, vì mọi phép đều kiểm chữ ký nội dung.

**B-36 — đo được vế còn ngỏ.** Payload trả *"đếm được 3 hồ sơ, **0 còn quyền**"* → không phải ca
nhiều-hồ-sơ, là ca không hồ sơ nào còn quyền; lấy lại thì `requestPermission()` **bắt buộc có một
cú bấm**. Cộng ADR-0051 bỏ hẳn nhu cầu chọn thư mục → **B-36 thôi chặn MVP**, hạ xuống một mục UX.
`STATUS.md` đang nói sai về chính hôm nay (*"MVP bị chặn ở B-36"*) — đã viết lại theo số đo.

**Hàng rào cho B-41.** Bước chuẩn bị mà chính mục đó đặt ra: phép kiểm không-gửi-lại nay **đếm số
nguồn** thay cho một câu `0` trơn, và tách hai loại khẳng định — **dương** (2 nguồn, chỉ chốt) và
**âm** (0 nguồn, loại duy nhất mở cửa gửi lại). Thử phá 3/3. **⑵⑶ cố ý để mở:** ⑶ mở cửa gửi lại
và điều kiện đóng đòi một lượt live — đẩy nó đi mà chưa có lượt live là đúng bài học hôm nay.

**Kết quả số.** Suite **123/123**. Thử phá: B-44 **9/10 bắt + 1 bất khả** · phần đếm nguồn **3/3**.

## 2026-09-09 (đóng) · `claude-gpt-chay-het-job` — B-43 ĐÓNG, đo trong hội thoại Project

Vế cuối của điều kiện đóng đòi **một lượt live trong hội thoại thuộc Project**, và tôi không nới
điều kiện của chính mình. Đã đo: URL `chatgpt.com/g/g-p-6a6aa6fb…-sin/c/6aa03cbf-…`, **cửa sổ để
nguyên bị che** suốt 18 lượt dò (`visibility=hidden`, `docFocused=false`).

**Sổ ghi 1.867 ký tự · máy chủ giữ 1.867 · `SUCCESS`, `persistence_verified: true`.** Đọc lại ba
lần đều ra 1.867 với `generating: false`; câu trọn vẹn (ngoặc cân 1/1, kết bằng dấu chấm, có mục
hành động).

**Vế Project đáng nhất, không phải hình thức.** Phép đo phụ: `conversationId('…/g/g-p-…/c/<id>')`
trả `6aa03cbf-…`, **không** phải `null` → cửa chống trôi-hội-thoại **đang BẬT** trên phiên Project.
Chính chỗ đó từng tắt lặng lẽ trên mọi phiên Đức thật sự dùng.

Đường đi đầy đủ, cả bốn bước: hết hạn 180 giây → đối soát đọc, thấy lượt hỏi của chính job → F5 →
dò tới khi chữ hiện → chốt qua đúng đường `finishTextOutput()` cũ.

**Hai lỗi của tôi trong lượt này, cùng một họ với bốn lỗi trước trong ngày:**
- Tôi **nhờ Đức bấm F5** trong khi `chat.reload` là method tôi đã dùng cả ngày. Tôi đọc câu trong
  `halt_instruction` — câu viết cho người vận hành — rồi đọc lại cho Đức. Đức bắt đúng: *"bạn tự
  F5 được sao phải tôi bấm?"* Chuyển tiếp thay vì hành động.
- Tôi đo `conversationId` ra `null` và suýt báo con bug quay lại. Phép đo hỏng: quên đưa `URL` vào
  ngữ cảnh `vm` nên hàm ném lỗi và trả `null`. Mã hoàn toàn đúng.

Cả hai là **đọc một tín hiệu rồi kể chuyện quanh nó** thay vì kiểm nguồn tín hiệu. Khác biệt: chỗ
thứ hai tôi kiểm TRƯỚC khi nói ra.

**Kết quả số.** Suite **123/123**. B-43 và B-44 đóng. **Còn mở:** B-41 ⑵⑶ (cố ý — ⑶ mở cửa gửi
lại, cần một lượt live) · B-42 (cần brief Đức duyệt) · B-36 hạ xuống một mục UX.

