# SỔ GIẢ THUYẾT — Scouter

> **TRA SỔ NÀY TRƯỚC KHI THỬ BẤT CỨ GÌ.** Đức chốt 13/09, sau khi một phiên đi vòng lại đúng
> những giả thuyết đã loại trừ: *"cần một bản ghi các giả thuyết và kết quả, để trong quá trình
> trial có thể tra cứu và không lặp lại việc đã làm."*
>
> Cách tra: `grep -n "<từ khoá>" workers/duc-scouter/v0.1.0/docs/GIA-THUYET.md` — ví dụ `ẩn`,
> `cuộn`, `hit-test`, `setTimeout`. Thấy dòng **SAI** thì đừng thử lại; thấy **CHƯA** thì đọc
> cột *cách thử* để khỏi làm lại phần đã làm.

## Kết luận hiện tại (14/09, sửa cuối ngày)

- ✅ **`S-25` ĐÃ TÌM RA GỐC, và nó là MỘT DÒNG** (`G-67`): `_shared/bridge-host/websocket-core.mjs`
  ném lỗi ở **mọi tin WebSocket bị cắt mảnh**, mà Chrome tự cắt mảnh khi tin vượt ~64 KiB. Nên
  một câu trả lời hơi lớn làm **đứt kết nối** thay vì trả một lỗi có tên. Đây giải thích cả
  `G-56` (`scout.shot` chết), mọi lượt `grab` trả thân thật, và ghi chép 08/09. **Đó là một ca
  CHƯA VIẾT, không phải một lớp bảo vệ** — bản sửa thuần thêm vào. Việc `T24`.
- ⚠️ **Một kết luận của tôi đã SAI và đã sửa trong ngày** (`G-63`): bảng đo đầu tiên trông như một
  NGƯỠNG sạch, nên tôi viết ra rằng có ngưỡng. Đo lại **cùng một cỡ nhiều lượt** thì nó **chập
  chờn**. *Mỗi cỡ thử một lần thì một lỗi chập chờn luôn trông y như một ngưỡng.*

- 🛑 **`S-22` NGỪNG ĐIỀU TRA. Đức chốt 14/09.** Lý do không phải "đã hiểu" mà là **chi phí**:
  cùng một câu hỏi *"tab ẩn có làm mất cú bấm không"* đã được mở **năm lần** (`G-07` `G-38`
  `G-40` `G-42`, rồi `G-47` `G-49`), bốn lần trả lời **SAI**, và chính khối này đã ghi *"đừng
  thử lại"* trước khi tôi mở hai lần cuối. **Mở lại một giả thuyết đã đóng phải có DỮ KIỆN MỚI**
  — một tương quan cũ đếm lại không phải dữ kiện mới.
- **`S-22` đóng bằng LỜI KHAI, không bằng bản vá** (đường ⒝ của `T11`): `README.md` nói thẳng
  `scout.click` hứa *"đã bắn chuột vào đúng điểm của đúng phần tử"* và **không** hứa *"trang đã
  nhận"*. Adapter tự đặt dấu kiểm trên trang. `W1` và `W2` trên Udin đã làm đúng thế và **ĐẠT**
  — tức là giới hạn này không chặn việc thật, nó chỉ chặn việc tin lời báo của lệnh bấm.
- ⚠️ **`G-45` ("chập chờn 1/7") ĐO BẰNG MỘT DỤNG CỤ HỎNG** — xem `G-48`. Đừng trích con số 1/7.
- **Thứ đo được và còn đúng:** trên tab đang hỏng, lệnh **DOM chạy** mà lệnh **Input biến mất**,
  hỏng **theo TAB chứ không theo ghế** (`G-43`). Ai mở lại thì đọc `G-50` trước — đường chưa
  thử duy nhất nằm ở đó, và nó **không** cần một chiến dịch đo.
- **Chín giả thuyết đã loại, đừng thử lại:** tab ẩn (`G-07` `G-38` `G-40`) · cửa sổ thu nhỏ
  (`G-41`) · tab chưa từng hiện (`G-42`) · lớp che / vẽ sai / hộp thoại (`G-44`) · bộ đếm giờ
  (`G-02`) · tab đông cứng kiểu `G-03` · toạ độ lệch tỉ lệ (`G-05`) · gắn lại gỡ lỗi (`G-45`) ·
  điều hướng sau khi gắn (`G-46`).
- **Phép đo A/B trên Chrome SẠCH đã có sẵn** — bản chép của `scouter-action-reality-probe.mjs`
  đo được ba trạng thái tab và hai trạng thái cửa sổ. Dựng lại trong ~5 phút; xem `G-40..G-42`.

## Kết luận cũ (13/09)

- **`S-23` ĐÃ VÁ:** `DOM.getNodeForLocation` nói theo hệ TRANG, hộp/chuột theo hệ KHUNG NHÌN.
  Cộng độ cuộn (hộp `:root`) ở cả hai lõi. Probe 11/11, đột biến 128/128.
- **Udin:** Scouter vượt màn "User Limit Reached" bằng Try Again — adapter `pilots/udin-optic/`.
- **`S-22` vẫn CHƯA rõ:** trên ghế Đức, lượt bấm KHÔNG cuộn trả `ok` mà trang không nhận. Đã loại
  G-02..G-07. Không phải cùng lỗi với S-23 (S-23 trả lỗi, S-22 trả `ok`).

## Cách làm — đọc trước khi thử

1. Grep sổ này. Dòng SAI thì bỏ qua.
2. **Đọc mã trả về trước khi đoán.** G-15..G-18 mất bốn lượt vì chỉ nhìn trang, không nhìn lệnh trả gì.
3. **Chia đôi bằng phép đo có sẵn** (bảng cuối) thay vì dựng giả thuyết mới. Một biến một lượt.
4. Hai thứ **trùng lúc** chưa phải nguyên nhân — ghi CHƯA, đừng dựng code trên nó (G-07).

