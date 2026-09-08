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
