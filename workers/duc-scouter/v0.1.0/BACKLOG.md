# BACKLOG — Duc Scouter (`S-xx`)

> Việc còn mở của gói này. Mỗi mục PHẢI khai `đóng khi:` — không khai được điều kiện đóng thì
> mục đó chưa đủ chín để ghi. Mới nhất thêm xuống cuối. Đóng mục bằng cách **thêm một dòng ở
> cuối**, đừng sửa khối cũ.
>
> Nhãn nguồn: [ĐO] máy đếm · [ĐỌC] đọc thẳng code · [DÒ] tìm theo tên (phải kiểm lại trước khi
> hành động).

## P1 — chặn đường

- **S-01** · Bấm và gõ như tay người: mở nhóm lệnh `Input` của giao thức debug
  (`dispatchMouseEvent` · `dispatchKeyEvent` · `insertText`). Đây là năng lực xếp hạng **số một**
  của bảng kiểm kê, và phép đo ① ngày 06/09 đã chứng minh đường đó dùng được (`isTrusted: true`).
  Chưa làm trong lượt này vì việc ② của `BRIEF-SCOUTER-SEED-01` chỉ gồm ba khả năng nền.
  **[ĐO]** `scripts/scouter-input-trust-probe.mjs`, ĐẠT trên Chrome 152.
  · **đóng khi:** có method `scout.click` / `scout.type` trong từ vựng, mỗi cái một phép ghim,
  và đột biến kiểm có con canh đường ghi mới.

## P2 — nợ đã biết

- **S-02** · Nối lại Bridge đang chạy bằng `setTimeout` trong service worker, mà service worker
  ngủ thì hẹn giờ chết theo. Ba worker kia dùng `chrome.alarms`, nhưng quyền `alarms` **không**
  nằm trong danh sách ADR-0009 duyệt, và thêm quyền là việc phải hỏi Đức (`AGENTS.md` gốc mục 2).
  Đường nâng đã chừa sẵn: tiêm `options.schedule` vào `createTransport`.
  **[ĐỌC]** khối đầu `scripts/scouter-transport-loopback.mjs`.
  · **đóng khi:** Đức chốt cho thêm quyền `alarms`, manifest khai, và bộ hẹn giờ nối lại đi qua
  `chrome.alarms` — hoặc Đức chốt là KHÔNG thêm, và mục này đóng bằng một dòng ghi lý do.

- **S-03** · Tên file còn mang chữ `observer`: `observer-engine.js` · `scripts/observer-probes.mjs`
  · `scripts/observer-mutation-check.mjs` · `tests/observer-*-smoke.mjs`. ADR-0009 đã đổi tên
  Observer thành Scouter từ 06/09. Không đổi trong lượt này vì nó làm hỏng 14 mỏ neo đột biến và
  làm mọi diff của lượt xây khó đọc — đúng lý do ADR-0013 nêu khi bàn chuyện chuyển chỗ.
  · **đóng khi:** đổi bằng `git mv` (không copy-rồi-xoá), 14 mỏ neo của
  `observer-mutation-check.mjs` khớp lại đủ, và `npm run scouter:mutation` vẫn 0 con sống sót.

- **S-04** · `scout.reload` trả lời rồi mới nạp lại sau **một độ trễ cố định 250ms**, chứ không
  chờ xác nhận khung đã rời socket. Muốn chắc thì transport phải có móc "đã gửi xong".
  **[ĐỌC]** `RELOAD_DELAY_MS` trong `scripts/scouter-seed-core.mjs`.
  · **đóng khi:** có một lượt reload thật bị mất phản hồi (thì làm móc), hoặc chạy đủ nhiều lượt
  mà không mất lần nào (thì đóng bằng một dòng ghi số lượt đã đo).

## ĐÓNG · S-01 (2026-09-07, `claude-scouter-s01`) — Scouter bấm và gõ như tay người

Điều kiện đóng đã khai: *"có method `scout.click` / `scout.type` trong từ vựng, mỗi cái một
phép ghim, và đột biến kiểm có con canh đường ghi mới."* Cả ba vế đạt, và nhiều hơn một chút:
ba method chứ không phải hai (`scout.key` tách ra vì Enter/Tab đi chung với chữ là chỗ gửi
biểu mẫu ngoài ý muốn).

**Đo được:** đột biến kiểm **42/42 mỏ neo khớp, giết 42, sống sót 0** (trước S-01: 24/24) ·
suite gói **6/6** · nối thật với máy chủ Bridge **ĐẠT 7/7**.

**Hình dạng đã chốt, đừng quyết lại:** đường ghi là một **lõi riêng**
(`scripts/scouter-actions-core.mjs`) với danh sách method CDP riêng, KHÔNG phải thêm `Input.*`
vào lõi đọc. Nhờ thế `observer-probes.mjs` vẫn chứng minh được là read-only — vì kênh ghi không
có mặt trong file đó, không phải vì ai hứa.

## MỞ · S-05 (2026-09-07, `claude-scouter-s01`) — chưa có phanh nào cho đường ghi

Từ hôm nay Scouter **bấm được**. Ba gói `duc-auto-*` đều có chế độ phát triển kèm trần chạy thử
(`dev-trial-core.js` · `assertTrialDevMode`) đứng giữa AI và một lượt chạy thật; Scouter thì
chưa có gì cả — mọi lượt `scout.click` đi thẳng. Trong lượt này nó chưa nguy vì `AGENTS.md`
cấm chạy trên trang thật, mà lệnh cấm đó là **luật cho người vận hành, không phải chốt trong
code**. **[ĐỌC]** `scripts/scouter-actions-core.mjs` không có một cổng phê duyệt nào.
· **đóng khi:** đức: Đức chốt hình dạng cái phanh (công tắc chế độ phát triển như ba gói kia ·
danh sách trắng URL · hay trần số lượt bấm mỗi phiên), rồi nó thành code có phép ghim canh.

## MỞ · S-06 (2026-09-07, `claude-scouter-s01`) — bấm và gõ CHƯA từng chạy trên một trang thật

Phép đo ① ngày 06/09 chứng minh **đường** đi được (`isTrusted: true`). Nhưng ba method mới thì
mọi số đo tới giờ đều trên trang giả trong phép ghim: `DOM.getBoxModel` chưa lần nào trả về hộp
thật, và chuỗi ba khung chuột chưa lần nào chạm một nút thật. **[ĐO]** `tests/scouter-actions-smoke.mjs`
dựng trang giả; `scripts/scouter-bridge-live-check.mjs` dùng engine giả.
· **đóng khi:** lệnh: một phép đo tự dựng trang thử tại chỗ (kiểu `scouter-input-trust-probe.mjs`)
bấm và gõ qua ĐÚNG ba method mới rồi đọc lại DOM để xác nhận, chạy được và ĐẠT.

