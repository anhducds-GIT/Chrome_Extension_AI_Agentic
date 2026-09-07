---
status: Accepted
adr: 0020
date: 2026-09-07
deciders: Đức
---

# ADR-0020 — Scouter đi tiếp theo THANG PHIÊN BẢN, và pilot không được nhiễm vào seed

## Bối cảnh

[ADR-0010](0010-scouter-dung-o-seed-v01.md) đặt một cái chốt: *"Scouter làm tới hết `SEED v0.1`
rồi DỪNG. 23 mục `SEED v1` không nằm trong phạm vi lượt này; muốn mở phải có một ADR mới."*

Ngày 07/09 Đức mở nó, và mở theo một hình dạng khác với thứ ADR-0010 dự liệu. Nguyên văn:

> *"Scouter này là lần đầu triển khai, nên ta vừa trial vừa viết protocol & guidance cho nó nếu
> trong quá trình triển khai có các lesson learn gì. Ngoài ra sẽ có 1 big road map ví dụ như:
> hoàn thiện đóng gói v1 (trong quá trình hoàn thiện lấy ví dụ pilot fetch dữ liệu HNX) nhưng
> tránh ko để nhiễm thông tin pilot vào Seed, cần tách riêng. Áp dụng v1 vào 1 job khác to hơn &
> improve, chạy hoàn thiện & release v2. Từ sau này trở đi, tiếp tục áp dụng các phiên bản mới
> hơn để extract các web site mới, có gì hay cập nhật ngược lại seed để bổ sung và nâng cấp seed."*

Tình trạng lúc chốt: seed có **15 lệnh**, 13 phép ghim, **91/91** con đột biến bị giết, ba lệnh
bấm–gõ đã chạy thật trên trang tự dựng (11/11). **Chưa có một trang thật nào được thuần hoá.**

## Quyết định

### ⑴ Bốn nấc, và mỗi nấc mở bằng một VIỆC THẬT chứ không bằng một danh sách

| Nấc | Đóng khi | Việc thật kéo nó |
|---|---|---|
| **v1** | seed đủ dùng để một người ngoài lấy về dùng được | pilot `hnx.vn` (`S-10`) |
| **v2** | v1 chạy trọn một job **lớn hơn**, và những gì học được đã vào seed | job Đức chọn sau |
| **v3+** | mỗi trang mới là một lượt; thứ nào không riêng của trang thì đẩy ngược lên seed | trang mới |

**Việc thật đi trước danh sách.** Đây không phải lời văn: ngày 07/09 tôi đã xếp thứ tự 25 mục
theo *"gói này là gì"*, rồi phải đảo ngay khi Đức nêu pilot thật — bốn mục tôi khuyên hoãn hoá
ra là bốn mục pilot bắt buộc phải có. Bài học đó nay thành luật của thang này.

### ⑵ Hai chữ "v1", và chúng KHÔNG cùng nghĩa

Đây là chỗ dễ ra quyết định sai nhất trong cả ADR này, nên nói thẳng:

| Chữ | Nghĩa | Ở đâu |
|---|---|---|
| `SEED v1` | **23 mục năng lực** còn lại trong bảng kiểm kê | ADR-0010 · `SCOUTER-CAPABILITY-INVENTORY-V1.md` |
| **Scouter v1** | **bản đóng gói phát hành được** của seed đang có | ADR này |

Đức nói *"hoàn thiện đóng gói v1"* — đó là **cột phải**: đóng gói thứ đang có cho dùng được,
không phải xây thêm 23 năng lực. Hai thứ đó khác nhau hàng tuần công.

Đọc nhầm sang cột trái thì hệ quả là mở một phạm vi Đức chưa duyệt. Nếu tôi đọc sai ý Đức, sửa
bằng một câu và ADR này ghi lại lượt sửa.

**23 mục `SEED v1` vẫn đóng.** Muốn mở vẫn phải có ADR riêng — ADR này không mở nó.

### ⑶ Ranh giới seed ↔ pilot: một cuốn SỔ, và một hàng rào HẸP

Luật thì [ADR-0009](0009-scouter-thay-observer-cua-tuong-tac.md) mục ⑵–⑶ đã viết, kể cả chiều
ngược mà Đức vừa nhắc lại: *"adapter nào sửa ra thứ không riêng của trang nào thì thứ đó phải
được đưa lên seed."* ADR này **không viết lại luật đó**. Nó thêm ba thứ luật kia thiếu:

**a. Chỗ đứng vật lý.** Seed ở `workers/duc-scouter/<phiên-bản>/`. Pilot ở
`workers/duc-scouter/pilots/<tên-pilot>/` — **ngoài thư mục phiên bản, cố ý**. Pilot không phải
một phiên bản của seed, và để chung thì lượt nâng phiên bản sau sẽ kéo theo cả pilot.

**b. Một cuốn sổ: `docs/TRIALS.md` trong gói.** Đây là thứ Đức thật sự yêu cầu — *"chỉ là 1 list
các trial mà ta đã thử thôi"*. Mỗi dòng: trang nào · thử gì · kết quả · **dạy seed được gì**.
Cột cuối là lý do cuốn sổ tồn tại; nó chính là đường ray của chiều-ngược trong luật ADR-0009.

