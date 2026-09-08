# HANDOFF — Duc Scouter

> Trạng thái mới nhất ở CUỐI file. Log chỉ thêm dòng.

## Trạng thái hiện tại (2026-09-06)

- Gói khai sinh theo [ADR-0013](../../../docs/adr/0013-scouter-ra-nha-rieng-co-khoa-rieng.md):
  Scouter dọn từ gốc repo + `scripts/` + `tests/` về đây, có khoá riêng `workers/duc-scouter`.
- Bản nền `SEED v0.1` làm được ba khả năng của [ADR-0009](../../../docs/adr/0009-scouter-thay-observer-cua-tuong-tac.md)
  mục ⑸: quan sát · báo cáo qua Bridge · tự nạp lại mình.
- Việc tiếp theo (1): `S-01` — cho Scouter bấm và gõ được như tay người.
- Rủi ro đang mở: bản nền này **chưa từng chạy trên một trang thật**. Mọi số đo tới giờ là trên
  trang thử tự tạo và máy chủ Bridge chạy tại chỗ.

## Log

<!-- HANDOFF-THANG: 2026-09 -->
### 2026-09-06 · `claude-scouter-seed` · Nhà riêng + khung seed v0.1 làm được ba việc

**Làm gì.** Hai bước trong một lượt. ① ADR-0013: dọn Scouter từ gốc repo + `scripts/` +
`tests/` về `workers/duc-scouter/v0.1.0/`, khoá riêng `workers/duc-scouter`, chuyển bằng
`git mv` nên `--follow` còn tra được lịch sử. ② `BRIEF-SCOUTER-SEED-01` việc ②: dựng khung
seed làm được ba việc của ADR-0009 mục ⑸ — quan sát (dùng lại bốn phép dò cũ, không dựng
đường thứ hai) · báo cáo qua Bridge · tự nạp lại mình.

**Kết quả số.** 5 phép ghim của gói XANH · đột biến kiểm mới **24/24 mỏ neo khớp, giết 24,
sống sót 0** · đột biến kiểm cũ (bốn phép dò) **14/14, giết 14, sống sót 0** · nối thử với
**máy chủ Bridge THẬT** (không phải bản giả) ĐẠT 5/5.

**Một quyết định đáng nhớ.** Brief bắt đọc cả ba worker rồi quyết từng file, và ở lớp dây nó
đổi ra khác biệt an toàn thật: **chỉ nhánh ChatGPT bắt tay hai chiều** — máy chủ phải chứng
minh nó biết token trước, rồi extension mới đưa token ra. Gemini và Flow đưa token ngay khi
socket mở, tức là đưa cho bất kỳ tiến trình nào chiếm cổng 32147 trước. Seed dùng bản ChatGPT.
Hệ quả cố ý: seed CHỈ nối được với máy chủ bản ChatGPT. Con đột biến `D1` canh đúng chỗ này.

**Còn gì mở.** `S-01` bấm/gõ như tay người (việc kế) · `S-02` nối lại Bridge đang dùng
`setTimeout` vì quyền `alarms` chưa được duyệt · `S-03` tên file còn chữ `observer` ·
`S-04` `scout.reload` chờ bằng độ trễ cố định chứ chưa có xác nhận đã gửi.

**Chưa từng chạy trên một trang thật.** Mọi số đo tới giờ là trên trang thử tự tạo và máy chủ
Bridge chạy tại chỗ.

### 2026-09-07 · `claude-scouter-s01` · S-01 xong: Scouter bấm và gõ như tay người

**Làm gì.** Mở đường GHI: ba method `scout.click` · `scout.type` · `scout.key`. Đây là năng lực
xếp hạng số một của bảng kiểm kê, và là mục lớn cuối của `SEED v0.1`.

**Kết quả số.** Đột biến kiểm **42/42 mỏ neo khớp, giết 42, sống sót 0** (trước lượt này 24/24)
· suite gói **6/6** · nối thật với máy chủ Bridge **ĐẠT 7/7** · 11 method trong từ vựng.

**Quyết định hình dạng, và nó là phần đáng đọc nhất.** Đường ghi là một **lõi riêng** với danh
sách method CDP riêng, KHÔNG phải thêm `Input.*` vào lõi đọc. Thêm vào lõi đọc là làm yếu một
lớp bảo vệ đang có (luật vàng 3), và hai con `M1` `M2` sẽ đỏ đúng lúc đó. Kết quả: sau lượt này
`observer-probes.mjs` **vẫn chứng minh được là read-only** — vì kênh ghi không có mặt trong file
đó, không phải vì ai hứa.

**Bốn chốt của đường ghi.** Từ vựng đóng · danh sách method CDP (cố ý không có `Runtime.*`:
bấm và gõ không cần chạy một dòng JS nào) · **toạ độ do ta tính, không bao giờ nhận từ người
gọi** · **selector phải khớp đúng một phần tử**. Hai chốt sau là đắt nhất: nhận toạ độ từ ngoài
biến `scout.click` thành "bấm bất kỳ đâu trên màn hình", và "bấm cái đầu tiên" khi khớp nhiều
là chỗ tự động hoá phá hỏng đồ thật.

**Chuỗi lệnh chép từ phép đo 06/09.** Một chỗ cố ý khác: phép đo lấy toạ độ qua
`Runtime.evaluate`; ở đây dùng `DOM.getBoxModel` — cùng con số, không phải mở cửa chạy JS.

**Hai chỗ đột biến kiểm bắt được mà tôi không tự thấy.** `K7` sống sót lượt đầu: không vế nào
ghim "hành động hỏng không được mặc vỏ thành công". `K1` mỏ neo mục theo code vì đường ghi có
một chốt cùng hình dạng. Cả hai đã vá.

**Còn gì mở.** `S-05` **chưa có phanh nào cho đường ghi** — ba gói kia có chế độ phát triển kèm
trần, Scouter thì chưa; lệnh cấm chạy trên trang thật là luật cho người, không phải chốt trong
code. `S-06` ba method mới **chưa từng chạm một nút thật**. `S-02` quyền hẹn giờ · `S-03` tên
file · `S-04` chờ xác nhận đã gửi.

## 2026-09-07 · `claude-scouter-s05` — đường ghi có phanh, Bridge có lưới đỡ

**Làm gì.** Đóng `S-05` và `S-02`, cả hai chờ Đức chốt và Đức chốt cả hai trong cùng một lượt.

**Cái phanh.** Công tắc *Chế độ phát triển* trong popup, **mặc định TẮT**, trần **50 lượt ghi
mỗi lần mở khoá**. Chặn ở `runAction()` — cửa duy nhất ba lệnh ghi đi qua, nên lệnh ghi thứ tư
mai sau bị chặn mà không ai phải nhớ. **Không method Bridge nào bật được công tắc.**

**Hai chốt ngược trực giác, cố ý.** ⑴ *Hỏng thì ĐÓNG* — đọc kho lưu lỗi nghĩa là không biết Đức
đã mở chưa, và không biết phải xử như chưa mở. Ngược hẳn trần nạp lại nằm ngay bên cạnh cùng
file, cái đó hỏng thì mở. ⑵ *Trừ trước, bấm sau* — lượt bấm hỏng vẫn tốn ngân sách; chỉ trừ khi
thành công thì một vòng lặp gõ sai selector quay vô hạn mà trần không bao giờ chạm tới.