## ĐÓNG · S-02 (2026-09-07, `claude-scouter-s05`) — Đức duyệt quyền `alarms`

Đức chốt 07/09: cho thêm. `manifest.json` khai `alarms`; lưới đỡ ở `scouter-background.js` gọi
`connect()` mỗi phút. **Điều kiện đóng có sửa một chỗ so với lúc mở:** mục này viết là "bộ hẹn
giờ nối lại đi qua `chrome.alarms`", và điều đó **không làm được** — Chrome ép sàn 30 giây một
lượt hẹn, còn tầng thử-lại chạy 1s/2s/5s. Nên giữ cả hai: `setTimeout` vá lúc worker còn thức,
alarm đánh thức worker đã ngủ. Chỗ lệch này ghi vào ADR chứ không lặng lẽ coi là đã làm đúng đề.
Canh bởi: khối ⑭ của `tests/scouter-write-gate-smoke.mjs`, khối ⑭ của `tests/scouter-transport-smoke.mjs`,
con `Q1` `Q2` `R1` `R2`. Quyết định: [ADR-0001](docs/adr/0001-phanh-cho-duong-ghi-va-quyen-alarms.md).

## ĐÓNG · S-05 (2026-09-07, `claude-scouter-s05`) — đường ghi có phanh

Đức chốt 07/09: đúng khuôn ba gói `duc-auto-*` — công tắc chế độ phát triển mặc định TẮT, kèm
trần 50 lượt mỗi lần mở khoá. Chặn ở `runAction()`, cửa duy nhất ba lệnh ghi đi qua. Công tắc
chỉ bật được từ popup; không method Bridge nào bật được nó, và khối ⑩ của phép ghim đo đúng
điều đó. Đo: 12 con `P1..P12` đều bị giết · phép ghim 14 khối · live check với máy chủ Bridge
THẬT ĐẠT 8/8, trong đó khối ⑥ là chiều từ chối qua dây thật.
· **còn nợ lại, đã ghi vào ADR:** trần 50 là **con số đoán**, chưa hiệu chỉnh bằng lượt chạy
thật nào — `S-06` là lượt đo nó. Và cái phanh chặn theo **số lượt**, không chặn theo **trang**:
bật rồi thì Scouter bấm được trên bất kỳ tab nào có `target_id`. Luật "cấm chạy trên trang
thật" vẫn chưa có chốt nào trong mã cưỡng chế.

## ĐÓNG · S-06 (2026-09-07, `claude-scouter-s06`) — ba lệnh ghi đã chạy trên trang thật

`scripts/scouter-action-reality-probe.mjs` — **phép đo ②**. Nó nạp CHÍNH
`scouter-actions-core.mjs` (chép từ đĩa, in mã băm vào bản báo cáo) vào một extension thử rồi
gọi `runAction()` thật trên một trang tự dựng. **ĐẠT 11/11 trên Chrome 152.**

Ba ca một trang giả không thể có, và cả ba đều xanh: bấm nút THỨ HAI trong hai nút chữ giống
hệt nhau → đúng nút thứ hai kêu · nút dưới 1800px khoảng trống → cuộn 1288px rồi bấm trúng ·
bấm ngược lên nút đã trôi khỏi màn hình → cuộn lên, bấm trúng. Đây là chỗ hệ toạ độ của
`DOM.getBoxModel` và của `Input.dispatchMouseEvent` có thể lệch nhau, và nó **không lệch**.

**Phép đo tự chứng minh nó biết đỏ.** Bẻ lõi ba kiểu (lệch toạ độ y 52px · bỏ cuộn tới · bỏ chốt
khớp-đúng-một): mỏ neo khớp 3/3, giết được 3/3, và mỗi con đỏ ĐÚNG tiêu chí của nó. Không có
bước này thì "ĐẠT 11/11" chỉ chứng minh phép đo chạy xong, không chứng minh nó đo gì.

Luật chấm có phép ghim riêng không cần trình duyệt: `tests/scouter-action-reality-smoke.mjs`,
11 tiêu chí + 15 ca hỏng, mỗi ca phải đỏ đúng tiêu chí của nó.
· **còn nợ lại:** ba thứ CHƯA đo, ghi thẳng trong bản báo cáo của phép đo — trang có khung lồng
(iframe) · trang đổi tỉ lệ hiển thị · trang thật của nhà cung cấp. Và **trần 50 vẫn chưa hiệu
chỉnh**: phép đo này chỉ tốn 6 lượt ghi, nên nó không nói được gì về con số 50.

## MỞ · S-07 (2026-09-07, `claude-scouter-s05`) — suite của gói đỏ vì CÂY LÀM VIỆC của lane khác

Khối ⑫ của `tests/scouter-transport-smoke.mjs` đọc `bridge-pairing-core.js` ở **cả ba gói hàng
xóm** và đòi ba bản giống hệt từng byte. Chốt đó đúng và đáng giữ — nó bắt được lúc hợp đồng
ghép cặp trôi. Nhưng nó đọc **cây làm việc**, không đọc HEAD, nên hễ một lane đang sửa dở gói
của họ là suite của Scouter đỏ vì lý do ngoài Scouter. Gặp thật 07/09: đỏ một lượt, chạy lại
ba lượt xanh cả ba, và nguyên nhân là lane `claude-b36-vaA` đang sửa gói ChatGPT.

Cái giá: một phiên Scouter gặp đỏ này sẽ đi tìm lỗi trong vùng của mình và không thấy gì.
**[ĐO]** `git stash list` trống mà `node tests/scouter-transport-smoke.mjs` lúc đỏ lúc xanh.
· **đóng khi:** khối ⑫ đọc ba file đó từ **HEAD** (`git show HEAD:<đường dẫn>`) thay vì từ đĩa —
hoặc, nếu quyết giữ nguyên, thì câu báo lỗi phải nói thẳng "có thể là lane khác đang sửa dở,
chạy lại trước khi đi tìm lỗi" để phiên sau không mất buổi chiều.

## ĐÓNG · S-07 (2026-09-07, `claude-scouter-s06`) — đọc HEAD, không đọc đĩa

Mở rồi đóng trong cùng ngày vì nó chặn chính lượt làm việc đang chạy: đột biến kiểm không khởi
động được, báo *"phép ghim đã đỏ sẵn khi CHƯA đột biến"*. Khối ⑫ nay lấy ba file qua
`git show HEAD:<đường dẫn>`. Ngữ nghĩa vì thế cũng ĐÚNG hơn bản cũ: hợp đồng ghép cặp là thứ đã
**commit**, không phải thứ đang nằm dở trong cây làm việc của người khác.

