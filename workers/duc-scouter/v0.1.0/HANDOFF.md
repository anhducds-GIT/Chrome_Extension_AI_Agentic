# HANDOFF — Duc Scouter

> Trạng thái mới nhất ở CUỐI file. Log chỉ thêm dòng.

## Trạng thái hiện tại (2026-09-06)

- Gói khai sinh theo [ADR-0013](../../../docs/adr/0007-scouter.md):
  Scouter dọn từ gốc repo + `scripts/` + `tests/` về đây, có khoá riêng `workers/duc-scouter`.
- Bản nền `SEED v0.1` làm được ba khả năng của [ADR-0009](../../../docs/adr/0007-scouter.md)
  mục ⑸: quan sát · báo cáo qua Bridge · tự nạp lại mình.
- Việc tiếp theo (1): `S-01` — cho Scouter bấm và gõ được như tay người.
- Rủi ro đang mở: bản nền này **chưa từng chạy trên một trang thật**. Mọi số đo tới giờ là trên
  trang thử tự tạo và máy chủ Bridge chạy tại chỗ.

## Log

<!-- HANDOFF-THANG: 2026-09 -->

<!-- HANDOFF-CUT-POINTER: ADR-0008 -->
> **6 mục cũ hơn đã dời sang [`HANDOFF-ARCHIVE-01.md`](HANDOFF-ARCHIVE-01.md)** — cùng thư mục này,
> nguyên văn, không mất chữ nào. File này giữ **20 mục cuối** (ADR-0008). Cần đào lịch sử
> xa hơn thì mở file đó và đi tiếp theo con trỏ trong nó; ghi Log mới thì vẫn ghi vào cuối
> file này.
<!-- /HANDOFF-CUT-POINTER -->

## 2026-09-07 · `claude-scouter-s06` — bảng bên dựng lại, và một cuốn sổ để nó không nói dối

**Việc.** GPT web trả về bản vẽ v1 ba tab. Bố cục đúng hướng, nhưng đối chiếu với code thì có
**năm chỗ sai thật**, và ba trong số đó là màn hình **tự mâu thuẫn với chính nó**:
⑴ đếm 14 lệnh (thật là 15 — nhóm Quan sát ghi 6, thật là 7);
⑵ thanh tiến độ ghi `6 / 8` trên một danh sách có **4** dấu tích;
⑶ dòng *“Phanh: TẮT — Không cho phép ghi”* tự phủ định trong một dòng;
⑷ thẻ công tắc tô **đỏ ở trạng thái AN TOÀN**, nên lúc thật sự nguy hiểm không còn màu để leo;
⑸ khối “Trang hiện tại” chỉ tab **Đức đang xem**, mà AI chọn tab bằng `target_id` — hai cái
lệch nhau được, và chúng lệch đúng vào lúc lệch là đắt nhất.

**Gốc của ⑴ và ⑵ là một: con số được GÕ, không được ĐỌC.** Nên việc chính của phiên không phải
vẽ lại — mà là dựng cái nguồn để đọc. `scripts/scouter-journal-core.mjs` bọc `dispatch`, đứng
NGOÀI đường đi của phong bì. Ba bất biến: chỉ ghi lệnh **đã xong và đã thành công** · tên miền
chốt **lúc ghi** (đóng tab không mất tiến độ) · **sổ hỏng thì im**, không giết lượt gọi của AI.
Số lệnh trên bảng nay đếm từ `capabilities()` — cùng hàm mà AI hỏi, nên hai bên không khai
khác nhau được.

**Hai lần phép ghim tự bắt được chính nó, ghi ra vì cả hai tổng quát hơn lượt này.**
⑴ Con `J5` **sống sót**: tôi đo trần nhật ký qua `doc()`, mà `doc()` cũng cắt — nên bài kiểm
không phân biệt được *chặn lúc ghi* với *chặn lúc đọc*. Sửa phép ghim, không sửa đột biến.
⑵ `sidepanel-dom-smoke` báo oan hai lần vì đọc cả **chú thích**. Chiều báo oan chỉ phiền;
chiều ngược lại mới nguy — một `id` chỉ có trong chú thích sẽ được tính là CÓ trong DOM, tức
phép ghim gật đầu cho đúng cái lỗi nó sinh ra để bắt.

**Đo.** Ghim gói **12/12** · đột biến **91/91, sống sót 0** (thêm `J1..J10`). Bảng bên tự đếm
ra 15 lệnh · Quan sát 7. **Đức phải nạp lại extension** — cả ba file giao diện đã đổi.
Còn mở: `S-10` chưa chạy thật lần nào (script phía gọi, ba mảnh nhóm B).

**Sửa ROADMAP, 5 chỗ.** Nó khai `11 method` (thật là 15) và xếp cả nhóm A vào việc-chưa-làm,
trong khi **ba trong bốn mục nhóm A đã xong ngay hôm nay** (`scout.a11y` · `scout.shot` ·
`scout.snapshot`). Còn đúng một: `webNavigation` — biết trang tải xong lúc nào. Bản đồ sai ở
đúng chỗ Đức đọc để kiểm khuyến nghị của tôi thì khuyến nghị đó không kiểm được.

## 2026-09-07 · `claude-scouter-s06` — Đức mở thang phiên bản, và tôi siết quá tay một lần

**Đức chốt roadmap ba nấc** ([ADR-0020](../../../docs/adr/0007-scouter.md)):
v1 đóng gói được, pilot `hnx.vn` kéo · v2 chạy một job lớn hơn rồi đẩy cái học được lên seed ·
v3+ mỗi trang mới một lượt. Đây là *"ADR mới"* mà ADR-0010 đòi trước khi đi tiếp.

**Một chỗ va tên phải nói ra:** `SEED v1` của ADR-0010 là **23 mục năng lực** và VẪN ĐÓNG;
**Scouter v1** của Đức là **bản đóng gói phát hành được**. Hai thứ cách nhau hàng tuần công, và
đọc nhầm là mở một phạm vi Đức chưa duyệt.

