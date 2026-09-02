---
status: Accepted
adr: 0000
date: 2026-09-02
deciders: Đức (chốt hướng qua BRIEF-S5), Claude (phiên s5-adr)
---

# ADR-0000 — Ghi nhận quyết định kiến trúc bằng ADR bất biến

## Bối cảnh

Quyết định đã chốt của repo này nằm trong ba file `decisions.md`, mỗi file một định dạng
khác nhau, và đều là loại file "chỉ thêm dòng ở cuối". Đo tại `181c06e`:

| Gói | Quyết định | Hình dạng |
|---|---:|---|
| `duc-auto-chatgpt/v0.1.0` | 45 | bảng 4 cột, có dòng lạc ngoài bảng |
| `duc-auto-gemini/v0.2.0` | 67 | 4 bảng 4 cột + 14 mục `##` mỗi mục một bảng 3 cột |
| `duc-auto-gg-flow-video/v0.1.0` | 8 | mục `##` văn xuôi, không có bảng |

Ba vấn đề đo được, không phải phỏng đoán:

1. **Không tra được.** Muốn biết "vì sao Bridge dùng loopback chứ không Native Messaging"
   thì phải đọc dò một file 165 dòng. Không có địa chỉ để trỏ tới.
2. **Không bất biến.** Một dòng trong bảng sửa được, và không ai biết nó đã bị sửa. Trong
   khi `evidence/` — thứ yếu hơn — thì đã được bảo vệ bằng cổng kiểm từ lâu.
3. **Đã có ca "SUPERSEDES" viết bằng chữ.** Nhiều dòng bắt đầu bằng
   *"SUPERSEDES dòng ... bên dưới"*. Quan hệ thay thế đang được diễn đạt bằng văn xuôi
   trỏ theo vị trí vật lý trong file — thêm một dòng ở giữa là lời trỏ đó sai.

## Quyết định

Quyết định kiến trúc được ghi thành **ADR** — mỗi quyết định một file, chuẩn Nygard, đúng
bốn mục: **Bối cảnh · Quyết định · Hệ quả · Trạng thái**.

**Bốn luật:**

1. **ADR ở trạng thái `Accepted` là BẤT BIẾN**, ngang hàng `evidence/`. Không sửa nội dung,
   kể cả sửa lỗi chính tả.
2. **Đổi ý = viết ADR MỚI.** ADR cũ chuyển sang `Superseded by ADR-NNNN`; **hai bên phải trỏ
   nhau** — ADR mới nói nó thay cái nào, ADR cũ nói nó bị cái nào thay.
3. **Hai tầng, theo phạm vi của quyết định:**
   quyết định của một package → `workers/<gói>/<phiên-bản>/docs/adr/`;
   quyết định của cả repo → `docs/adr/` ở gốc.
   Đánh số liên tục trong phạm vi **từng thư mục**, bắt đầu `0001` (thư mục gốc bắt đầu từ
   ADR này, `0000`).
4. **`decisions.md` không bị xoá.** Nó là bản ghi có thật; nội dung chuyển đi thì nó trở
   thành **mục lục** trỏ sang từng ADR, kèm một dòng nói rõ chuyển đi đâu và vì sao.

Luật 1 được **cưỡng chế bằng máy**, không phải bằng lời hứa: phép kiểm **B12** trong
`scripts/check-bootstrap.mjs` đi ngược lịch sử git của từng file ADR, tìm commit đầu tiên
đưa nó sang `Accepted`, và báo lỗi nếu **phần thân** đổi sau mốc đó. Sửa riêng frontmatter
thì được — đó chính là cách một ADR bị thay thế đúng luật (luật 2).

## Hệ quả

**Được:**

- Mỗi quyết định có một địa chỉ trỏ được, thay vì "dòng thứ mấy trong một file dài".
- Quan hệ thay thế thành dữ liệu máy đọc được, không còn là văn xuôi trỏ theo vị trí.
- B12 hết `KHÔNG ÁP DỤNG`. Trước ADR này nó luôn in như vậy vì repo chưa có thư mục ADR —
  một phép kiểm không có gì để kiểm.

**Mất:**

- **112 file mới** trong lần chuyển đổi đầu (45 + 67). Thư mục `docs/adr/` của gemini dài,
  và duyệt bằng mắt trên GitHub sẽ phải cuộn. Đổi lại là tra được bằng đường dẫn.
- **Ghi một quyết định tốn công hơn.** Trước: thêm một dòng vào bảng. Nay: tạo file, đánh số,
  viết đủ bốn mục. Đây là chủ đích — thứ đắt hơn thì được cân nhắc kỹ hơn.
- **Sửa sai một ADR đã `Accepted` không còn là việc sửa file.** Phải viết ADR mới. Với lỗi
  chính tả thì nghe nặng nề; nhưng một bản ghi "bất biến trừ khi tiện tay sửa" thì không
  phải bản ghi bất biến.
- **Mục "Hệ quả" của 112 ADR chuyển đổi đều ghi `không ghi lại`.** Bảng gốc không có cột đó.
  Bịa ra cho đẹp thì bản ghi lịch sử hết đáng tin — thà để trống và nói rõ là trống.

## Trạng thái

Accepted — 2026-09-02, phiên `s5-adr`.

Phạm vi chuyển đổi lần này: `duc-auto-chatgpt/v0.1.0` (45) và `duc-auto-gemini/v0.2.0` (67).
**`duc-auto-gg-flow-video/v0.1.0` (8 quyết định) CHƯA chuyển** — lúc làm S5, package đó đang
do phiên `claude-bridge-multiprofile` giữ, và luật mục 1 của `AGENTS.md` cấm ghi vào package
của phiên khác. Nó có định dạng văn xuôi khác hẳn hai file kia nên cần một bộ tách riêng.
