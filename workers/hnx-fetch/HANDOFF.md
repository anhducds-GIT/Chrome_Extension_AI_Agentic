# HANDOFF — gói `hnx-fetch`

> Nhật ký phiên. **Chỉ thêm dòng ở cuối**, không sửa mục cũ. Phần cuối = trạng thái mới nhất.
> Một mục nói: làm gì · kết quả có số · còn gì mở. Lý do dài thì về ADR, việc còn nợ thì về
> `BACKLOG.md`.

---

## 2026-09-08 · `claude-scouter-s06` — khai sinh gói: HNX Fetch tách khỏi Scouter

Đức chốt: *"sau này ta sẽ dùng scouter đi scout trang khác, còn HNX thành 1 extension độc lập
chạy riêng cho web HNX Fetch."*

**Phép đo quyết định cả hình dạng gói.** Trước khi chép một dòng nào, đếm xem tầng lấy dữ liệu
thật sự gọi những lệnh nào:

```
grep -ohE '"(scout|file)\.[a-z]+"' du-lieu/*.mjs | sort | uniq -c
      4 "scout.fetch"
      1 "file.write"
      1 "file.list"
```

Toàn bộ việc HNX chạy trên **đúng một lệnh của extension**, và `scout.fetch` **không dùng
`chrome.debugger`** — nó là `fetch()` của chính service worker, không cần `target_id`, không
gắn vào tab nào.

Nên đây **không phải bản chép của Scouter**. Nó là extension **hẹp hơn hẳn**:

| | Scouter | HNX Fetch |
|---|---|---|
| quyền `debugger` | có | **không** |
| bấm · gõ · cây DOM · ảnh chụp | có | **không có** |
| dải băng *"đang gỡ lỗi trình duyệt"* | hiện | **không hiện** |
| vùng đích | `<all_urls>` | `hnx.vn` + máy chủ tại chỗ |
| số lệnh Bridge | 15 | **4** |

Extension không có `debugger` thì **không ai bắt nó bấm được**, kể cả AI vận hành nó. Với thứ
chạy hằng ngày vào dữ liệu thật, đó là cái được lớn nhất của lượt tách này.

**Cắt chứ không tắt.** `bridge-core.mjs` và `fetch-core.mjs` bị **xoá** 11 lệnh, không phải
chặn bằng cờ: một lệnh không tồn tại thì không ai bật lại được, còn một lệnh còn đó mà bị chặn
bằng cờ thì cái cờ là thứ duy nhất đứng giữa. `scout.click` ở đây trả `METHOD_NOT_FOUND`.

**Hai tệp chép NGUYÊN VĂN** (`transport.mjs` · `journal-core.mjs`) có phép ghim so **từng
byte** với bản gốc bên Scouter. Nó không cấm hai bản khác nhau — nó cấm chúng khác nhau **mà
không ai biết**, vì đó đúng là bệnh của ba gói `duc-auto-*`.

**Giao thức riêng: `hnx-fetch.bridge`.** Làm được vì lõi máy chủ Bridge dùng chung đã nhận
`protocol` qua tham số. Độc lập thật, không phải độc lập trên giấy.

**`PROTOCOL.md` — thứ Đức đặt hàng.** Sổ tay vận hành **tự đứng một mình**, cho một AI không
phải Claude Code: fetch · đối chiếu · kiểm toàn vẹn · bảng mã lỗi · cách sửa khi HNX đổi trang.
Mục 4 (đối chiếu) là phần dài nhất, và đó là chủ ý — Đức giữ việc này cho AI **vì** phần đó.

**Đo.** Suite lấy dữ liệu **5/5** ở vị trí mới. Phép ghim bề mặt hẹp **4/4**.

**Còn mở, lớn nhất:** chưa lượt nào chạy qua chính extension này (`H-01`). Bốn mục ở
`BACKLOG.md`.

## 2026-09-08 · `claude-scouter-s06` — máy chủ riêng · icon HNX · cả sợi dây đã chạy

Đức nạp extension mới rồi ghép cặp bằng tệp của Scouter. **Không nối được — và đó là hành vi
đúng**, nhưng nó hỏng theo cách tệ nhất: im lặng.

**⑴ Máy chủ Bridge riêng** (`bridge/hnx-fetch-host.mjs`). Lõi so tên giao thức trên MỌI phong
bì, nên máy chủ nói `duc-scouter.bridge` từ chối sạch phong bì `hnx-fetch.bridge`. Tệp ghép
cặp *hợp lệ* — cùng cổng, cùng token — mà bắt tay vẫn không thành, và triệu chứng duy nhất là
dòng *"Mất kết nối"*, **y hệt** lúc chưa bật máy chủ.

> Chữa bằng cách chạy **đúng máy chủ**, không phải nới lỏng phép so khớp kia. Phép ghim ⑸ canh
> hai đầu sợi dây khai cùng một tên. Host **mỏng**, dùng chung lõi `_shared/` với Scouter.

**⑵ Icon HNX** — chữ **trắng** trên nền **xanh đậm**; Scouter là chữ nâu trên nền vàng. Đổi
**cả hai lớp**, cố ý: chỉ đổi chữ thì ở 16px vẫn là hai ô vàng cạnh nhau, mà 16px mới là cỡ
thật sự làm việc. Cỡ 16 và 32 vẽ **một chữ H đậm** — ba chữ ở 16px ra vệt bẩn.

