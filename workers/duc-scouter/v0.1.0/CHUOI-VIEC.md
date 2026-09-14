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

## Bảng theo dõi — Đức nhìn một cái là biết đang ở đâu

**Mục đích của mọi việc dưới đây, Đức đặt lại 14/09:** *hoàn thiện nốt Scouter, rồi mới tách Udin
Optic ra — để sau khi tách không phải sửa sâu vào Scouter nữa.* Nên thứ tự không còn chạy theo
"việc nào dễ" mà theo **danh sách đóng băng** ở `docs/CAPABILITIES.md` §5.2.

| | Việc | Chặn bởi | Trạng thái |
|---|---|---|---|
| **T13** | Nối `lay-anh.mjs` sang `scout.grab`, rồi chạy thật → đóng `W3` | — | **việc kế, không chờ ai** |
| **Q1** | ✋ **Đức chốt chính sách che `de-xuat-chat-v1`** | — | **câu hỏi chặn duy nhất còn lại** — nó chặn `O8`, mục đắt nhất của danh sách đóng băng |
| **T15** | E2E Udin: mở trang → W1 → W2 → W3 một mạch | T13 | chưa chạy lần nào |
| **T18** | `O8` đọc chữ trên trang | Q1 | **trong danh sách đóng băng** |
| **T19** | `I4` xoá ô nhập · `I9` tải file lên | ✋ Đức | **trong danh sách đóng băng** |
| **T20** | `I5` cuộn · `I6` rê chuột · `I7` bấm đúp/phải | ✋ Đức, chốt gộp một lượt | bảo hiểm cho trang thứ hai |
| **T17** | **Máy sinh bảng năng lực** thay cho gõ tay | — | nợ phát hiện 14/09: không dòng mã nào đọc `CAPABILITIES.md` |
| **T16** | Dấu chẩn đoán của trang thử đọc được bằng **giá trị**, không bằng sự tồn tại | — | nợ do `G-48` để lại |
| **T8** | `S-03` — đổi tên `observer` → `scouter` | T18 · T19 · T20 | mốc **đóng băng seed** |
| **T9** | Đóng gói v1 cho người ngoài dùng được | T8 | mốc đóng băng seed |
| **T21** | **Tách Udin Optic thành gói riêng** | T8 · T9 | đích của cả lộ trình; lùi xuống sau đóng băng |
| **T7** | Đóng vòng tự cải tiến MỘT lần — `ROADMAP` bước 2 | — | **③/④ chặng**; chặng 4 nay chạy được vì adapter tự kiểm bằng trang |
| **T5** | Chạy lại lượt gửi prompt trên Udin | — | `W2` đã ĐẠT 3/3 — mục này gần như thừa, xem lại trước khi làm |
| **T6** | `S-20` — nghe mạng trong lúc bấm | T7 cho biết có thật cần không | chưa bắt đầu |
| **T10** | `S-21` — target không trả lời câu hỏi hình học | — | giả thuyết ⒜ đã chết (`G-41`) |
| ~~T14~~ | ~~`S-22` — điều tra lượt bấm báo ĐẠT mà trang không nhận~~ | — | **ĐÓNG 14/09 bằng LỜI KHAI** trong `README`, không bằng bản vá. Đọc mục `T14` bên dưới trước khi nghĩ tới mở lại |
| ~~D3~~ | ~~`scout.focus`~~ | — | **Đức trả lời 14/09: KHÔNG.** Cửa sổ chạy ẩn bên dưới; adapter phải chạy được trên tab nền |
| ~~T12~~ | ~~W3 qua `scout.fetch`~~ | — | **CHẾT 14/09** — 403 vì URL ký sẵn (`S-24`); thay bằng T13 |
| ~~D2~~ | Đặt tên ghế | — | **XONG 14/09** — ghế làm việc tên `Dummy_Scout`; ghế còn lại Đức không dùng |
| ~~T1 T2 T3 T4 T11~~ | `S-16`…`S-19`, `S-23` | — | **XONG 12–13/09**, đo ngoài đời |

**T11 chen lên đầu ngày 12/09, và đây là lý do:** lượt chạy T7 đo được rằng `scout.click` và
`scout.type` **báo ĐẠT trong khi trang không nhận được gì**. Mọi việc còn lại trong chuỗi đều
đứng trên đường ghi đó — T7 chặng 4, T5, T6 — nên làm tiếp trước khi biết đường ghi có nói thật
hay không là **xây trên một con số không kiểm được**. T11 rẻ: phép thử đầu tiên tốn của Đức 10
giây (xem `S-22` giả thuyết ⒜).

**T7 vẫn là mục đích của cả gói**, và ba chặng đầu của nó đã chạy trơn — bàn đo nằm sẵn ở
`pilots/trang-thu-cham/`, chạy lại bằng một lệnh. T8 vẫn đứng cuối vì nó đổi tên hàng loạt và
làm mọi diff khó đọc.

---

## Q1 · Đức chốt — chính sách che dữ liệu `de-xuat-chat-v1`  ⟵ *câu chặn duy nhất còn lại*

**Xin gì.** Một chữ *được* hoặc *không* cho chính sách đang nằm ở `BACKLOG.md` (`de-xuat-chat-v1`):
lõi đọc chỉ trả **danh sách trắng** thuộc tính, **cắt query + fragment** khỏi mọi `src`/`href`,
**không trả chữ trong trang**, không trả `outerHTML`.