Không có bản dự phòng đọc đĩa khi `git` hỏng — nó ném lỗi kèm câu chỉ thẳng về mục này. Một bản
dự phòng lặng lẽ đổi ngữ nghĩa là đúng cách phép ghim này mất tác dụng lần nữa.
Đo: chạy 3 lượt liên tiếp lúc lane khác đang sửa dở → xanh cả 3 (trước đó đỏ).

## MỞ · S-08 (2026-09-07, `claude-scouter-s06`) — icon mới chưa ai nhìn thấy trong Chrome thật

`manifest.json` khai bốn cỡ icon (chữ S tối trên nền vàng, sinh bằng `scripts/make-icons.mjs`).
Phép ghim ⑮ của `tests/scouter-write-gate-smoke.mjs` chỉ chứng minh **manifest trỏ tới file có
thật và đủ bốn cỡ** — nó không mở Chrome, nên không nói được là Chrome chịu nạp bốn file PNG đó.
Bốn file do một bộ đóng gói PNG tự viết sinh ra (không dùng thư viện), nên khả năng sai nằm ở
chỗ khác thường: một khối PNG hỏng thì Chrome lặng lẽ quay về mảnh ghép xám chứ không báo lỗi.
**[ĐỌC]** `scripts/make-icons.mjs`, phần `dongGoiPng`.
· **đóng khi:** Đức nạp lại extension và xác nhận thấy chữ S vàng trên thanh công cụ — hoặc một
phép đo tự dựng nạp extension qua `Extensions.loadUnpacked` (kiểu phép đo ②) rồi đọc `icons`
trong `chrome.management.getSelf()` và xác nhận Chrome không rơi về icon mặc định.

## ĐÓNG · S-08 (2026-09-07, `claude-scouter-s06`) — Đức xác nhận thấy icon

Đức xem và báo *"Icon mới đã ok, tôi thấy ko có issue gì lớn."* Bốn file PNG do bộ đóng gói tự
viết sinh ra được Chrome nạp bình thường — đó là điều kiện đóng đã khai.

## ĐÓNG · S-09 (2026-09-07, `claude-scouter-s06`) — vỏ giao diện đổi sang bảng bên

Mở và đóng trong cùng lượt vì Đức hỏi thẳng và chốt luôn. Quyết định + lý do đầy đủ:
[ADR-0002](docs/adr/0002-vo-giao-dien-la-bang-ben-khong-phai-popup.md). Ba file `popup.*` đổi tên
bằng `git mv`; manifest khai `side_panel`, bỏ `default_popup`, thêm quyền `sidePanel`.
Đo: phép ghim gói 8/8 · đột biến **61/61, sống sót 0** (thêm `Q3` `Q4` `R3`) · live check ĐẠT 8/8.

**Một bài học ghi ra vì nó tổng quát hơn lượt này:** con `R3` sống sót lượt đầu — nó không xoá
lời gọi `setPanelBehavior` mà **bọc `if (false)` quanh nó**, nên phép ghim soi "chuỗi có mặt
không" thì mù. Cách vá không phải chữa con đột biến mà là đổi luật ghim: **dây thật không có
nhánh chết**, và phép ghim nay từ chối mọi `if (false)` / `if (0)` / `&& false` trong
`scouter-background.js`.

## MỞ · S-10 (2026-09-07, `claude-scouter-s06`) — pilot hnx.vn: lấy dữ liệu theo ngày qua Bridge

Đức chốt 07/09: pilot thật đầu tiên là hai trang phái sinh của `hnx.vn`
(`ket-qua-giao-dich.html` · `thong-ke.html`), lấy dữ liệu **theo ngày**, ghi file xuống máy.
Phạm vi lượt đầu Đức chốt: **một tuần**. Đường ghi file: **qua Bridge**, KHÔNG thêm quyền
`downloads`.

**[ĐO 07/09]** Dữ liệu không nằm trong trang. Nó tới từ
`POST /ModulePhaiSinh/KetQuaGiaoDichV2/ListSearch_Datas` với bảy tham số, trong đó `p_date`
dạng `dd/MM/yyyy` và `p_type_sanpham` là loại sản phẩm; gọi đúng tham số thì trả về **JSON**
`{"SumTable":…,"Content":"<mảnh bảng HTML>"}`, ~231KB cho một ngày.

**Hệ quả phải nói ra: pilot này KHÔNG cần bấm một nút nào.** Năng lực đắt nhất của gói —
`scout.click` / `scout.type` / `scout.key` — không dùng tới ở đây. Cái nó cần là máy móc của
**nhóm B** trong `ROADMAP.md` (trạng thái vòng chạy · không làm hai lần · luật thử lại · danh
tính lượt), thứ tôi đã khuyến nghị hoãn hôm 07/09 với lý do *"Scouter không có hàng đợi job"* —
lý do đó nay sai.

**Một cái bẫy gặp ngay lúc đo, ghi để không ai mất buổi chiều:** đoán sai tên tham số thì
endpoint trả **200 OK kèm cả một trang HTML 43KB**, trông y hệt thành công. Ở trang này, sai
tham số không ra lỗi — nó ra một trang khác.

**[ĐO LẠI 07/09 — hai con số trên SAI, giữ nguyên bản ghi cũ để thấy nó sai ở đâu]**
Bảy tham số nay đã đo và ghi vào file (`pilots/hnx-phai-sinh/nguon-hnx.mjs`), không còn nằm
trong trí nhớ: `p_date` · `p_keysearch` · `p_orderby` · `p_ordertype` · `p_currentpage` ·
`p_type_sanpham` · `p_record_on_page`. Một ngày là **~46 KB**, KHÔNG phải 231 KB — khác biệt
này đổi kết luận, vì 231 KB nghe như sắp chạm trần 512 KiB của `scout.fetch` còn 46 KB thì
rộng gấp mười. Và ngày nghỉ **vẫn trả 200 OK + JSON hợp lệ**, chỉ khác ở chỗ không có ô dữ
liệu nào (đo: 192 ô với 0 ô) — nên "200 OK" không bao giờ đủ để kết luận đã có dữ liệu.

· **đóng khi:** lệnh: một lượt chạy lấy đủ **5 ngày giao dịch liên tiếp**, ghi ra 5 file qua
Bridge, chạy lại lượt hai KHÔNG tải lại ngày đã có, và đứt giữa chừng thì chạy tiếp được từ
ngày còn thiếu — có phép ghim dựng máy chủ giả cho cả ba tính chất đó.

## MỞ · S-11 (2026-09-07, `claude-scouter-s06`) — hai Bridge cũ vẫn nhận token trần