## Luật ghi

1. **Ghi TRƯỚC khi thử**, dòng trạng thái `CHƯA`. Thử xong thì sửa đúng ô *kết quả* — không
   xoá dòng, không viết lại câu hỏi. Giả thuyết sai **quý như** giả thuyết đúng: nó là thứ phiên
   sau không phải trả tiền lần hai.
2. **Kết quả chỉ có ba chữ:** `ĐÚNG` · `SAI` · `CHƯA`. `ĐÚNG`/`SAI` bắt buộc có *bằng chứng* đo
   được (lệnh, số, tên phép đo). Không đo mà ghi `SAI` vì người khác nói thì ghi rõ nguồn.
3. **Một dòng một câu hỏi.** Hai biến trong một phép thử thì tách hai dòng.
4. Mã `G-<số>`, tăng dần, không dùng lại. Mục nợ ở `BACKLOG.md` trỏ về mã `G-`, không chép lại.

## Sổ

| mã | ngày | mục | giả thuyết | cách thử | kết quả | bằng chứng |
|---|---|---|---|---|---|---|
| G-01 | 12/09 | S-17 | Chrome trả **nút văn bản** cho `DOM.getNodeForLocation` nên `<button>Gửi</button>` bị từ chối oan | trang tự dựng, bấm nút chữ thuần qua Bridge | **SAI** | Chrome tự đi lên phần tử cha → `relation: "self"` (TRIALS 12/09, `127.0.0.1:38411`) |
| G-02 | 13/09 | S-22 | Kết quả không hiện vì `setTimeout` của tab nền bị Chrome bóp | chờ 120s sau lượt bấm | **SAI** | 120s không hiện; dấu `data-bam` đặt NGAY trong tay nghe cũng không có → tay nghe không chạy |
| G-03 | 13/09 | S-22 | Tab bị Chrome **đông cứng** | `?chan=1` — mã lúc tải trang dựng tấm chắn | **SAI** | tấm chắn dựng được → mã trang có chạy |
| G-04 | 13/09 | S-22 | Tab **không được vẽ** | `scout.shot` | **SAI** | 28.488 byte, ảnh đúng trang |
| G-05 | 13/09 | S-22 | Toạ độ lệch vì màn hình 125% | so `clickedAt` với ảnh chụp | **SAI** | `x:87 y:275` CSS px ↔ `108,344` trên ảnh = ×1,25 đúng |
| G-06 | 13/09 | S-22 | Có lớp che | `hit` + ảnh chụp | **SAI** | `relation: "descendant"`, ảnh trống trơn |
| G-07 | 13/09 | S-22 | ✅ **ĐÃ KIỂM LẠI 14/09 (G-40) — kết luận SAI giữ nguyên, nay có phép đo hai chiều chứ không chỉ lời nói.** Tab ẩn (`visibilityState: hidden`) làm mất sự kiện nhập | trang tự ghi `visibilityState` vào `body[data-hien]` | **SAI** | Đo được tab `hidden` và không `mousedown` nào tới cửa sổ — nhưng hai thứ chỉ **trùng lúc**. Đức xác nhận 13/09 đã debug trước: tab ẩn **không** ảnh hưởng bấm. Và G-08 tái hiện lỗi trên Chrome riêng |
| G-08 | 13/09 | S-22 | Lỗi nằm ở **lõi ghi**, không riêng ghế `Udin_Scout` | `npm run scouter:action-probe` — Chrome riêng, hồ sơ trống, chạy chính lõi hiện tại | **ĐÚNG, một phần** | `CLICK_REACHES_BELOW_THE_FOLD` ĐỎ, tái hiện 3/3; bấm/gõ/Enter trên màn hình vẫn XANH. Ca không cuộn ở ghế Đức thì chưa tái hiện được ở đây |
| G-09 | 13/09 | S-22 | Lỗi có từ TRƯỚC bản sửa T1 | chạy cùng phép đo với lõi ở commit `be4f16b5` | **SAI** | lõi trước T1: 11/11 XANH → **T1 gây ra** |
| G-10 | 13/09 | S-22 | Thủ phạm là **làm tròn toạ độ** (`Math.round`, T1) | lõi hiện tại, bỏ riêng làm tròn | **SAI** | vẫn ĐỎ |
| G-11 | 13/09 | S-22 | Thủ phạm là **bước hỏi-điểm** (`kiemDiemBam`, T1) | lõi hiện tại, bỏ riêng lượt gọi `kiemDiemBam` | **ĐÚNG** | XANH lại, trang báo đúng nút `duoi` |
| G-12 | 13/09 | S-22 | Chạy đua: chờ 100ms giữa hỏi-điểm và bấm là đủ | chèn `setTimeout 100` | **SAI** | vẫn ĐỎ |
| G-13 | 13/09 | S-22 | Phải `mouseMoved` trước khi hỏi-điểm | gửi `mouseMoved` trước `kiemDiemBam` | **SAI** | vẫn ĐỎ |
| G-14 | 13/09 | S-21 | Target thỉnh thoảng trả `-32000 No node found` vì tab nằm sau / cửa sổ thu nhỏ | — | **CHƯA** | giả thuyết ⒜ của `S-21`; lưu ý G-07 đã SAI cho một triệu chứng khác |
| G-15 | 13/09 | S-22 | Thủ phạm là `DOM.querySelectorAll` (bước tìm con cháu), không phải `DOM.getNodeForLocation` | lõi hiện tại, gọi `getNodeForLocation` rồi bỏ qua kết quả, không gọi `querySelectorAll` | **ĐÚNG** | XANH, trang báo đúng `duoi`. Nên nút `duoi` — **đọc sai**, xem G-17 |
| G-16 | 13/09 | S-22 | Hỏi-điểm làm trang **dịch đi** sau lượt cuộn, nên toạ độ đã tính bị cũ | đo lại hộp ngay sau hỏi-điểm, so với hộp trước | **CHƯA** | Lần thử 13/09 KHÔNG ra số: `console.error` chạy trong extension thử, không ra stdout của phép đo. Muốn đo thì phải trả số qua kết quả của lệnh, không qua log |
| G-17 | 13/09 | S-22 | Chỉ riêng `DOM.querySelectorAll` (không đổi gì khác) là đủ gây lỗi | lõi hiện tại, giữ nguyên `getNodeForLocation`, thay nhánh con cháu bằng `relation: "descendant"` không hỏi | **SAI** | vẫn ĐỎ. G-15 xanh vì nó NUỐT lỗi của hỏi-điểm, không vì bỏ `querySelectorAll` |
| G-18 | 13/09 | S-22 | Bản vá: hỏi danh sách con cháu **TRƯỚC** lượt cuộn, rồi mới cuộn–đo–hỏi-điểm–bấm | lõi hiện tại, dời `querySelectorAll` lên trước `centreOf` | **SAI** | vẫn ĐỎ |
| G-19 | 13/09 | S-22 | Sau lượt cuộn, hỏi-điểm NÉM lỗi → lượt bấm bị TỪ CHỐI (fail-closed), phép đo chỉ đọc trang nên tưởng là mất | đọc mã trả về của lượt bấm dưới màn hình (`--json`) | **ĐÚNG** | `click_duoi: {ok:false, code:"CLICK_HIT_TEST_FAILED", scrollY:1288}` |
| G-20 | 13/09 | S-23 | Chrome ném lỗi gì ở hỏi-điểm sau lượt cuộn | phép đo ghi thêm `detail` của lượt bấm `#duoi` | **ĐÚNG** | `-32000 No node found at given location` tại (38, 772) — **cùng câu với S-21** |
| G-21 | 13/09 | S-23 | Điểm (38, 772) nằm NGOÀI khung nhìn, hoặc hộp đo được là hộp cũ trước khi cuộn xong | phép đo ghi `innerHeight` + `getBoundingClientRect()` của `#duoi` ngay sau lượt bấm | **SAI** | khung nhìn 1036×799, nút `y 754..789` → tâm 772 đúng và NẰM TRONG khung. Máy ở tỉ lệ **1,25** |
| G-22 | 13/09 | S-23 | `DOM.getNodeForLocation` hiểu toạ độ khác hệ CSS px của `getBoxModel` (ví dụ nhân tỉ lệ 1,25) | sau lượt cuộn, hỏi-điểm ở nhiều điểm, so với `elementFromPoint` (hệ CSS) | **SAI** | sau cuộn, hỏng ở MỌI điểm thử (5/5), kể cả chỗ `elementFromPoint` thấy `div`/`button#duoi` → không phải lệch tỉ lệ |
| G-23 | 13/09 | S-23 | Sau cuộn, `DOM.getNodeForLocation` nhận toạ độ theo **trang** (cộng `scrollY`), không theo khung nhìn | hỏi-điểm ở (38, 772+1288=2060) và vài điểm trang | **ĐÚNG** | (38, 2060) → `button#duoi`. Chưa cuộn thì hai hệ trùng nhau — vì thế T1 qua mọi phép thử lúc làm. Điểm ngoài vùng đang hiện vẫn `No node found` |
| G-24 | 13/09 | S-23 | Độ cuộn đọc được bằng method SẴN CÓ: hộp `margin` của `<html>` (`DOM.getBoxModel`) lệch âm đúng bằng `scrollX/scrollY` | so với `window.scrollY` sau lượt cuộn | **ĐÚNG** | margin quad `[0,-1288,…]` ↔ `scrollY: 1288` |
| G-25 | 13/09 | S-23 | Bản vá: cộng độ cuộn (hộp `:root`) vào điểm hỏi, ở CẢ HAI lõi | `scouter:action-probe` + suite + đột biến | **ĐÚNG** | probe 11/11; suite xanh; đột biến 128/128 (thêm CU1..CU4) |
| G-26 | 13/09 | S-22 | Bản vá S-23 cũng chữa S-22 trên ghế Đức | `vong.mjs` trên `trang-thu-cham`, ghế `Dummy_Scout` (tên mới của ghế cũ `Udin_Scout`) | **SAI** | 14/09: nạp lại 255ms ĐẠT, rồi `LUOT_BAM_KHONG_TOI_NOI` — `scout.click` báo `relation:"descendant"` mà `body[data-chuot]` = 0. S-23 là lỗi KHÁC, đã vá; S-22 còn nguyên |
| G-27 | 13/09 | S-21 | `No node found` của S-21 (12/09) chính là S-23: trang lúc đó đã cuộn | — chưa có cách tái hiện lại lượt 12/09 | **CHƯA** | cùng câu lỗi; chưa đo độ cuộn lúc đó |
| G-28 | 13/09 | Udin | Scouter vượt được màn "User Limit Reached" bằng nút Try Again | `pilots/udin-optic/scripts/qua-man-cho.mjs`: wait usable → click → wait overlay absent → wait prompt usable | **ĐÚNG** | click `relation: self` (768,455); màn chắn tắt; `textarea.agent-textarea` usable |
| G-29 | 13/09 | Udin | `scout.type` vào `textarea.agent-textarea` tới được React: nút `button.agent-send-button` hết `disabled` | type → query nút Send, xem còn thuộc tính `disabled` không | **ĐÚNG** | gõ "a red car" (typed 9) → 800ms sau nút Send mất `disabled`. Chưa bấm Send |
| G-36 | 14/09 | W3 | `scout.fetch` trả kết quả **phẳng**, không bọc trong `.data` như `scout.query` | lượt gọi thật đầu tiên | **ĐÚNG** | bản đầu đọc `.data` → `Cannot read properties of undefined`. 15 khối ghim vẫn xanh vì máy giả chép đúng cái hiểu sai của tôi — **phép ghim không kiểm được hình dạng dây** |
| G-30 | 13/09 | Udin | `scout.click` nút Send tới trang: Udin nhận prompt (nút Send khoá lại / DOM đổi) | đếm phần tử trước-sau click | **ĐÚNG** | click `descendant` (352,652) → 1,5s: nút thành `stop-button`, `agent-message-item user` hiện → 68s: `stop-button` tắt, 4 `img.batch-grid-image` "Variation 1..4" |

