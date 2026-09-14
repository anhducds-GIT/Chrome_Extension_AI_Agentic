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

## 2026-09-12 · `claude-scouter-udine` — ghế có TÊN, và trang thử thứ hai đã chạy thật

**① Trang thử THỨ HAI xong** — mục ① của `ROADMAP.md`. Seed dò `https://vinfast.udinbv.com/optic/`
(một SPA React khác hẳn `hnx.vn`) **không sửa một dòng seed nào**, toàn lệnh CHỈ ĐỌC, công tắc
đường ghi vẫn tắt. Bản đồ trang và câu-chưa-trả-lời-được ở
[`drafts/DO-TRANG-OPTIC-UDINE-V1.md`](../../../drafts/DO-TRANG-OPTIC-UDINE-V1.md) — **đọc file đó
trước khi viết adapter**, đừng đoán lại.

**② TÊN GHẾ ("Profile ID").** Đo được chứ không phải thẩm mỹ: `bridge.sessions` trả về hai ghế
cùng nối, cả hai `label: null` `legacy: true` — máy chủ định tuyến fail-closed nên mọi lượt gọi
không nêu đích bị từ chối `TARGET_AMBIGUOUS`. Máy chủ đã có sẵn chỗ (`parseInstance`); thiếu đúng
phía extension. Nên **không thêm method Bridge nào** — nhãn đi kèm khung `auth`. Lý do đầy đủ nằm
trong chú thích khối `DANH TÍNH GHẾ` ở `scripts/scouter-transport-loopback.mjs`.

Ô nhập ở thẻ **Hệ thống** của bảng bên. Lưu tên là **cắt dây để nối lại**. Đo sau khi nạp lại:
cả hai ghế nay `legacy: false`, số ghế bền, `worker: duc-scouter`. `label` còn rỗng vì **chỉ tay
người gõ được** — thiết kế, không phải việc dở.

**Phép ghim** `tests/scouter-profile-id-smoke.mjs` tám con `G1..G8`; `G6` nhập `parseInstance`
THẬT của máy chủ nên "hai đầu dây đồng ý" là phép đo. Đột biến thêm `TG1..TG4`: 100/100 giết
được, 0 sống sót. Suite gói 19/19 xanh.

**Chưa ai nghiệm thu ngoài người viết.** Cần audit độc lập trước khi đẩy, và cần Đức gõ thử một
cái tên.

## 2026-09-12 · `claude-scouter-udine` — hai năng lực mới: CHỜ và NGHE MẠNG

Đức chốt thêm cả hai. Từ vựng cửa Bridge **15 → 17**, cả hai `read_only`.

**`scout.wait`** — chờ ngay trong trình duyệt tới khi một selector khớp, trả lời MỘT lần thay
cho gần trăm vòng đi-về. **Không mở thêm cửa CDP nào.** Hết giờ trả `satisfied: false`, không
phải lỗi.

**`scout.network`** — nghe trang nói chuyện với máy chủ. Cái này **có** mở cửa mới, và toàn bộ
giải trình an toàn nằm ở chú thích khối `Network.*` trong `scripts/observer-probes.mjs` — **đọc
ở đó trước khi sửa**, đừng đọc lại ở đây. Tóm tắt một dòng: đúng hai method, và phép dò nhặt
từng trường theo danh sách trắng chứ không trải gói Chrome đưa sang.

**Chốt tìm dọc đường:** máy chủ Bridge cắt lượt chuyển tiếp ở **35s**, nên trần chờ 30s/25s là
đọc ra từ máy chủ chứ không chọn cho đẹp. Ba method cũ đang vượt trần đó → **sổ nợ S-16**, đừng
chép số của chúng. Cũng **đóng S-04** (18/18 lượt reload giữ được phản hồi).

Tên `scout.net` bị `seed-purity-smoke` bắt vì trông như tên miền `.net` — **đổi tên method**
chứ không nới phép ghim.

**Phép ghim** `tests/scouter-wait-net-smoke.mjs`, `W1..W10`; `W6` nhét token giả vào đúng chỗ
Chrome đưa bí mật sang rồi soi toàn bộ chuỗi kết quả. Đột biến thêm `NM1..NM6` — `NM1` trải
nguyên gói gốc mà vẫn trả đúng số dòng, nên phép ghim đếm-và-so sẽ xanh trọn. **106/106 giết
được, 0 sống sót.** Suite 19/19.

**Đo thật sau MỘT lượt nạp lại:** 17 method sống; `scout.wait` trên Optic thấy sẵn thì 1 lượt
hỏi/64ms, không có thì 6 lượt/2.558ms rồi `satisfied:false`.

**CHƯA chứng minh được:** `scout.network` trả lời sạch nhưng cả ba tab đều **0 lượt gọi** vì
chúng đứng yên — nên lớp nối kênh sự kiện ở `observer-engine.js` (`dangKySuKien`, 12 dòng) vẫn
chưa chạy thật lần nào. `0` trông giống hệt "trang không gọi gì" và "cái tai hỏng". Đóng bằng
một việc 5 giây: nghe 25 giây trong lúc Đức bấm F5 một tab.

## 2026-09-12 · `claude-scouter-udine` — lượt GHI đầu tiên trong việc thật

Đức mở công tắc và bảo tự chạy. Ca thử là trang Udin; **đích là seed**.

**Cái tai CHẠY.** `scout.network` thu **30 lượt gọi** trên một lượt tải trang — đóng chỗ hở nêu
ở mục trước. Nó lộ luôn bộ máy sau lưng trang (Cognito · AppSync · Lambda ·
`manage-tenant-session`), tức **kết quả về bằng MẠNG** chứ không chỉ vẽ lên canvas. Câu treo từ
bản đo đầu: đã có đáp án.

**Gõ chạy, bấm thì chưa.** 40 ký tự vào đúng ô bằng bàn phím thật, React nhận — nút Send từ
`disabled` sống lại, và `scout.wait` bắt được đúng lượt đổi đó. Bấm Send báo ĐẠT
`{matchCount: 1, clickedAt, Input.dispatchMouseEvent}` mà **không gửi được gì**.

**Bốn mục nợ, cả bốn của SEED chứ không của trang. Đọc `BACKLOG.md` S-17..S-20 trước khi đụng
đường ghi** — đừng đọc lại ở đây:

- **`S-17` (P1)** — `scout.click` không kiểm điểm-bấm-thuộc-về-ai, nên bấm trúng lớp che vẫn
  trả về **y hệt một lượt bấm thành công**. Luật vàng 7 chặn nửa theo phương ngang; nửa theo
  **chiều sâu** chưa ai canh.
- **`S-18`** — `scout.wait` tôi giao hôm nay nhầm *có mặt* với *dùng được*: `satisfied` sau
  **36ms** trong khi tấm chắn phủ kín ứng dụng. Lỗi của chính bản vá này.
- **`S-19`** — `scout.navigate` không F5 được cùng một URL.
- **`S-20`** — gắn-rồi-nhả nên Scouter **không nghe được lưu lượng do chính nó gây ra**. Đo:
  bấm rồi nghe = 0; nghe lượt tải = 30.

`S-17` và `S-18` cùng gốc — thiếu cái nhìn theo chiều sâu — làm một lượt thì rẻ hơn hẳn. Cả hai
cần `DOM.getNodeForLocation`: **thêm method CDP là đổi luật an toàn → hỏi Đức.**

**Tab của Đức đã trả nguyên trạng** (bấm Try Again, chờ lớp chắn tan, chụp lại đối chiếu).
**Không đụng mã lượt này** — chỉ đo và ghi.

## 2026-09-12 · `claude-scouter-udine` — gói có `CHUOI-VIEC.md`, chuỗi chạy liên tục

Đức đặt bài: một chuỗi việc để **triển khai chạy không dừng**, rồi Đức compact và làm theo nó.

Nên file mới sinh ra để **sống sót qua compact**, và nó cố ý KHÔNG làm ba việc đã có chỗ:
không kể chuyện đã qua (`HANDOFF.md`) · không giữ sổ nợ (`BACKLOG.md`) · không bàn phạm vi
(`ROADMAP.md`). Nó trả lời đúng một câu: **việc kế tiếp là gì, đóng khi nào.**