**⑶ Cả sợi dây đã chạy** (`day-tron-vong-smoke.mjs`, 7 khối): **máy chủ THẬT ↔ transport THẬT
↔ lõi THẬT**, qua socket TCP thật. Chỉ `fetch()` còn giả — suite gọi ra Internet là suite đỏ
theo thời tiết.

**⑷ Đột biến kiểm** (`H-04` đóng): **13/13 khớp · 13 giết được · 0 sống sót**. Một con ban đầu
sống sót **vì chính nó hỏng**; sửa cả hai đầu, và phép ghim mọc thêm một ca chưa ai thử.

**Đo.** Suite gói **7/7** · suite gốc repo **377** · `check-bootstrap` 0 đỏ.

**Còn mở:** `H-01` thu hẹp, chưa đóng — phần còn lại **chỉ Chrome trả lời được**. Đừng đóng
nó bằng suy luận từ suite.

## 2026-09-08 · `claude-scouter-s06` — audit độc lập (Codex): 6 lỗi, đã vá và ghim hết

**Lượt đầu FAIL vì sandbox Codex không đọc được đĩa** (`apply deny-read ACLs`) — đó là *không
đọc được file*, KHÔNG phải *code sai*. Đừng ghi lượt đó vào sổ như một lần đỏ. Lượt hai nhồi
thẳng mã qua stdin thì nó đọc được.

**Sáu mục, kiểm chứng độc lập từng mục trước khi vá — cả sáu đều đúng:**

| Chỗ | Vì sao đọc một mình không thấy |
|---|---|
| **Phanh khẩn bị HỒI SINH** | ghi `{ ...gate, used }` chở theo `enabled: true` đọc từ TRƯỚC; phanh khẩn rơi vào giữa đọc và ghi thì **chính lượt trừ ngân sách bật lại công tắc vừa tắt** |
| **Trần 200 bị vượt** | đọc rồi ghi là hai lượt tách rời; năm lượt cùng đọc rồi cùng ghi, cả năm đi ra |
| **Đứt thân → `INTERNAL_ERROR`** | lượt đọc thân nằm NGOÀI `try`; mã đó bị xếp KHÔNG-thử-lại, nên một cú vấp lẽ ra tự qua giết cả lượt chạy dài |
| **Nuốt thân rồi mới đo** | không nhìn `content-length` trước |
| **Vùng ghi hở** | chỉ dò TÊN tệp ở tầng con trực tiếp — tệp ghép cặp đặt tên khác, hoặc sâu một tầng, lọt sạch |
| `session.hello` **khai sai tên gói** | ba chỗ tự khai nói hai kiểu; ghim cũ chỉ soi `system.ping` |

**Hai lỗi đầu cùng gốc.** Vá bằng **hàng đợi mức module** dùng chung cho `setWriteGate` và
`spendWriteBudget` (đóng đường đua), cộng **ghi từng trường** (chặn trường lạ bám theo).

**Ghim rồi mới tính là xong:** thêm khối ⑺ và ⑻, kèm **8 con đột biến** hoàn nguyên đúng từng
chỗ vừa sửa. Một con sống sót **và đúng ra phải thế** — hàng đợi đã chặn đường đua nên vế kia
không còn khai thác được qua lối đó; ghim lại đúng tính chất nó thật sự giữ, thay vì ghim một
lời khai to hơn sự thật.

**Đo.** Đột biến **21/21 khớp · 21 giết · 0 sống sót** · suite gói **7/7** · gốc repo **377**.

## 2026-09-08 · `claude-scouter-s06` — audit NỘI DUNG: protocol có chỗ không làm theo được

Lượt audit thứ hai, lần này soi tài liệu với câu hỏi: *một AI khác, ngày đầu, chỉ đọc
`PROTOCOL.md`, có chạy được việc hằng ngày không?* Câu trả lời là **chưa**. Bốn chỗ đáng ghi:

**⑴ Một lời khuyên KHÔNG LÀM THEO ĐƯỢC.** Protocol viết *"gặp thân quá khổ thì chia nhỏ theo
loại sản phẩm"* — mà `tai-ket-qua.mjs` **gõ cứng** một loại, không có cờ nào chọn. Sửa câu đó
thành *một ngày một lượt*, và mở `H-05` cho cái cờ.

**⑵ Cách nghiệm thu không chạy được như đã viết.** Protocol bảo *"nghi ngờ thì lấy lại một ngày
và so từng ô"* — nhưng ngày đã có thì lượt lấy **bỏ qua**, nên không có đường "lấy lại". Cách
đúng: lấy vào **một tệp khác ở thư mục tạm** rồi so; tệp thật không bị chạm một byte.

**⑶ Cách kiểm dữ liệu có HAI chỗ mù.** Câu lệnh đếm cũ lấy **ngày** làm khoá, nên cùng một hợp
đồng ghi hai lần vẫn ra đúng 8 hàng; và một ngày **thiếu hẳn** thì không có gì để đếm nên nó vô
hình. Thay bằng `du-lieu/kiem-ssot.mjs` — khoá là **ngày + ISIN**, và dò ngày thiếu bằng LỊCH.
Chạy trên tệp thật ngay: nó chỉ ra **4 ngày trong tuần thiếu hẳn** mà cách cũ không hề thấy.

