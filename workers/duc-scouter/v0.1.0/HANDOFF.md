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
