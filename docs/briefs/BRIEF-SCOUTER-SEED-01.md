---
kind: brief
status: active
ttl_days: 90
---

# BRIEF `SCOUTER-SEED-01` — Lượt xây đầu tiên: đo trước, rồi dựng khung

Đọc trước, theo thứ tự: [ADR-0009](../adr/0009-scouter-thay-observer-cua-tuong-tac.md) (Scouter
là gì) → [ADR-0010](../adr/0010-scouter-dung-o-seed-v01.md) (phạm vi đã chốt: 25 mục, dừng ở
đó) → [bảng kiểm kê](../studies/SCOUTER-CAPABILITY-INVENTORY-V1.md) (danh sách 25 mục và chúng
nằm ở đâu).

**Phạm vi đã chốt. Executor không mở rộng.** Thấy một mục `SEED v1` hay ho thì ghi vào
`BACKLOG.md` gốc, đừng làm.

## 1. Việc ① — PHÉP ĐO, và nó đi trước mọi thứ

Năng lực xếp hạng **số một** của bảng kiểm kê là *bấm và gõ như tay người*. Nó nằm trong
`SEED v0.1`. Và **chưa ai đo tận mắt** — bảng kiểm kê tự đánh dấu chỗ này là cần chứng minh.

Câu hỏi cần trả lời, đúng một câu: **cú bấm đi qua đường điều khiển của trình duyệt có được
trang nhìn thấy như cú bấm của người thật không?**

Đọc `docs/studies/EXP-14-INPUT-SEMANTICS-BROWSER-INPUT-REACH-STUDY-V0.md` trước — nghiên cứu
28/08 đã đặt câu hỏi này và **để ngỏ ở mức "cần chứng minh nhỏ"**. Đừng làm lại phần nó đã làm.

**Đo trên một trang thử tự tạo tại chỗ, KHÔNG đụng trang thật.** Trang thử chỉ cần ghi lại xem
trang nhìn cú bấm đó ra sao. Không tốn credit, không cần Đức duyệt, không rơi vào mục 2 của
`AGENTS.md`.

**Kết quả đi cả hai chiều đều là kết quả tốt:**

- Đạt → món đắt nhất trong danh sách là thật, xây tiếp theo đúng thứ tự bảng kiểm kê.
- Không đạt → **DỪNG, báo lại ngay, đừng xây tiếp.** Thứ tự 24 mục còn lại phải xếp lại, và đó
  là việc của lượt sau, không phải của bạn.

Ghi kết quả thành một mục ngắn trong bảng kiểm kê (mục 4.1), kèm cách đo để người sau chạy lại
được.

## 2. Việc ② — khung seed, ba khả năng bắt buộc

`ADR-0009` mục ⑸ định nghĩa seed là bộ nhỏ nhất biết **ba việc**:

1. **quan sát** — đã có, bốn phép dò trong `scripts/observer-probes.mjs`;
2. **báo cáo qua Bridge** — **chưa có, đây là lỗ lớn nhất**;
3. **tự nạp lại mình** — chưa có, gần như miễn phí.

Quyền đã được Đức duyệt ở `ADR-0009`: `<all_urls>` · `debugger` · `scripting` · `tabs` ·
`storage` · nối `127.0.0.1`. **Đây là lần duy nhất trong repo một extension được mở tới mức
này — đừng xin thêm gì ngoài danh sách đó.**

Cửa Bridge: **đọc `workers/duc-auto-gemini/v0.2.0/bridge-*.js` trước, đừng phát minh lại.** Bảng
kiểm kê đã đo: 6 file **giống hệt nhau từng byte** ở cả ba worker — đó là bằng chứng đọc được
rằng chúng không dính nhà cung cấp, nên bóc sang dùng lại được.

## 3. Ranh giới seed / adapter — chốt ở ADR-0009, đừng quyết lại

**Năng lực** vào seed. **Hiểu biết về một trang cụ thể** (selector · thứ tự thao tác · dấu hiệu
"xong") vào adapter. Thấy mình đang gõ một selector vào seed thì dừng lại — đó là chỗ ranh giới
này chết.

## 4. Cấm

- **Cấm ghi nội dung trang xuống đĩa.** Chính sách che dữ liệu treo từ `ADR-0007`, Đức chưa chốt.
  Phần này của `SEED v0.1` không cần nó.
- **Cấm chạy trên trang thật** (`AGENTS.md` mục 2). Trang thử tự tạo thì được.
- Cấm xin quyền ngoài danh sách ở mục 2.
- Cấm làm bất cứ mục `SEED v1` nào.
- Cấm chuyển thư mục Scouter trong lượt này — chỗ đặt chưa quyết, và chuyển chỗ giữa lúc đang
  xây làm mọi diff sau đó không đọc được.

## 5. Nghiệm thu

1. Phép đo ở mục 1 có kết quả, ghi được, chạy lại được.
2. Seed làm được ba việc ở mục 2, mỗi việc có phép ghim riêng.
3. **Đột biến kiểm:** thêm một đường ghi nào đó (gửi phím ngoài từ vựng, sửa DOM, đổi storage)
   → phép ghim phải ĐỎ. Con nào không đỏ thì phép ghim đó chưa ghim gì cả.
4. Suite gốc repo XANH, cổng đóng phiên XANH TOÀN BỘ.
5. **Đếm số chỗ mỏ neo của bạn khớp. Ra 0 thì DỪNG** — công cụ đo hỏng, không phải "không có gì
   phải sửa". Ngày 06/09 chuyện này xảy ra với **ba lane khác nhau** trong repo này.

## 6. Khoá và đóng phiên

Mã Scouter nằm ở **gốc repo** → khoá `_root`. Chạm `tests/` hay `scripts/` thì thêm `_code`.

```
node scripts/claim.mjs --take _root --as <tên-phiên> --task "SCOUTER-SEED-01"
```

Commit có dòng cuối `Lane: <tên-phiên>` · dùng `git commit -o <đường-dẫn>` · cổng XANH TOÀN BỘ ·
sinh lại artifact rồi commit trước khi đẩy · đẩy bằng `safe-push.mjs` · **trả khoá SAU khi đẩy**.
Đẩy bị chặn bởi commit lane khác thì **đừng `--carry`** — giữ khoá và báo lại.
