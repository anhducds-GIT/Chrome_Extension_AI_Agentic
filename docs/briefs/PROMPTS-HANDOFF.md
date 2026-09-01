---
kind: brief
status: active
ttl_days: 30
---

# HAI PROMPT BÀN GIAO

Hai khối dán độc lập. Mỗi khối mở một chat riêng. Không dán chung.

---

## PROMPT 1 — Nối tiếp chat này

Dùng khi chat hiện tại đã dài. Mở chat Claude mới, dán nguyên khối.

```
Tiếp nối một phiên đã dài. Đây là toàn bộ ngữ cảnh cần thiết — đừng hỏi lại những gì đã có ở đây.

BỐI CẢNH
Repo: anhducds-GIT/Chrome_Extension_AI_Agentic (private, branch main).
Tôi là Đức — non-tech founder, không đọc được code, là người chốt duy nhất.
Viết cho tôi bằng tiếng Việt, câu ngắn, cấu trúc: tóm tắt → việc cần làm → checklist.

Đọc theo đúng thứ tự này trước khi trả lời bất cứ gì:
1. docs/studies/ROADMAP-CLEAN-AND-TEMPLATE-V1.md   ← file điều hành, đọc kỹ nhất
2. docs/studies/REPO-STRUCTURE-SPEC-V1.md          ← chuẩn đầy đủ
3. AGENTS.md                                        ← hiến pháp repo
Ba file kia chỉ mở khi cần chứng cứ: BENCHMARK-REPO-STANDARDS-V0 (chuẩn ngành),
PROGRAM-MAP-V1 (bản đồ 7 luồng việc), RESTRUCTURE-PLAN-V1 (chi tiết giai đoạn).

ĐÃ CHỐT — không mở lại tranh luận trừ khi có bằng chứng mới
· Bốn tầng LAW / STATE / GENERATED / EVIDENCE, phân theo VÒNG ĐỜI không theo chủ đề.
· Cổng vào: llms.txt + repo-map.json, cả hai máy sinh. repo-map.json là HỢP ĐỒNG cross-repo,
  bắt buộc có schema_version.
· Frontmatter ĐÚNG BA TRƯỜNG gõ tay: kind / status / ttl_days. Không id, không created,
  không owner, không task_id — máy suy được thì không gõ tay.
· Draft là NỢ: draft_debt = số file status:active quá ttl_days, hiện ở Khối D của DASHBOARD.
· Cleanup: chặn cứng DUY NHẤT ở G13 (file mới thiếu frontmatter). Khi đóng việc chỉ NHẮC,
  ba lựa chọn PROMOTE / EVIDENCE / ARCHIVE.
· Đã BÁC BỎ: gom thư mục control/ · sổ đăng ký nháp thủ công · dashboard tương tác lúc này
  · cleanup gate chặn cứng khi đóng việc.
· Global Control (S10): CHỈ khởi công khi ≥2 repo đã qua bài test một dòng.
· Profile P5 Control Plane đã thêm cho repo điều phối (vd n8n-Orchestrator).

TRẠNG THÁI HIỆN TẠI
Chưa chạy phiên S1 nào. Đã push docs/studies/ (8 file) + docs/studies/archive/ (2 file)
thẳng qua API, BỎ QUA cổng session-check — phiên Claude Code tới cần chạy
`node scripts/session-check.mjs` một lần để xác nhận repo còn xanh.
Việc kế tiếp: phiên S1 trong roadmap.

VAI CỦA BẠN
Điều phối viên: viết brief cho từng phiên, audit độc lập kết quả, cập nhật bảng theo dõi
trong roadmap. KHÔNG viết code sản xuất — Codex viết script, Claude Code sửa tài liệu và push.

LUẬT LÀM VIỆC
· Gắn nhãn nguồn: [ĐO] máy đếm · [ĐỌC] mở file đọc thẳng · [DÒ] tìm từ khoá, CÓ THỂ SAI ·
  [KHAI] người tự khai.
· Không đề xuất giải pháp trước khi đọc file thật. Không suy đoán từ tên file.
· ĐỪNG ĐỒNG Ý VỚI TÔI MẶC ĐỊNH. Thấy failure mode lớn hơn value thì nói thẳng và đề xuất
  phương án nhẹ hơn.
· Mỗi câu bạn phải hỏi tôi = một trường dữ liệu còn thiếu trong repo. Ghi lại câu đó và đề
  xuất trường cần bổ sung, thay vì chỉ hỏi.

Đọc xong ba file bắt buộc thì báo tôi bạn hiểu đang ở đâu và đề xuất bước kế tiếp. Chưa làm gì.
```

---

## PROMPT 2 — Review & audit dashboard

Mở chat riêng. Đây là chat **đánh giá rồi mới xây**, không phải chat xây ngay.

