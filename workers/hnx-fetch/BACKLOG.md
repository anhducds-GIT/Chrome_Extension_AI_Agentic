# BACKLOG — gói `hnx-fetch`

> Sổ nợ của gói. Mỗi mục **bắt buộc** có trường `đóng khi:` — không khai được điều kiện đóng
> thì mục đó chưa đủ chín để ghi. Đóng một mục bằng cách **thêm một dòng ở cuối mục**, không
> viết lại khối cũ.

---

## MỞ · H-01 (2026-09-08, `claude-scouter-s06`) — chưa lượt nào chạy qua CHÍNH extension này

Toàn bộ mã đã tách xong, suite xanh, nhưng mọi lượt lấy dữ liệu thật từ trước tới nay đều đi
qua Scouter. Extension `HNX Fetch` **chưa được nạp vào Chrome lần nào**.

Cái chưa biết, và chỉ một lượt chạy thật mới trả lời được: bắt tay Bridge với tên giao thức
mới `hnx-fetch.bridge` có đi trọn vòng không · bảng bên vẽ đúng không khi không có phần "mốc
thuần hoá trang" · công tắc và bộ đếm 200 lượt hiện đúng không.

**đóng khi:** một lượt `tai-ket-qua.mjs --thu-xem` đi trọn vòng qua extension `HNX Fetch` và
trả về danh sách ngày, không phải qua Scouter.

**THU HẸP 2026-09-08** · `claude-scouter-s06` — `v0.1.0/tests/day-tron-vong-smoke.mjs` nay chạy
**máy chủ THẬT ↔ transport THẬT ↔ lõi THẬT** qua một socket TCP thật, 7 khối ĐẠT: bắt tay hai
chiều · lệnh chỉ đọc đi trọn vòng · lệnh không tồn tại bị từ chối · phanh chặn thật qua dây và
KHÔNG chạm mạng · mở khoá thì đi được và ngân sách trừ đúng · `file.*` dừng ở máy chủ · vùng ghi
nhốt được. Nghĩa là **khúc giữa đã được chứng minh**.

Phần còn lại của mục này **chỉ có Chrome trả lời được**, và không có cách nào đo từ Node: Chrome
đọc `manifest.json` có đúng không · bảng bên vẽ ra sao · công tắc và bộ đếm 200 lượt hiện đúng
không · phím tắt `Ctrl+Shift+H` có ăn không. Đừng đóng mục này bằng suy luận từ suite.

---

## MỞ · H-05 (2026-09-08, `claude-scouter-s06`) — không có cờ chia theo loại sản phẩm

`tai-ket-qua.mjs` gõ cứng `LOAI_SAN_PHAM.CHI_SO_CO_PHIEU` (dòng 50). `nguon-hnx.mjs` có khai
bảng loại, nhưng **không có cờ dòng lệnh nào chọn được**.

Hệ quả đã thành lỗi tài liệu: `PROTOCOL.md` từng khuyên *"gặp `FETCH_BODY_TOO_LARGE` thì chia
nhỏ theo loại sản phẩm"* — một lời khuyên **không làm theo được**. Audit nội dung độc lập 08/09
bắt được. Câu đó nay đã sửa thành *một ngày một lượt*, nhưng cái cờ vẫn chưa có.

**Chưa gấp:** một ngày đo được **46 KB**, trần là **512 KiB** — rộng gấp hơn mười lần. Mã lỗi
đó gần như chỉ nổ khi có gì khác đã sai.

**đóng khi:** hoặc `tai-ket-qua.mjs` nhận `--loai <mã>` và có một phép ghim cho nó, hoặc Đức
chốt là không cần và câu ở `PROTOCOL.md` bỏ hẳn nhánh đó.

---

## MỞ · H-02 (2026-09-08, `claude-scouter-s06`) — sổ hoạt động mất phần "trang đang chạm"

`journal-core.mjs` chép nguyên văn từ Scouter, và phần tiến độ của nó buộc vào **tám mốc thuần
hoá trang** — tám phép dò mà gói này không có. Bảng bên vì thế chỉ vẽ **vòng hoạt động** (lệnh
nào, được hay hỏng, lúc nào), không vẽ phần mốc.

