# ROADMAP — Scouter Seed đi tới đâu, và đang ở đâu

> **Viết cho Đức đọc.** Một trang, không thuật ngữ nếu tránh được.
> Phạm vi cố định: **25 mục `SEED v0.1`**, chốt ở [ADR-0010](../../../docs/adr/0010-scouter-dung-o-seed-v01.md).
> Danh sách 25 mục nằm ở `docs/studies/SCOUTER-CAPABILITY-INVENTORY-V1.md`; file này **không
> chép lại nó**, chỉ nói mục nào xong, mục nào chưa, và làm theo thứ tự nào.

## Đếm lại được, đừng tin con số gõ tay

```bash
awk -F'|' '/^\|/ && NF>2 {c=$(NF-1); gsub(/^ +| +$/,"",c); if (c ~ /SEED v0\.1/) print}' \
  docs/studies/SCOUTER-CAPABILITY-INVENTORY-V1.md | wc -l
```

## Thang phiên bản — Đức chốt 07/09 ([ADR-0020](../../../docs/adr/0020-thang-phien-ban-scouter-va-ranh-gioi-seed-pilot.md))

| Nấc | Đóng khi | Việc thật kéo nó |
|---|---|---|
| **v1** | seed đủ dùng để người ngoài lấy về dùng được | pilot `hnx.vn` (`S-10`) |
| **v2** | v1 chạy trọn một job **lớn hơn**, và cái học được đã vào seed | job Đức chọn sau |
| **v3+** | mỗi trang mới một lượt; thứ không riêng của trang thì đẩy ngược lên seed | trang mới |

**Hai chữ "v1" khác nghĩa nhau, đừng lẫn:** `SEED v1` của ADR-0010 là **23 mục năng lực còn
lại** và nó **vẫn đóng**; **Scouter v1** ở bảng trên là **bản đóng gói phát hành được** của seed
đang có. Đọc nhầm là mở một phạm vi Đức chưa duyệt.

**Sổ trang đã thử:** [`docs/TRIALS.md`](docs/TRIALS.md) — trang nào · thử gì · **dạy seed được gì**.

## Đang ở đâu — 7 dòng trên 25 đã xong

| Mục | Xong bằng gì | Đã chứng minh tới đâu |
|---|---|---|
| Bắt tay Bridge | `scouter-transport-loopback.mjs` | Máy chủ Bridge **thật**, bắt tay hai chiều |
| Cửa Bridge — bảng method + kiểm tham số | `scouter-bridge-core.mjs` | **15 method** (07/09), từ vựng đóng. Đừng tin con số này — đếm lại: `node -e "import('./scripts/scouter-bridge-core.mjs').then(m=>console.log(m.capabilities().methods.length))"` |
| Vận chuyển qua WebSocket `127.0.0.1` | `scouter-transport-loopback.mjs` | (bảng kiểm kê đếm dòng này **hai lần**) |
| Định tuyến lệnh Bridge | `createDispatcher` | Live check ĐẠT 8/8 |
| Bấm và gõ như tay người (`Input`) | `scouter-actions-core.mjs` | **Trang thật, ĐẠT 11/11** (phép đo ②, 07/09) |
| Chế độ phát triển + trần chạy thử | công tắc **bảng bên** + trần 50 | 12 con đột biến · **phanh đã chặn thật 08/09 giữa lượt tải, dừng sạch** |
| *(quan sát — 4 phép dò)* | `observer-probes.mjs` | Trang **giả** |

**Còn 18 dòng.** Nhưng 18 dòng đó không cùng loại, và đây là chỗ dễ lạc nhất:

| Nhóm | Mấy mục | Là gì | Thái độ |
|---|---:|---|---|
| **A — nhìn rõ hơn** | ~~4~~ **còn 1** | ~~Đọc trang theo *vai trò + tên*~~ · **biết trang tải xong lúc nào** · ~~chụp màn hình~~ · ~~chụp cả cây DOM một lượt~~ | **Ba mục XONG 07/09** (`scout.a11y` · `scout.shot` · `scout.snapshot`). Còn `webNavigation` |
| **B — máy móc của một vòng chạy có hàng đợi** | 7 | Danh tính lượt thử · trạng thái vòng chạy · không làm hai lần · luật thử lại · nhịp tim · khoảng nghỉ giữa job · sẵn sàng nhận việc | **LÀM — đã đảo lời khuyên 07/09.** Xem dưới |
| **C — an toàn và vận hành** | 4 | Chuỗi bằng chứng · bảng mã lỗi cho người vận hành · khoá tab và hội thoại · quyết định thao tác fail-closed | Làm sau nhóm A |
| **D — năng lực Chrome còn lại** | 3 | `scripting` · `offscreen` · `commands` | Làm khi có việc cần tới, không làm trước |