**Tôi siết quá tay, Đức chặn giữa chừng, ghi lại vì nó sẽ lặp.** Tôi hiểu *"tránh nhiễm pilot vào
seed"* thành một hàng rào soi cả `tests/`, và nó **đỏ ngay 9 chỗ — cả 9 đều vô hại**. Đức nói rõ:
*"nhiễm cũng được, chỉ là 1 list các trial mà ta đã thử thôi, ko quá khắt khe đâu, trừ khi nó ảnh
hưởng quá."* Bài học tổng quát: **một phép kiểm hay báo oan sẽ bị người ta tắt đi, và lúc đó mất
luôn cả phần nó canh đúng.** Hàng rào nay chỉ canh **mã CHẠY** — hằng số, giá trị mặc định,
nhánh rẽ theo hostname. Đo được: mã chạy của seed **đã sạch sẵn**, 21 file, 0 vết.

**Và thứ Đức thật sự cần thì tôi đã dựng nhầm thành hàng rào:** một cuốn SỔ. Nay là
`docs/TRIALS.md` — ba dòng thật (hai lượt trang tự dựng, một lượt đo endpoint `hnx.vn`), cột
cuối là *dạy seed được gì*. Playbook thì **chưa mở**: chưa thuần hoá xong trang nào thì viết
playbook là văn tưởng tượng.

**Đo.** Ghim gói **13/13**. Việc kế vẫn là `S-10`.

## 2026-09-07 · `claude-scouter-s06` — việc của tôi bị commit vào tên lane khác

**Sự cố đa phiên thật, không phải chuyện vặt.** Sáu file của lượt này —
ADR-0020, `TRIALS.md`, `seed-purity-smoke.mjs`, AGENTS/HANDOFF/ROADMAP của gói — **nằm trong
commit `27a88ce7` của lane `claude-dong-bang-2`**, không phải commit của tôi. Tôi `git add` xong,
lane kia commit bằng `-a`/`add -A` và cuốn cả phần đã dàn của tôi vào commit của họ.

**KHÔNG sửa lịch sử** — đó là một trong ba việc phải hỏi Đức. Nội dung an toàn và đúng; cái sai
là dòng `Lane:`, tức là **truy vết nguồn gốc**. Luật hiện có chặn *push* cuốn theo người khác
(`safe-push --carry`), nhưng **không chặn *commit* cuốn theo người khác** — đây là lỗ đó, và nó
vừa nổ. Đã ghi vào `BACKLOG.md` gốc.

**Lượt đẩy này dùng `--carry`, lane bị cuốn theo: `claude-dong-bang-2`** (ADR-0005 duyệt thường
trực, đổi lại phải kể tên).

## 2026-09-07 · `claude-scouter-s06` — `S-10`: bộ máy xong, và ba con số cũ hoá ra sai

**Hai tầng tách hẳn.** `pilots/hnx-phai-sinh/vong-lay.mjs` KHÔNG biết `hnx.vn` là gì — nó lặp,
bỏ qua thứ đã có, thử lại đúng loại lỗi. Mọi hiểu biết về trang ở `nguon-hnx.mjs`. Nên vòng lặp
là **ứng viên đẩy lên seed**, nhưng chỉ SAU khi chạy thật một lần: đẩy code chưa chứng minh lên
seed là nhân bản một giả định.

**Một quyết định đỡ cả ba tính chất: FILE ĐÃ GHI CHÍNH LÀ TRẠNG THÁI.** Không sổ tiến độ riêng.
Sổ riêng thì lệch được với đĩa, và chiều lệch "bỏ sót một ngày" thì im lặng — không ai thấy một
cái lỗ giữa tuần.

**Chỗ đắt nhất là PHÂN LOẠI LỖI**, vì `scout.fetch` tiêu ngân sách ghi: "cứ thử lại cho chắc"
không miễn phí. 200-OK-trang-khác thì **dừng cả lượt** — yêu cầu sai thì sai với MỌI ngày.

**Năm trong bảy tham số đã MẤT khỏi mọi bản ghi.** Đo lại bằng cách đọc chính mã trang, không
đoán. Ba con số đổi kết luận: ⑴ một ngày **~46 KB** chứ không phải 231 KB — 231 nghe như sắp
chạm trần 512 KiB của `scout.fetch`, 46 thì rộng gấp mười. ⑵ **ngày nghỉ vẫn trả 200 OK + JSON
hợp lệ**, chỉ khác 0 ô dữ liệu (đo 192 với 0) — nên "200 OK" không bao giờ đủ để kết luận đã có
dữ liệu. ⑶ máy chủ gửi **thiếu mắt xích chứng chỉ**: Chrome tự lấy qua AIA, Node từ chối. Cả ba
vào `docs/TRIALS.md`, cột *dạy seed được gì*.

**Bài học tổng quát:** một số đo không ghi vào file là số đo phải trả tiền hai lần. Bảy tham số
nay nằm trong `nguon-hnx.mjs`, không nằm trong trí nhớ ai.

**Đo.** Ghim 17 khối · đột biến **17/17, sống sót 0** · **0 lượt gọi mạng** trong toàn bộ suite.
Còn lại của `S-10`: **lượt chạy thật** — cần Bridge chạy, extension nạp lại, công tắc BẬT.

## 2026-09-07 · `claude-scouter-s06` — ghi tên lượt `--carry` thứ hai

Lượt đẩy `S-10` dùng `--carry`, **lane bị cuốn theo: `claude-noi-qua`** (commit `8ed66f8`,
vùng `_code`). ADR-0005 duyệt thường trực cho `--carry`, đổi lại phải kể tên trong nhật ký —
đó là thứ DUY NHẤT còn lại để truy, vì lớp chắn cuối đã bỏ.

Đây là lượt carry **thứ hai** trong cùng một phiên (trước đó: `claude-dong-bang-2`). Hai lượt
trong một buổi là số liệu đáng để ý: mô hình một nhánh chung khiến người đẩy sau luôn phải
gánh người commit trước. Không đề xuất gì ở đây — chỉ ghi để lần sau đếm được.

## 2026-09-07 · `claude-scouter-s06` — Scouter có host riêng, dựng trên lõi dùng chung

**Đức bác thiết kế của tôi, và bác đúng.** Tôi cho Scouter *mượn* host của `duc-auto-chatgpt`
(ADR-0004) để né fork. Hai chỗ hỏng: Scouter phụ thuộc **lúc chạy** vào một gói ĐÃ ĐÓNG BĂNG,
và tên giao thức là `"duc-auto-chatgpt.bridge"` — một seed sắp nhân bản mà mang tên sản phẩm khác.

