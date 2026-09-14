---
status: Accepted
adr: 0007
date: 2026-09-14
deciders: Đức
---

# ADR-0007 — Đức uỷ quyền mở rộng năng lực; và nhóm "nhìn & đi lại" được định nghĩa

## Bối cảnh

Ngày 14/09, sau khi `W3` đóng (hai ảnh thật xuống đĩa) và `S-25` lộ ra, tôi đưa Đức bốn câu:
`S-25` (tầng vận chuyển), `I9` (tải file lên), `I5`/`I6`/`I7` (cuộn · rê chuột · bấm đúp-phải),
`O12` (thu phóng).

Đức trả lời — nguyên văn, giữ lại vì cách diễn đạt chính là nội dung của quyết định:

> *"S-25: bạn chủ động làm cho hợp lý, tôi trao quyền cho bạn. Tư duy và quyết định theo hướng
> mở rộng năng lực của Scouter để cover được nhiều usecase hiện tại và sau này."*
> *"I5,6,7, O12: là các thao tác về Navigation: tôi Ok … Nếu còn thiếu các thao tác về
> Navigation, có thể add thêm tính năng luôn."*
> *"I4 tôi OK nếu nó useful cho Scouter / seed."*

## Quyết định

**⑴ Uỷ quyền.** Với `S-25`, `I9`, `I5`, `I6`, `I7`, `O12`, tôi **không phải hỏi lại từng bước**:
mở lệnh Bridge, thêm method CDP, và chọn hình dạng API đều nằm trong quyền được trao.

**⑵ Uỷ quyền này CÓ BIÊN, và biên đó không đổi.** Nó **không** bao gồm: nới một lớp bảo vệ để
một cổng xanh · `Runtime.*` hay bất kỳ đường chạy mã nào của người gọi · nhận toạ độ / URL / mã
phím tự do từ ngoài · quyền `manifest` mới · và mọi việc ở luật gốc (`CLAUDE.md`) — xoá dữ liệu,
gửi ra ngoài, tạo automation tự chạy. Uỷ quyền là *khỏi phải hỏi từng nước đi bên trong*, không
phải *khỏi phải giữ luật*.

**⑶ `I4` được giữ**, và lý do là một phép kiểm dùng được chứ không phải một lời khen: `scout.type`
không xoá chữ cũ, nên `gui-prompt` phải **từ chối** khi ô có chữ — tức là một phiên nhiều lượt
prompt trên cùng một ô không chạy được. Đó là một workflow thật (`W7`) bị chặn, không phải một
tiện nghi.

**⑷ Nhóm "nhìn & đi lại" được định nghĩa, và nó có một luật riêng: ĐỌC TRƯỚC, GHI SAU.**

Đức gộp `I5` `I6` `I7` `O12` vào một chữ — *Navigation* — và gộp như thế là đúng hơn cách bảng
năng lực đang chia (cuộn nằm ở nhóm "tay người", thu phóng nằm ở nhóm "nhìn"). Bốn thứ ấy trả lời
**cùng một câu**: *Scouter đang nhìn vào phần nào của trang?* Và câu đó không phải chuyện thẩm mỹ
— **`usable` phụ thuộc vào nó**, nên mọi lượt bấm đều đứng trên nó.

Hệ quả bắt buộc: **`scout.view` (ĐỌC) phải có TRƯỚC mọi lệnh đổi tầm nhìn.** Không đọc được
*"đang cuộn tới đâu, khung nhìn rộng bao nhiêu, thu phóng bao nhiêu"* thì không có cách nào kiểm
một lượt cuộn hay một lượt thu phóng **bằng trang** — và đó là luật đã ghi trong `README` sau
`S-22`: ba method ghi hứa *"đã bắn sự kiện"*, **không** hứa *"trang đã nhận"*.

Hôm nay lõi GHI đã phải tự đọc độ cuộn bằng một mẹo (hộp `margin` của `:root`, `G-24`) vì không
có đường đọc tử tế. Một mẹo nằm trong lõi ghi là chỗ nợ, không phải chỗ để xây tiếp.

## Vì sao `S-25` đứng đầu, dù nó không mở thêm năng lực nào

Nó **không phải một năng lực — là một lỗi**, và nó đang thu hẹp mọi năng lực khác:

- `scout.shot` chết trên trang thật (`G-56`);
- mỗi ảnh 746 KB tốn **16 khúc = 16 đơn vị** trong trần 200 — trần đủ ~12 ảnh một lần mở khoá;
- mọi đường *"nhìn toàn cảnh"* bị chặn, gồm cả cái `O12` sinh ra để phục vụ (`G-66`).

Gốc đã tìm được và **đã chứng minh bằng một phép thử trực tiếp** (`G-67`):
`_shared/bridge-host/websocket-core.mjs` **ném lỗi ở mọi tin WebSocket bị cắt mảnh**
(`if (!fin) throw`). Chrome tự cắt mảnh khi tin vượt khoảng 64 KiB, nên một câu trả lời hơi lớn
làm **đứt kết nối** thay vì trả về một lỗi có tên.