Chấp nhận được, và **cố ý không vá vội**: vẽ một khối luôn trống là dạy người đọc bỏ qua khối
đó. Nhưng nếu Đức muốn thấy *"hôm nay đã lấy được mấy ngày"* thì phần đó phải có hình dạng
riêng của HNX Fetch, không phải mượn hình dạng của Scouter.

**đóng khi:** hoặc Đức nói không cần, hoặc bảng bên hiện được số ngày đã lấy trong lượt chạy
hiện tại — đọc từ chính tệp SSOT chứ không từ một bộ đếm thứ hai.

---

## MỞ · H-03 (2026-09-08, `claude-scouter-s06`) — ngày lễ bị gọi lại mỗi lượt chạy

Ngày HNX không có phiên thì không có dòng nào vào tệp SSOT, nên lượt chạy sau **gọi lại đúng
ngày đó**. Mỗi ngày lễ tốn một lượt của ngân sách 200, mãi mãi.

**Cố ý chưa vá.** Đánh dấu bằng một tệp rỗng hay một dòng "không có phiên" là đổi một phiền
toái nhỏ lấy một **lỗi im lặng lớn**: nếu HNX bổ sung dữ liệu cho ngày đó sau (đã từng xảy ra
ở các sở khác), ta sẽ không bao giờ lấy được nữa vì đã tự đánh dấu là xong.

**đóng khi:** Đức chốt một trong hai — chịu gọi lại, hay đánh dấu và chịu rủi ro mất dữ liệu
bổ sung.

---

## MỞ · H-04 (2026-09-08, `claude-scouter-s06`) — chưa có bộ đo đột biến cho gói

`v0.1.0/scripts/mutation-runner.mjs` đã chép sang nhưng **chưa có tệp khai đột biến nào dùng
nó**. Nghĩa là bốn khối của `be-mat-hep-smoke.mjs` chưa được chứng minh là **bắt được gì** —
một phép ghim chưa qua đột biến kiểm là một phép ghim chưa biết có răng.

Ba con đáng khai trước: gỡ cái phanh · nối lại một lệnh bấm vào từ vựng · khai lại quyền
`debugger` trong manifest.

**đóng khi:** `node v0.1.0/scripts/pilot-mutation-check.mjs` chạy được và ba con trên đều
**giết được**, 0 sống sót.

**ĐÓNG 2026-09-08** · `claude-scouter-s06` — `v0.1.0/scripts/mutation-check.mjs` (tên khác dự
kiến, ngắn hơn), **13 con · 13/13 mỏ neo khớp · 13 giết được · 0 sống sót**. Bốn mẻ: bề mặt ·
phanh · manifest · chống trôi. Một con (`N8`) ban đầu **sống sót vì chính nó hỏng** — nó chỉ đổi
tên mã lỗi chứ không thật sự mở phanh ra; sửa cả hai đầu: con đột biến làm đúng việc nó khai, và
phép ghim mọc thêm ca *kho lưu NÉM thì phải từ chối*, ca trước đó chưa ai thử.

**ĐÓNG 2026-09-08** · `claude-scouter-s06` — **đã chạy thật, trọn vòng, qua chính extension này.**
Máy chủ HNX bật với tệp ghép cặp của Scouter (dùng chung được — tệp chỉ chở cổng và token; cái
quyết định là **máy chủ nào đang chạy**). Đo được: `system.ping` trả `seed: hnx-fetch-v0.1` ·
`system.capabilities` khai **đúng bốn lệnh** nhìn từ ngoài dây · `scout.fetch` lấy trang thật
`hnx.vn` (status 200) · ngân sách trừ đúng **199/200** · rồi một lượt `tai-ket-qua.mjs` đầy đủ đi
trọn vòng, **0 hỏng**. Bảng bên, công tắc và bộ đếm đều đúng.

> Phần duy nhất còn chưa thử: **phím tắt phanh khẩn `Ctrl+Shift+H`** — nó cần tay Đức bấm. Ghi
> thành `H-07` chứ không để lẫn trong mục này.

---

## MỞ · H-06 (2026-09-08, `claude-scouter-s06`) — HNX Fetch chưa có tệp ghép cặp riêng

Hôm nay HNX Fetch dùng chung tệp ghép cặp của Scouter. Hệ quả **đo được ngay lượt chạy đầu**:
cả hai extension cùng cắm vào một máy chủ, và mọi lượt gọi trả `TARGET_AMBIGUOUS`.