**`alarms`: điều kiện đóng phải sửa lại, không lặng lẽ coi là xong.** Mục `S-02` viết "bộ hẹn
giờ nối lại đi qua `chrome.alarms`". Làm không được: Chrome ép sàn 30 giây một lượt hẹn, tầng
thử-lại chạy 1s/2s/5s. Nên giữ CẢ HAI ở hai chỗ — `setTimeout` vá lúc worker còn thức, alarm
đánh thức worker đã ngủ. Chỗ lệch ghi vào ADR-0001 của gói.

**Đo.** Đột biến: mỏ neo khớp **58/58, giết 58, sống sót 0** (trước: 42/42). Phép ghim gói
**7/7 PASS**. Live check với máy chủ Bridge **THẬT: ĐẠT 8/8** (trước 7/7) — khối ⑥ mới là chiều
TỪ CHỐI qua dây thật, chiều đáng tin hơn: nó đo đúng vị trí của kẻ đáng lo.

**Một phép ghim cũ phải sửa.** `scouter-bridge-smoke.mjs` dựng Scouter chưa mở khoá nên chạm
phanh trước. Sửa kho lưu giả thành đã-mở-khoá, không nới phanh: file đó ghim GIAO THỨC.

**Còn gì mở.** `S-06` ba method ghi **chưa từng chạm một nút thật** — và đó cũng là lượt hiệu
chỉnh trần 50, con số hiện là **ước lượng chưa đo**. `S-03` tên file · `S-04` chờ xác nhận đã
gửi. Nợ mới không mở mục riêng vì đã ghi vào ADR: phanh chặn theo **số lượt**, không theo
**trang** — bật rồi thì bấm được trên bất kỳ tab nào có `target_id`.

## 2026-09-07 · `claude-scouter-s06` — có bản đồ, và cú bấm đã chạy trên trang thật

**Hai việc.** ⑴ Dựng `ROADMAP.md` cho gói. ⑵ Đóng `S-06` bằng **phép đo ②**.

**Vì sao có ROADMAP.** Đức báo mất dấu, và đúng: brief `SCOUTER-SEED-01` chỉ phủ lượt xây đầu
tiên, 25 mục của ADR-0010 **chưa ai xếp thành đường đi**. Đếm ra **7/25 xong**; trong 18 dòng
còn lại có **7 dòng là máy móc của một cỗ chạy JOB HÀNG LOẠT** — thứ Scouter không có. Khuyến
nghị hoãn cả 7 ghi ở ROADMAP; chốt xong thì còn 11 mục.

**Phép đo ② khác ① chỗ nào.** ① hỏi *đường đi* có dùng được không — có. Nhưng nó tự gõ khung
chuột bằng tay và tự lấy toạ độ, tức là **không chạy dòng nào của Scouter**. ② nạp CHÍNH
`scouter-actions-core.mjs` (chép từ đĩa, in mã băm) vào extension thử rồi gọi `runAction()` thật.

**ĐẠT 11/11 trên Chrome 152.** Ba ca trang giả không thể có, cả ba xanh: bấm nút THỨ HAI trong
hai nút chữ giống hệt → đúng nút thứ hai kêu · nút dưới 1800px khoảng trống → cuộn 1288px rồi
trúng · bấm ngược lên nút đã trôi khỏi màn hình → trúng. Hai hệ toạ độ của `DOM.getBoxModel` và
`Input.dispatchMouseEvent` **không lệch** — đó là câu hỏi mở lớn nhất, nay đã đóng.

**Phép đo phải tự chứng minh nó biết đỏ.** Xanh hết ngay lượt đầu thì chưa đáng tin. Bẻ lõi ba
kiểu (lệch toạ độ y · bỏ cuộn tới · bỏ chốt khớp-đúng-một): mỏ neo khớp **3/3**, giết **3/3**,
mỗi con đỏ ĐÚNG tiêu chí của nó.

**Một chỗ mất một lượt chạy**, đã chuyển sang `AGENTS.md` mục "hai chỗ đã trả giá" ⑴: CSP của
MV3 chặn script nội tuyến trong trang extension, im lặng.

**Một lỗi thứ tự của tôi.** Sửa `package.json` **trước khi** nhận `_root`. Lúc đó khoá trống
chủ nên không ai mất gì, nhưng luật là nhận trước lượt ghi đầu tiên.

**Đo.** Phép ghim gói **8/8**. Đột biến 58/58 giữ nguyên.

**Việc kế: bước 2 của ROADMAP** — đóng vòng tự cải tiến MỘT lần. Trần 50 hiệu chỉnh ở đó: phép
đo ② chỉ tốn 6 lượt ghi nên nó không nói gì về con số 50.

## 2026-09-07 · `claude-scouter-s06` — Đức gỡ chỗ chặn cuối: Scouter được ghi xuống đĩa

**Chốt.** Đức, 07/09: *"Scouter hoàn toàn được ghi chứ. Vì Scouter chính là bản phát triển đầu
tiên của bất kỳ extension nào."* → [ADR-0016](../../../docs/adr/0016-scouter-duoc-ghi-ghi-chep-xuong-dia.md).

**Nó gỡ đúng cái gì.** ADR-0010 từng viết *"chừng nào chưa chốt thì Scouter không được ghi nội
dung trang xuống đĩa"*, và điều đó cắt **tầng thứ ba** trong ba tầng của ADR-0009 — *ghi chép,
mỗi lượt một cái, nguyên liệu để sinh ra adapter*. Không nguyên liệu thì không sinh được
adapter, tức là **vòng tự cải tiến không khép được** — thứ cả gói tồn tại để làm. Đây là mục
chặn cuối cùng; sau ADR này gói **không còn câu nào chờ Đức**.

**Lý do của Đức phân định phạm vi, không chỉ cho phép.** Scouter không phải extension chạy sản
xuất, nó là bộ đồ nghề dựng ra extension khác. Bắt một bộ đồ nghề quan sát mà cấm nó ghi lại
thứ quan sát được là bỏ đi công dụng của nó.

**Ba giới hạn giữ nguyên, cả ba là luật có sẵn:** không ghi vào `evidence/` · `pilot-*/` ·
`Batch-*/` (bằng chứng vận hành, không phải đồ làm việc) · không bao giờ để token / mật khẩu /
tệp ghép cặp vào repo · **chạy trên trang thật vẫn phải hỏi Đức** — ADR-0016 gỡ chỗ chặn về
*ghi*, không gỡ chỗ chặn về *chạy ở đâu*.

**Chỗ sẽ phải quay lại, ghi để lượt đó khỏi quên.** Hôm nay Scouter chỉ chạm trang thử do chính
nó dựng trong thư mục tạm, nên thứ rơi xuống đĩa là nội dung thử. Ngày nó được cho chạy trên
một trang thật đã đăng nhập, "nội dung trang xuống đĩa" đổi nghĩa: dữ liệu phiên, thông tin cá
nhân, có thể cả token nằm sẵn trong DOM. Không phải lý do chặn hôm nay — là thứ phải cân lại tại
đúng cái cổng đã có: lượt Đức duyệt cho chạy trang thật.

