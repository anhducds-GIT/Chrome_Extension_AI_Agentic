---
kind: brief-pilot
topic: cc-chi-dieu-phoi
status: V0 — CC soạn 2026-09-10, chưa ai chốt, chưa chạy
author: claude-gpt-chay-het-job
theo: drafts/GPT-REASONING-8-ROUND-PROTOCOL-V1.md
authority: none
---

# Pilot — CC chỉ điều phối, tối giản usage

## 1. Câu hỏi, đúng một câu

**Một việc thật cần bao nhiêu LƯỢT GỌI MODEL khi CC chỉ điều phối và không đọc nội dung?**

Không hỏi *"có rẻ hơn không"* — câu đó không đo được. Hỏi số lượt.

## 2. Vì sao đo lượt chứ không đo chữ

Đo trên chính phiên 10/09 bằng `node scripts/do-usage-phien.mjs`:

| | |
|---|---|
| lượt gọi model | 2.688 |
| token đọc mỗi lượt | **~370.000** |
| tổng token đọc | 995.886.118 |
| tổng token ra | 2.438.456 (0,24% của lượng đọc) |

**Giá ≈ số lượt × bối cảnh.** Bối cảnh thì tự phình: cùng phiên này, cắt từ 04:00Z ra 440 lượt
với ~258.000/lượt, còn tính cả phiên là ~370.000/lượt. Viết lệnh ngắn hơn không cứu được gì —
kết quả **mọi** công cụ trong phiên cộng lại chỉ bằng **0,06%** lượng đọc.

Hệ quả cho thiết kế: **một việc = một lệnh = một lượt**, không phải một cuộc trò chuyện.

## 3. Ba vai, ranh giới cứng

```
GPT / người  →  GÓI VIỆC        (chuẩn bị: việc gì, chạy lệnh nào, đạt là gì)
   script    →  CÀY             (chạy tới cùng, ghi ra file, không hỏi ai)
     CC      →  ĐIỀU PHỐI       (chạy lệnh · đọc PHÁN QUYẾT ≤ 10 dòng · chốt)
```

**CC trong pilot này KHÔNG được:**
- đọc nội dung sản phẩm — chỉ đọc phán quyết mà script in ra;
- đọc file để "hiểu bối cảnh";
- giải thích dài. Mỗi lượt: một lệnh, hoặc một câu chốt;
- sửa gói việc giữa chừng. Gói sai thì **dừng và báo**, không tự vá — vá là quay lại reasoning.

Script phải **tự đóng vòng của nó**: chạy tới cùng, tự thử lại, và kết bằng đúng một dòng
`DAT` hoặc `KHONG DAT: <lý do>`. Script nào cần CC nhìn giữa chừng là script chưa xong.

## 4. Việc chọn để chạy pilot

**Đề xuất: nghiệm thu lại toàn bộ artifact máy sinh.** Chạy lại từng bộ sinh (bảng điều khiển ·
feature-parity · overview · `PHIEN.md` · `rule-compile`), rồi `git diff --exit-code` từng cái.

Vì sao việc này hợp:
- **thân việc hoàn toàn máy làm được** — không có chỗ nào cần suy luận;
- **phán quyết nhị phân** — diff rỗng hay không, không có vùng xám để CC phải đọc;
- **có giá trị thật** — repo đã có luật "artifact phải sinh lại được y hệt", chưa ai chạy toàn bộ một lượt;
- **không đụng tab chatgpt**, nên chạy được ngay, không chờ Đức rời máy.

*Phương án hai nếu Đức muốn có GPT trong vòng lặp:* kiểm toán 154 ADR xem cái nào mâu thuẫn với
luật đang hiệu lực — `HOP-DONG.md` đã xếp việc này ra ngoài phạm vi, và nó cần tab chatgpt.

## 5. Đo bằng lệnh nào — không chép con số vào đây

Trước khi bắt đầu, ghi mốc giờ ISO. Sau khi xong:

```bash
node scripts/do-usage-phien.mjs --tu <mốc-giờ-ISO>
```

Ghi lại: `soLuot` · `docMoiLuot` · `tongDoc`. **Chỉ `soLuot` là thứ pilot này điều khiển được**
— hai cột kia phụ thuộc bối cảnh và mô hình.

**Mốc so sánh, lấy từ dữ liệu đã có, không cần chạy thêm phiên nào:** vá `B-63` trong phiên hôm
nay — một việc nhỏ, có test, có đột biến, có commit — tốn **khoảng 20 lượt**. Một việc điều phối
thuần lẽ ra phải nằm ở **một chữ số**.

## 6. Đạt là gì — chốt trước khi chạy

| | ngưỡng |
|---|---|
| **ĐẠT** | ≤ 8 lượt gọi model cho trọn việc, và phán quyết cuối đúng khi kiểm tay |
| **KHÔNG ĐẠT** | > 15 lượt, **hoặc** CC phải đọc nội dung sản phẩm để quyết được |
| **vùng giữa** | 9–15 lượt: chạy được nhưng gói việc chưa đủ kín — ghi rõ lượt nào thừa và vì sao |

**Phán quyết sai mà số lượt đẹp thì vẫn là KHÔNG ĐẠT.** Rẻ mà sai thì không phải rẻ.

## 7. Việc phải làm trước khi chạy

1. Viết `scripts/nghiem-thu-artifact.mjs` — chạy hết các bộ sinh, diff từng cái, in đúng một
   dòng phán quyết. **Đây là phần nặng nhất và nó phải xong trước**, vì pilot đo CC chứ không
   đo script.
2. Chốt gói việc thành một file `drafts/pilot-dieu-phoi/GOI-VIEC.md`: lệnh nào, đạt là gì, hỏng
   thì dừng ở đâu.
3. Chạy trong **một phiên CC mới** (Haiku hoặc Sonnet), không nạp bối cảnh gì ngoài gói việc.
4. Đo, ghi kết quả vào `drafts/pilot-dieu-phoi/KET-QUA.md`.

## 8. Cái pilot này KHÔNG trả lời được

- **Không so được mô hình.** Muốn biết Haiku rẻ hơn Opus bao nhiêu thì phải chạy **cùng một gói
  việc** trên cả hai. Số lượt có thể khác — mô hình nhỏ hay chia nhỏ bước hơn.
- **Không nói được việc có SUY LUẬN thì thế nào.** Việc chọn ở mục 4 cố tình không có suy luận.
  Đó là chủ ý: đo trần dưới trước, rồi mới biết suy luận cộng thêm bao nhiêu.
- **Không đo tiền.** Đo token. Quy ra tiền là việc khác, và đơn giá thay đổi.