**[ĐO 07/09]** `bridge-host.mjs` có ba bản chép trong repo, **khác nhau cả ba** (461/451/450
dòng, ba mã băm). 11 dòng mà bản `duc-auto-chatgpt` có mà hai bản kia không có **chính là cái
bắt tay hai chiều**: máy chủ phải chứng minh nó biết token TRƯỚC khi extension đưa token ra.

Nghĩa là `duc-auto-gemini` và `duc-auto-gg-flow-video` tới hôm nay **vẫn đưa token ra ngay khi
socket mở**. Trên loopback, một tiến trình chiếm được cổng trước là lấy được token.

**KHÔNG tự sửa.** Cả hai gói đang ĐÓNG BĂNG (`.repo-structure.json` khối `frozen`), và luật
mục 1 chỉ cho đọc. Ghi ra vì nó thật và đang nằm trên máy Đức, không phải để ai đó đi vá lén.

Lõi dùng chung `workers/_shared/bridge-host/` nay **có** cái bắt tay đó, kèm phép ghim nối
thật qua socket (`bat-tay-hai-chieu.mjs`) và hai con đột biến `X3` `X4` canh nó.

· **đóng khi:** Đức chốt một trong hai — hoặc **mở băng** hai gói đó đủ lâu để chúng chuyển
sang lõi chung (rồi đóng băng lại), hoặc **ghi một dòng lý do chấp nhận rủi ro** vì cả hai chỉ
chạy trên loopback máy cá nhân. Không chốt thì mục này ở lại sổ — nó không tự hết.

## S-12 · Ngày không có phiên bị lấy lại mỗi lượt chạy

Đo được lúc chạy S-10 thật (08/09): lượt 2 báo `0 lấy mới · 7 đã có` — đúng — nhưng **ba ngày
trống vẫn bị gọi lại**, vì cơ chế nhớ là *file đã ghi*, mà ngày trống thì không sinh file nào.

Nên chạy lại cùng một khoảng ngày thì mỗi ngày lễ và ngày nghỉ đều tốn một lượt gọi, mãi mãi.
Với hai tuần là 3 lượt; với một năm sẽ là vài chục. `scout.fetch` tính vào hạn mức ghi.

**Chưa chắc là bug.** Một ngày trống hôm nay có thể được trang bổ sung dữ liệu sau, và lúc đó
lấy lại là ĐÚNG. Nên đừng vội ghi một tệp rỗng để đánh dấu — làm thế là đổi một phiền toái
nhỏ lấy một lỗi im lặng lớn hơn.

· **đóng khi:** hoặc đo được rằng HNX không bao giờ bổ sung dữ liệu cho ngày đã trống (rồi mới
ghi dấu ngày trống), hoặc Đức chốt rằng lấy lại vài lượt mỗi phiên là chấp nhận được và ghi
một dòng lý do.

## S-13 · Gọi sai tên method trả lỗi nội bộ thay vì `METHOD_NOT_FOUND`

Đo 08/09 trên Bridge đang chạy thật: gọi `khong.co.that` → `METHOD_NOT_FOUND`, gọn và đúng.
Nhưng gọi `capabilities` (thiếu tiền tố `system.`) → `INTERNAL_ERROR` với
`details.reason = uncorrelated_extension_response`. Lặp lại 3 lần, ổn định — không phải đua.

**Đã kiểm là KHÔNG nguy hiểm:** bắn đồng thời một lệnh sai tên với hai lệnh đúng thì cả hai
lệnh đúng vẫn OK. Nên phản hồi lạc không phá được lượt khác đang bay. Nó xấu mặt, không hở.

· **đóng khi:** tên method không có trong bảng trả về `METHOD_NOT_FOUND` cho MỌI tên (kèm một
phép ghim), hoặc đo được rằng `capabilities` là bí danh cũ có thật và khai nó ra cho tử tế.

## S-14 · Câu báo lỗi chỉ sai cửa: nói "popup" trong khi giao diện là bảng bên

Khi hết hạn mức ghi, `scouter-seed-core.mjs` báo *"Tat roi bat lai cong tac trong popup"*.
Nhưng Scouter không có popup — công tắc nằm ở **bảng bên** (side panel), đầu bảng, tên
*"Cho phép bấm và gõ"*. Đức gặp thật 08/09 và phải hỏi lại công tắc ở đâu.

Nhỏ, nhưng đúng loại lỗi đắt nhất với người dùng: câu hướng dẫn **chỉ sai chỗ** thì người đọc
đi tìm nhầm cửa sổ và kết luận là công cụ hỏng.

Chưa sửa ngay vì sửa xong phải nạp lại extension, mà lúc đó Đức đang cần chạy nốt 29 tệp.

· **đóng khi:** câu đó nói đúng tên cửa ("bảng bên") và đúng tên công tắc, kèm một phép ghim
so chữ trong thông báo với nhãn thật trong `sidepanel.html` — để hai bên không lệch lại lần
nữa khi ai đó đổi nhãn.

---

## MỞ · S-15 (2026-09-08, `claude-scouter-s06`) — Scouter có cùng hai lỗi đua của khối phanh

Audit độc lập ngày 08/09 tìm ra hai lỗi trong `scouter-seed-core.mjs` của gói `hnx-fetch` —
mà **khối phanh ở đó chép từ đây**, nên Scouter có y hệt:

⑴ **Phanh khẩn bị HỒI SINH.** `spendWriteBudget()` ghi `{ ...gate, used }`, tức chở theo
`enabled: true` đọc từ TRƯỚC. `Ctrl+Shift+X` rơi vào giữa lượt đọc và lượt ghi thì chính lượt
trừ ngân sách **bật lại cái công tắc vừa tắt**. Đây là hỏng đúng chỗ cái phanh phải chắc nhất,
và Scouter còn nguy hơn `hnx-fetch` vì nó có `<all_urls>` và ba lệnh bấm thật.

⑵ **Trần 200 bị vượt khi nhiều lượt chồng nhau.** Đọc rồi ghi là hai lượt tách rời; hai lượt
cùng đọc `used: 199` rồi cùng ghi `200`, và cả hai đều bấm.

Bản vá đã làm bên `hnx-fetch` và chạy được: một **hàng đợi mức module** dùng chung cho
`setWriteGate` và `spendWriteBudget`, cộng **ghi từng trường** thay vì trải bản ghi cũ. Chép
sang đây là việc nhỏ; phần tốn công là phép ghim (hai ca đua) và hai con đột biến.

**Vì sao chưa làm ngay trong lượt này:** đụng khối phanh của Scouter là **đổi luật an toàn**
(luật gốc mục 2), và lượt này Đức đang ngủ. Không tự ý sửa cái phanh của một gói đang mở
`<all_urls>`.

**đóng khi:** `scouter-seed-core.mjs` dùng chung một hàng đợi cho hai hàm đó, có hai phép ghim
tái hiện được hai ca đua, và hai con đột biến hoàn nguyên bản vá đều **giết được**.