**Nhưng "chép một bản như ba gói kia" cũng sai, và có số.** Đo trong repo:
`websocket-core.mjs` 3 bản **giống hệt**; `bridge-host.mjs` 3 bản **khác nhau cả ba**
(461/451/450, ba mã băm). Và 11 dòng khác biệt **chính là cái bắt tay hai chiều** — một bản vá
an toàn làm ở một bản chép, không bao giờ tới hai bản kia. Ghi thành `S-11`, KHÔNG tự sửa.

**Đường thứ ba là luật sẵn có mà chưa ai dùng** (`AGENTS.md` mục 3 luật 2): lõi vào
`workers/_shared/`, mỗi extension một host MỎNG. Giao thức nay là `duc-scouter.bridge`, và
phong bì mang tên cũ **bị từ chối** — đổi tên mà vẫn nhận tên cũ thì chỉ là trang trí.

**Phép ghim đáng nói nhất:** tách lõi thì câu hỏi không phải *"code mới có chạy không"* mà
*"tách ra có làm rơi hành vi nào không"*. Nên `tuong-duong-voi-ban-goc.mjs` hỏi **cả bản gốc lẫn
bản mới cùng một câu, 29 ca**, rồi so đáp án — kể cả ký tự điều khiển trong nhãn, emoji bị cắt
đôi ở đúng ranh giới 64, nửa cặp thay thế lạc. Khớp hết. Bản gốc đóng băng nên nó là mốc tốt.

**Bộ đo tự tìm ra một lỗ.** Ba mỏ neo báo hỏng vì chốt chuyển file; lượt đi sửa mỏ neo lộ ra
rằng **cái bắt tay hai chiều — lý do chính khiến lõi được tách — không có phép ghim hành vi
nào**. Nay có `bat-tay-hai-chieu.mjs` (nối THẬT qua socket, 5 khối) và hai con `X3` `X4`.

**Đo.** Ghim 17 file · đột biến **93/93, sống sót 0**. Bridge đã chạy thật trên máy Đức:
ghi/đọc file OK, và thử `file.read` lên tệp ghép cặp thì **bị chặn** (`PATH_OUTSIDE_ROOT`).

## 2026-09-08 · `claude-scouter-s06` — S-10 CHẠY THẬT, đạt; hai tuần dữ liệu HNX

**Đức chốt chạy live lúc 00:40 (08/09)** và tự tay nối Bridge. Phạm vi Đức đổi: 5 ngày →
**hai tuần** = 10 ngày làm việc (2026-08-25 → 2026-09-07).

| Lượt | lấy mới | đã có | không có dữ liệu | hỏng |
|---|---|---|---|---|
| 1 | 7 | 0 | 3 | 0 |
| 2 | **0** | **7** | 3 | 0 |

Lượt 2 là phép thử thật: `0 lấy mới · 7 đã có` chứng minh **file đã ghi CHÍNH LÀ trạng
thái** — không có sổ ghi riêng, và chạy lại không lấy lại.

**Dữ liệu thật, không phải trang lỗi.** Soi `2026-08-25-HDTLCSCP.json`: 192 ô dữ liệu, ISIN
`VN41I2G90000`, chỉ số cơ sở `VN100`, hợp đồng tương lai đáo hạn `2609`, đủ giá và khối lượng.

**Ba ngày trống (31/08 · 01/09 · 02/09) là trống THẬT** — đo thẳng bằng một lượt gọi riêng:
HTTP 200, JSON hợp lệ, **8791 byte, 0 ô dữ liệu**, đúng hình dạng đã đo trước cho ngày không có
phiên. Ngày có giao dịch đo cùng lúc: 46194 byte, 192 ô. Không phải đọc hụt.

**Chốt an toàn giữ được trên máy thật.** Thử lấy trộm chính tệp ghép cặp bằng HAI đường (tương
đối + tuyệt đối) → cả hai `PATH_OUTSIDE_ROOT`. `file.delete` cố ý không tồn tại.
`system.capabilities` khai 15 method: 10 chỉ đọc, 5 có ghi.

**Trong cả lượt chạy không sửa một dòng mã nào** — chỉ chạy và đọc.

Chạy lại: `node chay.mjs --pairing <tệp> --tu 2026-08-25 --den 2026-09-07` trong
`pilots/hnx-phai-sinh/`.

## 2026-09-08 · `claude-scouter-s06` — kho PDF phái sinh HNX ĐẦY ĐỦ 216/216

**Đức nêu mục đích thật:** thư mục Google Drive *Phái Sinh daily Fetch* là database ông ấy
duy trì BẰNG TAY từ 07/2026 để phân tích phái sinh. Nên bộ tải bám convention đã có, không
đặt tên kiểu mới.

**Kết quả cuối, đo trên chính thư mục đó:**

| | Trước | Sau |
|---|---|---|
| Tổng PDF | 176 | **216** |
| Ngày có dữ liệu | 37 | **46** (01/07 → 07/09) |
| Ngày thiếu báo cáo | 0 | **0** |
| Báo cáo tháng | 202601–07 | **202601–08** |

Kiểm từng tệp: **216/216 là PDF đầy đủ** (đầu `%PDF-`, đuôi `%%EOF`), **0 tệp `.dang-tai` sót**.
Chạy lần ba báo *"Tổng HNX có 124 · đã có 124 · CÒN THIẾU 0"*.

**Hai lượt, vì cái phanh chặn giữa chừng — và nó chặn ĐÚNG.** Lượt 1 lấy 11 tệp rồi dừng ở
`WRITE_CAP_REACHED` (50/50 một lần mở khoá). Đáng ghi: nó dừng **sạch** — không tệp dở,
không tệp mang tên thật mà thiếu nửa sau. Nếu nó chặn kiểu khác thì 29 tệp kia sẽ mang tên
thật mà rỗng ruột, và **mọi lượt sau bỏ qua chúng vĩnh viễn** vì tệp trên đĩa chính là trạng
thái. Đức tắt–bật công tắc (đặt lại bộ đếm về 0), lượt 2 lấy nốt 29/29, 0 hỏng.

**Ranh giới seed/pilot GIỮ ĐƯỢC, và có máy canh.** Đức hỏi thẳng có nên tách chưa. Đo:
seed 9.966 dòng · pilot 1.334 dòng; mọi thứ riêng HNX nằm trong `pilots/`, mọi thứ chung
(`as: base64` · trần `dom.snapshot` · chốt kích thước phản hồi) nằm trong seed và **không
dòng nào nhắc tên trang**. Thử phá: thêm một hằng số `"https://hnx.vn/"` vào lõi seed →
`seed-purity-smoke` **ĐỎ ngay**. Hàng rào thật, không phải lời hứa.