**⑷ Lời hứa "không bấm được" nói THIẾU.** Bỏ `debugger` không tự nó đủ: còn `content_scripts`
(khai ở tầng ngoài cùng, **không đi qua** danh sách `permissions`) và `scripting`/`tabs`. Manifest
vốn đã không có cả ba — nhưng phép ghim chỉ soi một, nên nó **bỏ lọt hoàn toàn** đường thứ hai.
Nay khẳng định cả ba, con `N22` chứng minh nó bắt được.

Kèm: thêm mục *Bắt đầu từ số không* (bốn thứ phải hỏi Đức, và quy ước thư mục làm việc — bản
trước trộn hai gốc đường dẫn), luật chọn khoảng ngày (hỏi tệp, đừng gõ theo trí nhớ), và bảo
đảm **một ngày vào tệp trọn vẹn hoặc không vào gì** — thứ khiến câu *"ngày đã có thì bỏ qua"*
an toàn, mà bản trước không hề nói ra.

**Đo.** Suite gói **8/8** · gốc repo **378** · đột biến **22/22 khớp, 0 sống sót**.

## 2026-09-08 · `claude-scouter-s06` — đóng gói: tài liệu nay cũng có phép ghim

Lượt cuối trước khi gọi là hoàn chỉnh: soi **mọi đường dẫn và mọi câu lệnh** trong tài liệu của
gói xem chúng có trỏ vào tệp có thật không. Bắt được **3 chỗ trỏ hụt** — một lệnh gọi tên tệp
chưa bao giờ tồn tại, hai đường dẫn viết thiếu tiền tố thư mục.

**Không lần nào có gì đỏ lên.** Tài liệu không chạy, nên không gì bắt được nó trỏ hụt cho tới
lúc có người đi theo nó — mà `PROTOCOL.md` viết ra chính để một AI khác đi theo mà không hỏi ai.

Nên bộ soi ở lại thành phép ghim: `tham-chieu-tai-lieu-smoke.mjs`. Nó **chỉ soi tài liệu CHỈ
DẪN** — nhật ký và các mục sổ nợ đã đóng cố ý giữ tên tệp lúc đó, và bắt lịch sử phải tự sửa
mình là sai. Nó cũng đỏ nếu soi được **quá ít** tham chiếu: một bộ đọc hỏng trả về *0 hỏng*
trông y hệt một tài liệu sạch.

Kèm: đường dẫn trong phép ghim suy từ vị trí chính tệp đó, không gõ cứng tuyệt đối — bản đầu gõ
cứng, và nó sẽ đỏ ở máy thứ hai mà không ai đoán ra vì sao.

**Đo.** Suite gói **9/9** · **60 tham chiếu tài liệu, 0 hỏng**.

**Trạng thái gói: đã đóng gói xong, chờ đúng MỘT việc của Đức** — nạp vào Chrome rồi chạy một
lượt thật (`H-01`). Mọi thứ đo được từ Node đều đã đo.

## 2026-09-08 · `claude-scouter-s06` — dọn một mảnh tạm lọt vào commit

`bridge/hnx-fetch-host.mjs.khoi` là 18 dòng tôi cắt ra làm bản sao trước khi thay khối
`canhVungGhi`, và nó bị `git add -A` cuốn theo. Không phải mã sản phẩm, không ai `import`,
nội dung đã nằm trong bản đã sửa. Đã xoá.

> Ghi ra vì cách nó lọt vào đáng nhớ hơn bản thân nó: `git add -A` trên cả thư mục gói thì
> **mọi thứ tôi vừa tạo trong lúc sửa đều đi theo**, kể cả thứ tôi không định giữ. Lần sau
> `git status --short` trước khi `add`, hoặc `add` từng đường dẫn.

**Đo lại sau khi dọn.** Suite gói **9/9** · đột biến **22/22 khớp, 0 sống sót** · 60 tham
chiếu tài liệu, 0 hỏng.

## 2026-09-08 · `claude-scouter-s06` — khai danh tính gói vào bảng trạng thái

Ba trường **tuỳ chọn** vào `v0.1.0/STATUS.md`: `lam_duoc` · `khong_lam_duoc` · `dung_the_nao`,
cộng `ref_runbook` trỏ `PROTOCOL.md`. Bộ sinh đọc chúng và vẽ ra ở cả `DASHBOARD.md` (khối C)
lẫn trang HTML (khối *"Nó là cái gì"*).

Dòng đáng đọc nhất là **KHÔNG làm được** — nó nói thẳng gói này không bấm, không gõ, không đọc
trang, và **không phải vì chưa làm** mà vì manifest không khai `debugger`, không khai
`content_scripts`, không khai `scripting`. Đó là lý do gói này tồn tại riêng, nên nó phải nằm
trên bảng chứ không nằm trong mã.

Chi tiết bộ máy ở `HANDOFF.md` gốc repo cùng ngày.

## 2026-09-08 · `claude-scouter-s06` — CHẠY THẬT lần đầu qua chính extension (H-01 đóng)

