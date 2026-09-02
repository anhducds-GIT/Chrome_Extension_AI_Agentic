# Bộ khung repo — bản 0.1.0-unproven

Bộ khung để một **phiên AI lạ** vào bất kỳ repo nào cũng hiểu ngay chuyện gì đang xảy ra, không
phải quét cả cây thư mục và không phải hỏi chủ repo câu nào.

> **Trạng thái: CHƯA CHỨNG MINH NGOÀI REPO GỐC.** Bộ khung này đã chạy thật trên đúng một repo
> — nơi nó được rút ra. Nó **chưa từng được migrate sang một repo khác loại**. Đừng dùng cho
> việc quan trọng cho tới khi mốc đó đạt.

## Nguyên tắc gốc

**Mỗi câu AI phải hỏi con người = một trường dữ liệu còn thiếu trong repo.**
Không sửa bằng cách dặn AI đọc kỹ hơn. Sửa bằng cách bổ sung trường dữ liệu, và bắt cổng kiểm
chặn khi trường đó trống.

## Bốn tầng — phân theo VÒNG ĐỜI, không theo chủ đề

| Tầng | Gồm gì | Ai ghi | Đổi khi nào |
|---|---|---|---|
| **LAW** | luật, vai, kiến trúc, hướng dẫn | người | vài tháng |
| **STATE** | trạng thái, việc mở, bàn giao | người | mỗi phiên |
| **GENERATED** | số đo, bản đồ, bảng tổng | **máy** | mỗi lần sinh |
| **EVIDENCE** | bằng chứng, log, quyết định đã chốt | bất biến | **chỉ thêm** |

Luật con: không trộn hai tầng vào một file; không để hai file cùng tầng nói cùng một điều.
Nguyên tắc số một: **thứ gì máy đếm được thì máy đếm** — con số, trạng thái, ngày tháng không gõ tay.

## Trong gói này có gì


> **Hai thứ CỐ Ý không có trong bộ khung này:** công cụ *đo một repo cách chuẩn bao xa* và công cụ
> *dựng repo mới*. Chúng sống ở **repo nhà của bộ khung**, vì cả hai đều cần biết "chuẩn" là gì —
> và chuẩn phải có **một** nguồn. Phát bản sao của chuẩn đi khắp nơi là tạo ra N nguồn, rồi lúc
> chúng lệch nhau thì không ai biết tin bản nào. Repo bạn cần *sống theo chuẩn*, không cần
> *phát hành chuẩn*.
| Đường dẫn | Tầng | Việc của nó |
|---|---|---|
| `AGENTS.md` | LAW | Hiến pháp một trang. **Mục 6 để trống — bạn tự điền bản đồ file của repo mình** |
| `CLAUDE.md` | LAW | Stub trỏ về `AGENTS.md`, để công cụ nào cũng tìm được luật |
| `.repo-structure.json` | LAW | Hình dạng repo: đơn vị nằm đâu, thư mục nào có chủ nào, phép kiểm nào chặn |
| `scripts/repo-structure.mjs` | máy | Nguồn sự thật duy nhất về hình dạng repo — bốn script kia đều đọc nó |
| `scripts/build-dashboard.mjs` | máy | Sinh bảng điều hành + cổng vào máy đọc, **hoàn toàn từ HEAD** |
| `scripts/check-bootstrap.mjs` | máy | Cổng kiểm cấu trúc B1–B14 |
| `scripts/session-check.mjs` | máy | Cổng đóng phiên — đỏ thì chưa xong |
| `scripts/safe-push.mjs` | máy | Đẩy mà không cuốn theo commit của phiên khác |
| `tests/harness-smoke.mjs` | máy | **Lưới đỡ của chính bộ khung** — bốn chỗ đã hỏng thật ở repo sinh ra nó. Thêm test của bạn vào cùng thư mục, đừng xoá bốn khối này |
| [`docs/ANNEX-tu-dong-hoa-trinh-duyet.md`](docs/ANNEX-tu-dong-hoa-trinh-duyet.md) | LAW | **Phụ lục nghề — TUỲ CHỌN.** Chín luật của nghề tự động hoá trình duyệt, tách khỏi luật chung. Repo bạn không làm nghề đó thì **xoá file này đi** |
| [`docs/_TEMPLATE-annex.md`](docs/_TEMPLATE-annex.md) | LAW | Bản mẫu để viết phụ lục nghề của repo bạn |
| [`docs/_TEMPLATE-adr.md`](docs/_TEMPLATE-adr.md) · [`-study`](docs/_TEMPLATE-study.md) · [`-brief`](docs/_TEMPLATE-brief.md) | LAW | Bản mẫu: quyết định · nghiên cứu · đề bài phiên |
| [`docs/adr/0000-…`](docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md) | EVIDENCE | Luật ghi quyết định. Đọc trước khi ghi cái đầu tiên |
| [`STATUS.template.md`](STATUS.template.md) | LAW | Khuôn khai trạng thái cho mỗi đơn vị công việc |
| `STATUS.md` | STATE | Trạng thái của gốc repo — **đã khai sẵn một bản hợp lệ** để cổng kiểm xanh ngay từ commit đầu |
| `.agents/claims.json` | STATE | Bảng chủ sở hữu, chống hai phiên AI giẫm chân |

