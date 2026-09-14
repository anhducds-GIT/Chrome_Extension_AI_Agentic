# SỔ GIẢ THUYẾT — Scouter

> **TRA SỔ NÀY TRƯỚC KHI THỬ BẤT CỨ GÌ.** Đức chốt 13/09, sau khi một phiên đi vòng lại đúng
> những giả thuyết đã loại trừ: *"cần một bản ghi các giả thuyết và kết quả, để trong quá trình
> trial có thể tra cứu và không lặp lại việc đã làm."*
>
> Cách tra: `grep -n "<từ khoá>" workers/duc-scouter/v0.1.0/docs/GIA-THUYET.md` — ví dụ `ẩn`,
> `cuộn`, `hit-test`, `setTimeout`. Thấy dòng **SAI** thì đừng thử lại; thấy **CHƯA** thì đọc
> cột *cách thử* để khỏi làm lại phần đã làm.

## Kết luận hiện tại (13/09)

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
| G-07 | 13/09 | S-22 | ⚠️ **XEM LẠI — G-38 (14/09) dựng lại đúng mối tương quan này trên ghế `Dummy_Scout`, chưa lật kết luận nhưng đừng coi câu này là đã đóng.** Tab ẩn (`visibilityState: hidden`) làm mất sự kiện nhập | trang tự ghi `visibilityState` vào `body[data-hien]` | **SAI** | Đo được tab `hidden` và không `mousedown` nào tới cửa sổ — nhưng hai thứ chỉ **trùng lúc**. Đức xác nhận 13/09 đã debug trước: tab ẩn **không** ảnh hưởng bấm. Và G-08 tái hiện lỗi trên Chrome riêng |
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

| G-38 | 14/09 | S-22 | Lượt bấm chỉ tới được trang khi tab ĐANG HIỆN; tab ẩn thì sự kiện không tới cửa sổ | cùng một lệnh `vong.mjs`, chạy hai lần: một lần tab ẩn (đã có), một lần sau khi tay người bấm cho tab hiện lên | **CHƯA** | Mới có MỘT vế: tab ẩn → `data-hien="hidden"`, `data-chuot` 0, bấm hỏng. Vế kia (tab hiện → bấm tới) mới có bằng chứng ở trang KHÁC (`G-37`, Udin). Cần đúng một lượt bấm tay của Đức để khép |
| G-39 | 14/09 | S-22 | `document.hasFocus()` là dấu đáng tin để biết vì sao bấm hỏng | đọc `body[data-focus]` cùng lúc với `data-hien` | **SAI** | Đo được `data-focus="co"` TRONG KHI `data-hien="hidden"` — giá trị cũ đọng lại vì trang chỉ ghi lại lúc có sự kiện. Dùng `data-hien`, đừng dùng `data-focus` |

## Phép đo dùng lại được — đừng dựng lại

| cần biết | dùng | tốn |
|---|---|---|
| lõi ghi có bấm/gõ **tới trang** không, ngoài trình duyệt của Đức | `npm run scouter:action-probe` | ~30s, Chrome riêng |
| một bản sửa của lõi có gây lỗi không | chép lõi cũ bằng `git show <commit>:…/scouter-actions-core.mjs` vào thư mục tạm cạnh bản chép của phép đo, chạy ở đó | ~30s |
| sự kiện có **tới trang** không, trên ghế thật | trang `pilots/trang-thu-cham/` — `body[data-chuot]` · `body[data-phim]` · `#ket-qua[data-bam]` đọc bằng `scout.query` | vài giây |
| tab đang hiện/ẩn, có focus không | cùng trang — `body[data-hien]` · `body[data-focus]` | vài giây |
