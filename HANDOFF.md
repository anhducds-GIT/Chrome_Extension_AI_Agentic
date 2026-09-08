# HANDOFF — gốc repo (`_root`)

> Nhật ký việc ở **gốc repo**: AGENTS.md, DASHBOARD, FEATURE-PARITY, `docs/`, `scripts/`.
> Việc trong `workers/*` ghi ở HANDOFF.md của package đó, không ghi vào đây.
> **Chỉ thêm dòng, mới nhất ở cuối.**

## Log

<!-- HANDOFF-THANG: 2026-09 -->

<!-- HANDOFF-CUT-POINTER: ADR-0008 -->
> **Lịch sử cũ hơn đã dời sang [`HANDOFF-ARCHIVE-01.md`](HANDOFF-ARCHIVE-01.md)** — cùng thư mục
> này, nguyên văn, không mất chữ nào. Cắt 2026-09-06 theo ADR-0008 (lane `claude-cat-goc`):
> file này giữ **20 mục cuối theo vị trí trong file**, 62 mục trước đó nằm ở file lưu trữ.
> Cần đào lịch sử xa hơn thì mở file đó; ghi Log mới thì vẫn ghi vào cuối file này.
<!-- /HANDOFF-CUT-POINTER -->

## Lượt · DASH-ORCH-V2 mục 8 — cảnh báo chứng minh cũ + ba dòng đếm sự cố

**Phiên:** `claude-exec-orchv2b` · 2026-09-04 · khoá `_code` · vòng hai của việc vòng một đã chết giữa chừng

Vòng một đã dựng bốn vùng của tab và đã push. Lượt này làm phần còn lại, đúng mục 8 và chỉ mục 8.

**8a · `CONTENT-TRUTH-01` defect 4.** Đơn vị nào có mốc kiểm chứng mà code đã đổi kể từ đó thì
trang nói ngay cạnh chip trạng thái: *"CHỨNG MINH CŨ · CẦN KIỂM LẠI — bằng chứng thuộc bản cũ hơn
N commit"*. Hiện ở hai chỗ Đức nhìn thấy mà không phải mở gì: bảng tổng, và dòng tóm tắt của
đơn vị ở tab Extension. Đo trên HEAD: hai đơn vị bị cảnh báo (23 và 14 commit), ba đơn vị còn lại
không bị bịa cảnh báo. Không thêm nguồn dữ liệu nào, không thêm trường nào — đọc đúng trường đã có
trong mô hình. Defect 5 và 6 **vẫn khoá**, không chạm.

**8b · Ba dòng đếm sự cố.** Đọc nhãn cố định trong chính nhật ký này, neo bằng một dòng, đúng bốn
token. Ba sự cố ghi lùi hôm nay đọc ra `1 · 1 · 1`. Nhãn lạ thì bộ sinh **dừng và nói tên nguyên
nhân** — `PASS` và `ANSWERED` rơi vào đúng cửa đó, nên không có đường nào để tôi tự ghi điểm cho
mình. Chữ trên bảng là **"đã ghi nhận"**, huy hiệu số 0 để màu trung tính, và trang nói thẳng rằng
0 nghĩa là *chưa ai ghi nhận*, không nghĩa là không có sự cố.

**Số thật:** phép kiểm 25 → 27. Thử phá 9 lượt, cả 9 đỏ. Nhưng **4 lượt thoát lưới ở lần đầu**:
3 lượt không sửa được code vì tôi neo bằng dấu xuống dòng kiểu Unix trong khi file là CRLF — đúng
cái bẫy ký tự vô hình mà đề bài cảnh báo, và nó báo "không khớp" trông y hệt "không có gì để sửa";
1 lượt (xoá một dòng nhật ký) xanh giả vì tôi sửa file trên đĩa trong khi bộ sinh đọc bản đã ghi
vào repo — sửa lại đúng chỗ thì đỏ ngay, kèm một lượt đo riêng xác nhận xoá một dòng làm số đếm
tụt về 0.

**Còn mở:** frontmatter của đề bài `CONTENT-TRUTH-01` cần đổi sang đã xong — file đó thuộc khoá
`_docs`, không phải khoá của lượt này, nên **không tự sửa**, để phiên giữ `_docs` làm.

---

## 2026-09-05 · `claude-dashboard` — MULTIFLOW-ON-BOARD-01: bảng nói được cách nhiều việc chạy cùng lúc

Đức chốt 04/09: đưa cách vận hành nhiều phiên song song lên bảng, coi nó là một tính năng, và
**tuyệt đối không nhúng ai đang giữ vùng nào**. Đây là lượt executor, không phải lượt điều phối.

**Làm gì.** Thêm mục *"Nhiều việc chạy cùng lúc — cách nó chạy"* vào tab Vận hành. Ba câu Đức
cần đọc nằm ngay ngoài: mỗi vùng chỉ một AI được ghi · hiện 6 vùng nên tối đa 6 việc song song ·
hai AI cùng muốn một vùng thì người sau **bị từ chối**, không phải ghi đè. Chi tiết cơ chế nằm
trong hai khối gấp. Ba bộ đọc mới (`demLuongSongSong` · `readCoChe` · `readBatBien`) **đọc lại
từ file**, không gõ tay con số nào — nên bảng không thể nói khác luật.

**Luật cứng của cả ba bộ đọc: không đọc trường `owner`, chỉ đọc danh sách khoá.** Không phải
thẩm mỹ. Bảng nằm trong khối `generators` nên cổng so nó với HEAD mỗi phiên; chủ vùng đổi liên
tục (04/09 riêng `_code` đổi chủ bốn lần). Nhúng `owner` vào là bảng lệch HEAD ngay lượt nhận
khoá kế tiếp, và **mọi phiên bị chặn đẩy việc** dù không một dữ liệu nào đổi.

**Số thật.** Phép kiểm 27 → 28. Thử phá 4 lượt, **cả 4 đỏ**, nhưng chỉ **1 lượt đỏ đúng chỗ tôi
đoán**:

| Đột biến | Bắt bởi |
|---|---|
| gõ cứng số vùng | *"con số trên trang phải giảm theo"* — phép chứng minh số còn đọc sống |
| bộ đếm đọc `owner` | *"số việc song song phải bằng số khoá"* — chặn sớm ở lớp quan hệ |
| **in dấu bận/mở từng vùng lên mục** | **đúng phép byte-identity của tab Vận hành** |
| bỏ chốt `if (coChe.length)` | một khẳng định KHÁC hẳn (`ten ban chuan cua repo`) |

Lượt thứ tư **không chứng minh được gì** cho phép kiểm nó nhắm tới: nó đỏ vì một phiên khác
đang đổi tên bảng giữa chừng, không phải vì chốt bị bỏ. Theo đúng luật đã ghi: *"không dựng
được ca hỏng" nghĩa là phép kiểm CHƯA được kiểm chứng*, không phải "đã qua". Ghi lại ở đây để
ai đụng chỗ đó lần sau biết mà dựng lại.

**Một khẳng định tôi viết quá rộng và đã đỏ ngay lượt đầu.** "Đổi hết chủ vùng → bảng không đổi
một byte" là SAI đề: bảng **cố ý** in dấu bận/mở của từng khoá ở tab AI điều phối, và những
dòng đó mang tiền tố `KHOA_PREFIX` nên bộ so độ tươi miễn chúng. Chia lại đúng phạm vi làm ba:
mục của tôi không đổi một byte · `compareOverview` vẫn khớp (cổng **không** được đỏ vì ai đó
nhận một khoá) · **mọi dòng lệch phải nằm trong tập được miễn**, và phép kiểm in ra dòng nào
lọt ra ngoài.

**Một fixture không dựng được như dự định.** "Mất hẳn file luật" không đi qua bộ sinh —
`collectDocs` cũng đọc file đó và nó ném trước. Thay bằng ca thật hơn: luật **còn** nhưng bị
viết lại, mất mục 2 và mục 4. Đánh số lại luật thì có thật; xoá hẳn file thì không ai làm.

**Tôi có thể đã làm mất việc của phiên khác — ghi lại để không tái diễn.** Bộ đo đột biến của
tôi phục hồi file bằng `git checkout -- scripts/build-overview.mjs` sau mỗi lượt. Lượt cuối kết
thúc gần đúng lúc `claude-rename-bang` nhận `_code` để đổi tên bảng. Ngay sau đó
`tests/build-overview-smoke.mjs` đã mang tên mới ở cả ba chỗ, còn `scripts/build-overview.mjs`
thì chưa — đúng file bộ đo của tôi vừa reset. Đã báo thẳng cho phiên đó kèm số dòng cụ thể.
**Luật rút ra: bộ đo đột biến phải lưu nội dung nó đọc được rồi ghi trả lại chính nội dung đó,
KHÔNG được gọi `git checkout`.** `git checkout` không phân biệt đột biến của tôi với sửa đổi
của người khác vừa xuất hiện trong cùng file.

**Trạng thái.** Cổng đóng phiên **XANH TOÀN BỘ**. Commit `7c1bd2e` đã lên `origin/main`. Bảng
đã được `claude-dieu-phoi` sinh lại (`b76d5c7`) và có khối mới. `_code` nay do
`claude-rename-bang` giữ — tôi không còn đụng vùng nào.

**Còn mở, KHÔNG thuộc lượt này:** (a) việc đổi tên bảng của `claude-rename-bang` đang dở, cổng
đã cảnh báo artifact lệch HEAD và `safe-push` sẽ từ chối cho tới khi họ sinh lại; (b) suite
`build-overview-smoke` chậm thêm vì bốn lượt sinh trang mới — hai đột biến vượt 600 giây, đây
là số đo cụ thể cho **Y-07**, và nếu cần thì gộp hai lượt sinh ở phần (d)/(e) làm một.

## Log — 2026-09-05, `claude-rename-bang` · đổi tên bảng mang tên dự án

`DASHBOARD.html` → **`DASHBOARD-Chrome-Extension-AI-Agentic.html`**. Đức chốt: mỗi repo sinh
một bảng, cả đống cùng rơi vào thư mục Tải về, ba file cùng tên thì mở cái nào cũng phải đoán.
Bên bộ khung đã đổi trước đó thành `DASHBOARD-Ark-Repo-Harness.html`.

**Đổi 18 chỗ, cố ý giữ nguyên 16 chỗ.** Luật tôi dùng để chia: *đổi ở chỗ dẫn đường, giữ
nguyên ở chỗ kể chuyện.* Giữ nguyên là 11 dòng Log cũ trong hai `HANDOFF.md` (sửa dòng Log cũ
là viết lại chữ của phiên khác) và 5 chỗ trong hai brief đã `done` / `superseded` — brief đóng
rồi là một bản ghi, không phải chỉ dẫn. Brief còn `active` (TAB-V2) thì có đổi.