Bảng trên dùng **liên kết** chứ không phải chữ thường, và đó không phải trang trí: phép kiểm
độ sâu điều hướng đi theo liên kết từ cổng vào máy đọc. File không ai trỏ tới thì máy coi là
không tới được — và một bản mẫu không ai tới được thì đúng là sẽ không ai dùng.

**Cố ý KHÔNG có trong gói:** bảng điều hành, cổng vào máy đọc, bản đồ máy đọc — ba thứ đó là
tầng GENERATED, **mỗi repo tự sinh**. Bộ sinh thì đi theo, sản phẩm của nó thì không. Chép
sản phẩm sang repo khác là làm mọi repo cùng hiển thị trạng thái của repo gốc.

Cũng không có: bằng chứng, trạng thái thật, nhật ký bàn giao thật. Chúng thuộc về từng repo.

## Dùng thế nào

1. Chép nội dung gói này vào gốc repo của bạn.
2. **Sửa `.repo-structure.json` trước tiên** — khối `units` (đơn vị của bạn nằm đâu) và
   `areas` (mỗi thư mục top-level một dòng). Đây là bước duy nhất bắt buộc làm bằng tay.
3. Chạy `npm run dashboard` — sinh bảng điều hành và cổng vào máy đọc.
   **Phải làm bước này TRƯỚC khi đo**: phép kiểm độ sâu điều hướng đi từ cổng vào máy đọc, mà
   file đó là tầng GENERATED — chưa sinh thì nó báo vàng, và đó là đúng chứ không phải lỗi.
4. Chạy `npm run bootstrap` — nó liệt kê repo đang nợ gì, mỗi dòng nói cả **chỗ sai** lẫn
   **cách sửa**.
5. Trả nợ dần. `bootstrap.blocking` để **rỗng** lúc đầu; chỉ bật chặn một phép kiểm **sau khi**
   nó đã xanh. Bật chặn khi đang đỏ là tự khoá repo.
6. Điền mục 6 của `AGENTS.md` — bản đồ file của repo bạn.

## Phép thử nghiệm thu

Mở một chat AI **hoàn toàn mới**, dán đúng một dòng:

> *Đọc `llms.txt` ở gốc repo &lt;chủ&gt;/&lt;repo&gt; rồi cho tôi biết ba điều: repo có những đơn vị
> nào và cái nào đang sống, việc ưu tiên số 1 hiện tại là gì và thuộc đơn vị nào, tôi nên đọc
> file nào tiếp theo.*

**ĐẠT** khi nó nói được cả ba, **không hỏi lại câu nào**.
**KHÔNG ĐẠT** thì ghi lại **chính xác câu nó đã hỏi** — mỗi câu hỏi là một trường dữ liệu còn
thiếu. Bổ sung trường đó rồi thử lại. **Không sửa bằng cách dặn AI đọc kỹ hơn.**