- **ĐÓNG S-15** (2026-09-08, `claude-scouter-s06`) · Đức chốt cho sửa. `scouter-seed-core.mjs` nay
  dùng **một hàng đợi mức module** chung cho `setWriteGate` và `spendWriteBudget`, và lượt trừ
  ngân sách **ghi từng trường** thay vì trải bản ghi cũ. Khối ⑳ của `scouter-write-gate-smoke.mjs`
  tái hiện được cả hai ca đua bằng một kho lưu CỐ Ý chậm (nhường lượt giữa `get` và `set`) — không
  có chỗ nhường đó thì hai lỗi này không tái hiện được, và phép ghim sẽ xanh vì may mắn. Hai con
  đột biến `PD1` `PD2` hoàn nguyên đúng bản vá và **cả hai đều giết được**; bộ đo nay 95/95 mỏ neo,
  95 giết được, 0 sống sót. Đo lại thì chạy, đừng tin dòng này: `node scripts/scouter-mutation-check.mjs`.

- **ĐÓNG S-11** (2026-09-08, `claude-scouter-s06`) · Đức chốt **chấp nhận rủi ro**, và yêu cầu bỏ
  khỏi sổ để không bị hỏi lại. Lý do và điều kiện hết hiệu lực ghi ở
  [ADR-0022](../../../docs/adr/0021-goi-extension.md) — tóm
  tắt: ranh giới tấn công là loopback trên máy cá nhân, hai gói đang đóng băng, và hai gói SỐNG
  đều đã dùng lõi chung có bắt tay hai chiều. **Mở băng một trong hai gói thì ADR đó hết hiệu lực**
  và gói được mở phải chuyển sang `workers/_shared/bridge-host/` ngay trong lượt mở.

- **ĐÓNG S-10** (2026-09-08, `claude-scouter-s06`) · Đóng muộn — việc xong từ 08/09 mà không ai
  ghi dòng này. Điều kiện đóng đòi **5 ngày giao dịch liên tiếp**; thực tế đã chạy **46 ngày liền
  mạch** 01/07 → 07/09, ra **216 tệp PDF** và **368 hàng** CSV, 0 lỗi. Ba tính chất bắt buộc đều
  có phép ghim dựng máy chủ giả: `vong-lay-smoke.mjs` khối ① (năm ngày → năm tệp) · ② (lượt hai
  không tải lại) · ③ (đứt giữa chừng thì chạy tiếp từ ngày còn thiếu).
  **Việc này nay KHÔNG còn ở Scouter**: pilot đã chuyển nhà sang `workers/hnx-fetch` ngày 08/09
  ([ADR-0021](../../../docs/adr/0021-goi-extension.md)), phép ghim trên
  cũng nằm ở đó. Nợ hnx còn lại (`S-12`) theo nhà mới, không ở lại sổ này.

- **ĐÓNG S-14** (2026-09-08, `claude-scouter-s06`) · Đóng muộn — mục này **đã được sửa từ trước**
  mà sổ không ai đóng. Ba câu báo lỗi trong `scouter-seed-core.mjs` nay nói đúng cửa
  (*"ở đầu BẢNG BÊN"*, không còn *"trong popup"*) và đúng tên công tắc (*"Cho phép bấm và gõ"*).
  Phép ghim khối ⑲ của `scouter-write-gate-smoke.mjs` **đọc nhãn thật từ `sidepanel.html`** chứ
  không gõ lại chuỗi — nên đổi nhãn ở bảng bên mà quên sửa câu lỗi thì nó đỏ.

- **ĐÓNG S-13** (2026-09-08, `claude-scouter-s06`) · **Chẩn đoán trong mục này SAI, và chỗ sai
  đáng giữ lại.** Nó tưởng đây là lỗi định tuyến tên method. Thật ra `capabilities` không lọt nổi
  tới bảng method — nó hỏng **hình dạng phong bì** (`METHOD_SHAPE` bắt buộc có dấu chấm), nên
  `parseRequest` ném TRƯỚC khi biến `request` được gán, và phản hồi ra đi với `request_id: null`.
  Máy chủ khớp phản hồi bằng đúng trường đó, khớp hụt, rồi thay cả phản hồi bằng
  `INTERNAL_ERROR / uncorrelated_extension_response`.

  Nên **hậu quả rộng hơn mục này mô tả**: mọi lý do từ chối ở tầng phong bì đều bị nuốt — sai dấu
  thời gian, thiếu `client_id`, phong bì quá khổ. Người gọi chỉ thấy "lỗi nội bộ".

  Vá ở **cửa vào**: vớt `request_id` từ phong bì thô trước khi kiểm. **KHÔNG** nới `METHOD_SHAPE`
  để ép ra `METHOD_NOT_FOUND` — làm thế là gỡ một chốt giao thức cho test xanh (luật vàng ③).
  Ghim cả hai chiều ở `scouter-bridge-smoke.mjs`; đột biến `PB1` giết được, bộ đo 96/96, 0 sống sót.
  Cùng lỗi ở `workers/hnx-fetch` đã vá cùng lượt.

  Một con đột biến (`PB2`) **sống sót** và điều đó đúng: bản đầu có thêm một lượt kiểm hình dạng
  trong bộ vớt, nhưng `failureResponse` đã kiểm ở cửa ra — cửa ra là đường DUY NHẤT phản hồi đi
  qua. Đã **bỏ lớp thừa** thay vì giữ một con đột biến không giết được: một dòng đỏ vĩnh viễn là
  thứ ai cũng học cách bỏ qua.

- **ĐÓNG S-12** (2026-09-08, `claude-scouter-s06`) · **Chuyển nhà, không phải bỏ qua.** Mục này
  nói về vòng lấy dữ liệu hnx, mà toàn bộ pilot đó đã sang `workers/hnx-fetch` ngày 08/09 cùng
  với `S-10`. Cùng một chuyện đã có mục riêng ở nhà mới: `H-03` — *ngày lễ bị gọi lại mỗi lượt
  chạy*, kèm đúng hai đường ra như ở đây. Giữ hai bản của một mục nợ ở hai quyển sổ là cách chắc
  chắn để một bản được đóng còn bản kia nằm lại mãi.
  **Quyết định vẫn chờ Đức**, và nó nằm ở `H-03`. Sổ nợ Scouter nay **rỗng**.