**Một lượt commit tay của Đức, ghi lại vì nó CHỈ RA MỘT CHỖ HỞ THẬT — không phải để trách ai.**
Giữa lúc tôi đang sửa, Đức tự commit `d3eafb9` với message `1` (Đức nói: *"vì không biết viết nội
dung gì nên tôi viết 1"*). Lượt đó gom 9 file đang sửa dở của tôi, và **thiếu mất
`scripts/build-overview.mjs`** — nên repo rơi vào trạng thái đổi tên NỬA CHỪNG: file trên đĩa và
`.repo-structure.json` mang tên mới, còn bộ sinh vẫn ghi ra tên cũ. Chạy `npm run overview` lúc đó
là đẻ ra một file thứ hai mang tên cũ, và cổng đỏ vì artifact đã khai thì thiếu. Đã vá ở `a86efe6`.

**Bản ghi trước của chính dòng Log này viết sai**, đổ cho "một phiên AI khác" — tôi suy từ message
`1` và việc thiếu nhãn `Lane:` mà không hỏi. Sửa lại ở đây cho đúng sự thật.

Chỗ hở thật nằm ở đây, và nó là chỗ hở của HỆ THỐNG chứ không phải của người dùng: **luật bắt mọi
commit có nhãn `Lane:`, nhưng không có gì nhắc lúc commit** — chỉ có `safe-push` chặn về sau, và
`git push` trần thì đi vòng qua cả hai. Đức không đọc code, nên không có cách nào để Đức biết mình
vừa thiếu một dòng. Chừng nào chưa có git hook nhắc tại chỗ, chuyện này còn lặp lại.

Suite: 270 phép kiểm xanh. Cổng đóng phiên XANH TOÀN BỘ.
**Việc cần Đức: không có.**

## Log — 2026-09-05, `claude-exec-pushgate` · cổng xuất bản hết chặn oan lane không liên quan

**Đề bài:** `docs/briefs/BRIEF-PUSH-GATE-01.md` — Đức chốt hướng (b) của `IDEAS.md` mục `Y-09`.

**Triệu chứng đã sửa.** Một phiên đang sửa bộ sinh trong cây làm việc thì **mọi phiên khác**
không đẩy được, dù việc của họ đã xong và không dính gì tới file đó. Cây làm việc là của chung,
nên nó biến một người đang làm việc bình thường thành cái khoá cửa của cả nhà. Nặng nhất là lúc
phiên kia chạy **thử phá** — mỗi vòng bẩn file vài chục giây, nên càng làm đúng kỷ luật càng
khoá cửa người khác. Đo thật trong một ngày: **4 lượt** chặn oan cho một lane không hề chạm bộ
sinh, và một vòng chờ-tới-khi-sạch trượt hai lần liên tiếp.

**Cách sửa, nói cho dễ hiểu.** Thứ sắp công bố là bản đã commit, nên người chấm cũng phải là
bản đã commit. Nay cả hai cổng chép bản đã commit ra một chỗ tạm rồi chạy bộ sinh **ở đó**. File
ai đang sửa dở không còn là đầu vào của phép chấm nữa, nên nó không chặn được ai. Không thêm cờ
bỏ qua, không thêm biến môi trường — cổng có cửa sau thì thôi là cổng.

**Phần chặn ĐÚNG giữ nguyên.** Không ai đẩy được một nhánh mà bảng đã commit nói sai về chính
nhánh đó. Hai vế kéo ngược nhau này nay có phép ghim chạy được, đứng cạnh nhau: đạt vế này mà
mất vế kia thì suite đỏ ngay.

**Số thật, kể cả số xấu:**
- Ca dựng thật trên chính repo này: bẩn một bộ sinh, đẩy ba commit không liên quan → **đẩy được**.
- Đột biến kiểm **5 lượt**, cả 5 đỏ đúng khẳng định của mình.
- **Một phép ghim NGƯỢC** trong suite cũ: nó đang ghim chính cái hành vi chặn oan. Đã lật lại,
  và đổi bản-sửa-dở trong ca thử thành **bản độc** — bản cũ dùng một dòng chú thích vô hại, nên
  phép ghim đó vẫn xanh kể cả khi cổng chạy nhầm bản.
- **Hai phép ghim khác đang ghim CHUỖI NGUỒN**, không ghim hành vi: chúng chỉ đọc chữ trong
  `session-check.mjs`, nên sau bản vá chúng vẫn xanh **nhờ chú thích của tôi**. Đã chỉnh cho trỏ
  đúng cơ chế mới, nhưng chúng vẫn thuộc loại yếu — ghi ra để phiên sau biết.
- **Một nhánh chưa có phép ghim:** "không dựng được bản chụp → chặn". Nhánh cũ nó thay thế cũng
  chưa từng có, nên đây là nợ cũ, không phải nợ mới.
- Suite: **364 phép kiểm xanh, 0 đỏ** (thêm 3 phép ghim mới). Cổng đóng phiên XANH TOÀN BỘ.
  Đếm lại bằng: `npm test` rồi cộng các dòng `N passed` — đừng tin con số này sau vài ngày.

**Một chỗ hở thấy dọc đường, chưa sửa:** `.git/worktrees/c` còn sót trên máy và git báo
`Permission denied` mỗi lần commit. `MULTIFLOW.md` mục 7 cấm `git worktree add` đúng vì lý do
này. Chưa đụng vào vì xoá file thì phải hỏi Đức.

**Việc cần Đức: không có.**

## Log — 2026-09-05, `claude-exec-liveblock` · khối "đang làm gì" trên bảng, và tab AI điều phối mở sẵn

**Đề bài:** `docs/briefs/BRIEF-LIVE-BLOCK-01.md`, hiện thực của `ADR-0004`.

**Đức mở bảng ra là thấy ngay ai đang làm gì.** Đầu tab AI điều phối nay có khối **Đang làm gì**:
mỗi vùng đang có người giữ một dòng — tên lane, câu việc lane đó tự khai lúc nhận vùng, tên vùng,
và mốc nhận. Không tạo dữ liệu mới: bảng chủ sở hữu đã có đủ bốn thứ đó. Và **tab AI điều phối
nay là tab mở sẵn**, vì Đức nói đây là trang Đức mở hàng ngày nhiều nhất.

**Ba chỗ cố ý làm khác cho khỏi hỏng về sau:**
- **Không luồng nào chạy thì vẫn in một dòng** nói rõ điều đó, không ẩn khối. Khối trống là một
  thông tin; ẩn đi thì Đức không phân biệt được "không có gì chạy" với "khối này hỏng".
- **Khối tự nói ra hai chỗ nó KHÔNG thấy**, ngay trên trang: luồng đang chạy ở **repo khác**, và
  luồng vừa được giao mà **chưa kịp nhận vùng**. Đúng lượt làm việc này đang có một executor chạy
  ở repo bộ khung mà khối không thấy — Đức nhìn khối rồi tin là không có gì chạy thì tệ hơn không
  có khối này.
- **Mốc nhận in nguyên văn từ bảng, không tính "bao lâu rồi" lúc sinh trang.** Phần trong ngoặc
  do đoạn JS trong trang tự tính lúc Đức mở. Trang phụ thuộc giờ đồng hồ là sang ngày mới mọi
  lane bị chặn push dù chẳng dữ liệu nào đổi.

**Số thật, kể cả số xấu:**
- **5 lượt thoát ở vòng đầu** — suite bắt được cả 5: (1) khối chèn thêm một khoảng trắng làm mốc
  cắt vùng lệch; (2) một phép ghim **ngược** đang ghim "tuyệt đối không lộ tên phiên" — tức ghim
  đúng cái `ADR-0004` bảo phải đảo lại; (3) mượn nhầm tên lớp của vùng khác nên hai vùng đếm lẫn
  vào nhau; (4) tập dòng được miễn khỏi phép so độ tươi chưa tính khối mới; (5) một phép ghim đòi
  hai trang phải bằng nhau **số dòng** — không còn đúng khi số vùng đang bận đổi. Kèm 1 lỗi dựng
  không phải test: ghi chú có nháy ngược nằm trong chuỗi mẫu làm gãy bộ sinh.
- **Hai phép ghim bị LẬT NGƯỢC**, ghi rõ ra để phiên sau không tưởng là lỗi: cả hai đang ghim
  "tên phiên tuyệt đối không được lên bảng". `ADR-0004` đảo lại chính quyết định đó. **Nửa phải
  giữ vẫn giữ nguyên:** tên lane chỉ được nằm trên dòng mang dấu lọc.
- **Đột biến kiểm 8 lượt, cả 8 đỏ đúng khẳng định của mình.** Trong đó có: bỏ dấu lọc ở khối,
  ẩn khối lúc trống, đóng cứng danh sách lane, đổi tab mặc định, làm nút tab lệch khung nội dung,
  tính khoảng thời gian lúc sinh trang, bỏ câu cảnh báo hai chỗ không thấy, và thêm một luật
  `display` thứ ba cho khung tab (đúng đường tái sinh `DASH-TAB-01`).
- Sinh hai lần liên tiếp ra file y hệt. Suite: **261 phép kiểm xanh, 0 đỏ** (khối mới thêm 1 mục,
  đếm bằng `npm test` rồi cộng các dòng `N passed` — đừng tin con số này sau vài ngày).
- Mở bằng trình duyệt kiểm thật: tab AI điều phối mở sẵn, khối ở trên cùng, nội dung khớp bảng
  chủ sở hữu, phần "bao lâu rồi" hiện đúng, và bấm sang tab khác vẫn đổi được.

**Một sự cố phải ghi lại, không phải để trách ai.** Giữa lúc tôi đang chạy đột biến kiểm, một
commit của phiên `claude-dieu-phoi` (`chore(quyen): tra _root`) **cuốn theo bản đang bị làm hỏng
cố ý** của `scripts/build-overview.mjs` — file thuộc vùng `_code` mà tôi đang giữ. Lượt sinh bảng
ngay sau đó lấy đúng bản hỏng ấy, nên **bảng đã commit mang một dòng CSS tái sinh đúng loại bug
`DASH-TAB-01`**. Đã vá trong lượt này (cây làm việc của tôi vốn đã sạch, chỉ cần commit lại).

Chỗ hở là chỗ hở của **hệ thống**: cây làm việc là của chung, nên `git add` diện rộng của một
phiên gom được cả file đang sửa dở của phiên khác — **bảng chủ sở hữu không chặn được chuyện đó**,
nó chỉ nói ai *được phép* sửa. Và cái làm nó nguy hiểm là đột biến kiểm: kỷ luật test bắt phải bẩn
file vài chục giây mỗi vòng, nên **càng làm đúng kỷ luật thì cửa sổ bị cuốn càng rộng**.

**Việc cần Đức: không có.**

## Log — 2026-09-05, `claude-moc-da-xong` · thẻ "Việc lớn đã đóng" ở tab Nhật ký & mốc

**Đề bài:** `docs/briefs/BRIEF-MOC-DA-XONG-01.md` (nay đã `status: done`).

**Đức mở tab Nhật ký là nhìn lại được cả chặng đường.** Tab đổi nhãn thành **"Nhật ký & mốc"** và
có thêm thẻ thứ hai: **Việc lớn đã đóng** — mỗi đề bài `status: done` trong `docs/briefs/` một
dòng, mã việc · tên việc · ngày đóng, mới nhất lên đầu. Ở tab **AI điều phối** thêm **đúng một
dòng** cuối vùng 2: số việc đã đóng, tên việc gần nhất, và câu trỏ sang tab Nhật ký — một dòng
chứ không phải một vùng thứ năm, vì vùng đó là chỗ của việc đang chạy.

**Hai ràng buộc cố ý, và lý do:**
- **Thẻ mới không đọc quyết định (ADR).** Thẻ bên cạnh đã đọc rồi; đọc lần thứ hai là hai bản của
  một danh sách, và hai bản thì sớm muộn đếm ra hai số khác nhau mà Đức không biết bên nào đúng.
  Có phép ghim so từng dòng của hai thẻ: **0 dòng trùng**.
- **Ngày lấy từ lịch sử git, không lấy từ đồng hồ.** Trang này nằm trong khối `generators` nên
  cổng so nó với HEAD mỗi phiên; thứ gì phụ thuộc giờ chạy sẽ chặn push của MỌI luồng khi sang
  ngày mới. Hỏng thì **ném lỗi kèm tên file**, không im lặng bỏ dòng — bỏ một dòng là làm ngắn
  danh sách lịch sử mà không ai thấy.

**Số đo:** 12 đề bài đã đóng đọc từ HEAD (13 sau khi commit lượt này) · suite gốc **30/30 xanh**
(thêm 1 phép ghim mới) · sinh hai lượt trên cùng HEAD ra **hai file giống hệt nhau từng byte**
(md5 `8ab651f6…`).

**Đột biến kiểm — 3 lượt, cả 3 đều bắt được:**
1. Làm hỏng dòng `# BRIEF` của một đề bài `done` thật trên đĩa (`BRIEF-S7.md`) → bộ sinh **ném**
   `MOC_XONG_TIEU_DE_HONG: BRIEF-S7.md`, không im lặng bỏ dòng. Đã khôi phục file, `git status` sạch.
2. Đổi `throw` thành `continue` ở nhánh tiêu đề hỏng → suite **ĐỎ**.
3. Đổi ngày git thành `new Date()` → suite **ĐỎ**.

**Một chuyện phải ghi, để lần sau khỏi mất công chẩn đoán lại.** Lượt chạy cổng đóng phiên lúc
~20:35 báo đỏ ở phép kiểm "đổi đồng hồ lên 99 ngày mà bản commit phải không đổi một byte", lệch 46
byte. Không phải lỗi của lượt làm này: **ba lane khác đang commit đúng lúc đó** (`20:32`, `20:38`),
mà phép kiểm sinh trang hai lượt và so — HEAD nhảy giữa hai lượt thì hai bản khác nhau là đương
nhiên. Chạy lại lúc cây đã lặng: **giống hệt nhau**. Đây là một **phép kiểm hay chớp đỏ oan khi
nhiều lane cùng commit**, không phải một bug của bảng.

**Việc cần Đức: không có.**

---

## 2026-09-05 · lane `claude-ghim-do` · Y-18: hết đỏ oan khi hai lane commit cùng lúc

**Làm gì.** Vá đúng gốc, không vá chỗ đau. Cái sai không nằm ở phép ghim mà ở **bộ đọc**:
`createHeadDeps` (trong `scripts/build-dashboard.mjs`) phân giải chữ `HEAD` **lại từ đầu ở
từng lệnh git**, mà một lượt sinh trang gọi git hàng trăm lượt. Lane khác commit xen vào giữa
chừng là nửa trang đọc commit cũ, nửa trang đọc commit mới — trang sinh ra không ứng với bất
kỳ commit nào từng tồn tại. Nay mốc đọc được **ghim một lần** (giải lười, ở lượt đọc đầu tiên)
và dùng lại cho cả tám chỗ: `ls-tree` · `cat-file` · `show` · `rev-parse --short` ·
`log --format=%cd` (hai chỗ) · `trackedPaths` · `gitlinksAtRoot` · `changedFilesSince`
(hai bản, một ở mỗi bộ đọc). Kèm theo, `tests/build-overview-smoke.mjs` nay dùng **một** bộ
đọc chung cho cả file thay vì dựng lại 31 lượt — mỗi lượt dựng là một mốc ghim khác nhau, nên
hai khối vẫn so nhau trên hai commit.

**Kết quả số.**
- `node tests/build-overview-smoke.mjs`: **30 passed, 0 failed**.
- Dựng lại đúng tình huống (sinh lượt một → commit rác vào HEAD → sinh lượt hai, cùng một bộ
  đọc), chạy trong `git worktree` tách riêng: **có vá → lệch 0 byte, XANH**.

**Đột biến kiểm — ba lượt, bắt buộc vì đây là cơ chế đa phiên.**
1. Gỡ bản vá, chạy lại đúng kịch bản trên → **lệch 50 byte, ĐỎ**. Đỏ oan quay lại đúng như mô tả.
2. Cho bộ sinh nhìn đồng hồ (`today: "head"` → `today: Date.now()`) → suite **ĐỎ** ở đúng câu
   "đổi đồng hồ lên 99 ngày mà bản commit PHẢI không đổi một byte". Bản vá **không** làm yếu
   phép ghim: nó vẫn bắt được bug thật.
3. Cây làm việc sạch sau cả ba lượt (`git worktree` đã gỡ, `git status` không sót gì).

**Phần B — `npm test` có nuốt mã lỗi không? KHÔNG.** Đo bằng cách cho
`tests/repo-structure-smoke.mjs` ném ngay dòng đầu: chuỗi `&&` dừng đúng chỗ,
bash `$?` = **1**, PowerShell `$LASTEXITCODE` = **1**, PowerShell `$?` = **False**. Đã khôi
phục file, `git diff --quiet` xanh. Thứ thật sự nuốt là **`$?` của PowerShell**: nó nói về
câu lệnh **liền trước**, nên chỉ cần chen một dòng in ra màn hình vào giữa là nó trả `True`
dù npm vừa trả 1 — dựng lại được ca đó trong chính lượt đo. Ghi đầy đủ ở `Y-19` trong `IDEAS.md`.
Cổng vẫn tin được; **không có việc riêng nào phải giao thêm.**

**Việc cần Đức: không có.** Còn mở: ô `bậc` của `Y-18` vẫn ghi `ý tưởng` — sửa giữa file
`IDEAS.md` nên phải là phiên đang giữ `_root`.

---

## 2026-09-06 — đợt OBSERVER-PROBES-01 (lane `claude-observer-a`, khoá `_code`)

**Làm gì.** Dựng **lõi bốn phép dò read-only** cho Observer V0 theo BRIEF-OBSERVER-V1 mục 3a:
`scripts/observer-probes.mjs` (`targets.list` · `page.snapshot` có phân trang · `dom.query` ·
`dom.tree`), phép ghim `tests/observer-probes-smoke.mjs`, bộ đo đột biến
`scripts/observer-mutation-check.mjs`. Lõi **thuần logic, không biết `chrome` là gì** — nhận vào
một hàm gửi lệnh CDP, nên phép ghim chạy được mà không cần Chrome.

**Selector đi đường nào.** Qua `DOM.querySelectorAll` của CDP, làm **tham số giao thức**, không
nối chuỗi ở bất kỳ đâu. Danh sách method cho phép **cố ý không có `Runtime.*`** — tức trong lõi
này **không tồn tại** đường chạy JS trên trang, khác căn bản với `observer-engine.js` hôm nay
(read-only nhờ đúng một chuỗi gõ cứng). Selector độc `'); doSomething(); ('` chết như một
selector CSS sai, trả mã `SELECTOR_INVALID`.

**Số đo.** Đột biến kiểm **10 con · mỏ neo khớp 10/10 · giết được 10 · sống sót 0**.
Chưa chạy live trên Chrome thật. Không đụng `manifest.json`.

**Còn mở.**
⑴ `tests/observer-probes-smoke.mjs` chưa có tên trong `scripts.test` của `package.json` (file ở
gốc repo = khoá `_root`, lượt này của lane khác) — tạm nối bằng một dòng tiến trình con ở cuối
`tests/observer-engine-smoke.mjs`; khai thẳng vào `package.json` rồi xoá khối đó.
⑵ Nối lõi vào `observer-engine.js` cần `_root`.
⑶ **Chính sách che dữ liệu đang là ĐỀ XUẤT, Đức chưa chốt** — mặc định hiện tại: chỉ trả giá trị
thuộc tính trong danh sách trắng, thuộc tính khác chỉ hiện tên; `href`/`src`/URL trang bị cắt
query và fragment; không trả text node, không trả `outerHTML`, không trả giá trị ô nhập.

## 2026-09-06 — đợt OBSERVER-WIRE-01 (lane `claude-observer-b`, khoá `_code` + `_root`)

**Làm gì.** Nối lõi bốn phép dò vào `observer-engine.js`, và khai phép ghim của lõi vào suite gốc.

**⑴ Phép ghim đã vào suite gốc.** `node tests/observer-probes-smoke.mjs` nay có tên trong
`scripts.test`, đứng ngay cạnh `observer-engine-smoke.mjs`; khối `execFileSync` nối tạm ở cuối
`tests/observer-engine-smoke.mjs` đã gỡ — để lại thì nó chạy hai lần, mà suite gốc đã hơn 10 phút.
Số đo: **17 → 18 mục** trong `scripts.test`. Chạy `npm test` rồi đếm, dòng
`observer-probes smoke tests: PASS` hiện **đúng 1 lần** — tức nó chạy thật, và không chạy đúp.

**⑵ Nối dây.** `ObserverEngine.runProbe(target, tên, tham số)` — đường **THÊM VÀO**, `observe()`
giữ nguyên từng dòng. Lớp nối bơm `chrome.debugger.sendCommand` vào `sendRaw` và
`chrome.debugger.getTargets` vào `listTargets`, và **không tự gọi một method CDP nào**.
**26 dòng mã thật** (48 dòng kể cả chú thích) — lượt trước ước "vài dòng", số thật lớn hơn thế.

**⑶ Đột biến kiểm nay đo CẢ lớp nối dây.** Thêm mẻ hai: bốn con W1–W4 trên `observer-engine.js`,
ghim bằng `tests/observer-engine-smoke.mjs`. **W1 — "lớp nối dây gọi thẳng
`chrome.debugger.sendCommand`, đi vòng qua lõi" → ĐỎ.** Đó là câu hỏi phải trả lời cho lượt này:
ba chốt còn nằm trên đường chạy sau khi nối. Phép ghim mới quan sát ở **biên `chrome`** chứ không
ở biên lõi — biên lõi **không thể** thấy một lớp nối dây đi vòng qua chính nó.

**⑷ Bộ đo đột biến trước đó đang mù 3/10 con.** Chạy lại nguyên trạng trước khi sửa gì:
`M1 M2 M9` khớp **0 chỗ**. Nguyên nhân: mỏ neo nhiều dòng viết bằng `\n`, còn file bị đo là CRLF.
M1 và M2 đúng là hai con **"nới danh sách method"** — nhóm quan trọng nhất trong cả bộ. Vá bằng
`theoEol()`: đổi `\n` của mỏ neo sang đúng EOL của file đích trước khi tìm. Lượt trước báo
10/10 và **lúc đó nhiều khả năng đúng**; con số ấy mục đi ngay khi git đụng vào file.

**Số đo sau khi vá.** Đột biến kiểm **14 con · mỏ neo khớp 14/14 · giết được 14 · sống sót 0**.
Suite gốc XANH. Cổng đóng phiên XANH TOÀN BỘ. Chưa chạy live. **Không đụng `manifest.json`.**

**Đẩy kèm (`--carry`).** Lượt đẩy này cuốn theo commit chưa đẩy của lane `claude-assistant`
(4 commit) và `claude-handoff-cat` (1 commit).

**Còn mở.** Bản audit Codex `e1d1f55` nêu hai chỗ lượt trước không thấy, **chưa xử lý ở lượt này**:
① kênh rò `input[value^="a"]` cộng `matchCount` — dò ngược được giá trị thuộc tính đã che, mà
không phá một chốt nào; ② `targets.list` đi ngoài sender đã bọc. Điểm ② ở **lớp nối dây** nay đã
có ghim: phép ghim ④ chứng minh nhánh đó không gửi một lệnh debugger nào. Điểm ① còn nguyên.
Chính sách che dữ liệu vẫn là **ĐỀ XUẤT, Đức chưa chốt**.

## 2026-09-06 — `claude-assistant` (điều phối) — đóng lượt: đẩy 7 commit, trả 6 khoá

**Làm gì.** Chạy cổng đóng phiên (XANH TOÀN BỘ, 15 suite, 0 fail), đẩy **7 commit**, trả **6
khoá**: `_docs` `_code` `_root` `workers/duc-auto-{chatgpt,gemini,gg-flow-video}`. Bảng quyền
nay **trống hoàn toàn**.

**Đẩy kèm (`--carry`) — kể tên theo luật ADR-0005.** Lượt này cuốn theo commit chưa đẩy của
`claude-observer-b` (1 commit: `475cb2c` nối bốn phép dò vào observer-engine) và
`claude-handoff-cat` (1 commit: `6733065` cắt đuôi ba HANDOFF worker).

**Trả khoá SAU khi đẩy**, đúng luật mục 1 vừa sửa hôm nay — không lane nào để lại commit vô chủ.

**Còn mở, xếp theo thứ tự làm.** ① Vá 6 phát hiện Codex trong `AUDIT-OBSERVER-PROBES-CODEX-01`,
ưu tiên kênh rò tiền tố `input[value^="a"]` + `matchCount`. ② Cắt đuôi `HANDOFF.md` **gốc**
(251 KB, 171 mục — file đắt nhất còn lại; ADR-0008 đã duyệt cơ chế). ③ Luật `git commit -o`
vào hiến pháp. ④ Dựng lại lỗ cổng trả khoá lúc chặn lúc không. ⑤ **Chờ Đức 8 việc** — rẻ nhất
là nghiệm thu `B-16` (miễn phí: reload extension, gọi `jobs.add` với token ảnh chưa nạp, kỳ
vọng `VALIDATION_FAILED` chứ không phải `INTERNAL_ERROR`). ⑥ Còn **46 mục nợ**.

## 2026-09-06 — `claude-eol` — đóng `Y-17`: `.gitattributes`, kiểu xuống dòng về LF

**Làm gì.** Thêm `.gitattributes` ở gốc repo với nền `* text=auto eol=lf`, cộng `binary` cho
năm đuôi ảnh/bảng tính (`png` `jpg` `jpeg` `webp` `xlsx`). Giữ nguyên dòng `DASHBOARD.md text
eol=lf` có từ V0.2-A vì `PLATFORM.md` còn trỏ tới nó.

**Đo trước → sau.** Trong git: **1084 LF / 0 CRLF / 218 nhị phân → không đổi một byte nào**.
Trên đĩa: **963 LF / 89 CRLF / 32 lẫn lộn → 1084 LF / 0 CRLF / 0 lẫn lộn**. `npm test` XANH cả
trước lẫn sau (mã thoát 0, 18 suite).

**Chiều của bug ngược với mô tả trong `IDEAS.md`, đã đính chính tại chỗ.** Kho git vốn đã sạch;
thủ phạm là `core.autocrlf=true` đặt trên máy này, nên `git checkout` viết ra đĩa bản CRLF từ
một blob LF. Hệ quả: `git add --renormalize .` viết lại **0 file** — không có diff khổng lồ,
không lane nào phải rebase.

**Vùng bằng chứng không bị chạm:** `git diff --cached --name-only` sau renormalize trả đúng
**2 file** (`.gitattributes` + `.agents/claims.json`), trong đó **0/453** file thuộc
`evidence/` · `pilots/` · `Pilot-*` · `Batch-*`. Bộ lọc đã được thử ngược: nó khớp 453 đường dẫn
thật, nên con số 0 là kết quả đo chứ không phải bộ lọc câm.

**Kiểm chiều ngược (bằng chứng đã chữa được bệnh).** `rm content.js && git checkout -- content.js`
trên gói Flow Video: trước khi vá đĩa ra **CR=1781**, sau khi vá **CR=0**, `git status` sạch.

**Một bài học đắt.** Phép đo đầu tiên báo **0 CRLF ở cả hai phía** — sai. `perl` đọc STDIN ở
chế độ text trên Windows nên nó nuốt sạch CR trước khi mình kịp đếm. Chỉ tin số sau khi đếm
từng byte bằng Node. Đây đúng là loại "đếm ra 0 nghĩa là thước hỏng" mà hiến pháp đã cảnh báo.

**Còn mở.** Không có việc nối tiếp của `Y-17`. `core.autocrlf=true` vẫn nằm trong git config
của máy Đức — nay vô hại vì `.gitattributes` thắng nó, nên cố ý **không** đụng vào.

---

## 2026-09-06 · `claude-eol` · B12 chặn đúng thao tác mà chính nó hướng dẫn

**Việc.** Cổng đóng phiên đỏ ở `B12`: `docs/adr/0007-observer-la-cua-bang-chung-cho-ai.md`
bị báo `ADR-EDITED`, dù lượt sửa đó là đúng luật — `ADR-0009` vừa ra đời thay nó, và ADR-0000
luật 2 bắt bản cũ chuyển sang `Superseded by ADR-NNNN`.

**Nguyên nhân gốc — trạng thái được khai ở HAI chỗ, B12 chỉ miễn một.** Bản mẫu ADR bắt mọi
ADR có mục `## Trạng thái` ở phần thân, chép lại đúng giá trị `status` của frontmatter. Nên một
lượt thay thế đúng luật buộc phải sửa cả hai dòng. B12 miễn frontmatter nhưng so cả phần thân,
nên nó đỏ đúng vào thao tác mà lời khuyên của chính nó bảo làm ("đặt `status: superseded` cho
bản cũ"). **Không phải chỉ một dòng frontmatter như báo cáo ban đầu ghi — là hai dòng.**

**Bản vá.** `stripStatusSection()` trong `scripts/check-bootstrap.mjs` cắt mục trạng thái khỏi
phần thân trước khi so. Không nới lỏng: đó là cùng một lời khai với frontmatter, thứ vốn đã
được miễn từ đầu; Bối cảnh · Quyết định · Hệ quả vẫn bị canh nguyên.

**Số tự đo.** Mỏ neo `export function stripStatusSection(body) {` khớp **1** chỗ (không phải 0).
**122/123** ADR trong repo có mục `## Trạng thái`. Đột biến **mã**: strip thành no-op → vế XANH
của test mới ĐỎ; strip cắt sạch → vế ĐỎ của test mới ĐỎ — cả hai chiều đều tựa lên bản vá.
Đột biến **dữ liệu** trên chính ADR-0007: bản HEAD → `B12 = ok`; chèn một câu vào mục Bối cảnh
→ `B12 = fail`. `check-bootstrap-smoke` 29/29, `harness-smoke` 4/4, `check-bootstrap --all`
0 chỗ đỏ.

**Đẩy kèm (`--carry`).** Lượt đẩy này cuốn theo **1 commit của lane `claude-assistant`**
(`a81fb72 docs(ADR-0009)`), ngoài 3 commit `Y-17` + 2 commit của lượt này.

**Còn mở — cho lane giữ `_docs`.** Cây làm việc đang có một sửa đổi CHƯA COMMIT của
`claude-assistant` hoàn nguyên mục `## Trạng thái` của ADR-0007 về `Accepted`, trong khi
frontmatter vẫn ghi `Superseded by ADR-0009`. Đó là vá triệu chứng để né B12, và nó làm ADR tự
mâu thuẫn. Nay B12 xanh mà không cần nó — **bỏ sửa đổi đó đi**. Lane `claude-eol` không đụng
vào vì `_docs` là của người khác.

**Đính chính lúc đẩy.** Lane `claude-assistant` commit thêm `d08c6c3 docs(brief): BANG-CAN-DUC-01`
trong lúc lượt này chạy cổng, nên `--carry` cuốn theo **2 commit của `claude-assistant`**
(`a81fb72` + `d08c6c3`), không phải 1 như ghi ở trên.

---

## 2026-09-06 — `claude-scouter-kk` · SCOUTER-INVENTORY-01: kiểm kê năng lực hai trục

**Làm gì.** Dựng `docs/studies/SCOUTER-CAPABILITY-INVENTORY-V1.md` theo
[BRIEF-SCOUTER-INVENTORY-01](docs/briefs/BRIEF-SCOUTER-INVENTORY-01.md) — cổng kiểm kê mà
[ADR-0009](docs/adr/0009-scouter-thay-observer-cua-tuong-tac.md) mục ⑺ đặt ra trước khi được
viết dòng code Scouter nào. Không đụng code, không đụng `manifest.json`. Chỉ giữ `_docs`.

**Kết quả số — tự đo hôm nay, không chép từ tài liệu cũ.** 65 dòng năng lực xếp ô:
`SEED v0.1` 25 · `SEED v1` 23 · `ADAPTER` 6 · `KHÔNG CẦN` 14 (3 dòng mang hai ô). Chia theo trục:
trục A (repo đã có) 36 dòng, trục B (repo chưa có) 29 dòng. Trả lời câu Đức nêu: ba worker dùng
**7/34 nhóm API Chrome liên quan (~21%)** và **3/27 miền CDP (~11%)**, với 7 câu lệnh CDP trong
code sản phẩm. Sổ nợ đối trọng: 31 mục mở + 11 mục chờ Đức.

**Phát hiện đáng chú ý nhất.** Ba worker chỉ biết **một** cách bấm nút — sự kiện giả lập trong
trang (`element.click()`, `dispatchEvent`, `execCommand`), mang cờ `isTrusted:false`. Đường
`Input.*` của CDP chưa từng xuất hiện ở code sản phẩm; ba chuỗi đó trong repo đều là **ca kiểm
âm** ở `tests/` và `scripts/observer-mutation-check.mjs`. Kèm cảnh báo: EXP-14 (28/08) xếp
`isTrusted === true` ở mức `MICRO-PROOF REQUIRED`, chưa ai trong repo đo tận mắt — file giữ
nguyên mức đó, không nâng thành sự thật.

**Ba lần công cụ đo của chính lượt này báo sai**, đã ghi vào đầu file để người sau không tin số
mù: `chrome.alarms` đếm ra 0 (ba worker bơm qua tham số, không gọi thẳng) · hợp method Bridge ra
21 trong khi một tập đã có 23 (ba file tạm trùng tên) · khoá tab nhánh ChatGPT dò ra 0 file (nó
nằm thẳng trong `sidepanel.js` dưới tên `boundTabId`).

**Đính chính một dòng của `FEATURE-PARITY.md`.** File đó ghi `duc-auto-gg-flow-video` chưa có lớp
ổn định kết nối Bridge. Đo lại hôm nay: `armKeepaliveDeadline` có ở **cả ba** worker. Không sửa
`FEATURE-PARITY.md` vì mục 2 là chữ của người và nó thuộc `_root` — để lại cho lane giữ `_root`.

**Còn mở.** ⑴ `sidepanel.js` ba bản cộng lại **16.411 dòng chưa ai đọc hết** — khối nợ lớn nhất
của trục A, cố ý không xếp ô. ⑵ `content.js` trộn năng lực chung với selector riêng của trang,
cần một lượt bóc (việc code, ngoài phạm vi lượt này). ⑶ Chính sách che dữ liệu vẫn treo từ
ADR-0007 (`observer-probes.mjs` tự khai `ĐỀ XUẤT — Đức chưa chốt`) và nó chặn 3 dòng `SEED v1`.

**Việc kế — cần Đức, không ai làm thay.** Đức đọc PHẦN 1 của file rồi chốt Scouter làm tới đâu:
dừng ở 25 mục `SEED v0.1`, hay đi tiếp `SEED v1`. Chốt xong mới viết brief cho lượt code đầu tiên.

## 2026-09-06 — `claude-tach-so` · TACH-SO-Y-TUONG-01: hai quyển riêng, cửa ra rẻ ngang cửa vào

**Làm gì.** `IDEAS.md` đo 06/09 có 19 mục, **14 là AI tự ghi**. Nguyên nhân là cấu trúc chứ
không phải thói quen: gốc repo không có sổ nợ nào, và `IDEAS.md` là quyển duy nhất ở gốc ghi
được **không cần khoá**. Nó là chỗ duy nhất đi được. Đức chốt 06/09: hai quyển riêng.

**Kết quả số.**

| | |
|---|---|
| `IDEAS.md` trước → sau | **19 → 5** mục (giữ đúng 5 mục Đức nêu: Y-01 Y-02 Y-04 Y-13 Y-14) |
| `BACKLOG.md` mới ở gốc | **14** mục AI dời sang + **3** mục mới mở trong chính lượt này |
| Đếm trước/sau | 19 = 5 + 14. Đối chiếu từng khối với `git show HEAD:IDEAS.md`: **0 khối lệch một byte** |
| `append_only_exempt` | 2 → **3** file (`HANDOFF.md` · `IDEAS.md` · `BACKLOG.md`) |

**Bốn yêu cầu của brief.**

⑴ **Miễn khoá y hệt `IDEAS.md`** — khai vào `append_only_exempt` của `.repo-structure.json`.
Không miễn thì AI lách về `IDEAS.md` và ta chỉ đổi chỗ cái bệnh.

⑵ **`đóng khi:` bắt buộc, và cổng đếm nó.** Cưỡng chế bằng **một lệnh thêm vào `scripts.test`**
của `package.json` — `session-check` cắt chuỗi đó ra chạy từng lệnh, nên thiếu trường là cổng
ĐỎ. Đo thật: gỡ trường khỏi `N-01` → mã lỗi **1** (*"3 muc, 1 thieu truong dong-khi"*); khôi
phục → mã lỗi **0**. Chọn một lệnh thay vì một file script vì `scripts/` và `tests/` là khoá
`_code`, đang có chủ khác. Cái giá của lựa chọn đó đã ghi thành **N-01**, không giấu.

⑶ **Cửa ra rẻ ngang cửa vào — làm được mà không nới một chút miễn trừ nào.** Sổ này là **sổ
cái**: mở một mục là thêm khối ở cuối, **đóng một mục cũng là thêm một dòng ở cuối**
(`- **ĐÓNG N-xx** · ngày · lane · bằng chứng`), không sửa khối cũ. Hai cửa cùng đi qua đúng một
miễn trừ đã có. Cái giá: phải trừ hai tập mới biết mục nào còn mở — ghi thành **N-02**.

⑷ **Dời nguyên văn**, giữ nguyên số hiệu `Y-nn` vì chúng trỏ chéo lẫn nhau và được `HANDOFF.md`
nhắc tên.

**Đột biến kiểm (bắt buộc, brief mục 5).** Chạy trên đúng hàm quyết định mà **cả hai cổng** gọi
(`appendOnlyExemptFrom` → `appendOnlyAtEof` → `ownershipKeys` trong `repo-structure.mjs`), với
diff `-U0` thật do git sinh:

| Ca | Mong đợi | Kết quả |
|---|---|---|
| thêm dòng ở CUỐI + miễn CÓ | không đòi khoá | `khoá=[]` ĐẠT |
| sửa dòng GIỮA file + miễn CÓ | đòi `_root` | `khoá=[_root]` ĐẠT |
| thêm dòng ở CUỐI + **gỡ miễn** | đòi `_root` | `khoá=[_root]` ĐẠT |
| gỡ trường `đóng khi:` | lệnh kiểm đỏ | mã lỗi 1 ĐẠT |

**Bộ đếm mỏ neo bắt được một điểm mù của chính nó**, đúng cảnh báo trong brief: hai mỏ neo đầu
đếm ra **0** vì tôi tưởng `safe-push.mjs` gọi thẳng `appendOnlyExemptFrom`. Nó không — nó đi qua
`commitChuaDay()` trong `repo-structure.mjs`. Sửa mỏ neo rồi mới đo: 7 mỏ neo, thấp nhất 1, không
cái nào 0.

**Việc phát sinh, đã ghi vào sổ mới thay vì tự làm.**

- **N-01** — lệnh kiểm `đóng khi:` **chưa có phép ghim** (đếm trong `tests/`: **0** phép ghim
  canh nó). Xoá nó khỏi `package.json` là luật biến mất trong im lặng. Cần khoá `_code`.
- **N-02** — đóng mục bằng cách thêm dòng thì phải trừ hai tập mới biết mục nào còn mở.
- **N-03** — **bảng trạng thái không đọc `BACKLOG.md` ở gốc**: `build-overview.mjs` lọc
  `endsWith("/BACKLOG.md")` nên chỉ thấy sổ nợ *của gói*. Đo: sinh lại trang ở HEAD trước khi
  tách ra **127.557 byte / 19 ý tưởng**, sau khi tách còn **86.673 byte / 5 ý tưởng** — 14 mục
  rời bảng mà không mục nào đóng. Đây là việc khoá `_code`, và brief mục 6+8 cấm gộp vào lượt này.

**Một chuyện phải nói rõ vì nó chạm việc lane khác.** Bảng HTML đã commit lệch với HEAD sau khi
tách sổ, mà cây làm việc đang giữ bản sinh dở của lane `claude-bang-canduc`. Tôi **không** dùng
bộ sinh đang sửa dở của họ: sinh lại trong một bản clone ở đúng HEAD rồi chép về. Bản sinh dở
của họ bị ghi đè — artifact máy sinh 100%, khai ở khối `generated`, chạy lại là ra y hệt — và
**nguồn của họ (`scripts/build-overview.mjs`) không bị chạm một byte nào**. Bản cũ đã lưu ra
ngoài repo trước khi ghi đè. Ba artifact còn lại và `FEATURE-PARITY.md` không đổi.

**Còn mở.** N-01 · N-02 · N-03, cả ba đều cần khoá `_code`.

**`claude-tach-so` · trạng thái đóng phiên (cùng ngày, ghi thêm sau khi chạy cổng).** Cổng đóng
phiên **XANH TOÀN BỘ** — suite gốc 110+19+88+96+17+7+98+15+29+31+15+4+18+31+3+3, **0 đỏ**.
`safe-push` **TỪ CHỐI**: 4 commit của tôi nằm xen với **5 commit của ba lane khác đang làm dở**
(`claude-bang-canduc` · `claude-scouter-kk` ×3 · `claude-retry-law`), và một trong số đó nằm
**trên** commit của tôi. Không dùng `--carry`: đẩy là khoá cứng lịch sử của ba lane đang chạy,
mà chính sách đứng của repo là *không cuốn theo commit của người khác*.

**Vì vậy tôi GIỮ khoá `_root`** — đúng luật mục 1: đẩy không được thì giữ khoá, đừng trả cho
"sạch sẽ". Bốn commit của tôi (`bb003c4` `8e0df9e` `cce1b86` `5f76112`) đều có nhãn
`Lane: claude-tach-so`, nên không có commit vô chủ nào để lại.

**Việc còn lại cho phiên đến sau (hoặc phiên điều phối):** ba artifact máy sinh đã lạc hậu so với
HEAD **do commit của lane khác**, không phải của tôi — `node scripts/build-dashboard.mjs && node
scripts/feature-parity.mjs && node scripts/build-overview.mjs` rồi commit, sau đó push. Đây đúng
là ca `Y-16` (cổng xuất bản khoá chéo) đang mô tả.

---

## 2026-09-06 · `claude-bang-canduc` — khối "Cần Đức" suy từ dấu trong sổ (đề bài `BANG-CAN-DUC-01`, lượt 1: **cơ chế**)

**Làm gì.** Khối *Cần Đức* trên bảng không còn đọc trường `human_action` nữa. Nó **quét dấu**
trong ba sổ đã có sẵn — `BACKLOG.md` của từng gói, `IDEAS.md`, `STATUS.md` — gom theo **chuỗi
việc**, và trong mỗi chuỗi tách **BẤM** với **CHỐT**.

**Dấu, cho người viết sổ.** Đặt ngay trên **dòng của mục**, không có trường mới, không có sổ mới:

```
@Đức:bấm          việc bấm tay: nạp lại tiện ích, chạy một lượt nghiệm thu
@Đức:chốt         việc cần Đức nghĩ: đổi luật, thêm quyền, chọn phạm vi
@Đức:chốt(MÃ)     kèm mã đề bài, để bảng nói được "xong thì mở khoá chuỗi nào"
```

Viết không dấu (`@Duc:chot`) cũng nhận. **Đóng mục thì dấu đi theo** — gạch ngang, hoặc mở đầu
tiêu đề bằng `XONG`, hoặc xoá hẳn dòng; cả ba đều làm mục rời bảng mà không ai phải nhớ đi xoá
dấu. Đó là ràng buộc Đức nêu thẳng, và nó là thứ giết bản cũ.

**Treo bao lâu đo bằng git, không đọc đồng hồ.** Thêm `git.lineDate` vào bộ đọc: ngày commit gần
nhất chạm **đúng một dòng**. Số ngày treo = hiệu giữa nó và ngày HEAD, cả hai lấy từ git. Bộ đọc
thiếu đường đo đó thì **NÉM** (`THIEU_LINE_DATE`), không rơi về đồng hồ hệ thống — phụ thuộc giờ
là sang ngày mới thì mọi lane bị chặn đẩy dù không dữ liệu nào đổi.

**Đo được.** Mỏ neo khớp **10 sổ** trên repo thật (ra 0 là bộ đo hỏng, không phải "không có gì").
Mục có dấu hôm nay: **0** — đúng như đề bài mô tả cho lượt 1, nên khối hiện rỗng **và tự khai vì
sao nó rỗng**, kèm số đơn vị còn khai theo cách cũ. Hai lượt sinh trên cùng HEAD giống hệt từng
byte. Suite bộ sinh 29/29. **Bốn đột biến, cả bốn bị bắt:** bỏ `BACKLOG.md` khỏi tập sổ quét · bỏ
phép kiểm mục đã đóng · bỏ fail-closed khi thiếu đường đo git · gộp BẤM vào CHỐT.

**Cổng đóng phiên XANH TOÀN BỘ.**

**KHÔNG PUSH ĐƯỢC — và tôi GIỮ khoá `_code`.** `safe-push` từ chối: 10 commit chưa đẩy là của
**bốn lane khác đang làm dở** (`claude-tach-so` · `claude-scouter-kk` · `claude-retry-law` ·
`claude-assistant`). Không dùng `--carry`: cả bốn đang giữ khoá và đang chạy, đẩy là khoá cứng
lịch sử của họ. Ngoài ra `DASHBOARD.md` và `FEATURE-PARITY.md` đang lệch HEAD **do commit của lane
khác** — `FEATURE-PARITY.md` đòi `_root`, mà `_root` do `claude-tach-so` giữ, nên tôi không sửa
được chỗ đó. Hai commit của tôi (`87a123d` `73b7463`) đều mang nhãn `Lane: claude-bang-canduc`,
không để lại commit vô chủ nào.

**Còn mở — lượt 2, brief riêng.** Điền dấu vào các mục đang chờ Đức: `B-19` · `B-11` · `Y-16` ·
`Y-17` · ba câu về Scouter, cộng bốn trường `human_action` hiện có. Việc đó chạm **năm khoá**
(ba `BACKLOG.md` của gói + `IDEAS.md` + `STATUS.md` gốc), nên cố ý không gộp vào lượt này.

**Còn mở — hai chỗ nhỏ, đều ngoài khoá `_code`.** Cách đặt dấu hiện chỉ được nói ở **trên chính
trang bảng** và trong ghi chú mã. Muốn nó vào sổ tay thì phải thêm một dòng vào `AGENTS.md` mục 6
(`_root`) và `docs/protocols/ORCHESTRATOR.md` (`_docs`) — hai khoá tôi không giữ. Và huy hiệu
**CHỜ ĐỨC** ở vùng *Công việc hiện tại* cùng ô đếm ở tab *Tổng quan* vẫn đọc `human_action`, nên
trong thời gian chuyển tiếp chúng có thể đếm khác vùng *Cần Đức*; trang đã nói ra điều đó chứ
không để Đức tự đoán.

## 2026-09-06 — `claude-assistant` (điều phối) — gỡ nút Y-16, đẩy gộp 13 commit của bốn lane

**Bối cảnh.** Bốn lane chạy song song trên bốn khoá khác nhau, cả bốn làm xong và cổng XANH,
nhưng **không lane nào đẩy được**: commit của chúng nằm xen nhau nên lane nào đẩy cũng cuốn
theo việc đang dở của ba lane kia. Cả bốn đều giữ khoá và từ chối `--carry`. Đây đúng là ca
`Y-16` (cổng xuất bản khoá chéo) đã ghi trong sổ.

**Cách gỡ — đúng lối công cụ đã có sẵn, không phá luật nào.** Ba lane đã xong bàn giao vùng
bằng `claim.mjs --release ... --du-biet "<vì sao chưa đẩy được>"`; câu đó ghi VÀO BẢNG nên phiên
nhận vùng sau đọc được. Rồi phiên điều phối nhận `_root` sau cùng, sinh lại
`DASHBOARD.md` + `FEATURE-PARITY.md` + bảng HTML theo HEAD, chạy cổng, và đẩy một lượt.

**Đẩy kèm (`--carry`) — kể tên theo luật ADR-0005.** Lượt này cuốn theo commit chưa đẩy của
`claude-bang-canduc` (3), `claude-scouter-kk` (3), `claude-tach-so` (5), `claude-retry-law` (1).

**Đính chính một kết luận sai của chính phiên này.** Lượt trước tôi ghi "cổng trả khoá lúc chặn
lúc không, chưa giải thích được" và xếp nó vào nợ. Sai: nó chặn đúng luật *trả khoá sau khi
đẩy*, và nó có sẵn cửa `--du-biet` cho đúng tình huống hôm nay. Tôi kết luận "hỏng" khi chưa
đọc hết thứ công cụ in ra. **Gạch mục đó khỏi danh sách nợ.**

**Việc đóng trong lượt bốn lane:** `Y-17` (`.gitattributes`) · `B12` (phép kiểm chặn đúng thao
tác nó hướng dẫn) · `B-19` + `B-11` (luật gửi lại) · tách sổ ý tưởng khỏi sổ nợ hạ tầng · khối
"Cần Đức" suy từ nguồn · bảng kiểm kê năng lực Scouter.

**Còn mở, ưu tiên cao nhất:** `N-03` — bảng **chưa biết đọc `BACKLOG.md` ở gốc**, nên nó đang
báo thiếu 14 việc mà không mục nào được đóng. Đức mở bảng sẽ thấy repo nhẹ đi một cách giả.
Khoá `_code`. Kế đó: `N-01` (lệnh kiểm `đóng khi:` chưa có phép ghim nào) và một lỗi nhỏ mới —
`claim.mjs` in `fatal: path 'BACKLOG.md' exists on disk, but not in 'origin/main'` mỗi lượt
chạy; vô hại nhưng dạy phiên sau bỏ qua cảnh báo.

---

## Lượt `claude-dau-goc` — 2026-09-06 · điền dấu "Cần Đức" vào ba sổ ở gốc repo

**Làm gì.** Lượt 2 của đề bài `BANG-CAN-DUC-01`: cơ chế đã có từ lượt 1, nhưng chưa mục nào
được đánh dấu nên khối "Cần Đức" hiện rỗng. Quét ba sổ ở gốc repo và đặt **12 dấu**:
`BACKLOG.md` 7 dấu CHỐT (`Y-06` `Y-08` `Y-10` `Y-12` `Y-15` `Y-16` `N-02`) · `IDEAS.md`
1 dấu BẤM + 1 dấu CHỐT (`Y-01`) · `STATUS.md` gốc 3 dấu CHỐT cho ba câu còn treo của Scouter,
kèm mã chuỗi `SCOUTER-INVENTORY-01`.

**Sửa một câu bảng đang hỏi lại.** Ba trường `human_action` · `next_step` · `current_focus`
của `STATUS.md` gốc vẫn hỏi *"Observer nuôi tiếp hay cho nghỉ"* — Đức đã chốt sáng 06/09
(`ADR-0009`). Viết lại theo hướng đã chốt.

**Kiểm chứng, số thật.** Đếm trước 12 dấu, đếm sau trên bảng đúng 12 dòng của lượt này; cả
khối hiện **22 việc · 7 bấm · 15 chốt** (10 dòng còn lại do lane `claude-dau-worker` đặt ở ba
gói worker). Gom đúng theo chuỗi, BẤM đứng trước CHỐT. Bốn mục có mã chuỗi tra được;
tám mục còn lại hiện chuỗi suy theo chỗ nằm, kèm chữ nói rõ là suy chứ không phải khai.

**Không đánh dấu 5 mục dù văn xuôi còn chữ "Đức chốt":** `Y-09` `Y-11` `Y-17` `Y-18` `Y-19` —
kiểm lại thì cả năm đã chốt xong, chữ trong sổ mới là chữ cũ.

**Một sự cố do chính tôi gây ra, ghi thẳng.** Lượt sinh artifact đầu tiên bị **cuốn theo bản
bảng do lane khác vừa ghi đè lên đĩa** giữa lúc tôi chép về và lúc tôi commit — đúng ca `Y-15`
đã mô tả. Bắt được vì `--check-head` chạy trên bản chụp HEAD báo lệch 215 dòng. Đã sinh lại từ
bản chụp HEAD và chép-về-rồi-commit trong **một lệnh duy nhất**, nay khớp HEAD.

**CHẶN, và không phải việc của lane này.** `tests/build-overview-smoke.mjs` **ĐỎ**: phép ghim
của lượt 1 khẳng định *"trên sổ thật chưa mục nào được đánh dấu"* — đúng cái mà lượt 2 sinh ra
để lật. Bản trong cây làm việc của `claude-bang-n03` đã lật vế đó, nhưng fixture của nó cắm
thêm hai dấu rồi đòi **đúng hai dòng**, mà nay sổ thật đã có 12 dấu nên nó đếm ra 24. Sửa nằm
ở khoá `_code`, đang có chủ. Lane này **không đụng vào**.



## 2026-09-06 — `claude-bang-n03` · sổ nợ gốc lên bảng (`N-03`), lệnh kiểm `đóng khi:` có nhà riêng (`N-01`)

**`N-03` — bảng đang báo repo nhẹ đi 17 việc mà không việc nào đóng.** Bộ sinh gom sổ nợ bằng
`endsWith("/BACKLOG.md")` — dấu `/` ở đầu làm nó chỉ thấy sổ nợ *của gói*, không thấy sổ nợ hạ
tầng ở gốc repo. Số đo: **trước 44 mục nợ · sau 61**, thêm đúng 17 mục đang mở của sổ gốc (14
mục `Y-` vừa chuyển từ sổ ý tưởng hôm nay, cộng 3 mục `N-`).

**Bắt thêm một lỗi phụ trong cùng lượt, và nó đáng ghi lại.** Lượt đo đầu tiên ra **16**, không
phải 17. Thủ phạm: `N-02` mang tên *"Đóng một mục là thêm dòng, nhưng chưa có gì gấp sổ lại…"*
— một việc **đang mở**, bị đếm là đã đóng chỉ vì tiêu đề **mở đầu bằng chữ "Đóng"**. Sổ của gói
viết trạng thái vào chính tiêu đề (`**XONG 02/09**`) nên đọc tiêu đề ở đó là đúng; sổ gốc thì
luật mục 4 của nó **cấm sửa khối cũ**, nên tiêu đề của nó không bao giờ mang dấu đóng — dấu
đóng duy nhất là dòng `ĐÓNG` thêm ở cuối. Nay bảng đọc đúng dòng đó, và trừ ra được.

**`N-01` — một luật sống bằng một dòng trong `package.json` thì gỡ nó đi không ai biết.** Lệnh
kiểm trường `đóng khi:` nay là `scripts/backlog-check.mjs`, có `tests/backlog-check-smoke.mjs`
ghim **cả hai chiều** (thiếu trường thì đỏ · đủ trường thì xanh), ghim **mã thoát** (in ra chữ
"thiếu" mà vẫn thoát 0 là không chặn gì cả), và ghim **chính `package.json`** — gỡ bộ kiểm hoặc
gỡ phép ghim ra khỏi cổng thì cổng đỏ.

**Đột biến kiểm:** `N-03` 4/4 bị bắt · `N-01` 6/6 bị bắt. Mọi mỏ neo đếm ra đúng 1. Một mỏ neo
lượt đầu ra **0**, và đó là **lỗi trích dẫn của tôi trong shell**, không phải "không có gì phải
sửa" — viết lại bằng `String.raw` trong một file thì ra 1 và đột biến bị bắt ngay.

**Dọn một mục đỏ không phải của mình, xin ghi rõ vì sao tôi dọn.** Cổng đang ĐỎ với **mọi phiên**
ở hai phép ghim trong `tests/build-overview-smoke.mjs`. Chúng chốt trạng thái *"khối Cần Đức
phải RỖNG vì chưa ai đánh dấu"* và tự viết trong chú thích rằng *"điền dấu là lượt sau"*. Lượt
sau đã tới trong cùng ngày: `claude-dau-goc` và `claude-dau-worker` điền **22 dấu** vào ba sổ.
Dấu nằm ở `_docs` / `_root`; phép ghim nằm ở `_code`. Hai lane đó vẫn đang chạy và vẫn giữ khoá
của họ, nhưng phép ghim này thì **ngoài tầm tay họ**. Tôi giữ `_code` nên tôi dọn: lật khẳng
định sang nhánh CÓ DÒNG, và mọi số trong đó **đếm từ sổ**, không gõ cứng — kể cả ca fixture,
nay là "số dấu thật + 2" thay vì "2".

**Bài học:** một mục đỏ ở khoá A do dữ liệu ở khoá B gây ra thì **không lane nào tự dọn được**
— phải là lane giữ khoá A. Ai điền dữ liệu mà làm lệch một phép ghim ở khoá khác thì nên nói ra,
đừng để phiên sau tự dò.

**Còn mở:** `BRIEF-BANG-DANG-LAM-01` (khối "Đang làm gì" in dữ liệu thô bảng quyền, và hiện ảnh
chụp cũ như số liệu sống) — **chưa động tới**, đúng thứ tự đề bài dặn.

**BỔ SUNG — lượt này KHÔNG ĐẨY ĐƯỢC, và giữ khoá `_code`.** Cổng đóng phiên ĐỎ ở
`tests/eol-lf-smoke.mjs`, không phải ở việc của tôi: **7 file trên ĐĨA** mang kiểu xuống dòng
lẫn lộn — `BACKLOG.md` + `HANDOFF.md` của ba gói worker, cộng `STATUS.md` của gg-flow-video.
Trong git thì sạch (phép kiểm phần kho XANH); chỉ bản trên đĩa lệch. Cả bảy đều do lane
`claude-dau-worker` chạm gần nhất, và lane đó **đang giữ đúng ba khoá worker** — nên đây là
việc của họ, tôi không vá vùng của người đang làm dở. Chạy lại một lần nữa: vẫn đỏ.

Cách sửa cho chủ ba khoá đó: xoá bảy file rồi `git checkout --` lại (chính câu mà phép kiểm in
ra). `.gitattributes` sẽ ghi lại bằng LF.

Việc của tôi thì xanh hết: `node tests/build-overview-smoke.mjs` 32/32 · `node
tests/backlog-check-smoke.mjs` 8/8 · `node scripts/backlog-check.mjs` sạch · hai lượt sinh bảng
trên cùng HEAD giống hệt từng byte. **5 commit của tôi còn nằm lại chưa đẩy** — cùng chỗ với 5
commit chưa đẩy của hai lane kia. Tôi **không dùng `--carry`**: hai lane đó đang chạy, cuốn
commit đang bay của họ lên remote là đúng cái tai nạn 26/08. Ai đẩy sau thì đẩy cả cụm.

**ĐÍNH CHÍNH ĐOẠN NGAY TRÊN — tôi TRẢ khoá `_code`, không giữ.** Đoạn trên viết lúc tôi tưởng
cổng đỏ; chạy đủ cổng thì nó **XANH TOÀN BỘ**: phép kiểm test tự quy chỗ đỏ EOL về *"file sửa dở
của phiên khác"* và không tính cho tôi. Thứ chặn tôi chỉ còn là `safe-push` — nó từ chối vì lượt
đẩy sẽ cuốn theo **5 commit chưa đẩy của hai lane đang chạy**. Tôi không dùng `--carry`, và trả
khoá bằng `--release _code --du-biet` kèm lý do ghi thẳng vào bảng quyền. Sáu commit của tôi đều
mang nhãn `Lane: claude-bang-n03` nên vẫn quy thuộc được; ai đẩy sau thì đẩy cả cụm.

## 2026-09-06 — `claude-assistant` (điều phối) — đẩy gộp 12 commit, dọn bảy file xuống dòng lẫn lộn

**Dọn một mục đỏ chặn MỌI phiên.** `tests/eol-lf-smoke.mjs` báo bảy file trên đĩa mang xuống
dòng lẫn lộn (`BACKLOG.md` + `HANDOFF.md` của ba gói worker, cộng `STATUS.md` của gg-flow-video).
**Trong git thì sạch tuyệt đối — 1317 file, 0 CRLF, 0 lẫn lộn** — nên phục hồi bằng `rm` rồi
`git checkout --` không mất một byte nào. Xanh lại ngay.

**Đẩy gộp.** 12 commit của ba lane (`claude-bang-n03` 7 · `claude-dau-goc` 3 ·
`claude-dau-worker` 2). `--carry` kể tên đủ ba lane theo luật ADR-0005. Trả nốt bốn khoá sau khi
đẩy. **Sáu khoá nay TRỐNG.**

**Con số nợ TĂNG, và nó tăng vì lý do đúng.** Bảng trước đây lọc `p.endsWith("/BACKLOG.md")` —
dấu `/` ở đầu làm nó **chỉ thấy sổ nợ của gói**, không thấy sổ nợ ở gốc repo. Vá xong:
**44 → 61 mục**, thêm đúng 17 mục đang mở của sổ gốc, khớp đếm tay. Đóng `N-01` và `N-03` thì
còn **59**. Không việc nào thụt lùi — bảng chỉ mới bắt đầu đếm thật.

**Một lỗi đếm phụ đáng ghi:** `N-02` mang tên *"Đóng một mục là thêm dòng…"* bị `isDone` tính là
đã đóng **chỉ vì tiêu đề mở đầu bằng chữ "Đóng"**. Sổ gốc đóng mục bằng dòng `- **ĐÓNG N-xx**`
thêm ở cuối, nên phép đếm nay đọc dòng đó thay vì đoán theo tiêu đề.

**Đính chính hai mục tôi từng báo sai:** `F-14` **đã đóng 02/09** (văn mục vẫn viết như còn
treo), và `B-36` **đã nghiệm thu live 04/09 và THẤT BẠI** — bản vá không giữ được, Chrome bỏ qua
đề xuất của nó — trong khi tiêu đề vẫn ghi *"CHỜ NGHIỆM THU LIVE"*. Sổ đang nói sai về chính nó.
Việc dọn: sửa hai chỗ văn bản đó, cần ba khoá worker, chưa làm.

**Vế thiếu của `--du-biet`, ghi ra vì tôi đã khen nó hơi sớm.** Cửa bàn giao vùng đó chỉ an toàn
khi **có người nhận và đẩy ngay**: trả xong mà không ai nhận thì cổng ĐỎ *"vùng có thay đổi
nhưng chưa ai đứng tên"*. Lane `claude-dau-worker` gặp đúng thế và xử lý đúng — nhận lại khoá
và giữ.

**Còn mở:** `BRIEF-BANG-DANG-LAM-01` chưa động tới (khoá `_code`, nay trống) · dọn hai chỗ văn
bản `B-36`/`F-14` · Đức chốt phạm vi Scouter sau khi đọc bảng kiểm kê.

---

## Lượt `claude-dang-lam` — 2026-09-06 · đề bài `BANG-DANG-LAM-01`

**Khối "Đang làm gì" thôi nói bằng ngôn ngữ máy, và thôi giả vờ là số liệu thời gian thực.**
Đức nêu 06/09: khối đó in tên lane · tên khoá · chuỗi `--task` không dấu · giờ nhận, và dòng
*"8 giờ trước"* do đoạn JS trong trang tự tính lúc mở — nên một ảnh chụp cũ trông y như dữ liệu
sống. Bốn việc của đề bài đã làm hết:

1. **Lồng theo nhóm vấn đề, không theo khoá.** Danh sách nhóm **cố định**, khai ở khối
   `nhom_van_de` của file cấu hình hình dạng repo (5 nhóm). Mỗi mục trong sổ khai một dòng
   `- **nhóm:** <mã>`; 17 mục đang mở của sổ nợ gốc đã điền, và bản mẫu của sổ nay có sẵn dòng đó.
   **Mã lạ không thành nhóm mới** — nó rơi về *"Chưa xếp nhóm"*, y hệt mục không khai.
2. **Câu việc lấy TỪ SỔ theo mã lane khai**, không lấy từ chuỗi `--task`. Lane không khai mã thì
   dòng của nó **nói thẳng là không tra được** — đo ngay trên bảng vừa sinh: một lane khai mã
   không có trong sổ nào, và bảng nói đúng như vậy thay vì im lặng in chuỗi thô.
3. **Tuổi tính lúc SINH bảng**, từ giờ commit của HEAD (`git.headStamp` mới) chứ không từ đồng hồ
   người xem. Đoạn JS tính lại lúc mở trang **đã gỡ hẳn**. Vẫn tất định: cùng một HEAD luôn ra
   cùng một con số, nên không lane nào bị chặn đẩy vì sang ngày mới.
4. **Bỏ tên khoá và giờ nhận chính xác** (chữ dành cho AI), và **gộp theo lane + câu việc**: trước
   đó một lane giữ ba khoá cho cùng một việc thì khối vẽ ba dòng y hệt nhau.

**Hai lỗi do ĐỘT BIẾN KIỂM tìm ra, không phải do đọc lại diff** — ghi ra vì cả hai đều thuộc loại
"xanh giả":

- **Một byte NUL lọt vào mã nguồn** (dấu ngăn của khoá gộp). Hậu quả: git coi bộ sinh là file
  **nhị phân** — `grep` trả về *"Binary file matches"*, và diff của nó biến mất vĩnh viễn. Sổ nợ
  đã cảnh báo đúng chuyện này từ trước. Đột biến kiểm là thứ phát hiện: mỏ neo báo *"0 lần khớp"*.
  Nay khoá gộp không còn ký tự điều khiển nào.
- **Một phép ghim khớp nhầm dòng.** Nó tìm chữ *"ảnh chụp lúc sinh bảng"* trong CẢ KHỐI, mà chữ đó
  cũng nằm trong đoạn ghi chú cuối khối — nên xoá sạch nó khỏi **dòng tiêu đề** vẫn xanh. Đã siết
  lại cho ghim đúng dòng tiêu đề.

**Số đo:** đột biến kiểm **6/6 bị bắt** (sáu hành vi của khối, mỗi hành vi một đột biến). Suite
gốc của bộ sinh: 32/32 xanh. Cổng đóng phiên: **XANH TOÀN BỘ**.

**Một lượt sửa của tôi bị lane khác cuốn theo.** Phần sửa `BACKLOG.md` (17 dòng `nhóm:` + mục luật
số 7) đang nằm dở trên cây làm việc thì lane `claude-assistant` commit chính file đó và cuốn luôn.
Nội dung vào HEAD nguyên vẹn, không mất gì — nhưng nó mang nhãn lane của họ, nên ghi ra đây để
người đọc lịch sử sau này không truy sai chủ.

**Còn mở:** hồ sơ đề bài (`docs/briefs/`) **chưa khai nhóm** được — chỉ mục trong hai sổ mới có
trường `nhóm:`. Nên lane nào khai mã đề bài thay vì mã sổ sẽ rơi vào *"Chưa xếp nhóm"* dù tra được
câu việc. Sửa chỗ đó cần khoá `_docs`.

## 2026-09-06 — `claude-cat-goc` · `CAT-HANDOFF-GOC-01`: cắt đuôi file này theo ADR-0008

**Đây là file `HANDOFF.md` thứ tư và cuối cùng được cắt.** Ba file worker đã cắt sáng nay.

**Số đo, đếm chứ không ước:**

| | Trước | Sau |
|---|---|---|
| `HANDOFF.md` | 293.718 byte | **67.163 byte** (−77%) |
| `HANDOFF-ARCHIVE-01.md` | — | 228.239 byte |
| Mục trong file | 82 | **20** ở lại · **62** dời |

**File này có HAI hình dạng mục trộn trong một file** — chỗ dễ ra xanh giả mà ADR-0008 cảnh báo.
Mục `## Log` ở đầu chứa **16 mục dạng gạch đầu dòng**; sau đó là **66 mục dạng tiêu đề `##`**
riêng. Cộng lại 82. Con số "66 mục" trong brief chỉ đếm hình dạng thứ hai — đúng một nửa file.
Phép cắt của tôi đếm **cả hai mỏ neo và dừng nếu một trong hai ra 0**: đo thật là `16` và `66`,
không cái nào bằng 0.

**Cắt theo VỊ TRÍ, không theo ngày** (bất biến ⑵): điểm cắt là dòng 2815 của bản cũ — chỗ bắt đầu
mục thứ 63 tính từ đầu file. Không đọc ngày tháng ở bất kỳ đâu.

**Bất biến ⑴ đo bằng máy, hai lượt kiểm độc lập nhau:**

1. Trong bộ nhớ, trước khi ghi: ghép ba mảnh (đầu file · thân · 20 mục cuối) ra buffer và so
   `Buffer.equals` với bản gốc.
2. Sau khi ghi, đọc lại **từ đĩa**: rút khối con trỏ khỏi `HANDOFF.md`, rút phần sau dấu
   `ARCHIVE-BODY-START` khỏi file lưu trữ, ghép lại, so với `git show HEAD:HANDOFF.md`.

Cả hai lượt ra cùng một băm, và bằng băm bản gốc:
`10d84f26ef28d0e6fb1be26dfc754f125c817e5aa4c7c77f7711545789a6dae0`. **Không mất một byte.**

Đã khai `HANDOFF-ARCHIVE-01.md` vào mục 6 của `AGENTS.md` (bất biến ⑷) — thêm hẳn một dòng riêng
"Cần đào lịch sử xa hơn 20 mục", vì gốc repo không có bảng "Bản đồ file" như package. Con trỏ
nằm ngay dưới `## Log`, kèm dấu `<!-- HANDOFF-CUT-POINTER -->` để máy tìm được (bất biến ⑶).

### Việc thứ hai của brief: đo lại đà tăng. Số của tôi CAO HƠN số trong brief.

**Ba `HANDOFF.md` worker, cùng ngày 06/09** (`git cat-file -s` tại từng commit):

| Mốc | Tổng ba file |
|---|---|
| Ngay sau khi cắt, 03:59 | 106.542 byte |
| 12:16 cùng ngày | 124.371 byte |

**+17.829 byte trong 8 giờ 17 phút**, qua đúng **hai lượt ghi Log**. Tức khoảng **8.900 byte mỗi
lượt ghi**, chia cho ba file. Brief nói "+24 KB trong một ngày"; đo theo lượt ghi thì con số đó
là **sàn**, không phải trần — nó phụ thuộc số lane đóng phiên trong ngày, không phụ thuộc đồng hồ.

**File này, `HANDOFF.md` gốc — kích thước tại commit cuối mỗi ngày:**

| Ngày | Byte | Tăng |
|---|---|---|
| 02/09 (ngày file ra đời) | 115.854 | — |
| 03/09 | 151.129 | +35.275 |
| 04/09 | 229.866 | +78.737 |
| 05/09 | 251.501 | +21.635 |
| 06/09 (trước khi cắt) | 293.718 | +42.217 |

Trung bình **+44.466 byte/ngày** trong bốn ngày. Cắt xong còn 67.163 byte, nên **nó về lại 290 KB
sau khoảng 5 ngày**, không phải sáu tuần. ADR-0008 ước "sáu tuần nữa phải cắt lại" — **ước đó
sai một bậc**, đúng như brief nghi.

### Đề xuất — CHƯA CHỐT, chờ Đức

Tự động hoá một thao tác viết lại chữ của phiên khác là việc cần Đức duyệt riêng, nên đây là ba
lựa chọn xếp theo mức can thiệp, không phải quyết định:

- **(A) Chỉ cảnh báo, không tự cắt.** Thêm một phép kiểm vào cổng đóng phiên: `HANDOFF.md` nào
  vượt ~25 mục thì báo VÀNG kèm đúng câu lệnh cắt. Người vẫn bấm nút. *Rẻ nhất, và không đụng vào
  bất biến nào.* Nhược: cảnh báo vàng trong repo này đang có 30 chỗ — thêm một chỗ nữa thì nó
  chìm.
- **(B) Cảnh báo + công cụ một lệnh.** Như (A), cộng `node scripts/cut-handoff.mjs <file>` làm
  sẵn phép cắt hai hình dạng + tự kiểm băm (chính là script tôi vừa dùng, đang nằm ở scratchpad).
  Lane nào bị cảnh báo thì chạy một lệnh, không phải nghĩ lại từ đầu. *Đây là lựa chọn tôi
  nghiêng về*: nó bỏ được chỗ tốn thật (nghĩ lại phép cắt) mà vẫn giữ người ở giữa.
- **(C) Tự cắt trong cổng đóng phiên.** Máy tự dời khi vượt ngưỡng. *Không đề xuất lúc này*: nó
  cho máy quyền viết lại chữ cũ của phiên khác mà không ai nhìn, và ADR-0008 dựng ra đúng để
  chuyện đó phải có một câu duyệt của người.

Một lưu ý cho cả ba: đà tăng đo theo **lượt đóng phiên**, không theo ngày. Ngưỡng nên đếm **mục**,
đừng đếm byte — mục là thứ phép cắt thao tác được, byte thì không.

**Còn mở:** chưa có phép kiểm nào ngăn file phình lại. Nếu Đức không chốt (A)/(B)/(C) thì khoảng
**5 ngày nữa phải cắt tay lần nữa**, và lần đó cũng sẽ tốn đúng một lượt phiên như lượt này.

## 2026-09-06 — `claude-scouter-do` · `SCOUTER-SEED-01` việc ①: phép đo bấm-như-tay-người ĐẠT

**Làm gì.** Chạy phép đo mà ADR-0010 gọi là *"dòng code đầu tiên của Scouter"*, và EXP-14 (28/08)
để ngỏ ở mức `MICRO-PROOF REQUIRED`. Câu hỏi một câu: **cú bấm đi qua đường điều khiển của trình
duyệt có được trang nhìn như cú bấm của người thật không?**

**Kết quả: ĐẠT.** Chrome 152.0.7977.76, đo 06/09 trên trang thử tự sinh trong thư mục tạm —
không đụng trang thật, không tốn credit.

| Đường bấm | `isTrusted` | Cổng hoạt động (popup) |
|---|---|---|
| `dispatchEvent` giả lập trong trang | false | không |
| `element.click()` — **cách ba worker đang dùng** | false | không |
| Chuột trình duyệt qua `chrome.debugger` | **true** | **mở được** |
| Tay người thật | — | **CHƯA ĐO**, không tự động hoá được |

Gõ phím cùng kết quả: `Input.dispatchKeyEvent` cho `keydown` trusted **và** làm ô nhập dài thêm
thật. `Input.insertText` chạy được nhưng CDP đánh dấu THỬ NGHIỆM nên **không tính điểm**.

**Chỗ đắt nhất của lượt này: đo HAI đường, và chỉ đường thứ hai tính điểm.** Đo bằng phiên CDP
thẳng là đường dễ, nhưng Scouter không dùng đường đó — nó dùng `chrome.debugger` từ trong một
extension. Nếu chỉ đo đường dễ thì ta vẫn đang **suy luận** "chắc hai đường giống nhau", mà suy
luận đúng là thứ EXP-14 đã có sẵn. Nên phép đo dựng hẳn một extension thật, cài vào một hồ sơ
Chrome trống, rồi bấm từ bên trong nó. Hai đường ra **giống hệt nhau** — giờ đó là số đo, không
phải suy luận.

**Ba cái bẫy gặp thật** (chi tiết ở mục 4.1.1 của bảng kiểm kê, ghi để người sau khỏi mất buổi
chiều): ⑴ `--load-extension` đã **chết từ Chrome 137**, phải đi đường `Extensions.loadUnpacked`
qua `--remote-debugging-pipe`; ⑵ Chrome chỉ cho **một** khách gỡ lỗi trên một tab, nên đường đo
trước phải rời tab — đây cũng chính là lý do ADR-0009 mục ⑷ chốt "một Scouter một URL"; ⑶ service
worker của extension **ngủ ngay sau khi cài** nên không có trong danh sách target, phải mở một
trang của extension mà gọi.

**Số đo.** Đột biến kiểm phần chấm điểm: **7 mỏ neo khớp, 7/7 con bị bắt, 0 con sống sót.** Hai
con sống sót ở vòng đầu và cả hai đều dạy được một điều:

- Nới `isTrusted === true` thành `!== false` **sống sót toàn bộ mục ②** của phép ghim, vì một
  tiêu chí bên cạnh đỏ hộ nó. Bản nới lỏng đó chấm **ĐẠT cho một trang không hề thấy cú bấm nào**.
  Chữa bằng cách soi **từng tiêu chí riêng**, không chỉ soi tổng — chấm theo tổng che mất tiêu
  chí hỏng, vì chỉ cần một tiêu chí đỏ là tổng đã đỏ.
- Con thứ hai hoá ra là **đột biến giả** (một `else {}` rỗng). Đột biến không đổi hành vi thì
  không chứng minh gì cả; đã thay bằng con thật.

**Sự cố ngoài phạm vi, đã vá.** `origin/main` đang **ĐỎ với mọi lane** khi tôi mở phiên. Nguyên
nhân: commit `c2e5a2d` (lane `claude-cat-goc`, ADR-0008) dời 62 mục cũ của `HANDOFF.md` sang
`HANDOFF-ARCHIVE-01.md`, mà **bộ đếm sự cố Assistant chỉ đọc `HANDOFF.md`** — nên cả 4 dòng sự cố
biến mất, số đếm về 0, `tests/build-overview-smoke.mjs` đỏ, và vì bảng nằm trong khối `generators`
nên cổng đóng phiên đỏ theo. Lane đó đã trả khoá và đẩy xong, để lại vùng đỏ.

Vá tại **gốc**, không vá triệu chứng: bộ đếm là bộ **cộng dồn** nên nó phải đọc cả phần đã dời đi,
và nó **đi theo con trỏ** ADR-0008 bất biến ⑶ bắt để lại trong `HANDOFF.md` thay vì gõ cứng tên
file — nên lần cắt sau (`-02`, `-03`…) không phải sửa lại chỗ này. Kèm 4 phép ghim mới, trong đó
một phép ghim đúng cái "không có con trỏ thì KHÔNG được tự đoán tên file lưu trữ".

Đây là ca "đếm ra 0" thứ n của repo, và lần này nó **nguy hiểm hơn thường lệ**: `0 sự cố` đọc y
hệt `sạch sẽ`. Bộ đếm mù trông giống hệt một repo khoẻ mạnh.

**Còn mở — việc ② CHƯA LÀM.** Khung seed (quan sát · báo cáo qua Bridge · tự nạp lại mình) chưa
động tới. Cửa Bridge ở nhánh Gemini là **1.798 dòng** trong 5 file, và mục 5 của brief đòi mỗi
khả năng một phép ghim riêng cộng một đột biến kiểm — đó là một lượt phiên riêng, không phải phần
đuôi của lượt này. Phạm vi `SEED v0.1` không đổi: ① ĐẠT nên **thứ tự 24 mục còn lại giữ nguyên**,
không phải xếp lại.

**Ba câu đừng ai bỏ qua khi đọc kết quả ĐẠT ở trên:** `isTrusted: true` **không** đồng nghĩa
"trang không phát hiện được" — Chrome vẫn hiện dải băng cảnh báo, và ADR-0009 đã ghi là không giấu
được. Đo trên **một** bản Chrome, **một** máy: chạy lại `node scripts/scouter-input-trust-probe.mjs`
khi lên bản Chrome mới. Và cú bấm **của tay người thật** vẫn chưa đo.
## 2026-09-06 — `claude-handoff-tran` · ADR-0011 việc ①②③: trần 2.600 byte một mục, xoay theo tháng

**Trần 2.600 byte/mục**, khai ở `.repo-structure.json`, cưỡng chế bằng phép kiểm thứ 13 của cổng
đóng phiên (số 12 → 13, đúng luật chống tự tháo cổng). Cổng chặn **đúng mục vừa thêm trong phiên**
— so tiêu đề với `origin/main`; mục cũ không bị chặn. Nhắc xoay tháng chỉ với lane **giữ khoá**.

**ADR-0011 sai điểm tựa — đã đính chính ở protocol mục 2.** Hai con số 1.158 / 5.193 là byte chia
cho số **tiêu đề** (kể cả `###` con), không phải byte mỗi mục. Đo lại theo mục `##`: Flow Video
**3.785 — cao nhất** ba gói, không phải thấp nhất; gọn nhất là Gemini (2.679). 42 mục hiện có:
min 872 · trung vị 3.284 · max 41.879 · trung bình 4.303. Chọn 2.600 vì nó nằm ngay trên mục đầy
đủ mà gọn nhất đang có (2.593) và rơi vào khoảng trống 2.593–2.831; áp ngược lại chặn 26/42 = 62%.

**Xoay theo tháng:** `node scripts/handoff.mjs --rotate <file>` đọc mốc `HANDOFF-THANG`; khác
tháng thì dời phần sau `## Log` sang `HANDOFF-ARCHIVE-NN.md` (NN = số lớn nhất trong thư mục + 1,
nên nối tiếp `-01`) rồi để lại con trỏ. File này đã khai `2026-09`; ba `HANDOFF.md` của worker
chưa khai — lane nào chạm trước sẽ được cổng nhắc bằng một lệnh.

**Một lỗ vá kèm:** bộ đếm sự cố chỉ đi được **một bước** con trỏ. Xoay theo tháng làm chuỗi dài ra
(`HANDOFF.md` → `-02` → `-01`), nên sang tháng sau mọi sự cố cũ hơn một tháng sẽ âm thầm biến mất
— đúng con bug 06/09, chậm 30 ngày. Nay đi hết chuỗi; đếm trên repo thật vẫn `1 · 1 · 1`.

**Số:** suite mới `tests/handoff-smoke.mjs` 10 khối · **12 đột biến, 12 bị bắt** — nhưng hai con
thoát lưới ở vòng đầu, và cả hai đều dạy được một điều: một con lọt qua `endsWith` vì byte bị bớt
trùng byte cuối phần trước (đã đổi sang đẳng thức), con kia báo "sống sót" hai lần rồi mới lộ ra
là **bẫy của bộ đo**, ghi ở protocol mục 4.

**Còn mở:** việc ④ (Codex viết ngắn các mục cũ) chưa làm, để lượt sau.
## 2026-09-06 — `claude-ba-cua` · BANG-BA-CUA-01: ba cửa Đức tự mở bảng, một thư mục, một lõi

Thư mục mới `bang-trang-thai/`. Cửa ① `Xem-bang.cmd` (nhấp đúp) · ② `Mo-may-chu.cmd` (máy chủ
`127.0.0.1:4747`, nút Làm mới trong trang) · ③ `Bat-tu-chay.cmd` / `Tat-tu-chay.cmd` (mục Startup
của người dùng, không cần quyền quản trị). Lõi chung `loi.mjs` — cả ba gọi đúng một hàm.

**Bốn chốt của brief mục 2, và cách chúng được cài, không phải hứa:** ⑴ có phiên giữ `_code` thì
KHÔNG `import` bộ sinh — chốt nằm ở đường nạp, và trang nói ra câu đó thay vì đưa bảng cũ trông
như mới; ⑵ chỉ sinh bảng HTML; ⑶ cả thư mục không nạp mô-đun chạy tiến trình con nào, nên không
commit / đẩy / nhận khoá được; ⑷ nhịp 30 giây so dấu vân tay repo (đọc `.git/HEAD` + mốc bảng
quyền bằng hệ thống file), không sinh theo sự kiện file.

**Bản ra không nằm trong repo:** `BANG.html` + `trang-thai.json` vào `.gitignore`, và ba cửa không
chạm byte nào của bốn artifact đã commit — chạy cả ba trong lúc một lane giữ cả ba khoá thì
`git status` trước = sau.

**Chạy thật, không suy luận.** Cửa ① sinh bảng 108 KB và mở trình duyệt; cửa ② trả `200 /` ·
`303 /lam-moi` · `405 POST` · `404` đường lạ; cửa ③ cài xong chạy nền ẩn, `/lam-moi` lúc đang giữ
`_code` cho ra đúng băng "ĐANG NGỪNG SINH LẠI" mà vẫn giữ nguyên nội dung bảng cũ; gỡ xong mục
Startup biến mất và tiến trình tự dừng trong 30 giây. Chết im lặng: trỏ vào repo không tồn tại →
thoát sạch, không cửa sổ lỗi.

**Số:** `tests/bang-ba-cua-smoke.mjs` 14 khối · **4 đột biến, 4 bị bắt** (gỡ chốt ⑴ · cho chạy bộ
sinh đối chiếu tính năng · thêm một đường ghi vào máy chủ · bỏ câu trang tự nói giới hạn). Mỏ neo
đếm được **1** ở cả bốn lượt, không lượt nào ra 0.

**Ba chỗ vấp, đã vá, lý do ghi ngay tại chỗ sửa trong mã:** gọi trần `timeout` và `wscript` thì
hỏng; bộ sinh không in `<meta charset>` nên lõi tự thêm — **không sửa bộ sinh**, để bản đã commit
giữ nguyên từng byte.

**Còn mở:** `N-07` — trang vẫn in "Nhờ AI: Làm mới bảng trạng thái", nay đã sai. Cần sửa bộ sinh
rồi sinh lại artifact, không nằm trong brief này.

## 2026-09-06 — `claude-n07` · N-07: bảng thôi bảo Đức đi nhờ AI, chỉ ra ba cửa Đức tự mở

**Vấn đề:** trang bảng có ĐÚNG BA chỗ dạy Đức đi nhờ AI làm mới bảng — dải đỏ ở đầu trang
("Nhờ AI: Làm mới bảng trạng thái"), thẻ *Làm mới bảng* ở tab đầu ("dán câu dưới đây cho tôi"),
và khối *Câu để dán cho AI* ở tab Vận hành. Từ 06/09 Đức tự làm được bằng ba cửa nhấp đúp trong
`bang-trang-thai/`, nên cả ba dòng đó dẫn Đức đúng vào con đường vừa bị xoá bỏ.

**Sửa cả ba, quét cả trang chứ không sửa một dòng.** Chữ mới nói cách tự làm: dải đỏ chỉ
`Xem-bang.cmd`; thẻ ở tab đầu chỉ một cửa rồi trỏ hai cửa còn lại sang tab Vận hành; thẻ ở tab
Vận hành liệt kê đủ ba cửa kèm cách tắt.

**Gỡ luôn `readRefreshLine`** — bộ đọc lấy câu prompt từ mục 2 của `PROMPTS.md` để trang không
giữ bản chép thứ hai. Nó đúng khi trang còn in một câu cho Đức dán; nay không chỗ nào dùng, mà
giữ lại thì vẫn bắt `PROMPTS.md` khoá cứng hình dạng mục 2 mãi mãi — một phép kiểm không bao
giờ nổ vẫn thu thuế mọi phiên sau.

**Phép ghim ghim CẢ HAI CHIỀU, cố ý:** ba câu cũ không được còn, VÀ bốn tên cửa phải có mặt.
Chỉ chặn câu cũ thì xoá trắng cả thẻ cũng xanh — Đức mất chỗ duy nhất nói cho biết cách tự làm,
tức lại quay về đi hỏi AI, đúng cái bệnh vừa chữa.

**Số:** mỏ neo đếm được 3, không lượt nào ra 0 · phép ghim ĐỎ trước khi vá, XANH sau khi vá ·
suite xanh toàn bộ · artifact sinh lại rồi commit kèm.

**Không chạm, và nói rõ vì sao:** mục 2 của `PROMPTS.md` giữ nguyên — nó vẫn là câu đúng cho AI
lúc đóng phiên. Một chỗ khác trên trang vẫn nói *"muốn biết ai đang giữ vùng nào thì hỏi AI"*:
đó không phải việc làm mới bảng, và bảng cố ý không in tên chủ vùng, nên chưa có cửa tự làm nào
thay được câu đó.

## 2026-09-06 — `claude-assistant` (điều phối) — đẩy gộp 10 commit, Đức duyệt đẩy khi cổng còn một mục đỏ

**Đẩy kèm (`--carry`), kể tên theo ADR-0005:** `claude-flow-active` · `claude-gemini-hoan-thien` ·
`claude-codex-ngan` · `claude-n07`.

**Cổng còn MỘT mục đỏ lúc đẩy, và Đức duyệt đẩy:** mục nhật ký của `claude-gemini-hoan-thien`
trong `workers/duc-auto-gemini/v0.2.0/HANDOFF.md` dài **2.628 byte**, vượt trần 2.600 đúng 28
byte. Mục đó **chưa commit** nên lượt đẩy này không mang nó lên remote — nó vẫn nằm trên cây
làm việc chờ chính lane đó viết ngắn.

**Ba lỗ ở vùng miễn khoá, phát hiện trong một buổi** — ghi thành `N-10` `N-11` `N-12`:
① phiên điều phối nhả khoá của một lane **đang làm thật** sau khi đo thấy "0 commit, 0 file bị
sửa" — lane đó dựng bản thử ngoài repo nên phép đo mù; ② `claude-flow-active` chạy
`git checkout .agents/claims.json` và **xoá trắng bốn khoá của hai phiên khác**, dấu niêm phong
không vỡ vì lượt đó đi qua git; ③ hai lane cùng đánh số `N-08`, cả hai vào HEAD, không lớp nào báo.

**Sợi chỉ chung:** ba sổ ở gốc repo cố ý miễn khoá cho thao tác thêm dòng, mà **mọi lớp bảo vệ
đều dừng ở cửa khoá**. Vùng miễn khoá là vùng không ai canh.

**Còn mở:** trần độ dài mục nhật ký làm cổng đỏ với MỌI lane khi chỉ một lane vượt — mục nhật ký
có ghi tên lane nên quy thuộc được, cùng họ với `Y-16`. Gộp vào lượt sửa `K2`.

## 2026-09-06 · claude-assistant · K2 theo N-10, ADR-0013 Scouter ra nhà riêng, luật không-dừng

- **Đã đóng:** `N-06` (câu sai về `bridge-*.js` trong brief Scouter — đo lại `md5sum`, chỉ **1/5**
  file giống hệt cả ba worker) · `N-10` (tín hiệu đổi tên thành **"chưa thấy dấu vết trong repo"**,
  `BRIEF-K2` mục 2b mới cấm nhả khoá hộ lane khác dựa trên phép đo, và câu đó đã vào `AGENTS.md`
  mục 1).
- **Đức chốt 2 việc:** ⑴ Scouter ra nhà riêng `workers/duc-scouter/v0.1.0/` có khoá riêng
  ([ADR-0013](docs/adr/0013-scouter-ra-nha-rieng-co-khoa-rieng.md)) — đo ra nó đang **rải trên
  `_root` VÀ `_code`**, hai khoá đông nhất; chuyển là **bước ⓪** của `BRIEF-SCOUTER-SEED-01`.
  ⑵ Vai điều phối **không bao giờ dừng vì chuyện commit** — ghi vào `ORCHESTRATOR.md` mục 5b.
- **Sổ nợ:** mở `N-16` (lượt chuyển Scouter). Nợ hạ tầng 28 → 25.
- **Tự nhận hai lỗi cùng họ, cả hai là `N-12` tái diễn:** tôi ghi `N-13` trùng số với lane
  `claude-gemini-hoan-thien` (đổi thành `N-16`), và ba khối `##` tôi cố ý *"để lại làm bản ghi"*
  đã **đỏ cổng với mọi phiên** vì thiếu `đóng khi:` — đã hạ xuống dòng ghi chú, chữ giữ nguyên.
- **Đẩy:** `--carry` cuốn theo lane `claude-gemini-hoan-thien`. Trả `_root` + `_docs`.
- **Còn mở:** chat `claude-scouter-seed` đang giữ `_code` và xây seed vào `scripts/` — **chưa biết
  ADR-0013**. Cần nhắc nó làm bước ⓪ trước.
## 2026-09-06 · `claude-scouter-seed` · Scouter ra nhà riêng, và một lượt dọn làm gãy bộ sinh của mọi lane

**Làm gì.** ADR-0013 bước ①: dọn Scouter khỏi gốc repo + `scripts/` + `tests/` về
`workers/duc-scouter/v0.1.0/` bằng `git mv`, khoá riêng `workers/duc-scouter`. Rồi
`BRIEF-SCOUTER-SEED-01` việc ②: khung seed làm được ba việc của ADR-0009 mục ⑸.

**Kết quả số.** Gói: 5 phép ghim XANH · đột biến kiểm 24/24 khớp, giết 24, sống 0 · nối thử
với máy chủ Bridge THẬT ĐẠT 5/5. Bộ ghim dashboard 99/99 sau khi thêm phép ghim E7b.

**Việc tôi làm gãy, và ai phát hiện.** Lượt dọn xoá `manifest.json` ở gốc repo, mà
`build-dashboard.mjs` vẫn đọc một **đơn vị GỐC cố định** rồi theo `version_source` sang file
đó. Bộ sinh NÉM. Vì `safe-push` đòi bản sinh khớp HEAD, **không lane nào đẩy được**, kể cả
lane không đụng gì tới Scouter. Lane `claude-flow-active` phát hiện khi bị từ chối đẩy, ghi
`N-09`, **không tự sửa vùng của người khác, giữ khoá, báo lại** — đúng luật mục 1. Đã vá:
mất marker thì không ném · không đếm thành nợ (đó là khoản nợ không ai đóng được) · không
hiện trên bảng của Đức. Phép ghim E7b ghim cả hai chiều.

**Bài học đáng ghi.** Bộ sinh đọc từ **HEAD**, không đọc cây làm việc. Tôi vấp đúng chỗ này
hai lần trong một phiên: sửa `STATUS.md` rồi chạy bộ sinh và không hiểu sao nó vẫn báo giá
trị cũ. Muốn thấy thay đổi thì phải commit trước.

**Xin lỗi kèm bản ghi.** Tôi để hai file nháp `suite-tmp.sh` / `suite-tmp.log` ở gốc repo;
Đức phát hiện chúng làm cổng đỏ với mọi phiên vì chưa khai vào Bản đồ file. Đã xoá. Đáng ra
phải dựng ở thư mục tạm ngoài repo.

**Còn gì mở.** Cổng đóng phiên chậm: `tests/build-overview-smoke.mjs` mất **392 giây**, vì
một lượt `buildOverview` trên repo thật mất **21 giây** và phép ghim dựng lại **7 lần**.
Chưa vá — đã giao Đức mở phiên riêng.

## 2026-09-07 · `claude-k2-vung-mien-khoa` · Vùng miễn khoá là vùng không ai canh — vá ba lỗ

**Làm gì.** N-09 + N-12 + N-15 là ba mặt của một chỗ: ba sổ ở gốc repo cố ý miễn khoá cho
thao tác thêm dòng, mà mọi lớp bảo vệ của repo đều dừng ở cửa khoá.

**N-09 · tín hiệu "chưa thấy dấu vết trong repo"** — không commit nào chạm vùng kể từ mốc
nhận, và không file nào trong vùng bị sửa trên đĩa. Một phép đo, ba chỗ hiện: `claim.mjs
--list` · `what-next.mjs` mục B · cổng đóng phiên (**VÀNG, không chặn**, nói với chính lane
đang giữ khoá). Chữ là hợp đồng: phép ghim ĐỎ nếu tín hiệu bị gọi là "rảnh" · "nhàn" ·
"không làm gì". Git hỏng → `KHONG_DO_DUOC`, không rơi về "chưa thấy". Máy **không** tự nhả khoá.

**Bảng HTML cố ý KHÔNG mang tín hiệu này** — khác brief mục 2, đổi hướng có chủ ý. Bảng bị
`safe-push` so với bản sinh từ HEAD, mà chính lượt commit bảng lại chạm gốc repo → nó tự đổi
đầu vào của chính nó và chặn mọi lane. Đúng bệnh `N-20`, và bảng đã chốt y vậy cho khối "Khoá
làm việc". `what-next.mjs` thay chỗ: sống, chỉ đọc, không đòi khoá nào.

**N-12 · `backlog-check.mjs` nay ĐỎ khi hai khối cùng mã.** Cửa ra chỉ là **một dòng thêm ở
cuối** (`ĐỔI MÃ N-xx → N-yy`, mang luôn `đóng khi:`) — sổ miễn khoá khi chỉ thêm dòng, nên một
cái chặn mà người bị chặn không có quyền gỡ thì tệ hơn không chặn.

**N-15 · `AGENTS.md` mục 1 cấm nối `claim.mjs` vào ống**, kèm phép ghim chứng minh bẫy còn
nguyên: mã thoát của một đường ống là mã thoát của lệnh cuối.

**Số, tự đo.** `npm test` XANH. Đột biến kiểm **14/14 bị bắt**; lượt đầu 13/14 — con thoát là
"đổi vàng thành đỏ", thoát vì nền repo tạm vốn đã đỏ nên phép so rỗng nghĩa. Phép ghim mới
`tests/dau-vet-vung-smoke.mjs`, 9 mục.

**Cổng đã ĐỎ SẴN ở HEAD với MỌI lane trước khi tôi chạm vào.** Sổ nợ gốc có **24 khối `## N-`
nhưng chỉ 18 mã**; 5 khối trùng chưa khai `đóng khi:` nên `npm test` hỏng với mọi phiên, và
không ai báo. Đã gỡ bằng 6 dòng `ĐỔI MÃ` (N-19…N-24), không sửa chữ cũ.

**Còn mở.** `MULTIFLOW.md` chưa cập nhật: `_docs` có chủ khác, và tôi **không nhả khoá hộ**.

## 2026-09-07 · `claude-scouter-s01` · S-01 xong — Scouter bấm và gõ được, và lượt `--carry` này cuốn theo ai

**Làm gì.** Mở đường GHI cho Scouter: `scout.click` · `scout.type` · `scout.key`. Chi tiết kỹ
thuật ở nhật ký của gói (`workers/duc-scouter/v0.1.0/HANDOFF.md`); ở đây chỉ ghi phần cả repo
cần biết.

**Kết quả số.** Đột biến kiểm của gói **42/42 mỏ neo khớp, giết 42, sống sót 0** (trước lượt
này 24/24) · suite gói 6/6 · nối thật với máy chủ Bridge ĐẠT 7/7 · cổng đóng phiên **XANH
TOÀN BỘ 13/13**.

**Điều cả repo nên biết:** từ hôm nay Scouter **bấm được nút**. Nó là extension đầu tiên trong
repo có `debugger` và không có bảng bên nào để người bấm nút Dừng. Đường ghi được đóng trong
một lõi riêng với danh sách lệnh riêng, nên phần chỉ-đọc vẫn chứng minh được là chỉ đọc — nhưng
**chưa có cái phanh nào** giữa AI và một lượt bấm. Đã ghi thành `S-05` và cần Đức chốt hình
dạng cái phanh đó.

**Lượt `--carry` này cuốn theo bốn lane** (ADR-0005 duyệt thường trực, đổi lại phải kể tên):
`claude-assistant` (3 commit) · `claude-tran-900` (5) · `claude-gemini-nghiem-thu` (1) ·
`claude-cong-nhanh` (1). Tất cả đều đã có nhãn `Lane:` và đều nằm sẵn trên nhánh trước khi
tôi commit; tôi không sửa file nào của họ.

## 2026-09-07 · claude-cong-nhanh · Y-12 + Y-07: cổng đóng phiên bớt hơn mười phút bằng một bộ đệm

- **Đo lại trước khi sửa, và số trong sổ SAI:** sổ ghi `build-overview-smoke` **392 giây**; đo
  trên máy này (node v24.18.0, HEAD `fc66d38`) ra **640 giây**. `build-dashboard-smoke` **78**
  (sổ ghi 99). Một lượt `buildOverview` **11,5 giây** (sổ ghi 21).
- **Chỗ tốn, đo chứ không đoán:** `build-overview-smoke` **không tự chạy một tiến trình con nào**
  — toàn bộ thời gian là lệnh `git` trong `createHeadDeps`, mỗi lệnh một tiến trình mới. Suite
  dựng lại trang hơn hai chục lượt trên CÙNG một bộ đọc đã ghim một commit, tức hỏi git y hệt
  nhau hơn hai chục lần. Nghi ngờ ⑴ của sổ đúng; hướng "phép đếm commit" của lượt trước sai.
- **Sửa:** đệm lệnh git theo bộ đọc trong `createHeadDeps`, đệm **cả cú ném** (`objectType` hỏi
  đường dẫn không tồn tại rất nhiều lượt). KHÔNG đệm bộ đọc riêng của `createDefaultDeps` vì
  `dirtyFiles` đọc cây làm việc. `bang-trang-thai/` vốn dựng bộ đọc mới mỗi nhịp nên không cũ.
- **Trước → sau:** overview **640 → 17 giây** · dashboard **78 → 77** · lượt sinh thứ hai trên
  cùng bộ đọc **11,5 → 0,087 giây**.
- **Không làm yếu gì, đếm được:** overview **33 phép kiểm / 393 khẳng định**, dashboard **99/456**
  — y nguyên, vì **không file nào dưới `tests/` bị chạm**. Đột biến kiểm **8 con, cả 8 mỏ neo
  khớp đúng 1 chỗ**, chạy trên bản CŨ (bản sao repo tại `fc66d38`, control 33/33 + 99/99 xanh)
  và bản MỚI: **tập bị bắt giống hệt** — bắt `M1 M4 M5 M7`, sót `M2 M3 M6 M8`.
- **Bốn con SÓT là lỗ có từ trước, không do lượt này:** cả hai bản đều sót y nhau. Ghi `N-27`.
- **Ba artifact máy sinh vẫn khớp HEAD**, và hai bộ đọc mới dựng cho ra trang giống hệt từng
  byte → không dính đồng hồ hệ thống.
- **Còn mở:** `build-dashboard-smoke` nay là suite lớn nhất (77 giây), gần hết nằm ở khối Gate 7
  gọi lại `session-check` bằng tiến trình con. Đó **không phải việc lặp** — mỗi lượt một ca khác
  — nên bỏ nó là bỏ phép kiểm, và việc đó là quyết định của Đức, không phải của tôi.

## 2026-09-07 · `claude-scouter-s05` — Scouter: đường ghi có phanh, Bridge có lưới đỡ

**Việc.** Đóng `S-05` và `S-02` của gói `workers/duc-scouter`. Cả hai chờ Đức chốt từ 07/09,
và Đức chốt cả hai trong một lượt: cái phanh theo đúng khuôn ba gói `duc-auto-*` (công tắc chế
độ phát triển, mặc định TẮT, trần 50 lượt ghi mỗi lần mở khoá), và duyệt thêm quyền `alarms`.

**Vì sao đáng làm ngay.** Từ 06/09 Scouter bấm được nút thật. Cho tới lượt này, thứ duy nhất
đứng giữa một AI và một cú bấm là MỘT CÂU VĂN trong `AGENTS.md` của gói — luật viết cho người
vận hành, không phải chốt trong mã.

**Đo.** Đột biến kiểm mỏ neo khớp **58/58, giết 58, sống sót 0** (trước: 42/42). Phép ghim gói
**7/7 PASS** (thêm `scouter-write-gate-smoke.mjs`, 14 khối). Live check với máy chủ Bridge
**THẬT: ĐẠT 8/8** (trước 7/7). Cổng đóng phiên **XANH TOÀN BỘ**.

**Quyết định ghi ở đâu.** `workers/duc-scouter/v0.1.0/docs/adr/0001-...` — ADR đầu tiên của gói
này, vì cả hai câu chốt chỉ áp cho một gói chứ không cho cả repo.

**Đẩy kèm ai (ADR-0005).** Không cuốn theo lane nào — 6 commit chưa đẩy đều mang nhãn
`claude-scouter-s05`.

**Việc kế cho phiên sau.** `S-06`: ba lệnh ghi **chưa từng chạm một nút thật**, và đó cũng là
lượt hiệu chỉnh trần 50 — con số hiện là ước lượng chưa đo lần nào.

**Một chỗ đo sai của công cụ, chưa sửa.** `scripts/what-next.mjs` báo gói Scouter "0 việc mở"
trong khi sổ có 2, vì nó chỉ đếm mục trong khối `P1`/`P2`, không đếm mục dạng `## MỞ · S-xx`.
Đã ghi vào `BACKLOG.md` gốc. Bảng nói sai thì phiên sau tưởng gói đó rảnh.

## 2026-09-07 · `claude-bang-vung-chac` — bốn đột biến lọt lưới nay bị bắt; ADR-0014 land nửa

**Việc ① — `N-27`, XONG.** Bốn đột biến vào bộ đọc HEAD: **trước bắt 0/4, sau bắt 4/4.**

**Phép đo đầu của tôi SAI, và đây là bài học đáng ghi.** Lượt đầu chạy cả `npm test` và báo
"bắt 3/4" — cả ba đều **giả**: bốn suite worker đang đỏ vì một lane khác sửa dở
`workers/duc-auto-chatgpt`, nên mọi đột biến đều "bị bắt" bởi lỗi của người khác. Bốn suite đó
**không import `scripts/build-*.mjs` một lần nào**, nên chúng không thể bắt được gì ở đó. Đo lại
chỉ trên **18 suite ở gốc repo** thì ra **0/4** — khớp đúng con số `N-27` ghi. *Một bộ đột biến
chạy trên suite đang đỏ vì lý do khác thì nó đo được số 0.*

**⑴⑵ không cần cây git riêng như `N-27` lo.** Khối 23 của `tests/build-dashboard-smoke.mjs` đã
dựng sẵn một cây git tạm — sân khấu duy nhất trong suite mà câu "file hay thư mục" có hai đáp án
biết trước. Ghim ⑴⑵⑶ ở đó, thêm 0 giây chạy. ⑷ ghim ở khối 4 của `build-overview-smoke`.

**Không làm yếu gì, đếm được:** phép kiểm **99+33 → 100+34**, khẳng định **456+393 → 466+396**.
Mỏ neo cả bốn con khớp **đúng 1 chỗ**.

**Việc ② — ADR-0014, LAND NỬA, và nửa đã land đang CHẶN MỌI LANE.** Nửa `_code` xong: bộ sinh
chỉ ghi `FEATURE-PARITY-AUTO.md`, khung là hằng số trong script nên `FEATURE-PARITY.md` ra ngoài
tầm với của máy. Bốn phép ghim mới; `12` (máy ghi vào mục 2 thì ĐỎ) và `15` (deterministic, chạy
được khi cấm `Date.now`) **XANH**, `13`/`14` **ĐỎ đúng chỗ phải đỏ**.

**Chỗ kẹt.** Nửa còn lại cần `_root`: sinh file vào HEAD · khai vào `generated` · gỡ ba khối
`AUTO:` khỏi `FEATURE-PARITY.md` · sửa `AGENTS.md`. `_root` do `claude-scouter-s06` giữ, đo được
**54 phút**. Tôi **không tự lấy** (luật mục 1), **giữ `_code`**, **giữ 4 commit chưa đẩy**, và
báo về phiên điều phối. Sổ nợ: `N-11` (lane kia mở) + một dòng xác nhận của tôi.

**Cổng đóng phiên:** 1 mục ĐỎ — `tests/repo-structure-smoke.mjs`, và nó đỏ vì **đúng cái đang
thiếu**: một phép ghim có sẵn từ trước bắt "bộ sinh ghi ra file không khai trong `generated`".
Phép ghim đó làm đúng việc của nó.

## 2026-09-07 · `claude-scouter-s06` — icon Scouter, và một lượt DỪNG vì cổng đỏ sai

**Việc.** Icon extension Scouter theo yêu cầu Đức: chữ **S tối trên nền vàng**, sinh bằng
`workers/duc-scouter/v0.1.0/scripts/make-icons.mjs` (tự viết bộ đóng gói PNG trên `zlib`, không
thêm phụ thuộc). Kèm đóng `S-06` (phép đo ②) và `S-07`. Chi tiết ở `HANDOFF.md` của gói.

**Một việc ngoài Scouter, cố ý và tối thiểu.** `tests/repo-structure-smoke.mjs` ĐỎ với MỌI phiên
vì nửa `_code` của ADR-0014 đã vào HEAD (`0b42daf`) mà `FEATURE-PARITY-AUTO.md` chưa được khai
vào khối `generated`. Nửa còn thiếu cần đúng khoá `_root` mà lúc đó **tôi đang giữ**, nên tôi
land nó (`daa276c`). Không quyết gì thay ai: ADR-0014 đã viết sẵn câu đó. **Cố ý DỪNG ở đây** —
phần gỡ ba khối AUTO khỏi `FEATURE-PARITY.md` đụng vào mục 2, là chữ của người. Ghi thành `N-12`.

**Ngay sau đó `_root` được chuyển khỏi tay tôi** sang lane `claude-root-adr0014`, kèm câu chốt
của Đức ghi trong bảng. Hợp lệ. **Nhưng lane đó cần biết:** phần khai vào `generated` ĐÃ XONG ở
`daa276c` — đừng làm lại, hãy dựng tiếp lên nó.

**Vì sao tôi KHÔNG đẩy.** Cổng đóng phiên đỏ, và cái đỏ đó **sai**: chạy năm lượt thì số mục đỏ
nhấp nháy giữa 1 và 2, mà phép kiểm nào cũng xanh khi chạy riêng. Nguyên nhân: 6 lane cùng ghi
file gốc repo, cổng đọc trúng lúc file đang bị ghi. Ghi thành `N-13` kèm ba câu báo lỗi sai sự
thật đo được. Luật là luật: cổng chưa xanh thì không đẩy và không báo xong — nên tôi **giữ khoá**
`workers/duc-scouter` và `_docs`, và báo lại.

**Việc của tôi thì xanh hết, đo riêng từng thứ:** suite gói 8/8 · đột biến 58/58 sống sót 0 ·
`repo-structure-smoke` 17/17 · `check-bootstrap` 0 đỏ, nhóm CHẶN đạt hết · phép đo ② ĐẠT 11/11.

**Đức làm được ngay, không cần chờ đẩy:** nạp lại extension trong Chrome từ thư mục
`workers/duc-scouter/v0.1.0` — icon đã nằm trên đĩa và đã commit.

## 2026-09-07 · `claude-root-adr0014` — nửa `_root` của ADR-0014: bảng đối chiếu tách làm hai

**Xong, kèm số.** `FEATURE-PARITY.md` không còn mốc `AUTO:` nào — `grep -c "AUTO:.* START"` đi
từ **3 → 0** — và mỗi chỗ ba khối từng nằm nay là **một con trỏ** sang `FEATURE-PARITY-AUTO.md`
kèm lệnh sinh lại và link ADR (`grep -c FEATURE-PARITY-AUTO`: **0 → 4**). Mục 2, chữ của người,
**không đổi một byte**. `AGENTS.md` sửa đúng ba chỗ: bốn artifact miễn khoá → **năm**; câu
"`FEATURE-PARITY.md` cố ý không miễn" giữ nguyên vì vẫn đúng, thêm đoạn nói nửa máy đã ra file
riêng và file riêng ĐÓ thì miễn; khối "nửa file do máy sở hữu" thành một bảng hai dòng.

Việc ⑴ và ⑵ của brief đã có người land trước tôi (`daa276c`, `claude-scouter-s06`). Kiểm lại
chứ không tin brief: bộ sinh chạy hai lượt trên cùng HEAD ra **giống hệt từng byte**.

**Hai chiều bất biến ADR-0014, đo cả hai.** Chiều một: file máy lạc hậu một chữ →
`feature-parity.mjs --check` **thoát mã 1**. Chiều hai (vế bảo vệ chữ người): hai đột biến gỡ
chốt ghi — `laFileMayDuocGhi` luôn `true`, và bộ sinh chủ động ghi vào `FEATURE-PARITY.md` —
**cả hai BỊ BẮT**. Chạy trên **bản sao ngoài repo** vì `scripts/` là `_code` của lane khác.

**Đóng `N-11` phải đổi mã trước.** Ba mục chung mã `N-11`, bộ đếm quy theo mã — một dòng
`ĐÓNG N-11` sẽ **xoá hai món nợ thật**. Tôi đổi mã tại khối (`N-11 → N-25`) rồi đóng `N-25`.
`backlog-check`: **30 mục, 0 thiếu `đóng khi:`, 0 mã trùng**. Việc này chữa luôn
`build-overview-smoke` (đang ĐỎ 27≠26) → **34/34 XANH**.

**Vì sao KHÔNG đẩy.** `tests/build-dashboard-smoke.mjs` ĐỎ, cổng quy `REGRESSION_DA_COMMIT`.
Gốc bệnh một dòng: dòng 720 dựng sổ mẫu rồi commit đúng **bốn** artifact cũ, thiếu
`FEATURE-PARITY-AUTO.md`. **ĐỎ trước ba commit của tôi** —
`git diff daa276c..HEAD --name-only -- scripts/ tests/` ra **rỗng**. `tests/` là `_code` của
`claude-bang-vung-chac` nên tôi **không sửa**. Ghi thành `N-30`. **Tôi giữ `_root`.**

**Lớp chặn artifact ĐÃ MỞ** — cổng mục *"Sự thật máy sinh còn tươi"* nay **XANH**. Còn đúng một
cửa: một dòng trong `tests/`, rồi 30 commit của 6 lane đi được.

## 2026-09-07 · `claude-tinh-gon` — tinh gọn: đóng băng ba gói, cắt sổ nợ 32 → 8

**Đức đo bảy ngày và chốt cắt thật.** 400/725 commit (55%) chạm tài liệu + sổ nợ, 68 (9%) chạm
mã extension; hạ tầng 44.239 dòng > mã sản phẩm 38.136 dòng.

**① Đóng băng.** Khối `frozen` trong `.repo-structure.json` khai ba gói `duc-auto-*`; gói sống
là `workers/duc-scouter`. `AGENTS.md` mục 6: chín dòng sổ tay của chúng gộp thành **một** dòng
*"đừng đụng"*. **[ĐO]** `grep -rl frozen scripts/ tests/` ra **0** — cờ chưa cưỡng chế được,
nên đột biến kiểm bắt **0/0**: không phải đo hỏng, mà chưa có gì để đo. Cưỡng chế ở `_code` của
lane khác → `N-35`.

**② Sổ nợ.** **Số trong bản giao việc SAI:** nói 59, đếm thật **32 mục mở** (20 `N-` + 12 `Y-`)
trong 47 khối. Giữ **6** mục chặn thật hôm nay (`N-05` `N-11` `N-29` `N-30` `N-31` `N-33`),
thêm **2** nợ do chính lượt này đẻ ra (`N-35` `N-36`), xoá **26**. Sáu khối giữ lại **nguyên
văn, 6/6 khớp từng byte**. **[ĐO]** 1.377 → 372 dòng · `backlog-check` 8 mục, 0 thiếu
`đóng khi:`, 0 mã trùng · `backlog-check-smoke` 14/14.

**③ Gộp khoá: CỐ Ý CHƯA BẬT.** `_docs` và `_code` đang có chủ và hai lane đó đang chạy — khai
ba khoá vào `areas` lúc này là lấy khoá khỏi tay người đang làm, và một bảng khai ba khoá mà
vận hành bảy khoá là hai nguồn sự thật về quyền ghi. Hình dạng + ba điều kiện bật ở `N-36`.

**Bảy giới hạn của Đức vào `AGENTS.md` mục 3**, mỗi cái có số. Giới hạn ⑦ áp cho chính tôi: đổi
lấy chín dòng sổ tay gói đóng băng + một khối bảng đối chiếu **bị chép hai lần**. **[ĐO]**
`wc -l AGENTS.md` **296 → 290**.

**Không đẩy bảng HTML.** Sinh lại ở cây làm việc hôm nay cho ra bản refactor IA **chưa xong**
của `claude-bang-ia` (9 tab → 3 tầng), mà phép ghim của chính họ đang ĐỎ — đúng ca `Y-15`
05/09. Đã hoàn nguyên về HEAD. `DASHBOARD.md` + `repo-map.json` thì sinh và commit, hai lượt
trên cùng HEAD **giống hệt từng byte**.

**Cuốn theo một dòng của lane khác:** commit `8e98318` chứa một dòng `ĐÓNG N-30` do
`claude-bang-ia` viết — ca `N-05`. Sau lượt cắt, `N-30` là khối `--restamp` **vẫn mở**, nên tôi
thêm một dòng làm rõ ở cuối sổ chứ không sửa chữ của họ.

## 2026-09-07 · `claude-bang-ia` — mở cửa cho sáu lane, rồi refactor IA của bảng

**Việc ⓪ — mở cửa, đi trước một mình.** `tests/build-dashboard-smoke.mjs` dựng sổ mẫu rồi commit
đúng **bốn** artifact cũ, thiếu artifact thứ năm, nên chính sổ mẫu đó báo *"does not exist in
HEAD"* và cổng quy `REGRESSION_DA_COMMIT` — chặn MỌI phiên. **[ĐO]** thoát mã **1 → 0**,
**100/100 PASS**, phép kiểm **100 → 100**, vế khẳng định **463 → 463**. Tên artifact **nhập từ
hằng số của bộ sinh**, không gõ cứng. Đóng `N-30`.

**Việc ① — bảng đi từ CHÍN tab xuống BA TẦNG.** HOME (mở mặc định, thay góc nhìn hệ thống):
*đang làm gì trước · cần Đức · đang chạy*. WORK: extension · ý tưởng. SYSTEM: bảy khối còn lại.
Xoá phần nhân bản: **"Đức cần làm" từ BA chỗ về MỘT**; bảng chỉ mục extension và thanh bậc ý
tưởng rời trang chủ về đúng khối của chúng; bản cắt ngắn của hướng dẫn làm mới bảng bị bỏ. Chỉ số
kỹ thuật xuống SYSTEM — **chuyển tầng, không xoá**, và phép ghim đòi chúng vẫn còn trên trang.

**`NEEDS ĐỨC` đi đường (a) của `N-29`, không cắt `human_action`.** Hai cơ chế cùng nuôi một danh
sách hiển thị, trang nói thẳng là hai nguồn. Bỏ trùng CHỈ ở ca chứng minh được (hồ sơ tự nó mang
dấu). Cắt hôm nay là mất việc thật của Scouter và một nửa của ChatGPT. **[ĐO] số brief lệch:**
dấu `@Đức` nay **20** (10 bấm · 10 chốt), không phải 17.

**Nghiệm thu.** Suite bảng **34 → 35** phép kiểm, **395 → 429** vế khẳng định — không gỡ lớp canh
nào; thời lượng **22,2s → 22,3s**. **Đột biến 9/9 BỊ BẮT**, mỏ neo con nào cũng khớp đúng 1: chỉ
số kỹ thuật lên HOME · "Đức cần làm" hai chỗ · HOME thiếu khối · khối HOME rỗng ruột · rơi một
dòng `NEEDS ĐỨC` (hai chiều) · bộ sinh đọc đồng hồ (phép ghim CÓ TRƯỚC, không phải của tôi) · ô
đếm luồng mất dấu miễn. Bộ sinh chạy hai lượt trên cùng HEAD ra giống hệt từng byte.

**Cổng còn MỘT mục đỏ, KHÔNG phải của tôi:** `HANDOFF_MUC_QUA_DAI` — mục 07/09 của
`claude-scouter-s06` dài 4794 byte, trần 2600. Sửa là viết lại chữ lane khác. **Tôi giữ `_code`.**

## 2026-09-07 · `claude-scouter-s06` — `--restamp` kể sai tên người bị lấy khoá

**Việc**: cổng đỏ với MỌI lane vì một mục nhật ký 4.794 byte. Đo ra nguyên nhân không phải mục
dài: dòng 1316 mở đầu bằng `###` nên `docMuc()` không coi là mục mới và **nuốt khối của
`claude-root-adr0014` vào mục ngay trên nó**. Sửa đúng một ký tự thì 4.794 → 2.272 + 2.520.

**Kết quả**: lane `claude-assistant` sửa cả năm tiêu đề (`66135b3f`) sau khi tôi nhắn thẳng cho
phiên đó. Tôi không phải sửa gì. **Đường "hỏi lane đang giữ" rẻ hơn đường lấy khoá** — ghi ra vì
tôi đã làm cả hai và chỉ một cái cần thiết.

**Lỗi tôi gây ra, và nó là lỗi của công cụ chứ không riêng tôi.** Đức chốt *"lấy `_root` đi, sửa
luôn"*, tôi sửa tay rồi `--restamp --duc-duyet`. Lệnh đó ghi đè `taken_from`/`taken_by`/
`taken_at`/`duc_decision` lên **MỌI khoá lệch chủ so với mốc niêm phong ĐÃ COMMIT**. Hai bản ghi
thành sai sự thật:

⑴ `_root` ghi `taken_from: claude-root-adr0014`. Tôi lấy từ **`claude-tinh-gon`** — lượt nhận của
họ nằm trên đĩa **chưa commit**, nên phép so không thấy và nó kể tên người đã rời vùng từ trước.
Đúng cái trường này sinh ra để lane vừa mất khoá đọc thấy tên mình, và nó chỉ vào nhầm người.

⑵ `workers/duc-auto-chatgpt`: một lượt **TRẢ** khoá bình thường của `claude-b36-vaA` lúc 08:50 bị
ghi thành lượt **LẤY** của tôi, kèm câu chốt của Đức về `_root` dán sang — câu đó không nói một
chữ nào về gói ChatGPT.

**Cách vá**: commit trạng thái sai làm mốc niêm phong mới (`5f0324c4`), rồi sửa tay đúng bốn
trường và restamp lại — lúc này chủ không đổi so với mốc nên lệnh thôi ghi đè (`2f37e776`).
Không đụng dấu niêm phong bằng tay.

**Còn nợ**: `--restamp` phải đọc chủ cũ từ **bảng đang nằm trên đĩa trước lượt sửa**, không phải
từ mốc đã commit; và chỉ đóng dấu **khoá người chạy thật sự đụng**, không rải câu chốt lên khoá
khác. Chưa ghi vào `BACKLOG.md` vì sổ đang **đúng 10 mục** — chạm trần cứng Đức chốt sáng nay
(giới hạn ④). Thêm một mục để chữa lỗi này là phá đúng cái luật vừa dựng.

## 2026-09-07 · `claude-scouter-s06` — đóng lượt: đẩy 60 commit của chín lane

**Lượt `--carry` này cuốn theo ai** (ADR-0005 bắt kể tên): 47 commit của **tám lane** —
`claude-assistant` (7) · `claude-b36-vaA` (8) · `claude-bang-ia` (5) · `claude-bang-vung-chac` (5)
· `claude-flow-f28-f33` (3) · `claude-gemini-crlf` (3) · `claude-root-adr0014` (6) ·
`claude-tinh-gon` (10). Cộng 13 commit của tôi.

Cổng đóng phiên **XANH TOÀN BỘ** trước lượt đẩy: 20 suite xanh sạch, dấu niêm phong khớp, 60
commit đều quy thuộc được về lane, 85 mục nhật ký đều dưới trần.

Đẩy vì cả chín lane đã bị chặn từ sáng bởi một mục nhật ký quá trần — nay đã gỡ. Đẩy sớm là
được GPT soi sớm qua connector; commit chưa đẩy thì vòng kiểm chéo không nhìn thấy.

## 2026-09-07 · `claude-scouter-s06` — đẩy Bridge riêng của Scouter, cuốn theo 2 commit

**Lượt `--carry` này cuốn theo ai** (ADR-0005 bắt kể tên): **2 commit của `claude-assistant`**
(`a2c4964`, `24e61ef`). Cộng 4 commit của tôi: `scout.fetch` + `<all_urls>` (ADR-0003 của gói) ·
Bridge riêng dạng lớp đứng trước (ADR-0004) · nhật ký phiên · sinh lại hai artifact.

Cổng đóng phiên **XANH TOÀN BỘ** trước lượt đẩy. Ghim gói 10/10, đột biến 75/75 sống sót 0.

## 2026-09-07 · claude-dieu-phoi — lõi hai vai đã vượt sáu ca; một cờ chờ Đức

**Lõi đã xong ở bộ khung** (đẩy rồi, `Ark_Repo_Harness` @ `b3bbfc5`): `scripts/quyen.mjs` +
`tests/quyen-sau-ca.mjs`. **41 phép kiểm xanh · 10/10 đột biến bị bắt** · `npm test` xanh · cổng
đóng phiên XANH TOÀN BỘ. Chín ca, kể cả ca ④ chịu tải và một ca hợp lệ đi hết được.

**Đổi một chốt của ADR-0019 ⑵.** Sổ quyền đặt trên **ref riêng** `refs/ark/quyen`, ngoài lịch sử
`main` — nên rebase `main` không chạm được nó, và ca *"quyền cũ sau fetch + rebase"* thành **không
thể xảy ra về cấu trúc**, không cần soi khoảng lịch sử. Lượt tích hợp cũng là sự kiện trên chính
ref đó, nên lượt kiểm và lượt ghi là **một lượt đẩy** — đóng lỗ TOCTOU.

**Đo được, và nó bác vế ⑴ của ADR-0019 lần thứ hai** — lần này theo chiều ngược với brief §0.
Brief đo repo Extension rồi tôi khái quát cho cả hai; **sai**. Repo bộ khung
(`Ark_Repo_Harness_Template`) **ĐANG có** branch protection cổ điển trên `main`:
`required_status_checks: ["cong-kiem"]`, `strict: true`, `allow_force_pushes: false`. Workflow
`.github/workflows/cong-kiem.yml` đã chạy **87 lượt**. Tức **bên thứ ba độc lập không phải xây
mới — nó đã có sẵn.**

Chỗ hở là **một cờ**: `enforce_admins: false`. Lượt đẩy hôm nay in ra
`remote: Bypassed rule violations for refs/heads/main` — nghĩa là hàng rào có thật nhưng tài khoản
admin đi vòng qua được, và mọi phiên AI đều đẩy bằng tài khoản đó. Nên hiện tại nó là **trang trí**.

**CHỜ ĐỨC — một quyết định, và ĐỪNG tự bật.** Bật `enforce_admins` sẽ **chặn mọi lượt đẩy** cho tới
khi `cong-kiem` báo xong (nay đang `pending`), nên bật sai lúc là tự khoá cả hai vai ra ngoài.
Repo Extension thì **không có lớp nào** (`protection` 404 · `rulesets` rỗng) — hai repo khác nhau,
đừng suy từ cái này sang cái kia.

**Chưa làm, cố ý** (brief mục 6): chưa nối `quyen.mjs` vào `claim.mjs`, chưa vào `template/`, chưa
thêm bước kiểm quyền vào `cong-kiem.yml` — bước đó chỉ có nghĩa sau khi lõi thành đường ghi thật.

## 2026-09-07 · claude-bo-sinh — cắt thời gian bộ sinh bảng, 9,7s → 3,6s

**Vì sao làm việc này trước.** Đức hỏi *"cổng kiểm cost nhiều thời gian, có cách improve không"*,
và một phiên trước đó chạy hết một tiếng. Đo ra: **~40 phút của tiếng đó là ngồi chờ máy**, và
gốc là bộ sinh bảng chậm — nó chạy trong cổng đóng phiên, trong phép kiểm của chính nó, và trong
`bang-trang-thai/`, nên mỗi giây ở đây bị nhân lên nhiều lần mỗi phiên. Đức chốt: sửa bộ sinh trước.

**Chẩn đoán bằng đồng hồ, không bằng phỏng đoán.** 277 lượt gọi git / 8.922ms một lượt sinh. Hai
nhóm ăn **58%**, cả hai vì cùng một lý do — **một tiến trình git cho MỖI đường dẫn**:
`log -1` **107 lượt / 4.139ms** · `cat-file -t` **40 lượt / 1.098ms**.

**Vá.** Hai bản đồ gộp, dựng lười, neo vào cùng mốc `moc()` đã ghim: một lượt
`git log --name-only` cả lịch sử (**152ms**) và một lượt `ls-tree -r -t` (**75ms**).

| | Trước | Sau |
|---|---|---|
| bộ sinh một lượt | 9.746ms | **3.584ms** |
| `build-dashboard-smoke` | 88s | **66s** |
| `bang-ba-cua-smoke` | 27s | **16s** |
| `harness-smoke` | 25s | **16s** |
| `check-bootstrap-smoke` | 22s | **16s** |
| `build-overview-smoke` | 20s | **11s** |
| `npm test` cả repo | 240s | **192s** |

**Bằng chứng không đổi hành vi:** ra **giống từng byte** cả ba file máy sinh (`cmp`), `npm test`
xanh toàn bộ.

**Đường dự phòng đã được KIỂM, không phải để trang trí.** Repo có 2 commit merge, mà
`git log --name-only` mặc định không liệt kê file của commit merge — nên bản đồ có thể thiếu, và
chỗ thiếu thì vẫn gọi git cho đúng đường dẫn đó. Kiểm bằng cách **làm hỏng cả hai bản đồ**: chạy
mất 8,4s (đúng tốc độ cũ) và ra vẫn giống từng byte.

**Chưa làm, và vì sao.** Phần còn lại (~280 lượt `git show`, ~30ms mỗi lượt) là phí khởi động tiến
trình **rải mỏng**, không chỗ nào trội — `lineDate` chỉ 13 lượt / 514ms. Gộp tiếp cần một tiến
trình git **thường trú** (`cat-file --batch`), tức thêm máy móc và thêm một kiểu hỏng mới. Chưa đáng.

## 2026-09-07 · claude-dong-bang — cưỡng chế cờ `frozen`, cổng bỏ suite ba gói đóng băng

**Làm gì.** Giới hạn ① Đức chốt 07/09. Cờ `frozen` khai từ hôm nay mà chính
`.repo-structure.json` tự khai *"chưa cổng nào đọc nó"* — nên gỡ cờ đi thì không test nào đỏ.
Nay cổng đọc nó qua `frozenFrom()` + `chonSuiteBoDongBang()` trong `scripts/repo-structure.mjs`.

**Số đo.** Suite bốn đơn vị của ba gói đóng băng **41,1 giây** mỗi phiên (chatgpt 17,4 ·
gemini v0.2.0 12,5 · flow 9,7 · gemini v0.1.0 1,6); gói **SỐNG** `duc-scouter` **1,5 giây**.
Cổng giữ `_code` + `_root`: **188 giây**, không có cờ thì **~229 giây**.
Ghim: `tests/frozen-suite-smoke.mjs` 11 phép kiểm · đột biến **7/7 bị bắt**.

**Hai vế giữ lại bảo vệ** — phạm vi là *chọn đúng suite*, không phải *bỏ ba suite*:
chạm vào gói đóng băng thì suite của nó **chạy lại ngay**, và **fail-closed** khi không đo chắc
được ai chạm gì (`origin/main` không phân giải thì danh sách commit chưa đẩy rỗng oan).

**Kiểm chứ không giả định:** phép chống trôi dạt ba gói nằm trong suite của **chính Scouter**
(`scouter-transport-smoke.mjs` mục ⑫, đọc `HEAD:` cả ba `bridge-pairing-core.js`) — gói SỐNG, vẫn
chạy mọi lượt. `scripts.test` **giữ nguyên** cả bốn suite: cổng đọc chính danh sách đó rồi mới
chọn, xoá khỏi đó là xoá luôn đường "chạm thì chạy lại". Ghim ở file RIÊNG vì lượt sửa này sửa
chính cổng — ADR-0019 ⑸.

**Một con số tôi báo SAI, sửa lại:** tôi nói cổng *"55s → 36s"* sau khi cắt bộ sinh. Cả hai lượt
đo đó **không giữ khoá gốc**, nên cổng **không chạy suite gốc repo** — không so được với lượt có
giữ khoá. Cắt bộ sinh là thật (9,7s → 3,6s, ra giống từng byte), nhưng con số 36 giây thì sai.

## 2026-09-07 · claude-dong-bang-2 — vá lỗ Codex #19: gói đóng băng dẫn ra `scripts/`

**Codex bác đúng.** Tôi viết *"gói không đổi thì suite chỉ có thể xanh"* — quá mạnh. Thứ NGOÀI
gói vẫn đổi được, và **không phải rủi ro lý thuyết**: đo 07/09,
`workers/duc-auto-gemini/v0.2.0/tests/root-suite-covers-workers-static.mjs` **import**
`scripts/repo-structure.mjs`, và nó canh đúng việc *"danh sách suite gốc có phủ hết worker"*.
Lượt sửa cờ `frozen` hôm nay **sửa chính danh sách đó** trong khi cổng **bỏ qua** phép kiểm ấy.
Chạy tay: 95/95 xanh — **xanh vì may, không vì thiết kế.**

**Vá.** `PHU_THUOC_CHUNG_DONG_BANG` = `scripts/` · `package.json` · `.repo-structure.json`. Chạm
bất kỳ chỗ nào trong đó thì **chạy hết**, kể cả suite gói đóng băng. Chạm chỗ khác (docs, worker
khác) thì vẫn bỏ được — có phép kiểm riêng cho vế này, vì *"chạy hết cho chắc"* sẽ ăn hết phần
tiết kiệm mà không ai thấy.

**Và một phép ghim CHỐNG MỤC**, vì hằng số thì mục được: phép kiểm dò import của cả ba gói đóng
băng và **ĐỎ** nếu có gói nào dẫn ra chỗ chưa khai. Biến *"mục âm thầm"* thành *"cổng đỏ"*.

**Số đo.** Ghim 11 → **14 phép kiểm**. Đột biến 7/7 → **10/10 bị bắt**. Cổng lượt này **không in
dòng "bỏ qua"** — vì tôi chạm `scripts/` nên bốn suite đóng băng đã chạy lại, đúng hành vi mới.

**Hai chỗ vấp, ghi để lượt sau đỡ mất thời gian.** ⑴ Một phép kiểm cũ của tôi dùng
`scripts/session-check.mjs` làm *"chạm chỗ khác"* — chỗ đó nay **là** vùng chung, nên nó đo sai
thứ nó muốn đo; đã sửa dữ liệu thử. ⑵ Cổng đỏ `eol-lf-smoke` vì **bốn file CRLF trong
`workers/duc-scouter/`** — cây làm việc của phiên khác, không phải của tôi. Cổng chặn tôi vì tôi
còn file sửa dở nên nó **không quy trách nhiệm được**; commit xong là nó tự quy đúng người và cho
qua. **Đừng đi sửa file của lane khác** — chỉ cần commit phần mình.

---

## 2026-09-08 · `claude-cua-kiem` — ADR-0019: ranh giới vùng↔đường dẫn ĐÓNG, và một câu chữa bị sửa

**Làm gì.** Cập nhật ADR-0019 theo việc đã chạy ở bộ khung, không phải theo dự định. Chi tiết đầy
đủ ở `docs/adr/0019-cua-tich-hop-kiem-quyen-tren-lich-su.md`; đây chỉ là con trỏ:

- **Mục ⑵c: "còn hở" → ĐÃ ĐÓNG.** Lõi quyền bắt buộc `--ban-do` + `--con-lai`, quy mọi đường dẫn
  trong khoảng `coSo..sha` về một khoá theo khối `areas`, từ chối nếu có đường dẫn thuộc vùng khác.
  Trước đó phiên Codex khai vùng `wrong-area` cho một thay đổi ở `product.txt` và **đi qua được**.
- **Câu treo đã trả lời: kết quả chạm NHIỀU vùng thì ai duyệt — KHÔNG AI.** Một kết quả, một vùng.
- **Mục ⒞: sửa một câu ADR này viết HAI LẦN và sai cả hai lần.** `enforce_admins` cộng một bước đọc
  sổ quyền trong CI **không** đóng được khe đẩy `main`. Ứng viên còn lại là merge queue, **chưa đo**.

**Số đo.** Ở bộ khung: `node tests/quyen-sau-ca.mjs` → **97 đạt · 0 sai** (trước 79), 15 ca. Bộ đột
biến 27 cái đang chạy lúc ghi dòng này; số cuối vào nhật ký bộ khung, không vào đây.

**Lượt đẩy.** Tôi **không** đẩy: phiên `claude-scouter-s06` đẩy trước và **cuốn theo commit
`b0f12f59` của tôi** lên `fd2d941f`. Ghi ra vì ADR-0005 bắt kể tên lane bị cuốn theo — lần này tôi
là bên **bị** cuốn, không phải bên cuốn.

**Còn mở, đừng đọc hẹp hơn.** `--as` vẫn là tên tự khai · đẩy `main` bỏ qua cửa thì mã VẪN vào ·
chưa bật cờ GitHub nào. Bản xem được chờ Đức duyệt:
`_run-qua-dem-20260907/DE-XUAT-CO-GITHUB--CHO-DUC-DUYET.md`.

## 2026-09-08 · claude-cua-kiem · Trần sổ nợ 15 lần đầu có răng

**Đức chốt:** giữ nguyên con số 15, thêm máy canh. Trước hôm nay `AGENTS.md` giới hạn ④ **tự
khai** *"trần này KHÔNG có máy cưỡng chế"* — và nó vỡ đúng chỗ mù ấy: mục thứ 11 vào sổ mà
**không gì đỏ lên**, nên trần phải nâng 10 → 15 **sau khi đã vỡ**.

**Làm gì.** Phép kiểm thứ **14** của cổng đóng phiên: *"Sổ nợ dưới trần"*. Trần khai ở
`backlog.tran` của `.repo-structure.json`, không viết cứng trong script; repo không khai thì
phép kiểm xanh (cùng hợp đồng với bản khung 1.3.50). Đang: **12/15**.

**Bộ đếm: `dangMo` mới, thêm vào `backlog-check.mjs` — không viết bộ thứ hai.** Sổ này đóng mục
bằng cách **thêm dòng `- **ĐÓNG <mã>**` ở CUỐI**, không gạch tiêu đề, nên **đếm tiêu đề là đếm
sai** — tôi đã đếm sai đúng kiểu đó một lần (báo 14 mục mở, thật ra 12). Ghim
`tests/backlog-check-smoke.mjs`: dòng ở cuối mới đóng · tự khai *"ĐÃ VÁ"* trong thân **không**
tính · dòng *nói về* một dòng đóng **không** tính (sổ thật có sẵn một dòng như vậy) · mã đã đổi
qua `ĐỔI MÃ` vẫn khớp. 15/15 xanh.

**Vấp đáng ghi — sửa hàng loạt bằng regex đã quét trúng chỗ không được sửa.** Cổng nay phụ thuộc
`backlog-check.mjs`, nên **13 kho thử** phải chép thêm file đó. Tôi vá bằng một lượt regex quét
mọi danh sách chứa `session-check.mjs` — và nó chèn cả vào **hai danh sách KHẲNG ĐỊNH**
(`repo-structure-smoke:313` đòi script phải đi qua cửa quy vùng chung · `dau-vet-vung-smoke:50`
đòi script phải dùng hằng `CHUA_THAY_DAU_VET`). `backlog-check.mjs` không làm cả hai việc đó, nên
hai chỗ ấy là **khẳng định sai được đóng dấu hợp lệ**. Cả hai đã gỡ, và tôi soát lại **bằng máy**:
mọi chỗ chèn còn lại đều có `copyFileSync` ngay dưới. **Danh sách chuỗi trông giống nhau không có
nghĩa chúng nói cùng một điều** — sửa hàng loạt thì phải kiểm từng chỗ chèn bằng ngữ cảnh, không
bằng hình dạng.

**Chập chờn, không phải lỗi:** `bridge-multiprofile-transport-async-smoke` đỏ một lượt, xanh khi
chạy riêng cả hai bản và xanh ở lượt chạy lại. Gói đóng băng, tôi không chạm file nào trong đó.

**Còn mở:** sổ **12/15**.

## 2026-09-08 · `claude-scouter-s06` — HNX Fetch thành gói riêng; trần ghi 50 → 200

Hai chốt của Đức trong một phiên.

**① Trần ghi 50 → 200** ([ADR-0005](workers/duc-scouter/v0.1.0/docs/adr/0005-tran-ghi-nang-tu-50-len-200.md)).
Trần 50 hôm 07/09 dừng một việc **đúng** — lượt tải 216 PDF — rồi Đức bật lại và việc đó chạy
tiếp y nguyên. Nó không lọc được gì, chỉ cắt một việc lành làm nhiều khúc. Bốn lớp còn lại
không đụng. Kèm: **ba mỏ neo đột biến đã chết từ hôm trước** (`D9 H2 F6`) được vá — chúng canh
ba chốt an toàn mà lại khớp 0 lần.

**② HNX Fetch tách thành extension riêng** ([ADR-0021](docs/adr/0021-hnx-fetch-tach-thanh-extension-rieng.md)).
Đức: *"scouter đi scout trang khác, còn HNX thành 1 extension độc lập."*

**Phép đo quyết định hình dạng gói, chạy TRƯỚC khi chép một dòng nào:** tầng dữ liệu HNX gọi
**đúng một lệnh** của extension (`scout.fetch`), và lệnh đó **không dùng** `chrome.debugger`.
Nên gói mới **không phải fork**: nó bỏ hẳn quyền debugger, giữ **4 lệnh trên 15**, vùng đích
hẹp về `hnx.vn` thay cho `<all_urls>`. Extension không có debugger thì **không ai bắt nó bấm
được** — kể cả AI vận hành nó, vì Chrome từ chối ở tầng hệ thống.

**Cắt chứ không tắt bằng cờ:** 11 lệnh bị XOÁ khỏi từ vựng. `scout.click` trả `METHOD_NOT_FOUND`.
Một lệnh không tồn tại thì không ai bật lại được.

**Trần "một gói sống" nâng lên HAI.** Trần là *số gói CÓ LÝ DO sống*, và lý do phải viết được
thành một ADR. Gói thứ ba phải hỏi Đức.

**Hai lỗi cũ lộ ra trong lượt này, đã vá:**

- Suite gốc **không chạy** phép ghim của gói mới — thiếu `tests/run-all.mjs`. Cổng đóng phiên tự
  tìm tệp đó theo hình dạng, nên thiếu nó là **im lặng bỏ qua cả gói**.
- STATUS của Scouter khai `ref_readme: README.md` — đường đó **tồn tại ở gốc repo** nên phép
  kiểm XANH, nhưng người bấm từ bảng rơi vào README của CẢ REPO. Xanh mà trỏ nhầm chỗ.

**Đo.** Suite gốc **375** (trước 369). Phép ghim bề mặt hẹp **4/4**. `check-bootstrap` 0 đỏ.

**Còn nợ:** thư mục pilot cũ **chưa xoá** (xoá tệp phải hỏi Đức), đã dán bảng ĐÃ CHUYỂN NHÀ.
Chưa lượt nào chạy qua chính extension mới.

## 2026-09-08 · `claude-scouter-s06` — bảng hiện DANH TÍNH từng extension

Đức đặt: *"cập nhật vào dashboard danh tính của 2 extension, cả chức năng, khả năng… protocol
sử dụng cũng nên được đưa vào. Đơn giản, dễ hiểu, cô đọng."*

**Sửa NGUỒN, không sửa bảng.** `DASHBOARD.md` là máy sinh — gõ tay vào đó thì mất ở lần sinh
sau, và trong lúc chưa mất thì nó nói sai. Nên: ba trường **tuỳ chọn** trong `STATUS.md`
(`lam_duoc` · `khong_lam_duoc` · `dung_the_nao`) + `ref_runbook` trỏ sổ tay, rồi hai bộ sinh đọc.

- `DASHBOARD.md` → **khối C** mới, mỗi extension ba dòng.
- Trang HTML → khối *"Nó là cái gì"* trong thẻ từng extension (tầng **Việc**).

**Chỉ vẽ đơn vị NÀO CÓ KHAI.** Bốn gói cũ không khai nên không hiện dòng nào — một danh sách
nửa là *"chưa khai"* thì người đọc học cách bỏ qua cả khối.

**Dòng KHÔNG LÀM ĐƯỢC đứng ngang hàng dòng làm được**, cố ý: hai extension này khác nhau chủ
yếu ở chỗ chúng **không** làm gì. HNX Fetch không bấm được — đó là tính năng, không phải thiếu
sót, và là lý do gói đó tồn tại riêng.

**Một lỗ suýt mở lại.** Ba trường mới là chữ tự do hiện thẳng lên bảng, mà bộ dò *"số của máy"*
chỉ soi frontmatter theo **danh sách tên** — nên trường mới **không tự được soi**. Quên thêm tên
là gõ tay được *"4 lệnh Bridge"* vào bảng và không gì đỏ lên. Đã thêm vào danh sách và ghim cả
hai chiều: gõ tay số máy-đo thì **bị bắt**, còn số kiểm chứng (`25/25`) và giới hạn an toàn
(`trần 200 lượt`) thì **được tha**.

> Kèm một chỗ tự sửa: chú thích đầu tiên tôi viết nhắc hàm `luatSoMayGiu()` — **không tồn tại**.
> Tên thật là `detectStatusMachineOwnedFacts()`.

**Đo.** Suite gốc repo **379** · dashboard smoke **102** (trước 100) · overview smoke **36**
(trước 35) · `check-bootstrap` 0 đỏ.

## 2026-09-08 (tối) · claude-cua-kiem · N-43 đóng: một vòng 8,5 phút → dưới 2,5

**Đo trước, không đoán.** Chuỗi suite repo này **241,7s / 16 bước**, và cổng đóng phiên **chạy
lại toàn bộ chuỗi đó** — một vòng bình thường ≈ **8,5 phút**, nửa sau không kiểm thêm gì.

| | Trước | Sau |
|---|---|---|
| chuỗi suite | 241,7s | **93s** (song song, 21 luồng + 5 chạy riêng) |
| cổng đóng phiên | ~280s | **33s** (đọc dấu, không chạy lại) |
| **cả vòng** | **521s** | **126s — nhanh 76%** |

**Dấu xác nhận KHÔNG phải cửa sau.** Buộc vào HEAD + băm `git status --porcelain -uall` + danh
sách suite + môi trường (bản Node) + hạn 30 phút. Sửa một byte ở bất kỳ file nào, kể cả file chưa
track, là dấu hết hiệu lực. Suite đỏ thì bộ chạy **xoá dấu**. Dấu trong `.gitignore` nên không
mượn được của máy khác. Đường chạy đầy đủ còn nguyên. Ghim: `tests/dau-suite-smoke.mjs`, **11 cửa
từ chối** + soi rằng cổng thật sự gọi và rẽ nhánh.

**`npm test` VẪN là chuỗi tuần tự — cố ý, và đây là chỗ tôi phải đổi cách làm.** Ban đầu tôi trỏ
`test` sang bộ chạy. Một phép ghim **trong gói ĐÃ ĐÓNG BĂNG** đọc thẳng `scripts.test` để bắt
"xanh giả" liền đỏ. Gói đóng băng thì **chỉ-đọc** — nên tôi đổi cách của mình, không đổi luật của
nó: đường nhanh mang tên riêng `npm run test:song-song`.

**Bẫy phụ thuộc, lần thứ tư trong ngày:** cổng nhận thêm `chay-test.mjs`, nên **13 danh sách kho
thử** phải chép thêm file đó — và **hai danh sách KHẲNG ĐỊNH trông y hệt**
(`repo-structure-smoke:313` đòi script đi qua cửa quy vùng chung · `dau-vet-vung-smoke:50` đòi
dùng hằng `CHUA_THAY_DAU_VET`) **không được đụng**. Chèn nhầm vào đó là biến khẳng định đúng thành
**khẳng định sai được đóng dấu hợp lệ**. Soát bằng máy: mọi chỗ chèn phải có `copyFileSync` ngay
dưới.

**Lượt đẩy này dùng `--carry`, cuốn theo 1 commit của lane `claude-scouter-s06`** (`733840a`).
Đức xác nhận lane đó đã xong và họ đã tự trả hết khoá trước lúc tôi nhận.

**Còn mở:** không có gì của phiên này.

## 2026-09-08 · `claude-ext-dot0` — ĐỢT 0: bản đồ việc thôi nói sai (N-35, N-31)

**Làm gì:** hai lỗi khiến `what-next.mjs` — thứ AI đọc để CHỌN việc lúc mở phiên — báo sai.

**Kết quả bằng số.** ⑴ Trước: bảng xếp `workers/duc-auto-chatgpt` (Đức đã đóng băng) vào
*"chạy song song được ngay, ưu tiên #2, 22 việc mở"*; `grep -c frozen scripts/what-next.mjs` = `0`.
Sau: gói đó ở mục riêng `B2 · ĐÃ ĐÓNG BĂNG`, mục A còn 2 luồng và cả hai là gói sống.
⑵ Trước: `workers/hnx-fetch` báo `0 việc mở`, sổ thật có `3`. Sau: đúng 3 (`H-02` `H-03` `H-06`).
⑶ Cảnh báo *"đóng mà chưa gạch"* thôi trỏ vào gói đóng băng — cả 4 mã nó nhắc đều nằm trong
gói cấm sửa. ⑷ Ghim `tests/what-next-smoke.mjs` 20 → 24 phép; đột biến gỡ `!v.dongBang` thì đỏ.
⑸ Sổ nợ 12 → 11 mục mở / trần 15.

**Chỗ roadmap viết sai, sửa lại ở đây:** roadmap giao *"gạch bốn mã B-29 B-16 B-18 G-14, 2 phút"*.
Cả bốn nằm trong `duc-auto-chatgpt` và `duc-auto-gemini` — **gói đã đóng băng, chỉ được đọc**.
Gạch chúng là sửa file cấm. Thuốc đúng là gỡ lời mời, không phải đi sửa. Cùng bệnh với N-35.

**Còn mở:** `N-44` (mới) — sổ nợ gốc repo vẫn không có mặt trên bản đồ; 11 mục mở ở gốc vô hình
với phiên điều phối. Và một dòng `ĐÓNG N-43` bị cắt cụt giữa câu nằm ở cuối `BACKLOG.md` (lượt
trước, lane `claude-cua-kiem`) — **cố ý không sửa**: sổ miễn khoá KHI CHỈ THÊM DÒNG, sửa dòng cũ
thì không được miễn. Nó vô hại vì dòng đầy đủ nằm ngay dưới.

## 2026-09-08 · claude-scouter-s06 · ghi nhận lượt `--carry`

Luật ADR-0005: mọi lượt `--carry` phải kể tên lane bị cuốn theo. Lượt đẩy này cuốn theo commit
của **`claude-ext-dot0`** (và trước đó một lượt cuốn theo **`claude-cua-kiem`**). Cả hai đều là
phiên đang chạy song song trong cùng thư mục git, không phải commit vô chủ.

Kèm một chuyện đáng biết cho phiên sau: `claude-cua-kiem` chạy `git add -A` và **cuốn phần sửa
của tôi** ở `workers/duc-scouter` + `workers/hnx-fetch` vào commit `c7580447` mang nhãn của họ.
Nội dung nguyên vẹn, nhưng nhãn `Lane:` của hai lượt sửa đó chỉ sai người. Cách tránh:
`git add <đường dẫn của mình>`, đừng `-A`.