**Tên giao thức không chặn được chuyện này** — nó gác ở tầng phong bì, còn cắm dây xảy ra trước
đó. Đã vá bằng cờ `--target` (ba lệnh, có phép ghim), nhưng đó là **đi vòng**: mỗi lượt chạy phải
mang thêm một chuỗi 45 ký tự mà không ai nhớ được, và chuỗi đó **đổi mỗi lần nạp lại extension**.

Cách đúng: một tệp ghép cặp riêng, **cổng riêng**, cho HNX Fetch. Lúc đó mỗi máy chủ chỉ có một
extension cắm vào và cờ `--target` thành không cần.

**đóng khi:** có tệp ghép cặp riêng cho HNX Fetch (Đức tạo, không nằm trong kho mã), và một lượt
`tai-ket-qua.mjs --thu-xem` chạy trọn **không cần** `--target`.

---

## MỞ · H-07 (2026-09-08, `claude-scouter-s06`) — phím tắt phanh khẩn chưa ai bấm thử

`Ctrl+Shift+H` khai trong `manifest.json` và nối tới `setWriteGate(false)`. Đường mã đã có phép
ghim, nhưng **việc Chrome có nhận phím tắt đó hay không thì chỉ bấm mới biết** — và nó có thể bị
một extension khác giành mất tổ hợp.

Đây là **cái phanh cuối cùng** khi bảng bên đã đóng, nên "chắc là chạy" không đủ.

**đóng khi:** Đức bấm `Ctrl+Shift+H` lúc công tắc đang BẬT, rồi bảng bên hiện `ĐANG TẮT`.

- **ĐÓNG H-07** (2026-09-08, `claude-scouter-s06`) · Đức bấm thử và báo **thành công**: `Ctrl+Shift+H`
  ăn thật trên máy Đức, không extension nào giành mất tổ hợp, và bảng bên đổi sang `ĐANG TẮT`.
  Cái phanh cuối cùng — thứ với tới được khi bảng bên đã đóng — nay đã được chứng minh bằng tay
  người, không phải bằng suy luận từ suite.

- **ĐÓNG H-01** (2026-09-08, `claude-scouter-s06`) · Đóng lại cho **đúng chỗ**: dòng đóng của mục
  này đã được viết 08/09 nhưng nằm lạc sang khối `H-04`, nên máy đếm sổ vẫn tính nó là đang mở.
  Nội dung không đổi — lượt chạy thật đã đi trọn vòng qua chính extension `HNX Fetch`:
  `system.ping` trả `seed: hnx-fetch-v0.1`, bảng năng lực nhìn từ ngoài dây đúng bốn lệnh,
  `scout.fetch` lấy `hnx.vn` status 200, ngân sách trừ đúng 199/200, và một lượt `tai-ket-qua.mjs`
  đầy đủ 0 hỏng. Bằng chứng: `v0.1.0/evidence/2026-09-08-chay-that-lan-dau.md`.
  Bài học nhỏ nhưng thật: **đóng sổ mà đặt sai khối thì máy đếm không thấy** — cửa ra của sổ này
  là *thêm một dòng ở CUỐI*, không phải viết vào giữa mục khác.

- **ĐÓNG H-04** (2026-09-08, `claude-scouter-s06`) · Cùng bệnh với `H-01`: việc xong 08/09 nhưng
  dòng đóng viết **trong thân mục** thay vì thành một dòng riêng ở cuối, nên máy đếm không thấy.
  Nội dung không đổi — `v0.1.0/scripts/mutation-check.mjs` (tên ngắn hơn dự kiến) chạy được với
  **13 con · 13/13 mỏ neo khớp · 13 giết được · 0 sống sót**, bốn mẻ: bề mặt · phanh · manifest ·
  chống trôi.