**Hai quyết định của Đức gom LÊN ĐẦU**, cố ý: một chuỗi mà cứ vài bước lại dừng hỏi thì không
phải chuỗi. `D1` (cho thêm `DOM.getNodeForLocation` vào đường ghi) mở khoá `T1`+`T2`; `D2` là
gõ tên hai ghế. Đức chưa chốt thì `T3` và `T4` vẫn chạy được — **chuỗi không tắc**.

**Chín việc `T1..T9`**, mỗi việc có `đóng khi` đo được. Thứ tự không tuỳ tiện: `T1` đứng đầu vì
mọi việc sau nó đều dựa vào một lượt bấm **nói thật**; `T8` (đổi tên `observer`→`scouter`) đứng
gần cuối vì nó làm mọi diff khó đọc — đúng lý do nó bị hoãn từ 07/09.

`T6` ghi thẳng một đường **BỊ CẤM**: bỏ gắn-rồi-nhả để giữ phiên nghe dài. Đó là nới một lớp
bảo vệ để lấy tiện lợi, và dải băng vàng sẽ đứng mãi trên tab Đức.

Sửa luôn một con số cũ trong **Bản đồ file**: nó khai `observer-probes.mjs` có **bảy** phép dò,
thật là **tám**. Nay dòng đó kèm lệnh đếm lại thay vì một con số gõ tay — cùng cách `README.md`
đã làm với bảng lệnh.

`STATUS.ref_runbook` nay trỏ vào `CHUOI-VIEC.md` chứ không phải `AGENTS.md`: phiên sau mở
`PHIEN.md` rồi đi thẳng tới việc đang tới lượt.

## 2026-09-12 · `claude-scouter-udine` — lượt bấm thôi nói dối

**Việc.** Đức chốt D1. Vá `S-17` và `S-18` — hai khuyết tật của SEED mà ca thử Udin ép lộ ra.

**S-17.** `input.click` nay có chốt ⑸: sau khi tính toạ độ, **trước khi** bắn chuột, nó hỏi
Chrome *"điểm này là phần tử nào"*. Không phải phần tử đã khớp hay con cháu nó thì từ chối
`CLICK_OBSCURED`. Toạ độ làm tròn MỘT lần ở MỘT chỗ — điểm đã hỏi đúng là điểm sẽ bấm.

**S-18.** `scout.wait` nhận `state: "usable"`; `present` **vẫn là mặc định**. Trả về cả
`matchCount` lẫn `usableCount`, kèm `usableBlockedBy` nói VÌ SAO chưa dùng được.

**Đo ngoài đời**, trang tự dựng, qua Bridge thật — không chỉ trước máy giả. Sáu ô đều khớp
thiết kế; bảng ở `docs/TRIALS.md`. Một câu **không tra được trong tài liệu** đã được đo thay vì
đoán: Chrome tự đi ngược từ nút văn bản lên phần tử cha, nên `<button>Gửi</button>` không bị từ
chối oan.

**Ba chỗ tôi sai, ghi ra:**
⑴ `CHUOI-VIEC.md` tính THIẾU — D1 chỉ xin một method, T2 còn cần `DOM.getBoxModel` ở lõi đọc.
Phải quay lại hỏi Đức giữa chừng. ⑵ Viết vào mã một chẩn đoán CHƯA ĐO ("tab không được vẽ") rồi
tự bắt được và hạ xuống đúng mức quan sát → `S-21`. ⑶ Hai phép ghim ĐỎ oan vì chúng ghim **cách
viết** chứ không ghim **hành vi**; sửa cho chúng ghim chặt hơn, không hạ chúng xuống.

**Đức báo không thấy phần Profile.** Bản trước cố ý tránh chữ "Profile ID" vì trong khối có hai
thứ khác nhau — lý do đúng, kết quả sai: Đức đi tìm chữ mình dùng, không thấy, và kết luận tính
năng chưa có. Nay khối mang đúng tên đó, số ghế đứng TRƯỚC ô tên và sao chép được.

**Số:** suite 20/20 · đột biến 117/117 giết được, 0 sống sót. Từ vựng CDP đường ghi 9 → 10,
đường đọc 11 → 13 (hai getter thuần, mỗi lõi khai riêng — KHÔNG dùng chung danh sách).

**Chưa ai nghiệm thu ngoài người viết. Chưa commit, chưa đẩy.** Việc tới lượt: `T3` (`S-19`),
đã tái hiện lần hai ngoài Udin nên nó chắc chắn là của seed.

## 2026-09-12 · `claude-scouter-udine` — nạp lại trang, và một con đột biến sống sót

**Việc.** `T3` / `S-19`: `scout.navigate` đi tới đúng url đang đứng thì treo 15 giây rồi trả
`NAVIGATE_TIMEOUT` — **câu sai nguyên nhân**, trong khi trang đã tải lại thật.

**Cách vá.** Chờ bằng HAI dấu hiệu đã-đi, không một: url đổi, **hoặc** tài liệu được thay mới
(`backendNodeId` của nút gốc). Hai ca loại trừ nhau — F5 đổi tài liệu chứ không đổi url;
`#muc-2` đổi url chứ không đổi tài liệu — nên một dấu hiệu một mình thì ca kia treo oan.

**Không dùng `nodeId`**: nó được cấp lại mỗi lượt `DOM.getDocument`, nút gốc gần như luôn là
`1`, nên so `nodeId` là so hai con số luôn bằng nhau. Không mở thêm method CDP nào.

**Đo ngoài đời**, trang tự dựng, qua Bridge thật: F5 từ **15.000ms báo sai** xuống **254ms báo
đúng** (`reloaded: true`, `arrivedBy: "new_document"`). Đi url khác vẫn chạy nguyên.

**Một con đột biến SỐNG SÓT, và đó là chỗ đáng kể nhất của lượt này.** `HN4` — để nguyên
`undefined` làm danh tính tài liệu cũ — sống sót lúc mới thêm. Nghĩa là chốt `?? null` khi ấy
chỉ là một dòng bình luận: không đọc được tài liệu trước lúc đi thì mọi lượt điều hướng xong
ngay nhịp đầu, vì nó so một con số thật với `undefined`. Thêm phép ghim ⓓ0, con đó chết.

**Tên ghế nghiệm thu ngoài đời.** Đức gõ `Udin_Scout` ở bảng bên; máy chủ thấy tên và mọi lượt
gọi trong lượt đo này đi bằng TÊN thay vì dãy số. Vòng đó khép: bảng bên → kho lưu → cắt dây →
khung `auth` → định tuyến. **D2 còn một nửa** — ghế thứ hai chưa có tên.

**Số:** suite 20/20 · đột biến 121/121 giết được, 0 sống sót.

**Chưa ai nghiệm thu ngoài người viết. Chưa commit, chưa đẩy.** Việc tới lượt: `T4` (`S-16`).

## 2026-09-12 · `claude-scouter-udine` — hạn chờ thôi hứa dài hơn khả năng

**Việc.** `T4` / `S-16`: `scout.navigate` khai 70 giây, `scout.type` và `scout.fetch` khai 60,
trong khi máy chủ Bridge cắt lượt chuyển tiếp ở **35**. Quá ngưỡng đó thì người gọi đã nhận
`REQUEST_TIMEOUT` trong khi extension vẫn đang làm — và với `scout.type` (đường GHI) thì thử
lại nghĩa là **gõ hai lần**.

**Cách vá.** Ba số xuống 34.000. Chọn đường "hạ số", không chọn đường "đổi giao thức cho người
khởi động truyền hạn chờ" — đường kia đụng lõi dùng chung với ba gói đóng băng.

