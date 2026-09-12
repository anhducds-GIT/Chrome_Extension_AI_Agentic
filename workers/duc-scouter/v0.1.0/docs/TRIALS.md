# TRIALS — những trang Scouter đã thử, và học được gì

> **Đây là một cuốn SỔ, không phải hàng rào.** Đức chốt 07/09: *"nhiễm cũng được, chỉ là 1 list
> các trial mà ta đã thử thôi, ko quá khắt khe đâu, trừ khi nó ảnh hưởng quá."*
>
> Viết cho Đức đọc. Mỗi dòng trả lời đúng một câu: **trang này đã thử tới đâu, và nó dạy seed
> được gì.**

## Ba luật của cuốn sổ này

1. **Mỗi dòng phải trỏ về một lượt đã CHẠY THẬT.** Không ghi dự định. Chưa chạy thì chưa có dòng.
2. **Cột "dạy seed được gì" là lý do cuốn sổ tồn tại.** Một trang thử xong mà không dạy được gì
   thì ghi thẳng *"không"* — đó cũng là thông tin, và nó thật hơn một câu chữ nghĩa.
3. **Thứ nào không riêng của trang nào thì đẩy lên seed**, rồi ghi lại ở đây là đã đẩy.
   Luật gốc: [ADR-0009](../../../../docs/adr/0007-scouter.md) mục ⑵.

## Đã thử

| Trang | Ngày | Thử gì | Kết quả | Dạy seed được gì |
|---|---|---|---|---|
| Trang tự dựng (thư mục tạm) | 06/09 | Cú bấm của máy có được trang coi là thật không | **ĐẠT** — `isTrusted: true` qua `chrome.debugger`; `element.click()` thì không | Đóng luôn hướng `element.click()`. Ba worker cũ đang dùng cách đó |
| Trang tự dựng (thư mục tạm) | 07/09 | Chính lõi hành động của Scouter, bấm–gõ trên trang thật | **ĐẠT 11/11** trên Chrome 152, kể cả ca phải cuộn 1288px hai chiều | Hai hệ toạ độ không lệch. **Chưa đo:** trang có khung lồng · trang đổi tỉ lệ hiển thị |
| `hnx.vn` — kết quả giao dịch phái sinh | 07/09 | Dữ liệu nằm ở đâu, gọi bằng tham số nào | **Đo xong hợp đồng trang.** Bảy tham số đọc thẳng từ mã trang; một ngày ~46 KB (KHÔNG phải 231 KB như ghi lần trước) | ⑴ Có trang **không cần bấm nút nào** → `scout.fetch` là năng lực chính, không phải bấm–gõ. ⑵ **200 OK không chứng minh gì**: ngày nghỉ cũng 200 + JSON hợp lệ, chỉ khác ở chỗ 0 ô dữ liệu (đo: 192 với 0). ⑶ Sai tham số ra **một trang HTML**, không ra lỗi |
| `hnx.vn` — tầng vận chuyển | 07/09 | Vì sao Node không với tới được | Máy chủ gửi **thiếu mắt xích chứng chỉ** (chỉ leaf). Chrome tự lấy qua AIA, Node ném `UNABLE_TO_VERIFY_LEAF_SIGNATURE` | Một lý do nữa để pilot chạy **qua Scouter chứ không qua script Node**. Và đừng bao giờ vá bằng cách tắt kiểm chứng chỉ — lấy đúng mắt xích thiếu thì kiểm vẫn tử tế |
| `hnx.vn` — điều hướng | 07/09 | Bộ tải tĩnh có tìm ra trang không | **Không.** Menu dựng bằng JavaScript; `cau-truc-website.html` trả 16 liên kết, không có cái nào dẫn tới trang kết quả | **Tìm ra trang** cần Chrome; **lấy dữ liệu** thì không. Hai bài toán khác nhau, và lẫn chúng là chọn sai công cụ |
| `vinfast.udinbv.com/optic` — Udin, công cụ thiết kế (**ca thử**, không phải đích) | 12/09 | Seed có đọc được một SPA React khác hẳn `hnx.vn` không, và **không sửa một dòng seed nào** | **ĐẠT** — `scout.targets` · `page` · `a11y` · `tree` · `shot` đều chạy. 15 phần tử tương tác, cây trợ năng đọc ra *"nút Agent"* / *"nút Manual Gen"* trong khi DOM chỉ có hai `button.create-mode-btn` **không phân biệt được** | ⑴ Câu **"năng lực chung"** thôi là lời khai: cùng seed, hai hình dạng trang. ⑵ Đây là trang đầu tiên **bắt PHẢI GÕ và BẤM mới ra dữ liệu** — đúng tiêu chí `ROADMAP.md` mục ① thêm ngày 08/09, mà ba ứng viên đề xuất hôm đó (`hsx.vn` · CafeF · Vietstock) **không cái nào** đáp ứng gọn bằng. ⑶ Ép lộ chỗ seed còn THIẾU: nó không có cách **đợi**, nên sinh ra `scout.wait`; và không **nghe** được mạng, nên sinh ra `scout.network`. Cả hai đã đẩy lên SEED, không nằm ở adapter nào |
| `vinfast.udinbv.com/optic` — lượt GHI đầu tiên trong việc thật | 12/09 | Gõ prompt → chờ nút sống lại → bấm Send → nghe mạng. **Lượt ghi đầu tiên của gói chạy để làm ra một kết quả, không phải để đo chính nó** | **Hỏng có ích.** Gõ ĐẠT (40 ký tự, bàn phím thật, React nhận — nút Send từ `disabled` sống lại). Bấm báo ĐẠT nhưng **không gửi được gì**. Nghe mạng sau khi bấm: **0**; nghe một lượt tải trang: **30 lượt**, lộ cả bộ máy sau lưng (Cognito · AppSync GraphQL · Lambda · `manage-tenant-session`) | **Bốn mục nợ, đều là của SEED chứ không của trang:** `S-17` bấm không kiểm điểm-bấm-thuộc-về-ai nên **báo thành công khi bấm trúng lớp che** (P1) · `S-18` `scout.wait` nhầm *có mặt* với *dùng được* — trả `satisfied` sau 36ms trong khi tấm chắn phủ kín ứng dụng · `S-19` `scout.navigate` không F5 được cùng URL · `S-20` gắn-rồi-nhả nên **không nghe được lưu lượng do chính mình gây ra**. Cả bốn chỉ lộ ra khi có một trang BẮT PHẢI BẤM — HNX không bao giờ ép được chúng |
| Trang tự dựng `127.0.0.1:38411` — ba nút và một lớp phủ bật/tắt được | 12/09 | Hai chốt mới (`S-17` bấm phải kiểm điểm bấm; `S-18` `wait` biết *dùng được*) có đúng ngoài đời không, hay chỉ đúng trước máy giả | **ĐẠT cả sáu ô.** Nút chữ thuần → `relation: "self"` · nút `<button><svg><path>` → `"descendant"` · có lớp phủ → `CLICK_OBSCURED`, **không một khung chuột nào rời đi**. `wait present` ĐẠT trong khi `wait usable` trả `usableCount: 0, blockedBy: "covered"` — **hai câu trả lời khác nhau trên cùng một trang** | ⑴ Trả lời một câu **không tra được trong tài liệu**: Chrome tự đi ngược từ nút văn bản lên phần tử cha, nên `<button>Gửi</button>` KHÔNG bị từ chối oan. Tôi đã định tin trí nhớ mình chỗ này; đo thì rẻ hơn. ⑵ Tái hiện `S-19` lần hai ngoài Udin — nó là khuyết tật của seed, không của trang. ⑶ Lộ `S-21`: một target thỉnh thoảng không trả lời được câu hỏi hình học, **chưa biết vì sao**. ⑷ Trang tự dựng làm được việc mà trang thật không làm được: **bật/tắt lớp phủ theo ý mình**. Đây cũng là bộ khung cho `T7` |
| Trang tự dựng `127.0.0.1:38411` — lượt F5 | 12/09 | `S-19`: đi tới ĐÚNG url đang đứng. Lượt gọi đầu tiên trong ngày đi qua **TÊN ghế** (`Udin_Scout`) thay vì dãy số | **ĐẠT.** Trước: 15.000ms rồi `NAVIGATE_TIMEOUT (url chưa đổi)` — câu sai nguyên nhân. Sau: **254ms**, `ok`, `reloaded: true`, `arrivedBy: "new_document"`. Đi tới url KHÁC vẫn chạy nguyên | ⑴ Tín hiệu "đã đi" không phải url mà là **danh tính tài liệu** (`backendNodeId` nút gốc) — `nodeId` vô dụng vì nó được cấp lại mỗi lượt hỏi. ⑵ Phải nhận CẢ HAI dấu hiệu: F5 đổi tài liệu chứ không đổi url, `#muc-2` đổi url chứ không đổi tài liệu. ⑶ **Tên ghế chạy trọn vòng** — Đức gõ ở bảng bên, máy chủ định tuyến đúng ghế; tính năng Profile ID nghiệm thu được ngoài đời, không chỉ trên phép ghim |
| Bridge thật — bảng hạn chờ | 12/09 | `S-16`: có method nào còn khai hạn chờ dài hơn ngưỡng 35 giây của máy chủ không | **ĐẠT.** `system.capabilities` khai ra ngoài dây: không method nào vượt 34.000. Xin `timeout_ms: 60000` bị cửa Bridge từ chối `INVALID_PARAMS` kèm khoảng hợp lệ | Một hạn chờ khai dài hơn ngưỡng máy chủ **không mua thêm thời gian — nó mua một lời nói dối**: máy chủ đã báo hết giờ trong khi extension vẫn đang làm. Hạ số ở một đầu mà quên trần tham số ở đầu kia thì bug chỉ đổi chỗ |

