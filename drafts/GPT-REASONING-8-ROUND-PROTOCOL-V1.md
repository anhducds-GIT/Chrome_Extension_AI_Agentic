---
kind: draft-protocol
topic: gpt-reasoning-8-round
status: V1 — gọn lại 2026-09-10 sau lượt chạy thật tới Vòng 6
author: claude-gpt-chay-het-job
authority: none — chưa ai chốt
note: "Bản này chỉ giữ LUẬT. Vì sao từng luật có mặt nằm ở B-57…B-63 trong BACKLOG của gói
  duc-auto-chatgpt — đừng chép nguyên nhân về đây, chép là đẻ ra bản thứ hai sẽ lệch."
---

# Reasoning nhiều vòng — GPT nghĩ, CC chốt hướng ở ba mốc

## 0. Dùng khi nào

Việc lặp lại, có mục tiêu rõ, GPT làm được qua nhiều vòng nếu có ai giữ hướng — kiểm toán một
repo, tổng hợp dữ liệu, soạn đề. GPT Web reasoning không tính phí; CC đắt. Nên **CC chỉ xuất
hiện ở chỗ QUYẾT ĐỊNH, không ở chỗ CÀY**.

Nỗi lo phải chặn: *chạy một chuỗi dài rồi kết quả không dùng được*.

## 1. Hình dạng

```
      CC①            GPT×≤4             CC②            GPT×≤4            CC③
   khởi tạo   →   vòng 1-4    →    chốt hướng   →   vòng 5-8    →    nghiệm thu
   + HỢP ĐỒNG     tự nối vòng      đọc FILE,        tự nối vòng      đọc FILE,
   + MẪU ĐÚNG/SAI ghi vào file     không đọc chat   ghi vào file     kết luận
```

**8 là TRẦN, không phải chỉ tiêu** — xong sớm thì dừng sớm. Không có trần thì model có động cơ
chế thêm việc để nối vòng.

**Chat là đường ống, FILE TRONG REPO là sản phẩm.** CC không đọc chat để lấy nội dung.

## 2. Hai thư mục, hai thẩm quyền

```
drafts/<chủ-đề>/
├── CC/     ← Đức + CC ghi. GPT CẤM ghi.  HOP-DONG.md · CHOT-HUONG-*.md · NGHIEM-THU.md
└── GPT/    ← GPT ghi. Nội dung ở đây CHƯA ĐƯỢC TIN cho tới khi CC kiểm.
```

Chung một chỗ thì GPT sửa được chính hợp đồng ràng buộc nó.

**Chống tự-rửa-nguồn:** GPT viết một phỏng đoán ở vòng 2, vòng 6 dẫn lại như bằng chứng đã xác
lập. Nên: mỗi phát hiện có **mã** (`F-01`…) và **nguồn gốc** là đường dẫn mã thật + số dòng.
Dẫn lại phát hiện cũ thì phải dẫn lại **nguồn gốc**, không dẫn nháp của chính nó. Không có
nguồn gốc thì ghi rõ chữ **giả thuyết**, và không được xây tiếp lên nó.

## 3. Hợp đồng vòng 0 — `CC/HOP-DONG.md`

| Trường | Nghĩa |
|---|---|
| `muc_tieu` | Một câu, có động từ |
| `san_pham` | File nào, hình dạng gì |
| `xong_la_gi` | Điều kiện nghiệm thu **đo được** |
| `mau_dat` | Một ví dụ kết quả **chấp nhận được**, Đức duyệt |
| `mau_khong_dat` | Một ví dụ **trông đúng mà không dùng được** |
| `chuan_bang_chung` | Bằng chứng thế nào là đủ — riêng cho câu khẳng định **VẮNG MẶT** |
| `moc_nguon` | **Commit SHA**, không phải "mã trên `main`" |
| `pham_vi` | **Danh sách TÊN FILE + số dòng từng file** |
| `ngoai_pham_vi` | Cắt trước |
| `khong_biet_thi_sao` | Ghi `CHƯA TÌM THẤY`, không đoán |

