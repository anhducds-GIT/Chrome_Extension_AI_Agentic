# CHUỖI VIỆC — Scouter seed, chạy liên tục không phải hỏi lại

> **File này sinh ra để sống sót qua một lượt compact.** Nó KHÔNG kể chuyện đã qua (đó là việc
> của `HANDOFF.md`), KHÔNG giữ sổ nợ (`BACKLOG.md`), KHÔNG bàn phạm vi (`ROADMAP.md`). Nó chỉ
> trả lời đúng một câu: **việc kế tiếp là gì, và làm xong thì biết bằng cách nào.**

## Mở phiên thì đọc gì

1. `PHIEN.md` — luật, một file, tự chứa. **Bắt buộc.**
2. File này — lấy đúng MỘT việc đang tới lượt ở bảng dưới.
3. Mục `T<n>` tương ứng. Trong đó có đủ thứ để bắt đầu; cần đào sâu thì nó chỉ tiếp.

**Đừng đọc cả file này.** Đọc khối "Luật của chuỗi", rồi nhảy thẳng tới mục đang tới lượt.

## Luật của chuỗi — áp cho MỌI việc, không nhắc lại ở từng mục

1. **Nhận khoá trước mỗi lượt ghi**, trả ngay sau: `node scripts/claim.mjs --sua <file>… --as <phiên>`.
2. **Việc xong không phải là mã chạy được.** Xong = mã + phép ghim + con đột biến giết được nó
   + `npm run test:scouter` xanh + `npm run scouter:mutation` 0 sống sót + cổng XANH TOÀN BỘ.
3. **Ghi `STATUS.md` và `HANDOFF.md` CUỐI CÙNG**, rồi `node scripts/rule-compile.mjs --sinh`.
   Mục `HANDOFF` dưới **2.600 byte** — dài hơn thì chuyển phần thừa sang `BACKLOG.md` hoặc ADR
   rồi để một con trỏ.
4. **Đừng tự ký nghiệm thu bản sửa của chính mình.** Đẩy cần thêm một lượt audit độc lập.
5. **Nạp lại extension là việc ĐỨC NHÌN THẤY** — bảng bên đóng rồi mở lại. Báo trước, gộp thành
   một lần ở cuối, đừng rải.
6. **Gặp câu chưa có đáp án thì ghi ra, đừng đoán cho tròn chuyện.** Một chẩn đoán sai có thẩm
   quyền đắt hơn một ô trống.

## SAU COMPACT — đọc ĐÚNG khối này rồi bắt tay (viết lại 16/09, tối)

> Mọi khối bên dưới là **chuyện đã xong**. Khối này là **việc còn lại**.
> Khối trước của mục này đã hoàn thành trọn vẹn; bản này thay hẳn nó.

### Đang ở đâu — một câu

**Ba câu hỏi lớn đã trả lời xong bằng lượt chạy thật**, `Scouter v1` + `Udin v1` đã ký, và sổ nợ
Scouter nay còn **đúng một mục mở** (`S-31`, việc của AI). Lộ trình `N1`–`N5` đã cạn: `N3` và `N4`
đóng 17/09, `N2` **chết** (Đức duyệt `alarms` từ 07/09), `N1` còn mở nhưng **chờ dữ liệu chứ không
chờ mã**, `N5` chờ Udin có tính năng video.

**Nên giai đoạn tới KHÔNG mở năng lực nào. Nó kiểm lại CHÍNH BỘ ĐO.**
Ngày 17/09 trả một bài học đắt, lặp bốn lần trong một phiên: thứ tốn tiền **không phải mã sai** —
mã sai thì bộ đo bắt được. Thứ tốn tiền là **màu xanh giả** và **dòng cũ không ai đọc lại**: một
mục đóng 07/09 mà mười ngày sau vẫn đẩy cho Đức quyết; một con đột biến sống sót vì phép ghim
*giải thích* thay vì *assert*; một kết luận sai công bố ra bốn nơi trước khi kiểm.

### Việc còn lại — theo thứ tự nên làm

> **Cập nhật cuối 17/09 tối: `A1` `A2` `A3` ĐÓNG. Còn `A4` và `A5`.**
> `A1` đóng bằng `2bdb1cce` (ca hỏng thật cho sáu hàng) · `A2`+`A3` bằng `d7c2f601` (mồ côi
> 169 → 0, B16 xanh, không hạ hạng không nới ngưỡng). Khối mô tả bên dưới **giữ nguyên văn**
> để đọc được vì sao chúng được xếp thứ tự như thế.

**① `A1` — SÁU PHÉP KIỂM CHƯA TỪNG ĐỎ. ✅ ĐÓNG 17/09 (`2bdb1cce`). Làm trước, vì nó quyết định mọi màu xanh còn lại.**
`can-nang.mjs` đếm được: qua **300 lượt chạy cổng**, sáu hàng này **chưa đỏ lần nào** —
*Bất biến quyền sở hữu ba tầng · Không có secret lọt vào repo · Luật biên dịch sạch · Mọi lệnh git
đọc được · Nhãn lane trong commit · Vùng CHỈ-THÊM không bị viết lại*.
**"Chưa từng đỏ" KHÔNG phải "hỏng"** — vài cái không đỏ vì repo thật sự sạch, và đó là tin tốt.
Câu phải hỏi là câu chính công cụ đã ghi: ***dựng nổi ca hỏng cho nó không?***
**Cách làm, đã có tiền lệ:** chép repo sang một thư mục bỏ đi, bẻ gãy đúng một thứ, chạy lại hàng
ấy. Kỹ thuật này dùng thật 16/09 (`worktree-hostile-checks`; và `git hook run -- /nonexistent` để
chứng minh một hook có chạy). **Đừng bẻ trong cây làm việc thật.**
**Đóng khi:** mỗi hàng có một ca hỏng **chạy được** làm nó đỏ — hoặc được khai thẳng là *không
dựng nổi ca hỏng*, và khi ấy nó chưa bao giờ là phép kiểm, phải viết lại hoặc bỏ.

**② `A2` — SỔ LUẬT ĐANG ĐẾM MỘT CÂY KHÁC. ✅ ĐÓNG 17/09 (`d7c2f601`). Rẻ nhất, và nó làm con số kia đọc được.**
Đo 17/09: `rule-compile.mjs` báo **169 quyết định mồ côi**, nhưng **164 trong số đó nằm ở
`.claude/worktrees/nifty-benz-a66fbf/`** — một worktree mà **git không track một file nào**
(`git ls-files` đếm 0). Repo thật chỉ có ~**5**.
Cùng họ `worktree-hostile-checks`: bộ đo quét ĐĨA trong khi repo được định nghĩa bởi GIT.
**Đối chứng để khỏi vơ đũa:** `can-nang.mjs` đọc từ git nên nó **KHÔNG** bị thổi — ba con số ngân
sách ở `A4` là thật, đừng gạch chúng theo.
**Đóng khi:** bộ quét bỏ qua `.claude/worktrees/`, con số mồ côi đo lại, và **5 mục thật** kia
được xử từng cái.

**③ `A3` — B16 ĐỎ: 20 ADR không có nhà. ✅ ĐÓNG 17/09 (`d7c2f601`).**
`repo có 20 ADR mà chưa khai luat.chu_de — mọi luật đều không có nhà`. B16 thuộc nhóm **chỉ cảnh
báo**, nên nó đỏ mà cổng vẫn xanh — đúng kiểu nợ sống lâu. Đường sửa có sẵn và `--de-xuat` **chạy
được** (đã thử): khai `luat.chu_de` vào `.repo-structure.json`, rồi thêm `chu_de:` vào frontmatter
từng ADR (B12 cho phép sửa frontmatter).
**Đóng khi:** B16 xanh mà **không** hạ nó xuống hạng nhẹ hơn và **không** nới một ngưỡng nào.

**④ `A4` — BA CHỖ QUÁ NGÂN SÁCH, và đừng nới số. ⚠ HAI ĐÓNG, MỘT CHỜ ĐỨC (17/09).**
`Tổng tài liệu` **9.958/2.200 dòng** (4,5×) · `HANDOFF.md` **877/600** · `thời gian chạy trọn bộ
kiểm` **199/180 giây**.
Chỗ an toàn nhất làm trước: HANDOFF có sẵn đường **DỜI CHỖ, không xoá** — chuyển lượt cũ sang
`docs/archive/HANDOFF-<năm>-<tháng>.md`, giữ nguyên chữ.
Chỗ 9.958 dòng thì **đo trước khi động**: `draft.md` **3.294 dòng** nằm ngay gốc repo, và hai
`docs/studies/*` cộng lại **2.953** — hỏi từng cái *"ai còn đọc nó"* trước khi hỏi *"ngưỡng có
đúng không"*.
**Luật của mục này:** *"Trước khi nới ngân sách, hãy thử BỚT"* — một ngưỡng chỉ báo cáo thì sớm
muộn bị nâng, kể cả bởi tôi.
**Đóng khi:** cả ba về trong trần **bằng cách bớt**, hoặc một trần đổi kèm ADR nói rõ vì sao con
số cũ sai — không phải vì nó đang vướng.

> **ĐÃ LÀM 17/09.** `HANDOFF.md` **900 → 480** dòng bằng `npm run don -- --apply` (dời nguyên văn,
> không xoá). `tokenNap` **6000 → 5724** (đo thật 4.403 + biên 30%) — đóng `KHUNG-M3`.
>
> **Con số 9.958/2.200 hoá ra không phải "quá ngân sách".** 2.200 là `NGAN_SACH_MAC_DINH` của bộ
> khung, và repo này **chưa bao giờ khai khối `budget`** — tức bị đo bằng thước của một repo khác.
> [ADR-0038] khai trần của chính repo, dạng **bánh cóc** (xoá được thì HẠ, không bao giờ nâng).
>
> **CÒN CHỜ ĐỨC — một câu thôi:** phần bớt thật là **`docs/studies/` — 5.516 dòng, 10 file, 55%
> kho chữ**. Tôi **không tự xoá**: `docs/README.md` đang khai chúng là *"nghiên cứu còn sống"*, và
> xoá file là việc phải hỏi Đức. Tiền lệ đúng đường: 08/09 Đức chốt xoá 14 file `EXP-*` (8.310
> dòng) — **chúng rời cây làm việc, KHÔNG rời git**, kèm sẵn lệnh đọc lại. Câu hỏi: *còn ai đọc
> mười file này không?*
>
> Một dòng của lộ trình cũ SAI, sửa tại chỗ: *"`draft.md` 3.294 dòng nằm ngay gốc repo"* — thước
> này **không đếm** `draft.md` (`taiLieu` = `docs/` + README + CHANGELOG + STATUS). Nó không phải
> phần thừa ở đây.

**⑤ `A5` — 22 CHỖ QUÁ HẠN RÀ + 1 LUẬT TRÙNG. ⚠ MÁY XONG, NGƯỜI ĐỌC ĐƯỢC 9/22 (17/09).**
22 nơi chứa luật rà lần cuối **09/09**, quá hạn 7 ngày. Đây đúng là thứ sinh ra dòng cũ mà cả
phiên 17/09 phải đi dọn, nên nó **không phải việc vặt**.
**Đóng khi:** mỗi nơi được đọc và đổi `ra_soat`, hoặc khai thẳng là không còn ai đọc nó nữa.

> **ĐÃ LÀM 17/09.** Bốn phép của bộ biên dịch: **① 0 · ② 0 · ③ 0 · ④ 22 → 13**.
> *"1 luật trùng"* hoá ra **không phải nợ**: ba dòng *"Ba việc phải hỏi Đức"* của `hnx-fetch` cố ý
> nằm ở cả `AGENTS.md` lẫn `PROTOCOL.md`, Đức chốt 08/09, câu trả lời đã ghi ngay tại chỗ từ hôm
> ấy — mà ③ vẫn đếm nó mỗi lượt. Khai `luat.trung_co_y` (khoá là **vân tay**, không phải cặp file,
> nên sửa lời một bản là lượt miễn hết hiệu lực).
>
> **13 chỗ còn giữ mốc 09/09 là CỐ Ý.** Tôi chỉ đóng dấu cho chỗ **đã đọc thật** — đóng dấu mà
> không đọc chính là cái bệnh mục này sinh ra để chữa. Chín chỗ đã đọc: `CLAUDE.md` · `README.md` ·
> `AGENTS.md` · `PLATFORM.md` · `docs/_TEMPLATE-adr.md` · `docs/protocols/HANDOFF.md` ·
> `workers/_shared/AGENTS.md` · `AGENTS.md`+`decisions.md` của Flow Video.
>
> **Lượt đọc trả tiền ngay — ba chỗ đang dạy sai:** ⑴ `decisions.md` của Flow Video còn dạy *"viết
> ở `Proposed` rồi đổi sang `Accepted` ở một lượt riêng"*, vế Đức chốt **ngược lại** 09/09
> (ADR-0026 ⑵) — nó sống thêm **8 ngày** vì nó nói bằng lời mình, không trích số hiệu, nên phép ①
> **không thể** thấy. Đây đúng là khoảng trống mà lượt rà soát sinh ra để lấp. ⑵ `README.md` bảo
> *"đóng phiên thì dùng `test:song-song`"* — sai, cổng gọi `npm test`. ⑶ `README.md` bỏ sót
> `udin-optic` khỏi bảng extension.
>
> **Hai bẫy mới, đã vào sổ nợ:** `KHUNG-M4` (`don.mjs` và `handoff.mjs` cắt nhật ký theo **hai**
> quy ước — phần dời đi rơi khỏi chuỗi con trỏ của bộ đếm sự cố **và** khỏi lớp chỉ-THÊM; thiệt
> hại hôm nay **0**, đếm được) · `KHUNG-M5` (khoá trùng trong `.repo-structure.json` lọt **im
> lặng** — `JSON.parse` lấy khoá sau, gặp thật hôm nay).

**`N1` — VẪN MỞ, nhưng chờ DỮ LIỆU chứ không chờ mã.** Nhật ký đời sống đã dựng và đã đo thật
(giết bằng `Stop-Process -Force` → lượt sau báo đúng; đóng tử tế → im lặng). Nó **vào việc từ lượt
bật Bridge kế tiếp**. Chờ một lần chết thật rồi đọc nó.