| G-31 | 14/09 | W3 | Ảnh kết quả Udin có `src` là URL **http(s) tuyệt đối** (không phải `blob:`), nên máy phục vụ nền với tới được bằng `scout.fetch` | `scout.query img.batch-grid-image` rồi đọc `src` | **ĐÚNG** | 16 nút ảnh, `src` là `https://optic-canvas-cache-vinfast.s3.us-east-1.amazonaws.com/ephemeral/…/generated/batch-….webp` |
| G-32 | 14/09 | W3 | Một ảnh nằm dưới trần `FETCH_MAX_BODY_BYTES` (512 KiB **sau** base64 ≈ 384 KiB thô) | `lay-anh.mjs` — quá trần thì trả `FETCH_BODY_TOO_LARGE` kèm số byte thật | **CHƯA** | chưa tới bước này: G-35 chặn trước |
| G-33 | 14/09 | W3 | CDN ảnh của Udin **không đòi cookie**: `credentials: omit` (mặc định) vẫn trả 200 | `lay-anh.mjs` | **SAI, nhưng không phải vì cookie** | 403. Nguyên nhân thật ở G-35 — S3 là URL **ký sẵn**, chữ ký nằm trong query. Đừng đi bật `with_credentials`: cookie không cứu một URL thiếu chữ ký |
| G-34 | 14/09 | E2E | Ba chặng W1→W2→W3 chạy liền một mạch trên ghế thật, không cần tay người xen giữa | `e2e.mjs "<chữ MỚI>"` — mỗi lượt một prompt khác | **CHƯA** | không chạy: W3 đang CHẶN (G-35), chạy chỉ tốn credit rồi ngã ở chặng ba |
| G-35 | 14/09 | W3 | 403 là vì **chính sách che của lõi ĐỌC cắt query string** khỏi mọi `href`/`src`, mà ảnh S3 là URL ký sẵn — chữ ký nằm đúng trong phần bị cắt | đọc `stripQuery` trong `observer-probes.mjs`; đếm `src` kết thúc bằng `…` trên trang thật | **ĐÚNG** | 17/17 `src` khác nhau đều bị cắt; `scout.query` tự khai `policy: de-xuat-chat-v1` — *"href/src bị cắt query và fragment"*. Đây là **bảo vệ**, không phải bug: đừng nới |

