---
kind: study
status: active
ttl_days: 30
---

# Phân loại nợ kỹ thuật — bản đếm ngày 2026-09-05

> Đọc cho ai: Đức, để biết **cái gì chặn ở đâu** và **việc nào cần Đức mới đi tiếp được**.
> Đọc cho AI: để nhận đúng luồng, đừng bốc một mục ở nhóm C rồi tưởng là fix nhỏ.
>
> **Số ở đây là số đếm được lúc viết, không phải số vĩnh viễn.** Đếm lại:
> ```bash
> grep -cE "^### [BG]-[0-9]+ " workers/duc-auto-chatgpt/v0.1.0/BACKLOG.md workers/duc-auto-gemini/v0.2.0/BACKLOG.md
> ```

## 1. Đếm được gì

| Gói | Khoá | Mục còn mở | Đã đóng nhưng còn nằm trong file |
|---|---|---|---|
| ChatGPT (`B-xx`) | `workers/duc-auto-chatgpt` | 26 | 3 (B-18 · B-24 đã quyết · B-29 đo xong không cần vá) |
| Gemini (`G-xx`) | `workers/duc-auto-gemini` | 11 | 1 |
| GG Flow Video (`F-xx`) | `workers/duc-auto-gg-flow-video` | 14 | 11 |
| **Tổng** | **ba khoá riêng** | **51** | 15 |

**Con số 48 nói trước đây là sai.** Đếm lại theo đầu mục thì ra 51. Chênh vì lần trước đếm
lẫn cả mục đã đóng và bỏ sót nhánh Flow (nhánh này ghi bằng gạch đầu dòng, không phải đầu mục,
nên phép đếm cũ trượt hết).

Ba gói là **ba khoá khác nhau** → chạy song song được ba luồng mà không giẫm chân.

### 1b. Bảng nói 62, tôi đọc ra 51 — cả hai đều đúng, và chỗ lệch là một việc phải làm

Bộ sinh dashboard đếm **62**. Tôi đọc tay ra **51**. Không được để hai con số đứng cạnh nhau
mà không ai giải thích, nên đây là chỗ lệch, đã đối chiếu từng mục:

| Gói | Máy đếm | Tôi đọc | Lệch |
|---|---|---|---|
| ChatGPT | 29 | 26 | 3 |
| Gemini | 12 | 11 | 1 |
| Flow Video | 21 | 14 | 7 |

**Máy không sai.** Luật của nó cố ý lệch về phía **báo thừa**: dấu đóng phải là chữ ĐẦU TIÊN
của tiêu đề, tìm giữa câu là đóng oan một việc đang mở. Lệch về phía báo thừa là lựa chọn đúng.

**Mười một mục lệch đó KHÔNG phải nợ kỹ thuật — chúng là nợ CÁCH GHI:**

| Mục | Thực trạng | Máy thấy gì |
|---|---|---|
| `B-18` `B-27` `B-29` | đã cân, đã quyết không làm | tiêu đề không mở đầu bằng dấu đóng |
| `G-11` | đóng 28/08 | chữ "ĐÓNG" nằm giữa câu |
| `F-01` `F-02` `F-04` `F-05` | **đã xong**, nhưng chỉ được tuyên bố trong một đoạn ghi chú ở đầu mục P1 | dòng của chính bốn mục đó **chưa bao giờ được đánh dấu** |
| `F-24` | báo động giả, đã đo và đóng lại | tiêu đề mở đầu bằng "BÁO ĐỘNG GIẢ" |
| `F-20` | là một **luật**, không phải việc | nằm lẫn trong danh sách việc |

Bốn mục `F-01` `F-02` `F-04` `F-05` là ví dụ rõ nhất: chính sổ nợ của nhánh Flow đã tự ghi
*"backlog này đang nói dối"* ngày 02/09 và viết một đoạn rà soát ở đầu file — nhưng **đoạn rà
soát đó không phải là đánh dấu**. Ai mở file hôm nay vẫn thấy bốn việc đang mở, và máy cũng vậy.

Sửa cách ghi 11 mục này là việc **rẻ nhất trong toàn bộ danh sách**, và nó làm bảng bớt báo
thừa 11 mục ngay lập tức. Đã xếp thành luồng riêng ở mục 3.

`F-19` thì **máy đúng còn tôi sai lúc đọc lướt**: nó ghi "XONG một phần", mà xong một nửa
không phải xong. Nó là việc còn mở thật.

## 2. Năm nhóm

Phân theo **cái gì đang chặn**, không phân theo P1/P2/P3 — vì độ ưu tiên cũ được gán lúc chưa
biết mục nào phải chờ người, mà chờ người mới là thứ quyết định làm được hay không.

### Nhóm A — CHỜ ĐỨC (7 mục). AI không làm thay được.

| Mục | Chờ cái gì |
|---|---|
| `B-36` | Đã vá 04/09. Chờ Đức mở extension chạy thật một lượt để nghiệm thu. |
| `G-02` | Đã vá tĩnh 04/09. Chờ Đức reload extension Gemini. |
| `F-09` | Đã ghim `GENERATION_LIMIT_REACHED`. Chờ reload + một lượt live lúc hết credit. |
| `F-14` | Mô tả trong sổ đang sai thực trạng. Cần một lượt live để biết bản vá còn đúng không. |
| `B-19` | **Cần Đức chốt luật:** "thử lại" hiện KHÔNG chỉ giới hạn ở lỗi trước lúc gửi — khác với những gì bảng và cảm nhận chung đang nói. Chốt xong mới sửa được. |
| `B-27` | Câu trả lời dài hơn một ô Excel. Đã cân, cố ý hoãn — chỉ làm khi Đức cần thật. |
| `B-09` | Xoá file rác trong thư mục output. **Xoá file là quyền Đức**, AI không tự làm. |

