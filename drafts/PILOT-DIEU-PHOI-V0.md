---
kind: brief-pilot
topic: cc-chi-dieu-phoi
status: V0 — gọn lại 2026-09-10, chưa ai chốt, chưa chạy
author: claude-gpt-chay-het-job
theo: drafts/GPT-REASONING-8-ROUND-PROTOCOL-V1.md
authority: none
---

# Pilot — CC chỉ điều phối, tối giản usage

## 1. Câu hỏi, đúng một câu

**Một việc thật cần bao nhiêu LƯỢT GỌI MODEL khi CC chỉ điều phối và không đọc nội dung?**

Không hỏi *"có rẻ hơn không"* — câu đó không đo được.

## 2. Vì sao đo lượt, không đo chữ

Đo trên phiên 10/09 (`node scripts/do-usage-phien.mjs`): **2.688 lượt gọi**, mỗi lượt đọc
**~370.000 token**, tổng ra chỉ bằng **0,24%** tổng đọc. Kết quả **mọi** công cụ trong phiên
cộng lại bằng **0,06%** lượng đọc.

**Giá ≈ số lượt × bối cảnh.** Viết lệnh ngắn hơn không cứu được gì.
→ **Một việc = một lệnh = một lượt**, không phải một cuộc trò chuyện.

## 3. Ba vai, ranh giới cứng

```
GPT / người  →  GÓI VIỆC   (việc gì · chạy lệnh nào · đạt là gì)
   script    →  CÀY        (chạy tới cùng · ghi ra file · không hỏi ai)
     CC      →  ĐIỀU PHỐI  (chạy lệnh · đọc PHÁN QUYẾT ≤ 10 dòng · chốt)
```

**CC trong pilot này KHÔNG được:** đọc nội dung sản phẩm · đọc file để "hiểu bối cảnh" · giải
thích dài · **sửa gói việc giữa chừng** (gói sai thì DỪNG và BÁO — vá là quay lại reasoning).

**Script phải tự đóng vòng của nó:** chạy tới cùng, tự thử lại, kết bằng đúng một dòng `DAT`
hoặc `KHONG DAT: <lý do>`. Script nào cần CC nhìn giữa chừng là script chưa xong.

## 4. Việc chọn để chạy

**Nghiệm thu lại toàn bộ artifact máy sinh** — chạy lại từng bộ sinh rồi diff từng cái
(`scripts/nghiem-thu-artifact.mjs`, đã có).

Hợp vì: thân việc hoàn toàn máy làm được · phán quyết **nhị phân**, không có vùng xám để CC
phải đọc · có giá trị thật (luật "artifact phải sinh lại được y hệt" chưa ai chạy trọn một
lượt) · **không đụng tab chatgpt**, nên chạy được ngay.

## 5. Đạt là gì — chốt TRƯỚC khi chạy

| | ngưỡng |
|---|---|
| **ĐẠT** | ≤ 8 lượt gọi model cho trọn việc, **và** phán quyết cuối đúng khi kiểm tay |
| **vùng giữa** | 9–15 lượt: chạy được nhưng gói việc chưa đủ kín — ghi rõ lượt nào thừa |
| **KHÔNG ĐẠT** | > 15 lượt, **hoặc** CC phải đọc nội dung sản phẩm mới quyết được |

**Phán quyết sai mà số lượt đẹp thì vẫn là KHÔNG ĐẠT.** Rẻ mà sai thì không phải rẻ.

**Mốc so sánh, lấy từ dữ liệu đã có:** vá `B-63` trong phiên 10/09 — một việc nhỏ, có test, có
đột biến, có commit — tốn **khoảng 20 lượt**. Một việc điều phối thuần lẽ ra phải ở **một chữ số**.

## 6. Cách chạy

1. Ghi mốc giờ ISO.
2. Mở **một phiên CC mới** (Haiku hoặc Sonnet), **không nạp bối cảnh gì ngoài** `drafts/pilot-dieu-phoi/GOI-VIEC.md`.
3. Xong thì `node scripts/do-usage-phien.mjs --tu <mốc-giờ-ISO>`.
4. Ghi `soLuot` · `docMoiLuot` · `tongDoc` vào `drafts/pilot-dieu-phoi/KET-QUA.md`.

**Chỉ `soLuot` là thứ pilot này điều khiển được** — hai cột kia phụ thuộc bối cảnh và mô hình.
Đừng chép con số vào file này; nó decay.

## 7. Pilot này KHÔNG trả lời được

- **Không so được mô hình.** Muốn biết Haiku rẻ hơn Opus bao nhiêu thì phải chạy **cùng một gói
  việc** trên cả hai — mô hình nhỏ hay chia nhỏ bước hơn, nên số lượt có thể ngược chiều giá.
- **Không nói được việc CÓ SUY LUẬN thì thế nào.** Việc ở mục 4 cố tình không có suy luận: đo
  trần dưới trước, rồi mới biết suy luận cộng thêm bao nhiêu.
- **Không đo tiền.** Đo token; đơn giá thay đổi.