**Đó là một ca CHƯA VIẾT, không phải một lớp bảo vệ** — và phân biệt hai thứ đó là điều kiện để
sửa nó mà không phạm luật *"không nới bảo vệ cho cổng xanh"*. Bản sửa **thuần thêm vào**: hôm nay
mảnh nối làm chết kết nối; sau khi sửa thì chúng được ghép lại. Không một hành vi đang chạy nào
đổi nghĩa, và phải có phép ghim chứng minh đúng câu đó.

## Giá phải trả, nói trước

`websocket-core.mjs` là **lõi dùng chung với ba gói đóng băng**. Sửa nó là chạm vào nền của cả ba.
Cái mua được: mọi gói đều hết bệnh *"câu trả lời hơi lớn thì mất kết nối"*. Cái phải trả: một
lượt kiểm kỹ hơn bình thường, và phép ghim phải chứng minh **tin KHÔNG bị cắt mảnh cư xử y hệt
như trước**.

## Hệ quả

- Mở `T24` (`S-25`), `T25` (`scout.view`), `T26`…`T30` — xem `CHUOI-VIEC.md`.
- Danh sách đóng băng (`docs/CAPABILITIES.md` §5.2) nhận thêm nhóm *nhìn & đi lại*.
- Sau `T24`, **xem lại trần khúc của `scout.grab`**: 64 KiB đặt ra để né đúng cái lỗi này.

## Bổ sung 14/09, sau khi làm xong — hai chỗ file này ghi CHƯA ĐÚNG

**⑴ "Lõi dùng chung với ba gói đóng băng" là SAI.** Ba gói `duc-auto-*` mỗi gói giữ một **bản
sao riêng** `duc-auto-chatgpt-loopback-bridge-host-v1/websocket-core.mjs`, byte y hệt bản
`_shared` trước lượt sửa, và `bridge-host.mjs` của chúng nhập bản sao ấy chứ không nhập bản
dùng chung. Chỉ Scouter (qua `bridge-host-core.mjs`) và một phép ghim của `hnx-fetch` đứng trên
bản `_shared`.

Hai hệ quả, và cả hai đều đáng ghi: giá của lượt sửa **nhỏ hơn** câu tôi đã nói với Đức; và ba
bản sao kia **vẫn mang con bệnh mảnh nối**. Để nguyên vì chúng đang đóng băng và chưa ai bị cắn
— nhưng nếu có ngày một trong ba gặp `TRANSPORT_DISCONNECTED` với câu trả lời hơi lớn thì đây
là chỗ đầu tiên phải nhìn. Và cái làm cho câu này **kiểm được** thay vì chỉ là một lời nhắc:
khối ① của `ghep-manh-noi.mjs` đứng trên chính bản sao ấy làm cái mốc, nên nó sẽ ĐỎ ngay nếu
một ngày nào đó bản gốc cũng được sửa.

## Vì sao KHÔNG có `scout.zoom`, dù `O12` được uỷ quyền

Đường hiển nhiên là `Emulation.setDeviceMetricsOverride`. Nó **không đi được ở kiến trúc hiện
nay**, và lý do không nằm ở CDP mà nằm ở `observer-engine.js`: engine **gắn rồi THÁO debugger
quanh từng lượt gọi một** (dòng 123 và 160). Một `Emulation` override sống theo phiên debugger,
nên lượt gọi kết thúc là override đi theo. Một `scout.zoom` đứng riêng sẽ trả về *"đã thu
phóng"* rồi không còn gì thu phóng nữa — **một lệnh nói dối theo đúng nghĩa đen**, đúng loại
hỏng mà cả gói này dựng luật để tránh.

Nên chỗ thu phóng phải nằm **trong chính lượt chụp**: `scout.shot` nhận `full_page` + `scale`
(`clip.scale` của CDP). Nó trả đúng nhu cầu ⑴ của Đức — cả artboard trong một ảnh ít byte — và
trả luôn dòng *"chụp cả trang dài: CHƯA CÓ"* của `O5`.

Cái nó **không** trả, và đây là chỗ phải nói thẳng thay vì để bảng khai `CÓ` cho xong: nhu cầu
⑵ — *ứng dụng canvas có VẼ THÊM phần tử khi thu nhỏ không* (`G-65`). Câu đó cần một lượt thu
phóng THẬT làm trang dựng lại, tức là một override sống qua nhiều lượt gọi, tức là **giữ
debugger cắm vào tab của Đức giữa các lượt** — dải băng *đang gỡ lỗi trình duyệt* ở lại lâu
hơn, và Đức là người ngồi trước cái màn hình đó. Đó là quyết định của Đức, không phải của tôi:
`G-69`.