**Chưa làm trong lượt này, và cố ý.** Hình dạng ghi chép — ghi vào đâu, tên gì, chứa gì — thuộc
bước 2 của `ROADMAP.md`, nơi có việc thật để đo xem cần gì. Quyết trước khi có việc thật là đoán.

## 2026-09-07 · `claude-scouter-s06` — icon chữ S nền vàng, và một nợ mở-rồi-đóng trong ngày

**Icon.** Đức xin chữ S màu vàng, rồi chốt lại: **nền vàng**. Nên chữ S phải TỐI — vàng trên
vàng thì không còn chữ nào. Cách này còn hơn ở chỗ đo được: ô vàng đặc nổi trên CẢ thanh công
cụ sáng lẫn tối, trong khi chữ vàng trên nền trong suốt gần biến mất ở chế độ sáng.

**Bộ sinh, không phải bốn file PNG dán vào.** `scripts/make-icons.mjs` vẽ chữ S bằng **hai vành
khuyên bị cắt cung**, không dùng phông chữ — phông có ở máy này chưa chắc có ở máy khác, và một
icon đổi hình theo máy là icon không kiểm được. Kèm bộ đóng gói PNG tự viết trên `zlib`. Đổi màu
thì sửa hai hằng số đầu file rồi chạy lại. Chrome **không nhận SVG** làm icon extension.

**Phép ghim ⑮ mới:** manifest phải trỏ tới file icon **có thật**, đủ bốn cỡ. Đáng canh vì đây là
hỏng IM LẶNG — trỏ hụt thì Chrome không báo gì, chỉ lặng lẽ quay về mảnh ghép xám.

**`S-07` mở và đóng trong cùng ngày, vì nó chặn chính lượt đang chạy.** Khối ⑫ của
`scouter-transport-smoke.mjs` đọc `bridge-pairing-core.js` ở ba gói hàng xóm từ **đĩa**, nên hễ
một lane đang sửa dở gói của họ là suite Scouter đỏ vì lý do ngoài Scouter. Gặp **hai lần trong
một giờ** hôm nay; lần thứ hai làm đột biến kiểm không khởi động được. Nay đọc qua
`git show HEAD:` — và ngữ nghĩa cũng đúng hơn: hợp đồng là thứ đã commit, không phải thứ đang
nằm dở của người khác. Không có bản dự phòng đọc đĩa: một bản dự phòng lặng lẽ đổi ngữ nghĩa là
đúng cách phép ghim này mất tác dụng lần nữa.

**Một lượt đỏ KHÔNG phải của tôi:** `bridge-attention-static.mjs` của gói ChatGPT, mỏ neo mục
theo lượt refactor `B-36` của lane `claude-b36-vaA`. Không sửa vùng họ; họ đã tự sửa.

**Đo.** Phép ghim gói **8/8** (khối ⑮ mới). Đột biến **58/58, sống sót 0**.

**Còn mở:** `S-08` — icon mới **chưa ai nhìn thấy trong Chrome thật**. Phép ghim chỉ chứng minh
manifest trỏ đúng chỗ, không chứng minh Chrome chịu nạp bốn file PNG do bộ đóng gói tự viết sinh
ra. Đóng bằng một câu xác nhận của Đức sau khi nạp lại extension.

## 2026-09-07 · `claude-scouter-s06` — vỏ đổi sang bảng bên, và pilot hnx.vn đã đo được

**Đức hỏi vì sao Scouter là popup. Câu trả lời: chưa ai quyết cả.** Chú thích trong code viện
dẫn *"ADR-0009 ⑷"*, nhưng ⑷ nói về *"một Scouter một URL"* — không chữ nào về bảng bên. Một
**mặc định được mặc áo quyết định**, và loại đó nguy hơn quyết định sai: quyết định sai có
người phản biện, cái này thì ai đọc vào cũng tưởng đã có người cân.

**Popup thua ở đúng chỗ gói này cần: nó CHẾT khi mất tiêu điểm.** Bấm vào trang là nó đóng, mà
việc của Scouter là nhìn một trang trong lúc có người tương tác. Cụ thể hơn: công tắc chế độ
phát triển và bộ đếm *"còn N/50 lượt"* nằm trong đó — không xem được ngân sách tụt trong lúc nó
tụt thì cái phanh chỉ còn một nửa công dụng. Đổi vỏ: [ADR-0002](docs/adr/0002-vo-giao-dien-la-bang-ben-khong-phai-popup.md).

**Sửa một suy luận đi quá tay:** *"Scouter không phải worker tự động hoá"* (vẫn đúng) không
kéo theo *"phải khác vỏ"*. Bảng bên là cái **vỏ**, không phải cái **máy**.

**Bài học ghim.** Con `R3` sống sót lượt đầu: nó không xoá lời gọi `setPanelBehavior` mà bọc
`if (false)` quanh nó — phép ghim soi "chuỗi có mặt không" thì mù. Vá bằng cách đổi luật ghim
chứ không chữa con: **dây thật không có nhánh chết**.

**Pilot hnx.vn — đo thật, và nó lật kế hoạch.** Dữ liệu không nằm trong trang: nó tới từ
`POST …/ListSearch_Datas`, `p_date` dạng `dd/MM/yyyy`, trả về JSON chứa mảnh bảng HTML.
**Pilot này không cần bấm một nút nào** — năng lực đắt nhất của gói không dùng tới. Cái nó cần
là nhóm B (trạng thái vòng chạy · không làm hai lần · thử lại), thứ tôi vừa khuyến nghị hoãn
với lý do *"Scouter không có hàng đợi job"*. **Lý do đó nay sai**, và tôi rút lại. Ghi thành
`S-10` kèm hợp đồng endpoint và một cái bẫy: đoán sai tham số thì nó trả 200 OK kèm cả trang.

**Đức chốt hai câu:** file đi **qua Bridge**, không thêm quyền `downloads` · pilot lượt đầu
**một tuần**.

**Đo.** Ghim gói **8/8** · đột biến **61/61, sống sót 0** · live check Bridge THẬT **ĐẠT 8/8**.
Đóng `S-08` (Đức xác nhận icon) và `S-09` (đổi vỏ).

## 2026-09-07 · `claude-scouter-s06` — lệnh gọi mạng, Bridge riêng, và mã nguồn bị nhiễm độc

**Đức chốt hai lượt, cả hai rộng hơn câu tôi hỏi** — lý do, cái giá và các chốt ở
[ADR-0003](docs/adr/0003-mo-het-quyen-truy-cap-va-cai-gi-thay-cho-hang-rao-cu.md) (mở
`<all_urls>`, và **năm chốt hình dạng** đứng thay hàng rào theo-từng-trang vừa bỏ) và
[ADR-0004](docs/adr/0004-bridge-rieng-cho-scouter-la-mot-lop-dung-truoc.md) (Bridge riêng là một
**lớp đứng trước**, không phải bản thứ tư).

