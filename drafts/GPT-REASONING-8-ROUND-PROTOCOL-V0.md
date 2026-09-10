---
kind: draft-protocol
topic: gpt-reasoning-8-round
status: draft — chưa phải luật, chưa ai chốt
author: claude-gpt-chay-het-job
created: 2026-09-10
authority: none
note: "Mọi con số dưới đây do tôi ĐO trong pilot 5 vòng ngày 10/09. Đo lại bằng lệnh kèm theo, đừng dẫn lại."
---

# Reasoning 8 vòng — GPT nghĩ, CC chốt hướng ở ba mốc

## 0. Vì sao có cái này

GPT Web reasoning **không tính phí** nhưng vẫn đọc/ghi được GitHub và Google Sheet. Việc lặp
lại, có mục tiêu rõ — soạn đề IELTS, tổng hợp dữ liệu hero trong game, kiểm toán một repo — GPT
làm được qua nhiều phiên nếu có ai giữ hướng. CC đắt hơn nhiều, nên CC chỉ nên xuất hiện ở chỗ
**quyết định**, không ở chỗ **cày**.

Rủi ro duy nhất đáng sợ, và là câu Đức nói ra: *reasoning một chuỗi dài rồi kết quả không như
mong muốn*. Cả protocol này tồn tại để chặn đúng cái đó.

## 1. Hình dạng — 8 vòng, CC vào 3 lần

```
      CC①            GPT×4              CC②            GPT×4             CC③
   khởi tạo   →   vòng 1-4    →    chốt hướng   →   vòng 5-8    →    nghiệm thu
   + HỢP ĐỒNG     tự nối vòng      đọc FILE,        tự nối vòng      đọc FILE,
                  ghi vào file     không đọc chat   ghi vào file     kết luận
```

**CC không đọc chat để lấy nội dung.** Chat là đường ống, **file trong repo là sản phẩm**. Đây
là chỗ đắt nhất của bản thiết kế: đọc chat thì CC phải trả tiền cho cả vệt tool, cả phần lặp,
cả phần GPT tự sửa mình; đọc file thì CC trả đúng phần kết quả.

## 2. Hợp đồng vòng 0 — thứ chặn "chuỗi dài mà sai hướng"

CC và Đức chốt **trước khi gõ vòng 1**, viết thành `drafts/<chủ-đề>/HOP-DONG.md`:

| Trường | Nghĩa | Ví dụ (kiểm toán móc luật) |
|---|---|---|
| `muc_tieu` | Một câu, có động từ | Biết luật nào trong repo có cưỡng chế máy, luật nào không |
| `san_pham` | File nào, hình dạng gì | `drafts/hook-audit/MA-TRAN.md` — bảng 1 luật / 1 dòng |
| `xong_la_gi` | Điều kiện nghiệm thu **đo được** | Mọi luật ở `AGENTS.md` gốc có đúng một hạng + đường dẫn bằng chứng |
| `ngoai_pham_vi` | Cắt trước, không bàn lại | Không sửa mã, không đề xuất kiến trúc |
| `nguon_su_that` | Được tin cái gì | Mã thực thi trên `main`. **Không** suy từ chú thích hay tài liệu |
| `khong_biet_thi_sao` | Bắt buộc | Ghi `CHƯA TÌM THẤY`, **không đoán** |

`xong_la_gi` là trường quan trọng nhất và cũng là trường dễ viết dối nhất. Nếu không viết được
nó thành một câu đo được thì **chưa đủ điều kiện bắt đầu** — đó chính là lúc CC phải hỏi Đức,
không phải lúc vòng 6.

## 3. Giao kèo nối vòng — phần MÁY đọc

Mọi prompt gửi GPT kết thúc bằng khối này, nguyên văn:

```
GIAO KÈO NỐI VÒNG — phần này do MÁY đọc:
1. Kết thúc câu trả lời bằng ĐÚNG MỘT khối mã, và nó phải là khối CUỐI CÙNG.
2. Trong khối chỉ chứa prompt cho vòng kế tiếp — không lời dẫn, không giải thích.
3. Prompt vòng sau do chính bạn soạn, dựa trên thứ vòng này tìm ra.
4. Xong việc thì kết thúc KHÔNG có khối mã nào. Máy hiểu đó là lệnh DỪNG.
```

**Đo được, 5/5 vòng trong pilot 10/09:** khối lấy về 805 → 1069 → 1213 → 1206 → 1331 ký tự,
máy đọc rồi máy gửi, không ai dán tay.

## 4. Ba luật đọc — mua bằng lỗi thật, đừng bỏ

**⒜ `generating: false` là tuyên bố DUY NHẤT rằng câu trả lời đã xong.** Chữ ngừng dài ra
không nói gì cả: GPT gọi tool thì chữ đứng yên hàng phút. Tôi đã chế ba phép đoán sai liên
tiếp (`busy:false` → nói về panel; "số ký tự đứng yên"; "máy dò DOM đếm được 172 ký tự") và
gửi lại prompt hai lần vào một lượt đang trả lời bình thường. Xem `~~B-57~~`.

**⒝ Không có khối ≠ dừng, cho tới khi đã NẠP LẠI MỘT LẦN.** Trang trả lời xong rồi mà DOM
sống vẫn cụt — đo 3/4 vòng:

| vòng | trước khi nạp lại | sau khi nạp lại |
|---|---|---|
| 1 | 173 ký tự, không khối | 3450 ký tự, khối 805 |
| 3 | 86 ký tự, không khối | 2934 ký tự, khối 1213 |
| 4 | 48 ký tự, không khối | 3183 ký tự, khối 1206 |