**c. Một hàng rào HẸP, và hẹp là có chủ ý.** `tests/seed-purity-smoke.mjs` chỉ canh **mã CHẠY**
của seed: không được có tên trang thật trong một hằng số, một giá trị mặc định, hay một nhánh rẽ
theo hostname. Đó là lúc — và là lúc duy nhất — seed hết dùng chung được cho trang sau.

**Nó KHÔNG canh `tests/`, `docs/`, `pilots/`.** Đức chốt: *"nhiễm cũng được… ko quá khắt khe
đâu, trừ khi nó ảnh hưởng quá."* Một fixture nêu `hnx.vn` không chạy trên máy ai và không đổi
hành vi của seed — siết chỗ đó là đòi công việc mà không đổi lấy an toàn nào.

**Bản đầu của phép kiểm này ĐÃ siết quá tay** và đỏ ngay 9 chỗ, cả 9 đều vô hại. Ghi lại vì cái
bẫy đó tổng quát: một phép kiểm hay báo oan sẽ bị người ta tắt đi, và lúc đó **mất luôn cả phần
nó canh đúng**. Hàng rào hẹp mà sống lâu hơn hàng rào rộng mà bị gỡ.

### ⑷ Bài học đi đâu — và vì sao KHÔNG mở quyển sổ thứ tư

Đức muốn *"vừa trial vừa viết protocol & guidance"*. Đúng, và đó là thứ làm nên giá trị của v2.
Nhưng repo này đã có **ba** quyển và `docs/` đang **24.732 dòng** trên trần 8.000:

| Loại bài học | Về quyển đã có |
|---|---|
| Đức chốt một điều | ADR |
| Đã xảy ra chuyện gì, đo được bao nhiêu | `HANDOFF.md` |
| Còn nợ gì, đóng bằng điều kiện nào | `BACKLOG.md` |

Hai thứ **thật sự chưa có**, và chúng khác nhau:

**⒜ Danh sách trang đã thử** — mở NGAY, vì đã có ba dòng thật để ghi: `docs/TRIALS.md` (mục ⑶b).

**⒝ Cách thuần hoá một trang mới** — cầm tay chỉ việc, dùng lại được cho trang sau. Cái này
**chưa mở**, vì ta **chưa thuần hoá xong trang nào**; một playbook viết trước khi làm là văn
tưởng tượng. Luật: `docs/PLAYBOOK-thuan-hoa-mot-trang.md` mở **trong lượt `S-10`**, viết bằng
thứ thật sự vấp phải, mỗi mục trỏ được về một lượt đã chạy.

Nói cách khác: **sổ mở trước, playbook mở sau** — và ranh giới giữa hai cái là *"đã làm rồi"*.

### ⑸ Cái ADR này ĐỔI LẤY

Luật mục 3 của `AGENTS.md` gốc: một luật vào thì một luật ra. ADR này gỡ **ba dòng khuyến nghị
thứ tự** trong `ROADMAP.md` của gói — chúng nói chuyện thứ tự nhóm A/B/C/D, mà thang phiên bản ở
⑴ đã trả lời câu đó bằng việc thật. Và nó **đóng luôn một câu hỏi đang treo** trong bảng "cái
đang chặn" của `ROADMAP.md`: *"Nhóm B — 7 mục làm hay hoãn, Đức gỡ"*.

## Hệ quả

**Được.** Có đường đi ba nấc mà mỗi nấc đóng được bằng một việc đo được, không phải bằng phần
trăm. Ranh giới seed/pilot có máy canh **trước** lượt đầu tiên thử phá nó. Và cái vòng Đức mô tả
— *trang mới → học được gì → đẩy ngược lên seed* — nay có chỗ đứng cho cả hai đầu.

**Mất.** Thêm một phép kiểm và một cuốn sổ, tức thêm thuế cho mọi phiên chạm gói này. Phép kiểm
đã bị thu hẹp một lần ngay trong lượt chốt (mục ⑶c) và có thể phải thu tiếp. Nếu sau ba tháng
nó **chưa nổ lần nào** thì đó là bằng chứng để **bỏ** nó, không phải bằng chứng nó đang làm việc
tốt — [luật kiểm cả chiều phình](../protocols/MULTIFLOW.md). Cuốn sổ cũng vậy: `TRIALS.md` mà
không ai thêm dòng trong hai nấc liền thì nó đã chết, đừng bảo trì một cái xác.

**Chưa trả lời.** v2 áp lên *job nào* thì Đức chưa chọn, và ADR này cố ý không đoán hộ: chọn
sai job là mất cả một nấc.

## Cái ADR này KHÔNG làm

Không mở 23 mục `SEED v1`. Không đặt hạn cho nấc nào. Không chép lại luật ba tầng của ADR-0009 —
hai bản của một luật thì sớm muộn trả hai câu khác nhau, và repo này đã trả giá cho đúng điều đó
ngày 02/09.