**Ba chỗ chặn đo được, cả ba nằm ngoài dự đoán của ADR-0009** — chi tiết ở ADR-0003 mục Bối
cảnh. Cái đáng nhớ nhất: câu *"Bridge ghi code mới xuống đĩa"* của **ADR-0009 ⑸ tả một thứ chưa
bao giờ tồn tại**. Ai đọc mục ⑸ mà tưởng vòng tự cải tiến đã có đủ mảnh thì đọc nhầm.

**Ba lần bộ đo đột biến BỎ LẠI con đột biến trong mã nguồn, trong đúng một buổi.** Lần đầu phép
ghim bắt được; một con tinh hơn thì suite vẫn xanh và thứ nằm lại là **một chốt an toàn đã bị
gỡ**. Vá hai lớp vì là hai bệnh: **khoá file** chống hai lượt chạy cùng lúc · **nhật ký hồi phục
trên đĩa** cứu lượt bị chém ngang.

**Hai chỗ tôi làm sai trong lúc vá, ghi ra vì cả hai đều tổng quát hơn lượt này:**
⑴ khoá bản đầu **không tự gỡ được**, nên một lượt bị giết để lại khoá mồ côi **chặn mọi lượt
sau** — tôi biến một rủi ro hiếm thành một cái kẹt thường trực. Nay khoá ghi PID và tự nhận lại
khi chủ cũ đã chết. ⑵ **bắt tín hiệu KHÔNG đủ**: Windows không có tín hiệu thật, `kill("SIGINT")`
giết thẳng tiến trình và handler không bao giờ nổ. Tôi thử chính cái chốt vừa dựng và **nó
trượt** — nên mới có nhật ký. Một chốt chưa thử là một chốt chưa biết có chạy.

**Hai con đột biến phơi ra lỗi thật.** `G2` sống sót vì phép kiểm "nằm trong gốc" bị viết **hai
lần** và hai bản **che nhau** — trùng lặp ở đây là chỗ mù, đã gộp. `G4` **bỏ hẳn**: mã chết.

**Đo.** Ghim gói **10/10** · đột biến **75/75, sống sót 0**. **Chưa chạy thật lần nào** — còn
lại của `S-10`: script phía gọi, ba mảnh nhóm B, rồi pilot một tuần.

## 2026-09-07 · `claude-scouter-s06` — bảng bên dựng lại, và một cuốn sổ để nó không nói dối

**Việc.** GPT web trả về bản vẽ v1 ba tab. Bố cục đúng hướng, nhưng đối chiếu với code thì có
**năm chỗ sai thật**, và ba trong số đó là màn hình **tự mâu thuẫn với chính nó**:
⑴ đếm 14 lệnh (thật là 15 — nhóm Quan sát ghi 6, thật là 7);
⑵ thanh tiến độ ghi `6 / 8` trên một danh sách có **4** dấu tích;
⑶ dòng *“Phanh: TẮT — Không cho phép ghi”* tự phủ định trong một dòng;
⑷ thẻ công tắc tô **đỏ ở trạng thái AN TOÀN**, nên lúc thật sự nguy hiểm không còn màu để leo;
⑸ khối “Trang hiện tại” chỉ tab **Đức đang xem**, mà AI chọn tab bằng `target_id` — hai cái
lệch nhau được, và chúng lệch đúng vào lúc lệch là đắt nhất.

**Gốc của ⑴ và ⑵ là một: con số được GÕ, không được ĐỌC.** Nên việc chính của phiên không phải
vẽ lại — mà là dựng cái nguồn để đọc. `scripts/scouter-journal-core.mjs` bọc `dispatch`, đứng
NGOÀI đường đi của phong bì. Ba bất biến: chỉ ghi lệnh **đã xong và đã thành công** · tên miền
chốt **lúc ghi** (đóng tab không mất tiến độ) · **sổ hỏng thì im**, không giết lượt gọi của AI.
Số lệnh trên bảng nay đếm từ `capabilities()` — cùng hàm mà AI hỏi, nên hai bên không khai
khác nhau được.

**Hai lần phép ghim tự bắt được chính nó, ghi ra vì cả hai tổng quát hơn lượt này.**
⑴ Con `J5` **sống sót**: tôi đo trần nhật ký qua `doc()`, mà `doc()` cũng cắt — nên bài kiểm
không phân biệt được *chặn lúc ghi* với *chặn lúc đọc*. Sửa phép ghim, không sửa đột biến.
⑵ `sidepanel-dom-smoke` báo oan hai lần vì đọc cả **chú thích**. Chiều báo oan chỉ phiền;
chiều ngược lại mới nguy — một `id` chỉ có trong chú thích sẽ được tính là CÓ trong DOM, tức
phép ghim gật đầu cho đúng cái lỗi nó sinh ra để bắt.

**Đo.** Ghim gói **12/12** · đột biến **91/91, sống sót 0** (thêm `J1..J10`). Bảng bên tự đếm
ra 15 lệnh · Quan sát 7. **Đức phải nạp lại extension** — cả ba file giao diện đã đổi.
Còn mở: `S-10` chưa chạy thật lần nào (script phía gọi, ba mảnh nhóm B).

**Sửa ROADMAP, 5 chỗ.** Nó khai `11 method` (thật là 15) và xếp cả nhóm A vào việc-chưa-làm,
trong khi **ba trong bốn mục nhóm A đã xong ngay hôm nay** (`scout.a11y` · `scout.shot` ·
`scout.snapshot`). Còn đúng một: `webNavigation` — biết trang tải xong lúc nào. Bản đồ sai ở
đúng chỗ Đức đọc để kiểm khuyến nghị của tôi thì khuyến nghị đó không kiểm được.

## 2026-09-07 · `claude-scouter-s06` — Đức mở thang phiên bản, và tôi siết quá tay một lần

**Đức chốt roadmap ba nấc** ([ADR-0020](../../../docs/adr/0020-thang-phien-ban-scouter-va-ranh-gioi-seed-pilot.md)):
v1 đóng gói được, pilot `hnx.vn` kéo · v2 chạy một job lớn hơn rồi đẩy cái học được lên seed ·
v3+ mỗi trang mới một lượt. Đây là *"ADR mới"* mà ADR-0010 đòi trước khi đi tiếp.

**Một chỗ va tên phải nói ra:** `SEED v1` của ADR-0010 là **23 mục năng lực** và VẪN ĐÓNG;
**Scouter v1** của Đức là **bản đóng gói phát hành được**. Hai thứ cách nhau hàng tuần công, và
đọc nhầm là mở một phạm vi Đức chưa duyệt.

**Tôi siết quá tay, Đức chặn giữa chừng, ghi lại vì nó sẽ lặp.** Tôi hiểu *"tránh nhiễm pilot vào
seed"* thành một hàng rào soi cả `tests/`, và nó **đỏ ngay 9 chỗ — cả 9 đều vô hại**. Đức nói rõ:
*"nhiễm cũng được, chỉ là 1 list các trial mà ta đã thử thôi, ko quá khắt khe đâu, trừ khi nó ảnh
hưởng quá."* Bài học tổng quát: **một phép kiểm hay báo oan sẽ bị người ta tắt đi, và lúc đó mất
luôn cả phần nó canh đúng.** Hàng rào nay chỉ canh **mã CHẠY** — hằng số, giá trị mặc định,
nhánh rẽ theo hostname. Đo được: mã chạy của seed **đã sạch sẵn**, 21 file, 0 vết.