- **ĐÓNG H-05** (2026-09-08, `claude-scouter-s06`) · `tai-ket-qua.mjs` nay nhận `--loai <mã>`,
  nhận **cả** tên dễ đọc (`CHI_SO_CO_PHIEU`) lẫn mã trang (`HDTLCSCP`) — người vận hành đọc tên
  trong tài liệu còn máy thấy mã trong URL. Danh sách **tự sinh từ `LOAI_SAN_PHAM`**, không gõ
  lại. Mã sai thì **DỪNG** và kể ra danh sách hợp lệ, không lặng lẽ dùng mặc định: trang HNX trả
  200 OK kèm cả một trang HTML khi tham số sai (đo 07/09), nên "chạy tiếp với mặc định" nghĩa là
  ghi dữ liệu của loại KHÁC vào SSOT — mà SSOT thì chỉ nối thêm, không sửa lại được.
  Ghim: `du-lieu/tests/loai-san-pham-smoke.mjs`, 3 khối, có khối chạy THẬT tệp lệnh và đọc mã thoát.
  `PROTOCOL.md` cũng đã sửa: mục `FETCH_BODY_TOO_LARGE` nay là ba bước thử, không còn khuyên một
  việc không làm theo được.

- **THU HẸP H-06** (2026-09-08, `claude-scouter-s06`) · Chỗ chặn đã gỡ. Trước lượt này **không có
  đường nào TẠO ra một tệp ghép cặp**: hai gói sống chỉ biết ĐỌC tệp có sẵn, còn bộ sinh thì nằm
  trong ba gói đã đóng băng. Nay có `workers/_shared/bridge-host/tao-tep-ghep-cap.mjs` — đặt cạnh
  `validatePairing()` và **tự kiểm bằng chính hàm đó**, nên không thể sinh ra tệp máy chủ từ chối.
  Hai chốt: từ chối ghi vào trong kho mã · từ chối ghi đè tệp đã có.

  **Chốt thứ nhất đã HỎNG CÂM ở lượt thử đầu** và bộ sinh đặt một tệp CÓ TOKEN thẳng vào gốc repo
  (tệp chưa từng được track, đã xoá). Nguyên nhân: tính gốc repo bằng cách tự gỡ `URL.pathname`,
  mà trên Windows chuỗi đó giữ dấu cách ở dạng `%20`. Đã chuyển sang `fileURLToPath` và ghim bằng
  một phép chạy THẬT có đường dẫn chứa dấu cách. Một chốt hỏng câm tệ hơn không có chốt.

  **Còn lại đúng phần cần tay Đức:** chạy lệnh đó một lần, rồi chọn tệp mới trong bảng bên.

- **ĐÓNG H-03** (2026-09-08, `claude-scouter-s06`) · Đức chốt **đánh dấu**. Và Đức đoán đúng một
  nửa: **T7/CN đã bỏ qua sẵn từ trước** (`ngayLamViec`, `tai-ket-qua.mjs`) — thứ bị lấy lại mỗi
  lượt chỉ là **ngày lễ**, tức ngày trong tuần mà sàn không mở.

  Ghi vào một tệp CSV **bên cạnh** SSOT (`<tên>.ngay-nghi.csv`), **không** phải một hàng giả trong
  SSOT: SSOT có 25 cột số liệu và khoá (ngày + ISIN), nhét một hàng *"ngày này nghỉ"* vào đó nghĩa
  là mọi lượt đếm/cộng/trung bình về sau phải nhớ lọc nó ra — và sẽ có lượt quên. Dữ liệu và **ghi
  chú về dữ liệu** là hai thứ khác nhau.

  **Rủi ro trong mục này không biến mất chỉ vì đã chốt** — nếu HNX bổ sung dữ liệu cho một ngày đã
  đánh dấu, ta sẽ không lấy nữa. Nên cửa thoát phải rẻ: tệp là CSV mở bằng Excel được, có ghi **lúc
  quan sát**, và **xoá một dòng là ngày đó được lấy lại**. Phép ghim canh cả cửa thoát đó, không
  chỉ canh cửa vào.

  Ghi **SAU** khi trang trả lời, không đoán trước theo lịch: ngày lễ Việt Nam có ngày âm lịch, và
  một bảng lịch gõ tay sẽ sai đúng vào năm không ai kiểm lại.

  Ghim `du-lieu/tests/ngay-nghi-smoke.mjs`, 8 khối. Khối ⑺ chạy thật `--thu-xem`; khối ⑻ dựng một
  **máy chủ Bridge giả** để ghim lượt GHI — bộ đo đột biến chỉ ra rằng không có khối ⑻ thì bỏ hẳn
  lượt ghi mà mọi phép ghim vẫn xanh. Đột biến `R1` `R2` nay đều giết được, 25/25, 0 sống sót.

