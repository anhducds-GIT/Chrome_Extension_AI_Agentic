---
status: Proposed
adr: 0000
date: YYYY-MM-DD
deciders: <ai chốt>
---

> **Hạt giống — chưa có hiệu lực.** Đổi `status` thành `Accepted`, điền `date` và
> `deciders` khi chủ repo chốt. Việc đó là **hành động nhận luật**, không phải thủ tục:
> từ lúc đó mọi ADR `Accepted` trong repo này trở thành bất biến và phép kiểm B12 cưỡng chế.
>
> Cố ý để `Proposed` chứ không phải `Accepted`, vì hai lý do. Một: một quyết định mang ngày
> `YYYY-MM-DD` và người chốt `<ai chốt>` thì chưa ai chốt cả. Hai: B12 khoá mọi ADR đã
> `Accepted`, nên phát đi ở trạng thái đó là khoá luôn cả bộ sinh template — lần cập nhật
> bộ khung sau sẽ bị chính cổng kiểm chặn.

# ADR-0000 — Ghi nhận quyết định kiến trúc bằng ADR bất biến

## Bối cảnh

Repo này vừa được khởi tạo từ bộ khung. Chưa có quyết định kiến trúc nào được ghi lại.

Cách làm mặc định — ghi quyết định vào một file dài kiểu `decisions.md` — hỏng theo ba kiểu,
đo được ở repo mà bộ khung này rút ra:

1. **Không tra được.** Muốn biết vì sao đã chọn X thay vì Y thì phải đọc dò cả file. Không có
   địa chỉ để trỏ tới.
2. **Không bất biến.** Một dòng sửa được, và không ai biết nó đã bị sửa — trong khi bằng chứng
   vận hành, thứ yếu hơn, thì đã được cổng kiểm bảo vệ.
3. **Quan hệ thay thế viết bằng văn xuôi.** *"Thay cho dòng bên dưới"* trỏ theo vị trí vật lý;
   thêm một dòng ở giữa là lời trỏ đó sai.

## Quyết định

Quyết định kiến trúc được ghi thành **ADR** — mỗi quyết định một file, chuẩn Nygard, đúng bốn
mục: **Bối cảnh · Quyết định · Hệ quả · Trạng thái**.

**Bốn luật:**

1. **ADR ở trạng thái `Accepted` là BẤT BIẾN**, ngang hàng bằng chứng vận hành. Không sửa nội
   dung, kể cả sửa lỗi chính tả.
2. **Đổi ý = viết ADR MỚI.** ADR cũ chuyển sang `Superseded by ADR-NNNN`; **hai bên phải trỏ
   nhau** — bản mới nói nó thay cái nào, bản cũ nói nó bị cái nào thay.
3. **Hai tầng, theo phạm vi của quyết định:** quyết định của một đơn vị công việc →
   `<đơn-vị>/docs/adr/`; quyết định của cả repo → `docs/adr/` ở gốc. Đánh số liên tục trong
   phạm vi **từng thư mục**, bắt đầu `0001` (thư mục gốc bắt đầu từ ADR này, `0000`).
4. **Sổ quyết định cũ không bị xoá.** Nó là bản ghi có thật; nội dung chuyển đi thì nó trở
   thành **mục lục** trỏ sang từng ADR, kèm một dòng nói rõ chuyển đi đâu và vì sao.

Luật 1 được **cưỡng chế bằng máy**, không phải bằng lời hứa: phép kiểm **B12** trong
`scripts/check-bootstrap.mjs` đi ngược lịch sử git của từng file ADR, tìm commit đầu tiên đưa
nó sang `Accepted`, và báo lỗi nếu **phần thân** đổi sau mốc đó. Sửa riêng frontmatter thì
được — đó chính là cách một ADR bị thay thế đúng luật (luật 2).

## Hệ quả

**Được:**

- Mỗi quyết định có một địa chỉ trỏ được, thay vì "dòng thứ mấy trong một file dài".
- Quan hệ thay thế thành dữ liệu máy đọc được, không còn là văn xuôi trỏ theo vị trí.
- B12 thôi in `KHÔNG ÁP DỤNG` — trước khi có thư mục ADR, nó là một phép kiểm không có gì để kiểm.

**Mất, và phải nói thẳng:**

- **Ghi một quyết định tốn công hơn.** Trước: thêm một dòng. Nay: tạo file, đánh số, viết đủ bốn
  mục. Đây là chủ đích — thứ đắt hơn thì được cân nhắc kỹ hơn.
- **Sửa sai một ADR đã `Accepted` không còn là việc sửa file**, mà phải viết ADR mới. Với lỗi
  chính tả thì phiền; đổi lại là bản ghi đáng tin.
- **Nhiều file nhỏ.** Duyệt bằng mắt sẽ phải cuộn. Đổi lại là tra được bằng đường dẫn.

## Trạng thái

Accepted