| G-37 | 14/09 | S-22 | Trên ghế `Udin_Scout` HÔM NAY, một lượt bấm **không phải cuộn** có tới được trang không | chạy `qua-man-cho.mjs` thật: bấm Try Again rồi kiểm **màn chắn có tắt không** — kiểm bằng trang, không bằng lời báo của `scout.click` | **ĐÚNG** | `{"daChan":true,"bam":1}` — màn chắn có thật, bấm 1 lần, màn chắn tắt, ô prompt `usable`. Đây **chưa phải** G-26: G-26 hỏi ca `trang-thu-cham` (cần một tab trống trên ghế đó), còn đây là một trang khác. Nhưng nó đúng HÌNH DẠNG của S-22 (bấm không cuộn) và **không tái hiện** |

| G-38 | 14/09 | S-22 | ~~Lượt bấm chỉ tới được trang khi tab ĐANG HIỆN~~ **SAI, xem G-40** — giữ dòng để đừng ai thử lại | cùng một lệnh `vong.mjs`, chạy hai lần: một lần tab ẩn (đã có), một lần sau khi tay người bấm cho tab hiện lên | **SAI** | Vế kia đo được ở `G-40`: tab ẩn trên Chrome sạch vẫn nhận đủ cú bấm. Mối tương quan ở ghế Đức là TRÙNG LÚC, đúng như `G-07` đã kết luận 13/09 |
| G-39 | 14/09 | S-22 | `document.hasFocus()` là dấu đáng tin để biết vì sao bấm hỏng | đọc `body[data-focus]` cùng lúc với `data-hien` | **SAI** | Đo được `data-focus="co"` TRONG KHI `data-hien="hidden"` — giá trị cũ đọng lại vì trang chỉ ghi lại lúc có sự kiện. Dùng `data-hien`, đừng dùng `data-focus` |

