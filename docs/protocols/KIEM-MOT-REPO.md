---
kind: protocol
status: active
ttl_days: 180
---

# QUY TRÌNH — kiểm một repo cách bộ khung bao xa

> **Dùng khi nào:** trước khi quyết định có đưa một repo lên chuẩn hay không. Kiểm thì rẻ,
> chuyển thì đắt — nên bao giờ cũng kiểm trước.
> **Ai chạy:** phiên AI nào cũng được, chỉ cần quyền đọc repo đích. **Không ghi gì vào repo đó.**

## Một lệnh

```bash
node scripts/assess.mjs <đường-dẫn-repo>
```

Thêm `--json` nếu cần máy đọc (ví dụ chấm hàng loạt rồi xếp thứ tự).

## Đọc kết quả

**Mức** trả lời *"bước kế tiếp là gì"*, không phải *"repo này được mấy điểm"*:

| Mức | Nghĩa | Việc kế |
|---|---|---|
| 0 | chưa có gì | Dựng mới bằng `init-repo.mjs`, hoặc thả bộ khung vào rồi sửa cấu hình |
| 1 | có luật, chưa có bộ máy | Thả nhóm MÁY vào — chép là chạy, không cần nghĩ |
| 2 | có bộ máy, chưa có lưới đỡ | Thêm suite hạt giống và khai `scripts.test` |
| 3 | đủ bộ | Chạy cổng kiểm, sửa theo đúng lời nó nói |

**Chi phí** tách làm ba loại việc, cố ý **không** quy về một phần trăm:

- **thả** — chép file vào là xong. Rẻ, làm được hàng loạt.
- **viết** — người phải ngồi viết nội dung của riêng repo đó. Đây là phần thật sự tốn.
- **soi** — có sẵn nhưng lệch bản chuẩn. Phải mở ra đọc mới biết là cố ý hay bỏ quên.

> *"Repo này 72% đạt chuẩn"* nghe gọn mà không ai hành động được: 72% có thể là nửa giờ, cũng
> có thể là một buổi. Ba con số trên nói được điều đó, một con số thì không.

## Ba điều dễ đọc sai

**① Luật lệch bản chuẩn KHÔNG phải nợ.** Mỗi repo sửa luật cho nghề của mình — đó là thiết kế,
không phải sai. Công cụ cố ý không liệt kê chúng. Chỉ tầng **máy** lệch mới đáng mở ra xem.

**② Thiếu `scripts.test` là chuyện riêng, không gộp vào ba con số.** Thiếu nó thì cổng đóng
phiên **báo xanh mà không chạy một dòng test nào** — xanh, im, vô dụng. Đây là lỗi nặng nhất
từng tìm thấy trong chính bộ khung này, nên nó có dòng cảnh báo riêng.

**③ Mức 3 không có nghĩa là repo đó tốt.** Nó có nghĩa là repo đó **có đủ đồ nghề**. Chất lượng
thật thì hỏi cổng kiểm của chính nó.

## Sau khi kiểm

Ghi kết quả vào chỗ người sau đọc được — một dòng là đủ: *tên repo · mức · ba con số chi phí ·
ngày kiểm*. Chấm mười repo rồi để trong đầu thì lần sau vẫn phải chấm lại từ đầu.

Muốn đưa repo lên chuẩn thì đọc tiếp [CHUYEN-REPO-LEN-CHUAN.md](CHUYEN-REPO-LEN-CHUAN.md).

## Giới hạn phải biết trước

`assess.mjs` sống ở **repo nhà của bộ khung**, không đi theo bản trích — nó cần bộ sinh template
để biết "chuẩn" là gì, mà bộ sinh thì cố ý ở lại. Nghĩa là: bạn chạy nó **từ repo nhà, trỏ sang
repo đích**, chứ không phải chạy bên trong repo đích.

Đây là lựa chọn, không phải thiếu sót: chuẩn phải có **một** nguồn. Phát bản sao của chuẩn đi
khắp nơi là tạo ra N nguồn, và lúc chúng lệch nhau thì không ai biết tin bản nào — đúng cái
bệnh cả chương trình này sinh ra để chữa.