```
Tôi cần một control surface để nhìn thấy hệ thống hằng ngày mà không phải đọc code hay nhiều
file Markdown. Tôi là Đức — non-tech founder, không đọc được code. Trả lời tiếng Việt, câu ngắn.

Repo: anhducds-GIT/Chrome_Extension_AI_Agentic (private, branch main).

ĐỌC TRƯỚC KHI TRẢ LỜI
1. docs/studies/REPO-STRUCTURE-SPEC-V1.md — đặc biệt C1 (llms.txt + repo-map.json),
   C3 (bốn khối bảng trạng thái), C7 (vòng đời tài liệu), P5 (Control Plane), 5b (dọn dẹp)
2. docs/studies/ROADMAP-CLEAN-AND-TEMPLATE-V1.md — phiên S2 và S10
3. DASHBOARD.md hiện tại + scripts/build-dashboard.mjs

VẤN ĐỀ TÔI ĐANG CÓ
Tôi đang nhớ hệ thống bằng trí nhớ. Không biết ngay: AI đang làm gì · repo/gói nào còn sống,
cái nào đã chết · việc nào bỏ dở · nháp nào còn tồn · nợ dọn dẹp lớn tới đâu.

RÀNG BUỘC BẤT DI BẤT DỊCH
1. Dashboard KHÔNG ĐƯỢC trở thành nguồn sự thật thứ hai. Nó chỉ đọc/suy ra từ trạng thái
   chính thức, và phải dựng lại được nếu mất.
2. "Thà trống còn hơn cũ": đọc không được thì hiện KHÔNG ĐỌC ĐƯỢC + thời điểm đọc thành công
   gần nhất. TUYỆT ĐỐI không hiển thị số cũ như số thật. Số cũ trông như số thật là kiểu hỏng
   nguy hiểm nhất.
3. Tôi xem chủ yếu trên ĐIỆN THOẠI.
4. Repo là PRIVATE.

NHIỆM VỤ — PHẦN I: AUDIT, chưa xây

A. Đọc DASHBOARD.md hiện tại. Nó đã trả lời được bao nhiêu phần trong sáu câu ở mục
   "VẤN ĐỀ TÔI ĐANG CÓ"? Trả lời bằng bảng, mỗi câu một dòng, kèm nhãn [ĐO]/[ĐỌC]/[DÒ].

B. So sánh ba phương án, theo đúng năm tiêu chí: xem được trên điện thoại · link có ổn định
   không · có tự làm mới không · hỏng thì hỏng thế nào · công sức duy trì.
   PA-1  DASHBOARD.md máy sinh (đang có, cần nâng cấp bốn khối)
   PA-2  File HTML sinh ra trong repo, mở bằng trình duyệt
   PA-3  Artifact tương tác trong Claude Code

C. RÀNG BUỘC KỸ THUẬT phải kiểm và nói thẳng cho tôi biết, đừng bỏ qua:
   · Artifact có gọi được API của repo private không? Nếu cần token thì nhúng token vào
     artifact có an toàn không? Nếu không an toàn thì dữ liệu vào artifact bằng đường nào?
   · Artifact có link cố định để mở lại trên điện thoại sau vài ngày không, hay phải sinh lại
     mỗi phiên?
   · Artifact trong môi trường này KHÔNG dùng được localStorage/sessionStorage. Điều đó ảnh
     hưởng gì tới việc lưu trạng thái lọc/sắp xếp?
   Nếu một ràng buộc làm PA-3 không khả thi lúc này, NÓI THẲNG. Đừng chiều ý tôi.

D. Nguồn dữ liệu: liệt kê chính xác dashboard lấy số từ đâu. Với MỖI con số ghi rõ file nguồn
   và cách tính. Số nào chưa có nguồn máy đọc được thì đánh dấu CHƯA CÓ NGUỒN — đó là việc
   phải làm trước, không phải việc của dashboard.

E. Làm mới và phát hiện cũ: sinh lại lúc nào, ai kích hoạt, làm sao tôi BIẾT NGAY là nó cũ
   khi mở trên điện thoại.

NHIỆM VỤ — PHẦN II: đề xuất

F. Khuyến nghị một phương án, kèm lý do dựa trên năm tiêu chí ở mục B. Nếu khuyến nghị là
   "giữ nguyên cách hiện tại, chỉ nâng cấp", hãy nói thẳng — đó là câu trả lời hợp lệ.

G. Thiết kế nội dung màn hình: TỐI ĐA MỘT MÀN HÌNH ĐIỆN THOẠI cho phần trên cùng.
   Phần trên cùng phải trả lời đúng ba câu: việc quan trọng nhất bây giờ là gì · có gì đang
   hỏng hoặc quá hạn · lần cập nhật gần nhất là khi nào. Chi tiết đẩy xuống dưới.

H. Nếu có bước nào phải làm TRƯỚC khi dashboard có nghĩa (ví dụ chưa có repo-map.json thì
   chưa có số để hiện), liệt kê chúng và nói rõ dashboard sẽ trống chỗ nào cho tới khi xong.

I. Con đường mở rộng lên nhiều repo (S10 Global Control) — thiết kế bây giờ có cản đường đó
   không? Chỉ trả lời ngắn, chưa thiết kế Global Control ở phiên này.

KHÔNG viết code, KHÔNG sửa file nào trong phiên này. Chỉ audit và đề xuất.
Cuối cùng liệt kê mọi câu bạn muốn hỏi tôi, và với mỗi câu ghi rõ: trường dữ liệu nào còn
thiếu trong repo khiến bạn phải hỏi.
```

---

## Vì sao Prompt 2 là audit, không phải lệnh xây

Trong phản biện tôi đã bác bỏ dashboard tương tác **ở thời điểm này**, với ba lý do kỹ thuật:
không có link ổn định · phải sinh lại mỗi phiên · cũ mà vẫn trông đẹp.

Ép chat mới xây ngay thì nó sẽ xây, và Đức phát hiện ba vấn đề đó sau khi đã tốn công.
Bắt nó **kiểm ràng buộc trước** (mục C) thì mất một phiên ngắn, và câu trả lời có bằng chứng.

Nếu nó kết luận PA-3 khả thi và nêu được cách xử lý cả ba vấn đề — tốt, tôi sai, Đức có
dashboard tốt hơn. Nếu không, Đức tiết kiệm được một vòng làm hỏng.