| G-40 | 14/09 | S-22 | (vế còn thiếu của G-38) Tab **ẩn** thì lượt bấm không tới — đo trên Chrome SẠCH do phép đo tự mở | bản chép `scouter-action-reality-probe.mjs` + mở tab thứ hai cho tab trang thử thành nền | **SAI** | tab `hidden` vẫn nhận đủ: `themCuBam: 1` cả ba lượt (ẩn · ẩn · hiện lại). **G-38 SAI theo** — Đức đã đúng từ 13/09, và `G-07` giữ nguyên kết luận SAI |
| G-41 | 14/09 | S-22 | Cửa sổ Chrome **thu nhỏ** thì lượt bấm không tới | cùng phép đo, `Browser.setWindowBounds` `minimized` rồi `normal` | **SAI** | thu nhỏ vẫn `themCuBam: 1`. Đây cũng là giả thuyết ⒜ của `S-21` (G-14) — nay loại được |
| G-42 | 14/09 | S-22 | Tab **mở nền và CHƯA TỪNG được hiện lần nào** (chưa vẽ) thì lượt bấm không tới | cùng phép đo, `chrome.tabs.create({active:false})` rồi bấm ngay, sau đó cho hiện lên bấm lại | **SAI** | chưa từng hiện vẫn `themCuBam: 1` |
| G-43 | 14/09 | S-22 | Hỏng theo GHẾ (cả ghế mất đường ghi) hay theo TAB | cùng ghế `Dummy_Scout`, cùng phút: bấm ô nhập trên Udin, rồi bấm nút trên trang thử | **Theo TAB** | Udin: `:focus` 0 → 1, `relation:"self"`. Trang thử: `relation:"descendant"` mà `data-chuot` vẫn 0. Ghế vẫn ghi được; riêng tab đó thì Input biến mất |
| G-44 | 14/09 | S-22 | Trang thử đang bị che / có hộp thoại / vẽ sai nên lượt bấm rơi chỗ khác | `scout.shot` + `scout.page` chính tab đang hỏng | **SAI** | ảnh đúng trang, không lớp che, 2 phần tử tương tác. Và tay nghe đặt ở **tầng cửa sổ, pha bắt** — sai toạ độ thì vẫn phải thấy `mousedown`, mà `data-chuot` = 0: **không một sự kiện chuột nào tới trang** |

| G-45 | 14/09 | S-22 | Phiên gỡ lỗi gắn vào tab hỏng NỬA (DOM còn, Input mất); `scout.reload` gắn lại là chữa được | trên ghế Đức: reload → bấm → đo `data-chuot` | **SAI** | **Lần đầu ĐÚNG** (0→1, `data-bam` 0→1) nên tôi tưởng đã tìm ra. Chạy lại 4 lượt hai chiều: **KHÔNG TỚI cả 4**, kể cả hai lượt ngay sau khi gắn lại. Một lần chạy được **không lặp lại** thì không phải bằng chứng — nó chỉ nói rằng lỗi **CHẬP CHỜN**, đúng như mô tả gốc 12/09 (*"có chạy lúc 16:41 rồi thôi chạy từ ~16:44"*) |
| G-46 | 14/09 | S-22 | Điều hướng sau khi đã gắn gỡ lỗi làm hỏng đường Input | Chrome sạch: `chrome.tabs.update` đổi URL rồi bấm, không gắn lại | **SAI** | vẫn `themCuBam: 1`. Trên ghế Đức thì lượt sau điều hướng hay hỏng, nhưng G-45 cho thấy lượt KHÔNG điều hướng cũng hỏng → điều hướng không phải biến quyết định |
| G-47 | 14/09 | S-22 | ~~Biến còn lại: tab **đang hoạt động** (active) của cửa sổ thì bấm tới, tab nền thì không~~ | — | **RÚT 14/09** | **Đây là tab ẩn lần thứ tư.** `G-07` (Đức xác nhận đã tự debug), `G-40` (Chrome sạch, tab nền vẫn nhận đủ), `G-42` (chưa từng hiện, vẫn nhận đủ) đã giết nó, và khối *Kết luận* của chính file này đã ghi **"đừng thử lại"** trước khi tôi mở dòng này. Mở lại một giả thuyết đã đóng thì phải có **dữ kiện mới**, không phải một tương quan cũ đếm lại |