Bốn trường đắt nhất, mỗi trường mua bằng một lần hỏng:

- **`mau_dat`/`mau_khong_dat`** — một điều kiện đo được vẫn có thể được thoả **trọn vẹn** mà kết
  quả vô dụng.
- **`moc_nguon` là SHA** — `main` đổi giữa chừng; một lượt chạy đã có ba commit chen vào.
- **`chuan_bang_chung`** — *"không có hook"* không được viết. Chỉ được viết *"không tìm thấy
  trong phạm vi đã tìm: `<liệt kê đường dẫn/lệnh đã quét>`"*.
- **`pham_vi` là danh sách tên file** — **đừng để glob đếm phạm vi**. Một lần glob quét trúng
  một file hai lần và đồng thời làm rơi một file khác; hai lỗi ngược chiều che nhau nên tổng
  trông hợp lý, và cả chuỗi chạy trên một phạm vi thiếu 5,8%. Glob dùng để *tìm ra* danh sách,
  không dùng để *ghi* nó, và tổng phải kiểm lại được bằng một lệnh.

## 4. Giao kèo nối vòng — dán nguyên văn vào chat, phần MÁY đọc

```
GIAO KÈO NỐI VÒNG — phần này do MÁY đọc:
1. Kết thúc câu trả lời bằng ĐÚNG MỘT khối mã, và nó phải là khối CUỐI CÙNG.
2. Trong khối chỉ chứa prompt cho vòng kế tiếp — không lời dẫn, không giải thích.
3. DÒNG ĐẦU của khối phải khai người nhận:
      NGƯỜI NHẬN/THỰC THI: <GPT Web | Claude Code (CC) | Đức>
4. Xong việc thì kết thúc KHÔNG có khối mã nào. Máy hiểu đó là lệnh DỪNG.
```

Máy chỉ so **phần tên trước dấu ngăn đầu tiên** — so cả dòng thì `Claude Code (CC) — đối chiếu
kết quả GPT` bị đọc thành của GPT.

**Số vòng do BÊN ĐIỀU KHIỂN đếm, không do khối quyết định.** Thiếu khối không phân biệt được
*đã xong* với *câu trả lời hỏng* hay *đọc hụt*.

## 5. Năm luật đọc trang — bộ chạy đã cưỡng chế cả năm

| | luật | máy làm gì |
|---|---|---|
| ⓪ | **Hỏi "lượt này chốt chưa" TRƯỚC mọi câu khác.** Trang đánh dấu lượt chưa xong bằng `data-turn-id` **tạm**; lượt đã chốt mang **UUID** | chờ → nạp lại → dừng (`LUOT_CHUA_CHOT`) |
| ⒜ | `generating: false` **không** phải giấy chứng nhận đã xong — model gọi tool thì chữ đứng yên hàng phút | chờ thêm trọn một cửa sổ quan sát |
| ⒝ | Không có khối **≠** dừng, cho tới khi đã **nạp lại một lần** | `NAP_LAI` rồi mới được kết luận `HET_CHUOI` |
| ⒞ | Lượt GHI báo lỗi thì **không tự gửi lại** — đọc lại xem nó đã bay chưa | ba trạng thái: đã bay · không thấy · **không đọc được** (mù thì DỪNG) |
| ⒟ | **Ghim HỘI THOẠI, không ghim địa chỉ** — địa chỉ tự mọc thêm `?...`, và một chat mới chưa có `/c/<id>` | so bằng định danh hội thoại; `--url` khai trước; sai trang nói `SAI_TRANG`, không nói "panel bận" |

**Điều ⓪ mua bằng một lượt đo live 11/09, và nó đổ hai tín hiệu cũ cùng lúc:** nút Stop tắt ở
giây **8.7** và số ký tự đứng yên **20 giây**, trong khi câu trả lời thật dài **85** ký tự còn
DOM sống mới có **26**. Dạng id không nói sai lần nào. Bộ đọc **vốn đã** trả id ra ở
`turns[].id` — chỉ là chưa ai đọc nó. *(Giới hạn: lượt đo ở trên một tab đang bị che, nên con
số 8,7 giây có thể khác trên tab hiện; luật thì không đổi.)*