**Rủi ro còn lại, và phép kiểm trên KHÔNG bắt được nó:** seed mới chỉ thử trên **một trang**
(`TRIALS.md` liệt kê đúng `hnx.vn`). Một hàm sạch tên trang vẫn có thể chỉ đúng cho một
hình dạng trang. Nên *"năng lực chung"* hiện là **lời khai**, chưa phải điều đã đo.

## 2026-09-08 · `claude-scouter-s06` — bỏ `scout.snapshot`, thêm `scout.navigate`

Đức chốt hai việc trong một lượt nạp lại.

**Bỏ `scout.snapshot`.** Nạp lại bản có trần rồi nó VẪN giết service worker trên 2/3 trang thử:
trang rất lớn thì worker chết ngay lúc Chrome trả dữ liệu, tức trước khi dòng nào của ta kịp
chạy. Gỡ sạch cả chuỗi, kể cả cửa CDP `DOMSnapshot.captureSnapshot` nay không ai gọi.

**Thêm `scout.navigate`.** Mở `Page.navigate` ở đường GHI. **Không cần thêm quyền Chrome nào** —
đây là đổi luật an toàn của chính ta. Đường ĐỌC vẫn không có nó. Lý do đầy đủ: chú thích tại
chỗ trong `scouter-actions-core.mjs`.

### Thử THẬT trên hnx.vn

| Phép thử | Kết quả |
|---|---|
| `javascript:` · `file:` · chuỗi không phải url | cả ba bị chặn, **0 lệnh CDP** được gửi |
| thống-kê → kết-quả-giao-dịch | tới nơi **289 ms** |
| `scout.page` ngay sau | *"Kết quả giao dịch"* — đúng trang |
| **hnx.vn → example.com (KHÁC site)** | **261 ms**, id cũ **vẫn đọc được** |

### Một câu hỏi kiến trúc được trả lời miễn phí

Tôi định đo riêng: *`target_id` có sống sót qua lần đổi trang không?* — vỡ thì thiết kế **trọn
gói** sụp và phải dựng máy trạng thái. Lượt thử thật trả lời luôn: **sống sót**, kể cả khác
eTLD+1. Nên *đi* và *làm tiếp* ở lại là hai lượt gọi riêng.

> **Một phép đo của tôi đã sai, tự bắt được.** Lượt đầu thử `hnx.vn → owa.hnx.vn` rồi định kết
> luận "khác tên miền vẫn giữ id". Sai: hai cái đó **cùng một site** theo cách Chrome chia tiến
> trình, nên nó chưa hề chạm điều nó định chứng minh. Phải đi `example.com` mới là phép thử thật.

**Đo.** Method 15 → 14 → **15**. Suite **18/18**. S-14 đã đóng.

## 2026-09-08 · `claude-scouter-s06` — MỘT tệp CSV SSOT, 368 hàng, 46 ngày

Đức chốt: giữ **một tệp duy nhất**, định dạng để **GPT và CC cùng thao tác được**.

**Chọn CSV, không phải .xlsx.** Điều kiện là hai công cụ cùng thao tác được, không phải đuôi
tệp. XLSX là ZIP chứa XML, repo không có dependency nào — mỗi lượt ghi phải tự cuộn ZIP bằng
tay, và mỗi lượt là một cơ hội làm hỏng dữ liệu thật. Lý do đầy đủ ở đầu `master.mjs`.

| | |
|---|---|
| Tệp | `Phái Sinh daily Fetch/HNX_PS_Ket_qua_giao_dich_SSOT.csv` |
| Hàng | **368** · 46 ngày · 01/07 → 07/09 · VN100=184 VN30=184 |
| Kiểm | 0 dòng lệch cột · 0 ngày lặp · 8 hàng/ngày đều nhau |

Ba ngày 31/08 · 01/09 · 02/09 báo *không có phiên* — **khớp với kết quả bên PDF cùng ngày**.
Hai đường đo độc lập cùng nói HNX không công bố gì.

**Lược đồ 25 cột ĐỌC RA từ tệp Đức đang dùng, và đã đối chiếu THẬT:** lấy lại 12/08 từ HNX rồi
so từng ô với hàng `VN41I1G80003` của Đức — **25/25 khớp**. Nên lấy lại từ nguồn là an toàn,
và SSOT có một nguồn gốc đồng nhất.

> **Chỗ nguy hiểm nhất: số kiểu Việt.** `1.952,8` — chấm là phân cách nghìn, phẩy là thập
> phân, **ngược hẳn** kiểu Anh. Đọc nhầm là sai **gấp 1000 lần** mà con số vẫn trông hợp lý.
> Ô rỗng ở lại rỗng, **không thành 0**.

**Một lỗi suýt giao hàng:** cột đầu bảng HNX không có chữ, nó chứa `<img src="up.png">` —
dấu tăng/giảm. Bản đầu gỡ thẻ nên **cả một cột biến mất trong im lặng**, và tôi còn đặt tên nó
là *"STT"*. Đo lại 7 ngày: 33 + 23 = 56 = 7 × 8 hàng. Mỗi hàng đều có.

**Xoá.** Đức giao dọn tệp CSV gây confuse. Chỉ xoá **một** tệp: `AUG2026_MASTER.csv.xlsx`, sau
khi kiểm 12/08 và 17/08 đều đủ 8 hàng trong SSOT. **Không** xoá các tệp `.gsheet`/`.gdoc`:
chúng chỉ 173 byte, là **con trỏ tới tài liệu Google Drive** chứ không phải tệp CSV.

**Đo.** Suite **20/20**.

## 2026-09-08 · `claude-scouter-s06` — roadmap sau một ngày chạy thật

Đức sắp compact, nên roadmap phải nằm trong **tệp** chứ không trong hội thoại.
`ROADMAP.md` nay có phần **08/09** thay phần *"Đang ở đâu"* cũ ở chỗ hai bên nói khác nhau —
phần cũ viết lúc mọi thứ còn chạy trên trang giả.

**Thứ tự đi tiếp, xếp theo giá trị chia công sức:**

1. **Trang thử THỨ HAI cho seed.** Seed mới thử trên đúng một trang. Phép kiểm thuần khiết
   canh được *seed không nhắc tên trang*, nhưng **không** canh được *seed có dùng chung được
   không* — một hàm sạch tên trang vẫn có thể chỉ đúng cho một **hình dạng** trang. Nên
   *"năng lực chung"* hiện là **lời khai chưa được đo**. Chọn trang **render bằng JS**, khác
   kiểu hnx.vn (tĩnh, jQuery).