### Nhóm B: tôi đã khuyên hoãn, và tôi rút lại — 07/09

**Lời khuyên cũ, giữ nguyên để đọc được vì sao nó sai:** *"Nhóm B là máy móc của một cỗ chạy job
hàng loạt, mà Scouter không có hàng đợi job nào → hoãn cả 7."* Lý do đó dựa trên một giả định:
Scouter sẽ không có hàng đợi.

**Giả định đó sai, và Đức là người bác nó.** Ngày 07/09 Đức nêu pilot thật đầu tiên: lấy dữ liệu
hai trang phái sinh `hnx.vn` **theo ngày, đầy đủ**. Đó **chính là** một hàng đợi — mỗi ngày một
việc, phải biết ngày nào đã lấy, phải chạy tiếp được khi đứt, phải thử lại khi hụt. Bốn trong
bảy mục nhóm B mô tả đúng những thứ đó.

Nên nhóm B **không còn là suy đoán**. Nó là việc kế, và nó vào bước 2 chứ không đợi tới bước 4.

**Ba mục nhóm B vẫn hoãn** vì chúng thuộc về một cỗ chạy job của *nhà cung cấp*, không phải của
một vòng lấy dữ liệu: nhịp tim vòng chạy · khoảng nghỉ giữa job · sẵn sàng nhận việc mới.

**Bài học ghi lại, vì nó sẽ lặp:** tôi xếp thứ tự 25 mục dựa trên *"gói này là gì"*, trong khi
thứ quyết định thứ tự là *"việc thật đầu tiên là gì"*. Hỏi Đức việc thật trước khi xếp bảng thì
đã không phải đảo.

## Đường đi — bốn bước, theo đúng thứ tự

### Bước 1 — `S-06`: chứng minh cú bấm chạy trên trang THẬT ✅ **XONG 07/09 — ĐẠT 11/11**

Mọi thứ đã xây đều mới chỉ chạy trên **trang giả trong phép ghim**. Phép đo ① ngày 06/09 chứng
minh *đường đi* dùng được, **không** chứng minh ba lệnh của Scouter viết đúng.

Chỗ nguy nhất, và cũng là lý do bước này không bỏ được: Scouter **tự tính toạ độ** từ hộp của
phần tử. Trên trang giả thì hộp là con số ta tự đặt. Trên trang thật, hộp phụ thuộc cuộn trang,
khung nhìn, tỉ lệ hiển thị — và một sai lệch ở đây nghĩa là **bấm trúng phần tử bên cạnh**, thứ
không phép ghim nào hiện có bắt được.

**Kết quả:** `npm run scouter:action-probe` — ĐẠT 11/11 trên Chrome 152. Hai hệ toạ độ **không
lệch**: nút dưới 1800px khoảng trống thì lõi cuộn 1288px rồi bấm trúng, và bấm ngược lên cũng
trúng. Phép đo tự chứng minh nó biết đỏ: bẻ lõi ba kiểu thì giết được 3/3, mỗi con đỏ đúng chỗ.

**Trần 50 vẫn CHƯA hiệu chỉnh** — phép đo chỉ tốn 6 lượt ghi nên nó không nói gì về con số 50.
Việc đó lùi sang bước 2, nơi có một vòng chạy đủ dài để đếm.

**Ba thứ chưa đo, in ngay trong bản báo cáo của phép đo:** trang có khung lồng (iframe) · trang
đổi tỉ lệ hiển thị · trang thật của nhà cung cấp.

### Bước 2 — đóng vòng tự cải tiến MỘT lần ⟵ *việc kế*

