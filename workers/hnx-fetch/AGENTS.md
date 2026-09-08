# AGENTS.md — gói `hnx-fetch`

> Đọc `AGENTS.md` ở gốc repo trước. File này chỉ nói phần riêng của gói.
> **Vận hành hằng ngày thì đọc [`PROTOCOL.md`](PROTOCOL.md), không đọc file này.**
> Khoá của gói: `workers/hnx-fetch`.

## Gói này là gì

Extension Chrome cục bộ lấy dữ liệu phái sinh HNX theo ngày. Tách khỏi `duc-scouter` ngày
08/09 theo chốt của Đức: *"sau này ta sẽ dùng scouter đi scout trang khác, còn HNX thành 1
extension độc lập chạy riêng cho web HNX Fetch."*

## Luật riêng của gói — sáu điều, đừng đảo lại

**⑴ Không có quyền `debugger`, và đó là lời hứa lớn nhất của gói.**
Toàn bộ việc HNX chạy trên **đúng một lệnh**: `scout.fetch`, và lệnh đó không cần debugger.
Khai thêm quyền đó là mở lại cánh cửa cả gói sinh ra để đóng — và Chrome sẽ dựng dải băng
*"đang gỡ lỗi trình duyệt này"* trên tab của Đức. Phép ghim `be-mat-hep-smoke.mjs` canh nó.

**⑵ Từ vựng ĐÓNG ở bốn lệnh.** `session.hello` · `system.ping` · `system.capabilities` ·
`scout.fetch`. Một lệnh bấm ở đây phải là lệnh **KHÔNG TỒN TẠI** (`METHOD_NOT_FOUND`), không
phải lệnh tồn tại mà đang bị chặn — cái sau thì bật lại được.

**⑶ Ghi tệp KHÔNG đi qua extension.** Extension chỉ tải; tiến trình Node của Đức mới đặt tệp
xuống đĩa. Nới vùng ghi của máy chủ Bridge ra tới Drive là hạ đúng cái chốt sinh ra để một
trang web không bao giờ ghi được vào dữ liệu thật.

**⑷ Chỉ NỐI vào cuối, không bao giờ sửa dòng cũ, không bao giờ ghi đè tệp đã có.**
Dữ liệu trong thư mục Drive là dữ liệu Đức gom bằng tay từ 07/2026.

**⑸ Mọi hiểu biết về trang chỉ nằm ở hai tệp:** `du-lieu/nguon-hnx.mjs` và
`du-lieu/nguon-thong-ke.mjs`. Địa chỉ, tên tham số, cách nhận ra trả lời đúng — hết. Rắc ra
chỗ khác thì lần HNX đổi trang sẽ phải đi tìm.

**⑹ Cái phanh không được đụng.** Công tắc mặc định TẮT, trần 200 lượt mỗi lần bật, gõ cứng
trong mã, chỉ tay Đức mở lại được. Đổi bất kỳ điều nào là **đổi luật an toàn** → phải hỏi Đức.

## Bản đồ file