- **ĐÓNG H-02** (2026-09-08, `claude-scouter-s06`) · Đức chốt **bỏ** — đúng một trong hai đường ra
  mục này tự khai (*"hoặc Đức nói không cần"*). Ghi lại lý do để phiên sau không mở lại:
  bảng bên **không đọc được tệp SSOT** — extension này cố ý không có quyền chạm đĩa, việc ghi tệp
  do tiến trình Node làm. Nên câu *"đọc từ chính tệp SSOT"* trong điều kiện đóng là thứ **không
  làm được từ bảng bên**; muốn có nó phải dựng một bộ đếm thứ hai, mà mục này đã nói rõ là không.
  Và con số *"hôm nay lấy được mấy ngày"* vốn đã hiện ở chỗ người vận hành nhìn: đầu ra của lệnh.

- **THU HẸP LẦN 2 · H-06** (2026-09-08, `claude-scouter-s06`) · Đức chốt giao việc này cho Codex
  CLI. Codex **không chạy được** trên máy này (sandbox hỏng: `apply deny-read ACLs` — đúng lỗi đã
  ghi trong sổ tay), nên chuyển sang **đọc mã**: nạp thẳng nội dung qua stdin, chế độ chỉ-đọc.
  Nó trả `FAIL` kèm 5 chỗ. Tôi kiểm lại từng cái bằng cách chạy thật — **cả 5 đều có thật**, và
  một trong số đó là lỗ **đã lọt**: đường dẫn mở rộng `\?\C:\...` đưa được một tệp có token vào
  gốc repo. Đã vá hết; 12 đường tấn công nay chặn 12.

  Đáng nhớ nhất: một lỗ nằm trong **chính phép ghim** — nó lùi sai số cấp nên chỉ bảo vệ
  `workers/`, không phải gốc repo. Nó **không đỏ**, nó chỉ **đo ít hơn nó tự khai**. Đó là lý do
  bên kiểm chứng phải là bên khác với bên sửa.

  **Tệp ghép cặp đã sinh sẵn** cho Đức tại `C:\Users\MAYTEST_12\HNX-Bridge\hnx-pairing.json`
  (ngoài kho mã, ổ đĩa nội bộ — cố ý không đặt trên Drive để token không đồng bộ lên mây), và
  máy chủ đã bật thật với nó: `HTTP 200 · EXTENSION_OFFLINE`, đúng như phải thế khi chưa có
  extension nào cắm.

  **Còn đúng một việc, và chỉ tay Đức làm được:** mở bảng bên của HNX Fetch, chọn tệp đó thay cho
  tệp của Scouter. Xong thì chạy một lượt `--thu-xem` **không kèm** `--target` là mục này đóng.

- **ĐÓNG H-06** (2026-09-08, `claude-scouter-s06`) · Đức đã chọn tệp ghép cặp riêng trong bảng bên.
  Đo thật, **không gửi `target`**: `system.ping` → `seed: hnx-fetch-v0.1` · `system.capabilities`
  → đúng **4 lệnh** (`session.hello`, `system.capabilities`, `system.ping`, `scout.fetch`) ·
  `bridge.sessions` → **đúng MỘT** extension cắm vào máy chủ này. Không còn `TARGET_AMBIGUOUS`.
  Cờ `--target` từ nay không cần cho đường HNX.

  **Điều kiện đóng mà chính tôi viết cho mục này là một PHÉP THỬ SAI, nói ra để không ai dùng lại:**
  nó đòi *"một lượt `tai-ket-qua.mjs --thu-xem` chạy trọn không cần `--target`"*. Nhưng `--thu-xem`
  **thoát trước mọi lượt gọi mạng** — nó chỉ đọc tệp SSOT rồi liệt kê ngày thiếu. Lượt đó sẽ ĐẠT
  kể cả khi **không có máy chủ nào chạy**, và kể cả khi định tuyến vẫn hỏng.

  Bài học rộng hơn mục này: một điều kiện đóng phải chạm đúng **thứ đang được nghi ngờ**. Ở đây
  thứ đáng nghi là *định tuyến qua dây*, nên phép thử phải là một lượt gọi **đi qua dây** — và đó
  là `system.ping` / `system.capabilities` không kèm `target`, như đã đo ở trên. `--thu-xem` vẫn
  được chạy (Đức yêu cầu) và chạy trơn, nhưng nó là bằng chứng cho việc khác.