**Nhưng lấy nửa tốt của đường kia**, phần không đụng giao thức: 35.000 nay có TÊN,
`DEFAULT_REQUEST_TIMEOUT_MS`, xuất từ `bridge-host-core.mjs`. Trước đó nó nằm trần trong thân
hàm nên phía extension KHÔNG CÓ CÁCH NÀO ĐỌC ĐƯỢC — đó đúng là lý do ba method trôi lên 60–70
giây mà không ai thấy. Ba phép ghim của lõi dùng chung vẫn xanh; không đổi hành vi nào.

**Suýt bỏ sót một nửa.** Hạ `deadline_ms` mà để người gọi vẫn xin được `timeout_ms: 60000` thì
bug còn nguyên, chỉ chuyển chỗ. Trần đó xuống 30.000 — chừa bốn giây cho lượt trả lời đi về,
cùng khuôn với `scout.wait`.

**Phép ghim `B9` đọc ngưỡng THẲNG TỪ LÕI MÁY CHỦ** và duyệt cả bảng lệnh, không so với một
danh sách gõ tay. Mục này tái phát không phải bằng ai đó sửa số cũ mà bằng ai đó **thêm một
dòng**, và `S10` ghim đúng ca đó.

**Đo ngoài đời:** `system.capabilities` khai ra ngoài dây — không method nào vượt 34.000; xin
60.000 bị từ chối `INVALID_PARAMS` kèm khoảng hợp lệ.

**Số:** suite 20/20 · đột biến 124/124 giết được, 0 sống sót.

**Đức chốt 12/09: AI chủ động commit và đẩy, không hỏi, miễn không lỗi.** Lượt này đẩy theo chốt
đó. **Chưa có audit độc lập** — ghi ra để người sau không tưởng là đã có.

## 2026-09-12 · `claude-scouter-udine` — tên gói gõ cứng vào một file được chép đi

**Bug của chính tôi, và phép ghim của gói KHÁC bắt được.** Lượt thêm danh tính ghế hôm nay gõ
cứng `WORKER_ID = "duc-scouter"` vào `scripts/scouter-transport-loopback.mjs`. File đó được
CHÉP NGUYÊN VĂN sang `hnx-fetch`, nên bản chép khiến HNX Fetch **tự khai sai tên mình trên
dây** — và `bridge.sessions` là đúng chỗ người ta nhìn để phân biệt các ghế.

Không phép ghim nào của gói NÀY bắt được: với gói này thì `"duc-scouter"` là đúng. Nó lộ ra ở
lượt `npm test` TOÀN REPO đầu tiên sau đó, bằng con ⑷ của `hnx-fetch` (so từng byte hai bản).
**Bài học: sửa một file có bản sao thì phải chạy suite toàn repo, không chỉ suite của gói.**

**Cách chữa.** Tên gói thành THAM SỐ `worker_id` của `createTransport`, do lớp nối dây khai —
`scouter-background.js` khai `"duc-scouter"`, `background.js` của hnx-fetch khai `"hnx-fetch"`.
Hình dạng sai thì KHÔNG khai (`null`), chứ không khai bừa: một `worker` rác đi thẳng vào bảng
`bridge.sessions` mà người đọc đang tin. Đây là luật gói số 1 dưới hình dạng khác: **năng lực
vào seed, hiểu biết riêng vào lớp nối dây** — tên gói là hiểu biết riêng.

**Ghim `G9`**: đọc mã transport (đã bỏ chú thích) và ĐỎ nếu thấy bất kỳ tên gói nào. Rig của
mẻ ghim nay dùng `"goi-thu-nghiem"` chứ KHÔNG dùng tên thật — dùng tên thật thì một bản gõ
cứng `"duc-scouter"` vẫn xanh trọn, đúng bug này.

**Số:** scouter 20/20 · repo 137/138 (con còn lại là việc canvas lane khác đang làm dở) ·
đột biến 124/124 giết được, 0 sống sót.

## 2026-09-12 · `claude-scouter-udine` — một byte NUL nằm im trong chính phép ghim của tôi

**Tìm thấy khi chạy `npm test` TOÀN REPO, không phải suite của gói.** `tests/scouter-profile-id-smoke.mjs`
chứa **byte điều khiển THÔ** (`0x00 0x1f 0x7f 0x9f`) ở phép ghim `G5` — chỗ kiểm rằng
`sanitizeInstanceLabel` cắt ký tự điều khiển. Tôi gõ thẳng ký tự thật vào chuỗi nguồn thay vì
viết escape.

**Vì sao đắt hơn vẻ ngoài.** Git thấy byte `0x00` thì coi cả file là NHỊ PHÂN và **giấu mọi
diff về sau** — mọi lượt audit sau đó sẽ đọc "Binary file differs" thay vì thấy phép ghim đã
đổi gì. Một phép ghim không ai đọc được diff là một phép ghim sửa được mà không ai thấy. Chính
tôi đã đụng vào triệu chứng trong phiên này (`grep` báo "Binary file matches") mà không dừng
lại hỏi vì sao.