Điều ⒟ là luật mới 10/09: một chat **mới tinh** nằm ở `chatgpt.com/`, không phải
`chatgpt.com/c/<id>`, nên mọi lượt đọc bị từ chối. **Gõ một câu vào chat mới trước khi nối bộ
chạy vào nó** — địa chỉ hội thoại chỉ tồn tại sau lượt đầu tiên.

## 6. CC làm gì ở ba mốc

**① Khởi tạo.** Cùng Đức chốt hợp đồng, gồm cả `mau_dat`/`mau_khong_dat` và `moc_nguon`. Nếu
`xong_la_gi` chưa đo được thì đổi đề bài thành một câu hỏi có ranh giới — và sản phẩm của chuỗi
chính là một hợp đồng tốt hơn.

**② Chốt hướng, ở LẦN KÍCH HOẠT ĐẦU TIÊN, chậm nhất sau vòng 4.** Kích hoạt khi bất kỳ điều nào
xảy ra: sản phẩm mẫu trượt `mau_dat` · một kết luận nền bị bác hoặc thiếu bằng chứng · hai vòng
liên tiếp không tiến thêm gì kiểm được · hết hạn mức đọc mà chưa gỡ xong một phụ thuộc ·
`moc_nguon` đổi. Viết `CC/CHOT-HUONG-1.md`, trả lời ba câu: đã lệch chưa · kết luận nào của GPT
tôi **kiểm lại được và sai** · bốn vòng tới phải trả lời câu gì.

**③ Nghiệm thu.** Đối chiếu `xong_la_gi` + `mau_dat`. Đạt hoặc không, nói thẳng.

**Luật cứng ở ② và ③: CC tự kiểm ít nhất hai kết luận bằng mã thật, ít nhất một phải là câu
khẳng định VẮNG MẶT.** Hai câu là **mức sàn của việc phải làm**, không phải bằng chứng rằng cả
sản phẩm đáng tin.

**Đưa GPT những LỜI TUYÊN BỐ để công kích, đừng bảo nó "đi tìm lỗi"** — và **CC chọn câu nào bị
công kích**, không phải GPT. Để GPT tự chọn thì nó bác một kết luận ngoại vi dễ mỗi vòng, còn
câu sai ở giữa sống sót trọn chuỗi.

Khai **hạn mức đọc** ngay từ vòng 1: không hạn mức thì vòng đó chết vì đọc 10 lượt trong 6 phút.

## 7. Còn hở — biết giá, chưa vá

1. **Không có gì CƯỠNG CHẾ GPT ghi trong `drafts/`.** Vẫn chỉ là câu chữ trong prompt.
2. **Commit của GPT không phân biệt được với commit tay của Đức** — cùng danh tính git, không
   `Lane:`. Repo **CÔNG KHAI**, nên ghi vào đây là **xuất bản**. Cần Đức quyết: cho GPT đẩy
   thẳng `main`, hay bắt mở nhánh/PR.
3. **Chưa chạy trọn 12 vòng bao giờ** — dài nhất là 6, và dừng đúng thiết kế ở Mốc ②.
4. **Người và máy dùng chung một hội thoại.** Bộ chạy nay biết nhường (`NGUOI_DANG_DUNG`),
   nhưng chưa có cách hai bên cùng làm việc.

## 8. Điều đã chạy được, đừng sửa

Luật chống tự-nghiệm-thu **chạy được mà không ai nhắc**: GPT nhận một khối dành cho CC và từ
chối thực thi, tự nêu đúng lý do. Và GPT thấy hợp đồng bất nhất thì **nêu ra rồi dừng chờ phán
quyết**, không tự đoán — đúng luật `khong_biet_thi_sao`.

**Chỗ hỏng không nằm ở reasoning, nằm ở GIÁC QUAN.** Sáu lỗi trong ngày 10/09, không lỗi nào
thuộc phần suy luận; tất cả đều ở câu *"bây giờ trên trang đang xảy ra chuyện gì"*.