Đây là mục đích của cả gói ([ADR-0009](../../../docs/adr/0009-scouter-thay-observer-cua-tuong-tac.md)):
Scouter dò trang → báo cáo cho AI → AI viết adapter xuống đĩa → `scout.reload` → adapter chạy.
Từng mảnh đã có; **cả vòng thì chưa ai chạy một lần nào**.

Cho tới khi vòng đó khép một lần trên một trang tự dựng, ta đang xây các bộ phận mà chưa biết
chúng lắp vào nhau có chạy không.

**Đức vừa gỡ chỗ chặn của bước này ngày 07/09** ([ADR-0016](../../../docs/adr/0016-scouter-duoc-ghi-ghi-chep-xuong-dia.md)):
Scouter được ghi ghi chép xuống đĩa. Đó chính là **tầng thứ ba** trong ba tầng của ADR-0009 —
*nguyên liệu để sinh ra adapter*.

**Và việc thật để đo nay đã có: `S-10`, pilot `hnx.vn` một tuần.** Nên bước 2 không còn là một
bài tập tự dựng — nó chạy trên việc Đức cần thật. Ba thứ pilot đó bắt phải có, và cả ba đều là
nhóm B: biết ngày nào đã lấy (*không làm hai lần*) · chạy tiếp được khi đứt (*trạng thái vòng
chạy*) · thử lại khi hụt (*luật thử lại*).

**Một điều đã đo và nó đổi hình dạng bước này:** dữ liệu `hnx.vn` không nằm trong trang, nó tới
từ một endpoint POST. **Pilot này không cần bấm một nút nào** — `scout.click` / `scout.type` /
`scout.key` không dùng tới. Chi tiết hợp đồng endpoint và cái bẫy "200 OK mà sai" ở `S-10`
trong `BACKLOG.md`.

### Bước 3 — nhóm A, nay chỉ còn MỘT mục

1. **Biết trang tải xong lúc nào** (`webNavigation`). Không có nó thì mọi phép dò là **đoán về
   thời điểm**: dò sớm một nhịp là đọc phải trang chưa dựng xong, và triệu chứng nhìn ra ngoài
   giống hệt "selector sai".
2. ~~**Đọc trang theo vai trò + tên** (`Accessibility`)~~ — **XONG 07/09**, là `scout.a11y`. Lý do nó cần thì vẫn đúng nguyên: `scout.page` trả về phần tử theo
   DOM; cái AI thật sự cần để chọn đích là *"nút tên Gửi"*, không phải `div > div > button:nth-child(3)`.

~~Hai mục còn lại của nhóm A (chụp màn hình · chụp cây DOM một lượt) làm sau.~~ **Cả hai XONG 07/09** (`scout.shot` · `scout.snapshot`). Chụp màn hình từng
vướng chính sách che dữ liệu; [ADR-0016](../../../docs/adr/0016-scouter-duoc-ghi-ghi-chep-xuong-dia.md)
gỡ chỗ đó ngày 07/09.

### Bước 4 — dừng lại, đếm lại, rồi mới đi tiếp

Sau bước 3, đo lại còn bao nhiêu mục và mục nào còn đáng làm. Không lên kế hoạch xa hơn ở đây:
[bốn con số viết sẵn trong kế hoạch của repo này đều đã sai](../../../docs/protocols/MULTIFLOW.md).

## Cái đang chặn, và ai gỡ được

| Chặn gì | Ai gỡ | Ghi ở đâu |
|---|---|---|
| ~~Chính sách che dữ liệu~~ **ĐÃ GỠ 07/09** — Scouter được ghi ghi chép xuống đĩa | *xong* | [ADR-0016](../../../docs/adr/0016-scouter-duoc-ghi-ghi-chep-xuong-dia.md) |
| ~~Nhóm B — 7 mục làm hay hoãn~~ **ĐÃ CHỐT 07/09**: làm 4 mục pilot cần, hoãn 3 mục của cỗ chạy job nhà cung cấp | *xong* | [ADR-0020](../../../docs/adr/0020-thang-phien-ban-scouter-va-ranh-gioi-seed-pilot.md) mục ⑸ |
| Chạy trên trang thật (không phải trang tự dựng) | **Đức** | `AGENTS.md` gốc mục 2 |

## 08/09 — ĐANG Ở ĐÂU, sau một ngày chạy thật