Đức nạp lại extension và ghép cặp bằng tệp của Scouter. **Dùng chung tệp là được** — tệp chỉ
chở cổng và token; cái quyết định là **máy chủ nào đang chạy**. Cổng 32151 lúc đó trống, nên
bật máy chủ HNX lên với chính tệp đó.

**Đo được, trọn vòng qua Chrome thật:**

| Việc | Kết quả |
|---|---|
| `system.ping` | `seed: hnx-fetch-v0.1` |
| `system.capabilities` nhìn từ NGOÀI dây | đúng **bốn** lệnh, không lệnh bấm nào |
| `scout.fetch` trang thật | status 200 · 61.797 byte |
| ngân sách | trừ đúng **199/200** |
| `tai-ket-qua.mjs` một lượt đầy đủ | đi trọn vòng, **0 hỏng** |
| tệp SSOT sau lượt chạy | 368 hàng · 0 lệch cột · 0 khoá trùng |

**Chỗ vấp thật, và nó KHÔNG phải chỗ tôi đoán trước.** Cả Scouter lẫn HNX Fetch cùng ghép cặp
bằng một tệp, nên **cả hai cùng cắm** vào máy chủ, và mọi lượt gọi trả `TARGET_AMBIGUOUS`.

> **Tên giao thức KHÔNG chặn được chuyện này.** Nó gác ở tầng **phong bì**; còn **cắm dây** xảy
> ra TRƯỚC đó. Một extension nói `duc-scouter.bridge` vẫn cắm được vào máy chủ nói
> `hnx-fetch.bridge` — nó chỉ hỏng khi có phong bì thật đi qua. Hai cửa gác hai chuyện khác
> nhau, và hôm qua tôi chỉ nghĩ tới một cửa.

Vá bằng cờ `--target` cho cả ba lệnh, kèm câu lỗi **tự kể tên ứng viên** và cách phân biệt —
một AI vận hành gặp mã lỗi này mà không được kể tên thì không có đường nào tự thoát. Phép ghim:
`du-lieu/tests/dich-danh-smoke.mjs`. Đó là **đi vòng**, không phải cách đúng: `H-06` mở cho
tệp ghép cặp riêng, và lúc đó cờ này thành không cần.

**Việc hằng ngày 08/09: HNX chưa công bố.** Cả hai đường cùng nói vậy — bảng kết quả báo *không
có phiên*, và danh mục PDF tháng 09 mới nhất cũng chỉ tới **07/09**. Theo mục 4.3 ⑶ thì hai
đường trùng nhau **loại được lỗi phía ta**, chưa loại được *công bố muộn* — hôm nay là thứ Ba,
nên gần như chắc là muộn. Chạy lại cuối ngày.

**Còn mở:** `H-06` (tệp ghép cặp riêng) · `H-07` (phím tắt phanh khẩn chưa ai bấm thử).

## 2026-09-08 · `claude-scouter-s06` — khai kiểm chứng thật, gói lên `active`

`H-01` đóng bằng một lượt chạy thật, nên `STATUS.md` phải nói đúng: `lifecycle: active`,
`last_verified: 2026-09-08`, và `evidence_ref` trỏ hồ sơ bằng chứng
`v0.1.0/evidence/2026-09-08-chay-that-lan-dau.md`.

**Một câu trên bảng đang NÓI SAI, đã sửa:** trường `dung_the_nao` bảo *"máy chủ của Scouter không
dùng được"*. Thực tế **tệp ghép cặp dùng chung ĐƯỢC** — chỉ **máy chủ** là phải đúng bản HNX, và
đừng chạy hai máy chủ trên cùng một cổng. Câu sai đó làm hướng dẫn nghe khó hơn thực tế, và Đức
đã phải hỏi lại đúng chỗ ấy.

> Đáng ghi vì đây là dạng lỗi bảng khó thấy nhất: nó **không sai về sự kiện**, nó sai về **mức độ
> chặt**. Một câu chặt quá làm người đọc tưởng mình thiếu thứ mình đang có.

**Việc kế:** chạy lại lượt lấy dữ liệu cuối ngày 08/09 — HNX chưa công bố lúc chiều, cả hai đường
cùng xác nhận. Hai việc chờ tay Đức: `H-06` (tệp ghép cặp riêng) · `H-07` (bấm thử `Ctrl+Shift+H`).

---

## 2026-09-08 · `claude-scouter-s06` — H-07 ĐÓNG, và một byte NUL lạc trong `fetch-core.mjs`

**`H-07` đóng bằng tay người, không bằng suy luận.** Đức bấm `Ctrl+Shift+H` lúc công tắc đang
BẬT và báo **thành công**: Chrome nhận tổ hợp, không extension nào giành mất, bảng bên đổi sang
`ĐANG TẮT`. Đây là cái phanh cuối cùng — thứ với tới được khi bảng bên đã đóng — và nó là loại
việc **không có cách nào đo từ Node**.

**Một lỗi tìm được ngoài kế hoạch:** `v0.1.0/scripts/fetch-core.mjs` mang **một byte NUL lạc**
ở offset 7281, nằm giữa một dòng chú thích (chỗ định viết sáu ký tự `\u0000` dạng chữ). Git coi
cả tệp là **nhị phân**, nên `git diff` của tệp đó chỉ in `Bin 23842 -> 23847 bytes` — **mọi thay
đổi về sau bị giấu vĩnh viễn**, kể cả một bản vá làm yếu khối phanh. Đã thay bằng sáu ký tự chữ.