| G-48 | 14/09 | S-22 | ⚠️ **PHÉP ĐO HỎNG, không phải giả thuyết** — mọi lượt đọc `body[data-chuot]` / `#ket-qua[data-bam]` bằng **sự tồn tại** của thuộc tính chỉ thấy được lượt bấm ĐẦU TIÊN | dò `[data-bam="n"]` để lấy **giá trị**, không hỏi "có thuộc tính không" | **ĐÚNG (là lỗi của tôi)** | Đo lại bằng giá trị: `data-chuot` **6 → 7** trên chính tab mà mười phút trước tôi khai "không tới". Bộ đếm đã chạy tới 6 trong khi phép đo của tôi vẫn in "1 → 1". **Mọi dòng ĐỎ đo bằng cách cũ đều phải đọc lại** — gồm cả bốn lượt của `G-45` |
| G-49 | 14/09 | S-22 | ~~Tab **đang hiện** thì lượt bấm tới, tab **ẩn** thì không — đo GHÉP CẶP~~ | ~~`scratchpad/do-cap-doi.mjs`, 18 lượt~~ | **RÚT 14/09** | Lần thứ năm của cùng một câu hỏi, xem `G-47`. Phép đo đã chạy 18 lượt và **không kết luận được** (thiếu vế "tab hiện" vì nó cần tay Đức) — tức là nó tốn thời gian của Đức để trả lời một câu đã có đáp án từ `G-40`. Đức chốt 14/09: **thôi đo S-22** |
| G-50 | 14/09 | S-22 | Nếu còn ai mở lại S-22: thứ CHƯA thử là **Chrome tự đông cứng renderer của tab nền** (Memory Saver / tab freezing) — khác hẳn "tab ẩn", vì nó phụ thuộc **thời gian + số tab + RAM**, nên Chrome sạch chạy 30 giây không bao giờ tái hiện | `chrome://discards` xem cột *Frozen*, hoặc tắt Memory Saver rồi chạy lại — **không cần một chiến dịch đo** | **CHƯA, và cố ý để nguyên** | Khớp với ba thứ đã đo mà chưa giải thích được: hỏng **theo TAB** (`G-43`), DOM chạy mà Input mất, và mô tả gốc 12/09 *"chạy lúc 16:41 rồi thôi từ ~16:44"* — đúng hình dạng một bộ đếm giờ đông cứng. Ghi ra để **không ai phải nghĩ lại từ đầu**; đừng lấy nó làm cớ mở chiến dịch thứ sáu |
| G-51 | 14/09 | W3 | URL ký sẵn của ảnh Udin **hết hạn**, nên ảnh cũ trên trang không tải lại được | đọc `X-Amz-Expires` khai trong `src`, so mốc `batch-<ms>` với giờ hiện tại, rồi `scout.grab` thật | **ĐÚNG** | `X-Amz-Expires=900`. Mọi ảnh đang hiện là của **13/09**, cách lượt đo **~100.800 giây**. Grab trả **403** — đúng, không phải lỗi. Trình duyệt vẫn hiện chúng vì **cache**, nên nhìn màn hình thì tưởng còn sống |
| G-52 | 14/09 | W3 | `scout.grab` đọc được `src` ĐẦY ĐỦ bên trong extension (không phải bản đã che) | grab một ảnh thật; nếu nó dùng bản che (mất query) thì S3 trả **400/404**, dùng bản đầy đủ đã hết hạn thì trả **403 chữ ký hết hạn** | **ĐÚNG** | Trả đúng **403**. Đây là bằng chứng gián tiếp nhưng phân biệt được: hai đường vào cho hai mã lỗi khác nhau |
| G-53 | 14/09 | W3 | `src` mà `scout.query` trả về **không phải tiền tố** của `src` trên trang | dựng `[src^="<src đã che>"]` rồi đếm khớp | **ĐÚNG** | Khớp **0**. Lõi đọc gắn thêm dấu `…` để BÁO đã cắt query (`stripQuery`), và dấu đó không có thật trong `src`. **23 khối ghim vẫn xanh** trên bản mã hỏng vì máy giả của tôi trả `src` sạch. Đã vá + thêm khối ⓥ mang đúng hình dạng thật |
| G-54 | 14/09 | W3 | `alt` đủ để chỉ đúng một ảnh kết quả | đếm `img.batch-grid-image[alt="Variation 1"]` trên trang thật | **SAI** | Khớp **4** — mỗi lượt sinh ảnh lại đẻ ra một bộ `Variation 1..4`. 16 nút · 16 `src` khác nhau · `alt` trùng 4 lần. Phép chọn selector **tự bắt được** và rơi xuống `[src^=]`; nếu tôi đã ghim `:nth-of-type` như dự tính ban đầu thì nó tải nhầm ảnh mà không ai biết |
| G-55 | 14/09 | W2 | Trần 300s của `gui-prompt` là "quá thì hỏng" | gửi prompt mới; W2 hết giờ ở 300s, rồi ĐO TIẾP trạng thái trang | **SAI — và đây là khuyết tật của adapter** | Hết 300s, `gui-prompt` bỏ cuộc, nhưng `stop-button` **vẫn bật sau 17 phút**: Udin **vẫn đang chạy**, credit **đã tiêu**, còn lượt chạy thì vứt đi. "Quá giờ" và "hỏng" là hai câu khác nhau, và gộp chúng làm mất trắng một lượt tốn tiền |
| G-56 | 14/09 | seed | `scout.shot` chạy được trên trang Udin hôm nay | gọi hai lần liền | **SAI** | Cả hai lần `TRANSPORT_DISCONNECTED`, trong khi `scout.query` · `scout.page` · `system.capabilities` cùng lúc đó vẫn chạy. Nghi phong bì ảnh quá lớn cho tầng vận chuyển. **Chưa đào** — ghi để lượt sau khỏi tưởng là tab chết |
| G-57 | 14/09 | O8 | `scout.text` đọc được chữ của một phần tử trên trang THẬT, và từ chối đúng hai ca xấu | nạp lại extension bằng `scout.reload`, rồi gọi bốn lượt trên trang Udin | **ĐÚNG** | 19 method sau nạp lại. `.concurrency-overlay` → 100 ký tự: *"User Limit Reached… Try Again"*. `div` (khớp **146**) → `SELECTOR_AMBIGUOUS`. Selector không khớp gì → `SELECTOR_NO_MATCH`. Và nó trả lời luôn câu mà suốt buổi tôi mù: **màn chắn là thật, Udin đang hết chỗ** |
| G-58 | 14/09 | O8 | Trần 5.000 ký tự có thật sự giữ được "khối lượng" như `ADR-0006` hứa không | `scout.text` trên `body` của trang Udin | **SAI — trần KHÔNG giữ được điều đó** | `body` là **một** phần tử nên hợp lệ, và cả trang chỉ **1.390 ký tự** → ra hết trong một lượt. Giá này đã được khai trước trong `ADR-0006` (*"ai chỉ được `body` thì vẫn lấy được nhiều chữ"*), nên nó là **giới hạn đã biết**, không phải bất ngờ. Không siết thêm, và đây là lý do: `scout.shot` vốn đã trả **cả trang dưới dạng ảnh** — chữ của trang không phải một kênh mới. Siết `body` thì `body > div` lách được ngay, tức là một cái khoá chỉ để nhìn cho yên tâm |
| G-59 | 14/09 | O11 | Ảnh Udin **lọt được** một phong bì Bridge | `scout.grab` một ảnh tươi (sinh 71 giây trước) | **SAI** | Ảnh thật **746.722 byte** → base64 **995.632 byte**, vượt trần thân 524.288. Và trần đó **không tuỳ tiện**: phong bì Bridge chặn ở **1 MiB**, mà `MAX_ENVELOPE_BYTES` nằm ở `_shared/bridge-host` — **lõi dùng chung với ba gói đóng băng**, nên không nới. Đây là chỗ `W3` đang tắc, KHÔNG phải một lỗi của grab |
| G-60 | 14/09 | O11 | Phần còn lại của đường grab **ĐÃ CHẠY ĐÚNG** — chỉ tắc ở kích thước | cùng lượt gọi trên | **ĐÚNG** | Lời từ chối in ra **746.722 byte**, tức là extension đã: đọc `src` đầy đủ bên trong · gọi mạng với URL ký sẵn **còn hạn** · nhận về một ảnh thật. Bốn bước đầu của `O11` xanh; chỉ bước trả về là đỏ |
| G-61 | 14/09 | O11 | Máy chủ ảnh của Udin (S3) **nhận `Range`**, nên lấy được theo từng khúc mà không cần nới trần nào | `scout.grab` có tham số `part`, mỗi khúc một lượt `Range`; kiểm `status 206` + `Content-Range` | **CHƯA** | Đường này KHÔNG thêm trạng thái nào trong extension (mỗi khúc một lượt gọi riêng) và KHÔNG nới một lớp bảo vệ nào — đó là lý do chọn nó thay vì nâng trần phong bì. Máy chủ lờ `Range` thì phải ĐỎ với câu nói rõ, đừng lặng lẽ trả cả file |
| G-62 | 14/09 | O11 | Header `Range` dùng được trong service worker của extension | chia đôi: bỏ ĐÚNG header `Range`, giữ nguyên mọi thứ khác, rồi gọi lại | **SAI** | Có `Range` → `TRANSPORT_DISCONNECTED` mọi lượt. Bỏ đúng header đó → grab chạy và trả lỗi sạch. `G-61` **SAI theo**: đường lấy theo `Range` chết. Thay bằng: tải cả tệp rồi **chỉ mã hoá khúc này** — không cần `Range`, không giữ trạng thái |
| G-63 | 14/09 | — | ~~Tầng vận chuyển có một NGƯỠNG cỡ, dưới ngưỡng thì chạy~~ | máy chủ tại chỗ trả đúng N byte, tăng dần, **mỗi cỡ thử MỘT lần** | **SAI — và sai vì phép đo, không vì tầng vận chuyển** | Bảng đầu tiên trông như một ngưỡng sạch (74.668 base64 chạy · 85.336 đứt) và tôi đã viết kết luận đó ra. Đo lại bằng **cùng một cỡ, nhiều lượt**: khúc 0 (65.536) **chạy** · khúc 14 (65.536) **chạy** · khúc 8 (65.536) **ĐỨT** · khúc 15 (12.592) chạy. Cùng cỡ, hai kết quả → **CHẬP CHỜN**, không phải ngưỡng. Mỗi cỡ thử một lần thì một lỗi chập chờn luôn trông như một ngưỡng |
| G-64 | 14/09 | S-25 | ✅ Tầng vận chuyển **rớt chập chờn** khi phong bì lớn, và đó là nguyên nhân chung của `G-56` (`scout.shot` chết hôm nay) lẫn mọi lượt `scout.grab` trả thân thật | gọi lặp cùng một khúc; đếm tỉ lệ đứt theo cỡ | **CHƯA** | Có bằng chứng đủ để **không đoán tiếp**: cùng cỡ hai kết quả khác nhau, và `TRANSPORT_DISCONNECTED` tự khai là *retryable*. Chốt chặn cỡ ở đường gửi ra đo theo `MAX_ENVELOPE_BYTES` (1 MiB) nên nó không bao giờ bắt được ca này. Cách đi tiếp **không phải** đo thêm: adapter thử lại có trần, và chữa gốc ghi thành `S-25`. — **ĐÓNG 14/09**: gốc là `G-67`, đã chữa, và `G-71` đo lại trên dây thật 15/15 ở đúng cỡ từng chết. Một chi tiết trong ô này **SAI**: `_shared/bridge-host` KHÔNG dùng chung với ba gói đóng băng — mỗi gói giữ một bản sao riêng |
| G-65 | 14/09 | O12 | **Zoom out làm ứng dụng dạng artboard vẽ ra THÊM phần tử**, nên Scouter nhìn được nhiều hơn — chứ không chỉ ảnh chụp gọn hơn | Đức zoom ra rồi zoom lại **mà không đụng gì khác**, đếm `div`/`button` hai lần | **CHƯA** | Đo sau khi Đức zoom: `div` **146 → 224**, `button` **10 → 35**. **KHÔNG kết luận được**: giữa hai lượt đo có một lượt nạp lại trang và một loạt ảnh mới, tức là **ba biến đổi cùng lúc**. Đây đúng cái bẫy `G-48` để lại. Phép thử sạch tốn của Đức 10 giây, và nó quyết định `O12` là năng lực THẬT hay chỉ là tiện cho ảnh chụp |
| G-66 | 14/09 | O12 | Ảnh chụp cả trang (`captureBeyondViewport`) thay được zoom cho việc "nhìn toàn cảnh" | — | **SAI, do `G-63`** | Nó là một **tham số** của method đã có trong danh sách đọc, nên trông rẻ hơn hẳn. Nhưng ảnh cả trang của một artboard lớn thì to hơn ảnh khung nhìn nhiều lần, mà tầng vận chuyển đã đo được là **rớt chập chờn quanh 65 KB**. Zoom ra rồi chụp khung nhìn cho **cùng phạm vi với ít byte hơn**. Đường này chỉ mở lại được sau khi `S-25` xong. — **ĐIỀU KIỆN ĐÃ ĐỦ 14/09**: `T24` ghép được mảnh nối, nên cái chặn đã mất. Và `clip.scale` làm nốt phần còn lại: chụp cả tài liệu RỒI THU NHỎ ngay trong lượt chụp, tức là đúng cái *"cùng phạm vi với ít byte hơn"* mà dòng này nói zoom mới làm được. Nên câu kết luận **SAI** ở trên vẫn đúng với ngày nó được viết, còn hôm nay đường ấy đang chạy — xem `G-69` cho nửa còn lại |
| G-67 | 14/09 | S-25 | ✅ **GỐC CỦA `S-25`**: bộ giải khung WebSocket của máy chủ **ném lỗi ở mọi tin bị cắt mảnh**, mà Chrome tự cắt mảnh khi tin vượt ~64 KiB | đưa thẳng một tin cắt hai mảnh đúng chuẩn (`fin=0` + `opcode=0`) vào `createFrameDecoder` | **ĐÚNG** | Ném ngay ở mảnh ĐẦU: *"Fragmented WebSocket messages are not supported."* (`_shared/bridge-host/websocket-core.mjs:76`). Khớp cả bốn triệu chứng: ngưỡng ~65 KB · **chập chờn** (Chrome cắt hay không tuỳ nhịp đệm, nên cùng một cỡ lượt chạy lượt đứt) · `scout.shot` chết · mọi lượt grab trả thân thật chết. Đây là một ca **CHƯA VIẾT**, không phải một lớp bảo vệ — nên sửa nó không phạm luật *"không nới bảo vệ"*; bản sửa thuần THÊM VÀO |
| G-68 | 14/09 | S-25 | Sau khi ghép được mảnh nối, trần khúc của `scout.grab` nâng lại được và một ảnh Udin về **một hoặc hai** khúc | sửa `T24` xong rồi nâng `FETCH_MAX_BODY_BYTES`, đo lại bằng `scratchpad/may-do-co.mjs` | **CHƯA** | 64 KiB đặt ra **để né đúng `G-67`**, không phải vì một giới hạn thật. `T24` xong ngày 14/09 và trần đã nâng lại lên **512 KiB** (`T31`) — nhưng **chưa đo lại trên dây thật**, nên dòng này vẫn `CHƯA`: một con số đã đổi trong mã không phải một phép đo. Cần Đức nạp lại extension |
| G-69 | 14/09 | O12 | **Một lượt thu phóng SỐNG QUA NHIỀU LƯỢT GỌI là bất khả ở kiến trúc hiện nay**: `observer-engine.js` gắn rồi THÁO debugger quanh từng lượt gọi (dòng 123 và 160), mà `Emulation.setDeviceMetricsOverride` sống theo phiên debugger | mở `input.zoom`, gọi nó, rồi gọi `scout.view` ở một lượt sau và xem `zoom` có đổi không | **CHƯA** | Chưa đo, và **cố ý chưa làm cái để đo**: nếu đúng thì một `scout.zoom` đứng riêng sẽ trả về *"đã thu phóng"* rồi không còn gì thu phóng nữa — một lệnh nói dối theo đúng nghĩa đen. Đổi vòng đời gắn debugger là quyết định KIẾN TRÚC (nó giữ debugger cắm vào tab của Đức giữa các lượt gọi, và dải băng *đang gỡ lỗi* ở lại), nên nó là câu của Đức chứ không phải một tham số. **Nửa ⑴ của `O12` không cần câu trả lời này** và đã làm xong bằng `scout.shot full_page + scale` |
| G-71 | 14/09 | S-25 | ✅ **Sửa xong `T24` thì tin lớn đi được trên DÂY THẬT, và hết chập chờn** | `scout.shot format:"png"` lên bảng bên — phong bì **87.298 byte (85,3 KiB)** — lặp **15 lượt liền** trên máy chủ đã sửa, extension **KHÔNG nạp lại** | **ĐÚNG** | **15 chạy / 0 đứt**, cỡ giống nhau từng byte cả 15 lượt. Đúng cỡ `85.336` mà lần chia đôi đầu tiên ghi là **ĐỨT**, và đúng vùng `G-63` đo được là chập chờn. Đây là phép đo sạch nhất có thể lấy lúc này: `S-25` nằm ở **máy chủ**, nên nó kiểm được mà không cần đụng tới extension — mã extension y nguyên bản đang chạy từ trước. `G-64` đóng theo: nguyên nhân chung đã tìm ra và đã chữa |
| G-70 | 14/09 | O13 | `Page.getLayoutMetrics` trả về số đo **dùng được** trên trang thật Udin (artboard có bảng bên cuộn riêng), không chỉ trên trang giả | gọi `scout.view` trên tab Udin, so `scroll`/`conLai` trước và sau một lượt `scout.scroll` | **CHƯA** | Cả sáu dòng năng lực mở ngày 14/09 đều đang ở `CÓ` chứ không `ĐÃ CHỨNG MINH`, và đây là phép đo biến chúng thành `ĐÃ CHỨNG MINH`. Cần Đức nạp lại extension trước |

## Phép đo dùng lại được — đừng dựng lại

| cần biết | dùng | tốn |
|---|---|---|
| lõi ghi có bấm/gõ **tới trang** không, ngoài trình duyệt của Đức | `npm run scouter:action-probe` | ~30s, Chrome riêng |
| một bản sửa của lõi có gây lỗi không | chép lõi cũ bằng `git show <commit>:…/scouter-actions-core.mjs` vào thư mục tạm cạnh bản chép của phép đo, chạy ở đó | ~30s |
| sự kiện có **tới trang** không, trên ghế thật | trang `pilots/trang-thu-cham/` — `body[data-chuot]` · `body[data-phim]` · `#ket-qua[data-bam]` đọc bằng `scout.query` | vài giây |
| tab đang hiện/ẩn, có focus không | cùng trang — `body[data-hien]` · `body[data-focus]` | vài giây |