> Phần này viết sau khi Scouter chạy trên trang thật cả ngày. Nó **thay** phần "Đang ở đâu"
> phía trên ở chỗ nào hai bên nói khác nhau — phần trên viết lúc mọi thứ còn chạy trên trang giả.

### Bốn thứ nay đã chứng minh trên TRANG THẬT

| Việc | Bằng chứng |
|---|---|
| Bốn phép dò quan sát | `scout.page` · `scout.tree` · `scout.a11y` (2167 nút) · `scout.query` trên hnx.vn |
| Lấy dữ liệu qua mạng | **216 PDF** + **368 hàng** dữ liệu, 46 ngày, 0 lỗi |
| Đi sang trang khác | `scout.navigate` — cùng site 289 ms, khác site 261 ms, id cũ vẫn dùng được |
| Cái phanh | Chặn thật giữa lượt tải PDF, **dừng sạch**: không tệp dở, không tệp cụt mang tên thật |

### Sản phẩm thật đang chạy

Hai đường, cùng đổ vào thư mục dữ liệu của Đức trên Drive:

- **216 tệp PDF** báo cáo thống kê — 46 ngày liền mạch 01/07 → 07/09, không ngày nào thiếu
- **1 tệp CSV SSOT**, 368 hàng — `HNX_PS_Ket_qua_giao_dich_SSOT.csv`

Cập nhật hằng ngày là **một lệnh**, tự bỏ qua ngày đã có. Câu lệnh nằm ở cuối `HANDOFF.md`.

---

## Đi tiếp theo thứ tự nào — Đức chọn, tôi không tự bắt đầu

Xếp theo **giá trị thật chia cho công sức**, không theo thứ tự tôi nghĩ ra chúng.

### ① Trang thử THỨ HAI cho seed — việc đáng làm nhất

**Vì sao đứng đầu:** seed mới chỉ thử trên **đúng một trang** (`TRIALS.md` liệt kê `hnx.vn`).
Phép kiểm thuần khiết canh được *seed không nhắc tên trang nào*, nhưng nó **không** canh được
*seed có thật sự dùng chung được không*. Một hàm sạch tên trang vẫn có thể chỉ đúng cho một
**hình dạng** trang.

Nên câu "năng lực chung" hiện là **lời khai chưa được đo**. Trang thứ hai là phép đo đó.

**Chọn trang KHÁC KIỂU hnx.vn:** hnx.vn là trang tĩnh, form cũ, jQuery. Một trang **render bằng
JS** sẽ ép seed lộ ra chỗ nó chỉ đúng với hnx.vn — mà hôm nay ta chưa biết chỗ đó ở đâu.
#### Bản đề xuất 08/09 — Đức chọn một, tôi không tự bắt đầu

**Thêm một tiêu chí mà mục này bỏ sót, và nó quan trọng hơn "render bằng JS":** trang thứ hai
phải **bắt PHẢI BẤM mới ra dữ liệu**. Cả vòng HNX chạy trọn với **đúng một lệnh đọc**, nên tới
hôm nay ba lệnh bấm-gõ của Scouter — thứ đắt nhất và nguy nhất của gói, thứ đòi quyền
`debugger` — **chưa lần nào chạy trong một việc thật**. Chọn tiếp một trang chỉ-cần-đọc thì
`HNX Fetch` làm được, và câu hỏi đó vẫn chưa ai trả lời.

Ba ứng viên, xếp theo **giá trị thật cho Đức chia cho rủi ro**:

| | Trang | Được gì | Mất gì |
|---|---|---|---|
| **①** | **HOSE — `hsx.vn`** | Sàn còn lại của thị trường. Dữ liệu **ghép thẳng** được với bộ HNX đang có, nên trang thử này đẻ ra sản phẩm chứ không chỉ đẻ ra bài học. Chọn ngày rồi bấm tìm ⇒ ép đúng đường bấm | Cùng thời với `hnx.vn`, nên nó **không** ép lộ chỗ seed chỉ đúng với trang tĩnh |
| **②** | Một trang tin tài chính SPA (**CafeF** · **Fireant**…) | Khác kiểu thật: cuộn để nạp thêm, không có URL riêng cho từng trạng thái ⇒ ép seed lộ đúng chỗ mục này lo | Dữ liệu là **thứ cấp** — sai một chỗ mà không có nguồn gốc để đối chiếu |
| **③** | Trang cần **đăng nhập** (Vietstock…) | Gần nhất với việc thật về sau | **Không chọn bây giờ.** Tôi không được gõ mật khẩu, nên mỗi lượt chạy phải chờ tay Đức — trang thử mà chờ người thì đo được rất ít |