## Chưa thử, và biết là chưa

- **Trang thật của một nhà cung cấp AI** (ChatGPT · Gemini). Ba worker cũ chạy trên đó, Scouter
  thì chưa lần nào.
- **Trang có khung lồng (iframe)** — in ngay trong báo cáo của phép đo ② là chưa đo.
- **Trang đổi tỉ lệ hiển thị** — cùng chỗ.
- ~~**Một lượt GHI trong việc thật.**~~ **ĐÃ THỬ 12/09** — xem dòng cuối bảng trên. Kết quả: gõ chạy, bấm **chưa** làm ra được kết quả, và bốn khuyết tật của seed lộ ra.
- ~~**Kênh nghe mạng trên trang có lưu lượng thật**~~ **ĐÃ THỬ 12/09** — 30 lượt gọi thu được trên một lượt tải trang. Cái tai chạy.
- ~~**Trang đổi tỉ lệ hiển thị**~~ — máy Đức đang ở **125%** và mọi phép đo 12/09 chạy trên đó; toạ độ khớp, không lệch. Chưa thử các mức khác.
- **Cả VÒNG tự cải tiến** (dò → AI viết adapter → nạp lại → adapter chạy): từng mảnh đã có, cả
  vòng thì chưa ai khép một lần nào. Đây là việc lớn nhất còn nợ.

## Cái file này KHÔNG làm

Không thay `BACKLOG.md` (nợ gì) · không thay `HANDOFF.md` (hôm đó làm gì) · không thay ADR (Đức
chốt gì). Nó chỉ giữ **một danh sách trang**, thứ ba quyển kia không có chỗ nào để.
