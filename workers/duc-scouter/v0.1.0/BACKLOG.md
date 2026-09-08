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