**Tôi khuyên ①**, và nói rõ đang đánh đổi cái gì: nó **kém** ② ở đúng việc mục này đặt ra (ép lộ
chỗ seed hẹp), nhưng **hơn** ở chỗ một lượt chạy hỏng vẫn để lại dữ liệu Đức dùng được. Trang
thử không ra sản phẩm là trang thử dễ bị bỏ giữa chừng.

**Bước đầu tiên KHÔNG phải viết mã.** Luật vàng ⑴ cấm đoán selector, mà tới giờ chưa ai mở
`hsx.vn` bằng `diagnostics.dom_probe`. Nên lượt đầu là **một phép đo**: dữ liệu tới từ một lượt
gọi mạng (thì đây lại là việc của `HNX Fetch`, không phải Scouter), hay chỉ hiện ra sau một cú
bấm? Câu trả lời đó quyết cả hướng đi, và nó rẻ.

### ② Đóng gói v1 — để người ngoài lấy về dùng được

Nấc `v1` ở bảng thang phiên bản khai *"seed đủ dùng để người ngoài lấy về dùng được"*. Pilot
hnx.vn đã kéo nó tới nơi. Còn thiếu: một đường cài đặt cho người chưa từng đọc repo này.

Việc này **chỉ nên làm sau ①** — đóng gói một seed mới thử một trang là đóng gói một lời hứa.

### ③ Hai mục nợ nhỏ, gộp một lượt

| Mã | Việc | Vì sao chưa gấp |
|---|---|---|
| `S-12` | Ngày lễ bị gọi lại mỗi lượt chạy | **cố ý chưa vá** — đánh dấu bằng tệp rỗng là đổi một phiền toái nhỏ lấy một lỗi im lặng lớn, nếu HNX bổ sung dữ liệu sau. Cần Đức chốt |
| `S-13` | Gọi sai tên method trả lỗi nội bộ | đã kiểm: **không** phá lượt khác đang bay. Xấu mặt, không hở |

### ④ KHÔNG làm bây giờ

- **Tự chạy hằng ngày.** Luật gốc cấm tạo automation tự chạy khi chưa hỏi, và một bộ tải chạy
  ngầm mỗi ngày là đúng thứ đó. Chạy tay một lệnh vẫn ổn cho tới khi Đức thấy phiền.
- **Mở thêm quyền CDP.** `Page.navigate` vừa mở 08/09 và đó là lượt mở đầu tiên sau nhiều tuần.
  Mở tiếp mà chưa có việc thật đòi là nới bề mặt tấn công cho một nhu cầu tưởng tượng.

---

## Ba câu chỉ Đức trả lời được

Ghi ở đây vì sau một lượt compact thì đây là chỗ duy nhất còn nhớ chúng:

1. **Trang thử thứ hai là trang nào?** (mục ① ở trên — đã có bản đề xuất, Đức chọn)
2. **S-12** — ngày lễ gọi lại mỗi lượt: chịu, hay đánh dấu (và chịu rủi ro mất dữ liệu bổ sung)?

**Đã chốt 08/09, không hỏi lại:** `S-11` (token trần ở hai bridge đóng băng) — **chấp nhận rủi
ro**. Lý do và điều kiện hết hiệu lực ở
[ADR-0022](../../../docs/adr/0022-chap-nhan-rui-ro-token-tran-o-hai-bridge-dong-bang.md).

## Cái file này KHÔNG làm

Không chép lại danh sách 25 mục — bảng kiểm kê là bản gốc, và hai bản của một danh sách thì sớm
muộn trả hai câu khác nhau. Không đặt hạn. Không ghi phần trăm hoàn thành: 7/25 dòng nghe như
28% xong, trong khi 7 dòng đã xong là 7 dòng **dễ nhất** và một dòng của nhóm A nặng hơn cả bảy.