**Và thứ Đức thật sự cần thì tôi đã dựng nhầm thành hàng rào:** một cuốn SỔ. Nay là
`docs/TRIALS.md` — ba dòng thật (hai lượt trang tự dựng, một lượt đo endpoint `hnx.vn`), cột
cuối là *dạy seed được gì*. Playbook thì **chưa mở**: chưa thuần hoá xong trang nào thì viết
playbook là văn tưởng tượng.

**Đo.** Ghim gói **13/13**. Việc kế vẫn là `S-10`.

## 2026-09-07 · `claude-scouter-s06` — việc của tôi bị commit vào tên lane khác

**Sự cố đa phiên thật, không phải chuyện vặt.** Sáu file của lượt này —
ADR-0020, `TRIALS.md`, `seed-purity-smoke.mjs`, AGENTS/HANDOFF/ROADMAP của gói — **nằm trong
commit `27a88ce7` của lane `claude-dong-bang-2`**, không phải commit của tôi. Tôi `git add` xong,
lane kia commit bằng `-a`/`add -A` và cuốn cả phần đã dàn của tôi vào commit của họ.

**KHÔNG sửa lịch sử** — đó là một trong ba việc phải hỏi Đức. Nội dung an toàn và đúng; cái sai
là dòng `Lane:`, tức là **truy vết nguồn gốc**. Luật hiện có chặn *push* cuốn theo người khác
(`safe-push --carry`), nhưng **không chặn *commit* cuốn theo người khác** — đây là lỗ đó, và nó
vừa nổ. Đã ghi vào `BACKLOG.md` gốc.

**Lượt đẩy này dùng `--carry`, lane bị cuốn theo: `claude-dong-bang-2`** (ADR-0005 duyệt thường
trực, đổi lại phải kể tên).

## 2026-09-07 · `claude-scouter-s06` — `S-10`: bộ máy xong, và ba con số cũ hoá ra sai

**Hai tầng tách hẳn.** `pilots/hnx-phai-sinh/vong-lay.mjs` KHÔNG biết `hnx.vn` là gì — nó lặp,
bỏ qua thứ đã có, thử lại đúng loại lỗi. Mọi hiểu biết về trang ở `nguon-hnx.mjs`. Nên vòng lặp
là **ứng viên đẩy lên seed**, nhưng chỉ SAU khi chạy thật một lần: đẩy code chưa chứng minh lên
seed là nhân bản một giả định.

**Một quyết định đỡ cả ba tính chất: FILE ĐÃ GHI CHÍNH LÀ TRẠNG THÁI.** Không sổ tiến độ riêng.
Sổ riêng thì lệch được với đĩa, và chiều lệch "bỏ sót một ngày" thì im lặng — không ai thấy một
cái lỗ giữa tuần.

**Chỗ đắt nhất là PHÂN LOẠI LỖI**, vì `scout.fetch` tiêu ngân sách ghi: "cứ thử lại cho chắc"
không miễn phí. 200-OK-trang-khác thì **dừng cả lượt** — yêu cầu sai thì sai với MỌI ngày.

**Năm trong bảy tham số đã MẤT khỏi mọi bản ghi.** Đo lại bằng cách đọc chính mã trang, không
đoán. Ba con số đổi kết luận: ⑴ một ngày **~46 KB** chứ không phải 231 KB — 231 nghe như sắp
chạm trần 512 KiB của `scout.fetch`, 46 thì rộng gấp mười. ⑵ **ngày nghỉ vẫn trả 200 OK + JSON
hợp lệ**, chỉ khác 0 ô dữ liệu (đo 192 với 0) — nên "200 OK" không bao giờ đủ để kết luận đã có
dữ liệu. ⑶ máy chủ gửi **thiếu mắt xích chứng chỉ**: Chrome tự lấy qua AIA, Node từ chối. Cả ba
vào `docs/TRIALS.md`, cột *dạy seed được gì*.

**Bài học tổng quát:** một số đo không ghi vào file là số đo phải trả tiền hai lần. Bảy tham số
nay nằm trong `nguon-hnx.mjs`, không nằm trong trí nhớ ai.

**Đo.** Ghim 17 khối · đột biến **17/17, sống sót 0** · **0 lượt gọi mạng** trong toàn bộ suite.
Còn lại của `S-10`: **lượt chạy thật** — cần Bridge chạy, extension nạp lại, công tắc BẬT.

## 2026-09-07 · `claude-scouter-s06` — ghi tên lượt `--carry` thứ hai

Lượt đẩy `S-10` dùng `--carry`, **lane bị cuốn theo: `claude-noi-qua`** (commit `8ed66f8`,
vùng `_code`). ADR-0005 duyệt thường trực cho `--carry`, đổi lại phải kể tên trong nhật ký —
đó là thứ DUY NHẤT còn lại để truy, vì lớp chắn cuối đã bỏ.

Đây là lượt carry **thứ hai** trong cùng một phiên (trước đó: `claude-dong-bang-2`). Hai lượt
trong một buổi là số liệu đáng để ý: mô hình một nhánh chung khiến người đẩy sau luôn phải
gánh người commit trước. Không đề xuất gì ở đây — chỉ ghi để lần sau đếm được.

## 2026-09-07 · `claude-scouter-s06` — Scouter có host riêng, dựng trên lõi dùng chung

**Đức bác thiết kế của tôi, và bác đúng.** Tôi cho Scouter *mượn* host của `duc-auto-chatgpt`
(ADR-0004) để né fork. Hai chỗ hỏng: Scouter phụ thuộc **lúc chạy** vào một gói ĐÃ ĐÓNG BĂNG,
và tên giao thức là `"duc-auto-chatgpt.bridge"` — một seed sắp nhân bản mà mang tên sản phẩm khác.

**Nhưng "chép một bản như ba gói kia" cũng sai, và có số.** Đo trong repo:
`websocket-core.mjs` 3 bản **giống hệt**; `bridge-host.mjs` 3 bản **khác nhau cả ba**
(461/451/450, ba mã băm). Và 11 dòng khác biệt **chính là cái bắt tay hai chiều** — một bản vá
an toàn làm ở một bản chép, không bao giờ tới hai bản kia. Ghi thành `S-11`, KHÔNG tự sửa.

**Đường thứ ba là luật sẵn có mà chưa ai dùng** (`AGENTS.md` mục 3 luật 2): lõi vào
`workers/_shared/`, mỗi extension một host MỎNG. Giao thức nay là `duc-scouter.bridge`, và
phong bì mang tên cũ **bị từ chối** — đổi tên mà vẫn nhận tên cũ thì chỉ là trang trí.