Bài học đáng ghim hơn chính cái lỗi: **tệp hỏng kiểu này không làm suite đỏ.** Node đọc được,
mọi phép ghim vẫn xanh; thứ mất là khả năng ĐỌC DIFF của người kiểm. Cách phát hiện rẻ nhất là
`file <tệp>` trả về `data` thay vì `Unicode text` — nhưng không ai chạy lệnh đó theo thói quen.

**Việc kế:** chạy lại lượt lấy dữ liệu ngày 08/09 — Đức nói việc này **để sau, hoặc giao cho một
AI khác chạy tự động**. Còn đúng một việc chờ tay Đức: `H-06`, tệp ghép cặp riêng cho gói này.

---

## 2026-09-08 · `claude-scouter-s06` — kết sổ HNX: hai mục xong mà máy đếm không thấy

Đức hỏi thẳng: *"ta không còn nợ kỹ thuật hay rác nữa đúng không?"* Đo ra thì **còn**, và một
phần của cái "còn" đó là **sổ đếm sai chứ không phải việc chưa làm**.

`H-01` (chạy thật qua chính extension) và `H-04` (bộ đo đột biến) đều **đã xong từ 08/09**, có
bằng chứng đầy đủ. Nhưng dòng đóng của cả hai được viết **trong thân mục** — `**ĐÓNG 2026-09-08**`
— thay vì thành một dòng riêng ở cuối sổ. Bộ đếm chính thức (`scripts/backlog-check.mjs`) chỉ
nhận dạng `- **ĐÓNG <mã>**` ở ĐẦU dòng, cố ý: một lời tự khai trong thân là chữ của chính người
viết mục, còn dòng ở cuối là một lượt ghi riêng có ngày, có lane, có bằng chứng.

Hệ quả đã xảy ra thật: sổ báo **6 mục mở** trong khi thật ra là **4**. Sai theo hướng xấu nhất —
**cao hơn sự thật**, nên bảng của Đức trông nợ nần hơn thực tế và không ai biết vì sao.

Đã đóng lại cả hai cho đúng chỗ. **HNX Fetch nay còn đúng bốn mục:** `H-02` (sổ hoạt động không
hiện trang đang chạm) · `H-03` (ngày lễ gọi lại mỗi lượt — cố ý chưa vá, chờ Đức chốt) · `H-05`
(không có cờ chia theo loại sản phẩm) · `H-06` (chưa có tệp ghép cặp riêng — cần tay Đức).

**Một chuyện về phối hợp, ghi để phiên sau biết:** lượt này có **hai phiên cùng làm trong một
thư mục**. Phiên `claude-cua-kiem` chạy `git add -A` và **cuốn theo** phần sửa của tôi ở
`workers/duc-scouter` và `workers/hnx-fetch` vào commit `c7580447` mang nhãn của họ. Không mất
gì — nội dung nguyên vẹn — nhưng nhãn `Lane:` của hai lượt sửa đó nay chỉ sai người. Cách tránh:
`git add <đường dẫn của mình>`, đừng `-A`.

---

## 2026-09-08 · `claude-scouter-s06` — đóng nốt: S-13 · H-05 · thu hẹp H-06

Đức yêu cầu đóng nốt sổ nợ. Ba việc làm được, hai việc còn chờ Đức.

**`S-13` — chẩn đoán cũ SAI, và chỗ sai đáng giữ.** Sổ tưởng đây là lỗi định tuyến tên method.
Thật ra `capabilities` không lọt nổi tới bảng method: nó hỏng **hình dạng phong bì**
(`METHOD_SHAPE` bắt buộc có dấu chấm), nên `parseRequest` ném TRƯỚC khi biến `request` được gán,
và phản hồi ra đi với `request_id: null`. Máy chủ khớp bằng đúng trường đó, khớp hụt, rồi thay
cả phản hồi bằng `INTERNAL_ERROR`.

Hậu quả **rộng hơn** sổ mô tả: mọi lý do từ chối ở tầng phong bì đều bị nuốt. Với gói này còn
nặng hơn — `vong-lay.mjs` xếp `INTERNAL_ERROR` là **không thử lại được**, nên một lượt chạy dài
chết ở một phong bì gõ sai với câu không nói được sai ở đâu. Vá ở **cửa vào**, không nới
`METHOD_SHAPE` (gỡ chốt giao thức cho test xanh là luật vàng ③ cấm).

**`H-05` — có `--loai`.** Nhận cả tên lẫn mã trang, danh sách tự sinh từ bảng. Gõ sai thì DỪNG:
trang HNX trả 200 OK kèm một trang HTML khi tham số sai, nên chạy tiếp với mặc định là ghi dữ
liệu loại khác vào SSOT. `PROTOCOL.md` sửa theo — mục `FETCH_BODY_TOO_LARGE` nay là ba bước thử.

