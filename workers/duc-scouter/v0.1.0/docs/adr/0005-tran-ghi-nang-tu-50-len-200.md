---
status: Accepted
adr: 0005
date: 2026-09-08
deciders: Đức
---

# ADR-0005 — Trần ghi mỗi lần mở khoá nâng từ 50 lên 200

## Bối cảnh

[ADR-0001](0001-phanh-cho-duong-ghi-va-quyen-alarms.md) dựng cái phanh cho đường ghi: công tắc
mặc định TẮT, và mỗi lần bật cho **50 lượt ghi**. Chính ADR đó đã nói rõ con số ấy là **ước
lượng chưa đo**:

> Trần 50 là **con số đoán**, chưa có lượt chạy thật nào để hiệu chỉnh.

Nó đặt theo mục tiêu *~20–40 thao tác cho một adapter* của ADR-0009 — tức là theo hình dung về
**một lượt dò một trang**, việc duy nhất Scouter làm được lúc đó.

Ngày 08/09 có lượt chạy thật đầu tiên, và nó không giống hình dung ấy. Scouter tải **216 tệp
PDF** rồi lấy **368 hàng** dữ liệu từ hnx.vn. Mỗi lượt `scout.fetch` là `read_only: false` nên
mỗi lượt tiêu một suất ngân sách. Cái phanh chặn thật, **giữa chừng**, nhiều lần — và mỗi lần
chặn Đức phải tự tay tắt rồi bật lại công tắc để cùng một việc chạy tiếp.

## Quyết định

**Trần một lần mở khoá: 50 → 200.** Đức chốt 08/09.

Đổi đúng một con số. **Ba tính chất còn lại của cái phanh không đổi**, và chúng mới là chỗ
chịu lực:

1. Trần **gõ cứng trong mã** — không đọc từ tham số, không đọc từ kho lưu. Một trần đọc được
   từ chỗ mà kẻ bị chặn ghi được thì nó không phải là trần (phép ghim ⑬).
2. Trần đếm **theo mỗi lần mở khoá**, không theo giờ và không theo đời service worker.
3. Hết trần thì cửa đóng, và **chỉ tay Đức mở lại được**. Không method Bridge nào bật được
   công tắc đó.

## Vì sao 200, và vì sao đây không phải là nới lỏng

**Trần cũ không lọc được gì — nó chỉ chia nhỏ.** Một cái phanh có ích khi nó dừng việc *sai*.
Trần 50 hôm 08/09 dừng một việc **đúng**, đã được Đức giao, đang chạy tốt; rồi Đức bật lại và
việc đó chạy tiếp y nguyên. Không lượt ghi nào bị loại — chúng chỉ bị **hoãn**, và cái giá là
những lượt bật tay không mang thông tin gì.

Chuyện đó tệ hơn là phiền. Một cổng luôn được mở lại là một cổng **dạy người vận hành bấm cho
qua**: đến lần cái phanh chặn một việc thật sự sai, phản xạ đã thành bật-lại-rồi-tính. Trần đo
đúng cỡ việc thật thì lần chặn tiếp theo mới là một tín hiệu đáng dừng lại đọc.

**200 lấy ở đâu ra:** cỡ một lượt tải trọn vẹn cho một ngày dữ liệu (một ngày = 8 hàng + vài
tệp PDF, một lượt bổ sung nhiều ngày vẫn nằm dưới 200), cộng biên. Nó **không** đủ cho lượt
lấy lại toàn bộ 46 ngày — lượt đó vẫn chạm trần, và **cố ý**: gọi lại cả lịch sử là việc hiếm,
đáng để người vận hành nhìn thấy một lần.

## Cái mất

**Một vòng lặp hỏng nay tiêu 200 lượt trước khi dừng, thay vì 50.** Đó là cái giá thật, không
phải cái giá trên giấy. Nhận nó vì hai lẽ: 200 lượt bấm vẫn là **có trần** — khác hẳn không
trần — và cả bốn lớp còn lại (mặc định tắt · gõ cứng · đếm theo lần mở khoá · chỉ tay người mở
lại) không bị đụng tới. Cái chặn *cuối cùng* chưa bao giờ là con số; nó là việc công tắc luôn
phải quay về tay Đức.

**Con số này lại là ước lượng, y như 50 từng là.** Nó dựa trên một lượt chạy thật của **một**
trang. Nếu trang thử thứ hai (mục ① của `ROADMAP.md`) có hình dạng khác hẳn thì 200 sẽ lại
sai — nhưng lần này sẽ sai theo hướng **đo được**, vì đã có một lượt chạy thật để so.

## Đo

| Chỗ | Kiểm bằng |
|---|---|
| Trần đúng bằng 200 và gõ cứng | phép ghim ⑬, `tests/scouter-write-gate-smoke.mjs` |
| Trần vẫn chặn thật ở lượt thứ 201 | cùng tệp, khối ⑬ |
| Gỡ trần / nới thành vô hạn / cho kho lưu tự đặt trần | đột biến `P5` · `P6` · `P7` |

Ba mỏ neo đột biến đọc thẳng chuỗi `const WRITE_CAP_PER_UNLOCK = 200;`, nên chúng đã được
sửa theo. **Mỏ neo lệch thì bộ đo báo BỎ QUA, mà BỎ QUA đọc y hệt ĐẠT** — đó là chỗ dễ mất một
chốt an toàn nhất trong lượt đổi này.

## Trạng thái

Accepted
