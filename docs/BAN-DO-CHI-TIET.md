---
kind: guide
status: active
ttl_days: 365
---

# Bản đồ file — bản ĐẦY ĐỦ

> **Đây là bản đồ file CHÍNH THỨC của repo bạn.** Cổng đóng phiên đối chiếu file mới với file
> này, nên **thêm file hay thư mục mới thì thêm một mục ở ĐÂY** — không khai = không tồn tại.
> `AGENTS.md` mục 6 chỉ giữ vài cửa hay dùng nhất.

### Hiểu bộ khung này gồm gì và dùng thế nào

[README.md](README.md)

### Khai trạng thái cho một đơn vị công việc

[STATUS.template.md](STATUS.template.md)

### Ghi một quyết định kiến trúc

bản mẫu [docs/_TEMPLATE-adr.md](docs/_TEMPLATE-adr.md) · luật [docs/adr/0000-…](docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md)

### Tra nhanh người chốt đã chốt gì, ngày nào

[decisions.md](decisions.md) — sổ quyết định, **chỉ thêm**, luật mục 7 bắt ghi vào đây. Lập luận dài thì viết ADR, file này giữ một dòng trỏ sang

### Viết một tài liệu nghiên cứu

[docs/_TEMPLATE-study.md](docs/_TEMPLATE-study.md)

### Viết đề bài cho một phiên AI

[docs/_TEMPLATE-brief.md](docs/_TEMPLATE-brief.md)

### Sắp làm cùng lúc với AI khác, hoặc sắp SỬA một trong bốn cơ chế đa phiên

[docs/protocols/MULTIFLOW.md](docs/protocols/MULTIFLOW.md) — bốn cơ chế (bảng chủ sở hữu · nhãn `Lane:` · cổng đóng phiên · cổng xuất bản), một ngày làm việc 5 bước, **năm bất biến kèm lý do từng cái**, và quy trình đổi cơ chế có **đột biến kiểm bắt buộc**. Mục 1–3 viết cho người không code. **Cố ý không chứa số đo, không kiểm kê chốt, không bảng mã lỗi** — ba thứ đó khác nhau ở từng repo và mục nhanh hơn ai kịp sửa, nên nó chỉ đưa câu lệnh để tự đo

### Biết phiên trước làm tới đâu

[HANDOFF.md](HANDOFF.md) — đọc phần **cuối** file

### Biết repo đang nợ gì về cấu trúc

chạy `npm run bootstrap`

### Đến hạn bảo trì · repo im ắng lâu ngày · muốn biết repo đang NẶNG bao nhiêu

[docs/BAO-TRI-DINH-KY.md](docs/BAO-TRI-DINH-KY.md) — ba nhịp giữ repo đúng, cộng **nhịp DỌN** giữ repo rẻ. Đo bằng `npm run can-nang`; ngân sách khai được ở `budget` trong `.repo-structure.json`

### Mới vào, hoặc cần tra một thuật ngữ (gate · claim · lane · fail-closed…)

[docs/HUONG-DAN.md](docs/HUONG-DAN.md) — hai phần: cho người, và cho phiên AI; đọc trước mọi sổ tay khác · [docs/LEGEND.md](docs/LEGEND.md) — từ điển, thuật ngữ **giữ nguyên tiếng Anh** vì dịch sang tiếng Việt thì tra cứu mất

### Phát sinh việc ngoài phạm vi phiên mình — chỗ ghi nợ, luật mục 0 bắt

[BACKLOG.md](BACKLOG.md) — nhóm `## P<n>`, mỗi mục `### <MÃ>-<số> · <tiêu đề>`, đóng thì **gạch mã** chứ đừng xoá. `npm run what-next` đọc thẳng file này; sai quy ước một ký tự là mục biến mất khỏi bản đồ việc

### Sắp BÁO CÁO trạng thái cho người chốt — kiểm xem điều mình sắp nói có khớp nguồn thẩm quyền không

