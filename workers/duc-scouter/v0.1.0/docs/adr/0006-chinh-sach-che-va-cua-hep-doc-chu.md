---
status: Accepted
adr: 0006
date: 2026-09-14
deciders: Đức
---

# ADR-0006 — Ký chính sách che `de-xuat-chat-v1`, kèm một cửa hẹp để đọc chữ (`scout.text`)

## Bối cảnh

Từ 07/09 lõi đọc của Scouter chạy theo một chính sách che tên `de-xuat-chat-v1`: chỉ trả
**danh sách trắng** 25 thuộc tính (→ **26** từ 17/09, xem [ADR-0009](0009-doc-duoc-data-image-id.md)), **cắt query + fragment** khỏi mọi `src`/`href`
(`stripQuery`), **không trả chữ trong trang**, không trả `outerHTML`.

**Chính sách đó chưa bao giờ được ai ký.** Nó nằm ở `BACKLOG.md` dưới dạng một đề xuất, trong
khi mã đã chạy theo nó suốt bảy ngày. Hai thứ đã mọc lên trên một nền chưa ký:

1. `scout.grab` (ADR `S-24`, 14/09) trả `source.masked` — cắt query đúng theo chính sách này.
2. `O8` (*đọc chữ trên trang*) **không viết được** trước khi chính sách có chữ ký, vì `O8`
   chính là việc **nới** điều khoản *"không trả chữ"*, mà không thể nới từ một thứ chưa tồn tại.

Đo được 12/09 trong lượt `T7` (`TRIALS.md`): *"seed không có phép đọc chữ của MỘT phần tử;
đường duy nhất là đọc cây trợ năng rồi lọc"*. Hệ quả thực tế: adapter chỉ kiểm được *"có phần
tử không"*, không kiểm được *"nó nói gì"* — nên mọi workflow cần đọc câu trả lời hoặc thông báo
lỗi đều **CHẶN** (`W4` của Udin là một).

Và theo lộ trình chốt 14/09 (`docs/CAPABILITIES.md` §5.2), `O8` là mục **đắt nhất** của
**danh sách đóng băng** — tập năng lực phải xong **trước** khi tách Udin Optic thành gói riêng,
vì thêm một lệnh Bridge sau khi tách phải sửa tay sáu chỗ trong Scouter.

## Quyết định

**Đức chốt ngày 14/09: đường ⒝ — ký, kèm một cửa hẹp.**

1. **`de-xuat-chat-v1` được phê duyệt** làm chính sách che chính thức của lõi đọc. Mọi điều
   khoản giữ nguyên: danh sách trắng thuộc tính · `stripQuery` trên `src`/`href` · không
   `outerHTML`.
2. **Mở đúng một cửa cho chữ: `scout.text`.** Nó trả chữ của **MỘT** phần tử khớp selector.
   Nó **không** trả chữ cả trang, **không** trả `outerHTML`, và **không** nhận selector khớp
   nhiều phần tử (từ chối như `scout.grab`).
3. Điều khoản *"không trả chữ"* của `de-xuat-chat-v1` nay đọc là: **không trả chữ hàng loạt.**
   Chữ của một phần tử đã chỉ đích danh thì được.

## Vì sao cửa hẹp chứ không phải mở hẳn

| | Đường | Vì sao không chọn |
|---|---|---|
| ⒜ | Ký nguyên bản, giữ *"không trả chữ"* | `O8` chết hẳn, và cùng nó là `W4` + **mọi** dấu kiểm bằng chữ. Adapter mãi mãi chỉ đếm được phần tử |
| ⒞ | Hoãn tiếp | Cả danh sách đóng băng đứng yên, mốc tách Udin lùi theo. Và `scout.grab` vẫn chạy trên một luật chưa ai ký |

Cái được bảo vệ ở đây là **khối lượng**, không phải bản thân chữ. Một AI đọc được chữ của một
nút mà nó vừa chỉ đích danh thì đọc được đúng thứ nó cần để kiểm việc mình vừa làm. Một AI đọc
được `innerText` của `body` thì hút được cả trang — gồm cả những gì Đức đang mở ở tab khác của
cùng hồ sơ. Cửa hẹp chặn đúng cái thứ hai mà không chặn cái thứ nhất.

## Giá phải trả, nói trước

- **Selector là một đường lọc.** Ai chỉ được `body` thì vẫn lấy được nhiều chữ. Nên `scout.text`
  phải có **trần ký tự** cho một lượt trả, và trần đó khai ra ngoài dây như mọi `deadline_ms`.
- **Thêm một lệnh Bridge = sáu chỗ sửa tay** (`docs/CAPABILITIES.md` §5.1). Đây là lý do nó
  nằm trong danh sách đóng băng chứ không hoãn tới sau khi tách.
- `scout.text` **đọc**, nên nó vào lõi đọc và **không** tiêu trần ghi. Lõi ghi không được mượn
  nó (luật gói số 6).

## Hệ quả

- Mở `T18` — làm `O8` bằng `scout.text`. Đóng khi `W4` ĐẠT trên trang thật.
- `scout.grab` nay đứng trên một chính sách **đã ký**; `source.masked` không còn là nợ.
- `docs/CAPABILITIES.md` §2 dòng `O8` chuyển từ *"Đức chưa chốt chính sách"* sang *"CHƯA CÓ,
  đã duyệt, đang làm"*.