**`H-06` — gỡ được chỗ chặn.** Trước lượt này **không có đường nào TẠO một tệp ghép cặp**: hai
gói sống chỉ biết ĐỌC, bộ sinh thì nằm trong ba gói đóng băng. Nay có
`_shared/bridge-host/tao-tep-ghep-cap.mjs`, tự kiểm bằng chính `validatePairing()`.

**Chốt an toàn của chính tôi đã hỏng CÂM ở lượt thử đầu** — nó đặt một tệp CÓ TOKEN thẳng vào
gốc repo (chưa từng track, đã xoá). Gốc repo tính bằng cách tự gỡ `URL.pathname`, mà trên Windows
chuỗi đó giữ dấu cách ở dạng `%20`. Đã dùng `fileURLToPath` và ghim bằng phép chạy thật có đường
dẫn chứa dấu cách. **Một chốt hỏng câm tệ hơn không có chốt.**

**Còn chờ Đức, hai câu:** `H-03` ngày lễ gọi lại mỗi lượt — chịu, hay đánh dấu? · `H-06` chạy
lệnh sinh tệp ghép cặp một lần rồi chọn nó trong bảng bên.

---

## 2026-09-08 · `claude-scouter-s06` — H-03 xong, và một chốt phải thêm ngay sau đó

**Đức chốt: đánh dấu ngày nghỉ.** Đức cũng đoán đúng một nửa — **T7/CN đã bỏ qua sẵn** từ trước
(`ngayLamViec`). Thứ bị lấy lại mỗi lượt chỉ là **ngày lễ**: ngày trong tuần mà sàn không mở.

**Ghi vào tệp BÊN CẠNH SSOT** (`<tên>.ngay-nghi.csv`), không phải một hàng trong SSOT. SSOT có
25 cột số liệu, khoá (ngày + ISIN); một hàng giả *"ngày này nghỉ"* nằm trong đó nghĩa là mọi lượt
đếm, cộng, trung bình về sau phải nhớ lọc nó ra — và sẽ có lượt quên.

**Rồi tôi nhận ra bản vá đó vừa tạo ra một rủi ro thật, và vá tiếp trong cùng phiên.** HNX công
bố **trong** ngày, không phải lúc đóng cửa — đo thật 08/09, đầu giờ chiều cả hai đường đều báo
chưa có gì. Nên một lượt chạy sớm sẽ thấy hôm nay "trống", và nếu lượt đó đánh dấu luôn thì ngày
hôm nay bị ghi là nghỉ **vĩnh viễn**. Nay chỉ đánh dấu ngày **cũ hơn 2 ngày**; ngày còn mới thì
lệnh in `CÒN MỚI, chưa ghi nhận`.

**Bộ đo đột biến bắt được một phép ghim rỗng, và đó là phần đáng giữ nhất của lượt này.** Khối ⑺
chứng minh cái dấu **được đọc**, nhưng nó tự tay gọi `themNgayNghi` — nên nó **không** chứng minh
được *lệnh* biết ghi. Con `R2` (bỏ hẳn lượt ghi) sống sót. Phải dựng một **máy chủ Bridge giả**
trả lời `scout.fetch` bằng đúng hình dạng một ngày trống mới ghim được đường đó (khối ⑻).

Hai chỗ vấp khi dựng nó, cả hai đều im lặng: `execFileSync` **chặn vòng lặp sự kiện** nên máy chủ
giả trong cùng tiến trình không bao giờ trả lời được — phép ghim treo, không đỏ. Và tự gỡ
`URL.pathname` để lấy thư mục, đúng cái bẫy đã làm một chốt an toàn hỏng câm sáng nay.

**Cửa thoát là vế bắt buộc, không phải tuỳ chọn:** tệp là CSV mở bằng Excel, có ghi lúc quan sát,
**xoá một dòng là ngày đó được lấy lại**. Phép ghim canh cả cửa đó. Đột biến 26/26, 0 sống sót.

**Còn lại:** `H-02` (bảng bên) và `H-06` (Đức chạy lệnh sinh tệp ghép cặp).

---

## 2026-09-08 · `claude-scouter-s06` — H-02 đóng, H-06 còn một cú bấm

**`H-02` — Đức chốt bỏ.** Ghi lý do lại để phiên sau không mở ra: bảng bên **không đọc được tệp
SSOT** — extension này cố ý không có quyền chạm đĩa. Nên câu *"đọc từ chính tệp SSOT"* trong điều
kiện đóng là thứ không làm được từ bảng bên, và con số đó vốn đã hiện ở đầu ra của lệnh.

**`H-06` — Đức giao cho Codex CLI.** Chi tiết lượt kiểm chứng ở `workers/_shared/HANDOFF.md` cùng
ngày; tóm tắt: Codex tìm ra 5 chỗ, cả 5 đều thật, một trong số đó là lỗ **đã lọt** (tệp có token
vào được gốc repo qua đường dẫn mở rộng của Windows). Đã vá; 12 đường tấn công chặn 12.

**Tệp ghép cặp đã sinh sẵn:** `C:\Users\MAYTEST_12\HNX-Bridge\hnx-pairing.json`. Đặt ở ổ đĩa nội
bộ, **không** đặt trên Drive — token mà nằm trong thư mục đồng bộ là token đã lên mây. Máy chủ đã
bật thật với tệp đó và trả `HTTP 200 · EXTENSION_OFFLINE`.