Nếu tin ngay lần đọc đầu thì chuỗi **dừng giữa chừng ba trên bốn vòng** trong khi GPT đã trả
lời xong. Xem `B-59`.

**⒞ Lệnh GHI bị `REQUEST_TIMEOUT` thì KHÔNG tự gửi lại.** CLI bỏ ngang ở 40 giây nhưng panel
vẫn chạy tiếp; lượt gửi lại đâm vào chốt của chính mình rồi báo `RUN_ACTIVE`, và người đọc sẽ
tưởng có run của ai khác. Trong pilot: **4/4 lượt gửi đều trả lỗi, và 4/4 đều đã bay**. Đọc
lại bằng `chat.read` rồi mới quyết. Xem `B-58`.

## 5. GPT tự kiểm reasoning của chính nó — ba cơ chế, theo tiền lệ có sẵn trong repo

`docs/briefs/AUDIT-PROMPT-S2-GPT.md` đã dùng đúng một mẹo và nó hiệu quả: **đưa cho model
những LỜI TUYÊN BỐ để công kích, đừng bảo nó "đi tìm lỗi"**. Cùng kết luận với ghi chú về
Codex: nó sắc hơn hẳn khi phải bác một câu khẳng định cụ thể so với khi săn tự do.

- **⒜ Hạn mức đọc, khai trước.** *"Tối đa N lượt `@github` cho vòng này. Hết hạn mức thì viết
  ngay bằng thứ đã đọc được."* Pilot: vòng 1 không có hạn mức → 10 lượt đọc, 6 phút 3 giây,
  câu trả lời chết. Vòng 2-5 có hạn mức → 1m37s–3m52s, xong sạch cả bốn.
- **⒝ Bắt buộc khai chỗ không kiểm được.** Mỗi vòng phải liệt kê `CHƯA TÌM THẤY` riêng. Vòng
  3 của pilot khai ra 8 mục như vậy — đó là phần dùng được, không phải phần thiếu sót.
- **⒞ Vòng sau công kích vòng trước.** Prompt vòng N+1 phải mang theo ít nhất một kết luận
  của vòng N kèm câu *"tìm cách bác bỏ điều này trước khi xây tiếp lên nó"*.

## 6. CC làm gì ở ba mốc

**Mốc ① — khởi tạo.** Cùng Đức chốt hợp đồng vòng 0. Nếu `xong_la_gi` chưa đo được thì
**dừng ở đây**, đừng gõ vòng 1.

**Mốc ② — chốt hướng, sau vòng 4.** Đọc **file**, không đọc chat. Trả lời đúng ba câu, viết
vào `drafts/<chủ-đề>/CHOT-HUONG-1.md`:
1. Bốn vòng vừa rồi đã đi về phía `xong_la_gi` chưa, hay đã lệch?
2. Kết luận nào của GPT tôi **kiểm lại được và sai**? (bắt buộc kiểm ít nhất hai)
3. Bốn vòng tới phải trả lời câu gì?

**Mốc ③ — nghiệm thu, sau vòng 8.** Đối chiếu sản phẩm với `xong_la_gi`. Đạt hoặc không đạt,
nói thẳng. Không đạt thì nói thiếu đúng cái gì.

**Luật cứng cho mốc ② và ③: CC phải tự kiểm lại ít nhất hai kết luận của GPT bằng mã thật.**
Trong pilot tôi kiểm ba, và **một sai** — GPT chấm `innerHTML` là RỖNG, trong khi
`tests/artifact-integrity-smoke.mjs:71` có `assert.doesNotMatch(…, /\.innerHTML\s*=/)` chạy
thật trong suite. GPT audit từ gốc repo nên không thấy phép ghim mức gói. **Một bảng của GPT
phải đọc là "chưa tìm thấy từ chỗ tôi đứng", không phải "không có".**

## 7. File, không phải chat

GPT ghi kết quả vào `drafts/<chủ-đề>/` qua GitHub connector, hoặc vào một Google Sheet. Trong
chat chỉ để lại **một dòng trỏ đường** cộng khối nối vòng.

- `drafts/` là nơi DUY NHẤT agent tự ghi không cần hỏi (luật gốc của Đức) — nên nó là chỗ
  đúng, không phải chỗ tiện.
- Repo này **CÔNG KHAI**. Không có gì bí mật đi vào `drafts/`.
- Mỗi vòng **thêm dòng**, không viết đè: mất dấu vết vòng trước là mất luôn khả năng thấy
  chuỗi đã lệch từ đâu.

## 8. Còn hở — nói trước, đừng để phát hiện lúc chạy

- **Chưa đo được GPT ghi file vào repo.** Cả pilot 5 vòng GPT chỉ ĐỌC. Phần ghi là giả định,
  và nó là chân trái của bản thiết kế này. **Phải thử riêng một lượt trước khi tin.**
- **Chưa có gì chặn GPT ghi ra ngoài `drafts/`.** Hiện chỉ là câu chữ trong prompt.
- **8 vòng chưa chạy bao giờ.** Con số 4+4 là đề xuất của Đức, chưa có số đo nào bảo nó đúng.
  Pilot dài nhất là 5 vòng, và vòng 1 chết một lần.
- **Chi phí thật của một vòng:** 1m37s–6m03s tính từ lúc gửi tới lúc có khối, cộng 40–90 giây
  nắp chờ giữa hai lượt gửi. Tám vòng ≈ **20–50 phút** đồng hồ, gần như toàn bộ là chờ.
