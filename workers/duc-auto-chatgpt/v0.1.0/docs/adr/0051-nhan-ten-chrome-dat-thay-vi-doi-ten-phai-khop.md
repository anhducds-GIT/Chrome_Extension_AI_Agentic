---
status: Proposed
adr: 0051
date: 2026-09-09
deciders: Đức
---

# ADR-0051 — Nhận cái tên Chrome đặt, thay vì đòi tên phải khớp

## Bối cảnh

Đức đặt lại hướng ngày 09/09, nguyên văn: **"tôi ko muốn chọn thư mục, cũng ko muốn mở workbook.
tôi muốn để mặc định, chat xong xóa tất cả file rác bị tải về. tôi muốn UX đơn giản nhất với
người dùng phải vận hành được trước."**

**⑴ [ĐO] Hai trong ba yêu cầu đó đã chạy được, 0 cú bấm.** `jobs.add` là **cửa mồi**: không có
workbook thì nó tự dựng một phiên trong bộ nhớ (`applyBridgeJobsAdd`, `sidepanel.js`). Đích ghi
mặc định là Chrome Downloads, và `output.configure` đặt được thư mục con của Downloads — theo
chính mô tả method, đó là *"the one location an agent may set without a human gesture"*. Đọc kết
quả về đã có `chat.read`. Dọn rác đã có `scripts/don-rac-tai-xuong.mjs`.

**⑵ [ĐO] Chỗ tắc chỉ có MỘT, và nó là `B-36`.** Chrome **bỏ qua** tên tệp gói này đề xuất. Đo
trực tiếp 06/09 qua đúng đường mọi mutation Bridge đi: xin `B36-probe-ticket__audit.jsonl`,
Chrome đặt `d31c629e-39e1-4a96-ae61-dde336b91792`, **nội dung đúng nguyên vẹn 22 byte**. Rồi
`verifyDownloadedFilename()` so tên, thấy lệch, và **ném**. Bản vá 04/09 đã nghiệm thu live và
**thất bại**; phép đo sau đó cho thấy lỗi nằm **ngoài** extension — không khớp tên khéo hơn được.

**⑶ [ĐỌC] Cái đang canh KHÔNG chỉ là cái tên, và đây là chỗ làm quyết định này rẻ hơn nó trông.**
`verifyCompletedDownload()` trong `background.js` đã kiểm ba thứ độc lập với tên: tệp **còn tồn
tại**, **số byte > 0**, và **số byte khớp CHÍNH XÁC** kích thước blob đã dựng. Nên bỏ phép so tên
không phải là bỏ kiểm chứng lưu bền — nó là bỏ **một** trong bốn điều kiện, cái duy nhất mà
trình duyệt không cho gói này quyết.

**⑷ [ĐỌC] Có HAI lý do rất khác nhau làm tên thật khác tên đã xin, và gộp chúng là sai.**
`isPolicyFilename()` bắt cả hai bằng một câu trả lời:

| Chrome trả về | Nghĩa thật | Đúng ra phải làm gì |
|---|---|---|
| `ket-qua (1).xlsx` | Chrome **có** nghe, nhưng tệp cùng tên **đã tồn tại** | Với chính sách `fail`: **vẫn phải chặn** — đó là bằng chứng của run trước, không được đè hay nhân bản |
| `d31c629e-39e1-…` | Chrome **không nghe**, tên đề xuất bị bỏ hẳn | Nhận, và ghi lại tên thật |

## Quyết định

**⒜ Khi đích ghi là Chrome Downloads và tên thật KHÔNG dẫn xuất từ tên đã xin, thì NHẬN nó** —
ghi lại tên Chrome thật sự đặt, thay vì ném `PERSISTENCE_FILENAME_MISMATCH`. Đây là câu Đức chốt
09/09 khi được hỏi thẳng kèm cái giá: *"1. đồng ý"*.

**⒝ "Dẫn xuất từ tên đã xin" đo bằng PHẦN THÂN của tên, không bằng HÌNH DẠNG của nó.** Tên thật
còn mang phần thân đã xin thì Chrome đã nghe, và mọi luật va chạm hôm nay **giữ nguyên từng chữ**
— kể cả việc `fail` vẫn chặn một tệp cùng tên đã tồn tại. Không mang thì Chrome đã bỏ qua.

Cố ý **không** nhận diện bằng hình dạng "trông giống GUID". Chính `don-rac-tai-xuong.mjs` đã ghi
luật ngược lại làm luật số một của nó, và có số đo đứng sau: trong 39 tệp tên-GUID ở máy Đức,
**hai tệp là `.pdf` và `.jpg` của chính Đức** — trang web nào tải blob về cũng bị Chrome đặt tên
kiểu ấy. Một phép nhận diện theo hình dạng sẽ sai ở cả hai chiều.

**⒞ Thư mục đã cấp quyền KHÔNG đổi gì.** Ở đó gói tự đặt tên, đọc lại được, và kiểm đúng như
hôm nay. Nới cả hai đường là nới một chỗ không ai yêu cầu.

**⒟ Mỗi lần nhận một cái tên do Chrome đặt phải để lại MỘT DÒNG SỔ** nêu tên đã xin và tên thật.
Truy nguồn theo tên đã mất, nên sổ là chỗ duy nhất còn nối được "tệp này thuộc run nào".

## Hệ quả

- Vòng chat Đức mô tả chạy được với **0 cú bấm**: không mở workbook, không chọn thư mục.
- **Mặt xấu thứ nhất, và nó có thật:** bằng chứng vận hành nằm dưới tên vô nghĩa. Mở thư mục Tải
  xuống không biết tệp nào của run nào — chỉ tra ngược được qua sổ. Với một loạt job tạo ảnh cần
  truy nguồn thì đây là bước lùi; với một phiên chat thì Đức chấp nhận, và Đức là người chốt.
- **Mặt xấu thứ hai:** thư mục Tải xuống sẽ đầy tệp rác nhanh hơn. Cửa ra đã có sẵn
  (`don-rac-tai-xuong.mjs`, mặc định chỉ xem, chứng minh chủ sở hữu bằng nội dung trước khi xoá),
  nhưng nó là việc phải nhớ chạy, và không ai nhắc.
- **Cái KHÔNG mất, nói rõ để đừng ai đọc mục này thành "bỏ kiểm chứng lưu bền":** ba điều kiện
  còn lại của `verifyCompletedDownload()` giữ nguyên. Một lượt ghi hỏng nửa chừng, ghi ra 0 byte,
  hay tệp biến mất ngay sau đó **vẫn** làm run dừng.
- **Cái mất, nói rõ luôn:** hôm nay tên khớp là bằng chứng gián tiếp rằng gói ghi đúng chỗ nó
  định ghi. Sau ADR này, chỗ ghi do trình duyệt quyết. Nếu Chrome đặt hai artifact của hai run
  khác nhau vào cùng thư mục, không gì trong TÊN phân biệt chúng nữa.
- `B-36` **không đóng bằng ADR này**. Điều kiện đóng của nó là một lượt chạy live, và ADR này chỉ
  gỡ cái chặn để lượt chạy đó xảy ra được.
- ADR-0049 **không bị thay thế**. Cơ chế giữ sổ trong bộ nhớ khi chưa có thư mục vẫn còn; ADR này
  chỉ làm cho đường Downloads không còn chết ở cửa so tên.

## Trạng thái

Proposed