2. **Đóng gói v1** — chỉ sau ①. Đóng gói một seed mới thử một trang là đóng gói một lời hứa.
3. **Ba mục nợ nhỏ** gộp một lượt: `S-11` · `S-12` · `S-13`.
4. **KHÔNG làm:** tự chạy hằng ngày (luật gốc cấm automation tự chạy khi chưa hỏi) · mở thêm
   quyền CDP (`Page.navigate` vừa mở hôm nay; mở tiếp mà chưa có việc thật đòi là nới bề
   mặt tấn công cho một nhu cầu tưởng tượng).

**Ba câu chỉ Đức trả lời được** đã ghi vào `ROADMAP.md` — sau compact đó là chỗ duy nhất còn
nhớ chúng: trang thử thứ hai là trang nào · `S-11` chấp nhận rủi ro hay mở băng · `S-12`
chịu gọi lại hay đánh dấu ngày lễ.

Kèm: sửa dòng *"công tắc popup"* thành *"công tắc bảng bên"* (`S-14` đóng hôm nay).

## 2026-09-08 · `claude-scouter-s06` — trần ghi 50 → 200, và ba mỏ neo đột biến đã chết

Đức chốt nâng trần một lần mở khoá lên **200**. Ghi ở [ADR-0005](docs/adr/0005-tran-ghi-nang-tu-50-len-200.md).

**Vì sao đây không phải nới lỏng.** Trần 50 hôm qua dừng một việc **đúng** — lượt tải 216 PDF —
rồi Đức bật lại và việc đó chạy tiếp y nguyên. Không lượt ghi nào bị loại, chúng chỉ bị hoãn.
Một cổng luôn được mở lại là cổng **dạy người bấm cho qua**. Bốn lớp còn lại không đụng tới:
mặc định TẮT · gõ cứng trong mã · đếm theo mỗi lần mở khoá · chỉ tay Đức mở lại được.

**Ba mỏ neo đột biến đã CHẾT từ hôm qua, phát hiện trong lượt này** — đây mới là phần đáng đọc:

| Mã | Chốt nó canh | Vì sao lệch |
|---|---|---|
| `D9` | máy chủ đối chiếu được phản hồi với yêu cầu | lượt vá vận chuyển đổi `envelope: response` thành `envelope: guiDuoc(response)` |
| `H2` | không ai lén nới danh sách CDP đường ghi | danh sách dài thêm `Page.navigate` + `Target.getTargetInfo` |
| `F6` | thân quá trần thì BÁO ĐỎ, không cắt bớt | biến đổi tên `bytes` → `trenDay` |

Cả ba là **hệ quả phụ của chính việc hôm qua**: sửa mã nguồn xong, mỏ neo trỏ vào chuỗi cũ nên
nó khớp 0 lần. Bộ đo báo **ĐỎ** chứ không báo BỎ QUA — nếu nó báo BỎ QUA thì ba chốt an toàn đã
nằm không ai canh mà bảng vẫn xanh. Giữ nguyên tính chất đó khi sửa bộ đo.

**Đo.** `93/93` mỏ neo khớp · `93` giết được · `0` sống sót. `P5 P6 P7` (gỡ trần · nới thành
vô hạn · để kho lưu tự đặt trần) đều chết ở trần 200 y như ở trần 50. Suite gói: **19 khối ĐẠT**.

**Ngoài tầm tay tôi, ghi lại để lane `_code` biết:** `tests/build-dashboard-smoke.mjs` mục 23
(Gate 7) đang ĐỎ trên cây làm việc. `session-check.mjs` nay `import` `backlog-check.mjs`, nhưng
danh sách tệp chép sang repo tạm của phép ghim đó chưa có tên nó → repo tạm chết lúc nạp module.
Không phải việc của lượt này và `_code` không phải vùng tôi giữ; cả hai tệp đang có sửa chưa commit.

## 2026-09-08 · `claude-scouter-s06` — HNX rời nhà; Scouter ở lại làm bộ dò trang

Đức chốt tách HNX thành extension riêng ([ADR-0021](../../../docs/adr/0021-goi-extension.md)):
*"sau này ta sẽ dùng scouter đi scout trang khác."* Gói này đổi ba chỗ.

**⑴ Pilot `hnx-phai-sinh` đã chuyển sang `workers/hnx-fetch/du-lieu/`.** Thư mục cũ **giữ
nguyên, chưa xoá** — xoá tệp là việc phải hỏi Đức — nhưng đã dán bảng *ĐÃ CHUYỂN NHÀ* ở đầu
`AGENTS.md` của nó. Đừng sửa gì trong đó nữa; bản đang sống nằm ở gói mới.

**⑵ STATUS sửa trần 50 → 200** cho khớp [ADR-0005](docs/adr/0005-tran-ghi-nang-tu-50-len-200.md).

**⑶ Một lỗi CŨ lộ ra và đã vá.** STATUS khai `ref_readme: README.md` và `ref_handoff: HANDOFF.md`.
Phép kiểm B5 giải hai đường đó **từ gốc repo**, mà gốc repo *có* hai tệp cùng tên — nên nó
XANH suốt, trong khi người bấm từ bảng trạng thái rơi vào README của **CẢ REPO** chứ không
phải của Scouter. Xanh mà trỏ nhầm chỗ. Nay khai đường đầy đủ.

> Đáng ghi vì đây là dạng lỗi khó thấy nhất trong repo này: **phép kiểm đúng luật của nó, và
> vẫn để lọt.** B5 hỏi *"tệp có tồn tại không"* — nó không hỏi *"có đúng tệp bạn định trỏ"*.
> Mọi gói tương lai khai đường tương đối đều dính đúng bẫy này.

**Việc kế của Scouter không đổi:** mục ① của `ROADMAP.md` — trang thử THỨ HAI, nên chọn trang
render bằng JS. Nay lý do còn mạnh hơn: Scouter mất pilot duy nhất của nó, nên câu *"năng lực
chung"* hiện **không còn một trang thật nào** đứng sau.

**Đo.** Suite gói **20/20**. Suite gốc repo 369 → **375** (gói mới nối vào cổng).

## 2026-09-08 · `claude-scouter-s06` — sổ tay khai thiếu 4 lệnh, và nay có phép ghim canh

