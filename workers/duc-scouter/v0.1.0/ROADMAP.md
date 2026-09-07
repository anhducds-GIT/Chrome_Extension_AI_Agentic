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

## Đang ở đâu — 7 dòng trên 25 đã xong

| Mục | Xong bằng gì | Đã chứng minh tới đâu |
|---|---|---|
| Bắt tay Bridge | `scouter-transport-loopback.mjs` | Máy chủ Bridge **thật**, bắt tay hai chiều |
| Cửa Bridge — bảng method + kiểm tham số | `scouter-bridge-core.mjs` | 11 method, từ vựng đóng |
| Vận chuyển qua WebSocket `127.0.0.1` | `scouter-transport-loopback.mjs` | (bảng kiểm kê đếm dòng này **hai lần**) |
| Định tuyến lệnh Bridge | `createDispatcher` | Live check ĐẠT 8/8 |
| Bấm và gõ như tay người (`Input`) | `scouter-actions-core.mjs` | **Trang thật, ĐẠT 11/11** (phép đo ②, 07/09) |
| Chế độ phát triển + trần chạy thử | công tắc popup + trần 50 | 12 con đột biến, live check |
| *(quan sát — 4 phép dò)* | `observer-probes.mjs` | Trang **giả** |

**Còn 18 dòng.** Nhưng 18 dòng đó không cùng loại, và đây là chỗ dễ lạc nhất:

| Nhóm | Mấy mục | Là gì | Thái độ |
|---|---:|---|---|
| **A — nhìn rõ hơn** | 4 | Đọc trang theo *vai trò + tên* · biết trang tải xong lúc nào · chụp màn hình · chụp cả cây DOM một lượt | **Làm.** Đây là thứ quyết định AI ở đầu dây có hiểu trang không |
| **B — máy móc của một vòng chạy có hàng đợi** | 7 | Danh tính lượt thử · trạng thái vòng chạy · không làm hai lần · luật thử lại · nhịp tim · khoảng nghỉ giữa job · sẵn sàng nhận việc | **Hoãn, và hỏi Đức.** Xem dưới |
| **C — an toàn và vận hành** | 4 | Chuỗi bằng chứng · bảng mã lỗi cho người vận hành · khoá tab và hội thoại · quyết định thao tác fail-closed | Làm sau nhóm A |
| **D — năng lực Chrome còn lại** | 3 | `scripting` · `offscreen` · `commands` | Làm khi có việc cần tới, không làm trước |

### Câu cần Đức chốt, và tôi khuyến nghị sẵn

**Nhóm B (7 mục) là máy móc của một cỗ chạy JOB HÀNG LOẠT — mà Scouter không có hàng đợi job
nào.** Bảy dòng đó vào danh sách vì kiểm kê ngày 06/09 đo *ba worker đang có gì*, và ba worker
đó chạy workbook XLSX. Scouter thì khác việc: nó dò một trang rồi báo cáo.

**Khuyến nghị: hoãn cả 7, đừng xoá.** Xây trước một cỗ máy chạy job cho thứ chưa có job nào là
đúng loại phình mà ADR-0010 sinh ra để chặn. Khi nào Scouter thật sự có hàng đợi thì mở lại;
nếu tới cuối `SEED v0.1` vẫn không có, thì đóng 7 dòng đó bằng một dòng ghi lý do.

Chốt câu này rồi thì phạm vi còn lại là **11 mục**, không phải 18.

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

### Bước 3 — nhóm A, đúng hai mục trước

1. **Biết trang tải xong lúc nào** (`webNavigation`). Không có nó thì mọi phép dò là **đoán về
   thời điểm**: dò sớm một nhịp là đọc phải trang chưa dựng xong, và triệu chứng nhìn ra ngoài
   giống hệt "selector sai".
2. **Đọc trang theo vai trò + tên** (`Accessibility`). Hôm nay `scout.page` trả về phần tử theo
   DOM; cái AI thật sự cần để chọn đích là *"nút tên Gửi"*, không phải `div > div > button:nth-child(3)`.

Hai mục còn lại của nhóm A (chụp màn hình · chụp cây DOM một lượt) làm sau, và **chụp màn hình
vướng một câu Đức chưa chốt** — xem dưới.

### Bước 4 — dừng lại, đếm lại, rồi mới đi tiếp

Sau bước 3, đo lại còn bao nhiêu mục và mục nào còn đáng làm. Không lên kế hoạch xa hơn ở đây:
[bốn con số viết sẵn trong kế hoạch của repo này đều đã sai](../../../docs/protocols/MULTIFLOW.md).

## Cái đang chặn, và ai gỡ được

| Chặn gì | Ai gỡ | Ghi ở đâu |
|---|---|---|
| **Chính sách che dữ liệu** — Scouter chưa được ghi nội dung trang xuống đĩa. Chặn *chụp màn hình* ở nhóm A. **Không** chặn bước 1–3, vì báo cáo đi qua Bridge chứ không qua đĩa | **Đức** | [ADR-0007](../../../docs/adr/0007-observer-la-cua-bang-chung-cho-ai.md), treo từ 06/09 |
| **Nhóm B — 7 mục làm hay hoãn** | **Đức** | Khuyến nghị ở trên |
| Chạy trên trang thật (không phải trang tự dựng) | **Đức** | `AGENTS.md` gốc mục 2 |

## Cái file này KHÔNG làm

Không chép lại danh sách 25 mục — bảng kiểm kê là bản gốc, và hai bản của một danh sách thì sớm
muộn trả hai câu khác nhau. Không đặt hạn. Không ghi phần trăm hoàn thành: 7/25 dòng nghe như
28% xong, trong khi 7 dòng đã xong là 7 dòng **dễ nhất** và một dòng của nhóm A nặng hơn cả bảy.