- **ĐÓNG S-04** (2026-09-12, `claude-scouter-udine`) · Đóng bằng **phép đo**, đúng nhánh thứ hai
  của điều kiện đóng: *"chạy đủ nhiều lượt mà không mất lần nào"*. **18 lượt `scout.reload` thật
  trên Chrome 152, 18 lượt giữ được phản hồi, 0 lượt mất.** (2 lượt lẻ lúc nạp lại bản vá tên
  ghế, rồi 16 lượt liên tiếp cách nhau 13 giây.)

  **Không phải 20 như dự định, và nói thẳng vì sao:** mỗi lượt `chrome.runtime.reload()` đóng
  rồi mở lại bảng bên, nên nhìn từ phía Đức nó là *"extension cứ tự động thu gọn"*. Đức báo lỗi
  đó lúc phép đo chạy tới lượt 16 và tôi dừng ngay. Bài học cho người sau: **một phép đo lặp lại
  việc nạp lại extension là một phép đo NGƯỜI DÙNG NHÌN THẤY** — báo trước, hoặc chạy lúc Đức
  không dùng máy.

  Độ trễ cố định 250ms (`RELOAD_DELAY_MS`) **giữ nguyên, không làm móc "đã gửi xong"**. Mục này
  xin cái móc đó chỉ khi có một lượt mất phản hồi thật; 18/18 nói là chưa cần. Mất lần nào thì
  mở lại mục mới, đừng sửa dòng này.

## XONG · S-16 (mở 2026-09-12, đóng 2026-09-12, `claude-scouter-udine`) — ba method khai hạn chờ VƯỢT ngưỡng máy chủ

Tìm thấy dọc đường khi đặt `deadline_ms` cho `scout.wait`, không phải đi tìm.

`bridge-host-core.mjs` cắt một lượt chuyển tiếp ở **35.000ms** (`requestTimeoutMs`, mặc định, và
chưa ai truyền giá trị khác). Ba method hiện có khai rộng hơn thế:

| method | `deadline_ms` khai | ngưỡng máy chủ |
|---|---|---|
| `scout.navigate` | 70.000 | 35.000 |
| `scout.type` | 60.000 | 35.000 |
| `scout.fetch` | 60.000 | 35.000 |

**Hỏng kiểu gì.** Một lượt gọi chạy quá 35 giây: máy chủ trả `REQUEST_TIMEOUT` cho người gọi,
extension **vẫn đang làm tiếp** và không biết gì. Hai đầu tin hai chuyện khác nhau — với
`scout.navigate` và `scout.type` là đường GHI, nghĩa là người gọi tưởng lượt gõ hỏng trong khi
nó đã gõ xong. Thử lại lúc đó là gõ hai lần.

**Chưa thấy nổ ngoài đời** — ba method đó hiếm khi chạy quá 35 giây. Nên đây là nợ, không phải
đám cháy. `scout.wait` và `scout.network` mở ngày 12/09 đã né sẵn (34.000 ở cửa Bridge, và trần
thật 30.000/25.000 ở lõi đọc) nên **đừng chép con số của ba method cũ**.

**ĐÃ ĐÓNG 12/09.** Chọn đường một (hạ ba con số), **không** chọn đường hai (đổi giao thức cho
người khởi động truyền hạn chờ) — đường hai đụng lõi dùng chung với ba gói đóng băng và phải
hỏi Đức, mà nó không mua thêm gì cho việc đang làm.

Nhưng lấy **nửa tốt** của đường hai, phần không đụng giao thức: con số 35.000 nay có TÊN —
`DEFAULT_REQUEST_TIMEOUT_MS`, xuất từ `bridge-host-core.mjs`. Trước đó nó nằm trần trong thân
hàm nên phía extension **không có cách nào đọc được**, và đó chính là lý do ba method trôi
được lên 60–70 giây mà không ai thấy. Đặt tên không đổi một hành vi nào; ba phép ghim của lõi
dùng chung vẫn xanh.

| method | trước | sau |
|---|---|---|
| `scout.navigate` | 70.000 | **34.000** |
| `scout.type` | 60.000 | **34.000** |
| `scout.fetch` | 60.000 | **34.000** |

**Và trần `timeout_ms` của `scout.navigate` xuống 60.000 → 30.000.** Chỗ này suýt bị bỏ sót:
hạ `deadline_ms` mà để người gọi vẫn xin được 60 giây thì bug còn nguyên, chỉ chuyển chỗ. Bốn
giây chênh giữa 30.000 và 34.000 là chỗ cho lượt trả lời đi về — cùng khuôn với `scout.wait`.

**Phép ghim chống tái phát: `B9`.** Nó ĐỌC NGƯỠNG THẲNG TỪ LÕI MÁY CHỦ và duyệt CẢ BẢNG LỆNH,
không so với một danh sách gõ tay — nên nó bắt được cả một method MỚI khai hạn chờ quá dài.
Đó mới là cách mục này tái phát: không phải ai đó sửa số cũ, mà ai đó **thêm một dòng**. Chép
tay ngưỡng vào phép ghim là dựng lại đúng cái bẫy đã sinh ra mục này — hai bản của một sự
thật, lệch nhau trong im lặng. Đột biến `S9`, `S10`, `S11`, giết được cả ba.

**Đo ngoài đời 12/09:** `system.capabilities` khai ra ngoài dây — không method nào còn vượt
34.000; xin `timeout_ms: 60000` bị cửa Bridge từ chối `INVALID_PARAMS` kèm câu nói rõ khoảng
hợp lệ.

## XONG · S-17 (mở 2026-09-12, đóng 2026-09-12, `claude-scouter-udine`) — `scout.click` báo "đã bấm" khi nó bấm trúng LỚP CHE

**P1.** Đây là lỗi báo-thành-công-giả trên đường GHI, và nó im lặng.

`scout.click` suy toạ độ từ `DOM.getBoxModel` của đúng phần tử đã khớp — chốt đó đúng và
`H4`/`H5` canh nó. Nhưng **không có bước nào kiểm rằng điểm ấy thật sự thuộc về phần tử ấy.**
Một lớp phủ trong suốt, một modal, một tooltip đứng trên đường là đủ: chuột bấm vào lớp trên,
Scouter trả về `{matchCount: 1, clickedAt: {...}, method: "Input.dispatchMouseEvent"}` — **giống
hệt một lượt bấm thành công.**

**KHÔNG phải chẩn đoán cho lượt bấm Send hỏng cùng ngày** — nói rõ để người sau khỏi tin nhầm:
ảnh chụp ngay sau lượt bấm đó **không có lớp che nào**, nên mục này là một giả thuyết chưa được
chứng minh cho ca ấy. Giả thuyết mạnh không kém: tài khoản đã chạm trần phiên. Mục này đứng
vững bằng phép đo riêng của nó ở dưới, không bằng ca kia.

**Đo được, 12/09, trên trang Udin:** khi lớp `.concurrency-overlay` ("User Limit Reached") phủ
kín ứng dụng, `scout.query` vẫn khớp `button.agent-send-button` **đúng một**, và mọi thứ
`scout.click` cần để tự tin đều còn nguyên. Không chốt nào hiện có nhìn thấy lớp phủ.