Rà lại `README.md` của gói: nó viết *"Mười một method"* và liệt kê 11, trong khi mã thật có
**15**. Bốn cái thiếu: `scout.a11y` · `scout.shot` · `scout.fetch` · `scout.navigate`.

**Hai cái sau chính là hai lệnh mà cả pilot HNX sống bằng nó.** Một AI đọc sổ tay đó sẽ không
biết `scout.fetch` tồn tại — mà sổ tay này là thứ ta đưa cho AI khác đọc.

**Sổ tay không trôi vì ai lười. Nó trôi vì không gì canh nó:** thêm một method thì cổng kiểm
xanh, suite xanh, chỉ có một bảng trong tài liệu là lặng lẽ sai đi. Nên bản vá không dừng ở
việc sửa bảng — thêm `tests/so-tay-khop-tu-vung-smoke.mjs`: nó so **tập tên lệnh** trong bảng
README với `METHOD_NAMES`, và so cả **con số viết bằng chữ** ở câu dẫn.

> Nó cố ý **không** kiểm câu chữ mô tả — chữ là việc của người. Chỉ kiểm thứ có đúng một câu
> trả lời đúng. Và nếu bộ đọc bảng markdown khớp **0** lệnh thì phép ghim ĐỎ, không lặng lẽ
> đạt: *0 lệnh khớp 0 lệnh thiếu* là một lượt tự tắt trông y hệt một lượt chạy tốt.

Thử ngay hai con đột biến bằng tay: đổi số ở câu dẫn → đỏ; xoá một dòng lệnh khỏi bảng → đỏ.

**Cùng lượt này, gói `hnx-fetch` đi qua hai vòng audit độc lập** (Codex, mã và nội dung) và
vá 6 lỗi mã + 11 chỗ tài liệu. Hai lỗi nặng nhất nằm ở khối phanh — **khối đó chép từ đây**,
nên Scouter **có cùng hai lỗi**: bản ghi ngân sách trải từ bản ghi cũ (phanh khẩn bị hồi sinh)
và đọc-ghi không xếp hàng (trần vượt khi chồng lượt). Đã ghi vào `BACKLOG.md` mục `S-15`.

**Đo.** Suite gói **21/21** (trước 20).

## 2026-09-08 · `claude-scouter-s06` — khai danh tính gói vào bảng trạng thái

Ba trường **tuỳ chọn** vào `STATUS.md`: `lam_duoc` · `khong_lam_duoc` · `dung_the_nao`, cộng
`ref_runbook` trỏ `AGENTS.md` của gói. Bảng nay nói được Scouter **là bộ dò trang đa năng, không
gắn với trang nào** — và nói cả chỗ nó KHÔNG làm: không tự chạy, mọi lệnh bấm/gõ đóng mặc định,
không ghi tệp, và không biết trang nào cả.

Câu cuối là ranh giới seed/adapter viết lại cho Đức đọc: hiểu biết về một trang cụ thể phải nằm
ở tầng adapter bên ngoài, không nằm trong seed.

Chi tiết bộ máy ở `HANDOFF.md` gốc repo cùng ngày.

---

## 2026-09-08 · `claude-scouter-s06` — vá khối phanh (S-15), đóng S-11, đề xuất trang thử thứ hai

**Đức chốt ba việc trong một câu:** cho sửa `S-15`, chấp nhận rủi ro `S-11` và bỏ nó khỏi sổ,
và yêu cầu tôi **đề xuất** trang thử thứ hai thay vì tự chọn.

**S-15 — hai ca đua của khối phanh, nay đã đóng.** Bản vá chép từ `hnx-fetch` (đã chạy được ở
đó): một **hàng đợi mức module** dùng chung cho `setWriteGate` và `spendWriteBudget`, cộng lượt
trừ ngân sách **ghi từng trường** thay vì trải bản ghi cũ. Chữa hai đường: phanh khẩn bị lượt
trừ ngân sách **bật lại**, và trần 200 bị **vượt** khi nhiều lượt chồng nhau. Ở đây nguy hơn
`hnx-fetch` vì Scouter mở `<all_urls>` và có ba lệnh bấm-gõ thật.

Phép ghim: khối ⑳ của `tests/scouter-write-gate-smoke.mjs`, dùng một kho lưu **cố ý chậm**
(nhường lượt giữa `get` và `set`). Không có chỗ nhường đó thì hai lỗi này không tái hiện được
và phép ghim xanh vì may mắn. Hai con `PD1` `PD2` hoàn nguyên đúng bản vá, cả hai giết được.

**Bộ đo bắt được một mỏ neo mục ruỗng ngay trong lượt này:** `P8` neo vào chính dòng ghi mà bản
vá vừa viết lại, nên nó khớp 0 chỗ và bộ đo báo **ĐỎ** — đúng như luật của nó, không báo BỎ QUA.
Đã neo lại. Nay 95/95 mỏ neo · 95 giết được · 0 sống sót.

**S-11 rời sổ** theo [ADR-0022](../../../docs/adr/0021-goi-extension.md).
Điều kiện hết hiệu lực nằm trong ADR: **mở băng một trong hai gói thì phải chuyển sang lõi
chung ngay trong lượt mở**.

**Trang thử thứ hai:** `ROADMAP.md` mục ① nay có ba ứng viên kèm được-mất. Tôi thêm một tiêu
chí mà mục đó bỏ sót và nó nặng hơn "render bằng JS": trang phải **bắt PHẢI BẤM mới ra dữ
liệu** — cả vòng HNX chạy trọn với đúng một lệnh đọc, nên ba lệnh bấm-gõ chưa lần nào chạy
trong việc thật. Khuyên **HOSE `hsx.vn`**. Bước đầu là **một phép đo** bằng `dom_probe`, không
phải viết mã.

**Việc kế:** Đức chọn trang, rồi chạy phép đo đó.

---

## 2026-09-08 · `claude-scouter-s06` — TẠM DỪNG Scouter, dừng ở chỗ sạch

Đức chuyển hướng sang ba gói `duc-auto-*`. Câu của Đức: *"tôi muốn tạm dừng thôi"* — nên đây
**không** phải đóng gói v1, và tôi đã bỏ hẳn việc đó khỏi phiên này.

**`lifecycle: building` → `paused`.** Một gói khai `building` mà không ai xây là một dòng nói
dối trên bảng của Đức. `human_action` nay rỗng việc, chỉ giữ một câu nhắc: bản Scouter **đang
cài trong Chrome là bản CŨ**, khối phanh vá 08/09 chưa vào.