**Còn đúng một việc và chỉ tay Đức làm được:** mở bảng bên HNX Fetch, chọn tệp đó thay tệp của
Scouter. Xong thì một lượt `--thu-xem` **không kèm** `--target` là `H-06` đóng.

---

## 2026-09-08 · `claude-scouter-s06` — nhận 17 con đột biến từ pilot cũ, và Bridge về nhà chung

**Nhận 17 con đột biến tầng dữ liệu** trước khi thư mục pilot cũ bị xoá. Chúng canh
`du-lieu/vong-lay.mjs` và `du-lieu/nguon-hnx.mjs`: luật thử lại, phép không-làm-hai-lần, hợp
đồng trang, và ca *"200 OK kèm cả một trang HTML"* — cái bẫy đắt nhất của trang HNX.

Bộ đo ở gói này trước lượt đó **chỉ với tới `tai-ket-qua.mjs`**, nên xoá thẳng thư mục cũ là mất
trắng lớp lưới đó. Mã `N*` đổi thành `W*` vì `N1..N22` đã có chủ ở mẻ bề mặt hẹp — bộ đo chặn mã
trùng, và nó chặn thật hai lần trong ngày. Đo: **43/43 mỏ neo · 43 giết được · 0 sống sót**.

**Bridge của gói nay ở đúng nhà chung:**
`C:\WORKING ZONE\Chrome Extension Bridge\hnx-fetch\` — cùng hình dạng bốn gói cũ. Trong đó:
tệp ghép cặp `hnx-fetch-bridge-pairing-v1.json`, bộ khởi động `START-BRIDGE_HNX-Fetch.cmd`
(+`.ps1`), vùng ghi `du-lieu-ra\` là thư mục **con** — `file.read` đọc được mọi tệp dưới vùng
ghi, nên trỏ vùng ghi vào chính thư mục gói là để token đọc được qua dây.

Đã chạy thử thật: máy chủ lên cổng 32154, giao thức `hnx-fetch.bridge`, vùng ghi đúng chỗ.

**Sổ tay và luật đường dẫn** ghi ở `workers/_shared/AGENTS.md` mục *NHÀ CHUNG CỦA BRIDGE*, và
cưỡng chế bằng cờ `--goi` của bộ sinh. Chi tiết vì sao ghim vào mã: `workers/_shared/HANDOFF.md`.

**Còn đúng một việc chờ tay Đức:** mở bảng bên HNX Fetch, chọn tệp ghép cặp mới ở đường dẫn trên
thay cho tệp của Scouter. Xong thì `--target` hết cần, và `H-06` đóng.

---

## 2026-09-08 · `claude-scouter-s06` — H-06 đóng, sổ nợ gói RỖNG

Đức chọn tệp ghép cặp riêng trong bảng bên. Đo thật, **không gửi `target`**: `system.ping` trả
`seed: hnx-fetch-v0.1` · `system.capabilities` trả đúng **4 lệnh** · `bridge.sessions` trả **đúng
MỘT** extension cắm vào. Hết `TARGET_AMBIGUOUS`. Cờ `--target` từ nay không cần.

**Điều kiện đóng mà chính tôi viết cho `H-06` là một phép thử SAI**, ghi ra thay vì lặng lẽ đóng.
Nó đòi *"một lượt `--thu-xem` chạy trọn không cần `--target`"*. Nhưng `--thu-xem` **thoát trước
mọi lượt gọi mạng** — nó chỉ đọc tệp SSOT rồi liệt kê ngày thiếu. Lượt đó sẽ ĐẠT kể cả khi
**không máy chủ nào chạy**, và kể cả khi định tuyến vẫn hỏng.

Bài học lặp lại lần thứ hai trong ngày (lần trước: phép ghim `GOC_REPO` lùi sai số cấp nên chỉ
canh `workers/`): **một phép thử phải chạm đúng thứ đang bị nghi ngờ.** Cả hai lần phép thử đều
xanh và đều đo nhầm chỗ — loại sai này không bao giờ tự đỏ.

**Đo được lúc chạy `--thu-xem`, để phiên sau khỏi giật mình:** SSOT có **368 hàng / 46 ngày**, và
thiếu **3 ngày**: `2026-09-01`, `2026-09-02`, `2026-09-08`. Hai ngày đầu gần như chắc là nghỉ lễ
Quốc khánh — lượt chạy thật đầu tiên sẽ tự ghi chúng vào `*.ngay-nghi.csv` và **thôi hỏi lại từ
lần sau** (cơ chế `H-03`, làm cùng ngày). Ngày 08/09 phải chạy mới biết đã công bố chưa.

**Sổ nợ gói RỖNG.** Việc còn lại chỉ là chạy mỗi ngày một lượt, và lượt đó cần Đức bật công tắc.

## 2026-09-09 · `claude-adr-gop` — chỉ vá liên kết ADR, không đụng hành vi

Sổ ADR ở gốc repo gộp từ 27 file xuống 9 file theo chủ đề (`N-54`). Hai file của gói này trỏ tới
tên file ADR cũ nên phải đổi theo:

- `du-lieu/nguon-hnx.mjs` — một liên kết
- `du-lieu/vong-lay.mjs` — một liên kết

**Không đụng logic, không đụng test.** Suite gói: 12/12 xanh. Cách tra một số hiệu ADR nay nằm ở
file nào: bảng trong `docs/README.md` ở gốc repo — và **trích theo SỐ HIỆU, đừng trích theo tên
file**, vì tên file đổi được ở lượt rà hằng tuần.

## 2026-09-09 · `claude-luat-rasoat` — rà luật của gói: SẠCH, và một chỗ lặp CỐ Ý được ghi lý do

Rà cả `AGENTS.md` (120 dòng) và `PROTOCOL.md` (520 dòng) theo bộ biên dịch luật mới
([ADR-0027](../../docs/adr/0027-bo-bien-dich-luat.md)). **Không tìm thấy luật chết nào** — đây là
gói sạch nhất trong sáu đơn vị: `PROTOCOL.md` mục 4 thậm chí tự sửa lại một chỉ dẫn cũ *"không
làm theo được"* của chính nó, đúng kiểu tài liệu tự giữ mình khỏi mục.

**Một việc đã làm:** bộ đo nêu `AGENTS.md` *"Ba việc phải hỏi Đức"* trùng vân tay với
`PROTOCOL.md` mục 7. Đây là lặp **CỐ Ý** — Đức chốt 08/09 rằng `PROTOCOL.md` **tự đứng một
mình**, viết cho một AI không đọc `AGENTS.md`; một sổ tự đứng mà thiếu danh sách an toàn của
chính nó là một sổ nguy hiểm. Đã ghi lý do **ngay tại chỗ** trong `AGENTS.md`, kèm nhắc **sửa
một bên thì sửa cả hai trong CÙNG lượt** — theo `docs/protocols/RULE-COMPILER.md` mục 4.

**Không đụng mã, không đụng phép ghim, không đụng dữ liệu.** Sổ nợ gói không đổi.

## 2026-09-12 · `codex-bridge-pairing-links`

Đặt khối **Sao chép đường dẫn JSON** ngay dưới Kết nối Bridge. Khối hiện đúng tệp ghép cặp trong `C:\WORKING ZONE\Chrome Extension Bridge\hnx-fetch\` và nút một chạm chép đường dẫn, không chép token. Thêm `bridge-pairing-path-static.mjs`; suite gói xanh.

## 2026-09-12 · `codex-hnx-week-20260912` — dữ liệu tuần đã bù

Lấy kết quả giao dịch 08–11/09: **4 ngày · 32 hàng**. SSOT nay có **400 hàng · 50 ngày** (đến 11/09), không dòng lệch cột, không khoá trùng, và mọi ngày có đúng 8 hàng. Ba ngày 31/08–02/09 vẫn thiếu ở cả SSOT lẫn danh mục PDF HNX, phù hợp ngày nghỉ Quốc khánh.

Tải **28 PDF tháng 09** còn thiếu (bao gồm 16 tệp của 08–11/09 và tồn đọng 03–07/09); tất cả qua kiểm byte/chữ ký PDF/EOF của lệnh, không ghi đè. Lượt đối chiếu cuối trả `28 trên đĩa · CÒN THIẾU: 0`.

## 2026-09-12 · `claude-scouter-udine` — đồng bộ `transport.mjs` sau khi Scouter thêm danh tính ghế

**Vì sao gói này bị đụng.** `scripts/transport.mjs` là bản chép NGUYÊN VĂN của Scouter, và
phép ghim ⑷ của gói này so từng byte. Ngày 12/09 Scouter thêm **danh tính ghế** (mỗi phiên
extension khai `instance_id` + tên gọi trong khung `auth`, để máy chủ định tuyến đúng ghế khi
nhiều cửa sổ Chrome cùng cắm một Bridge). Bản chép ở đây chưa theo, nên phép ghim ĐỎ ngay lượt
`npm test` toàn repo đầu tiên sau đó. Nó làm đúng việc của nó.

**Đã đồng bộ.** Gói này nay cũng có danh tính ghế — không phải tính năng thừa: hai cửa sổ HNX
Fetch cùng cắm một Bridge sẽ gặp đúng chỗ hỏng mà Scouter vừa chữa (`TARGET_AMBIGUOUS`, không
ai gọi được đúng ghế). Gói này chưa có ô nhập tên ở giao diện, nên `label` luôn rỗng và ghế
được gọi bằng số.

**Một chỗ phải sửa ở SEED trước khi chép được.** Bản đầu gõ cứng `WORKER_ID = "duc-scouter"`
vào chính `transport.mjs`. Chép nguyên văn sang đây thì HNX Fetch **tự khai sai tên mình trên
dây**, và `bridge.sessions` là đúng chỗ người ta nhìn để phân biệt các ghế. Nay tên gói là
THAM SỐ do lớp nối dây khai — `background.js` của gói này khai `worker_id: "hnx-fetch"`. Tên
hình dạng sai thì KHÔNG khai, chứ không khai bừa: một `worker` rác còn tệ hơn một ô trống.

Ghim `G9` bên Scouter canh đúng chỗ đó: transport không được chứa tên gói nào.

**Không đụng gì khác trong gói này.** Đã trả khoá ngay sau lượt sửa.