**Vì sao nó đắt.** Luật vàng số 7 của gói lo đúng chuyện này (*"bấm trúng phần tử bên cạnh"*)
nhưng chỉ chặn được nửa theo phương ngang — khớp đúng một phần tử. Nửa theo **chiều sâu** thì
chưa ai canh. Và hậu quả tệ hơn bấm trượt: bấm trượt thì trang không đổi và người gọi biết;
bấm trúng lớp che thì **lớp che phản ứng**, trang đổi thật, và người gọi tin là việc của mình
đã xong.

**ĐÃ ĐÓNG 12/09 — Đức chốt D1 cho `DOM.getNodeForLocation` vào `WRITE_CDP_METHODS`.**

`input.click` nay có **chốt ⑸**: sau khi tính toạ độ và **trước khi** bắn chuột, nó hỏi Chrome
*"điểm này là phần tử nào"*. Nhận chính phần tử đã khớp, hoặc con cháu của nó (nút biểu tượng
là `<button><svg><path>`, tâm hộp rơi vào `<path>`); thứ khác thì từ chối `CLICK_OBSCURED`.
Toạ độ **làm tròn một lần, ở một chỗ**, nên điểm đã hỏi đúng là điểm sẽ bấm.

Đo ngoài đời 12/09 trên một trang tự dựng (`http://127.0.0.1:38411`), qua Bridge thật:

| ca | kết quả |
|---|---|
| `<button>Gửi</button>` chữ thuần | `relation: "self"` — Chrome tự đi ngược từ nút văn bản lên phần tử cha, nên nút chữ KHÔNG bị từ chối oan |
| `<button><svg><path>` | `relation: "descendant"` — nút có icon KHÔNG bị từ chối oan |
| nút có lớp phủ đè lên | `CLICK_OBSCURED`, và **không một khung chuột nào rời đi** |

Ghim: `scouter-actions-smoke.mjs` khối ⑥b (sáu ca, cả hai chiều). Đột biến `HB1..HB6`, giết được
cả sáu. Mã lỗi đi ra ngoài dây ở `details.action_code` — cửa Bridge cố ý giữ bảng lỗi nhỏ và mọi
lỗi hành động đều mang mã `ACTION_FAILED` ở tầng ngoài, đúng lối đã có từ `FETCH_*`.

## XONG · S-18 (mở 2026-09-12, đóng 2026-09-12, `claude-scouter-udine`) — `scout.wait` trả "sẵn sàng" khi phần tử chỉ CÓ MẶT

`scout.wait` mở hôm nay hỏi đúng một câu: *selector này khớp mấy phần tử*. Nhưng câu một chuỗi
việc thật cần hỏi là *thứ này DÙNG ĐƯỢC chưa*.

**Đo được, 12/09:** chờ `textarea.agent-textarea` trả về `satisfied: true` sau **36ms / 1 lượt
hỏi**, trong khi màn hình đang là tấm chắn "User Limit Reached" phủ kín ứng dụng. Toàn bộ cây
DOM của trang nằm nguyên dưới lớp chắn, nên mọi selector vẫn khớp. **"Có trong DOM" ≠ "dùng
được"** — và một lệnh chờ trả lời sai câu hỏi thì tệ hơn không có lệnh chờ, vì nó trả lời nhanh
và dứt khoát.

Cùng gốc với `S-17`: cả hai đều thiếu cái nhìn theo CHIỀU SÂU.

**ĐÃ ĐÓNG 12/09 — Đức chốt thêm `DOM.getBoxModel` vào `READ_ONLY_CDP_METHODS`.**

Kế hoạch `CHUOI-VIEC.md` tính THIẾU chỗ này: nó chỉ xin một method, trong khi lõi đọc còn cần
biết hộp của phần tử nằm ở đâu mới lấy được điểm để hỏi. Đã hỏi lại và Đức chốt.

`scout.wait` nay nhận `state: "usable"`. **`present` vẫn là mặc định** — đổi nghĩa một tham số
đang có là làm hỏng mọi lượt gọi đã viết, lặng lẽ. Kết quả trả về **cả hai** con số, và cặp
`matchCount: 1, usableCount: 0` là tin giá trị nhất phép dò này nói được.

Nó còn nói VÌ SAO chưa dùng được, qua `usableBlockedBy`: `covered` (có thứ chắn) · `no_box`
(không có hộp hiển thị) · `no_hit_test` (Chrome không trả lời được — xem `S-21`). Ba nguyên
nhân dẫn tới ba việc khác hẳn nhau; gộp lại thành một `false` là đúng kiểu hỏng im lặng mà cả
gói này chống.

Đo ngoài đời 12/09, cùng một trang, cùng một selector:

| | `state: "present"` | `state: "usable"` |
|---|---|---|
| có tấm chắn phủ | `satisfied: true` | `satisfied: false`, `usableCount: 0`, `blockedBy: "covered"` |
| không chắn | `satisfied: true` | `satisfied: true` |

Hai câu trả lời khác nhau trên cùng một trang — đó là toàn bộ điểm của mục này.

`scout.wait usable` và `scout.click` dùng **cùng một phép hỏi**, nên `usable` không phải một
phép đo xấp xỉ cho lượt bấm; nó là cùng câu hỏi, hỏi sớm hơn. **CỐ Ý không cuộn trang** ở đường
đọc (`DOM.scrollIntoViewIfNeeded` vẫn KHÔNG có trong danh sách read-only): phép dò không được
xê dịch thứ nó đang quan sát, nên phần tử ngoài màn hình tính là chưa dùng được — đúng ý.

Ghim `W11..W15`. Đột biến `NM7..NM11`, giết được cả năm.

## XONG · S-19 (mở 2026-09-12, đóng 2026-09-12, `claude-scouter-udine`) — `scout.navigate` không F5 được cùng một URL

Nó chờ URL đổi; đi tới đúng URL đang đứng thì URL không bao giờ đổi, nên nó treo hết 15 giây rồi
trả `NAVIGATE_TIMEOUT` — **trong khi trang có thể đã tải lại thật**. Đo 12/09 trên trang Udin.

**Tái hiện lần hai 12/09 trên trang tự dựng, nguyên văn:** *"Quá 15000ms mà chưa tới nơi. Xin đi
'http://127.0.0.1:38411/', đang ở 'http://127.0.0.1:38411/' (url chưa đổi)."* — hai vế của câu
đó là cùng một URL, in cạnh nhau, và method vẫn gọi đó là hỏng. Không riêng Udin, đúng như dự
đoán lúc mở mục.