### Chờ ĐỨC — AI không tự quyết được, đừng tự làm

**~~`Đ1` — ĐẨY~~ · CHẾT 17/09 tối, không cần Đức nữa.** Đo lại sau một lượt `git fetch` thật:
`origin/main` == `HEAD`, **0 commit chưa đẩy**. Việc này đã tự giải quyết giữa chừng. *(Dòng cũ để
lại: "nhiều commit đang nằm local, `safe-push` từ chối vì chúng nằm sau một commit của lane
`claude-gpt-chay-het-job`; Đức chốt `--carry` thì đẩy được." — đúng lúc viết, sai từ 18:20.)*

**`Đ2` — AUDIT TỔNG THỂ + ĐỘC LẬP.** Đức đặt hàng 17/09, làm **sau khi `A1`–`A5` xong**. Thứ tự ấy
cố ý: `A1` là *kiểm lại người kiểm*, và giao cho một AI khác một bộ đo chưa biết có đỏ được không
thì nó audit trên cát. **Cần Đức mở kênh** (Codex / GPT) — AI không tự gửi gì ra ngoài.

> **CÒ ĐỘ TƯƠI — bắt buộc, chạy TRƯỚC khi audit.** Sinh ra từ một ca thật 17/09: GPT đọc repo qua
> connector GitHub và báo SHA `fbb1bd6f` *"không resolve trên main"*, trong khi đo tại chỗ sau một
> lượt `git fetch` thì nó **có** trên `origin/main` từ 17:44. Connector phục vụ một chỉ mục cũ.
>
> Đó **không phải chuyện vặt**: hai trong bốn gap của bản nghiên cứu 17/09 sinh ra vì đúng cơ chế
> ấy — nó không thấy việc 15–17/09 (`udin-optic` ra đời, `R3`, `scout.clear` tự kiểm, chính lộ
> trình `A1`–`A5`) nên báo lại những chỗ đã đóng. Một lượt `Đ2` trên cây cũ thì **tốn tiền cả hai
> đầu và trả về nợ ma**.
>
> Câu phải bắt bên kia trả lời trước, mười giây: *đọc `workers/duc-scouter/v0.1.0/CHUOI-VIEC.md`
> trên `main`; không thấy khối `A1`–`A5` thì DỪNG, connector đang phục vụ bản cũ.*
>
> Cò này **không gắn với một SHA** — SHA rồi sẽ cũ. Nó gắn với một khối nội dung có mặt từ 17/09.

**`Đ4` — KIẾN TRÚC `Universal Workflow Engine` ↔ `Site Adapter` ↔ `Scouter`.** Hội tụ với GPT
17/09 tối, và hướng đã **đổi so với bản nghiên cứu đầu**: không xây thêm một tầng Task/Workflow
mới — **nó đã tồn tại và đang chạy thật** ở `udin-optic/tu-dong/` (2.007 dòng, 13 file, đúng hình
`Task → Targets → Context → Action → Evidence`). Việc đúng là **rút phần dùng chung ra** khỏi
workflow thật ấy mà **không đẻ thêm một bản fork**.

Số đứng sau câu này, đo 17/09: bốn lõi của `duc-scouter` và `udin-optic` **giống nhau 0 dòng khác
trên 3.874 dòng** — nơi có ghim so từng byte thì hai bản chép đứng yên; nơi KHÔNG có ghim (bảng mã
lỗi Bridge) thì chúng **đã trôi**, và chỗ trôi ấy chính là `S-32`. Nên điều khoản ① của bản kiến
trúc phải nói về **ranh giới chép/fork**, không phải về tầng task. **Làm sau `Đ2`.**

**`N5` — NHÓM VIDEO** trong bảng *Udin làm được gì*. Hình dạng nhóm đã dựng sẵn, thêm đúng một
khối `[data-nhom="video"]`. **Chưa làm gì cho tới khi Udin thật sự có tính năng video.**

**`Đ3` — KIỂM TOÁN TIẾN TRÌNH WINDOWS.** Chỉ hỏi **nếu** máy chủ Bridge còn chết sau khi nhật ký
đời sống vào việc. Đổi cài đặt hệ thống, và nó chỉ đáng khi đã có một lần chết bắt được.

### Việc của TÔI, không phải của Đức — ghi ra để khỏi đẩy nhầm

`S-31` (Udin không tự nạp lại được) **không chờ Đức**. Đường mặc định ⒝ đã chốt: *gộp mọi lượt sửa
mã extension của một phiên, xin nạp lại **đúng một lần** ở cuối*. 17/09 tôi phá nó hai lần — một
lần xin hai lượt trong một phiên, một lần bắt Đức nạp lại cho **một lỗi không nằm trong extension**
(`G-99`).

### NĂM thứ ĐỪNG làm lại — mỗi cái đã tốn một lần

**⑴ ĐỪNG tin một dòng "X bị chặn bởi Y" mà chưa đo `Y`.** Ba hàng `W6` `W5` `W8` đều hoãn vì
`S-22`, và **cả ba lý do đều sai** — lý do thật lần lượt là: thao tác không tồn tại · cột "Cần"
khai sai · chỗ đặt sai. Một lý do hoãn là lời khai duy nhất **không ai đi kiểm lại**, nên nó
sống lâu hơn mọi lời khai khác. Bỏ mười phút đo `Y` trước.

**⑵ ĐỪNG đi xin Đức một điều kiện mình tự dựng được.** `T10` từng khai *"chặn bởi: cần Đức mở
một tab trắng"*. Sai — phép đo ấy phải được phép **giết tiến trình vẽ trang**, thứ không bao giờ
làm được trên tab thật; nó cần một Chrome **của riêng nó**, và `scripts/chrome-do.mjs` dựng cái
đó trong mười dòng. Đức đã nói thẳng: *"từ sau đừng dừng lại hỏi tôi câu bạn tự làm được nhé."*

**⑶ ĐỪNG mở `Accessibility.getPartialAXTree`.** Đã cân và **rút lại**: đường đang dùng tốn
~390 ms mỗi lệnh gõ (đối chứng: một lượt dò trần 15 ms). Muốn mở lại thì phải có **số mới**.

**⑷ ĐỪNG để `Page.setInterceptFileChooserDialog` ở trạng thái BẬT.** Lúc ấy hộp thoại chọn tệp
mà **chính Đức** mở cũng im lặng không hiện, và không một thông báo nào chỉ về nguyên nhân. Nó
chỉ được bật trong lòng một lượt `input.upload`, và lượt tắt nằm trong `finally`. Con `U11` canh.

**⑸ MỘT HÀNG ĐẠT NÓI *“làm được”*, KHÔNG nói *“lần nào cũng được”*.** `W8` xanh sáng 16/09 trên
một trang vừa nạp lại, chưa có ảnh nào đính kèm, Udin còn rỗng chỗ. Tối cùng ngày, cùng lệnh ấy,
cùng trên chính cái ghế đó: `scout.upload` vẫn báo `files: 1` và trang **không nhận ảnh nào**.
Một lượt đo ĐẠT là một ĐIỂM, không phải một đường — nên mọi lệnh ghi vẫn phải **đếm lại trên
trang**, kể cả lệnh đã có một dòng ĐẠT trong bảng.

### Một thói quen đã trả tiền năm lần trong hai ngày

**Đo tiền đề TRƯỚC khi xây, không phải sau.** Năm lần một đề bài viết sẵn bị lật khi đem đi đo:
`W6` (thao tác không tồn tại) · `W5` (`scout.a11y` không có trên dây) · `T29` (đặt nhầm gói) ·
`W8` (trang không có ô nhận file) · và chính Chrome (nhận cả đường dẫn không tồn tại, gắn một
tệp rỗng, không báo lỗi). Bốn cái đầu đáng lẽ đo được trong năm phút.

## CHUỖI ĐANG CHẠY — làm đường GHI thôi nói dối, rồi mới ký `v1`

> **Đức chốt 16/09: *“sửa trước, rồi ký”*.** Khối này là chuỗi việc đang chạy, không còn là đề xuất.
> Chạy một mạch `S1`→`S3`; còn **đúng một điểm dừng**, ở cuối: chữ ký của Đức cho `v1`.

### Vấn đề, đo bằng mã chứ không bằng trí nhớ (16/09)

| đo gì | thấy gì |
|---|---|
| `scout.type` trả về gì | `typed: text.length` — **số phím nó GỬI ĐI**, không phải thứ trang nhận được |
| `scout.clear` trả về gì | `steps: ["Ctrl+A","Delete"]` — cùng hình dạng: kể việc mình làm |
| số chỗ **đọc lại** sau khi ghi, trong cả lõi ghi | **0** |

Tức đường ghi **fail-open**: nó báo ĐẠT cho một việc có thể chưa xảy ra. Đó chính là `S-22`,
và `S-22` **có hai nửa**:

  ① *vì sao sự kiện không tới trang* — **Đức đã chốt ngừng điều tra** (bảng theo dõi, `T28`). Đóng.
  ② *đường ghi thôi báo ĐẠT khi sự kiện không tới nơi* — **chưa ai làm**. Đây là nửa được đề xuất.

Điều kiện đóng của `S-22` **cho phép đóng mà không cần biết nguyên nhân** — nó viết sẵn như vậy.

### MỘT PHÂN BIỆT QUAN TRỌNG, đừng bỏ qua

**Lượt E2E sáng 16/09 KHÔNG phải một lời nói dối.** Nó an toàn vì `W4` **đọc lại** câu trả lời
và từ chối nếu chữ không đổi — tức **cả chuỗi tự kiểm ở cuối**. Thứ fail-open là **từng lệnh
riêng lẻ**. Nguy hiểm rơi vào ai dùng `scout.type`/`scout.click` trực tiếp mà không có một
`W4` ở cuối — tức `T35`, `T7`, và **mọi job mới**.

### Bốn chặng, không chặng nào cần method Bridge MỚI

**S1 · `scout.type` TỰ KIỂM — ✅ XONG 16/09.** Gõ xong thì đọc lại ô nhập. Khớp →
`da_kiem: true` · lệch → ném `WRITE_NOT_OBSERVED` · không đọc được → khai thật.
*Đóng bằng:* bảy con đột biến ở phần phán + bốn con ở đường nối, **giết được hết** — trong đó
`TK9` là *“bỏ lượt đọc lại”* và `TK2` là *“quay về phép có chứa”*. Một lượt chạy trên Chrome
thật (`npm run scouter:doc-lai`) **ĐẠT trên bốn loại ô**.

> **PHÉP ĐO ĐẢO NGƯỢC MỘT GIẢ ĐỊNH CỦA CHÍNH KHỐI NÀY.** Trên đây viết *“ô giàu là ca không đọc
> được”*. Đo ra **ngược hẳn**: `<input>` và `<textarea>` giữ chữ ở **thuộc tính đối tượng** nên
> cây DOM đọc ra **rỗng**; ô `contenteditable` thì đọc được. Nên đường đọc chọn theo **tên thẻ**.
> Ca *“không đọc được”* thật là **ô che nội dung** (`type="password"` trả về chuỗi dấu che) và
> **bản đọc bị cắt ở trần**. Ba trạng thái vẫn đúng — chỉ là trạng thái thứ ba rơi vào chỗ khác.

**S2 · `scout.click` KHAI THẬT — ✅ XONG 16/09.** Không đưa mốc thì trả `da_kiem: false`
kèm một câu; đưa `wait_for` (kèm `wait_state` `present`/`absent`) thì kiểm được, và
không xảy ra thì **ĐỎ** (`CLICK_NOT_OBSERVED`). *Đóng bằng:* `TK12`–`TK17` giết được hết.
`README` nói thẳng, có ví dụ. **Không thêm lệnh nào** — `wait_for` là một tham số.

**S3 · Mang sang Udin — ✅ XONG 16/09, E2E thật đã chạy.** Bốn tệp ghim so từng
byte đã đồng bộ (thêm tệp mới `tu-kiem-ghi.mjs` vào bảng `CẶP`); `bridge-core.mjs` riêng
của Udin nhận hai mã lỗi và `wait_for`. **Suite hai bên xanh · đột biến 0 sống sót.**

> **Ô prompt của Udin là `textarea.agent-textarea`** — không phải ô giàu như ghi chú hôm qua —
> nên nó đi **đường trợ năng**. **Đã đo trên ghế sống 16/09: ~390 ms mỗi lượt gõ**, đã gồm hai
> lượt kéo cây trợ năng (đối chứng: `scout.query` trần 15 ms). Rẻ.
>
> **E2E thật 16/09** (`--du-an "s1-nghiem-thu"`, prompt mới): W1→W2→W3→JPG→W4 trọn vẹn ·
> 4 tệp mở đầu `FF D8 FF`, cỡ khớp **từng byte** với báo cáo · 4 bản `.webp` gốc còn nguyên.
> Trên chính lượt đó `scout.type` trả `da_kiem: true` qua đường trợ năng.

**S4 · ✅ ĐỨC KÝ `v1` — 16/09. Chuỗi đóng.** `manifest.json` khai `1.0.0`, `STATUS`
chuyển sang `active`. Chữ ký đứng ở [ADR-0008](docs/adr/0008-duc-ky-scouter-v1.md), và nó ghi
**năm điều `v1` hứa** cùng **bốn điều nó KHÔNG hứa** — đọc mục thứ hai trước khi dựng gói mới.
Thư mục vẫn là `v0.1.0`: tên thư mục là một **đường dẫn**, không phải một phiên bản.

### ĐẶT SAU, có lý do

`T29` (`scout.upload` → `W8`) cần một **method Bridge MỚI** → đổi luật an toàn → phải hỏi Đức.
`T35` (`W6` đưa ảnh vào canvas) là **một cú bấm** — nó đứng ngay trên `S1`/`S2`: làm nó
trước thì không có cách nào biết nó chạy hay không.

### ĐÃ CHỐT 16/09

Đức chọn **sửa trước rồi ký**. Lý do anh nhận: ký `v1` là đóng dấu *“bộ đồ nghề này chạy
được”*, mà hôm nay đường ghi chưa giữ được lời hứa đó.

**Ba quyết định lấy trước để chuỗi không phải dừng hỏi:**

**① Không thêm method Bridge nào.** `S1` dùng đường đọc đã có; `S2` thêm một **tham số** cho
`scout.click`, không phải một lệnh mới. Từ vựng giữ nguyên **24** (Scouter) và **12** (Udin) —
cả hai đều là hợp đồng `deepEqual`, thêm một chữ cũng đỏ.

**② Trường mới trong kết quả là thêm, không phải đổi.** Lượt gọi cũ không đọc trường đó vẫn chạy y
như cũ. **Nhưng** khi đọc lại mà **lệch**, `scout.type` phải **NÉM**, không được trả về kèm một
cờ buồn — một phong bì thành công chở một thất bại là thứ người gọi phải **nhớ mà bóc**, và sớm muộn
sẽ có người quên. Đây đúng lý lẽ `seed-core` đã dùng cho `runProbe`.

**③ Ô nhập giàu (contenteditable) không được làm `S1` dừng.** Trang Udin dùng loại ô đó. Nếu đọc
lại không ra chữ thì **khai là chưa kiểm được**, KHÔNG ném và cũng KHÔNG im lặng báo đạt — hai thái
cực đều sai. Ba trạng thái: **khớp** · **lệch (ném)** · **không đọc được (khai thật)**.

### Thứ KHÔNG làm trong chuỗi này

**Đừng đi tìm nguyên nhân `S-22`.** Đức đã chốt ngừng điều tra (`T28`), và chuỗi này **không
cần** biết nguyên nhân — nó chỉ làm kết quả **thôi nói dối**. Một lượt điều tra mới là một lượt
mở lại một việc đã đóng có chủ đích.

**Đừng nới thời gian chờ.** Nếu đọc lại thấy lệch, câu trả lời là **báo lệch**, không phải chờ lâu
hơn rồi đọc lại cho tới khi nó khớp — `S-22` đã ghi rõ: nới hạn chờ là **sai hoàn toàn hướng**.

## Bảng theo dõi — Đức nhìn một cái là biết đang ở đâu

**Mục đích của mọi việc dưới đây, Đức đặt lại 14/09:** *hoàn thiện nốt Scouter, rồi mới tách Udin
Optic ra — để sau khi tách không phải sửa sâu vào Scouter nữa.* Nên thứ tự không còn chạy theo
"việc nào dễ" mà theo **danh sách đóng băng** ở `docs/CAPABILITIES.md` §5.2.

| | Việc | Chặn bởi | Trạng thái |
|---|---|---|---|
| **T24** | **`S-25` — ghép được tin WebSocket bị cắt mảnh** | — | **XONG 14/09.** 9 khối ghim (có một tin **1 MiB cắt mảnh đi trọn qua socket thật**) · 4 đột biến. Khối ① so thẳng với bản gốc trong gói đóng băng: tin KHÔNG cắt mảnh cư xử y hệt |
| **T25** | **`scout.view`** — ĐỌC cuộn · khung nhìn · cỡ tài liệu · còn bao nhiêu để cuộn · thu phóng | — | **XONG + CHẠY THẬT 14/09** trên ba trang (`G-70` `G-73`) |
| **T26** | `scout.scroll` (`I5`) | T25 | **XONG + CHẠY THẬT 14/09.** Bản đầu (bánh xe) treo và **khoá cả tab** (`G-72`) — đổi sang `DOM.scrollIntoViewIfNeeded`, cuộn **1.972 điểm ảnh** đo bằng `scout.view` (`G-73`) |
| **T27** | `O12` thu phóng | T25 | **NỬA ⑴ XONG 14/09**: `scout.shot` nhận `full_page` + `scale`. Đo thật: thắng lớn ở **trang dài** (bốn lần diện tích, hai phần ba số byte), nhưng **trên artboard thì KHÔNG được gì** — tài liệu đúng bằng khung nhìn nên không có gì thêm để chụp. ~~**Nửa ⑵ chặn bởi KIẾN TRÚC** → `G-69`~~ → **HẾT CHẶN 14/09**: `G-65` đo ra **SAI** (zoom không vẽ thêm phần tử nào, `*` 581 → 581 khi khung nhìn nở 2,25 lần), nên nửa ⑵ mất lý do tồn tại; và `G-79` chỉ ra đường rẻ hơn — thu phóng trình duyệt là thiết lập của Đức, `scout.view` **kiểm** được nó, không cần đổi vòng đời gắn debugger |
| **T28** | `scout.hover` (`I6`) · `scout.click` nhận `button`+`click_count` (`I7`) | T25 | **XONG về mã.** Chạy thật: lệnh hoàn tất, **trang không nhận** — đó là `S-22`, Đức đã chốt ngừng điều tra. Dừng ở `CÓ` (`G-74`) |
| **⓪** | **Chốt `W` nào BẮT BUỘC trước khi tách** | — | **câu của Đức — nhưng nay chỉ còn là chữ ký.** Danh sách đề xuất `W1 W2 W3 W4 W7` + E2E **đã ĐẠT trọn** ngày 14/09, nên ⓪ không còn định cỡ gì nữa: gật là đủ điều kiện tách, hoặc nói thêm `W` nào |
| **T33** | **Chạy lại E2E TRỌN VẸN** trên Udin | — | **XONG + CHẠY THẬT 14/09: 4/4 ảnh**, kích thước trên đĩa khớp từng byte, **9 đơn vị** trần ghi cho cả bốn (lượt trước: 16 cho MỘT). Không viết thêm một dòng nào — `TRIALS` 14/09, `G-68` `G-78` |
| **T34** | `W4` — đọc câu trả lời chữ của agent | T33 | **XONG + CHẠY THẬT 14/09** — `doc-tra-loi.mjs`, nay là chặng thứ tư của E2E. Đọc đúng câu trả lời cho prompt vừa gửi (`G-76`) |
| **T35** | ~~`W6` đưa một ảnh vào canvas~~ → **thêm một KHUNG vào canvas** | — | **XONG + CHẠY THẬT 16/09** — `them-khung.mjs`, 8 → 9 khung. **Hai tiền đề của chính dòng này bị lật:** thao tác *“đưa ảnh lên canvas”* **không tồn tại** (ảnh kết quả đã ở trên canvas), và `S-22` **không** bít nó — cú bấm tới trang bốn lần liên tiếp hôm nay. 6 đột biến tay, giết được hết |
| **T36** | `W7` — gửi prompt lần hai trên cùng ô | T33 | **XONG + CHẠY THẬT 14/09** — cờ `xoaOCu` trong `gui-prompt.mjs`; **lời từ chối cũ giữ nguyên làm mặc định** (`G-77`) |
| **T29** | `scout.upload` (`I9`) → `W8` | **HOÃN CÓ CHỦ Ý** (`D4` chốt 16/09) | **dòng năng lực CUỐI CÙNG** của danh sách đóng băng. Gói quyết định viết xong 16/09 ở mục `D4`: phần đường dẫn **đã có sẵn** (`trongGoc` của `file-core.mjs`, chặn cả bốn dạng vượt rào), nên chỉ còn **một** dòng phải hỏi — thêm `DOM.setFileInputFiles` vào `WRITE_CDP_METHODS` |
| **T30** | `N5` lùi / tiến — `scout.history` | — | **XONG + CHẠY THẬT 14/09**: Udin → trang thử → `back` về đúng Udin |
| **T31** | Sau `T24`: **nâng lại trần khúc** của `scout.grab` | T24 | **XONG + ĐO THẬT 14/09**: 64 KiB → **512 KiB**; ảnh 688.088 byte về **2 khúc** thay vì 14, ghép lại khớp từng byte trên đĩa |
| **T32** | **Chạy thật cả chặng ②** | — | **XONG 14/09.** Bốn lên `ĐÃ CHỨNG MINH` (`O13` `N5` `I5` `O5`); hai dừng ở `CÓ` vì `S-22` (`I6` `I7`). Đường chia đúng bằng *lệnh DOM* / *sự kiện chuột* |
| **T16** | Dấu chẩn đoán của trang thử đọc được bằng **giá trị** | — | **XONG 14/09** — ô `#dau-chan` chép mọi dấu sang CHỮ, một lượt `scout.text` ra cả bảng (`G-80`). Bản đầu vẽ qua `setTimeout` và chết vì tab nền bóp nghẹt bộ đếm giờ — `G-81` |
| **T8** | `S-03` — đổi tên `observer` → `scouter` | T24…T30 | mốc **ĐÓNG BĂNG SEED** |
| **T9** | Đóng gói `v1` | — | đường cài đặt XONG 15/09; chờ Đức chốt phiên bản |
| **T21** | **Tách Udin thành EXTENSION riêng** | — | **CHẶNG ①②③④ ĐÓNG 15/09.** Gói `workers/udin-optic/` sống riêng: 12 method, quyền một trang, 4 ảnh xuống đĩa từ extension của chính nó, **và `git status workers/duc-scouter` SẠCH**. Còn chặng ⑤ dọn sổ |
| **T7** | Đóng vòng tự cải tiến MỘT lần | — | ✅ **KHÉP 14/09** — `pilots/t7-tu-sinh/` |
| **T6** | `S-20` — nghe mạng trong lúc bấm | ~~T7 cho biết có thật cần không~~ | **ĐÓNG 16/09 bằng đường ⒝** — chấp nhận giới hạn, ghi thẳng vào `README.md`. Đóng bằng một **phép đếm**: **0 chỗ gọi `scout.network`** trong cả repo (mọi chỗ khớp là chính nơi định nghĩa nó); `T7` khép, `T21` tách xong, bảy `W` ĐẠT — đều không cần nó. Đường ⒜ vẫn nằm sẵn ở mục `T6` cho ngày có việc thật |
| **T10** | `S-21` — target không trả lời câu hỏi hình học | — | **ĐÓNG 16/09 — TÁI HIỆN ĐƯỢC.** `npm run scouter:hinh-hoc` giết tiến trình vẽ trang bằng `Page.crash` → hỏi-điểm và ảnh chụp cùng chết, **một lượt điều hướng làm cả ba lành lại** — đúng hình dạng 12/09. Giả thuyết ⒝ cũng chết (gắn hai phiên rồi nhả một: hình học không hề hấn). Còn ⒞ *renderer bị thay*, và nó đúng. Cách nhận ra đã vào `README.md`, kèm phân biệt với ca **nodeId cũ** — ca đó chữa bằng hỏi lại selector, không phải điều hướng |
| ~~T13 T15 T22 T18 T17~~ | grab · E2E · quá-giờ · `scout.text` · ghim bảng | — | **XONG 14/09** |
| ~~T14 D3 D2 T12 T1–T4 T11~~ | `S-22` · `scout.focus` · tên ghế · `scout.fetch` · `S-16`…`S-19` `S-23` | — | **đóng 12–14/09** |

## Lộ trình — ba chặng, và mỗi chặng đóng khi có gì

**Chặng ①  SỬA NỀN** (`T24`, `T31`) — *một lỗi đang thu hẹp mọi năng lực khác.*
Không mở năng lực nào, nhưng nó đang làm `scout.shot` chết và ép mỗi ảnh tốn 16 đơn vị trần ghi.
**Đóng khi:** một tin 1 MiB đi trọn qua dây thật · `scout.shot` chạy lại trên Udin · `scout.grab`
lấy một ảnh 746 KB trong ≤ 2 khúc · và có phép ghim chứng minh **tin KHÔNG cắt mảnh cư xử y hệt
như trước** (vì lõi này dùng chung với ba gói đóng băng).

**Chặng ②  NHÌN & ĐI LẠI** (`T25` → `T30`) — *nhóm Đức gộp lại, và nó đúng hơn cách bảng đang chia.*
Bốn thứ trả lời cùng một câu: **Scouter đang nhìn vào phần nào của trang** — mà `usable` đứng trên
câu đó, nên mọi lượt bấm cũng vậy. **`T25` đi trước và không được đảo thứ tự**: đọc trước, ghi sau.
**Đóng khi:** mỗi lệnh có một lượt chạy thật · mỗi lệnh ghi **kiểm bằng `scout.view`**, không tin
lời báo của chính nó · và lõi GHI thôi phải tự đọc độ cuộn bằng mẹo hộp `:root` (`G-24`).

**Chặng ③  ĐÓNG BĂNG rồi TÁCH** (`T8`, `T9`, `T21`) — *đích Đức đặt ngày 14/09.*
**Đóng khi:** các `W` bắt buộc của Udin ĐẠT **từ gói mới**, và **không một dòng nào của Scouter
phải sửa**. Đó là phép kiểm duy nhất chứng minh việc tách đã thành.

**T11 chen lên đầu ngày 12/09, và đây là lý do:** lượt chạy T7 đo được rằng `scout.click` và
`scout.type` **báo ĐẠT trong khi trang không nhận được gì**. Mọi việc còn lại trong chuỗi đều
đứng trên đường ghi đó — T7 chặng 4, T5, T6 — nên làm tiếp trước khi biết đường ghi có nói thật
hay không là **xây trên một con số không kiểm được**. T11 rẻ: phép thử đầu tiên tốn của Đức 10
giây (xem `S-22` giả thuyết ⒜).

**T7 đã KHÉP 14/09** trên Udin — dò → sinh adapter → chạy, một mạch, `4 ảnh mới trong 39 giây`
(chi tiết ở mục `T7`). Lưu ý đừng đọc nhầm: `T7` khép được là nhờ **đổi trang đích sang Udin**,
**không** phải nhờ `S-22` được chữa — `S-22` vẫn đóng theo quyết định ngừng điều tra của Đức, và
trang thử vẫn không nhận sự kiện nhập. Hai câu khác nhau, đừng gộp.

Thứ `T7` mở khoá: `T9` (đóng gói seed v1) tự khai *"chỉ làm sau T7"* — nay hết chặn.

---

## ~~T24 T25 T26 T27⑴ T28 T30 T31 T32~~ — XONG 14/09

Chi tiết đã chuyển chỗ thay vì ở lại đây làm nền: bằng chứng ở `docs/GIA-THUYET.md`
(`G-67`…`G-75`), lý do thiết kế ở `docs/adr/0007-…`, và chuyện kể ở `HANDOFF.md` hai mục
`2026-09-14` / `2026-09-14b`. Ba điều đáng mang theo:

- **`S-25` là một dòng** — bộ giải khung WebSocket ném ở mọi mảnh nối, mà Chrome cắt mảnh mọi tin
  vượt ~64 KiB. Một ca **chưa viết**, không phải một lớp bảo vệ.
- **Đường chia của `T32`**: năng lực đi qua **lệnh DOM** chứng minh được trên ghế Đức; năng lực đi
  qua **đường sự kiện chuột** thì không (`S-22`). Nhớ nó trước khi gỡ lỗi bất cứ `W` nào.
- **`G-72`**: một lệnh CDP không trả lời thì **giữ debugger cắm vào tab** và khoá mọi lệnh sau.
  Chữa bằng `CDP_HAN_MS` ở cả hai lõi. Gặp `TARGET_ALREADY_ATTACHED` kéo dài thì `scout.reload`.

## ⓪ · `W` nào BẮT BUỘC trước khi tách  ⟵ *câu của Đức, và nó đứng trước mọi việc khác*

Bảng `W` ở `docs/CAPABILITIES.md` §4 từ ngày dựng đã ghi *"Đức chốt mục nào bắt buộc"*, và **chưa
ai trả lời**. Tới hôm nay nó chỉ là một ô trống; từ hôm nay nó là **thứ định cỡ phần còn lại**, vì
điều kiện đóng của `T21` là *"các `W` **bắt buộc** ĐẠT từ gói mới"*.

Đang có: `W1` `W2` `W3` **ĐẠT** · `W4` `W6` `W7` **hết chặn, chưa làm** · `W5` chưa làm ·
`W8` chặn bởi `I9` (`T29`).

**Đề xuất của tôi, để Đức chỉ phải gật hoặc sửa:** bắt buộc = `W1` `W2` `W3` `W4` `W7` + `E2E`
trọn vẹn. Lý do: năm cái đó là **một phiên làm việc khép kín** — vào được, ra lệnh được, biết nó
nói gì, lấy được kết quả, và ra lệnh tiếp lần hai. `W5` `W6` là tiện nghi một cú bấm và **đang
dính `S-22`**; `W8` cần `T29`. Để hai nhóm đó ngoài danh sách bắt buộc thì việc tách đi được ngay
sau `T29`, mà không mất năng lực nào — chúng vẫn làm được sau khi tách, từ gói mới.

## T33 T34 T36 · XONG 14/09 — đọc `TRIALS.md` hai dòng cuối

Ba việc đóng trong một lượt, vì cùng cần một thứ khan hiếm: **ghế sống + công tắc ghi đang mở**.
Ba điều đáng mang đi, phần còn lại ở `TRIALS.md` và `G-76` `G-77` `G-78`:

⑴ **`T33` không sửa một dòng adapter nào** mà đi từ 2/4 ảnh lên 4/4. Chỗ hỏng ngày trước chưa bao
giờ ở adapter — nó ở tầng vận chuyển. *Sửa đúng gốc thì việc ở tầng trên tự xong.*

⑵ **Lời từ chối của `gui-prompt` là một lớp bảo vệ.** Mở `W7` bằng một cờ người gọi phải XIN,
không hạ lời từ chối xuống cho tiện. Mặc định vẫn từ chối, và có phép ghim canh đúng chỗ đó.

⑶ **Selector nghe hợp lý nhất khớp 20.** `:last-of-type` xét theo tên thẻ trong TỪNG cha. Luôn
hỏi lại trang từng ứng viên — đây là lần thứ hai cơ chế ấy cứu một chặng (`G-54`, rồi `G-76`).

## T35 · `W6`  ⟵ ✅ **XONG 16/09**, và nó lật hai tiền đề

**Thao tác mà bảng `W` khai từ 13/09 — *“đưa một ảnh kết quả vào canvas”* — KHÔNG TỒN TẠI.**
Đo lại trên chính trang đó, ba chỗ cùng lúc:

  ⑴ ảnh kết quả **đã nằm trên canvas rồi**, dưới dạng một lưới bốn ô (`.is-batch-grid`);
  ⑵ nút *Add to canvas* là nút **mở MENU** bốn mục — `Frame` · `Image` · `Video` · `3D Model`
     — tức thêm một đối tượng **mới, rỗng**;
  ⑶ đếm trọn **54 nút** của trang: không có nút nào riêng trên từng ảnh kết quả.

**Và lý do hoãn cũng sai.** Khối này đoán `T35` sẽ hỏng vì `S-22` (*“cú bấm không tới trang”*).
Ngày 16/09 cú bấm tới trang **bốn lần liên tiếp** trên đúng ghế ấy. Thứ chặn `W6` chưa bao giờ là
đường sự kiện chuột — là **một thao tác không có thật**. *Một dòng bảng năng lực là một LỜI KHAI.*

**`W6` nay là: thêm một KHUNG vào canvas** — nhánh duy nhất của menu ấy chạy trọn mà không cần
một tệp nào. Không phải đồ trang trí: ở Optic, khung là chỗ một lượt sinh ảnh đổ kết quả vào.
Hợp đồng đầy đủ ở đầu `udin-optic/tu-dong/them-khung.mjs`; đo thật **8 → 9**.

**Chốt của cả chặng, và nó là bài học `S1` lặp lại:** menu tắt **không** chứng minh khung đã thêm —
bấm lại chính nút mở menu cũng làm nó tắt. Chỉ **phép đếm trước/sau** phân biệt được hai chuyện đó.
Con `D1` và `D2` canh đúng chỗ ấy.

**Một phép đo KHÔNG được phép chạy, ghi ra thay vì giả vờ không có:** bấm thử `Image` để biết nó
mở gì. Nếu nó dựng một hộp thoại hệ điều hành thì hộp thoại đó **treo Chrome của Đức** cho tới khi
có người bấm tay — một phép đo không được đắt hơn thứ nó đo. Ba mục `Image`/`Video`/`3D Model`
bị từ chối **theo rủi ro**, và khai đúng là **chưa đo**. Chúng thuộc `W8`/`T29`.

## T29 · `scout.upload` (`I9`) — đưa một tệp vào trang

**Chỉ nhận đường dẫn TƯƠNG ĐỐI**, và **máy chủ Bridge** ghép nó vào vùng ghi rồi mới chuyển xuống
extension. Lý do: chỉ máy chủ biết vùng ghi ở đâu, nên chỉ nó kiểm được đường dẫn có chui ra
ngoài không. Nhận đường dẫn tuyệt đối từ ngoài dây là giao cả ổ đĩa của Đức cho người gọi.

Cần method CDP mới `DOM.setFileInputFiles`. Scouter có **Bridge host riêng**
(`v0.1.0/bridge/scouter-bridge-host.mjs`), nên việc này **không** đụng lõi dùng chung.

· **đóng khi:** `..` và đường dẫn tuyệt đối bị từ chối ở MÁY CHỦ (có phép ghim) · phần tử không
phải `<input type=file>` thì từ chối · một lượt chạy thật đưa được một ảnh từ vùng ghi vào trang.

## ~~Q1~~ · Chính sách che `de-xuat-chat-v1` — Đức chốt 14/09: **đường ⒝**

Ký chính sách **nguyên bản**, kèm **một cửa hẹp**: `scout.text` trả chữ của **MỘT** phần tử khớp
selector — không cả trang, không `outerHTML`, trần 5.000 ký tự, khớp 0 hay 2+ thì từ chối.
Điều khoản *"không trả chữ"* nay đọc là **"không trả chữ hàng loạt"**: cái được bảo vệ là
**khối lượng**. Lý do đầy đủ ở [ADR-0006](docs/adr/0006-chinh-sach-che-va-cua-hep-doc-chu.md).

Kéo theo: `O8` hết chặn, làm xong cùng ngày (`T18`), và `scout.grab` thôi đứng trên một luật
chưa ai ký. **Không còn câu chính sách nào treo.**

## T13 — nối `lay-anh.mjs` sang `scout.grab` · việc kế, không chờ ai

`scout.grab` đã có (14/09, Đức chốt `S-24` đường ⒜): đưa **selector**, extension tự đọc `src`
đầy đủ bên trong rồi tải luôn, trả **byte** — URL ký sẵn không ra khỏi trình duyệt. Nhưng
`pilots/udin-optic/scripts/lay-anh.mjs` **vẫn đang gọi `scout.fetch`**, tức là vẫn sẽ 403.

Việc: đổi `lay-anh.mjs` sang `scout.grab`. Chỗ gợn duy nhất — grab nhận **một** selector khớp
**đúng một** phần tử, mà trang có bốn ảnh, nên adapter phải đánh số: `img.batch-grid-image` thứ
n gọi bằng `:nth-of-type` hoặc một selector riêng. **Đếm ảnh vẫn bằng `scout.query`** (masked
src đủ để phân biệt ảnh mới/cũ), chỉ lượt TẢI mới qua grab.

**MÃ XONG 14/09.** `lay-anh.mjs` không còn lượt gọi `scout.fetch` nào (bốn lần còn lại trong file
đều là chú thích *vì sao* bỏ nó — đừng dùng `grep -c` làm phép kiểm, nó khớp cả văn của chính mình).

**Chỗ gợn giải thế nào, ghi ra vì nó không hiển nhiên:** grab đòi selector khớp **đúng một** phần
tử, mà trang ra **8 nút cho 4 ảnh**. Adapter **không đoán** `:nth-of-type`. Nó dựng bốn ứng viên
theo độ bền giảm dần — `#id` › `[data-testid]` › `[alt]` › `[src^=]` — rồi **hỏi lại trang từng
cái** bằng `scout.query` (đọc, không tiêu trần ghi), lấy cái đầu tiên khớp đúng một. Không cái nào
duy nhất thì **ĐỎ và kể ra đã thử gì**. Giá trị thuộc tính có `"` hoặc `\` thì **bỏ ứng viên đó**
thay vì đi thoát chuỗi cho khéo: một selector thoát sai không báo lỗi, nó lặng lẽ tải nhầm ảnh.

**Đã kiểm phép ghim có phân biệt được không** (bộ đột biến của repo không chạm tới adapter, nên
làm tay): bốn con — tin ứng viên đầu tiên không hỏi lại · nhận `>= 1` thay vì `=== 1` · bỏ phép
lọc dấu nháy · ảnh biến mất thì bỏ qua thay vì ĐỎ — **cả bốn giết được**.

### Lượt chạy thật 14/09 — ĐẠT ba chặng, ngã ở chặng tư, và nó dạy bốn điều

**ĐẠT:** `scout.grab` vào extension (18 method) · phép chọn selector chạy đúng trên trang thật —
`alt` **trùng 4 lần** nên bị loại, rơi xuống `[src^=]`, khớp **1** · grab tới được mạng · và
`scout.type` + `scout.click` gửi được prompt mới (Udin bắt đầu chạy).

**KHÔNG ĐẠT — `W3` vẫn CHƯA:** chưa ảnh nào xuống đĩa.

| | Đo được | Ghi ở |
|---|---|---|
| ⑴ | **URL ký sẵn hết hạn sau 900 giây.** Mọi ảnh trên trang là của 13/09 → grab trả **403**, đúng chứ không sai. Trình duyệt vẫn hiện chúng vì **cache** | `G-51` |
| ⑵ | **`src` của `scout.query` KHÔNG phải tiền tố của `src` trên trang** — lõi đọc gắn thêm dấu `…` báo đã cắt query. **23 khối ghim vẫn xanh** trên bản mã hỏng, vì máy giả của tôi trả `src` sạch | `G-53` |
| ⑶ | **`alt` khớp 4 phần tử**, không phải 1. Kế hoạch ban đầu định dùng `:nth-of-type` — nó sẽ **tải nhầm ảnh mà không ai biết**. Phép "hỏi lại trang từng ứng viên" là thứ cứu chỗ này | `G-54` |
| ⑷ | **Trần 300s vứt mất một lượt đã tiêu tiền:** adapter bỏ cuộc, Udin chạy tiếp **>17 phút**. *Quá giờ* và *hỏng* là hai câu khác nhau | `G-55` |

**Việc kế cho `W3` là `T22`, không phải chạy lại.** Chạy lại nguyên trạng sẽ tiêu thêm credit rồi
ngã đúng chỗ cũ. Và ⑴ đặt một ràng buộc cứng lên mọi thiết kế sau này: **`W3` phải chạy ngay sau
`W2`** — không có chuyện "thu kết quả sau".

## T22 — `gui-prompt` phải phân biệt *quá giờ* với *hỏng*  ⟵ *chặn `T13` và `T15`*

Lượt 14/09: `guiPrompt` hết trần 300s rồi ném *"Udin chạy quá 300s chưa xong"*, `e2e` bỏ cuộc, và
**W3 không bao giờ chạy** — trong khi Udin vẫn đang sinh ảnh và **credit đã tiêu**. Bốn ảnh sinh
ra xong rồi hết hạn sau 900 giây mà không ai lấy.

· **đóng khi:** ⑴ trần nâng lên (đề xuất 900s, bằng đúng hạn của URL — quá hạn đó thì ảnh có lấy
cũng 403) · ⑵ hết giờ trả một **mã riêng** kèm *"vẫn đang chạy"*, khác hẳn *"không chạy"* · ⑶ có
đường **nối lại một lượt đang dở**: đưa vào tập `src` trước lúc gửi, chờ ảnh mới, rồi `layAnh` —
để một lượt đã tiêu tiền không bị vứt vì tay người bấm Ctrl+C. Kèm phép ghim cho cả ba.

## ~~T14~~ — `S-22` ĐÓNG 14/09, và đây là bài học đắt nhất của cả chuỗi

**Đóng bằng LỜI KHAI, không bằng bản vá.** `README.md` nay nói thẳng: `scout.click` / `scout.type`
/ `scout.key` hứa *"đã bắn sự kiện thật vào đúng điểm của đúng phần tử"* và **không** hứa *"trang
đã nhận"*. Adapter tự đặt dấu kiểm trên trang — `W1` và `W2` của Udin đã làm đúng thế và **ĐẠT
trên trang thật**. Tức là giới hạn này **không chặn việc thật**; nó chỉ chặn việc tin lời báo.

**Vì sao dừng điều tra — Đức chỉ ra 14/09, và sổ giả thuyết xác nhận:**

Cùng một câu hỏi *"tab ẩn có làm mất cú bấm không"* đã được mở **NĂM lần**:

| lần | mã | kết quả |
|---|---|---|
| 1 | `G-07` (13/09) | **SAI** — và Đức nói rõ hôm đó là chính anh đã tự debug trước |
| 2 | `G-38` (14/09) | **SAI** |
| 3 | `G-40` (14/09, Chrome sạch) | **SAI** — tab nền vẫn nhận đủ |
| 4 | `G-42` (14/09, tab chưa từng hiện) | **SAI** |
| 5 | `G-47` + `G-49` (14/09) | **RÚT** — và `G-49` còn tiêu 18 lượt đo rồi vẫn không kết luận được |

Khối *Kết luận* của `GIA-THUYET.md` đã ghi **"tab ẩn — đừng thử lại"** *trước khi* tôi mở lần thứ
tư và thứ năm. Sổ đã làm đúng việc của nó; tôi không đọc lại sổ của chính mình.

> **Luật rút ra, áp cho mọi mục về sau:** mở lại một giả thuyết đã ghi `SAI` thì phải có **DỮ KIỆN
> MỚI** — một quan sát chưa từng có. **Một tương quan cũ đếm lại không phải dữ kiện mới.** Trước
> khi ghi một dòng `G-` mới, `grep` từ khoá của nó trong `GIA-THUYET.md`.

**Đường chưa thử duy nhất** nằm ở `G-50` (Chrome tự đông cứng renderer của tab nền — Memory Saver).
Nó ghi ở đó để không ai phải nghĩ lại từ đầu, **không phải** để mở chiến dịch thứ sáu. Kiểm nó tốn
một lượt mở `chrome://discards`, không tốn một buổi.

## ~~D3~~ · `scout.focus` — Đức trả lời 14/09: **KHÔNG**

> *"tôi muốn các cửa sổ extension chạy khi ẩn bên dưới, chỉ một số trường hợp ngoại lệ mới được
> on top. vì tôi còn phải làm các việc khác nữa."*

**Không mở `scout.focus` làm đường mặc định.** Kéo theo hai điều, cả hai đều đã đo được:

1. **Mọi adapter phải chạy được trên tab nền.** Đây không phải một rủi ro — `G-40` `G-41` `G-42`
   đã đo: tab nền · cửa sổ thu nhỏ · tab chưa từng hiện đều **nhận đủ** cú bấm.
2. Nếu về sau có một ca **thật sự** cần đưa tab lên trước, nó quay lại đây như một xin phép
   **riêng cho ca đó**, kèm tên ca — không phải như một năng lực chung.

## T16 — dấu chẩn đoán phải đọc được bằng GIÁ TRỊ (nợ của `G-48`)

Trang thử ghi `data-chuot` / `data-bam` là **bộ đếm**, nhưng `scout.query` không trả giá trị
`data-*`, nên mọi phép đo đang hỏi "có thuộc tính không". Câu đó chỉ đổi **một lần** (0→1), nên
từ cú bấm thứ hai trở đi phép đo mù — và nó đã làm tôi kết luận ngược hẳn trong hai lượt ngày
14/09. Cách chữa rẻ nhất: trang thử ghi thêm **một class theo số đếm** (`bam-0`, `bam-1`…) để
selector đọc được, hoặc adapter dò `[data-bam="n"]` như `scratchpad/do-cap-doi.mjs` đang làm.

## ~~T12~~ — CHẾT 14/09, giữ lại vì nó dạy một điều

T12 là kế hoạch lấy ảnh bằng `scout.fetch`. Chạy thật ngày 14/09: **403**. Ảnh Udin nằm sau
**URL ký sẵn**, chữ ký nằm trong query, mà lõi đọc cắt query khỏi mọi `src`/`href` theo chính
sách che — cắt đúng chỗ cần. Đó là **bảo vệ làm đúng việc**, không phải bug, nên không được nới.
Đức chốt đường ⒜ (`S-24`) và `scout.grab` ra đời. Việc kế nay là **T13**.

Điều nó dạy, ghi để đừng lặp: **một đường lấy dữ liệu chưa chạy thật lần nào thì chưa phải một
đường** — 20 khối ghim, 14 đột biến và ba vòng audit đều xanh trên một thiết kế mà lượt gọi thật
đầu tiên bác bỏ trong 10 giây.

## ĐÃ XONG 12/09 — T1, T2, T3, T4

Cả hai đóng, có phép ghim hai chiều, đột biến giết được, và **đo ngoài đời qua Bridge thật** trên
một trang tự dựng. Chi tiết ở `BACKLOG.md` mục `S-17` và `S-18`; đừng chép lại đây.

**T3** đóng cùng ngày: `scout.navigate` nay nạp lại được cùng một URL — 15.000ms báo sai nguyên
nhân xuống còn 254ms báo đúng. Nó nhận HAI dấu hiệu đã-đi (url đổi · tài liệu được thay mới) vì
hai ca loại trừ nhau. Chi tiết ở `S-19`.

**T4** đóng cùng ngày: ba `deadline_ms` xuống 34.000, trần `timeout_ms` của `scout.navigate`
xuống 30.000, và ngưỡng 35 giây của máy chủ nay có TÊN (`DEFAULT_REQUEST_TIMEOUT_MS`) để phép
ghim `B9` đọc thẳng thay vì gõ lại. Chi tiết ở `S-16`.

**Một mục mới mở ra trong lúc làm: `S-21`** — một target thỉnh thoảng không trả lời được câu hỏi
hình học, nguyên nhân CHƯA BIẾT. Cả hai đường đã fail-closed và nói rõ "Chrome không trả lời
được" thay vì "bị chắn", nên không ai bấm nhầm; nhưng nó cần một lượt tái hiện có chủ ý. Đó là
**T10**.

**Và kế hoạch này đã tính thiếu một chỗ** — ghi ra để lượt sau đừng lặp lại: D1 chỉ xin một
method, trong khi T2 còn cần lõi đọc biết hộp của phần tử nằm ở đâu. Phải quay lại hỏi Đức giữa
chừng (D1b). Bài học: khi một việc nói *"dùng cùng phép hỏi của việc kia"*, đếm lại **cả** số
method mỗi bên cần, đừng cho rằng hai bên cần y hệt nhau.

## ~~D4~~ · `DOM.setFileInputFiles` cho `T29`/`W8` — **CHỐT 16/09: CHƯA MỞ, và đây là lý do**

> **Đức nói không hiểu câu hỏi và giao lại cho tôi quyết.** *“Đức đọc không hiểu = lỗi hệ thống”* —
> nên phần dưới giữ nguyên làm hồ sơ, còn khối này là lời chốt.

### Chốt: **CHƯA MỞ.** Mở vào ngày có một việc thật cần nó.

**Lý do, và nó là đúng cái thước tôi vừa dùng cách đây một giờ.** Sáng nay `T6` đóng bằng một
phép đếm: **0 chỗ gọi `scout.network`** trong cả repo, nên không xây đường ⒜ cho một nhu cầu
chưa ai có. Đếm lại `W8` bằng đúng thước ấy thì ra **cùng một con số 0**:

| hỏi gì | trả lời |
|---|---|
| việc nào đang chạy cần đưa tệp vào trang? | **không có** — `W1`→`W4` và E2E không đụng tới |
| `W8` có trong danh sách `W` **bắt buộc** Đức chốt không? | **không** — `CAPABILITIES` đã xếp nó *“để NGOÀI”* từ 14/09 |
| không mở thì có gì hỏng không? | **không** — bảng `W` dừng ở 7/8, mọi thứ khác đã đóng |

Dùng hai thước khác nhau cho hai việc giống nhau trong cùng một ngày thì cái thước ấy không
phải một luật, nó là một cái cớ.

**Và cái giá của việc mở thì không đối xứng.** Đây là **cánh cửa đầu tiên đi từ ĐĨA ra một
TRANG WEB** — mọi thứ Scouter có tới hôm nay đều đi chiều ngược lại (trang → đĩa). Một cánh cửa
mở ra vì *“sắp tới chắc sẽ cần”* thì không ai đóng lại, vì không có ngày nào nó hỏng để nhắc.

**Mở lại RẺ, và đó là phần làm lời chốt này an toàn.** Phần nguy hiểm nhất **đã xây xong và đã
ghim** — `trongGoc()` ở `bridge/file-core.mjs` chặn cả bốn dạng vượt rào (bảng bên dưới). Còn
lại đúng một dòng khai method và một lượt chạy thật. **Nửa buổi, không phải một chặng.**

### Mở khi nào — một câu, không phải một hồ sơ

> **Ngày Đức cần đưa một ẢNH THAM CHIẾU của mình vào Udin để nó sinh ảnh theo ảnh đó.**

Đó là việc thật duy nhất mà `W8` phục vụ. Anh nói một câu *“tôi cần đưa ảnh mẫu vào Udin”* là
tôi làm ngay — không phải hỏi lại `D4`, không phải cân lại gì, chính câu ấy **là** cái chốt.

### Ba điều KHÔNG phải lý do hoãn, ghi ra để lượt sau khỏi cân lại

⑴ **Không phải vì sợ lộ file.** `file.read` đã đọc được mọi tệp dưới vùng ghi từ 07/09.
⑵ **Không phải vì đường dẫn chưa an toàn.** Nó an toàn rồi, và đã có phép ghim.
⑶ **Không phải vì khó.** Nó dễ — đó chính là lý do phải cẩn thận với cái *“cứ mở sẵn đi”*.

### Thứ đã làm sẵn, để câu trả lời của anh chỉ còn là một chữ

Đo 16/09: **phần nguy hiểm nhất của việc này ĐÃ CÓ SẴN và đã được ghim từ lâu.** Kế hoạch cũ viết
*“máy chủ Bridge ghép đường dẫn vào vùng ghi rồi mới chuyển xuống”* như một thứ phải xây. Nó không
phải — `trongGoc(root, rel)` ở `bridge/file-core.mjs` đang làm đúng thế cho `file.write` từ 07/09,
và nó chặn cả bốn dạng vượt rào:

| dạng | bị chặn bởi |
|---|---|
| `C:\Users\...\passwords.txt` (tuyệt đối) | `path.isAbsolute` |
| `C:x.txt` (tương đối theo Ổ ĐĨA — `isAbsolute` trả `false`!) | phép kiểm `/^[A-Za-z]:/` riêng |
| `../../bi-mat.txt` | `path.relative`, **không** phải `startsWith` |
| một liên kết mềm NẰM TRONG vùng ghi trỏ ra ngoài | `realpathSync` trên tổ tiên có thật gần nhất |

Nên `T29` **không cần viết một dòng đường dẫn nào**. Nó còn lại đúng ba mảnh, và chỉ mảnh đầu là
thứ phải hỏi anh.

### Đổi đúng những gì

| | đổi gì | có phải luật an toàn không |
|---|---|---|
| ① | thêm `"DOM.setFileInputFiles"` vào `WRITE_CDP_METHODS` | **CÓ — đây là câu hỏi** |
| ② | thêm method `scout.upload` (từ vựng **24 → 25**, hợp đồng `deepEqual` đổi) | đi kèm ①, không có ① thì ② vô nghĩa |
| ③ | máy chủ gọi `trongGoc(root, rel)` rồi chuyển đường tuyệt đối xuống | **không** — dùng lại thứ đã có |

Scouter có **Bridge host riêng**, nên việc này **không đụng lõi dùng chung** của ba gói `duc-auto-*`.
Gói `udin-optic` khai 12 method và sẽ **không** nhận `scout.upload` trừ khi có một câu chốt riêng.

### Cái gì thật sự MỚI về mặt rủi ro — nói thẳng, đừng để anh phải đoán

**Không phải chuyện “lộ file”.** `file.read` đã đọc được mọi tệp dưới vùng ghi từ 07/09, nên
`scout.upload` **không mở thêm một byte nào** cho người gọi.

**Cái mới là HƯỚNG ĐI của byte.** `file.read` trả tệp về cho người gọi — tức về máy này.
`scout.upload` đặt tệp vào tay **một trang web**, và trang web thì gửi nó đi đâu là việc của nó.
Nói gọn: đây là lần đầu Scouter có một đường **từ đĩa ra Internet**.

**Thứ thu hẹp nó lại, và chúng có thật chứ không phải lời hứa:**

- **Chỉ đọc được vùng ghi**, mà vùng ghi là `…\Chrome Extension Bridge\duc-scouter\du-lieu` —
  một thư mục con dành riêng. Ổ đĩa còn lại không chạm tới được.
- **Tệp ghép cặp (có token) KHÔNG nằm trong vùng ghi**, và máy chủ **từ chối khởi động** nếu ai
  trỏ vùng ghi vào thư mục đang giữ nó. Chốt ấy đã có sẵn, không phải thêm cho việc này.
- **Vẫn qua cái phanh**: `scout.upload` là lệnh GHI, nên nó cần công tắc của anh và tiêu trần 200.
- **Selector phải khớp đúng MỘT `<input type=file>`**; khớp 0, khớp nhiều, hoặc khớp một thẻ khác
  thì từ chối — không đoán.

### Nếu anh lắc đầu

Không có gì hỏng. `W8` ở lại `CHẶN`, ba mục cần tệp của menu *Add to canvas* ở lại từ chối theo
rủi ro, và bảng `W` dừng ở **7/8**. Mọi việc khác đã đóng. Đây là một cánh cửa để mở khi cần,
không phải một chỗ đang rò.

· ~~**đóng khi:** anh trả lời.~~ **ĐÃ CHỐT 16/09: chưa mở** — xem khối đầu mục.
· **đóng thế nào nếu sau này ĐƯỢC:** `..`, đường tuyệt đối và `C:x.txt` bị từ chối **ở máy chủ** (đã có
phép ghim, thêm phép ghim cho đường mới) · phần tử không phải `<input type=file>` thì từ chối ·
**một lượt chạy thật** đưa được một ảnh từ vùng ghi vào trang.

## D1 · Đức chốt — mở khoá T1 và T2  ⟵ *đã chốt: ĐƯỢC*

`scout.click` hôm nay suy toạ độ từ hộp của đúng phần tử đã khớp, rồi bắn chuột vào đó. Nó
**không kiểm điểm ấy có thuộc về phần tử ấy không**. Có một lớp phủ chắn ngang thì chuột trúng
lớp phủ, và Scouter trả về **y hệt một lượt bấm thành công**.

Cách chữa cần hỏi Chrome một câu mới: *"điểm này là phần tử nào"* (`DOM.getNodeForLocation`).
Thêm một method CDP vào đường ghi là **đổi luật an toàn**, nên nó phải là chữ của Đức.

**Method này đọc hay ghi?** Đọc — nó hỏi, không sửa gì. Nhưng nó vào danh sách của *đường ghi*
vì chỗ cần nó là ngay trước lượt bắn chuột.

· **Đức trả lời "được"** → T1 và T2 chạy được ngay, không hỏi thêm gì.
· **Đức trả lời "không"** → T1 và T2 đóng bằng một dòng ghi lý do, và `README.md` phải nói rõ
`scout.click` hứa gì và **không** hứa gì. Chuỗi nhảy sang T3.

## D2 · Đức gõ tên cho hai ghế

Bảng bên → thẻ **Hệ thống** → khối *Tên ghế này*. **Mỗi ghế một tên KHÁC NHAU** — trùng tên thì
gọi tên đó không trúng ghế nào, quay lại đúng chỗ hỏng lúc chưa ai có tên. Không method Bridge
nào đặt tên được; đây là việc chỉ tay Đức làm.

Không chặn việc nào ở dưới, nhưng mọi lượt gọi trong chuỗi sẽ phải dán số ghế cho tới khi xong.

---

## T1 · `S-17` — bấm phải kiểm điểm bấm thuộc về ai  ⟵ *việc đầu tiên*

**Sửa ở:** `scripts/scouter-actions-core.mjs` (lõi GHI, không phải lõi đọc).

**Làm gì.** Sau khi có toạ độ và **trước khi** bắn chuột, hỏi Chrome phần tử nào nằm ở điểm đó.
Không phải phần tử đã khớp — cũng không phải con cháu của nó — thì **TỪ CHỐI**, đừng bấm.

**Vì sao phải nhận cả con cháu:** nút thật thường là `<button><svg><path>` và điểm giữa rơi
vào `<path>`. Chỉ nhận đúng nút thì mọi nút có icon đều bị từ chối oan.

**Mã lỗi riêng `CLICK_OBSCURED`**, không gộp vào `ACTION_FAILED`: *"có thứ khác chắn"* và
*"bấm rồi mà không ăn"* dẫn tới hai cách sửa khác nhau.

· **đóng khi:** có phép ghim dựng một lớp phủ lên đúng nút rồi chứng minh lượt bấm bị từ chối ·
có phép ghim chứng minh nút-có-icon KHÔNG bị từ chối oan · có ít nhất hai con đột biến (gỡ hẳn
bước kiểm; nới thành "nhận mọi phần tử") và cả hai **giết được** · `DOM.getNodeForLocation` đã
khai vào `WRITE_CDP_METHODS` kèm chú thích nói vì sao nó ở đó.

## T2 · `S-18` — `scout.wait` biết *dùng được*, không chỉ *có mặt*

**Làm cùng T1**, vì cùng một phép hỏi-điểm. Làm rời là trả giá hai lần cho một thứ.

**Chỗ hỏng, đo được 12/09:** chờ `textarea.agent-textarea` trả `satisfied` sau **36ms** trong
khi tấm chắn "User Limit Reached" phủ kín ứng dụng — cả cây DOM nằm nguyên bên dưới nên mọi
selector vẫn khớp.

**Làm gì.** `scout.wait` nhận thêm một `state` nghĩa là *dùng được* (đề xuất: `"usable"`), đo
bằng đúng phép hỏi-điểm của T1. **Giữ nguyên `present` làm mặc định** — đổi nghĩa một tham số
đang có là làm hỏng mọi lượt gọi đã viết.

**Nhưng lõi đọc KHÔNG được mượn method của lõi ghi** (luật gói số 6). Nên phải khai
`DOM.getNodeForLocation` vào **cả hai** danh sách, mỗi bên một dòng chú thích riêng. Trông như
trùng lặp; nó là ranh giới, giữ nguyên.

· **đóng khi:** phép ghim dựng lớp phủ chứng minh `state:"usable"` KHÔNG thoả trong khi
`state:"present"` thoả — hai câu trả lời khác nhau trên cùng một trang · `README.md` sửa lại
bảng lệnh · một con đột biến làm `usable` cư xử y như `present` và nó **giết được**.

## T3 · `S-19` — `scout.navigate` nạp lại được cùng một URL

**Chỗ hỏng:** nó chờ URL đổi. Đi tới đúng URL đang đứng thì URL không bao giờ đổi → treo 15 giây
rồi trả `NAVIGATE_TIMEOUT`, **một câu sai nguyên nhân** trong khi trang có thể đã tải lại thật.

Nạp lại trang là việc cơ bản của mọi vòng thuần hoá (thử lại từ trạng thái sạch), nên khuyết tật
này gặp ở mọi trang, không riêng Udin.

· **đóng khi:** lượt đi tới URL trùng URL hiện tại được nhận ra và chờ bằng một tín hiệu KHÁC,
**hoặc** method từ chối ngay kèm câu nói rõ phải dùng gì thay thế. Không chấp nhận: treo 15
giây rồi báo sai. Kèm phép ghim cho ca URL-trùng và một con đột biến.

## T4 · `S-16` — hạ ba hạn chờ xuống dưới ngưỡng máy chủ

`scout.navigate` khai 70s · `scout.type` và `scout.fetch` khai 60s, trong khi máy chủ Bridge cắt
lượt chuyển tiếp ở **35s**. Quá 35 giây thì **hai đầu tin hai chuyện khác nhau**: máy chủ báo
hết giờ, extension vẫn đang làm. Với `scout.type` đó là đường ghi — thử lại lúc đó là **gõ hai
lần**.

Việc rẻ, không cần ai duyệt, và nên làm sớm để không ai chép nhầm con số cũ.

· **đóng khi:** ba con số xuống dưới 35.000 (đề xuất 34.000 như `scout.wait`), **hoặc** máy chủ
nhận `requestTimeoutMs` từ người khởi động và con số khai ở một chỗ DUY NHẤT mà cả hai đầu đọc.
Đường thứ hai đụng **lõi dùng chung với ba gói đóng băng** → hỏi Đức trước. Kèm một phép ghim
so `deadline_ms` của mọi method với ngưỡng máy chủ, để mục này không tái phát.

## T5 · Chạy lại lượt gửi prompt trên Udin

**Không phải để xây Udine.** Để phân biệt hai giả thuyết đang ngang cơ nhau:

- ⒜ lượt bấm trúng một lớp chắn vô hình → T1 làm nó lộ ra ngay
- ⒝ tài khoản đã chạm trần phiên nên máy chủ lặng lẽ từ chối → `scout.network` sẽ thấy một
  lượt gọi trả về lỗi, hoặc thấy **không có lượt gọi nào**

**Cần:** T1 xong · Đức bật công tắc · tài khoản đang rảnh (không thấy `.concurrency-overlay`).

**Cách chạy, đúng thứ tự:** `scout.wait` cho `.concurrency-overlay` **vắng mặt** → `scout.type`
prompt → `scout.wait` cho nút Send `usable` → `scout.click` → `scout.network` 25 giây →
`scout.wait` cho ảnh hiện ra → `scout.shot` làm bằng chứng.

· **đóng khi:** biết được ⒜ hay ⒝, ghi vào `docs/TRIALS.md` cột *dạy seed được gì*. **Kết quả
"vẫn không biết" cũng là kết quả** — ghi ra, đừng chạy lại lần thứ ba cho có chuyện.

## T6 · `S-20` — nghe mạng trong lúc bấm

Hôm nay không làm được: `scout.network` giữ debugger suốt cửa sổ nghe, nên `scout.click` trên
**cùng tab** bị từ chối `TARGET_ALREADY_ATTACHED`. Bấm xong mới nghe thì lượt gọi lúc bấm đã đi
mất — đo 12/09: bấm rồi nghe = **0**, nghe lượt tải = **30**.

**Ba đường, và một đường bị cấm:**

| | Đường | Giá |
|---|---|---|
| ⒜ | `scout.click` nhận thêm `watch_ms`: bấm rồi nghe, **dưới một lần gắn, trong lõi GHI** | Phải khai `Network.enable` vào `WRITE_CDP_METHODS`. Không phá luật số 6 vì đọc-ghi vẫn ở hai lõi |
| ⒝ | Chấp nhận giới hạn, ghi thẳng vào `README.md` | Rẻ nhất, và có thể là đúng nếu không việc nào thật sự cần |
| ⒞ | ~~Bỏ gắn-rồi-nhả, giữ phiên nghe dài~~ | **CẤM.** Đó là nới một lớp bảo vệ để lấy tiện lợi — dải băng vàng "đang gỡ lỗi" sẽ đứng mãi trên tab Đức |

**Khuyên ⒝ trước, ⒜ sau** — và chỉ làm ⒜ khi T5 hoặc T7 chứng minh có việc thật cần nó. Xây
sẵn cho một nhu cầu tưởng tượng là đúng thứ `ROADMAP` mục ④ cấm.

· ~~**đóng khi:** chọn được một đường, và lý do ghi vào `BACKLOG.md` dưới `S-20`.~~
**✅ ĐÓNG 16/09 — chọn ⒝.**

**Lý do là một phép đếm, không phải một sở thích.** Việc này treo bốn ngày với điều kiện *“T7 cho
biết có thật cần không”*, và `T7` khép 14/09 mà chưa ai quay lại hỏi nó. Đếm 16/09: **0 chỗ gọi
`scout.network`** trong cả repo — mọi chỗ khớp đều là chính nơi định nghĩa lệnh. `T7` khép không
cần nó, `T21` tách gói không cần nó, bảy workflow `W` ĐẠT không cần nó, và `udin-optic` **cắt hẳn**
nó khỏi 12 method của mình.

Giới hạn đã ghi vào `README.md` mục *“Thứ Scouter KHÔNG nghe được”*, kèm cả con số 0/30 của phép
đo 12/09 và đường ⒜ để dành. **Mở lại thì đếm lại**, đừng mở theo trí nhớ.

## T7 · Đóng vòng tự cải tiến MỘT lần  ⟵ ✅ **ĐÃ KHÉP 14/09**

Scouter dò trang → AI ghi adapter xuống đĩa qua Bridge → `scout.reload` → adapter chạy.
**Từng mảnh đã có và đã đo; cả vòng thì chưa ai khép một lần nào.** Cho tới khi nó khép, ta
đang xây các bộ phận mà chưa biết chúng lắp vào nhau có chạy không. Lượt chạy 12/09 đi được
ba chặng — xem khối *Chạy 12/09* ở cuối mục này trước khi bắt đầu lại từ đầu.

### Thứ đã biết — đừng đi dò lại

| thứ | giá trị |
|---|---|
| ghế gọi được bằng tên | `Udin_Scout` (ghế thứ hai chưa có tên → luôn dán đích) |
| method ghi đĩa | `file.write` · `file.append` · `file.read` · `file.list` — **của MÁY CHỦ**, chạy được cả khi không có extension nào nối |
| vùng ghi | `C:\WORKING ZONE\Chrome Extension Bridge\duc-scouter\du-lieu` (hỏi lại bằng `host.capabilities` → `write_root`) |
| chỗ đặt adapter | `workers/duc-scouter/pilots/<tên>/` — mẫu có sẵn: `pilots/hnx-phai-sinh/` (`scripts/` + `tests/`) |
| trang thử | phải phục vụ qua **http trên 127.0.0.1**. `scout.navigate` chỉ nhận http(s): `file:` và `data:` bị chặn ở `readUrlDi`, cố ý |
| nạp lại trang | `scout.navigate` tới **đúng URL đang đứng** nay chạy (T3) — chặng 4 cần nó |
| chờ cho đúng | `scout.wait state:"usable"` (T2), đừng dùng `present` cho một nút sắp bấm |

### Bốn chặng, mỗi chặng dừng được và kiểm được

1. **Trang thử TỐI THIỂU, tự dựng**: một ô nhập, một nút, một kết quả hiện ra **sau một khoảng
   trễ**. Độ trễ là phần bắt buộc — nó là thứ ép phải dùng `scout.wait`. Không thêm gì nữa.
   Đặt trong repo để lặp lại được, **đừng** để ở thư mục tạm như lượt đo 12/09.
2. **Scouter dò nó** (`scout.page` · `scout.a11y` · `scout.query`) và **ghi báo cáo xuống đĩa**
   qua `file.write`.
3. **AI đọc báo cáo, viết một adapter** xuống đĩa — vào `pilots/<tên>/`, **KHÔNG vào seed**.
   Adapter chỉ được chứa hiểu biết về trang đó. Thứ gì **không riêng của trang nào** thì đẩy
   lên seed và ghi lại là đã đẩy — đó là cách seed lớn lên, và là luật gói số 2.
4. **`scout.reload`, rồi chạy adapter, rồi so kết quả với thứ làm tay.**

### Đổi trang đích 14/09 — vì sao, và cái bẫy đi kèm

Chặng ④ dừng ở `S-22`: adapter phải **bấm một nút** trên trang thử, mà tab trang thử không nhận
sự kiện nhập. `S-22` Đức đã chốt **ngừng điều tra vì chi phí**, nên chờ nó được sửa là chờ mãi.

**Lối ra không cần ai: đổi trang đích sang Udin.** Đo lại 14/09 trên đúng ghế ấy: `scout.type`
làm nút Send `KHOÁ → MỞ` (React nhận được sự kiện nhập thật), `scout.click` khởi động một lượt
sinh ảnh. Và Udin đủ cả bốn điều kiện chặng ①: một ô nhập, một nút, một kết quả **sau 177 giây**
— độ trễ ấy còn ép dùng `scout.wait` mạnh hơn 1.200ms của trang thử.

Ba chặng đầu thật ra **đã chạy trên Udin rồi**, chỉ là rải ra nhiều ngày và có tay người xen vào
giữa. Nên phần còn nợ của `T7` gọn lại đúng một câu: **chạy liền một mạch** dò → viết adapter →
`scout.reload` → chạy adapter, **không sửa tay giữa chừng**.

*Cái bẫy:* chặng ③ đòi adapter dựng **chỉ từ báo cáo**. `pilots/udin-optic/` đã có sẵn — dùng lại
nó là **gian lận với chính phép đo**. Lượt chạy thật phải sinh ra adapter MỚI vào một thư mục
khác, rồi so kết quả với `udin-optic/`. Giống nhau thì vòng khép; khác thì cái khác đó là kết quả.

### Vòng đã khép 14/09 — dò → sinh adapter → chạy, một mạch

`do-trang.mjs` (chặng ②) chạy trên Udin **không sửa một dòng nào**, ghi báo cáo 288 KB. Adapter
chặng ③ nằm ở **`pilots/t7-tu-sinh/`** — thư mục mới, và nó **không chứa một selector nào do
người viết gõ ra**: mọi selector do mã tự rút khỏi báo cáo lúc chạy, theo ba luật không biết gì
về Udin. Lý do phải làm thế thì thẳng thắn: người viết chặng ③ ở đây *đã biết* ba selector của
Udin từ `udin-optic/`, nên gõ chúng ra rồi bảo *"tôi đọc từ báo cáo"* là một phép đo không ai
kiểm được, kể cả chính mình.

· **gõ ở đâu** — chữ ký đầu tiên khớp **đúng một**.
· **bấm ở đâu** — KHÔNG đoán bằng chữ (`"Send"` là tiếng Anh của một trang cụ thể). **Hỏi trang
  bằng một thí nghiệm**: gõ chữ vào ô, xem nút nào từ `disabled` chuyển sang mở. Đúng một nút
  đổi thì đó là nó; nhiều hơn một thì **dừng** — luật gói số 7 không cho bấm khi chưa chắc.
· **kết quả ở đâu** — nhóm đông nhất theo `gom`.

**Kết quả lượt chạy thật** (`"a chipped enamel teapot beside three walnuts"`): 9 ứng viên nút →
thí nghiệm chỉ ra `button.agent-send-button` → **4 ảnh mới trong 39 giây**.

| | adapter tự sinh | `udin-optic/` làm tay |
|---|---|---|
| ô nhập | `textarea.agent-textarea` | `textarea.agent-textarea` |
| nút | `button.agent-send-button` *(tìm bằng thí nghiệm)* | `button.agent-send-button:not(.stop-button)` |
| kết quả | `img.batch-grid-image` | `img.batch-grid-image` |

Khác đúng một chỗ, và chỗ khác ấy có lý: bản làm tay phải loại trạng thái `stop-button` bằng
class vì nó nhận nút **bằng tên**; bản tự sinh nhận nút **bằng hành vi** nên không cần.

### Hai lỗi thật do chính lượt chạy này lôi ra — cả hai đã sửa

1. **`G-85`** — luật *"chờ số kết quả tăng"* hỏng câm trên trang có kết quả hết hạn: Udin sinh 4
   ảnh trong lúc 8 ảnh cũ rụng, **36 → 32**, adapter chờ **590 giây** rồi bị giết dù lượt chạy
   đã thành công. Sửa bằng cách hỏi *có **thành viên mới** không*, không hỏi *có đông hơn không*.
2. **`G-87`** — `khop` trong báo cáo là con số **suy ra**, không phải đo: `BUTTON.create-mode-btn`
   gom 1 mà khớp 2. Cả báo cáo đứng trên ba chữ *khớp đúng một*, nên chỗ nào suy ra nó là chỗ
   ấy nói dối. Sửa: hỏi lại trang cho từng chữ ký — đọc không tốn gì.

Và `G-84` chữa cái **xanh giả** gốc: `scout.tree` nay khai `cutByDepth` + `childrenDropped`.
Báo cáo Udin giờ **ĐỎ đúng chỗ**: *45 nhánh cụt, 87 nút con rơi ra ngoài* — nâng `max_nodes`
không chữa được, và nó nói thẳng điều đó ra.

### Trang thứ hai — ChatGPT, 14/09. Hai luật gãy, và chúng gãy KHÁC NHAU

*(Sửa nhãn: lượt trước tôi gọi việc này là `T21`. Sai — `T21` là **tách Udin thành gói riêng**.
Chạy vòng trên trang thứ hai là nợ của chính `T7`.)*

Chạy chặng ② trên một tab ChatGPT, **chỉ đọc**, không sửa một dòng nào. Ba câu:

| câu | Udin | ChatGPT | phán |
|---|---|---|---|
| gõ ở đâu | `textarea.agent-textarea` | `#prompt-textarea` | ✅ **chung** — sau khi sửa `G-88` |
| bấm ở đâu | `button.agent-send-button` | *không có trong báo cáo* | ⚠️ **đổi nguồn** — `G-89` |
| kết quả ở đâu | `img.batch-grid-image` (32) | `li.list-none` (31) — **sai** | ❌ **chưa tổng quát** — `G-90` |

· **`G-88`** — luật cũ dựng chữ ký thuần `thẻ.class`, và trên trang dùng CSS tiện ích nó ra
  `a.interactive-bg-secondary.…print\:hidden`: dài, giòn, sai. Mà trang đã tự khai hết —
  `role="textbox"`, `type="file"`, `tabindex="-1"`, `type="submit"` — và **luật che không hề
  cắt những thứ đó** (danh sách cho phép ~~24~~ → **26 tên từ 17/09**, `id` · `data-testid` · `role` · `data-image-id` đều ở trong).
  Báo cáo không thiếu dữ liệu; nó thiếu một luật biết dùng. Sửa xong thì **cả hai trang** đều
  ra đúng ô nhập ở vị trí đầu.
· **`G-89`** — `#composer-submit-button` khớp **0** khi ô prompt trống: ChatGPT **không vẽ** nút
  gửi cho tới khi có chữ. Một báo cáo chụp lúc chưa gõ **không thể** chứa cái nút. Nên adapter
  thôi lấy ứng viên từ báo cáo và **so chính trang** trước/sau lượt gõ — *chưa có mặt* cũng là
  một cách *chưa bấm được*. Đo lại trên Udin sau khi đổi: vẫn khép, 4 ảnh mới trong 59 giây.
· **`G-90`** — chưa có lối ra, và **đừng chọn lối rẻ**. Kết quả của ChatGPT là chữ, đánh dấu duy
  nhất bằng `data-message-author-role`, không nằm trong danh sách cho phép. Nới danh sách ấy là
  **nới một lớp bảo vệ** → hỏi Đức, đừng tự làm.

### Còn nợ lại của T7

· **`G-90`**: câu *kết quả hiện ở đâu* chưa tổng quát. Ba lối đã ghi ở `GIA-THUYET`, chưa chọn.
· Nhánh *nút hiện ra sau khi gõ* (`G-89`) mới có **phép ghim**, chưa có lượt chạy thật — chạy
  thật nghĩa là gõ và **gửi** một tin trong hội thoại ChatGPT của Đức. **Phải hỏi Đức trước.**
· Adapter tự sinh chưa lấy ảnh về đĩa và chưa đọc câu trả lời (`W3` · `W4` của `udin-optic`).
  Cố ý: vòng khép cần **một** đường đi được, không cần đủ tính năng.

### Cái bẫy đã biết, đừng vấp lại

- **Hai ghế là hai HỒ SƠ Chrome.** `scout.reload` một ghế KHÔNG nạp lại ghế kia. Sửa mã xong
  thì nạp lại **đúng cái ghế sắp dùng**, không thì đo phải bản cũ (mất 10 phút ngày 12/09).
- **`targetId` đổi sau một lượt điều hướng khác nguồn.** Hỏi lại `scout.targets` sau mỗi
  `scout.navigate`, đừng dùng lại số cũ.
- **Đừng mượn tab việc thật của Đức.** Tab nào mượn thì phải trả lại được — cả đi lẫn về đều
  phải là http(s).

### Chạy 12/09 — ba chặng đầu ĐẠT, chặng bốn dừng

Bàn đo nằm ở `pilots/trang-thu-cham/` (README ở ngay đó). Không phải dựng lại; chạy lại bằng
một lệnh. Đã đo:

- **①** trang thử tự dựng, phục vụ qua http trên `127.0.0.1:8642`, kết quả hiện sau 1.200ms
- **②** `scout.page` · `scout.a11y` · **`scout.tree`** rồi ghi báo cáo 18.354 byte xuống đĩa
  qua `file.write`. **`scout.tree` không thừa:** ô kết quả là một `div` ẩn nên hai phép kia
  KHÔNG thấy nó — dò thiếu nó là dựng ra adapter biết bấm mà không biết câu trả lời ở đâu
- **③** adapter dựng **chỉ từ báo cáo**, không mở lại file HTML, kèm 9 phép ghim chạy không
  cần trình duyệt. **Lượt audit độc lập bắt được một phép ghim rỗng** — bỏ phép kiểm
  `satisfied` của lượt chờ kết quả đi thì tám khối kia vẫn xanh; đã thêm khối thứ chín
- **④** `scout.navigate` nạp lại đúng URL đang đứng: **262ms**, `reloaded: true` (T3 chạy
  ngoài đời lần hai). Rồi adapter dừng ở `S-22` → **T11**

**Vòng CHƯA khép**, và ghi đúng ở mức đó.

· **đóng khi:** cả bốn chặng chạy liền một mạch **không sửa tay giữa chừng**, và `docs/TRIALS.md`
có một dòng cho lượt đó. **Một chặng phải sửa tay thì vòng CHƯA khép** — ghi rõ chặng nào và vì
sao, đừng làm tròn. Kết quả "chưa khép được" cũng là kết quả, và nó đáng giá hơn một dòng xanh
không đúng.

## T11 · `S-22` — đường ghi báo ĐẠT khi sự kiện KHÔNG tới trang  ⟵ *việc tới lượt*

Đo được 12/09 trong lúc chạy T7, trên trang tự dựng, ghế `Udin_Scout`: `scout.type` trả
`typed: 8` mà ô nhập vẫn rỗng · `scout.click` trả `hit: {relation:"descendant"}` mà tay nghe
lượt bấm của trang **không hề chạy** · `scout.key Enter` cũng thế. Cùng lúc đó `scout.shot`
trả về một tấm ảnh 28KB đúng trang và mã lúc tải trang **có** chạy — nên không phải tab chết.

**Đây là ca ngược của `S-17`.** `S-17` chữa *bấm trúng lớp che*: đường ghi **từ chối**. Ca này
đường ghi **báo đạt**. Một seed nói dối theo hướng "đã xong" thì mọi thứ dựng trên nó là phỏng
đoán, kể cả ba chặng T7 vừa chạy xanh.

**Sửa 13/09:** "tab ẩn" là SAI (Đức xác nhận). Mọi phép thử nay ở `docs/GIA-THUYET.md` — đọc
khối *Kết luận* và *Cách làm* ở đầu file đó trước. Lộ thêm **`S-23`**: T1 làm hỏng lượt bấm phải
cuộn tới — **làm S-23 trước**, vì nó đo được trên Chrome riêng (`npm run scouter:action-probe`),
không cần ghế của Đức.

**Chặng 2 — bất kể chặng 1 ra gì.** Đường ghi phải thôi báo ĐẠT cho việc chưa xảy ra. Hai
đường, chọn sau khi biết nguyên nhân, **đừng chọn trước**:

| | đường | giá |
|---|---|---|
| ⒜ | `scout.type` tự soát lại bằng cây trợ năng (`value` của ô nhập) sau khi gõ | Lõi GHI phải hỏi được `Accessibility.*` — **thêm method CDP = hỏi Đức**. Và nó chỉ chữa được lượt gõ, không chữa lượt bấm |
| ⒝ | `README.md` nói thẳng: `scout.click` hứa *"đã bắn chuột vào đúng điểm của đúng phần tử"*, **không** hứa *"trang đã nhận"* | Rẻ, thật, và không nới gì. Người viết adapter tự đặt dấu kiểm của mình — đúng như adapter `trang-thu-cham` đang làm |

· **đóng khi:** biết vì sao (hoặc ghi rõ là chưa biết, kèm những gì đã LOẠI TRỪ được), **và**
một trong hai đường trên đã làm xong. Không đóng bằng cách nới hạn chờ — hạn chờ không liên
quan, và 12/09 nó suýt dẫn cả lượt gỡ lỗi đi sai hướng.

## T8 · `S-03` — đổi tên `observer` → `scouter`

`scouter-engine.js` · `scripts/scouter-probes.mjs` · `scripts/scouter-probes-mutation-check.mjs` ·
`tests/observer-*-smoke.mjs` còn mang tên cũ; ADR-0009 đổi tên gói từ 06/09.

**Để gần cuối, có lý do:** nó làm mọi diff khó đọc, và chen vào giữa lúc đang xây thì mọi lượt
audit sau đó đều phải lội qua nó. Làm khi **không có việc nào đang dở**.

· **đóng khi:** đổi bằng `git mv` (không copy-rồi-xoá), mọi mỏ neo đột biến khớp lại đủ, và
`npm run scouter:mutation` vẫn **0 con sống sót**. Mỏ neo lệch là dấu hiệu đã sót một chỗ.

## T21 · Tách Udin Optic ra khỏi Scouter  ⟵ *đích của cả lộ trình*

**Phép kiểm đóng chặng ③, và nó chỉ có một câu:** các `W` bắt buộc của Udin ĐẠT **từ gói mới**,
và **không một dòng nào của Scouter phải sửa**. Mọi chặng dưới đây chỉ để tới được câu đó.

Hôm nay câu *"Scouter là bộ đồ nghề chung"* vẫn là **lời khai**: Udin sống trong `pilots/` của
chính Scouter nên chưa có gì ép hai bên rời nhau. Tách ra là lúc đầu tiên nó bị bắt chứng minh.

### Đang có gì — đếm trước khi bàn

| | |
|---|---|
| `pilots/udin-optic/` | **5 script + 5 phép ghim, 1.404 dòng.** `qua-man-cho` · `gui-prompt` · `lay-anh` · `doc-tra-loi` · `e2e` |
| mã extension trong đó | **KHÔNG CÓ MỘT DÒNG NÀO.** Toàn bộ là script Node gọi Bridge từ dòng lệnh |
| phụ thuộc ra ngoài | đúng **một**: `../../trang-thu-cham/scripts/goi-bridge.mjs` |
| tiền lệ tách gói | `workers/hnx-fetch/` — tách 08/09, và nó là một **extension đầy đủ** (manifest · background · bảng bên · máy chủ Bridge · transport · giao thức `hnx-fetch.bridge` riêng) |

### ⓪ ĐỨC ĐÃ CHỐT 15/09: **⒝ — extension riêng, một bộ đầy đủ**

Tức Udin có `manifest.json` · background · bảng bên · máy chủ Bridge · transport · giao thức
riêng, đứng độc lập như `workers/hnx-fetch/`.

**Và Đức nhớ đúng một chuyện quan trọng:** *"hình như trước đây ta làm theo kiểu gộp host"*.
Có thật — `workers/_shared/bridge-host/bridge-host-core.mjs` (519 dòng) là lõi host **đã gộp**.
Vì thế host của `hnx-fetch` chỉ **194 dòng**: nó *dùng* lõi chung. Host 500 dòng của
`duc-auto-chatgpt` là bản **chưa gộp** còn sót lại — đừng lấy nó làm mẫu.

### Đo trước khi chép — và một chặng ĐÃ CHẾT vì lượt đo này

Bản lộ trình viết 15/09 mở đầu bằng *"gộp `transport.mjs` về `_shared` — làm trước mọi thứ"*.
**Chặng đó không làm được**, và đây là lượt đo giết nó (`G-92`):

| | gộp được không | vì sao |
|---|---|---|
| lõi máy chủ Bridge | **ĐÃ GỘP** ở `_shared/bridge-host/` | nó là tiến trình **Node** — `../../../_shared/` là đường dẫn đĩa bình thường |
| `transport.mjs` | **KHÔNG** | nó chạy **bên trong extension** (`background.js` service worker · `sidepanel.js`) |

Chrome nạp thư mục `v0.1.0/` làm **gốc gói**. Mọi `import` trong service worker phân giải thành
URL `chrome-extension://<id>/…`, và `..` **bị kẹp lại ở gốc** — nên `../../../_shared/x.mjs` ra
`chrome-extension://<id>/_shared/x.mjs`, không tồn tại, service worker không đăng ký được.

**Thứ quyết định gộp được hay không là ranh giới Node ↔ Chrome, không phải số dòng giống nhau.**

Hai chuyện nữa lượt đo này lôi ra:

· Con số *"khác 18 dòng"* tôi khai 15/09 là **đo sai**. Hai bản hôm nay giống nhau **TỪNG BYTE**
  (cksum `3518328594`, 30.113 byte) — bản chép đã được đồng bộ 12/09.
· [ADR-0021](../../../docs/adr/0021-goi-extension.md) ⑵ **đã chốt sẵn** đường đi cho đúng file
  này: chép nguyên văn + **phép ghim so từng byte**. Tôi viết chặng ① mà không tra cái ADR đang
  cai quản chính nó.

**Nên bản chép KHÔNG phải nợ — nó là quyết định có chữ ký, và nó CÓ NGƯỜI CANH.** Khối ⑷ của
`hnx-fetch/v0.1.0/tests/be-mat-hep-smoke.mjs` băm hai bản và **đỏ khi lệch**; nó bắt được một lỗi
thật 12/09 (tên gói bị gõ cứng vào transport). Gói thứ ba chỉ thêm ba dòng vào bảng `CẶP` của
chính nó — làm ở chặng ②, lúc gói đó có thật.

### Năm chặng, mỗi chặng DỪNG ĐƯỢC và KIỂM ĐƯỢC

**① `goi-bridge.mjs` ra chỗ dùng chung — VÀ bỏ tên gói gõ cứng. ✅ XONG 15/09.**
Thân hàm về `workers/_shared/goi-bridge/`; bốn thứ riêng của Scouter (giao thức · đường tệp ghép
cặp · `SCOUTER_GHEP` · `SCOUTER_GHE`) thành **tham số**. Bản ở lại là vỏ năm dòng, nên **10 chỗ
gọi không sửa một ký tự**. 7 khối ghim; khối ⓐ đọc chính mã lớp dùng chung và đỏ khi thấy một
tên gói — nó bắt lỗi ngay lượt chạy đầu.

**② Dựng nhà + vỏ extension cho gói mới. ✅ XONG 15/09.**
**Và đây là chặng lộ trình đã đo sai giá** (`G-93`). Bản viết 14/09 lấy `hnx-fetch` làm thước mà
không hỏi *vì sao thước đó ngắn*: gói đó **không khai quyền `debugger`**, cả gói chạy trên một
lệnh `scout.fetch`. Udin gọi **5 lệnh GHI**, nên gói mới buộc phải mang theo `scouter-probes.mjs`
(1.181) + `scouter-actions-core.mjs` (938) + `scouter-seed-core.mjs` (715, **chứa cái phanh**) —
**~2.100 dòng mã an toàn bị chép lại**, không có trong bản đếm cũ.

Con số đó được đưa cho Đức **trước khi làm**, kèm đường thứ hai (gói script, 0 dòng chép, chạy
trên extension Scouter). Đức chốt **vẫn tách**, lý do nằm ngoài phép đo:

> *"Vì sau này Scouter sẽ còn thay đổi nhiều, ngoài ra UI của Udin Extension cũng sẽ bị thay đổi
> cho phù hợp usecase, do đó tách riêng sẽ hợp lý hơn."*

Đó là lý lẽ **tách rời nhịp thay đổi**, và nó đổi bản chất bản chép: một bản *được phép trôi*
không phải fork — fork là hai bản trôi **mà không ai biết**. Nên cái giá đi kèm **một tấm lưới**:
`be-mat-hep-smoke.mjs` khối ⑷ băm **bảy tệp chép** và đỏ khi lệch; muốn khác thật thì khai
`CO_Y_KHAC` kèm lý do. Bốn tệp CỐ Ý khác (`bridge-core` · `manifest` · `sidepanel.*` ·
`background`) **không** bị ghim — đó đúng là chỗ Đức nói sẽ đổi.

Gói hẹp hơn Scouter, đo được: **12 lệnh** (24) · **5 lệnh ghi** (11) · **một trang** thay vì
`<all_urls>` · `scout.fetch` và `scout.reload` **không tồn tại**. Quyền `debugger` thì giống —
chiều duy nhất không hẹp lại được, và là lý do bảy tệp kia phải bị ghim.

**③ Dời 10 file logic bằng `git mv`. ✅ XONG 15/09.**
Sang `workers/udin-optic/tu-dong/`, chỉ đổi dòng `import` và đường dẫn trong ghi chú. Suite
Scouter còn **31 xanh và không còn Udin**; suite gói mới **7 xanh**.

**④ PHÉP KIỂM THẬT — lượt chạy live TỪ EXTENSION MỚI. ✅ ĐÓNG 15/09.**
Prompt *"a copper watering can among five lavender stems"*. **Bốn chặng ĐẠT**, và W3 đưa **4/4
ảnh xuống đĩa** (786.870 · 959.068 · 964.148 · 943.476 byte, đầu tệp `RIFF…WEBP` hợp lệ) — kiểm
bằng đĩa, không bằng lời báo của lệnh. W4 đọc đúng câu trả lời **cho prompt vừa gửi**.

**Và vế thứ hai ĐẠT: `git status workers/duc-scouter` SẠCH.** Một extension khác chạy trọn một
việc thật **trên mã của Scouter mà không bắt Scouter sửa một dòng**. Câu *"Scouter là bộ đồ nghề
chung"* từ hôm nay không còn là lời khai.

*Cần đúng hai lượt live để đóng, và lượt đầu không phí:* nó đẻ ra `G-94` — ảnh Udin nằm trên một
bucket S3 chứ không trên trang làm việc, nên `host_permissions` vừa thu hẹp làm `scout.grab` chết
với `Failed to fetch`. **Bảy phép ghim + suite gốc xanh + máy chủ chạy thật đều không thấy**, vì
không cái nào gọi ra ngoài internet.

**⑤ Dọn sổ.**
`CAPABILITIES.md` · bảng theo dõi đầu file này · `DASHBOARD` · `HANDOFF` **hai bên** · `npm test`
gốc chạy suite gói mới · `README` gói mới có đường cài đặt riêng (mẫu: `T9` vừa làm cho Scouter).

### Bảy cái bẫy — năm cái đã có người trả giá

1. **Transport thì CHÉP, và chép xong phải ghim.** Ngược hẳn bản lộ trình đầu (`G-92`): gộp
   không được vì file chạy trong Chrome. Cái sai thật sự không phải bản chép — là **bản chép
   không ai canh**. Chép xong mà quên thêm cặp vào bảng `CẶP` là đẻ ra đúng bệnh ba gói
   `duc-auto-*`.
2. **Giao thức phải KHÁC.** `hnx-fetch` đã mất một buổi vì máy chủ nói `duc-scouter.bridge` còn
   extension nói `hnx-fetch.bridge` — cùng cổng, cùng token, vẫn không nối được. Triệu chứng
   *"im lặng"*, nguyên nhân ở một chuỗi.
3. **Tệp ghép cặp RIÊNG, cổng RIÊNG.** Hai extension dùng chung một tệp thì mọi lượt gọi trả
   `TARGET_AMBIGUOUS` — đúng chuyện đã xảy ra 08/09 và là lý do `tao-tep-ghep-cap.mjs` ra đời.
4. **Chuyển HẾT rồi mới xoá thư mục cũ.** Chữ của chính `hnx-fetch`: *"xoá trước rồi chuyển sau
   là mất một tấm lưới an toàn để dọn cho gọn."* Phép ghim và mỏ neo đột biến đi theo, **không
   chỉ mã**.
5. **`pilots/` ở GỐC REPO là vùng chỉ-thêm; `workers/duc-scouter/pilots/` thì KHÔNG** (đo
   14–15/09). Nhưng `session-check` tách rename thành *xoá + thêm*, nên **chạy cổng ngay sau
   `git mv` file ĐẦU TIÊN**, đừng dời cả 10 file rồi mới biết.
6. **`t7-tu-sinh/` và `trang-thu-cham/` Ở LẠI Scouter.** Cái đầu là bằng chứng của `T7` và không
   biết gì về Udin; cái sau là bàn đo của seed.
7. **Bộ đột biến của gói mới đặt mã riêng ngay từ đầu.** `hnx-fetch` lúc tách phải đổi `N*` → `W*`
   vì gói đích đã có chủ mã trùng, và bộ đo CHẶN mã trùng.

### Thứ KHÔNG làm trong T21

Đừng nhân tiện mở `SEED v1`. Thứ tự đã chốt 15/09: **tách trước, rồi mới mở đúng những mục mà
việc tách CHỈ RA là thiếu** — không mở theo danh sách 23 mục. `T21` chính là phép đo sinh ra
danh sách thật.

---

## T9 · Đóng gói v1  ⟵ *đường cài đặt XONG 15/09; tuyên bố phiên bản là việc của Đức*

Nấc `v1` khai *"seed đủ dùng để người ngoài lấy về dùng được"*. Thứ còn thiếu là **một đường cài
đặt cho người chưa từng đọc kho mã này** — và giờ nó có.

**Đừng đọc nhầm hai chữ `v1`** — [ADR-0007](../../../docs/adr/0007-scouter.md) mục ⑹ tách rõ:

| chữ | nghĩa | trạng thái |
|---|---|---|
| `SEED v1` | **23 mục năng lực còn lại** | **vẫn ĐÓNG** — mở phải có ADR riêng |
| **Scouter v1** | **bản đóng gói phát hành được** của seed đang có | đây mới là `T9` |

### Làm được gì 15/09

· README có **ba lệnh chạy được** — sinh tệp ghép cặp · bật máy chủ Bridge · kiểm bản cài — thay
  cho câu *"bật máy chủ Bridge"* trước đây, không nói bật bằng gì.
· **`scripts/kiem-cai-dat.mjs`** (`npm run scouter:kiem-cai-dat`) — sáu bước, dừng ở bước đầu
  tiên hỏng, **mỗi bước hỏng nói luôn phải làm gì**. Nó gõ cửa đúng Bridge đang chạy và đúng
  extension đã nạp; khác hẳn `scouter:bridge-live`, lệnh đó dựng máy chủ riêng để đo **mã**.
· Hai chốt trong đó đừng đảo: **công tắc ghi ĐÓNG không phải hỏng** (đó là mặc định, luật gói
  số 8), và bước ① phải hỏi `bridge.sessions` chứ không `system.ping` (`G-91`).
· Cả ba lệnh đã **chạy thử thật**: bước ① sinh tệp vào thư mục nháp, bước ② máy chủ lên đúng
  cổng 32152, bước ⑤ sáu bước xanh trên bản cài đang chạy.

### Còn lại, và nó là việc của Đức

Tuyên bố *"đây là Scouter v1"* là một quyết định phát hành, không phải một phép đo — nên tôi
không tự đóng dấu. Bằng chứng đã bày ra ở trên; **@Đức:chốt** khi anh thấy đủ.

---

## KHÔNG làm trong chuỗi này

- **Xây extension Udine.** Udin là **ca thử**, không phải đích. Thứ nó dạy được thì đẩy lên
  seed; thứ riêng của nó thì ở `pilots/`.
- **Mở thêm method CDP ngoài hai cái chuỗi này xin** (`DOM.getNodeForLocation`, và
  `Network.enable` nếu chọn đường ⒜ ở T6). Mở thêm là nới bề mặt tấn công cho một nhu cầu
  tưởng tượng.
- **Tạo automation tự chạy.** Luật gốc cấm khi chưa hỏi.
- **Đẩy lên `main` khi chưa có audit độc lập.**