**Phép ghim đáng nói nhất:** tách lõi thì câu hỏi không phải *"code mới có chạy không"* mà
*"tách ra có làm rơi hành vi nào không"*. Nên `tuong-duong-voi-ban-goc.mjs` hỏi **cả bản gốc lẫn
bản mới cùng một câu, 29 ca**, rồi so đáp án — kể cả ký tự điều khiển trong nhãn, emoji bị cắt
đôi ở đúng ranh giới 64, nửa cặp thay thế lạc. Khớp hết. Bản gốc đóng băng nên nó là mốc tốt.

**Bộ đo tự tìm ra một lỗ.** Ba mỏ neo báo hỏng vì chốt chuyển file; lượt đi sửa mỏ neo lộ ra
rằng **cái bắt tay hai chiều — lý do chính khiến lõi được tách — không có phép ghim hành vi
nào**. Nay có `bat-tay-hai-chieu.mjs` (nối THẬT qua socket, 5 khối) và hai con `X3` `X4`.

**Đo.** Ghim 17 file · đột biến **93/93, sống sót 0**. Bridge đã chạy thật trên máy Đức:
ghi/đọc file OK, và thử `file.read` lên tệp ghép cặp thì **bị chặn** (`PATH_OUTSIDE_ROOT`).

## 2026-09-08 · `claude-scouter-s06` — S-10 CHẠY THẬT, đạt; hai tuần dữ liệu HNX

**Đức chốt chạy live lúc 00:40 (08/09)** và tự tay nối Bridge. Phạm vi Đức đổi: 5 ngày →
**hai tuần** = 10 ngày làm việc (2026-08-25 → 2026-09-07).

| Lượt | lấy mới | đã có | không có dữ liệu | hỏng |
|---|---|---|---|---|
| 1 | 7 | 0 | 3 | 0 |
| 2 | **0** | **7** | 3 | 0 |

Lượt 2 là phép thử thật: `0 lấy mới · 7 đã có` chứng minh **file đã ghi CHÍNH LÀ trạng
thái** — không có sổ ghi riêng, và chạy lại không lấy lại.

**Dữ liệu thật, không phải trang lỗi.** Soi `2026-08-25-HDTLCSCP.json`: 192 ô dữ liệu, ISIN
`VN41I2G90000`, chỉ số cơ sở `VN100`, hợp đồng tương lai đáo hạn `2609`, đủ giá và khối lượng.

**Ba ngày trống (31/08 · 01/09 · 02/09) là trống THẬT** — đo thẳng bằng một lượt gọi riêng:
HTTP 200, JSON hợp lệ, **8791 byte, 0 ô dữ liệu**, đúng hình dạng đã đo trước cho ngày không có
phiên. Ngày có giao dịch đo cùng lúc: 46194 byte, 192 ô. Không phải đọc hụt.

**Chốt an toàn giữ được trên máy thật.** Thử lấy trộm chính tệp ghép cặp bằng HAI đường (tương
đối + tuyệt đối) → cả hai `PATH_OUTSIDE_ROOT`. `file.delete` cố ý không tồn tại.
`system.capabilities` khai 15 method: 10 chỉ đọc, 5 có ghi.

**Trong cả lượt chạy không sửa một dòng mã nào** — chỉ chạy và đọc.

Chạy lại: `node chay.mjs --pairing <tệp> --tu 2026-08-25 --den 2026-09-07` trong
`pilots/hnx-phai-sinh/`.

## 2026-09-08 · `claude-scouter-s06` — kho PDF phái sinh HNX ĐẦY ĐỦ 216/216

**Đức nêu mục đích thật:** thư mục Google Drive *Phái Sinh daily Fetch* là database ông ấy
duy trì BẰNG TAY từ 07/2026 để phân tích phái sinh. Nên bộ tải bám convention đã có, không
đặt tên kiểu mới.

**Kết quả cuối, đo trên chính thư mục đó:**

| | Trước | Sau |
|---|---|---|
| Tổng PDF | 176 | **216** |
| Ngày có dữ liệu | 37 | **46** (01/07 → 07/09) |
| Ngày thiếu báo cáo | 0 | **0** |
| Báo cáo tháng | 202601–07 | **202601–08** |

Kiểm từng tệp: **216/216 là PDF đầy đủ** (đầu `%PDF-`, đuôi `%%EOF`), **0 tệp `.dang-tai` sót**.
Chạy lần ba báo *"Tổng HNX có 124 · đã có 124 · CÒN THIẾU 0"*.

**Hai lượt, vì cái phanh chặn giữa chừng — và nó chặn ĐÚNG.** Lượt 1 lấy 11 tệp rồi dừng ở
`WRITE_CAP_REACHED` (50/50 một lần mở khoá). Đáng ghi: nó dừng **sạch** — không tệp dở,
không tệp mang tên thật mà thiếu nửa sau. Nếu nó chặn kiểu khác thì 29 tệp kia sẽ mang tên
thật mà rỗng ruột, và **mọi lượt sau bỏ qua chúng vĩnh viễn** vì tệp trên đĩa chính là trạng
thái. Đức tắt–bật công tắc (đặt lại bộ đếm về 0), lượt 2 lấy nốt 29/29, 0 hỏng.

**Ranh giới seed/pilot GIỮ ĐƯỢC, và có máy canh.** Đức hỏi thẳng có nên tách chưa. Đo:
seed 9.966 dòng · pilot 1.334 dòng; mọi thứ riêng HNX nằm trong `pilots/`, mọi thứ chung
(`as: base64` · trần `dom.snapshot` · chốt kích thước phản hồi) nằm trong seed và **không
dòng nào nhắc tên trang**. Thử phá: thêm một hằng số `"https://hnx.vn/"` vào lõi seed →
`seed-purity-smoke` **ĐỎ ngay**. Hàng rào thật, không phải lời hứa.

**Rủi ro còn lại, và phép kiểm trên KHÔNG bắt được nó:** seed mới chỉ thử trên **một trang**
(`TRIALS.md` liệt kê đúng `hnx.vn`). Một hàm sạch tên trang vẫn có thể chỉ đúng cho một
hình dạng trang. Nên *"năng lực chung"* hiện là **lời khai**, chưa phải điều đã đo.

## 2026-09-08 · `claude-scouter-s06` — bỏ `scout.snapshot`, thêm `scout.navigate`

Đức chốt hai việc trong một lượt nạp lại.

**Bỏ `scout.snapshot`.** Nạp lại bản có trần rồi nó VẪN giết service worker trên 2/3 trang thử:
trang rất lớn thì worker chết ngay lúc Chrome trả dữ liệu, tức trước khi dòng nào của ta kịp
chạy. Gỡ sạch cả chuỗi, kể cả cửa CDP `DOMSnapshot.captureSnapshot` nay không ai gọi.

**Thêm `scout.navigate`.** Mở `Page.navigate` ở đường GHI. **Không cần thêm quyền Chrome nào** —
đây là đổi luật an toàn của chính ta. Đường ĐỌC vẫn không có nó. Lý do đầy đủ: chú thích tại
chỗ trong `scouter-actions-core.mjs`.

### Thử THẬT trên hnx.vn

| Phép thử | Kết quả |
|---|---|
| `javascript:` · `file:` · chuỗi không phải url | cả ba bị chặn, **0 lệnh CDP** được gửi |
| thống-kê → kết-quả-giao-dịch | tới nơi **289 ms** |
| `scout.page` ngay sau | *"Kết quả giao dịch"* — đúng trang |
| **hnx.vn → example.com (KHÁC site)** | **261 ms**, id cũ **vẫn đọc được** |