**Vì sao nó chặn nhiều thứ đến thế:**

1. **`O8` đọc chữ trên trang** không viết được trước khi chính sách này có chữ ký — vì `O8` chính
   là việc **nới** điều khoản *"không trả chữ"*, và nới một chính sách chưa ai ký thì không có gì
   để nới từ đó.
2. `O8` là mục **đắt nhất** của danh sách đóng băng (`docs/CAPABILITIES.md` §5.2): không đọc được
   chữ thì adapter chỉ kiểm được *"có phần tử không"*, không kiểm được *"nó nói gì"*.
3. **`scout.grab` đã đứng trên chính sách này rồi** — `source.masked` cắt query đúng theo nó.
   Tức là gói đang chạy trên một luật chưa ai ký.

**Ba đường, và tôi đề xuất đường giữa:**

| | Đường | Giá |
|---|---|---|
| ⒜ | Ký nguyên bản `de-xuat-chat-v1`, giữ *"không trả chữ"* | `O8` chết hẳn, và cùng nó là `W4` + mọi dấu kiểm bằng chữ. **Không khuyên** |
| ⒝ | Ký, kèm **một cửa hẹp cho chữ**: `scout.text` trả chữ của **một** phần tử khớp selector, không trả cả trang, không trả `outerHTML` | Đọc được câu trả lời và thông báo lỗi, mà vẫn không có đường hút cả trang ra ngoài. **Khuyên đường này** |
| ⒞ | Hoãn tiếp | Mọi mục của danh sách đóng băng đứng yên, và mốc tách Udin lùi theo |

· **đóng khi:** Đức chọn ⒜ ⒝ hay ⒞, và lý do ghi vào `decisions.md` — không phải chỉ vào đây.

## T13 — nối `lay-anh.mjs` sang `scout.grab` · việc kế, không chờ ai

`scout.grab` đã có (14/09, Đức chốt `S-24` đường ⒜): đưa **selector**, extension tự đọc `src`
đầy đủ bên trong rồi tải luôn, trả **byte** — URL ký sẵn không ra khỏi trình duyệt. Nhưng
`pilots/udin-optic/scripts/lay-anh.mjs` **vẫn đang gọi `scout.fetch`**, tức là vẫn sẽ 403.

Việc: đổi `lay-anh.mjs` sang `scout.grab`. Chỗ gợn duy nhất — grab nhận **một** selector khớp
**đúng một** phần tử, mà trang có bốn ảnh, nên adapter phải đánh số: `img.batch-grid-image` thứ
n gọi bằng `:nth-of-type` hoặc một selector riêng. **Đếm ảnh vẫn bằng `scout.query`** (masked
src đủ để phân biệt ảnh mới/cũ), chỉ lượt TẢI mới qua grab.

Xong khi: `lay-anh.mjs` không còn chữ `scout.fetch`, ghim của nó xanh lại, và **chạy thật trên
ghế `Dummy_Scout` lấy được ít nhất một ảnh xuống vùng ghi**. `scout.grab` CHƯA CHẠY THẬT lần nào.

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

· **đóng khi:** chọn được một đường, và lý do ghi vào `BACKLOG.md` dưới `S-20`.

## T7 · Đóng vòng tự cải tiến MỘT lần  ⟵ *mục đích của cả gói; đang ở chặng ④, chặn bởi T11*

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

`observer-engine.js` · `scripts/observer-probes.mjs` · `scripts/observer-mutation-check.mjs` ·
`tests/observer-*-smoke.mjs` còn mang tên cũ; ADR-0009 đổi tên gói từ 06/09.

**Để gần cuối, có lý do:** nó làm mọi diff khó đọc, và chen vào giữa lúc đang xây thì mọi lượt
audit sau đó đều phải lội qua nó. Làm khi **không có việc nào đang dở**.

· **đóng khi:** đổi bằng `git mv` (không copy-rồi-xoá), mọi mỏ neo đột biến khớp lại đủ, và
`npm run scouter:mutation` vẫn **0 con sống sót**. Mỏ neo lệch là dấu hiệu đã sót một chỗ.

## T9 · Đóng gói v1

Nấc `v1` khai *"seed đủ dùng để người ngoài lấy về dùng được"*. Còn thiếu một đường cài đặt cho
người chưa từng đọc repo này.

**Chỉ làm sau T7.** Đóng gói một seed mà vòng tự cải tiến chưa khép lần nào là đóng gói một lời
hứa.

---

## KHÔNG làm trong chuỗi này

- **Xây extension Udine.** Udin là **ca thử**, không phải đích. Thứ nó dạy được thì đẩy lên
  seed; thứ riêng của nó thì ở `pilots/`.
- **Mở thêm method CDP ngoài hai cái chuỗi này xin** (`DOM.getNodeForLocation`, và
  `Network.enable` nếu chọn đường ⒜ ở T6). Mở thêm là nới bề mặt tấn công cho một nhu cầu
  tưởng tượng.
- **Tạo automation tự chạy.** Luật gốc cấm khi chưa hỏi.
- **Đẩy lên `main` khi chưa có audit độc lập.**