| File | Vai trò |
|---|---|
| `PROTOCOL.md` | **Sổ tay vận hành cho AI, tự đứng một mình.** Fetch · đối chiếu · kiểm toàn vẹn · bảng mã lỗi. Đức chốt: maintain độc lập |
| `README.md` | cài và chạy lần đầu |
| `HANDOFF.md` | nhật ký phiên — phần cuối là trạng thái mới nhất |
| `BACKLOG.md` | sổ nợ của gói. Mỗi mục bắt buộc có trường `đóng khi:` |
| `v0.1.0/manifest.json` | **không có `debugger`**, vùng đích hẹp về `hnx.vn` + máy chủ tại chỗ |
| `v0.1.0/STATUS.md` | trạng thái vận hành, `DASHBOARD.md` gốc repo đọc file này |
| `v0.1.0/background.js` | dây thật: bơm `chrome` vào ba lõi. Cố ý mỏng, cố ý không có logic |
| `v0.1.0/sidepanel.html` · `.js` · `.css` | bảng bên: công tắc · cửa Bridge · sổ hoạt động |
| `v0.1.0/scripts/bridge-core.mjs` | **bản rút gọn** của Scouter: 4 lệnh, giao thức `hnx-fetch.bridge` |
| `v0.1.0/scripts/fetch-core.mjs` | **bản rút gọn**: cái phanh + 4 tay lệnh. Không đường DOM nào |
| `v0.1.0/scripts/transport.mjs` | **chép NGUYÊN VĂN** từ Scouter — cửa Bridge, bắt tay hai chiều |
| `v0.1.0/scripts/journal-core.mjs` | **chép NGUYÊN VĂN** từ Scouter — sổ công việc |
| `v0.1.0/bridge/hnx-fetch-host.mjs` | **máy chủ Bridge của gói**, mỏng. Khai giao thức `hnx-fetch.bridge`, cắm nhóm `file.*`, canh vùng ghi. Máy chủ của Scouter KHÔNG dùng được ở đây |
| `v0.1.0/bridge/file-core.mjs` | **chép NGUYÊN VĂN** từ Scouter — nhóm lệnh `file.*` của máy chủ |
| `v0.1.0/bridge/Chay-may-chu-HNX.cmd` | Đức nhấp đúp, hoặc kéo thả tệp ghép cặp vào |
| `v0.1.0/scripts/make-icons.mjs` | **bộ sinh icon** — chữ HNX trắng trên nền xanh đậm. Icon là MÃ NGUỒN, không phải bốn cục nhị phân mồ côi |
| `v0.1.0/scripts/mutation-check.mjs` | **13 con đột biến** canh bốn khối của phép ghim bề mặt hẹp |
| `v0.1.0/scripts/mutation-runner.mjs` | bộ máy đột biến, chép từ Scouter |
| `v0.1.0/tests/run-all.mjs` | chạy cả hai tầng phép ghim. **Cổng đóng phiên tự tìm tệp này** — thiếu nó là im lặng bỏ qua cả gói |
| `v0.1.0/tests/be-mat-hep-smoke.mjs` | ghim sáu cách lời hứa ⑴ có thể chết |
| `v0.1.0/tests/day-tron-vong-smoke.mjs` | **cả sợi dây**: máy chủ thật ↔ transport thật ↔ lõi thật, qua socket thật |
| `v0.1.0/tests/tham-chieu-tai-lieu-smoke.mjs` | mọi đường dẫn và lệnh trong tài liệu CHỈ DẪN phải trỏ vào tệp có thật. Tài liệu không chạy, nên không gì bắt được nó trỏ hụt |
| `du-lieu/tests/kiem-ssot-smoke.mjs` | ghim bộ soi SSOT — nhất là hai chỗ mù: khoá trùng theo (ngày + ISIN), và ngày thiếu hẳn |
| `du-lieu/nguon-hnx.mjs` | hợp đồng trang **kết quả giao dịch** |
| `du-lieu/nguon-thong-ke.mjs` | hợp đồng trang **thống kê** (danh mục PDF) |
| `du-lieu/bang-ket-qua.mjs` | đọc bảng HTML thành cột và hàng |
| `du-lieu/luoc-do-master.mjs` | lược đồ 25 cột + đổi số kiểu Việt sang kiểu máy |
| `du-lieu/master.mjs` | tệp SSOT: chỉ nối, không sửa, ghi qua tệp tạm rồi đổi tên |
| `du-lieu/tai-ket-qua.mjs` | **lệnh hằng ngày ①** — nối ngày mới vào SSOT |
| `du-lieu/tai-pdf.mjs` | **lệnh hằng ngày ②** — tải báo cáo PDF |
| `du-lieu/vong-lay.mjs` | vòng lặp, KHÔNG biết trang nào: không làm hai lần · chạy tiếp khi đứt · thử lại đúng loại lỗi |
| `du-lieu/chay.mjs` | lệnh chạy vòng lặp, nối `vong-lay` với Bridge |
| `du-lieu/kiem-ssot.mjs` | **bộ soi tệp SSOT, CHỈ ĐỌC**: ngày cuối · ngày thiếu hẳn · dòng lệch cột · khoá trùng (ngày + ISIN). Đây là thứ AI vận hành dựa vào để nói *"dữ liệu ổn"* |
| `du-lieu/tests/loai-san-pham-smoke.mjs` | ghim cờ `--loai` (H-05). Có khối **chạy thật tệp lệnh** và đọc mã thoát — hai khối soi mã nguồn ở trên bắt được "quên viết" nhưng không bắt được "viết sai" |
| `du-lieu/tests/` | 8 phép ghim, không chạm mạng thật |

## BA tệp chép nguyên văn — và cách chúng KHÔNG trôi

`v0.1.0/scripts/transport.mjs` · `v0.1.0/scripts/journal-core.mjs` · `v0.1.0/bridge/file-core.mjs`
là bản chép từng byte của Scouter. Chép rồi để đó là đúng
bệnh của ba gói `duc-auto-*`: ba bản của một tệp, khác nhau cả ba, nên mỗi lỗi phải sửa ba lần
và một bản vá an toàn chỉ tới được một bản.

Khối ⑷ của `be-mat-hep-smoke.mjs` **không cấm hai bản khác nhau** — nó cấm chúng khác nhau
**mà không ai biết**. Muốn khác thật thì khai vào `CO_Y_KHAC` kèm lý do; lúc đó nó là một
quyết định có chữ ký chứ không phải một vệt trôi.

`bridge-core.mjs` và `fetch-core.mjs` **cố ý không** nằm trong phép kiểm đó: chúng là bản rút
gọn thật (11 lệnh bị cắt). Thứ đáng canh ở chúng là **từ vựng**, và khối ⑴ canh đúng thứ đó.

## Tự kiểm

Một lệnh chạy cả hai tầng phép ghim:

```bash
node v0.1.0/tests/run-all.mjs
```

Nó quét **theo hình dạng thư mục**, không theo danh sách gõ tay — thêm một phép ghim mới thì
không phải sửa gì. Cổng kiểm gốc repo tự tìm chính tệp `run-all.mjs` này, nên **thiếu nó là im
lặng bỏ qua cả gói** (đã xảy ra thật lúc mới khai sinh gói: suite gốc vẫn 369 xanh y như cũ
trong khi sáu phép ghim của gói không ai chạy).

Chứng minh phép ghim **có răng** — mỗi lần sửa một chốt an toàn thì chạy lại:

```bash
node v0.1.0/scripts/mutation-check.mjs
```

**Mỏ neo khớp 0 lần thì bộ đo báo ĐỎ, không báo BỎ QUA.** Cố ý: một lượt bỏ qua đọc y hệt một
lượt đạt, mà đó đúng là cách ba chốt của Scouter nằm không ai canh suốt một ngày.

## Ba việc phải hỏi Đức

1. Thêm quyền mới cho extension — nhất là `debugger`
2. Đổi luật an toàn: công tắc · trần 200 · không-ghi-đè · chỉ-nối-vào-cuối
3. Xoá hoặc sửa dữ liệu gốc trong thư mục Drive của Đức