Nạp lại trang là việc cơ bản của mọi vòng thuần hoá (thử lại từ trạng thái sạch), nên khuyết
tật này sẽ gặp lại ở mọi trang, không riêng Udin.

**ĐÃ ĐÓNG 12/09.** Chọn đường "chờ bằng một tín hiệu KHÁC", không chọn đường từ chối: nạp lại
trang là việc cơ bản của mọi vòng thuần hoá, và một method từ chối làm việc cơ bản thì sớm muộn
có người lách nó.

**Tín hiệu mới: danh tính TÀI LIỆU.** `backendNodeId` của nút gốc — con số Chrome cấp cho một
nút THẬT. Một lượt tải mới dựng một tài liệu mới, nên con số đó đổi. **KHÔNG dùng `nodeId`**:
nó là số thứ tự trong bảng tra của phiên debug, được cấp lại mỗi lượt `DOM.getDocument`, nút gốc
gần như luôn là `1` — so `nodeId` là so hai con số luôn bằng nhau, tức một phép kiểm không bao
giờ báo gì. Con `HN3` canh đúng chỗ này.

**Nhận CẢ HAI dấu hiệu, và đó không phải thừa.** Hai ca loại trừ nhau:

| ca | url | tài liệu | bản cũ |
|---|---|---|---|
| F5 cùng một URL | không đổi | **mới** | treo 15s, báo sai |
| đi tới `#muc-2` cùng trang | **đổi** | không đổi | chạy |

Một dấu hiệu một mình thì ca kia treo oan. Con `HN1` và `HN2` canh hai chiều đó.

**Không đọc được tài liệu TRƯỚC lúc đi thì danh tính cũ là KHÔNG BIẾT**, không phải "khác mọi
con số" — để nguyên `undefined` thì mọi lượt điều hướng xong ngay nhịp đầu vì nó so một số thật
với `undefined`. Con `HN4` **SỐNG SÓT lúc mới thêm**: chốt đó khi ấy chỉ là một dòng bình luận.
Đã thêm phép ghim ⓓ0 và nó chết.

**Câu lỗi nay nói đúng hai trục** đã quan sát được. Chỗ đắt của mục này chưa bao giờ là *treo* —
mà là treo RỒI NÓI SAI NGUYÊN NHÂN.

**Đo ngoài đời 12/09**, trang tự dựng, qua Bridge thật, gọi bằng TÊN ghế (`Udin_Scout`):

| ca | trước | sau |
|---|---|---|
| F5 cùng URL | 15.000ms → `NAVIGATE_TIMEOUT (url chưa đổi)` | **254ms → `ok`**, `reloaded: true`, `arrivedBy: "new_document"` |
| đi URL khác | chạy | vẫn chạy, `reloaded: false` |

Ghim: `scouter-actions-smoke.mjs` khối ⑨b (năm ca). Đột biến `HN1..HN4`, giết được cả bốn.

## MỞ · S-20 (2026-09-12, `claude-scouter-udine`) — không NGHE được mạng trong lúc BẤM trên cùng một tab

`runProbe` và `runAction` đều gắn-rồi-nhả debugger, và đó là chốt tốt (dải băng vàng chỉ hiện
đúng lúc làm việc). Hệ quả không lường trước: `scout.network` giữ debugger suốt cửa sổ nghe, nên
một lượt `scout.click` trên **cùng tab** trong lúc đó bị từ chối `TARGET_ALREADY_ATTACHED`.

**Nghĩa là Scouter không quan sát được lưu lượng do CHÍNH NÓ gây ra.** Bấm xong rồi mới nghe thì
lượt gọi quan trọng nhất — cái bắn ra ngay lúc bấm — đã đi mất. Đo 12/09: bấm Send rồi nghe ngay,
25 giây thu về **0 lượt**; trong khi cùng cái tai đó nghe một lượt tải trang thu về **30 lượt**.

· **đóng khi:** hoặc `scout.network` nhận một tham số "làm việc này trước rồi nghe" để một lượt
gọi làm cả hai dưới một lần gắn, hoặc gói chấp nhận giới hạn và ghi thẳng nó vào `README.md`.
**Đừng chữa bằng cách bỏ gắn-rồi-nhả** — đó là nới một lớp bảo vệ để lấy tiện lợi.

## MỞ · S-21 (2026-09-12, `claude-scouter-udine`) — một target thỉnh thoảng KHÔNG trả lời được câu hỏi hình học

**Chưa biết nguyên nhân, và ghi ra đúng ở mức đó.** Một chẩn đoán sai mà nghe có thẩm quyền thì
đắt hơn một ô trống.

**Quan sát được, 12/09, trên một trang tự dựng qua Bridge thật.** Ba dấu hiệu xảy ra cùng lúc
trên cùng một target:

- `DOM.getNodeForLocation` trả `-32000 No node found at given location` cho **đúng toạ độ mà
  vài phút trước nó trả lời bình thường**, trên đúng trang đó, không ai cuộn hay đổi kích thước
- `scout.shot` trên cùng target trả về hỏng, 0 byte
- lượt `scout.click` ngay sau đó bị từ chối `TARGET_ALREADY_ATTACHED` — tức là một lượt gắn
  debugger chưa được nhả

Sau **một lượt `scout.navigate` thật**, cả ba trở lại bình thường và mọi phép đo lặp lại đúng.

**Vì sao đáng theo dõi dù chưa hiểu.** Nó chạm cả hai đường: `scout.click` từ chối bằng
`CLICK_HIT_TEST_FAILED`, `scout.wait usable` trả `blockedBy: "no_hit_test"`. Cả hai đều fail-closed
nên KHÔNG có ai bấm nhầm — nhưng một người gặp nó sẽ tưởng trang mình đang bị che, và đi tìm một
hộp thoại không hề tồn tại. Hai đường đã được sửa để nói rõ "Chrome không trả lời được" chứ
không nói "bị chắn", và giữ nguyên văn lời Chrome làm bằng chứng.

**Giả thuyết chưa kiểm, đừng tin cái nào:** ⒜ tab không đang được vẽ (nằm sau tab khác, cửa sổ
thu nhỏ, Chrome cho tab ngủ) · ⒝ một lượt gắn debugger hỏng để lại target ở trạng thái dở dang
· ⒞ renderer bị thay giữa chừng nên bảng nodeId cũ không còn nghĩa.

· **đóng khi:** tái hiện được có chủ ý ít nhất một lần (đưa tab ra sau rồi hỏi lại là phép thử
rẻ nhất), rồi hoặc vá, hoặc ghi vào `README.md` như một giới hạn đã biết kèm cách nhận ra nó.
**Đừng đóng bằng cách đoán** — mục này tồn tại chính vì chưa ai đo được nguyên nhân.
