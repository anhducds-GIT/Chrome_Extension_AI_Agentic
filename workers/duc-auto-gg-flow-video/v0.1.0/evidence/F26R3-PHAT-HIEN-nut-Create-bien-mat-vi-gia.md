# F26R3 — Nút Create biến mất vì CẤU HÌNH ĐẮT HƠN SỐ DƯ (không phải hết credit)

**Ngày:** 2026-09-02 · **Hồ sơ:** `Binh` · **Bằng chứng thô:** `F26R3-probe-BEFORE-trial-20260902.json`

## Chuyện đã xảy ra

Lượt xác minh F-26 không chạy được. Nút gửi `arrow_forward Tạo` **không tồn tại trên DOM**,
kể cả sau khi đã có chữ trong ô prompt. Tôi chẩn đoán nhầm hai lần trước khi đo đúng:

1. Đoán "Create chưa gắn vì chưa có chữ" — sai: gõ 64 ký tự vào rồi, nút vẫn không có.
2. Đoán "hết credit" — sai: Đức đọc số dư trên màn hình, **còn 8 tín dụng**.

## Số đo thật

| Đo | Giá trị |
|---|---|
| `composerFound` | `true` |
| ô prompt | 64 ký tự (chữ đã vào) |
| cụm composer (hop 2) | **4 nút**: `add_2 Tạo` · `Tác nhân` · `Video · 360p · 8s crop_16_9 x3` · `close Xoá câu lệnh` |
| `arrow_forward Tạo` | **VẮNG MẶT** trong cả 24 nút của trang |
| `composer_scope_resolved` | `false` |
| `securityBlocker` | `null` |
| `generationLimitBlocker` | `null` |
| số dư credit (Đức đọc trên màn hình) | **8** |

## Vì sao đây là kết luận chứ không phải suy đoán

Nút thứ tư trong cụm là **`close Xoá câu lệnh`** — nút này chỉ mọc khi ô prompt CÓ CHỮ.
Nó có mặt. Nghĩa là cụm composer gắn đầy đủ và trang không hỏng. **Đúng một nút vắng mặt,
và đó là nút gửi.**

`composer_scope_resolved: false` KHÔNG phải một lỗi thứ hai: hàm dò phạm vi phải tìm thấy nút
Create mới xác nhận được phạm vi. Không có Create → không resolve. Nó là triệu chứng, không
phải nguyên nhân. Ai đọc `scope_resolved: false` rồi đi sửa hàm dò phạm vi là đi nhầm đường —
đã mất một vòng vì thế.

## Phép tính khớp

    chip cấu hình = Video · 360p · 8s · x3
    giá           = 3 output x 6 credit = 18
    số dư         = 8
    18 > 8        -> Flow KHÔNG gắn nút gửi

**Flow gỡ nút gửi khi cấu hình hiện tại đắt hơn số dư.** Không phải "hết credit".

## Vì sao lớp phát hiện hiện tại MÙ với trạng thái này

F-09 (đo 28/08) ghi chữ ký hết credit là: *Create biến mất VÀ có 2 nút Upgrade*.
Ở đây số dư vẫn DƯƠNG (8), nên Flow không mời nâng cấp — **không có nút Upgrade nào**.
`generationLimitBlocker` trả `null`. Một lượt chạy vào trạng thái này sẽ chết ở cổng gửi với
câu *"Send button did not become ready"* — một câu chỉ tay vào nút gửi, trong khi thứ sai là
**cái chip cấu hình**. Đúng loại lỗi làm người vận hành đi tìm nhầm chỗ.

Đây là một trạng thái THỨ BA, khác cả hai trạng thái đã biết:

| Trạng thái | Số dư | Nút Upgrade | Create | Lớp phát hiện |
|---|---|---|---|---|
| đủ tiền | dư >= giá | không | **có** | chạy bình thường |
| **đắt hơn số dư** | 0 < dư < giá | **không** | **không** | **MÙ — nợ mới** |
| hết sạch (F-09) | ~0 | **có 2 nút** | không | `generationLimitBlocker` bắt được |

## Việc phải làm

1. **Ngay:** đặt chip về `x1` → giá 6 <= 8 → nút Create phải quay lại. Đúng việc F-26 làm,
   và bấm chip **không tốn credit**. Đây vừa là cách gỡ tắc, vừa là phép thử cho kết luận trên.
2. **Nợ mới (F-27):** dạy lớp phát hiện đọc GIÁ từ chip (`x{n}` × giá mỗi output) và so với
   số dư, để trả về một câu nói đúng chỗ sai — thay vì `Send button did not become ready`.
3. Khi mở lượt chạy, runner nên tự hạ `x{n}` về `x1` trước khi gõ (F-26), vì nó vừa rẻ nhất
   vừa là cấu hình duy nhất chắc chắn nằm trong ngân sách.

## Ghi chú vận hành

- Lượt `diagnostics.evidence_submit --dry_run` để lại **64 ký tự** trong ô prompt hồ sơ `Binh`.
- Lúc dò còn thấy menu tài khoản Google đang mở (`Đăng xuất`, `Tạo hình đại diện`, gắn thẳng
  vào `body`) — do Đức mở ra để đọc số dư. Không ảnh hưởng cụm composer, nhưng nên đóng lại
  trước khi chạy để không có overlay lạ trong lượt đo.