**Kết sổ trước khi dừng — và sổ đang nói sai.** Nhìn qua tưởng còn 4 mục nợ; đo ra chỉ còn 2:

- `S-10` (pilot hnx) — **đã xong từ trước, không ai đóng sổ.** Điều kiện đòi 5 ngày liên tiếp;
  thực tế 46 ngày liền mạch, 216 PDF + 368 hàng, 0 lỗi, ba tính chất đều có phép ghim
  (`vong-lay-smoke` khối ①②③). Việc này nay **thuộc `workers/hnx-fetch`**.
- `S-14` (câu báo lỗi nói "popup" trong khi giao diện là bảng bên) — **mã đã sửa từ trước**,
  khối ⑲ đọc nhãn thật từ `sidepanel.html`. Chỉ thiếu dòng đóng sổ.

Còn lại đúng hai: `S-12` (thuộc HNX, chờ Đức chốt) · `S-13` (xấu mặt, đã kiểm là không hở).

**Bài học đáng giữ:** hai mục trên nằm im ở trạng thái MỞ suốt vì **cửa ra của sổ rẻ hơn cửa
vào không đủ** — ghi một mục nợ mất một phút, còn đóng nó đòi người ghi phải quay lại đúng
quyển sổ đó sau khi việc đã xong. Chỗ này hỏng lặng lẽ: không gì đỏ lên, và bảng của Đức chỉ
hiện một con số nợ **cao hơn sự thật**.

**Việc kế:** không có. Quay lại thì đọc `ROADMAP.md` mục ① — trang thử thứ hai, ba ứng viên,
khuyên `hsx.vn`, và bước đầu là một phép đo chứ không phải viết mã.

---

## 2026-09-08 · `claude-scouter-s06` — sổ nợ Scouter nay RỖNG

Đức hỏi *"ta không còn nợ kỹ thuật hay rác nữa đúng không?"* rồi bảo đóng nốt. Với gói này thì
đã đóng hết thật, và đây là hai mục cuối.

**`S-13` — chẩn đoán cũ SAI.** Sổ tưởng lỗi định tuyến tên method. Thật ra `capabilities` không
lọt nổi tới bảng method: nó hỏng **hình dạng phong bì** (`METHOD_SHAPE` bắt buộc có dấu chấm),
nên `parseRequest` ném TRƯỚC khi biến `request` được gán, phản hồi ra đi với `request_id: null`,
máy chủ khớp hụt rồi thay cả phản hồi bằng `INTERNAL_ERROR`. Hậu quả rộng hơn sổ mô tả: **mọi**
lý do từ chối ở tầng phong bì đều bị nuốt.

Vá ở **cửa vào**: vớt `request_id` từ phong bì thô trước khi kiểm. **Không** nới `METHOD_SHAPE`
để ép ra `METHOD_NOT_FOUND` — đó là gỡ một chốt giao thức cho test xanh, luật vàng ③ cấm. Ghim
cả hai chiều; đột biến `PB1` giết được, bộ đo **96/96 mỏ neo, 96 giết được, 0 sống sót**.

**Một con đột biến sống sót, và tôi bỏ MÃ chứ không bỏ con đó.** `PB2` hoàn nguyên lớp kiểm hình
dạng trong bộ vớt — phép ghim vẫn xanh, vì `failureResponse` đã kiểm ở cửa ra và cửa ra là đường
DUY NHẤT phản hồi đi qua. Nên lớp đó là bình luận, không phải chốt: gỡ nó, gỡ luôn con đột biến.
Giữ một con không giết được là để lại một dòng đỏ vĩnh viễn mà ai cũng học cách bỏ qua.

**`S-12` — chuyển nhà, không phải bỏ qua.** Nó nói về vòng lấy dữ liệu hnx, mà pilot đó đã sang
`workers/hnx-fetch` cùng `S-10`. Cùng một chuyện đã có mục riêng ở nhà mới (`H-03`), kèm đúng hai
đường ra như ở đây. Hai bản của một mục nợ ở hai quyển sổ thì chắc chắn một bản được đóng còn bản
kia nằm lại mãi. Quyết định vẫn chờ Đức, và nó nằm ở `H-03`.

**Việc kế:** không có. Gói tạm dừng, sổ rỗng, suite xanh, đột biến 0 sống sót.

---

## 2026-09-08 · `claude-scouter-s06` — xoá thư mục pilot cũ, sau khi cứu 17 con đột biến ra khỏi nó

Đức duyệt xoá `workers/duc-scouter/pilots/`. Trước khi xoá, tôi kiểm xem trong đó có gì **không
có bản thay thế** ở nhà mới — và có thật.

`pilots/hnx-phai-sinh/scripts/pilot-mutation-check.mjs` giữ **17 con đột biến** canh
`vong-lay.mjs` và `nguon-hnx.mjs`: luật thử lại, phép không-làm-hai-lần, hợp đồng trang, và ca
*"200 OK kèm cả một trang HTML"* — cái bẫy đắt nhất của trang HNX. Bộ đo ở `workers/hnx-fetch`
trước lượt này **chỉ với tới `tai-ket-qua.mjs`**, nên xoá thẳng là mất trắng lớp lưới đó.

Đã chuyển về `workers/hnx-fetch/v0.1.0/scripts/mutation-check.mjs` trước, chạy đạt (**43/43 mỏ
neo · 43 giết được · 0 sống sót**), rồi mới xoá. Mã `N*` của bản cũ đổi thành `W*` vì `N1..N22`
đã có chủ, và bộ đo **chặn mã trùng** — nó đã chặn thật hai lần trong ngày.

**Bài học, và nó rộng hơn lượt này:** *"đã chuyển nhà"* không có nghĩa là **mọi thứ** đã theo.
Chín trong mười sáu tệp trùng từng byte, năm tệp đã lệch, và đúng một tệp là bản duy nhất còn
tồn tại. Trước khi xoá một thư mục "thừa", hãy hỏi *cái gì trong đây KHÔNG có ở chỗ mới* — chứ
đừng hỏi *cái gì trong đây đã có ở chỗ mới*.

Suite Scouter còn **17** (trước 22): năm phép ghim của pilot đã theo về nhà mới, không mất.

## 2026-09-09 · `claude-luat-rasoat` — chỉ vá liên kết, không đụng hành vi