### Một câu hỏi kiến trúc được trả lời miễn phí

Tôi định đo riêng: *`target_id` có sống sót qua lần đổi trang không?* — vỡ thì thiết kế **trọn
gói** sụp và phải dựng máy trạng thái. Lượt thử thật trả lời luôn: **sống sót**, kể cả khác
eTLD+1. Nên *đi* và *làm tiếp* ở lại là hai lượt gọi riêng.

> **Một phép đo của tôi đã sai, tự bắt được.** Lượt đầu thử `hnx.vn → owa.hnx.vn` rồi định kết
> luận "khác tên miền vẫn giữ id". Sai: hai cái đó **cùng một site** theo cách Chrome chia tiến
> trình, nên nó chưa hề chạm điều nó định chứng minh. Phải đi `example.com` mới là phép thử thật.

**Đo.** Method 15 → 14 → **15**. Suite **18/18**. S-14 đã đóng.

## 2026-09-08 · `claude-scouter-s06` — MỘT tệp CSV SSOT, 368 hàng, 46 ngày

Đức chốt: giữ **một tệp duy nhất**, định dạng để **GPT và CC cùng thao tác được**.

**Chọn CSV, không phải .xlsx.** Điều kiện là hai công cụ cùng thao tác được, không phải đuôi
tệp. XLSX là ZIP chứa XML, repo không có dependency nào — mỗi lượt ghi phải tự cuộn ZIP bằng
tay, và mỗi lượt là một cơ hội làm hỏng dữ liệu thật. Lý do đầy đủ ở đầu `master.mjs`.

| | |
|---|---|
| Tệp | `Phái Sinh daily Fetch/HNX_PS_Ket_qua_giao_dich_SSOT.csv` |
| Hàng | **368** · 46 ngày · 01/07 → 07/09 · VN100=184 VN30=184 |
| Kiểm | 0 dòng lệch cột · 0 ngày lặp · 8 hàng/ngày đều nhau |

Ba ngày 31/08 · 01/09 · 02/09 báo *không có phiên* — **khớp với kết quả bên PDF cùng ngày**.
Hai đường đo độc lập cùng nói HNX không công bố gì.

**Lược đồ 25 cột ĐỌC RA từ tệp Đức đang dùng, và đã đối chiếu THẬT:** lấy lại 12/08 từ HNX rồi
so từng ô với hàng `VN41I1G80003` của Đức — **25/25 khớp**. Nên lấy lại từ nguồn là an toàn,
và SSOT có một nguồn gốc đồng nhất.

> **Chỗ nguy hiểm nhất: số kiểu Việt.** `1.952,8` — chấm là phân cách nghìn, phẩy là thập
> phân, **ngược hẳn** kiểu Anh. Đọc nhầm là sai **gấp 1000 lần** mà con số vẫn trông hợp lý.
> Ô rỗng ở lại rỗng, **không thành 0**.

**Một lỗi suýt giao hàng:** cột đầu bảng HNX không có chữ, nó chứa `<img src="up.png">` —
dấu tăng/giảm. Bản đầu gỡ thẻ nên **cả một cột biến mất trong im lặng**, và tôi còn đặt tên nó
là *"STT"*. Đo lại 7 ngày: 33 + 23 = 56 = 7 × 8 hàng. Mỗi hàng đều có.

**Xoá.** Đức giao dọn tệp CSV gây confuse. Chỉ xoá **một** tệp: `AUG2026_MASTER.csv.xlsx`, sau
khi kiểm 12/08 và 17/08 đều đủ 8 hàng trong SSOT. **Không** xoá các tệp `.gsheet`/`.gdoc`:
chúng chỉ 173 byte, là **con trỏ tới tài liệu Google Drive** chứ không phải tệp CSV.

**Đo.** Suite **20/20**.

## 2026-09-08 · `claude-scouter-s06` — roadmap sau một ngày chạy thật

Đức sắp compact, nên roadmap phải nằm trong **tệp** chứ không trong hội thoại.
`ROADMAP.md` nay có phần **08/09** thay phần *"Đang ở đâu"* cũ ở chỗ hai bên nói khác nhau —
phần cũ viết lúc mọi thứ còn chạy trên trang giả.

**Thứ tự đi tiếp, xếp theo giá trị chia công sức:**

1. **Trang thử THỨ HAI cho seed.** Seed mới thử trên đúng một trang. Phép kiểm thuần khiết
   canh được *seed không nhắc tên trang*, nhưng **không** canh được *seed có dùng chung được
   không* — một hàm sạch tên trang vẫn có thể chỉ đúng cho một **hình dạng** trang. Nên
   *"năng lực chung"* hiện là **lời khai chưa được đo**. Chọn trang **render bằng JS**, khác
   kiểu hnx.vn (tĩnh, jQuery).
2. **Đóng gói v1** — chỉ sau ①. Đóng gói một seed mới thử một trang là đóng gói một lời hứa.
3. **Ba mục nợ nhỏ** gộp một lượt: `S-11` · `S-12` · `S-13`.
4. **KHÔNG làm:** tự chạy hằng ngày (luật gốc cấm automation tự chạy khi chưa hỏi) · mở thêm
   quyền CDP (`Page.navigate` vừa mở hôm nay; mở tiếp mà chưa có việc thật đòi là nới bề
   mặt tấn công cho một nhu cầu tưởng tượng).

**Ba câu chỉ Đức trả lời được** đã ghi vào `ROADMAP.md` — sau compact đó là chỗ duy nhất còn
nhớ chúng: trang thử thứ hai là trang nào · `S-11` chấp nhận rủi ro hay mở băng · `S-12`
chịu gọi lại hay đánh dấu ngày lễ.

Kèm: sửa dòng *"công tắc popup"* thành *"công tắc bảng bên"* (`S-14` đóng hôm nay).

## 2026-09-08 · `claude-scouter-s06` — trần ghi 50 → 200, và ba mỏ neo đột biến đã chết

Đức chốt nâng trần một lần mở khoá lên **200**. Ghi ở [ADR-0005](docs/adr/0005-tran-ghi-nang-tu-50-len-200.md).

**Vì sao đây không phải nới lỏng.** Trần 50 hôm qua dừng một việc **đúng** — lượt tải 216 PDF —
rồi Đức bật lại và việc đó chạy tiếp y nguyên. Không lượt ghi nào bị loại, chúng chỉ bị hoãn.
Một cổng luôn được mở lại là cổng **dạy người bấm cho qua**. Bốn lớp còn lại không đụng tới:
mặc định TẮT · gõ cứng trong mã · đếm theo mỗi lần mở khoá · chỉ tay Đức mở lại được.

**Ba mỏ neo đột biến đã CHẾT từ hôm qua, phát hiện trong lượt này** — đây mới là phần đáng đọc:

| Mã | Chốt nó canh | Vì sao lệch |
|---|---|---|
| `D9` | máy chủ đối chiếu được phản hồi với yêu cầu | lượt vá vận chuyển đổi `envelope: response` thành `envelope: guiDuoc(response)` |
| `H2` | không ai lén nới danh sách CDP đường ghi | danh sách dài thêm `Page.navigate` + `Target.getTargetInfo` |
| `F6` | thân quá trần thì BÁO ĐỎ, không cắt bớt | biến đổi tên `bytes` → `trenDay` |

Cả ba là **hệ quả phụ của chính việc hôm qua**: sửa mã nguồn xong, mỏ neo trỏ vào chuỗi cũ nên
nó khớp 0 lần. Bộ đo báo **ĐỎ** chứ không báo BỎ QUA — nếu nó báo BỎ QUA thì ba chốt an toàn đã
nằm không ai canh mà bảng vẫn xanh. Giữ nguyên tính chất đó khi sửa bộ đo.

**Đo.** `93/93` mỏ neo khớp · `93` giết được · `0` sống sót. `P5 P6 P7` (gỡ trần · nới thành
vô hạn · để kho lưu tự đặt trần) đều chết ở trần 200 y như ở trần 50. Suite gói: **19 khối ĐẠT**.

**Ngoài tầm tay tôi, ghi lại để lane `_code` biết:** `tests/build-dashboard-smoke.mjs` mục 23
(Gate 7) đang ĐỎ trên cây làm việc. `session-check.mjs` nay `import` `backlog-check.mjs`, nhưng
danh sách tệp chép sang repo tạm của phép ghim đó chưa có tên nó → repo tạm chết lúc nạp module.
Không phải việc của lượt này và `_code` không phải vùng tôi giữ; cả hai tệp đang có sửa chưa commit.

## 2026-09-08 · `claude-scouter-s06` — HNX rời nhà; Scouter ở lại làm bộ dò trang

Đức chốt tách HNX thành extension riêng ([ADR-0021](../../../docs/adr/0021-hnx-fetch-tach-thanh-extension-rieng.md)):
*"sau này ta sẽ dùng scouter đi scout trang khác."* Gói này đổi ba chỗ.

**⑴ Pilot `hnx-phai-sinh` đã chuyển sang `workers/hnx-fetch/du-lieu/`.** Thư mục cũ **giữ
nguyên, chưa xoá** — xoá tệp là việc phải hỏi Đức — nhưng đã dán bảng *ĐÃ CHUYỂN NHÀ* ở đầu
`AGENTS.md` của nó. Đừng sửa gì trong đó nữa; bản đang sống nằm ở gói mới.

**⑵ STATUS sửa trần 50 → 200** cho khớp [ADR-0005](docs/adr/0005-tran-ghi-nang-tu-50-len-200.md).

**⑶ Một lỗi CŨ lộ ra và đã vá.** STATUS khai `ref_readme: README.md` và `ref_handoff: HANDOFF.md`.
Phép kiểm B5 giải hai đường đó **từ gốc repo**, mà gốc repo *có* hai tệp cùng tên — nên nó
XANH suốt, trong khi người bấm từ bảng trạng thái rơi vào README của **CẢ REPO** chứ không
phải của Scouter. Xanh mà trỏ nhầm chỗ. Nay khai đường đầy đủ.

> Đáng ghi vì đây là dạng lỗi khó thấy nhất trong repo này: **phép kiểm đúng luật của nó, và
> vẫn để lọt.** B5 hỏi *"tệp có tồn tại không"* — nó không hỏi *"có đúng tệp bạn định trỏ"*.
> Mọi gói tương lai khai đường tương đối đều dính đúng bẫy này.

**Việc kế của Scouter không đổi:** mục ① của `ROADMAP.md` — trang thử THỨ HAI, nên chọn trang
render bằng JS. Nay lý do còn mạnh hơn: Scouter mất pilot duy nhất của nó, nên câu *"năng lực
chung"* hiện **không còn một trang thật nào** đứng sau.

**Đo.** Suite gói **20/20**. Suite gốc repo 369 → **375** (gói mới nối vào cổng).

## 2026-09-08 · `claude-scouter-s06` — sổ tay khai thiếu 4 lệnh, và nay có phép ghim canh

Rà lại `README.md` của gói: nó viết *"Mười một method"* và liệt kê 11, trong khi mã thật có
**15**. Bốn cái thiếu: `scout.a11y` · `scout.shot` · `scout.fetch` · `scout.navigate`.

**Hai cái sau chính là hai lệnh mà cả pilot HNX sống bằng nó.** Một AI đọc sổ tay đó sẽ không
biết `scout.fetch` tồn tại — mà sổ tay này là thứ ta đưa cho AI khác đọc.

**Sổ tay không trôi vì ai lười. Nó trôi vì không gì canh nó:** thêm một method thì cổng kiểm
xanh, suite xanh, chỉ có một bảng trong tài liệu là lặng lẽ sai đi. Nên bản vá không dừng ở
việc sửa bảng — thêm `tests/so-tay-khop-tu-vung-smoke.mjs`: nó so **tập tên lệnh** trong bảng
README với `METHOD_NAMES`, và so cả **con số viết bằng chữ** ở câu dẫn.

> Nó cố ý **không** kiểm câu chữ mô tả — chữ là việc của người. Chỉ kiểm thứ có đúng một câu
> trả lời đúng. Và nếu bộ đọc bảng markdown khớp **0** lệnh thì phép ghim ĐỎ, không lặng lẽ
> đạt: *0 lệnh khớp 0 lệnh thiếu* là một lượt tự tắt trông y hệt một lượt chạy tốt.

Thử ngay hai con đột biến bằng tay: đổi số ở câu dẫn → đỏ; xoá một dòng lệnh khỏi bảng → đỏ.

**Cùng lượt này, gói `hnx-fetch` đi qua hai vòng audit độc lập** (Codex, mã và nội dung) và
vá 6 lỗi mã + 11 chỗ tài liệu. Hai lỗi nặng nhất nằm ở khối phanh — **khối đó chép từ đây**,
nên Scouter **có cùng hai lỗi**: bản ghi ngân sách trải từ bản ghi cũ (phanh khẩn bị hồi sinh)
và đọc-ghi không xếp hàng (trần vượt khi chồng lượt). Đã ghi vào `BACKLOG.md` mục `S-15`.

**Đo.** Suite gói **21/21** (trước 20).

## 2026-09-08 · `claude-scouter-s06` — khai danh tính gói vào bảng trạng thái

Ba trường **tuỳ chọn** vào `STATUS.md`: `lam_duoc` · `khong_lam_duoc` · `dung_the_nao`, cộng
`ref_runbook` trỏ `AGENTS.md` của gói. Bảng nay nói được Scouter **là bộ dò trang đa năng, không
gắn với trang nào** — và nói cả chỗ nó KHÔNG làm: không tự chạy, mọi lệnh bấm/gõ đóng mặc định,
không ghi tệp, và không biết trang nào cả.

Câu cuối là ranh giới seed/adapter viết lại cho Đức đọc: hiểu biết về một trang cụ thể phải nằm
ở tầng adapter bên ngoài, không nằm trong seed.

Chi tiết bộ máy ở `HANDOFF.md` gốc repo cùng ngày.