`npm run state-check` — **không phải cổng đóng phiên**: cổng kia hỏi "việc tôi làm đẩy được chưa", cái này hỏi "điều tôi sắp nói có đúng không". Ba mã thoát, cố ý không gộp: `OK` · `MISMATCH` · `UNKNOWN` — không đọc được thì nói KHÔNG BIẾT, không nói OK. **Chỉ đọc, không đòi khoá nào**

### Không biết làm gì tiếp, hoặc muốn biết việc nào chạy song song được ngay

`npm run what-next` — bản đồ việc, giao ba nguồn: bảng quyền × sổ nợ từng đơn vị × sổ ý tưởng. Luật song song nó cưỡng chế chỉ một câu: hai việc song song được **khi và chỉ khi** thuộc hai khoá khác nhau và cả hai đang trống. **Chỉ đọc, không đòi khoá nào**

### Là phiên ĐIỀU PHỐI: người chốt hỏi "đang có gì · làm gì tiếp · việc nào chạy song song được"

[docs/protocols/ORCHESTRATOR.md](docs/protocols/ORCHESTRATOR.md) — sổ tay vai điều phối: luật mở phiên, **hàng rào vai cứng** (vai này KHÔNG code, KHÔNG debug, KHÔNG đề xuất bản vá), luật nạp báo cáo năm mục, lối ra bàn giao cho executor. **Đọc khối cảnh báo ở đầu file trước**

### Một phép kiểm tự nhiên đỏ với người vừa clone mà xanh trên máy bạn

[.gitattributes](.gitattributes) — chốt kiểu xuống dòng cho CẢ repo, cả trong kho lẫn trong cây làm việc. Không có nó thì máy Windows tự đổi lúc lấy file ra, một commit có hai dạng byte, và `git status` nói SẠCH ở cả hai. Chốt một nửa — chỉ `text=auto` — thì kho sạch mà cây làm việc vẫn CRLF, tức bệnh còn nguyên

### Hiểu bộ khung tự kiểm mình bằng gì, hoặc thêm test của repo bạn

[tests/harness-smoke.mjs](tests/harness-smoke.mjs) — bốn khối hạt giống · [tests/assistant-smoke.mjs](tests/assistant-smoke.mjs) — phép ghim của hai lệnh trên, khối cuối tự dựng một repo hình dạng khác hẳn rồi chạy thật trong đó. Chạy cả hai bằng `npm test`

### Sắp gộp, đổi tên, hay xoá một ADR

[tests/b12-so-hieu-adr-smoke.mjs](tests/b12-so-hieu-adr-smoke.mjs) — sổ SỐ HIỆU quyết định, máy canh mà [ADR-0026](docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md) đặt ra THAY cho luật bất biến-từng-byte. Gộp nhiều ADR làm một thì **khai `decides: [..]`** ở frontmatter file gộp; quyết định rời repo thì khai vào `adr.moved_out` **kèm lý do**. Ba điều B12 hỏi: mỗi số hiệu ở **đúng một** file · **không số nào** biến mất · `decides:` không nhận một số **chưa từng cấp**. Viết lại THÂN một ADR đã Accepted là **hợp lệ** — đừng cài lại luật đã chết

### Sắp THÊM một luật, hay muốn biết luật nào đang hiệu lực về một chủ đề

`npm run luat` — bộ biên dịch luật. Ba tầng: **sổ cái** (`docs/adr/` · `decisions.md` · kho lưu trữ — chỉ thêm, là LỊCH SỬ) → **bộ biên dịch** → **luật hiệu lực** (thứ một phiên thật sự đọc). Mỗi ADR khai `chu_de`, mỗi chủ đề đúng một `dau_moi`, nên mở một khối là ra câu trả lời chứ không phải đọc bốn file rồi tự đoán. `--de-xuat` NÊU chỗ đáng gộp. **AI được đề xuất, KHÔNG tự sửa hay xoá luật** — chỉ khai báo tường minh mới làm đổi bộ luật. Cưỡng chế ở B16