Lượt rà các nơi chứa luật ở gốc repo (`N-54` và tiếp theo) chạm hai loại file của gói này:

- **Liên kết tới ADR gốc repo** — sổ ADR gốc gộp từ 27 file xuống 9 theo chủ đề, nên tên file đổi.
  Vá ở `AGENTS.md` · `BACKLOG.md` · `HANDOFF.md` · `README.md` · `README-OBSERVER-V0.md` ·
  `ROADMAP.md` · `STATUS.md` · `docs/TRIALS.md` · ba ADR của gói · hai file test.
- **Hai ADR của gói dùng độ sâu `../` SAI** — từ `<gói>/<ver>/docs/adr/` về gốc repo là **năm**
  bậc, không phải bốn. Lỗi có từ trước; lượt vá tên file làm nó lộ ra.

**Không đụng logic, không đụng hành vi.** Suite gói: 17/17 xanh.

**Cách tra một số hiệu ADR nay nằm ở file nào:** bảng trong `docs/README.md` ở gốc repo. Và
**trích theo SỐ HIỆU, đừng trích theo tên file** — tên file đổi được ở lượt rà hằng tuần, số hiệu
thì không. Nhớ thêm: số ADR đánh **theo từng thư mục**, nên `0001` của gói này và `0001` ở gốc
repo là **hai quyết định khác nhau**.

## 2026-09-09 · `claude-luat-rasoat` — hai lượt trỏ hỏng, và một vế ADR bị đánh rơi hôm qua

Rà `AGENTS.md` của gói theo bộ biên dịch luật mới
([ADR-0027](../../../docs/adr/0027-bo-bien-dich-luat.md)). Hai chỗ sửa:

- Luật vàng 4 dẫn *"`AGENTS.md` gốc mục 2"* cho việc **phải hỏi Đức** — nay là **mục 3**. Lượt
  cắt hiến pháp 402 → 252 dòng hôm nay làm hỏng 8 lượt trỏ theo số mục trong ba file. Luật mới:
  trỏ tới `AGENTS.md` phải kèm **TÊN** mục.
- Dòng `../pilots/` dẫn *"ADR-0020 mục ⑶a"* — **và vế đó không còn tồn tại.** Lượt gộp 27 ADR
  hôm qua đánh rơi hẳn `0020 ⑶` (ranh giới seed ↔ pilot: chỗ đứng vật lý · `docs/TRIALS.md` ·
  hàng rào hẹp `seed-purity-smoke.mjs`) và `0020 ⑷` (sổ mở trước, playbook mở sau). **B12 vẫn
  xanh tuyệt đối** vì nó canh SỐ HIỆU chứ không canh NỘI DUNG VẾ.

**Đã khôi phục cả hai vế** vào [ADR-0020](../../../docs/adr/0007-scouter.md) mục ⑼, kèm ghi chú
vì sao chúng vắng mặt một hôm. Ba thứ vế đó nói tới đều đang tồn tại thật trong gói — thư mục
`../pilots/`, `docs/TRIALS.md`, và phép ghim hàng rào hẹp — nên mất vế là mất **lý do** của
chúng, thứ đắt hơn cả bản thân câu chữ.

**Không đụng mã, không đụng phép ghim.**

## 2026-09-09 · `claude-nen-luat` — gói có `PHIEN.md`: một file, ~2.700 token, máy sinh

Đức chốt trần **2.000–3.000 token** cho một phiên đụng gói
([ADR-0035](../../../docs/adr/0035-mot-file-cho-mot-phien-gap.md)). Trước lượt này một phiên ở gói
này trả **hơn 23.000 token** trước khi gõ dòng đầu tiên — 70% là `HANDOFF.md`, phần còn lại là cả
hiến pháp gốc tự nạp qua `@AGENTS.md`.

**Nay mở phiên đọc đúng `PHIEN.md`** — máy sinh, tự chứa: lõi luật chung
(`workers/_shared/LUAT-CORE.md`) + `## Luật vàng` của gói + bản chắt trạng thái lấy từ frontmatter
`STATUS.md`. `AGENTS.md` và `HANDOFF.md` của gói thành **nguồn**, mở khi cần đào sâu.

**Đừng sửa `PHIEN.md` bằng tay** — sửa nguồn rồi `node scripts/rule-compile.mjs --sinh` (phải giữ
khoá vùng). **Trần CỨNG**: vượt là bộ sinh **từ chối ghi**, không phải cảnh báo — muốn thêm một
luật thì phải bỏ một luật.

`## Luật vàng` của gói đã rút gọn cho vừa trần; không vế luật nào bị bỏ, chỉ chuyện kể bị cắt.
**Không đụng mã, không đụng phép ghim.**

## 2026-09-09 · `claude-nen-luat` — gói này nay mở phiên bằng `PHIEN.md`

**Mở phiên: đọc `PHIEN.md`, một file, xong** ([ADR-0035](../../../docs/adr/0035-mot-file-cho-mot-phien-gap.md)).
Máy sinh, tự chứa: lõi luật chung + `## Luật vàng` của gói + bản chắt trạng thái từ `STATUS.md`.
**2.895 token.** Đừng nạp `AGENTS.md` hay file nhật ký này lúc mở — chúng là **nguồn** của
`PHIEN.md`, mở khi cần đào sâu.

`## Luật vàng` 2709 → 2555 ký tự. **Không luật nào bị xoá** — phần bỏ là phần đã có nguyên văn
ở lõi dùng chung và `workers/_shared/AGENTS.md`. Giữ nguyên cả chín chốt riêng: selector không vào seed · từ vựng đóng · quyền là TRẦN · hai lõi đọc/ghi tách · toạ độ không nhận từ ngoài dây · đường ghi đóng mặc định.

**Sửa `AGENTS.md` hay `STATUS.md` của gói thì PHẢI chạy `node scripts/rule-compile.mjs --sinh`** —
cổng nay có phép kiểm canh (`PHIEN_CU`), và vượt trần 6.600 ký tự thì bộ sinh **từ chối ghi**.

## 2026-09-12 · `codex-bridge-pairing-links`

Đặt khối **Sao chép đường dẫn JSON** ngay dưới Kết nối Bridge. Khối hiện đúng tệp ghép cặp trong `C:\WORKING ZONE\Chrome Extension Bridge\duc-scouter\` và nút một chạm chép đường dẫn, không chép token. Thêm `bridge-pairing-path-static.mjs`; suite gói xanh.
