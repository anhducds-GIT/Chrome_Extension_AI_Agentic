---
status: Accepted
adr: 0016
date: 2026-09-07
deciders: Đức
---

# ADR-0016 — Scouter ĐƯỢC ghi ghi chép xuống đĩa; gỡ điều chặn của ADR-0010

## Bối cảnh

[ADR-0007](0007-observer-la-cua-bang-chung-cho-ai.md) treo chính sách che dữ liệu, chưa chốt.
[ADR-0010](0010-scouter-dung-o-seed-v01.md) biến chỗ treo đó thành một điều chặn cụ thể:

> *"Chừng nào chưa chốt thì Scouter **không được ghi nội dung trang xuống đĩa**."*

Điều chặn đó cắt đúng **tầng thứ ba** trong ba tầng mà [ADR-0009](0009-scouter-thay-observer-cua-tuong-tac.md)
mục ⑵ định nghĩa cho Scouter:

| Tầng | Có mấy bản | Chứa gì |
|---|---|---|
| Seed | một, dùng chung | năng lực đúng với mọi trang |
| Adapter | mỗi URL một cái | selector · thứ tự thao tác · dấu hiệu "xong" |
| **Ghi chép** | **mỗi lượt một cái** | **nguyên liệu để sinh ra adapter** |

Không có tầng ghi chép thì không có nguyên liệu, không có nguyên liệu thì không sinh được
adapter — tức là **vòng tự cải tiến, thứ mà cả gói tồn tại để làm, không khép được**. Chỗ chặn
này đã nằm trong sổ "chờ Đức chốt" từ 06/09 và là mục chặn duy nhất còn lại của gói.

## Quyết định

**Đức chốt 07/09:** *"Scouter hoàn toàn được ghi chứ. Vì Scouter chính là bản phát triển đầu
tiên của bất kỳ extension nào."*

Scouter **được** ghi ghi chép xuống đĩa. Điều chặn ở ADR-0010 nêu trên **hết hiệu lực với gói
`workers/duc-scouter`**; phần còn lại của ADR-0010 (phạm vi 25 mục `SEED v0.1`) giữ nguyên.

Lý do của Đức đáng ghi lại vì nó phân định phạm vi, không chỉ là một lời cho phép: Scouter
**không phải một extension chạy sản xuất** — nó là bộ đồ nghề dựng ra extension khác. Bắt bộ đồ
nghề quan sát mà cấm nó ghi lại thứ nó quan sát được là bỏ đi công dụng của nó.

Ba giới hạn đi kèm, suy từ luật sẵn có chứ không đẻ luật mới:

1. **Không ghi vào vùng cấm** — `evidence/` · `pilot-*/` · `Batch-*/` chỉ được THÊM bằng một
   lượt pilot thật (`AGENTS.md` gốc mục 4). Ghi chép của Scouter là đồ làm việc, không phải
   bằng chứng vận hành.
2. **Không bao giờ để token · mật khẩu · tệp ghép cặp lọt vào repo** (`AGENTS.md` gốc mục 4).
   Luật này có trước và không đổi.
3. **Chạy trên trang thật vẫn phải hỏi Đức** (`AGENTS.md` gốc mục 2). ADR này gỡ chỗ chặn về
   *ghi*, **không** gỡ chỗ chặn về *chạy ở đâu*.

## Hệ quả

**Được.** Tầng ghi chép mở ra, nên bước 2 của `ROADMAP.md` — đóng vòng tự cải tiến một lần —
làm được. Chụp màn hình (`Page.captureScreenshot`, nhóm A) cũng hết vướng. Đây là mục chặn cuối
cùng của gói; sau ADR này gói không còn câu nào chờ Đức.

**Mất — nói thẳng, và đây là chỗ sẽ quay lại.** Hôm nay Scouter chỉ chạm **trang thử do chính
nó dựng trong thư mục tạm**, nên thứ rơi xuống đĩa là nội dung thử của Đức. Ngày Scouter được
cho chạy trên một trang thật đã đăng nhập, "nội dung trang xuống đĩa" đổi nghĩa: nó gồm dữ liệu
phiên, thông tin cá nhân, và có thể cả token nằm sẵn trong DOM. Đó **không** phải lý do để chặn
hôm nay — nhưng nó là thứ phải cân lại tại đúng cái cổng đã có sẵn: lượt Đức duyệt cho chạy
trên trang thật. Ghi ở đây để lượt đó không ai quên.

**Cái ADR này KHÔNG quyết.** Nó không chốt chính sách che dữ liệu của ADR-0007 cho cả repo —
ba gói `duc-auto-*` vẫn nằm dưới chỗ treo đó. Phạm vi ở đây đúng bằng gói `workers/duc-scouter`.

**Ai phải làm gì khác đi.** Luật vàng 3 của `workers/duc-scouter/v0.1.0/AGENTS.md` ("cấm ghi nội
dung trang xuống đĩa") phải viết lại theo ADR này. Hình dạng của ghi chép — ghi vào đâu, tên
gì, chứa gì — **chưa quyết ở đây**; nó thuộc về bước 2, nơi có việc thật để đo xem cần gì.

## Trạng thái

Accepted