**Chữa:** viết bằng escape sáu ký tự (`\` + `u0000`, `u001f`, `u007f`, `u009f`) thay vì gõ thẳng ký tự thật vào chuỗi nguồn. Cùng ký tự, cùng phép đo,
file trở lại UTF-8 thuần và diff đọc được.

**Vì sao nó trốn được lâu:** `npm test` nối bằng `&&`, và một con của lane khác đỏ ở khúc
trước nên chuỗi dừng trước khi tới `tests/khong-byte-dieu-khien-smoke.mjs`. Cổng repo CÓ người
canh chuyện này từ trước — nó chỉ chưa tới lượt chạy. **Suite của gói xanh không thay được
suite toàn repo**, đúng bài học của mục ngay trên.

## 2026-09-12 · `claude-scouter-udine` — điều phối lại chuỗi quanh T7

**Không sửa mã.** Chỉ dựng lại `CHUOI-VIEC.md` để phiên sau (sau một lượt compact) vào là chạy
được T7 ngay, không phải đi dò lại những thứ phiên này đã biết.

**Bảng theo dõi viết lại quanh việc CÒN LẠI**, không kể lại việc đã xong: T7 lên đầu, và nói rõ
vì sao — T6, T8, T9 đều đang chờ T7 trả lời một câu: cả vòng có khép được không, và khép rồi
thì còn thiếu gì THẬT. Xây trước một năng lực chưa ai cần là thứ `ROADMAP` mục ④ cấm.

**Mục T7 nay chở sẵn bảng "thứ đã biết"**: vùng ghi của máy chủ, bốn method ghi đĩa (chúng là
method của MÁY CHỦ, chạy được cả khi không extension nào nối), chỗ đặt adapter kèm gói mẫu, và
việc trang thử phải phục vụ qua http vì `scout.navigate` cố ý chặn `file:`/`data:`.

**Và ba cái bẫy phiên này đã vấp**, ghi để khỏi vấp lần hai: hai ghế là hai HỒ SƠ Chrome nên
nạp lại một ghế không chạm ghế kia · `targetId` đổi sau lượt điều hướng khác nguồn · tab mượn
của Đức thì phải trả lại được.

Việc tới lượt: **T7**, không cần ai duyệt.

## 2026-09-12 · `claude-scouter-udine` — T7: vòng đi được ba chặng, chặng bốn lộ ra một lời nói dối

**Việc.** Khép vòng tự cải tiến một lần. Dựng bàn đo `pilots/trang-thu-cham/` — trang thử tự
dựng (ô nhập · nút · kết quả hiện sau 1.200ms), máy chủ tĩnh **chỉ nghe 127.0.0.1**, client
Bridge, phép dò, adapter, trình chạy cả vòng. README ngay trong đó.

**Ba chặng đầu chạy trơn, không sửa tay** — số đo từng chặng ở `CHUOI-VIEC.md` mục `T7`, khối
*Chạy 12/09*.

**Chặng hai suýt đi sai, và chỗ suýt sai đáng ghi hơn chỗ đúng.** Chuỗi việc kê `scout.page ·
scout.a11y · scout.query`. Dò đúng ba cái đó thì **ô kết quả biến mất**: nó là `div` ẩn, nên
`scout.page` bỏ qua (không tương tác) và `scout.a11y` cũng không thấy (chưa hiện thì chưa vào
cây trợ năng). Adapter sẽ biết bấm mà **không biết câu trả lời rơi vào đâu**. Chỉ `scout.tree`
thấy — đã thêm nó vào phép dò kèm lý do ngay tại chỗ.

**Chặng bốn dừng, và cái nó lộ ra lớn hơn chặng nó chặn — `S-22`.** `scout.type` trả
`typed: 8` trong khi ô nhập vẫn **rỗng** (đọc `value` bằng `scout.a11y`, và ảnh chụp còn thấy
chữ mờ gợi ý). `scout.click` trả `matchCount: 1, hit: {relation:"descendant"}` trong khi tay
nghe lượt bấm của trang **không hề chạy**. `scout.key Enter` cũng vậy. Đường ghi **báo ĐẠT cho
việc chưa xảy ra** — ngược hẳn `S-17`, vốn chỉ chữa ca đường ghi *từ chối* oan.

**Năm thứ đã LOẠI TRỪ được, kèm bằng chứng từng cái, nằm ở `BACKLOG.md` mục `S-22`** — đừng đi
dò lại. Gọn nhất: tab không đông cứng, vẫn được vẽ, toạ độ không lệch, không có lớp che, và
cùng lượt gọi đó **có chạy lúc 16:41** rồi thôi chạy từ ~16:44.

**Bài học đắt nhất.** Trang thử để độ trễ do `setTimeout` thì **không tách được** *"chưa tới
lượt"* với *"không tới nơi"* — tôi mất một lượt đi tìm bộ đếm giờ bị bóp. Thứ tách được là một
dấu đặt **ngay trong tay nghe**, không qua hẹn giờ. Trang thử sau nên có sẵn một dấu như thế.

**Chưa làm:** vòng **chưa khép**, ghi đúng ở mức đó. `T11` đứng trước `T7` vì mọi việc còn lại
đều dựng trên đường ghi này.

## 2026-09-13 · `claude-scouter-udine` — sổ giả thuyết, và T1 có hồi quy

**Việc.** Gỡ `S-22`. Tôi đi vòng: đoán "tab ẩn", dựng cả phép chặn trong adapter trên đó — Đức
xác nhận đã debug trước là SAI. Đã gỡ phép chặn.

**Đức chốt cơ chế:** `docs/GIA-THUYET.md` — mỗi giả thuyết một dòng, ĐÚNG/SAI/CHƯA + bằng chứng,
**tra trước khi thử**. Luật gói số 9 đưa nó vào `PHIEN.md`.

**Tìm được:** `npm run scouter:action-probe` (Chrome riêng) đỏ ở ca bấm phải cuộn tới. Chia đôi:
lõi trước T1 đạt; bỏ bước hỏi-điểm thì đạt; mã trả về là `CLICK_HIT_TEST_FAILED`. Mở `S-23`.
`S-22` (ca không cuộn, trả `ok`) vẫn chưa rõ.

**Bài học:** đọc mã trả về trước khi đoán — bốn lượt thử mất vì chỉ nhìn trang.

## 2026-09-13 · `claude-scouter-udine` — S-23 vá xong; Scouter vượt màn chờ của Udin

**S-23:** `DOM.getNodeForLocation` dùng hệ toạ độ TRANG, còn hộp phần tử và chuột dùng KHUNG NHÌN —
chưa cuộn thì trùng nhau, nên T1 lọt. Vá hai lõi: cộng độ cuộn đọc từ hộp `:root` (method sẵn có).
Probe 11/11, đột biến 128/128. Tìm ra bằng chia đôi, ghi ở `docs/GIA-THUYET.md` G-20..G-25.

**Udin:** `pilots/udin-optic/scripts/qua-man-cho.mjs` — chờ Try Again `usable` → bấm → kiểm màn chắn
tắt → ô prompt `usable`. Chạy thật: ĐẠT. `S-22` vẫn mở.

## 2026-09-13 · `claude-scouter-udine` — Udin: gửi prompt tròn vòng

`pilots/udin-optic/scripts/gui-prompt.mjs`: qua màn chờ → gõ → chờ nút Send mở khoá → bấm → chờ
`stop-button` hiện (Udin đã nhận) → chờ nó tắt → so TẬP `src` ảnh trước/sau. Selector từ DOM thật.
Audit độc lập bắt 2 lỗi: nút Send và Stop là cùng một phần tử (bấm nhầm Stop → báo nhận giả), ô
còn chữ cũ làm phép kiểm "Send mở khoá" vô nghĩa; đếm nút DOM ra 8 cho 4 ảnh. Đã vá: từ chối gửi
khi đang chạy hoặc ô có chữ; đếm theo src. Chạy thật ĐẠT 3 lần (lần cuối 51s, đúng 4 ảnh). Ghim 10
khối, 12 đột biến tay chết.
`GIA-THUYET` G-29, G-30. Bước kế: lấy ảnh kết quả về đĩa qua Bridge.

## 2026-09-13 · `claude-scouter-udine` — mô hình đo 3 cấp, `docs/CAPABILITIES.md`

Đức chốt: code giữ Seed → Adapter → Record; đo theo Capability → Workflow → Site Mastery (mastery
tính ra, không lưu). File mới: bảng 40 năng lực (19/39 đã chứng minh), checklist bổ sung có cột ✋
cần Đức duyệt, 8 workflow Udin (2 ĐẠT, 3 CHẶN), lộ trình P0–P5. 8 mốc bảng bên giữ nguyên.
Commit `feat(udin)` trước đó chưa lên được: safe-push chặn vì 2 commit của `claude-gpt-chay-het-job`
nằm xen giữa.

## 2026-09-14 · `claude-scouter-udine` — W3 và E2E: mã xong, lượt thật thì KHÔNG chạy được

**Bridge đang TẮT** (`scout.targets` → `fetch failed` ở `127.0.0.1`), mà cả ba mục còn lại của
chặng `P1` đều cần ghế thật. Nên phiên này làm trọn phần không cần trình duyệt và **không đổi
mục nào sang ĐẠT**. `S-22` không đụng tới được.

**`lay-anh.mjs` (W3):** `scout.fetch as:"base64"` → `file.write encoding:"base64"`. Không lệnh
Bridge mới. Ba chỗ cố ý ĐỎ, mỗi chỗ một mã lỗi riêng, để lượt chạy đầu **tự trả lời** ba câu chưa
biết: `src` dạng `blob:` (thuộc về tab — chữa bằng cách hỏi Đức, **không** nới cửa `scout.fetch`) ·
200 OK mà `content-type` không phải ảnh (bài học `hnx.vn`) · byte ghi ≠ byte tải (hỏng im lặng
kiểu PDF 08/09).

**`e2e.mjs`:** W1→W2→W3 một mạch. `scout.navigate` **mặc định không chạy**, và **prompt là tham số
bắt buộc** — mỗi lượt tiêu credit một chữ mới. `guiPrompt` nay trả cả `src` ảnh mới.

**Audit độc lập ba vòng (Codex), và nó kiếm được tiền của nó.** Vòng 1 **FAIL**: `layAnh([])` rơi
về quét cả trang, nên một lượt **không sinh ảnh nào** sẽ lặng lẽ tải ảnh CŨ rồi báo xong — đúng
hình dạng "báo ĐẠT cho việc chưa xảy ra" mà gói này sợ nhất. Nay `null` = quét trang, mảng rỗng =
ĐỎ. Vòng 2 **FAIL**: tôi khai "mọi throw đi qua một helper" mà lỗi **ném từ dây** thì không —
hỏng giữa chừng là mất luôn chỗ để file dở. Nay cả thân vòng lặp nằm trong một lượt bọc. Vòng 3
**CONDITIONAL PASS**, hai nhắc đúng: dấu ghi chú đổi sang `Symbol` riêng của module (một lỗi từ
dây mang sẵn trường cùng tên thì lách qua được), và giữ `cause` để mã lỗi gốc không bốc hơi.

**Đo:** suite gói **25/25** · ghim mới **20 khối** · **14 đột biến tay, chết cả 14**. Hai con
**TRƯỢT NEO** ở hai lượt khác nhau (dấu `\` bị heredoc nuốt; neo cũ sau khi đổi sang `Symbol`) —
bộ đột biến in số lần khớp neo, không thì "trượt neo" đọc y hệt một cái pass.

**Việc kế:** `G-31..G-34` đều `CHƯA`; lệnh chạy thật ở `CHUOI-VIEC.md` mục `T12` — dòng đầu
**không tiêu credit**.

## 2026-09-14 · `claude-scouter-udine` — chạy thật W3: 403, và cái chặn nằm ở đúng một lớp bảo vệ

**Đức nối ghế, tôi chạy.** Hai lần ngã, và cả hai đáng ghi hơn một lượt chạy trơn.

**Ngã ⑴ — hình dạng dây.** `scout.fetch` trả kết quả **PHẲNG**, không bọc `.data` như
`scout.query`. Mã tôi đọc `.data` nên ngã ngay lượt gọi thật — trong khi **15 khối ghim vẫn
xanh**, vì máy giả của tôi chép đúng cái hiểu sai của tôi. `hnx-fetch` đã đọc phẳng từ lâu; tôi
không tra. **Phép ghim không kiểm được hình dạng dây** — chỉ một lượt gọi thật kiểm được (`G-36`).

**Ngã ⑵ — và nó là cái chặn thật, `S-24`.** Sửa xong thì `scout.fetch` trả **403** cho mọi ảnh.
Không phải cookie (`G-33` **SAI** — đừng đi bật `with_credentials`, cookie không cứu một URL
thiếu chữ ký). Nguyên nhân: ảnh Udin nằm trên S3 bằng **URL ký sẵn**, chữ ký nằm trong query,
mà lõi ĐỌC **cắt query khỏi mọi `src`/`href`** (`stripQuery`) theo chính sách che
`de-xuat-chat-v1`. Đo: **17/17 `src` trên trang đều kết thúc bằng `…`**, và chính `scout.query`
tự khai chính sách đó trong phần trả về.

**Đây là bảo vệ đang làm ĐÚNG việc** — query là chỗ token hay nằm nhất. Luật vàng 3 cấm nới một
lớp bảo vệ để cổng xanh, nên tôi dừng và hỏi. Ba đường ở `BACKLOG.md` mục `S-24`; tôi đề xuất
⒜ **`scout.grab`**: nhận **selector**, extension tự đọc `src` đầy đủ *bên trong* rồi tải luôn —
URL ký sẵn không bao giờ ra khỏi trình duyệt. Cùng khuôn với luật gói 7.

**Chặn này rộng hơn Udin:** mọi trang phục vụ tệp qua CDN ký sẵn đều dừng ở đây. Đã thêm dòng
`O11` vào bảng năng lực — Seed Coverage 19/40.

**Không chạy E2E.** W3 chặn thì cả vòng chỉ tốn credit của Đức rồi ngã ở chặng ba (`G-34` giữ
`CHƯA`, ghi rõ vì sao). W1 và W2 vẫn ĐẠT như 13/09.

**Một tin tốt đo được trong cùng lượt, `G-37`:** chạy thật `qua-man-cho.mjs` — màn chắn có thật,
bấm một lần, **màn chắn tắt** và ô prompt `usable`. Đúng hình dạng của `S-22` (bấm không phải
cuộn) và **không tái hiện** trên ghế `Udin_Scout` hôm nay. Chưa phải `G-26`: câu đó hỏi ca
`trang-thu-cham`, và nó cần **một tab trống** trên ghế đó — `chrome://` bị `scout.navigate` từ
chối (đúng thiết kế), còn tab của Đức thì không mượn.

**Số:** suite gói 25/25 · ghim 20 khối · đột biến tay 14/14. Ghế thứ hai vẫn chưa có tên (`D2`).

## 2026-09-14 · `claude-scouter-udine` — `S-22`: tám giả thuyết chết, và một lần tôi tưởng đã xong

**`G-26` có câu trả lời: SAI.** Bản vá `S-23` hôm qua **không** chữa `S-22`. Chạy thật `vong.mjs`
trên ghế `Dummy_Scout` (tên mới Đức đặt cho ghế cũ `Udin_Scout`): nạp lại 255ms ĐẠT rồi
`LUOT_BAM_KHONG_TOI_NOI`. Hai lỗi khác nhau; `S-23` vẫn đóng.

**Dựng được bàn đo A/B trên Chrome SẠCH** — bản chép `scouter-action-reality-probe.mjs` tự mở tab,
đổi trạng thái cửa sổ, gắn/thả gỡ lỗi. Nhờ nó **năm giả thuyết chết trong một buổi** (`G-40..G-46`,
trong đó `G-41` loại luôn giả thuyết ⒜ của `S-21`): cả năm ca, cú bấm vẫn tới đủ.

**Giả thuyết của CHÍNH TÔI sáng nay cũng chết.** `G-38` (*"tab ẩn thì bấm không tới"*) là mối tương
quan tôi thấy trên ghế Đức — `G-40` đo hai chiều và nó SAI. Tức là `G-07` ngày 13/09 đúng, và Đức
đúng. Đã gạch tại chỗ, không sửa lịch sử.

**Thu hẹp được một bậc thật (`G-43`):** hỏng **theo TAB, không theo ghế**. Cùng ghế, cùng phút:
bấm ô nhập trên Udin → `:focus` 0→1; bấm nút trên trang thử → `data-chuot` vẫn 0. Trên tab hỏng,
lệnh **DOM chạy** (hỏi-điểm trả đúng phần tử) mà lệnh **Input biến mất**.

**Và một lần tôi tưởng đã xong, ghi ra vì nó đắt.** Sau `scout.reload`, chính cú bấm đó chạy được
(`data-chuot` 0→1). Tôi định kết luận *"phiên gỡ lỗi hỏng nửa, gắn lại là chữa"*. Chạy lại bốn lượt
hai chiều: **không tới cả bốn**, kể cả ngay sau khi gắn lại. **Một lượt xanh không lặp lại được
thì không phải bằng chứng** — nó chỉ nói lỗi **CHẬP CHỜN** (1/7), đúng mô tả gốc 12/09. `G-45`.

**Sửa một chỗ dễ bỏ qua:** câu gợi ý in ra lúc lỗi vẫn hỏi *"cửa sổ Chrome có đang hiện không?"* —
đúng cái giả thuyết `G-41` vừa đo và bác. Câu đó nằm ngay chỗ người ta đọc khi đang bí, nên nó sẽ
lái mọi phiên sau vào vết cũ. Nay nó kể tên tám giả thuyết đã chết và trỏ thẳng sang sổ.

**Việc kế, và nó cần đúng một cú bấm của Đức:** `G-47` — biến chưa thử là **tab đang hoạt động** so
với **tab nền**, riêng Chrome của Đức (Chrome sạch không tái hiện). Khớp 6/7 quan sát. Máy chờ
`scratchpad/cho-tab-hien.mjs` đang chạy: Đức bấm vào tab `127.0.0.1:8642` là nó tự bấm lại và đo.

## 2026-09-14 · `claude-scouter-udine` — `scout.grab`: URL ký sẵn không ra khỏi trình duyệt

**Đức chốt `S-24` đường ⒜.** Ảnh của trang thật nằm sau **URL ký sẵn**; lõi ĐỌC cắt query khỏi
mọi `src`/`href` nên `scout.fetch` chỉ nhận nửa URL và ăn 403. Hai đường chữa tồi là nới lớp che
(token vào nhật ký, vào đĩa) hoặc bỏ việc. Đường thứ ba: **URL đọc ở trong, dùng ở trong, chết ở
trong.**

`input.grabUrl` (lõi ghi) đọc `src`/`href` của **đúng một** phần tử, giải theo `baseURL`, chỉ
http(s). **Không lệnh Bridge nào ánh xạ tới nó** — nó trả URL đầy đủ, nối ra dây là phát chữ ký ra
ngoài (`GR9` canh). `scout.grab` (lõi seed) gọi nó trong máy, tải tệp, trả **byte**; khối trả về
**không có trường `url`**, chỉ `source.masked` = gốc + đường dẫn (`GR7` canh). Một lượt = **một**
đơn vị ngân sách ghi. Thêm `DOM.getAttributes` vào danh sách CDP đường ghi — chỉ đọc; `Runtime.*`
vẫn đóng.

**Ba danh sách ghim + README + số method đều ĐỎ cho tới khi sửa tay** — đúng thiết kế: thêm một
method thì không có đường nào trôi qua im lặng. Con `P1` của bộ đột biến cũng ĐỎ vì số đường vào
phanh 2→3; đó là một phép ĐẾM, không phải hằng số cho đẹp.

**Đo:** ghim mới 11 khối · suite **26/26** · đột biến **128/128 giết được, 0 sống sót**.
**CHƯA CHẠY THẬT** — và bài học của chính ngày hôm nay là đừng tin điều đó: `lay-anh.mjs` cũng
từng xanh trọn rồi ngã ở lượt gọi thật đầu tiên. Việc kế `T13` nối adapter sang grab rồi chạy.

**Lộ trình viết lại** (`docs/CAPABILITIES.md` §5) và `CHUOI-VIEC.md` dựng lại quanh việc còn lại:
T13 (không chờ ai) · T14 `S-22` · **D3** — câu hỏi mới cho Đức: có mở `scout.focus` không. Nếu
`G-49` đúng thì không có nó, Scouter **không tự chạy được**, vì mọi lượt ghi phụ thuộc vào việc
con người vừa nhìn tab nào.

## 2026-09-14 · `scouter-review` — hai câu đóng, và một lộ trình xoay quanh mốc ĐÓNG BĂNG

**Đức đặt lại đích:** *hoàn thiện nốt Scouter, rồi mới tách Udin Optic ra — để sau đó không phải
sửa sâu vào Scouter nữa.* Lộ trình cũ đi ngược: nó cho tách ở `P3`, **trước** khi mở `O8` `I4`
`I9`, tức là đã hẹn sẵn ba lượt mở lại Scouter sau khi tách.

**Giá của một method thêm sau khi tách, đo thật trên `scout.grab`:** sáu chỗ phải sửa tay
(`ACTION_NAMES` · `WRITE_CDP_METHODS` · `METHOD_REGISTRY` · ba danh sách ghim · bảng và **số đếm**
trong `README` · số đột biến), cộng một lượt audit và một lượt Đức nạp lại extension. Nên `§5.2`
nay là một **DANH SÁCH ĐÓNG BĂNG**: `O8` `I4` `I9` (+`I5` `I6` `I7` bảo hiểm trang thứ hai) phải
xong **trước** khi tách. `I8` kéo thả nằm NGOÀI — Udin không cần nó. Tách lùi `P3 → P4`.

**`D3` `scout.focus` — Đức trả lời KHÔNG:** cửa sổ extension chạy ẩn bên dưới. Không phải rủi ro:
`G-40` `G-41` `G-42` đã đo tab nền · cửa sổ thu nhỏ · tab chưa từng hiện đều **nhận đủ** cú bấm.

**`S-22` đóng bằng LỜI KHAI, không bằng bản vá.** `README` khai ba method ghi hứa *"đã bắn sự
kiện thật vào đúng điểm của đúng phần tử"* và **không** hứa *"trang đã nhận"*; adapter tự kiểm
bằng trang — `W1` `W2` trên Udin đã làm thế và ĐẠT. Lý do dừng điều tra là **chi phí, không phải
đã hiểu**: cùng câu hỏi *"tab ẩn"* mở **năm lần** (`G-07` `G-38` `G-40` `G-42`, rồi `G-47` `G-49`),
bốn lần SAI, và khối *Kết luận* của `GIA-THUYET.md` đã ghi **"đừng thử lại"** trước lần thứ tư.
Sổ làm đúng việc của nó; tôi không đọc lại sổ của chính mình. `G-47` `G-49` nay ghi **RÚT**, và
luật mới: **mở lại một giả thuyết đã `SAI` phải có DỮ KIỆN MỚI** — `grep` sổ trước khi ghi `G-`.
Đường chưa thử duy nhất ở `G-50` (Chrome đông cứng renderer tab nền), ghi để **khỏi nghĩ lại**,
không phải để mở chiến dịch thứ sáu.

**Soát tổ chức bảng năng lực — ba khuyết tật:** không dòng mã nào trong repo đọc `CAPABILITIES.md`
nên số đếm gõ tay và **không cổng nào đỏ** (nợ `T17`) · tám cách viết cho ba trạng thái, gộp còn
năm · `O11` mang mã nhóm **A** mà nằm trong nhóm **D**.

**Câu chặn duy nhất còn lại đổi thành `Q1`:** Đức chốt chính sách che `de-xuat-chat-v1`. Nó chặn
`O8` — mục đắt nhất của danh sách đóng băng — và `scout.grab` đã chạy **trên** nó rồi mà chưa ai ký.

## 2026-09-14 · `scouter-review` — `ADR-0006` ký chính sách che, và `T13` đi bằng `scout.grab`

**Đức chốt `Q1` đường ⒝ → [ADR-0006](adr/0006-chinh-sach-che-va-cua-hep-doc-chu.md).** Chính sách
che `de-xuat-chat-v1` — chạy trong mã suốt bảy ngày mà **chưa ai ký** — nay được phê duyệt
nguyên bản, kèm **một cửa hẹp**: `scout.text` trả chữ của **MỘT** phần tử khớp selector, không
cả trang, không `outerHTML`, có trần ký tự, và selector khớp nhiều phần tử thì từ chối.
Điều khoản *"không trả chữ"* nay đọc là **"không trả chữ hàng loạt"** — thứ được bảo vệ là
**khối lượng**: đọc chữ một nút vừa chỉ đích danh là đủ để tự kiểm việc mình vừa làm; đọc
`innerText` của `body` là hút cả trang, gồm cả tab khác cùng hồ sơ. Kéo theo: `O8` hết chặn
(mở `T18`), và `scout.grab` thôi đứng trên một luật chưa ký.

**`T13` — mã xong, còn đúng một lượt chạy thật.** `lay-anh.mjs` không còn lượt gọi `scout.fetch`
nào. Chỗ gợn thật không nằm ở chỗ đổi tên method: grab đòi selector khớp **đúng một** phần tử,
mà trang ra **8 nút DOM cho 4 ảnh**. Adapter **không đoán** `:nth-of-type` — nó dựng bốn ứng
viên theo độ bền giảm dần (`#id` › `[data-testid]` › `[alt]` › `[src^=]`), **hỏi lại trang từng
cái** bằng `scout.query` (đọc, không tiêu trần ghi), lấy cái đầu tiên khớp đúng một, và không
cái nào duy nhất thì **ĐỎ kèm danh sách đã thử**. Giá trị thuộc tính có `"` hay `\` thì **bỏ ứng
viên đó** thay vì thoát chuỗi cho khéo: một selector thoát sai không báo lỗi, nó lặng lẽ tải
nhầm ảnh.

**Đo:** ghim `15 → 21` khối · suite **26/26** · đột biến **128/128, 0 sống sót**. Bộ đột biến của
repo **không chạm tới adapter**, nên bốn con làm tay: tin ứng viên đầu tiên không hỏi lại · nhận
`>= 1` thay vì `=== 1` · bỏ phép lọc dấu nháy · ảnh biến mất thì bỏ qua thay vì ĐỎ — **cả bốn
giết được**. Máy giả của `lay-anh-smoke` nay **có bộ khớp selector thật** (bốn dạng ứng viên),
không gật đầu với mọi chuỗi — đó là chỗ vá lại bài học `fake-encodes-my-belief` của hôm qua.

**Chặn bởi `H1`, một lượt bấm của Đức:** `system.capabilities` trên ghế `Dummy_Scout` khai **17**
method — extension chưa nạp `scout.grab`. Cộng công tắc ghi (grab là đường ghi, mỗi ảnh tiêu
**một** đơn vị trần 200). Một lượt này mở được cả `T13` lẫn `T15`.

## 2026-09-14 · `scouter-review` — `scout.grab` chạy thật lần đầu: ba chặng ĐẠT, `W3` vẫn CHƯA

Đức nạp lại extension + bật công tắc ghi (`H1` xong; Bridge nay khai **18** method).

**ĐẠT trên trang thật:** phép chọn selector của adapter — `alt` **trùng 4 lần** trên trang nên bị
loại đúng, rơi xuống `[src^=]`, khớp **1** · grab tới được mạng · `scout.type` + `scout.click`
gửi được prompt mới (Udin bắt đầu chạy). **KHÔNG ĐẠT:** chưa ảnh nào xuống đĩa.

**Bốn thứ đo được, ghi thành `G-51`..`G-56`:**

⑴ **URL ký sẵn hết hạn sau 900 giây** (`G-51`). Mọi ảnh trên trang là của 13/09, cách lượt đo
~100.800 giây → grab trả **403**, và đó là câu trả lời ĐÚNG. Trình duyệt vẫn hiện chúng vì
**cache**, nên nhìn màn hình thì tưởng còn sống. Ràng buộc cứng: **`W3` phải chạy ngay sau `W2`**,
không có chuyện "thu kết quả sau".

⑵ **Lượt chạy thật bắt một lỗi mà 23 khối ghim không bắt được** (`G-53`) — lần thứ hai trong hai
ngày. `scout.query` trả `src` kèm dấu `…` mà lõi đọc gắn vào để BÁO đã cắt query, nên nó **không
phải tiền tố** của `src` trên trang: `[src^="…"]` khớp **0**. Máy giả của tôi trả `src` sạch nên
mọi khối xanh trên một bản mã không bao giờ tải được ảnh. Đã vá hai chỗ (tiền tố selector +
`tenFile`) và thêm khối ⓥ mang **đúng hình dạng thật của trang** — khối duy nhất ép đi tới ứng
viên `src` rồi thành công, nên là khối duy nhất giết được con đột biến đó.

⑶ **`alt` khớp 4 phần tử, không phải 1** (`G-54`). Kế hoạch ban đầu ở `CHUOI-VIEC` định dùng
`:nth-of-type` — nó sẽ **tải nhầm ảnh mà không ai biết**. Thứ cứu chỗ này là phép *hỏi lại trang
từng ứng viên* chứ không phải một selector khéo hơn.

⑷ **Trần 300s của `gui-prompt` vứt mất một lượt đã tiêu tiền** (`G-55`): adapter bỏ cuộc, Udin
chạy tiếp **>17 phút**, `W3` không bao giờ chạy. *Quá giờ* và *hỏng* là hai câu khác nhau — gộp
chúng thì mỗi lượt chậm là một lượt mất trắng. Thành **`T22`**, và nó **chặn `T13` + `T15`**:
chạy lại nguyên trạng chỉ tiêu thêm credit rồi ngã đúng chỗ cũ.

Thêm: `scout.shot` trên trang này trả `TRANSPORT_DISCONNECTED` hai lần liền trong khi `scout.query`
cùng lúc vẫn chạy (`G-56`, chưa đào). Và **không đọc được chữ trên trang nên không biết Udin đang
báo gì** — một lý do rất cụ thể cho `O8` / `T18`.

**Đo:** ghim W3 `15 → 23` khối · suite **26/26** · đột biến repo **128/128** · sáu con đột biến
làm tay trên adapter, **cả sáu giết được**.

## 2026-09-14 · `scouter-review` — bốn việc đóng, và ba lỗi chỉ lượt chạy thật mới lộ

**`T22`** — *quá giờ* ≠ *hỏng* (`G-55`). Trần lên **900s** = đúng `X-Amz-Expires` của ảnh Udin:
quá hạn đó thì ảnh có lấy cũng 403, nên đây là trần **tự nhiên** chứ không phải một con số đẹp.
Hết trần ném `UdinDangChay` mang theo **tập ảnh trước lúc gửi** — không có nó thì không nối lại
được. Tách `choXong(truoc)` để bám vào một lượt đang chạy mà **không gõ, không bấm** (bấm lúc đó
là bấm *Stop*, giết chính lượt đã tiêu tiền). CLI `--noi-lai`.

**`T18` — `scout.text` ([ADR-0006])**, và nó **chạy thật** sau `scout.reload` (19 method, `G-57`):
đọc màn chắn Udin ra *"User Limit Reached…"*, `div` khớp **146** thì từ chối. Ba khoá: khớp phải
đúng một · trần 5.000 ký tự và nói thật khi cắt · chỉ chữ đi ra. Bỏ hẳn `<script>`/`<style>`:
chữ trong đó là **mã**, trả nó dưới danh nghĩa "chữ" là lách chính sách bằng một cái tên khác.
Sửa luôn một **lời khai SAI đi ra trên MỌI lượt đọc**: `redactionNote` vẫn ghi *"Đức chưa chốt"*
và *"không trả text node"*.
`G-58` đo được giới hạn thật của nó: `body` Udin chỉ **1.390 ký tự** nên ra hết trong một lượt —
trần **không** giữ được "khối lượng". Giá này đã khai trước trong ADR; không siết thêm, vì
`scout.shot` vốn đã trả cả trang dưới dạng ảnh.

**`I4` — `scout.clear`.** Phím `A` và phím bổ trợ `Ctrl` **gõ cứng trong lõi ghi**. Không mở
tham số `modifiers` cho `scout.key` dù đó là đường ngắn hơn: `Ctrl` + phím tuỳ ý chạm tới lệnh
của **trình duyệt** (`Ctrl+W` đóng tab), không chỉ của trang. Một thao tác có TÊN, không phải
một máy gõ phím đa năng. Giới hạn đã khai: macOS dùng `Cmd+A` nên ở đó không xoá được.

**`T17`** — ghim bảng năng lực vào sự thật, hai chiều. Lượt chạy **đầu tiên** bắt được bốn chỗ
thật: `scout.clear` vừa thêm vào mã + README mà **quên bảng** · hai ô dùng từ vựng ngoài danh
sách · ba con số gõ tay lệch · `N2` khai ĐÃ CHỨNG MINH mà không trỏ vào đâu.

**`W1` vá một khuyết tật thật:** ngay sau `scout.navigate`, cả màn chắn lẫn ô prompt đều chưa có
trong DOM, nên `quaManCho` đọc *"không màn chắn"* rồi trả về **sẵn sàng** — chặng sau ngã với
*"thấy 0 nút Send"*. **Vắng mặt cái chắn không phải có mặt cái sẵn sàng** (cùng họ `S-18`).

**Đo:** suite **29/29** · đột biến repo **128/128** · **16 con đột biến làm tay** trên bốn mục
mới, cả 16 giết được. **Chặn duy nhất còn lại là Udin đang hết chỗ** — vòng chờ tự chạy, không
cần ai bấm.

## 2026-09-14 · `scouter-review` — tìm ra một LỖI NỀN mà mọi thứ khác đang đứng trên

**`S-25`: Bridge khai dối cỡ phong bì.** Nó khai `max_envelope_bytes: 1.048.576` ra ngoài dây;
thực tế phong bì lớn làm **đứt kết nối** — không thành một lỗi có tên, mà thành
`TRANSPORT_DISCONNECTED` rồi `EXTENSION_OFFLINE` cho tới khi extension tự nối lại. Đây là nguyên
nhân chung của `G-56` (`scout.shot` chết hôm nay dù 13/09 còn chạy) và của **mọi** lượt
`scout.grab` trả thân thật. Chốt chặn cỡ ở đường gửi ra đo theo `MAX_ENVELOPE_BYTES` nên nó
**không bao giờ** bắt được ca này. Chữa gốc đụng `_shared/bridge-host` — lõi dùng chung với ba
gói đóng băng → **câu của Đức**.

**Và một kết luận SAI của tôi, sửa trong cùng ngày.** Lần đo đầu trông như một NGƯỠNG sạch
(74.668 base64 chạy · 85.336 đứt) và tôi đã viết nó ra. Đo lại **cùng một cỡ nhiều lượt**:
65.536 chạy · 65.536 **đứt** · 65.536 chạy. Không phải ngưỡng — **chập chờn**. *Mỗi cỡ thử một
lần thì một lỗi chập chờn luôn trông như một ngưỡng* (`G-63`).

**`G-62`: header `Range` giết service worker.** Chia đôi: bỏ đúng header đó, giữ nguyên mọi thứ
khác → grab chạy. Nên đường "lấy theo khúc bằng `Range`" chết (`G-61` SAI). Thay bằng: tải cả
tệp rồi **chỉ mã hoá khúc này** — không giữ trạng thái, service worker bị giết giữa chừng cũng
không hỏng loạt. Khúc 64 KiB + **thử lại có trần 3 lượt**, chỉ bắt hai mã lỗi đứt dây. Ghi rõ
là **vật che**, không phải bản vá. Giá: một ảnh 746 KB = **16 khúc** = 16 đơn vị trần ghi.

**`O12` — Đức nêu Zoom cho layout artboard (Udin, Vizcom), và nó vào danh sách đóng băng.**
Hai cái được, cái thứ hai mới là lý do thật: ⑴ ảnh khung nhìn phủ cả artboard mà **ít byte hơn**
ảnh cả trang — nên `captureBeyondViewport` **không** thay được nó chừng nào `S-25` còn đó
(`G-66`); ⑵ ứng dụng canvas có thể **vẽ thêm phần tử** khi thu nhỏ, tức Scouter *nhìn được nhiều
hơn*. Vế ⑵ ghi **CHƯA** (`G-65`): số có tăng (`div` 146→224) nhưng giữa hai lượt đo có một lượt
nạp lại trang **và** một loạt ảnh mới — ba biến đổi cùng lúc thì con số không nói được gì.

## 2026-09-14 · `scouter-review` — Đức uỷ quyền, và gốc `S-25` tìm ra là MỘT DÒNG

**Uỷ quyền ([ADR-0007](adr/0007-nhom-nhin-va-di-lai-va-uy-quyen-mo-rong.md)).** Đức trao quyền tự
quyết cho `S-25` · `I9` · `I5` `I6` `I7` · `O12`, theo hướng *"mở rộng năng lực để cover nhiều
use case hiện tại và sau này"*, và giữ `I4`. **Biên của uỷ quyền ghi ngay trong ADR** — nó không
gồm nới bảo vệ, `Runtime.*`, toạ độ/URL/mã phím tự do từ ngoài, hay quyền `manifest` mới. Uỷ
quyền là *khỏi hỏi từng nước đi bên trong*, không phải *khỏi giữ luật*.

**Đức gộp `I5` `I6` `I7` `O12` vào một chữ — *Navigation* — và cách gộp đó đúng hơn bảng đang
chia** (cuộn ở nhóm "tay người", thu phóng ở nhóm "nhìn"). Bốn thứ trả lời **cùng một câu**:
*Scouter đang nhìn phần nào của trang?* — mà `usable` đứng trên câu đó, nên mọi lượt bấm cũng vậy.
Hệ quả bắt buộc, ghi thành luật của chặng: **`scout.view` (ĐỌC) đi TRƯỚC mọi lệnh đổi tầm nhìn.**
Không đọc lại được thì một lượt cuộn là một lệnh ghi **không có dấu kiểm** — đúng cái `README` đã
khai sau `S-22`. Nó cũng trả một món nợ: lõi GHI hôm nay tự đọc độ cuộn bằng mẹo hộp `:root`
(`G-24`).

**`S-25` — gốc tìm ra, và đã CHỨNG MINH (`G-67`), không phải suy đoán.**
`_shared/bridge-host/websocket-core.mjs:76` — `if (!fin) throw`. Đưa thẳng một tin cắt hai mảnh
đúng chuẩn vào `createFrameDecoder` thì nó **ném ngay ở mảnh đầu**. Chrome tự cắt mảnh khi tin
vượt ~64 KiB, nên một câu trả lời hơi lớn **làm đứt kết nối** thay vì trả một lỗi có tên. Khớp cả
bốn triệu chứng: ngưỡng ~65 KB · **chập chờn** (Chrome cắt hay không tuỳ nhịp đệm) · `scout.shot`
chết · mọi lượt `grab` trả thân thật chết.

**Đó là một ca CHƯA VIẾT, không phải một lớp bảo vệ** — phân biệt hai thứ đó là điều kiện để sửa
mà không phạm luật *"không nới bảo vệ cho cổng xanh"*. Bản sửa thuần THÊM VÀO. Nhưng lõi này dùng
chung với **ba gói đóng băng**, nên phép ghim quan trọng nhất không phải "mảnh nối ghép được" mà
là **"tin KHÔNG cắt mảnh cư xử y hệt như trước"**.

**Lộ trình ba chặng** ở `CHUOI-VIEC.md`: ① sửa nền (`T24` `T31`) · ② nhìn & đi lại (`T25`→`T30`,
`T29`) · ③ đóng băng rồi tách (`T8` `T9` `T21`). Mỗi chặng có câu *đóng khi*; chặng ④ chỉ đóng
khi các `W` của Udin ĐẠT **từ gói mới mà không sửa một dòng Scouter nào**.

## 2026-09-14 · `claude-scouter-udine` — một dòng, và cả nhóm "nhìn & đi lại"

**Gốc của `S-25` là MỘT DÒNG** (`G-67`): `_shared/bridge-host/websocket-core.mjs` ném ở **mọi
mảnh nối** WebSocket, mà Chrome **tự cắt mảnh mọi tin vượt ~64 KiB**. Nó không chặn một ca hiếm
— nó chặn đường đi bình thường của mọi câu trả lời hơi lớn. Đó là một ca **chưa viết**, không
phải một lớp bảo vệ, nên bản sửa thuần thêm vào; phép ghim đắt nhất là *tin KHÔNG cắt mảnh còn
y hệt không*, so thẳng với bản gốc trong gói đóng băng.

**Sửa lại một câu tôi ghi SAI trong [ADR-0007](docs/adr/0007-nhom-nhin-va-di-lai-va-uy-quyen-mo-rong.md):**
ba gói đóng băng **không dùng chung** file ấy — mỗi gói giữ một bản sao riêng. Rủi ro nhỏ hơn
tôi đã nói với Đức, và ba bản sao kia **vẫn mang con bệnh** (để nguyên: chúng đang đóng băng).

**Cả chặng ② trong một lượt** (Đức uỷ quyền): `scout.view` (ĐỌC, đi trước) · `scout.scroll` ·
`scout.hover` · `scout.click` nhận `button`+`click_count` · `scout.history` · `scout.shot` nhận
`full_page`+`scale`. Trần khúc `scout.grab` về 512 KiB. `O12` **xong nửa ⑴**; nửa ⑵ là câu hỏi
KIẾN TRÚC, không phải thiếu tham số — ghi ở `G-69` và ở mục *"Vì sao không có `scout.zoom`"*
của ADR-0007. Tôi cố ý **không** dựng `scout.zoom` để rồi nó nói dối.

**Hai cái đỏ có sẵn ở HEAD** mà cổng không thấy, tìm ra vì lần này chạy `npm test` của **cả
repo**: ba file Scouter mang CRLF **trên đĩa** (trong git vẫn LF), và `human_action` thiếu
**động từ** sau `@Đức:` nên nó rơi khỏi bảng *"Đức cần làm"* im lặng. Cả hai đã sửa. Bài học cũ
lặp lại: cổng `Test xanh` chỉ chạy suite của VÙNG mình.

**Số.** Suite gói 32/32 · `npm test` cả repo XANH · đột biến **141/141, 0 sống sót**.

**Nợ nói thẳng:** sáu dòng năng lực đổi sang `CÓ` trong một lượt và **không dòng nào** sang
`ĐÃ CHỨNG MINH`. `T32` sinh ra để trả nó, và nó cần Đức nạp lại extension.