**Bốn mục đầu là một cụm:** đều đã vá xong, chỉ chờ Đức bấm chạy. Gộp thành **một buổi nghiệm
thu** thì đóng được cả bốn cùng lúc.

### Nhóm B — LÀM ĐƯỢC NGAY (22 mục). Bằng chứng đã đủ, chỉ còn code + test ghim.

- **ChatGPT (13):** `B-22` `B-28` `B-14` `B-15` `B-16` `B-11` `B-23` `B-24` `B-25` `B-10` `B-20` `B-21` `B-17`
- **Gemini (5):** `G-01` `G-03` `G-09` `G-10` `G-12`
- **Flow (4):** `F-06` `F-08` `F-10` `F-22`

Ba mục đáng làm trước, vì mỗi cái vá một chỗ **im lặng nói dối**:

1. `B-22` + `G-01` — cùng một race: lệnh huỷ tới trước job bị `runPrompt()` xoá trắng. Đây là
   nguyên văn dòng code đã gây ra vụ 26/08. Bên Gemini đã ghi vào sổ cái, bên ChatGPT vẫn còn.
2. `G-09` — `npm test` ở gốc repo **không chạy suite Gemini**. Nghĩa là cổng đóng phiên đang
   xanh mà không hề kiểm một phần ba số code. Đây là xanh giả, và nó rẻ nhất trong cả danh sách.
3. `B-23` — `response_sha256` được **ghi** nhưng chưa bao giờ được **kiểm**. Một trường bằng
   chứng không ai đọc thì nó là trang trí, không phải bằng chứng.

### Nhóm C — PHẢI ĐO TRƯỚC (14 mục). Chưa đủ dữ kiện để sửa.

`B-02` `B-33` · `G-04` `G-05` `G-06` `G-07` `G-08` · `F-03` `F-12` `F-13` `F-16` `F-17` `F-18` `F-25`

Đặc điểm chung: gắn nhãn **[DÒ]** (tìm theo tên hàm) hoặc **chưa rà**. Luật của repo đã nói
thẳng: dò theo tên đã cho kết luận sai bốn lần trong một ngày. **Bốc một mục nhóm C rồi sửa
thẳng là cách chắc chắn nhất để sửa nhầm chỗ.** Mỗi mục cần một lượt đo trước, rồi mới quyết.

### Nhóm D — VIỆC LỚN, cần brief riêng (6 mục).

`B-06` (đồng bộ GPT ↔ Gemini) · `B-07` (danh sách port ngược) · `B-31` (harness chatgpt.com giả
lập) · `B-34` (gom điều khiển transport về một hàng đợi) · `B-35` (N run đồng thời) ·
`F-07` (schema XLSX V2 cho video)

Mỗi mục là một checkpoint riêng. **Đừng nhét vào một phiên đang sửa việc nhỏ** — đó là cách
một phiên phình ra rồi không đóng được.

### Nhóm E — việc ở GỐC REPO, không thuộc khoá worker (2 mục).

`B-12` `B-30` — cả hai nói về cổng kiểm bắt oan phiên này vì file của phiên khác.

**Cần kiểm lại trước khi làm:** hai mục này ghi ngày 26–28/08, còn cổng kiểm đã được sửa tận
gốc ngày 05/09 (bản kiểm nay chạy từ ảnh chụp HEAD chứ không đọc cây làm việc). **Có khả năng
cả hai đã tự hết.** Việc đầu tiên là đo lại, không phải sửa.

## 3. Đề xuất chia luồng

| Luồng | Khoá | Làm gì | Mở được ngay? |
|---|---|---|---|
| 1 | `workers/duc-auto-chatgpt` | Nhóm B phần ChatGPT, bắt đầu từ `B-22` `B-23` | có |
| 2 | `workers/duc-auto-gemini` | `G-09` trước (xanh giả), rồi `G-01` `G-10` | có |
| 3 | `workers/duc-auto-gg-flow-video` | `F-22` `F-06` `F-08` | có |
| 4 | `workers/duc-auto-gg-flow-video` | Sửa cách ghi 11 mục ở mục 1b, rồi `F-22` `F-06` `F-08` | có |
| 5 | `_code` + `_docs` | Nhóm E: đo lại `B-12` `B-30` xem còn thật không | có |
| — | — | Nhóm A: một buổi nghiệm thu live, bốn mục một lượt | **chờ Đức** |

Ba luồng đầu **không chạm nhau** vì ba khoá khác nhau. Luồng 4 chạm gốc repo nên phải xếp
hàng sau mọi việc gốc khác.

## 4. Cố ý không làm ở bản này

- **Không tự hạ ưu tiên mục nào.** P1/P2/P3 trong ba sổ giữ nguyên; bản này thêm một trục
  phân loại, không thay trục cũ.
- **Không gạch mục nào trong sổ.** Gạch là sửa file của gói, phải giữ khoá của gói đó.
- **Không đoán công sức từng mục.** Con số giờ/ngày viết ra ở đây sẽ sai, và sai theo hướng
  làm Đức lên kế hoạch nhầm.
